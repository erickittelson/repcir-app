// Shared equipment constants used by both client components and server-side API routes.
// Do NOT add React/client-only code here.

// Home gym equipment options (matching onboarding)
export const HOME_EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight Only", emoji: "🏃" },
  { id: "dumbbells", label: "Dumbbells", emoji: "🏋️" },
  { id: "barbell", label: "Barbell & Plates", emoji: "🔩" },
  { id: "squat_rack", label: "Squat Rack/Stand", emoji: "🏗️" },
  { id: "bench", label: "Bench", emoji: "🛋️" },
  { id: "pull_up_bar", label: "Pull-up Bar", emoji: "🔝" },
  { id: "kettlebells", label: "Kettlebells", emoji: "🔔" },
  { id: "resistance_bands", label: "Resistance Bands", emoji: "🎗️" },
  { id: "cables", label: "Cable Machine", emoji: "⚙️" },
  { id: "cardio", label: "Cardio Equipment", emoji: "🚴" },
  { id: "trx", label: "TRX/Suspension", emoji: "🪢" },
  { id: "rings", label: "Gymnastic Rings", emoji: "⭕" },
  { id: "box", label: "Plyo Box", emoji: "📦" },
  { id: "medicine_ball", label: "Medicine Ball", emoji: "🏀" },
  { id: "jump_rope", label: "Jump Rope", emoji: "🪢" },
  { id: "foam_roller", label: "Foam Roller", emoji: "🧻" },
];

// Map home equipment IDs to catalog equipment names for saving
export const HOME_EQUIPMENT_TO_CATALOG: Record<string, string[]> = {
  bodyweight: [],
  dumbbells: ["Dumbbells"],
  barbell: ["Barbell", "Weight Plates"],
  squat_rack: ["Squat Rack"],
  bench: ["Flat Bench", "Adjustable Bench"],
  pull_up_bar: ["Pull-up Bar"],
  kettlebells: ["Kettlebells"],
  resistance_bands: ["Resistance Bands"],
  cables: ["Cable Machine"],
  cardio: ["Treadmill", "Stationary Bike", "Rowing Machine"],
  trx: ["TRX"],
  rings: ["Gymnastics Rings"],
  box: ["Plyo Box"],
  medicine_ball: ["Medicine Ball"],
  jump_rope: ["Jump Rope"],
  foam_roller: ["Foam Roller"],
};

// Quick selection templates for different gym types
export const LOCATION_TEMPLATES: Record<string, string[]> = {
  home: [
    "Dumbbells",
    "Resistance Bands",
    "Pull-up Bar",
    "Yoga Mat",
    "Foam Roller",
    "Kettlebells",
    "Stability Ball",
  ],
  commercial: [
    "Treadmill", "Stationary Bike", "Elliptical", "Rowing Machine", "Stair Climber",
    "Dumbbells", "Barbell", "Kettlebells", "Weight Plates", "EZ Curl Bar", "Trap Bar",
    "Squat Rack", "Power Rack", "Smith Machine",
    "Flat Bench", "Adjustable Bench", "Incline Bench", "Decline Bench",
    "Cable Machine", "Leg Press", "Leg Extension", "Leg Curl", "Lat Pulldown",
    "Seated Row Machine", "Chest Press Machine", "Shoulder Press Machine", "Pec Deck",
    "Calf Raise Machine", "Ab Machine",
    "Pull-up Bar", "Dip Station", "Medicine Ball", "Stability Ball", "Battle Ropes",
    "Yoga Mat", "Foam Roller",
  ],
  crossfit: [
    "Barbell", "Weight Plates", "Bumper Plates", "Squat Rack", "Rig",
    "Rowing Machine", "Assault Bike", "SkiErg", "Jump Rope",
    "Kettlebells", "Dumbbells", "Medicine Ball", "Wall Ball", "Plyo Box", "Sandbag", "Sled",
    "Pull-up Bar", "Gymnastics Rings", "GHD Machine", "Rope Climb", "Parallettes",
    "Resistance Bands", "AbMat", "Battle Ropes", "Flat Bench", "Foam Roller",
  ],
  boutique: [
    "Treadmill", "Rowing Machine", "Stationary Bike",
    "Dumbbells", "Resistance Bands", "TRX", "Plyo Box", "Medicine Ball",
    "Bosu Ball", "Kettlebells", "Battle Ropes", "Yoga Mat", "Foam Roller",
  ],
  hotel: [
    "Treadmill", "Stationary Bike", "Elliptical",
    "Dumbbells", "Flat Bench", "Cable Machine", "Yoga Mat", "Stability Ball",
  ],
  military: [
    "Barbell", "Weight Plates", "Dumbbells", "Kettlebells",
    "Squat Rack", "Power Rack", "Flat Bench", "Adjustable Bench",
    "Pull-up Bar", "Dip Station", "Treadmill", "Stationary Bike",
    "Rowing Machine", "Assault Bike", "Plyo Box", "Medicine Ball",
    "Battle Ropes", "Sled", "Sandbag", "TRX", "Rope Climb", "Yoga Mat", "Foam Roller",
  ],
  school: [
    "Dumbbells", "Barbell", "Weight Plates", "Squat Rack", "Flat Bench",
    "Pull-up Bar", "Dip Station", "Treadmill", "Stationary Bike", "Elliptical",
    "Medicine Ball", "Yoga Mat", "Foam Roller",
  ],
  office: [
    "Treadmill", "Stationary Bike", "Elliptical",
    "Dumbbells", "Resistance Bands", "Yoga Mat", "Stability Ball", "Foam Roller",
  ],
  apartment: [
    "Treadmill", "Stationary Bike", "Elliptical",
    "Dumbbells", "Flat Bench", "Cable Machine", "Yoga Mat", "Stability Ball",
  ],
  outdoor: [
    "Pull-up Bar", "Dip Station", "Resistance Bands", "Jump Rope",
    "Medicine Ball", "Kettlebells", "Yoga Mat", "Sandbag",
  ],
  travel: [
    "Resistance Bands", "Jump Rope", "Yoga Mat", "Ab Wheel",
  ],
  custom: [],
};

// Dumbbell weight options
export const DUMBBELL_OPTIONS = [
  { label: "Light (5-25 lbs)", max: 25, weights: [5, 10, 15, 20, 25] },
  { label: "Medium (5-50 lbs)", max: 50, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
  { label: "Heavy (5-75 lbs)", max: 75, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75] },
  { label: "Full Set (5-100+ lbs)", max: 100, weights: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100] },
  { label: "Adjustable (specify max)", max: 0, weights: [] },
];

// Plate configuration options
export const PLATE_OPTIONS = [
  { label: "Basic (up to 135 lbs)", totalWeight: 90, plates: [2.5, 5, 10, 25, 45] },
  { label: "Intermediate (up to 225 lbs)", totalWeight: 180, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Advanced (up to 315 lbs)", totalWeight: 270, plates: [2.5, 5, 10, 25, 35, 45] },
  { label: "Full Home Gym (up to 405+ lbs)", totalWeight: 360, plates: [2.5, 5, 10, 25, 35, 45] },
];

// Equipment details type (used by both client and server)
export interface EquipmentDetails {
  dumbbells?: {
    available: boolean;
    type?: "fixed" | "adjustable" | "both";
    maxWeight?: number;
    weights?: number[];
  };
  barbell?: {
    available: boolean;
    type?: "standard" | "olympic" | "both";
    barWeight?: number;
    plates?: number[];
    totalPlateWeight?: number;
  };
}

// Equipment categories with detailed items
export const EQUIPMENT_CATEGORIES = {
  cardio: {
    label: "Cardio",
    items: [
      "Treadmill", "Stationary Bike", "Elliptical", "Rowing Machine",
      "Assault Bike", "SkiErg", "Stair Climber", "Jump Rope", "Battle Ropes",
    ],
  },
  barbells: {
    label: "Barbells & Plates",
    items: [
      "Barbell", "Weight Plates", "Bumper Plates", "EZ Curl Bar",
      "Trap Bar", "Safety Squat Bar", "Swiss Bar",
    ],
  },
  dumbbells: {
    label: "Dumbbells & Kettlebells",
    items: ["Dumbbells", "Adjustable Dumbbells", "Kettlebells"],
  },
  machines: {
    label: "Machines",
    items: [
      "Cable Machine", "Smith Machine", "Leg Press", "Leg Extension",
      "Leg Curl", "Lat Pulldown", "Seated Row Machine", "Chest Press Machine",
      "Shoulder Press Machine", "Pec Deck", "Calf Raise Machine", "Ab Machine",
      "Hip Adductor", "Hip Abductor", "GHD Machine",
    ],
  },
  racks: {
    label: "Racks & Benches",
    items: [
      "Squat Rack", "Power Rack", "Rig", "Flat Bench", "Adjustable Bench",
      "Incline Bench", "Decline Bench", "Preacher Curl Bench",
    ],
  },
  bodyweight: {
    label: "Bodyweight & Gymnastics",
    items: [
      "Pull-up Bar", "Dip Station", "Gymnastics Rings", "Parallettes",
      "Rope Climb", "TRX", "Plyo Box",
    ],
  },
  functional: {
    label: "Functional Training",
    items: [
      "Medicine Ball", "Wall Ball", "Sandbag", "Sled",
      "Landmine", "Farmers Walk Handles", "Slam Ball",
    ],
  },
  flexibility: {
    label: "Flexibility & Recovery",
    items: [
      "Yoga Mat", "Foam Roller", "Resistance Bands", "Stability Ball",
      "Bosu Ball", "Ab Wheel", "Lacrosse Ball", "Stretching Strap", "AbMat",
    ],
  },
};
