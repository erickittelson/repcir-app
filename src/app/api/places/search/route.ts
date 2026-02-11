import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const city = request.nextUrl.searchParams.get("city");
  const state = request.nextUrl.searchParams.get("state");

  if (!city) {
    return NextResponse.json([]);
  }

  // Step 1: Geocode the city/state to get a bounding box
  const locationQuery = [city, state].filter(Boolean).join(", ");
  const geoParams = new URLSearchParams({
    q: locationQuery,
    format: "json",
    limit: "1",
  });

  const geoRes = await fetch(`${NOMINATIM_BASE_URL}/search?${geoParams}`, {
    headers: { "User-Agent": "Repcir/1.0" },
  });

  if (!geoRes.ok) {
    return NextResponse.json([], { status: 502 });
  }

  const geoData = await geoRes.json();
  if (!geoData.length) {
    return NextResponse.json([]);
  }

  const lat = parseFloat(geoData[0].lat);
  const lon = parseFloat(geoData[0].lon);

  // ~15km radius bounding box
  const radius = 0.15;
  const south = lat - radius;
  const north = lat + radius;
  const west = lon - radius * 1.5;
  const east = lon + radius * 1.5;
  const bbox = `${south},${west},${north},${east}`;

  // Step 2: Query Overpass API for fitness-related POIs
  const nameFilter = q
    ? `["name"~"${q.replace(/[^a-zA-Z0-9 ]/g, "")}", i]`
    : "";

  const overpassQuery = `
    [out:json][timeout:10];
    (
      node["leisure"="fitness_centre"]${nameFilter}(${bbox});
      node["amenity"="gym"]${nameFilter}(${bbox});
      node["leisure"="sports_centre"]${nameFilter}(${bbox});
      node["sport"="crossfit"]${nameFilter}(${bbox});
      way["leisure"="fitness_centre"]${nameFilter}(${bbox});
      way["amenity"="gym"]${nameFilter}(${bbox});
      way["leisure"="sports_centre"]${nameFilter}(${bbox});
      way["sport"="crossfit"]${nameFilter}(${bbox});
    );
    out center 20;
  `;

  try {
    const overpassRes = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!overpassRes.ok) {
      return NextResponse.json([], { status: 502 });
    }

    const overpassData = await overpassRes.json();

    const results: PlaceResult[] = [];
    const seen = new Set<string>();

    for (const el of overpassData.elements || []) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) continue;

      // Deduplicate by name
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // For ways, use center coordinates
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;

      const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"],
        tags["addr:state"],
      ].filter(Boolean);

      let type = "gym";
      if (tags.sport === "crossfit" || name.toLowerCase().includes("crossfit")) {
        type = "crossfit";
      } else if (tags.leisure === "sports_centre") {
        type = "studio";
      }

      results.push({
        name,
        address: addressParts.length > 0 ? addressParts.join(" ") : "",
        lat: elLat,
        lng: elLng,
        type,
      });
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
