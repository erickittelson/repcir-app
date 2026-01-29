/**
 * OpenAI Conversation State Management
 *
 * Uses OpenAI's Conversations API for persistent conversation state.
 * Benefits:
 * - Items in conversations are NOT subject to 30-day TTL
 * - Server-side state management
 * - Better context preservation across sessions
 *
 * @see https://platform.openai.com/docs/guides/conversation-state
 */

import OpenAI from "openai";
import { db } from "@/lib/db";
import { coachConversations, coachMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Initialize OpenAI client
const openai = new OpenAI();

/**
 * Create a new OpenAI conversation and store the ID
 */
export async function createOpenAIConversation(
  localConversationId: string
): Promise<string> {
  try {
    // Create a new conversation in OpenAI
    const conversation = await openai.conversations.create();

    // Store the OpenAI conversation ID in our database
    await db
      .update(coachConversations)
      .set({
        openaiConversationId: conversation.id,
        updatedAt: new Date(),
      })
      .where(eq(coachConversations.id, localConversationId));

    return conversation.id;
  } catch (error) {
    console.error("Failed to create OpenAI conversation:", error);
    throw error;
  }
}

/**
 * Get or create an OpenAI conversation for a local conversation
 */
export async function getOrCreateOpenAIConversation(
  localConversationId: string
): Promise<string> {
  // First, check if we already have an OpenAI conversation ID
  const conversation = await db.query.coachConversations.findFirst({
    where: eq(coachConversations.id, localConversationId),
    columns: {
      openaiConversationId: true,
    },
  });

  if (conversation?.openaiConversationId) {
    return conversation.openaiConversationId;
  }

  // Create a new OpenAI conversation
  return createOpenAIConversation(localConversationId);
}

/**
 * Update the last response ID for a conversation
 * This enables response chaining for better context
 */
export async function updateLastResponseId(
  localConversationId: string,
  responseId: string
): Promise<void> {
  await db
    .update(coachConversations)
    .set({
      lastOpenaiResponseId: responseId,
      updatedAt: new Date(),
    })
    .where(eq(coachConversations.id, localConversationId));
}

/**
 * Get the last response ID for response chaining
 */
export async function getLastResponseId(
  localConversationId: string
): Promise<string | null> {
  const conversation = await db.query.coachConversations.findFirst({
    where: eq(coachConversations.id, localConversationId),
    columns: {
      lastOpenaiResponseId: true,
    },
  });

  return conversation?.lastOpenaiResponseId || null;
}

/**
 * Save a message with its OpenAI response ID
 */
export async function saveMessageWithResponseId(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  openaiResponseId?: string
): Promise<void> {
  await db.insert(coachMessages).values({
    conversationId,
    role,
    content,
    openaiResponseId: openaiResponseId || null,
  });
}

/**
 * Get conversation state info for API calls
 * Returns the conversation ID and optionally the last response ID
 */
export async function getConversationState(localConversationId: string): Promise<{
  openaiConversationId: string | null;
  lastResponseId: string | null;
}> {
  const conversation = await db.query.coachConversations.findFirst({
    where: eq(coachConversations.id, localConversationId),
    columns: {
      openaiConversationId: true,
      lastOpenaiResponseId: true,
    },
  });

  return {
    openaiConversationId: conversation?.openaiConversationId || null,
    lastResponseId: conversation?.lastOpenaiResponseId || null,
  };
}

/**
 * Provider options for Vercel AI SDK with conversation state
 * Pass these to streamText/generateText for conversation persistence
 */
export function getConversationProviderOptions(options: {
  conversationId?: string;
  previousResponseId?: string;
  store?: boolean;
}): { openai: Record<string, unknown> } {
  const providerOptions: Record<string, unknown> = {
    // Always store responses to enable conversation features
    store: options.store ?? true,
  };

  // Use Conversations API if we have a conversation ID
  if (options.conversationId) {
    providerOptions.conversation = options.conversationId;
  }

  // Use previous_response_id for chaining if no conversation but we have a response ID
  if (!options.conversationId && options.previousResponseId) {
    providerOptions.previousResponseId = options.previousResponseId;
  }

  return { openai: providerOptions };
}

/**
 * Extract response ID from a completed response
 * The response ID is needed to chain subsequent responses
 */
export function extractResponseId(response: {
  response?: { id?: string };
  experimental_providerMetadata?: { openai?: { responseId?: string } };
}): string | null {
  // Try to get from response object
  if (response.response?.id) {
    return response.response.id;
  }

  // Try to get from provider metadata (Vercel AI SDK format)
  if (response.experimental_providerMetadata?.openai?.responseId) {
    return response.experimental_providerMetadata.openai.responseId;
  }

  return null;
}
