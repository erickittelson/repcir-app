"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Dumbbell,
  Clock,
  Users,
  Globe,
  Lock,
  ChevronRight,
  Loader2,
  Play,
  Edit3,
  Trash2,
  Share2,
  Search,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  Flame,
  Calendar,
  MoreHorizontal,
  Copy,
  Eye,
  CheckCircle2,
  AlertCircle,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { WorkoutDetailSheet } from "@/components/sheets";

interface Workout {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  exerciseCount: number;
  visibility?: "private" | "circle" | "public";
  createdAt?: string;
  useCount?: number;
  saveCount?: number;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  workoutCount: number;
  duration?: string; // e.g., "4 weeks"
  visibility?: "private" | "circle" | "public";
  createdAt?: string;
}

interface UserChallenge {
  id: string;
  name: string;
  shortDescription?: string;
  category: string;
  difficulty: string;
  durationDays: number;
  visibility: "private" | "circle" | "public";
  participantCount: number;
  completionCount: number;
  restartOnFail: boolean;
  createdAt: string;
}

interface DailyTaskInput {
  name: string;
  type: "workout" | "nutrition" | "hydration" | "mindset" | "custom";
  isRequired: boolean;
  description: string;
}

const CHALLENGE_CATEGORY_OPTIONS = [
  "strength",
  "cardio",
  "wellness",
  "hybrid",
  "transformation",
];

const CHALLENGE_DIFFICULTY_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
  "extreme",
];

const DAILY_TASK_TYPES = [
  { value: "workout", label: "Workout" },
  { value: "nutrition", label: "Nutrition" },
  { value: "hydration", label: "Hydration" },
  { value: "mindset", label: "Mindset" },
  { value: "custom", label: "Custom" },
] as const;

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Private",
    icon: Lock,
    description: "Only you can see this",
  },
  {
    value: "circle",
    label: "Circle Only",
    icon: Users,
    description: "Share with your circle members",
  },
  {
    value: "public",
    label: "Public",
    icon: Globe,
    description: "Anyone can discover this",
  },
];

const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced"];

const CATEGORY_OPTIONS = [
  "strength",
  "cardio",
  "hiit",
  "flexibility",
  "sports",
  "other",
];

export function WorkoutsHub() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workouts" | "plans" | "challenges">("workouts");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [myWorkouts, setMyWorkouts] = useState<Workout[]>([]);
  const [myPlans, setMyPlans] = useState<WorkoutPlan[]>([]);
  const [myChallenges, setMyChallenges] = useState<UserChallenge[]>([]);

  // Create sheet state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateChallengeSheet, setShowCreateChallengeSheet] = useState(false);
  const [createMode, setCreateMode] = useState<"workout" | "plan">("workout");

  // Publish dialog state
  const [publishWorkout, setPublishWorkout] = useState<Workout | null>(null);
  const [publishVisibility, setPublishVisibility] = useState<"private" | "circle" | "public">("private");
  const [publishDescription, setPublishDescription] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // View detail sheet
  const [viewWorkoutId, setViewWorkoutId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteWorkout, setDeleteWorkout] = useState<Workout | null>(null);
  const [deleteChallenge, setDeleteChallenge] = useState<UserChallenge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch workouts
  const fetchWorkouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/workout-plans");
      if (response.ok) {
        const data = await response.json();
        setMyWorkouts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch workouts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChallenges = useCallback(async () => {
    try {
      const response = await fetch("/api/challenges/mine");
      if (response.ok) {
        const data = await response.json();
        setMyChallenges(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
    fetchChallenges();
  }, [fetchWorkouts, fetchChallenges]);

  // Filter workouts based on search
  const filteredWorkouts = myWorkouts.filter(
    (workout) =>
      workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlans = myPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChallenges = myChallenges.filter(
    (challenge) =>
      challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkout = () => {
    setCreateMode("workout");
    router.push("/workout/new");
  };

  const handleCreatePlan = () => {
    setCreateMode("plan");
    setShowCreateSheet(true);
  };

  const handleCreateChallenge = () => {
    setShowCreateChallengeSheet(true);
  };

  const handleDeleteChallenge = async () => {
    if (!deleteChallenge) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/challenges/${deleteChallenge.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Challenge deleted");
        fetchChallenges();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete challenge");
    } finally {
      setIsDeleting(false);
      setDeleteChallenge(null);
    }
  };

  const handleStartWorkout = (workoutId: string) => {
    haptics.medium();
    router.push(`/workout/${workoutId}/start`);
  };

  const handleEditWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}/edit`);
  };

  const handlePublishWorkout = async () => {
    if (!publishWorkout) return;

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/workouts/${publishWorkout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: publishVisibility,
          ...(publishDescription.trim() && { description: publishDescription.trim() }),
        }),
      });

      if (response.ok) {
        toast.success(
          publishVisibility === "public"
            ? "Workout published publicly!"
            : publishVisibility === "circle"
            ? "Workout shared with your circle!"
            : "Workout set to private"
        );
        fetchWorkouts();
      } else {
        throw new Error("Failed to update visibility");
      }
    } catch (error) {
      toast.error("Failed to update workout visibility");
    } finally {
      setIsPublishing(false);
      setPublishWorkout(null);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!deleteWorkout) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-plans/${deleteWorkout.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Workout deleted");
        fetchWorkouts();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete workout");
    } finally {
      setIsDeleting(false);
      setDeleteWorkout(null);
    }
  };

  const handleDuplicateWorkout = async (workout: Workout) => {
    try {
      const response = await fetch(`/api/workouts/${workout.id}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Workout duplicated!");
        fetchWorkouts();
      } else {
        throw new Error("Failed to duplicate");
      }
    } catch (error) {
      toast.error("Failed to duplicate workout");
    }
  };

  const getVisibilityIcon = (visibility?: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-3.5 w-3.5" />;
      case "circle":
        return <Users className="h-3.5 w-3.5" />;
      default:
        return <Lock className="h-3.5 w-3.5" />;
    }
  };

  const getVisibilityLabel = (visibility?: string) => {
    switch (visibility) {
      case "public":
        return "Public";
      case "circle":
        return "Circle";
      default:
        return "Private";
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/20 text-green-600";
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-600";
      case "advanced":
        return "bg-red-500/20 text-red-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Workouts</h1>
              <p className="text-sm text-muted-foreground">
                Create, manage & share
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-brand-gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleCreateWorkout}>
                  <Dumbbell className="h-4 w-4 mr-2" />
                  New Workout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreatePlan}>
                  <Calendar className="h-4 w-4 mr-2" />
                  New Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateChallenge}>
                  <Trophy className="h-4 w-4 mr-2" />
                  New Challenge
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/coach")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workouts..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-r-none",
                  viewMode === "grid" && "bg-muted"
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-l-none",
                  viewMode === "list" && "bg-muted"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "workouts" | "plans" | "challenges")}>
          <TabsList className="w-full justify-start px-4 h-12 bg-transparent border-b rounded-none">
            <TabsTrigger
              value="workouts"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand rounded-none"
            >
              <Dumbbell className="h-4 w-4 mr-2" />
              Workouts
              {myWorkouts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myWorkouts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand rounded-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Plans
              {myPlans.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myPlans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="challenges"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand rounded-none"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Challenges
              {myChallenges.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myChallenges.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
            <p className="text-muted-foreground">Loading your workouts...</p>
          </div>
        ) : activeTab === "workouts" ? (
          filteredWorkouts.length === 0 ? (
            <EmptyState
              type="workouts"
              searchQuery={searchQuery}
              onCreate={handleCreateWorkout}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onStart={() => handleStartWorkout(workout.id)}
                  onView={() => setViewWorkoutId(workout.id)}
                  onEdit={() => handleEditWorkout(workout.id)}
                  onPublish={() => {
                    setPublishWorkout(workout);
                    setPublishVisibility(workout.visibility || "private");
                    setPublishDescription(workout.description || "");
                  }}
                  onDuplicate={() => handleDuplicateWorkout(workout)}
                  onDelete={() => setDeleteWorkout(workout)}
                  getVisibilityIcon={getVisibilityIcon}
                  getVisibilityLabel={getVisibilityLabel}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkouts.map((workout) => (
                <WorkoutListItem
                  key={workout.id}
                  workout={workout}
                  onStart={() => handleStartWorkout(workout.id)}
                  onView={() => setViewWorkoutId(workout.id)}
                  onEdit={() => handleEditWorkout(workout.id)}
                  onPublish={() => {
                    setPublishWorkout(workout);
                    setPublishVisibility(workout.visibility || "private");
                    setPublishDescription(workout.description || "");
                  }}
                  onDuplicate={() => handleDuplicateWorkout(workout)}
                  onDelete={() => setDeleteWorkout(workout)}
                  getVisibilityIcon={getVisibilityIcon}
                  getVisibilityLabel={getVisibilityLabel}
                  getDifficultyColor={getDifficultyColor}
                />
              ))}
            </div>
          )
        ) : activeTab === "plans" ? (
          filteredPlans.length === 0 ? (
            <EmptyState
              type="plans"
              searchQuery={searchQuery}
              onCreate={handleCreatePlan}
            />
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  getVisibilityIcon={getVisibilityIcon}
                  getVisibilityLabel={getVisibilityLabel}
                />
              ))}
            </div>
          )
        ) : filteredChallenges.length === 0 ? (
          <EmptyState
            type="challenges"
            searchQuery={searchQuery}
            onCreate={handleCreateChallenge}
          />
        ) : (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onDelete={() => setDeleteChallenge(challenge)}
                getVisibilityIcon={getVisibilityIcon}
                getVisibilityLabel={getVisibilityLabel}
                getDifficultyColor={getDifficultyColor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Publish Dialog */}
      <Dialog open={!!publishWorkout} onOpenChange={() => setPublishWorkout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Workout</DialogTitle>
            <DialogDescription>
              Choose who can see "{publishWorkout?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="publish-description">Description</Label>
              <Textarea
                id="publish-description"
                placeholder="Add a description so others know what this workout is about..."
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {publishDescription.length}/500
              </p>
            </div>

            {/* Visibility options */}
            <div className="space-y-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = publishVisibility === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setPublishVisibility(option.value as typeof publishVisibility)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                    isSelected
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      isSelected ? "bg-brand text-white" : "bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-brand" />
                  )}
                </button>
              );
            })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishWorkout(null)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishWorkout}
              disabled={isPublishing}
              className="bg-brand-gradient"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Update Visibility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteWorkout} onOpenChange={() => setDeleteWorkout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Workout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteWorkout?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWorkout(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkout}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Challenge Confirmation Dialog */}
      <Dialog open={!!deleteChallenge} onOpenChange={() => setDeleteChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Challenge
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteChallenge?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChallenge(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChallenge}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Sheet */}
      <CreatePlanSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        workouts={myWorkouts}
        onSuccess={() => {
          setShowCreateSheet(false);
          // Refresh plans
        }}
      />

      {/* Create Challenge Sheet */}
      <CreateChallengeSheet
        open={showCreateChallengeSheet}
        onOpenChange={setShowCreateChallengeSheet}
        onSuccess={() => {
          setShowCreateChallengeSheet(false);
          fetchChallenges();
        }}
      />

      {/* Workout Detail Sheet */}
      <WorkoutDetailSheet
        workoutId={viewWorkoutId}
        open={!!viewWorkoutId}
        onOpenChange={(open) => !open && setViewWorkoutId(null)}
        onStart={(id) => {
          setViewWorkoutId(null);
          handleStartWorkout(id);
        }}
      />
    </div>
  );
}

// Workout Card Component
function WorkoutCard({
  workout,
  onStart,
  onView,
  onEdit,
  onPublish,
  onDuplicate,
  onDelete,
  getVisibilityIcon,
  getVisibilityLabel,
  getDifficultyColor,
}: {
  workout: Workout;
  onStart: () => void;
  onView: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  getVisibilityIcon: (v?: string) => React.ReactNode;
  getVisibilityLabel: (v?: string) => string;
  getDifficultyColor: (d?: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="overflow-hidden hover:border-brand/50 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{workout.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {getVisibilityIcon(workout.visibility)}
                  <span className="ml-1">{getVisibilityLabel(workout.visibility)}</span>
                </Badge>
                {workout.difficulty && (
                  <Badge className={cn("text-[10px] px-1.5 py-0", getDifficultyColor(workout.difficulty))}>
                    {workout.difficulty}
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPublish}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {workout.exerciseCount} exercises
            </span>
            {workout.estimatedDuration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {workout.estimatedDuration} min
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onView}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View
            </Button>
            <Button
              onClick={onStart}
              size="sm"
              className="flex-1 bg-brand-gradient"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Workout List Item Component
function WorkoutListItem({
  workout,
  onStart,
  onView,
  onEdit,
  onPublish,
  onDuplicate,
  onDelete,
  getVisibilityIcon,
  getVisibilityLabel,
  getDifficultyColor,
}: {
  workout: Workout;
  onStart: () => void;
  onView: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  getVisibilityIcon: (v?: string) => React.ReactNode;
  getVisibilityLabel: (v?: string) => string;
  getDifficultyColor: (d?: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group"
    >
      <Card className="hover:border-brand/50 transition-colors">
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0"
          >
            <Dumbbell className="h-6 w-6 text-brand" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{workout.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{workout.exerciseCount} exercises</span>
              {workout.estimatedDuration && (
                <>
                  <span>•</span>
                  <span>{workout.estimatedDuration} min</span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                {getVisibilityIcon(workout.visibility)}
                {getVisibilityLabel(workout.visibility)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onView} size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button onClick={onStart} size="sm" className="bg-brand-gradient">
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPublish}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  getVisibilityIcon,
  getVisibilityLabel,
}: {
  plan: WorkoutPlan;
  getVisibilityIcon: (v?: string) => React.ReactNode;
  getVisibilityLabel: (v?: string) => string;
}) {
  return (
    <Card className="hover:border-brand/50 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-energy/20 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-6 w-6 text-energy" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{plan.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{plan.workoutCount} workouts</span>
            {plan.duration && (
              <>
                <span>•</span>
                <span>{plan.duration}</span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              {getVisibilityIcon(plan.visibility)}
              {getVisibilityLabel(plan.visibility)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// Empty State Component
function EmptyState({
  type,
  searchQuery,
  onCreate,
}: {
  type: "workouts" | "plans" | "challenges";
  searchQuery: string;
  onCreate: () => void;
}) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-1">No results found</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {type === "workouts" ? (
        <>
          <div className="h-16 w-16 rounded-full bg-brand/20 flex items-center justify-center mb-4">
            <Dumbbell className="h-8 w-8 text-brand" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No workouts yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Create your first workout or generate one with AI to get started
          </p>
          <div className="flex gap-2">
            <Button onClick={onCreate} className="bg-brand-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Workout
            </Button>
          </div>
        </>
      ) : type === "plans" ? (
        <>
          <div className="h-16 w-16 rounded-full bg-energy/20 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-energy" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No plans yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Combine workouts into a training program to stay on track
          </p>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </>
      ) : (
        <>
          <div className="h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No challenges yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Create a challenge to push yourself or motivate others
          </p>
          <Button onClick={onCreate} className="bg-brand-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </>
      )}
    </div>
  );
}

// Create Plan Sheet
function CreatePlanSheet({
  open,
  onOpenChange,
  workouts,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workouts: Workout[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("4");
  const [visibility, setVisibility] = useState<"private" | "circle" | "public">("private");
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || selectedWorkouts.length === 0) {
      toast.error("Please enter a name and select at least one workout");
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Implement plan creation API
      toast.success("Plan created!");
      onSuccess();
      setName("");
      setDescription("");
      setSelectedWorkouts([]);
    } catch (error) {
      toast.error("Failed to create plan");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Create Training Plan</SheetTitle>
          <SheetDescription>
            Combine multiple workouts into a structured program
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-200px)]">
          <div className="space-y-6 pb-6">
            {/* Plan Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 4-Week Strength Program"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-description">Description (optional)</Label>
                <Textarea
                  id="plan-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this plan about?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Week</SelectItem>
                      <SelectItem value="2">2 Weeks</SelectItem>
                      <SelectItem value="4">4 Weeks</SelectItem>
                      <SelectItem value="6">6 Weeks</SelectItem>
                      <SelectItem value="8">8 Weeks</SelectItem>
                      <SelectItem value="12">12 Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as typeof visibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <span className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5" />
                          Private
                        </span>
                      </SelectItem>
                      <SelectItem value="circle">
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          Circle
                        </span>
                      </SelectItem>
                      <SelectItem value="public">
                        <span className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" />
                          Public
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Workout Selection */}
            <div className="space-y-3">
              <Label>Select Workouts</Label>
              {workouts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Create some workouts first
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workouts.map((workout) => {
                    const isSelected = selectedWorkouts.includes(workout.id);
                    return (
                      <button
                        key={workout.id}
                        type="button"
                        onClick={() => toggleWorkout(workout.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "border-brand bg-brand/5"
                            : "border-border hover:border-brand/50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded border-2 flex items-center justify-center",
                            isSelected
                              ? "bg-brand border-brand"
                              : "border-muted-foreground"
                          )}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{workout.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workout.exerciseCount} exercises
                            {workout.estimatedDuration &&
                              ` • ${workout.estimatedDuration} min`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-background border-t">
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || selectedWorkouts.length === 0}
            className="w-full h-12 bg-brand-gradient"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Plan ({selectedWorkouts.length} workout
            {selectedWorkouts.length !== 1 ? "s" : ""})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Challenge Card Component
function ChallengeCard({
  challenge,
  onDelete,
  getVisibilityIcon,
  getVisibilityLabel,
  getDifficultyColor,
}: {
  challenge: UserChallenge;
  onDelete: () => void;
  getVisibilityIcon: (v?: string) => React.ReactNode;
  getVisibilityLabel: (v?: string) => string;
  getDifficultyColor: (d?: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="hover:border-brand/50 transition-colors">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-6 w-6 text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{challenge.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{challenge.durationDays} days</span>
              <span className="text-muted-foreground/50">|</span>
              <Badge className={cn("text-[10px] px-1.5 py-0", getDifficultyColor(challenge.difficulty))}>
                {challenge.difficulty}
              </Badge>
              <span className="text-muted-foreground/50">|</span>
              <span className="flex items-center gap-1">
                {getVisibilityIcon(challenge.visibility)}
                {getVisibilityLabel(challenge.visibility)}
              </span>
            </div>
            {challenge.participantCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {challenge.participantCount} participant{challenge.participantCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Create Challenge Sheet
function CreateChallengeSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("strength");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [durationDays, setDurationDays] = useState("30");
  const [visibility, setVisibility] = useState<"private" | "circle" | "public">("private");
  const [restartOnFail, setRestartOnFail] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<DailyTaskInput[]>([
    { name: "", type: "workout", isRequired: true, description: "" },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const addDailyTask = () => {
    if (dailyTasks.length >= 10) return;
    setDailyTasks([
      ...dailyTasks,
      { name: "", type: "custom", isRequired: true, description: "" },
    ]);
  };

  const removeDailyTask = (index: number) => {
    if (dailyTasks.length <= 1) return;
    setDailyTasks(dailyTasks.filter((_, i) => i !== index));
  };

  const updateDailyTask = (index: number, field: keyof DailyTaskInput, value: string | boolean) => {
    setDailyTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("strength");
    setDifficulty("intermediate");
    setDurationDays("30");
    setVisibility("private");
    setRestartOnFail(false);
    setDailyTasks([{ name: "", type: "workout", isRequired: true, description: "" }]);
  };

  const handleCreate = async () => {
    if (!name.trim() || name.length < 3) {
      toast.error("Challenge name must be at least 3 characters");
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }
    const validTasks = dailyTasks.filter((t) => t.name.trim());
    if (validTasks.length === 0) {
      toast.error("Add at least one daily task");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          difficulty,
          durationDays: parseInt(durationDays),
          visibility,
          restartOnFail,
          dailyTasks: validTasks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create challenge");
      }

      toast.success("Challenge created!");
      haptics.medium();
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create challenge");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Create Challenge</SheetTitle>
          <SheetDescription>
            Set daily tasks and challenge yourself or others
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-200px)]">
          <div className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="challenge-name">Name</Label>
                <Input
                  id="challenge-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 30-Day Push-Up Challenge"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenge-description">Description</Label>
                <Textarea
                  id="challenge-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this challenge about? What will participants achieve?"
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </div>

            {/* Category, Difficulty, Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  min={1}
                  max={365}
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as typeof visibility)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        Private
                      </span>
                    </SelectItem>
                    <SelectItem value="circle">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Circle
                      </span>
                    </SelectItem>
                    <SelectItem value="public">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        Public
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Restart on fail toggle */}
            <button
              type="button"
              onClick={() => setRestartOnFail(!restartOnFail)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                restartOnFail
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-brand/50"
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center",
                  restartOnFail
                    ? "bg-brand border-brand"
                    : "border-muted-foreground"
                )}
              >
                {restartOnFail && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Restart on fail</p>
                <p className="text-xs text-muted-foreground">
                  Missing a day resets progress to day 1 (like 75 Hard)
                </p>
              </div>
            </button>

            {/* Daily Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Daily Tasks</Label>
                <span className="text-xs text-muted-foreground">
                  {dailyTasks.length}/10
                </span>
              </div>

              {dailyTasks.map((task, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Task {index + 1}
                    </span>
                    {dailyTasks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeDailyTask(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={task.name}
                    onChange={(e) => updateDailyTask(index, "name", e.target.value)}
                    placeholder="e.g., Complete 50 push-ups"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={task.type}
                      onValueChange={(v) => updateDailyTask(index, "type", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAILY_TASK_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() =>
                        updateDailyTask(index, "isRequired", !task.isRequired)
                      }
                      className={cn(
                        "h-9 flex items-center justify-center gap-1.5 rounded-md border text-sm",
                        task.isRequired
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {task.isRequired ? "Required" : "Optional"}
                    </button>
                  </div>
                  <Input
                    value={task.description}
                    onChange={(e) =>
                      updateDailyTask(index, "description", e.target.value)
                    }
                    placeholder="Description (optional)"
                    className="h-9"
                  />
                </div>
              ))}

              {dailyTasks.length < 10 && (
                <Button
                  variant="outline"
                  onClick={addDailyTask}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-background border-t">
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !description.trim()}
            className="w-full h-12 bg-brand-gradient"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trophy className="h-4 w-4 mr-2" />
            )}
            Create Challenge
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
