/**
 * Privacy Consent Manager - January 2026
 * 
 * Handles GDPR and CCPA compliance for cookie consent and data preferences.
 * Stores preferences in localStorage and syncs to server when authenticated.
 */

export interface ConsentPreferences {
  // Required - cannot be disabled
  necessary: true;
  // Optional consent categories
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  // CCPA specific
  doNotSell: boolean;
  // Metadata
  consentVersion: string;
  consentDate: string;
  region?: "eu" | "california" | "other";
}

const CONSENT_KEY = "privacy_consent";
const CONSENT_VERSION = "1.0.0";

// Default preferences (most restrictive)
const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
  doNotSell: false,
  consentVersion: CONSENT_VERSION,
  consentDate: new Date().toISOString(),
};

/**
 * Get current consent preferences from localStorage
 */
export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    
    const preferences = JSON.parse(stored) as ConsentPreferences;
    
    // Check if consent version is outdated
    if (preferences.consentVersion !== CONSENT_VERSION) {
      return null; // Require re-consent for new version
    }
    
    return preferences;
  } catch {
    return null;
  }
}

/**
 * Check if user has given consent (any version)
 */
export function hasConsented(): boolean {
  return getConsentPreferences() !== null;
}

/**
 * Save consent preferences
 */
export function saveConsentPreferences(preferences: Partial<ConsentPreferences>): ConsentPreferences {
  const fullPreferences: ConsentPreferences = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    necessary: true, // Always required
    consentVersion: CONSENT_VERSION,
    consentDate: new Date().toISOString(),
  };
  
  if (typeof window !== "undefined") {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(fullPreferences));
  }
  
  // Sync to server if authenticated
  syncConsentToServer(fullPreferences);
  
  return fullPreferences;
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): ConsentPreferences {
  return saveConsentPreferences({
    analytics: true,
    marketing: true,
    personalization: true,
    doNotSell: false,
  });
}

/**
 * Reject all optional cookies (GDPR compliant minimum)
 */
export function rejectAllCookies(): ConsentPreferences {
  return saveConsentPreferences({
    analytics: false,
    marketing: false,
    personalization: false,
    doNotSell: true,
  });
}

/**
 * CCPA: Enable "Do Not Sell My Personal Information"
 */
export function enableDoNotSell(): ConsentPreferences {
  const current = getConsentPreferences() || DEFAULT_PREFERENCES;
  return saveConsentPreferences({
    ...current,
    doNotSell: true,
    marketing: false,
  });
}

/**
 * Check if analytics is allowed
 */
export function isAnalyticsAllowed(): boolean {
  const preferences = getConsentPreferences();
  return preferences?.analytics ?? false;
}

/**
 * Check if marketing is allowed
 */
export function isMarketingAllowed(): boolean {
  const preferences = getConsentPreferences();
  return preferences?.marketing ?? false;
}

/**
 * Check if personalization is allowed
 */
export function isPersonalizationAllowed(): boolean {
  const preferences = getConsentPreferences();
  return preferences?.personalization ?? false;
}

/**
 * Check if "Do Not Sell" is enabled (CCPA)
 */
export function isDoNotSellEnabled(): boolean {
  const preferences = getConsentPreferences();
  return preferences?.doNotSell ?? false;
}

/**
 * Sync consent preferences to server
 */
async function syncConsentToServer(preferences: ConsentPreferences): Promise<void> {
  try {
    await fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
  } catch {
    // Silent fail - consent is already stored locally
    console.warn("Failed to sync consent to server");
  }
}

/**
 * Detect user's region for compliance requirements
 */
export async function detectRegion(): Promise<"eu" | "california" | "other"> {
  try {
    // Use timezone as a proxy for region detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // EU timezones
    const euTimezones = [
      "Europe/", "Atlantic/Azores", "Atlantic/Madeira", "Atlantic/Canary",
    ];
    if (euTimezones.some(tz => timezone.startsWith(tz))) {
      return "eu";
    }
    
    // California (Pacific timezone in US)
    if (timezone === "America/Los_Angeles" || timezone === "America/San_Francisco") {
      return "california";
    }
    
    return "other";
  } catch {
    return "other";
  }
}

/**
 * Clear all consent data (for account deletion)
 */
export function clearConsent(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONSENT_KEY);
  }
}
