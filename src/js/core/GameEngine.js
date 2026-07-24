import { Player } from './Player.js';
import { Boss } from './Boss.js';
import { PartyMember } from './PartyMember.js';
import { BossClone } from './BossClone.js';
import { PlayerReplica } from './PlayerReplica.js';

export const ALL_ROLES = ['T1', 'T2', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4'];

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = null;
    this.boss = null;
    this.partyMembers = [];
    this.partyVisible = true;
    this.selectedRole = 'D1';
    this.aoes = [];
    this.bossClones = [];
    this.playerReplicas = [];
    this.bgImage = null;
    this.markerOverlay = null;
    this.running = false;
    this.mechActive = false;
    this.gameOver = false;
    this.lastTime = null;
    this._rafId = null;
    this._mechanicTick = null;
    this.arenaRadiusRatio = 0.43;
    this.debuffs = { flame: 0, dark: 0 };
    const di = new Image(); di.src = 'img/reference/dark.png';
    const fi = new Image(); fi.src = 'img/reference/flame.png';
    this._debuffImgs = { dark: di, flame: fi };

    // 보스 공통 이미지 — 한 번만 로드 후 boss/bossClone에 공유
    this.bossImage = null;
    const bi = new Image();
    bi.src = 'img/reference/lindblum.png';
    bi.onload = () => {
      this.bossImage = bi;
      if (this.boss) this.boss.image = bi;
    };
  }

  get arenaRadius() {
    return Math.min(this.canvas.width, this.canvas.height) * this.arenaRadiusRatio;
  }

  get tileSize() {
    return this.arenaRadius / 10;
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

  init() {
    if (this.player) this.player.destroy();

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.player = new Player(cx, cy, 20, this.selectedRole);
    this.boss = new Boss(cx, cy, this.tileSize);
    this.boss.setScale(2.0);
    if (this.bossImage) this.boss.image = this.bossImage;

    const partyRoles = ALL_ROLES.filter((r) => r !== this.selectedRole);
    this.partyMembers = partyRoles.map((r) => new PartyMember(r, cx, cy));
    for (const pm of this.partyMembers) pm.visible = this.partyVisible;

    this.aoes = [];
    this.gameOver = false;
    this.mechActive = false;
    this.debuffs = { flame: 0, dark: 0 };
    this._mechanicTick = null;
    this.running = true;
    this.lastTime = null;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  beginMechanic(mechanicFn) {
    if (this.gameOver) return;
    this.aoes = [];
    this.bossClones = [];
    this.playerReplicas = [];
    this.debuffs = { flame: 0, dark: 0 };
    this.mechActive = true;
    this._mechanicTick = mechanicFn ? mechanicFn(this) : null;
  }

  reset() {
    this.mechActive = false;
    this._mechanicTick = null;
    this.aoes = [];
    this.bossClones = [];
    this.playerReplicas = [];
    this.debuffs = { flame: 0, dark: 0 };
    this.gameOver = false;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    if (this.player) {
      this.player.x = cx;
      this.player.y = cy;
    }
    for (const pm of this.partyMembers) {
      pm.x = cx; pm.y = cy;
      pm.targetX = cx; pm.targetY = cy;
      pm.alive = true;
    }
  }

  stop() {
    this.running = false;
    this.mechActive = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.player) this.player.destroy();
  }

  // 역할 변경 — 실행 중이면 재초기화
  setPlayerRole(role) {
    this.selectedRole = role;
    if (this.running) this.init();
  }

  // 파티원 오버레이 토글, 반환값: 현재 visible 상태
  togglePartyVisible() {
    this.partyVisible = !this.partyVisible;
    for (const pm of this.partyMembers) pm.visible = this.partyVisible;
    return this.partyVisible;
  }

  // 기믹에서 파티원 목표 위치 지정
  // posMap   : { T1: {x, y}, H2: {x, y}, ... }
  // duration : 지정하면 tweenTo로 정확히 해당 ms 안에 도착, 생략하면 현재 speed로 이동
  setPartyPositions(posMap, duration = null) {
    for (const pm of this.partyMembers) {
      const pos = posMap[pm.role];
      if (!pos) continue;
      if (duration !== null) pm.tweenTo(pos.x, pos.y, duration);
      else pm.setTarget(pos.x, pos.y);
    }
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = this.lastTime ? timestamp - this.lastTime : 16;
    this.lastTime = timestamp;

    if (!this.gameOver) {
      this.player.update(this.canvas.width, this.canvas.height, this.arenaRadius);

      if (this.boss) this.boss.update(dt);

      for (const clone of this.bossClones) clone.update(dt);

      for (const pm of this.partyMembers) pm.update(dt);

      if (this.mechActive && this._mechanicTick) this._mechanicTick(dt);

      // AoE 업데이트
      for (const aoe of this.aoes) aoe.update(dt);

      // 플레이어 피격
      for (const aoe of this.aoes) {
        if (!aoe.hitsPlayer(this.player)) continue;
        if (aoe.type === 'flame' || aoe.type === 'dark') {
          if (!aoe._hitPlayer) {
            aoe._hitPlayer = true;
            this.debuffs[aoe.type]++;
            if (this.debuffs[aoe.type] >= 2) { this.gameOver = true; break; }
          }
        } else {
          this.gameOver = true; break;
        }
      }

      // 파티원 피격 (오버레이 off여도 판정) — flame/dark는 즉사 없음
      for (const pm of this.partyMembers) {
        if (!pm.alive) continue;
        for (const aoe of this.aoes) {
          if (aoe.hitsPlayer(pm) && aoe.type !== 'flame' && aoe.type !== 'dark') {
            pm.alive = false; break;
          }
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

    for (const clone of this.bossClones) clone.draw(ctx);

    for (const aoe of this.aoes) aoe.draw(ctx);

    for (const replica of this.playerReplicas) replica.draw(ctx);

    for (const pm of this.partyMembers) pm.draw(ctx);

    this.player.draw(ctx);

    this._drawDebuffs();

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

  _drawDebuffs() {
    const { ctx, canvas, debuffs, _debuffImgs } = this;
    if (debuffs.flame === 0 && debuffs.dark === 0) return;

    const iconH = 108;
    const pad   = 10;
    const y     = canvas.height - pad - iconH;
    let   x     = canvas.width  - pad;

    const drawIcon = (img) => {
      if (!img.complete || img.naturalWidth === 0) return;
      const w = iconH * (img.naturalWidth / img.naturalHeight);
      x -= w;
      ctx.drawImage(img, x, y, w, iconH);
      x -= pad;
    };

    if (debuffs.dark  > 0) drawIcon(_debuffImgs.dark);
    if (debuffs.flame > 0) drawIcon(_debuffImgs.flame);
  }
}
