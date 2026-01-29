import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userMetrics } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await db.query.userMetrics.findFirst({
      where: eq(userMetrics.userId, session.user.id),
      orderBy: [desc(userMetrics.date)],
    });

    return NextResponse.json({ 
      metrics: metrics ? {
        weight: metrics.weight,
        height: metrics.height,
        bodyFat: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
      } : null
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { weight, height, bodyFat, fitnessLevel } = body;

    // Check if we have existing metrics for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db.query.userMetrics.findFirst({
      where: eq(userMetrics.userId, session.user.id),
      orderBy: [desc(userMetrics.date)],
    });

    const metricsData = {
      userId: session.user.id,
      weight: weight !== undefined ? weight : existing?.weight,
      height: height !== undefined ? height : existing?.height,
      bodyFatPercentage: bodyFat !== undefined ? bodyFat : existing?.bodyFatPercentage,
      fitnessLevel: fitnessLevel !== undefined ? fitnessLevel : existing?.fitnessLevel,
      date: new Date(),
    };

    // Always create a new record to track history
    const [metrics] = await db.insert(userMetrics).values(metricsData).returning();

    return NextResponse.json({ 
      metrics: {
        weight: metrics.weight,
        height: metrics.height,
        bodyFat: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
      }
    });
  } catch (error) {
    console.error("Error updating metrics:", error);
    return NextResponse.json({ error: "Failed to update metrics" }, { status: 500 });
  }
}
