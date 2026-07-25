const canvas = document.getElementById('arena-canvas');
const ctx = canvas.getContext('2d');

const SPEED = 5;
const DOT_RADIUS = 15;

let player = { x: 0, y: 0 };
let keys = new Set();
let currentImage = null;

function loadArena(name) {
  const img = new Image();
  img.src = `img/${name}.png`;
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    currentImage = img;
  };
}

function update() {
  if (!currentImage) return;
  if (keys.has('w')) player.y -= SPEED;
  if (keys.has('s')) player.y += SPEED;
  if (keys.has('a')) player.x -= SPEED;
  if (keys.has('d')) player.x += SPEED;

  player.x = Math.max(DOT_RADIUS, Math.min(canvas.width - DOT_RADIUS, player.x));
  player.y = Math.max(DOT_RADIUS, Math.min(canvas.height - DOT_RADIUS, player.y));
}

function draw() {
  if (!currentImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(currentImage, 0, 0);

  ctx.beginPath();
  ctx.arc(player.x, player.y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3333';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.stroke();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (['w', 'a', 's', 'd'].includes(key)) e.preventDefault();
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

document.querySelectorAll('.arena-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.arena-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadArena(btn.dataset.arena);
  });
});

loadArena('M12s-P2a-Arena');
gameLoop();
