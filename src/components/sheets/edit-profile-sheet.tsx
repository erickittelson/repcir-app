"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Camera,
  X,
  Loader2,
  Globe,
  Users,
  Lock,
  ImagePlus,
  MapPin,
  Building2,
  TreePine,
  Home,
  Dumbbell,
  CircleHelp,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Circle {
  id: string;
  name: string;
  imageUrl?: string;
}

interface GalleryPhoto {
  id: string;
  url: string;
  visibility: "public" | "circles" | "private";
  visibleToCircles?: string[]; // Circle IDs that can see this photo
  caption?: string;
  uploadedAt: string;
}

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    displayName?: string;
    profilePicture?: string;
    birthMonth?: number;
    birthYear?: number;
    city?: string;
    state?: string;
    country?: string;
    workoutLocation?: string;
    workoutLocationAddress?: string;
    workoutLocationType?: string;
    locationVisibility?: string;
    visibility?: string;
    galleryPhotos?: GalleryPhoto[];
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  circles?: Circle[];
  onSave: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe, description: "Everyone can see" },
  { value: "circles", label: "Rallies", icon: Users, description: "Selected circles" },
  { value: "private", label: "Private", icon: Lock, description: "Only you" },
];

const MAX_GALLERY_PHOTOS = 5;

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington, D.C." },
];

const WORKOUT_LOCATION_TYPES = [
  { value: "gym", label: "Gym", icon: Dumbbell },
  { value: "park", label: "Park", icon: TreePine },
  { value: "studio", label: "Studio", icon: Building2 },
  { value: "home_gym", label: "Home Gym", icon: Home },
  { value: "other", label: "Other", icon: CircleHelp },
];

const LOCATION_VISIBILITY_OPTIONS = [
  { value: "none", label: "No one", description: "Location hidden from everyone" },
  { value: "state", label: "State only", description: "Shows \"Texas\"" },
  { value: "city", label: "City & State", description: "Shows \"Austin, TX\"" },
  { value: "full", label: "Full details", description: "Shows workout location name too" },
];

export function EditProfileSheet({
  open,
  onOpenChange,
  profile,
  user,
  circles = [],
  onSave,
}: EditProfileSheetProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [userCircles, setUserCircles] = useState<Circle[]>(circles);
  const [loadingCircles, setLoadingCircles] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState(profile?.displayName || user.name);
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [country, _setCountry] = useState(profile?.country || "US");
  const [birthMonth, setBirthMonth] = useState(profile?.birthMonth?.toString() || "");
  const [birthYear, setBirthYear] = useState(profile?.birthYear?.toString() || "");
  const [profilePicture, setProfilePicture] = useState(profile?.profilePicture || user.image || "");
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(
    profile?.galleryPhotos || []
  );

  // Location fields
  const [showWorkoutSpot, setShowWorkoutSpot] = useState(!!profile?.workoutLocation);
  const [workoutLocation, setWorkoutLocation] = useState(profile?.workoutLocation || "");
  const [workoutLocationAddress, setWorkoutLocationAddress] = useState(profile?.workoutLocationAddress || "");
  const [workoutLocationType, setWorkoutLocationType] = useState(profile?.workoutLocationType || "gym");
  const [locationVisibility, setLocationVisibility] = useState(profile?.locationVisibility || "city");
  
  const profileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Sync circles prop to state
  useEffect(() => {
    if (circles.length > 0) {
      setUserCircles(circles);
    }
  }, [circles]);
  
  // Fetch user's circles when sheet opens
  useEffect(() => {
    if (open && userCircles.length === 0) {
      setLoadingCircles(true);
      fetch("/api/circles")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setUserCircles(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCircles(false));
    }
  }, [open, userCircles.length]);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile");

      const response = await fetch("/api/user/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      setProfilePicture(url);
      toast.success("Profile picture updated");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (galleryPhotos.length >= MAX_GALLERY_PHOTOS) {
      toast.error(`You can only have ${MAX_GALLERY_PHOTOS} gallery photos`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingGallery(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "gallery");

      const response = await fetch("/api/user/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      
      const newPhoto: GalleryPhoto = {
        id: crypto.randomUUID(),
        url,
        visibility: "circles",
        visibleToCircles: userCircles.map(c => c.id), // Default to all circles
        uploadedAt: new Date().toISOString(),
      };
      
      setGalleryPhotos([...galleryPhotos, newPhoto]);
      toast.success("Photo added to gallery");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryPhoto = (photoId: string) => {
    setGalleryPhotos(galleryPhotos.filter((p) => p.id !== photoId));
  };

  const handlePhotoVisibilityChange = (photoId: string, visibility: "public" | "circles" | "private") => {
    setGalleryPhotos(
      galleryPhotos.map((p) =>
        p.id === photoId ? { 
          ...p, 
          visibility,
          // If switching to circles, default to all circles if none selected
          visibleToCircles: visibility === "circles" && (!p.visibleToCircles || p.visibleToCircles.length === 0) 
            ? userCircles.map(c => c.id) 
            : p.visibleToCircles 
        } : p
      )
    );
  };
  
  const handlePhotoCircleToggle = (photoId: string, circleId: string, checked: boolean) => {
    setGalleryPhotos(
      galleryPhotos.map((p) => {
        if (p.id !== photoId) return p;
        const currentCircles = p.visibleToCircles || [];
        const newCircles = checked
          ? [...currentCircles, circleId]
          : currentCircles.filter(id => id !== circleId);
        return { ...p, visibleToCircles: newCircles };
      })
    );
  };

  const handleSave = async () => {
    // Validate: if city is entered, state is required
    if (city && !state) {
      toast.error("Please select a state");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          city,
          state,
          country,
          birthMonth: birthMonth ? parseInt(birthMonth) : null,
          birthYear: birthYear ? parseInt(birthYear) : null,
          profilePicture,
          galleryPhotos,
          // Location fields
          workoutLocation: showWorkoutSpot ? workoutLocation : null,
          workoutLocationAddress: showWorkoutSpot ? workoutLocationAddress : null,
          workoutLocationType: showWorkoutSpot ? workoutLocationType : null,
          locationVisibility,
        }),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      toast.success("Profile saved");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public": return <Globe className="h-3 w-3" />;
      case "circles": return <Users className="h-3 w-3" />;
      case "private": return <Lock className="h-3 w-3" />;
      default: return <Globe className="h-3 w-3" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <SheetHeader>
            <SheetTitle className="text-xl">Edit Profile</SheetTitle>
            <SheetDescription>
              Update your profile information and photos
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content - use overflow-y-auto instead of ScrollArea */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 max-w-lg mx-auto space-y-8">
            {/* Profile Picture Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Profile Picture
              </h3>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback className="text-xl bg-brand/20 text-brand">
                      {displayName?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => profileInputRef.current?.click()}
                    disabled={uploadingProfile}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </section>

            {/* Gallery Photos Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Gallery Photos
                </h3>
                <Badge variant="outline" className="text-xs">
                  {galleryPhotos.length}/{MAX_GALLERY_PHOTOS}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Add up to {MAX_GALLERY_PHOTOS} photos with individual privacy controls.
              </p>
              
              {/* Photo List - Better layout for visibility controls */}
              <div className="space-y-3">
                {galleryPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    {/* Photo thumbnail */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={photo.url}
                        alt="Gallery photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Visibility controls */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={photo.visibility}
                          onValueChange={(v) => handlePhotoVisibilityChange(photo.id, v as "public" | "circles" | "private")}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VISIBILITY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.icon className="h-3 w-3" />
                                  <span>{opt.label}</span>
                                  <span className="text-xs text-muted-foreground">- {opt.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => handleRemoveGalleryPhoto(photo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Rally selection when visibility is "circles" */}
                      {photo.visibility === "circles" && (
                        <div className="space-y-2">
                          {loadingCircles ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading circles...
                            </div>
                          ) : userCircles.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              You&apos;re not in any circles yet
                            </p>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {photo.visibleToCircles?.length || 0} of {userCircles.length} selected
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => {
                                    const allIds = userCircles.map(c => c.id);
                                    const allSelected = photo.visibleToCircles?.length === userCircles.length;
                                    setGalleryPhotos(
                                      galleryPhotos.map((p) =>
                                        p.id === photo.id
                                          ? { ...p, visibleToCircles: allSelected ? [] : allIds }
                                          : p
                                      )
                                    );
                                  }}
                                >
                                  {photo.visibleToCircles?.length === userCircles.length ? "Deselect All" : "Select All"}
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {userCircles.map((circle) => {
                                  const isSelected = photo.visibleToCircles?.includes(circle.id) || false;
                                  return (
                                    <button
                                      key={circle.id}
                                      type="button"
                                      onClick={() => handlePhotoCircleToggle(photo.id, circle.id, !isSelected)}
                                      className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                                        isSelected
                                          ? "bg-brand text-white"
                                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                                      )}
                                    >
                                      {circle.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add photo button */}
                {galleryPhotos.length < MAX_GALLERY_PHOTOS && (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className="w-full h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-brand hover:text-brand transition-colors"
                  >
                    {uploadingGallery ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-sm">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryUpload}
                />
              </div>
              
              {/* Visibility Legend */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                    <opt.icon className="h-3 w-3 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <p className="text-muted-foreground text-[10px]">{opt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Basic Info Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Basic Info
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="birthMonth">Birth Month</Label>
                    <Select value={birthMonth} onValueChange={setBirthMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {new Date(0, i).toLocaleString("default", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthYear">Birth Year</Label>
                    <Select value={birthYear} onValueChange={setBirthYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 100 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            {/* Your Location Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Your Location
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City {city && <span className="text-destructive">*</span>}</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Austin, Dallas, Houston..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State {city && <span className="text-destructive">*</span>}</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Workout Spot Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="workout-spot" className="font-medium">Add Workout Spot</Label>
                    <p className="text-xs text-muted-foreground">
                      Share where you typically work out
                    </p>
                  </div>
                  <Switch
                    id="workout-spot"
                    checked={showWorkoutSpot}
                    onCheckedChange={setShowWorkoutSpot}
                  />
                </div>

                {/* Workout Spot Fields */}
                {showWorkoutSpot && (
                  <div className="space-y-4 pl-4 border-l-2 border-brand/30">
                    <div className="space-y-2">
                      <Label htmlFor="workoutLocation">Location Name</Label>
                      <Input
                        id="workoutLocation"
                        value={workoutLocation}
                        onChange={(e) => setWorkoutLocation(e.target.value)}
                        placeholder="e.g., 24 Hour Fitness - Downtown"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workoutLocationAddress">Address (optional)</Label>
                      <Input
                        id="workoutLocationAddress"
                        value={workoutLocationAddress}
                        onChange={(e) => setWorkoutLocationAddress(e.target.value)}
                        placeholder="Start typing to search..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Address autocomplete coming soon
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Location Type</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {WORKOUT_LOCATION_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setWorkoutLocationType(type.value)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
                              workoutLocationType === type.value
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-muted hover:border-brand/50"
                            )}
                          >
                            <type.icon className="h-4 w-4" />
                            <span className="text-[10px] font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Location Privacy Controls */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Who can see your location?
              </h3>

              <RadioGroup
                value={locationVisibility}
                onValueChange={setLocationVisibility}
                className="space-y-2"
              >
                {LOCATION_VISIBILITY_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      locationVisibility === option.value
                        ? "border-brand bg-brand/5"
                        : "border-muted hover:border-brand/50"
                    )}
                    onClick={() => setLocationVisibility(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`visibility-${option.value}`} />
                    <div className="flex-1">
                      <Label
                        htmlFor={`visibility-${option.value}`}
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {/* Safety Warning */}
              <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Safety Reminder
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Only share public workout locations like gyms or parks. Never share your home address for safety.
                  </p>
                </div>
              </div>
            </section>

            {/* Bottom spacer for fixed footer */}
            <div className="h-20" />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t bg-background">
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
