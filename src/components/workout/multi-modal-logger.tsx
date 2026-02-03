"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Mic,
  ClipboardList,
  Dumbbell,
  Heart,
  Flame,
  PersonStanding,
  Timer,
  Loader2,
  Send,
  Check,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceWorkoutForm, type WorkoutFormData } from "@/components/voice/voice-workout-form";
import {
  MediaUploadWithEditor,
  type UploadedMedia,
} from "@/components/media/media-upload-with-editor";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface MultiModalLoggerProps {
  onSubmit: (data: WorkoutFormData) => Promise<void>;
  onCancel?: () => void;
  defaultMode?: "quick" | "voice" | "detailed";
  className?: string;
}

type LoggingMode = "quick" | "voice" | "detailed";

const MODES: { id: LoggingMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: "quick", label: "Quick", icon: Zap, description: "Fast logging" },
  { id: "voice", label: "Voice", icon: Mic, description: "Speak naturally" },
  { id: "detailed", label: "Detailed", icon: ClipboardList, description: "Full control" },
];

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "hiit", label: "HIIT", icon: Flame },
  { id: "flexibility", label: "Stretch", icon: PersonStanding },
  { id: "sports", label: "Sports", icon: Flame },
  { id: "other", label: "Other", icon: Timer },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

const INTENSITY_LEVELS = [
  { value: "light", label: "Light", description: "Could chat easily" },
  { value: "moderate", label: "Moderate", description: "Slightly breathless" },
  { value: "hard", label: "Hard", description: "Difficult to talk" },
  { value: "max", label: "Max Effort", description: "All out" },
];

const FEELINGS = [
  { value: "amazing", emoji: "🔥", label: "Amazing" },
  { value: "good", emoji: "💪", label: "Good" },
  { value: "okay", emoji: "👍", label: "Okay" },
  { value: "tired", emoji: "😓", label: "Tired" },
  { value: "struggled", emoji: "😤", label: "Struggled" },
];

export function MultiModalLogger({
  onSubmit,
  onCancel,
  defaultMode = "quick",
  className,
}: MultiModalLoggerProps) {
  const [mode, setMode] = useState<LoggingMode>(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick mode state
  const [quickType, setQuickType] = useState<string | null>(null);
  const [quickDuration, setQuickDuration] = useState(30);

  // Detailed mode state
  const [detailedType, setDetailedType] = useState<string>("");
  const [detailedDuration, setDetailedDuration] = useState<string>("30");
  const [detailedIntensity, setDetailedIntensity] = useState<string>("");
  const [detailedFeeling, setDetailedFeeling] = useState<string>("");
  const [detailedNotes, setDetailedNotes] = useState<string>("");
  const [detailedCalories, setDetailedCalories] = useState<string>("");
  const [detailedMedia, setDetailedMedia] = useState<UploadedMedia[]>([]);

  // Quick mode media
  const [quickMedia, setQuickMedia] = useState<UploadedMedia[]>([]);

  const handleModeChange = useCallback((newMode: LoggingMode) => {
    setMode(newMode);
    haptics.light();
  }, []);

  const handleQuickSubmit = useCallback(async () => {
    if (!quickType) {
      toast.error("Please select a workout type");
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (quickMedia.length > 0 && quickMedia[0].file) {
        const formData = new FormData();
        formData.append("file", quickMedia[0].file);
        formData.append("type", "workout");

        const res = await fetch("/api/user/upload-image", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const { url } = await res.json();
          photoUrl = url;
        }
      }

      await onSubmit({
        workoutType: quickType,
        duration: quickDuration,
        photoUrl,
      });
      haptics.success();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to log workout");
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [quickType, quickDuration, quickMedia, onSubmit]);

  const handleDetailedSubmit = useCallback(async () => {
    if (!detailedType) {
      toast.error("Please select a workout type");
      return;
    }

    const duration = parseInt(detailedDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (detailedMedia.length > 0 && detailedMedia[0].file) {
        const formData = new FormData();
        formData.append("file", detailedMedia[0].file);
        formData.append("type", "workout");

        const res = await fetch("/api/user/upload-image", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const { url } = await res.json();
          photoUrl = url;
        }
      }

      const notes = [
        detailedNotes,
        detailedIntensity && `Intensity: ${detailedIntensity}`,
        detailedFeeling && `Feeling: ${detailedFeeling}`,
        detailedCalories && `Estimated calories: ${detailedCalories}`,
      ]
        .filter(Boolean)
        .join("\n");

      await onSubmit({
        workoutType: detailedType,
        duration,
        notes: notes || undefined,
        photoUrl,
        feeling: detailedFeeling || undefined,
      });
      haptics.success();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to log workout");
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    detailedType,
    detailedDuration,
    detailedIntensity,
    detailedFeeling,
    detailedNotes,
    detailedCalories,
    detailedMedia,
    onSubmit,
  ]);

  const handleVoiceSubmit = useCallback(
    async (data: WorkoutFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-md transition-all",
                isActive
                  ? "bg-background shadow-sm text-brand"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Content */}
      <AnimatePresence mode="wait">
        {/* Quick Mode */}
        {mode === "quick" && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            {/* Workout Type Grid */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                What did you do?
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {WORKOUT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = quickType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setQuickType(type.id);
                        haptics.light();
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                        isSelected
                          ? "border-brand bg-brand/10"
                          : "border-border hover:border-brand/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-6 w-6",
                          isSelected ? "text-brand" : "text-muted-foreground"
                        )}
                      />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                How long? <span className="text-foreground font-medium">{quickDuration} min</span>
              </Label>
              <div className="flex gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setQuickDuration(preset);
                      haptics.light();
                    }}
                    className={cn(
                      "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all",
                      quickDuration === preset
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border hover:border-brand/50"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Add Photo <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <MediaUploadWithEditor
                onChange={setQuickMedia}
                maxFiles={1}
                autoUpload={false}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleQuickSubmit}
              disabled={!quickType || isSubmitting}
              className="w-full h-12 bg-brand-gradient"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Logging...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Log Workout
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Voice Mode */}
        {mode === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <VoiceWorkoutForm
              onSubmit={handleVoiceSubmit}
              onCancel={onCancel}
            />
          </motion.div>
        )}

        {/* Detailed Mode */}
        {mode === "detailed" && (
          <motion.div
            key="detailed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            {/* Workout Type */}
            <div className="space-y-2">
              <Label htmlFor="workout-type">Workout Type</Label>
              <Select value={detailedType} onValueChange={setDetailedType}>
                <SelectTrigger id="workout-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration & Calories Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={detailedDuration}
                  onChange={(e) => setDetailedDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calories (est.)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={detailedCalories}
                  onChange={(e) => setDetailedCalories(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label>Intensity</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => {
                      setDetailedIntensity(level.value);
                      haptics.light();
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      detailedIntensity === level.value
                        ? "border-brand bg-brand/10"
                        : "border-border hover:border-brand/50"
                    )}
                  >
                    <span className="font-medium text-sm">{level.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {level.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* How did you feel? */}
            <div className="space-y-2">
              <Label>How did you feel?</Label>
              <div className="flex gap-2">
                {FEELINGS.map((feeling) => (
                  <button
                    key={feeling.value}
                    onClick={() => {
                      setDetailedFeeling(feeling.value);
                      haptics.light();
                    }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all",
                      detailedFeeling === feeling.value
                        ? "border-brand bg-brand/10"
                        : "border-border hover:border-brand/50"
                    )}
                  >
                    <span className="text-lg">{feeling.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {feeling.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label>Add Photo</Label>
              <MediaUploadWithEditor
                onChange={setDetailedMedia}
                maxFiles={3}
                autoUpload={false}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value)}
                placeholder="Any highlights, PRs, or thoughts about this workout..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleDetailedSubmit}
                disabled={!detailedType || isSubmitting}
                className="flex-1 bg-brand-gradient"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Logging...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Log Workout
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
