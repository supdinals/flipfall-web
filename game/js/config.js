// FLIPFALL tuning and palette. The playfield is a fixed 1280x720 logical
// stage; every level is a single screen of 32x18 tiles of 40 px, and the
// renderer letterboxes that stage into whatever window it is given.

export const VIEW = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** Fixed simulation step: 120 updates a second keeps flips feeling instant. */
export const STEP = 1 / 120;

export const PHYSICS = {
  gravity: 2100,
  runSpeed: 355,
  maxFall: 980,
  flipCooldown: 0.09,
};

export const PLAYER_SIZE = { width: 30, height: 38 };

export const SCORE = {
  star: 100,
  levelClear: 250,
  deathPenalty: 25,
  timeBonusPerSecond: 4,
  timeBonusBudget: 45,
};

export const PALETTE = {
  backdrop: '#05060e',
  spaceTop: '#0a0d24',
  spaceBottom: '#12102e',
  gridLine: 'rgba(94, 234, 255, 0.055)',
  platformFill: '#171c38',
  platformEdge: '#39d5ee',
  platformSide: '#232a52',
  crumbleFill: '#3a2410',
  crumbleEdge: '#ffab4a',
  gateFill: 'rgba(255, 92, 200, 0.30)',
  gateEdge: '#ff5cc8',
  spike: '#ff4d6d',
  spikeBase: '#5c1224',
  star: '#ffd94a',
  starGlow: 'rgba(255, 217, 74, 0.35)',
  portal: '#3dff9e',
  portalInner: '#baffdc',
  playerBody: '#e8f6ff',
  playerTrim: '#39d5ee',
  playerEye: '#0a0d24',
  parcel: '#ffd94a',
  parcelRibbon: '#ff5cc8',
  text: '#eef6ff',
  muted: '#93a4c8',
  accent: '#3dff9e',
  danger: '#ff4d6d',
  panel: 'rgba(10, 13, 36, 0.88)',
  panelEdge: '#39d5ee',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
