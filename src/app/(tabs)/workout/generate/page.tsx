"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Dumbbell, Library, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRAIN_OPTIONS = [
  {
    id: "ai-generate",
    title: "AI Generate",
    subtitle: "Personalized for you",
    description: "Get an AI-crafted workout based on your goals and fitness level",
    icon: Sparkles,
    color: "text-energy",
    bgColor: "bg-energy/10",
    borderColor: "border-energy/30",
    route: "/coach",
  },
  {
    id: "browse-plans",
    title: "My Plans",
    subtitle: "Saved workouts",
    description: "Browse and start from your saved workout plans",
    icon: Library,
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/30",
    route: "/workouts",
  },
  {
    id: "build-custom",
    title: "Build Custom",
    subtitle: "From scratch",
    description: "Create your own workout with our exercise builder",
    icon: Dumbbell,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    route: "/workouts/builder",
  },
] as const;

export default function TrainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withMembers = searchParams.get("with");

  const handleSelect = (route: string) => {
    const url = withMembers ? `${route}?with=${withMembers}` : route;
    router.push(url);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Train</h1>
          <p className="text-sm text-muted-foreground">
            Choose how you want to work out
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {TRAIN_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.route)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                "hover:scale-[1.02] active:scale-[0.98]",
                option.borderColor,
                option.bgColor
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl",
                  "bg-background/80 shadow-sm"
                )}
              >
                <Icon className={cn("h-7 w-7", option.color)} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{option.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {option.subtitle}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
