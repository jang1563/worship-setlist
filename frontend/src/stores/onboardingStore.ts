import { create } from 'zustand';

const ONBOARDING_STORAGE_KEY = 'worshipflow_onboarding_completed';

interface OnboardingState {
  isFirstVisit: boolean;
  currentStep: number;
  isModalOpen: boolean;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
  openModal: () => void;
  closeModal: () => void;
  resetOnboarding: () => void;
}

const checkIsFirstVisit = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isFirstVisit: checkIsFirstVisit(),
  currentStep: 0,
  isModalOpen: checkIsFirstVisit(),

  setCurrentStep: (step) =>
    set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({ currentStep: state.currentStep + 1 })),

  prevStep: () =>
    set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

  completeOnboarding: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
    set({ isFirstVisit: false, isModalOpen: false, currentStep: 0 });
  },

  openModal: () =>
    set({ isModalOpen: true, currentStep: 0 }),

  closeModal: () =>
    set({ isModalOpen: false }),

  resetOnboarding: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
    set({ isFirstVisit: true, isModalOpen: true, currentStep: 0 });
  },
}));
