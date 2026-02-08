"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Dumbbell,
  Users,
  Clock,
  Star,
  Bookmark,
  Loader2,
  Plus,
  Play,
  Search,
  X,
  Flame,
  Sparkles,
  Link as LinkIcon,
  ArrowUpDown,
  CheckCircle2,
  CheckCircle,
  Check,
  Crown,
  Shield,
  History,
  CalendarCheck,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDifficultyBrand, getDifficultyLabel } from "@/lib/difficulty-branding";
import { CreateCircleExperience } from "@/components/circle";
import {
  WorkoutDetailSheet,
  ChallengeDetailSheet,
  CircleDetailSheet,
} from "@/components/sheets";

// Skeleton components
function WorkoutSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChallengeSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-4 w-full mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CircleSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Types
type TabType = "workouts" | "challenges" | "circles";

interface WorkoutUserRelationship {
  isSaved: boolean;
  completedCount: number;
  lastCompletedAt?: string;
}

interface ChallengeUserRelationship {
  isParticipating: boolean;
  status: string;
  startDate: string;
  completedAt?: string;
}

interface CircleUserRelationship {
  isMember: boolean;
  role: string;
  joinedAt: string;
}

interface ProgramUserRelationship {
  isEnrolled: boolean;
  status: string;
  currentWeek: number;
  startDate?: string;
}

interface ProgramWorkoutData {
  id: string;
  dayNumber: number;
  name?: string;
  workoutPlanId?: string;
  estimatedDuration?: number;
  focus?: string;
}

interface ProgramWeekData {
  id: string;
  weekNumber: number;
  name?: string;
  focus?: string;
  workouts: ProgramWorkoutData[];
}

interface ProgramData {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  category: string;
  difficulty: string;
  durationWeeks: number;
  daysPerWeek: number;
  enrollmentCount: number;
  avgRating?: number;
  isOfficial: boolean;
  weeks: ProgramWeekData[];
  userRelationship?: ProgramUserRelationship;
}

interface DiscoverPageProps {
  programs: ProgramData[];
  challenges: Array<{
    id: string;
    name: string;
    shortDescription?: string;
    category: string;
    difficulty: string;
    durationDays: number;
    participantCount: number;
    completionCount?: number;
    isOfficial: boolean;
    coverImage?: string;
    avgRating?: number;
    userRelationship?: ChallengeUserRelationship;
  }>;
  circles: Array<{
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    imageUrl?: string;
    focusArea?: string;
    handle?: string;
    userRelationship?: CircleUserRelationship;
  }>;
  workouts: Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    difficulty?: string;
    estimatedDuration?: number;
    saveCount: number;
    avgRating?: number;
    userRelationship?: WorkoutUserRelationship;
  }>;
}

// Tab configuration - removed "people"
const TABS: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "circles", label: "Rallies", icon: Users },
];

type SortOption = "popular" | "newest" | "rating" | "duration";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";
type CategoryFilter = "all" | "strength" | "cardio" | "hiit" | "crossfit" | "wellness" | "hybrid" | "flexibility" | "recovery";
type WorkoutTypeFilter = "all" | "workouts" | "programs";
type DomainFilter = "all" | "powerlifting" | "bodybuilding" | "crossfit" | "olympic_weightlifting" | "calisthenics" | "plyometrics" | "functional" | "sport_specific";

// Domain labels and descriptions
const DOMAIN_INFO: Record<string, { label: string; description: string; color: string }> = {
  powerlifting: { label: "Powerlifting", description: "Squat, Bench, Deadlift focus", color: "text-red-500" },
  bodybuilding: { label: "Bodybuilding", description: "Hypertrophy & aesthetics", color: "text-purple-500" },
  crossfit: { label: "CrossFit", description: "Functional fitness", color: "text-orange-500" },
  olympic_weightlifting: { label: "Olympic Lifting", description: "Snatch & Clean/Jerk", color: "text-yellow-500" },
  calisthenics: { label: "Calisthenics", description: "Bodyweight mastery", color: "text-cyan-500" },
  plyometrics: { label: "Plyometrics", description: "Explosive power", color: "text-green-500" },
  functional: { label: "Functional", description: "Real-world strength", color: "text-brand" },
  sport_specific: { label: "Sport Training", description: "Athletic performance", color: "text-pink-500" },
};

// Achievement hints that workouts can unlock
const ACHIEVEMENT_HINTS: Record<string, { name: string; icon: string; requirement: string }[]> = {
  powerlifting: [
    { name: "1000lb Club", icon: "🏆", requirement: "Squat + Bench + Deadlift = 1000lbs" },
    { name: "2x Bodyweight Deadlift", icon: "💪", requirement: "Pull 2x your weight" },
    { name: "225 Bench Club", icon: "🎯", requirement: "Bench press 225lbs" },
  ],
  bodybuilding: [
    { name: "Volume King", icon: "📊", requirement: "100+ sets per week" },
    { name: "Mind Muscle Master", icon: "🧠", requirement: "Complete 50 workouts" },
  ],
  crossfit: [
    { name: "Fran Under 5", icon: "⏱️", requirement: "Complete Fran in <5 min" },
    { name: "Murph Finisher", icon: "🎖️", requirement: "Complete Murph" },
    { name: "Sub-3 Grace", icon: "⚡", requirement: "Complete Grace in <3 min" },
  ],
  calisthenics: [
    { name: "Muscle Up", icon: "🔄", requirement: "Achieve your first muscle-up" },
    { name: "Handstand Hold", icon: "🤸", requirement: "60 second handstand" },
    { name: "Pistol Squat", icon: "🦵", requirement: "Achieve pistol squat" },
  ],
  plyometrics: [
    { name: "40\" Vertical", icon: "📏", requirement: "40 inch vertical jump" },
    { name: "Speed Demon", icon: "💨", requirement: "Complete 100 box jumps" },
  ],
};

// Helper to infer domain from workout title/category
function inferWorkoutDomain(title?: string, category?: string): DomainFilter | null {
  const text = `${title || ""} ${category || ""}`.toLowerCase();
  
  if (text.includes("powerlifting") || text.includes("5x5") || text.includes("5/3/1") || 
      text.includes("stronglifts") || text.includes("texas method") || text.includes("heavy singles")) {
    return "powerlifting";
  }
  if (text.includes("bodybuilding") || text.includes("hypertrophy") || text.includes("volume") ||
      text.includes("arnold") || text.includes("bro split") || text.includes("fst-7") ||
      text.includes("pump") || text.includes("specialization")) {
    return "bodybuilding";
  }
  if (text.includes("crossfit") || text.includes("wod") || text.includes("amrap") || 
      text.includes("emom") || text.includes("fran") || text.includes("murph") || 
      text.includes("grace") || text.includes("cindy") || text.includes("helen") ||
      text.includes("chipper") || text.includes("death by")) {
    return "crossfit";
  }
  if (text.includes("olympic") || text.includes("snatch") || text.includes("clean") ||
      text.includes("jerk")) {
    return "olympic_weightlifting";
  }
  if (text.includes("calisthenics") || text.includes("bodyweight") || text.includes("muscle up") ||
      text.includes("handstand") || text.includes("pistol") || text.includes("pullup") ||
      text.includes("pull-up") || text.includes("dip")) {
    return "calisthenics";
  }
  if (text.includes("plyometric") || text.includes("jump") || text.includes("explosive") ||
      text.includes("box jump") || text.includes("sprint")) {
    return "plyometrics";
  }
  if (text.includes("functional") || text.includes("kettlebell") || text.includes("circuit")) {
    return "functional";
  }
  if (text.includes("sport") || text.includes("athletic") || text.includes("agility")) {
    return "sport_specific";
  }
  return null;
}

export function DiscoverPage({
  programs,
  challenges,
  circles,
  workouts,
}: DiscoverPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("workouts");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingWorkouts, setSavingWorkouts] = useState<Set<string>>(new Set());
  const [joiningCircles, setJoiningCircles] = useState<Set<string>>(new Set());
  const [joiningChallenges, setJoiningChallenges] = useState<Set<string>>(new Set());
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Detail sheet states
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  
  // Workout view mode - programs vs individual
  type WorkoutViewMode = "programs" | "individual";
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>("programs");
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  
  // Filter states
  const [workoutType, setWorkoutType] = useState<WorkoutTypeFilter>("all");
  const [workoutDifficulty, setWorkoutDifficulty] = useState<DifficultyFilter>("all");
  const [workoutCategory, setWorkoutCategory] = useState<CategoryFilter>("all");
  const [workoutDomain, setWorkoutDomain] = useState<DomainFilter>("all");
  const [workoutSort, setWorkoutSort] = useState<SortOption>("popular");
  const [showFilters, setShowFilters] = useState(false);
  
  const [challengeDifficulty, setChallengeDifficulty] = useState<DifficultyFilter>("all");
  const [challengeCategory, setChallengeCategory] = useState<CategoryFilter>("all");
  const [challengeSort, setChallengeSort] = useState<SortOption>("popular");
  
  // Check if any workout filters are active
  const hasActiveWorkoutFilters = workoutType !== "all" || workoutDifficulty !== "all" || workoutCategory !== "all" || workoutDomain !== "all";
  const hasActiveChallFilters = challengeDifficulty !== "all" || challengeCategory !== "all";
  
  // Toggle program expansion
  const toggleProgram = (programId: string) => {
    setExpandedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };
  
  // Filter programs
  const filteredPrograms = useMemo(() => {
    let result = [...programs];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }
    
    // Difficulty filter
    if (workoutDifficulty !== "all") {
      result = result.filter((p) => p.difficulty?.toLowerCase() === workoutDifficulty);
    }
    
    // Category filter
    if (workoutCategory !== "all") {
      result = result.filter((p) => p.category?.toLowerCase() === workoutCategory);
    }
    
    // Sort
    switch (workoutSort) {
      case "popular":
        result.sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0));
        break;
      case "rating":
        result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "newest":
        // Keep original order (assumed to be by date)
        break;
    }
    
    return result;
  }, [programs, searchQuery, workoutDifficulty, workoutCategory, workoutSort]);

  // Filter and sort workouts
  const filteredWorkouts = useMemo(() => {
    let result = [...workouts];
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.title?.toLowerCase().includes(q) || 
        w.description?.toLowerCase().includes(q) ||
        w.category?.toLowerCase().includes(q)
      );
    }
    
    // Difficulty filter
    if (workoutDifficulty !== "all") {
      result = result.filter(w => w.difficulty?.toLowerCase() === workoutDifficulty);
    }
    
    // Category filter
    if (workoutCategory !== "all") {
      result = result.filter(w => w.category?.toLowerCase() === workoutCategory);
    }
    
    // Sort
    switch (workoutSort) {
      case "popular":
        result.sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0));
        break;
      case "rating":
        result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "duration":
        result.sort((a, b) => (a.estimatedDuration || 0) - (b.estimatedDuration || 0));
        break;
      // newest would need created_at field
    }
    
    return result;
  }, [workouts, searchQuery, workoutDifficulty, workoutCategory, workoutSort]);

  const filteredChallenges = useMemo(() => {
    let result = [...challenges];
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.shortDescription?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    }
    
    // Difficulty filter
    if (challengeDifficulty !== "all") {
      result = result.filter(c => c.difficulty?.toLowerCase() === challengeDifficulty);
    }
    
    // Category filter
    if (challengeCategory !== "all") {
      result = result.filter(c => c.category?.toLowerCase() === challengeCategory);
    }
    
    // Sort
    switch (challengeSort) {
      case "popular":
        result.sort((a, b) => (b.participantCount || 0) - (a.participantCount || 0));
        break;
      case "rating":
        result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        break;
      case "duration":
        result.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
        break;
    }
    
    return result;
  }, [challenges, searchQuery, challengeDifficulty, challengeCategory, challengeSort]);

  const filteredCircles = useMemo(() => {
    if (!searchQuery.trim()) return circles;
    const q = searchQuery.toLowerCase();
    return circles.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.description?.toLowerCase().includes(q) ||
      c.focusArea?.toLowerCase().includes(q) ||
      c.handle?.toLowerCase().includes(q)
    );
  }, [circles, searchQuery]);

  // Actions
  const handleSaveWorkout = async (workoutId: string) => {
    setSavingWorkouts((prev) => new Set(prev).add(workoutId));
    try {
      await fetch(`/api/workouts/${workoutId}/save`, { method: "POST" });
      toast.success("Workout saved!");
    } catch {
      toast.error("Failed to save workout");
    } finally {
      setSavingWorkouts((prev) => {
        const next = new Set(prev);
        next.delete(workoutId);
        return next;
      });
    }
  };

  const handleJoinCircle = async (circleId: string) => {
    setJoiningCircles((prev) => new Set(prev).add(circleId));
    try {
      await fetch(`/api/circles/${circleId}/join`, { method: "POST" });
      toast.success("Joined circle!");
    } catch {
      toast.error("Failed to join circle");
    } finally {
      setJoiningCircles((prev) => {
        const next = new Set(prev);
        next.delete(circleId);
        return next;
      });
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    setJoiningChallenges((prev) => new Set(prev).add(challengeId));
    try {
      await fetch(`/api/challenges/${challengeId}/join`, { method: "POST" });
      toast.success("Joined challenge!");
    } catch {
      toast.error("Failed to join challenge");
    } finally {
      setJoiningChallenges((prev) => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
    }
  };

  const copyShareLink = (type: string, id: string, name: string) => {
    const url = `${window.location.origin}/${type}/${id}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link copied! Share "${name}" on your socials`);
  };

  const getDifficultyColor = (difficulty: string) => {
    const brand = getDifficultyBrand(difficulty);
    return `${brand.bgColor} ${brand.color} ${brand.borderColor}`;
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold mb-3">Discover</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 bg-muted/50 border-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* ==================== WORKOUTS TAB ==================== */}
        {activeTab === "workouts" && (
          <div className="space-y-3">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-center mb-2">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setWorkoutViewMode("programs")}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                    workoutViewMode === "programs"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Programs
                  </span>
                </button>
                <button
                  onClick={() => setWorkoutViewMode("individual")}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                    workoutViewMode === "individual"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4" />
                    Individual
                  </span>
                </button>
              </div>
            </div>
            
            {/* Compact Filters Bar */}
            <div className="flex items-center gap-2">
              {/* Domain/Specialty Filter Dropdown */}
              <Select value={workoutDomain} onValueChange={(v) => setWorkoutDomain(v as DomainFilter)}>
                <SelectTrigger className="min-w-[130px] h-8 text-xs bg-muted/50 border-0">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="powerlifting">Powerlifting</SelectItem>
                  <SelectItem value="bodybuilding">Bodybuilding</SelectItem>
                  <SelectItem value="crossfit">CrossFit</SelectItem>
                  <SelectItem value="olympic_weightlifting">Olympic Lifting</SelectItem>
                  <SelectItem value="calisthenics">Calisthenics</SelectItem>
                  <SelectItem value="plyometrics">Plyometrics</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="sport_specific">Sport Training</SelectItem>
                </SelectContent>
              </Select>

              {/* Difficulty Filter Dropdown */}
              <Select value={workoutDifficulty} onValueChange={(v) => setWorkoutDifficulty(v as DifficultyFilter)}>
                <SelectTrigger className="min-w-[130px] h-8 text-xs bg-muted/50 border-0">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Category Filter Dropdown */}
              <Select value={workoutCategory} onValueChange={(v) => setWorkoutCategory(v as CategoryFilter)}>
                <SelectTrigger className="min-w-[140px] h-8 text-xs bg-muted/50 border-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="hiit">HIIT</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Spacer */}
              <div className="flex-1" />
              
              {/* Sort Dropdown */}
              <Select value={workoutSort} onValueChange={(v) => setWorkoutSort(v as SortOption)}>
                <SelectTrigger className="min-w-[110px] h-8 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="duration">Shortest First</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Pills */}
            {hasActiveWorkoutFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filters:</span>
                {workoutDomain !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1">
                    {DOMAIN_INFO[workoutDomain]?.label || workoutDomain}
                    <button onClick={() => setWorkoutDomain("all")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {workoutDifficulty !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 capitalize">
                    {workoutDifficulty}
                    <button onClick={() => setWorkoutDifficulty("all")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {workoutCategory !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 capitalize">
                    {workoutCategory}
                    <button onClick={() => setWorkoutCategory("all")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <button 
                  onClick={() => {
                    setWorkoutDomain("all");
                    setWorkoutDifficulty("all");
                    setWorkoutCategory("all");
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Create workout CTA */}
            <Card className="bg-gradient-to-br from-brand/10 to-energy/10 border-brand/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Create & Share</p>
                    <p className="text-xs text-muted-foreground">Build workouts others can discover</p>
                  </div>
                  <Button size="sm" onClick={() => router.push("/workout/new")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading state */}
            {isLoading ? (
              <div className="space-y-3">
                <WorkoutSkeleton />
                <WorkoutSkeleton />
                <WorkoutSkeleton />
              </div>
            ) : workoutViewMode === "programs" ? (
              /* ==================== PROGRAMS VIEW ==================== */
              filteredPrograms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <svg className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p>No programs found</p>
                </div>
              ) : (
                filteredPrograms.map((program) => {
                  const isExpanded = expandedPrograms.has(program.id);
                  const enrollment = program.userRelationship;
                  const difficultyInfo = getDifficultyBrand(program.difficulty);
                  
                  return (
                    <Card key={program.id} className={cn(
                      "overflow-hidden transition-all",
                      enrollment?.isEnrolled && "border-brand/30 bg-brand/5"
                    )}>
                      {/* Program Header */}
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Program Image/Icon */}
                          <div className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-brand/20 to-energy/20 flex items-center justify-center flex-shrink-0">
                            {program.coverImage ? (
                              <img src={program.coverImage} alt={program.name} className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            )}
                            {program.isOfficial && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Status badges */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {enrollment?.isEnrolled && (
                                <Badge className="bg-brand text-white text-[10px] px-1.5 py-0">
                                  Week {enrollment.currentWeek}
                                </Badge>
                              )}
                              {program.category && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                  {program.category}
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-semibold leading-tight line-clamp-1">{program.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {program.shortDescription || program.description}
                            </p>
                            
                            {/* Program meta */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {program.durationWeeks} weeks
                              </span>
                              <span>{program.daysPerWeek}x/week</span>
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", difficultyInfo.color)}>
                                {getDifficultyLabel(program.difficulty)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Expand/Action */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProgram(program.id);
                              }}
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                isExpanded ? "bg-brand text-white" : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {program.enrollmentCount} enrolled
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      
                      {/* Expanded Schedule */}
                      {isExpanded && (
                        <div className="border-t bg-muted/30">
                          <div className="p-4 space-y-3">
                            {program.weeks.map((week) => (
                              <div key={week.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">Week {week.weekNumber}</Badge>
                                  {week.name && <span className="text-sm font-medium">{week.name}</span>}
                                  {week.focus && <span className="text-xs text-muted-foreground">- {week.focus}</span>}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                    const workout = week.workouts.find(w => w.dayNumber === day);
                                    return (
                                      <button
                                        key={day}
                                        onClick={() => workout?.workoutPlanId && setSelectedWorkoutId(workout.workoutPlanId)}
                                        disabled={!workout}
                                        className={cn(
                                          "p-2 rounded-md text-center transition-colors min-h-[60px] flex flex-col items-center justify-center",
                                          workout 
                                            ? "bg-background hover:bg-brand/10 cursor-pointer border" 
                                            : "bg-muted/50 cursor-default"
                                        )}
                                      >
                                        <span className="text-[10px] text-muted-foreground mb-0.5">
                                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day - 1]}
                                        </span>
                                        {workout ? (
                                          <>
                                            <Dumbbell className="h-3.5 w-3.5 text-brand mb-0.5" />
                                            <span className="text-[10px] font-medium line-clamp-1">
                                              {workout.name || workout.focus || "Workout"}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">Rest</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-center pt-2">
                              <Button 
                                variant={enrollment?.isEnrolled ? "outline" : "default"}
                                size="sm"
                                onClick={() => router.push(`/program/${program.id}`)}
                              >
                                {enrollment?.isEnrolled ? "Continue Program" : "View Full Program"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )
            ) : filteredWorkouts.length === 0 ? (
              /* ==================== INDIVIDUAL WORKOUTS VIEW ==================== */
              <div className="text-center py-12 text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No workouts found</p>
              </div>
            ) : (
              filteredWorkouts.map((workout) => {
                const rel = workout.userRelationship;
                const hasHistory = rel && rel.completedCount > 0;
                // Infer domain from workout title/category for display
                const inferredDomain = inferWorkoutDomain(workout.title, workout.category);
                const domainInfo = inferredDomain ? DOMAIN_INFO[inferredDomain] : null;
                const achievements = inferredDomain ? ACHIEVEMENT_HINTS[inferredDomain] : null;
                
                return (
                  <Card 
                    key={workout.id} 
                    className={cn(
                      "group cursor-pointer hover:bg-muted/50 transition-colors",
                      rel?.isSaved && "border-brand/30"
                    )}
                    onClick={() => setSelectedWorkoutId(workout.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Domain & User relationship badges */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {domainInfo && (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", domainInfo.color)}>
                                {domainInfo.label}
                              </Badge>
                            )}
                            {workout.category && !domainInfo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {workout.category}
                              </Badge>
                            )}
                            {rel?.isSaved && (
                              <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px] px-1.5 py-0 gap-1">
                                <Bookmark className="h-2.5 w-2.5 fill-current" />
                                Saved
                              </Badge>
                            )}
                            {hasHistory && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-success border-success/30">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Done {rel.completedCount}x
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{workout.title}</h3>
                          {workout.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {workout.description}
                            </p>
                          )}
                          {/* Achievement unlock hints */}
                          {achievements && achievements.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Trophy className="h-3 w-3 text-energy" />
                              <span className="text-[10px] text-muted-foreground">
                                Unlocks: {achievements.slice(0, 2).map(a => `${a.icon} ${a.name}`).join(", ")}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {workout.difficulty && (
                              <Badge variant="outline" className={cn("text-xs", getDifficultyColor(workout.difficulty))}>
                                {getDifficultyLabel(workout.difficulty)}
                              </Badge>
                            )}
                            {workout.estimatedDuration && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {workout.estimatedDuration}min
                              </span>
                            )}
                            {workout.avgRating && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {workout.avgRating.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Bookmark className="h-3 w-3" />
                              {workout.saveCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyShareLink("workout", workout.id, workout.title)}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", rel?.isSaved && "text-brand")}
                            onClick={() => handleSaveWorkout(workout.id)}
                            disabled={savingWorkouts.has(workout.id)}
                          >
                            {savingWorkouts.has(workout.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Bookmark className={cn("h-4 w-4", rel?.isSaved && "fill-current")} />
                            )}
                          </Button>
                          <Button size="sm" onClick={() => setSelectedWorkoutId(workout.id)}>
                            {hasHistory ? (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Again
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ==================== CHALLENGES TAB ==================== */}
        {activeTab === "challenges" && (
          <div className="space-y-3">
            {/* Compact Filters Bar */}
            <div className="flex items-center gap-2">
              {/* Difficulty Filter Dropdown */}
              <Select value={challengeDifficulty} onValueChange={(v) => setChallengeDifficulty(v as DifficultyFilter)}>
                <SelectTrigger className="min-w-[130px] h-8 text-xs bg-muted/50 border-0">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Category Filter Dropdown */}
              <Select value={challengeCategory} onValueChange={(v) => setChallengeCategory(v as CategoryFilter)}>
                <SelectTrigger className="min-w-[140px] h-8 text-xs bg-muted/50 border-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Spacer */}
              <div className="flex-1" />
              
              {/* Sort Dropdown */}
              <Select value={challengeSort} onValueChange={(v) => setChallengeSort(v as SortOption)}>
                <SelectTrigger className="min-w-[110px] h-8 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="duration">Shortest First</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Pills */}
            {hasActiveChallFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filters:</span>
                {challengeDifficulty !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 capitalize">
                    {challengeDifficulty}
                    <button onClick={() => setChallengeDifficulty("all")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {challengeCategory !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 capitalize">
                    {challengeCategory}
                    <button onClick={() => setChallengeCategory("all")} className="ml-1 hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <button 
                  onClick={() => {
                    setChallengeDifficulty("all");
                    setChallengeCategory("all");
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Featured/Trending Section */}
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Trending Challenges</span>
            </div>

            {/* Loading state */}
            {isLoading ? (
              <div className="space-y-3">
                <ChallengeSkeleton />
                <ChallengeSkeleton />
                <ChallengeSkeleton />
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No challenges found</p>
              </div>
            ) : (
              filteredChallenges.map((challenge) => {
                const rel = challenge.userRelationship;
                const isCompleted = rel?.status === "completed";
                const isActive = rel?.isParticipating && rel.status === "active";
                
                // Calculate days into challenge
                let daysIn = 0;
                if (rel?.startDate) {
                  const start = new Date(rel.startDate);
                  const now = new Date();
                  daysIn = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
                
                return (
                  <Card 
                    key={challenge.id} 
                    className={cn(
                      "group overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors",
                      isCompleted && "border-success/30",
                      isActive && "border-energy/30"
                    )}
                    onClick={() => setSelectedChallengeId(challenge.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                          isCompleted 
                            ? "bg-gradient-to-br from-green-400 to-emerald-500" 
                            : "bg-gradient-to-br from-amber-400 to-orange-500"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          ) : (
                            <Trophy className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* User relationship badges */}
                          {rel?.isParticipating && (
                            <div className="flex items-center gap-2 mb-1">
                              {isCompleted && (
                                <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0 gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Completed
                                </Badge>
                              )}
                              {isActive && (
                                <Badge className="bg-energy/10 text-energy border-energy/20 text-[10px] px-1.5 py-0 gap-1">
                                  <Flame className="h-2.5 w-2.5" />
                                  Day {Math.min(daysIn, challenge.durationDays)}/{challenge.durationDays}
                                </Badge>
                              )}
                              {rel.status === "failed" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                  Not completed
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{challenge.name}</h3>
                            {challenge.isOfficial && (
                              <Badge className="bg-brand text-white text-[10px]">Official</Badge>
                            )}
                          </div>
                          {challenge.shortDescription && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {challenge.shortDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-xs", getDifficultyColor(challenge.difficulty))}>
                              {getDifficultyLabel(challenge.difficulty)}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {challenge.durationDays} days
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {challenge.participantCount.toLocaleString()}
                            </span>
                            {challenge.avgRating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {challenge.avgRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyShareLink("challenge", challenge.id, challenge.name)}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          {isActive ? (
                            <Button size="sm" variant="outline">
                              <CalendarCheck className="h-4 w-4 mr-1" />
                              Log
                            </Button>
                          ) : isCompleted ? (
                            <Button size="sm" variant="outline" onClick={() => handleJoinChallenge(challenge.id)}>
                              Retry
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleJoinChallenge(challenge.id)}
                              disabled={joiningChallenges.has(challenge.id)}
                            >
                              {joiningChallenges.has(challenge.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Join"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ==================== RALLIES TAB ==================== */}
        {activeTab === "circles" && (
          <div className="space-y-3">
            {/* Create Rally CTA */}
            <Card className="bg-gradient-to-br from-energy/10 to-brand/10 border-energy/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-energy/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-energy" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Start Your Rally</p>
                    <p className="text-xs text-muted-foreground">Create a group & invite via handle or link</p>
                  </div>
                  <Button size="sm" onClick={() => setShowCreateCircle(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info about finding circles */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Find circles</span> by searching their name or handle.
                Share your circle link on Instagram, TikTok, or Linktree to grow your community.
              </p>
            </div>

            {filteredCircles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No circles found</p>
                <p className="text-sm mt-1">Try searching by name or handle</p>
              </div>
            ) : (
              filteredCircles.map((circle) => {
                const rel = circle.userRelationship;
                const isOwner = rel?.role === "owner";
                const isAdmin = rel?.role === "admin";
                
                return (
                  <Card 
                    key={circle.id} 
                    className={cn(
                      "group cursor-pointer hover:bg-muted/50 transition-colors",
                      rel?.isMember && "border-brand/30"
                    )}
                    onClick={() => setSelectedCircleId(circle.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={circle.imageUrl} />
                            <AvatarFallback className="bg-brand/20 text-brand">
                              {circle.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {rel?.isMember && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* User relationship badges */}
                          {rel?.isMember && (
                            <div className="flex items-center gap-2 mb-1">
                              {isOwner && (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0 gap-1">
                                  <Crown className="h-2.5 w-2.5" />
                                  Owner
                                </Badge>
                              )}
                              {isAdmin && !isOwner && (
                                <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px] px-1.5 py-0 gap-1">
                                  <Shield className="h-2.5 w-2.5" />
                                  Admin
                                </Badge>
                              )}
                              {!isOwner && !isAdmin && (
                                <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px] px-1.5 py-0 gap-1">
                                  <Check className="h-2.5 w-2.5" />
                                  Member
                                </Badge>
                              )}
                              {rel.joinedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  Joined {formatRelativeTime(rel.joinedAt)}
                                </span>
                              )}
                            </div>
                          )}
                          <h3 className="font-semibold">{circle.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {circle.memberCount.toLocaleString()} members
                            {circle.focusArea && ` · ${circle.focusArea}`}
                          </p>
                          {circle.handle && (
                            <p className="text-xs text-brand">@{circle.handle}</p>
                          )}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyShareLink("circle", circle.id, circle.name)}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          {rel?.isMember ? (
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleJoinCircle(circle.id)}
                              disabled={joiningCircles.has(circle.id)}
                            >
                              {joiningCircles.has(circle.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Join"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Create Rally Experience */}
      <CreateCircleExperience open={showCreateCircle} onOpenChange={setShowCreateCircle} />
      
      {/* Detail Sheets */}
      <WorkoutDetailSheet
        workoutId={selectedWorkoutId}
        open={!!selectedWorkoutId}
        onOpenChange={(open) => !open && setSelectedWorkoutId(null)}
        onStart={(id) => {
          // Navigate to workout start page after closing sheet
          setSelectedWorkoutId(null);
          router.push(`/workout/${id}/start`);
        }}
      />
      
      <ChallengeDetailSheet
        challengeId={selectedChallengeId}
        open={!!selectedChallengeId}
        onOpenChange={(open) => !open && setSelectedChallengeId(null)}
        onJoin={() => {
          // Refresh challenges list if needed
        }}
      />
      
      <CircleDetailSheet
        circleId={selectedCircleId}
        open={!!selectedCircleId}
        onOpenChange={(open) => !open && setSelectedCircleId(null)}
        onJoin={() => {
          // Refresh circles list if needed
        }}
      />
    </div>
  );
}
