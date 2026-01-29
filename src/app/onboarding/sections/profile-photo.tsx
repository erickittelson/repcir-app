"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionProps } from "./types";

export function ProfilePhotoSection({ data, onUpdate, onNext }: SectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(data.profilePicture || "");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/onboarding/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        onUpdate({ profilePicture: url });
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleSkip = () => {
    onUpdate({ profilePhotoAcknowledged: true });
    onNext();
  };

  const handleContinue = () => {
    onUpdate({ profilePhotoAcknowledged: true });
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        {/* Personalized greeting */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-brand font-medium mb-2"
        >
          Nice to meet you, {data.name}! 👋
        </motion.p>

        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Add a profile photo
        </h2>
        <p className="text-muted-foreground mb-8">
          This is optional, but it helps personalize your experience
        </p>

        {/* Photo upload area */}
        <div className="mb-8">
          <label className="cursor-pointer block">
            <div className="relative w-32 h-32 mx-auto">
              {previewUrl ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-full h-full rounded-full overflow-hidden ring-4 ring-brand/20"
                >
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full rounded-full bg-card border-2 border-dashed border-border flex items-center justify-center">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
              )}

              {/* Camera overlay */}
              {!isUploading && (
                <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          <p className="text-xs text-muted-foreground mt-3">
            Tap to upload • PNG or JPG • Max 5MB
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {previewUrl ? (
            <Button
              onClick={handleContinue}
              className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full h-14 text-lg rounded-xl"
              >
                Skip for now
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
