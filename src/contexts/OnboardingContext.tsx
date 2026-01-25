import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  dismissedTips: Set<string>;
  currentStep: number;
}

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  showWelcomeModal: boolean;
  isTipDismissed: (tipId: string) => boolean;
  dismissTip: (tipId: string) => void;
  completeOnboarding: () => void;
  closeWelcomeModal: () => void;
  advanceStep: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = 'shopsmart_onboarding';

function loadOnboardingState(): OnboardingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        hasCompletedOnboarding: parsed.hasCompletedOnboarding || false,
        dismissedTips: new Set(parsed.dismissedTips || []),
        currentStep: parsed.currentStep || 0,
      };
    }
  } catch (e) {
    console.error('Failed to load onboarding state:', e);
  }
  return {
    hasCompletedOnboarding: false,
    dismissedTips: new Set(),
    currentStep: 0,
  };
}

function saveOnboardingState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      dismissedTips: Array.from(state.dismissedTips),
      currentStep: state.currentStep,
    }));
  } catch (e) {
    console.error('Failed to save onboarding state:', e);
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadOnboardingState);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Check if we should show welcome modal on mount
  useEffect(() => {
    if (!state.hasCompletedOnboarding) {
      setShowWelcomeModal(true);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    saveOnboardingState(state);
  }, [state]);

  const isTipDismissed = useCallback((tipId: string) => {
    return state.dismissedTips.has(tipId);
  }, [state.dismissedTips]);

  const dismissTip = useCallback((tipId: string) => {
    setState(prev => ({
      ...prev,
      dismissedTips: new Set([...prev.dismissedTips, tipId]),
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
    setShowWelcomeModal(false);
  }, []);

  const closeWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
  }, []);

  const advanceStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
    }));
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentStep: state.currentStep,
        showWelcomeModal,
        isTipDismissed,
        dismissTip,
        completeOnboarding,
        closeWelcomeModal,
        advanceStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
