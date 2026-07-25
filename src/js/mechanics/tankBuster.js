// 탱크버스터 연속 기믹 팩토리 — 레플리카·마나스피어 공통 사용
//
// 시퀀스:
//   1. 이중 뒤돌려차기 (4초 캐스팅, 보스 전방 180°, T1·T2만 허용)
//   2. 보스 랜덤 회전 (90/180/270/360°, 1초)
//   3. 뱀발 후려차기  (캐스팅 없이 즉시, 전원 뒤로, T1·T2 외 전방 = 게임오버)
//   4. T1·T2 산개    (보스 전방 ±45°, 중앙 기준 dist 0.55)
//   5. 대형 원 착탄  (전방 가장 가까운 2명, 크기 = 불/어둠 AoE × 2)

import { FanAoE, CircleAoE } from '../core/AoE.js';

// ── 상수 (필요하면 호출 측에서 options 로 오버라이드 가능) ─────────

const CAST_MS        = 4000;
const ROT_MS         = 1000;
const KICK_WAIT_MS   = 3000;
const CIRCLE_WAIT_MS = 3000;   // 뱀발 발동 후 원 착탄까지
const SPREAD_DIST    = 0.55;   // 중앙 기준 T1·T2 산개 거리 비율
const SPREAD_ANG     = Math.PI / 4;  // ±45°
const FRONT_DIST     = 0.22;
const BACK_DIST      = 0.30;
const SPREAD_STEP    = (22 * Math.PI) / 180;

const KICK_COLORS = {
  telegraphRGB:    '255,220,0',
  explodeRGB:      '220,30,30',
  telegraphStroke: '#ddaa00',
  explodeStroke:   '#aa0000',
};

const TANK_ROLES = new Set(['T1', 'T2']);

// ─────────────────────────────────────────────────────────────────

export function createTankBuster(engine) {
  let localMs       = 0;

  // Phase 1 — 이중 뒤돌려차기
  let fanDir        = 0;
  let castFan       = null;
  let castAoeDone   = false;
  let hitChecked    = false;

  // Phase 2 — 랜덤 회전
  let rotStartLms   = 0;
  let rotFrom       = 0;
  let rotTo         = 0;
  let rotDone       = false;

  // Phase 3 — 전원 뒤 이동
  let preMoveDone   = false;

  // Phase 4 — 뱀발
  let kickStartLms  = 0;
  let kickFired     = false;
  let kickFan       = null;
  let kickFanDir    = 0;
  let kickChecked   = false;

  // Phase 5 — 산개
  let spreadDone    = false;

  // Phase 6 — 원
  let circlesDone   = false;
  let circleChecked = false;
  const circleAoes  = [];

  // ── 내부 헬퍼 ─────────────────────────────────────────────────

  function cx() { return engine.canvas.width  / 2; }
  function cy() { return engine.canvas.height / 2; }

  function killCheck(fan, allowedRoles) {
    const allP = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
    for (const p of allP) {
      if (allowedRoles.has(p.role)) continue;
      if (fan.hitsPlayer(p)) {
        if (p === engine.player) engine.gameOver = true;
        else p.alive = false;
      }
    }
  }

  function spreadParty(fDir, t1TweenFn, t2TweenFn, travelMs) {
    const humanRole = engine.selectedRole;
    const r         = engine.arenaRadius;
    const t1Pm = engine.partyMembers.find(pm => pm.role === 'T1' && pm.alive);
    const t2Pm = engine.partyMembers.find(pm => pm.role === 'T2' && pm.alive);
    if (t1Pm && t1Pm.role !== humanRole) t1TweenFn(t1Pm);
    if (t2Pm && t2Pm.role !== humanRole) t2TweenFn(t2Pm);
    engine.partyMembers
      .filter(pm => pm.alive && !TANK_ROLES.has(pm.role) && pm.role !== humanRole)
      .forEach((pm, i, arr) => {
        const off = (i - (arr.length - 1) / 2) * SPREAD_STEP;
        pm.tweenTo(
          cx() + BACK_DIST * r * Math.cos(fDir + Math.PI + off),
          cy() + BACK_DIST * r * Math.sin(fDir + Math.PI + off),
          travelMs,
        );
      });
  }

  // ── 공개 API ──────────────────────────────────────────────────

  return {
    /**
     * 시퀀스 시작 — 분신 소멸 등 선행 처리 후 한 번만 호출
     * 보스를 T1 방향으로 돌리고 이중 뒤돌려차기 캐스팅을 시작한다.
     */
    start() {
      localMs = 0;
      const t1 = [engine.player, ...engine.partyMembers].find(p => p?.role === 'T1');
      fanDir   = t1
        ? Math.atan2(t1.y - cy(), t1.x - cx())
        : engine.boss.angle + Math.PI / 2;
      engine.boss.setFacing(fanDir - Math.PI / 2);
      engine.boss.startCast('이중 뒤돌려차기', CAST_MS);
    },

    /** mechanicTick 의 dt(ms) 를 그대로 전달 */
    tick(dt) {
      localMs += dt;
      const r         = engine.arenaRadius;
      const humanRole = engine.selectedRole;

      // ── 1. 이중 뒤돌려차기 ──────────────────────────────────

      if (!castAoeDone && localMs >= CAST_MS * 0.7) {
        castAoeDone      = true;
        const remainMs   = CAST_MS * 0.3;   // 1200ms

        castFan = new FanAoE({
          x: cx(), y: cy(),
          radius:     r,
          startAngle: fanDir - Math.PI / 2,
          endAngle:   fanDir + Math.PI / 2,
          delay:      remainMs,
          duration:   500,
          colors:     KICK_COLORS,
          noAutoKill: true,
        });
        engine.aoes.push(castFan);

        spreadParty(
          fanDir,
          t1 => t1.tweenTo(cx() + FRONT_DIST * r * Math.cos(fanDir),
                           cy() + FRONT_DIST * r * Math.sin(fanDir), 1000),
          t2 => t2.tweenTo(cx() + FRONT_DIST * r * Math.cos(fanDir + 0.35),
                           cy() + FRONT_DIST * r * Math.sin(fanDir + 0.35), 1000),
          1000,
        );
      }

      if (castFan?.isExploding && !hitChecked) {
        hitChecked = true;
        killCheck(castFan, TANK_ROLES);
      }

      // ── 2. 랜덤 회전 (1초) ──────────────────────────────────

      if (hitChecked && rotStartLms === 0) {
        rotStartLms = localMs;
        rotFrom     = engine.boss.angle;
        const amounts = [Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI];
        rotTo = rotFrom + amounts[Math.floor(Math.random() * 4)];
      }

      if (rotStartLms > 0 && !rotDone) {
        const rE = localMs - rotStartLms;
        if (rE >= ROT_MS) {
          engine.boss.setFacing(rotTo);
          rotDone = true;
        } else {
          engine.boss.setFacing(rotFrom + (rotTo - rotFrom) * (rE / ROT_MS));
        }
      }

      // ── 3. 전원 보스 뒤로 이동 ──────────────────────────────

      if (rotDone && !preMoveDone) {
        preMoveDone = true;
        const fDir  = rotTo + Math.PI / 2;
        engine.partyMembers
          .filter(pm => pm.alive && pm.role !== humanRole)
          .forEach((pm, i, arr) => {
            const off = (i - (arr.length - 1) / 2) * SPREAD_STEP;
            pm.tweenTo(
              cx() + BACK_DIST * r * Math.cos(fDir + Math.PI + off),
              cy() + BACK_DIST * r * Math.sin(fDir + Math.PI + off),
              2500,
            );
          });
      }

      // ── 4. 뱀발 후려차기 (회전 후 3초 대기 후 즉시 발동) ───

      if (rotDone && !kickFired && localMs >= rotStartLms + ROT_MS + KICK_WAIT_MS) {
        kickFired   = true;
        kickStartLms = localMs;
        kickFanDir   = engine.boss.angle + Math.PI / 2;

        kickFan = new FanAoE({
          x: cx(), y: cy(),
          radius:     r,
          startAngle: kickFanDir - Math.PI / 2,
          endAngle:   kickFanDir + Math.PI / 2,
          delay:      500,
          duration:   500,
          colors:     KICK_COLORS,
          noAutoKill: true,
        });
        engine.aoes.push(kickFan);
      }

      if (kickFan?.isExploding && !kickChecked) {
        kickChecked = true;
        killCheck(kickFan, TANK_ROLES);
      }

      // ── 5. T1·T2 산개 (전조 등장 후 즉시) ──────────────────

      if (kickFired && !spreadDone && localMs >= kickStartLms + 500) {
        spreadDone = true;
        const fDir = kickFanDir;
        spreadParty(
          fDir,
          t1 => t1.tweenTo(cx() + SPREAD_DIST * r * Math.cos(fDir - SPREAD_ANG),
                           cy() + SPREAD_DIST * r * Math.sin(fDir - SPREAD_ANG), 2000),
          t2 => t2.tweenTo(cx() + SPREAD_DIST * r * Math.cos(fDir + SPREAD_ANG),
                           cy() + SPREAD_DIST * r * Math.sin(fDir + SPREAD_ANG), 2000),
          2000,
        );
      }

      // ── 6. 대형 원 착탄 (뱀발 후 3초, 전방 2명) ────────────

      if (kickFired && !circlesDone && localMs >= kickStartLms + CIRCLE_WAIT_MS) {
        circlesDone  = true;
        const fDir   = kickFanDir;
        const bigR   = Math.round(engine.canvas.width / 40 * 1.1 * 3) * 2;

        const allP   = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
        const frontP = allP.filter(p => {
          let diff = Math.atan2(p.y - cy(), p.x - cx()) - fDir;
          while (diff >  Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          return Math.abs(diff) <= Math.PI / 2;
        }).sort((a, b) => Math.hypot(a.x - cx(), a.y - cy()) - Math.hypot(b.x - cx(), b.y - cy()));

        for (const t of frontP.slice(0, 2)) {
          const c = new CircleAoE({
            x: t.x, y: t.y,
            radius:    bigR,
            delay:     0,
            duration:  1500,
            type:      null,
            noAutoKill: true,
          });
          engine.aoes.push(c);
          circleAoes.push(c);
        }
      }

      if (circleAoes.length > 0 && !circleChecked && circleAoes.some(c => c.isExploding)) {
        circleChecked = true;
        const allP4 = [engine.player, ...engine.partyMembers.filter(pm => pm.alive)];
        for (const p of allP4) {
          if (TANK_ROLES.has(p.role)) continue;
          if (circleAoes.some(c => c.hitsPlayer(p))) {
            if (p === engine.player) engine.gameOver = true;
            else p.alive = false;
          }
        }
      }
    },

    get isDone() { return circleChecked; },
  };
}
