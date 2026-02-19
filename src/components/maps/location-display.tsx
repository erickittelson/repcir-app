"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { LocationDisplayProps } from "./types";

const DEFAULT_ZOOM = 15;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function LocationDisplayInner({
  lat,
  lng,
  height = 200,
  className,
  zoom = DEFAULT_ZOOM,
}: LocationDisplayProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border",
        className
      )}
      style={{ height }}
    >
      <Map
        defaultCenter={{ lat, lng }}
        defaultZoom={zoom}
        gestureHandling="none"
        disableDefaultUI={true}
        mapId="location-display"
        style={{ width: "100%", height: "100%" }}
      >
        <AdvancedMarker position={{ lat, lng }}>
          <Pin
            background="oklch(0.73 0.155 85)"
            borderColor="white"
            glyphColor="white"
            scale={1.2}
          />
        </AdvancedMarker>
      </Map>
    </div>
  );
}

export function LocationDisplay(props: LocationDisplayProps) {
  return (
    <APIProvider apiKey={API_KEY}>
      <LocationDisplayInner {...props} />
    </APIProvider>
  );
}

export default LocationDisplay;
