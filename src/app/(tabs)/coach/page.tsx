import { getSession } from "@/lib/neon-auth";
import { CoachChat } from "./coach-chat";

export default async function CoachPage() {
  const session = await getSession();

  if (!session?.activeCircle) {
    return null;
  }

  const memberId = session.activeCircle.memberId;

  return <CoachChat memberId={memberId} />;
}
