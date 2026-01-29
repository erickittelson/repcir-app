import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contextNotes, circleMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    let whereClause = eq(contextNotes.memberId, memberId);

    if (entityType && entityId) {
      whereClause = and(
        whereClause,
        eq(contextNotes.entityType, entityType),
        eq(contextNotes.entityId, entityId)
      )!;
    } else if (entityType) {
      whereClause = and(whereClause, eq(contextNotes.entityType, entityType))!;
    }

    const notes = await db.query.contextNotes.findMany({
      where: whereClause,
      orderBy: [desc(contextNotes.createdAt)],
      limit,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const body = await request.json();
    const {
      entityType,
      entityId,
      mood,
      energyLevel,
      painLevel,
      difficulty,
      content,
      tags,
    } = body;

    if (!entityType) {
      return NextResponse.json(
        { error: "Entity type is required" },
        { status: 400 }
      );
    }

    // Moderate content for profanity (if provided)
    if (content) {
      const moderationResult = moderateText(content);
      if (!moderationResult.isClean) {
        return NextResponse.json(
          {
            error: "Note content contains inappropriate language. Please revise.",
            code: "CONTENT_MODERATION_FAILED",
          },
          { status: 400 }
        );
      }
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

    const [note] = await db
      .insert(contextNotes)
      .values({
        memberId,
        entityType,
        entityId: entityId || null,
        mood,
        energyLevel,
        painLevel,
        difficulty,
        content,
        tags: tags || [],
      })
      .returning();

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

// Get a summary of recent notes for AI context
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;

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

    // Get recent notes for context summary
    const recentNotes = await db.query.contextNotes.findMany({
      where: eq(contextNotes.memberId, memberId),
      orderBy: [desc(contextNotes.createdAt)],
      limit: 50,
    });

    // Build a summary for AI
    const summary = buildContextSummary(recentNotes);

    return NextResponse.json({ summary, noteCount: recentNotes.length });
  } catch (error) {
    console.error("Error getting context summary:", error);
    return NextResponse.json(
      { error: "Failed to get context summary" },
      { status: 500 }
    );
  }
}

function buildContextSummary(notes: typeof contextNotes.$inferSelect[]): string {
  if (notes.length === 0) {
    return "No recent notes or feedback recorded.";
  }

  const recentMoods = notes
    .filter((n) => n.mood)
    .slice(0, 10)
    .map((n) => n.mood);

  const avgEnergy =
    notes.filter((n) => n.energyLevel).reduce((acc, n) => acc + (n.energyLevel || 0), 0) /
    (notes.filter((n) => n.energyLevel).length || 1);

  const painNotes = notes.filter((n) => n.painLevel && n.painLevel > 0);
  const avgPain =
    painNotes.reduce((acc, n) => acc + (n.painLevel || 0), 0) / (painNotes.length || 1);

  const difficultyFeedback = notes.filter((n) => n.difficulty);
  const tooHardCount = difficultyFeedback.filter((n) => n.difficulty === "too_hard").length;
  const tooEasyCount = difficultyFeedback.filter((n) => n.difficulty === "too_easy").length;

  const recentContents = notes
    .filter((n) => n.content)
    .slice(0, 5)
    .map((n) => n.content);

  const allTags = notes.flatMap((n) => n.tags || []);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  let summary = `Recent context from ${notes.length} notes:\n`;

  if (recentMoods.length > 0) {
    const moodCounts = recentMoods.reduce((acc, mood) => {
      acc[mood!] = (acc[mood!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    summary += `- Predominant mood: ${topMood[0]} (${topMood[1]}/${recentMoods.length} recent entries)\n`;
  }

  if (notes.filter((n) => n.energyLevel).length > 0) {
    summary += `- Average energy level: ${avgEnergy.toFixed(1)}/5\n`;
  }

  if (painNotes.length > 0) {
    summary += `- Pain reported in ${painNotes.length} entries, avg: ${avgPain.toFixed(1)}/10\n`;
  }

  if (difficultyFeedback.length > 0) {
    if (tooHardCount > difficultyFeedback.length * 0.3) {
      summary += `- Workouts often rated as too hard (${tooHardCount}/${difficultyFeedback.length}) - consider reducing intensity\n`;
    }
    if (tooEasyCount > difficultyFeedback.length * 0.3) {
      summary += `- Workouts often rated as too easy (${tooEasyCount}/${difficultyFeedback.length}) - consider increasing challenge\n`;
    }
  }

  if (topTags.length > 0) {
    summary += `- Common themes: ${topTags.join(", ")}\n`;
  }

  if (recentContents.length > 0) {
    summary += `- Recent notes: "${recentContents.join('", "')}"`;
  }

  return summary;
}
