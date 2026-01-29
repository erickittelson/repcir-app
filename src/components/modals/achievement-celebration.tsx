"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  Sparkles, 
  Share2, 
  Award,
  TrendingUp,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AchievementData {
  type: "badge" | "pr" | "milestone" | "challenge_complete" | "program_complete";
  title: string;
  description: string;
  icon?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum";
  value?: string;
  improvement?: string;
  metadata?: Record<string, unknown>;
}

interface AchievementCelebrationProps {
  achievement: AchievementData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: () => void;
}

export function AchievementCelebration({
  achievement,
  open,
  onOpenChange,
  onShare,
}: AchievementCelebrationProps) {
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (open && achievement) {
      setConfetti(true);
      const timer = setTimeout(() => setConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, achievement]);

  if (!achievement) return null;

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case "bronze":
        return "from-amber-600 to-amber-800";
      case "silver":
        return "from-gray-300 to-gray-500";
      case "gold":
        return "from-yellow-400 to-amber-500";
      case "platinum":
        return "from-purple-400 to-purple-600";
      default:
        return "from-brand to-energy";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "badge":
        return <Award className="h-8 w-8" />;
      case "pr":
        return <TrendingUp className="h-8 w-8" />;
      case "milestone":
        return <Star className="h-8 w-8" />;
      case "challenge_complete":
        return <Trophy className="h-8 w-8" />;
      case "program_complete":
        return <Flame className="h-8 w-8" />;
      default:
        return <Sparkles className="h-8 w-8" />;
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      const text = `I just earned "${achievement.title}"! ${achievement.description}`;
      if (typeof navigator.share === "function") {
        navigator.share({
          title: "New Achievement!",
          text,
        });
      } else {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden">
        {/* Confetti effect */}
        {confetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: [
                    "#FFD700",
                    "#FF6B6B",
                    "#4ECDC4",
                    "#9B59B6",
                    "#3498DB",
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            ))}
          </div>
        )}

        <DialogHeader className="space-y-4">
          <div className="mx-auto relative">
            {/* Glow effect */}
            <div
              className={cn(
                "absolute inset-0 blur-2xl opacity-50 rounded-full bg-gradient-to-br",
                getTierColor(achievement.tier)
              )}
            />
            {/* Icon container */}
            <div
              className={cn(
                "relative h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br text-white shadow-lg",
                getTierColor(achievement.tier)
              )}
            >
              {achievement.icon ? (
                <span className="text-4xl">{achievement.icon}</span>
              ) : (
                getTypeIcon(achievement.type)
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {achievement.type === "badge"
                ? "New Badge Unlocked!"
                : achievement.type === "pr"
                ? "Personal Record!"
                : achievement.type === "challenge_complete"
                ? "Challenge Complete!"
                : achievement.type === "program_complete"
                ? "Program Complete!"
                : "Achievement Unlocked!"}
            </p>
            <DialogTitle className="text-2xl font-bold">
              {achievement.title}
            </DialogTitle>
            {achievement.tier && (
              <Badge
                className={cn(
                  "bg-gradient-to-r text-white border-0",
                  getTierColor(achievement.tier)
                )}
              >
                {achievement.tier.charAt(0).toUpperCase() +
                  achievement.tier.slice(1)}{" "}
                Tier
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground">{achievement.description}</p>
          
          {achievement.value && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{achievement.value}</p>
              {achievement.improvement && (
                <p className="text-sm text-success mt-1">
                  {achievement.improvement}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Continue
          </Button>
          <Button className="flex-1 bg-brand-gradient" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <style jsx>{`
          @keyframes confetti {
            0% {
              transform: translateY(-100%) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti {
            width: 10px;
            height: 10px;
            animation: confetti 3s ease-out forwards;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
