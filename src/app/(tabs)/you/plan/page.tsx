import { getSession } from "@/lib/neon-auth";
import { redirect } from "next/navigation";
import { getUserTier } from "@/lib/billing/entitlements";
import { PlanSelectionClient } from "./plan-client";

export default async function PlanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const currentTier = await getUserTier(session.user.id);

  return <PlanSelectionClient currentTier={currentTier} />;
}
