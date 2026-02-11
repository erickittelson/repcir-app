/**
 * Client-side image compression utility.
 * Resizes large images before upload to reduce bandwidth and storage costs.
 * Outputs JPEG at configurable quality to keep file sizes small.
 */

export interface CompressOptions {
  /** Maximum width or height in pixels. Default: 1920 */
  maxDimension?: number;
  /** JPEG quality 0-1. Default: 0.85 */
  quality?: number;
  /** Output MIME type. Default: "image/jpeg" */
  outputType?: "image/jpeg" | "image/webp";
}

/**
 * Compress and resize an image File before upload.
 * - Caps dimensions to maxDimension (maintains aspect ratio)
 * - Converts to JPEG at specified quality
 * - If the image is already smaller than maxDimension and under 500KB, returns as-is
 * - Handles images from camera (which can be 4000px+)
 *
 * Returns a new File ready for upload.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.85,
    outputType = "image/jpeg",
  } = options;

  // GIFs should not be compressed (would lose animation)
  if (file.type === "image/gif") {
    return file;
  }

  // If file is already small enough, skip compression
  if (file.size < 500 * 1024) {
    // Still check dimensions for very small but very wide images
    const needsResize = await checkNeedsResize(file, maxDimension);
    if (!needsResize) return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      } else if (file.size < 500 * 1024) {
        // Image is small dimensions AND small size — no compression needed
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }

      // Use high-quality image smoothing for downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // Fallback
            return;
          }

          // If compressed version is larger than original, use original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const ext = outputType === "image/webp" ? "webp" : "jpg";
          const compressedName = file.name.replace(
            /\.[^.]+$/,
            `.${ext}`
          );

          resolve(
            new File([blob], compressedName, {
              type: outputType,
              lastModified: Date.now(),
            })
          );
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // On error, return original file rather than failing
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Check if an image needs resizing (dimensions exceed max).
 */
function checkNeedsResize(
  file: File,
  maxDimension: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width > maxDimension || img.height > maxDimension);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Get the natural dimensions of an image file.
 * Useful for setting width/height on rendered images.
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
