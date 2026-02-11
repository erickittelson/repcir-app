"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Building2,
  GraduationCap,
  TreePine,
  Plane,
  Dumbbell,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  MapPin,
  Zap,
  Sparkles,
  Hotel,
  Shield,
  Building,
  Briefcase,
  Package,
} from "lucide-react";

// Extended location types to support various gym environments
export type LocationType = 
  | "home" 
  | "commercial" 
  | "crossfit" 
  | "boutique"
  | "hotel"
  | "military"
  | "school" 
  | "office"
  | "apartment"
  | "outdoor" 
  | "travel" 
  | "custom";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isActive: boolean;
  equipment: string[];
  equipmentDetails?: {
    dumbbells?: {
      available: boolean;
      type?: "fixed" | "adjustable" | "both";
      maxWeight?: number;
      weights?: number[];
    };
    barbell?: {
      available: boolean;
      type?: "standard" | "olympic";
      barWeight?: number;
      plates?: number[];
      totalPlateWeight?: number;
    };
  } | null;
  createdAt: string;
}

interface LocationCardProps {
  location: Location;
  onEdit: () => void;
  onDelete: () => void;
  equipmentCount: number;
}

const LOCATION_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  commercial: Building2,
  crossfit: Zap,
  boutique: Sparkles,
  hotel: Hotel,
  military: Shield,
  school: GraduationCap,
  office: Briefcase,
  apartment: Building,
  outdoor: TreePine,
  travel: Plane,
  custom: Package,
};

const LOCATION_LABELS: Record<LocationType, string> = {
  home: "Home Gym",
  commercial: "Commercial Gym",
  crossfit: "CrossFit Box",
  boutique: "Boutique Gym",
  hotel: "Hotel Gym",
  military: "Military Gym",
  school: "School/University",
  office: "Office Gym",
  apartment: "Apartment Gym",
  outdoor: "Outdoor",
  travel: "Travel Kit",
  custom: "Custom",
};

// Extended location descriptions for onboarding/selection
export const LOCATION_DESCRIPTIONS: Record<LocationType, string> = {
  home: "Your personal home gym setup",
  commercial: "24 Hour Fitness, LA Fitness, Planet Fitness, etc.",
  crossfit: "CrossFit box or functional fitness gym",
  boutique: "Orangetheory, F45, Barry's, SoulCycle, etc.",
  hotel: "Hotel or travel accommodation gym",
  military: "Military base fitness center",
  school: "School, college, or university gym",
  office: "Workplace or corporate fitness center",
  apartment: "Apartment complex gym",
  outdoor: "Park, beach, or outdoor training area",
  travel: "Minimal equipment for travel",
  custom: "Other or custom setup",
};

export function LocationCard({
  location,
  onEdit,
  onDelete,
  equipmentCount,
}: LocationCardProps) {
  const Icon = LOCATION_ICONS[location.type] || Dumbbell;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">
                {location.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {LOCATION_LABELS[location.type]}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Location
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {location.address && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-3 w-3" />
            {location.address}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {equipmentCount} {equipmentCount === 1 ? "item" : "items"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function LocationTypeSelector({
  value,
  onChange,
  compact = false,
}: {
  value: LocationType;
  onChange: (type: LocationType) => void;
  compact?: boolean;
}) {
  // Group types for better organization
  const gymTypes: LocationType[] = ["commercial", "crossfit", "boutique", "military"];
  const facilityTypes: LocationType[] = ["school", "office", "apartment", "hotel"];
  const otherTypes: LocationType[] = ["home", "outdoor", "travel", "custom"];
  
  const allTypes: LocationType[] = compact 
    ? ["home", "commercial", "crossfit", "outdoor", "travel", "custom"]
    : [...gymTypes, ...facilityTypes, ...otherTypes];

  return (
    <div className="space-y-4">
      {!compact && (
        <>
          {/* Gym Types */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">Gyms</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {gymTypes.map((type) => {
                const Icon = LOCATION_ICONS[type];
                const isSelected = value === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange(type)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs text-center ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {LOCATION_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facility Types */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">Facilities</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {facilityTypes.map((type) => {
                const Icon = LOCATION_ICONS[type];
                const isSelected = value === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange(type)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs text-center ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {LOCATION_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Types */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase font-medium">Other</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {otherTypes.map((type) => {
                const Icon = LOCATION_ICONS[type];
                const isSelected = value === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange(type)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs text-center ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {LOCATION_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {compact && (
        <div className="grid grid-cols-3 gap-2">
          {allTypes.map((type) => {
            const Icon = LOCATION_ICONS[type];
            const isSelected = value === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChange(type)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs text-center ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {LOCATION_LABELS[type]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
