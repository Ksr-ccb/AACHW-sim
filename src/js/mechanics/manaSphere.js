// 마나스피어 — M12s-P2a-Arena

export const ARENA = 'img/M12s-P2a-Arena.png';

const SPHERE_DIST = 0.44;   // 중앙 기준 거리 비율
const SPHERE_SIZE = 0.15;   // arenaRadius 대비 이미지 표시 크기 비율

// ── 묶음별 거리 · 크기 · 방향 조정 ────────────────────────────────
const ORB_OFFSET = {
  RG: 0.4,    // red-green 묶음 — 구 중심에서 오브까지 실제 거리 (arenaRadius 비율)
  PB: 0.4,    // purple-blue 묶음
};
//가까운거리 0.25

const ORB_HEIGHT = {
  red:    0.08,
  green:  0.15,
  purple: 0.2,
  blue:   0.12,
};
// 북/남 기준 동서 방향 각도(도) — 45=NW/SW, 22.5=NNW/SSW, 0=정북/남
const ORB_ANGLE_DEG = {
  RG: 31,
  PB: 31,
};
// ───────────────────────────────────────────────────────────────────

const PAIR = {
  red:    'RG',
  green:  'RG',
  purple: 'PB',
  blue:   'PB',
};

function loadImg(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const sphereImg = loadImg('img/reference/mana_sphere_before.jpg');
const orbImgs = {
  red:    loadImg('img/reference/mana_sphere_red.jpg'),
  purple: loadImg('img/reference/mana_sphere_purple.jpg'),
  green:  loadImg('img/reference/mana_sphere_green.jpg'),
  blue:   loadImg('img/reference/mana_sphere_blue.jpg'),
};

// 묶음: [red,green], [purple,blue]
// NW에 red/purple 중 랜덤 → SE는 NW의 묶음 짝, NE는 나머지, SW는 NE의 묶음 짝
function randomColorAssignment() {
  if (Math.random() < 0.5) {
    return { NW: 'red', SE: 'green', NE: 'purple', SW: 'blue' };
  } else {
    return { NW: 'purple', SE: 'blue', NE: 'red', SW: 'green' };
  }
}

const ORB_CORNERS = [
  { key: 'NW', signX: -1, signY: -1 },
  { key: 'NE', signX:  1, signY: -1 },
  { key: 'SW', signX: -1, signY:  1 },
  { key: 'SE', signX:  1, signY:  1 },
];

class SphereDrawable {
  constructor(engine, dx, colorAssignment) {
    this.engine          = engine;
    this.dx              = dx;
    this.colorAssignment = colorAssignment;
    this.visible         = true;
    this.showOrbs        = false;
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
      this._drawOrbs(ctx, x, y, r);
    }
  }

  _drawOrbs(ctx, sx, sy, r) {
    for (const { key, signX, signY } of ORB_CORNERS) {
      const color    = this.colorAssignment[key];
      const pair     = PAIR[color];
      const offset   = ORB_OFFSET[pair] * r;
      const angleRad = ORB_ANGLE_DEG[pair] * (Math.PI / 180);
      const h        = ORB_HEIGHT[color] * r;
      const img      = orbImgs[color];

      if (!img.complete || img.naturalWidth === 0) continue;

      // 북/남 기준 각도로 x/y 분해 — sin²+cos²=1 이므로 offset이 실제 거리
      const ox = sx + signX * Math.sin(angleRad) * offset;
      const oy = sy + signY * Math.cos(angleRad) * offset;
      const w  = h * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, ox - w / 2, oy - h / 2, w, h);
    }
  }
}

export function mechanicTick(engine) {
  const assignment = randomColorAssignment();

  const east = new SphereDrawable(engine,  1, assignment);
  const west = new SphereDrawable(engine, -1, assignment);
  engine.drawables.push(east, west);

  let elapsed     = 0;
  let flickerDone = false;

  // t=2000ms: 구가 2번 깜짝임 (100ms 간격 4 phase = 2 사이클)
  const FLICKER_START = 2000;
  const FLICKER_DUR   = 400;

  return (dt) => {
    elapsed += dt;

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
  };
}
