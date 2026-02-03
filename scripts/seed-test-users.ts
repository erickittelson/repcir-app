/**
 * Seed Test Users
 *
 * Creates 10 test users with full onboarding data including:
 * - User profiles with handles
 * - User metrics (height, weight, fitness level)
 * - User limitations
 * - User locations with equipment
 * - Onboarding progress marked as complete
 * - Circles and circle members
 * - Goals
 *
 * Run with: npx tsx scripts/seed-test-users.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local BEFORE any other imports
config({ path: resolve(process.cwd(), ".env.local") });

// Now import database modules
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

const {
  userProfiles,
  userMetrics,
  userLimitations,
  userLocations,
  onboardingProgress,
  circles,
  circleMembers,
  memberMetrics,
  goals,
} = schema;

// Create database connection
const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// Define the 10 test users with diverse data
const TEST_USERS = [
  {
    handle: "mike_lifts",
    displayName: "Mike Chen",
    bio: "Powerlifter and strength coach. 10+ years of experience. Let's get strong together!",
    city: "Austin, TX",
    country: "USA",
    birthMonth: 3,
    birthYear: 1992,
    gender: "male" as const,
    fitnessLevel: "advanced" as const,
    weight: 195,
    heightFeet: 5,
    heightInches: 11,
    bodyFatPercentage: 14,
    goals: ["Squat 500 lbs", "Compete in powerlifting"],
    equipment: ["barbell", "squat_rack", "bench", "dumbbells", "weight_plates"],
    limitations: [] as Array<{ bodyPart: string; condition: string; severity: "mild" | "moderate" | "severe" }>,
    activityLevel: "active" as const,
    workoutDays: ["monday", "tuesday", "thursday", "friday"],
    workoutDuration: 90,
    primaryGoal: "strength",
  },
  {
    handle: "sarah_runs",
    displayName: "Sarah Johnson",
    bio: "Marathon runner and running coach. Boston qualifier. Love trail running!",
    city: "Boulder, CO",
    country: "USA",
    birthMonth: 7,
    birthYear: 1995,
    gender: "female" as const,
    fitnessLevel: "advanced" as const,
    weight: 130,
    heightFeet: 5,
    heightInches: 6,
    bodyFatPercentage: 18,
    goals: ["Sub 3-hour marathon", "Complete ultramarathon"],
    equipment: ["treadmill", "foam_roller", "resistance_bands"],
    limitations: [
      { bodyPart: "knee", condition: "runner's knee", severity: "mild" as const },
    ],
    activityLevel: "very_active" as const,
    workoutDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    workoutDuration: 60,
    primaryGoal: "endurance",
  },
  {
    handle: "alex_fitness",
    displayName: "Alex Rivera",
    bio: "Fitness enthusiast and personal trainer. Specializing in functional fitness and HIIT.",
    city: "Miami, FL",
    country: "USA",
    birthMonth: 11,
    birthYear: 1990,
    gender: "male" as const,
    fitnessLevel: "advanced" as const,
    weight: 175,
    heightFeet: 5,
    heightInches: 10,
    bodyFatPercentage: 12,
    goals: ["Help 100 clients", "Master muscle-up"],
    equipment: ["kettlebells", "pull_up_bar", "dumbbells", "battle_ropes", "rowing_machine"],
    limitations: [] as Array<{ bodyPart: string; condition: string; severity: "mild" | "moderate" | "severe" }>,
    activityLevel: "very_active" as const,
    workoutDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    workoutDuration: 45,
    primaryGoal: "general_fitness",
  },
  {
    handle: "emma_yoga",
    displayName: "Emma Williams",
    bio: "Yoga instructor and wellness advocate. RYT-500 certified. Mind-body connection is everything.",
    city: "San Diego, CA",
    country: "USA",
    birthMonth: 4,
    birthYear: 1988,
    gender: "female" as const,
    fitnessLevel: "intermediate" as const,
    weight: 135,
    heightFeet: 5,
    heightInches: 5,
    bodyFatPercentage: 22,
    goals: ["Master handstand", "Complete yoga teacher training"],
    equipment: ["yoga_mat", "yoga_blocks", "resistance_bands", "foam_roller"],
    limitations: [
      { bodyPart: "wrist", condition: "carpal tunnel", severity: "mild" as const },
    ],
    activityLevel: "moderate" as const,
    workoutDays: ["monday", "wednesday", "friday", "sunday"],
    workoutDuration: 60,
    primaryGoal: "flexibility",
  },
  {
    handle: "james_iron",
    displayName: "James Rodriguez",
    bio: "Bodybuilder and nutrition coach. Classic physique competitor. Gains don't sleep!",
    city: "Los Angeles, CA",
    country: "USA",
    birthMonth: 9,
    birthYear: 1994,
    gender: "male" as const,
    fitnessLevel: "advanced" as const,
    weight: 210,
    heightFeet: 6,
    heightInches: 1,
    bodyFatPercentage: 10,
    goals: ["Win natural bodybuilding show", "Bench 405 lbs"],
    equipment: ["barbell", "dumbbells", "cable_machine", "leg_press", "smith_machine", "bench"],
    limitations: [] as Array<{ bodyPart: string; condition: string; severity: "mild" | "moderate" | "severe" }>,
    activityLevel: "very_active" as const,
    workoutDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    workoutDuration: 75,
    primaryGoal: "muscle_building",
  },
  {
    handle: "lisa_beginner",
    displayName: "Lisa Thompson",
    bio: "Just starting my fitness journey! Mom of 2, looking to get healthy and strong.",
    city: "Chicago, IL",
    country: "USA",
    birthMonth: 2,
    birthYear: 1985,
    gender: "female" as const,
    fitnessLevel: "beginner" as const,
    weight: 165,
    heightFeet: 5,
    heightInches: 4,
    bodyFatPercentage: 32,
    goals: ["Lose 20 lbs", "Run a 5K"],
    equipment: ["dumbbells", "yoga_mat", "resistance_bands"],
    limitations: [
      { bodyPart: "back", condition: "lower back pain", severity: "moderate" as const },
    ],
    activityLevel: "light" as const,
    workoutDays: ["monday", "wednesday", "friday"],
    workoutDuration: 30,
    primaryGoal: "weight_loss",
  },
  {
    handle: "david_crossfit",
    displayName: "David Kim",
    bio: "CrossFit Level 2 trainer. Former college athlete. Let's crush WODs together!",
    city: "Denver, CO",
    country: "USA",
    birthMonth: 6,
    birthYear: 1991,
    gender: "male" as const,
    fitnessLevel: "advanced" as const,
    weight: 185,
    heightFeet: 5,
    heightInches: 9,
    bodyFatPercentage: 11,
    goals: ["Qualify for CrossFit Games", "Sub-3 minute Fran"],
    equipment: ["barbell", "pull_up_bar", "rings", "kettlebells", "rowing_machine", "box"],
    limitations: [
      { bodyPart: "shoulder", condition: "rotator cuff strain", severity: "mild" as const },
    ],
    activityLevel: "very_active" as const,
    workoutDays: ["monday", "tuesday", "wednesday", "friday", "saturday"],
    workoutDuration: 60,
    primaryGoal: "general_fitness",
  },
  {
    handle: "amanda_wellness",
    displayName: "Amanda Garcia",
    bio: "Holistic health coach focusing on sustainable fitness. Balance is key!",
    city: "Seattle, WA",
    country: "USA",
    birthMonth: 12,
    birthYear: 1993,
    gender: "female" as const,
    fitnessLevel: "intermediate" as const,
    weight: 145,
    heightFeet: 5,
    heightInches: 7,
    bodyFatPercentage: 24,
    goals: ["Improve sleep quality", "Do 10 pull-ups"],
    equipment: ["dumbbells", "kettlebells", "pull_up_bar", "yoga_mat", "foam_roller"],
    limitations: [] as Array<{ bodyPart: string; condition: string; severity: "mild" | "moderate" | "severe" }>,
    activityLevel: "moderate" as const,
    workoutDays: ["tuesday", "thursday", "saturday", "sunday"],
    workoutDuration: 45,
    primaryGoal: "health",
  },
  {
    handle: "chris_senior",
    displayName: "Chris Anderson",
    bio: "Staying active at 55! Proof that age is just a number. Focus on mobility and longevity.",
    city: "Phoenix, AZ",
    country: "USA",
    birthMonth: 8,
    birthYear: 1970,
    gender: "male" as const,
    fitnessLevel: "intermediate" as const,
    weight: 180,
    heightFeet: 5,
    heightInches: 10,
    bodyFatPercentage: 22,
    goals: ["Maintain mobility", "Play with grandkids"],
    equipment: ["dumbbells", "resistance_bands", "stationary_bike", "foam_roller"],
    limitations: [
      { bodyPart: "hip", condition: "arthritis", severity: "moderate" as const },
      { bodyPart: "knee", condition: "osteoarthritis", severity: "mild" as const },
    ],
    activityLevel: "moderate" as const,
    workoutDays: ["monday", "wednesday", "friday"],
    workoutDuration: 40,
    primaryGoal: "health",
  },
  {
    handle: "jen_athlete",
    displayName: "Jennifer Lee",
    bio: "Former collegiate volleyball player. Now helping athletes optimize performance.",
    city: "Portland, OR",
    country: "USA",
    birthMonth: 5,
    birthYear: 1996,
    gender: "female" as const,
    fitnessLevel: "advanced" as const,
    weight: 155,
    heightFeet: 5,
    heightInches: 10,
    bodyFatPercentage: 19,
    goals: ["Vertical jump 30 inches", "Olympic lifting certification"],
    equipment: ["barbell", "squat_rack", "dumbbells", "plyo_box", "medicine_ball"],
    limitations: [
      { bodyPart: "ankle", condition: "previous sprain", severity: "mild" as const },
    ],
    activityLevel: "very_active" as const,
    workoutDays: ["monday", "tuesday", "thursday", "friday", "saturday"],
    workoutDuration: 75,
    primaryGoal: "strength",
  },
];

async function seedTestUsers() {
  console.log("Starting to seed 10 test users...\n");

  const createdHandles: string[] = [];

  for (const user of TEST_USERS) {
    const userId = `test-user-${user.handle}`;
    const profilePictureUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.handle}`;

    try {
      console.log(`Creating user: @${user.handle}...`);

      // 1. Create or update user profile
      await db
        .insert(userProfiles)
        .values({
          userId,
          handle: user.handle,
          displayName: user.displayName,
          profilePicture: profilePictureUrl,
          bio: user.bio,
          city: user.city,
          country: user.country,
          birthMonth: user.birthMonth,
          birthYear: user.birthYear,
          visibility: "public",
          workoutPreferences: {
            workoutDays: user.workoutDays,
            workoutDuration: user.workoutDuration,
            trainingFrequency: user.workoutDays.length,
            activityLevel: {
              jobType: user.activityLevel,
            },
            secondaryGoals: user.goals,
          },
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            handle: user.handle,
            displayName: user.displayName,
            profilePicture: profilePictureUrl,
            bio: user.bio,
            city: user.city,
            country: user.country,
            birthMonth: user.birthMonth,
            birthYear: user.birthYear,
            visibility: "public",
            workoutPreferences: {
              workoutDays: user.workoutDays,
              workoutDuration: user.workoutDuration,
              trainingFrequency: user.workoutDays.length,
              activityLevel: {
                jobType: user.activityLevel,
              },
              secondaryGoals: user.goals,
            },
            updatedAt: new Date(),
          },
        });

      // 2. Create user metrics
      const heightInches = user.heightFeet * 12 + user.heightInches;
      await db.insert(userMetrics).values({
        userId,
        weight: user.weight,
        height: heightInches,
        bodyFatPercentage: user.bodyFatPercentage,
        fitnessLevel: user.fitnessLevel,
        notes: "Initial metrics from seed script",
      });

      // 3. Create user limitations
      if (user.limitations.length > 0) {
        for (const limitation of user.limitations) {
          await db.insert(userLimitations).values({
            userId,
            type: "injury",
            bodyPart: limitation.bodyPart,
            condition: limitation.condition,
            description: `${limitation.bodyPart}: ${limitation.condition}`,
            affectedAreas: [limitation.bodyPart],
            severity: limitation.severity,
            active: true,
          });
        }
      }

      // 4. Create user location with equipment
      await db.insert(userLocations).values({
        userId,
        name: "My Gym",
        type: "home",
        isActive: true,
        equipment: user.equipment,
      });

      // 5. Create or update onboarding progress (mark as complete)
      await db
        .insert(onboardingProgress)
        .values({
          userId,
          currentPhase: "complete",
          phaseIndex: 100,
          extractedData: {
            name: user.displayName,
            profilePicture: profilePictureUrl,
            birthMonth: user.birthMonth,
            birthYear: user.birthYear,
            gender: user.gender,
            heightFeet: user.heightFeet,
            heightInches: user.heightInches,
            weight: user.weight,
            city: user.city,
            bodyFatPercentage: user.bodyFatPercentage,
            fitnessLevel: user.fitnessLevel,
            trainingFrequency: user.workoutDays.length,
            primaryGoal: user.primaryGoal,
            secondaryGoals: user.goals,
            equipmentAccess: user.equipment,
            workoutDays: user.workoutDays,
            workoutDuration: user.workoutDuration,
            limitations: user.limitations,
            activityLevel: {
              jobType: user.activityLevel,
            },
          },
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: onboardingProgress.userId,
          set: {
            currentPhase: "complete",
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      // 6. Create a personal circle for the user
      const [newCircle] = await db
        .insert(circles)
        .values({
          name: `${user.displayName}'s Circle`,
          description: `Personal workout space for ${user.displayName}`,
        })
        .returning();

      // 7. Create circle member
      const [newMember] = await db
        .insert(circleMembers)
        .values({
          circleId: newCircle.id,
          userId,
          name: user.displayName,
          gender: user.gender,
          role: "owner",
        })
        .returning();

      // 8. Create member metrics
      await db.insert(memberMetrics).values({
        memberId: newMember.id,
        weight: user.weight,
        height: heightInches,
        bodyFatPercentage: user.bodyFatPercentage,
        fitnessLevel: user.fitnessLevel,
        notes: "Initial metrics from seed script",
      });

      // 9. Create goals
      for (const goalTitle of user.goals) {
        const categoryMap: Record<string, string> = {
          strength: "strength",
          weight_loss: "weight",
          muscle_building: "strength",
          endurance: "cardio",
          flexibility: "health",
          general_fitness: "health",
          health: "health",
        };

        await db.insert(goals).values({
          memberId: newMember.id,
          title: goalTitle,
          description: `Goal created during onboarding`,
          category: categoryMap[user.primaryGoal] || "health",
          status: "active",
          aiGenerated: false,
        });
      }

      createdHandles.push(`@${user.handle}`);
      console.log(`  - Created: @${user.handle} (${user.displayName})`);
    } catch (error) {
      console.error(`  - Error creating @${user.handle}:`, error);
    }
  }

  console.log("\n========================================");
  console.log("Seed complete! Created handles:");
  console.log("========================================");
  createdHandles.forEach((handle) => console.log(`  ${handle}`));
  console.log("========================================\n");

  return createdHandles;
}

// Run the seed function
seedTestUsers()
  .then((handles) => {
    console.log(`Successfully created ${handles.length} test users.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
