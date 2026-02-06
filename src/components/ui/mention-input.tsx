"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentionResult {
  type: "user" | "circle";
  id: string;
  handle?: string;
  name?: string;
  displayName?: string | null;
  profilePicture?: string | null;
  imageUrl?: string | null;
  memberCount?: number;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  rows = 2,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionType, setMentionType] = useState<"user" | "circle">("user");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @ or # typing
  const detectMention = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor to find @ or #
    let startPos = cursorPos - 1;
    while (startPos >= 0) {
      const char = text[startPos];
      if (char === "@" || char === "#") {
        const query = text.slice(startPos + 1, cursorPos);
        // Only show suggestions if no space in the query (still typing the mention)
        if (!query.includes(" ")) {
          return {
            type: char === "@" ? "user" as const : "circle" as const,
            query,
            startPos,
          };
        }
        break;
      }
      // Stop at whitespace or start of text
      if (char === " " || char === "\n") break;
      startPos--;
    }
    return null;
  }, []);

  // Search for mentions
  const searchMentions = useCallback(async (type: "user" | "circle", query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/mentions/search?q=${encodeURIComponent(query)}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Failed to search mentions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onChange(newValue);

    // Check if we're typing a mention
    const mention = detectMention(newValue, cursorPos);
    if (mention) {
      setMentionType(mention.type);
      setMentionQuery(mention.query);
      setMentionStartPos(mention.startPos);
      setShowSuggestions(true);
      searchMentions(mention.type, mention.query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Insert mention
  const insertMention = useCallback((result: MentionResult) => {
    const mentionText = result.type === "user"
      ? `@${result.handle}`
      : `#${result.name}`;

    const before = value.slice(0, mentionStartPos);
    const after = value.slice(mentionStartPos + mentionQuery.length + 1);
    const newValue = `${before}${mentionText} ${after}`;

    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartPos + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, mentionStartPos, mentionQuery, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
      case "Tab":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        rows={rows}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors",
                    index === selectedIndex && "bg-muted"
                  )}
                  onClick={() => insertMention(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result.type === "user" ? (
                    <>
                      <Avatar className="h-8 w-8">
                        {result.profilePicture && (
                          <AvatarImage src={result.profilePicture} />
                        )}
                        <AvatarFallback className="text-xs">
                          {result.displayName?.charAt(0) || result.handle?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.displayName || result.handle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{result.handle}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
                        {result.imageUrl ? (
                          <img
                            src={result.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-brand" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.memberCount} members
                        </p>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint text */}
      <p className="text-[10px] text-muted-foreground mt-1">
        Type <span className="font-mono bg-muted px-1 rounded">@</span> to mention users or{" "}
        <span className="font-mono bg-muted px-1 rounded">#</span> to mention circles
      </p>
    </div>
  );
}
