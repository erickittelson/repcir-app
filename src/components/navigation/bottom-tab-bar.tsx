"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  Plus,
  User,
  Sparkles,
  Dumbbell,
} from "lucide-react";

interface TabItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isAction?: boolean;
}

// Navigation: Home (Feed) | Discover | Log (FAB) | Workouts | You
// Workouts tab: create, publish, and manage workout plans
const tabs: TabItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Sparkles, label: "Discover" },
  { href: "#log", icon: Plus, label: "Log", isAction: true },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/you", icon: User, label: "You" },
];

interface BottomTabBarProps {
  onCreateClick?: () => void;
}

export function BottomTabBar({ onCreateClick }: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    // If already on the page, force a refresh to reset state
    if (isActive(href)) {
      e.preventDefault();
      router.refresh();
      // Also scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = !tab.isAction && isActive(tab.href);

          if (tab.isAction) {
            return (
              <button
                key={tab.href}
                onClick={onCreateClick}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient shadow-lg shadow-brand/30 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Log workout"
              >
                <Icon className="h-7 w-7 text-white" aria-hidden="true" />
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={(e) => handleNavClick(tab.href, e)}
              className={cn(
                // 44x44 minimum touch target per WCAG 2.1
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background",
                active
                  ? "text-brand"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
              aria-label={`${tab.label}${active ? " (current page)" : ""}`}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all",
                  active && "scale-110"
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
