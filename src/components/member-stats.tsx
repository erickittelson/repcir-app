"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Flame,
  Trophy,
  Target,
  Calendar,
  Dumbbell,
  Medal,
  Weight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
  progress?: number;
  target?: number;
}

interface MemberStats {
  streak: {
    current: number;
    longest: number;
    lastWorkoutDate: string | null;
  };
  workouts: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    avgRating: number;
  };
  volume: {
    total: number;
    formatted: string;
  };
  records: {
    personalRecords: number;
    completedGoals: number;
  };
  achievements: Achievement[];
}

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-4 w-4" />,
  flame: <Flame className="h-4 w-4" />,
  weight: <Weight className="h-4 w-4" />,
  medal: <Medal className="h-4 w-4" />,
  target: <Target className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
};

interface MemberStatsProps {
  memberId: string;
  compact?: boolean;
}

export function MemberStats({ memberId, compact = false }: MemberStatsProps) {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [memberId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const earnedAchievements = stats.achievements.filter((a) => a.earnedAt);
  const inProgressAchievements = stats.achievements.filter((a) => !a.earnedAt);

  if (compact) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.streak.current}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.workouts.thisWeek}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg">
                <Dumbbell className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.workouts.total}</p>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{earnedAchievements.length}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.streak.current}</p>
                <p className="text-xs text-muted-foreground">
                  Day Streak (Best: {stats.streak.longest})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.workouts.thisWeek}/{stats.workouts.thisMonth}
                </p>
                <p className="text-xs text-muted-foreground">Week / Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg">
                <Weight className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.volume.formatted}</p>
                <p className="text-xs text-muted-foreground">Total Volume</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Medal className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.records.personalRecords}</p>
                <p className="text-xs text-muted-foreground">Personal Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements ({earnedAchievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedAchievements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Complete workouts to earn achievements!
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {earnedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-600">
                    {iconMap[achievement.icon]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In Progress Achievements */}
      {inProgressAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressAchievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground">
                        {iconMap[achievement.icon]}
                      </div>
                      <span className="text-sm font-medium">{achievement.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {achievement.progress?.toLocaleString()} / {achievement.target?.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((achievement.progress || 0) / (achievement.target || 1)) * 100
                    }
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
