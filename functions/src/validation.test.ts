import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateExchangeRates } from './exchangeRates';
import { parseInviteRequest } from './invite';
import { recordCall } from './rateLimit';

describe('validateExchangeRates', () => {
  const rates = { USD: 1, EUR: 0.92, GBP: 0.78, JPY: 151.3, CAD: 1.37 };
  const payload = (overrides: Record<string, unknown> = {}) => ({
    base: 'USD',
    date: '2026-11-05',
    rates: { ...rates, ...overrides },
  });

  it('returns the rates of a sane payload', () => {
    assert.deepEqual(validateExchangeRates(payload()), rates);
  });

  it('rejects malformed or implausible payloads', () => {
    const withoutJpy: Record<string, number> = { ...rates };
    delete withoutJpy.JPY;
    const cases: Array<[string, unknown]> = [
      ['not an object', 'nope'],
      ['null', null],
      ['no rates', { base: 'USD' }],
      ['rates is an array', { base: 'USD', rates: [1, 2] }],
      ['empty rates', { base: 'USD', rates: {} }],
      ['wrong base', { ...payload(), base: 'EUR' }],
      ['USD is not 1', payload({ USD: 1.01 })],
      ['negative rate', payload({ CAD: -1 })],
      ['zero rate', payload({ CAD: 0 })],
      ['string rate', payload({ CAD: '1.37' })],
      ['null rate', payload({ CAD: null })],
      ['infinite rate', payload({ CAD: Infinity })],
      ['bad currency code', payload({ cad: 1.37 })],
      ['EUR too high', payload({ EUR: 2.5 })],
      ['GBP too low', payload({ GBP: 0.3 })],
      ['JPY too high', payload({ JPY: 1000 })],
      ['JPY missing', { base: 'USD', rates: withoutJpy }],
    ];
    for (const [label, input] of cases) {
      assert.throws(() => validateExchangeRates(input), Error, label);
    }
  });
});

describe('recordCall (rolling rate-limit window)', () => {
  const rule = { max: 3, windowMs: 1_000 };

  it('allows max calls inside the window, then refuses', () => {
    let calls: unknown;
    for (let i = 0; i < 3; i++) {
      const result = recordCall(calls, 10_000 + i, rule);
      assert.equal(result.allowed, true);
      calls = result.calls;
    }
    assert.deepEqual(recordCall(calls, 10_003, rule), {
      allowed: false,
      calls: [10_000, 10_001, 10_002],
    });
  });

  it('admits calls again once old ones leave the window', () => {
    assert.deepEqual(recordCall([10_000, 10_001, 10_002], 11_001, rule), {
      allowed: true,
      calls: [10_002, 11_001],
    });
  });

  it('ignores malformed stored values', () => {
    assert.deepEqual(recordCall('garbage', 5_000, rule), { allowed: true, calls: [5_000] });
    assert.deepEqual(recordCall([null, 'x', NaN, 4_500], 5_000, rule).calls, [4_500, 5_000]);
  });
});

describe('parseInviteRequest', () => {
  it('trims the trip ID and trims + lowercases the email', () => {
    assert.deepEqual(parseInviteRequest({ tripId: ' abcDEF123_- ', email: '  Friend@Example.COM ' }), {
      tripId: 'abcDEF123_-',
      email: 'friend@example.com',
    });
  });

  it('rejects missing or malformed input with invalid-argument', () => {
    const cases: unknown[] = [
      undefined,
      null,
      'tripId',
      {},
      { tripId: 'abc' },
      { email: 'a@b.co' },
      { tripId: '', email: 'a@b.co' },
      { tripId: 123, email: 'a@b.co' },
      { tripId: 'abc', email: '   ' },
      { tripId: 'abc', email: 'not-an-email' },
      { tripId: 'abc', email: 'a@b' },
      { tripId: 'abc', email: `${'a'.repeat(250)}@b.co` },
      { tripId: 'a/b', email: 'a@b.co' },
      { tripId: 'x/shoppingList/y', email: 'a@b.co' },
    ];
    for (const data of cases) {
      assert.throws(
        () => parseInviteRequest(data),
        (error: unknown) => (error as { code?: unknown }).code === 'invalid-argument',
        JSON.stringify(data),
      );
    }
  });
});
