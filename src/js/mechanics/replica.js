// 레플리카 (복제) — M12s-P2a-Arena

import { BossClone } from '../core/BossClone.js';
import { FanAoE, CircleAoE } from '../core/AoE.js';
import { createTankBuster } from './tankBuster.js';

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
    if (engine.bossImage) clone.image = engine.bossImage;
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
// excludeRoles: Set<string> — 포함된 역할은 건너뜀 (알파벳징 유지 필요 조 등)
function dodgeFans(engine, fans, excludeRoles = null) {
  const cx = engine.canvas.width  / 2;
  const cy = engine.canvas.height / 2;
  const DODGE_RAD = 10 * Math.PI / 180;

  for (const pm of engine.partyMembers) {
    if (!pm.alive) continue;
    if (excludeRoles?.has(pm.role)) continue;
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

// 보스 FanAoE 전조 등장 시 파티원을 보스 뒤쪽으로 이동
function dodgeBossFan(engine, bossFan) {
  const cx      = engine.canvas.width  / 2;
  const cy      = engine.canvas.height / 2;
  const fanMid  = (bossFan.startAngle + bossFan.endAngle) / 2;
  const backDir = fanMid + Math.PI;          // 삼각형 반대 방향
  const dist    = engine.arenaRadius * 0.55;
  const step    = (20 * Math.PI) / 180;     // 파티원 간 20도 간격

  const alive = engine.partyMembers.filter(pm => pm.alive);
  alive.forEach((pm, i) => {
    const offset = (i - (alive.length - 1) / 2) * step;
    pm.tweenTo(
      cx + dist * Math.cos(backDir + offset),
      cy + dist * Math.sin(backDir + offset),
      800,
    );
  });
}

// 보스 뱀발 후려차기 종료 후 파티원을 보스 근처로 집결
// T1 → 보스 머리 앞쪽, 나머지 → 보스 뒤쪽 근처 산개
function movePartyToStack(engine) {
  const cx        = engine.canvas.width  / 2;
  const cy        = engine.canvas.height / 2;
  const canvasDir = engine.boss.angle + Math.PI / 2;
  const frontDist = engine.arenaRadius * 0.28;
  const nearDist  = engine.arenaRadius * 0.20;
  const step      = (28 * Math.PI) / 180;

  const t1 = engine.partyMembers.find(pm => pm.role === 'T1' && pm.alive);
  if (t1) {
    t1.tweenTo(
      cx + frontDist * Math.cos(canvasDir),
      cy + frontDist * Math.sin(canvasDir),
      1000,
    );
  }

  const others = engine.partyMembers.filter(pm => pm.role !== 'T1' && pm.alive);
  others.forEach((pm, i) => {
    const off = (i - (others.length - 1) / 2) * step;
    pm.tweenTo(
      cx + nearDist * Math.cos(canvasDir + Math.PI + off),
      cy + nearDist * Math.sin(canvasDir + Math.PI + off),
      1000,
    );
  });
}

// 분신 분열: 각 클론을 facing 수직 방향으로 좌·우 1개씩 복제 후 원본 제거
// 반환값: { AL, AR, BL, BR, CL, CR, DL, DR }
function splitClones(engine, clonesMap) {
  const cx        = engine.canvas.width  / 2;
  const cy        = engine.canvas.height / 2;
  const splitDist = engine.tileSize * 1.5;
  const result    = {};

  for (const [label, clone] of Object.entries(clonesMap)) {
    const idx = engine.bossClones.indexOf(clone);
    if (idx >= 0) engine.bossClones.splice(idx, 1);

    // 클론→중심 방향의 수직(좌/우) 벡터
    const dx = clone.x - cx;
    const dy = clone.y - cy;
    const d  = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / d;
    const ny = dy / d;

    for (const [suffix, ox, oy] of [['L', -ny, nx], ['R', ny, -nx]]) {
      const c = new BossClone(
        clone.x + ox * splitDist,
        clone.y + oy * splitDist,
        { label: label + suffix, facing: clone.facing, radius: clone.radius },
      );
      if (engine.bossImage) c.image = engine.bossImage;
      engine.bossClones.push(c);
      result[label + suffix] = c;
    }
  }

  return result;
}

// 4개 분신을 대각선 2각도(angleA°, angleB°) × 소/대원에 배치
// 규칙: 같은 쌍은 반드시 다른 각도; 각 각도에 소·대 각 1개
// 반환: [{ clone, x, y }, ...] (속도 미적용, moveClonesToX에서 일괄 적용)
function assignDiagonal(engine, fourClones, angleA, angleB) {
  const [p1L, p1R] = [fourClones[0], fourClones[1]];
  const [p2L, p2R] = [fourClones[2], fourClones[3]];

  // 각 쌍에서 angleA 담당 랜덤 결정
  const [p1a, p1b] = Math.random() < 0.5 ? [p1L, p1R] : [p1R, p1L];
  const [p2a, p2b] = Math.random() < 0.5 ? [p2L, p2R] : [p2R, p2L];

  // angleA 의 소/대 랜덤, angleB는 반전
  const [sA, lA] = Math.random() < 0.5
    ? [CLONE_RING_SMALL, CLONE_RING_LARGE]
    : [CLONE_RING_LARGE, CLONE_RING_SMALL];
  const [sB, lB] = Math.random() < 0.5
    ? [CLONE_RING_SMALL, CLONE_RING_LARGE]
    : [CLONE_RING_LARGE, CLONE_RING_SMALL];

  return [
    { clone: p1a, ...polar(engine, angleA, sA) },
    { clone: p2a, ...polar(engine, angleA, lA) },
    { clone: p1b, ...polar(engine, angleB, sB) },
    { clone: p2b, ...polar(engine, angleB, lB) },
  ];
}

// 불/어둠 4개 분신을 대각선 2각도에 배치 (타입 교차 규칙 적용)
// 규칙: 같은 타입은 반드시 다른 원 → 불이 angleA 소원이면 angleB는 대원, 어둠은 반전
function assignFlameGroup(engine, flamePair, darkPair, angleA, angleB) {
  const [fA, fB] = Math.random() < 0.5 ? flamePair : [flamePair[1], flamePair[0]];
  const [dA, dB] = Math.random() < 0.5 ? darkPair  : [darkPair[1],  darkPair[0]];

  const [ringFA, ringFB] = Math.random() < 0.5
    ? [CLONE_RING_SMALL, CLONE_RING_LARGE]
    : [CLONE_RING_LARGE, CLONE_RING_SMALL];
  const ringDA = ringFA === CLONE_RING_SMALL ? CLONE_RING_LARGE : CLONE_RING_SMALL;
  const ringDB = ringFB === CLONE_RING_SMALL ? CLONE_RING_LARGE : CLONE_RING_SMALL;

  const toRing = r => r === CLONE_RING_SMALL ? 'small' : 'large';
  return [
    { clone: fA, ...polar(engine, angleA, ringFA), type: 'flame', ring: toRing(ringFA), angle: angleA },
    { clone: dA, ...polar(engine, angleA, ringDA), type: 'dark',  ring: toRing(ringDA), angle: angleA },
    { clone: fB, ...polar(engine, angleB, ringFB), type: 'flame', ring: toRing(ringFB), angle: angleB },
    { clone: dB, ...polar(engine, angleB, ringDB), type: 'dark',  ring: toRing(ringDB), angle: angleB },
  ];
}

// 8개 분열 분신을 X자 포지션으로 이동
// - 뱀발세트/불어둠세트 → 각각 다른 대각선
// - 모두 동일 속도(px/frame), 가장 먼 분신이 CLONE_X_MOVE_DURATION_S 초 만에 도착
function moveClonesToX(engine, splitMap, castPair, flameLbl, darkLbl) {
  const snakeGroup = castPair.flatMap(l => [splitMap[l + 'L'], splitMap[l + 'R']]).filter(Boolean);
  const flamePair  = [splitMap[flameLbl + 'L'], splitMap[flameLbl + 'R']].filter(Boolean);
  const darkPair   = [splitMap[darkLbl  + 'L'], splitMap[darkLbl  + 'R']].filter(Boolean);

  const [snakeDiag, flameDiag] = Math.random() < 0.5
    ? [[45, 225], [135, 315]]
    : [[135, 315], [45, 225]];

  const assignments = [
    ...assignDiagonal(engine, snakeGroup, snakeDiag[0], snakeDiag[1]),
    ...assignFlameGroup(engine, flamePair, darkPair, flameDiag[0], flameDiag[1]),
  ];

  // 가장 먼 이동 거리 기준 속도 산출
  let maxDist = 0;
  for (const { clone, x, y } of assignments) {
    const dx = x - clone.x;
    const dy = y - clone.y;
    maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
  }
  const speed = maxDist > 0 ? maxDist / (CLONE_X_MOVE_DURATION_S * 60) : 1;

  for (const { clone, x, y } of assignments) {
    clone.setTarget(x, y, speed);
  }
  return assignments;  // type / ring / angle 메타데이터 포함
}

// 두 객체 간 거리 제곱 (타겟 정렬용)
function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// ── 안전지대 포지션 헬퍼 ───────────────────────────────────────

const ANGLE_TO_ALPHA = { 0: 'A', 90: 'B', 180: 'C', 270: 'D' };
const ANGLE_TO_NUM   = { 0: '1', 90: '2', 180: '3', 270: '4' };

// 해당 cardinal 각도의 알파벳징 위치 (마커 오버레이 우선, 없으면 극좌표 계산)
function getAlphaMarkerPos(engine, angle) {
  const a      = Math.round(((angle % 360) + 360) % 360);
  const label  = ANGLE_TO_ALPHA[a];
  const placed = label ? (engine.markerOverlay?.markers?.[label]) : null;
  return placed ?? polar(engine, a, ALPHA_MARKER_DIST_RATIO);
}

// 해당 cardinal 각도의 숫자징 위치
function getNumMarkerPos(engine, angle) {
  const a      = Math.round(((angle % 360) + 360) % 360);
  const label  = ANGLE_TO_NUM[a];
  const placed = label ? (engine.markerOverlay?.markers?.[label]) : null;
  return placed ?? polar(engine, a, NUM_MARKER_DIST_RATIO);
}

// 정사각형 마커에서 target 방향 꼭지점 위치
function getCornerToward(markerPos, targetPos, size) {
  return {
    x: markerPos.x + Math.sign(targetPos.x - markerPos.x) * size,
    y: markerPos.y + Math.sign(targetPos.y - markerPos.y) * size,
  };
}

// 뱀발 장판 범위 내에 있는 마커 위치를 안전 방향으로 이동 (마커 내부 이탈 금지)
function findSafePosInMarker(markerPos, fans, size, cx, cy) {
  if (!fans.some(f => isInsideFan(markerPos.x, markerPos.y, f))) return markerPos;

  const dx = markerPos.x - cx;
  const dy = markerPos.y - cy;
  const d  = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / d, ny = dy / d;

  for (const [ox, oy] of [[nx, ny], [-nx, -ny], [-ny, nx], [ny, -nx]]) {
    const p = { x: markerPos.x + ox * size, y: markerPos.y + oy * size };
    if (!fans.some(f => isInsideFan(p.x, p.y, f))) return p;
  }
  return markerPos;
}

// AI 파티원을 2회차 안전지대로 이동
// 반환: { outerH, outerD, odLPos, odRPos } — fan dodge 에서 재사용
function positionSafeZones(engine, {
  innerFlameAngle, innerDarkAngle, outerFlameAngle, outerDarkAngle,
  innerDarkHitPair, outerDarkHitPair, innerDarkCl,
}) {
  const markerSize = Math.round(engine.canvas.width / 40);
  const travelMs   = 1800;
  const posMap     = {};

  // ── 내부조 (T1,T2,D1,D2) ────────────────────────────────────
  const innerFlamePair = innerDarkHitPair === 'T1D1' ? ['T1', 'D1'] : ['T2', 'D2'];
  const innerDarkPair  = innerDarkHitPair === 'T1D1' ? ['T2', 'D2'] : ['T1', 'D1'];

  // 불쉐어: 두 명이 innerFlameAngle 방향 dist INNER_FLAME_SHARE_DIST 지점에 겹침
  const flameSharePos = polar(engine, innerFlameAngle, INNER_FLAME_SHARE_DIST);
  for (const role of innerFlamePair) posMap[role] = flameSharePos;

  // 어둠산개: 내부 어둠 분신 양옆 숫자징 꼭지점 (왼쪽=D, 오른쪽=T)
  // 꼭지점 = "분신에서 먼 변 × 중앙에서 가까운 변"의 교점
  //   = 분신이 아레나 중앙 기준 NE에 있으면 모든 숫자징에서 SW 꼭지점
  //   = offset(-sign(cloneX - cx), -sign(cloneY - cy)) * size
  const mLAngle = ((innerDarkAngle - 45) + 360) % 360;
  const mRAngle = (innerDarkAngle + 45) % 360;
  const mLPos   = getNumMarkerPos(engine, mLAngle);
  const mRPos   = getNumMarkerPos(engine, mRAngle);
  const dClPos  = { x: innerDarkCl.targetX, y: innerDarkCl.targetY };
  const arCx    = engine.canvas.width  / 2;
  const arCy    = engine.canvas.height / 2;
  const cOffX   = -Math.sign(dClPos.x - arCx) * markerSize;
  const cOffY   = -Math.sign(dClPos.y - arCy) * markerSize;
  posMap[innerDarkPair.find(r => r.startsWith('D'))] = { x: mLPos.x + cOffX, y: mLPos.y + cOffY };
  posMap[innerDarkPair.find(r => r.startsWith('T'))] = { x: mRPos.x + cOffX, y: mRPos.y + cOffY };

  // ── 외부조 (H1,H2,D3,D4) ────────────────────────────────────
  const outerFlamePair = outerDarkHitPair === 'H1D3' ? ['H1', 'D3'] : ['H2', 'D4'];
  const outerDarkPair  = outerDarkHitPair === 'H1D3' ? ['H2', 'D4'] : ['H1', 'D3'];

  // 불쉐어: 불 분신을 중앙에서 바라볼 때 왼쪽 알파벳징 (시계반대 45°)
  const outerFLPos = getAlphaMarkerPos(engine, (outerFlameAngle - 45 + 360) % 360);
  for (const role of outerFlamePair) posMap[role] = outerFLPos;

  // 어둠산개: 어둠 분신 양옆 알파벳징 (왼쪽=H, 오른쪽=D)
  const odLPos = getAlphaMarkerPos(engine, (outerDarkAngle - 45 + 360) % 360);
  const odRPos = getAlphaMarkerPos(engine, (outerDarkAngle + 45) % 360);
  const outerH = outerDarkPair.find(r => r.startsWith('H'));
  const outerD = outerDarkPair.find(r => r.startsWith('D'));
  posMap[outerH] = odLPos;
  posMap[outerD] = odRPos;

  // AI 파티원만 이동
  const humanRole = engine.selectedRole;
  for (const pm of engine.partyMembers) {
    const pos = posMap[pm.role];
    if (pos && pm.role !== humanRole && pm.alive) pm.tweenTo(pos.x, pos.y, travelMs);
  }

  return { outerH, outerD, odLPos, odRPos, outerFlamePair, outerFLPos };
}

// ── 타임라인 ─────────────────────────────────────────────────────

// 뱀발 후려차기 파라미터 (조정 가능)
const SNAKE_KICK_ANGLE_DEG  = 29;    // 부채꼴 전체 각도
const SNAKE_KICK_CAST_MS    = 3000;  // 캐스팅 총 시간
const SNAKE_KICK_AOE_AT     = 0.7;   // 캐스팅 진행률 몇 % 에서 전조 등장

// 분열 후 X자 이동 파라미터 (조정 가능)
const CLONE_RING_SMALL        = 0.30;  // 아레나 반지름 대비 작은원 거리
const CLONE_RING_LARGE        = 0.675;  // 아레나 반지름 대비 큰원 거리
const CLONE_X_MOVE_DURATION_S = 2.0;  // 가장 먼 분신 기준 이동 시간(초)

// 안전지대 포지션 파라미터 (조정 가능)
const INNER_FLAME_SHARE_DIST  = 0.1;  // 내부 불쉐어 위치 (중앙 마름모 변, 값 조정 가능)
const NUM_MARKER_DIST_RATIO   = 0.388; // 숫자징 거리 비율
const ALPHA_MARKER_DIST_RATIO = 0.663; // 알파벳징 거리 비율

export function mechanicTick(engine) {
  let elapsed       = 0;
  let spreadDone    = false;
  let castDone      = false;
  let aoeDone       = false;
  let flameDarkDone = false;
  let clones        = null;   // { A, B, C, D }
  let castPair      = null;   // 뱀발 후려차기 담당 ['A','C'] | ['B','D']
  let otherPair     = null;   // 불/어둠 담당 나머지 두 분신
  let flameLbl      = null;   // 불 분신 레이블
  let darkLbl       = null;   // 어둠 분신 레이블
  let castDirs      = null;   // 발사 방향 2개 [dir1, dir2]
  let castStartMs     = 0;
  let bossRotStartMs  = 0;
  let bossRotFrom     = 0;
  let bossRotTo       = 0;
  let bossRotDone     = false;
  let bossCastDone    = false;
  let bossAoeDone     = false;
  let bossCastStartMs = 0;
  let stackDone       = false;   // 뱀발 후 파티원 집결
  let flashStartMs    = 0;       // 분신 반짝임 시작 시각
  let splitDone       = false;   // 분신 분열 완료
  let splitTimeMs     = 0;       // 분열 완료 시각
  let splitClonesMap  = null;    // 분열된 분신들
  let moveXDone            = false;  // X자 이동 시작
  let moveXTimeMs          = 0;      // X자 이동 시작 시각
  let repeat2CastDone      = false;
  let repeat2CastStartMs   = 0;
  let repeat2AoeDone       = false;
  let repeat2FlameDarkDone = false;
  // 2회차 안전지대 배치용
  let innerFlameCl      = null;  // 작은원 불 분신
  let innerDarkCl       = null;  // 작은원 어둠 분신
  let outerFlameCl      = null;  // 큰원 불 분신 (미사용, 확장 여지)
  let outerDarkCl       = null;  // 큰원 어둠 분신 (미사용, 확장 여지)
  let innerFlameAngle   = null;
  let innerDarkAngle    = null;
  let outerFlameAngle   = null;
  let outerDarkAngle    = null;
  let innerDarkHitPair  = null;  // 1회차 어둠 맞은 내부 조: 'T1D1' | 'T2D2'
  let outerDarkHitPair  = null;  // 1회차 어둠 맞은 외부 조: 'H1D3' | 'H2D4'
  let safePossDone      = false;
  let outerDarkLRole      = null;
  let outerDarkRRole      = null;
  let outerDarkLPos       = null;
  let outerDarkRPos       = null;
  let outerFlamePairRoles = null;  // 외부 불조 역할 배열 [role, role]
  let outerFlamePairPos   = null;  // 외부 불조가 서는 알파벳징 위치
  // 분신 번쩍임 + 탱버 시퀀스
  let cloneFlashMs    = 0;
  let clonesDespawned = false;
  let tankBuster      = null;    // createTankBuster() 인스턴스

  // 불장판 쉐어 체크용
  let flameAoe1    = null;
  let flameAoe1Chk = false;
  let flameAoe2L   = null;
  let flameAoe2R   = null;
  let flameAoe2Chk = false;

  function checkFlameShare(aoe) {
    const allP   = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
    const inside = allP.filter(p => aoe.hitsPlayer(p));
    if (inside.length < 2) {
      for (const p of inside) {
        if (p === engine.player) engine.gameOver = true;
        else p.alive = false;
      }
      engine.gameOver = true;
    }
  }

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

      // 불/어둠 분신 랜덤 배정 (클로저에 저장해 moveClonesToX에서 재사용)
      const [lblA, lblB] = otherPair;
      flameLbl = Math.random() < 0.5 ? lblA : lblB;
      darkLbl  = flameLbl === lblA ? lblB : lblA;

      const flameClone = clones[flameLbl];
      const darkClone  = clones[darkLbl];

      // 타겟 후보 (플레이어 포함 생존 파티원 전체)
      const allPlayers = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
      const byFlame = [...allPlayers].sort((a, b) => dist2(a, flameClone) - dist2(b, flameClone));
      const byDark  = [...allPlayers].sort((a, b) => dist2(a, darkClone)  - dist2(b, darkClone));

      const flameTarget = byFlame[0];
      const darkTargets = byDark.slice(0, 2);

      // 1회차 어둠 피격 조 추적 → 2회차 배치 분류
      const innerSet = new Set(['T1', 'T2', 'D1', 'D2']);
      const outerSet = new Set(['H1', 'H2', 'D3', 'D4']);
      for (const t of darkTargets) {
        if (!t.role) continue;
        if (innerSet.has(t.role) && !innerDarkHitPair)
          innerDarkHitPair = (t.role === 'T1' || t.role === 'D1') ? 'T1D1' : 'T2D2';
        if (outerSet.has(t.role) && !outerDarkHitPair)
          outerDarkHitPair = (t.role === 'H1' || t.role === 'D3') ? 'H1D3' : 'H2D4';
      }

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
      flameAoe1 = new CircleAoE({
        x: flameTarget.x, y: flameTarget.y,
        radius: aoeR, delay: 0, duration: 1000,
        type: 'flame', colors: FLAME_COLORS,
        icon: engine._debuffImgs.flame,
        noAutoKill: true,
      });
      engine.aoes.push(flameAoe1);

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

    // 회전 완료 + 1초 후: 보스 '뱀발 후려차기' 3초 캐스팅 시작
    if (bossRotDone && !bossCastDone && elapsed >= bossRotStartMs + 1500) {
      bossCastDone    = true;
      bossCastStartMs = elapsed;
      engine.boss.startCast('뱀발 후려차기', 3000);
    }

    // 캐스팅 70%: 보스 정면 180도 FanAoE 전조 생성 + 파티원 뒤로 회피
    // boss.angle + π/2 = 실제 캔버스 방향 (ctx.rotate(angle - π) 후 위쪽 삼각형 기준)
    if (bossCastDone && !bossAoeDone) {
      const bossElapsed = elapsed - bossCastStartMs;
      if (bossElapsed >= 3000 * 0.7) {
        bossAoeDone = true;
        const cx        = engine.canvas.width  / 2;
        const cy        = engine.canvas.height / 2;
        const canvasDir = engine.boss.angle + Math.PI / 2;
        const bossFan   = new FanAoE({
          x: cx, y: cy,
          radius:     engine.arenaRadius,
          startAngle: canvasDir - Math.PI / 2,
          endAngle:   canvasDir + Math.PI / 2,
          delay:      3000 * 0.3,
          duration:   500,
          colors:     SNAKE_KICK_COLORS,
        });
        engine.aoes.push(bossFan);
        dodgeBossFan(engine, bossFan);
      }
    }

    // 6. 보스 뱀발 종료 → 파티원 보스 근처로 집결 (T1은 머리 앞)
    if (bossCastDone && !stackDone && elapsed >= bossCastStartMs + 3000) {
      stackDone = true;
      movePartyToStack(engine);
    }

    // 7. 집결 3초 후 분신 반짝임 시작
    if (stackDone && flashStartMs === 0 && elapsed >= bossCastStartMs + 6000) {
      flashStartMs = elapsed;
    }

    // 분신 반짝임 애니메이션 (100ms 주기, 0.5초간)
    if (flashStartMs > 0 && !splitDone) {
      const fElapsed = elapsed - flashStartMs;
      const phase    = Math.floor(fElapsed / 100) % 2;
      for (const clone of engine.bossClones) clone.visible = phase === 0;

      // 0.5초 후 분열
      if (fElapsed >= 500) {
        splitDone    = true;
        splitTimeMs  = elapsed;
        for (const clone of engine.bossClones) clone.visible = true;
        splitClonesMap = splitClones(engine, clones);
      }
    }

    // 9. 분열 완료 2초 후 → X자 포지션으로 이동 (동일 속도)
    if (splitDone && !moveXDone && elapsed >= splitTimeMs + 2000) {
      moveXDone   = true;
      moveXTimeMs = elapsed;
      const xAssign = moveClonesToX(engine, splitClonesMap, castPair, flameLbl, darkLbl);
      // 불/어둠 분신의 링·각도 기록 (안전지대 계산용)
      for (const item of xAssign) {
        if (!item.type) continue;
        if (item.type === 'flame' && item.ring === 'small') { innerFlameCl = item.clone; innerFlameAngle = item.angle; }
        if (item.type === 'dark'  && item.ring === 'small') { innerDarkCl  = item.clone; innerDarkAngle  = item.angle; }
        if (item.type === 'flame' && item.ring === 'large') { outerFlameCl = item.clone; outerFlameAngle = item.angle; }
        if (item.type === 'dark'  && item.ring === 'large') { outerDarkCl  = item.clone; outerDarkAngle  = item.angle; }
      }
    }

    // 10. X자 이동 완료(2초) + 대기(2초) 후 → 2회차 뱀발 후려차기 캐스팅 + 안전지대 이동
    if (moveXDone && !repeat2CastDone && elapsed >= moveXTimeMs + CLONE_X_MOVE_DURATION_S * 1000 + 2000) {
      repeat2CastDone    = true;
      repeat2CastStartMs = elapsed;
      for (const label of castPair) {
        for (const suffix of ['L', 'R']) {
          splitClonesMap[label + suffix]?.startCast('뱀발 후려차기', SNAKE_KICK_CAST_MS);
        }
      }
      // 안전지대 이동 (어둠 피격 정보가 충분한 경우에만)
      if (!safePossDone && innerFlameAngle != null && innerDarkAngle != null
          && outerFlameAngle != null && outerDarkAngle != null
          && innerDarkHitPair && outerDarkHitPair) {
        safePossDone = true;
        const result = positionSafeZones(engine, {
          innerFlameAngle, innerDarkAngle, outerFlameAngle, outerDarkAngle,
          innerDarkHitPair, outerDarkHitPair, innerDarkCl,
        });
        outerDarkLRole      = result.outerH;
        outerDarkRRole      = result.outerD;
        outerDarkLPos       = result.odLPos;
        outerDarkRPos       = result.odRPos;
        outerFlamePairRoles = result.outerFlamePair;
        outerFlamePairPos   = result.outerFLPos;
      }
    }

    // 2회차 캐스팅 70%: 전조 등장 + AI 회피 (castDirs 재사용 = 맵 기준 동일 방향)
    if (repeat2CastDone && !repeat2AoeDone) {
      const r2Elapsed = elapsed - repeat2CastStartMs;
      if (r2Elapsed >= SNAKE_KICK_CAST_MS * SNAKE_KICK_AOE_AT) {
        repeat2AoeDone = true;
        const remainMs = SNAKE_KICK_CAST_MS * (1 - SNAKE_KICK_AOE_AT);
        const spawnedFans = [];
        for (const label of castPair) {
          for (const suffix of ['L', 'R']) {
            const clone = splitClonesMap[label + suffix];
            if (!clone) continue;
            for (const dir of castDirs) {
              spawnedFans.push(spawnFanFromClone(engine, clone, dir, SNAKE_KICK_ANGLE_DEG, remainMs));
            }
          }
        }
        // 외부조(H1,H2,D3,D4)는 알파벳징을 이탈하면 안 되므로 dodgeFans 제외
        const outerGroupExclude = new Set(['H1', 'H2', 'D3', 'D4']);
        dodgeFans(engine, spawnedFans, outerGroupExclude);

        const mSize = Math.round(engine.canvas.width / 40);
        const cx    = engine.canvas.width  / 2;
        const cy    = engine.canvas.height / 2;

        // 외부 어둠조: 각자 알파벳징 내부 안전위치로 미세 조정
        if (outerDarkLPos && outerDarkLRole) {
          const safe = findSafePosInMarker(outerDarkLPos, spawnedFans, mSize, cx, cy);
          const pm   = engine.partyMembers.find(p => p.role === outerDarkLRole && p.alive);
          if (pm) pm.tweenTo(safe.x, safe.y, 400);
        }
        if (outerDarkRPos && outerDarkRRole) {
          const safe = findSafePosInMarker(outerDarkRPos, spawnedFans, mSize, cx, cy);
          const pm   = engine.partyMembers.find(p => p.role === outerDarkRRole && p.alive);
          if (pm) pm.tweenTo(safe.x, safe.y, 400);
        }

        // 외부 불조: 공유 알파벳징 내부 안전위치로 미세 조정
        if (outerFlamePairPos && outerFlamePairRoles) {
          const safe = findSafePosInMarker(outerFlamePairPos, spawnedFans, mSize, cx, cy);
          for (const role of outerFlamePairRoles) {
            const pm = engine.partyMembers.find(p => p.role === role && p.alive);
            if (pm) pm.tweenTo(safe.x, safe.y, 400);
          }
        }
      }
    }

    // 2회차 캐스팅 종료: 불/어둠 착탄 (분열된 각 분신이 독립적으로 실행)
    if (repeat2CastDone && !repeat2FlameDarkDone && elapsed >= repeat2CastStartMs + SNAKE_KICK_CAST_MS) {
      repeat2FlameDarkDone = true;
      const allPlayers = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
      const aoeR = Math.round(engine.canvas.width / 40 * 1.1 * 3);

      for (const suffix of ['L', 'R']) {
        const flameClone = splitClonesMap[flameLbl + suffix];
        if (flameClone) {
          const byDist = [...allPlayers].sort((a, b) => dist2(a, flameClone) - dist2(b, flameClone));
          const target = byDist[0];
          flameClone.x = target.x;
          flameClone.y = target.y;
          const fAoe = new CircleAoE({
            x: target.x, y: target.y,
            radius: aoeR, delay: 0, duration: 1000,
            type: 'flame', colors: FLAME_COLORS,
            icon: engine._debuffImgs.flame,
            noAutoKill: true,
          });
          engine.aoes.push(fAoe);
          if (suffix === 'L') flameAoe2L = fAoe; else flameAoe2R = fAoe;
        }

        const darkClone = splitClonesMap[darkLbl + suffix];
        if (darkClone) {
          const byDist = [...allPlayers].sort((a, b) => dist2(a, darkClone) - dist2(b, darkClone));
          for (const target of byDist.slice(0, 2)) {
            engine.aoes.push(new CircleAoE({
              x: target.x, y: target.y,
              radius: aoeR, delay: 0, duration: 1000,
              type: 'dark', colors: DARK_COLORS,
              icon: engine._debuffImgs.dark,
            }));
          }
        }
      }
    }

    // ── 이중 뒤돌려차기 시퀀스 ────────────────────────────────────

    // 2회차 착탄 2초 후: 분신 번쩍임 시작
    if (repeat2FlameDarkDone && cloneFlashMs === 0
        && elapsed >= repeat2CastStartMs + SNAKE_KICK_CAST_MS + 2000) {
      cloneFlashMs = elapsed;
    }

    // 번쩍임 애니메이션(100ms 주기) → 500ms 후 분신 전원 제거 + 보스 회전 + 탱버 캐스팅 시작
    if (cloneFlashMs > 0 && !clonesDespawned) {
      const fE    = elapsed - cloneFlashMs;
      const phase = Math.floor(fE / 100) % 2;
      if (splitClonesMap) {
        for (const cl of Object.values(splitClonesMap)) if (cl) cl.visible = phase === 0;
      }
      if (fE >= 500) {
        clonesDespawned   = true;
        engine.bossClones = [];
        tankBuster        = createTankBuster(engine);
        tankBuster.start();
      }
    }

    // 불장판 쉐어 체크 (혼자 맞으면 사망)
    if (flameAoe1 && !flameAoe1Chk && flameAoe1.isExploding) {
      flameAoe1Chk = true;
      checkFlameShare(flameAoe1);
    }
    if (!flameAoe2Chk && (flameAoe2L?.isExploding || flameAoe2R?.isExploding)) {
      flameAoe2Chk = true;
      if (flameAoe2L) checkFlameShare(flameAoe2L);
      if (flameAoe2R) checkFlameShare(flameAoe2R);
    }

    // 탱버 + 랜덤 회전 + 뱀발 + 산개 + 원 — tankBuster 가 내부 상태를 모두 관리
    tankBuster?.tick(dt);
  };
}
