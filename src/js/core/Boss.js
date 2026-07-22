import { drawCastBar, createCastState, startCast, updateCast, stopCast } from './castBar.js';

export class Boss {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    // 방향각: 0 = 위(북쪽), PI/2 = 오른쪽, PI = 아래, -PI/2 = 왼쪽 (시계방향)
    this.angle = 0;
    this.scale = 1.0;
    this.visible = true;
    this._cast = createCastState();
  }

  get radius() { return this.baseRadius * this.scale; }

  setFacing(angle)    { this.angle = angle; }
  setScale(scale)     { this.scale = scale; }
  setPosition(x, y)  { this.x = x; this.y = y; }

  // 캐스팅 시작: engine.boss.startCast('기술명', 3000)
  startCast(name, durationMs) { startCast(this._cast, name, durationMs); }
  stopCast()                   { stopCast(this._cast); }

  get castProgress() { return this._cast.progress; }
  get castName()     { return this._cast.name; }

  update(dt) {
    updateCast(this._cast, dt);
  }

  draw(ctx) {
    if (!this.visible) return;
    const r = this.radius;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 몸통 원 (테두리만, 내부는 투명 — 향후 이미지 삽입 가능)
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#cc44ff';
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.stroke();

    // 머리 방향 표시 삼각형 (시계방향 각도 적용, 0 = 위)
    ctx.rotate(this.angle - Math.PI);

    const tipY   = -(r + r * 0.25);
    const baseY  =  -(r - r * 0.18);
    const baseHW =   r * 0.28;

    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.lineTo(-baseHW, baseY);
    ctx.lineTo( baseHW, baseY);
    ctx.closePath();
    ctx.fillStyle   = '#ff8800';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = Math.max(1, r * 0.04);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    drawCastBar(ctx, {
      x: this.x, y: this.y, radius: r,
      castProgress: this._cast.progress,
      castName: this._cast.name,
    });
  }
}
