"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { RallyproofLogo } from "@/components/ui/rallyproof-logo";
import { authClient } from "@/lib/neon-auth/client";

interface InvitationDetails {
  code: string;
  circleName: string;
  circleDescription?: string;
  role: string;
  memberCount: number;
  isEmailRestricted: boolean;
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get params
  useEffect(() => {
    params.then((p) => setCode(p.code));
  }, [params]);

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      const { data } = await authClient.getSession();
      setIsAuthenticated(!!data?.session);
      if (data?.user?.name) {
        setMemberName(data.user.name);
      }
    }
    checkAuth();
  }, []);

  // Fetch invitation details
  useEffect(() => {
    if (!code) return;

    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/circles/invite/${code}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invalid invitation");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [code]);

  const handleAccept = async () => {
    if (!memberName.trim()) {
      setError("Please enter your name");
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/circles/invite/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName: memberName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to join rally");
        return;
      }

      setSuccess(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch {
      setError("Failed to join rally");
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store the invite code to return after login
    sessionStorage.setItem("pendingInvite", code);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to {invitation?.circleName}!</CardTitle>
            <CardDescription>
              You have successfully joined the circle. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
            <RallyproofLogo variant="icon" size="lg" />
          </div>
          <CardTitle className="font-display tracking-wider">YOU&apos;RE INVITED</CardTitle>
          <CardDescription>
            Join <span className="font-semibold text-brand">{invitation?.circleName}</span> on Rallyproof
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Circle Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{invitation?.memberCount} member(s)</span>
            </div>
            {invitation?.circleDescription && (
              <p className="text-sm text-muted-foreground">
                {invitation.circleDescription}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              You&apos;ll join as: <span className="capitalize font-medium">{invitation?.role}</span>
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Enter your name"
                />
                <p className="text-xs text-muted-foreground">
                  This is how other members will see you
                </p>
              </div>

              <Button
                onClick={handleAccept}
                disabled={accepting || !memberName.trim()}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Rally"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Sign in or create an account to join this rally
              </p>
              <Button onClick={handleSignIn} className="w-full">
                Sign In to Join
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
