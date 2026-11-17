// Canvas drawing for FLIPFALL's world: starfield backdrop, neon-edged
// platforms, crumbling tiles, blinking flip gates, spike rows, freight
// movers, collectible stars, the delivery portal and the courier robot
// himself — parcel on his back, flipping with his gravity.

import { PALETTE, TILE, VIEW } from './config.js';
import { gateIsSolid, gateWarning } from './player.js';

// A fixed starfield, generated once from a tiny seeded generator so every
// load paints the same sky (and screenshots are stable).
const SKY_STARS = [];
{
  let seed = 20261117;
  const next = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) | 0;
    return ((seed >>> 9) & 0xffff) / 0xffff;
  };
  for (let i = 0; i < 130; i += 1) {
    SKY_STARS.push({ x: next() * VIEW.width, y: next() * VIEW.height, r: 0.8 + next() * 1.7, tw: next() * 6.28 });
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackdrop(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, PALETTE.spaceTop);
  grad.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (const s of SKY_STARS) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 1.4 + s.tw);
    ctx.fillStyle = '#cfe9ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = TILE; x < VIEW.width; x += TILE) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.height); }
  for (let y = TILE; y < VIEW.height; y += TILE) { ctx.moveTo(0, y); ctx.lineTo(VIEW.width, y); }
  ctx.stroke();
}

function drawSolid(ctx, box) {
  ctx.fillStyle = PALETTE.platformFill;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = PALETTE.platformSide;
  ctx.fillRect(box.x, box.y + 6, box.w, Math.max(0, box.h - 6));
  ctx.fillStyle = PALETTE.platformEdge;
  ctx.fillRect(box.x, box.y, box.w, 4);
  ctx.fillRect(box.x, box.y + box.h - 4, box.w, 4);
}

function drawCrumble(ctx, tile) {
  if (tile.state === 'gone') return;
  const shake = tile.state === 'shaking' ? Math.sin(tile.timer * 60) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.fillStyle = PALETTE.crumbleFill;
  ctx.fillRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4);
  ctx.strokeStyle = PALETTE.crumbleEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(tile.x + 3, tile.y + 3, tile.w - 6, tile.h - 6);
  ctx.beginPath();
  ctx.moveTo(tile.x + 8, tile.y + 8);
  ctx.lineTo(tile.x + 20, tile.y + 22);
  ctx.lineTo(tile.x + 15, tile.y + 33);
  ctx.moveTo(tile.x + 31, tile.y + 9);
  ctx.lineTo(tile.x + 23, tile.y + 20);
  ctx.stroke();
  ctx.restore();
}

function drawGate(ctx, tile, time) {
  const solid = gateIsSolid(time);
  if (!solid) {
    ctx.strokeStyle = 'rgba(255, 92, 200, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x + 4, tile.y + 4, tile.w - 8, tile.h - 8);
    return;
  }
  const warn = gateWarning(time);
  ctx.fillStyle = PALETTE.gateFill;
  ctx.fillRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4);
  ctx.strokeStyle = warn && Math.floor(time * 9) % 2 === 0 ? '#ffffff' : PALETTE.gateEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(tile.x + 3, tile.y + 3, tile.w - 6, tile.h - 6);
  ctx.beginPath();
  ctx.moveTo(tile.x + 9, tile.y + 31);
  ctx.lineTo(tile.x + 31, tile.y + 9);
  ctx.stroke();
}

function drawSpikes(ctx, spike) {
  ctx.fillStyle = PALETTE.spikeBase;
  ctx.fillRect(spike.x, spike.pointsUp ? spike.y + spike.h - 8 : spike.y, spike.w, 8);
  ctx.fillStyle = PALETTE.spike;
  ctx.beginPath();
  const teeth = 2;
  const tw = spike.w / teeth;
  for (let i = 0; i < teeth; i += 1) {
    const bx = spike.x + i * tw;
    if (spike.pointsUp) {
      ctx.moveTo(bx + 2, spike.y + spike.h);
      ctx.lineTo(bx + tw / 2, spike.y + 4);
      ctx.lineTo(bx + tw - 2, spike.y + spike.h);
    } else {
      ctx.moveTo(bx + 2, spike.y);
      ctx.lineTo(bx + tw / 2, spike.y + spike.h - 4);
      ctx.lineTo(bx + tw - 2, spike.y);
    }
  }
  ctx.fill();
}

function drawStarPickup(ctx, star, time) {
  if (star.taken) return;
  const cx = star.x + star.w / 2;
  const cy = star.y + star.h / 2 + Math.sin(time * 3 + star.phase) * 3;
  ctx.fillStyle = PALETTE.starGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 21 + Math.sin(time * 4 + star.phase) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.star;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5 + time * 0.9;
    const radius = i % 2 === 0 ? 13 : 5.5;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPortal(ctx, portal, time) {
  const cx = portal.x + TILE / 2;
  const cy = portal.y + TILE / 2;
  ctx.strokeStyle = PALETTE.portal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 21 + Math.sin(time * 3) * 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.portalInner;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, time * 2.4, time * 2.4 + Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 12, time * 2.4 + Math.PI, time * 2.4 + Math.PI * 1.4);
  ctx.stroke();
  ctx.fillStyle = PALETTE.portalInner;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMover(ctx, mover, time) {
  ctx.fillStyle = '#1d2447';
  ctx.fillRect(mover.x, mover.y, mover.w, mover.h);
  ctx.fillStyle = '#ffb84a';
  ctx.fillRect(mover.x, mover.y, mover.w, 5);
  ctx.fillStyle = '#ffb84a';
  const blink = Math.floor(time * 2) % 2 === 0;
  if (blink) {
    ctx.fillRect(mover.x + 6, mover.y + 9, 5, 5);
    ctx.fillRect(mover.x + mover.w - 11, mover.y + 9, 5, 5);
  }
  // Guide rail showing the patrol path.
  ctx.strokeStyle = 'rgba(255, 184, 74, 0.20)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mover.axis === 'x') {
    ctx.moveTo(mover.baseX + mover.w / 2, mover.y + mover.h / 2);
    ctx.lineTo(mover.baseX + mover.range + mover.w / 2, mover.y + mover.h / 2);
  } else {
    ctx.moveTo(mover.x + mover.w / 2, mover.baseY + mover.h / 2);
    ctx.lineTo(mover.x + mover.w / 2, mover.baseY - mover.range + mover.h / 2);
  }
  ctx.stroke();
}

export function drawCourier(ctx, player, time) {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, player.gravityDir);
  const bob = player.grounded && player.vx !== 0 ? Math.sin(player.walkCycle) * 1.6 : 0;
  ctx.translate(0, bob * player.gravityDir);
  // Legs.
  ctx.fillStyle = '#8fb8d8';
  const stride = player.grounded && player.vx !== 0 ? Math.sin(player.walkCycle) * 5 : 3;
  ctx.fillRect(-11 + stride * 0.4, 13, 7, 8);
  ctx.fillRect(4 - stride * 0.4, 13, 7, 8);
  // Body.
  ctx.fillStyle = PALETTE.playerBody;
  roundRect(ctx, -15, -19, 30, 34, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerTrim;
  ctx.fillRect(-15, -19, 30, 6);
  // The parcel, strapped on the back, ribbon toward the facing direction.
  ctx.fillStyle = PALETTE.parcel;
  ctx.fillRect(player.face > 0 ? -24 : 16, -12, 9, 12);
  ctx.fillStyle = PALETTE.parcelRibbon;
  ctx.fillRect(player.face > 0 ? -20.5 : 19.5, -12, 2.5, 12);
  // Eye visor.
  ctx.fillStyle = PALETTE.playerEye;
  roundRect(ctx, -9, -8, 18, 9, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.portal;
  ctx.beginPath();
  ctx.arc(player.face * 4, -3.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Antenna with a blinking light.
  ctx.strokeStyle = PALETTE.playerTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(0, -26);
  ctx.stroke();
  ctx.fillStyle = Math.floor(time * 2.5) % 2 === 0 ? PALETTE.danger : '#7a1626';
  ctx.beginPath();
  ctx.arc(0, -28, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Paint the whole level: backdrop, tiles, pickups, portal, courier. */
export function drawWorld(ctx, level, player, particles, time) {
  drawBackdrop(ctx, time);
  for (const m of level.movers) drawMover(ctx, m, time);
  for (const s of level.solids) drawSolid(ctx, s);
  for (const c of level.crumbles) drawCrumble(ctx, c);
  for (const g of level.gates) drawGate(ctx, g, time);
  for (const s of level.spikes) drawSpikes(ctx, s);
  for (const s of level.stars) drawStarPickup(ctx, s, time);
  drawPortal(ctx, level.portal, time);
  drawCourier(ctx, player, time);
  particles.draw(ctx);
}
