import { Suspense } from "react";
import { getSession } from "@/lib/neon-auth";
import { DashboardSection } from "./dashboard-section";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { CirclesSection } from "./circles-section";
import { UnifiedFeedWrapper } from "./unified-feed-wrapper";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheUserData } from "@/lib/cache";

// Revalidate this page every 30 seconds for fresh data
export const revalidate = 30;

export default async function HomePage() {
  const session = await getSession();
  if (!session?.activeCircle) return null;

  const activeCircle = session.activeCircle;
  const isGroupCircle = !activeCircle.isSystemCircle;

  // Always fetch profile for post composer (individual posts work everywhere)
  const profile = await cacheUserData(
    session.user.id,
    "profile-summary",
    async () => {
      const p = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, session.user.id),
        columns: { displayName: true, profilePicture: true },
      });
      return {
        name: p?.displayName || session.user.name,
        image: p?.profilePicture || session.user.image || null,
      };
    },
    { ttl: 300 }
  );

  return (
    <div className="px-4 py-6">
      {/* Health metrics strip */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardSection session={session} />
      </Suspense>

      {/* Your circles */}
      <Suspense>
        <CirclesSection userId={session.user.id} />
      </Suspense>

      {/* Social feed */}
      <div className="mt-6">
        <UnifiedFeedWrapper
          circleId={isGroupCircle ? activeCircle.id : null}
          userId={session.user.id}
          userName={profile.name}
          userImage={profile.image}
          circles={session.circles
            .filter((c) => !c.isSystemCircle)
            .map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </div>
  );
}
