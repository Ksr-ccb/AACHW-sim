import { Player } from './Player.js';
import { Boss } from './Boss.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = null;
    this.boss = null;
    this.aoes = [];
    this.bgImage = null;
    this.markerOverlay = null;
    this.running = false;
    this.mechActive = false;
    this.gameOver = false;
    this.lastTime = null;
    this._rafId = null;
    this._mechanicTick = null;
    // 원형 아레나 반지름 (이미지 기준 비율, 필요 시 기믹별 override)
    this.arenaRadiusRatio = 0.43;
  }

  get arenaRadius() {
    return Math.min(this.canvas.width, this.canvas.height) * this.arenaRadiusRatio;
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

  // 아레나 기준 1타일 크기 (arenaRadius 의 1/10)
  get tileSize() {
    return this.arenaRadius / 10;
  }

  // 게임루프 시작 (기믹 타임라인은 아직 시작 안 함)
  init() {
    if (this.player) this.player.destroy();
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, 15);
    this.boss = new Boss(this.canvas.width / 2, this.canvas.height / 2, this.tileSize);
    this.boss.setScale(2.0);
    this.aoes = [];
    this.gameOver = false;
    this.mechActive = false;
    this._mechanicTick = null;
    this.running = true;
    this.lastTime = null;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  // 기믹 타임라인 시작
  beginMechanic(mechanicFn) {
    if (this.gameOver) return;
    this.aoes = [];
    this.mechActive = true;
    this._mechanicTick = mechanicFn ? mechanicFn(this) : null;
  }

  // 플레이어 위치 + AoE 초기화, 게임루프는 유지
  reset() {
    this.mechActive = false;
    this._mechanicTick = null;
    this.aoes = [];
    this.gameOver = false;
    if (this.player) {
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height / 2;
    }
  }

  stop() {
    this.running = false;
    this.mechActive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.player) this.player.destroy();
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = this.lastTime ? timestamp - this.lastTime : 16;
    this.lastTime = timestamp;

    if (!this.gameOver) {
      this.player.update(this.canvas.width, this.canvas.height, this.arenaRadius);

      if (this.boss) this.boss.update(dt);

      if (this.mechActive && this._mechanicTick) this._mechanicTick(dt);

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

    if (this.markerOverlay) this.markerOverlay.draw(ctx);

    if (this.boss) this.boss.draw(ctx);

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
