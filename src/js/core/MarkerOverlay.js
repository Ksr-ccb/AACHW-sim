const MARKER_CONFIG = {
  A: { shape: 'circle', color: '#d74242' },
  B: { shape: 'circle', color: '#d3c156' },
  C: { shape: 'circle', color: '#5e80bd' },
  D: { shape: 'circle', color: '#a663c0' },
  1: { shape: 'square', color: '#d74242' },
  2: { shape: 'square', color: '#d3c156' },
  3: { shape: 'square', color: '#5e80bd' },
  4: { shape: 'square', color: '#a663c0' },
};

export class MarkerOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.markers = {};   // { 'A': {x, y}, ... }
    this.visible = true;
    this.activeMarker = null;

    this._onClick = (e) => this._handleClick(e);
    canvas.addEventListener('click', this._onClick);
  }

  setActiveMarker(type) {
    this.activeMarker = type;
  }

  applyPreset(preset) {
    for (const [type, { rx, ry }] of Object.entries(preset)) {
      this.markers[type] = {
        x: rx * this.canvas.width,
        y: ry * this.canvas.height,
      };
    }
  }

  clear() {
    this.markers = {};
  }

  toggle() {
    this.visible = !this.visible;
    return this.visible;
  }

  _handleClick(e) {
    if (!this.activeMarker) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.markers[this.activeMarker] = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  draw(ctx) {
    if (!this.visible || Object.keys(this.markers).length === 0) return;

    const size = Math.round(this.canvas.width / 30);
    ctx.save();

    for (const [type, pos] of Object.entries(this.markers)) {
      const { shape, color } = MARKER_CONFIG[type];

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;

      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(pos.x - size, pos.y - size, size * 2, size * 2);
        ctx.strokeRect(pos.x - size, pos.y - size, size * 2, size * 2);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type, pos.x, pos.y);
    }

    ctx.restore();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onClick);
  }
}
