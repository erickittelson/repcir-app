"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Dumbbell,
  Heart,
  Zap,
  PersonStanding,
  Flame,
  Timer,
  Check,
  Pencil,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceLogger, type ParsedWorkoutData } from "./voice-logger";
import {
  MediaUploadWithEditor,
  type UploadedMedia,
} from "@/components/media/media-upload-with-editor";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface VoiceWorkoutFormProps {
  onSubmit: (data: WorkoutFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export interface WorkoutFormData {
  workoutType: string;
  duration: number;
  notes?: string;
  photoUrl?: string;
  feeling?: string;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: string;
  }>;
}

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: Dumbbell, color: "text-brand" },
  { id: "cardio", label: "Cardio", icon: Heart, color: "text-energy" },
  { id: "hiit", label: "HIIT", icon: Zap, color: "text-amber-500" },
  { id: "flexibility", label: "Stretch", icon: PersonStanding, color: "text-success" },
  { id: "sports", label: "Sports", icon: Flame, color: "text-orange-500" },
  { id: "other", label: "Other", icon: Timer, color: "text-muted-foreground" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function VoiceWorkoutForm({
  onSubmit,
  onCancel,
  className,
}: VoiceWorkoutFormProps) {
  const [isVoiceLoggerOpen, setIsVoiceLoggerOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [feeling, setFeeling] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleVoiceComplete = useCallback(
    (data: ParsedWorkoutData, rawTranscript: string) => {
      // Populate form with parsed data
      if (data.workoutType) {
        setWorkoutType(data.workoutType);
      }
      if (data.duration) {
        setDuration(data.duration);
        if (!DURATION_PRESETS.includes(data.duration)) {
          setCustomDuration(data.duration.toString());
        }
      }
      if (data.notes || rawTranscript) {
        setNotes(data.notes || rawTranscript);
      }
      if (data.feeling) {
        setFeeling(data.feeling);
      }
      // Show edit mode if we got data
      setIsEditing(true);
      haptics.success();
    },
    []
  );

  const handleMediaChange = useCallback((updatedMedia: UploadedMedia[]) => {
    setMedia(updatedMedia);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workoutType) {
      toast.error("Please select a workout type");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload media if needed
      let photoUrl: string | undefined;
      if (media.length > 0 && media[0].file) {
        const formData = new FormData();
        formData.append("file", media[0].file);
        formData.append("type", "workout");

        const uploadRes = await fetch("/api/user/upload-image", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          photoUrl = url;
        }
      }

      const formData: WorkoutFormData = {
        workoutType,
        duration: customDuration ? parseInt(customDuration, 10) : duration,
        notes: notes || undefined,
        photoUrl,
        feeling: feeling || undefined,
      };

      await onSubmit(formData);
      haptics.success();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to log workout");
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [workoutType, duration, customDuration, notes, feeling, media, onSubmit]);

  const handleDurationPreset = useCallback((preset: number) => {
    setDuration(preset);
    setCustomDuration("");
    haptics.light();
  }, []);

  const handleCustomDuration = useCallback((value: string) => {
    setCustomDuration(value);
    if (value) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        setDuration(num);
      }
    }
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Voice Input CTA */}
      {!isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <button
            onClick={() => setIsVoiceLoggerOpen(true)}
            className="inline-flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-brand/20 to-energy/20 border-2 border-brand/30 hover:border-brand/50 transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center">
              <Mic className="h-10 w-10 text-brand" />
            </div>
            <div>
              <p className="text-lg font-semibold">Tap to Log with Voice</p>
              <p className="text-sm text-muted-foreground mt-1">
                Just say what you did - we'll fill in the details
              </p>
            </div>
          </button>

          <p className="text-sm text-muted-foreground mt-4">
            Or{" "}
            <button
              onClick={() => setIsEditing(true)}
              className="text-brand hover:underline"
            >
              fill in manually
            </button>
          </p>
        </motion.div>
      )}

      {/* Form Fields (shown after voice input or manual selection) */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-5"
          >
            {/* Workout Type */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  What did you do?
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVoiceLoggerOpen(true)}
                  className="h-8 text-xs text-brand"
                >
                  <Mic className="h-3 w-3 mr-1" />
                  Re-record
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {WORKOUT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = workoutType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setWorkoutType(type.id);
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
                          isSelected ? "text-brand" : type.color
                        )}
                      />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                How long?{" "}
                <span className="text-foreground font-medium">
                  {customDuration || duration} min
                </span>
              </p>
              <div className="flex gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleDurationPreset(preset)}
                    className={cn(
                      "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all",
                      duration === preset && !customDuration
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border hover:border-brand/50"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Custom duration (minutes)"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                className="text-center"
              />
            </div>

            {/* Photo */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Add Photo{" "}
                <span className="text-muted-foreground/50">(optional)</span>
              </p>
              <MediaUploadWithEditor
                onChange={handleMediaChange}
                maxFiles={1}
                autoUpload={false}
              />
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Notes{" "}
                <span className="text-muted-foreground/50">(optional)</span>
              </p>
              <Textarea
                placeholder="How was your workout? Any highlights?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!workoutType || isSubmitting}
                className="flex-1 bg-brand-gradient"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Logging...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Log Workout
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Logger Overlay */}
      <VoiceLogger
        open={isVoiceLoggerOpen}
        onOpenChange={setIsVoiceLoggerOpen}
        onComplete={handleVoiceComplete}
        promptText="Tell me about your workout. For example: 'I did 45 minutes of strength training, focused on upper body, feeling great!'"
        parseMode="workout"
      />
    </div>
  );
}
