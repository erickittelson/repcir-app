import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, memberSkills } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { evaluateAndAwardBadges } from "@/lib/badges";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const skills = await db.query.memberSkills.findMany({
      where: eq(memberSkills.memberId, id),
      orderBy: [desc(memberSkills.createdAt)],
    });

    // Normalize skills for API response
    const normalizedSkills = skills.map((skill) => ({
      ...skill,
      // Provide backward-compatible fields
      status: skill.currentStatus,
      dateAchieved: skill.allTimeBestDate,
    }));

    return NextResponse.json(normalizedSkills);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
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

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      category,
      status,
      dateAchieved,
      notes,
      currentStatus,
      currentStatusDate,
      allTimeBestStatus,
      allTimeBestDate,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const initialStatus = currentStatus || status || "learning";
    const [skill] = await db
      .insert(memberSkills)
      .values({
        memberId: id,
        name,
        category,
        notes,
        currentStatus: initialStatus,
        currentStatusDate: currentStatusDate ? new Date(currentStatusDate) : new Date(),
        allTimeBestStatus: allTimeBestStatus || initialStatus,
        allTimeBestDate: allTimeBestDate || dateAchieved ? new Date(allTimeBestDate || dateAchieved) : null,
      })
      .returning();

    // Evaluate badges if skill status is "achieved" or "mastered"
    let badgeResults = { awarded: [] as any[], goalMatches: [] as any[] };
    if (initialStatus === "achieved" || initialStatus === "mastered") {
      try {
        badgeResults = await evaluateAndAwardBadges({
          userId: session.user.id,
          memberId: id,
          trigger: "skill",
          skillName: name,
        });
      } catch (badgeError) {
        console.error("Error evaluating badges:", badgeError);
      }
    }

    return NextResponse.json({
      ...skill,
      badgesAwarded: badgeResults.awarded,
    });
  } catch (error) {
    console.error("Error creating skill:", error);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      skillId,
      name,
      category,
      status,
      dateAchieved,
      notes,
      currentStatus,
      currentStatusDate,
      allTimeBestStatus,
      allTimeBestDate,
    } = body;

    if (!skillId) {
      return NextResponse.json({ error: "Skill ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;

    // Handle status updates
    const newStatus = currentStatus || status;
    if (newStatus !== undefined) {
      updateData.currentStatus = newStatus;
      updateData.currentStatusDate = new Date();

      // Update all-time best if new status is higher
      const statusRank: Record<string, number> = { learning: 1, achieved: 2, mastered: 3 };
      // We need to fetch the existing skill to compare
      const existingSkill = await db.query.memberSkills.findFirst({
        where: eq(memberSkills.id, skillId),
      });
      if (existingSkill) {
        const existingBestRank = statusRank[existingSkill.allTimeBestStatus] || 0;
        const newRank = statusRank[newStatus] || 0;
        if (newRank > existingBestRank) {
          updateData.allTimeBestStatus = newStatus;
          updateData.allTimeBestDate = new Date();
        }
      }
    }

    // Handle explicit date overrides
    if (currentStatusDate !== undefined) updateData.currentStatusDate = new Date(currentStatusDate);
    if (allTimeBestStatus !== undefined) updateData.allTimeBestStatus = allTimeBestStatus;
    if (allTimeBestDate !== undefined || dateAchieved !== undefined) {
      updateData.allTimeBestDate = (allTimeBestDate || dateAchieved) ? new Date(allTimeBestDate || dateAchieved) : null;
    }

    await db
      .update(memberSkills)
      .set(updateData)
      .where(
        and(
          eq(memberSkills.id, skillId),
          eq(memberSkills.memberId, id)
        )
      );

    // Evaluate badges if skill status was updated to "achieved" or "mastered"
    let badgeResults = { awarded: [] as any[], goalMatches: [] as any[] };
    if (newStatus === "achieved" || newStatus === "mastered") {
      try {
        // Get the skill name for badge evaluation
        const updatedSkill = await db.query.memberSkills.findFirst({
          where: eq(memberSkills.id, skillId),
        });
        
        if (updatedSkill) {
          badgeResults = await evaluateAndAwardBadges({
            userId: session.user.id,
            memberId: id,
            trigger: "skill",
            skillName: updatedSkill.name,
          });
        }
      } catch (badgeError) {
        console.error("Error evaluating badges:", badgeError);
      }
    }

    return NextResponse.json({
      success: true,
      badgesAwarded: badgeResults.awarded,
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get("skillId");

    if (!skillId) {
      return NextResponse.json({ error: "Skill ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await db
      .delete(memberSkills)
      .where(
        and(
          eq(memberSkills.id, skillId),
          eq(memberSkills.memberId, id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    );
  }
}
