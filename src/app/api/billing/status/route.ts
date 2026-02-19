import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/entitlements";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getUsageSummary(session.user.id);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: "Failed to get billing status" },
      { status: 500 }
    );
  }
}
