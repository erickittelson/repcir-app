/**
 * Workout streak calculation utility.
 *
 * A streak counts consecutive workout days, allowing a 1 rest-day gap.
 * For example: Mon, Tue, Thu (skip Wed) = 3-day streak.
 * But Mon, Thu (2-day gap) = streak resets.
 */

export function calculateStreak(
  workoutDates: Date[]
): { current: number; longest: number } {
  if (workoutDates.length === 0) return { current: 0, longest: 0 };

  // Deduplicate by calendar date and sort descending (most recent first)
  const uniqueDateStrings = [
    ...new Set(workoutDates.map((d) => new Date(d).toDateString())),
  ];
  uniqueDateStrings.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (uniqueDateStrings.length === 0) return { current: 0, longest: 0 };

  // Calculate current streak (from most recent date going backward)
  let currentStreak = 1;
  for (let i = 1; i < uniqueDateStrings.length; i++) {
    const newer = new Date(uniqueDateStrings[i - 1]);
    const older = new Date(uniqueDateStrings[i]);
    const diffDays = Math.floor(
      (newer.getTime() - older.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Allow 1 rest day gap (diff of 2 calendar days)
    if (diffDays <= 2) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak across entire history
  let longestStreak = 1;
  let runStreak = 1;
  for (let i = 1; i < uniqueDateStrings.length; i++) {
    const newer = new Date(uniqueDateStrings[i - 1]);
    const older = new Date(uniqueDateStrings[i]);
    const diffDays = Math.floor(
      (newer.getTime() - older.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 2) {
      runStreak++;
    } else {
      runStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runStreak);
  }

  return { current: currentStreak, longest: longestStreak };
}

/** Milestones that trigger streak notifications */
export const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30, 50, 100, 365];
