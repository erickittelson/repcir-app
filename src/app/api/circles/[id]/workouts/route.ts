import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { workoutPlans, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/circles/[id]/workouts - Get workouts for a circle
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;

  try {
    // Verify user is a member of the circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this circle" },
        { status: 403 }
      );
    }

    // Get workout plans for this circle
    const plans = await db.query.workoutPlans.findMany({
      where: eq(workoutPlans.circleId, circleId),
      with: {
        exercises: true,
      },
      orderBy: (workoutPlans, { desc }) => [desc(workoutPlans.createdAt)],
    });

    const formattedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      estimatedDuration: plan.estimatedDuration,
      exerciseCount: plan.exercises?.length || 0,
      structureType: plan.structureType,
    }));

    return NextResponse.json({ workouts: formattedPlans });
  } catch (error) {
    console.error("Error fetching circle workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
