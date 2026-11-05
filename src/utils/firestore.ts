import { Timestamp } from 'firebase/firestore';

/**
 * With the persistent cache, a listener first gets whatever is cached, which can be empty or out
 * of date. While the device looks online, wait this long for the server before treating
 * cache-only data as final, so we don't flash "offline" or "not found" just before it arrives.
 */
export const SERVER_GRACE_MS = 1500;

/** True for a snapshot that came only from the offline cache while the device appears online. */
export function isAwaitingServer(fromCache: boolean): boolean {
  return fromCache && navigator.onLine;
}

/** Reads a Firestore timestamp field as a Date (now, if the field is missing). */
export function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}
