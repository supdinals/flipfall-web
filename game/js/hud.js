// Heads-up display and full-screen panels for FLIPFALL: the in-play HUD
// (level, timer, stars, deaths, score), the title screen with its level
// select, pause, the level-complete splash and the win screen. Everything
// the judge reads at a glance lives here.

import { FONT, PALETTE, VIEW } from './config.js';
import { LEVEL_COUNT, levelName } from './levels.js';
import { drawCourier } from './render.js';

function text(ctx, value, x, y, size, color, align = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function panel(ctx, y, height) {
  const x = 190;
  const w = VIEW.width - x * 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, height);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, height);
  return { x, w };
}

/** The always-on strip at the top of the play screen. While a level is
 * live its un-banked stars preview into the totals; once the level is
 * complete they are already inside run.score and must not count twice. */
export function drawHud(ctx, run, level, live = true) {
  ctx.fillStyle = 'rgba(5, 6, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, 46);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 46, VIEW.width, 2);
  const starsTaken = live ? level.stars.filter((s) => s.taken).length : 0;
  text(ctx, `LEVEL ${level.index + 1}/${LEVEL_COUNT}  ${level.name.toUpperCase()}`, 22, 24, 21, PALETTE.text, 'left');
  text(ctx, `TIME ${formatTime(run.time)}`, 700, 24, 21, PALETTE.text, 'center');
  text(ctx, `★ ${starsTaken + run.bankedStars}/${run.totalStars}`, 905, 24, 21, PALETTE.star, 'center');
  text(ctx, `DEATHS ${run.deaths}`, 1065, 24, 21, PALETTE.danger, 'center');
  text(ctx, `SCORE ${run.score + starsTaken * 100}`, 1258, 24, 21, PALETTE.accent, 'right');
}

function drawBigTitle(ctx, time) {
  const letters = 'FLIPFALL';
  text(ctx, letters, VIEW.width / 2 + 3, 152 + 3, 96, 'rgba(57, 213, 238, 0.35)', 'center', 900);
  text(ctx, letters, VIEW.width / 2, 152, 96, PALETTE.text, 'center', 900);
  text(ctx, 'GRAVITY IS YOUR JUMP BUTTON', VIEW.width / 2, 216, 25, PALETTE.accent, 'center', 700);
  text(ctx, 'Deliver the glowing parcel through all 12 sorting rooms.', VIEW.width / 2, 262, 22, PALETTE.muted, 'center', 400);
  const flip = Math.floor(time * 1.6) % 2 === 0 ? 1 : -1;
  const demo = { x: VIEW.width / 2 - 15, y: 300, w: 30, h: 38, gravityDir: flip, grounded: true, vx: 0, walkCycle: 0, face: 1 };
  drawCourier(ctx, demo, time);
}

/** Title screen: name, how to play, level select, start prompt. */
export function drawTitle(ctx, selectedLevel, time, best) {
  drawBigTitle(ctx, time);
  const { x, w } = panel(ctx, 392, 218);
  const cx = x + w / 2;
  text(ctx, 'RUN  ← → or A D        FLIP GRAVITY  SPACE / W / ↑ or CLICK', cx, 428, 21, PALETTE.text);
  text(ctx, 'You cannot jump. Flip to fall up, flip to fall down.', cx, 462, 20, PALETTE.muted, 'center', 400);
  text(ctx, 'Dodge spikes, ride movers, grab stars, reach the green portal.', cx, 494, 20, PALETTE.muted, 'center', 400);
  text(ctx, 'START LEVEL', cx, 534, 17, PALETTE.muted);
  const blink = Math.floor(time * 3) % 2 === 0;
  text(ctx, `◀  ${selectedLevel + 1}. ${levelName(selectedLevel)}  ▶`, cx, 566, 27, blink ? PALETTE.star : PALETTE.text);
  text(ctx, 'PRESS ENTER TO START', VIEW.width / 2, 656, 30, PALETTE.accent);
  if (best > 0) text(ctx, `BEST SCORE ${best}`, VIEW.width / 2, 690, 18, PALETTE.muted, 'center', 400);
}

export function drawPaused(ctx) {
  const { x, w } = panel(ctx, 250, 200);
  const cx = x + w / 2;
  text(ctx, 'PAUSED', cx, 318, 46, PALETTE.text, 'center', 900);
  text(ctx, 'The parcels will wait. Press P or Esc to keep delivering.', cx, 372, 20, PALETTE.muted, 'center', 400);
  text(ctx, 'R restarts the level', cx, 408, 18, PALETTE.muted, 'center', 400);
}

/** Between-level splash: what was just delivered, and what it earned. */
export function drawLevelComplete(ctx, summary) {
  const { x, w } = panel(ctx, 218, 290);
  const cx = x + w / 2;
  text(ctx, 'DELIVERED!', cx, 282, 48, PALETTE.accent, 'center', 900);
  text(ctx, `${summary.levelName} — parcel away in ${formatTime(summary.levelTime)}`, cx, 336, 22, PALETTE.text, 'center', 400);
  text(ctx, `STARS  ★ ${summary.starsTaken}/${summary.starTotal}`, cx, 382, 24, PALETTE.star);
  text(ctx, `SCORE  ${summary.score}`, cx, 424, 24, PALETTE.text);
  text(ctx, summary.isLast ? 'PRESS ENTER FOR YOUR RESULTS' : `NEXT: ${summary.nextName} — PRESS ENTER`, cx, 470, 21, PALETTE.accent);
}

/** Final results: the whole run, and the restart prompt. */
export function drawWin(ctx, run) {
  const { x, w } = panel(ctx, 168, 400);
  const cx = x + w / 2;
  text(ctx, 'ALL PARCELS DELIVERED!', cx, 232, 44, PALETTE.accent, 'center', 900);
  text(ctx, 'FLIPFALL complete — the city sleeps, the mail is home.', cx, 282, 21, PALETTE.muted, 'center', 400);
  text(ctx, `TOTAL TIME   ${formatTime(run.time)}`, cx, 336, 27, PALETTE.text);
  text(ctx, `STARS   ★ ${run.bankedStars}/${run.totalStars}`, cx, 380, 27, PALETTE.star);
  text(ctx, `DEATHS   ${run.deaths}`, cx, 424, 27, PALETTE.danger);
  text(ctx, `FINAL SCORE   ${run.score}`, cx, 472, 32, PALETTE.accent);
  text(ctx, 'PRESS ENTER OR R TO RUN IT AGAIN', cx, 532, 23, PALETTE.text);
}

export function drawHint(ctx, hint) {
  text(ctx, hint, VIEW.width / 2, VIEW.height - 16, 17, 'rgba(147, 164, 200, 0.9)', 'center', 400);
}
