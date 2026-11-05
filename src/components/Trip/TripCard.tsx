import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Trash2, Pencil, Share2, Users } from 'lucide-react';
import type { Trip } from '../../types/Trip';
import { showError } from '../../utils/toast';
import { formatCurrency } from '../../utils/currency';

interface TripCardProps {
  trip: Trip;
  onDelete: (tripId: string) => Promise<void>;
  onEdit: (trip: Trip) => void;
  onShare: (trip: Trip) => void;
  currentUserId: string;
}

const ICON_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200';

export function TripCard({ trip, onDelete, onEdit, onShare, currentUserId }: TripCardProps) {
  const titleId = useId();
  const isShared = trip.owners.length > 1;
  const isOwner = trip.createdBy === currentUserId;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${trip.name}"?`)) {
      try {
        await onDelete(trip.id);
      } catch {
        showError('Failed to delete trip');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4 sm:p-6 border border-gray-200">
      <div className="flex justify-between items-start gap-2 mb-4">
        <div className="flex-1 min-w-0 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <h2 id={titleId} className="text-xl font-bold text-gray-900 break-words">{trip.name}</h2>
            {isShared && (
              <div className="flex shrink-0 items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                <Users className="w-3 h-3" aria-hidden="true" />
                <span aria-hidden="true">{trip.owners.length}</span>
                <span className="sr-only">Shared with {trip.owners.length} people</span>
              </div>
            )}
          </div>
          {!isOwner && (
            <p className="text-xs text-gray-500 italic">Shared with you</p>
          )}
        </div>
        <div className="flex shrink-0 -mr-2 -mt-1">
          <button
            type="button"
            onClick={() => onShare(trip)}
            aria-label="Share trip"
            aria-describedby={titleId}
            className={`${ICON_BUTTON} text-green-600 hover:text-green-700 hover:bg-green-50`}
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(trip)}
            aria-label="Edit trip"
            aria-describedby={titleId}
            className={`${ICON_BUTTON} text-blue-500 hover:text-blue-700 hover:bg-blue-50`}
          >
            <Pencil className="w-5 h-5" aria-hidden="true" />
          </button>
          {/* Only the creator can delete a trip; others can leave it from the share dialog */}
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete trip"
              aria-describedby={titleId}
              className={`${ICON_BUTTON} text-red-500 hover:text-red-700 hover:bg-red-50`}
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{trip.destination}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {trip.budget > 0 ? `Budget: ${formatCurrency(trip.budget, trip.budgetCurrency)}` : 'No budget set'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link
          to={`/app/trip/${trip.id}`}
          aria-describedby={titleId}
          className="flex min-h-11 w-full items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
