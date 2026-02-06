/**
 * File Validation Utilities
 *
 * Validates file uploads by checking magic numbers (file signatures)
 * to prevent malicious file uploads and MIME type spoofing.
 */

// Magic number signatures for common image formats
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  // JPEG: FF D8 FF
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // GIF: 47 49 46 38 (GIF8)
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // Check RIFF header, WebP check at offset 8
  // BMP: 42 4D (BM)
  "image/bmp": [[0x42, 0x4d]],
  // HEIC/HEIF: Check for ftyp box with heic/heif brand
  "image/heic": [[0x00, 0x00, 0x00]], // Starts with ftyp box size
  "image/heif": [[0x00, 0x00, 0x00]],
};

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export interface FileValidationResult {
  isValid: boolean;
  detectedType: string | null;
  error?: string;
}

/**
 * Validate an image file by checking its magic numbers
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // Check MIME type first
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      isValid: false,
      detectedType: null,
      error: `File type '${file.type}' is not allowed. Allowed types: JPEG, PNG, GIF, WebP`,
    };
  }

  try {
    // Read the first 16 bytes to check magic numbers
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for each known image type
    for (const [mimeType, signatures] of Object.entries(IMAGE_SIGNATURES)) {
      for (const signature of signatures) {
        if (matchesSignature(bytes, signature)) {
          // Verify detected type matches claimed type (or is compatible)
          if (mimeType === file.type || isCompatibleType(mimeType, file.type)) {
            return {
              isValid: true,
              detectedType: mimeType,
            };
          }
        }
      }
    }

    // Special check for WebP (needs to verify WEBP at offset 8)
    if (file.type === "image/webp" && bytes.length >= 12) {
      const riffMatch = matchesSignature(bytes, [0x52, 0x49, 0x46, 0x46]);
      const webpMatch =
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50;
      if (riffMatch && webpMatch) {
        return {
          isValid: true,
          detectedType: "image/webp",
        };
      }
    }

    return {
      isValid: false,
      detectedType: null,
      error: "File content does not match its declared type. The file may be corrupted or malicious.",
    };
  } catch (error) {
    return {
      isValid: false,
      detectedType: null,
      error: "Failed to validate file content",
    };
  }
}

/**
 * Check if bytes match a signature at the start
 */
function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Check if two MIME types are compatible (e.g., jpg vs jpeg)
 */
function isCompatibleType(detected: string, claimed: string): boolean {
  // jpeg and jpg are interchangeable
  if (
    (detected === "image/jpeg" && claimed === "image/jpg") ||
    (detected === "image/jpg" && claimed === "image/jpeg")
  ) {
    return true;
  }
  return detected === claimed;
}

/**
 * Get a safe file extension based on validated MIME type
 */
export function getSafeExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
  };
  return extensions[mimeType] || "bin";
}
