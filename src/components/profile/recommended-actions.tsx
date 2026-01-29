"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  ChevronRight,
  X,
  Dumbbell,
  Target,
  User,
  MapPin,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  icon?: "equipment" | "goal" | "profile" | "location" | "metrics";
  priority?: "high" | "medium" | "low";
}

interface RecommendedActionsProps {
  recommendations: Recommendation[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const ICONS = {
  equipment: Dumbbell,
  goal: Target,
  profile: User,
  location: MapPin,
  metrics: Activity,
};

const PRIORITY_STYLES = {
  high: "border-l-4 border-l-energy",
  medium: "border-l-4 border-l-brand",
  low: "",
};

export function RecommendedActions({
  recommendations,
  onDismiss,
  className,
}: RecommendedActionsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-energy" />
          Recommended Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((rec) => {
          const Icon = rec.icon ? ICONS[rec.icon] : Lightbulb;
          return (
            <div
              key={rec.id}
              className={cn(
                "relative rounded-lg bg-muted p-3",
                rec.priority && PRIORITY_STYLES[rec.priority]
              )}
            >
              {onDismiss && (
                <button
                  onClick={() => onDismiss(rec.id)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-background/50 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              <div className="flex items-start gap-3 pr-6">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rec.description}
                  </p>
                  <Link href={rec.actionUrl}>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1 text-brand"
                    >
                      {rec.action}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Inline prompt banner for contextual recommendations
 */
export function PromptBanner({
  message,
  action,
  actionUrl,
  onDismiss,
  variant = "default",
}: {
  message: string;
  action: string;
  actionUrl: string;
  onDismiss?: () => void;
  variant?: "default" | "warning" | "success";
}) {
  const variantStyles = {
    default: "bg-brand/10 border-brand/20 text-brand",
    warning: "bg-energy/10 border-energy/20 text-energy",
    success: "bg-success/10 border-success/20 text-success",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 rounded-lg border",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Lightbulb className="h-4 w-4 flex-shrink-0" />
        <p className="text-sm truncate">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={actionUrl}>
          <Button size="sm" variant="secondary">
            {action}
          </Button>
        </Link>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-background/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Generate recommendations based on completeness data
 */
export function generateRecommendations(completeness: {
  sections: Record<string, number>;
  missingFields?: string[];
  overallPercent?: number;
  sectionStatuses?: unknown[];
  recommendations?: string[];
}): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Equipment recommendation
  if ((completeness.sections.equipment || 0) < 100) {
    recommendations.push({
      id: "add_equipment",
      title: "Set Up Your Equipment",
      description: "Add gym locations to get equipment-aware workout recommendations",
      action: "Add Equipment",
      actionUrl: "/equipment",
      icon: "equipment",
      priority: "high",
    });
  }

  // Goals recommendation
  if ((completeness.sections.goals || 0) < 100) {
    recommendations.push({
      id: "add_goals",
      title: "Set Fitness Goals",
      description: "Track your progress with specific, measurable goals",
      action: "Set Goals",
      actionUrl: "/activity?tab=goals",
      icon: "goal",
      priority: "high",
    });
  }

  // Body metrics recommendation
  if ((completeness.sections.bodyMetrics || 0) < 100) {
    recommendations.push({
      id: "add_metrics",
      title: "Update Body Metrics",
      description: "Add your weight and height for personalized workout prescriptions",
      action: "Update",
      actionUrl: "/you?section=health",
      icon: "metrics",
      priority: "medium",
    });
  }

  // Skills recommendation
  if ((completeness.sections.skills || 0) < 100) {
    recommendations.push({
      id: "add_skills",
      title: "Add Athletic Skills",
      description: "Track gymnastics, calisthenics, and other skills you're working on",
      action: "Add Skills",
      actionUrl: "/you?section=skills",
      icon: "profile",
      priority: "low",
    });
  }

  // Sports recommendation
  if ((completeness.sections.sports || 0) < 100) {
    recommendations.push({
      id: "add_sports",
      title: "Add Sports You Play",
      description: "Display sport badges on your profile",
      action: "Add Sports",
      actionUrl: "/you?section=sports",
      icon: "profile",
      priority: "low",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority || "low"] - priorityOrder[b.priority || "low"]
  );

  return recommendations.slice(0, 3); // Return top 3
}
