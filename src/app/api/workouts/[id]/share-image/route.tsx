import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  exercises,
  circleMembers,
  userProfiles,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, id),
    });

    if (!session || session.status !== "completed") {
      return new Response("Not found", { status: 404 });
    }

    // Get user info
    const member = await db.query.circleMembers.findFirst({
      where: eq(circleMembers.id, session.memberId),
    });
    const profile = member?.userId
      ? await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, member.userId),
        })
      : null;

    // Get exercises
    const sessionExercises = await db
      .select({
        id: workoutSessionExercises.id,
        exerciseName: exercises.name,
      })
      .from(workoutSessionExercises)
      .leftJoin(exercises, eq(workoutSessionExercises.exerciseId, exercises.id))
      .where(eq(workoutSessionExercises.sessionId, id))
      .orderBy(workoutSessionExercises.order);

    // Count completed sets + volume
    let totalSets = 0;
    let totalVolume = 0;
    for (const ex of sessionExercises) {
      const sets = await db
        .select()
        .from(exerciseSets)
        .where(eq(exerciseSets.sessionExerciseId, ex.id));
      for (const set of sets) {
        if (set.completed) {
          totalSets++;
          if (set.actualWeight && set.actualReps) {
            totalVolume += set.actualWeight * set.actualReps;
          }
        }
      }
    }

    const durationMs =
      session.startTime && session.endTime
        ? new Date(session.endTime).getTime() -
          new Date(session.startTime).getTime()
        : null;
    const durationMin = durationMs ? Math.round(durationMs / 60000) : null;

    const userName = profile?.displayName || member?.name || "Athlete";
    const exerciseNames = sessionExercises
      .slice(0, 4)
      .map((e) => e.exerciseName || "Exercise");

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "1200",
            height: "630",
            backgroundColor: "#0a0a0a",
            color: "#fafafa",
            fontFamily: "system-ui",
            padding: "60px",
          }}
        >
          {/* Top: Logo + Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#c8a232",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
                color: "#0a0a0a",
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: "24px",
                letterSpacing: "0.15em",
                color: "#c8a232",
                fontWeight: "bold",
              }}
            >
              REPCIR
            </span>
          </div>

          {/* Middle: User + Workout */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <p style={{ fontSize: "20px", color: "#a1a1aa", margin: 0 }}>
              {userName} completed
            </p>
            <h1
              style={{
                fontSize: "52px",
                fontWeight: "bold",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {session.name}
            </h1>

            {/* Exercise list */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {exerciseNames.map((name, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#27272a",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "16px",
                    color: "#d4d4d8",
                  }}
                >
                  {name}
                </div>
              ))}
              {sessionExercises.length > 4 && (
                <div
                  style={{
                    backgroundColor: "#27272a",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "16px",
                    color: "#71717a",
                  }}
                >
                  +{sessionExercises.length - 4} more
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Stats */}
          <div style={{ display: "flex", gap: "48px" }}>
            {durationMin && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                  {durationMin}
                </span>
                <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" }}>
                  Minutes
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                {sessionExercises.length}
              </span>
              <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" }}>
                Exercises
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                {totalSets}
              </span>
              <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" }}>
                Sets
              </span>
            </div>
            {totalVolume > 0 && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "36px", fontWeight: "bold" }}>
                  {totalVolume.toLocaleString()}
                </span>
                <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" }}>
                  lbs
                </span>
              </div>
            )}
            {session.rating && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "36px", fontWeight: "bold", color: "#c8a232" }}>
                  {"★".repeat(session.rating)}
                </span>
                <span style={{ fontSize: "14px", color: "#71717a", textTransform: "uppercase" }}>
                  Rating
                </span>
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating share image:", error);
    return new Response("Error generating image", { status: 500 });
  }
}
