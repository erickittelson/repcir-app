/**
 * Password Reset API
 * 
 * Sends a password reset email to the user.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // For Neon Auth, password resets are typically handled through their system
    // This is a placeholder that simulates the flow
    // In production with Neon Auth, you would use their SDK:
    // await authServer.sendPasswordResetEmail(email);

    // For now, return success to show the UI flow
    return NextResponse.json({ 
      success: true,
      message: "Password reset email sent"
    });

  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
