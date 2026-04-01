import { COMMERCIAL_BREAK_INTERVAL, REWARDED_AD_SESSION_CAP } from './constants';

interface PokiSDK {
  init(): Promise<void>;
  gameLoadingStart(): void;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(): Promise<void>;
  rewardedBreak(): Promise<boolean>;
  happyTime(intensity: number): void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSDK;
  }
}

let sdk: PokiSDK | null = null;
let deathCount = 0;
let rewardedCount = 0;

export async function init(): Promise<void> {
  if (window.PokiSDK) {
    try {
      sdk = window.PokiSDK;
      await sdk.init();
    } catch {
      sdk = null;
    }
  }
}

export function isPortal(): boolean {
  return sdk !== null;
}

export function gameLoadingStart(): void {
  sdk?.gameLoadingStart();
}

export function gameLoadingFinished(): void {
  sdk?.gameLoadingFinished();
}

export function gameplayStart(): void {
  sdk?.gameplayStart();
}

export function gameplayStop(): void {
  sdk?.gameplayStop();
}

/**
 * Show an interstitial ad on retry. Skips every Nth death to avoid fatigue.
 * Always resolves — ad failures never block gameplay.
 */
export async function commercialBreak(): Promise<void> {
  deathCount++;
  if (!sdk) return;
  // Skip every Nth death
  if (deathCount % COMMERCIAL_BREAK_INTERVAL === 0) return;
  try {
    await sdk.commercialBreak();
  } catch {
    // Ad failed — silently continue
  }
}

/**
 * Show a rewarded ad for bonus fish. Capped per session.
 * Returns true if the ad was watched, false otherwise.
 */
export async function rewardedBreak(): Promise<boolean> {
  if (!sdk) return false;
  if (rewardedCount >= REWARDED_AD_SESSION_CAP) return false;
  try {
    const watched = await sdk.rewardedBreak();
    if (watched) rewardedCount++;
    return watched;
  } catch {
    return false;
  }
}

export function canShowRewardedAd(): boolean {
  return sdk !== null && rewardedCount < REWARDED_AD_SESSION_CAP;
}

export function happyTime(intensity: number): void {
  sdk?.happyTime(Math.min(1, Math.max(0, intensity)));
}

/** Reset all session state — for testing */
export function _reset(): void {
  sdk = null;
  deathCount = 0;
  rewardedCount = 0;
}
