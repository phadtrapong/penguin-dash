import type * as THREE from 'three';

export type ZoneType = 'snow' | 'river' | 'seal';

export interface Row {
  z: number;
  zone: ZoneType;
  /** For river rows: floe positions and speed */
  floes?: FloeData[];
  /** For seal rows: seal data */
  seals?: SealData[];
  /** Static decorations (trees, rocks) on snow rows */
  decorations?: DecorationData[];
  /** Does this row have a fish collectible? */
  fish?: { lane: number; collected: boolean; mesh?: THREE.Object3D };
  /** All meshes for this row (for cleanup) */
  groundMeshes?: THREE.Object3D[];
}

export interface FloeData {
  lane: number; // starting lane
  width: number; // how many tiles wide
  speed: number; // tiles per second, negative = left
  mesh?: THREE.Group;
}

export interface SealData {
  lane: number; // current fractional lane
  speed: number; // tiles per second, negative = left
  mesh?: THREE.Group;
}

export interface DecorationData {
  lane: number;
  type: 'tree' | 'rock';
  mesh?: THREE.Mesh | THREE.Group;
}

export type GameState = 'start' | 'playing' | 'dead';

export interface GameData {
  state: GameState;
  score: number;
  highScore: number;
  playerRow: number;
  playerLane: number;
  /** Target row during a hop */
  targetRow: number;
  targetLane: number;
  /** Hop animation progress 0-1 */
  hopProgress: number;
  isHopping: boolean;
  /** Belly-slide state */
  isSliding: boolean;
  slideRow: number; // fractional row during slide
  /** Time scale for slow-mo */
  timeScale: number;
  nearMissTimer: number;
  /** Furthest row reached (for score) */
  maxRow: number;
  /** Generated rows */
  rows: Map<number, Row>;
  /** Current difficulty multiplier */
  speedMultiplier: number;
  /** Timestamp when player died (for restart cooldown) */
  deathTime: number;
  /** Fish collected this run */
  fishCollected: number;
  /** Pause state (orthogonal to GameState) */
  isPaused: boolean;
  /** Skin selection overlay visible (orthogonal to GameState) */
  showSkinScreen: boolean;
  /** Challenge score from URL param (null if no challenge) */
  challengeScore: number | null;
  /** Death count this session (for ad skip logic) */
  deathCount: number;
}
