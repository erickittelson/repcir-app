import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals, milestones, circleMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get circle member IDs
    const members = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, session.circleId),
      columns: { id: true, name: true },
    });

    const memberIds = members.map((m) => m.id);
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    const allGoals = await db.query.goals.findMany({
      where: inArray(goals.memberId, memberIds),
      with: {
        milestones: true,
      },
    });

    const formattedGoals = allGoals.map((goal) => ({
      id: goal.id,
      memberId: goal.memberId,
      memberName: memberMap[goal.memberId] || "Unknown",
      title: goal.title,
      description: goal.description,
      category: goal.category,
      targetValue: goal.targetValue,
      targetUnit: goal.targetUnit,
      currentValue: goal.currentValue,
      targetDate: goal.targetDate?.toISOString().split("T")[0],
      status: goal.status,
      aiGenerated: goal.aiGenerated,
      milestones: goal.milestones,
    }));

    return NextResponse.json(formattedGoals);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      memberId,
      title,
      description,
      category,
      targetValue,
      targetUnit,
      currentValue,
      targetDate,
    } = body;

    if (!memberId || !title || !category) {
      return NextResponse.json(
        { error: "Member, title, and category are required" },
        { status: 400 }
      );
    }

    // Moderate title and description for profanity
    const textToCheck = [title, description].filter(Boolean).join(" ");
    const moderationResult = moderateText(textToCheck);
    if (!moderationResult.isClean) {
      return NextResponse.json(
        {
          error: "Goal title or description contains inappropriate language. Please revise.",
          code: "CONTENT_MODERATION_FAILED",
        },
        { status: 400 }
      );
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const [goal] = await db
      .insert(goals)
      .values({
        memberId,
        title,
        description,
        category,
        targetValue,
        targetUnit,
        currentValue,
        targetDate: targetDate ? new Date(targetDate) : null,
      })
      .returning();

    return NextResponse.json({ id: goal.id });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
