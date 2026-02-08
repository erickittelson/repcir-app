"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  CheckCircle2,
  Dumbbell,
  Sparkles,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CircleMemberSelector,
  type CircleMember,
} from "@/components/social/circle-member-selector";

interface CreateActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogWorkout: (preSelectedMembers?: CircleMember[]) => void;
}

const ACTIONS = [
  {
    id: "log",
    title: "Log",
    subtitle: "Just finished",
    description: "Record & share your workout",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    action: "log",
  },
  {
    id: "train",
    title: "Train",
    subtitle: "Ready to work",
    description: "Start or generate a workout",
    icon: Dumbbell,
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/30",
    action: "train",
  },
  {
    id: "coach",
    title: "Coach",
    subtitle: "Need help",
    description: "AI coaching & guidance",
    icon: Sparkles,
    color: "text-energy",
    bgColor: "bg-energy/10",
    borderColor: "border-energy/30",
    action: "coach",
  },
] as const;

export function CreateActionSheet({
  open,
  onOpenChange,
  onLogWorkout,
}: CreateActionSheetProps) {
  const router = useRouter();
  const [selectedMembers, setSelectedMembers] = useState<CircleMember[]>([]);

  const handleAction = (action: string) => {
    const memberIds = selectedMembers.map((m) => m.memberId).join(",");

    onOpenChange(false);

    switch (action) {
      case "log":
        // Pass selected members to log sheet
        setTimeout(() => onLogWorkout(selectedMembers), 150);
        break;
      case "train":
        // Pass member IDs as query param for group workout
        const trainUrl = memberIds
          ? `/workout/generate?with=${memberIds}`
          : "/workout/generate";
        router.push(trainUrl);
        break;
      case "coach":
        // Pass member IDs for group coaching session
        const coachUrl = memberIds
          ? `/coach?with=${memberIds}`
          : "/coach";
        router.push(coachUrl);
        break;
    }

    // Reset selected members after action
    setTimeout(() => setSelectedMembers([]), 200);
  };

  return (
    <Sheet open={open} onOpenChange={(value) => {
      onOpenChange(value);
      if (!value) setSelectedMembers([]);
    }}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-2">
        {/* Accessible title (hidden visually) */}
        <VisuallyHidden>
          <SheetTitle>Choose an action</SheetTitle>
        </VisuallyHidden>

        {/* Handle */}
        <div className="flex justify-center pb-4">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        {/* Train Together - Member Selection */}
        <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium">Train together?</span>
            </div>
            <CircleMemberSelector
              selectedMembers={selectedMembers}
              onSelectionChange={setSelectedMembers}
              maxSelections={5}
              compact
            />
          </div>
          {selectedMembers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedMembers.map((m) => m.name.split(" ")[0]).join(", ")} will be included
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.action)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  action.borderColor,
                  action.bgColor
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl",
                  "bg-background/80 shadow-sm"
                )}>
                  <Icon className={cn("h-7 w-7", action.color)} />
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold">{action.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {action.subtitle}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {action.description}
                    {selectedMembers.length > 0 && (
                      <span className="text-brand"> with {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Brand footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Effort is the standard.
        </p>
      </SheetContent>
    </Sheet>
  );
}
