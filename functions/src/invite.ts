import * as functions from 'firebase-functions';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { enforceRateLimit, type RateLimitRule } from './rateLimit';

const { HttpsError } = functions.https;

export interface InviteCollaboratorRequest {
  tripId: string;
  email: string;
}

export interface InviteCollaboratorResponse {
  uid: string;
  displayName: string;
}

// Trips are created with Firestore auto-IDs; this also keeps "/" out of the doc path.
const TRIP_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * Bounds how fast one owner can probe which emails have accounts (the not-found reply
 * reveals that). Counted only after the ownership check.
 */
const INVITE_RATE_LIMIT: RateLimitRule = {
  key: 'inviteCollaborator',
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: 'Too many invites. Try again in a few minutes.',
};

/** Validates and normalises the callable's input. Throws HttpsError('invalid-argument'). */
export function parseInviteRequest(data: unknown): InviteCollaboratorRequest {
  const { tripId, email } = (data ?? {}) as { tripId?: unknown; email?: unknown };

  if (typeof tripId !== 'string' || tripId.trim() === '') {
    throw new HttpsError('invalid-argument', 'A trip ID is required.');
  }
  if (typeof email !== 'string' || email.trim() === '') {
    throw new HttpsError('invalid-argument', 'An email address is required.');
  }

  const normalizedTripId = tripId.trim();
  if (!TRIP_ID_PATTERN.test(normalizedTripId)) {
    throw new HttpsError('invalid-argument', 'Invalid trip ID.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
  }

  return { tripId: normalizedTripId, email: normalizedEmail };
}

/** Throws unless the trip exists and `callerUid` created it; returns its owners. */
function assertTripOwner(snapshot: DocumentSnapshot, callerUid: string): string[] {
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Trip not found.');
  }
  const trip = snapshot.data() ?? {};
  if (trip.createdBy !== callerUid) {
    throw new HttpsError('permission-denied', 'Only the trip owner can invite people.');
  }
  return Array.isArray(trip.owners) ? trip.owners : [];
}

async function findUserByEmail(email: string): Promise<UserRecord> {
  try {
    return await getAuth().getUserByEmail(email);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'auth/user-not-found') {
      throw new HttpsError(
        'not-found',
        'No ShopSmart account uses that email yet. Ask them to sign in once, then invite them again.',
      );
    }
    if (code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
    }
    functions.logger.error('getUserByEmail failed', { error });
    throw new HttpsError('internal', 'Could not look up that email. Please try again.');
  }
}

/**
 * Adds the account registered under `email` to a trip's owners. Only the trip's creator
 * may invite. Also upserts the invitee's public profile (displayName/photoURL) so other
 * collaborators can show who they are without reading the private users collection.
 */
export const inviteCollaborator = functions.https.onCall(
  async (request): Promise<InviteCollaboratorResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to invite people.');
    }
    const callerUid = request.auth.uid;
    const { tripId, email } = parseInviteRequest(request.data);

    const db = getFirestore();
    const tripRef = db.collection('trips').doc(tripId);

    // Check ownership before touching Auth so non-owners learn nothing about the email.
    assertTripOwner(await tripRef.get(), callerUid);
    await enforceRateLimit(callerUid, INVITE_RATE_LIMIT);

    const invitee = await findUserByEmail(email);
    const displayName = invitee.displayName?.trim() || (invitee.email ?? email).split('@')[0];
    const profileRef = db.collection('profiles').doc(invitee.uid);

    await db.runTransaction(async (tx) => {
      const owners = assertTripOwner(await tx.get(tripRef), callerUid);
      if (owners.includes(invitee.uid)) {
        throw new HttpsError('already-exists', 'They are already on this trip.');
      }
      tx.update(tripRef, {
        owners: FieldValue.arrayUnion(invitee.uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Public profile: copy only what the Auth record says (never the email).
      tx.set(
        profileRef,
        {
          displayName: invitee.displayName ?? null,
          photoURL: invitee.photoURL ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    functions.logger.info('Collaborator added to trip', {
      tripId,
      invitedBy: callerUid,
      invitee: invitee.uid,
    });
    return { uid: invitee.uid, displayName };
  },
);
