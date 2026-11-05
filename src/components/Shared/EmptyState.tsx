import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The primary action, e.g. a "New Trip" button. Centred under the description. */
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-lg shadow-md">
      <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {(actionLabel && onAction) || children ? (
        // A flex row: buttons are block-level here, so text-align alone wouldn't centre them.
        <div className="flex justify-center">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex min-h-11 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {actionLabel}
            </button>
          )}
          {children}
        </div>
      ) : null}
    </div>
  );
}
