"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Lock,
  Users,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  Save,
  RotateCcw,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  Scale,
  Activity,
  Target,
  Trophy,
  Dumbbell,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type VisibilityLevel = "public" | "circle" | "private";

export interface PrivacySettings {
  nameVisibility: VisibilityLevel;
  profilePictureVisibility: VisibilityLevel;
  cityVisibility: VisibilityLevel;
  ageVisibility: VisibilityLevel;
  weightVisibility: VisibilityLevel;
  bodyFatVisibility: VisibilityLevel;
  fitnessLevelVisibility: VisibilityLevel;
  goalsVisibility: VisibilityLevel;
  limitationsVisibility: VisibilityLevel;
  workoutHistoryVisibility: VisibilityLevel;
  personalRecordsVisibility: VisibilityLevel;
  badgesVisibility: VisibilityLevel;
  sportsVisibility: VisibilityLevel;
  capabilitiesVisibility: VisibilityLevel;
}

interface PrivacyField {
  key: keyof PrivacySettings;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "personal" | "body" | "fitness" | "achievements";
  sensitive?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VISIBILITY_OPTIONS: {
  value: VisibilityLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can see",
    icon: <Globe className="h-4 w-4" />,
    color: "text-green-600",
  },
  {
    value: "circle",
    label: "Circle Only",
    description: "Only circle members",
    icon: <Users className="h-4 w-4" />,
    color: "text-brand",
  },
  {
    value: "private",
    label: "Private",
    description: "Only you",
    icon: <Lock className="h-4 w-4" />,
    color: "text-gray-600",
  },
];

const PRIVACY_FIELDS: PrivacyField[] = [
  // Personal
  {
    key: "nameVisibility",
    label: "Display Name",
    description: "Your name shown to others",
    icon: <User className="h-4 w-4" />,
    category: "personal",
  },
  {
    key: "profilePictureVisibility",
    label: "Profile Picture",
    description: "Your profile photo",
    icon: <User className="h-4 w-4" />,
    category: "personal",
  },
  {
    key: "cityVisibility",
    label: "City/Location",
    description: "Where you're located",
    icon: <MapPin className="h-4 w-4" />,
    category: "personal",
  },
  {
    key: "ageVisibility",
    label: "Age/Birthday",
    description: "Your age or birthday",
    icon: <Calendar className="h-4 w-4" />,
    category: "personal",
    sensitive: true,
  },
  // Body
  {
    key: "weightVisibility",
    label: "Weight",
    description: "Your current weight",
    icon: <Scale className="h-4 w-4" />,
    category: "body",
    sensitive: true,
  },
  {
    key: "bodyFatVisibility",
    label: "Body Fat %",
    description: "Your body fat percentage",
    icon: <Activity className="h-4 w-4" />,
    category: "body",
    sensitive: true,
  },
  // Fitness
  {
    key: "fitnessLevelVisibility",
    label: "Fitness Level",
    description: "Your current fitness level",
    icon: <Activity className="h-4 w-4" />,
    category: "fitness",
  },
  {
    key: "goalsVisibility",
    label: "Goals",
    description: "Your fitness goals",
    icon: <Target className="h-4 w-4" />,
    category: "fitness",
  },
  {
    key: "limitationsVisibility",
    label: "Limitations & Injuries",
    description: "Your physical limitations",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "fitness",
    sensitive: true,
  },
  {
    key: "workoutHistoryVisibility",
    label: "Workout History",
    description: "Your past workouts",
    icon: <Dumbbell className="h-4 w-4" />,
    category: "fitness",
  },
  {
    key: "capabilitiesVisibility",
    label: "Physical Capabilities",
    description: "Your capability assessment",
    icon: <Heart className="h-4 w-4" />,
    category: "fitness",
    sensitive: true,
  },
  // Achievements
  {
    key: "personalRecordsVisibility",
    label: "Personal Records",
    description: "Your PRs and achievements",
    icon: <Trophy className="h-4 w-4" />,
    category: "achievements",
  },
  {
    key: "badgesVisibility",
    label: "Badges",
    description: "Your earned badges",
    icon: <Trophy className="h-4 w-4" />,
    category: "achievements",
  },
  {
    key: "sportsVisibility",
    label: "Sports",
    description: "Sports you play",
    icon: <Activity className="h-4 w-4" />,
    category: "achievements",
  },
];

const PRESETS = [
  {
    name: "Public Profile",
    description: "Share most info publicly",
    settings: {
      nameVisibility: "public" as const,
      profilePictureVisibility: "public" as const,
      cityVisibility: "public" as const,
      ageVisibility: "private" as const,
      weightVisibility: "private" as const,
      bodyFatVisibility: "private" as const,
      fitnessLevelVisibility: "public" as const,
      goalsVisibility: "public" as const,
      limitationsVisibility: "private" as const,
      workoutHistoryVisibility: "public" as const,
      personalRecordsVisibility: "public" as const,
      badgesVisibility: "public" as const,
      sportsVisibility: "public" as const,
      capabilitiesVisibility: "private" as const,
    },
  },
  {
    name: "Circle Only",
    description: "Share with circle members",
    settings: {
      nameVisibility: "public" as const,
      profilePictureVisibility: "public" as const,
      cityVisibility: "circle" as const,
      ageVisibility: "circle" as const,
      weightVisibility: "circle" as const,
      bodyFatVisibility: "private" as const,
      fitnessLevelVisibility: "circle" as const,
      goalsVisibility: "circle" as const,
      limitationsVisibility: "circle" as const,
      workoutHistoryVisibility: "circle" as const,
      personalRecordsVisibility: "circle" as const,
      badgesVisibility: "public" as const,
      sportsVisibility: "public" as const,
      capabilitiesVisibility: "circle" as const,
    },
  },
  {
    name: "Maximum Privacy",
    description: "Keep most info private",
    settings: {
      nameVisibility: "circle" as const,
      profilePictureVisibility: "circle" as const,
      cityVisibility: "private" as const,
      ageVisibility: "private" as const,
      weightVisibility: "private" as const,
      bodyFatVisibility: "private" as const,
      fitnessLevelVisibility: "private" as const,
      goalsVisibility: "private" as const,
      limitationsVisibility: "private" as const,
      workoutHistoryVisibility: "private" as const,
      personalRecordsVisibility: "private" as const,
      badgesVisibility: "circle" as const,
      sportsVisibility: "private" as const,
      capabilitiesVisibility: "private" as const,
    },
  },
];

const DEFAULT_SETTINGS: PrivacySettings = {
  nameVisibility: "public",
  profilePictureVisibility: "public",
  cityVisibility: "circle",
  ageVisibility: "private",
  weightVisibility: "private",
  bodyFatVisibility: "private",
  fitnessLevelVisibility: "circle",
  goalsVisibility: "circle",
  limitationsVisibility: "private",
  workoutHistoryVisibility: "circle",
  personalRecordsVisibility: "circle",
  badgesVisibility: "public",
  sportsVisibility: "public",
  capabilitiesVisibility: "private",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PrivacySettingsProps {
  onPreview?: (viewAs: "public" | "circle") => void;
}

export function PrivacySettingsComponent({ onPreview }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/user/privacy");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch privacy settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setOriginalSettings(settings);
        toast.success("Privacy settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings(preset.settings);
    setShowPresetDialog(false);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const updateSetting = (key: keyof PrivacySettings, value: VisibilityLevel) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fieldsByCategory = {
    personal: PRIVACY_FIELDS.filter(f => f.category === "personal"),
    body: PRIVACY_FIELDS.filter(f => f.category === "body"),
    fitness: PRIVACY_FIELDS.filter(f => f.category === "fitness"),
    achievements: PRIVACY_FIELDS.filter(f => f.category === "achievements"),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" />
            Privacy Settings
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Control what others can see about you
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPresetDialog(true)}>
            Apply Preset
          </Button>
          {onPreview && (
            <Button variant="outline" size="sm" onClick={() => onPreview("public")}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            {Object.values(settings).filter(v => v === "public").length} Public
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <span className="text-sm">
            {Object.values(settings).filter(v => v === "circle").length} Circle Only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-600" />
          <span className="text-sm">
            {Object.values(settings).filter(v => v === "private").length} Private
          </span>
        </div>
      </div>

      {/* Settings by Category */}
      <div className="space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-brand" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fieldsByCategory.personal.map((field) => (
              <PrivacyFieldRow
                key={field.key}
                field={field}
                value={settings[field.key]}
                onChange={(value) => updateSetting(field.key, value)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Body Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand" />
              Body Metrics
            </CardTitle>
            <CardDescription>Physical measurements and stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fieldsByCategory.body.map((field) => (
              <PrivacyFieldRow
                key={field.key}
                field={field}
                value={settings[field.key]}
                onChange={(value) => updateSetting(field.key, value)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Fitness Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-brand" />
              Fitness Data
            </CardTitle>
            <CardDescription>Goals, workouts, and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fieldsByCategory.fitness.map((field) => (
              <PrivacyFieldRow
                key={field.key}
                field={field}
                value={settings[field.key]}
                onChange={(value) => updateSetting(field.key, value)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" />
              Achievements
            </CardTitle>
            <CardDescription>Records, badges, and accomplishments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fieldsByCategory.achievements.map((field) => (
              <PrivacyFieldRow
                key={field.key}
                field={field}
                value={settings[field.key]}
                onChange={(value) => updateSetting(field.key, value)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Save Actions */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-background border-t py-4 -mx-4 px-4 flex gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Changes
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}

      {/* Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Presets</DialogTitle>
            <DialogDescription>
              Quickly apply a privacy preset to all your settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="w-full p-4 rounded-lg border text-left hover:bg-muted transition-colors"
              >
                <p className="font-medium">{preset.name}</p>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PRIVACY FIELD ROW
// ============================================================================

function PrivacyFieldRow({
  field,
  value,
  onChange,
}: {
  field: PrivacyField;
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
}) {
  const visibilityInfo = VISIBILITY_OPTIONS.find(v => v.value === value);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{field.icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{field.label}</span>
            {field.sensitive && (
              <Badge variant="outline" className="text-xs">
                Sensitive
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{field.description}</p>
        </div>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className={visibilityInfo?.color}>{visibilityInfo?.icon}</span>
              <span>{visibilityInfo?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <span className={option.color}>{option.icon}</span>
                <div>
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {option.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// COMPACT PRIVACY INDICATOR
// ============================================================================

export function PrivacyIndicator({
  visibility,
  size = "sm",
}: {
  visibility: VisibilityLevel;
  size?: "sm" | "md";
}) {
  const info = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span className={cn("flex items-center gap-1", info?.color)} title={info?.description}>
      {visibility === "public" && <Globe className={iconSize} />}
      {visibility === "circle" && <Users className={iconSize} />}
      {visibility === "private" && <Lock className={iconSize} />}
    </span>
  );
}

export default PrivacySettingsComponent;
