import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { workoutPlans, sharedWorkouts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface EditWorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // First, try to find a shared workout
  const sharedWorkout = await db.query.sharedWorkouts.findFirst({
    where: eq(sharedWorkouts.id, id),
  });

  let planId = sharedWorkout?.workoutPlanId;

  // If not a shared workout, try to find a workout plan directly
  if (!planId) {
    const plan = await db.query.workoutPlans.findFirst({
      where: eq(workoutPlans.id, id),
    });
    if (plan) {
      planId = plan.id;
    }
  }

  if (!planId) {
    notFound();
  }

  // Redirect to the workout builder with this plan
  redirect(`/workouts/builder?planId=${planId}`);
}
