/**
 * Seed Discover Data
 * 
 * Creates test data for the discover page including:
 * - 30 diverse user profiles
 * - Challenges
 * - Shared workouts
 * - User badges
 * 
 * Run with: npx tsx scripts/seed-discover-data.ts
 */

// We'll run this via direct SQL through the API since env vars may not be available
const DEMO_USERS = [
  { name: "Sarah Johnson", city: "Austin, TX", age: 28, gender: "female", goals: ["weight loss", "marathon"], fitness: "intermediate" },
  { name: "Mike Chen", city: "San Francisco, CA", age: 32, gender: "male", goals: ["muscle gain", "strength"], fitness: "advanced" },
  { name: "Emma Williams", city: "New York, NY", age: 24, gender: "female", goals: ["flexibility", "yoga"], fitness: "beginner" },
  { name: "James Rodriguez", city: "Miami, FL", age: 45, gender: "male", goals: ["health", "cardio"], fitness: "intermediate" },
  { name: "Ashley Davis", city: "Denver, CO", age: 31, gender: "female", goals: ["crossfit", "strength"], fitness: "advanced" },
  { name: "David Kim", city: "Seattle, WA", age: 27, gender: "male", goals: ["bodybuilding", "aesthetics"], fitness: "advanced" },
  { name: "Jessica Martinez", city: "Los Angeles, CA", age: 29, gender: "female", goals: ["toning", "pilates"], fitness: "intermediate" },
  { name: "Chris Thompson", city: "Chicago, IL", age: 38, gender: "male", goals: ["powerlifting", "strength"], fitness: "advanced" },
  { name: "Amanda Brown", city: "Phoenix, AZ", age: 22, gender: "female", goals: ["dance fitness", "cardio"], fitness: "beginner" },
  { name: "Ryan Wilson", city: "Portland, OR", age: 35, gender: "male", goals: ["triathlon", "endurance"], fitness: "advanced" },
  { name: "Nicole Taylor", city: "Nashville, TN", age: 26, gender: "female", goals: ["barre", "toning"], fitness: "intermediate" },
  { name: "Brandon Lee", city: "Houston, TX", age: 41, gender: "male", goals: ["weight loss", "health"], fitness: "beginner" },
  { name: "Stephanie Garcia", city: "San Diego, CA", age: 33, gender: "female", goals: ["running", "5k"], fitness: "intermediate" },
  { name: "Tyler Anderson", city: "Boston, MA", age: 29, gender: "male", goals: ["calisthenics", "skills"], fitness: "intermediate" },
  { name: "Megan White", city: "Atlanta, GA", age: 25, gender: "female", goals: ["hiit", "fat loss"], fitness: "intermediate" },
  { name: "Josh Harris", city: "Dallas, TX", age: 36, gender: "male", goals: ["golf fitness", "flexibility"], fitness: "beginner" },
  { name: "Lauren Clark", city: "Minneapolis, MN", age: 30, gender: "female", goals: ["climbing", "strength"], fitness: "advanced" },
  { name: "Andrew Scott", city: "Philadelphia, PA", age: 42, gender: "male", goals: ["functional fitness", "mobility"], fitness: "intermediate" },
  { name: "Rachel Adams", city: "Charlotte, NC", age: 23, gender: "female", goals: ["gymnastics", "skills"], fitness: "advanced" },
  { name: "Kevin Wright", city: "Detroit, MI", age: 34, gender: "male", goals: ["boxing", "conditioning"], fitness: "intermediate" },
  { name: "Samantha Hill", city: "Salt Lake City, UT", age: 28, gender: "female", goals: ["skiing fitness", "legs"], fitness: "intermediate" },
  { name: "Marcus Green", city: "Baltimore, MD", age: 47, gender: "male", goals: ["heart health", "walking"], fitness: "beginner" },
  { name: "Olivia King", city: "Las Vegas, NV", age: 21, gender: "female", goals: ["bikini comp", "aesthetics"], fitness: "advanced" },
  { name: "Daniel Baker", city: "Kansas City, MO", age: 39, gender: "male", goals: ["dad bod fix", "overall"], fitness: "beginner" },
  { name: "Christina Young", city: "Orlando, FL", age: 27, gender: "female", goals: ["postpartum", "core"], fitness: "beginner" },
  { name: "Matthew Turner", city: "San Antonio, TX", age: 31, gender: "male", goals: ["mma", "conditioning"], fitness: "advanced" },
  { name: "Brittany Moore", city: "Columbus, OH", age: 26, gender: "female", goals: ["spinning", "cardio"], fitness: "intermediate" },
  { name: "Justin Campbell", city: "Indianapolis, IN", age: 44, gender: "male", goals: ["back pain", "mobility"], fitness: "beginner" },
  { name: "Kayla Mitchell", city: "San Jose, CA", age: 24, gender: "female", goals: ["pole fitness", "strength"], fitness: "intermediate" },
  { name: "Alex Rivera", city: "Tampa, FL", age: 30, gender: "non-binary", goals: ["overall fitness", "mental health"], fitness: "intermediate" },
];

const CHALLENGES = [
  { name: "30-Day Push-Up Challenge", desc: "Build upper body strength with progressive push-ups", category: "strength", days: 30, difficulty: "beginner" },
  { name: "Couch to 5K", desc: "Go from zero to running 5K in 8 weeks", category: "cardio", days: 56, difficulty: "beginner" },
  { name: "100 Burpees a Day", desc: "Ultimate fat burning challenge", category: "hiit", days: 30, difficulty: "advanced" },
  { name: "Flexibility Flow", desc: "Improve your flexibility with daily stretching", category: "flexibility", days: 21, difficulty: "beginner" },
  { name: "Squat Challenge", desc: "Build strong legs with progressive squats", category: "strength", days: 30, difficulty: "intermediate" },
  { name: "Plank Challenge", desc: "Core strength builder - hold longer each day", category: "strength", days: 30, difficulty: "beginner" },
  { name: "HIIT Warrior", desc: "High intensity interval training every day", category: "hiit", days: 14, difficulty: "advanced" },
  { name: "Morning Yoga", desc: "Start each day with energizing yoga", category: "flexibility", days: 30, difficulty: "beginner" },
  { name: "Pull-Up Progress", desc: "From 0 to 10 pull-ups", category: "strength", days: 60, difficulty: "intermediate" },
  { name: "10K Steps Daily", desc: "Walk your way to better health", category: "cardio", days: 30, difficulty: "beginner" },
  { name: "Muscle Up Mission", desc: "Master the muscle up", category: "skill", days: 90, difficulty: "advanced" },
  { name: "Summer Shred", desc: "Get beach ready with this fat loss program", category: "hiit", days: 45, difficulty: "intermediate" },
];

const WORKOUTS = [
  { title: "Full Body Blast", desc: "Complete full body workout for all levels", category: "strength", difficulty: "intermediate", duration: 45 },
  { title: "Quick HIIT Burner", desc: "20-minute high intensity session", category: "hiit", difficulty: "intermediate", duration: 20 },
  { title: "Leg Day Destroyer", desc: "Intense lower body workout", category: "strength", difficulty: "advanced", duration: 60 },
  { title: "Upper Body Pump", desc: "Chest, back, shoulders, and arms", category: "strength", difficulty: "intermediate", duration: 50 },
  { title: "Core Crusher", desc: "15-minute ab workout", category: "strength", difficulty: "beginner", duration: 15 },
  { title: "Morning Stretch Routine", desc: "Wake up your body gently", category: "flexibility", difficulty: "beginner", duration: 10 },
  { title: "Cardio Dance Party", desc: "Fun dance workout to get your heart pumping", category: "cardio", difficulty: "beginner", duration: 30 },
  { title: "Strength & Conditioning", desc: "Build strength and endurance", category: "strength", difficulty: "advanced", duration: 55 },
  { title: "Yoga for Athletes", desc: "Recovery and flexibility for active people", category: "flexibility", difficulty: "intermediate", duration: 45 },
  { title: "Tabata Terror", desc: "4-minute Tabata intervals", category: "hiit", difficulty: "advanced", duration: 25 },
  { title: "Beginner Strength", desc: "Introduction to weight training", category: "strength", difficulty: "beginner", duration: 40 },
  { title: "Boxing Basics", desc: "Learn boxing fundamentals", category: "cardio", difficulty: "intermediate", duration: 35 },
  { title: "Powerlifting Prep", desc: "Squat, bench, deadlift focus", category: "strength", difficulty: "advanced", duration: 75 },
  { title: "5-Minute Mobility", desc: "Quick mobility routine", category: "flexibility", difficulty: "beginner", duration: 5 },
  { title: "Metabolic Madness", desc: "Metabolism boosting circuit", category: "hiit", difficulty: "intermediate", duration: 30 },
];

// Generate SQL statements
function generateUserProfileSQL(user: typeof DEMO_USERS[0], index: number): string {
  const id = `demo-user-${String(index + 1).padStart(3, '0')}`;
  const birthYear = 2026 - user.age;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  
  return `INSERT INTO user_profiles (user_id, display_name, city, birth_year, birth_month, visibility, fitness_level, created_at, updated_at)
VALUES ('${id}', '${user.name.replace(/'/g, "''")}', '${user.city.replace(/'/g, "''")}', ${birthYear}, ${birthMonth}, 'public', '${user.fitness}', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, city = EXCLUDED.city;`;
}

function generateChallengeSQL(challenge: typeof CHALLENGES[0], index: number): string {
  const id = crypto.randomUUID();
  const participants = Math.floor(Math.random() * 5000) + 100;
  const completions = Math.floor(participants * (Math.random() * 0.4 + 0.1));
  const rating = (Math.random() * 1.5 + 3.5).toFixed(1);
  
  return `INSERT INTO challenges (id, name, short_description, category, difficulty, duration_days, participant_count, completion_count, avg_rating, visibility, is_featured, is_official, created_at)
VALUES ('${id}', '${challenge.name.replace(/'/g, "''")}', '${challenge.desc.replace(/'/g, "''")}', '${challenge.category}', '${challenge.difficulty}', ${challenge.days}, ${participants}, ${completions}, ${rating}, 'public', true, true, NOW())
ON CONFLICT DO NOTHING;`;
}

function generateWorkoutSQL(workout: typeof WORKOUTS[0], index: number): string {
  const id = crypto.randomUUID();
  const saves = Math.floor(Math.random() * 2000) + 50;
  const rating = (Math.random() * 1.5 + 3.5).toFixed(1);
  
  return `INSERT INTO shared_workouts (id, title, description, category, difficulty, estimated_duration, save_count, avg_rating, visibility, created_at)
VALUES ('${id}', '${workout.title.replace(/'/g, "''")}', '${workout.desc.replace(/'/g, "''")}', '${workout.category}', '${workout.difficulty}', ${workout.duration}, ${saves}, ${rating}, 'public', NOW())
ON CONFLICT DO NOTHING;`;
}

// Print all SQL statements
console.log("-- Seed Discover Data");
console.log("-- Run these statements in your database\n");

console.log("-- =====================");
console.log("-- USER PROFILES (30)");
console.log("-- =====================\n");

DEMO_USERS.forEach((user, i) => {
  console.log(generateUserProfileSQL(user, i));
  console.log();
});

console.log("\n-- =====================");
console.log("-- CHALLENGES");
console.log("-- =====================\n");

CHALLENGES.forEach((challenge, i) => {
  console.log(generateChallengeSQL(challenge, i));
  console.log();
});

console.log("\n-- =====================");
console.log("-- SHARED WORKOUTS");
console.log("-- =====================\n");

WORKOUTS.forEach((workout, i) => {
  console.log(generateWorkoutSQL(workout, i));
  console.log();
});

console.log("\n-- Done! Copy and run these SQL statements in your database.");
