"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Pencil, Sparkles } from "lucide-react";
import { forwardRef, useMemo, ReactNode } from "react";
import Image from "next/image";

// Simple markdown parser for chat messages
// Handles: **bold**, *italic*, `code`, and preserves emojis
function parseSimpleMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Pattern to match **bold**, *italic*, or `code`
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith("**")) {
      // Bold
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (fullMatch.startsWith("`")) {
      // Code
      parts.push(
        <code key={key++} className="px-1 py-0.5 bg-muted/50 rounded text-sm font-mono">
          {match[4]}
        </code>
      );
    } else if (fullMatch.startsWith("*")) {
      // Italic
      parts.push(<em key={key++}>{match[3]}</em>);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Rendered message component that parses markdown
function RenderedMessage({ text }: { text: string }) {
  const parsed = useMemo(() => parseSimpleMarkdown(text), [text]);
  return <>{parsed}</>;
}

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  isTyping?: boolean;
  timestamp?: Date;
  showAvatar?: boolean;
  /** User's profile picture URL */
  userProfilePicture?: string;
  /** User's display name (for fallback initial) */
  userName?: string;
  /** Content type for special rendering (e.g., image) */
  contentType?: "text" | "image";
}

export const ChatBubble = forwardRef<HTMLDivElement, ChatBubbleProps>(
  function ChatBubble(
    { message, isUser, isTyping = false, timestamp, showAvatar = true, userProfilePicture, userName, contentType = "text" },
    ref
  ) {
    // Get label for fallback avatar (show "YOU" when no name, first letter when we have name)
    const userAvatarLabel = userName ? userName.charAt(0).toUpperCase() : "YOU";

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
          "mb-6" // More spacing between messages
        )}
      >
        <div
          className={cn(
            "flex items-end gap-3",
            isUser ? "flex-row-reverse" : "flex-row",
            "max-w-[85%] md:max-w-[75%]"
          )}
        >
          {/* Avatar */}
          {showAvatar && (
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden",
                "transition-all duration-200",
                isUser && !userProfilePicture
                  ? "bg-brand-gradient shadow-lg shadow-brand/20"
                  : !isUser
                  ? "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/20"
                  : "ring-2 ring-brand/20 shadow-lg"
              )}
            >
              {isUser ? (
                userProfilePicture ? (
                  <Image
                    src={userProfilePicture}
                    alt={userName || "You"}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-[10px] font-semibold">{userAvatarLabel}</span>
                )
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
          )}

          {/* Message container */}
          <div className="flex flex-col gap-1">
            {/* Sender label */}
            <span
              className={cn(
                "text-xs font-medium text-muted-foreground/70 px-1",
                isUser ? "text-right" : "text-left"
              )}
            >
              {isUser ? (userName || "You") : "Coach"}
            </span>

            {/* Message bubble */}
            <div
              className={cn(
                "relative px-4 py-3 rounded-2xl",
                "transition-all duration-200",
                isUser
                  ? [
                      "bg-brand-gradient",
                      "text-brand-foreground",
                      "rounded-br-md",
                      "shadow-lg shadow-brand/10",
                    ]
                  : [
                      "bg-card",
                      "border border-border/50",
                      "text-foreground",
                      "rounded-bl-md",
                      "shadow-sm",
                    ]
              )}
            >
              {isTyping ? (
                <TypingIndicator />
              ) : contentType === "image" ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                  <Image
                    src={message}
                    alt="Uploaded image"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  <RenderedMessage text={message} />
                </p>
              )}
            </div>

            {/* Timestamp */}
            {timestamp && (
              <span
                className={cn(
                  "text-[10px] text-muted-foreground/50 px-1",
                  isUser ? "text-right" : "text-left"
                )}
              >
                {timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center h-6 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-muted-foreground/40 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Streaming message that updates as tokens arrive
interface StreamingChatBubbleProps {
  message: string;
  isComplete: boolean;
  /** For user messages during streaming */
  isUser?: boolean;
  /** User's profile picture URL */
  userProfilePicture?: string;
  /** User's display name */
  userName?: string;
}

export function StreamingChatBubble({
  message,
  isComplete,
  isUser = false,
  userProfilePicture,
  userName,
}: StreamingChatBubbleProps) {
  const userAvatarLabel = userName ? userName.charAt(0).toUpperCase() : "YOU";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn(
        "flex items-end gap-3 max-w-[85%] md:max-w-[75%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden",
          isUser && !userProfilePicture
            ? "bg-brand-gradient shadow-lg shadow-brand/20"
            : !isUser
            ? "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/20"
            : "ring-2 ring-brand/20 shadow-lg"
        )}>
          {isUser ? (
            userProfilePicture ? (
              <Image
                src={userProfilePicture}
                alt={userName || "You"}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-[10px] font-semibold">{userAvatarLabel}</span>
            )
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Message container */}
        <div className="flex flex-col gap-1">
          <span className={cn(
            "text-xs font-medium text-muted-foreground/70 px-1",
            isUser ? "text-right" : "text-left"
          )}>
            {isUser ? (userName || "You") : "Coach"}
          </span>

          <div className={cn(
            "relative px-4 py-3 rounded-2xl shadow-sm",
            isUser
              ? "bg-brand-gradient text-brand-foreground rounded-br-md shadow-lg shadow-brand/10"
              : "bg-card border border-border/50 rounded-bl-md"
          )}>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              <RenderedMessage text={message} />
              {!isComplete && (
                <motion.span
                  animate={{ opacity: [1, 0.3] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className={cn(
                    "inline-block w-0.5 h-5 ml-1 align-middle rounded-full",
                    isUser ? "bg-white" : "bg-purple-500"
                  )}
                />
              )}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Data extraction confirmation card
interface ExtractedDataCardProps {
  label: string;
  value: string;
  onEdit?: () => void;
  onConfirm?: () => void;
  isEditing?: boolean;
}

export function ExtractedDataCard({
  label,
  value,
  onEdit,
  onConfirm,
  isEditing = false,
}: ExtractedDataCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-gradient-to-r from-emerald-500/10 to-teal-500/10",
        "border border-emerald-500/20",
        "text-sm"
      )}
    >
      <Check className="w-4 h-4 text-emerald-500" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="ml-1 p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

// Grouped data summary
interface DataSummaryProps {
  data: Record<string, string | number | undefined>;
  onEditField?: (field: string) => void;
}

export function DataSummary({ data, onEditField }: DataSummaryProps) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mb-4 px-4"
    >
      {entries.map(([key, value]) => (
        <ExtractedDataCard
          key={key}
          label={formatLabel(key)}
          value={String(value)}
          onEdit={onEditField ? () => onEditField(key) : undefined}
        />
      ))}
    </motion.div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
