/**
 * User Consent API - GDPR/CCPA Compliance
 * 
 * Stores and retrieves user privacy consent preferences
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEventFromRequest } from "@/lib/audit-log";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: {
        consentGiven: true,
        consentDate: true,
        consentVersion: true,
        consentPreferences: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ consentGiven: false });
    }

    return NextResponse.json({
      consentGiven: profile.consentGiven,
      consentDate: profile.consentDate,
      consentVersion: profile.consentVersion,
      preferences: profile.consentPreferences,
    });
  } catch (error) {
    console.error("Consent fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch consent" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      analytics,
      marketing,
      personalization,
      doNotSell,
      consentVersion,
      region,
    } = body;

    // Upsert consent preferences
    const consentPreferences = {
      analytics: analytics ?? false,
      marketing: marketing ?? false,
      personalization: personalization ?? false,
      doNotSell: doNotSell ?? false,
      region: region ?? "other",
    };

    await db
      .insert(userProfiles)
      .values({
        userId: session.user.id,
        consentGiven: true,
        consentDate: new Date(),
        consentVersion: consentVersion || "1.0.0",
        consentPreferences,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          consentGiven: true,
          consentDate: new Date(),
          consentVersion: consentVersion || "1.0.0",
          consentPreferences,
          updatedAt: new Date(),
        },
      });

    // Audit log consent change (GDPR compliance)
    await logAuditEventFromRequest(
      {
        userId: session.user.id,
        action: "consent_change",
        resourceType: "user_profile",
        resourceId: session.user.id,
        metadata: {
          consentVersion: consentVersion || "1.0.0",
          preferences: consentPreferences,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: "Consent preferences saved",
    });
  } catch (error) {
    console.error("Consent save error:", error);
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 }
    );
  }
}
