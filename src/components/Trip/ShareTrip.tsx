import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Users, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { Trip } from '../../types/Trip';
import { showError } from '../../utils/toast';

interface ShareTripProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onShareTrip: (tripId: string, userIdToAdd: string) => Promise<void>;
  onRemoveCollaborator: (tripId: string, userIdToRemove: string) => Promise<void>;
  currentUserId: string;
}

interface UserInfo {
  uid: string;
  email: string;
  displayName: string;
}

export function ShareTrip({ trip, isOpen, onClose, onShareTrip, onRemoveCollaborator, currentUserId }: ShareTripProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<UserInfo[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Load collaborator details when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, trip.owners]);

  const loadCollaborators = async () => {
    setLoadingCollaborators(true);
    try {
      const userPromises = trip.owners.map(async (ownerId) => {
        const userQuery = query(collection(db, 'users'), where('uid', '==', ownerId));
        const snapshot = await getDocs(userQuery);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          return {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || userData.email,
          } as UserInfo;
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      setCollaborators(users.filter((u) => u !== null) as UserInfo[]);
    } catch (err) {
      console.error('Error loading collaborators:', err);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate email format
      const trimmedEmail = email.toLowerCase().trim();
      if (!validateEmail(trimmedEmail)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No user found with that email address. Make sure they have signed in to the app at least once.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.data().uid;

      // Check if user is already an owner
      if (trip.owners.includes(userId)) {
        setError('This user is already a collaborator on this trip.');
        setLoading(false);
        return;
      }

      // Add user as owner
      await onShareTrip(trip.id, userId);
      setSuccess(`Trip shared with ${email}!`);
      setEmail('');

      // Reload collaborators
      await loadCollaborators();
    } catch (err: any) {
      console.error('Error sharing trip:', err);
      setError(err.message || 'Failed to share trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (userId === trip.createdBy) {
      showError('Cannot remove the trip creator.');
      return;
    }

    if (userId === currentUserId) {
      if (!window.confirm('Are you sure you want to remove yourself from this trip? You will lose access.')) {
        return;
      }
    } else {
      if (!window.confirm('Are you sure you want to remove this collaborator?')) {
        return;
      }
    }

    try {
      await onRemoveCollaborator(trip.id, userId);
      await loadCollaborators();

      if (userId === currentUserId) {
        onClose();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to remove collaborator.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Share Trip</h2>
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
              Share this trip with others to collaborate on shopping items and budgets.
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
                {collaborators.map((collaborator) => (
                  <div key={collaborator.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{collaborator.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{collaborator.email}</p>
                      </div>
                    </div>
                    {collaborator.uid === trip.createdBy && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium flex-shrink-0">
                        Owner
                      </span>
                    )}
                    {collaborator.uid !== trip.createdBy && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.uid)}
                        className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Collaborator Form */}
          <form onSubmit={handleShare} className="space-y-4">
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
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <UserPlus className="w-5 h-5" />
                  {loading ? 'Adding...' : 'Add'}
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
