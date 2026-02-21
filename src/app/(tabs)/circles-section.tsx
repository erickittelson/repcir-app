import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { cacheUserData } from "@/lib/cache";
import Link from "next/link";
import { Users, ChevronRight, Plus } from "lucide-react";

interface CirclesSectionProps {
  userId: string;
}

export async function CirclesSection({ userId }: CirclesSectionProps) {
  const userCircles = await cacheUserData(
    userId,
    "home-circles",
    async () => {
      const rows = await db
        .select({
          id: circles.id,
          name: circles.name,
          imageUrl: circles.imageUrl,
          memberCount: circles.memberCount,
          role: circleMembers.role,
        })
        .from(circleMembers)
        .innerJoin(circles, eq(circles.id, circleMembers.circleId))
        .where(
          and(
            eq(circleMembers.userId, userId),
            eq(circles.isSystemCircle, false)
          )
        )
        .orderBy(desc(circleMembers.createdAt));

      return rows;
    },
    { ttl: 120 }
  );

  if (userCircles.length === 0) {
    return (
      <div className="mt-4">
        <Link
          href="/discover?tab=circles"
          className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <Plus className="h-5 w-5 text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Join a circle</p>
            <p className="text-xs text-muted-foreground">
              Train with others and stay accountable
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Your Circles
        </h2>
        <Link
          href="/circles"
          className="text-xs text-brand hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {userCircles.map((circle) => (
          <Link
            key={circle.id}
            href={`/circle/${circle.id}`}
            className="flex shrink-0 flex-col items-center gap-1.5 w-16 group"
          >
            <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-border group-hover:border-brand transition-colors">
              {circle.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={circle.imageUrl}
                  alt={circle.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand/10">
                  <Users className="h-6 w-6 text-brand" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 w-full">
              {circle.name}
            </span>
          </Link>
        ))}
        <Link
          href="/discover?tab=circles"
          className="flex shrink-0 flex-col items-center gap-1.5 w-16 group"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border group-hover:border-brand transition-colors">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-brand transition-colors" />
          </div>
          <span className="text-[11px] text-muted-foreground text-center leading-tight">
            Discover
          </span>
        </Link>
      </div>
    </div>
  );
}
