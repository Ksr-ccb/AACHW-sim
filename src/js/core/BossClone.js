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
    this.image  = null;    // 보스 이미지 교체용
    this.visible = true;
    this._cast = createCastState();
  }

  // 캐스팅 시작: startCast(this, '기술명', 3000)
  startCast(name, durationMs) { startCast(this._cast, name, durationMs); }
  stopCast()                   { stopCast(this._cast); }

  get castProgress() { return this._cast.progress; }
  get castName()     { return this._cast.name; }

  update(dt) {
    updateCast(this._cast, dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const { x, y, radius } = this;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.facing);

    if (this.image) {
      const s = radius * 2;
      ctx.drawImage(this.image, -radius, -radius, s, s);
    } else {
      // 육각형 본체
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else         ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(55, 8, 95, 0.88)';
      ctx.fill();
      ctx.strokeStyle = '#bb55ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();

    drawCastBar(ctx, { x, y, radius, castProgress: this._cast.progress, castName: this._cast.name, scale: 1.0});
  }
}
