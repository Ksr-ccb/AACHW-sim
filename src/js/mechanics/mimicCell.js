// 모방세포 — M12s-P2a-Arena

import { BossClone } from '../core/BossClone.js';

export const ARENA = 'img/M12s-P2a-Arena.png';

const CLONE_ANGLES      = [0, 45, 135, 180, 225, 315];
const CLONE_DIST        = 0.5;
const CLONE_RADIUS      = 0.85;  // engine.tileSize 배율

const MIMIC_ANGLES      = [0, 45, 90, 135, 180, 225, 270, 315];
const MIMIC_DIST        = 0.663;
const MIMIC_RADIUS      = 0.85;  // 조정 가능
const MIMIC_LINE_MS     = 6000;  // 선 유지 시간
const MIMIC_MOVE_MS     = 3000;  // 선 생성 후 AI 이동 대기

// 극좌표(angle°, dist) → 캔버스 픽셀 좌표 (0=북, 시계방향)
function polar(engine, angleDeg, dist) {
  const cx  = engine.canvas.width  / 2;
  const cy  = engine.canvas.height / 2;
  const r   = engine.arenaRadius * dist;
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function roleRevealImg(roleType, imgs) {
  if (roleType === 'T') return imgs.tanker;
  if (roleType === 'H') return imgs.healer;
  return imgs.dealer;
}

function createMimic(pos, angleDeg, player, radius, imgs) {
  const type = player.role[0];
  return {
    x:            pos.x,
    y:            pos.y,
    visible:      true,
    angle:        angleDeg,
    linkedPlayer: player,
    _phase:       'line',     // 'line' | 'revealed'
    _img:         imgs.standard,
    _revealImg:   roleRevealImg(type, imgs),
    _label:       player.role,
    _r:           radius,

    reveal() {
      this._phase = 'revealed';
      this._img   = this._revealImg;
    },

    update(_dt) {},

    draw(ctx) {
      if (!this.visible) return;
      const { x, y, _r: r, linkedPlayer: p } = this;

      // 연결선 (line 페이즈)
      if (this._phase === 'line' && p) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.85)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }

      // 분신 이미지
      if (this._img.complete) {
        ctx.drawImage(this._img, x - r, y - r, r * 2, r * 2);
      }

      // 역할 레이블 (revealed 페이즈)
      if (this._phase === 'revealed') {
        const fs = Math.floor(r * 0.45);
        ctx.save();
        ctx.font          = `bold ${fs}px sans-serif`;
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'middle';
        ctx.lineWidth     = 3;
        ctx.strokeStyle   = '#000000';
        ctx.strokeText(this._label, x, y - r * 0.52);
        ctx.fillStyle     = '#ffffff';
        ctx.fillText(this._label, x, y - r * 0.52);
        ctx.restore();
      }
    },
  };
}

export function mechanicTick(engine) {
  // 보스: 동쪽 방향 고정, T1이 세모 앞에 위치
  engine.boss.setFacing(-Math.PI / 2);
  engine.boss.startCast('모방 세포', 3000);

  const hitboxDist = (engine.boss.radius + 20) / engine.arenaRadius;

  const SPREAD = {
    T1: { angle:  90, dist: hitboxDist },  // 동 — 보스 세모 앞
    T2: { angle: 270, dist: 0.3 },         // 서
    H1: { angle:   0, dist: 0.3 },         // 북
    H2: { angle: 180, dist: 0.3 },         // 남
    D1: { angle: 315, dist: 0.3 },         // 북서
    D2: { angle: 225, dist: 0.3 },         // 남서
    D3: { angle:  45, dist: 0.3 },         // 북동
    D4: { angle: 135, dist: 0.3 },         // 남동
  };

  const resolved = {};
  for (const [role, { angle, dist }] of Object.entries(SPREAD)) {
    resolved[role] = polar(engine, angle, dist);
  }
  engine.setPartyPositions(resolved, 800);

  const MIMIC_CAST_MS   = 3000;
  const FOLLOW_MS       = 10000;
  const REPLICA_CAST_MS = 3000;
  const BOSS_SPEED      = 0.25;  // arenaRadius/s

  const mimicImgs = {
    standard: Object.assign(new Image(), { src: 'img/reference/mimic_standard.png' }),
    tanker:   Object.assign(new Image(), { src: 'img/reference/mimic_tanker.png'   }),
    healer:   Object.assign(new Image(), { src: 'img/reference/mimic_healer.png'   }),
    dealer:   Object.assign(new Image(), { src: 'img/reference/mimic_dealer.png'   }),
  };

  let elapsed          = 0;
  let followStarted    = false;
  let mimicsFired      = false;
  let mimicsMoved      = false;
  let mimicsRevealed   = false;
  let replicaCastFired = false;
  let clonesFired      = false;
  const spawnedMimics  = [];

  return (dt) => {
    elapsed += dt;

    // 모방 세포 캐스팅 종료 → 보스 추적 시작
    if (!followStarted && elapsed >= MIMIC_CAST_MS) {
      followStarted = true;
      engine.boss.stopCast();
    }

    // 플레이어 분신 8개 생성 + 랜덤 연결
    if (!mimicsFired && elapsed >= MIMIC_CAST_MS) {
      mimicsFired = true;
      const allPlayers = [engine.player, ...engine.partyMembers];
      const shuffled   = [...allPlayers].sort(() => Math.random() - 0.5);
      const r          = engine.tileSize * MIMIC_RADIUS;
      MIMIC_ANGLES.forEach((angleDeg, i) => {
        if (i >= shuffled.length) return;
        const pos   = polar(engine, angleDeg, MIMIC_DIST);
        const mimic = createMimic(pos, angleDeg, shuffled[i], r, mimicImgs);
        engine.bossClones.push(mimic);
        spawnedMimics.push(mimic);
      });
    }

    // 선 생성 +3s: T1 제외 AI 파티원이 자기 분신 각도로 이동
    if (!mimicsMoved && mimicsFired && elapsed >= MIMIC_CAST_MS + MIMIC_MOVE_MS) {
      mimicsMoved = true;
      for (const m of spawnedMimics) {
        const p = m.linkedPlayer;
        if (p === engine.player) continue;   // 플레이어는 직접 조작
        if (p.role === 'T1') continue;       // T1은 보스 앞 유지
        const target = polar(engine, m.angle, 0.3);
        p.tweenTo(target.x, target.y, 1000);
      }
    }

    // 선 생성 +6s: 이미지 역할별 변경 + 레이블 표시, 선 제거
    if (!mimicsRevealed && mimicsFired && elapsed >= MIMIC_CAST_MS + MIMIC_LINE_MS) {
      mimicsRevealed = true;
      for (const m of spawnedMimics) m.reveal();
    }

    // 보스가 T1 추적
    if (followStarted && !replicaCastFired) {
      const t1 = engine.player.role === 'T1'
        ? engine.player
        : engine.partyMembers.find(p => p.role === 'T1');
      if (t1) {
        const ddx  = t1.x - engine.boss.x;
        const ddy  = t1.y - engine.boss.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const stop = engine.boss.radius * 1.25 + (t1.radius ?? 18);
        engine.boss.setFacing(Math.atan2(ddy, ddx) - Math.PI / 2);
        if (dist > stop) {
          const step = Math.min(BOSS_SPEED * engine.arenaRadius * dt / 1000, dist - stop);
          engine.boss.x += (ddx / dist) * step;
          engine.boss.y += (ddy / dist) * step;
        }
      }
    }

    // 자가 복제 캐스팅
    if (!replicaCastFired && elapsed >= MIMIC_CAST_MS + FOLLOW_MS) {
      replicaCastFired = true;
      engine.boss.startCast('자가 복제', REPLICA_CAST_MS);
    }

    // 보스 분신 6개 생성
    if (!clonesFired && elapsed >= MIMIC_CAST_MS + FOLLOW_MS + REPLICA_CAST_MS) {
      clonesFired = true;
      engine.boss.stopCast();
      for (const angleDeg of CLONE_ANGLES) {
        const pos    = polar(engine, angleDeg, CLONE_DIST);
        const facing = (angleDeg - 180) * Math.PI / 180;
        const clone  = new BossClone(pos.x, pos.y, {
          facing,
          radius: engine.tileSize * CLONE_RADIUS,
        });
        if (engine.bossImage) clone.image = engine.bossImage;
        engine.bossClones.push(clone);
      }
    }
  };
}
