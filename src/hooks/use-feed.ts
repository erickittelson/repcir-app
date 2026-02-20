"use client";

import { useState, useCallback, useRef } from "react";

export interface FeedItem {
  id: string;
  type: "activity" | "post" | "individual_post";
  actorId: string;
  actorName: string;
  actorImage: string | null;
  actorBadges?: Array<{
    id: string;
    icon: string | null;
    name: string;
    tier: string;
  }>;
  activityType: string;
  content: string | null;
  imageUrl: string | null;
  circleId: string | null;
  circleName: string | null;
  metadata: Record<string, unknown> | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  visibility?: string | null;
  challengeId?: string | null;
}

interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const fetchPage = useCallback(async (cursor: string | null, append: boolean) => {
    try {
      const url = cursor
        ? `/api/feed?cursor=${encodeURIComponent(cursor)}`
        : "/api/feed";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Feed fetch failed");

      const data: FeedPage = await res.json();

      setItems((prev) => append ? [...prev, ...data.items] : data.items);
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
      setIsError(false);
    } catch {
      setIsError(true);
    }
  }, []);

  // Initial load
  const initialize = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setIsLoading(true);
    await fetchPage(null, false);
    setIsLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    await fetchPage(cursorRef.current, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, fetchPage]);

  const refresh = useCallback(async () => {
    cursorRef.current = null;
    setIsLoading(true);
    await fetchPage(null, false);
    setIsLoading(false);
  }, [fetchPage]);

  return {
    items,
    isLoading,
    isLoadingMore,
    isError,
    hasMore,
    initialize,
    loadMore,
    refresh,
  };
}
