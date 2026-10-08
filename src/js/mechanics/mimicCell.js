// 모방세포 — M12s-P2a-Arena

export const ARENA = 'img/M12s-P2a-Arena.png';

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

  // 보스 히스박스 외곽에 딱 붙는 거리 (보스반지름 + 플레이어반지름)
  const spreadDist = (engine.boss.radius + 20) / engine.arenaRadius;

  // T1 = 보스 정면(동), 나머지 7명은 45° 간격 산개
  const SPREAD = {
    T1: { angle:  90 },  // 동 — 보스 세모 앞
    T2: { angle: 270 },  // 서 — 보스 후방
    H1: { angle:   0 },  // 북
    H2: { angle: 180 },  // 남
    D1: { angle:  45 },  // 북동
    D2: { angle: 135 },  // 남동
    D3: { angle: 225 },  // 남서
    D4: { angle: 315 },  // 북서
  };

  const resolved = {};
  for (const [role, { angle }] of Object.entries(SPREAD)) {
    resolved[role] = polar(engine, angle, spreadDist);
  }
  engine.setPartyPositions(resolved, 800);

  return (_dt) => {};
}
