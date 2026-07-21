import { GameEngine } from './core/GameEngine.js';
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

const canvas = document.getElementById('arena-canvas');
const engine = new GameEngine(canvas);
let currentKey = null;

async function selectMechanic(key) {
  if (currentKey === key) return;
  currentKey = key;

  document.querySelectorAll('.mech-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.mech === key)
  );

  const { module } = MECHANICS[key];
  engine.stop();
  await engine.loadBackground(module.ARENA);
  engine.start(module.mechanicTick);
}

function buildUI() {
  const selector = document.getElementById('mechanic-selector');
  selector.innerHTML = '';

  for (const [key, { label }] of Object.entries(MECHANICS)) {
    const btn = document.createElement('button');
    btn.className = 'mech-btn';
    btn.dataset.mech = key;
    btn.textContent = label;
    btn.addEventListener('click', () => selectMechanic(key));
    selector.appendChild(btn);
  }
}

buildUI();
selectMechanic('replica');
