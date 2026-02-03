import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { aiModelFast } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { workoutType, duration, tone, existingCaption } = await request.json();

    if (!workoutType) {
      return new Response("Workout type is required", { status: 400 });
    }

    const toneDescriptions: Record<string, string> = {
      motivational: "Inspiring and encouraging, with energy and determination. Use power words and motivational phrases.",
      humble: "Modest and grateful, acknowledging the journey without bragging. Approachable and relatable.",
      funny: "Light-hearted and humorous, with witty observations about the workout struggle. Self-deprecating humor is welcome.",
      raw: "Authentic and unfiltered, showing the real effort and grind. No sugarcoating, just honest reflection.",
      professional: "Data-driven and precise, focusing on metrics and progress. Business-like tone suitable for LinkedIn.",
      casual: "Relaxed and chill, like texting a friend. Short, punchy, modern language.",
    };

    const toneGuide = toneDescriptions[tone] || toneDescriptions.motivational;

    const workoutLabels: Record<string, string> = {
      strength: "strength training / lifting",
      cardio: "cardio / running",
      hiit: "HIIT / high-intensity interval training",
      flexibility: "stretching / flexibility / yoga",
      sports: "sports / games / athletic activity",
      other: "workout / training",
    };

    const workoutLabel = workoutLabels[workoutType] || "workout";

    const prompt = `Generate a social media caption for a fitness post.

CONTEXT:
- Workout type: ${workoutLabel}
- Duration: ${duration} minutes
- Tone: ${tone} - ${toneGuide}
${existingCaption ? `- User's draft (improve this): "${existingCaption}"` : ""}

REQUIREMENTS:
1. Keep it under 280 characters (Twitter-friendly)
2. Make it genuine and personal, not generic
3. Include 1-3 relevant hashtags at the end
4. Match the requested tone exactly
5. Don't mention specific apps or services
6. Make it shareable and engaging

Generate ONLY the caption text, nothing else. No quotes around it.`;

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
