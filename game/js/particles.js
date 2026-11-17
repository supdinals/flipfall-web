// A small fixed-pool particle system: landing dust, flip trails, star
// sparkles and death bursts all draw from the same 240 slots, allocated
// once at boot so play never allocates.

const MAX_PARTICLES = 240;

export function createParticles() {
  const pool = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', gravity: 0 });
  }
  let cursor = 0;

  function spawn(x, y, vx, vy, life, size, color, gravity) {
    const p = pool[cursor];
    cursor = (cursor + 1) % MAX_PARTICLES;
    p.alive = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life; p.size = size; p.color = color; p.gravity = gravity;
  }

  return {
    burst(x, y, count, color, speed = 260, life = 0.5, size = 4) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), color, 500);
      }
    },
    landingDust(x, y, direction, color) {
      for (let i = 0; i < 10; i += 1) {
        const spread = (Math.random() - 0.5) * 190;
        spawn(x + (Math.random() - 0.5) * 26, y, spread, -direction * (30 + Math.random() * 70), 0.32, 3.4, color, 0);
      }
    },
    flipTrail(x, y, gravityDirection, color) {
      for (let i = 0; i < 12; i += 1) {
        spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 34,
          (Math.random() - 0.5) * 60, gravityDirection * (60 + Math.random() * 130), 0.42, 4.2, color, 0);
      }
    },
    update(dt) {
      for (const p of pool) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; continue; }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    draw(ctx) {
      for (const p of pool) {
        if (!p.alive) continue;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      for (const p of pool) p.alive = false;
    },
  };
}
