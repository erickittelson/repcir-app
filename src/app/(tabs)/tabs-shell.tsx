"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BottomTabBar,
  WorkoutMiniPlayer,
  QuickLogSheet,
  CircleSwitcher,
  CreateActionSheet,
} from "@/components/navigation";
import { PostLoginExperience } from "@/components/onboarding/post-login-experience";
import { RepcirLogo } from "@/components/ui/repcir-logo";
import { NotificationsBell } from "@/components/notifications-bell";
import type { CircleMember } from "@/components/social/circle-member-selector";

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
      isSystemCircle: boolean;
    };
    circles: Array<{
      id: string;
      name: string;
      role: string;
      memberId: string;
      isSystemCircle: boolean;
    }>;
  };
  children: React.ReactNode;
}

export function TabsShell({ session, children }: TabsShellProps) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [preSelectedMembers, setPreSelectedMembers] = useState<CircleMember[]>([]);
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
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        {/* Left: Logo + App Name (links to home) */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <RepcirLogo variant="icon" size="sm" />
          <span className="font-display text-lg tracking-wider text-brand">
            REPCIR
          </span>
        </Link>

        {/* Right: Notifications + Circle Switcher */}
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <CircleSwitcher
            activeCircle={session.activeCircle}
            circles={session.circles}
          />
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-32">
        {children}
      </main>

      {/* Workout mini player (above tab bar when active) */}
      <WorkoutMiniPlayer />

      {/* Bottom tab bar */}
      <BottomTabBar onCreateClick={() => setActionSheetOpen(true)} />

      {/* Create action sheet (first step) */}
      <CreateActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        onLogWorkout={(members) => {
          setPreSelectedMembers(members || []);
          setQuickLogOpen(true);
        }}
      />

      {/* Quick log workout sheet (when "Log" is selected) */}
      <QuickLogSheet
        open={quickLogOpen}
        onOpenChange={(open) => {
          setQuickLogOpen(open);
          if (!open) setPreSelectedMembers([]);
        }}
        preSelectedMembers={preSelectedMembers}
      />

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
