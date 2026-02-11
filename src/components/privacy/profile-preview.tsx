"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  Globe,
  Users,
  Lock,
  MapPin,
  Calendar,
  Target,
  Trophy,
  Activity,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "public" | "circle";

interface ProfileData {
  displayName?: string;
  profilePictureUrl?: string;
  city?: string;
  age?: number;
  fitnessLevel?: string;
  weight?: number;
  bodyFat?: number;
  goals?: Array<{ name: string }>;
  limitations?: Array<{ description: string }>;
  badges?: Array<{ name: string; tier: string }>;
  sports?: Array<{ sport: string }>;
  personalRecords?: Array<{ exercise: string; value: number; unit: string }>;
  workoutCount?: number;
  capabilities?: {
    readinessLevel?: string;
    overallMobilityScore?: number;
    overallStrengthScore?: number;
  };
}

interface PrivacySettings {
  nameVisibility: string;
  profilePictureVisibility: string;
  cityVisibility: string;
  ageVisibility: string;
  weightVisibility: string;
  bodyFatVisibility: string;
  fitnessLevelVisibility: string;
  goalsVisibility: string;
  limitationsVisibility: string;
  workoutHistoryVisibility: string;
  personalRecordsVisibility: string;
  badgesVisibility: string;
  sportsVisibility: string;
  capabilitiesVisibility: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProfilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialViewMode?: ViewMode;
}

export function ProfilePreviewDialog({
  open,
  onOpenChange,
  initialViewMode = "public",
}: ProfilePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);

  useEffect(() => {
    if (open) {
      fetchPreviewData();
    }
  }, [open]);

  const fetchPreviewData = async () => {
    setLoading(true);
    try {
      // Fetch both profile and privacy settings
      const [profileRes, privacyRes] = await Promise.all([
        fetch("/api/user/profile/preview"),
        fetch("/api/user/privacy"),
      ]);

      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }
      if (privacyRes.ok) {
        setPrivacy(await privacyRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch preview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVisible = (field: keyof PrivacySettings): boolean => {
    if (!privacy) return false;
    const visibility = privacy[field];
    if (visibility === "public") return true;
    if (visibility === "circle" && viewMode === "circle") return true;
    return false;
  };

  const getHiddenReason = (field: keyof PrivacySettings): string => {
    if (!privacy) return "Hidden";
    const visibility = privacy[field];
    if (visibility === "private") return "Set to Private";
    if (visibility === "circle" && viewMode === "public") return "Circle Only";
    return "Hidden";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-brand" />
            Profile Preview
          </DialogTitle>
          <DialogDescription>
            See how your profile appears to others
          </DialogDescription>
        </DialogHeader>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Public View
            </TabsTrigger>
            <TabsTrigger value="circle" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Circle Member View
            </TabsTrigger>
          </TabsList>

          <TabsContent value={viewMode} className="mt-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ProfilePreviewContent
                profile={profile}
                privacy={privacy}
                viewMode={viewMode}
                isVisible={isVisible}
                getHiddenReason={getHiddenReason}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-brand/10 border border-brand/20 mt-4">
          <AlertTriangle className="h-5 w-5 text-brand flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {viewMode === "public" ? "Public View" : "Circle Member View"}
            </p>
            <p className="text-muted-foreground">
              {viewMode === "public"
                ? "This is how strangers and non-circle members see your profile."
                : "This is how members of your circles see your profile."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PREVIEW CONTENT
// ============================================================================

function ProfilePreviewContent({
  profile,
  privacy,
  viewMode,
  isVisible,
  getHiddenReason,
}: {
  profile: ProfileData | null;
  privacy: PrivacySettings | null;
  viewMode: ViewMode;
  isVisible: (field: keyof PrivacySettings) => boolean;
  getHiddenReason: (field: keyof PrivacySettings) => string;
}) {
  if (!profile || !privacy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Unable to load preview data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <PreviewField
          visible={isVisible("profilePictureVisibility")}
          hiddenReason={getHiddenReason("profilePictureVisibility")}
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.profilePictureUrl} />
            <AvatarFallback className="text-2xl">
              {profile.displayName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </PreviewField>

        <div className="flex-1 space-y-1">
          {/* Name */}
          <PreviewField
            visible={isVisible("nameVisibility")}
            hiddenReason={getHiddenReason("nameVisibility")}
            inline
          >
            <h3 className="text-xl font-bold">{profile.displayName || "User"}</h3>
          </PreviewField>

          {/* Location */}
          <PreviewField
            visible={isVisible("cityVisibility")}
            hiddenReason={getHiddenReason("cityVisibility")}
            inline
          >
            {profile.city && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.city}
              </p>
            )}
          </PreviewField>

          {/* Age */}
          <PreviewField
            visible={isVisible("ageVisibility")}
            hiddenReason={getHiddenReason("ageVisibility")}
            inline
          >
            {profile.age && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {profile.age} years old
              </p>
            )}
          </PreviewField>
        </div>
      </div>

      {/* Fitness Level */}
      <PreviewField
        visible={isVisible("fitnessLevelVisibility")}
        hiddenReason={getHiddenReason("fitnessLevelVisibility")}
        label="Fitness Level"
      >
        {profile.fitnessLevel && (
          <Badge variant="outline" className="capitalize">
            {profile.fitnessLevel}
          </Badge>
        )}
      </PreviewField>

      {/* Body Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <PreviewField
          visible={isVisible("weightVisibility")}
          hiddenReason={getHiddenReason("weightVisibility")}
          label="Weight"
        >
          {profile.weight && <span>{profile.weight} lbs</span>}
        </PreviewField>

        <PreviewField
          visible={isVisible("bodyFatVisibility")}
          hiddenReason={getHiddenReason("bodyFatVisibility")}
          label="Body Fat"
        >
          {profile.bodyFat && <span>{profile.bodyFat}%</span>}
        </PreviewField>
      </div>

      {/* Goals */}
      <PreviewField
        visible={isVisible("goalsVisibility")}
        hiddenReason={getHiddenReason("goalsVisibility")}
        label="Goals"
      >
        {profile.goals && profile.goals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.goals.map((goal, i) => (
              <Badge key={i} variant="secondary">
                <Target className="h-3 w-3 mr-1" />
                {goal.name}
              </Badge>
            ))}
          </div>
        )}
      </PreviewField>

      {/* Limitations */}
      <PreviewField
        visible={isVisible("limitationsVisibility")}
        hiddenReason={getHiddenReason("limitationsVisibility")}
        label="Limitations"
      >
        {profile.limitations && profile.limitations.length > 0 && (
          <div className="space-y-1">
            {profile.limitations.map((lim, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                • {lim.description}
              </p>
            ))}
          </div>
        )}
      </PreviewField>

      {/* Capabilities */}
      <PreviewField
        visible={isVisible("capabilitiesVisibility")}
        hiddenReason={getHiddenReason("capabilitiesVisibility")}
        label="Physical Capabilities"
      >
        {profile.capabilities && (
          <div className="flex items-center gap-4 text-sm">
            <span>
              Level: <strong className="capitalize">{profile.capabilities.readinessLevel}</strong>
            </span>
            {profile.capabilities.overallMobilityScore && (
              <span>Mobility: {profile.capabilities.overallMobilityScore}/10</span>
            )}
            {profile.capabilities.overallStrengthScore && (
              <span>Strength: {profile.capabilities.overallStrengthScore}/10</span>
            )}
          </div>
        )}
      </PreviewField>

      {/* Workout History */}
      <PreviewField
        visible={isVisible("workoutHistoryVisibility")}
        hiddenReason={getHiddenReason("workoutHistoryVisibility")}
        label="Workout History"
      >
        {profile.workoutCount !== undefined && (
          <p className="text-sm">{profile.workoutCount} workouts completed</p>
        )}
      </PreviewField>

      {/* Personal Records */}
      <PreviewField
        visible={isVisible("personalRecordsVisibility")}
        hiddenReason={getHiddenReason("personalRecordsVisibility")}
        label="Personal Records"
      >
        {profile.personalRecords && profile.personalRecords.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {profile.personalRecords.slice(0, 4).map((pr, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span>{pr.exercise}: {pr.value} {pr.unit}</span>
              </div>
            ))}
          </div>
        )}
      </PreviewField>

      {/* Badges */}
      <PreviewField
        visible={isVisible("badgesVisibility")}
        hiddenReason={getHiddenReason("badgesVisibility")}
        label="Badges"
      >
        {profile.badges && profile.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.badges.slice(0, 6).map((badge, i) => (
              <Badge key={i} variant="outline">
                {badge.name}
              </Badge>
            ))}
            {profile.badges.length > 6 && (
              <Badge variant="outline">+{profile.badges.length - 6} more</Badge>
            )}
          </div>
        )}
      </PreviewField>

      {/* Sports */}
      <PreviewField
        visible={isVisible("sportsVisibility")}
        hiddenReason={getHiddenReason("sportsVisibility")}
        label="Sports"
      >
        {profile.sports && profile.sports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.sports.map((sport, i) => (
              <Badge key={i} variant="secondary">
                <Activity className="h-3 w-3 mr-1" />
                {sport.sport}
              </Badge>
            ))}
          </div>
        )}
      </PreviewField>
    </div>
  );
}

// ============================================================================
// PREVIEW FIELD WRAPPER
// ============================================================================

function PreviewField({
  visible,
  hiddenReason,
  label,
  inline = false,
  children,
}: {
  visible: boolean;
  hiddenReason: string;
  label?: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  if (!visible) {
    return (
      <div className={cn("relative", inline ? "inline-flex items-center" : "")}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <EyeOff className="h-4 w-4" />
          <span className="text-sm italic">{hiddenReason}</span>
        </div>
      </div>
    );
  }

  if (label) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// SIMPLE PREVIEW BUTTONS (for profile page)
// ============================================================================

export function ProfilePreviewButtons({
  onPreview,
}: {
  onPreview: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => onPreview("public")}>
        <Globe className="mr-2 h-4 w-4" />
        Public View
      </Button>
      <Button variant="outline" size="sm" onClick={() => onPreview("circle")}>
        <Users className="mr-2 h-4 w-4" />
        Circle View
      </Button>
    </div>
  );
}

export default ProfilePreviewDialog;
