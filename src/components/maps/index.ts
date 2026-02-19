/**
 * Map Components
 *
 * Reusable map components for location selection and display.
 * Uses Google Maps Platform via @vis.gl/react-google-maps.
 *
 * Usage:
 *
 * ```tsx
 * import { LocationPicker } from '@/components/maps';
 * import { LocationDisplay } from '@/components/maps';
 *
 * // For code-splitting (recommended):
 * import dynamic from 'next/dynamic';
 * const LocationPicker = dynamic(
 *   () => import('@/components/maps').then(mod => mod.LocationPicker),
 *   { loading: () => <div>Loading map...</div> }
 * );
 * ```
 */

export { LocationPicker } from "./location-picker";
export { LocationDisplay } from "./location-display";
export { useGeocoding } from "./use-geocoding";
export type {
  LocationValue,
  LocationPickerProps,
  LocationDisplayProps,
} from "./types";
