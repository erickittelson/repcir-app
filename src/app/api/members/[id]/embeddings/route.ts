import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import {
  checkAIPersonalizationConsent,
  createConsentRequiredResponse,
} from "@/lib/consent";
import {
  circleMembers,
  memberEmbeddings,
  memberMetrics,
  goals,
  workoutSessions,
  personalRecords,
  memberLimitations,
  memberSkills,
  contextNotes,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

// Generate embeddings for a member's profile and history
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit embedding generation (expensive operation, 5 embeddings generated per call)
    const rateLimitResult = applyRateLimit(
      `embeddings:${session.user.id}`,
      { limit: 5, windowSeconds: 60 } // 5 requests per minute per user
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
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

    // GDPR Article 9: Check consent before processing health data via AI
    const consent = await checkAIPersonalizationConsent(session.user.id);
    if (!consent.hasConsent) {
      return createConsentRequiredResponse();
    }

    // Gather all member data for embedding generation
    const [metrics, memberGoals, workouts, prs, limitations, skills, notes, profile] = await Promise.all([
      db.query.memberMetrics.findMany({
        where: eq(memberMetrics.memberId, memberId),
        orderBy: [desc(memberMetrics.date)],
        limit: 10,
      }),
      db.query.goals.findMany({
        where: eq(goals.memberId, memberId),
      }),
      db.query.workoutSessions.findMany({
        where: eq(workoutSessions.memberId, memberId),
        orderBy: [desc(workoutSessions.date)],
        limit: 20,
      }),
      db.query.personalRecords.findMany({
        where: eq(personalRecords.memberId, memberId),
        with: { exercise: true },
      }),
      db.query.memberLimitations.findMany({
        where: eq(memberLimitations.memberId, memberId),
      }),
      db.query.memberSkills.findMany({
        where: eq(memberSkills.memberId, memberId),
      }),
      db.query.contextNotes.findMany({
        where: eq(contextNotes.memberId, memberId),
        orderBy: [desc(contextNotes.createdAt)],
        limit: 30,
      }),
      // Fetch user profile if member has userId
      member.userId
        ? db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, member.userId),
          })
        : Promise.resolve(null),
    ]);

    // Build embedding content for different aspects
    const embeddingsToCreate: { type: string; content: string; metadata: Record<string, unknown> }[] = [];

    // 1. Profile embedding
    const profileContent = buildProfileContent(member, metrics[0], profile);
    embeddingsToCreate.push({
      type: "profile",
      content: profileContent,
      metadata: { memberId, updatedAt: new Date().toISOString() },
    });

    // 2. Goals embedding
    if (memberGoals.length > 0) {
      const goalsContent = buildGoalsContent(memberGoals);
      embeddingsToCreate.push({
        type: "goals",
        content: goalsContent,
        metadata: { memberId, goalCount: memberGoals.length },
      });
    }

    // 3. Workout history embedding
    if (workouts.length > 0) {
      const workoutContent = buildWorkoutHistoryContent(workouts);
      embeddingsToCreate.push({
        type: "workout_history",
        content: workoutContent,
        metadata: { memberId, workoutCount: workouts.length },
      });
    }

    // 4. Preferences/context embedding (from notes)
    if (notes.length > 0) {
      const preferencesContent = buildPreferencesContent(notes);
      embeddingsToCreate.push({
        type: "preferences",
        content: preferencesContent,
        metadata: { memberId, noteCount: notes.length },
      });
    }

    // 5. Limitations embedding
    if (limitations.length > 0) {
      const limitationsContent = buildLimitationsContent(limitations);
      embeddingsToCreate.push({
        type: "limitations",
        content: limitationsContent,
        metadata: { memberId, limitationCount: limitations.length },
      });
    }

    // Delete existing embeddings for this member
    await db.delete(memberEmbeddings).where(eq(memberEmbeddings.memberId, memberId));

    // Generate and save new embeddings
    const savedEmbeddings: { type: string; id: string }[] = [];

    for (const emb of embeddingsToCreate) {
      try {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: emb.content,
        });

        const [saved] = await db
          .insert(memberEmbeddings)
          .values({
            memberId,
            type: emb.type,
            content: emb.content,
            embedding,
            metadata: emb.metadata,
          })
          .returning({ id: memberEmbeddings.id });

        savedEmbeddings.push({ type: emb.type, id: saved.id });
      } catch (err) {
        console.error(`Failed to generate embedding for ${emb.type}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      embeddings: savedEmbeddings,
      message: `Generated ${savedEmbeddings.length} embeddings for member`,
    });
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

// Get existing embeddings for a member
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

    const embeddings = await db.query.memberEmbeddings.findMany({
      where: eq(memberEmbeddings.memberId, memberId),
      columns: {
        id: true,
        type: true,
        content: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(embeddings);
  } catch (error) {
    console.error("Error fetching embeddings:", error);
    return NextResponse.json(
      { error: "Failed to fetch embeddings" },
      { status: 500 }
    );
  }
}

// Helper functions to build embedding content
function buildProfileContent(
  member: typeof circleMembers.$inferSelect,
  metrics?: typeof memberMetrics.$inferSelect,
  profile?: typeof userProfiles.$inferSelect | null
): string {
  let content = `Member Profile: ${member.name}`;

  // Calculate age from userProfile (birthMonth/birthYear) or fallback to member.dateOfBirth
  let age: number | null = null;
  if (profile?.birthMonth && profile?.birthYear) {
    const today = new Date();
    age = today.getFullYear() - profile.birthYear;
    if (today.getMonth() + 1 < profile.birthMonth) {
      age--;
    }
  } else if (member.dateOfBirth) {
    age = Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  if (age) {
    content += `, ${age} years old`;
  }

  const gender = profile?.gender || member.gender;
  if (gender) content += `, ${gender}`;

  if (metrics) {
    if (metrics.weight) content += `. Weight: ${metrics.weight} lbs`;
    if (metrics.height) {
      const feet = Math.floor(metrics.height / 12);
      const inches = metrics.height % 12;
      content += `. Height: ${feet}'${inches}"`;
    }
    if (metrics.fitnessLevel) content += `. Fitness level: ${metrics.fitnessLevel}`;
    if (metrics.bodyFatPercentage) content += `. Body fat: ${metrics.bodyFatPercentage}%`;
  }

  return content;
}

function buildGoalsContent(goals: typeof import("@/lib/db/schema").goals.$inferSelect[]): string {
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  let content = `Fitness Goals:\n`;
  content += `Active goals (${activeGoals.length}):\n`;
  activeGoals.forEach((g) => {
    content += `- ${g.title} (${g.category})`;
    if (g.targetValue && g.targetUnit) content += `: target ${g.targetValue} ${g.targetUnit}`;
    if (g.currentValue) content += `, current ${g.currentValue}`;
    content += "\n";
  });

  if (completedGoals.length > 0) {
    content += `\nCompleted goals (${completedGoals.length}):\n`;
    completedGoals.slice(0, 5).forEach((g) => {
      content += `- ${g.title} (${g.category})\n`;
    });
  }

  return content;
}

function buildWorkoutHistoryContent(workouts: typeof workoutSessions.$inferSelect[]): string {
  const completed = workouts.filter((w) => w.status === "completed");
  const avgRating = completed.filter((w) => w.rating).reduce((sum, w) => sum + (w.rating || 0), 0) / (completed.filter((w) => w.rating).length || 1);

  let content = `Workout History:\n`;
  content += `Total sessions: ${completed.length}\n`;
  content += `Average rating: ${avgRating.toFixed(1)}/5\n\n`;
  content += `Recent workouts:\n`;

  completed.slice(0, 10).forEach((w) => {
    content += `- ${w.name} (${new Date(w.date).toLocaleDateString()})`;
    if (w.rating) content += ` - Rating: ${w.rating}/5`;
    content += "\n";
  });

  return content;
}

function buildPreferencesContent(notes: typeof contextNotes.$inferSelect[]): string {
  const moods = notes.filter((n) => n.mood).map((n) => n.mood as string);
  const energyLevels = notes.filter((n) => n.energyLevel !== null).map((n) => n.energyLevel as number);
  const painNotes = notes.filter((n) => n.painLevel && n.painLevel > 0);
  const allTags = notes.flatMap((n) => (n.tags as string[]) || []);

  let content = `User Preferences and Feedback:\n`;

  if (moods.length > 0) {
    const moodCounts: Record<string, number> = {};
    moods.forEach((m) => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
    content += `Common moods: ${Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m).join(", ")}\n`;
  }

  if (energyLevels.length > 0) {
    const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
    content += `Average energy level: ${avgEnergy.toFixed(1)}/5\n`;
  }

  if (painNotes.length > 0) {
    const avgPain = painNotes.reduce((a, n) => a + (n.painLevel || 0), 0) / painNotes.length;
    content += `Reports pain in ${painNotes.length} entries, avg: ${avgPain.toFixed(1)}/10\n`;
  }

  if (allTags.length > 0) {
    const tagCounts: Record<string, number> = {};
    allTags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    content += `Common themes: ${Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t).join(", ")}\n`;
  }

  const recentNotes = notes.filter((n) => n.content).slice(0, 5);
  if (recentNotes.length > 0) {
    content += `\nRecent notes:\n`;
    recentNotes.forEach((n) => {
      content += `- "${n.content}"\n`;
    });
  }

  return content;
}

function buildLimitationsContent(limitations: typeof memberLimitations.$inferSelect[]): string {
  const active = limitations.filter((l) => l.active);

  let content = `Physical Limitations and Injuries:\n`;

  active.forEach((l) => {
    content += `- ${l.type}: ${l.description}`;
    if (l.severity) content += ` (Severity: ${l.severity})`;
    if (l.affectedAreas) content += ` - Affects: ${(l.affectedAreas as string[]).join(", ")}`;
    content += "\n";
  });

  const resolved = limitations.filter((l) => !l.active);
  if (resolved.length > 0) {
    content += `\nResolved issues: ${resolved.map((l) => l.type).join(", ")}`;
  }

  return content;
}
