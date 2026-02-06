"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Dumbbell,
  Target,
  User,
  Heart,
  Award,
  Activity,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SectionStatus {
  section: string;
  percent: number;
  isComplete: boolean;
  recommendation?: string;
}

interface CompletenessCardProps {
  overallPercent: number;
  sections: Record<string, number>;
  sectionStatuses: SectionStatus[];
  recommendations: string[];
  onDismiss?: () => void;
  className?: string;
}

const SECTION_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; href: string }
> = {
  basics: { label: "Basic Info", icon: User, href: "/you?section=about" },
  bodyMetrics: { label: "Body Metrics", icon: Activity, href: "/you?section=health" },
  equipment: { label: "Equipment", icon: Dumbbell, href: "/equipment" },
  goals: { label: "Goals", icon: Target, href: "/you?section=goals" },
  limitations: { label: "Limitations", icon: Heart, href: "/you?section=health" },
  skills: { label: "Skills", icon: Award, href: "/you?section=skills" },
  sports: { label: "Sports", icon: Activity, href: "/you?section=sports" },
};

export function CompletenessCard({
  overallPercent,
  sections,
  sectionStatuses,
  recommendations,
  onDismiss,
  className,
}: CompletenessCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if profile is 100% complete
  if (overallPercent >= 100) {
    return null;
  }

  const incompleteSections = sectionStatuses.filter((s) => !s.isComplete);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <CardContent className="pt-4 pb-3">
        {/* Compact header - everything in one row */}
        <div className="flex items-center gap-3">
          {/* Progress ring - smaller */}
          <div className="relative flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${(overallPercent / 100) * 126} 126`}
                strokeLinecap="round"
                className="text-brand"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{overallPercent}%</span>
            </div>
          </div>

          {/* Text - minimal */}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Complete Your Profile</h3>
            <p className="text-xs text-muted-foreground truncate">
              {incompleteSections.length} {incompleteSections.length === 1 ? "section" : "sections"} remaining
            </p>
          </div>

          {/* Quick action pills - right side */}
          <div className="flex-1 flex items-center justify-end gap-1.5 flex-wrap">
            {incompleteSections.slice(0, 3).map((section) => {
              const config = SECTION_CONFIG[section.section];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <Link
                  key={section.section}
                  href={config.href}
                  className="flex items-center gap-1 px-2 py-1 bg-brand/10 text-brand rounded-full text-xs hover:bg-brand/20 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Expand toggle - inline */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Details
            </>
          )}
        </button>

        {/* Expanded section list - grid layout */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.entries(SECTION_CONFIG).map(([key, config]) => {
              const percent = sections[key] || 0;
              const Icon = config.icon;
              const isComplete = percent >= 100;

              return (
                <Link
                  key={key}
                  href={config.href}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors text-sm",
                    isComplete
                      ? "bg-success/10 text-success"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate text-xs font-medium">
                    {config.label}
                  </span>
                  {!isComplete && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {percent}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Recommendations - compact */}
        {isExpanded && recommendations.length > 0 && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Suggestions
            </p>
            <div className="space-y-1">
              {recommendations.slice(0, 2).map((rec, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-brand" />
                  {rec}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact completeness indicator for profile header
 */
export function CompletenessIndicator({
  percent,
  onClick,
}: {
  percent: number;
  onClick?: () => void;
}) {
  if (percent >= 100) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 rounded-full hover:bg-brand/20 transition-colors"
    >
      <div className="relative w-5 h-5">
        <svg className="w-5 h-5 -rotate-90">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${(percent / 100) * 50} 50`}
            strokeLinecap="round"
            className="text-brand"
          />
        </svg>
      </div>
      <span className="text-xs font-medium text-brand">{percent}%</span>
    </button>
  );
}
