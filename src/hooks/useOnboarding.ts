import { createContext, useContext } from 'react';

export interface OnboardingContextValue {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  showWelcomeModal: boolean;
  isTipDismissed: (tipId: string) => boolean;
  dismissTip: (tipId: string) => void;
  completeOnboarding: () => void;
  closeWelcomeModal: () => void;
  advanceStep: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** Reads the onboarding state provided by <OnboardingProvider>. */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
