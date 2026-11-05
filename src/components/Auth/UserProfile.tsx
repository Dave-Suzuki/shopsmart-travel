import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function UserProfile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {user.photoURL && (
        <img
          src={user.photoURL}
          alt={user.displayName || 'User'}
          className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
        />
      )}
      <span className="text-white font-medium hidden sm:inline">
        {user.displayName}
      </span>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
