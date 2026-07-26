import { GameEngine, ALL_ROLES } from './core/GameEngine.js';
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

// 바닥징 기본 프리셋 — 이미지 기준 상대 좌표 (0~1)
const DEFAULT_PRESET = {
  A: { rx: 0.50, ry: 0.215 },
  B: { rx: 0.785, ry: 0.50 },
  C: { rx: 0.50, ry: 0.785 },
  D: { rx: 0.215, ry: 0.50 },
  1: { rx: 0.50, ry: 0.333 },
  2: { rx: 0.672, ry: 0.50 },
  3: { rx: 0.50, ry: 0.672 },
  4: { rx: 0.327, ry: 0.50 },
};

const canvas = document.getElementById('arena-canvas');
const engine = new GameEngine(canvas);
const markers = new MarkerOverlay(canvas);
engine.markerOverlay = markers;

let currentKey = null;

// ── 기믹 탭 ──────────────────────────────────────────────
function showDevNotice() {
  if (document.getElementById('dev-notice')) return;
  const el = document.createElement('div');
  el.id = 'dev-notice';
  el.textContent = '개발중입니다.';
  Object.assign(el.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.85)', color: '#fff',
    fontSize: '1.4rem', padding: '1.2rem 2.5rem',
    borderRadius: '10px', zIndex: '9999',
    pointerEvents: 'none', opacity: '1',
    transition: 'opacity 0.4s',
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 1500);
}

async function selectMechanic(key) {
  if (key !== 'replica') { showDevNotice(); return; }
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

  document.getElementById('btn-marker-preset').addEventListener('click', () => {
    markers.applyPreset(DEFAULT_PRESET);
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

// ── 역할 선택 + 파티원 오버레이 ──────────────
function roleClass(role) {
  if (role.startsWith('T')) return 'tank';
  if (role.startsWith('H')) return 'healer';
  return 'dps';
}

function buildRoleSelector() {
  const selector = document.getElementById('role-selector');

  ALL_ROLES.forEach((role) => {
    const btn = document.createElement('button');
    btn.className = `role-btn ${roleClass(role)}`;
    btn.dataset.role = role;
    btn.textContent = role;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setPlayerRole(role);
    });
    selector.appendChild(btn);
  });

  // 기본 선택 표시
  selector.querySelector(`[data-role="${engine.selectedRole}"]`)?.classList.add('active');

  const btnToggle = document.getElementById('btn-party-toggle');
  btnToggle.addEventListener('click', () => {
    const visible = engine.togglePartyVisible();
    btnToggle.textContent = visible ? '파티원 숨기기' : '파티원 표시';
  });
}

buildMechanicTabs();
buildControls();
buildMarkerToolbar();
buildRoleSelector();
selectMechanic('replica');
