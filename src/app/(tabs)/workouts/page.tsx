import { getSession } from "@/lib/neon-auth";
import { redirect } from "next/navigation";
import { WorkoutsHub } from "./workouts-hub";

export default async function WorkoutsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <WorkoutsHub />;
}
