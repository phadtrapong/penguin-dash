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

// Near-miss
export const NEAR_MISS_DISTANCE = 0.5; // tiles
export const NEAR_MISS_SLOWMO_SCALE = 0.3;
export const NEAR_MISS_DURATION = 0.5; // seconds (real time)

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
