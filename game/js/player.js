// The courier: position, velocity, gravity direction and every collision
// rule. Movement is axis-separated AABB against the level's solid tiles,
// crumbling tiles, closed gates and moving platforms; movers carry a
// standing courier by their frame delta. Spikes and the void kill.

import { PHYSICS, PLAYER_SIZE, TILE, VIEW } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_DIED = 1;
export const EVENT_STAR = 2;
export const EVENT_PORTAL = 4;
export const EVENT_LANDED = 8;
export const EVENT_FLIPPED = 16;

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y,
    w: PLAYER_SIZE.width, h: PLAYER_SIZE.height,
    vx: 0, vy: 0,
    gravityDir: 1,
    grounded: false,
    standingOn: null,
    flipCooldown: 0,
    face: 1,
    walkCycle: 0,
    respawn(spawnPoint) {
      this.x = spawnPoint.x;
      this.y = spawnPoint.y;
      this.vx = 0;
      this.vy = 0;
      this.gravityDir = 1;
      this.grounded = false;
      this.standingOn = null;
      this.flipCooldown = 0;
    },
  };
}

/** Gate state shared by a whole level: solid, then open, on a fixed beat. */
export function gateIsSolid(time) {
  const cycle = time % 2.8;
  return cycle < 1.55;
}
export function gateWarning(time) {
  const cycle = time % 2.8;
  return cycle >= 1.25 && cycle < 1.55;
}

function solidBoxes(level, time) {
  const boxes = [...level.solids, ...level.movers];
  for (const c of level.crumbles) if (c.state !== 'gone') boxes.push(c);
  if (gateIsSolid(time)) boxes.push(...level.gates);
  return boxes;
}

export function updatePlayer(player, level, dt, direction, wantFlip, time) {
  let events = EVENT_NONE;
  player.flipCooldown = Math.max(0, player.flipCooldown - dt);

  if (wantFlip && player.flipCooldown === 0) {
    player.gravityDir *= -1;
    player.vy = 0;
    player.grounded = false;
    player.standingOn = null;
    player.flipCooldown = PHYSICS.flipCooldown;
    events |= EVENT_FLIPPED;
  }

  // Ride a moving platform before integrating, so standing feels glued.
  if (player.standingOn && player.standingOn.kind === 'mover') {
    player.x += player.standingOn.dx;
    player.y += player.standingOn.dy;
  }

  player.vx = direction * PHYSICS.runSpeed;
  if (direction !== 0) {
    player.face = direction;
    player.walkCycle += dt * 11;
  }
  player.vy += PHYSICS.gravity * player.gravityDir * dt;
  player.vy = Math.max(-PHYSICS.maxFall, Math.min(PHYSICS.maxFall, player.vy));

  const boxes = solidBoxes(level, time);
  const wasGrounded = player.grounded;

  // Horizontal pass.
  player.x += player.vx * dt;
  for (const box of boxes) {
    if (!overlaps(player, box)) continue;
    if (player.vx > 0) player.x = box.x - player.w;
    else if (player.vx < 0) player.x = box.x + box.w;
  }
  player.x = Math.max(0, Math.min(VIEW.width - player.w, player.x));

  // Vertical pass.
  player.y += player.vy * dt;
  player.grounded = false;
  player.standingOn = null;
  for (const box of boxes) {
    if (!overlaps(player, box)) continue;
    const fallingOnto = player.gravityDir > 0 ? player.vy >= 0 : player.vy <= 0;
    if (!fallingOnto) continue;
    if (player.gravityDir > 0) player.y = box.y - player.h;
    else player.y = box.y + box.h;
    if (Math.abs(player.vy) > 260) events |= EVENT_LANDED;
    player.vy = 0;
    player.grounded = true;
    player.standingOn = box;
  }
  if (player.grounded && !wasGrounded && !(events & EVENT_LANDED)) events |= EVENT_LANDED;

  // Crumbling tiles age while stood on, fall, and regrow.
  for (const c of level.crumbles) {
    if (c.state === 'idle' && player.standingOn === c) c.state = 'shaking';
    if (c.state === 'shaking') {
      c.timer += dt;
      if (c.timer > 0.5) { c.state = 'gone'; c.timer = 0; if (player.standingOn === c) { player.grounded = false; player.standingOn = null; } }
    } else if (c.state === 'gone') {
      c.timer += dt;
      if (c.timer > 2.4) { c.state = 'idle'; c.timer = 0; }
    } else if (c.state === 'shaking' && player.standingOn !== c) {
      c.state = 'idle';
      c.timer = 0;
    }
  }

  // Hazards: spikes use a forgiving inner box so near misses feel fair.
  for (const spike of level.spikes) {
    const hit = { x: spike.x + 9, y: spike.y + (spike.pointsUp ? 16 : 4), w: spike.w - 18, h: spike.h - 20 };
    if (overlaps(player, hit)) events |= EVENT_DIED;
  }
  if (player.y > VIEW.height + 60 || player.y + player.h < -60) events |= EVENT_DIED;

  for (const star of level.stars) {
    if (!star.taken && overlaps(player, star)) {
      star.taken = true;
      events |= EVENT_STAR;
    }
  }

  const portalBox = { x: level.portal.x + 4, y: level.portal.y, w: TILE - 8, h: TILE };
  if (overlaps(player, portalBox)) events |= EVENT_PORTAL;

  return events;
}

/** Advance a level's movers along their patrol and record frame deltas. */
export function updateMovers(level, dt) {
  for (const m of level.movers) {
    m.t += dt * (m.speed / Math.max(1, m.range)) * Math.PI;
    const offset = (Math.sin(m.t) * 0.5 + 0.5) * m.range;
    const nx = m.axis === 'x' ? m.baseX + offset : m.baseX;
    const ny = m.axis === 'y' ? m.baseY - offset : m.baseY;
    m.dx = nx - m.x;
    m.dy = ny - m.y;
    m.x = nx;
    m.y = ny;
  }
}
