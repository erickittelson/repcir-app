/**
 * Migration: Consolidate profile data from circleMembers to userProfiles
 *
 * This migration:
 * 1. Adds gender column to user_profiles if not exists
 * 2. Copies profilePicture, dateOfBirth, gender from circleMembers to userProfiles
 * 3. Only updates userProfiles if the field is currently null
 *
 * Run with: npx tsx scripts/migrations/migrate-profile-data.ts
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("Running migration: Consolidate profile data from circleMembers to userProfiles\n");

  try {
    // Step 1: Add gender column to user_profiles if it doesn't exist
    console.log("Step 1: Checking gender column...");
    const genderColumnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'gender'
      );
    `;

    if (genderColumnExists[0].exists) {
      console.log("✓ gender column already exists in user_profiles");
    } else {
      await sql`
        ALTER TABLE user_profiles
        ADD COLUMN gender text;
      `;
      console.log("✓ Added gender column to user_profiles");
    }

    // Step 2: Get all users with circleMembers data that could be migrated
    console.log("\nStep 2: Finding users with profile data in circleMembers...");

    const membersWithData = await sql`
      SELECT DISTINCT ON (cm.user_id)
        cm.user_id,
        cm.profile_picture,
        cm.date_of_birth,
        cm.gender,
        cm.name
      FROM circle_members cm
      WHERE cm.user_id IS NOT NULL
        AND (
          cm.profile_picture IS NOT NULL
          OR cm.date_of_birth IS NOT NULL
          OR cm.gender IS NOT NULL
        )
      ORDER BY cm.user_id, cm.updated_at DESC;
    `;

    console.log(`Found ${membersWithData.length} users with profile data to migrate`);

    // Step 3: Migrate data to userProfiles
    console.log("\nStep 3: Migrating data to user_profiles...");

    let migrated = 0;
    let skipped = 0;
    let created = 0;

    for (const member of membersWithData) {
      // Check if user_profile exists
      const existingProfile = await sql`
        SELECT id, profile_picture, birth_month, birth_year, gender, display_name
        FROM user_profiles
        WHERE user_id = ${member.user_id}
      `;

      if (existingProfile.length === 0) {
        // Create new user_profile with migrated data
        const birthMonth = member.date_of_birth
          ? new Date(member.date_of_birth).getMonth() + 1
          : null;
        const birthYear = member.date_of_birth
          ? new Date(member.date_of_birth).getFullYear()
          : null;

        await sql`
          INSERT INTO user_profiles (
            user_id,
            display_name,
            profile_picture,
            birth_month,
            birth_year,
            gender
          )
          VALUES (
            ${member.user_id},
            ${member.name},
            ${member.profile_picture},
            ${birthMonth},
            ${birthYear},
            ${member.gender}
          )
        `;
        created++;
        console.log(`  Created profile for user ${member.user_id}`);
      } else {
        // Update existing profile only where fields are null
        const profile = existingProfile[0];
        const updates: string[] = [];

        // Build dynamic update
        let needsUpdate = false;

        if (!profile.profile_picture && member.profile_picture) {
          needsUpdate = true;
          updates.push(`profile_picture: ${member.profile_picture}`);
        }

        if (!profile.birth_month && member.date_of_birth) {
          needsUpdate = true;
          const birthMonth = new Date(member.date_of_birth).getMonth() + 1;
          const birthYear = new Date(member.date_of_birth).getFullYear();
          updates.push(`birth: ${birthMonth}/${birthYear}`);
        }

        if (!profile.gender && member.gender) {
          needsUpdate = true;
          updates.push(`gender: ${member.gender}`);
        }

        if (!profile.display_name && member.name) {
          needsUpdate = true;
          updates.push(`display_name: ${member.name}`);
        }

        if (needsUpdate) {
          const birthMonth = member.date_of_birth
            ? new Date(member.date_of_birth).getMonth() + 1
            : null;
          const birthYear = member.date_of_birth
            ? new Date(member.date_of_birth).getFullYear()
            : null;

          await sql`
            UPDATE user_profiles
            SET
              profile_picture = COALESCE(profile_picture, ${member.profile_picture}),
              birth_month = COALESCE(birth_month, ${birthMonth}),
              birth_year = COALESCE(birth_year, ${birthYear}),
              gender = COALESCE(gender, ${member.gender}),
              display_name = COALESCE(display_name, ${member.name}),
              updated_at = NOW()
            WHERE user_id = ${member.user_id}
          `;
          migrated++;
          console.log(`  Updated profile for user ${member.user_id}: ${updates.join(", ")}`);
        } else {
          skipped++;
        }
      }
    }

    console.log("\n========================================");
    console.log("Migration complete!");
    console.log(`  Created: ${created} new profiles`);
    console.log(`  Updated: ${migrated} existing profiles`);
    console.log(`  Skipped: ${skipped} (already had data)`);
    console.log("========================================");

    // Step 4: Verify migration
    console.log("\nStep 4: Verifying migration...");
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM user_profiles WHERE profile_picture IS NOT NULL) as profiles_with_picture,
        (SELECT COUNT(*) FROM user_profiles WHERE birth_month IS NOT NULL) as profiles_with_birth,
        (SELECT COUNT(*) FROM user_profiles WHERE gender IS NOT NULL) as profiles_with_gender,
        (SELECT COUNT(*) FROM user_profiles) as total_profiles
    `;

    console.log("\nUser profiles stats:");
    console.log(`  Total profiles: ${stats[0].total_profiles}`);
    console.log(`  With profile picture: ${stats[0].profiles_with_picture}`);
    console.log(`  With birth info: ${stats[0].profiles_with_birth}`);
    console.log(`  With gender: ${stats[0].profiles_with_gender}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
