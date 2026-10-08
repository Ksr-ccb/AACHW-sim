// 마나스피어 — M12s-P2a-Arena

import { CircleAoE, DonutAoE, FanAoE } from '../core/AoE.js';

export const ARENA = 'img/M12s-P2a-Arena.png';

const SPHERE_DIST = 0.44;
const SPHERE_SIZE = 0.15;

const ORB_OFFSET_SHORT = 0.25;
const ORB_OFFSET_LONG  = 0.5;
const ORB_HEIGHT = {
  red:    0.08,
  green:  0.15,
  purple: 0.2,
  blue:   0.12,
};
const ORB_ANGLE_DEG = {
  RG: 27.5,
  PB: 27.5,
};

const ORB_MOVE_SPEED    = ORB_OFFSET_LONG / 5000;  // arenaRadius 비율 / ms
const ORB_HIT_DIST      = 0.05;   // 충돌 판정 거리 (arenaRadius 비율)
const ORB_PAUSE_MS      = 2500;   // 충돌 시 오브 정지 시간 (ms)
const BOSS_FOLLOW_SPEED = 0.15;   // 보스 추적 속도 (arenaRadius / sec)

const PAIR = {
  red:    'RG',
  green:  'RG',
  purple: 'PB',
  blue:   'PB',
};

const ORB_CORNERS = [
  { key: 'NW', signX: -1, signY: -1 },
  { key: 'NE', signX:  1, signY: -1 },
  { key: 'SW', signX: -1, signY:  1 },
  { key: 'SE', signX:  1, signY:  1 },
];

function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const sphereImg = loadImg('img/reference/mana_sphere_before.jpg');
const afterImg  = loadImg('img/reference/mana_sphere_after.jpg');
const switchImg = loadImg('img/reference/mana_sphere_switch.jpg');
const alphaImg  = loadImg('img/reference/mana_sphere_alpha.jpg');
const betaImg   = loadImg('img/reference/mana_sphere_beta.jpg');
const orbImgs = {
  red:    loadImg('img/reference/mana_sphere_red.jpg'),
  purple: loadImg('img/reference/mana_sphere_purple.jpg'),
  green:  loadImg('img/reference/mana_sphere_green.jpg'),
  blue:   loadImg('img/reference/mana_sphere_blue.jpg'),
};

function randomColorAssignment() {
  if (Math.random() < 0.5) {
    return { NW: 'red', SE: 'green', NE: 'purple', SW: 'blue' };
  } else {
    return { NW: 'purple', SE: 'blue', NE: 'red', SW: 'green' };
  }
}

// ── SphereDrawable ───────────────────────────────────────────────

class SphereDrawable {
  constructor(engine, dx, colorAssignment, shortPair) {
    this.engine       = engine;
    this.dx           = dx;
    this.shortPair    = shortPair;
    this.visible      = true;
    this.showOrbs     = false;

    this.orbs = ORB_CORNERS.map(({ key, signX, signY }) => {
      const color      = colorAssignment[key];
      const pair       = PAIR[color];
      const isShort    = pair === shortPair;
      const initOffset = isShort ? ORB_OFFSET_SHORT : ORB_OFFSET_LONG;
      return {
        key, signX, signY, color, pair, isShort,
        offset: initOffset,
        pauseMs: 0,
        used: false,
        side: signY < 0 ? 'north' : 'south',
        absorbedAt: Infinity,
      };
    });
  }

  // 오브의 현재 캔버스 좌표
  orbWorldPos(orb) {
    const { engine, dx } = this;
    const r        = engine.arenaRadius;
    const cx       = engine.canvas.width  / 2;
    const cy       = engine.canvas.height / 2;
    const sx       = cx + dx * SPHERE_DIST * r;
    const sy       = cy;
    const offset   = orb.offset * r;
    const angleRad = ORB_ANGLE_DEG[orb.pair] * (Math.PI / 180);
    return {
      x: sx + orb.signX * Math.sin(angleRad) * offset,
      y: sy + orb.signY * Math.cos(angleRad) * offset,
    };
  }

  // 구 중심에서 fractionDist 거리에 위치한 오브 방향의 인터셉트 좌표
  orbInterceptPos(orb, fractionDist) {
    const { engine, dx } = this;
    const r        = engine.arenaRadius;
    const cx       = engine.canvas.width  / 2;
    const cy       = engine.canvas.height / 2;
    const sx       = cx + dx * SPHERE_DIST * r;
    const sy       = cy;
    const dist     = fractionDist * r;
    const angleRad = ORB_ANGLE_DEG[orb.pair] * (Math.PI / 180);
    return {
      x: sx + orb.signX * Math.sin(angleRad) * dist,
      y: sy + orb.signY * Math.cos(angleRad) * dist,
    };
  }

  tickOrbs(dt, elapsed) {
    for (const orb of this.orbs) {
      if (orb.pauseMs > 0) {
        orb.pauseMs = Math.max(0, orb.pauseMs - dt);
      } else if (orb.offset > 0) {
        orb.offset = Math.max(0, orb.offset - ORB_MOVE_SPEED * dt);
        if (orb.offset === 0) orb.absorbedAt = elapsed;
      }
    }
  }

  // wave 0 = 먼저 흡수된 절반, wave 1 = 나중 흡수된 절반
  getWaveColors(waveIndex) {
    const absorbed = [...this.orbs]
      .filter(o => o.absorbedAt < Infinity)
      .sort((a, b) => a.absorbedAt - b.absorbedAt);
    const mid = Math.ceil(absorbed.length / 2);
    return (waveIndex === 0 ? absorbed.slice(0, mid) : absorbed.slice(mid))
      .map(o => o.color);
  }

  draw(ctx) {
    const { engine, dx } = this;
    const cx = engine.canvas.width  / 2;
    const cy = engine.canvas.height / 2;
    const r  = engine.arenaRadius;
    const x  = cx + dx * SPHERE_DIST * r;
    const y  = cy;
    const s  = SPHERE_SIZE * r;

    if (this.visible) {
      const allAbsorbed = this.showOrbs && this.orbs.every(o => o.offset <= 0);
      const sImg = allAbsorbed ? afterImg : sphereImg;
      if (sImg.complete && sImg.naturalWidth > 0) ctx.drawImage(sImg, x - s / 2, y - s / 2, s, s);
    }

    if (this.showOrbs) {
      const now = performance.now();
      for (const orb of this.orbs) {
        if (orb.offset <= 0) continue;
        // 정지 중인 오브 깜빡임 (100ms 주기)
        if (orb.pauseMs > 0 && Math.floor(now / 100) % 2 === 0) continue;
        const pos = this.orbWorldPos(orb);
        const h   = ORB_HEIGHT[orb.color] * r;
        const img = orbImgs[orb.color];
        if (!img.complete || img.naturalWidth === 0) continue;
        const w = h * (img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, pos.x - w / 2, pos.y - h / 2, w, h);
      }
    }
  }
}

// ── 헬퍼 함수 ───────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 알파/베타 디버프 배정. { alpha: [...], beta: [...] } 반환
function assignDebuffs(engine) {
  const DURATION = 8000;

  const tankRoles = shuffle(['T1', 'T2']);
  const healRoles = shuffle(['H1', 'H2']);
  const dpsRoles  = shuffle(['D1', 'D2', 'D3', 'D4']);
  const dpsTypes  = shuffle(['alpha', 'alpha', 'beta', 'beta']);

  const pairs = [
    [tankRoles[0], 'alpha'], [tankRoles[1], 'beta'],
    [healRoles[0], 'alpha'], [healRoles[1], 'beta'],
    ...dpsRoles.map((r, i) => [r, dpsTypes[i]]),
  ];

  const result = { alpha: [], beta: [] };

  for (const [role, type] of pairs) {
    result[type].push(role);
    const img    = type === 'alpha' ? alphaImg : betaImg;
    const effect = { type, remainMs: DURATION, img };
    if (engine.player.role === role) {
      engine.player.statusEffects.push(effect);
    } else {
      const pm = engine.partyMembers.find(p => p.role === role);
      if (pm) pm.statusEffects.push(effect);
    }
  }

  return result;
}

// 비기준구 충돌 판정 — shortPair 색상 오브만 처리
function checkOrbCollisions(engine, nonRefSphere, shortPair, betaRoles) {
  const allActors = [engine.player, ...engine.partyMembers.filter(p => p.alive)];
  const hitDist   = ORB_HIT_DIST * engine.arenaRadius;

  for (const orb of nonRefSphere.orbs) {
    if (orb.used || orb.pauseMs > 0 || orb.offset <= 0) continue;
    if (PAIR[orb.color] !== shortPair) continue;

    const pos = nonRefSphere.orbWorldPos(orb);

    const touchers = allActors.filter(actor => {
      const ddx = actor.x - pos.x;
      const ddy = actor.y - pos.y;
      return Math.sqrt(ddx * ddx + ddy * ddy) < hitDist;
    });

    if (touchers.length === 0) continue;

    orb.pauseMs = ORB_PAUSE_MS;
    orb.used    = true;

    const nonTanks = touchers.filter(a => !(a.role ?? '').startsWith('T'));

    if (orb.side === 'north') {
      // 북쪽 오브: 비탱커 즉사
      for (const actor of nonTanks) {
        if (actor === engine.player) engine.gameOver = true;
        else actor.alive = false;
      }
    } else {
      // 남쪽 오브: 플레이어가 베타 비탱커로 충돌 시 → 나머지 베타 힐/딜 AI 즉시 소환
      const playerTriggered = touchers.includes(engine.player)
        && !engine.selectedRole.startsWith('T')
        && betaRoles.beta.includes(engine.selectedRole);

      if (playerTriggered) {
        const others = betaRoles.beta.filter(r => !r.startsWith('T') && r !== engine.selectedRole);
        for (const role of others) {
          const pm = engine.partyMembers.find(p => p.role === role && p.alive);
          if (pm) { pm.x = pos.x; pm.y = pos.y; pm.targetX = pos.x; pm.targetY = pos.y; }
        }
        // 순간이동 후 3명 충족 → 피해 없음
      } else if (nonTanks.length < 3) {
        // AI끼리 또는 알파 플레이어가 혼자 맞으면 즉사
        for (const actor of nonTanks) {
          if (actor === engine.player) engine.gameOver = true;
          else actor.alive = false;
        }
      }
    }
  }
}

// 알파 AI → 맵 중앙으로 대피
function positionAlphaAI(engine, alphaRoles) {
  const cx = engine.canvas.width  / 2;
  const cy = engine.canvas.height / 2;
  for (const role of alphaRoles) {
    if (role === engine.selectedRole) continue;
    const pm = engine.partyMembers.find(p => p.role === role && p.alive);
    if (pm) pm.tweenTo(cx, cy, 1800);
  }
}

// 베타 AI 이동:
//   탱커 → 항상 북쪽 오브 인터셉트
//   힐/딜러 → 플레이어가 알파일 때만 남쪽 오브 인터셉트 (베타 플레이어라면 충돌 시 순간이동)
function positionBetaAI(engine, betaRoles, nonRefSphere, shortPair) {
  const northOrb    = nonRefSphere.orbs.find(o => PAIR[o.color] === shortPair && o.side === 'north');
  const southOrb    = nonRefSphere.orbs.find(o => PAIR[o.color] === shortPair && o.side === 'south');
  // 플레이어가 베타 비탱커일 때만 본인이 오브 충돌 후 순간이동 → AI 제외
  // 플레이어가 알파이거나 베타 탱커이면 AI가 직접 오브로 이동
  const playerIsBetaNonTank = betaRoles.includes(engine.selectedRole)
    && !engine.selectedRole.startsWith('T');

  for (const role of betaRoles) {
    if (role === engine.selectedRole) continue;
    const pm = engine.partyMembers.find(p => p.role === role && p.alive);
    if (!pm) continue;

    if (role.startsWith('T')) {
      if (!northOrb) continue;
      const p = nonRefSphere.orbInterceptPos(northOrb, 0.15);
      pm.tweenTo(p.x, p.y, 1800);
    } else if (!playerIsBetaNonTank) {
      if (!southOrb) continue;
      const p = nonRefSphere.orbInterceptPos(southOrb, 0.15);
      pm.tweenTo(p.x, p.y, 1800);
    }
    // 플레이어가 베타 힐/딜러: 이동 없음, 충돌 시 순간이동
  }
}

// ── 오브 기믹 발동 ──────────────────────────────────────────────

const WAVE_WARN_MS    = 0;     // 예고 없음 — 즉시 발동
const WAVE_HIT_MS     = 1000;  // 장판 지속 1초
const AI_WAVE_PREP_MS = 2000;  // 장판 발동 2초 전 AI 이동

const UNDERWORLD_CAST_MS = 4000;  // 지하세계 캐스팅 지속 시간
const UNDERWORLD_AI_MS   = 2000;  // 캐스팅 시작 후 AI 이동 트리거 시점

function sphereCenter(engine, sphere) {
  const r  = engine.arenaRadius;
  const cx = engine.canvas.width  / 2;
  const cy = engine.canvas.height / 2;
  return { x: cx + sphere.dx * SPHERE_DIST * r, y: cy };
}

// AI를 안전지대(북/남)로 이동.
// 안전지대 = green을 발동하는 구체의 도넛 innerRadius(0.25r) 안쪽.
// 두 구체 중 정확히 하나만 green 발동 시에만 유효. 아니면 이동하지 않음.
function moveAisToSafeZone(engine, refSphere, nonRefSphere, waveIndex, fastRole = null) {
  const refHasGreen    = refSphere.getWaveColors(waveIndex).includes('green');
  const nonRefHasGreen = nonRefSphere.getWaveColors(waveIndex).includes('green');

  if (refHasGreen === nonRefHasGreen) return; // 둘 다 있거나 둘 다 없음 → 안전지대 없음

  const greenSphere = refHasGreen ? refSphere : nonRefSphere;
  const r  = engine.arenaRadius;
  const cx = engine.canvas.width  / 2;
  const cy = engine.canvas.height / 2;
  const sx = cx + greenSphere.dx * SPHERE_DIST * r;
  const safeOffset = 0.2 * r; // 도넛 innerRadius(0.25r) 안쪽

  for (const pm of engine.partyMembers) {
    if (!pm.alive) continue;
    const debuff = pm.statusEffects.find(e => e.type === 'alpha' || e.type === 'beta');
    if (!debuff) continue;
    const ty = debuff.type === 'alpha' ? cy - safeOffset : cy + safeOffset;
    const arrMs = pm.role === fastRole ? AI_WAVE_PREP_MS / 1.2 : AI_WAVE_PREP_MS;
    pm.tweenTo(sx, ty, arrMs);
  }
}

function fireOrbMechanics(engine, colors, spheres) {
  const r = engine.arenaRadius;

  const greenColors  = { telegraphRGB: '50,180,50',   explodeRGB: '50,180,50',   telegraphStroke: '#44ff44', explodeStroke: '#44ff44' };
  const blueColors   = { telegraphRGB: '50,100,220',  explodeRGB: '50,100,220',  telegraphStroke: '#4466ff', explodeStroke: '#4466ff' };
  const purpleColors = { telegraphRGB: '160,50,220',  explodeRGB: '160,50,220',  telegraphStroke: '#aa44ff', explodeStroke: '#aa44ff' };
  const redColors    = { telegraphRGB: '220,50,50',   explodeRGB: '220,50,50',   telegraphStroke: '#ff4444', explodeStroke: '#ff4444' };

  for (const sphere of spheres) {
    const { x: sx, y: sy } = sphereCenter(engine, sphere);

    for (const color of colors) {
      const base = { x: sx, y: sy, delay: WAVE_WARN_MS, duration: WAVE_HIT_MS };

      if (color === 'green') {
        engine.aoes.push(new DonutAoE({ ...base, innerRadius: 0.25 * r, outerRadius: 2 * r, colors: greenColors }));

      } else if (color === 'blue') {
        engine.aoes.push(new CircleAoE({ ...base, radius: 0.4 * r, colors: blueColors }));

      } else if (color === 'purple') {
        // 북쪽 90° (캔버스에서 위 = -π/2 중심)
        engine.aoes.push(new FanAoE({ ...base, radius: 3 * r, startAngle: -Math.PI * 3 / 4, endAngle: -Math.PI / 4, colors: purpleColors }));
        // 남쪽 90°
        engine.aoes.push(new FanAoE({ ...base, radius: 3 * r, startAngle:  Math.PI / 4,     endAngle:  Math.PI * 3 / 4, colors: purpleColors }));

      } else if (color === 'red') {
        // 동쪽 90°
        engine.aoes.push(new FanAoE({ ...base, radius: 3 * r, startAngle: -Math.PI / 4, endAngle: Math.PI / 4, colors: redColors }));
        // 서쪽 90°
        engine.aoes.push(new FanAoE({ ...base, radius: 3 * r, startAngle: Math.PI * 3 / 4, endAngle: Math.PI * 5 / 4, colors: redColors }));
      }
    }
  }
}

// ── 기믹 메인 ───────────────────────────────────────────────────

export function mechanicTick(engine) {
  const assignment = randomColorAssignment();

  const refDx     = Math.random() < 0.5 ? 1 : -1;
  const shortPair = Math.random() < 0.5 ? 'RG' : 'PB';

  const east = new SphereDrawable(engine,  1, assignment, refDx ===  1 ? shortPair : null);
  const west = new SphereDrawable(engine, -1, assignment, refDx === -1 ? shortPair : null);
  engine.drawables.push(east, west);

  // 기준구: 0.25/0.5 혼재 → 색상 힌트 제공
  // 비기준구: 전부 0.5 → 플레이어가 실제로 충돌하는 쪽
  const nonRefSphere = refDx === 1 ? west : east;


  let elapsed              = 0;
  let flickerDone          = false;
  let debuffAssignedAt     = -1;
  let betaRoles            = null;
  let aiPositioned         = false;
  let alphaPositioned      = false;
  let bossFollowActive     = false;
  let currentBetaTankRole  = null;
  let switchApplied        = false;
  let secondDebuffApplied  = false;
  let secondDebuffAt       = -1;
  let wave1Fired           = false;
  let wave2Fired           = false;
  let wave1AiMoved         = false;
  let wave2AiMoved         = false;
  let underworldType       = null;   // 'far' | 'near'
  let underworldAt         = -1;
  let underworldAiMoved    = false;
  let underworldFired      = false;

  const FLICKER_START  = 2000;
  const FLICKER_DUR    = 400;
  const CAST_DUR       = 3000;   // 변이 세포 캐스팅 지속 시간
  const ORB_MOVE_DELAY = 3000;   // debuff 부여 후 → 오브 이동 시작 (잔여 5초)
  const AI_MOVE_DELAY  = 4000;   // debuff 부여 후 → AI 이동 (잔여 4초)

  // 기믹 시작: 구 비표시, 변이 세포 캐스팅 시작
  east.visible = false;
  west.visible = false;
  engine.boss.startCast('변이 세포', CAST_DUR);

  return (dt) => {
    elapsed += dt;

    // 캐스팅 중 구 깜빡임 → 오브 등장 (시각 효과)
    if (!flickerDone && elapsed >= FLICKER_START) {
      const fe    = elapsed - FLICKER_START;
      const phase = Math.floor(fe / 100) % 2;
      east.visible = phase === 0;
      west.visible = phase === 0;

      if (fe >= FLICKER_DUR) {
        flickerDone   = true;
        east.visible  = true;
        west.visible  = true;
        east.showOrbs = true;
        west.showOrbs = true;
      }
    }

    // 변이 세포 캐스팅 완료 → 디버프 랜덤 배정
    if (debuffAssignedAt < 0 && elapsed >= CAST_DUR) {
      engine.boss.stopCast();
      debuffAssignedAt    = elapsed;
      betaRoles           = assignDebuffs(engine);
      currentBetaTankRole = betaRoles.beta.find(r => r.startsWith('T')) ?? null;
    }

    if (debuffAssignedAt < 0) return;

    // 오브 이동 + 충돌 판정 (디버프 잔여 5초 시점부터)
    if (elapsed >= debuffAssignedAt + ORB_MOVE_DELAY) {
      east.tickOrbs(dt, elapsed);
      west.tickOrbs(dt, elapsed);
      checkOrbCollisions(engine, nonRefSphere, shortPair, betaRoles);

      if (!alphaPositioned) {
        alphaPositioned = true;
        positionAlphaAI(engine, betaRoles.alpha);
      }
    }

    // 베타 AI 이동 (디버프 잔여 3초 시점)
    if (!aiPositioned && elapsed >= debuffAssignedAt + AI_MOVE_DELAY) {
      aiPositioned = true;
      positionBetaAI(engine, betaRoles.beta, nonRefSphere, shortPair);

    }

    // 보스: 현재 베타 탱커 연속 추적 (디버프 배정 직후부터, 지하세계 캐스팅 중에는 정지)
    if (currentBetaTankRole && engine.boss && !underworldType) {
      const target = engine.player.role === currentBetaTankRole
        ? engine.player
        : engine.partyMembers.find(p => p.role === currentBetaTankRole && p.alive);

      if (target) {
        const ddx  = target.x - engine.boss.x;
        const ddy  = target.y - engine.boss.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const tipLen = engine.boss.radius * 1.25;
        const stopAt = tipLen + (target.radius ?? 18);

        // 초기 중심 겹침 상태에서 즉시 붙어버리는 것 방지 — 한 번 멀어지면 이후 항상 추적
        if (!bossFollowActive && dist > stopAt) bossFollowActive = true;

        if (bossFollowActive && dist > stopAt) {
          engine.boss.setFacing(Math.atan2(ddy, ddx) - Math.PI / 2);
          const step = Math.min(BOSS_FOLLOW_SPEED * engine.arenaRadius * dt / 1000, dist - stopAt);
          engine.boss.x += (ddx / dist) * step;
          engine.boss.y += (ddy / dist) * step;
        }
      }
    }

    // 스위치 버프 (첫 디버프 종료 시점, 3초 지속) + 보스 어글 탱커 교체
    if (!switchApplied && debuffAssignedAt >= 0 && elapsed >= debuffAssignedAt + 8000) {
      switchApplied = true;
      for (const m of [engine.player, ...engine.partyMembers]) {
        m.statusEffects.push({ type: 'switch', remainMs: 3000, img: switchImg });
      }
      // 스위치 타이밍에 보스가 새 베타 탱커(원래 알파)를 향해 즉시 돌아봄
      currentBetaTankRole = betaRoles.alpha.find(r => r.startsWith('T')) ?? null;
      bossFollowActive = false;
      if (currentBetaTankRole && engine.boss) {
        const newTank = engine.player.role === currentBetaTankRole
          ? engine.player
          : engine.partyMembers.find(p => p.role === currentBetaTankRole && p.alive);
        if (newTank) {
          const ddx = newTank.x - engine.boss.x;
          const ddy = newTank.y - engine.boss.y;
          engine.boss.setFacing(Math.atan2(ddy, ddx) - Math.PI / 2);
        }
      }
    }

    // 두 번째 디버프: 알파⇔베타 교체, 16초 지속
    if (!secondDebuffApplied && betaRoles && elapsed >= debuffAssignedAt + 11000) {
      secondDebuffApplied = true;
      secondDebuffAt = elapsed;
      for (const role of betaRoles.alpha) {
        const e = { type: 'beta', remainMs: 26000, img: betaImg };
        if (engine.player.role === role) engine.player.statusEffects.push(e);
        else { const pm = engine.partyMembers.find(p => p.role === role); if (pm) pm.statusEffects.push(e); }
      }
      for (const role of betaRoles.beta) {
        const e = { type: 'alpha', remainMs: 26000, img: alphaImg };
        if (engine.player.role === role) engine.player.statusEffects.push(e);
        else { const pm = engine.partyMembers.find(p => p.role === role); if (pm) pm.statusEffects.push(e); }
      }
    }

    // Wave 1: 2초 전 AI 안전지대 이동
    if (!wave1AiMoved && secondDebuffAt >= 0 && elapsed >= secondDebuffAt + 6000 - AI_WAVE_PREP_MS) {
      wave1AiMoved = true;
      const refSphere1 = refDx === 1 ? east : west;
      moveAisToSafeZone(engine, refSphere1, nonRefSphere, 0, currentBetaTankRole);
    }

    // Wave 1: 두 번째 디버프 부여 6초 후 — 구체별 첫 흡수 색 기믹
    if (!wave1Fired && secondDebuffAt >= 0 && elapsed >= secondDebuffAt + 6000) {
      wave1Fired = true;
      const refSphere = refDx === 1 ? east : west;
      fireOrbMechanics(engine, refSphere.getWaveColors(0), [refSphere]);
      fireOrbMechanics(engine, nonRefSphere.getWaveColors(0), [nonRefSphere]);
    }

    // Wave 2: wave 1 끝나자마자 이동 시작
    if (!wave2AiMoved && wave1Fired && elapsed >= secondDebuffAt + 6000 + WAVE_HIT_MS) {
      wave2AiMoved = true;
      const refSphere2 = refDx === 1 ? east : west;
      moveAisToSafeZone(engine, refSphere2, nonRefSphere, 1, currentBetaTankRole);
    }

    // Wave 2: Wave 1 후 8초 — 구체별 두번째 흡수 색 기믹
    if (!wave2Fired && wave1Fired && elapsed >= secondDebuffAt + 14000) {
      wave2Fired = true;
      const refSphere = refDx === 1 ? east : west;
      fireOrbMechanics(engine, refSphere.getWaveColors(1), [refSphere]);
      fireOrbMechanics(engine, nonRefSphere.getWaveColors(1), [nonRefSphere]);
    }

    // 지하세계 캐스팅 시작 (wave 2 장판 사라지자마자)
    if (!underworldType && wave2Fired && elapsed >= secondDebuffAt + 14000 + WAVE_HIT_MS) {
      underworldType = Math.random() < 0.5 ? 'far' : 'near';
      underworldAt   = elapsed;
      engine.boss.startCast(
        underworldType === 'far' ? '지하세계:원거리' : '지하세계:근거리',
        UNDERWORLD_CAST_MS,
      );
    }

    // 지하세계 AI 이동 (캐스팅 2초 후)
    // 베타팀이 전원 AI(플레이어가 알파)일 때만 베타AI 자동배치, 알파AI는 항상 이동
    if (underworldType && !underworldAiMoved && elapsed >= underworldAt + UNDERWORLD_AI_MS) {
      underworldAiMoved = true;
      const r          = engine.arenaRadius;
      const bossX      = engine.boss.x;
      const bossY      = engine.boss.y;
      const isFar      = underworldType === 'far';
      const curBeta    = betaRoles.alpha;  // 디버프 교체 후 현재 베타 = 원래 알파
      const playerIsBeta = curBeta.includes(engine.selectedRole);

      // 원거리: 베타=보스 남쪽 0.25r, 알파=보스 북쪽 0.1r
      // 근거리: 베타=보스 남쪽 0.1r, 알파=보스 북쪽 0.25r
      const betaY  = bossY + (isFar ? 0.25 : 0.1) * r;
      const alphaY = bossY - (isFar ? 0.1 : 0.25) * r;

      for (const pm of engine.partyMembers) {
        if (!pm.alive) continue;
        const isPmBeta = curBeta.includes(pm.role);
        if (isPmBeta && playerIsBeta) continue;  // 플레이어가 베타면 베타AI 자동배치 안함
        pm.tweenTo(bossX, isPmBeta ? betaY : alphaY, 1800);
      }
    }

    // 지하세계 피격 (캐스팅 완료, 4인 쉐어)
    if (underworldType && !underworldFired && elapsed >= underworldAt + UNDERWORLD_CAST_MS) {
      underworldFired = true;
      engine.boss.stopCast();

      const r      = engine.arenaRadius;
      const shareR = 0.12 * r;
      const isFar  = underworldType === 'far';
      const allActors = [engine.player, ...engine.partyMembers.filter(p => p.alive)];

      // 원거리=가장 먼 대상, 근거리=가장 가까운 대상이 AoE 중심
      const sorted = [...allActors].sort((a, b) => {
        const da = Math.hypot(a.x - engine.boss.x, a.y - engine.boss.y);
        const db = Math.hypot(b.x - engine.boss.x, b.y - engine.boss.y);
        return isFar ? db - da : da - db;
      });
      const tgt = sorted[0];

      const inRange = allActors.filter(a =>
        Math.hypot(a.x - tgt.x, a.y - tgt.y) < shareR + (a.radius ?? 20)
      );

      if (inRange.length < 4) {
        for (const actor of inRange) {
          if (actor === engine.player) engine.gameOver = true;
          else actor.alive = false;
        }
      }

      engine.aoes.push(new CircleAoE({
        x: tgt.x, y: tgt.y,
        radius: shareR,
        delay: 0, duration: 500,
        noAutoKill: true,
        colors: {
          telegraphRGB: '255,200,50', explodeRGB: '255,200,50',
          telegraphStroke: '#ffcc00', explodeStroke: '#ffcc00',
        },
      }));
    }
  };
}
