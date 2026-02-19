/**
 * Content Moderation Module
 *
 * Provides text and image moderation for user-generated content.
 * - Text: Profanity/obscenity filtering (client-safe, in ./text.ts)
 * - Images: NSFW detection via OpenAI moderation API (server-only)
 */

import OpenAI from "openai";

// Re-export text moderation (client-safe, no server deps)
export { moderateText, type TextModerationResult } from "./text";

// Import for local use in moderateContent below
import { moderateText } from "./text";
import type { TextModerationResult } from "./text";

// Initialize OpenAI client for image moderation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// IMAGE MODERATION (NSFW Detection)
// ============================================================================

export interface ImageModerationResult {
  isClean: boolean;
  flagged: boolean;
  categories: {
    sexual: boolean;
    sexualMinors: boolean;
    harassment: boolean;
    hate: boolean;
    violence: boolean;
    selfHarm: boolean;
  };
  scores: {
    sexual: number;
    sexualMinors: number;
    harassment: number;
    hate: number;
    violence: number;
    selfHarm: number;
  };
  error?: string;
}

/**
 * Moderate an image for NSFW/inappropriate content using OpenAI
 * @param imageUrl - URL of the image to moderate (must be publicly accessible)
 * @returns Moderation result with category flags and scores
 */
export async function moderateImage(
  imageUrl: string
): Promise<ImageModerationResult> {
  try {
    // Use OpenAI's vision model to analyze the image for inappropriate content
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast, cheap model for moderation
      messages: [
        {
          role: "system",
          content: `You are a content moderation system. Analyze the image and respond with ONLY a JSON object (no markdown, no code blocks) indicating if any inappropriate content is present.

Categories to check:
- sexual: Sexual content, nudity, or suggestive imagery
- sexualMinors: Any sexual content involving minors
- harassment: Harassing, bullying, or threatening content
- hate: Hate symbols, slurs, or discriminatory imagery
- violence: Graphic violence, gore, or disturbing imagery
- selfHarm: Self-harm, suicide, or eating disorder promotion

Respond with this exact JSON format:
{"flagged":false,"sexual":false,"sexualMinors":false,"harassment":false,"hate":false,"violence":false,"selfHarm":false,"confidence":0.95}

Set "flagged" to true if ANY category is true. confidence is your certainty (0-1).`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content || "";

    // Parse the JSON response
    try {
      const result = JSON.parse(content.trim());

      return {
        isClean: !result.flagged,
        flagged: result.flagged || false,
        categories: {
          sexual: result.sexual || false,
          sexualMinors: result.sexualMinors || false,
          harassment: result.harassment || false,
          hate: result.hate || false,
          violence: result.violence || false,
          selfHarm: result.selfHarm || false,
        },
        scores: {
          sexual: result.sexual ? 1 : 0,
          sexualMinors: result.sexualMinors ? 1 : 0,
          harassment: result.harassment ? 1 : 0,
          hate: result.hate ? 1 : 0,
          violence: result.violence ? 1 : 0,
          selfHarm: result.selfHarm ? 1 : 0,
        },
      };
    } catch {
      console.error("[Moderation] Failed to parse image moderation response:", content);
      // Default to flagged if parsing fails (fail-safe)
      return {
        isClean: false,
        flagged: true,
        categories: {
          sexual: false,
          sexualMinors: false,
          harassment: false,
          hate: false,
          violence: false,
          selfHarm: false,
        },
        scores: {
          sexual: 0,
          sexualMinors: 0,
          harassment: 0,
          hate: 0,
          violence: 0,
          selfHarm: 0,
        },
        error: "Failed to parse moderation response",
      };
    }
  } catch (error) {
    console.error("[Moderation] Image moderation error:", error);
    // On error, allow the image but log it (don't block legitimate uploads)
    return {
      isClean: true,
      flagged: false,
      categories: {
        sexual: false,
        sexualMinors: false,
        harassment: false,
        hate: false,
        violence: false,
        selfHarm: false,
      },
      scores: {
        sexual: 0,
        sexualMinors: 0,
        harassment: 0,
        hate: 0,
        violence: 0,
        selfHarm: 0,
      },
      error: `Moderation check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Moderate an image from a base64 data URL
 * @param base64DataUrl - Base64 encoded image (data:image/...;base64,...)
 * @returns Moderation result
 */
export async function moderateImageBase64(
  base64DataUrl: string
): Promise<ImageModerationResult> {
  // OpenAI accepts base64 data URLs directly
  return moderateImage(base64DataUrl);
}

// ============================================================================
// COMBINED MODERATION
// ============================================================================

export interface ContentModerationResult {
  isClean: boolean;
  text?: TextModerationResult;
  image?: ImageModerationResult;
  rejectionReason?: string;
}

/**
 * Moderate both text and image content
 * @param content - Content to moderate
 * @returns Combined moderation result
 */
export async function moderateContent(content: {
  text?: string;
  imageUrl?: string;
  imageBase64?: string;
}): Promise<ContentModerationResult> {
  const result: ContentModerationResult = { isClean: true };

  // Moderate text if provided
  if (content.text) {
    result.text = moderateText(content.text);
    if (!result.text.isClean) {
      result.isClean = false;
      result.rejectionReason = `Inappropriate language detected: ${result.text.flaggedWords.join(", ")}`;
    }
  }

  // Moderate image if provided
  if (content.imageUrl || content.imageBase64) {
    result.image = content.imageUrl
      ? await moderateImage(content.imageUrl)
      : await moderateImageBase64(content.imageBase64!);

    if (!result.image.isClean) {
      result.isClean = false;
      const flaggedCategories = Object.entries(result.image.categories)
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);
      result.rejectionReason = result.rejectionReason
        ? `${result.rejectionReason}; Inappropriate image content: ${flaggedCategories.join(", ")}`
        : `Inappropriate image content detected: ${flaggedCategories.join(", ")}`;
    }
  }

  return result;
}
