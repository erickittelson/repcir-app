/**
 * Consent Verification Utilities
 *
 * Helpers to check user consent for AI/data processing operations.
 * Required for GDPR Article 9 compliance (health data processing).
 */

import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  doNotSell: boolean;
  region?: "eu" | "california" | "other";
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentGiven: boolean;
  personalizationEnabled: boolean;
  doNotSell: boolean;
  region?: string;
}

/**
 * Check if a user has consented to AI personalization
 * This includes sending health data to OpenAI for embeddings/coaching
 */
export async function checkAIPersonalizationConsent(
  userId: string
): Promise<ConsentCheckResult> {
  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: {
        consentGiven: true,
        consentPreferences: true,
      },
    });

    if (!profile) {
      return {
        hasConsent: false,
        consentGiven: false,
        personalizationEnabled: false,
        doNotSell: false,
      };
    }

    const prefs = profile.consentPreferences as ConsentPreferences | null;

    return {
      hasConsent: (profile.consentGiven ?? false) && prefs?.personalization === true,
      consentGiven: profile.consentGiven ?? false,
      personalizationEnabled: prefs?.personalization ?? false,
      doNotSell: prefs?.doNotSell ?? false,
      region: prefs?.region,
    };
  } catch (error) {
    console.error("Error checking AI consent:", error);
    return {
      hasConsent: false,
      consentGiven: false,
      personalizationEnabled: false,
      doNotSell: false,
    };
  }
}

/**
 * Error response for missing AI consent
 */
export function createConsentRequiredResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "AI personalization consent required",
      code: "CONSENT_REQUIRED",
      message: "Please enable AI personalization in your privacy settings to use this feature.",
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}
