import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/ai/usage-tracking";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUserUsageSummary(session.user.id);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
