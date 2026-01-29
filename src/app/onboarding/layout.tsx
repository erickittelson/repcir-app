import { redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Not authenticated - redirect to login
  if (!session) {
    redirect("/login");
  }

  // Check if user has already completed onboarding
  const progress = await db.query.onboardingProgress.findFirst({
    where: eq(onboardingProgress.userId, session.user.id),
  });

  // If onboarding is complete, redirect to You page
  // Users should edit their profile directly, not redo onboarding
  if (progress?.completedAt) {
    redirect("/you");
  }

  return <>{children}</>;
}
