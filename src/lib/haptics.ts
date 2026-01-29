/**
 * Haptic feedback utilities for mobile UX
 * Uses the Vibration API with fallback for unsupported devices
 */

type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning";

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 20],
  error: [40, 30, 40],
  warning: [20, 20, 20],
};

/**
 * Trigger haptic feedback
 * @param type - The type of haptic feedback to trigger
 */
export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined") return;

  // Check if Vibration API is available
  if ("vibrate" in navigator) {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "vibrate" in navigator;
}

// Pre-configured haptic functions
export const haptics = {
  // Basic patterns
  light: () => triggerHaptic("light"),
  medium: () => triggerHaptic("medium"),
  heavy: () => triggerHaptic("heavy"),
  success: () => triggerHaptic("success"),
  error: () => triggerHaptic("error"),
  warning: () => triggerHaptic("warning"),
  
  // Specific actions
  buttonPress: () => triggerHaptic("light"),
  toggle: () => triggerHaptic("light"),
  complete: () => triggerHaptic("success"),
  deleteAction: () => triggerHaptic("medium"),
  notification: () => triggerHaptic("medium"),
  achievement: () => triggerHaptic("success"),
};
