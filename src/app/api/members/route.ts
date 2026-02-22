import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers, userMetrics, userLimitations, userProfiles } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const circleId = session.activeCircle.id;

    // Check for specific member IDs filter
    const { searchParams } = new URL(request.url);
    const memberIds = searchParams.getAll("ids");

    // Build where clause - always filter by circle, optionally by specific IDs
    const whereClause = memberIds.length > 0
      ? and(
          eq(circleMembers.circleId, circleId),
          inArray(circleMembers.id, memberIds)
        )
      : eq(circleMembers.circleId, circleId);

    const members = await db.query.circleMembers.findMany({
      where: whereClause,
      limit: 100,
      with: {
        goals: {
          limit: 50,
        },
      },
    });

    // Fetch user profiles and user-scoped data for members with userId
    const userIds = members
      .filter((m) => m.userId)
      .map((m) => m.userId as string);

    const [profiles, allMetrics, allLimitations] = await Promise.all([
      userIds.length > 0
        ? db.query.userProfiles.findMany({ where: inArray(userProfiles.userId, userIds) })
        : [],
      userIds.length > 0
        ? db.query.userMetrics.findMany({
            where: inArray(userMetrics.userId, userIds),
            orderBy: [desc(userMetrics.date)],
          })
        : [],
      userIds.length > 0
        ? db.query.userLimitations.findMany({
            where: and(inArray(userLimitations.userId, userIds), eq(userLimitations.active, true)),
          })
        : [],
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const formattedMembers = members.map((member) => {
      const profile = member.userId ? profileMap.get(member.userId) : null;
      const memberMetricsData = member.userId
        ? allMetrics.filter((m) => m.userId === member.userId)
        : [];
      const memberLimitationsData = member.userId
        ? allLimitations.filter((l) => l.userId === member.userId)
        : [];

      let dateOfBirth: string | null = null;
      if (profile?.birthMonth && profile?.birthYear) {
        dateOfBirth = `${profile.birthYear}-${String(profile.birthMonth).padStart(2, "0")}-15`;
      } else if (member.dateOfBirth) {
        const dob = member.dateOfBirth as unknown;
        dateOfBirth = dob instanceof Date
          ? dob.toISOString().split("T")[0]
          : String(dob).split("T")[0];
      }

      return {
        id: member.id,
        name: member.name,
        profilePicture: profile?.profilePicture || member.profilePicture,
        dateOfBirth,
        gender: profile?.gender || member.gender,
        role: member.role,
        latestMetrics: memberMetricsData[0]
          ? {
              weight: memberMetricsData[0].weight,
              height: memberMetricsData[0].height,
              bodyFatPercentage: memberMetricsData[0].bodyFatPercentage,
              fitnessLevel: memberMetricsData[0].fitnessLevel,
            }
          : null,
        limitations: memberLimitationsData.map((l) => ({
          id: l.id,
          type: l.type,
          description: l.description,
          affectedAreas: l.affectedAreas,
          severity: l.severity,
          active: l.active,
        })),
        goals: member.goals.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          status: g.status,
        })),
      };
    });

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, dateOfBirth, gender, metrics, profilePicture } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the member
    const [member] = await db
      .insert(circleMembers)
      .values({
        circleId: session.activeCircle.id,
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        profilePicture,
      })
      .returning();

    // Create initial metrics if provided (user-scoped — only for members with userId)
    if (metrics && (metrics.weight || metrics.height || metrics.bodyFatPercentage || metrics.fitnessLevel)) {
      // Standalone members (no userId) won't have user metrics
      const userId = session.user.id;
      await db.insert(userMetrics).values({
        userId,
        weight: metrics.weight,
        height: metrics.height,
        bodyFatPercentage: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
        notes: metrics.notes,
      });
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
    });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
