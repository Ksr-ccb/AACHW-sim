// 레플리카 (복제) — M12s-P2a-Arena
// TODO: 타임라인 구현

export const ARENA = 'img/M12s-P2a-Arena.png';

// ═══════════════════════════════════════════════════════════════
//  포지션 정의
//
//  angle : 시계방향 각도
//            0   = 북(위)    90  = 동(오른쪽)
//            180 = 남(아래)  270 = 서(왼쪽)
//  dist  : 아레나 반지름 대비 비율  (0=중앙, 1=벽)
// ═══════════════════════════════════════════════════════════════

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

// ── 타임라인 ─────────────────────────────────────────────────────

export function mechanicTick(engine) {
  let elapsed     = 0;
  let spreadDone  = false;

  return (dt) => {
    // AoE 스케줄 및 타임라인 로직을 여기에 추가

    elapsed += dt;

    // 1,000ms 대기 → 1,000ms에 걸쳐 산개 이동
    if (!spreadDone && elapsed >= 1000) {
      spreadDone = true;
      applyPositions(engine, SPREAD_POSITIONS, 1000);
    }

    // 1. 시작 1초후 ai 플레이어와 분신이 등장 및 이동
    // 2, 시작 1.5초후 분신에게 3초짜리 캐스팅바가 시작함.
    //   => 이때 AC / BD 세트로 불,어둠 / 좌 혹은 우 부채꼴 AOE 장판 생성 결정
    //   TODO: 불,어둠 장판과 좌 혹은 우 부채꼴 장판 기능 함수 제작 (각 장판 디버프 생성, 불장판은 분신이동)
    // 3. 분신의 3초짜리 캐스팅바가 50프로진행되었을 때, AOE장판의 경우 생성위치 미리 보여줌
    //   TODO: AOE 전조와 착탄 차이를 색상 변경으로 표기(노랑->빨강)
    //   => 장판 생성위치를 보고 AI플레이어 안전지대로 임의 소량이동 (45도 각도중앙에 위치하면 안전지대되게 AOE임의설정)
    //   => TODO: AI플레이어 기본이동속도 조절
    // 4. 분신의 3초짜리 캐스팅바가 70프로 진행되었을 때, 불/어둠 대상자 선별종료
    // 5. 분신의 3초짜리 캐스팅바가 종료되고 불/어둠 대상자에게 장판을 생성
    //   => 불/어둠 장판을 2개이상 맞은 경우 바로 게임오버
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
