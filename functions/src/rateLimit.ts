import * as functions from 'firebase-functions';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

/**
 * A rolling-window limit stored in Firestore at `rateLimits/{uid}`. Each rule keeps the
 * timestamps (epoch ms) of the caller's recent calls in its own field, so several rules
 * can share one document.
 */
export interface RateLimitRule {
  /** Field in rateLimits/{uid} holding this rule's call timestamps. */
  key: string;
  /** Maximum calls allowed inside the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Message for the resource-exhausted error. */
  message: string;
}

/**
 * Pure window arithmetic: drops timestamps outside the window and, if the caller is
 * under the limit, appends `now`.
 */
export function recordCall(
  previous: unknown,
  now: number,
  rule: Pick<RateLimitRule, 'max' | 'windowMs'>,
): { allowed: boolean; calls: number[] } {
  const windowStart = now - rule.windowMs;
  const recent = (Array.isArray(previous) ? previous : [])
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t > windowStart)
    .sort((a, b) => a - b)
    .slice(-rule.max);
  if (recent.length >= rule.max) {
    return { allowed: false, calls: recent };
  }
  return { allowed: true, calls: [...recent, now] };
}

/**
 * Counts one call against `rule` for `uid` inside a Firestore transaction. Throws
 * HttpsError('resource-exhausted') when the caller is over the limit. Fails closed
 * (HttpsError 'unavailable') if the limit cannot be checked.
 */
export async function enforceRateLimit(uid: string, rule: RateLimitRule): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('rateLimits').doc(uid);

  let allowed: boolean;
  try {
    allowed = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const now = Date.now();
      const result = recordCall(snapshot.get(rule.key), now, rule);
      if (result.allowed) {
        tx.set(
          ref,
          {
            [rule.key]: result.calls,
            updatedAt: FieldValue.serverTimestamp(),
            // Lets a Firestore TTL policy on rateLimits.expiresAt delete idle docs.
            expiresAt: Timestamp.fromMillis(now + rule.windowMs),
          },
          { merge: true },
        );
      }
      return result.allowed;
    });
  } catch (error) {
    functions.logger.error('Rate limit check failed', { uid, key: rule.key, error });
    throw new functions.https.HttpsError(
      'unavailable',
      'This is temporarily unavailable. Please try again in a moment.',
    );
  }

  if (!allowed) {
    functions.logger.warn('Rate limit exceeded', { uid, key: rule.key });
    throw new functions.https.HttpsError('resource-exhausted', rule.message);
  }
}
