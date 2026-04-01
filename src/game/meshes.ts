import * as THREE from 'three';
import { COLORS, TILE_SIZE } from './constants';
import type { SkinDefinition } from './constants';

// Material cache for world objects — shared across all meshes of the same color
const materialCache = new Map<number, THREE.MeshStandardMaterial>();

const _flatMat = (color: number) => {
  let mat = materialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0 });
    materialCache.set(color, mat);
  }
  return mat;
};

// Fresh material for penguin parts — NOT cached (skin colors change per player)
const _penguinMat = (color: number) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0 });

export function createPenguin(skin?: SkinDefinition): THREE.Group {
  const g = new THREE.Group();
  const s = TILE_SIZE * 0.5; // Bigger penguin!
  const bodyColor = skin?.body ?? COLORS.penguin;
  const bellyColor = skin?.belly ?? COLORS.penguinBelly;
  const beakColor = skin?.beak ?? COLORS.penguinBeak;

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.0, s * 1.4, s * 0.85),
    _penguinMat(bodyColor)
  );
  body.position.y = s * 0.75;
  g.add(body);

  // Belly (white front) - slightly protruding
  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.7, s * 1.1, s * 0.15),
    _penguinMat(bellyColor)
  );
  belly.position.set(0, s * 0.7, s * 0.42);
  g.add(belly);

  // Head - rounder feel with slightly larger proportions
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.9, s * 0.75, s * 0.8),
    _penguinMat(bodyColor)
  );
  head.position.y = s * 1.7;
  g.add(head);

  // White face patches (around eyes)
  const facePatch = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.65, s * 0.45, s * 0.12),
    _flatMat(0xFFFFFF)
  );
  facePatch.position.set(0, s * 1.75, s * 0.38);
  g.add(facePatch);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.15, s * 0.18, s * 0.08),
      _flatMat(0x000000)
    );
    eye.position.set(side * s * 0.18, s * 1.78, s * 0.44);
    g.add(eye);

    // Eye shine
    const shine = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.06, s * 0.06, s * 0.03),
      _flatMat(0xFFFFFF)
    );
    shine.position.set(side * s * 0.15, s * 1.82, s * 0.48);
    g.add(shine);
  }

  // Orange cheek patches
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.12, s * 0.2, s * 0.1),
      _penguinMat(COLORS.penguinCheek)
    );
    cheek.position.set(side * s * 0.35, s * 1.65, s * 0.32);
    g.add(cheek);
  }

  // Beak
  const beak = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.25, s * 0.15, s * 0.3),
    _penguinMat(beakColor)
  );
  beak.position.set(0, s * 1.65, s * 0.5);
  g.add(beak);

  // Feet
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.35, s * 0.08, s * 0.45),
      _penguinMat(beakColor)
    );
    foot.position.set(side * s * 0.3, s * 0.04, s * 0.1);
    g.add(foot);
  }

  // Wings - tapered
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.15, s * 0.9, s * 0.5),
      _penguinMat(bodyColor)
    );
    wing.position.set(side * s * 0.58, s * 0.8, 0);
    wing.name = side === -1 ? 'wingL' : 'wingR';
    g.add(wing);
  }

  return g;
}

export function createSnowTile(lane: number, row: number): THREE.Mesh {
  const isAlt = (lane + row) % 2 === 0;
  const color = isAlt ? COLORS.snow : COLORS.snowAlt;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.4, TILE_SIZE * 0.98),
    _flatMat(color)
  );
  mesh.position.set(lane * TILE_SIZE, -0.2, -row * TILE_SIZE);
  return mesh;
}

export function createWaterTile(lane: number, row: number): THREE.Mesh {
  const isAlt = (lane + row) % 3 === 0;
  const color = isAlt ? COLORS.waterHighlight : ((lane + row) % 2 === 0 ? COLORS.water : COLORS.waterDeep);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(TILE_SIZE, 0.3, TILE_SIZE),
    _flatMat(color)
  );
  mesh.position.set(lane * TILE_SIZE, -0.35, -row * TILE_SIZE);
  return mesh;
}

export function createIceFloe(width: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < width; i++) {
    // Top surface
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.35, TILE_SIZE * 0.92),
      _flatMat(COLORS.iceFloe)
    );
    top.position.set(i * TILE_SIZE, 0, 0);
    g.add(top);

    // Visible side (darker for depth)
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.15, TILE_SIZE * 0.92),
      _flatMat(COLORS.iceFLoeSide)
    );
    side.position.set(i * TILE_SIZE, -0.15, 0);
    g.add(side);
  }
  return g;
}

export function createSeal(): THREE.Group {
  const g = new THREE.Group();
  const s = TILE_SIZE * 0.45; // Bigger seals

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(s * 2.0, s * 0.7, s * 0.9),
    _flatMat(COLORS.seal)
  );
  body.position.y = s * 0.45;
  g.add(body);

  // Belly
  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.6, s * 0.25, s * 0.7),
    _flatMat(COLORS.sealBelly)
  );
  belly.position.y = s * 0.15;
  g.add(belly);

  // Head - bigger, more visible
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.7, s * 0.6, s * 0.65),
    _flatMat(COLORS.seal)
  );
  head.position.set(s * 1.1, s * 0.55, 0);
  g.add(head);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.1, s * 0.12, s * 0.06),
      _flatMat(0x111111)
    );
    eye.position.set(s * 1.3, s * 0.65, side * s * 0.2);
    g.add(eye);

    // Eye shine
    const shine = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.04, s * 0.04, s * 0.03),
      _flatMat(0xFFFFFF)
    );
    shine.position.set(s * 1.32, s * 0.68, side * s * 0.18);
    g.add(shine);
  }

  // Nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.15, s * 0.1, s * 0.15),
    _flatMat(0x222222)
  );
  nose.position.set(s * 1.4, s * 0.5, 0);
  g.add(nose);

  // Whiskers (tiny lines)
  for (const side of [-1, 1]) {
    const whisker = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.3, s * 0.02, s * 0.02),
      _flatMat(COLORS.sealWhiskers)
    );
    whisker.position.set(s * 1.35, s * 0.48, side * s * 0.15);
    whisker.rotation.z = side * 0.1;
    g.add(whisker);
  }

  // Flippers (tail)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.4, s * 0.15, s * 0.7),
    _flatMat(COLORS.seal)
  );
  tail.position.set(-s * 1.1, s * 0.3, 0);
  g.add(tail);

  return g;
}

export function createTree(): THREE.Group {
  const g = new THREE.Group();
  const s = TILE_SIZE;
  const randScale = 0.8 + Math.random() * 0.4; // Size variety

  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.15 * randScale, s * 0.5 * randScale, s * 0.15 * randScale),
    _flatMat(COLORS.treeTrunk)
  );
  trunk.position.y = s * 0.25 * randScale;
  g.add(trunk);

  // Foliage layers (snowy evergreen) - bigger, more defined
  const layers = [
    { w: 0.55, h: 0.3, y: 0.6, color: COLORS.tree },
    { w: 0.45, h: 0.25, y: 0.85, color: COLORS.treeLight },
    { w: 0.3, h: 0.2, y: 1.05, color: COLORS.tree },
  ];
  for (const l of layers) {
    const foliage = new THREE.Mesh(
      new THREE.BoxGeometry(s * l.w * randScale, s * l.h * randScale, s * l.w * randScale),
      _flatMat(l.color)
    );
    foliage.position.y = s * l.y * randScale;
    g.add(foliage);
  }

  // Snow cap - bright white
  const snow = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.35 * randScale, s * 0.08, s * 0.35 * randScale),
    _flatMat(COLORS.snowCap)
  );
  snow.position.y = s * 1.15 * randScale;
  g.add(snow);

  return g;
}

export function createRock(): THREE.Group {
  const g = new THREE.Group();
  const baseSize = TILE_SIZE * (0.25 + Math.random() * 0.2);

  // Main rock body
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(baseSize * 1.2, baseSize * 0.7, baseSize),
    _flatMat(COLORS.rock)
  );
  main.position.y = baseSize * 0.35;
  main.rotation.y = Math.random() * Math.PI;
  g.add(main);

  // Smaller rock on top for variety
  if (Math.random() > 0.4) {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(baseSize * 0.6, baseSize * 0.4, baseSize * 0.5),
      _flatMat(COLORS.rockDark)
    );
    top.position.set(baseSize * 0.1, baseSize * 0.7, 0);
    top.rotation.y = Math.random() * Math.PI;
    g.add(top);
  }

  // Snow dusting on top
  const snowDust = new THREE.Mesh(
    new THREE.BoxGeometry(baseSize * 0.8, baseSize * 0.05, baseSize * 0.6),
    _flatMat(0xEEEEEE)
  );
  snowDust.position.y = baseSize * 0.72;
  g.add(snowDust);

  return g;
}

export function createFish(): THREE.Group {
  const g = new THREE.Group();
  const s = TILE_SIZE * 0.18;

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(s * 2.2, s * 1.0, s * 0.6),
    _flatMat(COLORS.fish)
  );
  body.position.y = TILE_SIZE * 0.55;
  g.add(body);

  // Highlight stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.5, s * 0.3, s * 0.62),
    _flatMat(COLORS.fishHighlight)
  );
  stripe.position.set(0, TILE_SIZE * 0.55, 0);
  g.add(stripe);

  // Tail
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.7, s * 1.3, s * 0.35),
    _flatMat(COLORS.fish)
  );
  tail.position.set(-s * 1.3, TILE_SIZE * 0.55, 0);
  g.add(tail);

  // Eye
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(s * 0.15, s * 0.15, s * 0.15),
    _flatMat(0x000000)
  );
  eye.position.set(s * 0.7, TILE_SIZE * 0.6, s * 0.25);
  g.add(eye);

  return g;
}
