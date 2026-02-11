import { getSession } from "@/lib/neon-auth";
import { redirect } from "next/navigation";
import { DiscoverCircles } from "./discover-circles";

export default async function DiscoverPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <DiscoverCircles />;
}
