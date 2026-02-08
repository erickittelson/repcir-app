"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Package,
  Loader2,
  MapPin,
  Dumbbell,
  ChevronDown,
  Check,
  Building2,
  Building,
  Home,
  GraduationCap,
  TreePine,
  Plane,
  Zap,
  Sparkles,
  Hotel,
  Shield,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LocationCard,
  LocationTypeSelector,
  type Location,
  type LocationType,
} from "@/components/equipment/location-card";
import {
  EquipmentSelector,
  TemplateSelector,
  type EquipmentItem,
} from "@/components/equipment/equipment-selector";
import {
  HomeGymSetup,
  HOME_EQUIPMENT_TO_CATALOG,
  type EquipmentDetails,
} from "@/components/equipment/home-gym-setup";

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

interface LocationTypeDefault {
  locationType: string;
  equipmentIds: string[];
  description?: string;
  typicalEquipmentCount?: number;
}

export default function EquipmentPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [locationDefaults, setLocationDefaults] = useState<LocationTypeDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<LocationType>("home");
  const [formAddress, setFormAddress] = useState("");
  const [formEquipment, setFormEquipment] = useState<string[]>([]);
  const [hasAppliedTemplate, setHasAppliedTemplate] = useState(false);
  const [homeEquipmentDetails, setHomeEquipmentDetails] = useState<EquipmentDetails>({});
  const [showHomeGymSetup, setShowHomeGymSetup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-apply equipment template when location type changes (for new locations only)
  useEffect(() => {
    if (!editingLocation && locationDefaults.length > 0 && !hasAppliedTemplate) {
      applyTemplateForType(formType);
      setHasAppliedTemplate(true);
    }
  }, [formType, locationDefaults, editingLocation, hasAppliedTemplate]);

  const applyTemplateForType = (type: LocationType) => {
    const defaults = locationDefaults.find((d) => d.locationType === type);
    if (defaults) {
      setFormEquipment(defaults.equipmentIds);
    } else {
      setFormEquipment([]);
    }
  };

  // Handle location type change with template application
  const handleTypeChange = (type: LocationType) => {
    setFormType(type);
    // Only auto-apply if not editing an existing location
    if (!editingLocation) {
      applyTemplateForType(type);
    }
    // Reset home gym setup when type changes
    if (type !== "home") {
      setShowHomeGymSetup(false);
      setHomeEquipmentDetails({});
    }
  };

  // Handle home gym setup completion
  const handleHomeGymComplete = (homeEquipment: string[], details: EquipmentDetails) => {
    // Map home equipment IDs to catalog equipment names
    const catalogEquipmentNames: string[] = [];
    homeEquipment.forEach((id) => {
      const names = HOME_EQUIPMENT_TO_CATALOG[id] || [];
      catalogEquipmentNames.push(...names);
    });

    // Find matching catalog IDs
    const catalogIds = catalog
      .filter((item) =>
        catalogEquipmentNames.some(
          (name) => name.toLowerCase() === item.name.toLowerCase()
        )
      )
      .map((item) => item.id);

    setFormEquipment(catalogIds);
    setHomeEquipmentDetails(details);
    setShowHomeGymSetup(false);
  };

  const fetchData = async () => {
    try {
      const [locationsRes, catalogRes, defaultsRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/equipment/catalog"),
        fetch("/api/locations/defaults"),
      ]);

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData);
      }

      if (catalogRes.ok) {
        const catalogData = await catalogRes.json();
        setCatalog(catalogData);
      }

      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json();
        setLocationDefaults(defaultsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load equipment data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormType("home");
    setFormAddress("");
    setFormEquipment([]);
    setEditingLocation(null);
    setHasAppliedTemplate(false);
    setHomeEquipmentDetails({});
    setShowHomeGymSetup(false);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormName(location.name);
    setFormType(location.type);
    setFormAddress(location.address || "");
    setFormEquipment(location.equipment);
    setHomeEquipmentDetails(location.equipmentDetails || {});
    setShowHomeGymSetup(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    setSaving(true);

    try {
      const url = editingLocation
        ? `/api/locations/${editingLocation.id}`
        : "/api/locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          type: formType,
          address: formAddress || null,
          equipment: formEquipment,
          equipmentDetails: formType === "home" ? homeEquipmentDetails : null,
        }),
      });

      if (response.ok) {
        toast.success(
          editingLocation ? "Location updated" : "Location added"
        );
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save location");
      }
    } catch (error) {
      console.error("Failed to save location:", error);
      toast.error("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/locations/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Location deleted");
        fetchData();
        setDeleteTarget(null);
      } else {
        toast.error("Failed to delete location");
      }
    } catch (error) {
      console.error("Failed to delete location:", error);
      toast.error("Failed to delete location");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Active location updated");
        fetchData();
      } else {
        toast.error("Failed to update active location");
      }
    } catch (error) {
      console.error("Failed to set active location:", error);
      toast.error("Failed to update active location");
    }
  };

  const activeLocation = locations.find((l) => l.isActive);
  const ActiveIcon = activeLocation ? LOCATION_ICONS[activeLocation.type] : MapPin;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipment & Gyms</h1>
          <p className="text-muted-foreground">
            Manage your workout locations and equipment
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Active Location Selector */}
      {locations.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <ActiveIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Location</p>
                  <p className="font-medium">
                    {activeLocation?.name || "No active location"}
                  </p>
                </div>
              </div>
              <Select
                value={activeLocation?.id || ""}
                onValueChange={(id) => handleSetActive(id)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => {
                    const Icon = LOCATION_ICONS[location.type];
                    return (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {location.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No locations yet</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-sm">
              Add your gym locations to help AI create personalized workouts based on your available equipment
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isActive={location.isActive}
              onSetActive={() => handleSetActive(location.id)}
              onEdit={() => openEditDialog(location)}
              onDelete={() => setDeleteTarget(location)}
              equipmentCount={location.equipment.length}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Location Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation 
                ? "Update your location and equipment" 
                : "Select a location type to start with recommended equipment, then customize as needed"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6">
            <form id="location-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
              {/* Location Type */}
              <div className="space-y-3">
                <Label>Location Type</Label>
                <LocationTypeSelector value={formType} onChange={handleTypeChange} />
                {!editingLocation && formEquipment.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pre-populated with {formEquipment.length} typical items for this location type. Review and customize below.
                  </p>
                )}
                {!editingLocation && formEquipment.length === 0 && formType === "custom" && (
                  <p className="text-xs text-muted-foreground">
                    Select your equipment from the list below
                  </p>
                )}
              </div>

              {/* Name & Address */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Home Gym, Planet Fitness"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address (optional)</Label>
                  <Input
                    id="address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="123 Main St..."
                  />
                </div>
              </div>

              {/* Equipment Selection - Show HomeGymSetup for home type */}
              {formType === "home" ? (
                <div className="space-y-3">
                  <Label>Home Gym Equipment</Label>
                  {showHomeGymSetup ? (
                    <div className="border rounded-lg p-4">
                      <HomeGymSetup
                        initialEquipment={[]}
                        initialDetails={homeEquipmentDetails}
                        onComplete={handleHomeGymComplete}
                        onCancel={() => setShowHomeGymSetup(false)}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-auto py-4"
                        onClick={() => setShowHomeGymSetup(true)}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Home className="h-6 w-6 text-brand" />
                          <span className="font-medium">Set Up Home Gym Equipment</span>
                          <span className="text-xs text-muted-foreground">
                            Select equipment and specify weight ranges
                          </span>
                        </div>
                      </Button>

                      {/* Show summary if equipment has been selected */}
                      {formEquipment.length > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {formEquipment.length} items selected
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowHomeGymSetup(true)}
                            >
                              Edit
                            </Button>
                          </div>
                          {homeEquipmentDetails.dumbbells && (
                            <p className="text-xs text-muted-foreground">
                              Dumbbells: up to {homeEquipmentDetails.dumbbells.maxWeight} lbs
                              {homeEquipmentDetails.dumbbells.type === "adjustable" && " (adjustable)"}
                            </p>
                          )}
                          {homeEquipmentDetails.barbell && (
                            <p className="text-xs text-muted-foreground">
                              Barbell: up to {(homeEquipmentDetails.barbell.totalPlateWeight || 0) + 45} lbs total
                            </p>
                          )}
                        </div>
                      )}

                      {/* Still allow manual equipment selection */}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Or select equipment manually:
                        </p>
                        <EquipmentSelector
                          catalog={catalog}
                          selected={formEquipment}
                          onChange={setFormEquipment}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Available Equipment</Label>
                    <TemplateSelector
                      locationType={formType}
                      catalog={catalog}
                      onApply={setFormEquipment}
                    />
                  </div>
                  <EquipmentSelector
                    catalog={catalog}
                    selected={formEquipment}
                    onChange={setFormEquipment}
                  />
                </div>
              )}
            </form>
          </div>

          {/* Fixed footer with actions */}
          <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button form="location-form" type="submit" disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLocation ? "Save Changes" : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name}
        itemType="location"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
