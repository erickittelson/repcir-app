"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, User, Clock } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Conversation {
  id: string;
  partner_id: string;
  circle_id: string;
  content: string;
  sender_id: string;
  created_at: string;
  unread_count: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    const controller = new AbortController();

    async function fetchConversations() {
      try {
        const response = await fetch("/api/messages", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchConversations();
    return () => controller.abort();
  }, []);

  // Set up SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/messages/stream");
    let refreshController: AbortController | null = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          // Cancel any pending refresh
          refreshController?.abort();
          refreshController = new AbortController();

          // Refresh conversations when new message arrives
          fetch("/api/messages", { signal: refreshController.signal })
            .then((res) => res.json())
            .then((data) => setConversations(data.conversations || []))
            .catch((err) => {
              if (err instanceof Error && err.name !== "AbortError") {
                console.error("Failed to refresh conversations:", err);
              }
            });
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Reconnect after error
      eventSource.close();
    };

    return () => {
      eventSource.close();
      refreshController?.abort();
    };
  }, []);

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) =>
    c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand" />
            Messages
          </h1>
        </div>

        {/* Search */}
        <SearchInput
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">
              Loading conversations...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-destructive">{error}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              Start a conversation with someone in your circle
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredConversations.map((conversation, index) => (
              <motion.div
                key={conversation.partner_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/messages/${conversation.partner_id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                    "border-b border-border/50"
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center">
                    <User className="w-6 h-6 text-brand-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {conversation.partner_id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(conversation.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.content}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {conversation.unread_count > 0 && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand text-white text-xs font-medium flex items-center justify-center">
                      {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
