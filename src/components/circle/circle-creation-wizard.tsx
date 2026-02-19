"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  Flame,
  Trophy,
  Sparkles,
  Leaf,
  Globe,
  UserCheck,
  Lock,
  Camera,
  Pencil,
  MapPin,
  Video,
  Building2,
  Trees,
  Music,
  MoreHorizontal,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhotoEditor } from "@/components/media/photo-editor";
import dynamic from "next/dynamic";
import type { LocationValue } from "@/components/maps/types";

// Dynamically import map components for code-splitting
const LocationPicker = dynamic(
  () => import("@/components/maps/location-picker").then((mod) => mod.LocationPicker),
  { loading: () => <div className="h-[200px] bg-muted rounded-lg animate-pulse" /> }
);

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface CircleCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (circleId: string) => void;
}

interface LocationData {
  isVirtual: boolean;
  locationType: "gym" | "park" | "studio" | "other" | null;
  locationSearch: string;
  city: string;
  state: string;
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
}

interface FormData {
  name: string;
  imageUrl: string | null;
  imageFile: File | null;
  description: string;
  focusAreas: string[];
  location: LocationData;
  joinType: "open" | "request" | "invite_only";
  visibility: "public" | "private";
}

const DEFAULT_LOCATION: LocationData = {
  isVirtual: false,
  locationType: null,
  locationSearch: "",
  city: "",
  state: "",
  fullAddress: "",
  latitude: null,
  longitude: null,
};

const FOCUS_OPTIONS = [
  { value: "strength", label: "Strength", icon: Dumbbell, color: "text-orange-400" },
  { value: "cardio", label: "Cardio", icon: Flame, color: "text-red-400" },
  { value: "wellness", label: "Wellness", icon: Heart, color: "text-pink-400" },
  { value: "sports", label: "Sports", icon: Trophy, color: "text-yellow-400" },
  { value: "flexibility", label: "Flexibility", icon: Sparkles, color: "text-purple-400" },
  { value: "outdoor", label: "Outdoor", icon: Leaf, color: "text-green-400" },
];

const JOIN_OPTIONS = [
  {
    value: "open" as const,
    label: "Public - Open",
    description: "Anyone can discover and join instantly",
    icon: Globe,
    visibility: "public" as const,
  },
  {
    value: "request" as const,
    label: "Public - Request",
    description: "Anyone can discover, approval required to join",
    icon: UserCheck,
    visibility: "public" as const,
  },
  {
    value: "invite_only" as const,
    label: "Private - Invite Only",
    description: "Hidden from discovery, invitation required",
    icon: Lock,
    visibility: "private" as const,
  },
];

const LOCATION_TYPE_OPTIONS = [
  { value: "gym" as const, label: "Gym", icon: Building2 },
  { value: "park" as const, label: "Park", icon: Trees },
  { value: "studio" as const, label: "Studio", icon: Music },
  { value: "other" as const, label: "Other", icon: MoreHorizontal },
];

const TOTAL_STEPS = 6;

// ============================================================================
// PROGRESS CIRCLE COMPONENT
// ============================================================================

function ProgressCircle({
  currentStep,
  totalSteps,
  isSubmitting,
}: {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
}) {
  const radius = 60;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const progress = currentStep / totalSteps;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: progress === 1
            ? "0 0 40px 8px oklch(0.73 0.155 85 / 0.4)"
            : "0 0 0px 0px oklch(0.73 0.155 85 / 0)",
        }}
        transition={{ duration: 0.5 }}
      />

      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="oklch(0.25 0.012 275)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <motion.circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: circumference,
          }}
          animate={{
            strokeDashoffset: isSubmitting ? 0 : strokeDashoffset,
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        />

        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.76 0.155 85)" />
            <stop offset="50%" stopColor="oklch(0.73 0.155 85)" />
            <stop offset="100%" stopColor="oklch(0.53 0.10 70)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isSubmitting ? (
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
        ) : (
          <>
            <motion.span
              className="text-2xl font-bold text-brand"
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep}
            </motion.span>
            <span className="text-xs text-muted-foreground">of {totalSteps}</span>
          </>
        )}
      </div>

      <AnimatePresence>
        {progress > 0 && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`particle-${currentStep}-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-brand"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * 80,
                  y: Math.sin((i / 6) * Math.PI * 2) * 80,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

// Step 1: Name
function StepName({ formData, updateField }: StepProps) {
  const maxLength = 50;
  const charCount = formData.name.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Name your circle</h2>
        <p className="text-muted-foreground">
          Give your circle a memorable name
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g., Morning Runners Club"
          maxLength={maxLength}
          className="text-lg h-14 text-center"
          autoFocus
        />
        <div className="flex justify-end">
          <span className={cn(
            "text-xs transition-colors",
            charCount > maxLength * 0.8
              ? charCount >= maxLength ? "text-destructive" : "text-yellow-500"
              : "text-muted-foreground"
          )}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 2: Image Upload
interface StepImageProps extends StepProps {
  onSkip: () => void;
}

function StepImage({ formData, updateField, onSkip }: StepImageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setIsEditing(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleEditorSave = useCallback((blob: Blob) => {
    const file = new File([blob], "circle-image.jpg", { type: "image/jpeg" });
    updateField("imageFile", file);

    const previewUrl = URL.createObjectURL(blob);
    updateField("imageUrl", previewUrl);

    setIsEditing(false);
    setSelectedFile(null);
  }, [updateField]);

  const handleEditorCancel = useCallback(() => {
    setIsEditing(false);
    setSelectedFile(null);
  }, []);

  const handleChangeImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveImage = useCallback(() => {
    if (formData.imageUrl) {
      URL.revokeObjectURL(formData.imageUrl);
    }
    updateField("imageUrl", null);
    updateField("imageFile", null);
  }, [formData.imageUrl, updateField]);

  return (
    <>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Add a photo</h2>
          <p className="text-muted-foreground">
            Give your circle a visual identity (optional)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {formData.imageUrl ? (
            <div className="relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-40 h-40 rounded-full overflow-hidden shadow-lg shadow-brand/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.imageUrl}
                  alt="Circle preview"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={handleChangeImage}
                >
                  <Pencil className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div className="flex gap-2 mt-4 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChangeImage}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="text-muted-foreground"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
              className={cn(
                "w-40 h-40 rounded-full border-2 border-dashed cursor-pointer",
                "flex flex-col items-center justify-center gap-2",
                "transition-all duration-200",
                isDragging
                  ? "border-brand bg-brand/10 scale-105"
                  : "border-border hover:border-brand/50 hover:bg-muted/50"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                "bg-muted transition-colors",
                isDragging && "bg-brand/20"
              )}>
                <Camera className={cn(
                  "w-8 h-8 transition-colors",
                  isDragging ? "text-brand" : "text-muted-foreground"
                )} />
              </div>
              <span className="text-sm text-muted-foreground text-center px-4">
                Tap to add photo
              </span>
            </motion.div>
          )}

          {!formData.imageUrl && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Skip for now
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Square images work best. You can always add or change this later.
          </p>
        </div>
      </div>

      {isEditing && selectedFile && (
        <PhotoEditor
          imageFile={selectedFile}
          open={isEditing}
          onOpenChange={(open) => {
            if (!open) handleEditorCancel();
          }}
          aspectRatio={1}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </>
  );
}

// Step 3: Description
function StepDescription({ formData, updateField }: StepProps) {
  const maxLength = 300;
  const charCount = formData.description.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Describe what it&apos;s about</h2>
        <p className="text-muted-foreground">
          Optional - help others understand your circle
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="What's this circle about? What can members expect?"
          maxLength={maxLength}
          rows={4}
          className="text-base resize-none"
        />
        <div className="flex justify-end">
          <span className={cn(
            "text-xs transition-colors",
            charCount > maxLength * 0.8
              ? charCount >= maxLength ? "text-destructive" : "text-yellow-500"
              : "text-muted-foreground"
          )}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 4: Focus Areas
function StepFocus({ formData, updateField }: StepProps) {
  const toggleFocus = (value: string) => {
    const current = formData.focusAreas;
    if (current.includes(value)) {
      updateField("focusAreas", current.filter(v => v !== value));
    } else {
      updateField("focusAreas", [...current, value]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose your focus</h2>
        <p className="text-muted-foreground">
          Select all that apply
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FOCUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = formData.focusAreas.includes(option.value);

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => toggleFocus(option.value)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-200",
                "flex flex-col items-center gap-2",
                isSelected
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50 bg-card"
              )}
              whileTap={{ scale: 0.97 }}
            >
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: "linear-gradient(135deg, oklch(0.73 0.155 85 / 0.1) 0%, transparent 100%)",
                  }}
                />
              )}
              <Icon className={cn(
                "h-8 w-8 transition-colors",
                isSelected ? option.color : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-medium transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
              {isSelected && (
                <motion.div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Step 5: Location
function StepLocation({ formData, updateField }: StepProps) {
  const location = formData.location;

  const handleVirtualToggle = (isVirtual: boolean) => {
    updateField("location", {
      ...location,
      isVirtual,
      // Clear physical location data if switching to virtual
      ...(isVirtual && {
        locationType: null,
        fullAddress: "",
        latitude: null,
        longitude: null,
      }),
    });
  };

  const handleLocationTypeSelect = (type: typeof location.locationType) => {
    updateField("location", {
      ...location,
      locationType: type,
    });
  };

  const handleMapLocationChange = (mapLocation: LocationValue | undefined) => {
    if (!mapLocation) {
      updateField("location", {
        ...location,
        fullAddress: "",
        city: "",
        state: "",
        latitude: null,
        longitude: null,
      });
    } else {
      updateField("location", {
        ...location,
        fullAddress: mapLocation.address || "",
        city: mapLocation.city || "",
        state: mapLocation.state || "",
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
      });
    }
  };

  const mapValue: LocationValue | undefined =
    location.latitude && location.longitude
      ? {
          lat: location.latitude,
          lng: location.longitude,
          address: location.fullAddress,
          city: location.city,
          state: location.state,
        }
      : undefined;

  return (
    <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-380px)] pr-1">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Where do you meet?</h2>
        <p className="text-muted-foreground">
          Set a location or keep it virtual
        </p>
      </div>

      {/* Virtual/In-Person Toggle */}
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={() => handleVirtualToggle(true)}
          className={cn(
            "flex-1 p-4 rounded-xl border-2 transition-all duration-200",
            "flex flex-col items-center gap-2",
            location.isVirtual
              ? "border-brand bg-brand/10"
              : "border-border hover:border-brand/50 bg-card"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <Video className={cn(
            "h-6 w-6 transition-colors",
            location.isVirtual ? "text-brand" : "text-muted-foreground"
          )} />
          <span className={cn(
            "font-medium transition-colors",
            location.isVirtual ? "text-foreground" : "text-muted-foreground"
          )}>
            Virtual
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => handleVirtualToggle(false)}
          className={cn(
            "flex-1 p-4 rounded-xl border-2 transition-all duration-200",
            "flex flex-col items-center gap-2",
            !location.isVirtual
              ? "border-brand bg-brand/10"
              : "border-border hover:border-brand/50 bg-card"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <MapPin className={cn(
            "h-6 w-6 transition-colors",
            !location.isVirtual ? "text-brand" : "text-muted-foreground"
          )} />
          <span className={cn(
            "font-medium transition-colors",
            !location.isVirtual ? "text-foreground" : "text-muted-foreground"
          )}>
            In-Person
          </span>
        </motion.button>
      </div>

      {/* In-Person Location Options */}
      <AnimatePresence mode="wait">
        {!location.isVirtual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Location Type */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Type of location</p>
              <div className="grid grid-cols-4 gap-2">
                {LOCATION_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = location.locationType === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleLocationTypeSelect(option.value)}
                      className={cn(
                        "p-3 rounded-lg border transition-all duration-200",
                        "flex flex-col items-center gap-1.5",
                        isSelected
                          ? "border-brand bg-brand/10"
                          : "border-border hover:border-brand/50 bg-card"
                      )}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-brand" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-xs transition-colors",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {option.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Map Picker */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Search or tap to set location</p>
              <LocationPicker
                value={mapValue}
                onChange={handleMapLocationChange}
                height={200}
                placeholder="Search for gym, park, address..."
              />
            </div>

            {/* Safety Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                For safety, avoid using your home address. Use a nearby public location instead.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual info */}
      {location.isVirtual && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-muted/50 border border-border text-center"
        >
          <Video className="h-8 w-8 mx-auto mb-2 text-brand" />
          <p className="text-sm text-muted-foreground">
            Perfect for online meetups, virtual accountability, or remote workouts together.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Step 6: Privacy & Access (Combined visibility + join type)
function StepPrivacy({ formData, updateField }: StepProps) {
  const handleSelect = (option: typeof JOIN_OPTIONS[0]) => {
    updateField("joinType", option.value);
    updateField("visibility", option.visibility);
  };

  // Determine which option is currently selected based on both fields
  const selectedValue = formData.joinType;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Privacy & Access</h2>
        <p className="text-muted-foreground">
          Choose who can find and join your circle
        </p>
      </div>

      <div className="space-y-3">
        {JOIN_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedValue === option.value;

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all duration-200",
                "flex items-center gap-4 text-left",
                isSelected
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50 bg-card"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                isSelected ? "bg-brand/20" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-colors",
                  isSelected ? "text-brand" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-medium transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {option.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <motion.div
                  className="w-6 h-6 rounded-full bg-brand flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation based on selection */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          {formData.visibility === "public"
            ? formData.joinType === "open"
              ? "Your circle will appear in search results and anyone can join immediately."
              : "Your circle will appear in search results. You'll review join requests before approving."
            : "Your circle is hidden from search. Share the invite link to add members."}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export function CircleCreationWizard({
  open,
  onOpenChange,
  onComplete,
}: CircleCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    imageUrl: null,
    imageFile: null,
    description: "",
    focusAreas: [],
    location: DEFAULT_LOCATION,
    joinType: "request",
    visibility: "public",
  });

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setDirection("forward");
    setFormData({
      name: "",
      imageUrl: null,
      imageFile: null,
      description: "",
      focusAreas: [],
      location: DEFAULT_LOCATION,
      joinType: "request",
      visibility: "public",
    });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetWizard, 300);
  }, [onOpenChange, resetWizard]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length >= 2;
      case 2:
        return true; // Image is optional
      case 3:
        return true; // Description is optional
      case 4:
        return formData.focusAreas.length > 0;
      case 5:
        return true; // Location is optional (can be virtual)
      case 6:
        return true; // Privacy always has a default
      default:
        return false;
    }
  }, [currentStep, formData]);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setDirection("forward");
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canProceed]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection("backward");
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a circle name");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          focusArea: formData.focusAreas.length > 0 ? formData.focusAreas[0] : null,
          tags: formData.focusAreas,
          joinType: formData.joinType,
          visibility: formData.visibility,
          // Location data
          isVirtual: formData.location.isVirtual,
          locationType: formData.location.locationType,
          city: formData.location.city || null,
          state: formData.location.state || null,
          fullAddress: formData.location.fullAddress || null,
          latitude: formData.location.latitude,
          longitude: formData.location.longitude,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create circle");
      }

      const circle = await response.json();

      // If we have an image file, upload it
      if (formData.imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", formData.imageFile);
          uploadFormData.append("circleId", circle.id);

          const uploadResponse = await fetch("/api/circles/upload-image", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            console.error("Failed to upload circle image, but circle was created");
          }
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
        }
      }

      onComplete(circle.id);
      setTimeout(resetWizard, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create circle");
      setIsSubmitting(false);
    }
  }, [formData, onComplete, resetWizard]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (currentStep < TOTAL_STEPS && canProceed()) {
            goNext();
          } else if (currentStep === TOTAL_STEPS && !isSubmitting) {
            handleSubmit();
          }
        }
        return;
      }

      if (e.key === "Enter" && !isSubmitting) {
        e.preventDefault();
        if (currentStep < TOTAL_STEPS && canProceed()) {
          goNext();
        } else if (currentStep === TOTAL_STEPS) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentStep, canProceed, goNext, isSubmitting, handleSubmit]);

  const stepVariants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? -100 : 100,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    const props = { formData, updateField };

    switch (currentStep) {
      case 1:
        return <StepName {...props} />;
      case 2:
        return <StepImage {...props} onSkip={goNext} />;
      case 3:
        return <StepDescription {...props} />;
      case 4:
        return <StepFocus {...props} />;
      case 5:
        return <StepLocation {...props} />;
      case 6:
        return <StepPrivacy {...props} />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => {
      if (!value) handleClose();
      else onOpenChange(value);
    }}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-[85vh] p-0 rounded-t-3xl"
      >
        <div className="flex flex-col h-full">
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <SheetHeader className="sr-only">
              <SheetTitle>Create a Circle</SheetTitle>
              <SheetDescription>
                Step {currentStep} of {TOTAL_STEPS}
              </SheetDescription>
            </SheetHeader>

            <ProgressCircle
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="flex-1 px-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="h-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-6 pb-8 pt-4 space-y-4 bg-gradient-to-t from-background via-background to-transparent">
            {currentStep === 4 && formData.focusAreas.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {formData.focusAreas.length} selected
              </p>
            )}

            <div className="flex justify-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    index + 1 === currentStep
                      ? "w-6 bg-brand"
                      : index + 1 < currentStep
                        ? "w-2 bg-brand/50"
                        : "w-2 bg-muted"
                  )}
                  layout
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={goBack}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={goNext}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 bg-brand hover:bg-brand/90"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-brand hover:bg-brand/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Circle"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
