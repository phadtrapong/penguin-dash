import { SKINS } from './constants';
import type { SkinDefinition } from './constants';

// --- DOM refs ---
const scoreEl = document.getElementById('score')!;
const highScoreEl = document.getElementById('high-score')!;
const fishCountEl = document.getElementById('fish-count')!;
const startScreen = document.getElementById('start-screen')!;
const deathScreen = document.getElementById('death-screen')!;
const finalScoreEl = document.getElementById('final-score')!;
const newHighScoreEl = document.getElementById('new-high-score')!;
const shareBtn = document.getElementById('share-btn')!;
const skinsBtn = document.getElementById('skins-btn')!;
const skinScreen = document.getElementById('skin-screen')!;
const skinGrid = document.getElementById('skin-grid')!;
const skinCloseBtn = document.getElementById('skin-close-btn')!;
const pauseScreen = document.getElementById('pause-screen')!;
const pauseBtn = document.getElementById('pause-btn')!;
const challengeBanner = document.getElementById('challenge-banner')!;
const deathFishEl = document.getElementById('death-fish')!;
const deathProgressEl = document.getElementById('death-progress')!;
const deathChallengeEl = document.getElementById('death-challenge')!;
const unlockCelebration = document.getElementById('unlock-celebration')!;
const rewardedAdBtn = document.getElementById('rewarded-ad-btn')! as HTMLButtonElement;
const lifetimeFishEl = document.getElementById('lifetime-fish')!;

// --- Score display ---

export function updateScore(score: number) {
  scoreEl.textContent = String(score);
}

export function showHighScore(hs: number) {
  highScoreEl.textContent = hs > 0 ? `Best: ${hs}` : '';
}

export function updateFishCount(count: number) {
  fishCountEl.textContent = count > 0 ? `\uD83D\uDC1F ${count}` : '';
}

export function updateFishDisplay(lifetime: number) {
  lifetimeFishEl.textContent = `\uD83D\uDC1F ${lifetime}`;
}

// --- Screen transitions ---

export function showStartScreen(challengeScore: number | null = null) {
  startScreen.classList.remove('hidden');
  deathScreen.classList.add('hidden');
  scoreEl.classList.add('hidden');
  fishCountEl.classList.add('hidden');
  pauseBtn.classList.add('hidden');

  if (challengeScore !== null && challengeScore > 0) {
    challengeBanner.textContent = `Can you beat ${challengeScore}?`;
    challengeBanner.classList.remove('hidden');
  } else {
    challengeBanner.classList.add('hidden');
  }
}

export function showPlaying() {
  startScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');
  skinScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  challengeBanner.classList.add('hidden');
  scoreEl.classList.remove('hidden');
  fishCountEl.classList.remove('hidden');
  pauseBtn.classList.remove('hidden');
}

interface DeathInfo {
  fishCollected: number;
  lifetimeFish: number;
  newSkin: SkinDefinition | null;
  nextUnlock: { skin: SkinDefinition; remaining: number } | null;
  isNewHighScore: boolean;
  challengeScore: number | null;
  canShowRewardedAd: boolean;
}

export function showDeath(score: number, info: DeathInfo) {
  deathScreen.classList.remove('hidden');
  pauseBtn.classList.add('hidden');
  finalScoreEl.textContent = `Score: ${score}`;

  // New high score
  if (info.isNewHighScore && score > 0) {
    newHighScoreEl.classList.remove('hidden');
  } else {
    newHighScoreEl.classList.add('hidden');
  }
  showHighScore(Math.max(score, parseInt(highScoreEl.textContent?.replace('Best: ', '') || '0', 10)));

  // Fish collected this run
  if (info.fishCollected > 0) {
    deathFishEl.textContent = `+${info.fishCollected} fish collected`;
    deathFishEl.classList.remove('hidden');
  } else {
    deathFishEl.classList.add('hidden');
  }

  // Progress to next unlock
  if (info.nextUnlock) {
    deathProgressEl.textContent = `${info.nextUnlock.remaining} more fish to unlock ${info.nextUnlock.skin.name}`;
    deathProgressEl.classList.remove('hidden');
  } else {
    deathProgressEl.textContent = 'All skins collected!';
    deathProgressEl.classList.remove('hidden');
  }

  // Challenge comparison
  if (info.challengeScore !== null) {
    if (score > info.challengeScore) {
      deathChallengeEl.textContent = `You beat the challenge of ${info.challengeScore}!`;
    } else if (score === info.challengeScore) {
      deathChallengeEl.textContent = `Tied with the challenge of ${info.challengeScore}!`;
    } else {
      deathChallengeEl.textContent = `Didn't beat ${info.challengeScore} this time...`;
    }
    deathChallengeEl.classList.remove('hidden');
  } else {
    deathChallengeEl.classList.add('hidden');
  }

  // Rewarded ad button
  if (info.canShowRewardedAd) {
    rewardedAdBtn.classList.remove('hidden');
  } else {
    rewardedAdBtn.classList.add('hidden');
  }

  // Unlock celebration
  if (info.newSkin) {
    showUnlockCelebration(info.newSkin);
  }
}

function showUnlockCelebration(skin: SkinDefinition) {
  unlockCelebration.innerHTML = `
    <div class="unlock-flash"></div>
    <div class="unlock-content">
      <div class="unlock-label">NEW SKIN UNLOCKED!</div>
      <div class="unlock-name">${skin.name}</div>
      <div class="unlock-swatch" style="background: #${skin.body.toString(16).padStart(6, '0')}"></div>
    </div>
  `;
  unlockCelebration.classList.remove('hidden');
  setTimeout(() => {
    unlockCelebration.classList.add('hidden');
  }, 3000);
}

export function showRewardedAdResult(fishCount: number) {
  rewardedAdBtn.textContent = `+${fishCount} fish!`;
  rewardedAdBtn.disabled = true;
  setTimeout(() => {
    rewardedAdBtn.textContent = 'Watch Ad for Fish';
    rewardedAdBtn.disabled = false;
  }, 2000);
}

// --- Pause ---

export function showPause() {
  pauseScreen.classList.remove('hidden');
}

export function hidePause() {
  pauseScreen.classList.add('hidden');
}

export function setupPauseButton(onPause: () => void) {
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onPause();
  });
  // Also resume from pause screen tap
  pauseScreen.addEventListener('click', () => {
    onPause();
  });
}

// --- Skin selection ---

export function showSkinScreen(unlockedIds: number[], selectedId: number, lifetimeFish: number) {
  skinScreen.classList.remove('hidden');
  renderSkinGrid(unlockedIds, selectedId, lifetimeFish);
}

export function hideSkinScreen() {
  skinScreen.classList.add('hidden');
}

let skinSelectCallback: ((id: number) => void) | null = null;

function renderSkinGrid(unlockedIds: number[], selectedId: number, lifetimeFish: number) {
  skinGrid.innerHTML = '';
  for (const skin of SKINS) {
    const isUnlocked = unlockedIds.includes(skin.id);
    const isSelected = skin.id === selectedId;
    const card = document.createElement('button');
    card.className = 'skin-card' + (isSelected ? ' selected' : '') + (!isUnlocked ? ' locked' : '');
    card.innerHTML = `
      <div class="skin-swatch" style="background: #${skin.body.toString(16).padStart(6, '0')}"></div>
      <div class="skin-name">${skin.name}</div>
      ${!isUnlocked ? `<div class="skin-cost">\uD83D\uDC1F ${skin.cost}</div>` : ''}
      ${isSelected ? '<div class="skin-equipped">Equipped</div>' : ''}
    `;
    if (isUnlocked && !isSelected) {
      card.addEventListener('click', () => {
        if (skinSelectCallback) skinSelectCallback(skin.id);
        renderSkinGrid(unlockedIds, skin.id, lifetimeFish);
      });
    }
    skinGrid.appendChild(card);
  }
}

export function setupSkinSelection(onSelect: (skinId: number) => void) {
  skinSelectCallback = onSelect;
}

export function setupSkinsButton(onToggle: () => void) {
  skinsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle();
  });
  skinCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onToggle();
  });
  // Close skin screen on Escape
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !skinScreen.classList.contains('hidden')) {
      onToggle();
    }
  });
}

export function setupRewardedAdButton(onWatch: () => void) {
  rewardedAdBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onWatch();
  });
}

// --- Share ---

export function setupShareButton() {
  shareBtn.addEventListener('click', async () => {
    const scoreText = finalScoreEl.textContent || 'Score: 0';
    const score = parseInt(scoreText.replace('Score: ', ''), 10) || 0;
    // Generate challenge URL with this player's score
    const url = new URL(window.location.href);
    url.searchParams.set('challenge', String(score));
    const text = `${scoreText} on Penguin Dash! Can you beat me?\n${url.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Penguin Dash', text });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Challenge Friend'; }, 2000);
    }
  });
}
