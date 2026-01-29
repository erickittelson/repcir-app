import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPrivacySettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";

// Default privacy settings
const DEFAULT_SETTINGS = {
  nameVisibility: "public",
  profilePictureVisibility: "public",
  cityVisibility: "circle",
  ageVisibility: "private",
  weightVisibility: "private",
  bodyFatVisibility: "private",
  fitnessLevelVisibility: "circle",
  goalsVisibility: "circle",
  limitationsVisibility: "private",
  workoutHistoryVisibility: "circle",
  personalRecordsVisibility: "circle",
  badgesVisibility: "public",
  sportsVisibility: "public",
  capabilitiesVisibility: "private",
};

// GET /api/user/privacy - Get privacy settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings] = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, session.user.id));

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json({
      nameVisibility: settings.nameVisibility,
      profilePictureVisibility: settings.profilePictureVisibility,
      cityVisibility: settings.cityVisibility,
      ageVisibility: settings.ageVisibility,
      weightVisibility: settings.weightVisibility,
      bodyFatVisibility: settings.bodyFatVisibility,
      fitnessLevelVisibility: settings.fitnessLevelVisibility,
      goalsVisibility: settings.goalsVisibility,
      limitationsVisibility: settings.limitationsVisibility,
      workoutHistoryVisibility: settings.workoutHistoryVisibility,
      personalRecordsVisibility: settings.personalRecordsVisibility,
      badgesVisibility: settings.badgesVisibility,
      sportsVisibility: settings.sportsVisibility,
      capabilitiesVisibility: settings.capabilitiesVisibility,
    });
  } catch (error) {
    console.error("Failed to fetch privacy settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch privacy settings" },
      { status: 500 }
    );
  }
}

// PUT /api/user/privacy - Update privacy settings
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate visibility values
    const validVisibilities = ["public", "circle", "private"];
    const fields = [
      "nameVisibility",
      "profilePictureVisibility",
      "cityVisibility",
      "ageVisibility",
      "weightVisibility",
      "bodyFatVisibility",
      "fitnessLevelVisibility",
      "goalsVisibility",
      "limitationsVisibility",
      "workoutHistoryVisibility",
      "personalRecordsVisibility",
      "badgesVisibility",
      "sportsVisibility",
      "capabilitiesVisibility",
    ];

    for (const field of fields) {
      if (body[field] && !validVisibilities.includes(body[field])) {
        return NextResponse.json(
          { error: `Invalid visibility value for ${field}` },
          { status: 400 }
        );
      }
    }

    // Upsert settings
    await db
      .insert(userPrivacySettings)
      .values({
        userId: session.user.id,
        nameVisibility: body.nameVisibility || "public",
        profilePictureVisibility: body.profilePictureVisibility || "public",
        cityVisibility: body.cityVisibility || "circle",
        ageVisibility: body.ageVisibility || "private",
        weightVisibility: body.weightVisibility || "private",
        bodyFatVisibility: body.bodyFatVisibility || "private",
        fitnessLevelVisibility: body.fitnessLevelVisibility || "circle",
        goalsVisibility: body.goalsVisibility || "circle",
        limitationsVisibility: body.limitationsVisibility || "private",
        workoutHistoryVisibility: body.workoutHistoryVisibility || "circle",
        personalRecordsVisibility: body.personalRecordsVisibility || "circle",
        badgesVisibility: body.badgesVisibility || "public",
        sportsVisibility: body.sportsVisibility || "public",
        capabilitiesVisibility: body.capabilitiesVisibility || "private",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPrivacySettings.userId,
        set: {
          nameVisibility: body.nameVisibility,
          profilePictureVisibility: body.profilePictureVisibility,
          cityVisibility: body.cityVisibility,
          ageVisibility: body.ageVisibility,
          weightVisibility: body.weightVisibility,
          bodyFatVisibility: body.bodyFatVisibility,
          fitnessLevelVisibility: body.fitnessLevelVisibility,
          goalsVisibility: body.goalsVisibility,
          limitationsVisibility: body.limitationsVisibility,
          workoutHistoryVisibility: body.workoutHistoryVisibility,
          personalRecordsVisibility: body.personalRecordsVisibility,
          badgesVisibility: body.badgesVisibility,
          sportsVisibility: body.sportsVisibility,
          capabilitiesVisibility: body.capabilitiesVisibility,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update privacy settings:", error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}
