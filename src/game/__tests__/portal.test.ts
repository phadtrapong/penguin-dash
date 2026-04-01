import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  init, isPortal, commercialBreak, rewardedBreak,
  canShowRewardedAd, gameplayStart, gameplayStop, happyTime,
  _reset,
} from '../portal';
import { COMMERCIAL_BREAK_INTERVAL, REWARDED_AD_SESSION_CAP } from '../constants';

beforeEach(() => {
  delete (window as any).PokiSDK;
  _reset();
});

describe('Portal — standalone (no SDK)', () => {
  it('init succeeds without SDK', async () => {
    await expect(init()).resolves.not.toThrow();
  });

  it('isPortal returns false without SDK', async () => {
    await init();
    expect(isPortal()).toBe(false);
  });

  it('commercialBreak resolves immediately', async () => {
    await init();
    await expect(commercialBreak()).resolves.toBeUndefined();
  });

  it('rewardedBreak returns false', async () => {
    await init();
    const result = await rewardedBreak();
    expect(result).toBe(false);
  });

  it('canShowRewardedAd returns false without SDK', async () => {
    await init();
    expect(canShowRewardedAd()).toBe(false);
  });

  it('gameplayStart/Stop do not throw', async () => {
    await init();
    expect(() => gameplayStart()).not.toThrow();
    expect(() => gameplayStop()).not.toThrow();
  });

  it('happyTime does not throw', async () => {
    await init();
    expect(() => happyTime(0.5)).not.toThrow();
  });
});

describe('Portal — with SDK', () => {
  let mockSDK: any;

  beforeEach(async () => {
    mockSDK = {
      init: vi.fn().mockResolvedValue(undefined),
      gameLoadingStart: vi.fn(),
      gameLoadingFinished: vi.fn(),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      commercialBreak: vi.fn().mockResolvedValue(undefined),
      rewardedBreak: vi.fn().mockResolvedValue(true),
      happyTime: vi.fn(),
    };
    (window as any).PokiSDK = mockSDK;
    await init();
  });

  it('isPortal returns true with SDK', () => {
    expect(isPortal()).toBe(true);
  });

  it('canShowRewardedAd returns true initially', () => {
    expect(canShowRewardedAd()).toBe(true);
  });

  it('commercialBreak calls SDK', async () => {
    await commercialBreak();
    expect(mockSDK.commercialBreak).toHaveBeenCalled();
  });

  it('commercialBreak skips every Nth death', async () => {
    // Death 1: show ad
    await commercialBreak();
    expect(mockSDK.commercialBreak).toHaveBeenCalledTimes(1);

    // Death 2: show ad
    await commercialBreak();
    expect(mockSDK.commercialBreak).toHaveBeenCalledTimes(2);

    // Death 3 (COMMERCIAL_BREAK_INTERVAL=3): skip
    await commercialBreak();
    expect(mockSDK.commercialBreak).toHaveBeenCalledTimes(2); // still 2
  });

  it('rewardedBreak returns true when watched', async () => {
    const result = await rewardedBreak();
    expect(result).toBe(true);
  });

  it('rewardedBreak caps at session limit', async () => {
    for (let i = 0; i < REWARDED_AD_SESSION_CAP; i++) {
      await rewardedBreak();
    }
    // Next call should be capped
    const result = await rewardedBreak();
    expect(result).toBe(false);
    expect(canShowRewardedAd()).toBe(false);
  });

  it('rewardedBreak returns false when ad declined', async () => {
    mockSDK.rewardedBreak.mockResolvedValue(false);
    const result = await rewardedBreak();
    expect(result).toBe(false);
  });

  it('commercialBreak handles SDK rejection gracefully', async () => {
    mockSDK.commercialBreak.mockRejectedValue(new Error('Ad failed'));
    await expect(commercialBreak()).resolves.toBeUndefined();
  });

  it('rewardedBreak handles SDK rejection gracefully', async () => {
    mockSDK.rewardedBreak.mockRejectedValue(new Error('Network error'));
    const result = await rewardedBreak();
    expect(result).toBe(false);
  });

  it('happyTime clamps intensity to 0-1', () => {
    happyTime(2.5);
    expect(mockSDK.happyTime).toHaveBeenCalledWith(1);
    happyTime(-0.5);
    expect(mockSDK.happyTime).toHaveBeenCalledWith(0);
  });
});

describe('Portal — SDK init failure', () => {
  it('falls back gracefully when SDK init throws', async () => {
    (window as any).PokiSDK = {
      init: vi.fn().mockRejectedValue(new Error('Init failed')),
    };
    await init();
    expect(isPortal()).toBe(false);
  });
});
