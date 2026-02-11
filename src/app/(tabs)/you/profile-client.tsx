"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Heart,
  Trophy,
  MapPin,
  Users,
  Dumbbell,
  Settings,
  ChevronRight,
  Edit,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Shield,
  LogOut,
  Plus,
  Target,
  Activity,
  Trash2,
  Pencil,
  Copy,
  Link as LinkIcon,
  Share2,
  AtSign,
  ExternalLink,
  Mail,
  Key,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Search,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/neon-auth/client";
import { CompletenessCard } from "@/components/profile/completeness-card";
import { generateRecommendations } from "@/components/profile/recommended-actions";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { AchievementModal } from "@/components/badges/achievement-modal";
import { ConnectionsSheet } from "@/components/social/connections-sheet";
import { toast } from "sonner";
import { HomeGymSetup, HOME_EQUIPMENT_TO_CATALOG } from "@/components/equipment/home-gym-setup";
import type { EquipmentDetails } from "@/lib/constants/equipment";
import { LOCATION_TEMPLATES, HOME_EQUIPMENT } from "@/lib/constants/equipment";

// Badge type for achievement modal
interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockMessage?: string;
  category?: string;
}

// ==================== TYPES ====================
interface BadgeData {
  id: string;
  badgeId: string;
  earnedAt: string;
  isFeatured: boolean;
  badge: {
    name: string;
    description?: string;
    icon?: string;
    imageUrl?: string;
    category: string;
    tier: string;
    criteriaDescription?: string;
  };
}

interface SportData {
  id: string;
  sport: string;
  level?: string;
  yearsPlaying?: number;
  position?: string;
  currentlyActive: boolean;
}

interface SkillData {
  id: string;
  name: string;
  category: string;
  currentStatus: string;
  allTimeBestStatus?: string;
}

interface PRData {
  id: string;
  exerciseName: string;
  value: number;
  unit: string;
}

interface LocationData {
  id: string;
  name: string;
  type: string;
  address?: string;
  isActive: boolean;
  visibility: string;
  lat?: number;
  lng?: number;
  equipment?: string[];
  equipmentDetails?: {
    dumbbells?: {
      available: boolean;
      type?: "fixed" | "adjustable" | "both";
      maxWeight?: number;
      weights?: number[];
    };
    barbell?: {
      available: boolean;
      type?: "standard" | "olympic" | "both";
      barWeight?: number;
      plates?: number[];
      totalPlateWeight?: number;
    };
  } | null;
}

interface LimitationData {
  id: string;
  type: string;
  bodyPart?: string;
  condition?: string;
  description?: string;
  severity?: string;
}

interface MetricsData {
  weight?: number;
  height?: number;
  bodyFat?: number;
  fitnessLevel?: string;
}

interface SectionStatus {
  section: string;
  percent: number;
  isComplete: boolean;
  recommendation?: string;
}

interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  profile: {
    handle?: string;
    displayName?: string;
    profilePicture?: string;
    bio?: string;
    birthMonth?: number;
    birthYear?: number;
    city?: string;
    state?: string;
    country?: string;
    workoutLocation?: string;
    workoutLocationAddress?: string;
    workoutLocationType?: string;
    locationVisibility?: string; // "none" | "state" | "city" | "full"
    visibility: string;
    socialLinks: {
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      twitter?: string;
      linkedin?: string;
    };
    notificationPreferences: {
      messages: boolean;
      workouts: boolean;
      goals: boolean;
      circles: boolean;
    };
    galleryPhotos?: Array<{
      id: string;
      url: string;
      visibility: "public" | "circles" | "private";
      visibleToCircles?: string[];
      caption?: string;
      uploadedAt: string;
    }>;
    fieldVisibility?: {
      bio?: "public" | "circles" | "private";
      city?: "public" | "circles" | "private";
      metrics?: "public" | "circles" | "private";
      sports?: "public" | "circles" | "private";
      skills?: "public" | "circles" | "private";
      prs?: "public" | "circles" | "private";
      badges?: "public" | "circles" | "private";
      socialLinks?: "public" | "circles" | "private";
    };
    workoutPreferences?: {
      workoutDays?: string[];
      workoutDuration?: number;
      trainingFrequency?: number;
      activityLevel?: { jobType: string; dailySteps?: number };
    };
    consentGiven?: boolean;
    consentPreferences?: {
      analytics?: boolean;
      marketing?: boolean;
      personalization?: boolean;
      doNotSell?: boolean;
    };
  } | null;
  metrics: MetricsData | null;
  limitations: LimitationData[];
  skills: SkillData[];
  locations: LocationData[];
  sports: SportData[];
  circles: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    imageUrl?: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    category?: string;
  }>;
  workoutPlans: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  personalRecords: PRData[];
  badges: BadgeData[];
  featuredBadges: BadgeData[];
  completeness: {
    overallPercent: number;
    sections: Record<string, number>;
    sectionStatuses: SectionStatus[];
    recommendations: string[];
  };
}

// ==================== CONSTANTS ====================
const SKILL_CATEGORIES = ["Gymnastics", "Strength", "Mobility", "Cardio", "Olympic Lifting", "Calisthenics", "Balance", "Martial Arts", "Swimming", "Running", "Other"];
const SKILL_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "learning", label: "Learning" },
  { value: "achieved", label: "Achieved" },
  { value: "mastered", label: "Mastered" },
];
const PR_UNITS = ["lbs", "kg", "reps", "seconds", "minutes", "miles", "km"];

// Format PR value based on unit (handles time-based PRs stored as seconds)
function formatPRDisplay(value: number, unit: string): string {
  if (unit === "mm:ss" || unit === "min:sec") {
    const mins = Math.floor(value / 60);
    const secs = Math.round(value % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  if (unit === "hh:mm:ss") {
    const hours = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    const secs = Math.round(value % 60);
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  if (unit === "lbs" || unit === "kg") return `${value} ${unit}`;
  if (unit === "reps") return `${value} reps`;
  if (unit === "seconds") {
    if (value >= 60) {
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${value}s`;
  }
  return `${value} ${unit}`;
}

// Comprehensive Skills Database
const SKILLS_DATABASE: { name: string; category: string; difficulty: string }[] = [
  // Gymnastics
  { name: "Muscle Up", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Bar Muscle Up", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Ring Muscle Up", category: "Gymnastics", difficulty: "Elite" },
  { name: "Handstand", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Handstand Walk", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Handstand Push Up", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Strict Handstand Push Up", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Kipping Handstand Push Up", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Freestanding Handstand", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Cartwheel", category: "Gymnastics", difficulty: "Beginner" },
  { name: "Round Off", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Back Walkover", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Front Walkover", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Back Handspring", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Front Handspring", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Back Tuck", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Front Tuck", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Back Layout", category: "Gymnastics", difficulty: "Elite" },
  { name: "Front Layout", category: "Gymnastics", difficulty: "Elite" },
  { name: "Kip Up", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Rope Climb", category: "Gymnastics", difficulty: "Intermediate" },
  { name: "Legless Rope Climb", category: "Gymnastics", difficulty: "Advanced" },
  { name: "Pegboard", category: "Gymnastics", difficulty: "Elite" },
  
  // Calisthenics
  { name: "Pull Up", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Strict Pull Up", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Kipping Pull Up", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Butterfly Pull Up", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Weighted Pull Up", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Chin Up", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Chest to Bar Pull Up", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Push Up", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Diamond Push Up", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "One Arm Push Up", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Clapping Push Up", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Dip", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Ring Dip", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Weighted Dip", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Pistol Squat", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Shrimp Squat", category: "Calisthenics", difficulty: "Advanced" },
  { name: "L-Sit", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "V-Sit", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Toes to Bar", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Knees to Elbows", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Skin the Cat", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Front Lever", category: "Calisthenics", difficulty: "Elite" },
  { name: "Back Lever", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Planche", category: "Calisthenics", difficulty: "Elite" },
  { name: "Straddle Planche", category: "Calisthenics", difficulty: "Elite" },
  { name: "Human Flag", category: "Calisthenics", difficulty: "Elite" },
  { name: "Dragon Flag", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Hanging Leg Raise", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Ab Wheel Rollout", category: "Calisthenics", difficulty: "Intermediate" },
  { name: "Standing Ab Wheel", category: "Calisthenics", difficulty: "Advanced" },
  { name: "Hollow Body Hold", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Arch Body Hold", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Inverted Row", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Box Jump", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Burpee", category: "Calisthenics", difficulty: "Beginner" },
  { name: "Burpee Box Jump Over", category: "Calisthenics", difficulty: "Intermediate" },
  
  // Olympic Lifting
  { name: "Snatch", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Power Snatch", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Squat Snatch", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Hang Snatch", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Snatch Balance", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Overhead Squat", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Clean", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Power Clean", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Squat Clean", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Hang Clean", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Clean & Jerk", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Jerk", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Push Jerk", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Split Jerk", category: "Olympic Lifting", difficulty: "Advanced" },
  { name: "Push Press", category: "Olympic Lifting", difficulty: "Beginner" },
  { name: "Thruster", category: "Olympic Lifting", difficulty: "Intermediate" },
  { name: "Cluster", category: "Olympic Lifting", difficulty: "Advanced" },
  
  // Strength
  { name: "Bench Press", category: "Strength", difficulty: "Beginner" },
  { name: "Incline Bench Press", category: "Strength", difficulty: "Beginner" },
  { name: "Decline Bench Press", category: "Strength", difficulty: "Beginner" },
  { name: "Deadlift", category: "Strength", difficulty: "Beginner" },
  { name: "Sumo Deadlift", category: "Strength", difficulty: "Intermediate" },
  { name: "Romanian Deadlift", category: "Strength", difficulty: "Beginner" },
  { name: "Deficit Deadlift", category: "Strength", difficulty: "Intermediate" },
  { name: "Back Squat", category: "Strength", difficulty: "Beginner" },
  { name: "Front Squat", category: "Strength", difficulty: "Intermediate" },
  { name: "Goblet Squat", category: "Strength", difficulty: "Beginner" },
  { name: "Bulgarian Split Squat", category: "Strength", difficulty: "Intermediate" },
  { name: "Overhead Press", category: "Strength", difficulty: "Beginner" },
  { name: "Strict Press", category: "Strength", difficulty: "Beginner" },
  { name: "Military Press", category: "Strength", difficulty: "Beginner" },
  { name: "Z Press", category: "Strength", difficulty: "Intermediate" },
  { name: "Barbell Row", category: "Strength", difficulty: "Beginner" },
  { name: "Pendlay Row", category: "Strength", difficulty: "Intermediate" },
  { name: "Lat Pulldown", category: "Strength", difficulty: "Beginner" },
  { name: "Hip Thrust", category: "Strength", difficulty: "Beginner" },
  { name: "Good Morning", category: "Strength", difficulty: "Intermediate" },
  { name: "Farmers Carry", category: "Strength", difficulty: "Beginner" },
  { name: "Turkish Get Up", category: "Strength", difficulty: "Intermediate" },
  { name: "Sled Push", category: "Strength", difficulty: "Beginner" },
  { name: "Sled Pull", category: "Strength", difficulty: "Beginner" },
  { name: "Zercher Squat", category: "Strength", difficulty: "Advanced" },
  { name: "Jefferson Deadlift", category: "Strength", difficulty: "Intermediate" },
  { name: "Atlas Stone", category: "Strength", difficulty: "Advanced" },
  { name: "Log Press", category: "Strength", difficulty: "Advanced" },
  { name: "Axle Press", category: "Strength", difficulty: "Intermediate" },
  { name: "Yoke Walk", category: "Strength", difficulty: "Intermediate" },
  
  // Mobility
  { name: "Full Splits", category: "Mobility", difficulty: "Advanced" },
  { name: "Middle Splits", category: "Mobility", difficulty: "Advanced" },
  { name: "Front Splits", category: "Mobility", difficulty: "Advanced" },
  { name: "Deep Squat", category: "Mobility", difficulty: "Beginner" },
  { name: "Overhead Squat Mobility", category: "Mobility", difficulty: "Intermediate" },
  { name: "Pike Stretch", category: "Mobility", difficulty: "Beginner" },
  { name: "Pancake Stretch", category: "Mobility", difficulty: "Intermediate" },
  { name: "Bridge", category: "Mobility", difficulty: "Beginner" },
  { name: "Full Bridge", category: "Mobility", difficulty: "Intermediate" },
  { name: "Standing Bridge", category: "Mobility", difficulty: "Advanced" },
  { name: "Jefferson Curl", category: "Mobility", difficulty: "Intermediate" },
  { name: "Hip Flexor Stretch", category: "Mobility", difficulty: "Beginner" },
  { name: "Pigeon Pose", category: "Mobility", difficulty: "Beginner" },
  { name: "Shoulder Dislocates", category: "Mobility", difficulty: "Beginner" },
  { name: "Thoracic Bridge", category: "Mobility", difficulty: "Intermediate" },
  { name: "Cossack Squat", category: "Mobility", difficulty: "Intermediate" },
  
  // Balance
  { name: "Crow Pose", category: "Balance", difficulty: "Beginner" },
  { name: "Crane Pose", category: "Balance", difficulty: "Intermediate" },
  { name: "Side Crow", category: "Balance", difficulty: "Intermediate" },
  { name: "Flying Crow", category: "Balance", difficulty: "Advanced" },
  { name: "Headstand", category: "Balance", difficulty: "Beginner" },
  { name: "Forearm Stand", category: "Balance", difficulty: "Intermediate" },
  { name: "Single Leg Balance", category: "Balance", difficulty: "Beginner" },
  { name: "Slackline Walking", category: "Balance", difficulty: "Intermediate" },
  { name: "Bosu Ball Balance", category: "Balance", difficulty: "Beginner" },
  
  // Cardio
  { name: "Double Unders", category: "Cardio", difficulty: "Intermediate" },
  { name: "Triple Unders", category: "Cardio", difficulty: "Elite" },
  { name: "Crossover Double Unders", category: "Cardio", difficulty: "Advanced" },
  { name: "5K Run", category: "Cardio", difficulty: "Beginner" },
  { name: "10K Run", category: "Cardio", difficulty: "Intermediate" },
  { name: "Half Marathon", category: "Cardio", difficulty: "Advanced" },
  { name: "Marathon", category: "Cardio", difficulty: "Elite" },
  { name: "Sub-6 Minute Mile", category: "Cardio", difficulty: "Advanced" },
  { name: "Sub-5 Minute Mile", category: "Cardio", difficulty: "Elite" },
  { name: "2K Row", category: "Cardio", difficulty: "Intermediate" },
  { name: "5K Row", category: "Cardio", difficulty: "Intermediate" },
  { name: "Assault Bike Calories", category: "Cardio", difficulty: "Intermediate" },
  { name: "Ski Erg", category: "Cardio", difficulty: "Intermediate" },
  
  // Martial Arts
  { name: "Front Kick", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Roundhouse Kick", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Side Kick", category: "Martial Arts", difficulty: "Intermediate" },
  { name: "Spinning Back Kick", category: "Martial Arts", difficulty: "Advanced" },
  { name: "Head Kick", category: "Martial Arts", difficulty: "Intermediate" },
  { name: "Flying Knee", category: "Martial Arts", difficulty: "Advanced" },
  { name: "Tornado Kick", category: "Martial Arts", difficulty: "Advanced" },
  { name: "Armbar", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Triangle Choke", category: "Martial Arts", difficulty: "Intermediate" },
  { name: "Rear Naked Choke", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Guillotine", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Kimura", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Americana", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Heel Hook", category: "Martial Arts", difficulty: "Advanced" },
  { name: "Berimbolo", category: "Martial Arts", difficulty: "Advanced" },
  { name: "Rubber Guard", category: "Martial Arts", difficulty: "Intermediate" },
  { name: "Hip Escape", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Technical Stand Up", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Double Leg Takedown", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Single Leg Takedown", category: "Martial Arts", difficulty: "Beginner" },
  { name: "Hip Throw", category: "Martial Arts", difficulty: "Intermediate" },
  
  // Swimming
  { name: "Freestyle", category: "Swimming", difficulty: "Beginner" },
  { name: "Backstroke", category: "Swimming", difficulty: "Beginner" },
  { name: "Breaststroke", category: "Swimming", difficulty: "Intermediate" },
  { name: "Butterfly", category: "Swimming", difficulty: "Advanced" },
  { name: "Flip Turn", category: "Swimming", difficulty: "Intermediate" },
  { name: "Open Water Swimming", category: "Swimming", difficulty: "Intermediate" },
  { name: "Treading Water", category: "Swimming", difficulty: "Beginner" },
  { name: "Diving", category: "Swimming", difficulty: "Intermediate" },
];

// Comprehensive Exercises Database for PRs
const EXERCISES_DATABASE: { name: string; category: string; unit: string }[] = [
  // Barbell Strength
  { name: "Bench Press", category: "Barbell", unit: "lbs" },
  { name: "Incline Bench Press", category: "Barbell", unit: "lbs" },
  { name: "Close Grip Bench Press", category: "Barbell", unit: "lbs" },
  { name: "Floor Press", category: "Barbell", unit: "lbs" },
  { name: "Deadlift", category: "Barbell", unit: "lbs" },
  { name: "Sumo Deadlift", category: "Barbell", unit: "lbs" },
  { name: "Romanian Deadlift", category: "Barbell", unit: "lbs" },
  { name: "Stiff Leg Deadlift", category: "Barbell", unit: "lbs" },
  { name: "Deficit Deadlift", category: "Barbell", unit: "lbs" },
  { name: "Block Pull", category: "Barbell", unit: "lbs" },
  { name: "Back Squat", category: "Barbell", unit: "lbs" },
  { name: "Front Squat", category: "Barbell", unit: "lbs" },
  { name: "Overhead Squat", category: "Barbell", unit: "lbs" },
  { name: "Box Squat", category: "Barbell", unit: "lbs" },
  { name: "Pause Squat", category: "Barbell", unit: "lbs" },
  { name: "Overhead Press", category: "Barbell", unit: "lbs" },
  { name: "Push Press", category: "Barbell", unit: "lbs" },
  { name: "Push Jerk", category: "Barbell", unit: "lbs" },
  { name: "Split Jerk", category: "Barbell", unit: "lbs" },
  { name: "Barbell Row", category: "Barbell", unit: "lbs" },
  { name: "Pendlay Row", category: "Barbell", unit: "lbs" },
  { name: "Barbell Curl", category: "Barbell", unit: "lbs" },
  { name: "Skull Crushers", category: "Barbell", unit: "lbs" },
  { name: "Hip Thrust", category: "Barbell", unit: "lbs" },
  { name: "Good Morning", category: "Barbell", unit: "lbs" },
  { name: "Zercher Squat", category: "Barbell", unit: "lbs" },
  { name: "Hack Squat", category: "Barbell", unit: "lbs" },
  
  // Olympic Lifts
  { name: "Snatch", category: "Olympic", unit: "lbs" },
  { name: "Power Snatch", category: "Olympic", unit: "lbs" },
  { name: "Hang Snatch", category: "Olympic", unit: "lbs" },
  { name: "Snatch Balance", category: "Olympic", unit: "lbs" },
  { name: "Snatch Grip Deadlift", category: "Olympic", unit: "lbs" },
  { name: "Clean", category: "Olympic", unit: "lbs" },
  { name: "Power Clean", category: "Olympic", unit: "lbs" },
  { name: "Hang Clean", category: "Olympic", unit: "lbs" },
  { name: "Clean & Jerk", category: "Olympic", unit: "lbs" },
  { name: "Clean Pull", category: "Olympic", unit: "lbs" },
  { name: "Snatch Pull", category: "Olympic", unit: "lbs" },
  { name: "Thruster", category: "Olympic", unit: "lbs" },
  { name: "Cluster", category: "Olympic", unit: "lbs" },
  
  // Dumbbell
  { name: "Dumbbell Bench Press", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Incline Press", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Shoulder Press", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Row", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Curl", category: "Dumbbell", unit: "lbs" },
  { name: "Hammer Curl", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Tricep Extension", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Lunge", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Snatch", category: "Dumbbell", unit: "lbs" },
  { name: "Dumbbell Clean", category: "Dumbbell", unit: "lbs" },
  { name: "Goblet Squat", category: "Dumbbell", unit: "lbs" },
  { name: "Turkish Get Up", category: "Dumbbell", unit: "lbs" },
  
  // Kettlebell
  { name: "Kettlebell Swing", category: "Kettlebell", unit: "lbs" },
  { name: "Kettlebell Snatch", category: "Kettlebell", unit: "lbs" },
  { name: "Kettlebell Clean", category: "Kettlebell", unit: "lbs" },
  { name: "Kettlebell Press", category: "Kettlebell", unit: "lbs" },
  { name: "Kettlebell Goblet Squat", category: "Kettlebell", unit: "lbs" },
  { name: "Kettlebell Turkish Get Up", category: "Kettlebell", unit: "lbs" },
  
  // Bodyweight - Reps
  { name: "Pull Ups", category: "Bodyweight", unit: "reps" },
  { name: "Strict Pull Ups", category: "Bodyweight", unit: "reps" },
  { name: "Kipping Pull Ups", category: "Bodyweight", unit: "reps" },
  { name: "Chest to Bar Pull Ups", category: "Bodyweight", unit: "reps" },
  { name: "Muscle Ups", category: "Bodyweight", unit: "reps" },
  { name: "Bar Muscle Ups", category: "Bodyweight", unit: "reps" },
  { name: "Ring Muscle Ups", category: "Bodyweight", unit: "reps" },
  { name: "Chin Ups", category: "Bodyweight", unit: "reps" },
  { name: "Push Ups", category: "Bodyweight", unit: "reps" },
  { name: "Handstand Push Ups", category: "Bodyweight", unit: "reps" },
  { name: "Strict Handstand Push Ups", category: "Bodyweight", unit: "reps" },
  { name: "Dips", category: "Bodyweight", unit: "reps" },
  { name: "Ring Dips", category: "Bodyweight", unit: "reps" },
  { name: "Toes to Bar", category: "Bodyweight", unit: "reps" },
  { name: "Knees to Elbows", category: "Bodyweight", unit: "reps" },
  { name: "Pistol Squats", category: "Bodyweight", unit: "reps" },
  { name: "Box Jumps", category: "Bodyweight", unit: "reps" },
  { name: "Burpees", category: "Bodyweight", unit: "reps" },
  { name: "Double Unders", category: "Bodyweight", unit: "reps" },
  { name: "Wall Balls", category: "Bodyweight", unit: "reps" },
  { name: "Air Squats", category: "Bodyweight", unit: "reps" },
  { name: "Sit Ups", category: "Bodyweight", unit: "reps" },
  { name: "GHD Sit Ups", category: "Bodyweight", unit: "reps" },
  { name: "GHD Hip Extensions", category: "Bodyweight", unit: "reps" },
  
  // Weighted Bodyweight
  { name: "Weighted Pull Up", category: "Weighted", unit: "lbs" },
  { name: "Weighted Dip", category: "Weighted", unit: "lbs" },
  { name: "Weighted Chin Up", category: "Weighted", unit: "lbs" },
  { name: "Weighted Pistol Squat", category: "Weighted", unit: "lbs" },
  { name: "Weighted Muscle Up", category: "Weighted", unit: "lbs" },
  
  // Carries
  { name: "Farmers Carry", category: "Carries", unit: "lbs" },
  { name: "Yoke Walk", category: "Carries", unit: "lbs" },
  { name: "Sandbag Carry", category: "Carries", unit: "lbs" },
  { name: "Atlas Stone", category: "Carries", unit: "lbs" },
  { name: "Sled Push", category: "Carries", unit: "lbs" },
  { name: "Sled Pull", category: "Carries", unit: "lbs" },
  
  // Cardio - Time
  { name: "500m Row", category: "Cardio", unit: "seconds" },
  { name: "1K Row", category: "Cardio", unit: "seconds" },
  { name: "2K Row", category: "Cardio", unit: "seconds" },
  { name: "5K Row", category: "Cardio", unit: "seconds" },
  { name: "400m Run", category: "Cardio", unit: "seconds" },
  { name: "800m Run", category: "Cardio", unit: "seconds" },
  { name: "1 Mile Run", category: "Cardio", unit: "seconds" },
  { name: "5K Run", category: "Cardio", unit: "minutes" },
  { name: "10K Run", category: "Cardio", unit: "minutes" },
  { name: "Half Marathon", category: "Cardio", unit: "minutes" },
  { name: "Marathon", category: "Cardio", unit: "minutes" },
  { name: "100m Sprint", category: "Cardio", unit: "seconds" },
  { name: "200m Sprint", category: "Cardio", unit: "seconds" },
  { name: "Assault Bike 1 Mile", category: "Cardio", unit: "seconds" },
  { name: "Assault Bike Calories", category: "Cardio", unit: "seconds" },
  { name: "Ski Erg 1K", category: "Cardio", unit: "seconds" },
  
  // Holds - Time
  { name: "Plank Hold", category: "Holds", unit: "seconds" },
  { name: "L-Sit Hold", category: "Holds", unit: "seconds" },
  { name: "Handstand Hold", category: "Holds", unit: "seconds" },
  { name: "Dead Hang", category: "Holds", unit: "seconds" },
  { name: "Wall Sit", category: "Holds", unit: "seconds" },
  { name: "Hollow Body Hold", category: "Holds", unit: "seconds" },
  
  // Machine
  { name: "Leg Press", category: "Machine", unit: "lbs" },
  { name: "Leg Extension", category: "Machine", unit: "lbs" },
  { name: "Leg Curl", category: "Machine", unit: "lbs" },
  { name: "Lat Pulldown", category: "Machine", unit: "lbs" },
  { name: "Cable Row", category: "Machine", unit: "lbs" },
  { name: "Chest Press Machine", category: "Machine", unit: "lbs" },
  { name: "Shoulder Press Machine", category: "Machine", unit: "lbs" },
  { name: "Cable Fly", category: "Machine", unit: "lbs" },
  { name: "Tricep Pushdown", category: "Machine", unit: "lbs" },
  { name: "Cable Curl", category: "Machine", unit: "lbs" },
];
const LOCATION_TYPES = [
  { value: "commercial", label: "Commercial Gym" },
  { value: "crossfit", label: "CrossFit Box" },
  { value: "home", label: "Home Gym" },
  { value: "outdoor", label: "Outdoor" },
  { value: "hotel", label: "Hotel Gym" },
  { value: "military", label: "Military Gym" },
  { value: "other", label: "Other" },
];
const LIMITATION_TYPES = ["Injury", "Chronic Condition", "Post-Surgery", "Mobility Issue", "Other"];
const BODY_PARTS = ["Neck", "Shoulder", "Upper Back", "Lower Back", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot", "Other"];
const SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"];

// ==================== HELPER COMPONENTS ====================
function ItemCard({ children, onEdit, onDelete, itemName, itemType = "item", className }: { children: React.ReactNode; onEdit?: () => void; onDelete?: () => void; itemName?: string; itemType?: string; className?: string }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center justify-between rounded-lg bg-muted p-3 group", className)}>
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        itemName={itemName}
        itemType={itemType}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}

// ==================== MODALS ====================
function SkillModal({ open, onOpenChange, skill, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; skill?: SkillData | null; onSave: (data: Partial<SkillData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [step, setStep] = useState<"select" | "status">(skill ? "status" : "select");
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; category: string } | null>(
    skill ? { name: skill.name, category: skill.category } : null
  );
  const [status, setStatus] = useState(skill?.currentStatus || "not_started");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  // Get unique categories and difficulties
  const categories = useMemo(() => ["all", ...new Set(SKILLS_DATABASE.map(s => s.category))], []);
  const difficulties = ["all", "Beginner", "Intermediate", "Advanced", "Elite"];

  // Filter skills
  const filteredSkills = useMemo(() => {
    return SKILLS_DATABASE.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === "all" || s.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [search, categoryFilter, difficultyFilter]);

  // Group by category for better display
  const groupedSkills = useMemo(() => {
    const groups: Record<string, typeof SKILLS_DATABASE> = {};
    filteredSkills.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [filteredSkills]);

  useEffect(() => {
    if (open) {
      if (skill) {
        setSelectedSkill({ name: skill.name, category: skill.category });
        setStatus(skill.currentStatus);
        setStep("status");
      } else {
        setSelectedSkill(null);
        setStatus("not_started");
        setStep("select");
      }
      setSearch("");
      setCategoryFilter("all");
      setDifficultyFilter("all");
    }
  }, [open, skill]);

  const handleSelectSkill = (s: { name: string; category: string }) => {
    setSelectedSkill(s);
    setStep("status");
  };

  const handleSave = async () => {
    if (!selectedSkill) { toast.error("Please select a skill"); return; }
    setSaving(true);
    try {
      await onSave({ id: skill?.id, name: selectedSkill.name, category: selectedSkill.category, currentStatus: status });
      onOpenChange(false);
      toast.success(skill ? "Skill updated!" : "Skill added!");
    } catch { toast.error("Failed to save skill"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add Skill"}</DialogTitle>
          <DialogDescription>
            {step === "select" ? "Search and select a skill to track" : "Set your progress status"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(d => (
                    <SelectItem key={d} value={d}>{d === "all" ? "All Levels" : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skills List */}
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 min-h-[250px] max-h-[350px]">
              {Object.keys(groupedSkills).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No skills found</p>
              ) : (
                Object.entries(groupedSkills).map(([category, skills]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
                    <div className="space-y-1">
                      {skills.map(s => (
                        <button
                          key={s.name}
                          onClick={() => handleSelectSkill(s)}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-left transition-all",
                            "flex items-center justify-between",
                            "hover:bg-brand/10 border border-transparent hover:border-brand/20",
                            selectedSkill?.name === s.name && "bg-brand/10 border-brand/30"
                          )}
                        >
                          <span className="font-medium text-sm">{s.name}</span>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            s.difficulty === "Beginner" && "border-green-500/50 text-green-600",
                            s.difficulty === "Intermediate" && "border-yellow-500/50 text-yellow-600",
                            s.difficulty === "Advanced" && "border-orange-500/50 text-orange-600",
                            s.difficulty === "Elite" && "border-red-500/50 text-red-600"
                          )}>
                            {s.difficulty}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {filteredSkills.length} skills available
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Selected Skill Display */}
            <div className="p-4 rounded-xl bg-brand/10 border border-brand/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{selectedSkill?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSkill?.category}</p>
                </div>
                {!skill && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
                    Change
                  </Button>
                )}
              </div>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Your Progress</Label>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-left",
                      "hover:border-brand/50",
                      status === s.value ? "border-brand bg-brand/10" : "border-border"
                    )}
                  >
                    <span className="font-medium text-sm">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {skill && onDelete && (
            <Button variant="destructive" onClick={() => { onDelete(skill.id); onOpenChange(false); }} className="sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === "status" && (
            <Button onClick={handleSave} disabled={saving || !selectedSkill}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PRModal({ open, onOpenChange, pr, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; pr?: PRData | null; onSave: (data: Partial<PRData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [step, setStep] = useState<"select" | "value">(pr ? "value" : "select");
  const [selectedExercise, setSelectedExercise] = useState<{ name: string; category: string; unit: string } | null>(
    pr ? { name: pr.exerciseName, category: "", unit: pr.unit } : null
  );
  const [value, setValue] = useState(pr?.value?.toString() || "");
  const [unit, setUnit] = useState(pr?.unit || "lbs");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  // Get unique categories
  const categories = useMemo(() => ["all", ...new Set(EXERCISES_DATABASE.map(e => e.category))], []);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return EXERCISES_DATABASE.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  // Group by category
  const groupedExercises = useMemo(() => {
    const groups: Record<string, typeof EXERCISES_DATABASE> = {};
    filteredExercises.forEach(e => {
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category].push(e);
    });
    return groups;
  }, [filteredExercises]);

  useEffect(() => {
    if (open) {
      if (pr) {
        const exercise = EXERCISES_DATABASE.find(e => e.name === pr.exerciseName);
        setSelectedExercise(exercise || { name: pr.exerciseName, category: "", unit: pr.unit });
        setValue(pr.value?.toString() || "");
        setUnit(pr.unit);
        setStep("value");
      } else {
        setSelectedExercise(null);
        setValue("");
        setUnit("lbs");
        setStep("select");
      }
      setSearch("");
      setCategoryFilter("all");
    }
  }, [open, pr]);

  const handleSelectExercise = (e: { name: string; category: string; unit: string }) => {
    setSelectedExercise(e);
    setUnit(e.unit);
    setStep("value");
  };

  const handleSave = async () => {
    if (!selectedExercise || !value) { toast.error("Please fill in all fields"); return; }
    setSaving(true);
    try {
      await onSave({ id: pr?.id, exerciseName: selectedExercise.name, value: parseFloat(value), unit });
      onOpenChange(false);
      toast.success(pr ? "PR updated!" : "PR added!");
    } catch { toast.error("Failed to save PR"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{pr ? "Edit Personal Record" : "Add Personal Record"}</DialogTitle>
          <DialogDescription>
            {step === "select" ? "Search and select an exercise" : "Enter your personal record"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Exercises List */}
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 min-h-[250px] max-h-[350px]">
              {Object.keys(groupedExercises).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No exercises found</p>
              ) : (
                Object.entries(groupedExercises).map(([category, exercises]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
                    <div className="space-y-1">
                      {exercises.map(e => (
                        <button
                          key={e.name}
                          onClick={() => handleSelectExercise(e)}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-left transition-all",
                            "flex items-center justify-between",
                            "hover:bg-brand/10 border border-transparent hover:border-brand/20",
                            selectedExercise?.name === e.name && "bg-brand/10 border-brand/30"
                          )}
                        >
                          <span className="font-medium text-sm">{e.name}</span>
                          <span className="text-xs text-muted-foreground">{e.unit}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {filteredExercises.length} exercises available
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Selected Exercise Display */}
            <div className="p-4 rounded-xl bg-brand/10 border border-brand/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{selectedExercise?.name}</p>
                  {selectedExercise?.category && (
                    <p className="text-sm text-muted-foreground">{selectedExercise.category}</p>
                  )}
                </div>
                {!pr && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
                    Change
                  </Button>
                )}
              </div>
            </div>

            {/* Value Input */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  placeholder="225"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="text-lg font-bold h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PR_UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Value Buttons for weight-based PRs */}
            {(unit === "lbs" || unit === "kg") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  {[135, 185, 225, 275, 315, 365, 405, 495].map(w => (
                    <Button
                      key={w}
                      variant={value === w.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setValue(w.toString())}
                      className="text-xs"
                    >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {pr && onDelete && (
            <Button variant="destructive" onClick={() => { onDelete(pr.id); onOpenChange(false); }} className="sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === "value" && (
            <Button onClick={handleSave} disabled={saving || !selectedExercise || !value}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeEquipmentInline({ location, onSave }: { location: LocationData; onSave: (id: string, equipment: string[], details: EquipmentDetails) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Fetch equipment catalog when editing starts
  useEffect(() => {
    if (editing && !catalogLoaded) {
      fetch("/api/equipment/catalog")
        .then(r => r.ok ? r.json() : [])
        .then(data => { setCatalog(data); setCatalogLoaded(true); })
        .catch(() => setCatalogLoaded(true));
    }
  }, [editing, catalogLoaded]);

  // Convert catalog equipment IDs back to home equipment IDs for HomeGymSetup
  const getInitialHomeEquipment = (): string[] => {
    if (!location.equipment?.length || !catalog.length) return [];
    const catalogNames = new Set(
      catalog.filter(c => location.equipment!.includes(c.id)).map(c => c.name.toLowerCase())
    );
    return HOME_EQUIPMENT
      .filter(he => {
        const mappedNames = HOME_EQUIPMENT_TO_CATALOG[he.id] || [];
        return mappedNames.some(n => catalogNames.has(n.toLowerCase()));
      })
      .map(he => he.id);
  };

  const handleComplete = async (homeEquipment: string[], details: EquipmentDetails) => {
    // Convert home equipment IDs to catalog IDs
    const catalogEquipmentNames: string[] = [];
    homeEquipment.forEach(id => {
      const names = HOME_EQUIPMENT_TO_CATALOG[id] || [];
      catalogEquipmentNames.push(...names);
    });
    const catalogIds = catalog
      .filter(item => catalogEquipmentNames.some(name => name.toLowerCase() === item.name.toLowerCase()))
      .map(item => item.id);

    await onSave(location.id, catalogIds, details);
    setEditing(false);
  };

  // Build equipment summary
  const equipmentCount = location.equipment?.length || 0;
  const details = location.equipmentDetails;
  const summaryParts: string[] = [];
  if (equipmentCount > 0) summaryParts.push(`${equipmentCount} items`);
  if (details?.dumbbells?.available && details.dumbbells.maxWeight) {
    summaryParts.push(`DB up to ${details.dumbbells.maxWeight}lbs`);
  }
  if (details?.barbell?.available) {
    const total = (details.barbell.barWeight || 45) + (details.barbell.totalPlateWeight || 0);
    summaryParts.push(`Barbell up to ${total}lbs`);
  }

  if (editing) {
    return (
      <div className="mt-2 border rounded-lg p-3">
        {catalogLoaded ? (
          <HomeGymSetup
            initialEquipment={getInitialHomeEquipment()}
            initialDetails={details || {}}
            onComplete={handleComplete}
            onCancel={() => setEditing(false)}
            compact
          />
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      {summaryParts.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {summaryParts.join(" · ")}
        </p>
      )}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>
        <Dumbbell className="h-3 w-3 mr-1" />
        {equipmentCount > 0 ? "Edit Equipment" : "Set Up Equipment"}
      </Button>
    </div>
  );
}

function LocationModal({ open, onOpenChange, location, onSave, onDelete, userCity, userState }: { open: boolean; onOpenChange: (open: boolean) => void; location?: LocationData | null; onSave: (data: Partial<LocationData>) => Promise<void>; onDelete?: (id: string) => Promise<void>; userCity?: string; userState?: string }) {
  const [name, setName] = useState(location?.name || "");
  const [type, setType] = useState(location?.type || "commercial");
  const [address, setAddress] = useState(location?.address || "");
  const [isActive, setIsActive] = useState(location?.isActive ?? true);
  const [visibility, setVisibility] = useState(location?.visibility || "private");
  const [lat, setLat] = useState<number | undefined>(location?.lat);
  const [lng, setLng] = useState<number | undefined>(location?.lng);
  const [saving, setSaving] = useState(false);

  // Home equipment state
  const [showHomeSetup, setShowHomeSetup] = useState(false);
  const [homeEquipment, setHomeEquipment] = useState<string[]>([]);
  const [homeDetails, setHomeDetails] = useState<EquipmentDetails>({});
  const [equipmentCatalog, setEquipmentCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Place search state
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(true);
  const placeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const isHome = type === "home";

  useEffect(() => {
    if (open) {
      setName(location?.name || "");
      setType(location?.type || "commercial");
      setAddress(location?.address || "");
      setIsActive(location?.isActive ?? true);
      setVisibility(location?.visibility || "private");
      setLat(location?.lat);
      setLng(location?.lng);
      setPlaceSearch("");
      setPlaceResults([]);
      setShowHomeSetup(false);
      setHomeEquipment([]);
      setHomeDetails(location?.equipmentDetails || {});
    }
  }, [open, location]);

  // Fetch equipment catalog when needed for home gym setup
  useEffect(() => {
    if (isHome && open && !catalogLoaded) {
      fetch("/api/equipment/catalog")
        .then(r => r.ok ? r.json() : [])
        .then(data => { setEquipmentCatalog(data); setCatalogLoaded(true); })
        .catch(() => setCatalogLoaded(true));
    }
  }, [isHome, open, catalogLoaded]);

  // Debounced place search
  useEffect(() => {
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!placeSearch || placeSearch.length < 2 || !userCity) { setPlaceResults([]); return; }
    placeDebounceRef.current = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const params = new URLSearchParams({ q: placeSearch, city: userCity });
        if (userState) params.set("state", userState);
        const res = await fetch(`/api/places/search?${params}`);
        if (res.ok) { setPlaceResults(await res.json()); setShowPlaceResults(true); }
      } catch { /* silent */ }
      finally { setIsSearchingPlaces(false); }
    }, 500);
    return () => { if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current); };
  }, [placeSearch, userCity, userState]);

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    setName(place.name);
    setAddress(place.address);
    setType(place.type === "crossfit" ? "crossfit" : place.type === "studio" ? "other" : "commercial");
    setLat(place.lat);
    setLng(place.lng);
    setPlaceSearch("");
    setPlaceResults([]);
    setShowPlaceResults(false);
  };

  const handleHomeGymComplete = (equip: string[], details: EquipmentDetails) => {
    setHomeEquipment(equip);
    setHomeDetails(details);
    setShowHomeSetup(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a location name"); return; }
    setSaving(true);
    try {
      // For home type, convert home equipment IDs to catalog IDs
      let equipmentIds: string[] | undefined;
      let equipmentDetailsPayload: EquipmentDetails | undefined;
      if (isHome && homeEquipment.length > 0) {
        const catalogEquipmentNames: string[] = [];
        homeEquipment.forEach(id => {
          const names = HOME_EQUIPMENT_TO_CATALOG[id] || [];
          catalogEquipmentNames.push(...names);
        });
        equipmentIds = equipmentCatalog
          .filter(item => catalogEquipmentNames.some(n => n.toLowerCase() === item.name.toLowerCase()))
          .map(item => item.id);
        equipmentDetailsPayload = homeDetails;
      }

      await onSave({
        id: location?.id,
        name,
        type,
        address: isHome ? undefined : address,
        isActive,
        visibility,
        lat,
        lng,
        equipment: equipmentIds,
        equipmentDetails: equipmentDetailsPayload,
      });
      onOpenChange(false);
      toast.success(location ? "Location updated!" : "Location added!");
    }
    catch { toast.error("Failed to save location"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Workout Spot" : "Add Workout Spot"}</DialogTitle>
          <DialogDescription>Where do you train?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Name with place search */}
          <div className="space-y-2 relative">
            <Label>Name</Label>
            <div className="relative">
              <Input
                value={name || placeSearch}
                onChange={(e) => {
                  if (name) { setName(""); setAddress(""); setLat(undefined); setLng(undefined); }
                  setPlaceSearch(e.target.value);
                  setShowPlaceResults(true);
                }}
                placeholder={userCity ? "Search gyms or type a name..." : "e.g., Planet Fitness, Home Garage"}
              />
              {isSearchingPlaces && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {showPlaceResults && !name && placeResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                {placeResults.map((place, i) => (
                  <button key={`${place.name}-${i}`} onClick={() => handlePlaceSelect(place)} className="w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-accent text-left">
                    <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{place.name}</span>
                      {place.address && <span className="text-xs text-muted-foreground block truncate">{place.address}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOCATION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select>
          </div>

          {/* Address — hidden for home */}
          {!isHome && (
            <div className="space-y-2">
              <Label>Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St..." />
            </div>
          )}

          {/* Per-location visibility */}
          <div className="space-y-2">
            <Label>Who can see this spot?</Label>
            <div className="flex rounded-lg bg-muted p-1">
              {(["private", "public"] as const).map((opt) => (
                <button key={opt} onClick={() => setVisibility(opt)}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all",
                    visibility === opt ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {opt === "private" ? <><EyeOff className="h-3.5 w-3.5" />Private</> : <><Eye className="h-3.5 w-3.5" />Public</>}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {visibility === "public" ? "Anyone viewing your profile can see this location." : "Only you can see this location."}
            </p>
          </div>

          {/* Safety note for non-home */}
          {!isHome && visibility === "public" && (
            <div className="flex gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Activity className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-500">Only share public locations like gyms or parks.</p>
            </div>
          )}

          {/* Home gym equipment setup */}
          {isHome && !location && (
            <div className="space-y-2">
              <Label>Equipment</Label>
              {showHomeSetup ? (
                <div className="border rounded-lg p-3">
                  <HomeGymSetup
                    initialEquipment={homeEquipment}
                    initialDetails={homeDetails}
                    onComplete={handleHomeGymComplete}
                    onCancel={() => setShowHomeSetup(false)}
                    compact
                  />
                </div>
              ) : homeEquipment.length > 0 ? (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{homeEquipment.length} items selected</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowHomeSetup(true)}>Edit</Button>
                  </div>
                  {homeDetails.dumbbells?.available && (
                    <p className="text-xs text-muted-foreground">Dumbbells up to {homeDetails.dumbbells.maxWeight}lbs</p>
                  )}
                  {homeDetails.barbell?.available && (
                    <p className="text-xs text-muted-foreground">Barbell up to {(homeDetails.barbell.barWeight || 45) + (homeDetails.barbell.totalPlateWeight || 0)}lbs</p>
                  )}
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setShowHomeSetup(true)}>
                  <Dumbbell className="h-4 w-4 mr-2" />Set up home gym equipment
                </Button>
              )}
              <p className="text-xs text-muted-foreground">You can also set this up later from your profile.</p>
            </div>
          )}

          {/* Non-home equipment notice */}
          {!isHome && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Equipment is auto-configured for {LOCATION_TYPES.find(t => t.value === type)?.label || type} locations (~{(LOCATION_TEMPLATES[type] || []).length} items). AI will use the standard equipment list when generating workouts for this location.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {location && onDelete && <Button variant="destructive" size="sm" onClick={() => { onDelete(location.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LimitationModal({ open, onOpenChange, limitation, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; limitation?: LimitationData | null; onSave: (data: Partial<LimitationData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [type, setType] = useState(limitation?.type || "Injury");
  const [bodyPart, setBodyPart] = useState(limitation?.bodyPart || "");
  const [condition, setCondition] = useState(limitation?.condition || "");
  const [description, setDescription] = useState(limitation?.description || "");
  const [severity, setSeverity] = useState(limitation?.severity || "Moderate");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setType(limitation?.type || "Injury"); setBodyPart(limitation?.bodyPart || ""); setCondition(limitation?.condition || ""); setDescription(limitation?.description || ""); setSeverity(limitation?.severity || "Moderate"); } }, [open, limitation]);

  const handleSave = async () => {
    if (!condition.trim()) { toast.error("Please enter a condition name"); return; }
    setSaving(true);
    try { await onSave({ id: limitation?.id, type, bodyPart, condition, description, severity }); onOpenChange(false); toast.success(limitation ? "Limitation updated!" : "Limitation added!"); }
    catch { toast.error("Failed to save limitation"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{limitation ? "Edit Limitation" : "Add Limitation"}</DialogTitle><DialogDescription>Help AI understand your limitations</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LIMITATION_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Body Part</Label><Select value={bodyPart} onValueChange={setBodyPart}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{BODY_PARTS.map((bp) => (<SelectItem key={bp} value={bp}>{bp}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Condition</Label><Input placeholder="e.g., ACL tear, Rotator cuff strain" value={condition} onChange={(e) => setCondition(e.target.value)} /></div>
          <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITY_LEVELS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Notes (optional)</Label><Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {limitation && onDelete && <Button variant="destructive" onClick={() => { onDelete(limitation.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricsModal({ open, onOpenChange, metrics, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; metrics: MetricsData | null; onSave: (data: MetricsData) => Promise<void> }) {
  const [weight, setWeight] = useState(metrics?.weight?.toString() || "");
  const [heightFeet, setHeightFeet] = useState(metrics?.height ? Math.floor(metrics.height / 12).toString() : "");
  const [heightInches, setHeightInches] = useState(metrics?.height ? (metrics.height % 12).toString() : "");
  const [bodyFat, setBodyFat] = useState(metrics?.bodyFat?.toString() || "");
  const [fitnessLevel, setFitnessLevel] = useState(metrics?.fitnessLevel || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setWeight(metrics?.weight?.toString() || ""); setHeightFeet(metrics?.height ? Math.floor(metrics.height / 12).toString() : ""); setHeightInches(metrics?.height ? (metrics.height % 12).toString() : ""); setBodyFat(metrics?.bodyFat?.toString() || ""); setFitnessLevel(metrics?.fitnessLevel || ""); } }, [open, metrics]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const height = heightFeet || heightInches ? (parseInt(heightFeet || "0") * 12) + parseInt(heightInches || "0") : undefined;
      await onSave({ weight: weight ? parseFloat(weight) : undefined, height, bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, fitnessLevel: fitnessLevel || undefined });
      onOpenChange(false); toast.success("Metrics updated!");
    } catch { toast.error("Failed to save metrics"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Body Metrics</DialogTitle><DialogDescription>Your metrics are private</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Weight (lbs)</Label><Input type="number" placeholder="175" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div className="space-y-2"><Label>Height</Label><div className="grid grid-cols-2 gap-2"><div className="relative"><Input type="number" placeholder="5" value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ft</span></div><div className="relative"><Input type="number" placeholder="10" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">in</span></div></div></div>
          <div className="space-y-2"><Label>Body Fat % (optional)</Label><Input type="number" placeholder="15" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></div>
          <div className="space-y-2"><Label>Fitness Level</Label><Select value={fitnessLevel} onValueChange={setFitnessLevel}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem><SelectItem value="elite">Elite</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SportModal({ open, onOpenChange, sport, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; sport?: SportData | null; onSave: (data: Partial<SportData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [sportName, setSportName] = useState(sport?.sport || "");
  const [level, setLevel] = useState(sport?.level || "");
  const [yearsPlaying, setYearsPlaying] = useState(sport?.yearsPlaying?.toString() || "");
  const [position, setPosition] = useState(sport?.position || "");
  const [currentlyActive, setCurrentlyActive] = useState(sport?.currentlyActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setSportName(sport?.sport || ""); setLevel(sport?.level || ""); setYearsPlaying(sport?.yearsPlaying?.toString() || ""); setPosition(sport?.position || ""); setCurrentlyActive(sport?.currentlyActive ?? true); } }, [open, sport]);

  const handleSave = async () => {
    if (!sportName.trim()) { toast.error("Please enter a sport name"); return; }
    setSaving(true);
    try { await onSave({ id: sport?.id, sport: sportName, level: level || undefined, yearsPlaying: yearsPlaying ? parseInt(yearsPlaying) : undefined, position: position || undefined, currentlyActive }); onOpenChange(false); toast.success(sport ? "Sport updated!" : "Sport added!"); }
    catch { toast.error("Failed to save sport"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{sport ? "Edit Sport" : "Add Sport"}</DialogTitle><DialogDescription>What sports do you play?</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Sport</Label><Input placeholder="e.g., Basketball, Soccer" value={sportName} onChange={(e) => setSportName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Level</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="recreational">Recreational</SelectItem><SelectItem value="high_school">High School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="professional">Professional</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Years Playing</Label><Input type="number" placeholder="5" value={yearsPlaying} onChange={(e) => setYearsPlaying(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Position (optional)</Label><Input placeholder="e.g., Point Guard" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Currently Active</Label><Switch checked={currentlyActive} onCheckedChange={setCurrentlyActive} /></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {sport && onDelete && <Button variant="destructive" onClick={() => { onDelete(sport.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HandleModal({ open, onOpenChange, currentHandle, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; currentHandle?: string; onSave: (handle: string) => Promise<void> }) {
  const [handle, setHandle] = useState(currentHandle || "");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { 
    if (open) { 
      setHandle(currentHandle || ""); 
      setError(""); 
      setErrorType(null);
      setIsAvailable(currentHandle ? true : null);
      setSuggestions([]);
    } 
  }, [open, currentHandle]);

  const checkAvailability = async (handleToCheck: string) => {
    if (handleToCheck.length < 3) {
      setIsAvailable(null);
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/user/handle?check=${encodeURIComponent(handleToCheck)}`);
      const data = await res.json();
      
      if (data.available) {
        setIsAvailable(true);
        setError("");
        setErrorType(null);
        setSuggestions([]);
      } else {
        setIsAvailable(false);
        setError(data.error || "This handle is not available");
        setErrorType(data.errorType || null);
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Don't show error for network issues during typing
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    setError("");
    setErrorType(null);
    setIsAvailable(null);
    setSuggestions([]);

    // Clear existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Debounce the availability check
    if (cleaned.length >= 3) {
      checkTimeoutRef.current = setTimeout(() => {
        checkAvailability(cleaned);
      }, 400);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setHandle(suggestion);
    checkAvailability(suggestion);
  };

  const handleSave = async () => {
    if (!handle.trim()) { setError("Handle is required"); return; }
    if (handle.length < 3) { setError("Handle must be at least 3 characters"); return; }
    if (handle.length > 20) { setError("Handle must be 20 characters or less"); return; }
    if (!handle.match(/^[a-z][a-z0-9_]*$/)) { setError("Handle must start with a letter"); return; }
    if (isAvailable === false) { return; }
    
    setSaving(true);
    try { 
      await onSave(handle); 
      onOpenChange(false); 
      toast.success("Handle saved!"); 
    }
    catch (err: any) { 
      setError(err?.message || "Handle may already be taken"); 
    }
    finally { setSaving(false); }
  };

  const canSave = handle.length >= 3 && isAvailable !== false && !checking;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Your Handle</DialogTitle>
          <DialogDescription>Your unique username for invites and profile sharing</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Handle</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                value={handle} 
                onChange={(e) => handleChange(e.target.value)} 
                placeholder="yourhandle" 
                className={cn(
                  "pl-9 pr-10",
                  isAvailable === true && "border-success focus-visible:ring-success",
                  isAvailable === false && "border-destructive focus-visible:ring-destructive"
                )} 
                maxLength={20} 
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!checking && isAvailable === true && <Check className="h-4 w-4 text-success" />}
                {!checking && isAvailable === false && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <p className={cn(
                "text-sm",
                errorType === "profanity" ? "text-destructive font-medium" : "text-destructive"
              )}>
                {error}
              </p>
            )}
            
            {/* Suggestions when taken */}
            {suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Try one of these instead:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Success message */}
            {isAvailable === true && !currentHandle && (
              <p className="text-sm text-success">This handle is available!</p>
            )}
            
            {/* Help text */}
            <p className="text-xs text-muted-foreground">
              Must start with a letter. Letters, numbers, and underscores only. 3-20 characters.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Saving..." : "Save Handle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Display Name Modal
function DisplayNameModal({ 
  open, 
  onOpenChange, 
  currentName, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  currentName: string; 
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    if (open) { 
      setName(currentName); 
    } 
  }, [open, currentName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Display Name</DialogTitle>
          <DialogDescription>This is how others will see your name</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/50 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Visibility Badge Component for per-field privacy control
function VisibilityBadge({ 
  visibility, 
  onChange 
}: { 
  visibility: "public" | "circles" | "private"; 
  onChange: (v: "public" | "circles" | "private") => void;
}) {
  const options = [
    { value: "public" as const, label: "🌐 Public", description: "Anyone can see" },
    { value: "circles" as const, label: "👥 Circles", description: "Circle members only" },
    { value: "private" as const, label: "🔒 Private", description: "Only you" },
  ];

  const current = options.find(o => o.value === visibility) || options[0];

  return (
    <Select value={visibility} onValueChange={(v: "public" | "circles" | "private") => onChange(v)}>
      <SelectTrigger className="w-auto h-7 text-xs px-2 gap-1">
        <SelectValue>{current.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex flex-col">
              <span>{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Bio Modal with moderation
function BioModal({ 
  open, 
  onOpenChange, 
  currentBio, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  currentBio?: string; 
  onSave: (bio: string) => Promise<void>;
}) {
  const [bio, setBio] = useState(currentBio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const maxLength = 160;

  useEffect(() => { 
    if (open) { 
      setBio(currentBio || ""); 
      setError(""); 
    } 
  }, [open, currentBio]);

  const handleSave = async () => {
    if (bio.length > maxLength) {
      setError(`Bio must be ${maxLength} characters or less`);
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      // Check for moderation via API
      const moderationRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      
      if (!moderationRes.ok) {
        const data = await moderationRes.json();
        if (data.error?.includes("inappropriate") || data.error?.includes("profanity")) {
          setError("Your bio contains inappropriate content. Please revise.");
          return;
        }
        throw new Error(data.error || "Failed to save bio");
      }
      
      onOpenChange(false);
      toast.success("Bio saved!");
      // Refresh handled by parent
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to save bio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bio</DialogTitle>
          <DialogDescription>Tell others about yourself</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bio</Label>
              <span className={cn(
                "text-xs",
                bio.length > maxLength ? "text-destructive" : "text-muted-foreground"
              )}>
                {bio.length}/{maxLength}
              </span>
            </div>
            <Textarea 
              value={bio} 
              onChange={(e) => {
                setBio(e.target.value);
                setError("");
              }}
              placeholder="Fitness enthusiast, gym rat, weekend warrior..."
              className="resize-none"
              rows={3}
              maxLength={maxLength + 10}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Keep it clean! Bios are checked for inappropriate content.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || bio.length > maxLength}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Location Edit Modal - Enhanced with privacy controls and workout location
const US_STATES_MAP: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington, D.C."
};

const US_STATES_LIST = Object.entries(US_STATES_MAP).map(([value, label]) => ({ value, label }));

const LOCATION_VISIBILITY_OPTIONS_MODAL = [
  { value: "none", label: "No one", description: "Location hidden" },
  { value: "state", label: "State only", description: "Shows state name" },
  { value: "city", label: "City & State", description: "Shows city, state" },
  { value: "full", label: "Full details", description: "Shows workout spot" },
];

interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

function WorkoutSpotSearch({
  city,
  state,
  workoutLocation,
  workoutLocationAddress,
  workoutLocationType,
  onLocationChange,
  onAddressChange,
  onTypeChange,
  onLatLngChange,
}: {
  city: string;
  state: string;
  workoutLocation: string;
  workoutLocationAddress: string;
  workoutLocationType: string;
  onLocationChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onLatLngChange: (lat: number | null, lng: number | null) => void;
}) {
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const placeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!placeSearch || placeSearch.length < 2 || !city) {
      setPlaceResults([]);
      return;
    }
    placeDebounceRef.current = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const params = new URLSearchParams({ q: placeSearch, city });
        if (state) params.set("state", state);
        const res = await fetch(`/api/places/search?${params}`);
        if (res.ok) {
          setPlaceResults(await res.json());
          setShowResults(true);
        }
      } catch { /* silent */ }
      finally { setIsSearchingPlaces(false); }
    }, 500);
    return () => { if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current); };
  }, [placeSearch, city, state]);

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    onLocationChange(place.name);
    onAddressChange(place.address);
    onTypeChange(place.type === "crossfit" ? "gym" : place.type);
    onLatLngChange(place.lat, place.lng);
    setPlaceSearch("");
    setPlaceResults([]);
    setShowResults(false);
  };

  const hasCity = !!city;

  return (
    <div className="space-y-3 pl-4 border-l-2 border-brand/30">
      <div className="space-y-2 relative">
        <Label>Location Name</Label>
        <div className="relative">
          <Input
            value={workoutLocation || placeSearch}
            onChange={(e) => {
              if (workoutLocation) {
                onLocationChange("");
                onAddressChange("");
                onLatLngChange(null, null);
              }
              setPlaceSearch(e.target.value);
              setShowResults(true);
            }}
            placeholder={hasCity ? "Search gyms, CrossFit boxes..." : "Enter a city first to search"}
          />
          {isSearchingPlaces && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {/* Place search results */}
        {showResults && !workoutLocation && placeResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-[calc(100%-1rem)] rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
            {placeResults.map((place, i) => (
              <button
                key={`${place.name}-${i}`}
                onClick={() => handlePlaceSelect(place)}
                className="w-full flex items-start gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              >
                <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-medium block truncate">{place.name}</span>
                  {place.address && (
                    <span className="text-xs text-muted-foreground block truncate">{place.address}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {!hasCity && placeSearch.length >= 2 && (
          <p className="text-xs text-muted-foreground">Set your city above to search for nearby gyms</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Address (optional)</Label>
        <Input
          value={workoutLocationAddress}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="123 Main St..."
        />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={workoutLocationType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gym">Gym</SelectItem>
            <SelectItem value="crossfit">CrossFit Box</SelectItem>
            <SelectItem value="park">Park</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="home_gym">Home Gym</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Reverse lookup: state full name → abbreviation
const US_STATES_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES_MAP).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

function parseCompositeCity(raw: string): { city: string; state: string; country: string } {
  if (!raw || !raw.includes(",")) return { city: raw, state: "", country: "" };
  const parts = raw.split(",").map(s => s.trim());
  if (parts.length >= 3) {
    const stateAbbr = US_STATES_REVERSE[parts[1].toLowerCase()] || "";
    return { city: parts[0], state: stateAbbr, country: parts[2] };
  }
  if (parts.length === 2) {
    const stateAbbr = US_STATES_REVERSE[parts[1].toLowerCase()] || "";
    return { city: parts[0], state: stateAbbr, country: stateAbbr ? "United States" : "" };
  }
  return { city: raw, state: "", country: "" };
}

interface CitySearchResult {
  id: number;
  label: string;
  city: string;
  state: string;
  country: string;
}

function LocationEditModal({
  open,
  onOpenChange,
  profile,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfilePageProps["profile"];
  onSave: (data: {
    city: string;
    state: string;
    country: string;
    locationVisibility: string;
  }) => Promise<void>;
}) {
  const initLocation = () => {
    const rawCity = profile?.city || "";
    const rawState = profile?.state || "";
    if (rawCity && !rawState && rawCity.includes(",")) {
      return parseCompositeCity(rawCity);
    }
    return { city: rawCity, state: rawState, country: profile?.country || "" };
  };

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [locationVisibility, setLocationVisibility] = useState(profile?.locationVisibility || "city");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (!citySearch || citySearch.length < 3) { setCityResults([]); return; }
    cityDebounceRef.current = setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(citySearch)}`);
        if (res.ok) setCityResults(await res.json());
      } catch { /* silent */ }
      finally { setIsSearchingCity(false); }
    }, 400);
    return () => { if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current); };
  }, [citySearch]);

  useEffect(() => {
    if (open) {
      const loc = initLocation();
      setCity(loc.city);
      setState(loc.state);
      setCountry(loc.country);
      setCitySearch("");
      setCityResults([]);
      setLocationVisibility(profile?.locationVisibility || "city");
    }
  }, [open, profile]);

  const handleCitySelect = (result: CitySearchResult) => {
    setCity(result.city);
    const stateAbbr = US_STATES_REVERSE[result.state.toLowerCase()] || result.state;
    setState(stateAbbr);
    setCountry(result.country);
    setCitySearch("");
    setCityResults([]);
  };

  const handleSave = async () => {
    if (city && !state) { toast.error("Please select a state"); return; }
    setSaving(true);
    try {
      await onSave({ city, state, country, locationVisibility });
      onOpenChange(false);
      toast.success("Location saved!");
    } catch { toast.error("Failed to save location"); }
    finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave({ city: "", state: "", country: "US", locationVisibility: "city" });
      onOpenChange(false);
      toast.success("Location removed");
    } catch { toast.error("Failed to remove location"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Edit Location</DialogTitle>
          <DialogDescription>Your city and privacy settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2 relative">
                <Label>City {city && <span className="text-destructive">*</span>}</Label>
                <div className="relative">
                  <Input
                    value={city || citySearch}
                    onChange={(e) => { setCity(""); setState(""); setCountry(""); setCitySearch(e.target.value); }}
                    placeholder="Start typing your city..."
                  />
                  {isSearchingCity && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {!city && cityResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
                    {cityResults.map((result) => {
                      const display = [result.city, result.state, result.country].filter(Boolean).join(", ") || result.label;
                      return (
                        <button key={result.id} onClick={() => handleCitySelect(result)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{display}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>State {city && <span className="text-destructive">*</span>}</Label>
                  <Select value={state} onValueChange={setState}><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent>{US_STATES_LIST.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Who can see your city?</h4>
            <div className="grid grid-cols-2 gap-2">
              {LOCATION_VISIBILITY_OPTIONS_MODAL.map((option) => (
                <button key={option.value} type="button" onClick={() => setLocationVisibility(option.value)}
                  className={cn("p-3 rounded-lg border text-left transition-colors", locationVisibility === option.value ? "border-brand bg-brand/10" : "border-muted hover:border-brand/50")}>
                  <span className="font-medium text-sm">{option.label}</span>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {(profile?.city || profile?.state) && (
            <Button variant="ghost" onClick={handleClear} disabled={saving} className="text-destructive hover:text-destructive">Remove Location</Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinksModal({ open, onOpenChange, socialLinks, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; socialLinks: { instagram?: string; tiktok?: string; youtube?: string; twitter?: string; linkedin?: string }; onSave: (links: typeof socialLinks) => Promise<void> }) {
  const [instagram, setInstagram] = useState(socialLinks.instagram || "");
  const [tiktok, setTiktok] = useState(socialLinks.tiktok || "");
  const [youtube, setYoutube] = useState(socialLinks.youtube || "");
  const [twitter, setTwitter] = useState(socialLinks.twitter || "");
  const [linkedin, setLinkedin] = useState(socialLinks.linkedin || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setInstagram(socialLinks.instagram || ""); setTiktok(socialLinks.tiktok || ""); setYoutube(socialLinks.youtube || ""); setTwitter(socialLinks.twitter || ""); setLinkedin(socialLinks.linkedin || ""); } }, [open, socialLinks]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ instagram: instagram || undefined, tiktok: tiktok || undefined, youtube: youtube || undefined, twitter: twitter || undefined, linkedin: linkedin || undefined }); onOpenChange(false); toast.success("Social links saved!"); }
    catch { toast.error("Failed to save social links"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Social Links</DialogTitle><DialogDescription>Connect your social profiles</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label className="flex items-center gap-2"><Instagram className="h-4 w-4" />Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="username" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>TikTok</Label><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="username" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Youtube className="h-4 w-4" />YouTube</Label><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="channel URL or handle" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" />LinkedIn</Label><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="username or profile URL" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Twitter className="h-4 w-4" />X (Twitter)</Label><Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="username" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailModal({ open, onOpenChange, currentEmail }: { open: boolean; onOpenChange: (open: boolean) => void; currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setNewEmail(""); setPassword(""); setError(""); } }, [open]);

  const handleSave = async () => {
    if (!newEmail.trim()) { setError("Please enter a new email"); return; }
    if (!newEmail.includes("@")) { setError("Please enter a valid email"); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/user/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change email");
      }
      toast.success("Verification email sent! Check your inbox.");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>Update your email address</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Email</Label>
            <Input value={currentEmail} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>New Email</Label>
            <Input 
              type="email" 
              placeholder="new@email.com" 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : "Send Verification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordResetModal({ open, onOpenChange, email }: { open: boolean; onOpenChange: (open: boolean) => void; email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (open) { setSent(false); } }, [open]);

  const handleSendReset = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to send reset email");
      setSent(true);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>We&apos;ll send a reset link to your email</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Check your email!</p>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a password reset link to <span className="font-medium">{email}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click below to receive a password reset link at this email address.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          {sent ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSendReset} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : "Send Reset Link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== LOCATION DISPLAY HELPER ====================
function formatLocationDisplay(profile: ProfilePageProps["profile"]): string | null {
  if (!profile) return null;

  const visibility = profile.locationVisibility || "city";

  if (visibility === "none") {
    return null;
  }

  if (visibility === "state" && profile.state) {
    // Return full state name
    const stateNames: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
      DC: "Washington, D.C."
    };
    return stateNames[profile.state] || profile.state;
  }

  if (visibility === "city" && (profile.city || profile.state)) {
    if (profile.city && profile.state) {
      return `${profile.city}, ${profile.state}`;
    }
    return profile.city || profile.state || null;
  }

  if (visibility === "full") {
    const cityState = profile.city && profile.state
      ? `${profile.city}, ${profile.state}`
      : (profile.city || profile.state);

    if (profile.workoutLocation) {
      return cityState ? `${profile.workoutLocation} - ${cityState}` : profile.workoutLocation;
    }
    return cityState || null;
  }

  // Default fallback - show city, state
  if (profile.city || profile.state) {
    if (profile.city && profile.state) {
      return `${profile.city}, ${profile.state}`;
    }
    return profile.city || profile.state || null;
  }

  return null;
}

// ==================== MAIN COMPONENT ====================
export function ProfilePage({ user, profile, metrics, limitations, skills, locations, sports, circles, goals, workoutPlans, personalRecords, badges, featuredBadges, completeness }: ProfilePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCompleteness, setShowCompleteness] = useState(completeness.overallPercent < 100);

  // Achievement modal state
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<EarnedBadge[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Modal states
  const [skillModal, setSkillModal] = useState<{ open: boolean; skill?: SkillData | null }>({ open: false });
  const [prModal, setPrModal] = useState<{ open: boolean; pr?: PRData | null }>({ open: false });
  const [locationModal, setLocationModal] = useState<{ open: boolean; location?: LocationData | null }>({ open: false });
  const [limitationModal, setLimitationModal] = useState<{ open: boolean; limitation?: LimitationData | null }>({ open: false });
  const [metricsModal, setMetricsModal] = useState(false);
  const [sportModal, setSportModal] = useState<{ open: boolean; sport?: SportData | null }>({ open: false });
  const [handleModal, setHandleModal] = useState(false);
  const [displayNameModal, setDisplayNameModal] = useState(false);
  const [socialLinksModal, setSocialLinksModal] = useState(false);
  const [bioModal, setBioModal] = useState(false);
  const [locationEditModal, setLocationEditModal] = useState(false);
  const [changeEmailModal, setChangeEmailModal] = useState(false);
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Connections state
  const [connectionsSheet, setConnectionsSheet] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);

  // Profile picture upload state
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // Accordion state
  const sectionFromUrl = searchParams.get("section") || "";
  const [openSections, setOpenSections] = useState<string[]>(sectionFromUrl ? [sectionFromUrl] : []);

  useEffect(() => {
    if (sectionFromUrl) {
      setOpenSections((prev) => prev.includes(sectionFromUrl) ? prev : [...prev, sectionFromUrl]);
      setTimeout(() => {
        document.querySelector(`[data-section="${sectionFromUrl}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Clear the URL param after scrolling to prevent re-scroll on navigation
        const url = new URL(window.location.href);
        url.searchParams.delete("section");
        window.history.replaceState({}, "", url.pathname);
      }, 100);
    }
  }, [sectionFromUrl]);

  // Fetch connection count on mount
  useEffect(() => {
    const fetchConnectionCount = async () => {
      try {
        const response = await fetch("/api/connections/count");
        if (response.ok) {
          const data = await response.json();
          setConnectionCount(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch connection count:", error);
      }
    };
    fetchConnectionCount();
  }, []);

  const displayName = profile?.displayName || user.name;
  const profileImage = profile?.profilePicture || user.image;
  const recommendations = generateRecommendations(completeness);

  // API Handlers
  const handleSaveSkill = async (data: Partial<SkillData>) => { const response = await fetch(data.id ? `/api/user/skills/${data.id}` : "/api/user/skills", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteSkill = async (id: string) => { await fetch(`/api/user/skills/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSavePR = async (data: Partial<PRData>) => {
    const response = await fetch(data.id ? `/api/user/prs/${data.id}` : "/api/user/prs", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error();
    // Check for newly earned badges after PR is saved
    try {
      const badgeResponse = await fetch("/api/badges/check", { method: "POST" });
      if (badgeResponse.ok) {
        const { newBadges } = await badgeResponse.json();
        if (newBadges && newBadges.length > 0) {
          setNewlyEarnedBadges(newBadges);
          setShowAchievementModal(true);
        }
      }
    } catch { /* Badge check failed, continue */ }
    router.refresh();
  };
  const handleDeletePR = async (id: string) => { await fetch(`/api/user/prs/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveLocation = async (data: Partial<LocationData>) => {
    const payload: Record<string, unknown> = { ...data };
    // Map lat/lng to API field names
    if (data.lat !== undefined) { payload.workoutLocationLat = data.lat; delete payload.lat; }
    if (data.lng !== undefined) { payload.workoutLocationLng = data.lng; delete payload.lng; }
    const response = await fetch(data.id ? `/api/locations/${data.id}` : "/api/locations", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error();
    router.refresh();
  };
  const handleDeleteLocation = async (id: string) => { await fetch(`/api/locations/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveLocationEquipment = async (locationId: string, equipment: string[], details: EquipmentDetails) => {
    const response = await fetch(`/api/locations/${locationId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ equipment, equipmentDetails: details }) });
    if (!response.ok) throw new Error();
    router.refresh();
  };
  const handleSaveLimitation = async (data: Partial<LimitationData>) => { const response = await fetch(data.id ? `/api/user/limitations/${data.id}` : "/api/user/limitations", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteLimitation = async (id: string) => { await fetch(`/api/user/limitations/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveMetrics = async (data: MetricsData) => { const response = await fetch("/api/user/metrics", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleSaveSport = async (data: Partial<SportData>) => { const response = await fetch(data.id ? `/api/user/sports/${data.id}` : "/api/user/sports", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteSport = async (id: string) => { await fetch(`/api/user/sports/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveHandle = async (handle: string) => { 
    const response = await fetch("/api/user/handle", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ handle }) 
    }); 
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save handle");
    }
    router.refresh(); 
  };
  const handleSaveSocialLinks = async (links: { instagram?: string; tiktok?: string; youtube?: string; twitter?: string; linkedin?: string }) => { const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialLinks: links }) }); if (!response.ok) throw new Error(); router.refresh(); };
  
  const handleSaveDisplayName = async (name: string) => {
    const response = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (!response.ok) throw new Error();
    router.refresh();
  };
  
  const handleSaveBio = async (bio: string) => {
    const response = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save bio");
    }
    router.refresh();
  };

  const handleSaveProfileLocation = async (data: {
    city: string;
    state: string;
    country: string;
    locationVisibility: string;
  }) => {
    const response = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error();
    router.refresh();
  };

  const updateFieldVisibility = async (field: string, visibility: "public" | "circles" | "private") => {
    try {
      const currentFieldVisibility = profile?.fieldVisibility || {};
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fieldVisibility: { ...currentFieldVisibility, [field]: visibility } 
        }),
      });
      if (response.ok) {
        router.refresh();
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} visibility updated`);
      }
    } catch {
      toast.error("Failed to update visibility");
    }
  };

  const copyProfileLink = () => {
    if (!profile?.handle) {
      // Prompt user to create a handle first
      setHandleModal(true);
      toast.info("Create a handle first to share your profile!");
      return;
    }
    const url = `${window.location.origin}/@${profile.handle}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied! Add it to your Linktree or bio.");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      // Redirect to login page after sign out
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingProfilePic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Profile picture updated!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingProfilePic(false);
      // Reset file input
      if (profilePicInputRef.current) {
        profilePicInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-32">
      {/* Profile Completeness */}
      {showCompleteness && (
        <CompletenessCard overallPercent={completeness.overallPercent} sections={completeness.sections} sectionStatuses={completeness.sectionStatuses} recommendations={completeness.recommendations} onDismiss={() => setShowCompleteness(false)} />
      )}

      {/* ==================== PROFILE HEADER ==================== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Profile Picture with Edit Overlay */}
            <div className="relative group">
              <input
                ref={profilePicInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleProfilePicUpload}
              />
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileImage} />
                <AvatarFallback className="text-xl bg-brand/20 text-brand">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => profilePicInputRef.current?.click()}
                disabled={uploadingProfilePic}
                className="absolute bottom-0 right-0 flex items-center justify-center bg-black/60 rounded-full h-7 w-7 shadow-sm"
              >
                {uploadingProfilePic ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h2 className="text-xl font-bold truncate">{displayName}</h2>

              {/* Handle & Location on same line */}
              <div className="flex items-center gap-2 text-sm mt-0.5 flex-wrap">
                {profile?.handle ? (
                  <span className="text-brand">@{profile.handle}</span>
                ) : (
                  <button
                    onClick={() => setHandleModal(true)}
                    className="text-muted-foreground hover:text-brand transition-colors"
                  >
                    + Add handle
                  </button>
                )}
                {(profile?.handle && formatLocationDisplay(profile)) && (
                  <span className="text-muted-foreground">·</span>
                )}
                {formatLocationDisplay(profile) ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{formatLocationDisplay(profile)}
                  </span>
                ) : (
                  <button
                    onClick={() => setLocationEditModal(true)}
                    className="text-muted-foreground hover:text-brand transition-colors flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />Add location
                  </button>
                )}
              </div>
            </div>

            {/* Edit menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Edit className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDisplayNameModal(true)}>
                  <User className="h-4 w-4 mr-2" />Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setHandleModal(true)}>
                  <AtSign className="h-4 w-4 mr-2" />Edit Handle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocationEditModal(true)}>
                  <MapPin className="h-4 w-4 mr-2" />Edit Location
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Social Links - prominent section right after header */}
          <div className="mt-4">
            {(profile?.socialLinks?.instagram || profile?.socialLinks?.tiktok || profile?.socialLinks?.youtube || profile?.socialLinks?.twitter || profile?.socialLinks?.linkedin) ? (
              <div className="flex items-center gap-2 flex-wrap">
                {profile?.socialLinks?.instagram && (
                  <a href={`https://instagram.com/${profile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-sm transition-colors">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-muted-foreground">@{profile.socialLinks.instagram}</span>
                  </a>
                )}
                {profile?.socialLinks?.tiktok && (
                  <a href={`https://tiktok.com/@${profile.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                    <span className="text-muted-foreground">@{profile.socialLinks.tiktok}</span>
                  </a>
                )}
                {profile?.socialLinks?.youtube && (
                  <a href={profile.socialLinks.youtube.startsWith("http") ? profile.socialLinks.youtube : `https://youtube.com/@${profile.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-sm transition-colors">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">{profile.socialLinks.youtube}</span>
                  </a>
                )}
                {profile?.socialLinks?.twitter && (
                  <a href={`https://x.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors">
                    <Twitter className="h-4 w-4" />
                    <span className="text-muted-foreground">@{profile.socialLinks.twitter}</span>
                  </a>
                )}
                {profile?.socialLinks?.linkedin && (
                  <a href={profile.socialLinks.linkedin.startsWith("http") ? profile.socialLinks.linkedin : `https://linkedin.com/in/${profile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-sm transition-colors">
                    <Linkedin className="h-4 w-4 text-blue-500" />
                    <span className="text-muted-foreground">{profile.socialLinks.linkedin}</span>
                  </a>
                )}
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSocialLinksModal(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setSocialLinksModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 hover:border-brand hover:bg-brand/5 transition-colors w-full"
              >
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Instagram className="h-3 w-3 text-pink-500" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Youtube className="h-3 w-3 text-red-500" />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">Add your social links</span>
                <Plus className="h-4 w-4 text-muted-foreground ml-auto" />
              </button>
            )}
          </div>

          {/* Bio Section */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Bio</span>
              </div>
              <VisibilityBadge
                visibility={profile?.fieldVisibility?.bio || "public"}
                onChange={(v) => updateFieldVisibility("bio", v)}
              />
            </div>
            {profile?.bio ? (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground flex-1">{profile.bio}</p>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setBioModal(true)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setBioModal(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add a bio (160 chars max)
              </Button>
            )}
          </div>

          {/* Share Link CTA */}
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium">Share your profile</span>
              </div>
              <Button variant="ghost" size="sm" onClick={copyProfileLink}><Copy className="h-4 w-4 mr-1" />Copy Link</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Add this link to your Instagram, TikTok, or Linktree bio</p>
          </div>

          {/* Profile Visibility - last item */}
          <div className="mt-3 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Profile Visibility</span>
            </div>
            {/* Segmented toggle */}
            <div className="flex gap-2 mb-3">
              {(["private", "public"] as const).map((option) => {
                const isActive = (profile?.visibility || "private") === option;
                return (
                  <button
                    key={option}
                    onClick={async () => {
                      if (isActive) return;
                      try {
                        const res = await fetch("/api/user/profile", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ visibility: option }),
                        });
                        if (res.ok) {
                          router.refresh();
                          toast.success(option === "public" ? "Profile is now public" : "Profile is now private");
                        }
                      } catch {
                        toast.error("Failed to update privacy settings");
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border-2",
                      isActive
                        ? "border-brand bg-brand/10 text-foreground"
                        : "border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {option === "private" ? (
                      <><EyeOff className="h-4 w-4" /> Private</>
                    ) : (
                      <><Eye className="h-4 w-4" /> Public</>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.visibility === "public"
                ? "Anyone with your link can view your handle, age, bio, sports, PRs, and achievements."
                : "Only members of your circles can see your full profile. Others see just your name and photo."}
            </p>
          </div>

        </CardContent>
      </Card>

      {/* ==================== QUICK STATS ==================== */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => {
            setOpenSections((prev) => prev.includes("circles") ? prev : [...prev, "circles"]);
            setTimeout(() => {
              document.querySelector('[data-section="circles"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }}
          className="text-left"
        >
          <Card className="h-full hover:border-brand/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{circles.length}</p>
              <p className="text-xs text-muted-foreground">Circles</p>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setConnectionsSheet(true)} className="text-left">
          <Card className="h-full hover:border-brand/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-brand">{connectionCount}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => router.push("/workouts")}
          className="text-left"
        >
          <Card className="h-full hover:border-brand/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{workoutPlans.length}</p>
              <p className="text-xs text-muted-foreground">Workouts</p>
            </CardContent>
          </Card>
        </button>
        <button
          onClick={() => router.push("/you/achievements")}
          className="text-left"
        >
          <Card className="h-full hover:border-brand/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{badges.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Featured Badges Display */}
      {featuredBadges.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Featured Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {featuredBadges.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border",
                    badge.badge.tier === "platinum" && "bg-cyan-500/10 border-cyan-500/30",
                    badge.badge.tier === "gold" && "bg-yellow-500/10 border-yellow-500/30",
                    badge.badge.tier === "silver" && "bg-gray-400/10 border-gray-400/30",
                    badge.badge.tier === "bronze" && "bg-amber-600/10 border-amber-600/30"
                  )}
                  title={badge.badge.description}
                >
                  <span className="text-xl">{badge.badge.icon || "🏆"}</span>
                  <span className="text-sm font-medium">{badge.badge.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== ACCORDION SECTIONS ==================== */}
      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
        {/* Badges & Achievements */}
        {badges.length > 0 && (
          <AccordionItem value="badges" data-section="badges" className="!border rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <span className="font-medium text-sm">Badges & Achievements</span>
                <Badge variant="secondary" className="ml-auto mr-2 text-xs">{badges.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 pt-2">
                {/* Group badges by category */}
                {Object.entries(
                  badges.reduce((acc, badge) => {
                    const category = badge.badge.category || "other";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(badge);
                    return acc;
                  }, {} as Record<string, BadgeData[]>)
                ).map(([category, categoryBadges]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border",
                            badge.badge.tier === "platinum" && "bg-cyan-500/10 border-cyan-500/30",
                            badge.badge.tier === "gold" && "bg-yellow-500/10 border-yellow-500/30",
                            badge.badge.tier === "silver" && "bg-gray-400/10 border-gray-400/30",
                            badge.badge.tier === "bronze" && "bg-amber-600/10 border-amber-600/30"
                          )}
                        >
                          <span className="text-xl">{badge.badge.icon || "🏆"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{badge.badge.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{badge.badge.tier}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                  onClick={() => router.push("/you/achievements")}
                >
                  View All Achievements
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Body & Health */}
        <AccordionItem value="health" data-section="health" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-energy/20"><Heart className="h-4 w-4 text-energy" /></div>
              <span className="font-medium text-sm">Body & Health</span>
              <Badge variant="outline" className="ml-auto mr-2 text-xs">Private</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Metrics</span><Button variant="ghost" size="sm" onClick={() => setMetricsModal(true)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button></div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.weight || "—"}</p><p className="text-xs text-muted-foreground">lbs</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.height ? `${Math.floor(metrics.height / 12)}'${metrics.height % 12}"` : "—"}</p><p className="text-xs text-muted-foreground">height</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.bodyFat ? `${metrics.bodyFat}%` : "—"}</p><p className="text-xs text-muted-foreground">body fat</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold capitalize">{metrics?.fitnessLevel ? metrics.fitnessLevel.slice(0, 3) : "—"}</p><p className="text-xs text-muted-foreground">level</p></div>
              </div>
              {/* Training Schedule */}
              {(profile?.workoutPreferences?.workoutDays?.length || profile?.workoutPreferences?.workoutDuration || profile?.workoutPreferences?.trainingFrequency) && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Training Schedule</span>
                  <div className="flex flex-wrap gap-2">
                    {profile?.workoutPreferences?.trainingFrequency && (
                      <Badge variant="outline" className="text-xs">{profile.workoutPreferences.trainingFrequency}x/week</Badge>
                    )}
                    {profile?.workoutPreferences?.workoutDuration && (
                      <Badge variant="outline" className="text-xs">
                        {profile.workoutPreferences.workoutDuration <= 30 ? "15–30 min" :
                         profile.workoutPreferences.workoutDuration <= 60 ? "45–60 min" :
                         profile.workoutPreferences.workoutDuration <= 90 ? "75–90 min" : "Varies"}
                      </Badge>
                    )}
                    {profile?.workoutPreferences?.activityLevel?.jobType && (
                      <Badge variant="outline" className="text-xs capitalize">{profile.workoutPreferences.activityLevel.jobType.replace("_", " ")} activity</Badge>
                    )}
                  </div>
                  {profile?.workoutPreferences?.workoutDays && profile.workoutPreferences.workoutDays.length > 0 && (
                    <div className="flex gap-1.5">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                        const dayIds = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                        const isActive = profile?.workoutPreferences?.workoutDays?.includes(dayIds[i]);
                        return (
                          <div key={day} className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium", isActive ? "bg-brand/20 text-brand border border-brand/30" : "bg-muted text-muted-foreground")}>
                            {day.slice(0, 1)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Limitations</span><Button variant="ghost" size="sm" onClick={() => setLimitationModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {limitations.length === 0 ? <p className="text-sm text-muted-foreground">No limitations added</p> : (
                <div className="space-y-2">{limitations.map((l) => (<ItemCard key={l.id} onEdit={() => setLimitationModal({ open: true, limitation: l })} onDelete={() => handleDeleteLimitation(l.id)} itemName={l.condition || l.type} itemType="limitation"><div className="flex items-center gap-2"><span className="text-sm font-medium">{l.condition || l.type}</span>{l.bodyPart && <span className="text-xs text-muted-foreground">({l.bodyPart})</span>}{l.severity && <Badge variant="outline" className="text-xs ml-auto">{l.severity}</Badge>}</div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Goals */}
        <AccordionItem value="goals" data-section="goals" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20"><Target className="h-4 w-4 text-brand" /></div>
              <span className="font-medium text-sm">Goals</span>
              {goals.length > 0 && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{goals.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 pt-2">
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No goals set yet</p>
              ) : (
                goals.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 shrink-0">
                      <Target className="h-4 w-4 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate capitalize">{g.title.replace(/_/g, " ")}</p>
                      {g.targetValue && g.unit && (
                        <p className="text-xs text-muted-foreground">Target: {g.targetValue} {g.unit}</p>
                      )}
                    </div>
                    {g.category && (
                      <Badge variant="outline" className="text-xs capitalize shrink-0">{g.category}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Skills & PRs */}
        <AccordionItem value="skills" data-section="skills" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20"><Trophy className="h-4 w-4 text-success" /></div>
              <span className="font-medium text-sm">Skills & PRs</span>
              {(skills.length > 0 || personalRecords.length > 0) && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{skills.length + personalRecords.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              {/* Visibility Control */}
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Who can see your skills & PRs?</span>
                <VisibilityBadge 
                  visibility={profile?.fieldVisibility?.skills || "public"} 
                  onChange={(v) => updateFieldVisibility("skills", v)}
                />
              </div>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Skills</span><Button variant="ghost" size="sm" onClick={() => setSkillModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills added</p> : (
                <div className="space-y-2">{skills.map((s) => (<ItemCard key={s.id} onEdit={() => setSkillModal({ open: true, skill: s })} onDelete={() => handleDeleteSkill(s.id)} itemName={s.name} itemType="skill"><div className="flex items-center gap-2"><span className="text-sm font-medium">{s.name}</span><Badge variant="secondary" className="text-xs">{s.category}</Badge><Badge className={cn("text-xs ml-auto", s.currentStatus === "mastered" && "bg-energy text-white", s.currentStatus === "achieved" && "bg-success text-white")}>{SKILL_STATUSES.find((st) => st.value === s.currentStatus)?.label || s.currentStatus}</Badge></div></ItemCard>))}</div>
              )}
              <div className="flex items-center justify-between pt-2"><span className="text-sm font-medium">Personal Records</span><Button variant="ghost" size="sm" onClick={() => setPrModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {personalRecords.length === 0 ? <p className="text-sm text-muted-foreground">No PRs added</p> : (
                <div className="space-y-2">{personalRecords.map((pr) => (<ItemCard key={pr.id} onEdit={() => setPrModal({ open: true, pr })} onDelete={() => handleDeletePR(pr.id)} itemName={pr.exerciseName} itemType="personal record"><div className="flex items-center justify-between"><span className="text-sm font-medium">{pr.exerciseName}</span><span className="text-sm font-bold text-brand">{formatPRDisplay(pr.value, pr.unit)}</span></div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sports */}
        <AccordionItem value="sports" data-section="sports" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20"><Activity className="h-4 w-4 text-brand" /></div>
              <span className="font-medium text-sm">Sports</span>
              {sports.length > 0 && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{sports.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              {/* Visibility Control */}
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Who can see your sports?</span>
                <VisibilityBadge 
                  visibility={profile?.fieldVisibility?.sports || "public"} 
                  onChange={(v) => updateFieldVisibility("sports", v)}
                />
              </div>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Your Sports</span><Button variant="ghost" size="sm" onClick={() => setSportModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {sports.length === 0 ? <p className="text-sm text-muted-foreground">No sports added</p> : (
                <div className="space-y-2">{sports.map((s) => (<ItemCard key={s.id} onEdit={() => setSportModal({ open: true, sport: s })} onDelete={() => handleDeleteSport(s.id)} itemName={s.sport} itemType="sport"><div className="flex items-center gap-2"><span className="text-sm font-medium">{s.sport}</span>{s.level && <Badge variant="secondary" className="text-xs capitalize">{s.level.replace("_", " ")}</Badge>}{s.yearsPlaying && <span className="text-xs text-muted-foreground">{s.yearsPlaying} yrs</span>}{s.currentlyActive && <Badge className="text-xs ml-auto bg-success/20 text-success">Active</Badge>}</div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Equipment */}
        <AccordionItem value="equipment" data-section="equipment" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Dumbbell className="h-4 w-4" /></div>
              <span className="font-medium text-sm">Workout Spots</span>
              {locations.length > 0 && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{locations.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Your Workout Spots</span><Button variant="ghost" size="sm" onClick={() => setLocationModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {locations.length === 0 ? <p className="text-sm text-muted-foreground">Add where you work out — gyms, parks, CrossFit boxes</p> : (
                <div className="space-y-2">
                  {locations.map((l) => {
                    const isHome = l.type === "home";
                    const templateEquipment = !isHome ? (LOCATION_TEMPLATES[l.type] || []) : [];
                    return (
                      <ItemCard key={l.id} onEdit={() => setLocationModal({ open: true, location: l })} onDelete={() => handleDeleteLocation(l.id)} itemName={l.name} itemType="location">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{l.name}</span>
                          <Badge variant="secondary" className="text-xs capitalize">{LOCATION_TYPES.find((t) => t.value === l.type)?.label || l.type}</Badge>
                          {l.visibility === "public" ? <Badge className="text-xs bg-brand/20 text-brand"><Eye className="h-2.5 w-2.5 mr-0.5" />Public</Badge> : <Badge variant="outline" className="text-xs"><EyeOff className="h-2.5 w-2.5 mr-0.5" />Private</Badge>}
                        </div>
                        {l.address && !isHome && <p className="text-xs text-muted-foreground mt-1">{l.address}</p>}
                        {isHome ? (
                          <HomeEquipmentInline location={l} onSave={handleSaveLocationEquipment} />
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {templateEquipment.length > 0 ? `Full gym equipment (~${templateEquipment.length} items)` : "Custom equipment"}
                          </p>
                        )}
                      </ItemCard>
                    );
                  })}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Circles */}
        <AccordionItem value="circles" data-section="circles" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-energy/20"><Users className="h-4 w-4 text-energy" /></div>
              <span className="font-medium text-sm">Circles</span>
              <Badge variant="secondary" className="ml-auto mr-2 text-xs">{circles.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 pt-2">
              {circles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/circle/${c.id}`)}
                  className="flex items-center gap-3 rounded-lg bg-muted p-3 w-full text-left hover:bg-muted/80 transition-colors"
                >
                  <Avatar className="h-10 w-10"><AvatarImage src={c.imageUrl} /><AvatarFallback className="text-sm">{c.name.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.memberCount} members · {c.role}</p></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/discover?tab=circles")}><Plus className="mr-1 h-4 w-4" />Join or Create Circle</Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Settings */}
        <AccordionItem value="settings" data-section="settings" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Settings className="h-4 w-4" /></div>
              <span className="font-medium text-sm">Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {/* Account Info */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</span>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setChangeEmailModal(true)}>
                      Change
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security</span>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPasswordResetModal(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </Button>
                </div>
              </div>

              {/* Privacy & AI */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Privacy</span>
                <div className="space-y-2">
                  {[
                    { key: "personalization" as const, label: "AI Coaching", desc: "Personalized workouts & advice" },
                    { key: "analytics" as const, label: "Analytics", desc: "Help us improve the app" },
                    { key: "marketing" as const, label: "Marketing emails", desc: "Tips & feature updates" },
                  ].map((item) => {
                    const isChecked = profile?.consentPreferences?.[item.key] ?? false;
                    return (
                      <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                        </div>
                        <Switch
                          className="scale-125 origin-right data-[state=checked]:bg-brand shrink-0"
                          checked={isChecked}
                          onCheckedChange={async (checked) => {
                            const prefs = {
                              analytics: profile?.consentPreferences?.analytics ?? false,
                              marketing: profile?.consentPreferences?.marketing ?? false,
                              personalization: profile?.consentPreferences?.personalization ?? false,
                              doNotSell: profile?.consentPreferences?.doNotSell ?? false,
                              [item.key]: checked,
                            };
                            try {
                              const res = await fetch("/api/user/consent", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(prefs),
                              });
                              if (res.ok) {
                                toast.success(`${item.label} ${checked ? "enabled" : "disabled"}`);
                                router.refresh();
                              }
                            } catch {
                              toast.error("Failed to update privacy settings");
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing out...</>
                  ) : (
                    <><LogOut className="mr-2 h-4 w-4" />Sign Out</>
                  )}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ==================== MODALS ==================== */}
      <SkillModal open={skillModal.open} onOpenChange={(open) => setSkillModal({ open, skill: open ? skillModal.skill : null })} skill={skillModal.skill} onSave={handleSaveSkill} onDelete={handleDeleteSkill} />
      <PRModal open={prModal.open} onOpenChange={(open) => setPrModal({ open, pr: open ? prModal.pr : null })} pr={prModal.pr} onSave={handleSavePR} onDelete={handleDeletePR} />
      <LocationModal open={locationModal.open} onOpenChange={(open) => setLocationModal({ open, location: open ? locationModal.location : null })} location={locationModal.location} onSave={handleSaveLocation} onDelete={handleDeleteLocation} userCity={profile?.city} userState={profile?.state} />
      <LimitationModal open={limitationModal.open} onOpenChange={(open) => setLimitationModal({ open, limitation: open ? limitationModal.limitation : null })} limitation={limitationModal.limitation} onSave={handleSaveLimitation} onDelete={handleDeleteLimitation} />
      <MetricsModal open={metricsModal} onOpenChange={setMetricsModal} metrics={metrics} onSave={handleSaveMetrics} />
      <SportModal open={sportModal.open} onOpenChange={(open) => setSportModal({ open, sport: open ? sportModal.sport : null })} sport={sportModal.sport} onSave={handleSaveSport} onDelete={handleDeleteSport} />
      <HandleModal open={handleModal} onOpenChange={setHandleModal} currentHandle={profile?.handle} onSave={handleSaveHandle} />
      <DisplayNameModal open={displayNameModal} onOpenChange={setDisplayNameModal} currentName={displayName} onSave={handleSaveDisplayName} />
      <BioModal open={bioModal} onOpenChange={setBioModal} currentBio={profile?.bio} onSave={handleSaveBio} />
      <LocationEditModal open={locationEditModal} onOpenChange={setLocationEditModal} profile={profile} onSave={handleSaveProfileLocation} />
      <SocialLinksModal open={socialLinksModal} onOpenChange={setSocialLinksModal} socialLinks={profile?.socialLinks || {}} onSave={handleSaveSocialLinks} />
      <ChangeEmailModal open={changeEmailModal} onOpenChange={setChangeEmailModal} currentEmail={user.email} />
      <PasswordResetModal open={passwordResetModal} onOpenChange={setPasswordResetModal} email={user.email} />

      {/* Connections Sheet */}
      <ConnectionsSheet open={connectionsSheet} onOpenChange={setConnectionsSheet} />

      {/* Achievement Celebration Modal */}
      {showAchievementModal && newlyEarnedBadges.length > 0 && (
        <AchievementModal
          badges={newlyEarnedBadges}
          onComplete={() => {
            setShowAchievementModal(false);
            setNewlyEarnedBadges([]);
          }}
        />
      )}
    </div>
  );
}
