import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Users, Trash2, LogOut } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase';
import type { Trip } from '../../types/Trip';
import { showError } from '../../utils/toast';

interface ShareTripProps {
  /** The live trip, so membership changes show up while the dialog is open. */
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onRemoveCollaborator: (tripId: string, userIdToRemove: string) => Promise<void>;
  onLeaveTrip: (tripId: string) => Promise<void>;
  currentUserId: string;
  currentUserEmail: string | null;
}

/** Public profile card (profiles/{uid}); null if there is none or it couldn't be loaded. */
type Profile = { displayName: string } | null;

// Looks the email up server-side (users can't be queried from the client) and adds that
// person to the trip. Only the trip's creator may call it.
const inviteCollaborator = httpsCallable<{ tripId: string; email: string }, { uid: string; displayName: string }>(
  functions,
  'inviteCollaborator'
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadProfile(uid: string): Promise<Profile> {
  try {
    const snapshot = await getDoc(doc(db, 'profiles', uid));
    const displayName = snapshot.exists() ? snapshot.data().displayName : undefined;
    return typeof displayName === 'string' && displayName ? { displayName } : null;
  } catch (err) {
    console.error('Error loading collaborator profile:', err);
    return null;
  }
}

// Errors inviteCollaborator reports to users, with fallbacks in case it sends no message.
const INVITE_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'No ShopSmart account uses that email. Ask them to sign in to the app once, then try again.',
  'permission-denied': 'Only the person who created this trip can invite others.',
  'already-exists': 'That person is already on this trip.',
  'invalid-argument': 'Please enter a valid email address.',
  'resource-exhausted': 'Too many invites. Try again in a few minutes.',
  unauthenticated: 'Your session has expired. Please sign in again.',
};

function inviteErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    const fallback = INVITE_ERROR_MESSAGES[err.code.replace(/^functions\//, '')];
    if (fallback) {
      // The function's messages are written for users; a bare status name (NOT_FOUND) isn't.
      return err.message && !/^[A-Z_]+$/.test(err.message) ? err.message : fallback;
    }
  }
  return navigator.onLine
    ? 'Could not share the trip. Please try again.'
    : "You're offline. Connect to the internet to invite people.";
}

export function ShareTrip({
  trip,
  isOpen,
  onClose,
  onRemoveCollaborator,
  onLeaveTrip,
  currentUserId,
  currentUserEmail,
}: ShareTripProps) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const isCreator = trip.createdBy === currentUserId;
  const ownersKey = trip.owners.join('|');

  // Load collaborators' public profile cards whenever the member list changes.
  useEffect(() => {
    if (!isOpen || !ownersKey) return;
    let cancelled = false;
    const uids = ownersKey.split('|');

    Promise.all(uids.map(loadProfile)).then((loaded) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        uids.forEach((uid, index) => {
          // Keep a name we already know (e.g. from the invite) if the card has none.
          next[uid] = loaded[index] ?? prev[uid] ?? null;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, ownersKey]);

  const loadingCollaborators = trip.owners.some((uid) => !(uid in profiles));

  const nameFor = (uid: string) => profiles[uid]?.displayName || (uid === currentUserId ? 'You' : 'Collaborator');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.toLowerCase().trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      const { data } = await inviteCollaborator({ tripId: trip.id, email: trimmedEmail });
      // We already know the new member's name; no need to wait for their profile to load.
      setProfiles((prev) => ({ ...prev, [data.uid]: { displayName: data.displayName || '' } }));
      setSuccess(`Trip shared with ${data.displayName || trimmedEmail}!`);
      setEmail('');
    } catch (err) {
      console.error('Error sharing trip:', err);
      setError(inviteErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!window.confirm(`Remove ${nameFor(userId)} from this trip? They will lose access.`)) {
      return;
    }

    try {
      await onRemoveCollaborator(trip.id, userId);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove collaborator.');
    }
  };

  const handleLeaveTrip = async () => {
    if (!window.confirm('Are you sure you want to leave this trip? You will lose access.')) {
      return;
    }

    try {
      await onLeaveTrip(trip.id);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to leave trip.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">{isCreator ? 'Share Trip' : 'Trip Members'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{trip.name}</h3>
            <p className="text-sm text-gray-600">
              {isCreator
                ? 'Share this trip with others to collaborate on shopping items and budgets.'
                : 'Only the person who created this trip can invite or remove people.'}
            </p>
          </div>

          {/* Current Collaborators */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Collaborators ({trip.owners.length})</h4>
            {loadingCollaborators ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {trip.owners.map((uid) => {
                  const isSelf = uid === currentUserId;
                  const isTripCreator = uid === trip.createdBy;
                  return (
                    <div key={uid} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {nameFor(uid)}
                            {isSelf && profiles[uid]?.displayName ? ' (you)' : ''}
                          </p>
                          {/* Emails are private; we only know (and show) our own */}
                          {isSelf && currentUserEmail && (
                            <p className="text-xs text-gray-500 truncate">{currentUserEmail}</p>
                          )}
                        </div>
                      </div>
                      {isTripCreator ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium flex-shrink-0">
                          Owner
                        </span>
                      ) : isSelf ? (
                        <button
                          onClick={handleLeaveTrip}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 p-1 flex-shrink-0"
                        >
                          <LogOut className="w-4 h-4" />
                          Leave trip
                        </button>
                      ) : isCreator ? (
                        <button
                          onClick={() => handleRemoveCollaborator(uid)}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                          title="Remove collaborator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Collaborator Form (creator only) */}
          {isCreator && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Add Collaborator by Email
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="collaborator@example.com"
                      disabled={inviting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting || !email.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <UserPlus className="w-5 h-5" />
                    {inviting ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The user must have signed in to the app at least once.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
