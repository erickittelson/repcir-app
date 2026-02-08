"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dumbbell,
  Heart,
  Zap,
  Flame,
  PersonStanding,
  Timer,
  Loader2,
  Check,
  Sparkles,
  ImagePlus,
  X,
  Copy,
  Share2,
  Instagram,
  Twitter,
  Facebook,
  Send,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CircleMemberSelector,
  type CircleMember,
} from "@/components/social/circle-member-selector";
import { PhotoEditor } from "@/components/media/photo-editor";
import { InlineVoiceInput } from "@/components/voice/inline-voice-input";
import { haptics } from "@/lib/haptics";

interface QuickLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedMembers?: CircleMember[];
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

const CAPTION_TONES = [
  { id: "motivational", label: "Motivational", emoji: "💪" },
  { id: "humble", label: "Humble", emoji: "😊" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "raw", label: "Raw & Real", emoji: "🔥" },
  { id: "professional", label: "Professional", emoji: "📊" },
  { id: "casual", label: "Casual", emoji: "✌️" },
];

// TikTok icon component (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function QuickLogSheet({ open, onOpenChange, preSelectedMembers }: QuickLogSheetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [caption, setCaption] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tone, setTone] = useState("motivational");
  const [taggedMembers, setTaggedMembers] = useState<CircleMember[]>([]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [successTaggedCount, setSuccessTaggedCount] = useState(0);

  // Photo editor states
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  // Initialize tagged members from pre-selected when sheet opens
  useEffect(() => {
    if (open && preSelectedMembers && preSelectedMembers.length > 0) {
      setTaggedMembers(preSelectedMembers);
    }
  }, [open, preSelectedMembers]);

  const resetForm = () => {
    setWorkoutType(null);
    setDuration(30);
    setCaption("");
    setPhoto(null);
    setPhotoFile(null);
    setTone("motivational");
    setCopiedCaption(false);
    setTaggedMembers([]);
    setPendingPhotoFile(null);
  };

  // Handle photo editor save
  const handlePhotoEditorSave = (editedFile: File, previewUrl: string) => {
    setPhotoFile(editedFile);
    setPhoto(previewUrl);
    setPendingPhotoFile(null);
    haptics.success();
  };

  // Handle photo editor skip (use original)
  const handlePhotoEditorSkip = () => {
    if (pendingPhotoFile) {
      setPhotoFile(pendingPhotoFile);
      setPhoto(URL.createObjectURL(pendingPhotoFile));
    }
    setPendingPhotoFile(null);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or video file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    // Haptic feedback on photo selection
    haptics.light();

    // For images, open editor; for videos, use directly
    if (file.type.startsWith("image/")) {
      setPendingPhotoFile(file);
      setIsPhotoEditorOpen(true);
    } else {
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhoto(previewUrl);
    }
  };

  const handleRemovePhoto = () => {
    if (photo) {
      URL.revokeObjectURL(photo);
    }
    setPhoto(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateCaption = async () => {
    if (!workoutType) {
      toast.error("Select a workout type first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutType,
          duration,
          tone,
          existingCaption: caption || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await response.json();
      setCaption(data.caption);
      toast.success("Caption generated!");
    } catch (error) {
      console.error("Caption generation error:", error);
      // Fallback captions - influencer style inspired by Few Will Hunt, Goggins, etc.
      const fallbackCaptions: Record<string, Record<string, string>> = {
        motivational: {
          strength: `${duration} min of iron. Most won't. That's why most don't look the way they want. #EarnIt`,
          cardio: `${duration} minutes. Lungs on fire. Mind quiet. This is the work. 🔥`,
          hiit: `${duration} min HIIT. When your body begs to stop, that's when you start. #40Percent`,
          flexibility: `${duration} min mobility. Longevity is the real flex. Taking care of the machine.`,
          sports: `${duration} min competition prep. Play to win or don't play at all. 🏆`,
          other: `${duration} minutes. No one's coming to save you. Save yourself. #TheWork`,
        },
        humble: {
          strength: `${duration} min lifting. Not where I want to be. Better than where I was.`,
          cardio: `Put in ${duration} minutes today. Grateful for legs that move.`,
          hiit: `${duration} min HIIT. Humbled. The work continues tomorrow.`,
          flexibility: `${duration} min stretch. The body keeps score. Paying my dues.`,
          sports: `${duration} min on the court. Learning something new every session.`,
          other: `${duration} minutes done. Progress over perfection.`,
        },
        funny: {
          strength: `${duration} min at the gym. My arms are already writing their resignation letter 😭`,
          cardio: `Did ${duration} min cardio. Plot twist: the cardio did me 💀`,
          hiit: `${duration} min HIIT. Pretty sure I met God around minute 8. He said "no excuses" 😂`,
          flexibility: `${duration} min stretching. I have the flexibility of a parking cone 🤷‍♂️`,
          sports: `${duration} min of sports. Still gasping 20 minutes later. Elite athlete status 📈😅`,
          other: `${duration} min workout. My couch is crying. I'm also crying. We're all crying.`,
        },
        raw: {
          strength: `${duration} min under the bar. Nobody's watching. Just me and the weight. That's where growth happens.`,
          cardio: `${duration} minutes. Suffering is the price. Pay it or stay average.`,
          hiit: `${duration} min HIIT. Collapsed on the floor. Got back up. That's the whole game.`,
          flexibility: `${duration} min mobility. Breaking down to rebuild. The unsexy work.`,
          sports: `${duration} min going hard. Left it all out there. No regrets.`,
          other: `${duration} min of real work. Quiet hours while the world sleeps.`,
        },
        professional: {
          strength: `${duration} min strength block. Progressive overload tracked. Building. 📊`,
          cardio: `${duration} min zone 2 complete. Aerobic base is the foundation.`,
          hiit: `${duration} min metabolic session. Work-to-rest ratios optimized. ⚡`,
          flexibility: `${duration} min mobility protocol. Range of motion is performance.`,
          sports: `${duration} min sport-specific training. Skill acquisition in progress.`,
          other: `${duration} min session logged. Data tracked. Forward motion.`,
        },
        casual: {
          strength: `${duration} min lifting 🏋️ the usual`,
          cardio: `got my ${duration} min in ✓`,
          hiit: `${duration} min hiit. survived barely lol`,
          flexibility: `${duration} min stretch sesh 🧘`,
          sports: `${duration} min playing. good vibes only`,
          other: `${duration} min ✓ staying consistent`,
        },
      };

      const toneOptions = fallbackCaptions[tone] || fallbackCaptions.motivational;
      setCaption(toneOptions[workoutType] || toneOptions.other);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!caption) {
      toast.error("Write or generate a caption first");
      return;
    }

    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      toast.success("Caption copied to clipboard!");
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      toast.error("Failed to copy caption");
    }
  };

  const handleShareToSocial = async (platform: string) => {
    const text = caption || `Just finished a ${duration} min ${workoutType || "workout"}! 💪`;
    const hashtags = "Repcir,Fitness,WorkoutComplete";

    const shareUrls: Record<string, string> = {
      instagram: `instagram://camera`, // Opens Instagram camera (user pastes caption)
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=${hashtags}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
      tiktok: `https://www.tiktok.com/`, // Opens TikTok (user creates content)
    };

    // Copy caption to clipboard for platforms that don't support direct sharing
    if (platform === "instagram" || platform === "tiktok") {
      await navigator.clipboard.writeText(text);
      toast.success("Caption copied! Paste it in the app.");
    }

    const url = shareUrls[platform];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleNativeShare = async () => {
    const text = caption || `Just finished a ${duration} min ${workoutType || "workout"}! 💪`;

    const shareData: ShareData = {
      title: "My Repcir Workout",
      text,
    };

    // If we have a photo file, try to share it
    if (photoFile && navigator.canShare?.({ files: [photoFile] })) {
      shareData.files = [photoFile];
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Caption copied to clipboard!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Share failed");
      }
    }
  };

  const handleSubmit = async () => {
    if (!workoutType) return;

    setIsSubmitting(true);
    try {
      let photoUrl: string | undefined;

      // Upload photo if present
      if (photoFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("type", "workout");

        const uploadResponse = await fetch("/api/user/upload-image", {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          photoUrl = url;
        }
        setIsUploading(false);
      }

      // Create workout session with tagged members
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quick_log",
          workoutType,
          duration,
          notes: caption || undefined,
          photoUrl,
          status: "completed",
          completedAt: new Date().toISOString(),
          postToFeed: true,
          taggedMemberIds: taggedMembers.map((m) => m.memberId),
        }),
      });

      if (response.ok) {
        setSuccessTaggedCount(taggedMembers.length);
        setShowSuccess(true);
        setTimeout(() => {
          resetForm();
          setShowSuccess(false);
          setSuccessTaggedCount(0);
          onOpenChange(false);
          router.refresh();
        }, 1500);
      } else {
        throw new Error("Failed to log workout");
      }
    } catch (error) {
      console.error("Failed to log workout:", error);
      toast.error("Failed to log workout");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (showSuccess) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20 mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="text-lg font-medium">Posted!</p>
            <p className="text-sm text-muted-foreground">
              {successTaggedCount > 0
                ? `Shared with ${successTaggedCount} circle member${successTaggedCount > 1 ? "s" : ""}`
                : "Your circle can see it"}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          <SheetTitle className="text-center">Log & Share</SheetTitle>
        </SheetHeader>

        {/* Workout Type */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            What did you do?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {WORKOUT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = workoutType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setWorkoutType(type.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                    isSelected
                      ? "border-brand bg-brand/10"
                      : "border-border hover:border-brand/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6", isSelected ? "text-brand" : type.color)} />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            How long? <span className="text-foreground font-medium">{duration} min</span>
          </p>
          <div className="flex gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setDuration(preset)}
                className={cn(
                  "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all",
                  duration === preset
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border hover:border-brand/50"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Input for Caption */}
        <div className="mb-5">
          <InlineVoiceInput
            onComplete={(text) => {
              setCaption(text);
              haptics.success();
            }}
            placeholder="Describe your workout - it'll become your caption"
          />
        </div>

        {/* Photo Upload */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Add Photo <span className="text-muted-foreground/50">(optional)</span>
          </p>
          {photo ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={photo}
                alt="Workout"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-brand/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-brand transition-colors"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Tap to add photo or video</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Caption */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Caption
            </p>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="w-auto h-7 text-xs gap-1 border-0 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_TONES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-1.5">
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Write something or generate with AI..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateCaption}
            disabled={isGenerating || !workoutType}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-brand" />
            )}
            Generate with AI
          </Button>
        </div>

        {/* Tag Rally Members */}
        <div className="mb-5">
          <CircleMemberSelector
            selectedMembers={taggedMembers}
            onSelectionChange={setTaggedMembers}
            maxSelections={10}
            label="Train Together"
            description="Tag circle members - they'll see it on their feed"
          />
        </div>

        {/* Quick Share Buttons */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Quick Share
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCaption}
              className="flex-1"
              disabled={!caption}
            >
              {copiedCaption ? (
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
              ) : (
                <Copy className="h-4 w-4 mr-1.5" />
              )}
              Copy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleShareToSocial("instagram")}
              className="h-9 w-9"
            >
              <Instagram className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleShareToSocial("twitter")}
              className="h-9 w-9"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleShareToSocial("facebook")}
              className="h-9 w-9"
            >
              <Facebook className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleShareToSocial("tiktok")}
              className="h-9 w-9"
            >
              <TikTokIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNativeShare}
              className="h-9 w-9"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!workoutType || isSubmitting || isUploading}
            className="w-full h-12 bg-brand-gradient text-lg"
          >
            {isSubmitting || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            {isUploading ? "Uploading..." : "Log & Post to Feed"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your workout will be shared with your circles
          </p>
        </div>
      </SheetContent>

      {/* Photo Editor */}
      {pendingPhotoFile && (
        <PhotoEditor
          imageFile={pendingPhotoFile}
          open={isPhotoEditorOpen}
          onOpenChange={setIsPhotoEditorOpen}
          onSaveLegacy={handlePhotoEditorSave}
          onSkip={handlePhotoEditorSkip}
        />
      )}
    </Sheet>
  );
}
