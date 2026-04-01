import { SKINS } from './constants';
import type { SkinDefinition } from './constants';

const KEYS = {
  highScore: 'penguin-dash-highscore',
  lifetimeFish: 'penguin-dash-lifetime-fish',
  unlockedSkins: 'penguin-dash-unlocked-skins',
  selectedSkin: 'penguin-dash-selected-skin',
  sessions: 'penguin-dash-sessions',
} as const;

// In-memory fallback when localStorage is unavailable
const memStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memStore.get(key) ?? null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memStore.set(key, value);
  }
}

// --- High Score ---

export function getHighScore(): number {
  const val = parseInt(storageGet(KEYS.highScore) ?? '0', 10);
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

export function saveHighScore(score: number): void {
  if (score > getHighScore()) {
    storageSet(KEYS.highScore, String(score));
  }
}

// --- Lifetime Fish ---

export function getLifetimeFish(): number {
  const val = parseInt(storageGet(KEYS.lifetimeFish) ?? '0', 10);
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

export function addFish(count: number): number {
  if (count <= 0) return getLifetimeFish();
  const total = getLifetimeFish() + count;
  storageSet(KEYS.lifetimeFish, String(total));
  return total;
}

// --- Skins ---

export function getUnlockedSkinIds(): number[] {
  const raw = storageGet(KEYS.unlockedSkins);
  if (!raw) return [0]; // Classic is always unlocked
  try {
    const ids = JSON.parse(raw) as number[];
    if (Array.isArray(ids) && ids.length > 0) return ids;
  } catch { /* corrupted */ }
  return [0];
}

export function unlockSkin(skinId: number): void {
  const ids = getUnlockedSkinIds();
  if (ids.includes(skinId)) return;
  ids.push(skinId);
  storageSet(KEYS.unlockedSkins, JSON.stringify(ids));
}

export function getSelectedSkin(): SkinDefinition {
  const id = parseInt(storageGet(KEYS.selectedSkin) ?? '0', 10);
  const unlocked = getUnlockedSkinIds();
  if (unlocked.includes(id)) {
    return SKINS[id] ?? SKINS[0];
  }
  return SKINS[0];
}

export function setSelectedSkin(skinId: number): boolean {
  if (!getUnlockedSkinIds().includes(skinId)) return false;
  storageSet(KEYS.selectedSkin, String(skinId));
  return true;
}

/**
 * Check if any new skins should be unlocked based on lifetime fish.
 * Returns the newly unlocked skin (highest cost one if multiple), or null.
 */
export function checkUnlocks(lifetimeFish: number): SkinDefinition | null {
  const unlocked = getUnlockedSkinIds();
  let newest: SkinDefinition | null = null;

  for (const skin of SKINS) {
    if (skin.cost > 0 && lifetimeFish >= skin.cost && !unlocked.includes(skin.id)) {
      unlockSkin(skin.id);
      if (!newest || skin.cost > newest.cost) {
        newest = skin;
      }
    }
  }
  return newest;
}

/**
 * Returns the next locked skin the player is closest to unlocking, or null if all unlocked.
 */
export function getNextUnlock(lifetimeFish: number): { skin: SkinDefinition; remaining: number } | null {
  const unlocked = getUnlockedSkinIds();
  let best: { skin: SkinDefinition; remaining: number } | null = null;

  for (const skin of SKINS) {
    if (skin.cost > 0 && !unlocked.includes(skin.id)) {
      const remaining = skin.cost - lifetimeFish;
      if (!best || remaining < best.remaining) {
        best = { skin, remaining };
      }
    }
  }
  return best;
}

// --- Sessions ---

export function recordSession(score: number, duration: number): void {
  const raw = storageGet(KEYS.sessions);
  let sessions: Array<{ ts: number; score: number; duration: number }> = [];
  try {
    if (raw) sessions = JSON.parse(raw);
  } catch { /* corrupted */ }
  sessions.push({ ts: Date.now(), score, duration });
  // Keep last 50
  if (sessions.length > 50) sessions = sessions.slice(-50);
  storageSet(KEYS.sessions, JSON.stringify(sessions));
}
