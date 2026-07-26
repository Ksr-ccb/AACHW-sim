// 마나스피어 — M12s-P2a-Arena

export const ARENA = 'img/M12s-P2a-Arena.png';

const SPHERE_DIST = 0.44;  // 중앙 기준 거리 비율
const SPHERE_SIZE = 0.15;  // arenaRadius 대비 이미지 표시 크기 비율

const sphereImg = new Image();
sphereImg.src = 'img/reference/mana_sphere_before.jpg';

class SphereDrawable {
  constructor(engine, dx) {
    this.engine = engine;
    this.dx = dx;  // +1 = 동(East), -1 = 서(West)
  }

  draw(ctx) {
    const { engine, dx } = this;
    const cx = engine.canvas.width  / 2;
    const cy = engine.canvas.height / 2;
    const r  = engine.arenaRadius;
    const x  = cx + dx * SPHERE_DIST * r;
    const y  = cy;
    const s  = SPHERE_SIZE * r;

    if (sphereImg.complete && sphereImg.naturalWidth > 0) {
      ctx.drawImage(sphereImg, x - s / 2, y - s / 2, s, s);
    }
  }
}

export function mechanicTick(engine) {
  engine.drawables.push(new SphereDrawable(engine,  1));  // 동
  engine.drawables.push(new SphereDrawable(engine, -1));  // 서

  return (_dt) => {};
}
