"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Undo2,
  Redo2,
  RotateCcw,
  Crop,
  RotateCw,
  SunMedium,
  Contrast,
  Droplets,
  Sparkles,
  Type,
  Sticker,
  Pencil,
  Sliders,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

// New unified props interface - supports both new and legacy APIs
interface PhotoEditorProps {
  // New API: accepts imageUrl (string URL or File)
  imageUrl?: string | File;
  onSave?: (editedImageBlob: Blob) => void;
  onCancel?: () => void;
  aspectRatio?: number;
  open?: boolean;

  // Legacy API: for backwards compatibility with MediaUploadWithEditor
  imageFile?: File | null;
  onOpenChange?: (open: boolean) => void;
  onSkip?: () => void;
  /** @deprecated Use onSave instead - legacy callback that returns File and preview URL */
  onSaveLegacy?: (editedFile: File, previewUrl: string) => void;
}

type EditorTool =
  | "crop"
  | "rotate"
  | "filter"
  | "adjust"
  | "text"
  | "sticker"
  | "draw"
  | null;

type CropAspectRatio = "original" | "square" | "4:5" | "16:9";

interface FilterPreset {
  id: string;
  name: string;
  css: string;
  adjustments: ImageAdjustments;
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
}

interface StickerOverlay {
  id: string;
  type: string;
  emoji?: string;
  label?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  brushSize: number;
}

interface EditorState {
  rotation: number;
  filter: string;
  adjustments: ImageAdjustments;
  cropPixels: Area | null;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  drawPaths: DrawPath[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "original",
    name: "Original",
    css: "none",
    adjustments: { brightness: 0, contrast: 0, saturation: 0, exposure: 0 },
  },
  {
    id: "bright",
    name: "Bright",
    css: "brightness(1.15) contrast(1.05)",
    adjustments: { brightness: 15, contrast: 5, saturation: 0, exposure: 10 },
  },
  {
    id: "contrast",
    name: "Contrast",
    css: "contrast(1.25) saturate(1.1)",
    adjustments: { brightness: 0, contrast: 25, saturation: 10, exposure: 0 },
  },
  {
    id: "warm",
    name: "Warm",
    css: "sepia(0.15) saturate(1.2) brightness(1.05)",
    adjustments: { brightness: 5, contrast: 0, saturation: 20, exposure: 5 },
  },
  {
    id: "cool",
    name: "Cool",
    css: "saturate(0.9) hue-rotate(10deg) brightness(1.05)",
    adjustments: { brightness: 5, contrast: 5, saturation: -10, exposure: 0 },
  },
  {
    id: "bw",
    name: "B&W",
    css: "grayscale(1) contrast(1.1)",
    adjustments: { brightness: 0, contrast: 10, saturation: -100, exposure: 0 },
  },
  {
    id: "vintage",
    name: "Vintage",
    css: "sepia(0.35) contrast(0.9) brightness(1.1)",
    adjustments: { brightness: 10, contrast: -10, saturation: -20, exposure: 5 },
  },
  {
    id: "dramatic",
    name: "Dramatic",
    css: "contrast(1.4) saturate(1.3) brightness(0.95)",
    adjustments: { brightness: -5, contrast: 40, saturation: 30, exposure: 0 },
  },
  {
    id: "fade",
    name: "Fade",
    css: "contrast(0.85) brightness(1.1) saturate(0.85)",
    adjustments: { brightness: 10, contrast: -15, saturation: -15, exposure: 5 },
  },
];

const FONT_FAMILIES = [
  { id: "inter", name: "Sans", value: "Inter, system-ui, sans-serif" },
  { id: "bebas", name: "Display", value: "Bebas Neue, Impact, sans-serif" },
  { id: "mono", name: "Mono", value: "ui-monospace, monospace" },
  { id: "serif", name: "Serif", value: "Georgia, serif" },
];

const STICKER_PRESETS = [
  { id: "pr", type: "badge", label: "PR!", emoji: null },
  { id: "beast", type: "badge", label: "BEAST MODE", emoji: null },
  { id: "fire", type: "emoji", label: null, emoji: "\uD83D\uDD25" },
  { id: "flex", type: "emoji", label: null, emoji: "\uD83D\uDCAA" },
  { id: "trophy", type: "emoji", label: null, emoji: "\uD83C\uDFC6" },
  { id: "star", type: "emoji", label: null, emoji: "\u2B50" },
  { id: "lightning", type: "emoji", label: null, emoji: "\u26A1" },
  { id: "heart", type: "emoji", label: null, emoji: "\u2764\uFE0F" },
];

const COLOR_PALETTE = [
  "#FFFFFF",
  "#000000",
  "#C9A227",
  "#D4AF37",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#FF8C42",
  "#6B0F1A",
];

const CROP_ASPECT_RATIOS: { id: CropAspectRatio; label: string; ratio: number }[] = [
  { id: "original", label: "Original", ratio: 0 },
  { id: "square", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

const DEFAULT_STATE: EditorState = {
  rotation: 0,
  filter: "original",
  adjustments: { brightness: 0, contrast: 0, saturation: 0, exposure: 0 },
  cropPixels: null,
  textOverlays: [],
  stickerOverlays: [],
  drawPaths: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getAdjustmentCSS(adjustments: ImageAdjustments): string {
  const { brightness, contrast, saturation, exposure } = adjustments;
  const b = 1 + brightness / 100;
  const c = 1 + contrast / 100;
  const s = 1 + saturation / 100;
  const e = 1 + exposure / 100;
  return `brightness(${b * e}) contrast(${c}) saturate(${s})`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface EditorToolbarProps {
  activeTool: EditorTool;
  onToolSelect: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

function EditorToolbar({
  activeTool,
  onToolSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
}: EditorToolbarProps) {
  const tools = [
    { id: "crop" as const, icon: Crop, label: "Crop" },
    { id: "rotate" as const, icon: RotateCw, label: "Rotate" },
    { id: "filter" as const, icon: Sparkles, label: "Filters" },
    { id: "adjust" as const, icon: Sliders, label: "Adjust" },
    { id: "text" as const, icon: Type, label: "Text" },
    { id: "sticker" as const, icon: Sticker, label: "Stickers" },
    { id: "draw" as const, icon: Pencil, label: "Draw" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Undo/Redo/Reset - compact row */}
      <div className="flex items-center justify-center gap-1 pb-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8 p-0"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8 p-0"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 w-8 p-0 text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tool Icons - scrollable on small screens */}
      <div className="flex items-center justify-center gap-0.5 overflow-x-auto pb-safe-area scrollbar-hide px-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(isActive ? null : tool.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg transition-all flex-shrink-0",
                "min-w-[44px] min-h-[44px] p-1.5",
                isActive
                  ? "bg-brand/20 text-brand"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-tight">{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FilterStripProps {
  filters: FilterPreset[];
  activeFilter: string;
  onFilterSelect: (filterId: string) => void;
  imageUrl: string;
}

function FilterStrip({ filters, activeFilter, onFilterSelect, imageUrl }: FilterStripProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1 -mx-1">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterSelect(filter.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 flex-shrink-0 transition-all",
            activeFilter === filter.id && "scale-105"
          )}
        >
          <div
            className={cn(
              "w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
              activeFilter === filter.id ? "border-brand" : "border-transparent"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={filter.name}
              className="w-full h-full object-cover"
              style={{ filter: filter.css }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              activeFilter === filter.id ? "text-brand" : "text-muted-foreground"
            )}
          >
            {filter.name}
          </span>
        </button>
      ))}
    </div>
  );
}

interface AdjustmentSliderProps {
  label: string;
  icon: React.ElementType;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

function AdjustmentSlider({
  label,
  icon: Icon,
  value,
  min = -100,
  max = 100,
  onChange,
  onReset,
}: AdjustmentSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-10 text-right">
            {value > 0 ? `+${value}` : value}
          </span>
          {value !== 0 && (
            <button
              onClick={onReset}
              className="text-xs text-brand hover:text-brand/80 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        className="touch-none"
      />
    </div>
  );
}

interface TextEditorPanelProps {
  textOverlays: TextOverlay[];
  selectedTextId: string | null;
  onAddText: () => void;
  onUpdateText: (id: string, updates: Partial<TextOverlay>) => void;
  onDeleteText: (id: string) => void;
  onSelectText: (id: string | null) => void;
}

function TextEditorPanel({
  textOverlays,
  selectedTextId,
  onAddText,
  onUpdateText,
  onDeleteText,
  onSelectText,
}: TextEditorPanelProps) {
  const selectedText = textOverlays.find((t) => t.id === selectedTextId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Text Overlays</span>
        <Button size="sm" variant="outline" onClick={onAddText}>
          <Plus className="h-4 w-4 mr-1" />
          Add Text
        </Button>
      </div>

      {textOverlays.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Tap "Add Text" to add text overlay
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {textOverlays.map((text) => (
            <div
              key={text.id}
              onClick={() => onSelectText(text.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer",
                selectedTextId === text.id
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50"
              )}
            >
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{text.text || "Empty text"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteText(text.id);
                }}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedText && (
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div>
            <label className="text-sm font-medium mb-2 block">Text</label>
            <input
              type="text"
              value={selectedText.text}
              onChange={(e) => onUpdateText(selectedText.id, { text: e.target.value })}
              placeholder="Enter text..."
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Font</label>
            <div className="flex flex-wrap gap-2">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onUpdateText(selectedText.id, { fontFamily: font.value })}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors",
                    selectedText.fontFamily === font.value
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Size: {selectedText.fontSize}px
            </label>
            <Slider
              value={[selectedText.fontSize]}
              min={12}
              max={72}
              step={1}
              onValueChange={([v]) => onUpdateText(selectedText.id, { fontSize: v })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdateText(selectedText.id, { color })}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    selectedText.color === color
                      ? "border-brand scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StickerPanelProps {
  stickerOverlays: StickerOverlay[];
  selectedStickerId: string | null;
  onAddSticker: (preset: (typeof STICKER_PRESETS)[0]) => void;
  onUpdateSticker: (id: string, updates: Partial<StickerOverlay>) => void;
  onDeleteSticker: (id: string) => void;
  onSelectSticker: (id: string | null) => void;
}

function StickerPanel({
  stickerOverlays,
  selectedStickerId,
  onAddSticker,
  onUpdateSticker,
  onDeleteSticker,
  onSelectSticker,
}: StickerPanelProps) {
  const selectedSticker = stickerOverlays.find((s) => s.id === selectedStickerId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium mb-2 block">Add Sticker</span>
        <div className="flex flex-wrap gap-2">
          {STICKER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onAddSticker(preset)}
              className="flex items-center justify-center w-14 h-14 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              {preset.type === "badge" ? (
                <span className="text-xs font-bold text-brand">{preset.label}</span>
              ) : (
                <span className="text-2xl">{preset.emoji}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {stickerOverlays.length > 0 && (
        <div>
          <span className="text-sm font-medium mb-2 block">Active Stickers</span>
          <div className="flex flex-wrap gap-2">
            {stickerOverlays.map((sticker) => (
              <div
                key={sticker.id}
                onClick={() => onSelectSticker(sticker.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                  selectedStickerId === sticker.id
                    ? "border-brand bg-brand/10"
                    : "border-border hover:border-brand/50"
                )}
              >
                {sticker.type === "badge" ? (
                  <span className="text-xs font-bold text-brand">{sticker.label}</span>
                ) : (
                  <span className="text-lg">{sticker.emoji}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSticker(sticker.id);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSticker && (
        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Scale: {Math.round(selectedSticker.scale * 100)}%
            </label>
            <Slider
              value={[selectedSticker.scale * 100]}
              min={50}
              max={200}
              step={5}
              onValueChange={([v]) => onUpdateSticker(selectedSticker.id, { scale: v / 100 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface DrawPanelProps {
  brushSize: number;
  brushColor: string;
  onBrushSizeChange: (size: number) => void;
  onBrushColorChange: (color: string) => void;
  onClearDrawing: () => void;
  hasDrawing: boolean;
}

function DrawPanel({
  brushSize,
  brushColor,
  onBrushSizeChange,
  onBrushColorChange,
  onClearDrawing,
  hasDrawing,
}: DrawPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Brush Size: {brushSize}px</label>
        <Slider
          value={[brushSize]}
          min={2}
          max={20}
          step={1}
          onValueChange={([v]) => onBrushSizeChange(v)}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Brush Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => onBrushColorChange(color)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-transform",
                brushColor === color
                  ? "border-brand scale-110"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {hasDrawing && (
        <Button variant="outline" onClick={onClearDrawing} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Drawing
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Draw directly on the image with your finger or mouse
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PhotoEditor({
  // New API props
  imageUrl,
  onSave,
  onCancel,
  aspectRatio,
  open: openProp,
  // Legacy API props
  imageFile,
  onOpenChange,
  onSkip,
  onSaveLegacy,
}: PhotoEditorProps) {
  // Normalize props for backwards compatibility
  const effectiveImageSource = imageUrl ?? imageFile;
  const isLegacyMode = imageFile !== undefined || onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = openProp ?? internalOpen;

  // Handle close/cancel
  const handleClose = useCallback(() => {
    if (isLegacyMode && onOpenChange) {
      onOpenChange(false);
    } else if (onCancel) {
      onCancel();
    }
    setInternalOpen(false);
  }, [isLegacyMode, onOpenChange, onCancel]);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalFileRef = useRef<File | null>(null);

  // Image source URL
  const [imageSrc, setImageSrc] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Editor state
  const [activeTool, setActiveTool] = useState<EditorTool>(null);
  const [state, setState] = useState<EditorState>(DEFAULT_STATE);
  const [history, setHistory] = useState<EditorState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Crop state (for react-easy-crop)
  const [cropPosition, setCropPosition] = useState<Point>({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Tool-specific state
  const [cropAspectRatio, setCropAspectRatio] = useState<CropAspectRatio>(
    aspectRatio ? "square" : "original"
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState("#FFFFFF");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawPath, setCurrentDrawPath] = useState<{ x: number; y: number }[]>([]);

  // Dragging state for overlays
  const [draggingOverlay, setDraggingOverlay] = useState<{
    type: "text" | "sticker";
    id: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  // Load image from URL or File
  useEffect(() => {
    if (!effectiveImageSource) return;

    if (typeof effectiveImageSource === "string") {
      setImageSrc(effectiveImageSource);
    } else {
      // It's a File
      originalFileRef.current = effectiveImageSource;
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(effectiveImageSource);
    }
  }, [effectiveImageSource]);

  // Load image element
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Get current crop aspect ratio for react-easy-crop (always a number)
  const cropAspect = useMemo(() => {
    if (aspectRatio) return aspectRatio;
    const found = CROP_ASPECT_RATIOS.find((r) => r.id === cropAspectRatio);
    if (!found || found.ratio === 0) {
      // "Original" — use image's natural aspect ratio
      return imageDimensions.width && imageDimensions.height
        ? imageDimensions.width / imageDimensions.height
        : 4 / 3;
    }
    return found.ratio;
  }, [aspectRatio, cropAspectRatio, imageDimensions]);

  // Generate cropped preview when exiting crop mode (syncs with undo/redo too)
  useEffect(() => {
    if (activeTool === "crop") return; // Cropper handles its own preview

    if (!state.cropPixels || !imageRef.current) {
      setCroppedPreviewUrl(null);
      return;
    }

    const img = imageRef.current;
    const { x, y, width, height } = state.cropPixels;
    const maxPreview = 800;
    let pw = width,
      ph = height;
    if (pw > maxPreview || ph > maxPreview) {
      const s = maxPreview / Math.max(pw, ph);
      pw = Math.round(pw * s);
      ph = Math.round(ph * s);
    }

    const canvas = document.createElement("canvas");
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCroppedPreviewUrl(null);
      return;
    }

    ctx.drawImage(img, x, y, width, height, 0, 0, pw, ph);
    setCroppedPreviewUrl(canvas.toDataURL("image/jpeg", 0.85));
  }, [state.cropPixels, activeTool]);

  // Update history
  const pushHistory = useCallback((newState: EditorState) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newState];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const updateState = useCallback(
    (updates: Partial<EditorState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        pushHistory(newState);
        return newState;
      });
    },
    [pushHistory]
  );

  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex((prev) => prev - 1);
      setState(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex((prev) => prev + 1);
      setState(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);

  const handleReset = useCallback(() => {
    setState(DEFAULT_STATE);
    setHistory([DEFAULT_STATE]);
    setHistoryIndex(0);
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedPreviewUrl(null);
  }, []);

  // Tool handlers
  const handleRotate = useCallback(
    (degrees: number) => {
      updateState({ rotation: (state.rotation + degrees + 360) % 360 });
    },
    [state.rotation, updateState]
  );

  const handleFilterSelect = useCallback(
    (filterId: string) => {
      const filter = FILTER_PRESETS.find((f) => f.id === filterId);
      if (filter) {
        updateState({
          filter: filterId,
          adjustments: { ...filter.adjustments },
        });
      }
    },
    [updateState]
  );

  const handleAdjustmentChange = useCallback(
    (key: keyof ImageAdjustments, value: number) => {
      updateState({
        adjustments: { ...state.adjustments, [key]: value },
        filter: "original",
      });
    },
    [state.adjustments, updateState]
  );

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setState((prev) => ({ ...prev, cropPixels: croppedAreaPixels }));
  }, []);

  // Text overlay handlers
  const handleAddText = useCallback(() => {
    const newText: TextOverlay = {
      id: generateId(),
      text: "New Text",
      x: 50,
      y: 50,
      fontSize: 24,
      fontFamily: FONT_FAMILIES[0].value,
      color: "#FFFFFF",
      rotation: 0,
    };
    updateState({ textOverlays: [...state.textOverlays, newText] });
    setSelectedTextId(newText.id);
  }, [state.textOverlays, updateState]);

  const handleUpdateText = useCallback(
    (id: string, updates: Partial<TextOverlay>) => {
      const newOverlays = state.textOverlays.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      updateState({ textOverlays: newOverlays });
    },
    [state.textOverlays, updateState]
  );

  const handleDeleteText = useCallback(
    (id: string) => {
      updateState({ textOverlays: state.textOverlays.filter((t) => t.id !== id) });
      if (selectedTextId === id) setSelectedTextId(null);
    },
    [state.textOverlays, selectedTextId, updateState]
  );

  // Sticker overlay handlers
  const handleAddSticker = useCallback(
    (preset: (typeof STICKER_PRESETS)[0]) => {
      const newSticker: StickerOverlay = {
        id: generateId(),
        type: preset.type,
        emoji: preset.emoji ?? undefined,
        label: preset.label ?? undefined,
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
      };
      updateState({ stickerOverlays: [...state.stickerOverlays, newSticker] });
      setSelectedStickerId(newSticker.id);
    },
    [state.stickerOverlays, updateState]
  );

  const handleUpdateSticker = useCallback(
    (id: string, updates: Partial<StickerOverlay>) => {
      const newOverlays = state.stickerOverlays.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      updateState({ stickerOverlays: newOverlays });
    },
    [state.stickerOverlays, updateState]
  );

  const handleDeleteSticker = useCallback(
    (id: string) => {
      updateState({ stickerOverlays: state.stickerOverlays.filter((s) => s.id !== id) });
      if (selectedStickerId === id) setSelectedStickerId(null);
    },
    [state.stickerOverlays, selectedStickerId, updateState]
  );

  // Drawing handlers
  const handleDrawStart = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool !== "draw" || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setIsDrawing(true);
      setCurrentDrawPath([{ x, y }]);
    },
    [activeTool]
  );

  const handleDrawMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setCurrentDrawPath((prev) => [...prev, { x, y }]);
    },
    [isDrawing]
  );

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing || currentDrawPath.length < 2) {
      setIsDrawing(false);
      setCurrentDrawPath([]);
      return;
    }

    const newPath: DrawPath = {
      id: generateId(),
      points: currentDrawPath,
      color: brushColor,
      brushSize,
    };

    updateState({ drawPaths: [...state.drawPaths, newPath] });
    setIsDrawing(false);
    setCurrentDrawPath([]);
  }, [isDrawing, currentDrawPath, brushColor, brushSize, state.drawPaths, updateState]);

  const handleClearDrawing = useCallback(() => {
    updateState({ drawPaths: [] });
  }, [updateState]);

  // Overlay dragging
  const handleOverlayPointerDown = useCallback(
    (
      e: React.PointerEvent,
      type: "text" | "sticker",
      id: string,
      currentX: number,
      currentY: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingOverlay({
        type,
        id,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: currentX,
        startPosY: currentY,
      });
      if (type === "text") setSelectedTextId(id);
      if (type === "sticker") setSelectedStickerId(id);
    },
    []
  );

  const handleOverlayPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingOverlay || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - draggingOverlay.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - draggingOverlay.startY) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, draggingOverlay.startPosX + deltaX));
      const newY = Math.max(0, Math.min(100, draggingOverlay.startPosY + deltaY));

      if (draggingOverlay.type === "text") {
        const newOverlays = state.textOverlays.map((t) =>
          t.id === draggingOverlay.id ? { ...t, x: newX, y: newY } : t
        );
        setState((prev) => ({ ...prev, textOverlays: newOverlays }));
      } else {
        const newOverlays = state.stickerOverlays.map((s) =>
          s.id === draggingOverlay.id ? { ...s, x: newX, y: newY } : s
        );
        setState((prev) => ({ ...prev, stickerOverlays: newOverlays }));
      }
    },
    [draggingOverlay, state.textOverlays, state.stickerOverlays]
  );

  const handleOverlayPointerUp = useCallback(() => {
    if (draggingOverlay) {
      pushHistory(state);
    }
    setDraggingOverlay(null);
  }, [draggingOverlay, pushHistory, state]);

  // Generate final image
  const handleSave = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsSaving(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsSaving(false);
        return;
      }

      const img = imageRef.current;
      const { width, height } = imageDimensions;

      // Source crop rectangle (in natural image pixels from react-easy-crop)
      let srcX = 0,
        srcY = 0,
        srcW = width,
        srcH = height;
      if (state.cropPixels) {
        srcX = state.cropPixels.x;
        srcY = state.cropPixels.y;
        srcW = state.cropPixels.width;
        srcH = state.cropPixels.height;
      }

      // Scale down to max output size (1200px longest edge)
      const MAX_OUTPUT = 1200;
      let outW = srcW;
      let outH = srcH;
      if (outW > MAX_OUTPUT || outH > MAX_OUTPUT) {
        const scale = MAX_OUTPUT / Math.max(outW, outH);
        outW = Math.round(outW * scale);
        outH = Math.round(outH * scale);
      }

      // Handle rotation
      const isRotated90or270 = state.rotation === 90 || state.rotation === 270;
      canvas.width = isRotated90or270 ? outH : outW;
      canvas.height = isRotated90or270 ? outW : outH;

      ctx.save();

      // Translate to center for rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.translate(-outW / 2, -outH / 2);

      // Apply adjustments filter
      ctx.filter = getAdjustmentCSS(state.adjustments);

      // Draw cropped image scaled to output size
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      ctx.restore();
      ctx.filter = "none";

      // Draw paths
      for (const path of state.drawPaths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.brushSize * (canvas.width / 100);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const firstPoint = path.points[0];
        ctx.moveTo(
          (firstPoint.x / 100) * canvas.width,
          (firstPoint.y / 100) * canvas.height
        );

        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(
            (path.points[i].x / 100) * canvas.width,
            (path.points[i].y / 100) * canvas.height
          );
        }
        ctx.stroke();
      }

      // Draw text overlays
      for (const text of state.textOverlays) {
        ctx.save();
        const x = (text.x / 100) * canvas.width;
        const y = (text.y / 100) * canvas.height;
        const fontSize = text.fontSize * (canvas.width / 400);

        ctx.translate(x, y);
        ctx.rotate((text.rotation * Math.PI) / 180);
        ctx.font = `bold ${fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Text shadow for visibility
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = fontSize * 0.1;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(text.text, 0, 0);
        ctx.restore();
      }

      // Draw sticker overlays
      for (const sticker of state.stickerOverlays) {
        ctx.save();
        const x = (sticker.x / 100) * canvas.width;
        const y = (sticker.y / 100) * canvas.height;
        const size = 40 * sticker.scale * (canvas.width / 400);

        ctx.translate(x, y);
        ctx.rotate((sticker.rotation * Math.PI) / 180);

        if (sticker.type === "badge" && sticker.label) {
          // Draw badge background
          ctx.fillStyle = "#C9A227";
          ctx.font = `bold ${size * 0.4}px Inter, system-ui, sans-serif`;
          const metrics = ctx.measureText(sticker.label);
          const padding = size * 0.2;
          const bgWidth = metrics.width + padding * 2;
          const bgHeight = size * 0.6;

          ctx.beginPath();
          ctx.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 4);
          ctx.fill();

          ctx.fillStyle = "#1A1A2E";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.label, 0, 0);
        } else if (sticker.emoji) {
          ctx.font = `${size}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.emoji, 0, 0);
        }

        ctx.restore();
      }

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Support both new and legacy APIs
            if (isLegacyMode && onSaveLegacy) {
              // Legacy mode: create File and preview URL
              const originalName = originalFileRef.current?.name || "edited_image.jpg";
              const editedFile = new File(
                [blob],
                originalName.replace(/\.[^.]+$/, "_edited.jpg"),
                { type: "image/jpeg" }
              );
              const previewUrl = URL.createObjectURL(blob);
              onSaveLegacy(editedFile, previewUrl);
              if (onOpenChange) onOpenChange(false);
            } else if (onSave) {
              // New API: just return the blob
              onSave(blob);
            }
          }
          setIsSaving(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (error) {
      console.error("Error saving image:", error);
      setIsSaving(false);
    }
  }, [imageDimensions, state, onSave, isLegacyMode, onSaveLegacy, onOpenChange]);

  // Get CSS filter for preview
  const previewFilter = useMemo(() => {
    const filter = FILTER_PRESETS.find((f) => f.id === state.filter);
    if (filter && state.filter !== "original") {
      return filter.css;
    }
    return getAdjustmentCSS(state.adjustments);
  }, [state.filter, state.adjustments]);

  // Shared tool panel header with Done button on every panel
  const toolPanelHeader = (title: string, onDone?: () => void) => (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveTool(null)}
        className="h-9 min-w-[60px]"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      <span className="font-medium">{title}</span>
      <Button
        size="sm"
        onClick={() => {
          onDone?.();
          setActiveTool(null);
        }}
        className="h-9 min-w-[60px] bg-brand text-brand-foreground"
      >
        <Check className="h-4 w-4 mr-1" />
        Done
      </Button>
    </div>
  );

  // Render tool panel
  const renderToolPanel = () => {
    switch (activeTool) {
      case "crop":
        return (
          <div className="flex flex-col gap-3 p-4">
            {toolPanelHeader("Crop", () => pushHistory(state))}
            {!aspectRatio && (
              <div className="flex justify-center gap-2">
                {CROP_ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => {
                      setCropAspectRatio(ratio.id);
                      // Reset position when changing aspect ratio
                      setCropPosition({ x: 0, y: 0 });
                      setCropZoom(1);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]",
                      cropAspectRatio === ratio.id
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            )}
            {aspectRatio && (
              <p className="text-sm text-muted-foreground text-center">
                Fixed {aspectRatio === 1 ? "square" : `${aspectRatio}:1`} crop
              </p>
            )}
            <div className="flex items-center gap-3 px-2">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <Slider
                value={[cropZoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={([v]) => setCropZoom(v)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {cropZoom.toFixed(1)}x
              </span>
            </div>
          </div>
        );

      case "rotate":
        return (
          <div className="flex flex-col gap-4 p-4">
            {toolPanelHeader("Rotate")}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleRotate(-90)}
                className="flex-1 max-w-[120px] h-12"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                -90
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleRotate(90)}
                className="flex-1 max-w-[120px] h-12"
              >
                <RotateCw className="h-5 w-5 mr-2" />
                +90
              </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Current: {state.rotation} degrees
            </div>
          </div>
        );

      case "filter":
        return (
          <div className="flex flex-col gap-4 p-4">
            {toolPanelHeader("Filters")}
            <FilterStrip
              filters={FILTER_PRESETS}
              activeFilter={state.filter}
              onFilterSelect={handleFilterSelect}
              imageUrl={imageSrc}
            />
          </div>
        );

      case "adjust":
        return (
          <div className="flex flex-col gap-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="sticky top-0 bg-background pb-2 z-10">
              {toolPanelHeader("Adjustments")}
            </div>
            <AdjustmentSlider
              label="Brightness"
              icon={SunMedium}
              value={state.adjustments.brightness}
              onChange={(v) => handleAdjustmentChange("brightness", v)}
              onReset={() => handleAdjustmentChange("brightness", 0)}
            />
            <AdjustmentSlider
              label="Contrast"
              icon={Contrast}
              value={state.adjustments.contrast}
              onChange={(v) => handleAdjustmentChange("contrast", v)}
              onReset={() => handleAdjustmentChange("contrast", 0)}
            />
            <AdjustmentSlider
              label="Saturation"
              icon={Droplets}
              value={state.adjustments.saturation}
              onChange={(v) => handleAdjustmentChange("saturation", v)}
              onReset={() => handleAdjustmentChange("saturation", 0)}
            />
            <AdjustmentSlider
              label="Exposure"
              icon={SunMedium}
              value={state.adjustments.exposure}
              onChange={(v) => handleAdjustmentChange("exposure", v)}
              onReset={() => handleAdjustmentChange("exposure", 0)}
            />
          </div>
        );

      case "text":
        return (
          <div className="flex flex-col gap-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="sticky top-0 bg-background pb-2 z-10">
              {toolPanelHeader("Text")}
            </div>
            <TextEditorPanel
              textOverlays={state.textOverlays}
              selectedTextId={selectedTextId}
              onAddText={handleAddText}
              onUpdateText={handleUpdateText}
              onDeleteText={handleDeleteText}
              onSelectText={setSelectedTextId}
            />
          </div>
        );

      case "sticker":
        return (
          <div className="flex flex-col gap-4 p-4 max-h-[300px] overflow-y-auto">
            <div className="sticky top-0 bg-background pb-2 z-10">
              {toolPanelHeader("Stickers")}
            </div>
            <StickerPanel
              stickerOverlays={state.stickerOverlays}
              selectedStickerId={selectedStickerId}
              onAddSticker={handleAddSticker}
              onUpdateSticker={handleUpdateSticker}
              onDeleteSticker={handleDeleteSticker}
              onSelectSticker={setSelectedStickerId}
            />
          </div>
        );

      case "draw":
        return (
          <div className="flex flex-col gap-4 p-4">
            {toolPanelHeader("Draw")}
            <DrawPanel
              brushSize={brushSize}
              brushColor={brushColor}
              onBrushSizeChange={setBrushSize}
              onBrushColorChange={setBrushColor}
              onClearDrawing={handleClearDrawing}
              hasDrawing={state.drawPaths.length > 0}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render if no image source
  if (!effectiveImageSource) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] sm:h-[85dvh] rounded-t-2xl p-0 flex flex-col"
        hideClose
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-3 py-2.5 border-b border-border min-h-[48px] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-9 min-w-[72px] text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            {isLegacyMode ? "Skip" : "Cancel"}
          </Button>
          <SheetTitle className="text-base font-semibold absolute left-1/2 -translate-x-1/2">
            Edit Photo
          </SheetTitle>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 min-w-[72px] bg-energy-gradient text-white font-semibold text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>

        {/* Canvas hidden for final render */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Image Preview */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 relative bg-black overflow-hidden"
          onPointerDown={handleDrawStart}
          onPointerMove={(e) => {
            handleDrawMove(e);
            handleOverlayPointerMove(e);
          }}
          onPointerUp={() => {
            handleDrawEnd();
            handleOverlayPointerUp();
          }}
          onPointerLeave={() => {
            handleDrawEnd();
            handleOverlayPointerUp();
          }}
        >
          {/* Crop mode: show react-easy-crop */}
          {imageLoaded && activeTool === "crop" && imageSrc && (
            <Cropper
              image={imageSrc}
              crop={cropPosition}
              zoom={cropZoom}
              aspect={cropAspect}
              rotation={state.rotation}
              onCropChange={setCropPosition}
              onZoomChange={setCropZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { position: "absolute", inset: 0 },
              }}
            />
          )}

          {/* Normal mode: show image preview */}
          {imageLoaded && activeTool !== "crop" && (
            <div className="absolute inset-0 p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={croppedPreviewUrl || imageSrc}
                alt="Editor preview"
                className="w-full h-full object-contain"
                style={{
                  filter: previewFilter,
                  transform: `rotate(${state.rotation}deg)`,
                  transition: "transform 0.3s ease",
                }}
              />
            </div>
          )}

          {/* Text Overlays */}
          {state.textOverlays.map((text) => (
            <div
              key={text.id}
              className={cn(
                "absolute cursor-move select-none touch-none",
                selectedTextId === text.id && "ring-2 ring-brand ring-offset-2 ring-offset-black rounded px-1"
              )}
              style={{
                left: `${text.x}%`,
                top: `${text.y}%`,
                transform: `translate(-50%, -50%) rotate(${text.rotation}deg)`,
                fontSize: `${text.fontSize}px`,
                fontFamily: text.fontFamily,
                color: text.color,
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                fontWeight: "bold",
              }}
              onPointerDown={(e) => handleOverlayPointerDown(e, "text", text.id, text.x, text.y)}
            >
              {text.text}
            </div>
          ))}

          {/* Sticker Overlays */}
          {state.stickerOverlays.map((sticker) => (
            <div
              key={sticker.id}
              className={cn(
                "absolute cursor-move select-none touch-none",
                selectedStickerId === sticker.id && "ring-2 ring-brand ring-offset-2 ring-offset-black rounded"
              )}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
              }}
              onPointerDown={(e) =>
                handleOverlayPointerDown(e, "sticker", sticker.id, sticker.x, sticker.y)
              }
            >
              {sticker.type === "badge" ? (
                <div className="bg-brand text-brand-foreground px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-lg">
                  {sticker.label}
                </div>
              ) : (
                <span className="text-4xl drop-shadow-lg">{sticker.emoji}</span>
              )}
            </div>
          ))}

          {/* Draw Paths - SVG Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {state.drawPaths.map((path) => {
              if (path.points.length < 2) return null;
              const d = path.points
                .map((p, i) =>
                  i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
                )
                .join(" ");
              return (
                <path
                  key={path.id}
                  d={d}
                  fill="none"
                  stroke={path.color}
                  strokeWidth={path.brushSize * 0.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {isDrawing && currentDrawPath.length > 1 && (
              <path
                d={currentDrawPath
                  .map((p, i) =>
                    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
                  )
                  .join(" ")}
                fill="none"
                stroke={brushColor}
                strokeWidth={brushSize * 0.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        {/* Tool Panel or Toolbar */}
        <AnimatePresence mode="wait">
          {activeTool ? (
            <motion.div
              key="tool-panel"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="shrink-0 bg-background border-t border-border"
            >
              {renderToolPanel()}
            </motion.div>
          ) : (
            <motion.div
              key="toolbar"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="shrink-0 bg-background border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <EditorToolbar
                activeTool={activeTool}
                onToolSelect={setActiveTool}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

// Re-export types for consumers
export type {
  PhotoEditorProps,
  EditorState,
  TextOverlay,
  StickerOverlay,
  DrawPath,
  FilterPreset,
  ImageAdjustments,
};
