// 플레이어 분신 — 특정 위치에 고정되어 기믹(AoE)을 수행하는 복제 객체.
// 점선 원 + 역할별 색상으로 실제 플레이어(빨간 실선 원)와 구분.

const ROLE_COLOR = {
  T: '#4499ff',  // 탱커: 파랑
  H: '#44dd88',  // 힐러: 초록
  D: '#ff7744',  // 딜러: 주황-빨강
};

export class PlayerReplica {
  constructor(x, y, { role = 'D', label = '', radius = 13 } = {}) {
    this.x = x;
    this.y = y;
    this.role = role;    // 'T' | 'H' | 'D'
    this.label = label;  // 예: 'T1', 'H2', 'D3'
    this.radius = radius;
    this.visible = true;
  }

  get _color() {
    return ROLE_COLOR[this.role[0]?.toUpperCase()] ?? '#aaaaaa';
  }

  draw(ctx) {
    if (!this.visible) return;
    const { x, y, radius } = this;
    const color = this._color;

    ctx.save();

    // 반투명 채우기
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color + '44';
    ctx.fill();

    // 점선 테두리
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 역할 라벨
    if (this.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(radius * 0.85)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, x, y);
    }

    ctx.restore();
  }
}
