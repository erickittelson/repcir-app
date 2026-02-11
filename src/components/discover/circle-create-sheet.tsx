"use client";

/**
 * @deprecated Use CreateCircleExperience from @/components/circle instead.
 * This component is kept for backward compatibility and for editing existing circles.
 * For creating new circles, the CreateCircleExperience provides a better UX with
 * wizard, celebration, and member invitation flows.
 *
 * @see {@link @/components/circle/create-circle-experience.tsx}
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Users,
  Lock,
  Globe,
  UserPlus,
  Target,
  Calendar,
  Scroll,
  Hash,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CircleImageUpload } from "@/components/circles/circle-image-upload";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface CircleCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: CircleFormData;
}

interface CircleFormData {
  id?: string;
  name: string;
  description: string;
  category: string;
  visibility: "public" | "private";
  focusArea: string;
  targetDemographic: string;
  activityType: string;
  scheduleType: string;
  maxMembers: number | null;
  joinType: "open" | "request" | "invite_only";
  rules: string[];
  tags: string[];
  imageUrl: string;
}

const CATEGORIES = [
  { value: "fitness", label: "General Fitness" },
  { value: "strength", label: "Strength Training" },
  { value: "running", label: "Running" },
  { value: "crossfit", label: "CrossFit" },
  { value: "yoga", label: "Yoga" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "martial_arts", label: "Martial Arts" },
  { value: "sports", label: "Sports" },
  { value: "weight_loss", label: "Weight Loss" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

const FOCUS_AREAS = [
  { value: "strength", label: "Build Strength" },
  { value: "weight_loss", label: "Weight Loss" },
  { value: "endurance", label: "Endurance / Cardio" },
  { value: "flexibility", label: "Flexibility / Mobility" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "athletic_performance", label: "Athletic Performance" },
  { value: "rehabilitation", label: "Rehabilitation / Recovery" },
  { value: "general", label: "General Health" },
];

const TARGET_DEMOGRAPHICS = [
  { value: "beginners", label: "Beginners" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "seniors", label: "Seniors (55+)" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "teens", label: "Teens" },
  { value: "parents", label: "Parents" },
  { value: "all", label: "Everyone Welcome" },
];

const ACTIVITY_TYPES = [
  { value: "challenges", label: "Challenges", desc: "Group challenges & competitions" },
  { value: "workout_plans", label: "Workout Plans", desc: "Follow structured programs together" },
  { value: "accountability", label: "Accountability", desc: "Daily check-ins & support" },
  { value: "social", label: "Social", desc: "Casual fitness community" },
  { value: "coaching", label: "Coaching", desc: "Guided training & feedback" },
];

const SCHEDULE_TYPES = [
  { value: "daily_challenges", label: "Daily Challenges" },
  { value: "weekly_workouts", label: "Weekly Workouts" },
  { value: "monthly_goals", label: "Monthly Goals" },
  { value: "self_paced", label: "Self-Paced" },
];

const JOIN_TYPES = [
  { value: "open", label: "Open", desc: "Anyone can join immediately", icon: Globe },
  { value: "request", label: "Request to Join", desc: "Approval required", icon: UserPlus },
  { value: "invite_only", label: "Invite Only", desc: "By invitation only", icon: Lock },
];

const SUGGESTED_TAGS = [
  "morning", "evening", "weekend", "daily", "accountability",
  "beginners", "competitive", "supportive", "challenge",
  "HIIT", "weightlifting", "cardio", "calisthenics", "outdoor",
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CircleCreateSheet({ open, onOpenChange, editData }: CircleCreateSheetProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newRule, setNewRule] = useState("");

  // Form state
  const [formData, setFormData] = useState<CircleFormData>(() => editData || {
    name: "",
    description: "",
    category: "",
    visibility: "private",
    focusArea: "",
    targetDemographic: "",
    activityType: "",
    scheduleType: "",
    maxMembers: null,
    joinType: "request",
    rules: [],
    tags: [],
    imageUrl: "",
  });

  const updateField = <K extends keyof CircleFormData>(field: K, value: CircleFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !formData.tags.includes(trimmed) && formData.tags.length < 10) {
      updateField("tags", [...formData.tags, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    updateField("tags", formData.tags.filter(t => t !== tag));
  };

  const addRule = () => {
    const trimmed = newRule.trim();
    if (trimmed && formData.rules.length < 10) {
      updateField("rules", [...formData.rules, trimmed]);
      setNewRule("");
    }
  };

  const removeRule = (index: number) => {
    updateField("rules", formData.rules.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      visibility: "private",
      focusArea: "",
      targetDemographic: "",
      activityType: "",
      scheduleType: "",
      maxMembers: null,
      joinType: "request",
      rules: [],
      tags: [],
      imageUrl: "",
    });
    setNewTag("");
    setNewRule("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a circle name");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = editData?.id ? `/api/circles/${editData.id}` : "/api/circles";
      const method = editData?.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category || null,
          visibility: formData.visibility,
          focusArea: formData.focusArea || null,
          targetDemographic: formData.targetDemographic || null,
          activityType: formData.activityType || null,
          scheduleType: formData.scheduleType || null,
          maxMembers: formData.maxMembers,
          joinType: formData.joinType,
          rules: formData.rules,
          tags: formData.tags,
          // Only include imageUrl if it's a valid URL (not a data URL from preview)
          imageUrl: formData.imageUrl && !formData.imageUrl.startsWith("data:")
            ? formData.imageUrl
            : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save circle");
      }

      const circle = await response.json();
      toast.success(editData?.id ? "Circle updated!" : "Circle created!");
      onOpenChange(false);
      resetForm();
      
      if (!editData?.id) {
        router.push(`/circle/${circle.id}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save circle");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) resetForm();
      }}
    >
      <SheetContent side="bottom" className="h-[95vh] sm:h-auto sm:max-h-[95vh] p-0">
        <div className="flex flex-col h-full">
          <div className="px-6 pt-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                {editData?.id ? "Edit Circle" : "Create a Circle"}
              </SheetTitle>
              <SheetDescription>
                {editData?.id
                  ? "Update your circle's settings and information"
                  : "Create a fitness circle to workout with others who share your goals"}
              </SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 px-6">
            <form onSubmit={handleSubmit} className="space-y-6 py-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Basic Info
                </h3>

                {/* Circle Image Upload */}
                <div className="flex flex-col items-center gap-2">
                  <CircleImageUpload
                    currentImage={formData.imageUrl || undefined}
                    circleId={editData?.id}
                    onImageChange={(url) => updateField("imageUrl", url)}
                    size="lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Circle image (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Circle Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g., Morning Runners, Gym Squad"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="What's this circle about? What can members expect?"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => updateField("category", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Focus Area</Label>
                    <Select value={formData.focusArea} onValueChange={(v) => updateField("focusArea", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select focus" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_AREAS.map((area) => (
                          <SelectItem key={area.value} value={area.value}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Visibility & Join Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Visibility & Join Settings
                </h3>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    {formData.visibility === "public" ? (
                      <Globe className="h-5 w-5 text-brand" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {formData.visibility === "public" ? "Public Circle" : "Private Circle"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formData.visibility === "public"
                          ? "Appears in discovery, anyone can find it"
                          : "Hidden from discovery, invite only"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.visibility === "public"}
                    onCheckedChange={(v) => updateField("visibility", v ? "public" : "private")}
                  />
                </div>

                {formData.visibility === "public" && (
                  <div className="space-y-2">
                    <Label>How can people join?</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {JOIN_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => updateField("joinType", type.value as CircleFormData["joinType"])}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-colors",
                              formData.joinType === type.value
                                ? "border-brand bg-brand/5"
                                : "border-border hover:border-brand/50"
                            )}
                          >
                            <Icon className={cn(
                              "h-4 w-4 mb-1",
                              formData.joinType === type.value ? "text-brand" : "text-muted-foreground"
                            )} />
                            <p className="text-xs font-medium">{type.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Max Members (optional)</Label>
                  <Input
                    type="number"
                    value={formData.maxMembers || ""}
                    onChange={(e) => updateField("maxMembers", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Unlimited"
                    min={2}
                    max={10000}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for unlimited members</p>
                </div>
              </div>

              {/* Advanced Options */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="demographics">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Target Audience & Activity
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Target Demographic</Label>
                      <Select value={formData.targetDemographic} onValueChange={(v) => updateField("targetDemographic", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Who is this circle for?" />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_DEMOGRAPHICS.map((demo) => (
                            <SelectItem key={demo.value} value={demo.value}>
                              {demo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Activity Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ACTIVITY_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => updateField("activityType", type.value)}
                            className={cn(
                              "p-3 rounded-lg border text-left transition-colors",
                              formData.activityType === type.value
                                ? "border-brand bg-brand/5"
                                : "border-border hover:border-brand/50"
                            )}
                          >
                            <p className="text-sm font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Schedule Type</Label>
                      <Select value={formData.scheduleType} onValueChange={(v) => updateField("scheduleType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="How often do activities happen?" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_TYPES.map((schedule) => (
                            <SelectItem key={schedule.value} value={schedule.value}>
                              {schedule.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rules">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Scroll className="h-4 w-4" />
                      Circle Rules ({formData.rules.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Set expectations for your circle members (max 10 rules)
                    </p>
                    
                    {formData.rules.map((rule, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded">
                        <span className="text-sm text-muted-foreground">{index + 1}.</span>
                        <p className="flex-1 text-sm">{rule}</p>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {formData.rules.length < 10 && (
                      <div className="flex gap-2">
                        <Input
                          value={newRule}
                          onChange={(e) => setNewRule(e.target.value)}
                          placeholder="Add a rule..."
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRule())}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addRule}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tags">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Tags ({formData.tags.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Add tags to help people find your circle (max 10)
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    {formData.tags.length < 10 && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                            placeholder="Add a tag..."
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(newTag))}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={() => addTag(newTag)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Suggested tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {SUGGESTED_TAGS.filter(t => !formData.tags.includes(t)).slice(0, 8).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer hover:bg-muted"
                                onClick={() => addTag(tag)}
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </ScrollArea>

          {/* Submit Buttons - Fixed at bottom */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editData?.id ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  editData?.id ? "Save Changes" : "Create Circle"
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
