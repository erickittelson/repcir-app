"use client";

import { useEffect } from "react";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { authClient } from "@/lib/neon-auth/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerServiceWorker } from "@/lib/pwa";
import { PostHogProvider, trackPageView } from "@/lib/posthog/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Register service worker for PWA support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return (
    <PostHogProvider>
      <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <NeonAuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => router.refresh()}
        redirectTo="/"
        Link={Link}
        social={{ providers: ["google"] }}
        localization={{
          SIGN_IN: "Sign In",
          SIGN_UP: "Create Account",
          SIGN_IN_DESCRIPTION: "Enter your email and password to sign in",
          SIGN_UP_DESCRIPTION: "Create your account to get started",
          EMAIL_PLACEHOLDER: "you@example.com",
          PASSWORD_PLACEHOLDER: "Enter your password",
          NAME_PLACEHOLDER: "Your name",
          FORGOT_PASSWORD: "Forgot password?",
          INVALID_EMAIL: "Please enter a valid email address",
          PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
          PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
        }}
      >
        {children}
        <CookieBanner />
        <Toaster />
      </NeonAuthUIProvider>
    </ThemeProvider>
    </PostHogProvider>
  );
}
