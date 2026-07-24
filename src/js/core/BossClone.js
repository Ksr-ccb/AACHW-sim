// 보스 분신 — 카디널 위치에 배치되어 캐스팅 후 AoE를 생성하는 객체.
// this.image 를 HTMLImageElement 로 설정하면 육각형 대신 이미지로 렌더링.

import { drawCastBar, createCastState, startCast, updateCast, stopCast } from './castBar.js';

export class BossClone {
  constructor(x, y, { facing = 0, radius = 26, label = '' } = {}) {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.radius = radius;
    this.label  = label;   // 나중에 힌트용으로 활용 가능 (현재 미표시)
    this.image   = null;
    this.visible = true;
    this._cast   = createCastState();
    this.targetX = x;
    this.targetY = y;
    this.speed   = 0;   // px/frame @60fps; 0 = 정지
  }

  // 목표 위치 + 이동 속도 설정 (speed=0 이면 즉시 이동 없음)
  setTarget(x, y, speed = 0) {
    this.targetX = x;
    this.targetY = y;
    this.speed   = speed;
  }

  // 캐스팅 시작: startCast(this, '기술명', 3000)
  startCast(name, durationMs) { startCast(this._cast, name, durationMs); }
  stopCast()                   { stopCast(this._cast); }

  get castProgress() { return this._cast.progress; }
  get castName()     { return this._cast.name; }

  update(dt) {
    updateCast(this._cast, dt);

    if (this.speed > 0) {
      const dx   = this.targetX - this.x;
      const dy   = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.5) {
        const step = Math.min(this.speed * (dt / 16), dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      } else {
        this.x = this.targetX;
        this.y = this.targetY;
        this.speed = 0;
      }
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    const { x, y, radius } = this;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.facing);

    // 이미지 (육각형 안에 클리핑)
    if (this.image) {
      ctx.save();
      this._hexPath(ctx, radius);
      ctx.clip();
      const ir = radius * 0.8;
      ctx.drawImage(this.image, -ir, -ir, ir * 2, ir * 2);
      ctx.restore();
    }

    // 육각형 본체 — 이미지 있을 때는 채색 생략, 테두리는 항상
    this._hexPath(ctx, radius);
    if (!this.image) {
      ctx.fillStyle = 'rgba(55, 8, 95, 0.88)';
      ctx.fill();
    }
    ctx.strokeStyle = '#bb55ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    drawCastBar(ctx, { x, y, radius, castProgress: this._cast.progress, castName: this._cast.name, scale: 1.0});
  }

  _hexPath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }
}
