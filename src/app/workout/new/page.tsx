"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Manual workout creation has been replaced by AI Coach.
// Redirect users to the Coach page for AI-generated workouts.
export default function NewWorkout() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/coach");
  }, [router]);

  return null;
}
