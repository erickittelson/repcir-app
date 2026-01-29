import { redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TabsShell } from "../(tabs)/tabs-shell";

export default async function DashboardLayout({
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

  // Use the same TabsShell as the mobile layout for consistency
  return (
    <TabsShell
      session={{
        user: session.user,
        activeCircle: session.activeCircle,
        circles: session.circles,
      }}
    >
      <div className="container mx-auto px-4 py-4">{children}</div>
    </TabsShell>
  );
}
