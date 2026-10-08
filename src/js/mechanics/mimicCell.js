// 모방세포 — M12s-P2a-Arena

import { BossClone } from '../core/BossClone.js';

export const ARENA = 'img/M12s-P2a-Arena.png';

const CLONE_ANGLES      = [0, 60, 120, 180, 240, 300];
const CLONE_DIST        = 0.4;
const CLONE_RADIUS      = 0.9;  // engine.tileSize 배율 (보스 ~2.0보다 작게)

// 극좌표(angle°, dist) → 캔버스 픽셀 좌표 (0=북, 시계방향)
function polar(engine, angleDeg, dist) {
  const cx  = engine.canvas.width  / 2;
  const cy  = engine.canvas.height / 2;
  const r   = engine.arenaRadius * dist;
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export function mechanicTick(engine) {
  // 보스: 동쪽(오른쪽) 방향 고정, T1이 세모 앞에 위치
  engine.boss.setFacing(-Math.PI / 2);
  engine.boss.startCast('모방 세포', 3000);

  const hitboxDist = (engine.boss.radius + 20) / engine.arenaRadius;

  const SPREAD = {
    T1: { angle:  90, dist: hitboxDist },  // 동 — 보스 세모 앞
    T2: { angle: 270, dist: 0.3 },         // 서 — 보스 후방
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

  let elapsed           = 0;
  let followStarted     = false;
  let replicaCastFired  = false;
  let clonesFired       = false;

  return (dt) => {
    elapsed += dt;

    if (!followStarted && elapsed >= MIMIC_CAST_MS) {
      followStarted = true;
      engine.boss.stopCast();
    }

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

    if (!replicaCastFired && elapsed >= MIMIC_CAST_MS + FOLLOW_MS) {
      replicaCastFired = true;
      engine.boss.startCast('자가 복제', REPLICA_CAST_MS);
    }

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
