import { db } from "@/lib/db";
import {
  workoutSessions,
  circleMembers,
  challengeParticipants,
} from "@/lib/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { cacheUserData } from "@/lib/cache";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Footprints, Swords } from "lucide-react";
import type { AppSession } from "@/lib/neon-auth";

interface DashboardSectionProps {
  session: AppSession;
}

export async function DashboardSection({ session }: DashboardSectionProps) {
  const userId = session.user.id;

  const data = await cacheUserData(
    userId,
    "home-dashboard",
    async () => {
      const allMemberships = await db.query.circleMembers.findMany({
        where: eq(circleMembers.userId, userId),
        columns: { id: true },
      });
      const allMemberIds = allMemberships.map((m) => m.id);

      const weekStart = getWeekStart();

      const [weekWorkouts, activeChallenges] = await Promise.all([
        allMemberIds.length > 0
          ? db.query.workoutSessions.findMany({
              where: and(
                inArray(workoutSessions.memberId, allMemberIds),
                gte(workoutSessions.date, weekStart),
                eq(workoutSessions.status, "completed")
              ),
              columns: { date: true },
            })
          : Promise.resolve([]),

        db.query.challengeParticipants.findMany({
          where: and(
            eq(challengeParticipants.userId, userId),
            eq(challengeParticipants.status, "active")
          ),
          columns: { id: true },
        }),
      ]);

      return {
        currentStreak: calculateStreak(weekWorkouts),
        activeChallengesCount: activeChallenges.length,
      };
    },
    { ttl: 60 }
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      <StepsPlaceholderCard />
      <Link href="/you/achievements">
        <StatCard
          icon={<Flame className="h-5 w-5 text-energy" />}
          value={data.currentStreak}
          label="Day Streak"
        />
      </Link>
      <Link href="/discover?tab=challenges">
        <StatCard
          icon={<Swords className="h-5 w-5 text-success" />}
          value={data.activeChallengesCount}
          label="Challenges"
        />
      </Link>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 text-center">
        <div className="mx-auto w-fit">{icon}</div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StepsPlaceholderCard() {
  return (
    <Card className="border-border/50 opacity-60">
      <CardContent className="p-3 text-center">
        <div className="mx-auto w-fit">
          <Footprints className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-1 text-lg font-bold text-muted-foreground">--</p>
        <p className="text-[10px] text-muted-foreground">Steps</p>
        <p className="text-[8px] text-muted-foreground/60 mt-0.5">
          Garmin & Apple coming soon
        </p>
      </CardContent>
    </Card>
  );
}

function getWeekStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - now.getDay() + 1); // Monday
  return now;
}

function calculateStreak(workouts: Array<{ date: Date }>): number {
  if (workouts.length === 0) return 0;

  const workoutDates = new Set(
    workouts.map((w) => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (workoutDates.has(checkDate.getTime())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

