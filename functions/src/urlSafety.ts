/**
 * Outbound request safety for scrapeProductInfo (server-side request forgery protection).
 *
 * Two layers, both applied to the first request and to every redirect hop:
 *
 * 1. URL policy (`assertUrlAllowed`): http/https only, ports 80/443 or none, no
 *    credentials in the URL, and IP-literal hosts must be public. Runs on the
 *    initial URL and, through axios' `beforeRedirect`, on each redirect target.
 * 2. Guarded http/https agents: every socket the agents open is checked at connect
 *    time. IP-literal hosts are checked in `createConnection` (Node skips DNS for
 *    them); hostnames go through a `lookup` wrapper that validates every resolved
 *    address before Node connects. Node connects to exactly the address the lookup
 *    returned, so there is no window for DNS rebinding between check and use.
 */
import axios from 'axios';
import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import type { Duplex } from 'node:stream';

export const BLOCKED_DESTINATION = 'ERR_BLOCKED_DESTINATION';
export const URL_NOT_ALLOWED = 'ERR_URL_NOT_ALLOWED';
export const UNSUPPORTED_CONTENT_TYPE = 'ERR_UNSUPPORTED_CONTENT_TYPE';

export const FETCH_TIMEOUT_MS = 8_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
/** URL ports we connect to; '' means "no explicit port" (the scheme default). */
export const DEFAULT_ALLOWED_PORTS: readonly string[] = ['', '80', '443'];

/** Thrown when a connection would go to a private, loopback, link-local or reserved address. */
export class BlockedDestinationError extends Error {
  readonly code = BLOCKED_DESTINATION;
  readonly host: string;
  readonly address: string;

  constructor(host: string, address: string = host) {
    super(`Refusing to connect to non-public address ${address} (host "${host}")`);
    this.name = 'BlockedDestinationError';
    this.host = host;
    this.address = address;
  }
}

/** Thrown when a URL breaks the scheme/port/credential policy. The message is user-facing. */
export class UrlNotAllowedError extends Error {
  readonly code = URL_NOT_ALLOWED;

  constructor(message: string) {
    super(message);
    this.name = 'UrlNotAllowedError';
  }
}

/** Thrown when the response is not an HTML document. */
export class UnsupportedContentTypeError extends Error {
  readonly code = UNSUPPORTED_CONTENT_TYPE;
  readonly contentType: string;

  constructor(contentType: string) {
    super(`Unsupported content type: ${contentType || '(none)'}`);
    this.name = 'UnsupportedContentTypeError';
    this.contentType = contentType;
  }
}

/** True if `error`, or any error in its `cause` chain, has the given `code`. */
export function hasErrorCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// ---------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------

/** IPv4 ranges that must never be fetched (IANA special-purpose registry and friends). */
const BLOCKED_IPV4_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. cloud metadata 169.254.169.254
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // deprecated 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. broadcast 255.255.255.255
];

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/** Parses a dotted-quad IPv4 address into an unsigned 32-bit number. */
function parseIPv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

const BLOCKED_IPV4 = BLOCKED_IPV4_CIDRS.map(([base, bits]) => {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return { network: ((parseIPv4(base) ?? 0) & mask) >>> 0, mask };
});

function isPublicIPv4(value: number): boolean {
  return !BLOCKED_IPV4.some(({ network, mask }) => ((value & mask) >>> 0) === network);
}

/** Parses an IPv6 address (optionally with an embedded IPv4 tail or zone id) into 8 groups. */
function parseIPv6(input: string): number[] | null {
  let ip = input.split('%')[0];
  const lastColon = ip.lastIndexOf(':');
  if (lastColon === -1) return null;

  const tail = ip.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (v4 === null) return null;
    ip = `${ip.slice(0, lastColon + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }

  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const parseGroups = (text: string): number[] | null => {
    if (text === '') return [];
    const groups: number[] = [];
    for (const group of text.split(':')) {
      if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
      groups.push(parseInt(group, 16));
    }
    return groups;
  };

  const head = parseGroups(halves[0]);
  const rest = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (head === null || rest === null) return null;

  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - rest.length;
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...rest];
}

function isPublicIPv6(groups: number[]): boolean {
  // IPv4-mapped (::ffff:a.b.c.d): judge the embedded IPv4 address.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return isPublicIPv4(groups[6] * 0x10000 + groups[7]);
  }
  // Only global unicast (2000::/3) is reachable on the public internet. This rejects
  // ::, ::1, IPv4-compatible ::/96, NAT64 64:ff9b::/96, fc00::/7, fe80::/10, ff00::/8, etc.
  if ((groups[0] & 0xe000) !== 0x2000) return false;
  // Special-purpose blocks inside 2000::/3.
  if (groups[0] === 0x2001 && groups[1] < 0x0200) return false; // 2001::/23 IETF (Teredo, benchmarking, ORCHID)
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return false; // 2001:db8::/32 documentation
  if (groups[0] === 0x2002) return false; // 2002::/16 6to4 (embeds an IPv4 address)
  if (groups[0] === 0x3fff && groups[1] < 0x1000) return false; // 3fff::/20 documentation
  return true;
}

/**
 * True only for publicly routable unicast IPv4/IPv6 addresses. Anything that is not a
 * valid IP address, or is private, loopback, link-local, CGNAT, multicast, reserved or
 * documentation space (including IPv4-mapped forms of those), returns false.
 */
export function isPublicIp(address: string): boolean {
  if (typeof address !== 'string') return false;
  const ip = stripBrackets(address);
  switch (net.isIP(ip)) {
    case 4: {
      const value = parseIPv4(ip);
      return value !== null && isPublicIPv4(value);
    }
    case 6: {
      const groups = parseIPv6(ip);
      return groups !== null && isPublicIPv6(groups);
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// URL policy
// ---------------------------------------------------------------------------

export interface UrlPolicy {
  allowedPorts: ReadonlySet<string>;
  isAllowedAddress: (ip: string) => boolean;
}

const DEFAULT_URL_POLICY: UrlPolicy = {
  allowedPorts: new Set(DEFAULT_ALLOWED_PORTS),
  isAllowedAddress: isPublicIp,
};

/**
 * Parses `input` and enforces the URL policy. Throws UrlNotAllowedError (user-facing
 * message) or BlockedDestinationError (IP-literal host that is not public).
 */
export function assertUrlAllowed(input: string, policy: UrlPolicy = DEFAULT_URL_POLICY): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UrlNotAllowedError('Invalid URL format');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlNotAllowedError('Only http:// and https:// links are supported.');
  }
  if (url.username !== '' || url.password !== '') {
    throw new UrlNotAllowedError('Links that include a username or password are not supported.');
  }
  if (!policy.allowedPorts.has(url.port)) {
    throw new UrlNotAllowedError('Links with a custom port number are not supported.');
  }
  const host = stripBrackets(url.hostname);
  if (host === '') {
    throw new UrlNotAllowedError('Invalid URL format');
  }
  if (net.isIP(host) !== 0 && !policy.isAllowedAddress(host)) {
    throw new BlockedDestinationError(host);
  }
  return url;
}

// ---------------------------------------------------------------------------
// Connection-time guard (custom lookup + agents)
// ---------------------------------------------------------------------------

/** dns.lookup with `{ all: true }`; injectable so tests can simulate DNS answers. */
export type ResolveAll = (
  hostname: string,
  options: dns.LookupAllOptions,
  callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void,
) => void;

/**
 * Wraps a resolver so that a hostname resolving to any non-allowed address fails the
 * connection. Every address is checked because Node may try several of them.
 */
export function createGuardedLookup(
  isAllowedAddress: (ip: string) => boolean = isPublicIp,
  resolveAll: ResolveAll = dns.lookup,
): net.LookupFunction {
  return (hostname, options, callback) => {
    resolveAll(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) {
        callback(err, []);
        return;
      }
      if (!Array.isArray(addresses) || addresses.length === 0) {
        const notFound: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
        notFound.code = 'ENOTFOUND';
        callback(notFound, []);
        return;
      }
      const blocked = addresses.find((entry) => !isAllowedAddress(entry.address));
      if (blocked) {
        callback(new BlockedDestinationError(hostname, blocked.address), []);
        return;
      }
      if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0].address, addresses[0].family);
      }
    });
  };
}

interface ConnectionTarget {
  host?: string | null;
  hostname?: string | null;
  socketPath?: string;
  path?: string | null;
}

/** Returns an error if the agent is about to connect somewhere it must not. */
function checkConnectionTarget(
  options: ConnectionTarget,
  isAllowedAddress: (ip: string) => boolean,
): Error | null {
  // Node's Agent clears `path` for TCP connections; a value here means a Unix socket.
  if (options.socketPath || options.path) {
    return new BlockedDestinationError(String(options.socketPath || options.path), 'unix socket');
  }
  // IP literals bypass `lookup`, so they are checked here.
  const host = stripBrackets(String(options.host || options.hostname || ''));
  if (net.isIP(host) !== 0 && !isAllowedAddress(host)) {
    return new BlockedDestinationError(host);
  }
  return null;
}

type ConnectionCallback = (err: Error | null, stream: Duplex) => void;

function failConnection(error: Error, callback?: ConnectionCallback): undefined {
  if (!callback) throw error;
  // Agent#createSocket treats an error passed here as a failed connect and the request
  // emits it; the stream argument is ignored when err is set.
  callback(error, undefined as unknown as Duplex);
  return undefined;
}

/** http.Agent that refuses to open sockets to non-allowed addresses. */
export class GuardedHttpAgent extends http.Agent {
  private readonly isAllowedAddress: (ip: string) => boolean;
  private readonly guardedLookup: net.LookupFunction;

  constructor(isAllowedAddress: (ip: string) => boolean, guardedLookup: net.LookupFunction) {
    super({ keepAlive: false, lookup: guardedLookup });
    this.isAllowedAddress = isAllowedAddress;
    this.guardedLookup = guardedLookup;
  }

  createConnection(
    options: http.ClientRequestArgs,
    callback?: ConnectionCallback,
  ): Duplex | null | undefined {
    const blocked = checkConnectionTarget(options, this.isAllowedAddress);
    if (blocked) return failConnection(blocked, callback);
    return super.createConnection({ ...options, lookup: this.guardedLookup }, callback);
  }
}

/** https.Agent that refuses to open sockets to non-allowed addresses. */
export class GuardedHttpsAgent extends https.Agent {
  private readonly isAllowedAddress: (ip: string) => boolean;
  private readonly guardedLookup: net.LookupFunction;

  constructor(isAllowedAddress: (ip: string) => boolean, guardedLookup: net.LookupFunction) {
    super({ keepAlive: false, lookup: guardedLookup });
    this.isAllowedAddress = isAllowedAddress;
    this.guardedLookup = guardedLookup;
  }

  createConnection(
    options: https.RequestOptions,
    callback?: ConnectionCallback,
  ): Duplex | null | undefined {
    const blocked = checkConnectionTarget(options, this.isAllowedAddress);
    if (blocked) return failConnection(blocked, callback);
    return super.createConnection({ ...options, lookup: this.guardedLookup }, callback);
  }
}

// ---------------------------------------------------------------------------
// HTML fetcher
// ---------------------------------------------------------------------------

export interface HtmlFetcherOptions {
  /** Address check for every connection. Defaults to isPublicIp. */
  isAllowedAddress?: (ip: string) => boolean;
  /** DNS resolver. Defaults to dns.lookup. */
  resolveAll?: ResolveAll;
  /** Allowed URL ports ('' = scheme default). Defaults to '', '80' and '443'. */
  allowedPorts?: readonly string[];
  /** Deadline for the whole fetch, redirects and body included. */
  timeoutMs?: number;
  /** Maximum (decompressed) response size. */
  maxBytes?: number;
  maxRedirects?: number;
}

export type HtmlFetcher = (url: string, headers?: Record<string, string>) => Promise<string>;

function isHtmlContentType(contentType: string): boolean {
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return mediaType === 'text/html' || mediaType === 'application/xhtml+xml';
}

/**
 * Builds a fetch function that only talks to public addresses, follows at most
 * `maxRedirects` redirects (each re-checked), stops after `timeoutMs` in total and
 * `maxBytes` of body, and only returns text/html or application/xhtml+xml bodies.
 */
export function createHtmlFetcher(options: HtmlFetcherOptions = {}): HtmlFetcher {
  const isAllowedAddress = options.isAllowedAddress ?? isPublicIp;
  const policy: UrlPolicy = {
    allowedPorts: new Set(options.allowedPorts ?? DEFAULT_ALLOWED_PORTS),
    isAllowedAddress,
  };
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const lookup = createGuardedLookup(isAllowedAddress, options.resolveAll ?? dns.lookup);

  const client = axios.create({
    // Force Node's http adapter: the fetch adapter would ignore the guarded agents.
    adapter: 'http',
    httpAgent: new GuardedHttpAgent(isAllowedAddress, lookup),
    httpsAgent: new GuardedHttpsAgent(isAllowedAddress, lookup),
    // Never route through an environment proxy: the proxy would resolve the host itself.
    proxy: false,
    timeout: timeoutMs,
    transitional: { ...axios.defaults.transitional, clarifyTimeoutError: true },
    maxRedirects: options.maxRedirects ?? MAX_REDIRECTS,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    responseType: 'text',
    responseEncoding: 'utf8',
    // Re-apply the URL policy to every redirect target before it is requested.
    beforeRedirect: (redirectOptions: Record<string, unknown>) => {
      assertUrlAllowed(String(redirectOptions.href ?? ''), policy);
    },
  });

  return async (url, headers = {}) => {
    const target = assertUrlAllowed(url, policy);
    const response = await client.get<string>(target.href, {
      headers,
      // `timeout` alone is per hop and stops counting once headers arrive; this
      // signal is a hard deadline for the whole exchange, including a slow body.
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = String(response.headers['content-type'] ?? '');
    if (!isHtmlContentType(contentType)) {
      throw new UnsupportedContentTypeError(contentType);
    }
    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  };
}
