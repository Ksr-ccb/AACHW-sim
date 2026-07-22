const ROLE_COLOR = { T: '#4488ff', H: '#44cc44', D: '#ff4444' };

export class Player {
  constructor(x, y, radius, role = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.role = role;
    this.speed = 4;
    this.keys = new Set();

    this._onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (['w', 'a', 's', 'd'].includes(key)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  get color() {
    if (!this.role) return '#ff3333';
    return ROLE_COLOR[this.role[0]] ?? '#ff3333';
  }

  update(canvasWidth, canvasHeight, arenaRadius) {
    if (this.keys.has('w')) this.y -= this.speed;
    if (this.keys.has('s')) this.y += this.speed;
    if (this.keys.has('a')) this.x -= this.speed;
    if (this.keys.has('d')) this.x += this.speed;

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const dx = this.x - cx;
    const dy = this.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = arenaRadius - this.radius;
    if (dist > limit) {
      this.x = cx + (dx / dist) * limit;
      this.y = cy + (dy / dist) * limit;
    }
  }

  draw(ctx) {
    const r = this.radius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();

    if (this.role) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(r * 0.85)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.role, this.x, this.y);
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}
