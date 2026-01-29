"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Loader2, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CircleOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  hasCircles: boolean;
}

export function CircleOnboardingModal({
  open,
  onOpenChange,
  userName = "there",
  hasCircles,
}: CircleOnboardingModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Create circle form
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");

  // Join circle form
  const [inviteCode, setInviteCode] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCircleName("");
      setCircleDescription("");
      setInviteCode("");
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleCreateCircle = async () => {
    if (!circleName.trim()) {
      setError("Please enter a circle name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: circleName.trim(),
          description: circleDescription.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create circle");
      }

      // Set the active circle cookie
      document.cookie = `active_circle=${data.id}; path=/; max-age=${60 * 60 * 24 * 365}`;

      setSuccess(true);

      // Refresh and close after a moment
      setTimeout(() => {
        router.refresh();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/circles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: inviteCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join circle");
      }

      // Set the active circle cookie
      document.cookie = `active_circle=${data.circleId}; path=/; max-age=${60 * 60 * 24 * 365}`;

      setSuccess(true);

      // Refresh and close after a moment
      setTimeout(() => {
        router.refresh();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid invite code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Mark that user has seen the modal
    localStorage.setItem("circle-onboarding-seen", "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 px-6 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {tab === "create" ? "Circle Created!" : "You're In!"}
              </h3>
              <p className="text-muted-foreground">
                {tab === "create"
                  ? "Your new workout circle is ready."
                  : "Welcome to the circle!"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="text-xl">
                  {hasCircles
                    ? "Add Another Circle"
                    : `Hey ${userName}, ready to team up?`}
                </DialogTitle>
                <DialogDescription className="pt-1">
                  {hasCircles
                    ? "Create a new circle or join an existing one."
                    : "Circles let you train with friends and family. Create your own or join someone else's!"}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 pb-6">
                <Tabs
                  value={tab}
                  onValueChange={(v) => setTab(v as "create" | "join")}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="create" className="gap-2">
                      <Users className="w-4 h-4" />
                      Create
                    </TabsTrigger>
                    <TabsTrigger value="join" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Join
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="circle-name">Circle Name</Label>
                      <Input
                        id="circle-name"
                        placeholder="e.g., The Smiths, Gym Buddies"
                        value={circleName}
                        onChange={(e) => setCircleName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="circle-description">
                        Description <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="circle-description"
                        placeholder="What's this circle about?"
                        value={circleDescription}
                        onChange={(e) => setCircleDescription(e.target.value)}
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      {!hasCircles && (
                        <Button
                          variant="ghost"
                          onClick={handleSkip}
                          disabled={isLoading}
                        >
                          Skip for now
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={handleCreateCircle}
                        disabled={isLoading || !circleName.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Create Circle
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Invite Code</Label>
                      <Input
                        id="invite-code"
                        placeholder="Enter 6-character code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        disabled={isLoading}
                        maxLength={8}
                        className="uppercase tracking-widest text-center font-mono text-lg h-12"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Ask a circle member for their invite code
                      </p>
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      {!hasCircles && (
                        <Button
                          variant="ghost"
                          onClick={handleSkip}
                          disabled={isLoading}
                        >
                          Skip for now
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={handleJoinCircle}
                        disabled={isLoading || !inviteCode.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            Join Circle
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
