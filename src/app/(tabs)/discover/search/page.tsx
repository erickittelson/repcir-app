"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Content search has been deprecated in favor of AI-generated workouts.
// Redirect users to the Coach page.
export default function DiscoverSearch() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/coach");
  }, [router]);

  return null;
}
