/**
 * Text Moderation (Profanity Filter)
 *
 * Client-safe — no server dependencies.
 * Extracted from moderation/index.ts so it can be imported in "use client" components.
 */

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
  "cocktail",
  "cockatoo",
  "peacock",
  "hancock",
  "woodcock",
  "shuttlecock",
  "crappie",
  "pussycat",
  "pussywillow",
  "title",
  "titled",
  "titillate",
  "fitness",
  "witness",
  "shitake",
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
  cleanedText?: string;
  severity: "none" | "mild" | "moderate" | "severe";
}

/**
 * Check text for profanity and obscene content.
 * Pure function — safe for client and server use.
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
    flaggedWords: Array.from(new Set(flaggedWords)),
    cleanedText: options.returnCleanedText ? cleanedText : undefined,
    severity: maxSeverity,
  };
}
