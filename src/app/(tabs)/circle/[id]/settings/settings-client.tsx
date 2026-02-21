"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Globe,
  UserPlus,
  Scroll,
  X,
  Plus,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CircleImageUpload } from "@/components/circles/circle-image-upload";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface CircleData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: "public" | "private";
  focusArea: string | null;
  maxMembers: number | null;
  joinType: "open" | "request" | "invite_only" | null;
  rules: string[];
}

interface SettingsClientProps {
  circle: CircleData;
  userRole: "owner" | "admin";
}

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

const JOIN_OPTIONS = [
  {
    value: "open" as const,
    label: "Public - Open",
    desc: "Anyone can discover and join instantly",
    icon: Globe,
    visibility: "public" as const,
  },
  {
    value: "request" as const,
    label: "Public - Request",
    desc: "Anyone can discover, approval required to join",
    icon: UserPlus,
    visibility: "public" as const,
  },
  {
    value: "invite_only" as const,
    label: "Private - Invite Only",
    desc: "Hidden from discovery, invitation required",
    icon: Lock,
    visibility: "private" as const,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SettingsClient({ circle, userRole }: SettingsClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRule, setNewRule] = useState("");

  // Form state initialized from circle data
  const [formData, setFormData] = useState({
    name: circle.name,
    description: circle.description || "",
    imageUrl: circle.imageUrl || "",
    visibility: circle.visibility,
    focusArea: circle.focusArea || "",
    maxMembers: circle.maxMembers,
    joinType: circle.joinType || "request",
    rules: circle.rules,
  });

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a circle name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/circles/${circle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl.trim() || null,
          visibility: formData.visibility,
          focusArea: formData.focusArea || null,
          maxMembers: formData.maxMembers,
          joinType: formData.joinType,
          rules: formData.rules,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save changes");
      }

      toast.success("Circle settings saved!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/circles/${circle.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete circle");
      }

      toast.success("Circle deleted");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete circle");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = userRole === "owner";

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Page title with back and save buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/circle/${circle.id}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Circle Settings</h1>
            <p className="text-sm text-muted-foreground">{circle.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Info</CardTitle>
              <CardDescription>Circle name, description, and image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label>Circle Image</Label>
                <CircleImageUpload
                  currentImage={formData.imageUrl || undefined}
                  circleId={circle.id}
                  onImageChange={(url) => updateField("imageUrl", url)}
                  size="lg"
                />
              </div>

              <div className="space-y-2">
                <Label>Focus Area</Label>
                <Select
                  value={formData.focusArea}
                  onValueChange={(v) => updateField("focusArea", v)}
                >
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
            </CardContent>
          </Card>

          {/* Privacy & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacy & Access</CardTitle>
              <CardDescription>Choose who can find and join your circle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {JOIN_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = formData.joinType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateField("joinType", option.value);
                        updateField("visibility", option.visibility);
                      }}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all duration-200",
                        "flex items-center gap-4 text-left",
                        isSelected
                          ? "border-brand bg-brand/5"
                          : "border-border hover:border-brand/50"
                      )}
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
                          {option.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>Max Members (optional)</Label>
                <Input
                  type="number"
                  value={formData.maxMembers || ""}
                  onChange={(e) =>
                    updateField("maxMembers", e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="Unlimited"
                  min={2}
                  max={10000}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited members
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Circle Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scroll className="h-5 w-5" />
                Circle Guidelines
              </CardTitle>
              <CardDescription>
                Set expectations for your circle members (max 10)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    placeholder="Add a guideline..."
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addRule())
                    }
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addRule}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {formData.rules.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No guidelines yet. Add rules members should follow.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone - Owner Only */}
          {isOwner && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that permanently affect your circle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Delete this circle</p>
                    <p className="text-xs text-muted-foreground">
                      This will permanently delete the circle and all associated data
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete{" "}
                          <span className="font-semibold">{circle.name}</span> and remove all
                          members, posts, and associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Circle"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}
    </div>
  );
}
