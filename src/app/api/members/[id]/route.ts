import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, userMetrics, userLimitations, goals, personalRecords, userSkills, userProfiles } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logAuditEventFromRequest } from "@/lib/audit-log";

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

    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
      with: {
        goals: true,
        personalRecords: {
          with: {
            exercise: true,
          },
          orderBy: (pr: any, { desc }: any) => [desc(pr.date)],
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Fetch user-scoped data if member has userId
    const userId = member.userId;
    const [profile, metrics, limitations, skills] = await Promise.all([
      userId
        ? db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
        : null,
      userId
        ? db.query.userMetrics.findMany({
            where: eq(userMetrics.userId, userId),
            orderBy: [desc(userMetrics.date)],
          })
        : [],
      userId
        ? db.query.userLimitations.findMany({
            where: and(eq(userLimitations.userId, userId), eq(userLimitations.active, true)),
          })
        : [],
      userId
        ? db.query.userSkills.findMany({
            where: eq(userSkills.userId, userId),
            orderBy: [desc(userSkills.createdAt)],
          })
        : [],
    ]);

    // Calculate dateOfBirth from userProfile or fallback to member
    let dateOfBirth: string | null = null;
    if (profile?.birthMonth && profile?.birthYear) {
      dateOfBirth = `${profile.birthYear}-${String(profile.birthMonth).padStart(2, "0")}-15`;
    } else if (member.dateOfBirth) {
      dateOfBirth = member.dateOfBirth.toISOString().split("T")[0];
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
      profilePicture: profile?.profilePicture || member.profilePicture,
      dateOfBirth,
      gender: profile?.gender || member.gender,
      role: member.role,
      metrics,
      limitations,
      goals: member.goals,
      personalRecords: member.personalRecords,
      skills,
    });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
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
    const { name, dateOfBirth, gender, metrics, profilePicture } = body;

    // Verify member belongs to this circle
    const existingMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update member (keep legacy fields for backward compatibility)
    await db
      .update(circleMembers)
      .set({
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        profilePicture,
        updatedAt: new Date(),
      })
      .where(eq(circleMembers.id, id));

    // Also update userProfile if member has userId
    if (existingMember.userId) {
      const birthDate = dateOfBirth ? new Date(dateOfBirth) : null;
      await db
        .update(userProfiles)
        .set({
          profilePicture: profilePicture || undefined,
          birthMonth: birthDate ? birthDate.getMonth() + 1 : undefined,
          birthYear: birthDate ? birthDate.getFullYear() : undefined,
          gender: gender || undefined,
          displayName: name || undefined,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, existingMember.userId));
    }

    // Add new metrics entry if provided (user-scoped)
    if (metrics && (metrics.weight || metrics.height || metrics.bodyFatPercentage || metrics.fitnessLevel) && existingMember.userId) {
      await db.insert(userMetrics).values({
        userId: existingMember.userId,
        weight: metrics.weight,
        height: metrics.height,
        bodyFatPercentage: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
        notes: metrics.notes,
      });
    }

    // Audit log profile/health data update
    const isHealthDataUpdate = metrics && (metrics.weight || metrics.height || metrics.bodyFatPercentage);
    await logAuditEventFromRequest(
      {
        userId: session.user.id,
        action: isHealthDataUpdate ? "health_data_access" : "profile_update",
        resourceType: "circle_member",
        resourceId: id,
        metadata: {
          memberId: id,
          updatedFields: Object.keys(body).filter((k) => body[k] !== undefined),
          hasMetricsUpdate: !!metrics,
        },
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
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

    // Verify member belongs to this circle
    const existingMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Audit log member removal (before deletion)
    await logAuditEventFromRequest(
      {
        userId: session.user.id,
        action: "member_remove",
        resourceType: "circle_member",
        resourceId: id,
        metadata: {
          memberId: id,
          memberName: existingMember.name,
          circleId: session.circleId,
        },
      },
      request
    );

    // Delete member (cascade will handle related records)
    await db.delete(circleMembers).where(eq(circleMembers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
