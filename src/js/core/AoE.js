// AoE shapes that telegraph for `delay` ms then explode for `duration` ms.
// Collision is active only during the explode phase.

export class CircleAoE {
  // type: 'flame' | 'dark' | null  (null = 즉사)
  // colors: { explodeRGB, explodeStroke } (없으면 기본 주황/빨강)
  // icon: HTMLImageElement — 착탄 중 AoE 위에 표시할 이미지
  constructor({ x, y, radius, delay = 3000, duration = 500, type = null, colors = null, icon = null }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.delay = delay;
    this.duration = duration;
    this.elapsed = 0;
    this.done = false;
    this.type = type;
    this.colors = colors;
    this.icon = icon;
    this._hitPlayer = false;
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
    const t = this.delay > 0 ? Math.min(this.elapsed / this.delay, 1) : 1;
    const alpha = this.isExploding ? 0.85 : 0.25 + t * 0.25;

    let fillColor, strokeColor;
    if (this.colors) {
      const rgb = this.isExploding ? this.colors.explodeRGB : this.colors.telegraphRGB;
      fillColor   = `rgba(${rgb},${alpha})`;
      strokeColor = this.isExploding ? this.colors.explodeStroke : this.colors.telegraphStroke;
    } else {
      fillColor   = this.isExploding ? `rgba(255,80,0,${alpha})` : `rgba(255,60,60,${alpha})`;
      strokeColor = this.isExploding ? '#ff8800' : '#ff4444';
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
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

    if (this.isExploding && this.icon && this.icon.complete && this.icon.naturalWidth > 0) {
      // radius = 바닥징 × 3이므로, 아이콘 2배 = radius × (2/3)
      const iconH = this.radius * (2 / 3);
      const iconW = iconH * (this.icon.naturalWidth / this.icon.naturalHeight);
      ctx.drawImage(this.icon, this.x - iconW / 2, this.y - iconH / 2, iconW, iconH);
    }
  }
}

export class FanAoE {
  // colors 옵션: { telegraphRGB, explodeRGB, telegraphStroke, explodeStroke }
  //   telegraphRGB / explodeRGB : '255,220,0' 형식의 r,g,b 문자열
  constructor({ x, y, radius, startAngle, endAngle, delay = 3000, duration = 500, colors = null }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.delay = delay;
    this.duration = duration;
    this.elapsed = 0;
    this.done = false;
    this.colors = colors;
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

    let fillColor, strokeColor;
    if (this.colors) {
      const rgb = this.isExploding ? this.colors.explodeRGB : this.colors.telegraphRGB;
      fillColor   = `rgba(${rgb},${alpha})`;
      strokeColor = this.isExploding ? this.colors.explodeStroke : this.colors.telegraphStroke;
    } else {
      fillColor   = this.isExploding ? `rgba(255,80,0,${alpha})` : `rgba(255,60,60,${alpha})`;
      strokeColor = this.isExploding ? '#ff8800' : '#ff4444';
    }

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle);
    ctx.closePath();
    ctx.fillStyle   = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 2;
    ctx.stroke();
  }
}
