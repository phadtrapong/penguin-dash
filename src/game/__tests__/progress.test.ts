import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getHighScore, saveHighScore,
  getLifetimeFish, addFish,
  getUnlockedSkinIds, unlockSkin,
  getSelectedSkin, setSelectedSkin,
  checkUnlocks, getNextUnlock,
  recordSession,
} from '../progress';
import { SKINS } from '../constants';

beforeEach(() => {
  localStorage.clear();
});

describe('High Score', () => {
  it('returns 0 when no score saved', () => {
    expect(getHighScore()).toBe(0);
  });

  it('saves and retrieves high score', () => {
    saveHighScore(42);
    expect(getHighScore()).toBe(42);
  });

  it('does not overwrite with lower score', () => {
    saveHighScore(100);
    saveHighScore(50);
    expect(getHighScore()).toBe(100);
  });

  it('handles corrupted localStorage value', () => {
    localStorage.setItem('penguin-dash-highscore', 'not-a-number');
    expect(getHighScore()).toBe(0);
  });

  it('handles negative localStorage value', () => {
    localStorage.setItem('penguin-dash-highscore', '-5');
    expect(getHighScore()).toBe(0);
  });
});

describe('Lifetime Fish', () => {
  it('returns 0 when no fish saved', () => {
    expect(getLifetimeFish()).toBe(0);
  });

  it('adds fish and returns new total', () => {
    const total = addFish(5);
    expect(total).toBe(5);
    expect(getLifetimeFish()).toBe(5);
  });

  it('accumulates across multiple calls', () => {
    addFish(3);
    addFish(7);
    expect(getLifetimeFish()).toBe(10);
  });

  it('ignores zero or negative count', () => {
    addFish(10);
    addFish(0);
    addFish(-5);
    expect(getLifetimeFish()).toBe(10);
  });

  it('handles corrupted localStorage value', () => {
    localStorage.setItem('penguin-dash-lifetime-fish', 'NaN');
    expect(getLifetimeFish()).toBe(0);
  });
});

describe('Skin Unlocks', () => {
  it('Classic (id=0) is always unlocked', () => {
    expect(getUnlockedSkinIds()).toEqual([0]);
  });

  it('unlocks a skin', () => {
    unlockSkin(1);
    expect(getUnlockedSkinIds()).toContain(1);
  });

  it('does not duplicate already unlocked skin', () => {
    unlockSkin(1);
    unlockSkin(1);
    const ids = getUnlockedSkinIds();
    expect(ids.filter(id => id === 1)).toHaveLength(1);
  });

  it('handles corrupted localStorage', () => {
    localStorage.setItem('penguin-dash-unlocked-skins', 'garbage');
    expect(getUnlockedSkinIds()).toEqual([0]);
  });
});

describe('Selected Skin', () => {
  it('defaults to Classic', () => {
    expect(getSelectedSkin().id).toBe(0);
  });

  it('selects an unlocked skin', () => {
    unlockSkin(2);
    expect(setSelectedSkin(2)).toBe(true);
    expect(getSelectedSkin().id).toBe(2);
  });

  it('rejects selecting a locked skin', () => {
    expect(setSelectedSkin(7)).toBe(false);
    expect(getSelectedSkin().id).toBe(0);
  });

  it('falls back to Classic if selected skin becomes invalid', () => {
    localStorage.setItem('penguin-dash-selected-skin', '99');
    expect(getSelectedSkin().id).toBe(0);
  });
});

describe('checkUnlocks', () => {
  it('unlocks Golden Penguin at 10 fish', () => {
    const skin = checkUnlocks(10);
    expect(skin).not.toBeNull();
    expect(skin!.name).toBe('Golden Penguin');
  });

  it('returns null when no new unlocks', () => {
    checkUnlocks(10); // unlock Golden
    const skin = checkUnlocks(10); // already unlocked
    expect(skin).toBeNull();
  });

  it('unlocks multiple skins at once (returns highest cost)', () => {
    const skin = checkUnlocks(50); // crosses 10, 25, 50 thresholds
    expect(skin).not.toBeNull();
    expect(skin!.name).toBe('Lava Penguin'); // cost=50, highest
    expect(getUnlockedSkinIds()).toContain(1); // Golden
    expect(getUnlockedSkinIds()).toContain(2); // Ghost
    expect(getUnlockedSkinIds()).toContain(3); // Lava
  });

  it('exact threshold unlocks the skin', () => {
    const skin = checkUnlocks(25);
    expect(skin).not.toBeNull();
    expect(getUnlockedSkinIds()).toContain(2); // Ghost, cost=25
  });

  it('returns null when all skins unlocked', () => {
    checkUnlocks(1000); // unlock all
    const skin = checkUnlocks(2000);
    expect(skin).toBeNull();
  });
});

describe('getNextUnlock', () => {
  it('returns Golden Penguin first', () => {
    const next = getNextUnlock(0);
    expect(next).not.toBeNull();
    expect(next!.skin.name).toBe('Golden Penguin');
    expect(next!.remaining).toBe(10);
  });

  it('returns correct remaining count', () => {
    const next = getNextUnlock(7);
    expect(next!.remaining).toBe(3); // 10 - 7
  });

  it('skips already unlocked skins', () => {
    checkUnlocks(10); // unlock Golden
    const next = getNextUnlock(10);
    expect(next).not.toBeNull();
    expect(next!.skin.name).toBe('Ghost Penguin');
  });

  it('returns null when all skins unlocked', () => {
    checkUnlocks(1000);
    expect(getNextUnlock(1000)).toBeNull();
  });
});

describe('Sessions', () => {
  it('records a session', () => {
    recordSession(42, 30);
    const raw = localStorage.getItem('penguin-dash-sessions');
    expect(raw).not.toBeNull();
    const sessions = JSON.parse(raw!);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].score).toBe(42);
  });

  it('keeps max 50 sessions', () => {
    for (let i = 0; i < 55; i++) {
      recordSession(i, 10);
    }
    const sessions = JSON.parse(localStorage.getItem('penguin-dash-sessions')!);
    expect(sessions.length).toBeLessThanOrEqual(50);
  });
});

describe('localStorage fallback', () => {
  it('works when localStorage throws', () => {
    const origSet = localStorage.setItem;
    const origGet = localStorage.getItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    // Should not throw — falls back to in-memory
    expect(() => saveHighScore(100)).not.toThrow();
    // Note: can't verify in-memory fallback works across calls because
    // the mock prevents reads too. This just verifies no crashes.

    vi.restoreAllMocks();
  });
});
