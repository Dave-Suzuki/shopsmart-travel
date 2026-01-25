import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

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
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const shouldShow = showCondition && !isTipDismissed(tipId) && !hasCompletedOnboarding;

  useEffect(() => {
    if (shouldShow) {
      // Small delay to allow rendering
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [shouldShow]);

  const handleDismiss = () => {
    setIsVisible(false);
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
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]} animate-fade-in`}
        >
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
            <div className="flex items-start gap-2">
              <p className="text-sm flex-1">{message}</p>
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-2 text-xs text-blue-200 hover:text-white font-medium"
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
