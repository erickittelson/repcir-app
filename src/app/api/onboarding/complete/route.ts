/**
 * Onboarding Complete API
 *
 * Creates the user's profile from AI-extracted onboarding data.
 * This creates:
 * - A personal circle for the user
 * - Their member profile with collected data
 * - Initial metrics
 * - Limitations (if any)
 * - Goals (if any)
 * - Personal records (if any)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  memberMetrics,
  memberLimitations,
  goals,
  personalRecords,
  exercises,
  userProfiles,
  userMetrics,
  userLocations,
  userSports,
  userSkills,
  onboardingProgress,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const ACTIVE_CIRCLE_COOKIE = "active_circle";

// Schema for the extracted onboarding data
const onboardingDataSchema = z.object({
  name: z.string().optional(),
  profilePicture: z.string().optional(),
  // Birthday (new) or age (legacy)
  birthMonth: z.number().optional(),
  birthYear: z.number().optional(),
  age: z.number().optional(), // Legacy support
  gender: z.enum(["male", "female", "other"]).optional(),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  weight: z.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  personalContext: z.string().optional(),
  bodyFatPercentage: z.number().optional(),
  targetWeight: z.number().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  trainingFrequency: z.number().optional(),
  activityLevel: z.object({
    jobType: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
    dailySteps: z.number().optional(),
    description: z.string().optional(),
  }).optional(),
  primaryMotivation: z.union([z.string(), z.array(z.string())]).optional(),
  // Support both simple string format (new) and object format (legacy)
  primaryGoal: z.union([
    z.string(),
    z.object({
      type: z.string(),
      description: z.string(),
      targetValue: z.number().optional(),
      targetUnit: z.string().optional(),
    }),
  ]).optional(),
  secondaryGoals: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  limitations: z.array(z.object({
    bodyPart: z.string(),
    condition: z.string().optional(),
    severity: z.enum(["mild", "moderate", "severe"]).optional(),
    avoidMovements: z.array(z.string()).optional(),
    movementsToAvoid: z.array(z.string()).optional(),
  })).optional(),
  // Current assessed maxes (for workout programming)
  currentMaxes: z.array(z.object({
    exercise: z.string(),
    value: z.union([z.number(), z.enum(["working_on", "mastered", "consistent"])]),
    unit: z.string(), // Accept any unit string (lbs, kg, reps, seconds, etc.)
    isCustom: z.boolean().optional(),
  })).optional(),
  // Specific goals (PRs, skills, targets)
  specificGoals: z.array(z.object({
    type: z.enum(["pr", "skill", "time", "other"]),
    exercise: z.string().optional(),
    targetValue: z.number().optional(),
    targetUnit: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  // Legacy personal records
  personalRecords: z.array(z.object({
    exercise: z.string(),
    value: z.number(),
    unit: z.string(),
    isEstimate: z.boolean().optional(),
  })).optional(),
  workoutDuration: z.number().optional(),
  gymLocations: z.array(z.string()).optional(),
  commercialGymDetails: z.array(z.object({
    locationType: z.string(),
    name: z.string(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })).optional(),
  equipmentAccess: z.array(z.string()).optional(),
  equipmentDetails: z.object({
    dumbbells: z.object({
      available: z.boolean(),
      type: z.enum(["fixed", "adjustable", "both"]).optional(),
      maxWeight: z.number().optional(),
      weights: z.array(z.number()).optional(),
    }).optional(),
    barbell: z.object({
      available: z.boolean(),
      type: z.enum(["standard", "olympic"]).optional(),
      barWeight: z.number().optional(),
      plates: z.array(z.number()).optional(),
      totalPlateWeight: z.number().optional(),
    }).optional(),
    machines: z.array(z.string()).optional(),
    cardio: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
  workoutDays: z.array(z.string()).optional(),
  currentActivity: z.string().optional(),
  profileVisibility: z.enum(["public", "private"]).optional(),
  // Sports
  sports: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
  })).optional(),
  sportsAcknowledged: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = onboardingDataSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const data = validation.data;
    const userName = data.name || session.user.name || "User";

    // Convert legacy age to birthMonth/birthYear if needed
    let birthMonth = data.birthMonth;
    let birthYear = data.birthYear;
    if (!birthMonth && !birthYear && data.age) {
      // Legacy age support - estimate birth year
      birthYear = new Date().getFullYear() - data.age;
      birthMonth = 1; // Default to January
    }

    // Check if user already has a personal circle
    const existingCircles = session.circles || [];
    let circleId: string;
    let memberId: string;

    if (existingCircles.length > 0) {
      // Use existing circle
      circleId = existingCircles[0].id;
      memberId = existingCircles[0].memberId;

      // Update the existing member profile
      // Note: dateOfBirth and profilePicture now stored in user_profiles instead
      await db
        .update(circleMembers)
        .set({
          name: userName,
          gender: data.gender || null,
          updatedAt: new Date(),
        })
        .where(eq(circleMembers.id, memberId));
    } else {
      // Create a personal "My Training" circle for the user
      const [newCircle] = await db
        .insert(circles)
        .values({
          name: "My Training",
          description: "Your personal workout space",
          isSystemCircle: true,
          visibility: "private",
          joinType: "invite_only",
        })
        .returning();

      circleId = newCircle.id;

      // Create member profile
      // Note: dateOfBirth and profilePicture now stored in user_profiles instead
      const [newMember] = await db
        .insert(circleMembers)
        .values({
          circleId,
          userId: session.user.id,
          name: userName,
          gender: data.gender || null,
          role: "owner",
        })
        .returning();

      memberId = newMember.id;

      // Set the active circle cookie
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_CIRCLE_COOKIE, circleId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    // Build workout preferences from collected onboarding data
    // Filter out undefined values to keep the JSON clean
    const workoutPreferences: Record<string, unknown> = {};
    if (data.workoutDays) workoutPreferences.workoutDays = data.workoutDays;
    if (data.workoutDuration) workoutPreferences.workoutDuration = data.workoutDuration;
    if (data.trainingFrequency) workoutPreferences.trainingFrequency = data.trainingFrequency;
    if (data.activityLevel) workoutPreferences.activityLevel = data.activityLevel;
    if (data.currentActivity) workoutPreferences.currentActivity = data.currentActivity;
    if (data.secondaryGoals) workoutPreferences.secondaryGoals = data.secondaryGoals;

    // Create or update user_profiles with user-level data
    // This is separate from circle_members as it's user-wide settings
    await db
      .insert(userProfiles)
      .values({
        userId: session.user.id,
        displayName: userName,
        profilePicture: data.profilePicture || null,
        birthMonth: birthMonth || null,
        birthYear: birthYear || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        personalContext: data.personalContext || null,
        visibility: data.profileVisibility || "private",
        workoutPreferences,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          displayName: userName,
          profilePicture: data.profilePicture || null,
          birthMonth: birthMonth || null,
          birthYear: birthYear || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          personalContext: data.personalContext || null,
          visibility: data.profileVisibility || "private",
          workoutPreferences,
          updatedAt: new Date(),
        },
      });

    // Create initial metrics if we have any
    if (
      data.weight ||
      data.heightFeet ||
      data.bodyFatPercentage ||
      data.fitnessLevel
    ) {
      const heightInches = data.heightFeet
        ? data.heightFeet * 12 + (data.heightInches || 0)
        : null;

      // Save to member_metrics (circle-level)
      await db.insert(memberMetrics).values({
        memberId,
        weight: data.weight || null,
        height: heightInches,
        bodyFatPercentage: data.bodyFatPercentage || null,
        fitnessLevel: data.fitnessLevel || null,
        notes: "Initial profile from onboarding",
      });

      // Save to user_metrics (user-level - displayed on profile)
      await db.insert(userMetrics).values({
        userId: session.user.id,
        weight: data.weight || null,
        height: heightInches,
        bodyFatPercentage: data.bodyFatPercentage || null,
        fitnessLevel: data.fitnessLevel || null,
        notes: "Initial profile from onboarding",
      });
    }

    // Save gym locations with equipment
    const gymLocations = data.gymLocations || [];
    const locationEntries = [];

    // Check for home gym
    if (gymLocations.includes("home")) {
      locationEntries.push({
        userId: session.user.id,
        name: "Home Gym",
        type: "home",
        isActive: true,
        equipment: data.equipmentAccess || [],
        equipmentDetails: data.equipmentDetails || {},
      });
    }

    // Check for commercial gym types
    const commercialTypes = ["commercial", "crossfit", "school"];
    const gymDetailsMap = new Map(
      (data.commercialGymDetails || []).map(d => [d.locationType, d])
    );
    for (const locationType of commercialTypes) {
      if (gymLocations.includes(locationType)) {
        const defaultNames: Record<string, string> = {
          commercial: "Commercial Gym",
          crossfit: "CrossFit Box",
          school: "School/University Gym",
        };
        const gymDetail = gymDetailsMap.get(locationType);
        locationEntries.push({
          userId: session.user.id,
          name: gymDetail?.name || defaultNames[locationType],
          type: locationType,
          address: gymDetail?.address || null,
          lat: gymDetail?.lat ?? null,
          lng: gymDetail?.lng ?? null,
          isActive: !gymLocations.includes("home"), // Active if no home gym
          equipment: ["full_gym"], // Commercial gyms have everything
          equipmentDetails: {},
        });
      }
    }

    // Check for outdoor
    if (gymLocations.includes("outdoor")) {
      locationEntries.push({
        userId: session.user.id,
        name: "Outdoor/Park",
        type: "outdoor",
        isActive: locationEntries.length === 0, // Active if only option
        equipment: ["bodyweight", "resistance_bands"],
        equipmentDetails: {},
      });
    }

    // Insert all locations
    if (locationEntries.length > 0) {
      await db.insert(userLocations).values(locationEntries);
    } else if (data.equipmentAccess && data.equipmentAccess.length > 0) {
      // Fallback for legacy data without gymLocations
      await db.insert(userLocations).values({
        userId: session.user.id,
        name: "My Gym",
        type: "home",
        isActive: true,
        equipment: data.equipmentAccess,
        equipmentDetails: data.equipmentDetails || {},
      });
    }

    // Save sports
    if (data.sports && data.sports.length > 0) {
      await db.insert(userSports).values(
        data.sports.map((sport) => ({
          userId: session.user.id,
          sport: sport.name,
          currentlyActive: true,
        }))
      );
    }

    // Create limitations if any
    if (data.limitations && data.limitations.length > 0) {
      await db.insert(memberLimitations).values(
        data.limitations.map((l) => ({
          memberId,
          type: "injury",
          description: l.condition 
            ? `${l.bodyPart}: ${l.condition}` 
            : `${l.bodyPart} limitation`,
          affectedAreas: [l.bodyPart],
          severity: l.severity || null,
          active: true,
        }))
      );
    }

    // Create primary goal if provided
    if (data.primaryGoal) {
      // Determine category from goal type
      const categoryMap: Record<string, string> = {
        strength: "strength",
        weight_loss: "weight",
        muscle_gain: "strength",
        muscle_building: "strength",
        cardio: "cardio",
        endurance: "cardio",
        skill: "skill",
        flexibility: "health",
        general_fitness: "health",
        aesthetic: "weight",
        health: "health",
      };

      // Parse timeline into target date
      let targetDate: Date | null = null;
      if (data.timeline) {
        const match = data.timeline.match(/(\d+)\s*(week|month|year)/i);
        if (match) {
          const amount = parseInt(match[1], 10);
          const unit = match[2].toLowerCase();
          targetDate = new Date();
          if (unit === "week") {
            targetDate.setDate(targetDate.getDate() + amount * 7);
          } else if (unit === "month") {
            targetDate.setMonth(targetDate.getMonth() + amount);
          } else if (unit === "year") {
            targetDate.setFullYear(targetDate.getFullYear() + amount);
          }
        }
      }

      // Convert motivation to string if it's an array
      const motivationDescription = data.primaryMotivation
        ? Array.isArray(data.primaryMotivation)
          ? data.primaryMotivation.join(", ")
          : data.primaryMotivation
        : null;

      // Handle both string and object goal formats
      const goalType = typeof data.primaryGoal === "string" 
        ? data.primaryGoal 
        : data.primaryGoal.type;
      const goalTitle = typeof data.primaryGoal === "string"
        ? data.primaryGoal.replace(/_/g, " ")
        : data.primaryGoal.description;
      const goalTargetValue = typeof data.primaryGoal === "object" 
        ? data.primaryGoal.targetValue 
        : null;
      const goalTargetUnit = typeof data.primaryGoal === "object" 
        ? data.primaryGoal.targetUnit 
        : null;

      await db.insert(goals).values({
        memberId,
        title: goalTitle,
        description: motivationDescription,
        category: categoryMap[goalType] || "health",
        targetValue: goalTargetValue,
        targetUnit: goalTargetUnit,
        targetDate,
        status: "active",
        aiGenerated: true,
      });
    }

    // Save skills from currentMaxes to user_skills table
    if (data.currentMaxes && data.currentMaxes.length > 0) {
      const skillEntries = data.currentMaxes
        .filter((max) => max.unit === "skill")
        .map((max) => ({
          userId: session.user.id,
          name: max.exercise,
          category: "calisthenics" as const,
          currentStatus: "achieved" as const,
          allTimeBestStatus: "achieved" as const,
          allTimeBestDate: new Date(),
        }));

      if (skillEntries.length > 0) {
        for (const entry of skillEntries) {
          await db
            .insert(userSkills)
            .values(entry)
            .onConflictDoNothing();
        }
      }
    }

    // Create personal records from currentMaxes (new format)
    if (data.currentMaxes && data.currentMaxes.length > 0) {
      for (const max of data.currentMaxes) {
        // Skip skills for personal records (they don't have numeric values)
        if (max.unit === "skill") continue;

        // Find or create the exercise
        let exercise = await db.query.exercises.findFirst({
          where: (ex, { ilike }) => ilike(ex.name, max.exercise),
        });

        if (!exercise) {
          const [newExercise] = await db
            .insert(exercises)
            .values({
              name: max.exercise,
              category: "custom",
              muscleGroups: [],
              equipment: [],
              difficulty: "intermediate",
              isCustom: true,
            })
            .returning();
          exercise = newExercise;
        }

        await db.insert(personalRecords).values({
          memberId,
          exerciseId: exercise.id,
          value: typeof max.value === "number" ? max.value : 0,
          unit: max.unit,
          recordType: "current",
          repMax: max.unit === "lbs" ? 1 : null,
        });
      }
    }

    // Create personal records from legacy format if any
    if (data.personalRecords && data.personalRecords.length > 0) {
      for (const pr of data.personalRecords) {
        // Find or create the exercise
        let exercise = await db.query.exercises.findFirst({
          where: (ex, { ilike }) => ilike(ex.name, pr.exercise),
        });

        if (!exercise) {
          // Create a custom exercise for this PR
          const [newExercise] = await db
            .insert(exercises)
            .values({
              name: pr.exercise,
              category: "custom",
              muscleGroups: [],
              equipment: [],
              difficulty: "intermediate",
              isCustom: true,
            })
            .returning();
          exercise = newExercise;
        }

        await db.insert(personalRecords).values({
          memberId,
          exerciseId: exercise.id,
          value: pr.value,
          unit: pr.unit,
          recordType: pr.isEstimate ? "estimated" : "current",
          repMax: pr.unit === "lbs" || pr.unit === "kg" ? 1 : null,
        });
      }
    }

    // Mark onboarding as complete
    await db
      .insert(onboardingProgress)
      .values({
        userId: session.user.id,
        currentPhase: "complete",
        phaseIndex: 100,
        extractedData: data as Record<string, unknown>,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: onboardingProgress.userId,
        set: {
          currentPhase: "complete",
          completedAt: new Date(),
          extractedData: data as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      circleId,
      memberId,
      message: "Profile created successfully",
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to complete onboarding: ${errorMessage}` },
      { status: 500 }
    );
  }
}
