"use client";

import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dumbbell,
  ClipboardList,
  Sparkles,
  History,
  Target,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  gradient?: string;
}

export function CreateSheet({ open, onOpenChange }: CreateSheetProps) {
  const router = useRouter();

  const actions: ActionItem[] = [
    {
      icon: Dumbbell,
      label: "Quick Workout",
      description: "Start an empty workout session",
      href: "/workout/new",
      gradient: "from-brand to-energy",
    },
    {
      icon: ClipboardList,
      label: "Use a Plan",
      description: "Pick from your saved plans",
      href: "/activity?tab=plans",
    },
    {
      icon: Sparkles,
      label: "AI Generate",
      description: "Generate workout with AI",
      href: "/workout/generate",
      gradient: "from-energy to-success",
    },
    {
      icon: History,
      label: "Log Past Workout",
      description: "Retroactive logging",
      href: "/workout/log",
    },
    {
      icon: Target,
      label: "Create Goal",
      description: "Set a new fitness goal",
      href: "/you?section=goals&action=new",
    },
    {
      icon: MessageSquare,
      label: "Share Update",
      description: "Post to your rally",
      onClick: async () => {
        const shareData = {
          title: "My Fitness Update",
          text: "Check out my progress!",
          url: window.location.origin,
        };
        
        try {
          if (navigator.share && navigator.canShare?.(shareData)) {
            await navigator.share(shareData);
          } else {
            // Fallback - copy to clipboard
            await navigator.clipboard.writeText(
              `${shareData.text} ${shareData.url}`
            );
            // Show toast (would need to add toast import)
          }
        } catch {
          // User cancelled or share failed - this is expected behavior
        }
        onOpenChange(false);
      },
    },
  ];

  const handleAction = (action: ActionItem) => {
    if (action.href) {
      router.push(action.href);
    } else if (action.onClick) {
      action.onClick();
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          <SheetTitle className="text-center">Create</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleAction(action)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:bg-accent active:scale-[0.98]",
                  action.gradient && "border-0 bg-gradient-to-br text-white",
                  action.gradient === "from-brand to-energy" &&
                    "from-brand to-energy",
                  action.gradient === "from-energy to-success" &&
                    "from-energy to-success"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    action.gradient
                      ? "bg-white/20"
                      : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      action.gradient ? "text-white" : "text-foreground"
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      !action.gradient && "text-foreground"
                    )}
                  >
                    {action.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      action.gradient
                        ? "text-white/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
