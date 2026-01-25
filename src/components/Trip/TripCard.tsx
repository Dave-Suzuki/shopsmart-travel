import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Trash2, Edit, Share2, Users } from 'lucide-react';
import type { Trip } from '../../types/Trip';
import { showError } from '../../utils/toast';

interface TripCardProps {
  trip: Trip;
  onDelete: (tripId: string) => void;
  onEdit: (trip: Trip) => void;
  onShare: (trip: Trip) => void;
  currentUserId: string;
}

export function TripCard({ trip, onDelete, onEdit, onShare, currentUserId }: TripCardProps) {
  const navigate = useNavigate();
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
      } catch (error) {
        showError('Failed to delete trip');
      }
    }
  };

  const handleViewDetails = () => {
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{trip.name}</h3>
            {isShared && (
              <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full" title={`Shared with ${trip.owners.length} people`}>
                <Users className="w-3 h-3" />
                <span>{trip.owners.length}</span>
              </div>
            )}
          </div>
          {!isOwner && (
            <p className="text-xs text-gray-500 italic">Shared with you</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onShare(trip)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors duration-200"
            title="Share trip"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEdit(trip)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200"
            title="Edit trip"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200"
            title="Delete trip"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{trip.destination}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>
            Budget: {trip.budgetCurrency} {trip.budget.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleViewDetails}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
