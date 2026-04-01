export type InputAction = 'forward' | 'left' | 'right' | 'slide_start' | 'slide_end' | 'pause' | 'any';

type InputCallback = (action: InputAction) => void;

export function setupInput(callback: InputCallback): () => void {
  // Keyboard
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp': case 'KeyW':
        callback('forward'); break;
      case 'ArrowLeft': case 'KeyA':
        callback('left'); break;
      case 'ArrowRight': case 'KeyD':
        callback('right'); break;
      case 'Space':
        callback('slide_start'); break;
      case 'KeyP': case 'Escape':
        callback('pause'); break;
      default:
        callback('any'); break;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      callback('slide_end');
    }
  };

  // Touch
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let longPressTimer: number | null = null;
  let swiped = false;

  const onTouchStart = (e: TouchEvent) => {
    // Don't handle touches on buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;

    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
    swiped = false;

    longPressTimer = window.setTimeout(() => {
      callback('slide_start');
    }, 200);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (swiped) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const threshold = 30;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      swiped = true;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

      if (Math.abs(dx) > Math.abs(dy)) {
        callback(dx > 0 ? 'right' : 'left');
      } else if (dy < 0) {
        callback('forward');
      }
    }
  };

  const onTouchEnd = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    callback('slide_end');

    if (!swiped && Date.now() - touchStartTime < 200) {
      callback('any');
      callback('forward');
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };
}
