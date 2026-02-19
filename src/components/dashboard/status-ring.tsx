"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StatusRingProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Circular SVG progress ring showing completion fraction.
 * Portable to React Native via react-native-svg.
 */
export function StatusRing({
  current,
  total,
  size = 60,
  strokeWidth = 4,
  className,
}: StatusRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(current / total, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const isComplete = current >= total && total > 0;
  const isEmpty = current === 0;

  // Color based on progress
  const trackColor = "var(--color-muted)";
  const progressColor = isComplete
    ? "var(--color-success)"
    : isEmpty
      ? "var(--color-amber-500, #f59e0b)"
      : "var(--color-brand)";

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-700 ease-in-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <Check className="h-5 w-5 text-success" />
        ) : (
          <span className="text-sm font-bold">
            {current}/{total}
          </span>
        )}
      </div>
    </div>
  );
}
