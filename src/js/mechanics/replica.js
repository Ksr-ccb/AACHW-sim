// 레플리카 (복제) — M12s-P2a-Arena

import { BossClone } from '../core/BossClone.js';
import { FanAoE, CircleAoE } from '../core/AoE.js';

export const ARENA = 'img/M12s-P2a-Arena.png';

// ═══════════════════════════════════════════════════════════════
//  포지션 정의
//
//  angle : 시계방향 각도
//            0   = 북(위)    90  = 동(오른쪽)
//            180 = 남(아래)  270 = 서(왼쪽)
//  dist  : 아레나 반지름 대비 비율  (0=중앙, 1=벽)
// ═══════════════════════════════════════════════════════════════

// 알파벳징 위치와 일치하는 보스 분신 정의
// dist 0.663 = DEFAULT_PRESET ry≈0.215 기준 (중심에서 떨어진 거리 / arenaRadius)
// facing : 분신이 중앙을 향하는 방향 (BossClone 기준 0=북, 시계방향 라디안)
const BOSS_CLONE_DEFS = [
  { label: 'A', angle:   0, dist: 0.663, facing: Math.PI       }, // 북 → 남(중앙)쪽
  { label: 'B', angle:  90, dist: 0.663, facing: -Math.PI / 2  }, // 동 → 서(중앙)쪽
  { label: 'C', angle: 180, dist: 0.663, facing: 0             }, // 남 → 북(중앙)쪽
  { label: 'D', angle: 270, dist: 0.663, facing: Math.PI / 2   }, // 서 → 동(중앙)쪽
];

const SPREAD_POSITIONS = {
  T1: { angle: 327, dist: 0.39 },
  T2: { angle: 147, dist: 0.39 },
  H1: { angle: 237, dist: 0.39 },
  H2: { angle:  57, dist: 0.39 },
  D1: { angle: 303, dist: 0.39 },
  D2: { angle: 123, dist: 0.39 },
  D3: { angle: 213, dist: 0.39 },
  D4: { angle:  33, dist: 0.39 },
};

// ── 내부 헬퍼 ────────────────────────────────────────────────────

// 극좌표(angle°, dist) → 캔버스 픽셀 좌표
function polar(engine, angle, dist) {
  const cx  = engine.canvas.width  / 2;
  const cy  = engine.canvas.height / 2;
  const r   = engine.arenaRadius * dist;
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

// posMap의 모든 역할을 캔버스 좌표로 변환해서 engine에 전달
function applyPositions(engine, posMap, duration) {
  const resolved = {};
  for (const [role, { angle, dist }] of Object.entries(posMap)) {
    resolved[role] = polar(engine, angle, dist);
  }
  engine.setPartyPositions(resolved, duration);
}

// 알파벳징 위치에 보스 분신 4개 생성
// 바닥징이 실제로 찍혀 있으면 그 좌표를 우선 사용, 없으면 DEFAULT_PRESET 기준 polar 값
// 반환값: { A, B, C, D } — 각 레이블에 해당하는 BossClone 참조
function spawnBossClones(engine) {
  const markerMap = engine.markerOverlay?.markers ?? {};
  const cloneRadius = engine.tileSize * 1.2;
  const map = {};

  for (const { label, angle, dist, facing } of BOSS_CLONE_DEFS) {
    const marker = markerMap[label];
    const pos = marker ? { x: marker.x, y: marker.y } : polar(engine, angle, dist);
    const clone = new BossClone(pos.x, pos.y, { label, facing, radius: cloneRadius });
    engine.bossClones.push(clone);
    map[label] = clone;
  }

  return map;
}

// 뱀발 후려차기 부채꼴 AoE 색상
const SNAKE_KICK_COLORS = {
  telegraphRGB:    '255,220,0',
  explodeRGB:      '220,30,30',
  telegraphStroke: '#ccaa00',
  explodeStroke:   '#aa0000',
};

// 불/어둠 원형 AoE 색상 (즉시 착탄 = explode 색상만 사용)
const FLAME_COLORS = { explodeRGB: '220,30,30', explodeStroke: '#aa0000' };
const DARK_COLORS  = { explodeRGB: '220,30,30', explodeStroke: '#aa0000' };

// 분신 위치에서 지정 방향으로 부채꼴 AoE 등록
// canvasDir  : Math.atan2 기준 캔버스 각도 (0=동, -π/2=북, π=서, π/2=남)
// angleDeg   : 부채꼴 전체 각도 (도)
// telegraphMs: 전조 표시 시간 (= 캐스팅 잔여 30%)
function spawnFanFromClone(engine, clone, canvasDir, angleDeg, telegraphMs) {
  const half = (angleDeg / 2) * (Math.PI / 180);
  // 클론은 이미 중심에서 떨어진 위치이므로 반대편 벽까지 닿으려면 ×2 필요
  const fan = new FanAoE({
    x: clone.x, y: clone.y,
    radius:     engine.arenaRadius * 2,
    startAngle: canvasDir - half,
    endAngle:   canvasDir + half,
    delay:      telegraphMs,
    duration:   500,
    colors:     SNAKE_KICK_COLORS,
  });
  engine.aoes.push(fan);
  return fan;
}

// 점(px, py)이 FanAoE 부채꼴 영역 안에 있는지 확인 (전조·착탄 구분 없음)
function isInsideFan(px, py, fan) {
  const dx = px - fan.x;
  const dy = py - fan.y;
  if (Math.sqrt(dx * dx + dy * dy) > fan.radius) return false;
  let angle = Math.atan2(dy, dx);
  while (angle < fan.startAngle) angle += Math.PI * 2;
  return angle <= fan.endAngle + (fan.endAngle < fan.startAngle ? Math.PI * 2 : 0);
}

// 부채꼴 장판 위에 서 있는 AI 파티원을 중앙 기준 ±10도 회전하여 회피
function dodgeFans(engine, fans) {
  const cx = engine.canvas.width  / 2;
  const cy = engine.canvas.height / 2;
  const DODGE_RAD = 10 * Math.PI / 180;

  for (const pm of engine.partyMembers) {
    if (!pm.alive) continue;
    const hitFan = fans.find(f => isInsideFan(pm.x, pm.y, f));
    if (!hitFan) continue;

    const dx = pm.x - cx;
    const dy = pm.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;

    // 팬 중심 방향 대비 플레이어 위치 → 반대 방향으로 10도 회전
    const fanMid = (hitFan.startAngle + hitFan.endAngle) / 2;
    let diff = Math.atan2(pm.y - hitFan.y, pm.x - hitFan.x) - fanMid;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const rotDir = diff >= 0 ? 1 : -1;
    const newAngle = Math.atan2(dy, dx) + rotDir * DODGE_RAD;
    pm.tweenTo(cx + dist * Math.cos(newAngle), cy + dist * Math.sin(newAngle), 400);
  }
}

// 두 객체 간 거리 제곱 (타겟 정렬용)
function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// ── 타임라인 ─────────────────────────────────────────────────────

// 뱀발 후려차기 파라미터 (조정 가능)
const SNAKE_KICK_ANGLE_DEG  = 30;    // 부채꼴 전체 각도
const SNAKE_KICK_CAST_MS    = 3000;  // 캐스팅 총 시간
const SNAKE_KICK_AOE_AT     = 0.7;   // 캐스팅 진행률 몇 % 에서 전조 등장

export function mechanicTick(engine) {
  let elapsed       = 0;
  let spreadDone    = false;
  let castDone      = false;
  let aoeDone       = false;
  let flameDarkDone = false;
  let clones        = null;   // { A, B, C, D }
  let castPair      = null;   // 뱀발 후려차기 담당 ['A','C'] | ['B','D']
  let otherPair     = null;   // 불/어둠 담당 나머지 두 분신
  let castDirs      = null;   // 발사 방향 2개 [dir1, dir2]
  let castStartMs     = 0;
  let bossRotStartMs  = 0;
  let bossRotFrom     = 0;
  let bossRotTo       = 0;
  let bossRotDone     = false;
  let bossCastDone    = false;
  let bossAoeDone     = false;
  let bossCastStartMs = 0;

  return (dt) => {
    elapsed += dt;


    // 1. 시작 1초후 ai 플레이어와 분신이 등장 및 이동 [v]
    // t=1000ms : AI 산개 이동 + 보스 분신 4개 등장
    if (!spreadDone && elapsed >= 1000) {
      spreadDone = true;
      applyPositions(engine, SPREAD_POSITIONS, 1000);
      clones = spawnBossClones(engine);
    }

    // 2, 시작 1.5초후 분신에게 3초짜리 캐스팅바가 시작함. [v]
    //   => 이때 AC / BD 세트로 불,어둠 / 좌 혹은 우 부채꼴 AOE 장판 생성 결정
    // t=2000ms : 분신 등장 1초 후, [A,C] 또는 [B,D] 랜덤 "뱀발 후려차기" 캐스팅
    if (clones && !castDone && elapsed >= 2000) {
      castDone    = true;
      castStartMs = elapsed;

      castPair  = Math.random() < 0.5 ? ['A', 'C'] : ['B', 'D'];
      otherPair = ['A', 'B', 'C', 'D'].filter(l => !castPair.includes(l));

      // 좌우(동+서) 또는 위아래(북+남) 중 랜덤 — 쌍에 무관하게 동일
      castDirs = Math.random() < 0.5
        ? [0, Math.PI]             // 좌우 : 동(0) + 서(π)
        : [-Math.PI / 2, Math.PI / 2]; // 위아래 : 북(-π/2) + 남(π/2)

      for (const label of castPair) {
        clones[label].startCast('뱀발 후려차기', SNAKE_KICK_CAST_MS);
      }
    }
    //   TODO: 불,어둠 장판과 좌 혹은 우 부채꼴 장판 기능 함수 제작 (각 장판 디버프 생성, 불장판은 분신이동)
    // 3. 분신의 3초짜리 캐스팅바가 70프로진행되었을 때, AOE장판의 경우 생성위치 미리 보여줌 [v]
    // 캐스팅 70%: 부채꼴 전조 생성 (delay = 잔여 30% 시간)
    // 전조가 생김 동시에 ai 플레이어가 만약 자신이 장판위에 서잇다면 장판이없는 방향으로 10도 이동
    if (castPair && !aoeDone) {
      const castElapsed = elapsed - castStartMs;
      if (castElapsed >= SNAKE_KICK_CAST_MS * SNAKE_KICK_AOE_AT) {
        aoeDone = true;
        const remainMs = SNAKE_KICK_CAST_MS * (1 - SNAKE_KICK_AOE_AT);
        const spawnedFans = [];
        for (const label of castPair) {
          for (const dir of castDirs) {
            spawnedFans.push(spawnFanFromClone(engine, clones[label], dir, SNAKE_KICK_ANGLE_DEG, remainMs));
          }
        }
        dodgeFans(engine, spawnedFans);
      }
    }
    // 5. t=5000ms (뱀발 캐스팅 종료): 불/어둠 착탄 + 불 분신 타겟 위치로 이동
    if (clones && otherPair && !flameDarkDone && elapsed >= castStartMs + SNAKE_KICK_CAST_MS) {
      flameDarkDone = true;

      // 불/어둠 분신 랜덤 배정
      const [lblA, lblB] = otherPair;
      const flameLbl = Math.random() < 0.5 ? lblA : lblB;
      const darkLbl  = flameLbl === lblA ? lblB : lblA;

      const flameClone = clones[flameLbl];
      const darkClone  = clones[darkLbl];

      // 타겟 후보 (플레이어 포함 생존 파티원 전체)
      const allPlayers = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
      const byFlame = [...allPlayers].sort((a, b) => dist2(a, flameClone) - dist2(b, flameClone));
      const byDark  = [...allPlayers].sort((a, b) => dist2(a, darkClone)  - dist2(b, darkClone));

      const flameTarget = byFlame[0];
      const darkTargets = byDark.slice(0, 2);

      // 불 분신: 착탄 직전 타겟 위치로 이동
      flameClone.x = flameTarget.x;
      flameClone.y = flameTarget.y;

      // 보스 회전 시작 (착탄과 동시에 1초간 랜덤 회전)
      bossRotStartMs = elapsed;
      bossRotFrom    = engine.boss.angle;
      bossRotTo      = Math.random() * Math.PI * 2;

      // 바닥징(알파벳징) 크기 × 3
      const aoeR = Math.round(engine.canvas.width / 40 * 1.1 * 3);

      // 4. 분신의 3초짜리 캐스팅바가 70프로 진행되었을 때, 불/어둠 대상자 선별종료
      // 5. 분신의 3초짜리 캐스팅바가 종료되고 불/어둠 대상자에게 장판을 생성
      //   => 불/어둠 장판을 2개이상 맞은 경우 바로 게임오버
      engine.aoes.push(new CircleAoE({
        x: flameTarget.x, y: flameTarget.y,
        radius: aoeR, delay: 0, duration: 1000,
        type: 'flame', colors: FLAME_COLORS,
        icon: engine._debuffImgs.flame,
      }));

      for (const target of darkTargets) {
        engine.aoes.push(new CircleAoE({
          x: target.x, y: target.y,
          radius: aoeR, delay: 0, duration: 1000,
          type: 'dark', colors: DARK_COLORS,
          icon: engine._debuffImgs.dark,
        }));
      }
    }

    // 보스 회전 애니메이션 (착탄 동시에 시작, 1초간)
    if (bossRotStartMs > 0 && !bossRotDone) {
      const rElapsed = elapsed - bossRotStartMs;
      if (rElapsed >= 500) {
        engine.boss.setFacing(bossRotTo);
        bossRotDone = true;
      } else {
        engine.boss.setFacing(bossRotFrom + (bossRotTo - bossRotFrom) * (rElapsed / 500));
      }
    }

    // 회전 완료 + 0.5초 후: 보스 '뱀발 후려차기' 3초 캐스팅 시작
    if (bossRotDone && !bossCastDone && elapsed >= bossRotStartMs + 1000) {
      bossCastDone    = true;
      bossCastStartMs = elapsed;
      engine.boss.startCast('뱀발 후려차기', 2000);
    }

    // 캐스팅 70%: 보스 정면 180도 FanAoE 전조 생성
    // boss.angle + π/2 = 실제 캔버스 방향 (ctx.rotate(angle - π) 후 위쪽 삼각형 기준)
    if (bossCastDone && !bossAoeDone) {
      const bossElapsed = elapsed - bossCastStartMs;
      if (bossElapsed >= 2000 * 0.7) {
        bossAoeDone = true;
        const cx        = engine.canvas.width  / 2;
        const cy        = engine.canvas.height / 2;
        const canvasDir = engine.boss.angle + Math.PI / 2;
        engine.aoes.push(new FanAoE({
          x: cx, y: cy,
          radius:     engine.arenaRadius,
          startAngle: canvasDir - Math.PI / 2,
          endAngle:   canvasDir + Math.PI / 2,
          delay:      3000 * 0.3,
          duration:   500,
          colors:     SNAKE_KICK_COLORS,
        }));
      }
    }

    //   => 장판 생성과 동시에 중앙에 있는 보스의 머리를 0~Math.PI만큼 랜덤이동 후 앞갈죽 캐스팅 3초시작
    //   TODO: 앞갈죽 장판을 생성하는 함수 제작
    // 6. 앞갈죽 장판 생성후 2초간 분신 분열
    //   => 분열기준은 원래 분신이 있던 자리에서 좌우로 1타일반큼 떨어진거리에 같은 속성의 분신 2개씩 생성
    // 7. 분신 분열 후 2초대기 후 야바위 (야바위 자리이동 1초)
    //   => 어둠과 불은 x 자 기준 같은 직선상에서 어둠/불 교차 생성해야함.
    //   TODO: 공략에 맞는 자리 미세조정 필요
    // 8. 야바위 자리 이동 후 3초대기
    // 9. 야바위 자리 이동 후 1초 대기 후 AI플레이어 각자 자리로 이동(디폴트 속도로 이동(멀면2초, 가까우면1초))
    //   TODO: 샤갈 얘네 움직이는 로직언제다짬(역할별 근딜/원딜/탱커/힐러 분신위치기준 RADIUS와 RADIAN값 조정)
    // 10. 분신 캐스팅시작 2초
    // 11. 착탄( TODO: 3.매커니즘 유지 )
  };
}
