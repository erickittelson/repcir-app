"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Check, Loader2, ImageIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface ProfilePictureUploadProps {
  currentPicture?: string;
  onUpload: (url: string) => void;
  onSkip: () => void;
  className?: string;
}

// Helper to create centered circular crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

// Convert crop to canvas and return blob
async function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
  scale: number = 1,
  rotation: number = 0
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate crop dimensions in natural pixels
  const cropX = (crop.x / 100) * image.naturalWidth;
  const cropY = (crop.y / 100) * image.naturalHeight;
  const cropWidth = (crop.width / 100) * image.naturalWidth;
  const cropHeight = (crop.height / 100) * image.naturalHeight;

  // Output size (circular profile pic, 400x400 is good quality)
  const outputSize = 400;
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Fill with transparent background
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, outputSize, outputSize);

  // Calculate draw parameters accounting for scale
  const scaledCropWidth = cropWidth / scale;
  const scaledCropHeight = cropHeight / scale;
  const offsetX = (cropWidth - scaledCropWidth) / 2;
  const offsetY = (cropHeight - scaledCropHeight) / 2;

  // Save context for rotation
  ctx.save();
  ctx.translate(outputSize / 2, outputSize / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-outputSize / 2, -outputSize / 2);

  // Draw the cropped and scaled image
  ctx.drawImage(
    image,
    cropX + offsetX,
    cropY + offsetY,
    scaledCropWidth,
    scaledCropHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.95
    );
  });
}

export function ProfilePictureUpload({
  currentPicture,
  onUpload,
  onSkip,
  className,
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPicture || null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalImage(imageUrl);
      setIsCropping(true);
      setScale(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // 1:1 aspect ratio for circular
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!imgRef.current || !crop) return;

    setIsUploading(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, crop, scale, rotation);
      if (!croppedBlob) {
        throw new Error("Failed to crop image");
      }

      // Create preview from cropped blob
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setPreview(croppedUrl);
      setIsCropping(false);

      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");

      const response = await fetch("/api/onboarding/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await response.json();
      setPreview(url);
      onUpload(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
      setIsCropping(false);
    } finally {
      setIsUploading(false);
    }
  }, [crop, scale, rotation, onUpload]);

  const handleCancelCrop = useCallback(() => {
    setIsCropping(false);
    setOriginalImage(null);
    setCrop(undefined);
    setScale(1);
    setRotation(0);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleBrowse = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  }, []);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setOriginalImage(null);
    setError(null);
    setIsCropping(false);
    setCrop(undefined);
    setScale(1);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleResetCrop = useCallback(() => {
    setScale(1);
    setRotation(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, 1));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("mx-auto w-full", isCropping ? "max-w-md" : "max-w-sm", className)}
    >
      <div
        className="bg-card rounded-2xl border border-border/50 shadow-lg"
        style={{ padding: "1.25rem" }}
      >
        {/* Header */}
        <div
          className="flex items-center"
          style={{ gap: "0.75rem", marginBottom: "1rem" }}
        >
          <div
            className="rounded-xl bg-brand/10 flex items-center justify-center"
            style={{ width: "2.5rem", height: "2.5rem" }}
          >
            <Camera style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isCropping ? "Adjust Your Photo" : "Profile Picture"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isCropping ? "Drag to reposition, zoom to adjust" : "Add a photo (optional)"}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Crop Editor */}
        {isCropping && originalImage && (
          <div style={{ marginBottom: "1rem" }}>
            {/* Crop area */}
            <div
              className="relative rounded-xl overflow-hidden bg-black/90 flex items-center justify-center"
              style={{ marginBottom: "1rem" }}
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={1}
                circularCrop
                className="max-h-64"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={originalImage}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    maxHeight: "16rem",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </ReactCrop>
            </div>

            {/* Zoom control */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="flex items-center" style={{ gap: "0.75rem" }}>
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[scale]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={([value]) => setScale(value)}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground text-center" style={{ marginTop: "0.25rem" }}>
                Zoom: {Math.round(scale * 100)}%
              </p>
            </div>

            {/* Reset button */}
            <div className="flex justify-center" style={{ marginBottom: "0.5rem" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCrop}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="w-3 h-3" style={{ marginRight: "0.25rem" }} />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Preview or Upload Zone (when not cropping) */}
        {!isCropping && (
          <div className="flex justify-center" style={{ marginBottom: "1rem" }}>
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative"
                >
                  <div
                    className="rounded-full overflow-hidden shadow-lg shadow-brand/20"
                    style={{ width: "7rem", height: "7rem" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 style={{ width: "1.5rem", height: "1.5rem" }} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {!isUploading && (
                    <button
                      onClick={handleRemove}
                      className="absolute rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md"
                      style={{ top: "-0.25rem", right: "-0.25rem", width: "1.75rem", height: "1.75rem" }}
                    >
                      <X style={{ width: "1rem", height: "1rem" }} />
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleBrowse}
                  className={cn(
                    "rounded-full border-2 border-dashed cursor-pointer",
                    "flex flex-col items-center justify-center",
                    "transition-all duration-200",
                    isDragging
                      ? "border-brand bg-brand/10 scale-105"
                      : "border-border hover:border-brand/50 hover:bg-muted/50"
                  )}
                  style={{ width: "7rem", height: "7rem" }}
                >
                  <ImageIcon
                    style={{ width: "1.75rem", height: "1.75rem", marginBottom: "0.25rem" }}
                    className={cn(
                      "transition-colors",
                      isDragging ? "text-brand" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isDragging ? "Drop" : "Upload"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive text-center"
            style={{ marginBottom: "0.75rem" }}
          >
            {error}
          </motion.p>
        )}

        {/* Action buttons */}
        <div className="flex" style={{ gap: "0.75rem" }}>
          {isCropping ? (
            <>
              <Button
                variant="ghost"
                onClick={handleCancelCrop}
                disabled={isUploading}
                className="flex-1 rounded-xl"
                style={{ height: "2.75rem" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCrop}
                disabled={isUploading}
                className="flex-1 bg-energy-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-md"
                style={{ height: "2.75rem" }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: "0.5rem" }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                    Apply & Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onSkip}
                disabled={isUploading}
                className="flex-1 rounded-xl"
                style={{ height: "2.75rem" }}
              >
                {currentPicture ? "Cancel" : "Skip"}
              </Button>
              {preview && !isUploading ? (
                <Button
                  onClick={handleBrowse}
                  variant="outline"
                  className="flex-1 rounded-xl"
                  style={{ height: "2.75rem" }}
                >
                  Change Photo
                </Button>
              ) : !preview && (
                <Button
                  onClick={handleBrowse}
                  className="flex-1 bg-energy-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-md"
                  style={{ height: "2.75rem" }}
                >
                  <Upload style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                  Choose Photo
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
