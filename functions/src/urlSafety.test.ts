import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import axios from 'axios';
import {
  BLOCKED_DESTINATION,
  GuardedHttpAgent,
  GuardedHttpsAgent,
  UNSUPPORTED_CONTENT_TYPE,
  URL_NOT_ALLOWED,
  assertUrlAllowed,
  createGuardedLookup,
  createHtmlFetcher,
  hasErrorCode,
  isPublicIp,
  type HtmlFetcher,
  type ResolveAll,
} from './urlSafety';

const isBlocked = (error: unknown) => hasErrorCode(error, BLOCKED_DESTINATION);
const isNotAllowed = (error: unknown) => hasErrorCode(error, URL_NOT_ALLOWED);

describe('isPublicIp', () => {
  it('rejects private, loopback, link-local, CGNAT, multicast and reserved IPv4', () => {
    const blocked = [
      '0.0.0.0', '0.255.255.255', '10.0.0.1', '10.255.255.255', '100.64.0.1', '100.127.255.254',
      '127.0.0.1', '127.255.255.254', '169.254.169.254', '169.254.0.1', '172.16.0.1',
      '172.31.255.255', '192.0.0.8', '192.0.2.10', '192.88.99.1', '192.168.1.1', '198.18.0.1',
      '198.19.255.255', '198.51.100.7', '203.0.113.9', '224.0.0.1', '239.255.255.250',
      '240.0.0.1', '255.255.255.255',
    ];
    assert.deepEqual(blocked.filter(isPublicIp), []);
  });

  it('rejects non-public IPv6, including IPv4-mapped forms', () => {
    const blocked = [
      '::', '::1', '[::1]', 'fe80::1', 'fe80::1%eth0', 'febf::1', 'fc00::1', 'fd12:3456:789a::1',
      'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '::ffff:169.254.169.254',
      '::ffff:a9fe:a9fe', '::127.0.0.1', '64:ff9b::7f00:1', '64:ff9b::8.8.8.8', '100::1',
      '2001::1', '2001:db8::1', '2002:7f00:1::1', '3fff::1', '5f00::1',
    ];
    assert.deepEqual(blocked.filter(isPublicIp), []);
  });

  it('accepts public unicast addresses', () => {
    const allowed = [
      '8.8.8.8', '1.1.1.1', '100.63.255.255', '100.128.0.0', '172.15.255.255', '172.32.0.1',
      '169.253.255.255', '192.0.1.1', '198.17.255.255', '198.20.0.1', '223.255.255.255',
      '2606:4700:4700::1111', '2001:4860:4860::8888', '2a00:1450:4001:80b::200e',
      '::ffff:8.8.8.8', '[2606:4700:4700::1111]',
    ];
    assert.deepEqual(allowed.filter((ip) => !isPublicIp(ip)), []);
  });

  it('rejects values that are not IP addresses', () => {
    const invalid = ['', 'localhost', 'example.com', '127.1', '0x7f000001', '1.2.3', '1.2.3.4.5', '256.1.1.1', '1::2::3'];
    assert.deepEqual(invalid.filter(isPublicIp), []);
  });
});

describe('assertUrlAllowed', () => {
  it('accepts http(s) URLs with no port or port 80/443', () => {
    for (const url of [
      'https://example.com/p?id=1',
      'http://example.com:80/x',
      'https://example.com:443/x',
      'http://example.com:443/',
      'https://8.8.8.8/',
    ]) {
      assert.doesNotThrow(() => assertUrlAllowed(url), url);
    }
  });

  it('rejects other schemes, custom ports and embedded credentials', () => {
    for (const url of [
      'ftp://example.com/',
      'file:///etc/passwd',
      'data:text/html,hi',
      'javascript:alert(1)',
      'http://example.com:8080/',
      'https://example.com:22/',
      'http://user:pass@example.com/',
      'http://user@example.com/',
      'not a url',
      '',
    ]) {
      assert.throws(() => assertUrlAllowed(url), isNotAllowed, url);
    }
  });

  it('rejects non-public IP-literal hosts in any notation', () => {
    for (const url of [
      'http://127.0.0.1/',
      'http://2130706433/',
      'http://0x7f.1/',
      'http://127.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fd00::1]/',
      'http://0.0.0.0/',
      'https://10.0.0.1:443/',
    ]) {
      assert.throws(() => assertUrlAllowed(url), isBlocked, url);
    }
  });
});

describe('guarded agents and HTML fetcher (local server)', () => {
  // 127.0.0.1 plays the "public" address; everything else counts as private.
  const isAllowedAddress = (ip: string) => ip === '127.0.0.1';
  let rebindLookups = 0;
  const dnsTable: Record<string, string[]> = {
    'shop.test': ['127.0.0.1'],
    'internal.test': ['127.0.0.2'],
    'mixed.test': ['127.0.0.1', '127.0.0.2'],
  };
  const resolveAll: ResolveAll = (hostname, _options, callback) => {
    // rebind.test: first answer is allowed, later answers are not (DNS rebinding).
    const addresses =
      hostname === 'rebind.test'
        ? [rebindLookups++ === 0 ? '127.0.0.1' : '127.0.0.2']
        : dnsTable[hostname];
    if (!addresses) {
      const error: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
      error.code = 'ENOTFOUND';
      callback(error, []);
      return;
    }
    callback(null, addresses.map((address) => ({ address, family: 4 })));
  };

  let server: http.Server;
  let port = 0;
  let fetchHtml: HtmlFetcher;
  const hits: string[] = [];

  before(async () => {
    server = http.createServer((req, res) => {
      const path = req.url ?? '/';
      hits.push(`${req.headers.host} ${path}`);
      const redirect = (location: string) => {
        res.writeHead(302, { location });
        res.end();
      };
      switch (path) {
        case '/page':
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end('<html><head><title>Test product</title></head></html>');
          return;
        case '/redirect-same-host':
          return redirect('/page');
        case '/redirect-private-ip':
          return redirect(`http://127.0.0.2:${port}/page`);
        case '/redirect-internal-host':
          return redirect(`http://internal.test:${port}/page`);
        case '/redirect-rebind':
          return redirect(`http://rebind.test:${port}/page`);
        case '/redirect-other-port':
          return redirect(`http://shop.test:${port + 1}/page`);
        case '/redirect-credentials':
          return redirect(`http://user:secret@shop.test:${port}/page`);
        case '/redirect-ftp':
          return redirect('ftp://shop.test/file');
        case '/loop':
          return redirect('/loop');
        case '/json':
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end('{"price": 1}');
          return;
        case '/big':
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(`<p>${'x'.repeat(50_000)}</p>`);
          return;
        case '/slow': {
          res.writeHead(200, { 'content-type': 'text/html' });
          const timer = setInterval(() => res.write('<p>.</p>'), 50);
          res.on('close', () => clearInterval(timer));
          return;
        }
        default:
          res.writeHead(404);
          res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
    fetchHtml = createHtmlFetcher({
      isAllowedAddress,
      resolveAll,
      allowedPorts: [String(port)],
      timeoutMs: 1_000,
      maxBytes: 10_000,
      maxRedirects: 3,
    });
  });

  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it('fetches HTML from a hostname that resolves to an allowed address', async () => {
    assert.match(await fetchHtml(`http://shop.test:${port}/page`), /Test product/);
  });

  it('follows redirects that stay on allowed addresses', async () => {
    assert.match(await fetchHtml(`http://shop.test:${port}/redirect-same-host`), /Test product/);
  });

  it('refuses blocked IP literals and hostnames before connecting', async () => {
    await assert.rejects(fetchHtml(`http://127.0.0.2:${port}/page`), isBlocked);
    await assert.rejects(fetchHtml(`http://internal.test:${port}/page`), isBlocked);
    // Every resolved address must be allowed, not just the first.
    await assert.rejects(fetchHtml(`http://mixed.test:${port}/page`), isBlocked);
  });

  it('re-checks every redirect hop', async () => {
    await assert.rejects(fetchHtml(`http://shop.test:${port}/redirect-private-ip`), isBlocked);
    // A hostname passes the URL check; the agent's lookup must still block it.
    await assert.rejects(fetchHtml(`http://shop.test:${port}/redirect-internal-host`), isBlocked);
    await assert.rejects(fetchHtml(`http://shop.test:${port}/redirect-other-port`), isNotAllowed);
    await assert.rejects(fetchHtml(`http://shop.test:${port}/redirect-credentials`), isNotAllowed);
    await assert.rejects(fetchHtml(`http://shop.test:${port}/redirect-ftp`), isNotAllowed);
  });

  it('resolves and checks the address at connect time (DNS rebinding)', async () => {
    rebindLookups = 0;
    await assert.rejects(fetchHtml(`http://rebind.test:${port}/redirect-rebind`), isBlocked);
    const rebindHits = hits.filter((hit) => hit.startsWith('rebind.test'));
    assert.deepEqual(rebindHits, [`rebind.test:${port} /redirect-rebind`]);
  });

  it('stops after 3 redirects', async () => {
    const loopHits = () => hits.filter((hit) => hit.endsWith(' /loop')).length;
    const initial = loopHits();
    await assert.rejects(fetchHtml(`http://shop.test:${port}/loop`), (error) =>
      hasErrorCode(error, 'ERR_FR_TOO_MANY_REDIRECTS'),
    );
    // The first request plus 3 followed redirects.
    assert.equal(loopHits() - initial, 4);
  });

  it('only returns text/html bodies', async () => {
    await assert.rejects(fetchHtml(`http://shop.test:${port}/json`), (error) =>
      hasErrorCode(error, UNSUPPORTED_CONTENT_TYPE),
    );
  });

  it('caps the response size', async () => {
    await assert.rejects(fetchHtml(`http://shop.test:${port}/big`), /maxContentLength/);
  });

  it('enforces a total deadline while a body keeps trickling in', async () => {
    const started = Date.now();
    await assert.rejects(fetchHtml(`http://shop.test:${port}/slow`), (error) =>
      ['ERR_CANCELED', 'ETIMEDOUT'].some((code) => hasErrorCode(error, code)),
    );
    assert.ok(Date.now() - started < 4_000, 'deadline was not enforced');
  });

  it('agents block on their own, without the URL policy', async () => {
    const lookup = createGuardedLookup(isAllowedAddress, resolveAll);
    const client = axios.create({
      adapter: 'http',
      proxy: false,
      timeout: 2_000,
      httpAgent: new GuardedHttpAgent(isAllowedAddress, lookup),
      httpsAgent: new GuardedHttpsAgent(isAllowedAddress, lookup),
    });
    for (const url of [
      `http://127.0.0.2:${port}/page`,
      `http://[::1]:${port}/page`,
      `http://internal.test:${port}/page`,
      `https://127.0.0.2:${port}/page`,
      `https://internal.test:${port}/page`,
    ]) {
      await assert.rejects(client.get(url), isBlocked, url);
    }
    assert.equal((await client.get(`http://shop.test:${port}/page`)).status, 200);
    // An allowed https target gets as far as the TLS handshake (this server is plain HTTP).
    await assert.rejects(client.get(`https://shop.test:${port}/page`), (error) => !isBlocked(error));
  });

  it('production defaults block localhost and loopback via real DNS', async () => {
    const lookup = createGuardedLookup();
    const client = axios.create({
      adapter: 'http',
      proxy: false,
      timeout: 2_000,
      httpAgent: new GuardedHttpAgent(isPublicIp, lookup),
    });
    await assert.rejects(client.get(`http://localhost:${port}/page`), isBlocked);
    await assert.rejects(client.get(`http://127.0.0.1:${port}/page`), isBlocked);
    await assert.rejects(createHtmlFetcher()('http://localhost/'), isBlocked);
  });
});
