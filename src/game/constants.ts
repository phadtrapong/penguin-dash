// Grid and world
export const TILE_SIZE = 1;
export const LANE_COUNT = 9; // odd number so penguin starts center
export const LANE_OFFSET = Math.floor(LANE_COUNT / 2);
export const ROWS_VISIBLE_AHEAD = 20;
export const ROWS_VISIBLE_BEHIND = 10;
export const ROWS_BUFFER = ROWS_VISIBLE_AHEAD + ROWS_VISIBLE_BEHIND + 10;

// Penguin
export const HOP_DURATION = 0.12; // seconds
export const HOP_HEIGHT = 0.6;
export const SLIDE_SPEED = 8; // tiles per second during belly-slide
export const SLIDE_STEER_FACTOR = 0.3; // reduced lateral control while sliding

// Difficulty
export const BASE_SPEED_INCREASE = 0.05; // 5% faster every 50 tiles
export const SPEED_INCREASE_INTERVAL = 50;
export const SEAL_DENSITY_INCREASE_INTERVAL = 100;

// Zone probabilities at tile thresholds
export const ZONE_SNOW_ONLY_UNTIL = 20;
export const ZONE_RIVER_START = 20;
export const ZONE_SEAL_START = 50;

// Seal speeds
export const SEAL_MIN_SPEED = 2;
export const SEAL_MAX_SPEED = 5;

// Ice floe speeds
export const FLOE_MIN_SPEED = 1;
export const FLOE_MAX_SPEED = 3;

// Collision
export const FISH_COLLECT_RADIUS = 0.8;
export const SEAL_COLLISION_RADIUS = 0.7;
export const FLOE_TOLERANCE = 0.3;
export const EDGE_DEATH_OFFSET = 2;

// Near-miss
export const NEAR_MISS_DISTANCE = 0.5; // tiles
export const NEAR_MISS_MIN_DISTANCE = 0.5; // below this = hit, above = miss
export const NEAR_MISS_SLOWMO_SCALE = 0.3;
export const NEAR_MISS_DURATION = 0.5; // seconds (real time)

// Fish
export const FISH_SPAWN_CHANCE = 0.1; // 10% chance per row
export const FISH_MIN_ROW = 5; // no fish in first 5 rows

// Portal ads
export const COMMERCIAL_BREAK_INTERVAL = 3; // skip ad every Nth death
export const REWARDED_AD_SESSION_CAP = 3;
export const REWARDED_AD_FISH = 5; // fish granted per rewarded ad

// Skins
export interface SkinDefinition {
  id: number;
  name: string;
  body: number;
  belly: number;
  beak: number;
  cost: number; // lifetime fish to unlock (0 = free)
}

export const SKINS: SkinDefinition[] = [
  { id: 0, name: 'Classic Penguin',  body: 0x1C1C2E, belly: 0xFDFDFD, beak: 0xFF6B00, cost: 0 },
  { id: 1, name: 'Golden Penguin',   body: 0xFFD700, belly: 0xFFF8DC, beak: 0xFF8C00, cost: 10 },
  { id: 2, name: 'Ghost Penguin',    body: 0xDDDDDD, belly: 0xFFFFFF, beak: 0xCCCCCC, cost: 25 },
  { id: 3, name: 'Lava Penguin',     body: 0xFF6D00, belly: 0xFF8A65, beak: 0xFFD700, cost: 50 },
  { id: 4, name: 'Arctic Blue',      body: 0x1E88E5, belly: 0xB3E5FC, beak: 0xFFFFFF, cost: 100 },
  { id: 5, name: 'Sunset Penguin',   body: 0xFF6F00, belly: 0xFFCC80, beak: 0xE53935, cost: 200 },
  { id: 6, name: 'Forest Penguin',   body: 0x00897B, belly: 0xA5D6A7, beak: 0x8D6E63, cost: 400 },
  { id: 7, name: 'Diamond Penguin',  body: 0xE0E0E0, belly: 0xFFFFFF, beak: 0xB0BEC5, cost: 800 },
];

// Colors - vibrant, high contrast arctic palette
export const COLORS = {
  sky: 0x7EC8E3,       // rich sky blue
  skyHorizon: 0xB5E3F5, // lighter at horizon for gradient feel
  snow: 0xFFFFFF,       // pure white
  snowAlt: 0xD6EAF8,    // visible blue-tint contrast
  ice: 0xA8DADC,
  iceFloe: 0xE0F4FF,    // bright ice
  iceFLoeSide: 0x9DC5D9, // darker side for depth
  water: 0x1B4F72,      // deep navy
  waterDeep: 0x154360,   // even deeper
  waterHighlight: 0x2E86C1, // lighter ripple
  penguin: 0x1C1C2E,    // dark navy-black
  penguinBelly: 0xFDFDFD,
  penguinBeak: 0xFF6B00, // vivid orange
  penguinFeet: 0xFF6B00,
  penguinCheek: 0xFFB347, // warm orange patch near eyes
  seal: 0x6B4E35,       // warm brown
  sealBelly: 0xC4A882,
  sealWhiskers: 0x3a3a3a,
  fish: 0xFFD700,       // gold
  fishHighlight: 0xFFF176, // shimmer
  tree: 0x1B5E20,       // deep forest green
  treeLight: 0x2E7D32,  // lighter layer
  treeTrunk: 0x4E342E,  // dark brown
  snowCap: 0xF5F5F5,
  rock: 0x6D6D6D,
  rockDark: 0x4A4A4A,
  rockLight: 0x8A8A8A,
};
