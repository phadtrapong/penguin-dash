import * as THREE from 'three';
import type { Row, ZoneType, FloeData, SealData, DecorationData } from './types';
import {
  LANE_COUNT, LANE_OFFSET, TILE_SIZE,
  ZONE_SNOW_ONLY_UNTIL, ZONE_RIVER_START, ZONE_SEAL_START,
  SEAL_MIN_SPEED, SEAL_MAX_SPEED,
  FLOE_MIN_SPEED, FLOE_MAX_SPEED,
} from './constants';
import {
  createSnowTile, createWaterTile, createIceFloe,
  createSeal, createTree, createRock, createFish,
} from './meshes';

function pickZone(rowIndex: number): ZoneType {
  if (rowIndex < ZONE_SNOW_ONLY_UNTIL) return 'snow';

  const riverChance = rowIndex >= ZONE_RIVER_START
    ? Math.min(0.5, 0.3 + (rowIndex - ZONE_RIVER_START) * 0.004)
    : 0;
  const sealChance = rowIndex >= ZONE_SEAL_START
    ? Math.min(0.4, 0.3 + (rowIndex - ZONE_SEAL_START) * 0.002)
    : 0;

  const r = Math.random();
  if (r < riverChance) return 'river';
  if (r < riverChance + sealChance) return 'seal';
  return 'snow';
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateFloes(): FloeData[] {
  const floes: FloeData[] = [];
  const dir = Math.random() > 0.5 ? 1 : -1;
  const speed = randRange(FLOE_MIN_SPEED, FLOE_MAX_SPEED) * dir;
  let lane = -LANE_OFFSET - 3;
  while (lane < LANE_OFFSET + 3) {
    const width = Math.floor(2 + Math.random() * 3);
    floes.push({ lane, width, speed });
    lane += width + 1 + Math.floor(Math.random() * 2); // gap between floes
  }
  return floes;
}

function generateSeals(rowIndex: number): SealData[] {
  const seals: SealData[] = [];
  const count = 1 + Math.floor(rowIndex / SEAL_MIN_SPEED / 100);
  const dir = Math.random() > 0.5 ? 1 : -1;

  for (let i = 0; i < Math.min(count, 3); i++) {
    seals.push({
      lane: randRange(-LANE_OFFSET - 5, LANE_OFFSET + 5),
      speed: randRange(SEAL_MIN_SPEED, SEAL_MAX_SPEED) * dir,
    });
  }
  return seals;
}

function generateDecorations(): DecorationData[] {
  const decs: DecorationData[] = [];
  // Place decorations only on edges (outside playable lanes)
  for (const side of [-1, 1]) {
    if (Math.random() > 0.4) {
      const offset = LANE_OFFSET + 1 + Math.floor(Math.random() * 2);
      decs.push({
        lane: side * offset,
        type: Math.random() > 0.3 ? 'tree' : 'rock',
      });
    }
  }
  return decs;
}

export function generateRow(rowIndex: number): Row {
  const zone = pickZone(rowIndex);
  const row: Row = { z: rowIndex, zone };

  if (zone === 'river') {
    row.floes = generateFloes();
  } else if (zone === 'seal') {
    row.seals = generateSeals(rowIndex);
  }

  if (zone === 'snow') {
    row.decorations = generateDecorations();
  }

  // Fish collectible (10% chance on non-starting rows)
  if (rowIndex > 5 && Math.random() < 0.1) {
    row.fish = {
      lane: Math.floor(Math.random() * LANE_COUNT) - LANE_OFFSET,
      collected: false,
    };
  }

  return row;
}

export function buildRowMeshes(row: Row, scene: THREE.Scene): void {
  const rowZ = row.z;
  const ground: THREE.Object3D[] = [];

  if (row.zone === 'snow' || row.zone === 'seal') {
    for (let l = -LANE_OFFSET - 2; l <= LANE_OFFSET + 2; l++) {
      const tile = createSnowTile(l, rowZ);
      ground.push(tile);
      scene.add(tile);
    }
  } else if (row.zone === 'river') {
    for (let l = -LANE_OFFSET - 2; l <= LANE_OFFSET + 2; l++) {
      const tile = createWaterTile(l, rowZ);
      ground.push(tile);
      scene.add(tile);
    }
    if (row.floes) {
      for (const floe of row.floes) {
        const mesh = createIceFloe(floe.width);
        mesh.position.set(
          floe.lane * TILE_SIZE,
          0,
          -rowZ * TILE_SIZE
        );
        floe.mesh = mesh;
        scene.add(mesh);
      }
    }
  }

  // Seals
  if (row.seals) {
    for (const seal of row.seals) {
      const mesh = createSeal();
      mesh.position.set(
        seal.lane * TILE_SIZE,
        0.0,
        -rowZ * TILE_SIZE
      );
      // Face direction of movement
      if (seal.speed < 0) mesh.rotation.y = Math.PI;
      seal.mesh = mesh;
      scene.add(mesh);
    }
  }

  // Decorations
  if (row.decorations) {
    for (const dec of row.decorations) {
      const mesh = dec.type === 'tree' ? createTree() : createRock();
      mesh.position.set(
        dec.lane * TILE_SIZE,
        0.0,
        -rowZ * TILE_SIZE
      );
      dec.mesh = mesh;
      scene.add(mesh);
    }
  }

  // Fish
  if (row.fish && !row.fish.collected) {
    const mesh = createFish();
    mesh.position.set(
      row.fish.lane * TILE_SIZE,
      0,
      -rowZ * TILE_SIZE
    );
    mesh.userData.isFish = true;
    mesh.userData.row = rowZ;
    ground.push(mesh);
    scene.add(mesh);
  }

  row.groundMeshes = ground;
}

export function updateMovingObjects(
  rows: Map<number, Row>,
  dt: number,
  speedMultiplier: number
): void {
  for (const row of rows.values()) {
    // Update floes
    if (row.floes) {
      for (const floe of row.floes) {
        floe.lane += floe.speed * speedMultiplier * dt;
        if (floe.mesh) {
          floe.mesh.position.x = floe.lane * TILE_SIZE;
        }
        // Wrap floes
        const limit = LANE_OFFSET + 8;
        if (floe.speed > 0 && floe.lane > limit) floe.lane = -limit;
        if (floe.speed < 0 && floe.lane < -limit) floe.lane = limit;
      }
    }

    // Update seals
    if (row.seals) {
      for (const seal of row.seals) {
        seal.lane += seal.speed * speedMultiplier * dt;
        if (seal.mesh) {
          seal.mesh.position.x = seal.lane * TILE_SIZE;
        }
        // Wrap seals
        const limit = LANE_OFFSET + 6;
        if (seal.speed > 0 && seal.lane > limit) seal.lane = -limit;
        if (seal.speed < 0 && seal.lane < -limit) seal.lane = limit;
      }
    }
  }
}

/** Check if a lane position is on a floe in a river row */
export function isOnFloe(row: Row, lane: number): boolean {
  if (!row.floes) return false;
  for (const floe of row.floes) {
    if (lane >= floe.lane - 0.3 && lane < floe.lane + floe.width + 0.3) {
      return true;
    }
  }
  return false;
}

/** Get the floe the player is standing on (for carrying) */
export function getFloeAt(row: Row, lane: number): FloeData | null {
  if (!row.floes) return null;
  for (const floe of row.floes) {
    if (lane >= floe.lane - 0.3 && lane < floe.lane + floe.width + 0.3) {
      return floe;
    }
  }
  return null;
}

/** Check collision with seals */
export function checkSealCollision(row: Row, lane: number): boolean {
  if (!row.seals) return false;
  for (const seal of row.seals) {
    if (Math.abs(seal.lane - lane) < 0.7) {
      return true;
    }
  }
  return false;
}

/** Distance to nearest seal (for near-miss detection) */
export function nearestSealDistance(row: Row, lane: number): number {
  if (!row.seals) return Infinity;
  let min = Infinity;
  for (const seal of row.seals) {
    const d = Math.sqrt((seal.lane - lane) ** 2);
    if (d < min) min = d;
  }
  return min;
}
