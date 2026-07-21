import { GameEngine } from './core/GameEngine.js';
import { MarkerOverlay } from './core/MarkerOverlay.js';
import * as replica from './mechanics/replica.js';
import * as mimicCell from './mechanics/mimicCell.js';
import * as manaSphere from './mechanics/manaSphere.js';
import * as dream1 from './mechanics/dream1.js';
import * as dream2 from './mechanics/dream2.js';

const MECHANICS = {
  replica:    { label: 'Replica',       module: replica },
  mimicCell:  { label: 'Mimic Cell',    module: mimicCell },
  manaSphere: { label: 'Mana Sphere',   module: manaSphere },
  dream1:     { label: 'Dream - 산쉐',  module: dream1 },
  dream2:     { label: 'Dream - Tower', module: dream2 },
};

const MARKER_TYPES = ['A', 'B', 'C', 'D', '1', '2', '3', '4'];

const canvas = document.getElementById('arena-canvas');
const engine = new GameEngine(canvas);
const markers = new MarkerOverlay(canvas);
engine.markerOverlay = markers;

let currentKey = null;

// ── 기믹 탭 ──────────────────────────────────────────────
async function selectMechanic(key) {
  if (currentKey === key) return;
  currentKey = key;

  document.querySelectorAll('.mech-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.mech === key)
  );

  engine.stop();
  await engine.loadBackground(MECHANICS[key].module.ARENA);
  engine.init();
}

function buildMechanicTabs() {
  const el = document.getElementById('mechanic-selector');
  for (const [key, { label }] of Object.entries(MECHANICS)) {
    const btn = document.createElement('button');
    btn.className = 'mech-btn';
    btn.dataset.mech = key;
    btn.textContent = label;
    btn.addEventListener('click', () => selectMechanic(key));
    el.appendChild(btn);
  }
}

// ── 시작 / 초기화 ────────────────────────────────────────
function buildControls() {
  document.getElementById('btn-start').addEventListener('click', () => {
    if (!currentKey) return;
    if (engine.gameOver) engine.reset();
    engine.beginMechanic(MECHANICS[currentKey].module.mechanicTick);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    engine.reset();
  });
}

// ── 바닥징 툴바 ──────────────────────────────────────────
function buildMarkerToolbar() {
  const toolbar = document.getElementById('marker-toolbar');

  MARKER_TYPES.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'marker-btn';
    btn.dataset.marker = m;
    btn.textContent = m;
    btn.addEventListener('click', () => {
      const alreadyActive = btn.classList.contains('active');
      document.querySelectorAll('.marker-btn').forEach((b) => b.classList.remove('active'));
      markers.setActiveMarker(alreadyActive ? null : m);
      if (!alreadyActive) btn.classList.add('active');
    });
    toolbar.appendChild(btn);
  });

  document.getElementById('btn-marker-clear').addEventListener('click', () => {
    markers.clear();
  });

  const btnToggle = document.getElementById('btn-marker-toggle');
  btnToggle.addEventListener('click', () => {
    const visible = markers.toggle();
    btnToggle.textContent = visible ? '숨기기' : '표시';
  });

  const btnPanel = document.getElementById('btn-marker-panel-toggle');
  const panelBody = document.getElementById('marker-panel-body');
  btnPanel.addEventListener('click', () => {
    const collapsed = panelBody.classList.toggle('collapsed');
    btnPanel.classList.toggle('collapsed', collapsed);
    btnPanel.textContent = collapsed ? '바닥징 ▸' : '바닥징 ▾';
  });
}

buildMechanicTabs();
buildControls();
buildMarkerToolbar();
selectMechanic('replica');
