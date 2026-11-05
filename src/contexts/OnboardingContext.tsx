import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { OnboardingContext } from '../hooks/useOnboarding';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  dismissedTips: Set<string>;
  currentStep: number;
}

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
  // Welcome first-time users (decided once, from the state loaded above)
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => !state.hasCompletedOnboarding);

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
