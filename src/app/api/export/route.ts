import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  circleMembers,
  memberMetrics,
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  personalRecords,
  goals,
  milestones,
  exercises,
  userProfiles,
} from "@/lib/db/schema";
import { getSession } from "@/lib/neon-auth";
import { eq, and, desc, inArray } from "drizzle-orm";

type ExportFormat = "json" | "csv";
type ExportType = "member" | "circle" | "workouts" | "all";

/**
 * Convert array of objects to CSV string
 */
function toCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return "";

  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.join(",");

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );

  return [headerRow, ...rows].join("\n");
}

/**
 * GET /api/export
 * Export user/circle data in JSON or CSV format
 *
 * Query params:
 * - type: member | circle | workouts | all (default: all)
 * - format: json | csv (default: json)
 * - memberId: specific member ID (optional, defaults to current user's member)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json") as ExportFormat;
    const type = (searchParams.get("type") || "all") as ExportType;
    const memberId = searchParams.get("memberId") || session.activeCircle.memberId;

    // Verify member belongs to circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.activeCircle.id)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Only owners/admins can export other members' data
    if (memberId !== session.activeCircle.memberId &&
        !["owner", "admin"].includes(session.activeCircle.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportType: type,
      circleName: session.activeCircle.name,
    };

    // Export member profile
    if (type === "member" || type === "all") {
      // Fetch user profile for merged data
      const profile = member.userId
        ? await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, member.userId),
          })
        : null;

      // Calculate dateOfBirth from userProfile or fallback to member
      let dateOfBirth: string | null = null;
      if (profile?.birthMonth && profile?.birthYear) {
        dateOfBirth = `${profile.birthYear}-${String(profile.birthMonth).padStart(2, "0")}-15`;
      } else if (member.dateOfBirth) {
        dateOfBirth = member.dateOfBirth.toISOString().split("T")[0];
      }

      exportData.member = {
        id: member.id,
        name: member.name,
        dateOfBirth,
        gender: profile?.gender || member.gender,
        profilePicture: profile?.profilePicture || member.profilePicture,
        role: member.role,
        createdAt: member.createdAt,
      };

      // Member metrics
      const metrics = await db.query.memberMetrics.findMany({
        where: eq(memberMetrics.memberId, memberId),
        orderBy: [desc(memberMetrics.date)],
      });
      exportData.metrics = metrics.map((m) => ({
        date: m.date,
        weight: m.weight,
        bodyFatPercentage: m.bodyFatPercentage,
        notes: m.notes,
      }));

      // Personal records
      const prs = await db.query.personalRecords.findMany({
        where: eq(personalRecords.memberId, memberId),
        orderBy: [desc(personalRecords.date)],
      });
      exportData.personalRecords = prs;

      // Goals and milestones
      const memberGoals = await db.query.goals.findMany({
        where: eq(goals.memberId, memberId),
        with: {
          milestones: true,
        },
      });
      exportData.goals = memberGoals;
    }

    // Export workout history
    if (type === "workouts" || type === "all") {
      const sessions = await db.query.workoutSessions.findMany({
        where: eq(workoutSessions.memberId, memberId),
        orderBy: [desc(workoutSessions.date)],
        with: {
          exercises: {
            with: {
              exercise: true,
              sets: true,
            },
          },
        },
      });

      exportData.workouts = sessions.map((session) => ({
        id: session.id,
        name: session.name,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        notes: session.notes,
        rating: session.rating,
        exercises: session.exercises.map((ex) => ({
          exerciseName: ex.exercise?.name,
          category: ex.exercise?.category,
          muscleGroups: ex.exercise?.muscleGroups,
          order: ex.order,
          sets: ex.sets.map((set) => ({
            setNumber: set.setNumber,
            targetReps: set.targetReps,
            actualReps: set.actualReps,
            targetWeight: set.targetWeight,
            actualWeight: set.actualWeight,
            targetDuration: set.targetDuration,
            actualDuration: set.actualDuration,
            completed: set.completed,
            rpe: set.rpe,
          })),
        })),
      }));
    }

    // Export full circle data (admin/owner only)
    if (type === "circle" && ["owner", "admin"].includes(session.activeCircle.role)) {
      const allMembers = await db.query.circleMembers.findMany({
        where: eq(circleMembers.circleId, session.activeCircle.id),
      });

      exportData.circleMembers = allMembers.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        createdAt: m.createdAt,
      }));

      // Get all workout sessions for all members
      const memberIds = allMembers.map((m) => m.id);
      const allSessions = await db.query.workoutSessions.findMany({
        where: inArray(workoutSessions.memberId, memberIds),
        orderBy: [desc(workoutSessions.date)],
      });

      exportData.circleWorkouts = allSessions.map((s) => ({
        memberId: s.memberId,
        memberName: allMembers.find((m) => m.id === s.memberId)?.name,
        sessionName: s.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
      }));
    }

    // Return response in requested format
    if (format === "csv") {
      // For CSV, we flatten the data into multiple sections
      let csvContent = "";

      if (exportData.member) {
        csvContent += "=== MEMBER PROFILE ===\n";
        csvContent += toCSV([exportData.member as Record<string, unknown>]) + "\n\n";
      }

      if (exportData.metrics && Array.isArray(exportData.metrics) && exportData.metrics.length > 0) {
        csvContent += "=== METRICS ===\n";
        csvContent += toCSV(exportData.metrics as Record<string, unknown>[]) + "\n\n";
      }

      if (exportData.personalRecords && Array.isArray(exportData.personalRecords) && exportData.personalRecords.length > 0) {
        csvContent += "=== PERSONAL RECORDS ===\n";
        csvContent += toCSV(exportData.personalRecords as Record<string, unknown>[]) + "\n\n";
      }

      if (exportData.workouts && Array.isArray(exportData.workouts) && exportData.workouts.length > 0) {
        csvContent += "=== WORKOUTS ===\n";
        const flatWorkouts = (exportData.workouts as Array<{
          id: string;
          name: string;
          date: Date | null;
          startTime: Date | null;
          endTime: Date | null;
          status: string;
          exercises: Array<{
            exerciseName: string;
            sets: Array<{ setNumber: number; reps: number | null; weight: number | null }>;
          }>;
        }>).map((w) => ({
          id: w.id,
          name: w.name,
          date: w.date,
          startTime: w.startTime,
          endTime: w.endTime,
          status: w.status,
          exerciseCount: w.exercises?.length || 0,
          totalSets: w.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 0,
        }));
        csvContent += toCSV(flatWorkouts) + "\n\n";
      }

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="workout-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="workout-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
