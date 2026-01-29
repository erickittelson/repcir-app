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
        {/* Progress header */}
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <svg className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${(overallPercent / 100) * 176} 176`}
                strokeLinecap="round"
                className="text-brand"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{overallPercent}%</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Complete Your Profile</h3>
            <p className="text-sm text-muted-foreground">
              {overallPercent < 50
                ? "Help us personalize your experience"
                : overallPercent < 80
                ? "Almost there! A few more details"
                : "Just a couple more things"}
            </p>
          </div>
        </div>

        {/* Quick actions for top incomplete sections */}
        {!isExpanded && incompleteSections.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {incompleteSections.slice(0, 2).map((section) => {
              const config = SECTION_CONFIG[section.section];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <Link
                  key={section.section}
                  href={config.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-sm hover:bg-brand/20 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Expand/Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>

        {/* Expanded section list */}
        {isExpanded && (
          <div className="mt-3 space-y-2 pt-3 border-t">
            {Object.entries(SECTION_CONFIG).map(([key, config]) => {
              const status = sectionStatuses.find((s) => s.section === key);
              const percent = sections[key] || 0;
              const Icon = config.icon;

              return (
                <Link
                  key={key}
                  href={config.href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      percent >= 100
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {percent >= 100 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                    <Progress value={percent} className="h-1.5 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {isExpanded && recommendations.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Circle className="h-2 w-2 mt-1.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
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
