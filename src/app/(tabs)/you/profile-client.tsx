"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Heart,
  Trophy,
  MapPin,
  Users,
  Dumbbell,
  Settings,
  ChevronRight,
  Edit,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Shield,
  LogOut,
  Plus,
  Target,
  Activity,
  Trash2,
  Pencil,
  Copy,
  Link as LinkIcon,
  Share2,
  AtSign,
  ExternalLink,
  Mail,
  Key,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/neon-auth/client";
import { CompletenessCard } from "@/components/profile/completeness-card";
import { generateRecommendations } from "@/components/profile/recommended-actions";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { AchievementModal } from "@/components/badges/achievement-modal";
import { toast } from "sonner";

// Badge type for achievement modal
interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockMessage?: string;
  category?: string;
}

// ==================== TYPES ====================
interface BadgeData {
  id: string;
  badgeId: string;
  earnedAt: string;
  isFeatured: boolean;
  badge: {
    name: string;
    description?: string;
    icon?: string;
    imageUrl?: string;
    category: string;
    tier: string;
    criteriaDescription?: string;
  };
}

interface SportData {
  id: string;
  sport: string;
  level?: string;
  yearsPlaying?: number;
  position?: string;
  currentlyActive: boolean;
}

interface SkillData {
  id: string;
  name: string;
  category: string;
  currentStatus: string;
  allTimeBestStatus?: string;
}

interface PRData {
  id: string;
  exerciseName: string;
  value: number;
  unit: string;
}

interface LocationData {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface LimitationData {
  id: string;
  type: string;
  bodyPart?: string;
  condition?: string;
  description?: string;
  severity?: string;
}

interface MetricsData {
  weight?: number;
  height?: number;
  bodyFat?: number;
  fitnessLevel?: string;
}

interface SectionStatus {
  section: string;
  percent: number;
  isComplete: boolean;
  recommendation?: string;
}

interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  profile: {
    handle?: string;
    displayName?: string;
    profilePicture?: string;
    bio?: string;
    birthMonth?: number;
    birthYear?: number;
    city?: string;
    country?: string;
    visibility: string;
    socialLinks: {
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      twitter?: string;
      linkedin?: string;
    };
    notificationPreferences: {
      messages: boolean;
      workouts: boolean;
      goals: boolean;
      circles: boolean;
    };
    galleryPhotos?: Array<{
      id: string;
      url: string;
      visibility: "public" | "circles" | "private";
      visibleToCircles?: string[];
      caption?: string;
      uploadedAt: string;
    }>;
  } | null;
  metrics: MetricsData | null;
  limitations: LimitationData[];
  skills: SkillData[];
  locations: LocationData[];
  sports: SportData[];
  circles: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    imageUrl?: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    category?: string;
  }>;
  workoutPlans: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  personalRecords: PRData[];
  badges: BadgeData[];
  featuredBadges: BadgeData[];
  completeness: {
    overallPercent: number;
    sections: Record<string, number>;
    sectionStatuses: SectionStatus[];
    recommendations: string[];
  };
}

// ==================== CONSTANTS ====================
const SKILL_CATEGORIES = ["Gymnastics", "Strength", "Mobility", "Cardio", "Olympic Lifting", "Calisthenics", "Balance", "Other"];
const SKILL_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "learning", label: "Learning" },
  { value: "achieved", label: "Achieved" },
  { value: "mastered", label: "Mastered" },
];
const PR_UNITS = ["lbs", "kg", "reps", "seconds", "minutes", "miles", "km"];
const LOCATION_TYPES = [
  { value: "commercial", label: "Commercial Gym" },
  { value: "crossfit", label: "CrossFit Box" },
  { value: "home", label: "Home Gym" },
  { value: "outdoor", label: "Outdoor" },
  { value: "hotel", label: "Hotel Gym" },
  { value: "military", label: "Military Gym" },
  { value: "other", label: "Other" },
];
const LIMITATION_TYPES = ["Injury", "Chronic Condition", "Post-Surgery", "Mobility Issue", "Other"];
const BODY_PARTS = ["Neck", "Shoulder", "Upper Back", "Lower Back", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot", "Other"];
const SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"];

// ==================== HELPER COMPONENTS ====================
function ItemCard({ children, onEdit, onDelete, itemName, itemType = "item", className }: { children: React.ReactNode; onEdit?: () => void; onDelete?: () => void; itemName?: string; itemType?: string; className?: string }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center justify-between rounded-lg bg-muted p-3 group", className)}>
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        itemName={itemName}
        itemType={itemType}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}

// ==================== MODALS ====================
function SkillModal({ open, onOpenChange, skill, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; skill?: SkillData | null; onSave: (data: Partial<SkillData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [name, setName] = useState(skill?.name || "");
  const [category, setCategory] = useState(skill?.category || "Other");
  const [status, setStatus] = useState(skill?.currentStatus || "not_started");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(skill?.name || ""); setCategory(skill?.category || "Other"); setStatus(skill?.currentStatus || "not_started"); }
  }, [open, skill]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a skill name"); return; }
    setSaving(true);
    try { await onSave({ id: skill?.id, name, category, currentStatus: status }); onOpenChange(false); toast.success(skill ? "Skill updated!" : "Skill added!"); }
    catch { toast.error("Failed to save skill"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add Skill"}</DialogTitle>
          <DialogDescription>Track your fitness skills and progress</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Skill Name</Label><Input placeholder="e.g., Muscle Up, Handstand" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SKILL_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SKILL_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {skill && onDelete && <Button variant="destructive" onClick={() => { onDelete(skill.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PRModal({ open, onOpenChange, pr, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; pr?: PRData | null; onSave: (data: Partial<PRData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [exerciseName, setExerciseName] = useState(pr?.exerciseName || "");
  const [value, setValue] = useState(pr?.value?.toString() || "");
  const [unit, setUnit] = useState(pr?.unit || "lbs");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setExerciseName(pr?.exerciseName || ""); setValue(pr?.value?.toString() || ""); setUnit(pr?.unit || "lbs"); } }, [open, pr]);

  const handleSave = async () => {
    if (!exerciseName.trim() || !value) { toast.error("Please fill in all fields"); return; }
    setSaving(true);
    try { await onSave({ id: pr?.id, exerciseName, value: parseFloat(value), unit }); onOpenChange(false); toast.success(pr ? "PR updated!" : "PR added!"); }
    catch { toast.error("Failed to save PR"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{pr ? "Edit Personal Record" : "Add Personal Record"}</DialogTitle><DialogDescription>Track your best lifts</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Exercise</Label><Input placeholder="e.g., Bench Press, Deadlift" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Value</Label><Input type="number" placeholder="225" value={value} onChange={(e) => setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>Unit</Label><Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PR_UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {pr && onDelete && <Button variant="destructive" onClick={() => { onDelete(pr.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationModal({ open, onOpenChange, location, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; location?: LocationData | null; onSave: (data: Partial<LocationData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [name, setName] = useState(location?.name || "");
  const [type, setType] = useState(location?.type || "commercial");
  const [isActive, setIsActive] = useState(location?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(location?.name || ""); setType(location?.type || "commercial"); setIsActive(location?.isActive ?? true); } }, [open, location]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a location name"); return; }
    setSaving(true);
    try { await onSave({ id: location?.id, name, type, isActive }); onOpenChange(false); toast.success(location ? "Location updated!" : "Location added!"); }
    catch { toast.error("Failed to save location"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle><DialogDescription>Where do you work out?</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Name</Label><Input placeholder="e.g., LA Fitness, Home Garage" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOCATION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select></div>
          <div className="flex items-center justify-between"><Label>Active Location</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {location && onDelete && <Button variant="destructive" onClick={() => { onDelete(location.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LimitationModal({ open, onOpenChange, limitation, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; limitation?: LimitationData | null; onSave: (data: Partial<LimitationData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [type, setType] = useState(limitation?.type || "Injury");
  const [bodyPart, setBodyPart] = useState(limitation?.bodyPart || "");
  const [condition, setCondition] = useState(limitation?.condition || "");
  const [description, setDescription] = useState(limitation?.description || "");
  const [severity, setSeverity] = useState(limitation?.severity || "Moderate");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setType(limitation?.type || "Injury"); setBodyPart(limitation?.bodyPart || ""); setCondition(limitation?.condition || ""); setDescription(limitation?.description || ""); setSeverity(limitation?.severity || "Moderate"); } }, [open, limitation]);

  const handleSave = async () => {
    if (!condition.trim()) { toast.error("Please enter a condition name"); return; }
    setSaving(true);
    try { await onSave({ id: limitation?.id, type, bodyPart, condition, description, severity }); onOpenChange(false); toast.success(limitation ? "Limitation updated!" : "Limitation added!"); }
    catch { toast.error("Failed to save limitation"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{limitation ? "Edit Limitation" : "Add Limitation"}</DialogTitle><DialogDescription>Help AI understand your limitations</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LIMITATION_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Body Part</Label><Select value={bodyPart} onValueChange={setBodyPart}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{BODY_PARTS.map((bp) => (<SelectItem key={bp} value={bp}>{bp}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Condition</Label><Input placeholder="e.g., ACL tear, Rotator cuff strain" value={condition} onChange={(e) => setCondition(e.target.value)} /></div>
          <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITY_LEVELS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Notes (optional)</Label><Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {limitation && onDelete && <Button variant="destructive" onClick={() => { onDelete(limitation.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricsModal({ open, onOpenChange, metrics, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; metrics: MetricsData | null; onSave: (data: MetricsData) => Promise<void> }) {
  const [weight, setWeight] = useState(metrics?.weight?.toString() || "");
  const [heightFeet, setHeightFeet] = useState(metrics?.height ? Math.floor(metrics.height / 12).toString() : "");
  const [heightInches, setHeightInches] = useState(metrics?.height ? (metrics.height % 12).toString() : "");
  const [bodyFat, setBodyFat] = useState(metrics?.bodyFat?.toString() || "");
  const [fitnessLevel, setFitnessLevel] = useState(metrics?.fitnessLevel || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setWeight(metrics?.weight?.toString() || ""); setHeightFeet(metrics?.height ? Math.floor(metrics.height / 12).toString() : ""); setHeightInches(metrics?.height ? (metrics.height % 12).toString() : ""); setBodyFat(metrics?.bodyFat?.toString() || ""); setFitnessLevel(metrics?.fitnessLevel || ""); } }, [open, metrics]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const height = heightFeet || heightInches ? (parseInt(heightFeet || "0") * 12) + parseInt(heightInches || "0") : undefined;
      await onSave({ weight: weight ? parseFloat(weight) : undefined, height, bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, fitnessLevel: fitnessLevel || undefined });
      onOpenChange(false); toast.success("Metrics updated!");
    } catch { toast.error("Failed to save metrics"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Body Metrics</DialogTitle><DialogDescription>Your metrics are private</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Weight (lbs)</Label><Input type="number" placeholder="175" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div className="space-y-2"><Label>Height</Label><div className="grid grid-cols-2 gap-2"><div className="relative"><Input type="number" placeholder="5" value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ft</span></div><div className="relative"><Input type="number" placeholder="10" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">in</span></div></div></div>
          <div className="space-y-2"><Label>Body Fat % (optional)</Label><Input type="number" placeholder="15" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} /></div>
          <div className="space-y-2"><Label>Fitness Level</Label><Select value={fitnessLevel} onValueChange={setFitnessLevel}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem><SelectItem value="elite">Elite</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SportModal({ open, onOpenChange, sport, onSave, onDelete }: { open: boolean; onOpenChange: (open: boolean) => void; sport?: SportData | null; onSave: (data: Partial<SportData>) => Promise<void>; onDelete?: (id: string) => Promise<void> }) {
  const [sportName, setSportName] = useState(sport?.sport || "");
  const [level, setLevel] = useState(sport?.level || "");
  const [yearsPlaying, setYearsPlaying] = useState(sport?.yearsPlaying?.toString() || "");
  const [position, setPosition] = useState(sport?.position || "");
  const [currentlyActive, setCurrentlyActive] = useState(sport?.currentlyActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setSportName(sport?.sport || ""); setLevel(sport?.level || ""); setYearsPlaying(sport?.yearsPlaying?.toString() || ""); setPosition(sport?.position || ""); setCurrentlyActive(sport?.currentlyActive ?? true); } }, [open, sport]);

  const handleSave = async () => {
    if (!sportName.trim()) { toast.error("Please enter a sport name"); return; }
    setSaving(true);
    try { await onSave({ id: sport?.id, sport: sportName, level: level || undefined, yearsPlaying: yearsPlaying ? parseInt(yearsPlaying) : undefined, position: position || undefined, currentlyActive }); onOpenChange(false); toast.success(sport ? "Sport updated!" : "Sport added!"); }
    catch { toast.error("Failed to save sport"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{sport ? "Edit Sport" : "Add Sport"}</DialogTitle><DialogDescription>What sports do you play?</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Sport</Label><Input placeholder="e.g., Basketball, Soccer" value={sportName} onChange={(e) => setSportName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Level</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="recreational">Recreational</SelectItem><SelectItem value="high_school">High School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="professional">Professional</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Years Playing</Label><Input type="number" placeholder="5" value={yearsPlaying} onChange={(e) => setYearsPlaying(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Position (optional)</Label><Input placeholder="e.g., Point Guard" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Currently Active</Label><Switch checked={currentlyActive} onCheckedChange={setCurrentlyActive} /></div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {sport && onDelete && <Button variant="destructive" onClick={() => { onDelete(sport.id); onOpenChange(false); }} className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HandleModal({ open, onOpenChange, currentHandle, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; currentHandle?: string; onSave: (handle: string) => Promise<void> }) {
  const [handle, setHandle] = useState(currentHandle || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setHandle(currentHandle || ""); setError(""); } }, [open, currentHandle]);

  const handleChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    setError("");
  };

  const handleSave = async () => {
    if (!handle.trim()) { setError("Handle is required"); return; }
    if (handle.length < 3) { setError("Handle must be at least 3 characters"); return; }
    if (handle.length > 20) { setError("Handle must be 20 characters or less"); return; }
    setSaving(true);
    try { await onSave(handle); onOpenChange(false); toast.success("Handle saved!"); }
    catch { setError("Handle may already be taken"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Set Your Handle</DialogTitle><DialogDescription>Your unique username for invites and sharing</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Handle</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={handle} onChange={(e) => handleChange(e.target.value)} placeholder="yourhandle" className="pl-9" maxLength={20} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only. 3-20 characters.</p>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinksModal({ open, onOpenChange, socialLinks, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; socialLinks: { instagram?: string; tiktok?: string; youtube?: string; twitter?: string; linkedin?: string }; onSave: (links: typeof socialLinks) => Promise<void> }) {
  const [instagram, setInstagram] = useState(socialLinks.instagram || "");
  const [tiktok, setTiktok] = useState(socialLinks.tiktok || "");
  const [youtube, setYoutube] = useState(socialLinks.youtube || "");
  const [twitter, setTwitter] = useState(socialLinks.twitter || "");
  const [linkedin, setLinkedin] = useState(socialLinks.linkedin || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setInstagram(socialLinks.instagram || ""); setTiktok(socialLinks.tiktok || ""); setYoutube(socialLinks.youtube || ""); setTwitter(socialLinks.twitter || ""); setLinkedin(socialLinks.linkedin || ""); } }, [open, socialLinks]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ instagram: instagram || undefined, tiktok: tiktok || undefined, youtube: youtube || undefined, twitter: twitter || undefined, linkedin: linkedin || undefined }); onOpenChange(false); toast.success("Social links saved!"); }
    catch { toast.error("Failed to save social links"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Social Links</DialogTitle><DialogDescription>Connect your social profiles</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label className="flex items-center gap-2"><Instagram className="h-4 w-4" />Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="username" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>TikTok</Label><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="username" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Youtube className="h-4 w-4" />YouTube</Label><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="channel URL or handle" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" />LinkedIn</Label><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="username or profile URL" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-2"><Twitter className="h-4 w-4" />X (Twitter)</Label><Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="username" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailModal({ open, onOpenChange, currentEmail }: { open: boolean; onOpenChange: (open: boolean) => void; currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setNewEmail(""); setPassword(""); setError(""); } }, [open]);

  const handleSave = async () => {
    if (!newEmail.trim()) { setError("Please enter a new email"); return; }
    if (!newEmail.includes("@")) { setError("Please enter a valid email"); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/user/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change email");
      }
      toast.success("Verification email sent! Check your inbox.");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>Update your email address</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Email</Label>
            <Input value={currentEmail} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>New Email</Label>
            <Input 
              type="email" 
              placeholder="new@email.com" 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : "Send Verification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordResetModal({ open, onOpenChange, email }: { open: boolean; onOpenChange: (open: boolean) => void; email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (open) { setSent(false); } }, [open]);

  const handleSendReset = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Failed to send reset email");
      setSent(true);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>We&apos;ll send a reset link to your email</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Check your email!</p>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a password reset link to <span className="font-medium">{email}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click below to receive a password reset link at this email address.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          {sent ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSendReset} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : "Send Reset Link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN COMPONENT ====================
export function ProfilePage({ user, profile, metrics, limitations, skills, locations, sports, circles, goals, workoutPlans, personalRecords, badges, featuredBadges, completeness }: ProfilePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCompleteness, setShowCompleteness] = useState(completeness.overallPercent < 100);

  // Achievement modal state
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<EarnedBadge[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Modal states
  const [skillModal, setSkillModal] = useState<{ open: boolean; skill?: SkillData | null }>({ open: false });
  const [prModal, setPrModal] = useState<{ open: boolean; pr?: PRData | null }>({ open: false });
  const [locationModal, setLocationModal] = useState<{ open: boolean; location?: LocationData | null }>({ open: false });
  const [limitationModal, setLimitationModal] = useState<{ open: boolean; limitation?: LimitationData | null }>({ open: false });
  const [metricsModal, setMetricsModal] = useState(false);
  const [sportModal, setSportModal] = useState<{ open: boolean; sport?: SportData | null }>({ open: false });
  const [handleModal, setHandleModal] = useState(false);
  const [socialLinksModal, setSocialLinksModal] = useState(false);
  const [changeEmailModal, setChangeEmailModal] = useState(false);
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Accordion state
  const sectionFromUrl = searchParams.get("section") || "";
  const [openSections, setOpenSections] = useState<string[]>(sectionFromUrl ? [sectionFromUrl] : []);

  useEffect(() => {
    if (sectionFromUrl) {
      setOpenSections((prev) => prev.includes(sectionFromUrl) ? prev : [...prev, sectionFromUrl]);
      setTimeout(() => { document.querySelector(`[data-section="${sectionFromUrl}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
    }
  }, [sectionFromUrl]);

  const displayName = profile?.displayName || user.name;
  const profileImage = profile?.profilePicture || user.image;
  const recommendations = generateRecommendations(completeness);

  // API Handlers
  const handleSaveSkill = async (data: Partial<SkillData>) => { const response = await fetch(data.id ? `/api/user/skills/${data.id}` : "/api/user/skills", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteSkill = async (id: string) => { await fetch(`/api/user/skills/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSavePR = async (data: Partial<PRData>) => {
    const response = await fetch(data.id ? `/api/user/prs/${data.id}` : "/api/user/prs", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error();
    // Check for newly earned badges after PR is saved
    try {
      const badgeResponse = await fetch("/api/badges/check", { method: "POST" });
      if (badgeResponse.ok) {
        const { newBadges } = await badgeResponse.json();
        if (newBadges && newBadges.length > 0) {
          setNewlyEarnedBadges(newBadges);
          setShowAchievementModal(true);
        }
      }
    } catch { /* Badge check failed, continue */ }
    router.refresh();
  };
  const handleDeletePR = async (id: string) => { await fetch(`/api/user/prs/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveLocation = async (data: Partial<LocationData>) => { const response = await fetch(data.id ? `/api/locations/${data.id}` : "/api/locations", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteLocation = async (id: string) => { await fetch(`/api/locations/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveLimitation = async (data: Partial<LimitationData>) => { const response = await fetch(data.id ? `/api/user/limitations/${data.id}` : "/api/user/limitations", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteLimitation = async (id: string) => { await fetch(`/api/user/limitations/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveMetrics = async (data: MetricsData) => { const response = await fetch("/api/user/metrics", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleSaveSport = async (data: Partial<SportData>) => { const response = await fetch(data.id ? `/api/user/sports/${data.id}` : "/api/user/sports", { method: data.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleDeleteSport = async (id: string) => { await fetch(`/api/user/sports/${id}`, { method: "DELETE" }); router.refresh(); };
  const handleSaveHandle = async (handle: string) => { const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }) }); if (!response.ok) throw new Error(); router.refresh(); };
  const handleSaveSocialLinks = async (links: { instagram?: string; tiktok?: string; youtube?: string; twitter?: string; linkedin?: string }) => { const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ socialLinks: links }) }); if (!response.ok) throw new Error(); router.refresh(); };

  const copyProfileLink = () => {
    const url = profile?.handle ? `${window.location.origin}/@${profile.handle}` : `${window.location.origin}/u/${user.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied! Add it to your Linktree or bio.");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      // Redirect to login page after sign out
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-32">
      {/* Profile Completeness */}
      {showCompleteness && (
        <CompletenessCard overallPercent={completeness.overallPercent} sections={completeness.sections} sectionStatuses={completeness.sectionStatuses} recommendations={completeness.recommendations} onDismiss={() => setShowCompleteness(false)} />
      )}

      {/* ==================== PROFILE HEADER ==================== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileImage} />
              <AvatarFallback className="text-xl bg-brand/20 text-brand">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{displayName}</h2>
              {profile?.handle ? (
                <p className="text-brand text-sm">@{profile.handle}</p>
              ) : (
                <button onClick={() => setHandleModal(true)} className="text-sm text-muted-foreground hover:text-brand flex items-center gap-1">
                  <AtSign className="h-3 w-3" />Set your handle
                </button>
              )}
              {profile?.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{profile.city}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setHandleModal(true)}><Edit className="h-4 w-4" /></Button>
          </div>

          {/* Share Link CTA */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium">Share your profile</span>
              </div>
              <Button variant="ghost" size="sm" onClick={copyProfileLink}><Copy className="h-4 w-4 mr-1" />Copy Link</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Add this link to your Instagram, TikTok, or Linktree bio</p>
          </div>

          {/* Social Links */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              {profile?.socialLinks?.instagram && (
                <a href={`https://instagram.com/${profile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80"><Instagram className="h-4 w-4" /></a>
              )}
              {profile?.socialLinks?.tiktok && (
                <a href={`https://tiktok.com/@${profile.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg></a>
              )}
              {profile?.socialLinks?.youtube && (
                <a href={profile.socialLinks.youtube.startsWith("http") ? profile.socialLinks.youtube : `https://youtube.com/@${profile.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80"><Youtube className="h-4 w-4" /></a>
              )}
              {profile?.socialLinks?.linkedin && (
                <a href={profile.socialLinks.linkedin.startsWith("http") ? profile.socialLinks.linkedin : `https://linkedin.com/in/${profile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80"><Linkedin className="h-4 w-4" /></a>
              )}
              {profile?.socialLinks?.twitter && (
                <a href={`https://x.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80"><Twitter className="h-4 w-4" /></a>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSocialLinksModal(true)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== QUICK STATS ==================== */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{circles.length}</p><p className="text-xs text-muted-foreground">Circles</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{workoutPlans.length}</p><p className="text-xs text-muted-foreground">Workouts</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{badges.length}</p><p className="text-xs text-muted-foreground">Badges</p></CardContent></Card>
      </div>

      {/* Featured Badges Display */}
      {featuredBadges.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Featured Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {featuredBadges.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border",
                    badge.badge.tier === "platinum" && "bg-cyan-500/10 border-cyan-500/30",
                    badge.badge.tier === "gold" && "bg-yellow-500/10 border-yellow-500/30",
                    badge.badge.tier === "silver" && "bg-gray-400/10 border-gray-400/30",
                    badge.badge.tier === "bronze" && "bg-amber-600/10 border-amber-600/30"
                  )}
                  title={badge.badge.description}
                >
                  <span className="text-xl">{badge.badge.icon || "🏆"}</span>
                  <span className="text-sm font-medium">{badge.badge.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== ACCORDION SECTIONS ==================== */}
      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
        {/* Badges & Achievements */}
        {badges.length > 0 && (
          <AccordionItem value="badges" data-section="badges" className="!border rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <span className="font-medium text-sm">Badges & Achievements</span>
                <Badge variant="secondary" className="ml-auto mr-2 text-xs">{badges.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 pt-2">
                {/* Group badges by category */}
                {Object.entries(
                  badges.reduce((acc, badge) => {
                    const category = badge.badge.category || "other";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(badge);
                    return acc;
                  }, {} as Record<string, BadgeData[]>)
                ).map(([category, categoryBadges]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border",
                            badge.badge.tier === "platinum" && "bg-cyan-500/10 border-cyan-500/30",
                            badge.badge.tier === "gold" && "bg-yellow-500/10 border-yellow-500/30",
                            badge.badge.tier === "silver" && "bg-gray-400/10 border-gray-400/30",
                            badge.badge.tier === "bronze" && "bg-amber-600/10 border-amber-600/30"
                          )}
                        >
                          <span className="text-xl">{badge.badge.icon || "🏆"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{badge.badge.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{badge.badge.tier}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Body & Health */}
        <AccordionItem value="health" data-section="health" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-energy/20"><Heart className="h-4 w-4 text-energy" /></div>
              <span className="font-medium text-sm">Body & Health</span>
              <Badge variant="outline" className="ml-auto mr-2 text-xs">Private</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Metrics</span><Button variant="ghost" size="sm" onClick={() => setMetricsModal(true)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button></div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.weight || "—"}</p><p className="text-xs text-muted-foreground">lbs</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.height ? `${Math.floor(metrics.height / 12)}'${metrics.height % 12}"` : "—"}</p><p className="text-xs text-muted-foreground">height</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-lg font-bold">{metrics?.bodyFat ? `${metrics.bodyFat}%` : "—"}</p><p className="text-xs text-muted-foreground">body fat</p></div>
              </div>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Limitations</span><Button variant="ghost" size="sm" onClick={() => setLimitationModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {limitations.length === 0 ? <p className="text-sm text-muted-foreground">No limitations added</p> : (
                <div className="space-y-2">{limitations.map((l) => (<ItemCard key={l.id} onEdit={() => setLimitationModal({ open: true, limitation: l })} onDelete={() => handleDeleteLimitation(l.id)} itemName={l.condition || l.type} itemType="limitation"><div className="flex items-center gap-2"><span className="text-sm font-medium">{l.condition || l.type}</span>{l.bodyPart && <span className="text-xs text-muted-foreground">({l.bodyPart})</span>}{l.severity && <Badge variant="outline" className="text-xs ml-auto">{l.severity}</Badge>}</div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Skills & PRs */}
        <AccordionItem value="skills" data-section="skills" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20"><Trophy className="h-4 w-4 text-success" /></div>
              <span className="font-medium text-sm">Skills & PRs</span>
              {(skills.length > 0 || personalRecords.length > 0) && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{skills.length + personalRecords.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Skills</span><Button variant="ghost" size="sm" onClick={() => setSkillModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills added</p> : (
                <div className="space-y-2">{skills.map((s) => (<ItemCard key={s.id} onEdit={() => setSkillModal({ open: true, skill: s })} onDelete={() => handleDeleteSkill(s.id)} itemName={s.name} itemType="skill"><div className="flex items-center gap-2"><span className="text-sm font-medium">{s.name}</span><Badge variant="secondary" className="text-xs">{s.category}</Badge><Badge className={cn("text-xs ml-auto", s.currentStatus === "mastered" && "bg-energy text-white", s.currentStatus === "achieved" && "bg-success text-white")}>{SKILL_STATUSES.find((st) => st.value === s.currentStatus)?.label || s.currentStatus}</Badge></div></ItemCard>))}</div>
              )}
              <div className="flex items-center justify-between pt-2"><span className="text-sm font-medium">Personal Records</span><Button variant="ghost" size="sm" onClick={() => setPrModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {personalRecords.length === 0 ? <p className="text-sm text-muted-foreground">No PRs added</p> : (
                <div className="space-y-2">{personalRecords.map((pr) => (<ItemCard key={pr.id} onEdit={() => setPrModal({ open: true, pr })} onDelete={() => handleDeletePR(pr.id)} itemName={pr.exerciseName} itemType="personal record"><div className="flex items-center justify-between"><span className="text-sm font-medium">{pr.exerciseName}</span><span className="text-sm font-bold text-brand">{pr.value} {pr.unit}</span></div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sports */}
        <AccordionItem value="sports" data-section="sports" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20"><Activity className="h-4 w-4 text-brand" /></div>
              <span className="font-medium text-sm">Sports</span>
              {sports.length > 0 && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{sports.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Your Sports</span><Button variant="ghost" size="sm" onClick={() => setSportModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {sports.length === 0 ? <p className="text-sm text-muted-foreground">No sports added</p> : (
                <div className="space-y-2">{sports.map((s) => (<ItemCard key={s.id} onEdit={() => setSportModal({ open: true, sport: s })} onDelete={() => handleDeleteSport(s.id)} itemName={s.sport} itemType="sport"><div className="flex items-center gap-2"><span className="text-sm font-medium">{s.sport}</span>{s.level && <Badge variant="secondary" className="text-xs capitalize">{s.level.replace("_", " ")}</Badge>}{s.yearsPlaying && <span className="text-xs text-muted-foreground">{s.yearsPlaying} yrs</span>}{s.currentlyActive && <Badge className="text-xs ml-auto bg-success/20 text-success">Active</Badge>}</div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Equipment */}
        <AccordionItem value="equipment" data-section="equipment" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Dumbbell className="h-4 w-4" /></div>
              <span className="font-medium text-sm">Equipment & Gyms</span>
              {locations.length > 0 && <Badge variant="secondary" className="ml-auto mr-2 text-xs">{locations.length}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Your Locations</span><Button variant="ghost" size="sm" onClick={() => setLocationModal({ open: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              {locations.length === 0 ? <p className="text-sm text-muted-foreground">No locations added</p> : (
                <div className="space-y-2">{locations.map((l) => (<ItemCard key={l.id} onEdit={() => setLocationModal({ open: true, location: l })} onDelete={() => handleDeleteLocation(l.id)} itemName={l.name} itemType="location"><div className="flex items-center gap-2"><span className="text-sm font-medium">{l.name}</span><Badge variant="secondary" className="text-xs capitalize">{LOCATION_TYPES.find((t) => t.value === l.type)?.label || l.type}</Badge>{l.isActive && <Badge className="text-xs ml-auto bg-success/20 text-success">Active</Badge>}</div></ItemCard>))}</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Circles */}
        <AccordionItem value="circles" data-section="circles" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-energy/20"><Users className="h-4 w-4 text-energy" /></div>
              <span className="font-medium text-sm">Circles</span>
              <Badge variant="secondary" className="ml-auto mr-2 text-xs">{circles.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 pt-2">
              {circles.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Avatar className="h-10 w-10"><AvatarImage src={c.imageUrl} /><AvatarFallback className="text-sm">{c.name.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.memberCount} members · {c.role}</p></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/discover?tab=circles")}><Plus className="mr-1 h-4 w-4" />Join or Create Circle</Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Settings */}
        <AccordionItem value="settings" data-section="settings" className="!border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Settings className="h-4 w-4" /></div>
              <span className="font-medium text-sm">Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {/* Account Info */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</span>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setChangeEmailModal(true)}>
                      Change
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security Actions */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security</span>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start" 
                    onClick={() => setPasswordResetModal(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => router.push("/account/privacy")}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Settings
                  </Button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing out...</>
                  ) : (
                    <><LogOut className="mr-2 h-4 w-4" />Sign Out</>
                  )}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ==================== MODALS ==================== */}
      <SkillModal open={skillModal.open} onOpenChange={(open) => setSkillModal({ open, skill: open ? skillModal.skill : null })} skill={skillModal.skill} onSave={handleSaveSkill} onDelete={handleDeleteSkill} />
      <PRModal open={prModal.open} onOpenChange={(open) => setPrModal({ open, pr: open ? prModal.pr : null })} pr={prModal.pr} onSave={handleSavePR} onDelete={handleDeletePR} />
      <LocationModal open={locationModal.open} onOpenChange={(open) => setLocationModal({ open, location: open ? locationModal.location : null })} location={locationModal.location} onSave={handleSaveLocation} onDelete={handleDeleteLocation} />
      <LimitationModal open={limitationModal.open} onOpenChange={(open) => setLimitationModal({ open, limitation: open ? limitationModal.limitation : null })} limitation={limitationModal.limitation} onSave={handleSaveLimitation} onDelete={handleDeleteLimitation} />
      <MetricsModal open={metricsModal} onOpenChange={setMetricsModal} metrics={metrics} onSave={handleSaveMetrics} />
      <SportModal open={sportModal.open} onOpenChange={(open) => setSportModal({ open, sport: open ? sportModal.sport : null })} sport={sportModal.sport} onSave={handleSaveSport} onDelete={handleDeleteSport} />
      <HandleModal open={handleModal} onOpenChange={setHandleModal} currentHandle={profile?.handle} onSave={handleSaveHandle} />
      <SocialLinksModal open={socialLinksModal} onOpenChange={setSocialLinksModal} socialLinks={profile?.socialLinks || {}} onSave={handleSaveSocialLinks} />
      <ChangeEmailModal open={changeEmailModal} onOpenChange={setChangeEmailModal} currentEmail={user.email} />
      <PasswordResetModal open={passwordResetModal} onOpenChange={setPasswordResetModal} email={user.email} />

      {/* Achievement Celebration Modal */}
      {showAchievementModal && newlyEarnedBadges.length > 0 && (
        <AchievementModal
          badges={newlyEarnedBadges}
          onComplete={() => {
            setShowAchievementModal(false);
            setNewlyEarnedBadges([]);
          }}
        />
      )}
    </div>
  );
}
