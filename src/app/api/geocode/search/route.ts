import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: "5",
  });

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
    headers: { "User-Agent": "Repcir/1.0" },
  });

  if (!response.ok) {
    return NextResponse.json([], { status: 502 });
  }

  const data = await response.json();

  // Return simplified results
  const results = data.map(
    (item: {
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
    }) => ({
      id: item.place_id,
      label: item.display_name,
      city:
        item.address?.city || item.address?.town || item.address?.village || "",
      state: item.address?.state || "",
      country: item.address?.country || "",
    })
  );

  return NextResponse.json(results);
}
