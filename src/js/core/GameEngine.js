import { Player } from './Player.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = null;
    this.aoes = [];
    this.bgImage = null;
    this.running = false;
    this.gameOver = false;
    this.lastTime = null;
    this._rafId = null;
  }

  loadBackground(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.bgImage = img;
        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;
        resolve(img);
      };
    });
  }

  start(mechanicFn) {
    if (this.player) this.player.destroy();
    this.aoes = [];
    this.gameOver = false;
    this.running = true;
    this.lastTime = null;

    this.player = new Player(
      this.canvas.width / 2,
      this.canvas.height / 2,
      15
    );

    // mechanic provides initial AoE list (and can push more over time via timeline)
    this._mechanicTick = mechanicFn ? mechanicFn(this) : null;

    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.player) this.player.destroy();
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = this.lastTime ? timestamp - this.lastTime : 16;
    this.lastTime = timestamp;

    if (!this.gameOver) {
      this.player.update(this.canvas.width, this.canvas.height);

      if (this._mechanicTick) this._mechanicTick(dt);

      for (const aoe of this.aoes) {
        aoe.update(dt);
        if (aoe.hitsPlayer(this.player)) {
          this.gameOver = true;
          break;
        }
      }
      this.aoes = this.aoes.filter((a) => !a.done);
    }

    this._draw();
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.bgImage) ctx.drawImage(this.bgImage, 0, 0);

    for (const aoe of this.aoes) aoe.draw(ctx);

    this.player.draw(ctx);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff4444';
      ctx.font = `bold ${Math.floor(canvas.height * 0.07)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    }
  }
}
