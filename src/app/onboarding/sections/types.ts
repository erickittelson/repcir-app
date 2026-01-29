import type { OnboardingData } from "../page";

export interface SectionProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
}
