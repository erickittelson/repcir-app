/**
 * External Data Cleanup - GDPR Compliance
 *
 * Handles deletion of user data from external services:
 * - OpenAI (conversation threads)
 * - Vercel Blob (profile pictures)
 *
 * These are called during account deletion to ensure complete data erasure.
 */

import OpenAI from "openai";

// Initialize OpenAI client (lazy)
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[ExternalCleanup] OpenAI API key not configured");
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Delete OpenAI conversation threads
 *
 * Note: OpenAI's Assistants API uses "threads" for conversations.
 * This attempts to delete all provided thread IDs.
 */
export async function deleteOpenAIConversations(
  conversationIds: string[]
): Promise<{
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const openai = getOpenAI();
  const result = { deleted: 0, failed: 0, errors: [] as string[] };

  if (!openai) {
    result.errors.push("OpenAI client not available");
    result.failed = conversationIds.length;
    return result;
  }

  if (conversationIds.length === 0) {
    return result;
  }

  // Process deletions in parallel with rate limiting
  const batchSize = 10;
  for (let i = 0; i < conversationIds.length; i += batchSize) {
    const batch = conversationIds.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (threadId) => {
        try {
          // OpenAI Assistants API thread deletion
          // Type assertion needed as OpenAI types may vary
          const threads = openai.beta.threads as unknown as {
            del?: (id: string) => Promise<unknown>;
            delete?: (id: string) => Promise<unknown>;
          };

          if (typeof threads.del === 'function') {
            await threads.del(threadId);
          } else if (typeof threads.delete === 'function') {
            await threads.delete(threadId);
          } else {
            throw new Error('No thread deletion method available');
          }
          return { success: true, threadId };
        } catch (error) {
          // Thread may not exist or already deleted
          const message = error instanceof Error ? error.message : "Unknown error";
          // 404 means already deleted - count as success
          if (message.includes("404") || message.includes("not found")) {
            return { success: true, threadId, alreadyDeleted: true };
          }
          throw error;
        }
      })
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.success) {
        result.deleted++;
      } else if (res.status === "rejected") {
        result.failed++;
        result.errors.push(res.reason?.message || "Unknown error");
      }
    }

    // Rate limit: wait 100ms between batches
    if (i + batchSize < conversationIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return result;
}

/**
 * Delete files from Vercel Blob storage
 *
 * Used for profile pictures and other user uploads.
 */
export async function deleteVercelBlobFiles(
  blobUrls: string[]
): Promise<{
  deleted: number;
  failed: number;
  errors: string[];
}> {
  const result = { deleted: 0, failed: 0, errors: [] as string[] };

  if (blobUrls.length === 0) {
    return result;
  }

  // Check for Vercel Blob token
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    result.errors.push("Vercel Blob token not configured");
    result.failed = blobUrls.length;
    return result;
  }

  try {
    // Dynamic import to avoid bundling issues
    const { del } = await import("@vercel/blob");

    // Delete all blobs
    const results = await Promise.allSettled(
      blobUrls.map(async (url) => {
        try {
          await del(url);
          return { success: true };
        } catch (error) {
          // 404 means already deleted
          const message = error instanceof Error ? error.message : "";
          if (message.includes("404") || message.includes("not found")) {
            return { success: true, alreadyDeleted: true };
          }
          throw error;
        }
      })
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.success) {
        result.deleted++;
      } else if (res.status === "rejected") {
        result.failed++;
        result.errors.push(res.reason?.message || "Blob deletion failed");
      }
    }
  } catch (error) {
    result.errors.push(
      `Blob module error: ${error instanceof Error ? error.message : "Unknown"}`
    );
    result.failed = blobUrls.length;
  }

  return result;
}

/**
 * Comprehensive external data cleanup
 *
 * Call this during account deletion to clean up all external services.
 */
export async function cleanupExternalUserData(params: {
  openaiThreadIds: string[];
  blobUrls: string[];
}): Promise<{
  openai: { deleted: number; failed: number; errors: string[] };
  blob: { deleted: number; failed: number; errors: string[] };
  totalDeleted: number;
  totalFailed: number;
}> {
  const [openaiResult, blobResult] = await Promise.all([
    deleteOpenAIConversations(params.openaiThreadIds),
    deleteVercelBlobFiles(params.blobUrls),
  ]);

  return {
    openai: openaiResult,
    blob: blobResult,
    totalDeleted: openaiResult.deleted + blobResult.deleted,
    totalFailed: openaiResult.failed + blobResult.failed,
  };
}

/**
 * Check if external cleanup services are configured
 */
export function checkExternalCleanupCapabilities(): {
  openai: boolean;
  blob: boolean;
  message: string;
} {
  const openai = !!process.env.OPENAI_API_KEY;
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;

  let message = "External cleanup capabilities: ";
  if (openai && blob) {
    message += "All services configured";
  } else {
    const missing = [];
    if (!openai) missing.push("OpenAI");
    if (!blob) missing.push("Vercel Blob");
    message += `Missing: ${missing.join(", ")}`;
  }

  return { openai, blob, message };
}
