import { getSession } from "@/lib/neon-auth";
import { redirect } from "next/navigation";
import { AchievementsClient } from "./achievements-client";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberId = session.activeCircle?.memberId;

  return (
    <AchievementsClient
      userId={session.user.id}
      memberId={memberId || null}
    />
  );
}
