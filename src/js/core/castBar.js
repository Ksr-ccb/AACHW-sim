// 공용 캐스팅바 렌더러
// Boss · BossClone 양쪽에서 import해서 사용

export function drawCastBar(ctx, { x, y, radius, castProgress, castName, scale = 1 }) {
  if (castProgress <= 0) return;

  const bw = radius * 3.5 * scale;
  const bh = Math.max(4, Math.round(radius * 0.22 * scale));
  const bx = x - bw / 2;
  const by = y + radius + 6;

  // 배경
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(bx, by, bw, bh);

  // 게이지 (노란색)
  ctx.fillStyle = '#ffdd00';
  ctx.fillRect(bx, by, bw * Math.min(castProgress, 1), bh);

  // 테두리
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);

  // 캐스팅 기술명 — 바 왼쪽 위에 딱 붙여서 노란 글씨
  if (castName) {
    const fontSize = Math.max(8, Math.round(radius * 0.35 * scale));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(castName, bx, by);
  }

  ctx.restore();
}

// 캐스팅 상태 관리 믹스인 — 클래스 안에서 호출
// 사용법:
//   this._cast = createCastState();
//   startCast(this._cast, '기술명', durationMs);
//   updateCast(this._cast, dt);  → this._cast.progress (0~1)
//   stopCast(this._cast);

export function createCastState() {
  return { name: '', duration: 0, elapsed: 0, active: false, progress: 0 };
}

export function startCast(state, name, durationMs) {
  state.name     = name;
  state.duration = durationMs;
  state.elapsed  = 0;
  state.active   = true;
  state.progress = 0;
}

export function updateCast(state, dt) {
  if (!state.active) return;
  state.elapsed += dt;
  if (state.elapsed >= state.duration) {
    state.active   = false;
    state.progress = 0;   // 완료 즉시 바 숨김
    state.name     = '';
  } else {
    state.progress = state.elapsed / state.duration;
  }
}

export function stopCast(state) {
  state.active   = false;
  state.progress = 0;
  state.name     = '';
}
