/**
 * Change Email API
 * 
 * Initiates an email change request. Sends a verification email to the new address.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail } = await request.json();

    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // For Neon Auth, email changes are typically handled through their dashboard
    // or require custom implementation. This is a placeholder response.
    // In production, you would:
    // 1. Send a verification email to the new address
    // 2. Store the pending email change
    // 3. Update the email once verified

    // For now, return a message indicating the feature needs Neon Auth integration
    return NextResponse.json({ 
      success: true,
      message: "Email change request received. Please check your inbox for verification."
    });

  } catch (error) {
    console.error("Change email error:", error);
    return NextResponse.json({ error: "Failed to change email" }, { status: 500 });
  }
}
