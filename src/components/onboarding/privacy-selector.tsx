"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe, Lock, Check, Users, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrivacySelectorProps {
  currentVisibility?: "public" | "private";
  onSubmit: (visibility: "public" | "private") => void;
  className?: string;
}

export function PrivacySelector({
  currentVisibility,
  onSubmit,
  className,
}: PrivacySelectorProps) {
  const [selected, setSelected] = useState<"public" | "private" | null>(
    currentVisibility ?? null
  );

  const handleSubmit = useCallback(() => {
    if (selected) {
      onSubmit(selected);
    }
  }, [selected, onSubmit]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span className="text-sm">Profile visibility</span>
      </div>

      {/* Options */}
      <div className="grid gap-3">
        {/* Public option */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelected("public")}
          className={cn(
            "relative p-4 rounded-xl border-2 text-left transition-all",
            selected === "public"
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/50"
          )}
        >
          {/* Selected indicator */}
          {selected === "public" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}

          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              selected === "public" ? "bg-brand/10" : "bg-muted"
            )}>
              <Globe className={cn(
                "w-5 h-5",
                selected === "public" ? "text-brand" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">Public</h3>
              <p className="text-sm text-muted-foreground">
                Others can find you when looking for workout partners
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>Circle requests require your approval</span>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Private option */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelected("private")}
          className={cn(
            "relative p-4 rounded-xl border-2 text-left transition-all",
            selected === "private"
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/50"
          )}
        >
          {/* Selected indicator */}
          {selected === "private" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}

          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              selected === "private" ? "bg-brand/10" : "bg-muted"
            )}>
              <Lock className={cn(
                "w-5 h-5",
                selected === "private" ? "text-brand" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">Private</h3>
              <p className="text-sm text-muted-foreground">
                Only join circles through direct invitations
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <EyeOff className="w-3 h-3" />
                <span>You won't appear in search results</span>
              </div>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-muted-foreground text-center">
        You can change this anytime in your profile settings
      </p>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={!selected}
        className={cn(
          "w-full gap-2",
          selected && "bg-brand hover:bg-brand/90"
        )}
      >
        <Check className="w-4 h-4" />
        Continue
      </Button>
    </motion.div>
  );
}
