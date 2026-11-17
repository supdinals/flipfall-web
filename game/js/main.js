// FLIPFALL boot and game loop: owns the screen state machine
// (title -> play -> level-complete splash -> win, with pause), the run's
// score, timer and deaths, screen shake, and the fixed-step simulation.
// Rendering lives in render.js and hud.js; rules live in player.js.

import { SCORE, STEP, VIEW } from './config.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_FLIP, ACTION_SELECT_LEFT, ACTION_SELECT_RIGHT, ACTION_RESTART } from './input.js';
import { createAudio } from './audio.js';
import { buildLevel, LEVEL_COUNT } from './levels.js';
import { createParticles } from './particles.js';
import { createPlayer, updatePlayer, updateMovers, EVENT_DIED, EVENT_STAR, EVENT_PORTAL, EVENT_LANDED, EVENT_FLIPPED } from './player.js';
import { drawWorld } from './render.js';
import { drawHud, drawTitle, drawPaused, drawLevelComplete, drawWin, drawHint } from './hud.js';

const SCREEN_TITLE = 'title';
const SCREEN_PLAY = 'play';
const SCREEN_PAUSED = 'paused';
const SCREEN_SPLASH = 'splash';
const SCREEN_WIN = 'win';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const particles = createParticles();

const view = { scale: 1, x: 0, y: 0 };
function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  view.x = (canvas.width - VIEW.width * view.scale) / 2;
  view.y = (canvas.height - VIEW.height * view.scale) / 2;
}
window.addEventListener('resize', resize);
resize();

// Total stars across every route, counted once from the level maps.
const TOTAL_STARS = (() => {
  let total = 0;
  for (let i = 0; i < LEVEL_COUNT; i += 1) total += buildLevel(i).starTotal;
  return total;
})();

const BEST_KEY = 'flipfall.best';
function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private window: best lasts the visit */ }
}

let screen = SCREEN_TITLE;
let selectedLevel = 0;
let best = readBest();
let level = buildLevel(0);
let player = createPlayer(level.spawn);
let levelClock = 0;
let shake = 0;
let splashSummary = null;
let takenStarKeys = new Set();

const run = { time: 0, levelTime: 0, deaths: 0, score: 0, bankedStars: 0, totalStars: TOTAL_STARS };

function announce(message) {
  status.textContent = message;
}

function starKey(star) {
  return `${star.x},${star.y}`;
}

function loadLevel(index, keepRun) {
  level = buildLevel(index);
  takenStarKeys = new Set();
  player = createPlayer(level.spawn);
  levelClock = 0;
  run.levelTime = 0;
  particles.clear();
  if (!keepRun) {
    run.time = 0;
    run.deaths = 0;
    run.score = 0;
    run.bankedStars = 0;
  }
}

function startRun(fromLevel) {
  loadLevel(fromLevel, false);
  screen = SCREEN_PLAY;
  audio.startJingle();
  announce(`Level ${fromLevel + 1}, ${level.name}. Deliver the parcel to the portal.`);
}

function die() {
  run.deaths += 1;
  run.score = Math.max(0, run.score - SCORE.deathPenalty);
  audio.deathBuzz();
  shake = 0.38;
  particles.burst(player.x + player.w / 2, player.y + player.h / 2, 26, '#ff4d6d', 320, 0.55, 4.5);
  const taken = takenStarKeys;
  level = buildLevel(level.index);
  for (const star of level.stars) if (taken.has(starKey(star))) star.taken = true;
  player.respawn(level.spawn);
  announce(`Crashed. Deaths ${run.deaths}. Back at the start of ${level.name}.`);
}

function completeLevel() {
  const starsTaken = level.stars.filter((s) => s.taken).length;
  const timeBonus = Math.max(0, Math.round((SCORE.timeBonusBudget - run.levelTime) * SCORE.timeBonusPerSecond));
  run.score += starsTaken * SCORE.star + SCORE.levelClear + timeBonus;
  run.bankedStars += starsTaken;
  audio.portalFanfare();
  particles.burst(level.portal.x + 20, level.portal.y + 20, 30, '#3dff9e', 300, 0.6, 4);
  const isLast = level.index + 1 >= LEVEL_COUNT;
  splashSummary = {
    levelName: level.name,
    levelTime: run.levelTime,
    starsTaken,
    starTotal: level.starTotal,
    score: run.score,
    isLast,
    nextName: isLast ? '' : buildLevel(level.index + 1).name,
  };
  screen = SCREEN_SPLASH;
  announce(`Delivered ${level.name}. Score ${run.score}.`);
}

function advanceFromSplash() {
  if (splashSummary.isLast) {
    screen = SCREEN_WIN;
    if (run.score > best) {
      best = run.score;
      saveBest(best);
    }
    announce(`All parcels delivered. Final score ${run.score}. Press Enter to run it again.`);
  } else {
    loadLevel(level.index + 1, true);
    screen = SCREEN_PLAY;
    announce(`Level ${level.index + 1}, ${level.name}.`);
  }
}

function handleActions() {
  const actions = input.takeActions();
  const selects = input.takeSelectSteps();
  if (actions) audio.unlock();

  if (screen === SCREEN_TITLE) {
    if (selects & ACTION_SELECT_LEFT) { selectedLevel = (selectedLevel + LEVEL_COUNT - 1) % LEVEL_COUNT; audio.selectTick(); }
    if (selects & ACTION_SELECT_RIGHT) { selectedLevel = (selectedLevel + 1) % LEVEL_COUNT; audio.selectTick(); }
    if (actions & (ACTION_CONFIRM | ACTION_FLIP)) startRun(selectedLevel);
    return;
  }
  if (screen === SCREEN_SPLASH) {
    if (actions & (ACTION_CONFIRM | ACTION_FLIP)) advanceFromSplash();
    return;
  }
  if (screen === SCREEN_WIN) {
    if (actions & (ACTION_CONFIRM | ACTION_RESTART)) startRun(0);
    return;
  }
  if (screen === SCREEN_PAUSED) {
    if (actions & ACTION_PAUSE) screen = SCREEN_PLAY;
    else if (actions & ACTION_RESTART) { loadLevel(level.index, true); screen = SCREEN_PLAY; }
    return;
  }
  // Play screen.
  if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; announce('Paused.'); return; }
  if (actions & ACTION_RESTART) { loadLevel(level.index, true); return; }
  pendingFlip = (actions & ACTION_FLIP) !== 0;
}

let pendingFlip = false;

function stepPlay(dt) {
  run.time += dt;
  run.levelTime += dt;
  levelClock += dt;
  updateMovers(level, dt);
  const wantFlip = pendingFlip;
  pendingFlip = false;
  const events = updatePlayer(player, level, dt, input.direction(), wantFlip, levelClock);
  if (events & EVENT_FLIPPED) {
    audio.flipWhoosh();
    particles.flipTrail(player.x + player.w / 2, player.y + player.h / 2, player.gravityDir, '#39d5ee');
  }
  if (events & EVENT_LANDED) {
    audio.landThud();
    const footY = player.gravityDir > 0 ? player.y + player.h : player.y;
    particles.landingDust(player.x + player.w / 2, footY, player.gravityDir, '#93a4c8');
  }
  if (events & EVENT_STAR) {
    audio.starChime();
    for (const star of level.stars) if (star.taken) takenStarKeys.add(starKey(star));
    const last = level.stars.find((s) => s.taken && !s.sparkled);
    if (last) {
      last.sparkled = true;
      particles.burst(last.x + 12, last.y + 12, 14, '#ffd94a', 200, 0.45, 3.6);
    }
  }
  particles.update(dt);
  if (events & EVENT_DIED) { die(); return; }
  if (events & EVENT_PORTAL) completeLevel();
}

function draw(now) {
  const t = now / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05060e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let shakeX = 0;
  let shakeY = 0;
  if (shake > 0) {
    shakeX = (Math.random() - 0.5) * shake * 34;
    shakeY = (Math.random() - 0.5) * shake * 34;
  }
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

  if (screen === SCREEN_TITLE) {
    // A quiet demo level behind the title panel.
    drawWorld(ctx, level, { ...player, x: -100, y: -100 }, particles, t);
    drawTitle(ctx, selectedLevel, t, best);
    return;
  }
  drawWorld(ctx, level, player, particles, t);
  drawHud(ctx, run, level, screen === SCREEN_PLAY || screen === SCREEN_PAUSED);
  if (screen === SCREEN_PLAY) drawHint(ctx, level.hint);
  if (screen === SCREEN_PAUSED) drawPaused(ctx);
  if (screen === SCREEN_SPLASH) drawLevelComplete(ctx, splashSummary);
  if (screen === SCREEN_WIN) drawWin(ctx, run);
}

let accumulator = 0;
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, 0.25);
  last = now;
  handleActions();
  if (shake > 0) shake = Math.max(0, shake - 1 / 60);
  if (screen === SCREEN_PLAY) {
    while (accumulator >= STEP) {
      stepPlay(STEP);
      accumulator -= STEP;
      if (screen !== SCREEN_PLAY) { accumulator = 0; break; }
    }
  } else {
    accumulator = 0;
    if (screen === SCREEN_TITLE || screen === SCREEN_SPLASH || screen === SCREEN_WIN) particles.update(1 / 60);
  }
  draw(now);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    announce('Paused.');
  }
});

announce('FLIPFALL. Press Enter to start delivering.');
requestAnimationFrame(frame);

// A small read-only handle so players (and screenshot scripts) can see the
// run's state; the game itself never reads it.
window.FLIPFALL = {
  getState() {
    return {
      screen,
      levelIndex: level.index,
      levelName: level.name,
      player: { x: Math.round(player.x), y: Math.round(player.y), gravityDir: player.gravityDir, grounded: player.grounded },
      deaths: run.deaths,
      score: run.score,
      time: run.time,
      starsTaken: level.stars.filter((s) => s.taken).length,
    };
  },
};
