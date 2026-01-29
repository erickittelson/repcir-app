"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BottomTabBar,
  WorkoutMiniPlayer,
  CreateSheet,
  CircleSwitcher,
} from "@/components/navigation";
import { AICoachSheet } from "@/components/sheets";
import { PostLoginExperience } from "@/components/onboarding/post-login-experience";
import { Sparkles } from "lucide-react";

interface UserData {
  name: string;
  goals?: string[];
  primaryGoal?: string;
  personalRecords?: Array<{
    exerciseName: string;
    value: number;
    unit: string;
  }>;
  skills?: Array<{
    name: string;
    status: string;
  }>;
  earnedBadges?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
  }>;
}

interface TabsShellProps {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    activeCircle?: {
      id: string;
      name: string;
      role: string;
      memberId: string;
    };
    circles: Array<{
      id: string;
      name: string;
      role: string;
      memberId: string;
    }>;
  };
  children: React.ReactNode;
}

export function TabsShell({ session, children }: TabsShellProps) {
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [aiCoachOpen, setAiCoachOpen] = useState(false);
  const [showPostLogin, setShowPostLogin] = useState(false);
  const [postLoginData, setPostLoginData] = useState<UserData | null>(null);

  // Check if we should show the post-login experience
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const response = await fetch("/api/user/first-login");
        if (response.ok) {
          const data = await response.json();
          if (data.showPostLogin && data.userData) {
            setPostLoginData(data.userData);
            setShowPostLogin(true);
          }
        }
      } catch (error) {
        // Silent fail - don't block the app
        console.error("First login check error:", error);
      }
    };

    checkFirstLogin();
  }, []);

  // Handle post-login experience completion
  const handlePostLoginComplete = async () => {
    setShowPostLogin(false);
    try {
      await fetch("/api/user/first-login", { method: "POST" });
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with circle switcher */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        <CircleSwitcher
          activeCircle={session.activeCircle}
          circles={session.circles}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAiCoachOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="hidden sm:inline">AI Coach</span>
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-32">
        {children}
      </main>

      {/* Workout mini player (above tab bar when active) */}
      <WorkoutMiniPlayer />

      {/* Bottom tab bar */}
      <BottomTabBar onCreateClick={() => setCreateSheetOpen(true)} />

      {/* Create action sheet */}
      <CreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />

      {/* AI Coach slide-over panel */}
      <AICoachSheet open={aiCoachOpen} onOpenChange={setAiCoachOpen} />

      {/* Post-login onboarding experience */}
      {showPostLogin && postLoginData && (
        <PostLoginExperience
          userData={postLoginData}
          onComplete={handlePostLoginComplete}
        />
      )}
    </div>
  );
}
