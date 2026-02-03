"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CircleImageUploadProps {
  /** Current image URL (or undefined if none) */
  currentImage?: string;
  /** Circle ID - required for updating existing circles */
  circleId?: string;
  /** Callback when image is successfully uploaded */
  onImageChange: (url: string) => void;
  /** Optional className for the container */
  className?: string;
  /** Size of the upload area (default: "md") */
  size?: "sm" | "md" | "lg";
  /** Whether to show as disabled */
  disabled?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

const ICON_SIZES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

export function CircleImageUpload({
  currentImage,
  circleId,
  onImageChange,
  className,
  size = "md",
  disabled = false,
}: CircleImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // If we have a circleId, upload to the server
      if (circleId) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("circleId", circleId);

          const response = await fetch("/api/circles/upload-image", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
          }

          const { url } = await response.json();
          setPreview(url);
          onImageChange(url);
          toast.success("Rally image updated");
        } catch (error) {
          console.error("Upload error:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to upload image"
          );
          setPreview(currentImage || null);
        } finally {
          setIsUploading(false);
        }
      } else {
        // No circleId - just use the data URL for preview and emit
        // This is for the create flow where the circle doesn't exist yet
        // The parent component will handle the actual upload after circle creation
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (e) => resolve(e.target?.result as string);
          r.readAsDataURL(file);
        });
        onImageChange(dataUrl);
      }
    },
    [circleId, currentImage, onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(null);
      onImageChange("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onImageChange]
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          SIZE_CLASSES[size],
          "relative rounded-xl overflow-hidden cursor-pointer",
          "border-2 border-dashed transition-all duration-200",
          "flex items-center justify-center",
          disabled
            ? "opacity-50 cursor-not-allowed border-border"
            : isDragging
              ? "border-brand bg-brand/10 scale-105"
              : preview
                ? "border-transparent hover:border-brand/50"
                : "border-border hover:border-brand/50 hover:bg-muted/50"
        )}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Rally image"
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-black/50 flex items-center justify-center",
                "opacity-0 hover:opacity-100 transition-opacity",
                isUploading && "opacity-100"
              )}
            >
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {isUploading ? (
              <Loader2 className={cn(ICON_SIZES[size], "animate-spin")} />
            ) : (
              <>
                <Users className={cn(ICON_SIZES[size], "mb-1")} />
                <span className="text-xs">Add Image</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      {preview && !isUploading && !disabled && (
        <button
          onClick={handleRemove}
          className={cn(
            "absolute -top-2 -right-2 w-6 h-6 rounded-full",
            "bg-destructive text-white flex items-center justify-center",
            "hover:bg-destructive/90 transition-colors shadow-md"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
