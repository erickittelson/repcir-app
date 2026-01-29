import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { dismissPrompt } from "@/lib/profile/completeness";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { promptId } = body;

    if (!promptId) {
      return NextResponse.json({ error: "promptId is required" }, { status: 400 });
    }

    await dismissPrompt(session.user.id, promptId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to dismiss prompt:", error);
    return NextResponse.json(
      { error: "Failed to dismiss prompt" },
      { status: 500 }
    );
  }
}
