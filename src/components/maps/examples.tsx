"use client";

/**
 * Example usage of map components with dynamic imports.
 * This file shows the recommended patterns for using the map components.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { LocationValue } from "./types";

// Loading component for maps
const MapLoader = () => (
  <div className="flex items-center justify-center h-[300px] bg-card rounded-lg border border-border">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

// Dynamic import of LocationPicker (SSR disabled - Leaflet needs window)
const LocationPicker = dynamic(
  () => import("./location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: MapLoader,
  }
);

// Dynamic import of LocationDisplay (SSR disabled - Leaflet needs window)
const LocationDisplay = dynamic(
  () => import("./location-display").then((mod) => mod.LocationDisplay),
  {
    ssr: false,
    loading: MapLoader,
  }
);

/**
 * Example: Location Picker Form
 *
 * Shows a location picker that can be used in forms.
 */
export function LocationPickerExample() {
  const [location, setLocation] = useState<LocationValue | undefined>();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Select Location</h3>

      <LocationPicker
        value={location}
        onChange={setLocation}
        height={350}
        showSearch={true}
        placeholder="Search for a gym, park, or address..."
      />

      {location && (
        <div className="text-sm text-muted-foreground">
          <p>Selected: {location.address || `${location.lat}, ${location.lng}`}</p>
          {location.city && <p>City: {location.city}</p>}
          {location.state && <p>State: {location.state}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Example: Location Display
 *
 * Shows a read-only map with a fixed location.
 */
export function LocationDisplayExample() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Workout Location</h3>

      <LocationDisplay
        lat={37.7749}
        lng={-122.4194}
        label="Golden Gate Park"
        height={200}
        zoom={14}
      />
    </div>
  );
}

/**
 * Example: Controlled Location Picker
 *
 * Shows how to use the picker with external state management.
 */
export function ControlledLocationPickerExample({
  initialLocation,
  onLocationChange,
}: {
  initialLocation?: LocationValue;
  onLocationChange: (location: LocationValue | undefined) => void;
}) {
  return (
    <LocationPicker
      value={initialLocation}
      onChange={onLocationChange}
      height={300}
      showSearch={true}
      defaultCenter={{ lat: 37.7749, lng: -122.4194 }} // San Francisco
      defaultZoom={10}
    />
  );
}

/**
 * Example: Minimal Display (no controls)
 *
 * Shows a simple map pin without any interaction.
 */
export function MinimalLocationDisplayExample({ lat, lng }: { lat: number; lng: number }) {
  return (
    <LocationDisplay
      lat={lat}
      lng={lng}
      height={150}
      zoom={16}
      className="rounded-xl"
    />
  );
}
