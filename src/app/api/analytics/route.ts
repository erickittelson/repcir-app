import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutPlans,
  circleMembers,
  userMetrics,
  personalRecords,
  goals,
  exercises,
} from "@/lib/db/schema";
import { eq, and, gte, desc, inArray, sql, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get family members
    const members = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, session.circleId),
      columns: { id: true },
    });

    const memberIds =
      memberId && memberId !== "all"
        ? [memberId]
        : members.map((m) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        workoutsByWeek: [],
        workoutsByCategory: [],
        weightProgress: [],
        personalRecords: [],
        goalsCompleted: 0,
        goalsActive: 0,
        totalWorkouts: 0,
        streakDays: 0,
      });
    }

    // Get total workouts in time range
    const workouts = await db.query.workoutSessions.findMany({
      where: and(
        inArray(workoutSessions.memberId, memberIds),
        gte(workoutSessions.date, startDate),
        eq(workoutSessions.status, "completed")
      ),
      with: {
        plan: true,
      },
    });

    // Group workouts by week
    const workoutsByWeek: Record<string, number> = {};
    workouts.forEach((w) => {
      const weekStart = new Date(w.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      workoutsByWeek[weekKey] = (workoutsByWeek[weekKey] || 0) + 1;
    });

    const workoutsByWeekArray = Object.entries(workoutsByWeek)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Group workouts by category
    const categoryCount: Record<string, number> = {};
    workouts.forEach((w) => {
      const category = w.plan?.category || "uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const workoutsByCategory = Object.entries(categoryCount).map(
      ([category, count]) => ({
        category,
        count,
      })
    );

    // Get weight progress (user-scoped)
    const membersForMetrics = await db.query.circleMembers.findMany({
      where: inArray(circleMembers.id, memberIds),
      columns: { userId: true },
    });
    const userIdsForMetrics = membersForMetrics.map((m) => m.userId).filter(Boolean) as string[];

    const weightData = userIdsForMetrics.length > 0
      ? await db.query.userMetrics.findMany({
          where: and(
            inArray(userMetrics.userId, userIdsForMetrics),
            gte(userMetrics.date, startDate)
          ),
          orderBy: [userMetrics.date],
        })
      : [];

    const weightProgress = weightData
      .filter((m: typeof userMetrics.$inferSelect) => m.weight)
      .map((m: typeof userMetrics.$inferSelect) => ({
        date: m.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        weight: m.weight!,
      }));

    // Get personal records
    const prs = await db.query.personalRecords.findMany({
      where: inArray(personalRecords.memberId, memberIds),
      with: {
        exercise: true,
      },
      orderBy: [desc(personalRecords.date)],
      limit: 10,
    });

    const prData = prs.map((pr) => ({
      exercise: pr.exercise.name,
      value: pr.value,
      unit: pr.unit,
      date: pr.date.toISOString(),
    }));

    // Get goals stats
    const allGoals = await db.query.goals.findMany({
      where: inArray(goals.memberId, memberIds),
    });

    const goalsCompleted = allGoals.filter((g) => g.status === "completed").length;
    const goalsActive = allGoals.filter((g) => g.status === "active").length;

    // Calculate streak (simplified)
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedWorkouts = workouts
      .map((w) => {
        const d = new Date(w.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .sort((a, b) => b - a);

    const uniqueDays = [...new Set(sortedWorkouts)];

    for (let i = 0; i < uniqueDays.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (uniqueDays.includes(expectedDate.getTime())) {
        streakDays++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      workoutsByWeek: workoutsByWeekArray,
      workoutsByCategory,
      weightProgress,
      personalRecords: prData,
      goalsCompleted,
      goalsActive,
      totalWorkouts: workouts.length,
      streakDays,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
