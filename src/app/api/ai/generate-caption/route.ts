import { generateText } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { aiModelFast } from "@/lib/ai";
import { applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Input validation schema
const captionRequestSchema = z.object({
  workoutType: z.enum(["strength", "cardio", "hiit", "flexibility", "sports", "other"]),
  duration: z.number().int().min(1).max(480).optional(), // 1-480 minutes (8 hours max)
  tone: z.enum(["motivational", "humble", "funny", "raw", "professional", "casual"]).optional().default("motivational"),
  existingCaption: z.string().max(500).optional(), // Max 500 chars for existing caption
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(
      `ai-caption:${session.user.id}`,
      RATE_LIMITS.aiGeneration
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();

    // Validate input
    const validation = captionRequestSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { workoutType, duration, tone, existingCaption } = validation.data;

    // Fitness influencer voice guidelines - inspired by Few Will Hunt, David Goggins, etc.
    const toneDescriptions: Record<string, string> = {
      motivational: `Intense, powerful energy like David Goggins or Few Will Hunt. Short punchy sentences.
      Challenge the reader. Use phrases like "Most won't.", "While you sleep, I work.", "Comfort is the enemy."
      Sound like you're speaking hard truths. Direct. Confident. No fluff.`,
      humble: `Authentic gratitude like a grounded athlete. Acknowledge the struggle without flexing.
      "Grateful for another day to grind.", "Small steps, big vision.", "Not where I want to be, but better than yesterday."
      Real, relatable, showing the human side of fitness.`,
      funny: `Gym bro humor with self-awareness. Meme-worthy observations.
      "Leg day hits different when the elevator is broken.", "My pre-workout kicked in during the commute home."
      Relatable fitness struggles turned into laughs. Gen-Z/millennial humor.`,
      raw: `Unfiltered grind mentality. Like a 4am gym story post.
      "Nobody's coming to save you.", "The work doesn't care about your feelings."
      Show the unglamorous side - the sweat, the pain, the early mornings. Real talk only.`,
      professional: `Clean, performance-focused like an elite athlete's post.
      "Session complete. Progress tracked. Moving forward."
      Data-driven but still human. Think Nike athlete or CrossFit Games competitor energy.`,
      casual: `Effortlessly cool, like a fitness TikToker between sets.
      "got my reps in 🤷‍♂️", "it's giving main character at the gym"
      Short, modern, lowercase energy. Minimal but impactful.`,
    };

    const toneGuide = toneDescriptions[tone] || toneDescriptions.motivational;

    const workoutLabels: Record<string, string> = {
      strength: "lifting / iron therapy / strength work",
      cardio: "cardio / running / conditioning",
      hiit: "HIIT / high-intensity / metabolic work",
      flexibility: "mobility / stretching / recovery",
      sports: "sport training / competition prep / athletic work",
      other: "training / movement / work",
    };

    const workoutLabel = workoutLabels[workoutType] || "training";

    const prompt = `Generate a social media caption for a fitness post in the style of top fitness influencers.

CONTEXT:
- Workout type: ${workoutLabel}
- Duration: ${duration} minutes
- Tone: ${tone}
${existingCaption ? `- User's draft (improve this): "${existingCaption}"` : ""}

VOICE & STYLE GUIDE (${tone}):
${toneGuide}

INFLUENCER EXAMPLES TO CHANNEL:
- Few Will Hunt: "Most people won't. That's why most people don't have what they want."
- David Goggins: "When you think you're done, you're only at 40% of your potential."
- Jocko Willink: "Discipline equals freedom."
- Whitney Simmons: "showing up is half the battle 💪"

REQUIREMENTS:
1. MAX 220 characters (punchy, not wordy)
2. Sound like a real person, not a corporate account
3. Use sentence fragments and incomplete thoughts for impact
4. Include 1-2 relevant hashtags MAX (or none if casual tone)
5. No generic motivational clichés like "you got this" or "believe in yourself"
6. Speak to the grind, the process, the journey
7. Make it screenshot-worthy

Generate ONLY the caption. No quotes. No explanations.`;

    const result = await generateText({
      model: aiModelFast,
      prompt,
    });

    return Response.json({
      caption: result.text.trim(),
    });
  } catch (error) {
    console.error("Error generating caption:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Failed to generate caption", details: errorMessage },
      { status: 500 }
    );
  }
}
