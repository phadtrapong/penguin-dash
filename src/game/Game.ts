import * as THREE from 'three';
import type { GameData } from './types';
import {
  TILE_SIZE, LANE_OFFSET, ROWS_VISIBLE_AHEAD, ROWS_VISIBLE_BEHIND,
  HOP_DURATION, HOP_HEIGHT, SLIDE_SPEED, SLIDE_STEER_FACTOR,
  SPEED_INCREASE_INTERVAL, BASE_SPEED_INCREASE,
  NEAR_MISS_DISTANCE, NEAR_MISS_SLOWMO_SCALE, NEAR_MISS_DURATION,
  COLORS,
} from './constants';
import { createPenguin } from './meshes';
import {
  generateRow, buildRowMeshes, updateMovingObjects,
  isOnFloe, getFloeAt, checkSealCollision, nearestSealDistance,
} from './world';
import { setupInput } from './input';
import type { InputAction } from './input';
import * as audio from './audio';
import * as ui from './ui';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private penguin: THREE.Group;
  private data: GameData;
  private clock = new THREE.Clock();
  private cleanupInput: (() => void) | null = null;
  private screenShake = 0;
  private fishMeshes: THREE.Group[] = [];

  constructor(canvas: HTMLCanvasElement) {
    // Renderer - crisp, full resolution
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio); // Full device resolution
    this.renderer.setClearColor(COLORS.sky);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Camera - zoomed in closer for chunky voxel feel
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 5; // Was 8 - closer = bigger objects
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100
    );
    // Classic isometric angle (30 degrees)
    this.camera.position.set(7, 9, 7);
    this.camera.lookAt(0, 0, 0);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.sky, 15, 28);

    // Lighting - richer, more directional for voxel depth
    const hemi = new THREE.HemisphereLight(0xB5E3F5, 0x8FAABC, 0.6);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.2); // Warm sunlight
    sun.position.set(5, 12, 4);
    this.scene.add(sun);
    // Fill light from opposite side for softer shadows
    const fill = new THREE.DirectionalLight(0xC5D8F0, 0.3); // Cool blue fill
    fill.position.set(-3, 6, -3);
    this.scene.add(fill);

    // Penguin
    this.penguin = createPenguin();
    this.scene.add(this.penguin);

    // Game data
    this.data = this.freshData();

    // Input
    this.cleanupInput = setupInput((action) => this.handleInput(action));

    // Resize
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // UI
    ui.setupShareButton();
    ui.showStartScreen();
    ui.showHighScore(ui.getHighScore());

    // Generate world for start screen backdrop
    this.generateInitialRows();
    this.updatePenguinPosition();
  }

  private freshData(): GameData {
    return {
      state: 'start',
      score: 0,
      highScore: ui.getHighScore(),
      playerRow: 0,
      playerLane: 0,
      targetRow: 0,
      targetLane: 0,
      hopProgress: 0,
      isHopping: false,
      isSliding: false,
      slideRow: 0,
      timeScale: 1,
      nearMissTimer: 0,
      maxRow: 0,
      rows: new Map(),
      speedMultiplier: 1,
      deathTime: 0,
    };
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const frustum = 5;
    this.camera.left = -frustum * aspect;
    this.camera.right = frustum * aspect;
    this.camera.top = frustum;
    this.camera.bottom = -frustum;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private handleInput(action: InputAction) {
    const d = this.data;

    if (d.state === 'start' && (action === 'any' || action === 'forward')) {
      this.startGame();
      return;
    }

    if (d.state === 'dead' && (action === 'any' || action === 'forward')) {
      if (Date.now() - d.deathTime < 500) return; // Cooldown before restart
      this.restartGame();
      return;
    }

    if (d.state !== 'playing') return;

    audio.resumeAudio();

    if (action === 'slide_start' && !d.isSliding && !d.isHopping) {
      d.isSliding = true;
      d.slideRow = d.playerRow;
      audio.playSlide();
      // Tilt penguin forward for belly-slide
      this.penguin.rotation.x = -Math.PI / 6;
      return;
    }

    if (action === 'slide_end') {
      d.isSliding = false;
      this.penguin.rotation.x = 0;
      return;
    }

    if (d.isHopping) return; // Can't input during hop

    if (d.isSliding) {
      // During slide, left/right steer with reduced control
      if (action === 'left') {
        d.playerLane = Math.max(-LANE_OFFSET, d.playerLane - 1);
        d.targetLane = d.playerLane;
      } else if (action === 'right') {
        d.playerLane = Math.min(LANE_OFFSET, d.playerLane + 1);
        d.targetLane = d.playerLane;
      }
      return;
    }

    switch (action) {
      case 'forward':
        d.targetRow = d.playerRow + 1;
        d.targetLane = d.playerLane;
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
      case 'left':
        d.targetRow = d.playerRow;
        d.targetLane = Math.max(-LANE_OFFSET, d.playerLane - 1);
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
      case 'right':
        d.targetRow = d.playerRow;
        d.targetLane = Math.min(LANE_OFFSET, d.playerLane + 1);
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
    }
  }

  private startGame() {
    audio.resumeAudio();
    // Clear old scene objects (keep lights, penguin)
    this.clearWorld();
    this.data = this.freshData();
    this.data.state = 'playing';
    this.generateInitialRows();
    this.updatePenguinPosition();
    ui.showPlaying();
    ui.updateScore(0);
  }

  private restartGame() {
    this.startGame();
  }

  private clearWorld() {
    const keep = new Set<THREE.Object3D>();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light || obj instanceof THREE.HemisphereLight || obj === this.penguin || obj === this.scene) {
        keep.add(obj);
      }
    });
    const toRemove: THREE.Object3D[] = [];
    for (const child of this.scene.children) {
      if (!keep.has(child)) toRemove.push(child);
    }
    for (const obj of toRemove) {
      this.scene.remove(obj);
    }
    this.fishMeshes = [];
  }

  private generateInitialRows() {
    for (let r = -2; r < ROWS_VISIBLE_AHEAD; r++) {
      this.ensureRow(r);
    }
  }

  private ensureRow(rowIndex: number) {
    if (this.data.rows.has(rowIndex)) return;
    const row = generateRow(rowIndex);
    this.data.rows.set(rowIndex, row);
    buildRowMeshes(row, this.scene);
  }

  private die() {
    this.data.state = 'dead';
    this.data.deathTime = Date.now();
    audio.playDeath();
    ui.showDeath(this.data.score);
    // Death animation: penguin jumps and falls
    this.penguin.rotation.x = Math.PI / 4;
  }

  update() {
    const rawDt = this.clock.getDelta();
    const d = this.data;
    const dt = rawDt * d.timeScale;

    if (d.state !== 'playing') {
      // Gentle idle bob on start screen
      if (d.state === 'start') {
        this.penguin.position.y = 0.15 + Math.sin(Date.now() * 0.003) * 0.05;
      }
      this.render();
      return;
    }

    // Update speed multiplier
    d.speedMultiplier = 1 + Math.floor(d.maxRow / SPEED_INCREASE_INTERVAL) * BASE_SPEED_INCREASE;

    // Update moving objects (floes, seals)
    updateMovingObjects(d.rows, dt, d.speedMultiplier);

    // Hop animation
    if (d.isHopping) {
      d.hopProgress += dt / HOP_DURATION;
      if (d.hopProgress >= 1) {
        d.hopProgress = 1;
        d.isHopping = false;
        d.playerRow = d.targetRow;
        d.playerLane = d.targetLane;

        // Check landing
        this.checkLanding();
      }
    }

    // Belly-slide movement
    if (d.isSliding && !d.isHopping) {
      d.slideRow += SLIDE_SPEED * d.speedMultiplier * dt;
      d.playerRow = Math.floor(d.slideRow);
      d.targetRow = d.playerRow;

      // Check collisions while sliding
      const currentRow = d.rows.get(d.playerRow);
      if (currentRow) {
        if (currentRow.zone === 'river' && !isOnFloe(currentRow, d.playerLane)) {
          audio.playSplash();
          this.die();
          return;
        }
        if (checkSealCollision(currentRow, d.playerLane)) {
          this.die();
          return;
        }
      }
    }

    // Carry player on floe
    if (!d.isHopping && !d.isSliding) {
      const currentRow = d.rows.get(d.playerRow);
      if (currentRow?.zone === 'river') {
        const floe = getFloeAt(currentRow, d.playerLane);
        if (floe) {
          d.playerLane += floe.speed * d.speedMultiplier * dt;
          d.targetLane = d.playerLane;
          // Fall off edges
          if (Math.abs(d.playerLane) > LANE_OFFSET + 2) {
            audio.playSplash();
            this.die();
            return;
          }
        }
      }
    }

    // Near-miss detection
    if (d.nearMissTimer > 0) {
      d.nearMissTimer -= rawDt; // Use raw dt for real-time countdown
      if (d.nearMissTimer <= 0) {
        d.timeScale = 1;
        d.nearMissTimer = 0;
      }
    }

    const currentRow = d.rows.get(d.playerRow);
    if (currentRow) {
      const sealDist = nearestSealDistance(currentRow, d.playerLane);
      if (sealDist < NEAR_MISS_DISTANCE && sealDist > 0.5 && d.nearMissTimer <= 0) {
        d.timeScale = NEAR_MISS_SLOWMO_SCALE;
        d.nearMissTimer = NEAR_MISS_DURATION;
        this.screenShake = 0.3;
        audio.playNearMiss();
      }
    }

    // Score
    if (d.playerRow > d.maxRow) {
      d.maxRow = d.playerRow;
      d.score = d.maxRow;
      ui.updateScore(d.score);
    }

    // Fish collection
    if (currentRow?.fish && !currentRow.fish.collected) {
      if (Math.abs(currentRow.fish.lane - d.playerLane) < 0.8) {
        currentRow.fish.collected = true;
        audio.playFishCollect();
        // Remove fish mesh
        this.scene.traverse((obj) => {
          if (obj.userData.isFish && obj.userData.row === d.playerRow) {
            this.scene.remove(obj);
          }
        });
      }
    }

    // Generate new rows ahead, clean up behind
    for (let r = d.playerRow - ROWS_VISIBLE_BEHIND; r < d.playerRow + ROWS_VISIBLE_AHEAD; r++) {
      this.ensureRow(r);
    }
    // Remove rows too far behind
    for (const [rowIndex, row] of d.rows) {
      if (rowIndex < d.playerRow - ROWS_VISIBLE_BEHIND - 5) {
        // Remove all meshes from scene
        if (row.groundMeshes) for (const m of row.groundMeshes) this.scene.remove(m);
        if (row.floes) for (const f of row.floes) if (f.mesh) this.scene.remove(f.mesh);
        if (row.seals) for (const s of row.seals) if (s.mesh) this.scene.remove(s.mesh);
        if (row.decorations) for (const dec of row.decorations) if (dec.mesh) this.scene.remove(dec.mesh);
        d.rows.delete(rowIndex);
      }
    }

    // Update penguin visual position
    this.updatePenguinPosition();

    // Update camera to follow penguin
    this.updateCamera();

    // Animate fish spinning
    this.scene.traverse((obj) => {
      if (obj.userData.isFish) {
        obj.rotation.y += dt * 3;
        obj.position.y = TILE_SIZE * 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
      }
    });

    // Screen shake
    if (this.screenShake > 0) {
      this.screenShake -= rawDt;
    }

    this.render();
  }

  private checkLanding() {
    const d = this.data;
    const row = d.rows.get(d.playerRow);
    if (!row) return;

    // River: must be on a floe
    if (row.zone === 'river') {
      if (!isOnFloe(row, d.playerLane)) {
        audio.playSplash();
        this.die();
        return;
      }
    }

    // Seal collision
    if (checkSealCollision(row, d.playerLane)) {
      this.die();
      return;
    }
  }

  private updatePenguinPosition() {
    const d = this.data;
    let row: number, lane: number;

    if (d.isHopping) {
      const t = d.hopProgress;
      row = d.playerRow + (d.targetRow - d.playerRow) * t;
      lane = d.playerLane + (d.targetLane - d.playerLane) * t;
      // Parabolic hop height
      const hopY = HOP_HEIGHT * 4 * t * (1 - t);
      this.penguin.position.y = 0.15 + hopY;
    } else if (d.isSliding) {
      row = d.slideRow;
      lane = d.playerLane;
      this.penguin.position.y = 0.08; // Lower during slide
    } else {
      row = d.playerRow;
      lane = d.playerLane;
      this.penguin.position.y = 0.15;
    }

    this.penguin.position.x = lane * TILE_SIZE;
    this.penguin.position.z = -row * TILE_SIZE;

    // Face forward
    if (!d.isSliding) {
      this.penguin.rotation.x = 0;
    }

    // Wing flap during hop
    const wingL = this.penguin.getObjectByName('wingL');
    const wingR = this.penguin.getObjectByName('wingR');
    if (wingL && wingR) {
      if (d.isHopping) {
        const flapAngle = Math.sin(d.hopProgress * Math.PI) * 0.5;
        wingL.rotation.z = flapAngle;
        wingR.rotation.z = -flapAngle;
      } else {
        wingL.rotation.z = 0;
        wingR.rotation.z = 0;
      }
    }
  }

  private updateCamera() {
    const d = this.data;
    const targetX = d.playerLane * TILE_SIZE;
    const targetZ = -d.playerRow * TILE_SIZE;

    // Smooth camera follow
    const camOffsetX = 7;
    const camOffsetY = 9;
    const camOffsetZ = 7;

    this.camera.position.x += (targetX + camOffsetX - this.camera.position.x) * 0.1;
    this.camera.position.z += (targetZ + camOffsetZ - this.camera.position.z) * 0.1;
    this.camera.position.y = camOffsetY;

    const lookTarget = new THREE.Vector3(
      targetX,
      0,
      targetZ
    );
    // Smoothly interpolate lookAt
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(lookTarget);

    // Screen shake
    if (this.screenShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShake * 0.3;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShake * 0.2;
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update();
    };
    loop();
  }

  dispose() {
    if (this.cleanupInput) this.cleanupInput();
    this.renderer.dispose();
  }
}
