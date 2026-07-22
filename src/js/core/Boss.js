export class Boss {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    // 방향각: 0 = 위(북쪽), PI/2 = 오른쪽, PI = 아래, -PI/2 = 왼쪽 (시계방향)
    this.angle = 0;
    this.scale = 1.0;
    this.visible = true;
  }

  get radius() {
    return this.baseRadius * this.scale;
  }

  setFacing(angle)    { this.angle = angle; }
  setScale(scale)     { this.scale = scale; }
  setPosition(x, y)  { this.x = x; this.y = y; }

  update(_dt) {
    // 향후 이동/크기 변화 트위닝 등에 활용
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
    // canvas 기본 좌표계에서 "위쪽"은 -Y이므로 angle=0일 때 PI 보정
    ctx.rotate(this.angle - Math.PI);

    const tipY   = -(r + r * 0.25);       // 원 바깥으로 살짝 돌출
    const baseY  =  -(r - r * 0.18);      // 원 안쪽 기저부
    const baseHW =   r * 0.28;            // 기저 반폭

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
  }
}
