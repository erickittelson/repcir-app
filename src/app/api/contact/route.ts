import { Resend } from "resend";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

interface FeedbackFormData {
  type: "feedback" | "bug" | "feature" | "support";
  subject: string;
  message: string;
  email?: string; // Optional if user is logged in
}

export async function POST(request: Request) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("RESEND_API_KEY not configured - email not sent");
      return NextResponse.json(
        { error: "Email service not configured. Set RESEND_API_KEY in environment." },
        { status: 503 }
      );
    }

    const session = await getSession();
    const body: FeedbackFormData = await request.json();
    const { type, subject, message, email: providedEmail } = body;

    // Use session email or provided email
    const email = session?.user?.email || providedEmail;
    const userName = session?.user?.name || "Anonymous User";
    const userId = session?.user?.id || "Not logged in";

    // Validation
    if (!type || !subject || !message) {
      return NextResponse.json(
        { error: "Type, subject, and message are required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const typeLabels: Record<string, string> = {
      feedback: "General Feedback",
      bug: "Bug Report",
      feature: "Feature Request",
      support: "Support Request",
    };

    const typeEmoji: Record<string, string> = {
      feedback: "💬",
      bug: "🐛",
      feature: "✨",
      support: "🆘",
    };

    // Send notification to team
    await resend.emails.send({
      from: "Repcir App <noreply@repcir.com>",
      to: ["support@repcir.com", "hello@quietvictorylabs.com"],
      subject: `${typeEmoji[type]} ${typeLabels[type]}: ${subject}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C9A227;">${typeEmoji[type]} ${typeLabels[type]}</h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">From</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${userName} (${email})</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">User ID</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${userId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Subject</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${subject}</td>
            </tr>
          </table>

          <h3 style="color: #333;">Message</h3>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${message}</div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">
            Received: ${new Date().toISOString()}<br/>
            From: Repcir App (app.repcir.com)
          </p>
        </div>
      `,
    });

    // Send confirmation to user
    await resend.emails.send({
      from: "Repcir <noreply@repcir.com>",
      to: [email],
      subject: `We received your ${typeLabels[type].toLowerCase()}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0D0D14; color: #E8E8EC; padding: 40px; border-radius: 12px;">
          <h1 style="color: #C9A227; margin: 0 0 20px 0;">Got it.</h1>

          <p style="font-size: 16px; line-height: 1.6;">
            We've received your ${typeLabels[type].toLowerCase()} and will review it shortly.
          </p>

          <div style="margin-top: 20px; padding: 20px; background: #1a1a2e; border-radius: 8px;">
            <p style="margin: 0 0 5px 0; color: #C9A227; font-weight: bold;">${subject}</p>
            <p style="margin: 0; color: #888; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
            ${type === "support"
              ? "We typically respond to support requests within 24 hours."
              : "Thanks for helping us make Repcir better."
            }
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Keep showing up.<br/>
              — The Repcir Team
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
