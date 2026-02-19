import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPrivacySettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth/session";
import { logAuditEventFromRequest } from "@/lib/audit-log";

// Default privacy settings - Privacy-first approach
// Users must explicitly opt-in to share data publicly
const DEFAULT_SETTINGS = {
  nameVisibility: "circle",        // Changed from "public" - only circle members see name
  profilePictureVisibility: "circle", // Changed from "public" - only circle members see photo
  cityVisibility: "private",       // Changed from "circle" - location is sensitive
  ageVisibility: "private",
  weightVisibility: "private",
  bodyFatVisibility: "private",
  fitnessLevelVisibility: "private", // Changed from "circle" - health data
  goalsVisibility: "circle",
  limitationsVisibility: "private",
  workoutHistoryVisibility: "circle",
  personalRecordsVisibility: "circle",
  badgesVisibility: "circle",      // Changed from "public" - achievement data
  sportsVisibility: "circle",      // Changed from "public"
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

    // Upsert settings — defaults must match DEFAULT_SETTINGS (privacy-first)
    await db
      .insert(userPrivacySettings)
      .values({
        userId: session.user.id,
        nameVisibility: body.nameVisibility || DEFAULT_SETTINGS.nameVisibility,
        profilePictureVisibility: body.profilePictureVisibility || DEFAULT_SETTINGS.profilePictureVisibility,
        cityVisibility: body.cityVisibility || DEFAULT_SETTINGS.cityVisibility,
        ageVisibility: body.ageVisibility || DEFAULT_SETTINGS.ageVisibility,
        weightVisibility: body.weightVisibility || DEFAULT_SETTINGS.weightVisibility,
        bodyFatVisibility: body.bodyFatVisibility || DEFAULT_SETTINGS.bodyFatVisibility,
        fitnessLevelVisibility: body.fitnessLevelVisibility || DEFAULT_SETTINGS.fitnessLevelVisibility,
        goalsVisibility: body.goalsVisibility || DEFAULT_SETTINGS.goalsVisibility,
        limitationsVisibility: body.limitationsVisibility || DEFAULT_SETTINGS.limitationsVisibility,
        workoutHistoryVisibility: body.workoutHistoryVisibility || DEFAULT_SETTINGS.workoutHistoryVisibility,
        personalRecordsVisibility: body.personalRecordsVisibility || DEFAULT_SETTINGS.personalRecordsVisibility,
        badgesVisibility: body.badgesVisibility || DEFAULT_SETTINGS.badgesVisibility,
        sportsVisibility: body.sportsVisibility || DEFAULT_SETTINGS.sportsVisibility,
        capabilitiesVisibility: body.capabilitiesVisibility || DEFAULT_SETTINGS.capabilitiesVisibility,
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

    // Audit log privacy settings change
    await logAuditEventFromRequest(
      {
        userId: session.user.id,
        action: "profile_update",
        resourceType: "privacy_settings",
        resourceId: session.user.id,
        metadata: {
          changedFields: Object.keys(body).filter(
            (k) => body[k] !== undefined
          ),
        },
      },
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update privacy settings:", error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}
