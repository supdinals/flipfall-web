// Keyboard and pointer input for FLIPFALL.
// Held keys give a run direction and a "flip held" edge; one-shot presses
// (confirm, pause, level-select steps) are queued as bit flags and consumed
// exactly once by the game loop, so a tap between frames is never lost.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FLIP = 4;
export const ACTION_SELECT_LEFT = 8;
export const ACTION_SELECT_RIGHT = 16;
export const ACTION_RESTART = 32;

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const FLIP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const CONFIRM_KEYS = new Set(['Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const RESTART_KEYS = new Set(['KeyR']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let queued = 0;
  // Title-screen level select reuses the run keys, so their presses are
  // queued as one-shots too; the play state simply ignores them.
  let selectQueued = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT_KEYS.has(event.code)) {
      left = true;
      if (!event.repeat) selectQueued |= ACTION_SELECT_LEFT;
    } else if (RIGHT_KEYS.has(event.code)) {
      right = true;
      if (!event.repeat) selectQueued |= ACTION_SELECT_RIGHT;
    } else if (FLIP_KEYS.has(event.code)) {
      if (!event.repeat) queued |= ACTION_FLIP;
    } else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) queued |= ACTION_CONFIRM;
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) queued |= ACTION_PAUSE;
    } else if (RESTART_KEYS.has(event.code)) {
      if (!event.repeat) queued |= ACTION_RESTART;
    } else {
      return;
    }
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT_KEYS.has(event.code)) left = false;
    else if (RIGHT_KEYS.has(event.code)) right = false;
  });

  // A key released while the tab is hidden never fires keyup: drop all held
  // state on blur so the courier never runs off on his own.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  canvas.addEventListener('pointerdown', () => {
    queued |= ACTION_FLIP | ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
    /** Level-select steps since the last call, as ACTION_SELECT_* flags. */
    takeSelectSteps() {
      const taken = selectQueued;
      selectQueued = 0;
      return taken;
    },
  };
}
