"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, X, Pencil, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhotoEditor } from "./photo-editor";
import { haptics } from "@/lib/haptics";

export interface UploadedMedia {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
}

interface MediaUploadWithEditorProps {
  onUpload?: (media: UploadedMedia[]) => void;
  onChange?: (media: UploadedMedia[]) => void;
  maxFiles?: number;
  allowedTypes?: string[];
  uploadEndpoint?: string;
  className?: string;
  disabled?: boolean;
  autoUpload?: boolean;
  showThumbnails?: boolean;
}

export function MediaUploadWithEditor({
  onUpload,
  onChange,
  maxFiles = 5,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  uploadEndpoint = "/api/user/upload-image",
  className,
  disabled = false,
  autoUpload = false,
  showThumbnails = true,
}: MediaUploadWithEditorProps) {
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`
        );
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File must be less than 10MB");
        return false;
      }

      return true;
    },
    [allowedTypes]
  );

  const uploadFile = useCallback(
    async (file: File, index: number): Promise<string | null> => {
      try {
        setUploadingIndexes((prev) => new Set(prev).add(index));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "workout");

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { url } = await response.json();
        return url;
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        return null;
      } finally {
        setUploadingIndexes((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [uploadEndpoint]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Check if adding these files would exceed the limit
      if (media.length + files.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Process first valid file
      const file = files[0];
      if (!validateFile(file)) return;

      // Trigger haptic on file selection
      haptics.light();

      // Open editor for the first file
      setPendingFile(file);
      setEditingIndex(null);
      setIsEditorOpen(true);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [media.length, maxFiles, validateFile]
  );

  const handleEditorSave = useCallback(
    async (editedFile: File, previewUrl: string) => {
      const newMedia: UploadedMedia = {
        file: editedFile,
        previewUrl,
      };

      if (editingIndex !== null) {
        // Replacing existing media
        setMedia((prev) => {
          const updated = [...prev];
          // Revoke old preview URL
          URL.revokeObjectURL(prev[editingIndex].previewUrl);
          updated[editingIndex] = newMedia;
          return updated;
        });

        if (autoUpload) {
          const uploadedUrl = await uploadFile(editedFile, editingIndex);
          if (uploadedUrl) {
            setMedia((prev) => {
              const updated = [...prev];
              updated[editingIndex] = { ...updated[editingIndex], uploadedUrl };
              return updated;
            });
          }
        }
      } else {
        // Adding new media
        const newIndex = media.length;
        setMedia((prev) => {
          const updated = [...prev, newMedia];
          onChange?.(updated);
          return updated;
        });

        if (autoUpload) {
          const uploadedUrl = await uploadFile(editedFile, newIndex);
          if (uploadedUrl) {
            setMedia((prev) => {
              const updated = [...prev];
              if (updated[newIndex]) {
                updated[newIndex] = { ...updated[newIndex], uploadedUrl };
              }
              onChange?.(updated);
              onUpload?.(updated);
              return updated;
            });
          }
        } else {
          onChange?.([...media, newMedia]);
        }
      }

      setPendingFile(null);
      setEditingIndex(null);
    },
    [editingIndex, media, autoUpload, uploadFile, onChange, onUpload]
  );

  const handleEditorSkip = useCallback(() => {
    if (pendingFile) {
      const previewUrl = URL.createObjectURL(pendingFile);
      const newMedia: UploadedMedia = {
        file: pendingFile,
        previewUrl,
      };

      setMedia((prev) => {
        const updated = [...prev, newMedia];
        onChange?.(updated);
        return updated;
      });
    }
    setPendingFile(null);
    setIsEditorOpen(false);
  }, [pendingFile, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      setMedia((prev) => {
        // Revoke the preview URL
        URL.revokeObjectURL(prev[index].previewUrl);
        const updated = prev.filter((_, i) => i !== index);
        onChange?.(updated);
        return updated;
      });
      haptics.light();
    },
    [onChange]
  );

  const handleEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setPendingFile(media[index].file);
      setIsEditorOpen(true);
      haptics.light();
    },
    [media]
  );

  const triggerFileSelect = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Manual upload function for parent components
  const uploadAllMedia = useCallback(async (): Promise<UploadedMedia[]> => {
    const results = await Promise.all(
      media.map(async (m, index) => {
        if (m.uploadedUrl) return m;
        const uploadedUrl = await uploadFile(m.file, index);
        return uploadedUrl ? { ...m, uploadedUrl } : m;
      })
    );
    setMedia(results);
    onUpload?.(results);
    return results;
  }, [media, uploadFile, onUpload]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        multiple={maxFiles > 1}
      />

      {/* Thumbnail grid */}
      {showThumbnails && media.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence mode="popLayout">
            {media.map((m, index) => (
              <motion.div
                key={m.previewUrl}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={m.previewUrl}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Upload indicator */}
                {uploadingIndexes.has(index) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}

                {/* Hover overlay */}
                {!uploadingIndexes.has(index) && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(index)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(index)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-red-500/50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Uploaded check */}
                {m.uploadedUrl && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add more button */}
          {media.length < maxFiles && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={triggerFileSelect}
              disabled={disabled}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed",
                "flex flex-col items-center justify-center gap-1",
                "text-muted-foreground transition-colors",
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-brand/50 hover:text-brand"
              )}
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Add</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Empty state / Add button */}
      {media.length === 0 && (
        <button
          onClick={triggerFileSelect}
          disabled={disabled}
          className={cn(
            "w-full h-24 rounded-xl border-2 border-dashed",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground transition-colors",
            disabled
              ? "opacity-50 cursor-not-allowed border-border"
              : "border-border hover:border-brand/50 hover:text-brand"
          )}
        >
          <Camera className="h-6 w-6" />
          <span className="text-xs">Tap to add photo</span>
        </button>
      )}

      {/* Photo Editor */}
      {pendingFile && (
        <PhotoEditor
          imageFile={pendingFile}
          onOpenChange={setIsEditorOpen}
          onSaveLegacy={handleEditorSave}
          onSkip={handleEditorSkip}
          open={isEditorOpen}
        />
      )}
    </div>
  );
}

// Export helper for parent components to access upload function
export type MediaUploadWithEditorRef = {
  uploadAll: () => Promise<UploadedMedia[]>;
  getMedia: () => UploadedMedia[];
};
