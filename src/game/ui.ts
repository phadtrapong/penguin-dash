const scoreEl = document.getElementById('score')!;
const highScoreEl = document.getElementById('high-score')!;
const startScreen = document.getElementById('start-screen')!;
const deathScreen = document.getElementById('death-screen')!;
const finalScoreEl = document.getElementById('final-score')!;
const newHighScoreEl = document.getElementById('new-high-score')!;
const shareBtn = document.getElementById('share-btn')!;

const HS_KEY = 'penguin-dash-highscore';
const SESSION_KEY = 'penguin-dash-session';

export function getHighScore(): number {
  return parseInt(localStorage.getItem(HS_KEY) || '0', 10);
}

export function saveHighScore(score: number): boolean {
  const prev = getHighScore();
  if (score > prev) {
    localStorage.setItem(HS_KEY, String(score));
    return true;
  }
  return false;
}

export function updateScore(score: number) {
  scoreEl.textContent = String(score);
}

export function showHighScore(hs: number) {
  if (hs > 0) {
    highScoreEl.textContent = `Best: ${hs}`;
  } else {
    highScoreEl.textContent = '';
  }
}

export function showStartScreen() {
  startScreen.classList.remove('hidden');
  deathScreen.classList.add('hidden');
  scoreEl.classList.add('hidden');
  const hs = getHighScore();
  showHighScore(hs);
}

export function showPlaying() {
  startScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');
  scoreEl.classList.remove('hidden');
  // Track session start
  localStorage.setItem(SESSION_KEY, String(Date.now()));
}

export function showDeath(score: number) {
  deathScreen.classList.remove('hidden');
  finalScoreEl.textContent = `Score: ${score}`;
  const isNew = saveHighScore(score);
  if (isNew) {
    newHighScoreEl.classList.remove('hidden');
  } else {
    newHighScoreEl.classList.add('hidden');
  }
  showHighScore(getHighScore());

  // Track session end
  const start = parseInt(localStorage.getItem(SESSION_KEY) || '0', 10);
  if (start > 0) {
    const duration = Math.floor((Date.now() - start) / 1000);
    const sessions = JSON.parse(localStorage.getItem('penguin-dash-sessions') || '[]');
    sessions.push({ ts: Date.now(), duration, score });
    // Keep last 50 sessions
    if (sessions.length > 50) sessions.shift();
    localStorage.setItem('penguin-dash-sessions', JSON.stringify(sessions));
  }
}

export function setupShareButton() {
  shareBtn.addEventListener('click', async () => {
    const score = finalScoreEl.textContent || 'Score: 0';
    const text = `${score} on Penguin Dash! Can you beat me?\n${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Penguin Dash', text });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      shareBtn.textContent = 'Copied!';
      setTimeout(() => { shareBtn.textContent = 'Share Score'; }, 2000);
    }
  });
}
