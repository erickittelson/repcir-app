"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MessageSquarePlus,
  Smile,
  Meh,
  Frown,
  Zap,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Loader2,
  Check,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickFeedbackProps {
  memberId: string;
  entityType: "workout_session" | "goal" | "exercise" | "general" | "limitation";
  entityId?: string;
  onSubmit?: () => void;
  compact?: boolean;
  showTitle?: boolean;
  placeholder?: string;
}

const MOODS = [
  { value: "great", icon: "😄", label: "Great" },
  { value: "good", icon: "🙂", label: "Good" },
  { value: "okay", icon: "😐", label: "Okay" },
  { value: "tired", icon: "😴", label: "Tired" },
  { value: "stressed", icon: "😰", label: "Stressed" },
  { value: "motivated", icon: "💪", label: "Motivated" },
  { value: "frustrated", icon: "😤", label: "Frustrated" },
];

const ENERGY_LEVELS = [
  { value: 1, label: "Very Low", color: "bg-red-500" },
  { value: 2, label: "Low", color: "bg-orange-500" },
  { value: 3, label: "Moderate", color: "bg-yellow-500" },
  { value: 4, label: "High", color: "bg-lime-500" },
  { value: 5, label: "Very High", color: "bg-green-500" },
];

const DIFFICULTY_OPTIONS = [
  { value: "too_easy", icon: ThumbsDown, label: "Too Easy", color: "text-brand" },
  { value: "just_right", icon: ThumbsUp, label: "Just Right", color: "text-green-500" },
  { value: "challenging", icon: Zap, label: "Challenging", color: "text-yellow-500" },
  { value: "too_hard", icon: AlertTriangle, label: "Too Hard", color: "text-red-500" },
];

const COMMON_TAGS = [
  "Sore",
  "Tight muscles",
  "Great pump",
  "PR attempt",
  "Deload needed",
  "Sleep deprived",
  "Well rested",
  "Stressed from work",
  "Feeling strong",
  "Low motivation",
  "Post-injury",
  "Time crunched",
];

export function QuickFeedback({
  memberId,
  entityType,
  entityId,
  onSubmit,
  compact = false,
  showTitle = true,
  placeholder = "How are you feeling? Any notes for the AI to remember...",
}: QuickFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [mood, setMood] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [painLevel, setPainLevel] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const resetForm = () => {
    setMood(null);
    setEnergyLevel(null);
    setPainLevel(0);
    setDifficulty(null);
    setContent("");
    setSelectedTags([]);
    setSaved(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    // Must have at least some feedback
    if (!mood && !energyLevel && !difficulty && !content && selectedTags.length === 0 && painLevel === 0) {
      toast.error("Please add some feedback");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/members/${memberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          mood,
          energyLevel,
          painLevel: painLevel > 0 ? painLevel : null,
          difficulty,
          content: content || null,
          tags: selectedTags,
        }),
      });

      if (response.ok) {
        toast.success("Feedback saved - AI will use this context!");
        setSaved(true);
        onSubmit?.();
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1000);
      } else {
        toast.error("Failed to save feedback");
      }
    } catch (error) {
      console.error("Failed to save feedback:", error);
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Add Note
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Quick Feedback</h4>

            {/* Mood */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">How are you feeling?</label>
              <div className="flex flex-wrap gap-1">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(mood === m.value ? null : m.value)}
                    className={cn(
                      "text-xl p-1 rounded hover:bg-muted transition-colors",
                      mood === m.value && "bg-primary/20 ring-2 ring-primary"
                    )}
                    title={m.label}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Energy Level</label>
              <div className="flex gap-1">
                {ENERGY_LEVELS.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setEnergyLevel(energyLevel === e.value ? null : e.value)}
                    className={cn(
                      "flex-1 h-6 rounded transition-all",
                      energyLevel && energyLevel >= e.value ? e.color : "bg-muted",
                      energyLevel === e.value && "ring-2 ring-offset-1 ring-primary"
                    )}
                    title={e.label}
                  />
                ))}
              </div>
            </div>

            {/* Note */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="text-sm"
            />

            <Button
              className="w-full"
              size="sm"
              onClick={handleSubmit}
              disabled={saving || saved}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {saved ? "Saved!" : "Save Feedback"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            How Did It Go?
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!showTitle && "pt-4")}>
        <div className="space-y-4">
          {/* Mood Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(mood === m.value ? null : m.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-sm",
                    mood === m.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Energy Level {energyLevel && `(${energyLevel}/5)`}
            </label>
            <div className="flex gap-2">
              {ENERGY_LEVELS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEnergyLevel(energyLevel === e.value ? null : e.value)}
                  className={cn(
                    "flex-1 h-8 rounded-lg transition-all",
                    energyLevel && energyLevel >= e.value ? e.color : "bg-muted",
                    energyLevel === e.value && "ring-2 ring-offset-2 ring-primary"
                  )}
                  title={e.label}
                />
              ))}
            </div>
          </div>

          {/* Pain Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Pain Level {painLevel > 0 && `(${painLevel}/10)`}
              {painLevel > 5 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <button
                  key={level}
                  onClick={() => setPainLevel(painLevel === level ? 0 : level)}
                  className={cn(
                    "flex-1 h-6 rounded transition-all text-xs font-medium",
                    level === 0
                      ? painLevel === 0
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                      : painLevel >= level
                        ? level <= 3
                          ? "bg-yellow-500"
                          : level <= 6
                            ? "bg-orange-500"
                            : "bg-red-500"
                        : "bg-muted"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">0 = no pain, 10 = severe pain</p>
          </div>

          {/* Difficulty (for workout context) */}
          {(entityType === "workout_session" || entityType === "exercise") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(difficulty === d.value ? null : d.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                        difficulty === d.value
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", d.color)} />
                      <span className="text-xs">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Free-form notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              The AI will use this to personalize future recommendations
            </p>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || saved}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <MessageSquarePlus className="mr-2 h-4 w-4" />
            )}
            {saved ? "Feedback Saved!" : "Save Feedback"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Inline version for quick feedback after completing sets/exercises
export function InlineFeedback({
  memberId,
  entityType,
  entityId,
  onSubmit,
}: Omit<QuickFeedbackProps, "compact" | "showTitle" | "placeholder">) {
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleQuickMood = async (selectedMood: string) => {
    setMood(selectedMood);
    setSaving(true);

    try {
      await fetch(`/api/members/${memberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          mood: selectedMood,
        }),
      });
      onSubmit?.();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {MOODS.slice(0, 4).map((m) => (
        <button
          key={m.value}
          onClick={() => handleQuickMood(m.value)}
          disabled={saving}
          className={cn(
            "text-lg p-1 rounded hover:bg-muted transition-colors",
            mood === m.value && "bg-primary/20"
          )}
          title={m.label}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}
