import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  communityPrograms,
  programWeeks,
  programWorkouts,
  programEnrollments,
  workoutPlans,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get program details
    const program = await db.query.communityPrograms.findFirst({
      where: eq(communityPrograms.id, id),
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Get program weeks with workouts
    const weeks = await db
      .select({
        id: programWeeks.id,
        weekNumber: programWeeks.weekNumber,
        name: programWeeks.name,
        focus: programWeeks.focus,
        notes: programWeeks.notes,
      })
      .from(programWeeks)
      .where(eq(programWeeks.programId, id))
      .orderBy(asc(programWeeks.weekNumber));

    // Get all workouts for this program
    const workouts = await db
      .select({
        id: programWorkouts.id,
        weekId: programWorkouts.weekId,
        weekNumber: programWorkouts.weekNumber,
        dayNumber: programWorkouts.dayNumber,
        name: programWorkouts.name,
        focus: programWorkouts.focus,
        estimatedDuration: programWorkouts.estimatedDuration,
        workoutPlanId: programWorkouts.workoutPlanId,
        notes: programWorkouts.notes,
      })
      .from(programWorkouts)
      .where(eq(programWorkouts.programId, id))
      .orderBy(asc(programWorkouts.weekNumber), asc(programWorkouts.dayNumber));

    // Check if user is enrolled
    const enrollment = await db.query.programEnrollments.findFirst({
      where: and(
        eq(programEnrollments.programId, id),
        eq(programEnrollments.userId, session.user.id)
      ),
    });

    // Build week structure with workouts
    const weeksWithWorkouts = weeks.map((week) => ({
      ...week,
      workouts: workouts.filter((w) => w.weekNumber === week.weekNumber),
    }));

    // Calculate total workouts
    const totalWorkouts = workouts.length;

    return NextResponse.json({
      id: program.id,
      name: program.name,
      description: program.description,
      category: program.category,
      difficulty: program.difficulty,
      durationWeeks: program.durationWeeks,
      daysPerWeek: program.daysPerWeek,
      avgWorkoutDuration: program.avgWorkoutDuration,
      primaryGoal: program.primaryGoal,
      targetMuscles: program.targetMuscles,
      equipmentRequired: program.equipmentRequired,
      isOfficial: program.isOfficial,
      isFeatured: program.isFeatured,
      enrollmentCount: program.enrollmentCount,
      completionCount: program.completionCount,
      avgRating: program.avgRating,
      totalWorkouts,
      weeks: weeksWithWorkouts,
      // User enrollment status
      isEnrolled: !!enrollment,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            status: enrollment.status,
            currentWeek: enrollment.currentWeek,
            currentDay: enrollment.currentDay,
            workoutsCompleted: enrollment.workoutsCompleted,
            startDate: enrollment.startDate,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching program:", error);
    return NextResponse.json(
      { error: "Failed to fetch program" },
      { status: 500 }
    );
  }
}
