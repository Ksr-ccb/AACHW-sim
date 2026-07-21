// AoE shapes that telegraph for `delay` ms then explode for `duration` ms.
// Collision is active only during the explode phase.

export class CircleAoE {
  constructor({ x, y, radius, delay = 3000, duration = 500 }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.delay = delay;
    this.duration = duration;
    this.elapsed = 0;
    this.done = false;
  }

  get isExploding() {
    return this.elapsed >= this.delay && this.elapsed < this.delay + this.duration;
  }

  hitsPlayer(player) {
    if (!this.isExploding) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius + player.radius;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.delay + this.duration) this.done = true;
  }

  draw(ctx) {
    const t = Math.min(this.elapsed / this.delay, 1);
    const alpha = this.isExploding ? 0.85 : 0.25 + t * 0.25;
    const color = this.isExploding ? `rgba(255,80,0,${alpha})` : `rgba(255,60,60,${alpha})`;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.isExploding ? '#ff8800' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!this.isExploding) {
      // countdown ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

export class FanAoE {
  constructor({ x, y, radius, startAngle, endAngle, delay = 3000, duration = 500 }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.delay = delay;
    this.duration = duration;
    this.elapsed = 0;
    this.done = false;
  }

  get isExploding() {
    return this.elapsed >= this.delay && this.elapsed < this.delay + this.duration;
  }

  hitsPlayer(player) {
    if (!this.isExploding) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius + player.radius) return false;

    let angle = Math.atan2(dy, dx);
    let start = this.startAngle;
    let end = this.endAngle;
    // normalize to [0, 2π]
    while (angle < start) angle += Math.PI * 2;
    return angle <= end + (end < start ? Math.PI * 2 : 0);
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.delay + this.duration) this.done = true;
  }

  draw(ctx) {
    const t = Math.min(this.elapsed / this.delay, 1);
    const alpha = this.isExploding ? 0.85 : 0.25 + t * 0.25;
    const color = this.isExploding ? `rgba(255,80,0,${alpha})` : `rgba(255,60,60,${alpha})`;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.isExploding ? '#ff8800' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
