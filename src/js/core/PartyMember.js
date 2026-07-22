const ROLE_COLOR = { T: '#4488ff', H: '#44cc44', D: '#ff4444' };

export class PartyMember {
  constructor(role, x, y) {
    this.role = role;
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.targetX = x;
    this.targetY = y;
    this.speed = 3.5;
    this.visible = true;
    this.alive = true;
  }

  get color() {
    return ROLE_COLOR[this.role[0]] ?? '#aaaaaa';
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(dt) {
    if (!this.alive) return;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.5) {
      const step = Math.min(this.speed * (dt / 16), dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    const r = this.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.alive ? this.color : 'rgba(100,100,100,0.6)';
    ctx.fill();
    ctx.strokeStyle = this.alive ? '#ffffff' : '#777777';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.alive ? '#ffffff' : '#aaaaaa';
    ctx.font = `bold ${Math.floor(r * 0.85)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.role, this.x, this.y);
    ctx.restore();
  }
}
