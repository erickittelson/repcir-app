import { redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TabsShell } from "./tabs-shell";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const progress = await db.query.onboardingProgress.findFirst({
    where: eq(onboardingProgress.userId, session.user.id),
  });

  // Redirect to onboarding if not completed
  if (!progress?.completedAt) {
    redirect("/onboarding");
  }

  return (
    <TabsShell
      session={{
        user: session.user,
        activeCircle: session.activeCircle,
        circles: session.circles,
      }}
    >
      {children}
    </TabsShell>
  );
}
