"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  User,
  Target,
  Activity,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  Calendar,
  Weight,
  Ruler,
  Award,
  Edit,
  Pencil,
  X,
  Camera,
  ImageOff,
  Dumbbell,
  Timer,
  Star,
  Trophy,
  CheckCircle,
  GraduationCap,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { BodyFatSelector } from "@/components/body-fat-selector";

interface Metric {
  id: string;
  date: string;
  weight?: number;
  height?: number;
  bodyFatPercentage?: number;
  fitnessLevel?: string;
  notes?: string;
}

interface Limitation {
  id: string;
  type: string;
  description: string;
  affectedAreas?: string[];
  severity?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  targetDate?: string;
  status: string;
}

interface PersonalRecord {
  id: string;
  exerciseId: string;
  exercise: { name: string };
  value: number;
  unit: string;
  repMax?: number;
  date: string;
  recordType: "all_time" | "current";
  estimatedDate?: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  // Current status
  currentStatus: string;
  currentStatusDate?: string;
  // All-time best
  allTimeBestStatus: string;
  allTimeBestDate?: string;
  // Legacy fields for backwards compatibility
  status: string;
  dateAchieved?: string;
  notes?: string;
}

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  rating?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  exercises: {
    name: string;
    category: string;
    muscleGroups: string[];
    setsCompleted: number;
    totalSets: number;
    maxWeight: number;
    avgReps: number;
  }[];
}

interface Member {
  id: string;
  name: string;
  avatar?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: string;
  metrics: Metric[];
  limitations: Limitation[];
  goals: Goal[];
  personalRecords: PersonalRecord[];
  skills: Skill[];
}

const BODY_PARTS = [
  "neck", "shoulder", "upper back", "lower back", "chest",
  "elbow", "wrist", "hand", "hip", "knee", "ankle", "foot"
];

const LIMITATION_TYPES = [
  { value: "injury", label: "Injury" },
  { value: "condition", label: "Medical Condition" },
  { value: "preference", label: "Preference/Avoidance" },
];

const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild - Can work around it" },
  { value: "moderate", label: "Moderate - Needs modifications" },
  { value: "severe", label: "Severe - Must avoid completely" },
];

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);

  // Limitation form state
  const [limitationDialogOpen, setLimitationDialogOpen] = useState(false);
  const [savingLimitation, setSavingLimitation] = useState(false);
  const [limitationForm, setLimitationForm] = useState({
    type: "",
    description: "",
    affectedAreas: [] as string[],
    severity: "",
  });

  // Metrics form state
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [metricsForm, setMetricsForm] = useState({
    weight: "",
    height: "",
    bodyFatPercentage: "",
    fitnessLevel: "",
    notes: "",
  });

  // Edit metrics state
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [editMetricDialogOpen, setEditMetricDialogOpen] = useState(false);
  const [editMetricForm, setEditMetricForm] = useState({
    date: "",
    weight: "",
    height: "",
    bodyFatPercentage: "",
    fitnessLevel: "",
    notes: "",
  });

  // Goal form state
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: "",
    category: "",
    description: "",
    targetValue: "",
    targetUnit: "",
    targetDate: "",
  });

  // Personal Record form state
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [savingPr, setSavingPr] = useState(false);
  const [prForm, setPrForm] = useState({
    exerciseName: "",
    value: "",
    minutes: "",
    seconds: "",
    unit: "lbs",
    repMax: "1",
    recordType: "current" as "all_time" | "current",
    date: new Date().toISOString().split("T")[0],
    estimatedDate: false,
  });

  // Skills state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [skillForm, setSkillForm] = useState({
    name: "",
    category: "gymnastics",
    currentStatus: "learning",
    allTimeBestStatus: "learning",
    currentStatusDate: new Date().toISOString().split("T")[0],
    allTimeBestDate: "",
    notes: "",
  });

  // Workout history state
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Profile edit state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
  });

  // Skill edit state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editSkillDialogOpen, setEditSkillDialogOpen] = useState(false);

  const GOAL_CATEGORIES = [
    { value: "strength", label: "Strength" },
    { value: "endurance", label: "Endurance" },
    { value: "weight", label: "Weight/Body Composition" },
    { value: "skill", label: "Skill/Movement" },
    { value: "flexibility", label: "Flexibility/Mobility" },
    { value: "habit", label: "Habit/Consistency" },
    { value: "other", label: "Other" },
  ];

  const SKILL_CATEGORIES = [
    { value: "gymnastics", label: "Gymnastics" },
    { value: "calisthenics", label: "Calisthenics" },
    { value: "sport", label: "Sport-Specific" },
    { value: "other", label: "Other" },
  ];

  const SKILL_STATUS = [
    { value: "learning", label: "Learning" },
    { value: "achieved", label: "Achieved" },
    { value: "mastered", label: "Mastered" },
  ];

  // Common exercises for quick PR entry
  const LIFTING_EXERCISES = [
    { name: "Bench Press", unit: "lbs" },
    { name: "Squat", unit: "lbs" },
    { name: "Deadlift", unit: "lbs" },
    { name: "Strict Press", unit: "lbs" },
    { name: "Pull Ups", unit: "reps" },
  ];

  const RUNNING_EXERCISES = [
    { name: "Mile Run", unit: "seconds" },
    { name: "400m Run", unit: "seconds" },
    { name: "200m Run", unit: "seconds" },
    { name: "100m Run", unit: "seconds" },
  ];

  const COMMON_SKILLS = [
    "Back Tuck",
    "Back Handspring",
    "Front Tuck",
    "Front Handspring",
    "Roundoff",
    "Cartwheel",
    "Muscle-Up",
    "Handstand",
    "Handstand Walk",
    "L-Sit",
    "Planche",
    "Front Lever",
    "Back Lever",
  ];

  // Profile picture state
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image cropping state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height);
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        1, // aspect ratio 1:1 for profile pictures
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, []);

  // Generate cropped image
  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to desired output size
    const outputSize = 400; // 400x400 output
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop dimensions
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    // Apply rotation if needed
    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-outputSize / 2, -outputSize / 2);

    // Draw the cropped image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputSize,
      outputSize
    );
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    });
  }, [completedCrop, rotation, zoom]);

  useEffect(() => {
    fetchMember();
    fetchSkills();
    fetchWorkoutHistory();
  }, [memberId]);

  const fetchSkills = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    }
  };

  const fetchWorkoutHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/members/${memberId}/workout-history`);
      if (response.ok) {
        const data = await response.json();
        setWorkoutHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch workout history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMember = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data);
      } else {
        toast.error("Member not found");
        router.push("/members");
      }
    } catch (error) {
      console.error("Failed to fetch member:", error);
      toast.error("Failed to load member");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLimitation = async () => {
    if (!limitationForm.type || !limitationForm.description) {
      toast.error("Type and description are required");
      return;
    }

    setSavingLimitation(true);
    try {
      const response = await fetch(`/api/members/${memberId}/limitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limitationForm),
      });

      if (response.ok) {
        toast.success("Limitation added");
        setLimitationDialogOpen(false);
        setLimitationForm({ type: "", description: "", affectedAreas: [], severity: "" });
        fetchMember();
      } else {
        toast.error("Failed to add limitation");
      }
    } catch (error) {
      toast.error("Failed to add limitation");
    } finally {
      setSavingLimitation(false);
    }
  };

  const handleToggleLimitation = async (limitation: Limitation) => {
    try {
      const response = await fetch(`/api/members/${memberId}/limitations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limitationId: limitation.id,
          ...limitation,
          active: !limitation.active,
        }),
      });

      if (response.ok) {
        toast.success(limitation.active ? "Limitation marked as resolved" : "Limitation reactivated");
        fetchMember();
      }
    } catch (error) {
      toast.error("Failed to update limitation");
    }
  };

  const handleDeleteLimitation = async (limitationId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}/limitations?limitationId=${limitationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Limitation deleted");
        fetchMember();
      }
    } catch (error) {
      toast.error("Failed to delete limitation");
    }
  };

  const handleAddMetrics = async () => {
    setSavingMetrics(true);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: member?.name,
          metrics: {
            weight: metricsForm.weight ? parseFloat(metricsForm.weight) : undefined,
            height: metricsForm.height ? parseFloat(metricsForm.height) : undefined,
            bodyFatPercentage: metricsForm.bodyFatPercentage ? parseFloat(metricsForm.bodyFatPercentage) : undefined,
            fitnessLevel: metricsForm.fitnessLevel || undefined,
            notes: metricsForm.notes || undefined,
          },
        }),
      });

      if (response.ok) {
        toast.success("Metrics updated");
        setMetricsDialogOpen(false);
        setMetricsForm({ weight: "", height: "", bodyFatPercentage: "", fitnessLevel: "", notes: "" });
        fetchMember();
      } else {
        toast.error("Failed to update metrics");
      }
    } catch (error) {
      toast.error("Failed to update metrics");
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}/metrics?metricId=${metricId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Metric deleted");
        fetchMember();
      } else {
        toast.error("Failed to delete metric");
      }
    } catch (error) {
      toast.error("Failed to delete metric");
    }
  };

  const openEditMetricDialog = (metric: Metric) => {
    setEditingMetric(metric);
    setEditMetricForm({
      date: new Date(metric.date).toISOString().split("T")[0],
      weight: metric.weight?.toString() || "",
      height: metric.height?.toString() || "",
      bodyFatPercentage: metric.bodyFatPercentage?.toString() || "",
      fitnessLevel: metric.fitnessLevel || "",
      notes: metric.notes || "",
    });
    setEditMetricDialogOpen(true);
  };

  const handleUpdateMetric = async () => {
    if (!editingMetric) return;

    setSavingMetrics(true);
    try {
      const response = await fetch(`/api/members/${memberId}/metrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: editingMetric.id,
          date: editMetricForm.date,
          weight: editMetricForm.weight ? parseFloat(editMetricForm.weight) : null,
          height: editMetricForm.height ? parseFloat(editMetricForm.height) : null,
          bodyFatPercentage: editMetricForm.bodyFatPercentage ? parseFloat(editMetricForm.bodyFatPercentage) : null,
          fitnessLevel: editMetricForm.fitnessLevel || null,
          notes: editMetricForm.notes || null,
        }),
      });

      if (response.ok) {
        toast.success("Metric updated");
        setEditMetricDialogOpen(false);
        setEditingMetric(null);
        fetchMember();
      } else {
        toast.error("Failed to update metric");
      }
    } catch (error) {
      toast.error("Failed to update metric");
    } finally {
      setSavingMetrics(false);
    }
  };

  const toggleAffectedArea = (area: string) => {
    setLimitationForm(prev => ({
      ...prev,
      affectedAreas: prev.affectedAreas.includes(area)
        ? prev.affectedAreas.filter(a => a !== area)
        : [...prev.affectedAreas, area],
    }));
  };

  const handleAddGoal = async () => {
    if (!goalForm.title || !goalForm.category) {
      toast.error("Title and category are required");
      return;
    }

    setSavingGoal(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          title: goalForm.title,
          category: goalForm.category,
          description: goalForm.description || null,
          targetValue: goalForm.targetValue ? parseFloat(goalForm.targetValue) : null,
          targetUnit: goalForm.targetUnit || null,
          targetDate: goalForm.targetDate || null,
        }),
      });

      if (response.ok) {
        toast.success("Goal added");
        setGoalDialogOpen(false);
        setGoalForm({
          title: "",
          category: "",
          description: "",
          targetValue: "",
          targetUnit: "",
          targetDate: "",
        });
        fetchMember();
      } else {
        toast.error("Failed to add goal");
      }
    } catch (error) {
      toast.error("Failed to add goal");
    } finally {
      setSavingGoal(false);
    }
  };

  const handleUpdateGoalStatus = async (goalId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Goal marked as ${newStatus}`);
        fetchMember();
      } else {
        toast.error("Failed to update goal");
      }
    } catch (error) {
      toast.error("Failed to update goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Goal deleted");
        fetchMember();
      } else {
        toast.error("Failed to delete goal");
      }
    } catch (error) {
      toast.error("Failed to delete goal");
    }
  };

  // Personal Record handlers
  const handleAddPr = async () => {
    // Validate based on unit type
    if (!prForm.exerciseName) {
      toast.error("Exercise is required");
      return;
    }

    let finalValue: number;
    if (prForm.unit === "seconds") {
      // Convert minutes and seconds to total seconds
      const mins = parseInt(prForm.minutes) || 0;
      const secs = parseInt(prForm.seconds) || 0;
      finalValue = mins * 60 + secs;
      if (finalValue === 0) {
        toast.error("Please enter a time");
        return;
      }
    } else {
      if (!prForm.value) {
        toast.error("Value is required");
        return;
      }
      finalValue = parseFloat(prForm.value);
    }

    setSavingPr(true);
    try {
      const response = await fetch(`/api/members/${memberId}/personal-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: prForm.exerciseName,
          value: finalValue,
          unit: prForm.unit,
          repMax: prForm.unit === "seconds" || prForm.unit === "reps" ? null : parseInt(prForm.repMax),
          recordType: prForm.recordType,
          date: prForm.date,
          estimatedDate: prForm.estimatedDate,
        }),
      });

      if (response.ok) {
        toast.success("Personal record added");
        setPrDialogOpen(false);
        setPrForm({
          exerciseName: "",
          value: "",
          minutes: "",
          seconds: "",
          unit: "lbs",
          repMax: "1",
          recordType: "current",
          date: new Date().toISOString().split("T")[0],
          estimatedDate: false,
        });
        fetchMember();
      } else {
        toast.error("Failed to add personal record");
      }
    } catch (error) {
      toast.error("Failed to add personal record");
    } finally {
      setSavingPr(false);
    }
  };

  const handleDeletePr = async (recordId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}/personal-records?recordId=${recordId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Record deleted");
        fetchMember();
      } else {
        toast.error("Failed to delete record");
      }
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  // Skill handlers
  const handleAddSkill = async () => {
    if (!skillForm.name) {
      toast.error("Skill name is required");
      return;
    }

    setSavingSkill(true);
    try {
      const response = await fetch(`/api/members/${memberId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillForm.name,
          category: skillForm.category,
          currentStatus: skillForm.currentStatus,
          currentStatusDate: skillForm.currentStatusDate || new Date().toISOString(),
          allTimeBestStatus: skillForm.allTimeBestStatus,
          allTimeBestDate: skillForm.allTimeBestDate || null,
          notes: skillForm.notes || null,
          // Legacy fields
          status: skillForm.currentStatus,
          dateAchieved: skillForm.currentStatus !== "learning" ? skillForm.currentStatusDate : null,
        }),
      });

      if (response.ok) {
        toast.success("Skill added");
        setSkillDialogOpen(false);
        setSkillForm({
          name: "",
          category: "gymnastics",
          currentStatus: "learning",
          allTimeBestStatus: "learning",
          currentStatusDate: new Date().toISOString().split("T")[0],
          allTimeBestDate: "",
          notes: "",
        });
        fetchSkills();
      } else {
        toast.error("Failed to add skill");
      }
    } catch (error) {
      toast.error("Failed to add skill");
    } finally {
      setSavingSkill(false);
    }
  };

  const handleUpdateSkillStatus = async (skillId: string, newStatus: string, updateType: "current" | "all_time" = "current") => {
    try {
      const updateData: Record<string, unknown> = {
        skillId,
        status: newStatus,
        dateAchieved: newStatus !== "learning" ? new Date().toISOString() : null,
      };

      if (updateType === "current") {
        updateData.currentStatus = newStatus;
        updateData.currentStatusDate = new Date().toISOString();
      } else {
        updateData.allTimeBestStatus = newStatus;
        updateData.allTimeBestDate = new Date().toISOString();
      }

      const response = await fetch(`/api/members/${memberId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success(`Skill marked as ${newStatus}`);
        fetchSkills();
      } else {
        toast.error("Failed to update skill");
      }
    } catch (error) {
      toast.error("Failed to update skill");
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}/skills?skillId=${skillId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Skill deleted");
        fetchSkills();
      } else {
        toast.error("Failed to delete skill");
      }
    } catch (error) {
      toast.error("Failed to delete skill");
    }
  };

  // Profile editing
  const openProfileEdit = () => {
    setProfileForm({
      name: member?.name || "",
      dateOfBirth: member?.dateOfBirth || "",
      gender: member?.gender || "",
    });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          dateOfBirth: profileForm.dateOfBirth || null,
          gender: profileForm.gender || null,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated");
        setProfileDialogOpen(false);
        fetchMember();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Skill editing
  const openSkillEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({
      name: skill.name,
      category: skill.category,
      currentStatus: skill.currentStatus || skill.status,
      currentStatusDate: skill.currentStatusDate?.split("T")[0] || skill.dateAchieved?.split("T")[0] || "",
      allTimeBestStatus: skill.allTimeBestStatus || "",
      allTimeBestDate: skill.allTimeBestDate?.split("T")[0] || "",
      notes: skill.notes || "",
    });
    setEditSkillDialogOpen(true);
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill || !skillForm.name) {
      toast.error("Skill name is required");
      return;
    }
    setSavingSkill(true);
    try {
      const response = await fetch(`/api/members/${memberId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: editingSkill.id,
          name: skillForm.name,
          category: skillForm.category,
          currentStatus: skillForm.currentStatus,
          currentStatusDate: skillForm.currentStatusDate || new Date().toISOString(),
          allTimeBestStatus: skillForm.allTimeBestStatus || null,
          allTimeBestDate: skillForm.allTimeBestDate || null,
          notes: skillForm.notes || null,
          status: skillForm.currentStatus,
          dateAchieved: skillForm.currentStatus !== "learning" ? skillForm.currentStatusDate : null,
        }),
      });

      if (response.ok) {
        toast.success("Skill updated");
        setEditSkillDialogOpen(false);
        setEditingSkill(null);
        fetchSkills();
      } else {
        toast.error("Failed to update skill");
      }
    } catch (error) {
      toast.error("Failed to update skill");
    } finally {
      setSavingSkill(false);
    }
  };

  // Format time from seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, GIF, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Read the file and open crop dialog
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setCropDialogOpen(true);
    });
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async () => {
    if (!completedCrop) {
      toast.error("Please select a crop area");
      return;
    }

    setUploadingPicture(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        toast.error("Failed to crop image");
        return;
      }

      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");

      const response = await fetch(`/api/members/${memberId}/profile-picture`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Profile picture updated");
        setCropDialogOpen(false);
        setImageSrc(null);
        fetchMember();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to upload profile picture");
      }
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setZoom(1);
    setRotation(0);
  };

  const handleRemoveProfilePicture = async () => {
    setUploadingPicture(true);
    try {
      const response = await fetch(`/api/members/${memberId}/profile-picture`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Profile picture removed");
        fetchMember();
      } else {
        toast.error("Failed to remove profile picture");
      }
    } catch (error) {
      console.error("Failed to remove profile picture:", error);
      toast.error("Failed to remove profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p>Member not found</p>
        <Button asChild className="mt-4">
          <Link href="/members">Back to Members</Link>
        </Button>
      </div>
    );
  }

  const latestMetrics = member.metrics[0];
  const activeGoals = member.goals.filter(g => g.status === "active");
  const activeLimitations = member.limitations.filter(l => l.active);
  const resolvedLimitations = member.limitations.filter(l => !l.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Profile Picture */}
        <div className="relative group">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
            {member.profilePicture ? (
              <img
                src={member.profilePicture}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          {/* Upload overlay */}
          {/* Upload button */}
          {uploadingPicture ? (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-black/60 rounded-full h-7 w-7 flex items-center justify-center shadow-sm"
            >
              <Camera className="h-3.5 w-3.5 text-white" />
            </button>
          )}
          {/* Remove button (shown when picture exists) */}
          {member.profilePicture && !uploadingPicture && (
            <button
              onClick={handleRemoveProfilePicture}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleProfilePictureChange}
            className="hidden"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{member.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openProfileEdit}
              title="Edit profile"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {member.dateOfBirth && (
              <span>{calculateAge(member.dateOfBirth)} years old</span>
            )}
            {!member.dateOfBirth && (
              <button
                onClick={openProfileEdit}
                className="text-sm text-primary hover:underline"
              >
                + Add birthday
              </button>
            )}
            {member.gender && (
              <>
                <span>•</span>
                <span className="capitalize">{member.gender}</span>
              </>
            )}
            {latestMetrics?.fitnessLevel && (
              <>
                <span>•</span>
                <Badge variant="outline" className="capitalize">
                  {latestMetrics.fitnessLevel}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update basic profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                type="date"
                value={profileForm.dateOfBirth}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={profileForm.gender}
                onValueChange={(value) => setProfileForm({ ...profileForm, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestMetrics?.weight ? `${latestMetrics.weight} lbs` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Height
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestMetrics?.height ? formatHeight(latestMetrics.height) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeGoals.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{member.personalRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maxes">Maxes & Times</TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1">
            Skills
            {skills.filter(s => s.status === "achieved" || s.status === "mastered").length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {skills.filter(s => s.status === "achieved" || s.status === "mastered").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="limitations" className="flex items-center gap-1">
            Limitations
            {activeLimitations.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {activeLimitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            History
            {workoutHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {workoutHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active Limitations Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Active Limitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeLimitations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active limitations</p>
                ) : (
                  <div className="space-y-2">
                    {activeLimitations.slice(0, 3).map((limitation) => (
                      <div key={limitation.id} className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                        <p className="font-medium text-sm">{limitation.description}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{limitation.type}</Badge>
                          {limitation.severity && (
                            <Badge variant="secondary" className="text-xs capitalize">{limitation.severity}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeLimitations.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{activeLimitations.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeGoals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active goals</p>
                ) : (
                  <div className="space-y-2">
                    {activeGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <p className="font-medium text-sm">{goal.title}</p>
                        {goal.targetValue && goal.targetUnit && (
                          <p className="text-xs text-muted-foreground">
                            Target: {goal.targetValue} {goal.targetUnit}
                            {goal.currentValue && ` (Current: ${goal.currentValue})`}
                          </p>
                        )}
                      </div>
                    ))}
                    {activeGoals.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{activeGoals.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent PRs */}
          {member.personalRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Recent Personal Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-3">
                  {member.personalRecords.slice(0, 6).map((pr) => (
                    <div key={pr.id} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{pr.exercise.name}</p>
                      <p className="text-lg font-bold">{pr.value} {pr.unit}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pr.date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Maxes & Times Tab */}
        <TabsContent value="maxes" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Maxes & Running Times</h3>
              <p className="text-sm text-muted-foreground">
                Track lifting maxes and running times. The AI uses this to customize workout recommendations.
              </p>
            </div>
            <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Personal Record</DialogTitle>
                  <DialogDescription>
                    Record a new max lift or running time
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Exercise *</Label>
                    <Select
                      value={prForm.exerciseName}
                      onValueChange={(value) => {
                        // Auto-set unit based on exercise type
                        const liftingEx = LIFTING_EXERCISES.find(ex => ex.name === value);
                        const runningEx = RUNNING_EXERCISES.find(ex => ex.name === value);
                        const unit = liftingEx?.unit || runningEx?.unit || "lbs";
                        setPrForm({ ...prForm, exerciseName: value, unit });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__header_lifts" disabled className="font-semibold">
                          Lifting
                        </SelectItem>
                        {LIFTING_EXERCISES.map((ex) => (
                          <SelectItem key={ex.name} value={ex.name}>
                            {ex.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__header_running" disabled className="font-semibold">
                          Running
                        </SelectItem>
                        {RUNNING_EXERCISES.map((ex) => (
                          <SelectItem key={ex.name} value={ex.name}>
                            {ex.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {prForm.unit === "seconds" ? (
                    <div className="space-y-2">
                      <Label>Time *</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="0"
                            value={prForm.minutes}
                            onChange={(e) => setPrForm({ ...prForm, minutes: e.target.value })}
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">minutes</span>
                        </div>
                        <span className="text-lg font-medium">:</span>
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={prForm.seconds}
                            onChange={(e) => setPrForm({ ...prForm, seconds: e.target.value })}
                            placeholder="00"
                          />
                          <span className="text-xs text-muted-foreground">seconds</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Value *</Label>
                        <Input
                          type="number"
                          value={prForm.value}
                          onChange={(e) => setPrForm({ ...prForm, value: e.target.value })}
                          placeholder={prForm.unit === "reps" ? "Number of reps" : "Weight"}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={prForm.unit}
                          onValueChange={(value) => setPrForm({ ...prForm, unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="reps">reps</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {prForm.unit !== "seconds" && prForm.unit !== "reps" && (
                    <div className="space-y-2">
                      <Label>Rep Max</Label>
                      <Select
                        value={prForm.repMax}
                        onValueChange={(value) => setPrForm({ ...prForm, repMax: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1RM (One Rep Max)</SelectItem>
                          <SelectItem value="3">3RM</SelectItem>
                          <SelectItem value="5">5RM</SelectItem>
                          <SelectItem value="10">10RM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Record Type</Label>
                    <Select
                      value={prForm.recordType}
                      onValueChange={(value: "all_time" | "current") => setPrForm({ ...prForm, recordType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current (assessed ability now)</SelectItem>
                        <SelectItem value="all_time">All-Time Best (lifetime PR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={prForm.date}
                        onChange={(e) => setPrForm({ ...prForm, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={prForm.estimatedDate}
                          onChange={(e) => setPrForm({ ...prForm, estimatedDate: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-muted-foreground">Estimated date</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setPrDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPr} disabled={savingPr}>
                      {savingPr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Record
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lifting Maxes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Lifting Maxes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const liftingPRs = member.personalRecords.filter(pr =>
                  LIFTING_EXERCISES.some(ex => ex.name.toLowerCase() === pr.exercise.name.toLowerCase())
                );

                if (liftingPRs.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">No lifting maxes recorded yet</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {LIFTING_EXERCISES.map((ex) => (
                          <Button
                            key={ex.name}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPrForm({
                                exerciseName: ex.name,
                                value: "",
                                minutes: "",
                                seconds: "",
                                unit: ex.unit,
                                repMax: "1",
                                recordType: "current",
                                date: new Date().toISOString().split("T")[0],
                                estimatedDate: false,
                              });
                              setPrDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            {ex.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Group PRs by exercise and type
                const prsByExercise = new Map<string, { allTime?: PersonalRecord; current?: PersonalRecord }>();
                liftingPRs.forEach(pr => {
                  const key = pr.exercise.name.toLowerCase();
                  if (!prsByExercise.has(key)) {
                    prsByExercise.set(key, {});
                  }
                  const existing = prsByExercise.get(key)!;
                  const type = pr.recordType || "current";
                  if (type === "all_time") {
                    if (!existing.allTime || pr.value > existing.allTime.value) {
                      existing.allTime = pr;
                    }
                  } else {
                    if (!existing.current || pr.value > existing.current.value) {
                      existing.current = pr;
                    }
                  }
                });

                return (
                  <div className="grid gap-4 md:grid-cols-3">
                    {LIFTING_EXERCISES.map((ex) => {
                      const prs = prsByExercise.get(ex.name.toLowerCase());
                      const allTime = prs?.allTime;
                      const current = prs?.current;
                      const hasAny = allTime || current;

                      return (
                        <div key={ex.name} className="p-4 border rounded-lg relative group">
                          <p className="font-medium text-sm text-muted-foreground mb-2">{ex.name}</p>
                          {hasAny ? (
                            <div className="space-y-3">
                              {/* All-Time Best */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Trophy className="h-3 w-3 text-yellow-500" />
                                    All-Time
                                  </p>
                                  {allTime ? (
                                    <>
                                      <p className="text-lg font-bold">
                                        {allTime.value} <span className="text-xs font-normal">{allTime.unit}</span>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(allTime.date).toLocaleDateString()}
                                        {allTime.estimatedDate && " (est.)"}
                                      </p>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setPrForm({
                                          exerciseName: ex.name,
                                          value: "",
                                          minutes: "",
                                          seconds: "",
                                          unit: ex.unit,
                                          repMax: "1",
                                          recordType: "all_time",
                                          date: new Date().toISOString().split("T")[0],
                                          estimatedDate: true,
                                        });
                                        setPrDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                                {allTime && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground"
                                    onClick={() => handleDeletePr(allTime.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>

                              {/* Current */}
                              <div className="flex items-start justify-between border-t pt-2">
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Activity className="h-3 w-3 text-blue-500" />
                                    Current
                                  </p>
                                  {current ? (
                                    <>
                                      <p className="text-lg font-bold">
                                        {current.value} <span className="text-xs font-normal">{current.unit}</span>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(current.date).toLocaleDateString()}
                                      </p>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setPrForm({
                                          exerciseName: ex.name,
                                          value: "",
                                          minutes: "",
                                          seconds: "",
                                          unit: ex.unit,
                                          repMax: "1",
                                          recordType: "current",
                                          date: new Date().toISOString().split("T")[0],
                                          estimatedDate: false,
                                        });
                                        setPrDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                                {current && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground"
                                    onClick={() => handleDeletePr(current.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setPrForm({
                                  exerciseName: ex.name,
                                  value: "",
                                  minutes: "",
                                  seconds: "",
                                  unit: ex.unit,
                                  repMax: "1",
                                  recordType: "current",
                                  date: new Date().toISOString().split("T")[0],
                                  estimatedDate: false,
                                });
                                setPrDialogOpen(true);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Running Times Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Running Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const runningPRs = member.personalRecords.filter(pr =>
                  RUNNING_EXERCISES.some(ex => ex.name.toLowerCase() === pr.exercise.name.toLowerCase())
                );

                if (runningPRs.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">No running times recorded yet</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {RUNNING_EXERCISES.map((ex) => (
                          <Button
                            key={ex.name}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPrForm({
                                exerciseName: ex.name,
                                value: "",
                                minutes: "",
                                seconds: "",
                                unit: "seconds",
                                repMax: "1",
                                recordType: "current",
                                date: new Date().toISOString().split("T")[0],
                                estimatedDate: false,
                              });
                              setPrDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            {ex.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Group PRs by exercise and type (for running, lower is better)
                const prsByExercise = new Map<string, { allTime?: PersonalRecord; current?: PersonalRecord }>();
                runningPRs.forEach(pr => {
                  const key = pr.exercise.name.toLowerCase();
                  if (!prsByExercise.has(key)) {
                    prsByExercise.set(key, {});
                  }
                  const existing = prsByExercise.get(key)!;
                  const type = pr.recordType || "current";
                  if (type === "all_time") {
                    if (!existing.allTime || pr.value < existing.allTime.value) {
                      existing.allTime = pr;
                    }
                  } else {
                    if (!existing.current || pr.value < existing.current.value) {
                      existing.current = pr;
                    }
                  }
                });

                return (
                  <div className="grid gap-4 md:grid-cols-4">
                    {RUNNING_EXERCISES.map((ex) => {
                      const prs = prsByExercise.get(ex.name.toLowerCase());
                      const allTime = prs?.allTime;
                      const current = prs?.current;
                      const hasAny = allTime || current;

                      return (
                        <div key={ex.name} className="p-4 border rounded-lg relative group">
                          <p className="font-medium text-sm text-muted-foreground mb-2">{ex.name}</p>
                          {hasAny ? (
                            <div className="space-y-3">
                              {/* All-Time Best */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Trophy className="h-3 w-3 text-yellow-500" />
                                    All-Time
                                  </p>
                                  {allTime ? (
                                    <>
                                      <p className="text-lg font-bold">{formatTime(allTime.value)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(allTime.date).toLocaleDateString()}
                                        {allTime.estimatedDate && " (est.)"}
                                      </p>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setPrForm({
                                          exerciseName: ex.name,
                                          value: "",
                                          minutes: "",
                                          seconds: "",
                                          unit: "seconds",
                                          repMax: "1",
                                          recordType: "all_time",
                                          date: new Date().toISOString().split("T")[0],
                                          estimatedDate: true,
                                        });
                                        setPrDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                                {allTime && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground"
                                    onClick={() => handleDeletePr(allTime.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>

                              {/* Current */}
                              <div className="flex items-start justify-between border-t pt-2">
                                <div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Activity className="h-3 w-3 text-blue-500" />
                                    Current
                                  </p>
                                  {current ? (
                                    <>
                                      <p className="text-lg font-bold">{formatTime(current.value)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(current.date).toLocaleDateString()}
                                      </p>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setPrForm({
                                          exerciseName: ex.name,
                                          value: "",
                                          minutes: "",
                                          seconds: "",
                                          unit: "seconds",
                                          repMax: "1",
                                          recordType: "current",
                                          date: new Date().toISOString().split("T")[0],
                                          estimatedDate: false,
                                        });
                                        setPrDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                                {current && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground"
                                    onClick={() => handleDeletePr(current.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setPrForm({
                                  exerciseName: ex.name,
                                  value: "",
                                  minutes: "",
                                  seconds: "",
                                  unit: "seconds",
                                  repMax: "1",
                                  recordType: "current",
                                  date: new Date().toISOString().split("T")[0],
                                  estimatedDate: false,
                                });
                                setPrDialogOpen(true);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Skills & Achievements</h3>
              <p className="text-sm text-muted-foreground">
                Track gymnastics, calisthenics, and athletic skills. The AI will factor these into workout plans.
              </p>
            </div>
            <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Skill</DialogTitle>
                  <DialogDescription>
                    Track a skill you&apos;re learning or have achieved
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Skill Name *</Label>
                    <div className="space-y-2">
                      <Input
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                        placeholder="e.g., Back Tuck"
                      />
                      <div className="flex flex-wrap gap-1">
                        {COMMON_SKILLS.filter(s => !skills.some(sk => sk.name.toLowerCase() === s.toLowerCase())).slice(0, 6).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => setSkillForm({ ...skillForm, name: skill })}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={skillForm.category}
                      onValueChange={(value) => setSkillForm({ ...skillForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Status */}
                  <div className="p-3 border rounded-lg space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Current Ability</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={skillForm.currentStatus}
                          onValueChange={(value) => setSkillForm({ ...skillForm, currentStatus: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_STATUS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={skillForm.currentStatusDate}
                          onChange={(e) => setSkillForm({ ...skillForm, currentStatusDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* All-Time Best */}
                  <div className="p-3 border rounded-lg space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">All-Time Best (optional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Best Status</Label>
                        <Select
                          value={skillForm.allTimeBestStatus}
                          onValueChange={(value) => setSkillForm({ ...skillForm, allTimeBestStatus: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_STATUS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={skillForm.allTimeBestDate}
                          onChange={(e) => setSkillForm({ ...skillForm, allTimeBestDate: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={skillForm.notes}
                      onChange={(e) => setSkillForm({ ...skillForm, notes: e.target.value })}
                      placeholder="Any notes about progress or technique..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSkill} disabled={savingSkill}>
                      {savingSkill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Skill
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {skills.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No skills tracked yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add skills like back tuck, handstand, or muscle-up
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {COMMON_SKILLS.slice(0, 4).map((skill) => (
                    <Button
                      key={skill}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSkillForm({ ...skillForm, name: skill });
                        setSkillDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {skill}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Mastered Skills */}
              {skills.filter(s => s.status === "mastered").length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Mastered ({skills.filter(s => s.status === "mastered").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {skills.filter(s => s.status === "mastered").map((skill) => (
                        <div key={skill.id} className="flex items-center justify-between p-2 border rounded-lg group bg-yellow-500/5 border-yellow-500/20">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <div>
                              <p className="font-medium">{skill.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {skill.dateAchieved && (
                                  <span>Achieved {new Date(skill.dateAchieved).toLocaleDateString()}</span>
                                )}
                                {skill.notes && (
                                  <>
                                    {skill.dateAchieved && <span>•</span>}
                                    <span className="italic">{skill.notes}</span>
                                  </>
                                )}
                                {!skill.dateAchieved && !skill.notes && (
                                  <span className="text-muted-foreground/50">No details added</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openSkillEdit(skill)}
                              title="Edit skill"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteSkill(skill.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Achieved Skills */}
              {skills.filter(s => s.status === "achieved").length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Achieved ({skills.filter(s => s.status === "achieved").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {skills.filter(s => s.status === "achieved").map((skill) => (
                        <div key={skill.id} className="flex items-center justify-between p-2 border rounded-lg group">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="font-medium">{skill.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {skill.dateAchieved && (
                                  <span>Achieved {new Date(skill.dateAchieved).toLocaleDateString()}</span>
                                )}
                                {skill.notes && (
                                  <>
                                    {skill.dateAchieved && <span>•</span>}
                                    <span className="italic">{skill.notes}</span>
                                  </>
                                )}
                                {!skill.dateAchieved && !skill.notes && (
                                  <span className="text-muted-foreground/50">No details added</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => handleUpdateSkillStatus(skill.id, "mastered")}
                              title="Mark as mastered"
                            >
                              <Trophy className="mr-1 h-3 w-3 text-yellow-500" />
                              Mastered
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openSkillEdit(skill)}
                              title="Edit skill"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => handleDeleteSkill(skill.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Learning Skills - also update to match */}
              {skills.filter(s => s.status === "learning").length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-500" />
                      Learning ({skills.filter(s => s.status === "learning").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {skills.filter(s => s.status === "learning").map((skill) => (
                        <div key={skill.id} className="flex items-center justify-between p-2 border rounded-lg group">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium">{skill.name}</p>
                              {skill.notes && (
                                <p className="text-xs text-muted-foreground italic">{skill.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateSkillStatus(skill.id, "achieved")}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Achieved
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => openSkillEdit(skill)}
                              title="Edit skill"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => handleDeleteSkill(skill.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Edit Skill Dialog */}
          <Dialog open={editSkillDialogOpen} onOpenChange={setEditSkillDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Skill</DialogTitle>
                <DialogDescription>
                  Update skill details and status
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Skill Name *</Label>
                  <Input
                    value={skillForm.name}
                    onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                    placeholder="e.g., Back Tuck"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={skillForm.category}
                    onValueChange={(value) => setSkillForm({ ...skillForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Status */}
                <div className="p-3 border rounded-lg space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Current Ability</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={skillForm.currentStatus}
                        onValueChange={(value) => setSkillForm({ ...skillForm, currentStatus: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_STATUS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={skillForm.currentStatusDate}
                        onChange={(e) => setSkillForm({ ...skillForm, currentStatusDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={skillForm.notes}
                    onChange={(e) => setSkillForm({ ...skillForm, notes: e.target.value })}
                    placeholder="Any notes about progress or technique..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditSkillDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateSkill} disabled={savingSkill}>
                    {savingSkill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Limitations Tab */}
        <TabsContent value="limitations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Injuries & Limitations</h3>
              <p className="text-sm text-muted-foreground">
                Track injuries, medical conditions, and exercise preferences. The AI will consider these when generating workouts.
              </p>
            </div>
            <Dialog open={limitationDialogOpen} onOpenChange={setLimitationDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Limitation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Limitation</DialogTitle>
                  <DialogDescription>
                    Record an injury, condition, or preference that should be considered during workouts.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={limitationForm.type}
                      onValueChange={(value) => setLimitationForm({ ...limitationForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIMITATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={limitationForm.description}
                      onChange={(e) => setLimitationForm({ ...limitationForm, description: e.target.value })}
                      placeholder="e.g., Rotator cuff injury from last year, still sensitive with overhead movements"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Affected Areas</Label>
                    <div className="flex flex-wrap gap-1">
                      {BODY_PARTS.map((area) => (
                        <Badge
                          key={area}
                          variant={limitationForm.affectedAreas.includes(area) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => toggleAffectedArea(area)}
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={limitationForm.severity}
                      onValueChange={(value) => setLimitationForm({ ...limitationForm, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setLimitationDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddLimitation} disabled={savingLimitation}>
                      {savingLimitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Limitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Limitations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Limitations</CardTitle>
            </CardHeader>
            <CardContent>
              {activeLimitations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No active limitations. Add one if {member.name} has any injuries or conditions to consider.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeLimitations.map((limitation) => (
                    <div key={limitation.id} className="p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{limitation.description}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="outline" className="capitalize">{limitation.type}</Badge>
                            {limitation.severity && (
                              <Badge
                                variant="secondary"
                                className={`capitalize ${
                                  limitation.severity === "severe"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : limitation.severity === "moderate"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    : ""
                                }`}
                              >
                                {limitation.severity}
                              </Badge>
                            )}
                            {limitation.affectedAreas?.map((area) => (
                              <Badge key={area} variant="secondary" className="capitalize text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleLimitation(limitation)}
                          >
                            Mark Resolved
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Limitation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this limitation record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLimitation(limitation.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved Limitations */}
          {resolvedLimitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Resolved Limitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resolvedLimitations.map((limitation) => (
                    <div key={limitation.id} className="p-3 border rounded-lg opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm line-through">{limitation.description}</p>
                          <Badge variant="outline" className="text-xs capitalize mt-1">{limitation.type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleLimitation(limitation)}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Goals</h3>
              <p className="text-sm text-muted-foreground">
                Set fitness goals to help the AI create personalized workouts
              </p>
            </div>
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Goal</DialogTitle>
                  <DialogDescription>
                    Create a new fitness goal for {member.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Goal Title *</Label>
                    <Input
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      placeholder="e.g., Bench press 200 lbs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={goalForm.category}
                        onValueChange={(value) => setGoalForm({ ...goalForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Input
                        type="date"
                        value={goalForm.targetDate}
                        onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={goalForm.targetValue}
                        onChange={(e) => setGoalForm({ ...goalForm, targetValue: e.target.value })}
                        placeholder="e.g., 200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        value={goalForm.targetUnit}
                        onChange={(e) => setGoalForm({ ...goalForm, targetUnit: e.target.value })}
                        placeholder="e.g., lbs, miles"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={goalForm.description}
                      onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                      placeholder="Optional details about this goal..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddGoal} disabled={savingGoal}>
                      {savingGoal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Goal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {member.goals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No goals yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Goals help the AI create personalized workout plans
                </p>
                <Button className="mt-4" onClick={() => setGoalDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {member.goals.map((goal) => (
                <Card key={goal.id} className={goal.status !== "active" ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{goal.title}</h4>
                          <Badge variant={goal.status === "active" ? "default" : "secondary"} className="capitalize">
                            {goal.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{goal.category}</Badge>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                        )}
                        {goal.targetValue && goal.targetUnit && (
                          <div className="mt-2">
                            <p className="text-sm">
                              Target: <strong>{goal.targetValue} {goal.targetUnit}</strong>
                              {goal.currentValue && (
                                <span className="text-muted-foreground"> (Current: {goal.currentValue})</span>
                              )}
                            </p>
                            {goal.currentValue && goal.targetValue && (
                              <div className="w-full bg-muted rounded-full h-2 mt-2 max-w-xs">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${Math.min((goal.currentValue / goal.targetValue) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {goal.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateGoalStatus(goal.id, "completed")}
                          >
                            Complete
                          </Button>
                        )}
                        {goal.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateGoalStatus(goal.id, "active")}
                          >
                            Reactivate
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this goal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Metrics History Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Metrics History</h3>
            <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Metrics
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Log New Metrics</DialogTitle>
                  <DialogDescription>Record current measurements</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (lbs)</Label>
                      <Input
                        type="number"
                        value={metricsForm.weight}
                        onChange={(e) => setMetricsForm({ ...metricsForm, weight: e.target.value })}
                        placeholder={latestMetrics?.weight?.toString() || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (inches)</Label>
                      <Input
                        type="number"
                        value={metricsForm.height}
                        onChange={(e) => setMetricsForm({ ...metricsForm, height: e.target.value })}
                        placeholder={latestMetrics?.height?.toString() || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fitness Level</Label>
                      <Select
                        value={metricsForm.fitnessLevel}
                        onValueChange={(value) => setMetricsForm({ ...metricsForm, fitnessLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="elite">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/30">
                    <BodyFatSelector
                      value={metricsForm.bodyFatPercentage}
                      onChange={(value) => setMetricsForm({ ...metricsForm, bodyFatPercentage: value })}
                      gender={member?.gender}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={metricsForm.notes}
                      onChange={(e) => setMetricsForm({ ...metricsForm, notes: e.target.value })}
                      placeholder="Any notes about this measurement..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setMetricsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMetrics} disabled={savingMetrics}>
                      {savingMetrics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Metrics
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {member.metrics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No metrics recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {member.metrics.map((metric) => (
                <Card key={metric.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(metric.date).toLocaleDateString()}
                        </div>
                        <div className="flex gap-4">
                          {metric.weight && (
                            <div>
                              <span className="text-muted-foreground text-sm">Weight:</span>{" "}
                              <strong>{metric.weight} lbs</strong>
                            </div>
                          )}
                          {metric.height && (
                            <div>
                              <span className="text-muted-foreground text-sm">Height:</span>{" "}
                              <strong>{formatHeight(metric.height)}</strong>
                            </div>
                          )}
                          {metric.bodyFatPercentage && (
                            <div>
                              <span className="text-muted-foreground text-sm">Body Fat:</span>{" "}
                              <strong>{metric.bodyFatPercentage}%</strong>
                            </div>
                          )}
                          {metric.fitnessLevel && (
                            <Badge variant="outline" className="capitalize">{metric.fitnessLevel}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditMetricDialog(metric)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteMetric(metric.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {metric.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{metric.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Metric Dialog */}
          <Dialog open={editMetricDialogOpen} onOpenChange={setEditMetricDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Metric</DialogTitle>
                <DialogDescription>Update this measurement</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editMetricForm.date}
                      onChange={(e) => setEditMetricForm({ ...editMetricForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (lbs)</Label>
                    <Input
                      type="number"
                      value={editMetricForm.weight}
                      onChange={(e) => setEditMetricForm({ ...editMetricForm, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (inches)</Label>
                    <Input
                      type="number"
                      value={editMetricForm.height}
                      onChange={(e) => setEditMetricForm({ ...editMetricForm, height: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fitness Level</Label>
                    <Select
                      value={editMetricForm.fitnessLevel}
                      onValueChange={(value) => setEditMetricForm({ ...editMetricForm, fitnessLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/30">
                  <BodyFatSelector
                    value={editMetricForm.bodyFatPercentage}
                    onChange={(value) => setEditMetricForm({ ...editMetricForm, bodyFatPercentage: value })}
                    gender={member?.gender}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editMetricForm.notes}
                    onChange={(e) => setEditMetricForm({ ...editMetricForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMetricDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateMetric} disabled={savingMetrics}>
                    {savingMetrics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Workout History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Workout History
                </CardTitle>
                <CardDescription>
                  Past workout sessions and performance data
                </CardDescription>
              </div>
              <Link href="/workouts">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Workout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No workouts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking workouts to build your history
                  </p>
                  <Link href="/workouts">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Start First Workout
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {workoutHistory.map((workout) => {
                    const duration = workout.startTime && workout.endTime
                      ? Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60000)
                      : null;

                    return (
                      <Card key={workout.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{workout.name}</h4>
                                <Badge
                                  variant={
                                    workout.status === "completed" ? "default" :
                                    workout.status === "in_progress" ? "secondary" :
                                    workout.status === "skipped" ? "destructive" :
                                    "outline"
                                  }
                                  className="capitalize"
                                >
                                  {workout.status.replace("_", " ")}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(workout.date).toLocaleDateString()}
                                </span>
                                {duration && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-4 w-4" />
                                    {duration} min
                                  </span>
                                )}
                                {workout.rating && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    {workout.rating}/5
                                  </span>
                                )}
                              </div>
                              {workout.exercises.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">
                                    {workout.exercises.length} exercises
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {workout.exercises.slice(0, 5).map((ex, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {ex.name}
                                        {ex.maxWeight > 0 && ` • ${ex.maxWeight}lbs`}
                                        {ex.setsCompleted > 0 && ` • ${ex.setsCompleted} sets`}
                                      </Badge>
                                    ))}
                                    {workout.exercises.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{workout.exercises.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              {workout.notes && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  "{workout.notes}"
                                </p>
                              )}
                            </div>
                            <Link href={`/workouts/session/${workout.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
            <DialogDescription>
              Drag to reposition and resize the crop area. Use the controls below to zoom and rotate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {imageSrc && (
              <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 300 }}>
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-h-[400px]"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{
                      maxHeight: 400,
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                </ReactCrop>
              </div>
            )}

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotation
                </Label>
                <span className="text-sm text-muted-foreground">{rotation}°</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => r - 90)}
                >
                  -90°
                </Button>
                <Slider
                  value={[rotation]}
                  onValueChange={([value]) => setRotation(value)}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => r + 90)}
                >
                  +90°
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCropCancel}>
                Cancel
              </Button>
              <Button onClick={handleCropComplete} disabled={uploadingPicture || !completedCrop}>
                {uploadingPicture && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
