"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showCount?: boolean;
  count?: number;
}

const SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function RatingStars({
  rating,
  onChange,
  size = "md",
  readonly = false,
  showCount = false,
  count,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? rating;

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      // Toggle off if clicking the same rating
      onChange(value === rating ? 0 : value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          "flex items-center gap-0.5",
          !readonly && "cursor-pointer"
        )}
        onMouseLeave={() => setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          const isHalf = !isFilled && value - 0.5 <= displayRating;
          
          return (
            <button
              key={value}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(value)}
              onMouseEnter={() => !readonly && setHoverRating(value)}
              className={cn(
                "transition-colors",
                readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
              )}
            >
              <Star
                className={cn(
                  SIZES[size],
                  "transition-colors",
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : isHalf
                      ? "fill-yellow-400/50 text-yellow-400"
                      : "text-muted-foreground/30"
                )}
              />
            </button>
          );
        })}
      </div>
      
      {showCount && count !== undefined && (
        <span className="text-sm text-muted-foreground ml-1">
          ({count})
        </span>
      )}
    </div>
  );
}

// Compact rating display for cards
export function RatingBadge({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  if (!rating || rating === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

// Average rating with breakdown
export function RatingBreakdown({
  ratings,
  totalCount,
  avgRating,
}: {
  ratings: { [key: number]: number }; // {5: 100, 4: 50, 3: 20, 2: 5, 1: 2}
  totalCount: number;
  avgRating: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold">{avgRating.toFixed(1)}</div>
          <RatingStars rating={avgRating} readonly size="sm" />
          <div className="text-sm text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "review" : "reviews"}
          </div>
        </div>
        
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratings[star] || 0;
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
            
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3">{star}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RatingStars;
