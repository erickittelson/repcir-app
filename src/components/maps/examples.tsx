"use client";

/**
 * Example usage of map components.
 * This file shows the recommended patterns for using the map components.
 */

import { useState } from "react";
import { LocationPicker } from "./location-picker";
import { LocationDisplay } from "./location-display";
import type { LocationValue } from "./types";

/**
 * Example: Location Picker Form
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
 * Example: Location Display (read-only)
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
      defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
      defaultZoom={10}
    />
  );
}

/**
 * Example: Minimal Display (no controls)
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
