/**
 * Memory Guardrails — validates coaching memory notes before storage.
 *
 * Coaching memories are injected directly into the system prompt on every
 * subsequent conversation. Without validation, PII or prompt-injection
 * payloads could be stored and replayed to the model.
 */

const MAX_MEMORY_LENGTH = 300;

// PII patterns — reject if detected
const PII_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit card" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, label: "email" },
  { pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, label: "phone number" },
  { pattern: /\b(passport|license)\s*#?\s*\d+/i, label: "ID number" },
  { pattern: /\bpassword\s*[:=]\s*\S+/i, label: "password" },
];

// Prompt injection patterns — sanitize if detected
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi,
  /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be|your\s+new\s+instructions?)/gi,
  /\b(system|admin|developer|root)\s*(prompt|mode|access|override)/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
];

interface ValidationResult {
  safe: boolean;
  reason?: string;
  sanitized?: string;
}

/**
 * Validate a coaching memory note before storing it.
 *
 * @returns `{ safe: true, sanitized }` if acceptable (with cleaned content)
 * @returns `{ safe: false, reason }` if the note should be rejected entirely
 */
export function validateMemoryNote(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { safe: false, reason: "Empty content" };
  }

  // Check for PII — reject entirely (we don't want to store even partial PII)
  for (const { pattern, label } of PII_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: `Contains ${label}` };
    }
  }

  // Sanitize prompt injection patterns — replace with [filtered] but keep the rest
  let sanitized = content;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  // Strip XML/HTML tags that could confuse prompt structure
  sanitized = sanitized.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_-]*[^>]*>/g, "");

  // Collapse excessive whitespace
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n").trim();

  // Enforce max length
  if (sanitized.length > MAX_MEMORY_LENGTH) {
    // Truncate at word boundary
    sanitized = sanitized.substring(0, MAX_MEMORY_LENGTH);
    const lastSpace = sanitized.lastIndexOf(" ");
    if (lastSpace > MAX_MEMORY_LENGTH * 0.8) {
      sanitized = sanitized.substring(0, lastSpace);
    }
    sanitized = sanitized.trimEnd() + "...";
  }

  // If sanitization removed all meaningful content, reject
  if (sanitized.replace(/\[filtered\]/g, "").trim().length < 10) {
    return { safe: false, reason: "No meaningful content after sanitization" };
  }

  return { safe: true, sanitized };
}
