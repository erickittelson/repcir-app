import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutFeedback } from "@/lib/db/schema";
import { z } from "zod";

const feedbackSchema = z.object({
  workoutPlanId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  memberId: z.string().optional(),
  rating: z.number().min(-1).max(1),
  feedback: z.string().max(500).optional(),
  aspects: z
    .object({
      difficulty: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
      exerciseSelection: z.enum(["poor", "okay", "great"]).optional(),
      duration: z.enum(["too_short", "just_right", "too_long"]).optional(),
      variety: z.enum(["repetitive", "good", "too_varied"]).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workoutPlanId, sessionId, memberId, rating, feedback, aspects } =
      parsed.data;

    await db.insert(workoutFeedback).values({
      userId: session.user.id,
      memberId: memberId || null,
      workoutPlanId: workoutPlanId || null,
      sessionId: sessionId || null,
      rating,
      feedback: feedback || null,
      aspects: aspects || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving workout feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
