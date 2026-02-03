"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Workout generation has moved to the Coach page.
// Redirect users to the new AI Coach experience.
export default function GenerateWorkout() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/coach");
  }, [router]);

  return null;
}
