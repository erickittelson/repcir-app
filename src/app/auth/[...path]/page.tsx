/**
 * Neon Auth - Authentication Pages
 *
 * Handles OAuth callbacks, forgot-password, and reset-password views.
 * Sign-in and sign-up redirect to dedicated /login and /signup pages.
 */

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthView } from "@neondatabase/auth/react/ui";
import { RepcirLogo } from "@/components/ui/repcir-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect sign-in and sign-up to dedicated pages
    if (pathname === "/auth/sign-in") {
      router.replace("/login");
      return;
    }
    if (pathname === "/auth/sign-up") {
      router.replace("/signup");
      return;
    }
  }, [pathname, router]);

  // Extract the last path segment for AuthView (e.g. "forgot-password" from "/auth/forgot-password")
  const pathSegment = pathname?.split("/").pop();

  // Forgot password flow
  if (pathname?.includes("/forgot-password")) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <RepcirLogo variant="icon" size="lg" />
            </div>
            <CardTitle className="text-2xl font-display tracking-wider">RESET PASSWORD</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full [&>*]:w-full">
              <AuthView path={pathSegment} />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-brand hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password flow (user clicked link from email)
  if (pathname?.includes("/reset-password")) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <RepcirLogo variant="icon" size="lg" />
            </div>
            <CardTitle className="text-2xl font-display tracking-wider">NEW PASSWORD</CardTitle>
            <CardDescription>
              Choose a strong password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full [&>*]:w-full">
              <AuthView path={pathSegment} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Callback and verify routes (OAuth callbacks, email verification links)
  if (pathname?.includes("/callback") || pathname?.includes("/verify")) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RepcirLogo variant="icon" size="lg" />
            <Loader2 className="h-6 w-6 animate-spin text-brand mt-6" />
            <p className="text-sm text-muted-foreground mt-4">Completing authentication...</p>
            <AuthView path={pathSegment} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while redirecting to /login or /signup
  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
}
