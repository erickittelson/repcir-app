"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGrid,
  User,
  Trophy,
  Dumbbell,
  MapPin,
  Target,
  Flame,
  Users,
  Plus,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Bot,
  Globe,
  Package,
  Shield,
  Ruler,
  Activity,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
}

interface Profile {
  displayName: string;
  profilePicture?: string | null;
  fitnessLevel?: string | null;
  city?: string | null;
  country?: string | null;
  weight?: number | null;
  height?: number | null;
  heightFormatted?: string | null;
  bodyFatPercentage?: number | null;
  primaryGoalDescription?: string | null;
  primaryGoalType?: string | null;
  primaryMotivation?: string | null;
  visibility?: string | null;
  socialLinks?: SocialLinks;
}

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  currentValue?: number | null;
  targetDate?: Date | null;
  status: string;
  member?: { name: string } | null;
}

interface Circle {
  id: string;
  name: string;
  memberCount?: number | null;
  category?: string | null;
}

interface Workout {
  id: string;
  name: string;
  date: Date;
  member?: { name: string } | null;
}

interface Limitation {
  id: string;
  bodyPart: string;
  condition: string;
  severity?: string;
}

interface Stats {
  workoutsThisWeek: number;
  activeGoals: number;
  activeChallenges: number;
  memberCount: number;
  circleCount: number;
}

interface DashboardTabsProps {
  greeting: string;
  firstName: string;
  profile: Profile;
  stats: Stats;
  goals: Goal[];
  circles: Circle[];
  workouts: Workout[];
  limitations: Limitation[];
  activeCircleId?: string;
  hasCircle: boolean;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington D.C." },
];

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "elite", label: "Elite" },
];

const MOTIVATIONS = [
  { value: "build_muscle", label: "Build Muscle" },
  { value: "lose_weight", label: "Lose Weight" },
  { value: "improve_health", label: "Improve Health" },
  { value: "increase_strength", label: "Increase Strength" },
  { value: "boost_energy", label: "Boost Energy" },
  { value: "reduce_stress", label: "Reduce Stress" },
  { value: "athletic_performance", label: "Athletic Performance" },
  { value: "general_fitness", label: "General Fitness" },
];

export function DashboardTabs({
  greeting,
  firstName,
  profile,
  stats,
  goals,
  circles,
  workouts,
  limitations,
  activeCircleId,
  hasCircle,
}: DashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile.displayName,
    city: profile.city || "",
    state: profile.country || "", // Using country field for state
    fitnessLevel: profile.fitnessLevel || "",
    primaryMotivations: profile.primaryMotivation
      ? profile.primaryMotivation.split(",").map(m => m.trim()).filter(Boolean)
      : [] as string[],
    visibility: profile.visibility || "private",
    socialLinks: {
      instagram: profile.socialLinks?.instagram || "",
      tiktok: profile.socialLinks?.tiktok || "",
      youtube: profile.socialLinks?.youtube || "",
      twitter: profile.socialLinks?.twitter || "",
    },
  });

  // Update tab when URL changes
  useEffect(() => {
    if (tabParam && ["overview", "profile", "challenges"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSwitchCircle = async (circleId: string) => {
    if (circleId === activeCircleId) return;
    setSwitchingTo(circleId);

    try {
      const response = await fetch("/api/circles/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error("Failed to switch");
      }
    } catch {
      toast.error("Failed to switch circle");
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel - reset form
      setEditForm({
        displayName: profile.displayName,
        city: profile.city || "",
        state: profile.country || "",
        fitnessLevel: profile.fitnessLevel || "",
        primaryMotivations: profile.primaryMotivation
          ? profile.primaryMotivation.split(",").map(m => m.trim()).filter(Boolean)
          : [],
        visibility: profile.visibility || "private",
        socialLinks: {
          instagram: profile.socialLinks?.instagram || "",
          tiktok: profile.socialLinks?.tiktok || "",
          youtube: profile.socialLinks?.youtube || "",
          twitter: profile.socialLinks?.twitter || "",
        },
      });
    }
    setIsEditing(!isEditing);
  }, [isEditing, profile]);

  const handleSaveProfile = async () => {
    if (!editForm.displayName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      // Clean up social links - only include non-empty values
      const cleanedSocialLinks: Record<string, string> = {};
      if (editForm.socialLinks.instagram?.trim()) {
        cleanedSocialLinks.instagram = editForm.socialLinks.instagram.trim().replace(/^@/, "");
      }
      if (editForm.socialLinks.tiktok?.trim()) {
        cleanedSocialLinks.tiktok = editForm.socialLinks.tiktok.trim().replace(/^@/, "");
      }
      if (editForm.socialLinks.youtube?.trim()) {
        cleanedSocialLinks.youtube = editForm.socialLinks.youtube.trim().replace(/^@/, "");
      }
      if (editForm.socialLinks.twitter?.trim()) {
        cleanedSocialLinks.twitter = editForm.socialLinks.twitter.trim().replace(/^@/, "");
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editForm.displayName.trim(),
          city: editForm.city.trim() || null,
          country: editForm.state.trim() || null, // Using country field for state
          fitnessLevel: editForm.fitnessLevel || null,
          primaryMotivation: editForm.primaryMotivations.length > 0
            ? editForm.primaryMotivations.join(", ")
            : null,
          visibility: editForm.visibility,
          socialLinks: Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : {},
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Profile updated");
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMotivation = (value: string) => {
    setEditForm(prev => ({
      ...prev,
      primaryMotivations: prev.primaryMotivations.includes(value)
        ? prev.primaryMotivations.filter(m => m !== value)
        : [...prev.primaryMotivations, value],
    }));
  };

  // Helper to get full state name from abbreviation
  const getStateName = (abbrev: string | null | undefined) => {
    if (!abbrev) return null;
    const state = US_STATES.find(s => s.value === abbrev);
    return state ? state.label : abbrev;
  };

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Profile Header - Instagram Style */}
      <div className="relative">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-brand-gradient-subtle rounded-xl -z-10" />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Profile Picture */}
            <div className="relative shrink-0">
              {profile.profilePicture ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-lg shadow-brand/20">
                  <Image
                    src={profile.profilePicture}
                    alt={profile.displayName}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand/20">
                  <span className="text-3xl font-bold text-white">{initials}</span>
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background shadow-sm" />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                    <Input
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      placeholder="Your name"
                      className="max-w-xs"
                    />
                  </div>

                  {/* Location */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">City</label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">State</label>
                      <Select
                        value={editForm.state}
                        onValueChange={(value) => setEditForm({ ...editForm, state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fitness Level */}
                  <div className="max-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Fitness Level</label>
                    <Select
                      value={editForm.fitnessLevel}
                      onValueChange={(value) => setEditForm({ ...editForm, fitnessLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {FITNESS_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Motivations - Multi-select */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Motivations (select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MOTIVATIONS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => toggleMotivation(m.value)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            editForm.primaryMotivations.includes(m.value)
                              ? "bg-brand text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="max-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Profile Visibility</label>
                    <Select
                      value={editForm.visibility}
                      onValueChange={(value) => setEditForm({ ...editForm, visibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Social Links */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Social Media Links
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <Input
                          value={editForm.socialLinks.instagram}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            socialLinks: { ...editForm.socialLinks, instagram: e.target.value }
                          })}
                          placeholder="Instagram username"
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                        <Input
                          value={editForm.socialLinks.tiktok}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            socialLinks: { ...editForm.socialLinks, tiktok: e.target.value }
                          })}
                          placeholder="TikTok username"
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <Input
                          value={editForm.socialLinks.youtube}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            socialLinks: { ...editForm.socialLinks, youtube: e.target.value }
                          })}
                          placeholder="YouTube channel"
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <Input
                          value={editForm.socialLinks.twitter}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            socialLinks: { ...editForm.socialLinks, twitter: e.target.value }
                          })}
                          placeholder="X (Twitter) username"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold truncate">
                      {profile.displayName}
                    </h1>
                    {profile.visibility === "public" ? (
                      <Badge variant="default" className="bg-brand text-white">
                        <Shield className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Shield className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    {profile.city || profile.country ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {profile.city}{profile.country && `, ${getStateName(profile.country)}`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground/50">
                        <MapPin className="h-4 w-4" />
                        Add location
                      </span>
                    )}
                    {profile.fitnessLevel ? (
                      <Badge variant="outline" className="capitalize">
                        <Activity className="h-3 w-3 mr-1" />
                        {profile.fitnessLevel}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground/50">
                        <Activity className="h-3 w-3 mr-1" />
                        Set level
                      </Badge>
                    )}
                  </div>

                  {profile.primaryMotivation ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Flame className="h-4 w-4 text-energy shrink-0" />
                      {profile.primaryMotivation.split(",").map((m, i) => (
                        <Badge key={i} variant="secondary" className="capitalize text-xs">
                          {m.trim().replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground/50">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm">Set your motivations</span>
                    </div>
                  )}

                  {/* Social Links Display */}
                  {(profile.socialLinks?.instagram || profile.socialLinks?.tiktok ||
                    profile.socialLinks?.youtube || profile.socialLinks?.twitter) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                      {profile.socialLinks.instagram && (
                        <a
                          href={`https://instagram.com/${profile.socialLinks.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title={`@${profile.socialLinks.instagram}`}
                        >
                          <svg className="h-4 w-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </a>
                      )}
                      {profile.socialLinks.tiktok && (
                        <a
                          href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title={`@${profile.socialLinks.tiktok}`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        </a>
                      )}
                      {profile.socialLinks.youtube && (
                        <a
                          href={`https://youtube.com/@${profile.socialLinks.youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title={`@${profile.socialLinks.youtube}`}
                        >
                          <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      )}
                      {profile.socialLinks.twitter && (
                        <a
                          href={`https://x.com/${profile.socialLinks.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title={`@${profile.socialLinks.twitter}`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex flex-col gap-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-success hover:bg-success/90"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditToggle}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button asChild className="bg-brand-gradient hover:opacity-90">
                    <Link href="/workout/new">
                      <Plus className="h-4 w-4 mr-2" />
                      New Workout
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats Row - Instagram Style */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
            <button className="text-center group" onClick={() => router.push("/activity?tab=workouts")}>
              <p className="text-2xl font-bold">{stats.workoutsThisWeek}</p>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Workouts
              </p>
            </button>
            <button className="text-center group" onClick={() => router.push("/you?section=goals")}>
              <p className="text-2xl font-bold">{stats.activeGoals}</p>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Goals
              </p>
            </button>
            <button className="text-center group" onClick={() => router.push("/activity?tab=challenges")}>
              <p className="text-2xl font-bold">{stats.activeChallenges}</p>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Challenges
              </p>
            </button>
            <button className="text-center group" onClick={() => router.push("/you?section=circles")}>
              <p className="text-2xl font-bold">{stats.circleCount}</p>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Rallies
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-4 py-3"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-4 py-3"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="challenges"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand data-[state=active]:bg-transparent px-4 py-3"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Challenges
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Workouts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  Recent Workouts
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/activity?tab=history">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {workouts.length === 0 ? (
                  <div className="text-center py-6">
                    <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      No workouts this week
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/workout/new">Start Workout</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workouts.slice(0, 4).map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-brand/10">
                            <Dumbbell className="h-4 w-4 text-brand" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{workout.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(workout.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Goals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Active Goals
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/you?section=goals">
                    View all
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {goals.length === 0 ? (
                  <div className="text-center py-6">
                    <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      No active goals
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/you?section=goals&action=new">Set Goal</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goals.slice(0, 3).map((goal) => (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {goal.category}
                          </Badge>
                          {goal.targetValue && goal.currentValue && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round((goal.currentValue / goal.targetValue) * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm">{goal.title}</p>
                        {goal.targetValue && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-gradient rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    ((goal.currentValue || 0) / goal.targetValue) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Rallies */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Your Rallies
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/discover">
                    Find more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {circles.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      No rallies yet
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/discover">Join Rally</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {circles.slice(0, 3).map((circle) => (
                      <div
                        key={circle.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-energy-gradient flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{circle.name}</p>
                            {circle.memberCount !== null && (
                              <p className="text-xs text-muted-foreground">
                                {circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        {circle.id === activeCircleId ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSwitchCircle(circle.id)}
                            disabled={switchingTo === circle.id}
                          >
                            {switchingTo === circle.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Switch"
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/workout/new"
                    className="flex flex-col items-center p-4 rounded-lg bg-brand-gradient hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-6 w-6 text-white mb-2" />
                    <span className="text-sm font-medium text-white">New Workout</span>
                  </Link>
                  <Link
                    href="/workout/generate"
                    className="flex flex-col items-center p-4 rounded-lg bg-energy-gradient hover:opacity-90 transition-opacity"
                  >
                    <Bot className="h-6 w-6 text-white mb-2" />
                    <span className="text-sm font-medium text-white">AI Generate</span>
                  </Link>
                  <Link
                    href="/discover"
                    className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Globe className="h-6 w-6 text-foreground mb-2" />
                    <span className="text-sm font-medium">Community</span>
                  </Link>
                  <Link
                    href="/you?section=equipment"
                    className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Package className="h-6 w-6 text-foreground mb-2" />
                    <span className="text-sm font-medium">Equipment</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Physical Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  Physical Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!profile.heightFormatted && !profile.weight ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Add height and weight to personalize workouts
                  </p>
                ) : (
                  <div className="space-y-3">
                    {profile.heightFormatted && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Height</span>
                        <span className="text-sm font-medium">{profile.heightFormatted}</span>
                      </div>
                    )}
                    {profile.weight && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Weight</span>
                        <span className="text-sm font-medium">{profile.weight} lbs</span>
                      </div>
                    )}
                    {profile.bodyFatPercentage && (
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-muted-foreground">Body Fat</span>
                        <span className="text-sm font-medium">{profile.bodyFatPercentage}%</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Primary Goal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Primary Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!profile.primaryGoalDescription ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No primary goal set
                  </p>
                ) : (
                  <div className="p-3 rounded-lg bg-brand/5 border border-brand/20">
                    <p className="font-medium text-sm">{profile.primaryGoalDescription}</p>
                    {profile.primaryGoalType && (
                      <Badge variant="outline" className="mt-2 text-xs capitalize">
                        {profile.primaryGoalType.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Limitations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Limitations & Injuries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {limitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No limitations recorded
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {limitations.map((lim) => (
                      <Badge
                        key={lim.id}
                        variant={
                          lim.severity === "severe"
                            ? "destructive"
                            : lim.severity === "moderate"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {lim.bodyPart && lim.condition
                          ? `${lim.bodyPart}: ${lim.condition}`
                          : lim.bodyPart || lim.condition}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fitness Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Fitness Level
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!profile.fitnessLevel ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Not assessed yet
                  </p>
                ) : (
                  <Badge variant="outline" className="capitalize text-sm">
                    {profile.fitnessLevel}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="mt-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand-gradient mx-auto flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Challenges Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Join fitness challenges like 75 Hard, 30-Day Squat Challenge, and more.
              Compete with friends and track your progress.
            </p>
            <Button asChild>
              <Link href="/discover">
                Explore Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
