"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
  className,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden z-50 bg-background/80",
        className
      )}
      style={{
        height: Math.max(pullDistance, isRefreshing ? 60 : 0),
        transition: isRefreshing ? "none" : "height 0.2s ease-out",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          transform: isRefreshing ? "none" : `rotate(${progress * 360}deg)`,
          opacity: Math.max(progress, isRefreshing ? 1 : 0),
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 text-brand animate-spin" />
        ) : (
          <RefreshCw className="h-6 w-6 text-brand" />
        )}
      </div>
    </div>
  );
}
