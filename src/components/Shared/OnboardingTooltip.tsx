import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';

interface OnboardingTooltipProps {
  tipId: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  showCondition?: boolean;
}

export function OnboardingTooltip({
  tipId,
  message,
  position = 'bottom',
  children,
  showCondition = true,
}: OnboardingTooltipProps) {
  const { isTipDismissed, dismissTip, hasCompletedOnboarding } = useOnboarding();
  const [delayElapsed, setDelayElapsed] = useState(false);

  const shouldShow = showCondition && !isTipDismissed(tipId) && !hasCompletedOnboarding;

  useEffect(() => {
    if (!shouldShow) return;
    // Small delay to allow rendering
    const timer = setTimeout(() => setDelayElapsed(true), 500);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  const isVisible = shouldShow && delayElapsed;

  const handleDismiss = () => {
    dismissTip(tipId);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-blue-600',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-blue-600',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-blue-600',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-blue-600',
  };

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className={`absolute z-40 ${positionClasses[position]} motion-safe:animate-fade-in`}>
          {/* A fixed width: an absolutely positioned box would otherwise shrink to its anchor */}
          <div className="bg-blue-600 text-white pl-4 pr-1 py-2 rounded-lg shadow-lg w-72 max-w-[calc(100vw-2rem)] text-left">
            <div className="flex items-start gap-1">
              <p className="text-sm flex-1 pt-2">{message}</p>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-11 text-sm text-blue-100 hover:text-white font-medium"
            >
              Got it
            </button>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}
