"use client";

import { cn } from "@/lib/utils";

interface RepcirLogoProps {
  variant?: "icon" | "wordmark" | "full";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: "gold" | "white" | "current";
}

const sizeClasses = {
  sm: { icon: "h-6 w-6", wordmark: "h-5", full: "h-6" },
  md: { icon: "h-8 w-8", wordmark: "h-6", full: "h-8" },
  lg: { icon: "h-12 w-12", wordmark: "h-8", full: "h-10" },
  xl: { icon: "h-16 w-16", wordmark: "h-10", full: "h-14" },
};

const colorClasses = {
  gold: "text-brand",
  white: "text-foreground",
  current: "text-current",
};

/**
 * REPCIR Logo Component
 *
 * The Earned Ring - an incomplete circle representing that
 * membership is earned, not given. The gap is intentional.
 */
export function RepcirLogo({
  variant = "icon",
  size = "md",
  className,
  color = "gold",
}: RepcirLogoProps) {
  const colorClass = colorClasses[color];
  const sizeClass = sizeClasses[size][variant];

  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className={cn(sizeClass, colorClass, className)}
        aria-label="Repcir"
      >
        {/* The Earned Ring - incomplete circle with gap at top */}
        <path
          d="M 85 50 A 35 35 0 1 1 50 15"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner arrow pointing up - representing ascent/earning */}
        <path
          d="M 50 70 L 50 38 M 38 50 L 50 38 L 62 50"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "font-display tracking-wider font-normal",
          sizeClass,
          colorClass,
          className
        )}
        style={{ lineHeight: 1 }}
      >
        REPCIR
      </span>
    );
  }

  // Full variant: icon + wordmark
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className={cn(sizeClasses[size].icon, colorClass)}
        aria-label="Repcir"
      >
        <path
          d="M 85 50 A 35 35 0 1 1 50 15"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 50 70 L 50 38 M 38 50 L 50 38 L 62 50"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span
        className={cn(
          "font-display tracking-wider font-normal",
          sizeClasses[size].wordmark,
          colorClass
        )}
        style={{ lineHeight: 1 }}
      >
        REPCIR
      </span>
    </div>
  );
}

/**
 * Tagline component for brand messaging
 */
export function RepcirTagline({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "secondary" | "philosophy";
  className?: string;
}) {
  const taglines = {
    primary: "Earn Your Circle",
    secondary: "Effort Is The Standard",
    philosophy: "Built by those who show up.",
  };

  return (
    <span
      className={cn(
        "text-muted-foreground tracking-wide uppercase text-sm",
        className
      )}
    >
      {taglines[variant]}
    </span>
  );
}

