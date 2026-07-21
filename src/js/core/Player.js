export class Player {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
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

  update(canvasWidth, canvasHeight) {
    if (this.keys.has('w')) this.y -= this.speed;
    if (this.keys.has('s')) this.y += this.speed;
    if (this.keys.has('a')) this.x -= this.speed;
    if (this.keys.has('d')) this.x += this.speed;

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3333';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}
