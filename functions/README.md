# ShopSmart Travel - Firebase Cloud Functions

Cloud Functions (2nd gen) for ShopSmart Travel, written in TypeScript.

- **Runtime:** Node.js 22 (`engines.node` in `package.json`)
- **SDKs:** `firebase-functions` 7, `firebase-admin` 13 (initialised once in `src/index.ts`)

| Function | Type | Purpose |
| --- | --- | --- |
| `scrapeProductInfo` | HTTPS callable | Reads product details from a shop page URL |
| `inviteCollaborator` | HTTPS callable | Adds a ShopSmart user to a trip by email |
| `refreshExchangeRates` | Scheduled, every 6 hours (UTC) | Writes the USD exchange-rate snapshot |

## scrapeProductInfo

**Auth:** required. **Input:** `{ url: string }`.
**Output:** `{ name?, image?, description?, price?, currency?, brand?, error? }`. Fetch problems come
back as a friendly `error` string; invalid input throws `invalid-argument`.

Extracts Open Graph / Twitter Card metadata, JSON-LD `Product` data, schema.org meta tags, common
JavaScript state objects (`__NEXT_DATA__`, `__INITIAL_STATE__`, ...) and common price selectors.

Outbound requests are locked down against server-side request forgery (`src/urlSafety.ts`):

- Only `http:`/`https:` URLs with no port or port 80/443, and no `user:password@` part.
- Every connection, including each redirect hop, must go to a **public** IP address. Private,
  loopback, link-local (including the `169.254.169.254` metadata server), CGNAT, multicast,
  reserved and documentation ranges are refused for IPv4 and IPv6 (`::1`, `fc00::/7`,
  `fe80::/10`, IPv4-mapped `::ffff:a.b.c.d`, NAT64, 6to4, ...).
- The check runs on the address Node actually connects to (custom `lookup` plus a
  `createConnection` check on guarded http/https agents), so DNS rebinding cannot slip past it.
  No environment proxy is used.
- At most 3 redirects, an 8 second deadline for the whole fetch, a 2 MB response cap, and only
  `text/html` / `application/xhtml+xml` responses are parsed.
- **Rate limit:** 30 calls per user per rolling hour, tracked in `rateLimits/{uid}` with a
  Firestore transaction. Over the limit the call fails with `resource-exhausted`
  ("Too many lookups. Try again in a few minutes.").

## inviteCollaborator

**Auth:** required. **Input:** `{ tripId: string, email: string }`.
**Output:** `{ uid: string, displayName: string }` (display name falls back to the email's local part).

Only the trip's creator (`trips/{tripId}.createdBy`) can invite. On success the user is added to
`trips/{tripId}.owners`, `updatedAt` is bumped, and `profiles/{uid}` is upserted with the user's
`displayName` and `photoURL` from Firebase Auth (never the email). Errors: `invalid-argument`,
`not-found` (no trip, or no account with that email), `permission-denied` (caller isn't the creator),
`already-exists` (already on the trip), `resource-exhausted` (more than 20 invites per hour).

Invites run on the server because clients can no longer list or query the private `users`
collection.

## refreshExchangeRates

Runs every 6 hours (UTC). It fetches `https://api.exchangerate-api.com/v4/latest/USD` (10 second
timeout) and validates the result: every rate must be a finite positive number, USD must be exactly 1,
and EUR, GBP and JPY must fall within sanity ranges. It then writes `exchangeRates/{YYYY-MM-DD}` with
`{ base: 'USD', rates, updatedAt, source }`. If the fetch or the validation fails, the run fails, nothing
is written, and Cloud Scheduler retries up to 2 times. This function is the only writer of
`exchangeRates`. Clients read the newest document ordered by `updatedAt`.

## Development

```bash
cd functions
npm install
npm run build   # tsc -> lib/
npm test        # build + node:test unit tests (IP ranges, URL policy, SSRF against a local server, validators)
npm run serve   # build + Functions emulator
```

## Deployment

**Deploy functions before rules.** The new Firestore rules make `users/{uid}` private and stop
clients from writing `exchangeRates`. `inviteCollaborator` and `refreshExchangeRates` take over
those jobs, so deploy them first:

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
```

The GitHub deploy workflow deploys hosting, rules and storage but **not** functions, so run the
functions deploy by hand before merging rule changes.

After the first deploy you can seed today's exchange rates without waiting for the schedule:

```bash
gcloud scheduler jobs run firebase-schedule-refreshExchangeRates-us-central1 --location=us-central1
```

Optional: let Firestore delete idle rate-limit documents automatically:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=rateLimits --enable-ttl
```

`rateLimits` is server-only (the Admin SDK bypasses rules), so no client rule should allow access to it.

## Logs

```bash
npm run logs                                    # or: firebase functions:log
firebase functions:log --only scrapeProductInfo
```

Blocked requests to non-public addresses are logged as warnings ("Blocked request to a non-public
address") along with the caller's uid.
