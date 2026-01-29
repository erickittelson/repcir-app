/**
 * Content Moderation Module
 *
 * Provides text and image moderation for user-generated content.
 * - Text: Profanity/obscenity filtering
 * - Images: NSFW detection via OpenAI moderation API
 */

import OpenAI from "openai";

// Initialize OpenAI client for image moderation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// TEXT MODERATION (Profanity Filter)
// ============================================================================

// Common profanity patterns - this list covers major obscenities
// Using patterns to catch variations (f*ck, f**k, etc.)
const PROFANITY_PATTERNS: RegExp[] = [
  // F-word variations
  /\bf+[u*@]+c+k+[e3]*[r]*[s]*\b/gi,
  /\bf+[^a-z]*u+[^a-z]*c+[^a-z]*k+/gi,
  // S-word variations
  /\bs+h+[i1!*]+t+[s]*\b/gi,
  /\bs+[^a-z]*h+[^a-z]*[i1!]+[^a-z]*t+/gi,
  // A-word variations
  /\ba+s+s+h+o+l+e+[s]*\b/gi,
  /\ba+s+s+e+s*\b/gi,
  // B-word variations
  /\bb+[i1!]+t+c+h+[e3]*[s]*\b/gi,
  // D-word variations
  /\bd+[i1!]+c+k+[s]*\b/gi,
  // C-word (severe)
  /\bc+u+n+t+[s]*\b/gi,
  // N-word (severe - racial slur)
  /\bn+[i1!]+g+[g]+[e3a]+[r]*[s]*\b/gi,
  // P-word variations
  /\bp+u+s+s+y+\b/gi,
  /\bp+[e3]+n+[i1!]+s+\b/gi,
  // W-word
  /\bw+h+o+r+e+[s]*\b/gi,
  // Other common obscenities
  /\bd+a+m+n+\b/gi,
  /\bh+e+l+l+\b/gi,
  /\bc+r+a+p+\b/gi,
  /\bp+[i1!]+s+s+\b/gi,
  // Slurs and hate speech
  /\bf+a+g+[g]*[o0]+t+[s]*\b/gi,
  /\br+e+t+a+r+d+[e3]*[d]*\b/gi,
  // Sexual terms
  /\bc+o+c+k+[s]*\b/gi,
  /\bt+[i1!]+t+[s]*\b/gi,
  /\bb+o+o+b+[s]*\b/gi,
  /\ba+n+a+l+\b/gi,
  /\bo+r+g+[a@]+s+m+\b/gi,
  /\bp+o+r+n+\b/gi,
  /\bs+e+x+\b/gi,
  // Drug references (context-sensitive, be careful)
  /\bw+e+e+d+\b/gi,
  /\bc+o+c+a+[i1!]+n+e+\b/gi,
  /\bh+e+r+o+[i1!]+n+\b/gi,
];

// Words that are okay in fitness context (false positives to allow)
const FITNESS_ALLOWLIST = [
  "assess",
  "assessment",
  "class",
  "classic",
  "grass",
  "pass",
  "bass",
  "mass",
  "assist",
  "assistant",
  "assume",
  "assumption",
  "association",
  "passion",
  "compassion",
  "embarrass",
  "harassment",
  "scrap",
  "strap",
  "therapist",
  "specialist",
  "analyst",
  "cocktail", // drink
  "cockatoo", // bird
  "peacock", // bird
  "hancock",
  "woodcock",
  "shuttlecock",
  "crappie", // fish
  "pussycat",
  "pussywillow",
  "title",
  "titled",
  "titillate",
  "fitness",
  "witness",
  "shitake", // mushroom
  "basement",
  "execute",
  "execution",
  "sextant",
  "sextet",
  "unisex",
  "sussex",
  "essex",
  "hellenic",
  "hello",
  "shell",
  "damnation",
  "fundamental",
];

export interface TextModerationResult {
  isClean: boolean;
  flaggedWords: string[];
  cleanedText?: string; // Text with profanity replaced by asterisks
  severity: "none" | "mild" | "moderate" | "severe";
}

/**
 * Check text for profanity and obscene content
 * @param text - The text to moderate
 * @param options - Moderation options
 * @returns Moderation result with flagged words and severity
 */
export function moderateText(
  text: string,
  options: { returnCleanedText?: boolean } = {}
): TextModerationResult {
  if (!text || typeof text !== "string") {
    return { isClean: true, flaggedWords: [], severity: "none" };
  }

  const flaggedWords: string[] = [];
  let cleanedText = text;
  let maxSeverity: "none" | "mild" | "moderate" | "severe" = "none";

  // Check against allowlist first (convert to lowercase for comparison)
  const lowerText = text.toLowerCase();
  const hasAllowedWord = FITNESS_ALLOWLIST.some((word) =>
    lowerText.includes(word.toLowerCase())
  );

  // Test each profanity pattern
  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Skip if the match is part of an allowed word
        const matchLower = match.toLowerCase();
        const isAllowed = FITNESS_ALLOWLIST.some(
          (word) =>
            word.toLowerCase().includes(matchLower) ||
            matchLower.includes(word.toLowerCase())
        );

        if (!isAllowed) {
          flaggedWords.push(match);

          // Determine severity
          const severePatterns = [/n+[i1!]+g+/i, /c+u+n+t/i, /f+a+g/i];
          const moderatePatterns = [/f+[u*@]+c+k/i, /s+h+[i1!]+t/i, /b+[i1!]+t+c+h/i];

          if (severePatterns.some((p) => p.test(match))) {
            maxSeverity = "severe";
          } else if (moderatePatterns.some((p) => p.test(match)) && maxSeverity !== "severe") {
            maxSeverity = "moderate";
          } else if (maxSeverity === "none") {
            maxSeverity = "mild";
          }

          // Replace with asterisks if requested
          if (options.returnCleanedText) {
            cleanedText = cleanedText.replace(
              new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
              "*".repeat(match.length)
            );
          }
        }
      }
    }
  }

  return {
    isClean: flaggedWords.length === 0,
    flaggedWords: Array.from(new Set(flaggedWords)), // Remove duplicates
    cleanedText: options.returnCleanedText ? cleanedText : undefined,
    severity: maxSeverity,
  };
}

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
