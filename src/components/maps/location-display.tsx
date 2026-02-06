"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils";
import type { LocationDisplayProps } from "./types";

// Custom marker icon to match the picker
const createCustomIcon = () => {
  if (typeof window === "undefined") return undefined;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, oklch(0.73 0.155 85) 0%, oklch(0.63 0.13 78) 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const DEFAULT_ZOOM = 15;

export function LocationDisplay({
  lat,
  lng,
  label,
  height = 200,
  className,
  zoom = DEFAULT_ZOOM,
}: LocationDisplayProps) {
  // Create custom icon (memoized, only runs on client)
  const customIcon = useMemo(() => createCustomIcon(), []);

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border",
        className
      )}
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {customIcon && (
          <Marker position={[lat, lng]} icon={customIcon}>
            {label && (
              <Popup>
                <span className="text-sm font-medium">{label}</span>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>

      {/* Attribution */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-card/80 backdrop-blur rounded text-[10px] text-muted-foreground z-[500]">
        OpenStreetMap
      </div>
    </div>
  );
}

export default LocationDisplay;
