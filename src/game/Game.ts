import * as THREE from 'three';
import type { GameData } from './types';
import {
  TILE_SIZE, LANE_OFFSET, ROWS_VISIBLE_AHEAD, ROWS_VISIBLE_BEHIND,
  HOP_DURATION, HOP_HEIGHT, SLIDE_SPEED,
  SPEED_INCREASE_INTERVAL, BASE_SPEED_INCREASE,
  NEAR_MISS_DISTANCE, NEAR_MISS_MIN_DISTANCE, NEAR_MISS_SLOWMO_SCALE, NEAR_MISS_DURATION,
  FISH_COLLECT_RADIUS, EDGE_DEATH_OFFSET, REWARDED_AD_FISH,
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
import * as progress from './progress';
import * as portal from './portal';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private penguin: THREE.Group;
  private data: GameData;
  private clock = new THREE.Clock();
  private cleanupInput: (() => void) | null = null;
  private screenShake = 0;
  private fishMeshes: THREE.Object3D[] = [];
  private gameStartTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Renderer - crisp, full resolution
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(COLORS.sky);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Camera - zoomed in closer for chunky voxel feel
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 5;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100
    );
    this.camera.position.set(7, 9, 7);
    this.camera.lookAt(0, 0, 0);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.sky, 15, 28);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xB5E3F5, 0x8FAABC, 0.6);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.2);
    sun.position.set(5, 12, 4);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xC5D8F0, 0.3);
    fill.position.set(-3, 6, -3);
    this.scene.add(fill);

    // Penguin — use selected skin
    const skin = progress.getSelectedSkin();
    this.penguin = createPenguin(skin);
    this.scene.add(this.penguin);

    // Game data
    this.data = this.freshData();

    // Input
    this.cleanupInput = setupInput((action) => this.handleInput(action));

    // Resize
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Parse challenge URL
    const params = new URLSearchParams(window.location.search);
    const challengeParam = params.get('challenge');
    if (challengeParam) {
      const val = parseInt(challengeParam, 10);
      if (Number.isFinite(val) && val > 0) {
        this.data.challengeScore = val;
      }
    }

    // UI
    ui.setupShareButton();
    ui.setupSkinsButton(() => this.toggleSkinScreen());
    ui.setupPauseButton(() => this.togglePause());
    ui.setupSkinSelection((skinId: number) => this.selectSkin(skinId));
    ui.setupRewardedAdButton(() => this.watchRewardedAd());
    ui.showStartScreen(this.data.challengeScore);
    ui.showHighScore(progress.getHighScore());
    ui.updateFishDisplay(progress.getLifetimeFish());

    // Portal init
    portal.init();
    portal.gameLoadingFinished();

    // Generate world for start screen backdrop
    this.generateInitialRows();
    this.updatePenguinPosition();
  }

  private freshData(): GameData {
    return {
      state: 'start',
      score: 0,
      highScore: progress.getHighScore(),
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
      fishCollected: 0,
      isPaused: false,
      showSkinScreen: false,
      challengeScore: this.data?.challengeScore ?? null,
      deathCount: this.data?.deathCount ?? 0,
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

    // Skin screen is up — only Escape closes it
    if (d.showSkinScreen) {
      return; // Skin screen handles its own input via DOM
    }

    // Pause toggle
    if (d.state === 'playing' && action === 'pause') {
      this.togglePause();
      return;
    }

    // While paused, only unpause
    if (d.isPaused) return;

    if (d.state === 'start' && (action === 'any' || action === 'forward')) {
      this.startGame();
      return;
    }

    if (d.state === 'dead' && (action === 'any' || action === 'forward')) {
      if (Date.now() - d.deathTime < 500) return;
      this.restartGame();
      return;
    }

    if (d.state !== 'playing') return;

    audio.resumeAudio();

    if (action === 'slide_start' && !d.isSliding && !d.isHopping) {
      d.isSliding = true;
      d.slideRow = d.playerRow;
      audio.playSlide();
      this.penguin.rotation.x = -Math.PI / 6;
      return;
    }

    if (action === 'slide_end') {
      d.isSliding = false;
      this.penguin.rotation.x = 0;
      return;
    }

    if (d.isHopping) return;

    if (d.isSliding) {
      if (action === 'left') {
        d.playerLane = Math.max(-LANE_OFFSET, d.playerLane - 1);
        d.targetLane = d.playerLane;
      } else if (action === 'right') {
        d.playerLane = Math.min(LANE_OFFSET, d.playerLane + 1);
        d.targetLane = d.playerLane;
      }
      return;
    }

    // Snap lane to nearest integer before hopping (fixes misalignment after riding floes)
    const snappedLane = Math.round(d.playerLane);

    switch (action) {
      case 'forward':
        d.targetRow = d.playerRow + 1;
        d.targetLane = snappedLane;
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
      case 'left':
        d.targetRow = d.playerRow;
        d.targetLane = Math.max(-LANE_OFFSET, snappedLane - 1);
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
      case 'right':
        d.targetRow = d.playerRow;
        d.targetLane = Math.min(LANE_OFFSET, snappedLane + 1);
        d.isHopping = true;
        d.hopProgress = 0;
        audio.playHop();
        break;
    }
  }

  private startGame() {
    audio.resumeAudio();
    this.clearWorld();
    this.data = this.freshData();
    this.data.state = 'playing';
    this.gameStartTime = Date.now();
    this.generateInitialRows();
    this.updatePenguinPosition();
    ui.showPlaying();
    ui.updateScore(0);
    ui.updateFishCount(0);
    portal.gameplayStart();
  }

  private async restartGame() {
    // Show ad on retry (portal handles skip logic)
    await portal.commercialBreak();
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
    // Track fish meshes for animation
    if (row.fish?.mesh) {
      this.fishMeshes.push(row.fish.mesh);
    }
  }

  private die() {
    const d = this.data;
    d.state = 'dead';
    d.deathTime = Date.now();
    d.deathCount++;
    audio.playDeath();
    portal.gameplayStop();

    // Persist fish and check unlocks
    const lifetimeFish = d.fishCollected > 0 ? progress.addFish(d.fishCollected) : progress.getLifetimeFish();
    const newSkin = d.fishCollected > 0 ? progress.checkUnlocks(lifetimeFish) : null;
    const nextUnlock = progress.getNextUnlock(lifetimeFish);

    // Save high score
    progress.saveHighScore(d.score);
    const isNewHighScore = d.score >= d.highScore && d.score > 0;

    // Record session
    const duration = (Date.now() - this.gameStartTime) / 1000;
    progress.recordSession(d.score, duration);

    // Show death screen
    ui.showDeath(d.score, {
      fishCollected: d.fishCollected,
      lifetimeFish,
      newSkin,
      nextUnlock,
      isNewHighScore,
      challengeScore: d.challengeScore,
      canShowRewardedAd: portal.canShowRewardedAd(),
    });

    // Death animation
    this.penguin.rotation.x = Math.PI / 4;

    // Portal happy time on high score
    if (isNewHighScore && d.score > 10) {
      portal.happyTime(Math.min(1, d.score / 100));
    }
  }

  private togglePause() {
    const d = this.data;
    if (d.state !== 'playing' && !d.isPaused) return;
    d.isPaused = !d.isPaused;
    if (d.isPaused) {
      portal.gameplayStop();
      ui.showPause();
    } else {
      portal.gameplayStart();
      ui.hidePause();
    }
  }

  private toggleSkinScreen() {
    const d = this.data;
    d.showSkinScreen = !d.showSkinScreen;
    if (d.showSkinScreen) {
      ui.showSkinScreen(progress.getUnlockedSkinIds(), progress.getSelectedSkin().id, progress.getLifetimeFish());
    } else {
      ui.hideSkinScreen();
    }
  }

  private selectSkin(skinId: number) {
    if (progress.setSelectedSkin(skinId)) {
      // Recreate penguin with new skin
      const skin = progress.getSelectedSkin();
      this.scene.remove(this.penguin);
      this.penguin = createPenguin(skin);
      this.scene.add(this.penguin);
      this.updatePenguinPosition();
    }
  }

  private async watchRewardedAd() {
    const watched = await portal.rewardedBreak();
    if (watched) {
      const lifetimeFish = progress.addFish(REWARDED_AD_FISH);
      progress.checkUnlocks(lifetimeFish);
      ui.updateFishDisplay(lifetimeFish);
      ui.showRewardedAdResult(REWARDED_AD_FISH);
    }
  }

  update() {
    const rawDt = this.clock.getDelta();
    const d = this.data;
    const dt = rawDt * d.timeScale;

    if (d.state !== 'playing' || d.isPaused) {
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
        this.checkLanding();
      }
    }

    // Belly-slide movement
    if (d.isSliding && !d.isHopping) {
      d.slideRow += SLIDE_SPEED * d.speedMultiplier * dt;
      d.playerRow = Math.floor(d.slideRow);
      d.targetRow = d.playerRow;

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
          if (Math.abs(d.playerLane) > LANE_OFFSET + EDGE_DEATH_OFFSET) {
            audio.playSplash();
            this.die();
            return;
          }
        }
      }
    }

    // Near-miss detection
    if (d.nearMissTimer > 0) {
      d.nearMissTimer -= rawDt;
      if (d.nearMissTimer <= 0) {
        d.timeScale = 1;
        d.nearMissTimer = 0;
      }
    }

    // Continuous seal collision check (seals move into the penguin)
    if (!d.isHopping) {
      const currentRow = d.rows.get(d.playerRow);
      if (currentRow && checkSealCollision(currentRow, d.playerLane)) {
        this.die();
        return;
      }
    }

    const currentRow = d.rows.get(d.playerRow);
    if (currentRow) {
      const sealDist = nearestSealDistance(currentRow, d.playerLane);
      if (sealDist < NEAR_MISS_DISTANCE && sealDist > NEAR_MISS_MIN_DISTANCE && d.nearMissTimer <= 0) {
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

    // Fish collection — use direct mesh ref instead of scene traversal
    if (currentRow?.fish && !currentRow.fish.collected) {
      if (Math.abs(currentRow.fish.lane - d.playerLane) < FISH_COLLECT_RADIUS) {
        currentRow.fish.collected = true;
        d.fishCollected++;
        audio.playFishCollect();
        ui.updateFishCount(d.fishCollected);
        // Remove fish mesh by direct reference
        if (currentRow.fish.mesh) {
          this.scene.remove(currentRow.fish.mesh);
          const idx = this.fishMeshes.indexOf(currentRow.fish.mesh);
          if (idx !== -1) this.fishMeshes.splice(idx, 1);
        }
      }
    }

    // Generate new rows ahead, clean up behind
    for (let r = d.playerRow - ROWS_VISIBLE_BEHIND; r < d.playerRow + ROWS_VISIBLE_AHEAD; r++) {
      this.ensureRow(r);
    }
    for (const [rowIndex, row] of d.rows) {
      if (rowIndex < d.playerRow - ROWS_VISIBLE_BEHIND - 5) {
        if (row.groundMeshes) for (const m of row.groundMeshes) this.scene.remove(m);
        if (row.floes) for (const f of row.floes) if (f.mesh) this.scene.remove(f.mesh);
        if (row.seals) for (const s of row.seals) if (s.mesh) this.scene.remove(s.mesh);
        if (row.decorations) for (const dec of row.decorations) if (dec.mesh) this.scene.remove(dec.mesh);
        // Clean up fish mesh ref from tracking array
        if (row.fish?.mesh) {
          const idx = this.fishMeshes.indexOf(row.fish.mesh);
          if (idx !== -1) this.fishMeshes.splice(idx, 1);
        }
        d.rows.delete(rowIndex);
      }
    }

    // Update penguin visual position
    this.updatePenguinPosition();

    // Update camera
    this.updateCamera();

    // Animate fish spinning — use tracked array instead of scene traversal
    for (const mesh of this.fishMeshes) {
      mesh.rotation.y += dt * 3;
      mesh.position.y = TILE_SIZE * 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
    }

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

    if (row.zone === 'river') {
      if (!isOnFloe(row, d.playerLane)) {
        audio.playSplash();
        this.die();
        return;
      }
    }

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
      const hopY = HOP_HEIGHT * 4 * t * (1 - t);
      this.penguin.position.y = 0.15 + hopY;
    } else if (d.isSliding) {
      row = d.slideRow;
      lane = d.playerLane;
      this.penguin.position.y = 0.08;
    } else {
      row = d.playerRow;
      lane = d.playerLane;
      this.penguin.position.y = 0.15;
    }

    this.penguin.position.x = lane * TILE_SIZE;
    this.penguin.position.z = -row * TILE_SIZE;

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

    const camOffsetX = 7;
    const camOffsetY = 9;
    const camOffsetZ = 7;

    this.camera.position.x += (targetX + camOffsetX - this.camera.position.x) * 0.1;
    this.camera.position.z += (targetZ + camOffsetZ - this.camera.position.z) * 0.1;
    this.camera.position.y = camOffsetY;

    const lookTarget = new THREE.Vector3(targetX, 0, targetZ);
    this.camera.lookAt(lookTarget);

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
