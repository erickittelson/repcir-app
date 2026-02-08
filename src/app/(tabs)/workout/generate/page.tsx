"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Force dynamic to prevent static generation issues
export const dynamic = "force-dynamic";

// Workout generation has moved to the Coach page.
// Redirect users to the new AI Coach experience.
export default function GenerateWorkout() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/coach");
  }, [router]);

  return null;
}
