"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Medal,
  Play,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChallengeClientProps {
  challenge: {
    id: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    category: string;
    difficulty: string;
    durationDays: number;
    participantCount: number;
    rules: string[];
    dailyTasks: unknown;
    coverImage: string | null;
    unlockMessage: string | null;
  };
  participation: {
    id: string;
    status: string | null;
    daysCompleted: number | null;
    currentStreak: number | null;
    startDate: Date | null;
  } | null;
  progress: Array<{
    day: number;
    completed: boolean;
    date: Date;
    tasksCompleted: unknown;
  }>;
  leaderboard: Array<{
    rank: number;
    userId: string;
    name: string;
    profilePicture: string | null;
    progress: number;
    streak: number;
  }>;
  userId: string;
}

export function ChallengeClient({
  challenge,
  participation,
  progress,
  leaderboard,
  userId,
}: ChallengeClientProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  const daysCompleted = progress.filter((p) => p.completed).length;
  const totalDays = challenge.durationDays || 30;
  const progressPercent = (daysCompleted / totalDays) * 100;
  const currentStreak = participation?.currentStreak || 0;

  const rules = challenge.rules || [];
  const dailyTasks = (challenge.dailyTasks as { name: string; description?: string; type: string; isRequired: boolean }[]) || [];

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to join");
      toast.success("Joined challenge!");
      router.refresh();
    } catch {
      toast.error("Failed to join challenge");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCheckIn = () => {
    router.push(`/challenge/${challenge.id}/today`);
  };

  // Find user's rank
  const userRank = leaderboard.find((l) => l.userId === userId)?.rank;

  return (
    <div className="p-4 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">{challenge.name}</h1>
        <p className="text-sm text-muted-foreground">
          {challenge.durationDays} day challenge
        </p>
      </div>

      {/* Challenge Overview Card */}
        <Card className="bg-gradient-to-br from-energy/10 to-brand/10 border-energy/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-energy-gradient flex items-center justify-center">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{challenge.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {challenge.shortDescription || challenge.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {challenge.category && (
                    <Badge variant="secondary">{challenge.category}</Badge>
                  )}
                  {challenge.difficulty && (
                    <Badge variant="outline">{challenge.difficulty}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto text-energy" />
                <p className="text-lg font-bold mt-1">{challenge.durationDays}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-brand" />
                <p className="text-lg font-bold mt-1">
                  {challenge.participantCount || 0}
                </p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </div>
              <div className="text-center">
                <Trophy className="h-5 w-5 mx-auto text-success" />
                <p className="text-lg font-bold mt-1">{dailyTasks.length}</p>
                <p className="text-xs text-muted-foreground">Tasks/Day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participation Status / Progress */}
        {participation ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-energy" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {daysCompleted} of {totalDays} days
                  </span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">{currentStreak} day streak</span>
                  </div>
                  {userRank && (
                    <Badge variant="secondary">
                      <Medal className="h-3 w-3 mr-1" />
                      Rank #{userRank}
                    </Badge>
                  )}
                </div>

                <Button
                  className="w-full bg-energy-gradient"
                  size="lg"
                  onClick={handleCheckIn}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Check In Today
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            className="w-full bg-energy-gradient"
            size="lg"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Challenge"}
          </Button>
        )}

        <Separator />

        {/* Rules */}
        {rules.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Challenge Rules</h3>
            <Card>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Tasks */}
        {dailyTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Daily Tasks</h3>
            <Card>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {dailyTasks.map((task, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{task.name}</span>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion Reward */}
        {challenge.unlockMessage && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Completion Reward</h3>
            <Card className="bg-success/5 border-success/20">
              <CardContent className="py-3 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-success" />
                <p className="text-sm">{challenge.unlockMessage}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Leaderboard */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-energy" />
            Leaderboard
          </h3>
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        entry.userId === userId
                          ? "bg-brand/10 border border-brand/20"
                          : "bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                          entry.rank === 1
                            ? "bg-yellow-500 text-yellow-950"
                            : entry.rank === 2
                            ? "bg-gray-400 text-gray-900"
                            : entry.rank === 3
                            ? "bg-amber-600 text-amber-950"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {entry.rank}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.profilePicture || undefined} />
                        <AvatarFallback>
                          {entry.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.progress} days · {entry.streak} day streak
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
