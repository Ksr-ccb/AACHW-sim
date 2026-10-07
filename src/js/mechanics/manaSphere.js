// 마나스피어 — M12s-P2a-Arena

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

  tickOrbs(dt) {
    for (const orb of this.orbs) {
      if (orb.pauseMs > 0) {
        orb.pauseMs = Math.max(0, orb.pauseMs - dt);
      } else if (orb.offset > 0) {
        // used여도 일시정지 후 구 중심으로 계속 이동
        orb.offset = Math.max(0, orb.offset - ORB_MOVE_SPEED * dt);
      }
    }
  }

  draw(ctx) {
    const { engine, dx } = this;
    const cx = engine.canvas.width  / 2;
    const cy = engine.canvas.height / 2;
    const r  = engine.arenaRadius;
    const x  = cx + dx * SPHERE_DIST * r;
    const y  = cy;
    const s  = SPHERE_SIZE * r;

    if (this.visible && sphereImg.complete && sphereImg.naturalWidth > 0) {
      ctx.drawImage(sphereImg, x - s / 2, y - s / 2, s, s);
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

// 이동 목표 위치를 알리는 맥동 링
class RingIndicator {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.visible = true;
  }

  draw(ctx) {
    if (!this.visible) return;
    const alpha = 0.35 + 0.35 * Math.sin(performance.now() / 300);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 220, 50, ${alpha})`;
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.restore();
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

// 베타 탱커 AI만 인터셉트 위치로 이동 (힐/딜러는 플레이어 충돌 시 순간이동)
function positionBetaAI(engine, betaRoles, nonRefSphere, shortPair) {
  const northOrb = nonRefSphere.orbs.find(o => PAIR[o.color] === shortPair && o.side === 'north');

  for (const role of betaRoles) {
    if (!role.startsWith('T')) continue;     // 탱커만
    if (role === engine.selectedRole) continue;
    const pm = engine.partyMembers.find(p => p.role === role && p.alive);
    if (!pm || !northOrb) continue;
    const p = nonRefSphere.orbInterceptPos(northOrb, 0.15);
    pm.tweenTo(p.x, p.y, 1800);
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

  let elapsed          = 0;
  let flickerDone      = false;
  let debuffAssignedAt = -1;
  let betaRoles        = null;
  let aiPositioned     = false;
  let alphaPositioned  = false;
  let bossFollowDone   = false;

  const FLICKER_START  = 2000;
  const FLICKER_DUR    = 400;
  const ORB_MOVE_DELAY = 3000;   // debuff 부여 후 → 오브 이동 시작 (잔여 5초)
  const AI_MOVE_DELAY  = 4000;   // debuff 부여 후 → AI 이동 (잔여 4초)

  return (dt) => {
    elapsed += dt;

    // 구 깜빡임 → 오브 등장 + 디버프 배정
    if (!flickerDone && elapsed >= FLICKER_START) {
      const fe    = elapsed - FLICKER_START;
      const phase = Math.floor(fe / 100) % 2;
      east.visible = phase === 0;
      west.visible = phase === 0;

      if (fe >= FLICKER_DUR) {
        flickerDone      = true;
        debuffAssignedAt = elapsed;
        east.visible  = true;
        west.visible  = true;
        east.showOrbs = true;
        west.showOrbs = true;
        betaRoles = assignDebuffs(engine);
      }
    }

    if (debuffAssignedAt < 0) return;

    // 오브 이동 + 충돌 판정 (디버프 잔여 5초 시점부터)
    if (elapsed >= debuffAssignedAt + ORB_MOVE_DELAY) {
      east.tickOrbs(dt);
      west.tickOrbs(dt);
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

      // 플레이어가 베타일 때 타깃 위치 링 표시
      if (betaRoles.beta.includes(engine.selectedRole)) {
        const isTank  = engine.selectedRole.startsWith('T');
        const tgtSide = isTank ? 'north' : 'south';
        const tgtOrb  = nonRefSphere.orbs.find(o => PAIR[o.color] === shortPair && o.side === tgtSide);
        if (tgtOrb) {
          const pos = nonRefSphere.orbInterceptPos(tgtOrb, 0.15);
          engine.drawables.push(new RingIndicator(pos.x, pos.y, engine.arenaRadius * 0.06));
        }
      }
    }

    // 보스: 베타 탱커 추적 — 삼각형 팁이 탱커와 겹치면 정지
    if (betaRoles && engine.boss && !bossFollowDone) {
      const betaTankRole = betaRoles.beta.find(r => r.startsWith('T'));
      const target = betaTankRole
        ? (engine.player.role === betaTankRole
            ? engine.player
            : engine.partyMembers.find(p => p.role === betaTankRole && p.alive))
        : null;

      if (target) {
        const ddx  = target.x - engine.boss.x;
        const ddy  = target.y - engine.boss.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);

        // boss 중심이 tipLen+target.radius 이내 → 팁이 탱커 원에 닿은 것으로 판단, 이동 종료
        const bossR  = engine.boss.radius;
        const tipLen = bossR * 1.25;
        const stopAt = tipLen + (target.radius ?? 18);

        if (dist <= stopAt) {
          bossFollowDone = true;
        } else {
          engine.boss.setFacing(Math.atan2(ddy, ddx) - Math.PI / 2);
          const step = Math.min(BOSS_FOLLOW_SPEED * engine.arenaRadius * dt / 1000, dist - stopAt);
          engine.boss.x += (ddx / dist) * step;
          engine.boss.y += (ddy / dist) * step;
        }
      }
    }
  };
}
