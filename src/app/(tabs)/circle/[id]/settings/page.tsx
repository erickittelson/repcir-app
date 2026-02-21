import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SettingsClient } from "./settings-client";

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CircleSettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get circle details
  const circle = await db.query.circles.findFirst({
    where: eq(circles.id, id),
  });

  if (!circle) {
    notFound();
  }

  // Check user membership and role
  const membership = await db.query.circleMembers.findFirst({
    where: and(
      eq(circleMembers.circleId, id),
      eq(circleMembers.userId, session.user.id)
    ),
  });

  // Only allow admins and owners to access settings
  if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
    redirect(`/circle/${id}`);
  }

  // Serialize circle data for the client component
  const circleData = {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    imageUrl: circle.imageUrl,
    visibility: circle.visibility as "public" | "private",
    focusArea: circle.focusArea,
    maxMembers: circle.maxMembers,
    joinType: circle.joinType as "open" | "request" | "invite_only" | null,
    rules: (circle.rules as string[]) || [],
  };

  return (
    <SettingsClient
      circle={circleData}
      userRole={membership.role as "owner" | "admin"}
    />
  );
}
