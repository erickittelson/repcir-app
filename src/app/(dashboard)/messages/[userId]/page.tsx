"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, User, Loader2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  circleId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.userId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/messages/${partnerId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data.messages || []);

        // Get current user ID from first message
        if (data.messages && data.messages.length > 0) {
          const firstMsg = data.messages[0];
          // The current user is whoever isn't the partner
          setCurrentUserId(
            firstMsg.senderId === partnerId ? firstMsg.recipientId : firstMsg.senderId
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();
  }, [partnerId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Set up SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/messages/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.data.senderId === partnerId) {
          setMessages((prev) => [...prev, data.data]);
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [partnerId]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      // We need a circleId - for now, get it from an existing message
      // In production, this would come from the selected circle context
      const circleId = messages[0]?.circleId || "";

      // If no circleId, fetch from API
      let effectiveCircleId = circleId;
      if (!effectiveCircleId) {
        // Get shared circles between users
        const circlesResponse = await fetch("/api/circles");
        const circlesData = await circlesResponse.json();
        effectiveCircleId = circlesData.circles?.[0]?.id;
      }

      if (!effectiveCircleId) {
        throw new Error("No shared circle found");
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: partnerId,
          circleId: effectiveCircleId,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);

      // Set current user ID if not set
      if (!currentUserId) {
        setCurrentUserId(data.message.senderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setNewMessage(content); // Restore message on error
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    for (const msg of msgs) {
      const msgDate = new Date(msg.createdAt).toLocaleDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/messages")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Partner avatar */}
          <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center">
            <User className="w-5 h-5 text-brand-foreground" />
          </div>

          <div>
            <h1 className="font-semibold">{partnerId.slice(0, 8)}...</h1>
            <p className="text-xs text-muted-foreground">Circle member</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-destructive">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {group.date === new Date().toLocaleDateString()
                      ? "Today"
                      : group.date}
                  </span>
                </div>

                {/* Messages for this date */}
                {group.messages.map((message, index) => {
                  const isOwnMessage = message.senderId === currentUserId;
                  const isRead = !!message.readAt;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: isOwnMessage ? 20 : -20 }}
                      className={cn(
                        "flex mb-3",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] px-4 py-2 rounded-2xl",
                          isOwnMessage
                            ? "bg-brand text-white rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            isOwnMessage ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          <span className="text-[10px]">
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwnMessage && (
                            isRead ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="flex-shrink-0 bg-brand hover:bg-brand/90"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
