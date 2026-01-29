import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locationTypeDefaults, equipmentCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all location type defaults
    const defaults = await db.query.locationTypeDefaults.findMany({
      orderBy: (table, { asc }) => [asc(table.locationType)],
    });

    // Get equipment catalog to map names to IDs
    const equipment = await db.query.equipmentCatalog.findMany({
      where: eq(equipmentCatalog.isStandard, true),
    });

    // Create a map of equipment name (lowercase) to ID
    const equipmentMap = new Map(
      equipment.map((e) => [e.name.toLowerCase(), e.id])
    );

    // Transform defaults to include equipment IDs
    const transformedDefaults = defaults.map((d) => ({
      ...d,
      equipmentIds: (d.defaultEquipment || [])
        .map((name) => equipmentMap.get(name.toLowerCase()))
        .filter(Boolean) as string[],
    }));

    return NextResponse.json(transformedDefaults);
  } catch (error) {
    console.error("Failed to fetch location defaults:", error);
    return NextResponse.json(
      { error: "Failed to fetch location defaults" },
      { status: 500 }
    );
  }
}
