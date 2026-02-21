"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Clock,
  Star,
  Users,
  Share2,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Calendar,
  Target,
  Award,
  Flame,
  AlertTriangle,
  Medal,
  RefreshCcw,
  Lock,
  Play,
  SkipForward,
  Dumbbell,
  CircleDashed,
  Camera,
  Image as ImageIcon,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDifficultyBrand, getCustomOrDefaultLabel } from "@/lib/difficulty-branding";

interface DailyTask {
  // Standard format
  name?: string;
  description?: string;
  type?: "workout" | "nutrition" | "mindset" | "recovery" | "custom";
  isRequired?: boolean;
  // Alternate format from some seed data
  task?: string;
  target?: string;
}

interface WeeklyFocus {
  week: number;
  focus: string;
  notes?: string;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  streak: number;
  completedDays: number;
}

interface Milestone {
  id: string;
  order: number;
  name: string;
  description?: string;
  workoutPlanId?: string;
  workoutPlanName?: string;
  programWeekId?: string;
  programWeekName?: string;
  goalTargetValue?: number;
  goalTargetUnit?: string;
  durationDays?: number;
  completionType: string;
  requiredCompletions: number;
  unlockMessage?: string;
  // User progress
  status: "locked" | "active" | "completed" | "skipped";
  completionCount: number;
  progressPercent: number;
  startedAt?: Date;
  completedAt?: Date;
}

interface ProofUpload {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl?: string;
  visibility: "private" | "circle" | "public";
  caption?: string;
  dayNumber?: number;
  createdAt: string;
}

interface ChallengeDetail {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  category: string;
  difficulty: string;
  durationDays: number;
  rules: string[];
  dailyTasks: DailyTask[];
  progressionType?: string;
  restartOnFail: boolean;
  weeklyStructure?: WeeklyFocus[];
  // Stats
  participantCount: number;
  completionCount: number;
  avgCompletionRate?: number;
  avgRating?: number;
  ratingCount?: number;
  // Attribution
  isOfficial: boolean;
  isFeatured: boolean;
  // Fun branding
  difficultyLabel?: string;
  brandingTheme?: string;
  // User status
  isJoined?: boolean;
  userProgress?: {
    currentDay: number;
    streak: number;
    status: "active" | "completed" | "failed";
  };
  // Leaderboard
  leaderboard?: LeaderboardEntry[];
  // Badge earned on completion
  completionBadge?: {
    id: string;
    name: string;
    icon: string;
    description?: string;
    tier?: string;
    rarity?: string;
    unlockMessage?: string;
  };
}

interface ChallengeDetailSheetProps {
  challengeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: (challengeId: string) => void;
}

export function ChallengeDetailSheet({
  challengeId,
  open,
  onOpenChange,
  onJoin,
}: ChallengeDetailSheetProps) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [proofs, setProofs] = useState<ProofUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofVisibility, setProofVisibility] = useState<"private" | "circle" | "public">("private");

  useEffect(() => {
    if (open && challengeId) {
      setLoading(true);
      Promise.all([
        fetch(`/api/challenges/${challengeId}`).then((res) => res.json()),
        fetch(`/api/challenges/${challengeId}/milestones`).then((res) => res.json()),
      ])
        .then(([challengeData, milestonesData]) => {
          setChallenge(challengeData);
          setMilestones(milestonesData.milestones || []);
          // Fetch proofs if user is joined
          if (challengeData.isJoined) {
            fetch(`/api/challenges/${challengeId}/proof`)
              .then((res) => res.json())
              .then((data) => setProofs(data.proofs || []))
              .catch(console.error);
          }
        })
        .catch(() => toast.error("Failed to load challenge"))
        .finally(() => setLoading(false));
    }
  }, [open, challengeId]);
  
  // Handle proof upload (via file input)
  const handleProofUpload = async (file: File) => {
    if (!challengeId) return;
    
    setUploadingProof(true);
    try {
      // In production, upload to a storage service (S3, Cloudinary, etc.)
      // For now, we'll create a data URL for demo purposes
      const reader = new FileReader();
      reader.onload = async () => {
        const mediaUrl = reader.result as string;
        const mediaType = file.type.startsWith("video/") ? "video" : "image";
        
        const res = await fetch(`/api/challenges/${challengeId}/proof`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaType,
            mediaUrl,
            visibility: proofVisibility,
            dayNumber: challenge?.userProgress?.currentDay,
          }),
        });
        
        if (res.ok) {
          const newProof = await res.json();
          setProofs((prev) => [newProof, ...prev]);
          setShowProofUpload(false);
          toast.success("Proof uploaded!");
        } else {
          toast.error("Failed to upload proof");
        }
        setUploadingProof(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploadingProof(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload proof");
      setUploadingProof(false);
    }
  };

  const handleMilestoneAction = async (milestoneId: string, action: "complete" | "skip" | "progress") => {
    if (!challengeId) return;
    setUpdatingMilestone(milestoneId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/milestones/${milestoneId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update milestone in state
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  status: data.progress.status,
                  completionCount: data.progress.completionCount,
                  completedAt: data.progress.completedAt,
                  progressPercent: Math.min(100, (data.progress.completionCount / m.requiredCompletions) * 100),
                }
              : m
          )
        );
        if (data.unlockMessage) {
          toast.success(data.unlockMessage);
        } else if (action === "complete") {
          toast.success("Milestone completed!");
        } else if (action === "skip") {
          toast.success("Milestone skipped");
        } else {
          toast.success("Progress recorded!");
        }
        // Re-fetch milestones to get updated statuses
        fetch(`/api/challenges/${challengeId}/milestones`)
          .then((res) => res.json())
          .then((data) => setMilestones(data.milestones || []));
      }
    } catch {
      toast.error("Failed to update milestone");
    } finally {
      setUpdatingMilestone(null);
    }
  };

  const handleJoin = async () => {
    if (!challengeId) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
      });
      if (res.ok) {
        setChallenge((prev) =>
          prev ? { ...prev, isJoined: true } : prev
        );
        toast.success("Challenge joined! Good luck!");
        if (onJoin) onJoin(challengeId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to join challenge");
      }
    } catch {
      toast.error("Failed to join challenge");
    } finally {
      setJoining(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/challenge/${challengeId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it with friends.");
  };

  const getDifficultyColorClass = (difficulty: string) => {
    const brand = getDifficultyBrand(difficulty);
    return `${brand.bgColor} ${brand.color} ${brand.borderColor}`;
  };

  const getTaskTypeIcon = (type: DailyTask["type"]) => {
    switch (type) {
      case "workout":
        return <Target className="h-3 w-3" />;
      case "nutrition":
        return <Flame className="h-3 w-3" />;
      case "mindset":
        return <Star className="h-3 w-3" />;
      case "recovery":
        return <RefreshCcw className="h-3 w-3" />;
      default:
        return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        {/* Accessible title - always present for screen readers */}
        {(loading || !challenge) && (
          <SheetHeader className="sr-only">
            <SheetTitle>Challenge Details</SheetTitle>
          </SheetHeader>
        )}

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : challenge ? (
          <ScrollArea className="h-full">
            <div className="px-6 pb-32">
              {/* Cover Image */}
              {challenge.coverImage && (
                <div className="relative -mx-6 h-40 mb-4">
                  <img
                    src={challenge.coverImage}
                    alt={challenge.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                </div>
              )}

              <SheetHeader className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {challenge.isOfficial && (
                        <Badge className="bg-brand text-white text-[10px]">
                          Official
                        </Badge>
                      )}
                      {challenge.isFeatured && (
                        <Badge className="bg-energy text-white text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-xl">{challenge.name}</SheetTitle>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getDifficultyColorClass(challenge.difficulty))}
                >
                  {getCustomOrDefaultLabel(challenge.difficultyLabel, challenge.difficulty)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {challenge.category}
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {challenge.durationDays} days
                </Badge>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {challenge.participantCount.toLocaleString()} participants
                </span>
                {challenge.avgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {challenge.avgRating.toFixed(1)}
                  </span>
                )}
                {challenge.avgCompletionRate && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {Math.round(challenge.avgCompletionRate)}% complete
                  </span>
                )}
              </div>

              {/* User Progress (if joined) */}
              {challenge.isJoined && challenge.userProgress && (
                <section className="mb-6 p-4 bg-brand/10 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" />
                    Your Progress
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">
                      Day {challenge.userProgress.currentDay} of{" "}
                      {challenge.durationDays}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {challenge.userProgress.streak} day streak 🔥
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (challenge.userProgress.currentDay / challenge.durationDays) *
                      100
                    }
                    className="h-2"
                  />
                </section>
              )}

              {/* Description */}
              {challenge.description && (
                <section className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    {challenge.description}
                  </p>
                </section>
              )}

              {/* Warning for restart on fail */}
              {challenge.restartOnFail && (
                <section className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-destructive">
                        No Fail Policy
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Missing a day resets your progress to day 1. Stay
                        committed!
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Daily Tasks */}
              {challenge.dailyTasks && challenge.dailyTasks.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Daily Requirements
                  </h3>
                  <div className="space-y-2">
                    {challenge.dailyTasks.map((task, idx) => {
                      // Handle both {name, type, isRequired} and {task, target} formats
                      const taskName = task.name || task.task || "Task";
                      const taskDesc = task.description || task.target;
                      const taskType = task.type || "custom";
                      const isRequired = task.isRequired ?? false;

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0",
                              isRequired
                                ? "bg-brand/20 text-brand"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {getTaskTypeIcon(taskType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{taskName}</p>
                              {isRequired && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-brand/30 text-brand"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                            {taskDesc && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {taskDesc}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Rules */}
              {challenge.rules && challenge.rules.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-energy" />
                    Challenge Rules
                  </h3>
                  <ul className="space-y-2">
                    {challenge.rules.map((rule, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Weekly Structure */}
              {challenge.weeklyStructure && challenge.weeklyStructure.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-brand" />
                    Weekly Focus
                  </h3>
                  <div className="space-y-2">
                    {challenge.weeklyStructure.map((week) => (
                      <div
                        key={week.week}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm">
                          W{week.week}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{week.focus}</p>
                          {week.notes && (
                            <p className="text-xs text-muted-foreground">
                              {week.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Milestones Timeline */}
              {milestones.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" />
                    Milestone Roadmap
                  </h3>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-muted" />
                    
                    <div className="space-y-4">
                      {milestones.map((milestone, idx) => {
                        const isActive = milestone.status === "active";
                        const isCompleted = milestone.status === "completed";
                        const isSkipped = milestone.status === "skipped";
                        const isLocked = milestone.status === "locked";

                        return (
                          <div
                            key={milestone.id}
                            className={cn(
                              "relative pl-12",
                              isLocked && "opacity-50"
                            )}
                          >
                            {/* Timeline dot */}
                            <div
                              className={cn(
                                "absolute left-2 top-1 h-6 w-6 rounded-full flex items-center justify-center z-10",
                                isCompleted && "bg-success text-white",
                                isSkipped && "bg-muted text-muted-foreground",
                                isActive && "bg-brand text-white animate-pulse",
                                isLocked && "bg-muted text-muted-foreground"
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : isSkipped ? (
                                <SkipForward className="h-3.5 w-3.5" />
                              ) : isActive ? (
                                <Play className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                            </div>

                            {/* Milestone Card */}
                            <div
                              className={cn(
                                "p-4 rounded-lg border",
                                isActive && "border-brand bg-brand/5",
                                isCompleted && "border-success/30 bg-success/5",
                                isSkipped && "border-muted bg-muted/20",
                                isLocked && "border-muted"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      Phase {milestone.order}
                                    </span>
                                    {milestone.durationDays && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {milestone.durationDays} days
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-semibold text-sm mt-1">
                                    {milestone.name}
                                  </h4>
                                  {milestone.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {milestone.description}
                                    </p>
                                  )}

                                  {/* Linked workout */}
                                  {milestone.workoutPlanName && (
                                    <div className="flex items-center gap-2 mt-2 text-xs">
                                      <Dumbbell className="h-3 w-3 text-brand" />
                                      <span className="text-brand">
                                        {milestone.workoutPlanName}
                                      </span>
                                    </div>
                                  )}

                                  {/* Goal target */}
                                  {milestone.goalTargetValue && (
                                    <div className="flex items-center gap-2 mt-2 text-xs">
                                      <Target className="h-3 w-3 text-energy" />
                                      <span>
                                        Target: {milestone.goalTargetValue} {milestone.goalTargetUnit}
                                      </span>
                                    </div>
                                  )}

                                  {/* Progress bar for active milestone */}
                                  {(isActive || isCompleted) && milestone.requiredCompletions > 1 && (
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>Progress</span>
                                        <span>
                                          {milestone.completionCount}/{milestone.requiredCompletions}
                                        </span>
                                      </div>
                                      <Progress
                                        value={milestone.progressPercent}
                                        className="h-1.5"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons for active milestone */}
                              {isActive && challenge.isJoined && (
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                  {milestone.completionType === "manual" ? (
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-success hover:bg-success/90"
                                      onClick={() => handleMilestoneAction(milestone.id, "complete")}
                                      disabled={updatingMilestone === milestone.id}
                                    >
                                      {updatingMilestone === milestone.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => handleMilestoneAction(milestone.id, "progress")}
                                      disabled={updatingMilestone === milestone.id}
                                    >
                                      {updatingMilestone === milestone.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <CircleDashed className="h-3 w-3 mr-1" />
                                          Log Progress
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMilestoneAction(milestone.id, "skip")}
                                    disabled={updatingMilestone === milestone.id}
                                  >
                                    <SkipForward className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}

                              {/* Unlock message for completed */}
                              {isCompleted && milestone.unlockMessage && (
                                <p className="text-xs text-success mt-2 italic">
                                  {milestone.unlockMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
              
              {/* Proof Upload Section - only visible when joined */}
              {challenge.isJoined && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-brand" />
                    Your Progress Proof
                  </h3>
                  
                  {/* Upload Button */}
                  {showProofUpload ? (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-dashed">
                      <div className="text-center">
                        <label className="cursor-pointer">
                          <div className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-muted/80 transition-colors">
                            <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                              {uploadingProof ? (
                                <Loader2 className="h-6 w-6 text-brand animate-spin" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-brand" />
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {uploadingProof ? "Uploading..." : "Tap to select photo or video"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Max 10MB - PNG, JPG, MP4
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={uploadingProof}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProofUpload(file);
                            }}
                          />
                        </label>
                      </div>
                      
                      {/* Visibility Selection */}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-muted-foreground">Visibility:</span>
                        <div className="inline-flex rounded-md bg-background p-0.5 border">
                          <button
                            onClick={() => setProofVisibility("private")}
                            className={cn(
                              "px-3 py-1 text-xs rounded-sm transition-colors flex items-center gap-1",
                              proofVisibility === "private" 
                                ? "bg-muted text-foreground" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <EyeOff className="h-3 w-3" />
                            Private
                          </button>
                          <button
                            onClick={() => setProofVisibility("circle")}
                            className={cn(
                              "px-3 py-1 text-xs rounded-sm transition-colors flex items-center gap-1",
                              proofVisibility === "circle" 
                                ? "bg-muted text-foreground" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Users className="h-3 w-3" />
                            Circle
                          </button>
                          <button
                            onClick={() => setProofVisibility("public")}
                            className={cn(
                              "px-3 py-1 text-xs rounded-sm transition-colors flex items-center gap-1",
                              proofVisibility === "public" 
                                ? "bg-muted text-foreground" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Globe className="h-3 w-3" />
                            Public
                          </button>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowProofUpload(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowProofUpload(true)}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Proof Photo/Video
                    </Button>
                  )}
                  
                  {/* Existing Proofs Gallery */}
                  {proofs.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Your uploads ({proofs.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {proofs.slice(0, 6).map((proof) => (
                          <div
                            key={proof.id}
                            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                          >
                            {proof.mediaType === "image" ? (
                              <img
                                src={proof.mediaUrl}
                                alt={`Day ${proof.dayNumber || "?"} proof`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <video
                                src={proof.mediaUrl}
                                className="h-full w-full object-cover"
                              />
                            )}
                            {/* Visibility indicator */}
                            <div className="absolute top-1 right-1">
                              {proof.visibility === "private" && (
                                <div className="h-5 w-5 rounded-full bg-black/50 flex items-center justify-center">
                                  <EyeOff className="h-3 w-3 text-white" />
                                </div>
                              )}
                              {proof.visibility === "circle" && (
                                <div className="h-5 w-5 rounded-full bg-blue-500/80 flex items-center justify-center">
                                  <Users className="h-3 w-3 text-white" />
                                </div>
                              )}
                              {proof.visibility === "public" && (
                                <div className="h-5 w-5 rounded-full bg-green-500/80 flex items-center justify-center">
                                  <Globe className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            {/* Day badge */}
                            {proof.dayNumber && (
                              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px]">
                                Day {proof.dayNumber}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {proofs.length > 6 && (
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View all {proofs.length} uploads
                        </Button>
                      )}
                    </div>
                  )}
                </section>
              )}

              <Separator className="my-6" />

              {/* Completion Badge */}
              {challenge.completionBadge && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-success" />
                    Completion Reward
                  </h3>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-success/10 to-brand/10 rounded-lg border border-success/20">
                    <div className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center text-3xl",
                      challenge.completionBadge.tier === "platinum" && "bg-gradient-to-br from-purple-400 to-indigo-500 shadow-lg shadow-purple-500/30",
                      challenge.completionBadge.tier === "gold" && "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30",
                      challenge.completionBadge.tier === "silver" && "bg-gradient-to-br from-gray-300 to-gray-400 shadow-lg shadow-gray-500/30",
                      challenge.completionBadge.tier === "bronze" && "bg-gradient-to-br from-amber-600 to-amber-700 shadow-lg shadow-amber-700/30",
                      !challenge.completionBadge.tier && "bg-success/20"
                    )}>
                      {challenge.completionBadge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {challenge.completionBadge.name}
                        </p>
                        {challenge.completionBadge.rarity && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px]",
                              challenge.completionBadge.rarity === "legendary" && "border-purple-500/50 text-purple-500",
                              challenge.completionBadge.rarity === "epic" && "border-indigo-500/50 text-indigo-500",
                              challenge.completionBadge.rarity === "rare" && "border-blue-500/50 text-blue-500",
                              challenge.completionBadge.rarity === "uncommon" && "border-green-500/50 text-green-500",
                              challenge.completionBadge.rarity === "common" && "border-muted-foreground/50 text-muted-foreground"
                            )}
                          >
                            {challenge.completionBadge.rarity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {challenge.completionBadge.description || "Earn this badge by completing the challenge"}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Leaderboard Preview */}
              {challenge.leaderboard && challenge.leaderboard.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Medal className="h-4 w-4 text-yellow-500" />
                      Leaderboard
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowFullLeaderboard(true)}
                    >
                      See All
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {challenge.leaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.userId}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "font-bold text-sm w-6",
                            entry.rank === 1 && "text-yellow-500",
                            entry.rank === 2 && "text-gray-400",
                            entry.rank === 3 && "text-amber-600"
                          )}
                        >
                          #{entry.rank}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.avatarUrl} />
                          <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Day {entry.completedDays} · {entry.streak} streak
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" className="flex-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              {challenge.isJoined ? (
                <Button
                  className="w-full bg-success"
                  onClick={() => router.push(`/challenge/${challengeId}/today`)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Check In Today
                </Button>
              ) : (
                <Button
                  className="w-full bg-brand-gradient"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trophy className="h-4 w-4 mr-2" />
                  )}
                  Join Challenge
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Challenge not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
