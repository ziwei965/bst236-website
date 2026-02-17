// ============================================================
// PAC-MAN Valentine's Edition — game.js
// Pure HTML5 Canvas, no dependencies
// ============================================================

// ---------- Constants & Config ----------
const TILE = 32;
const COLS = 21;
const ROWS = 23;
const WIDTH = COLS * TILE;   // 672
const HEIGHT = ROWS * TILE;  // 736

const DIR = {
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  NONE:  { x:  0, y:  0 },
};

const COLORS = {
  bg:        '#1a0612',
  wall:      '#d63384',
  wallFill:  '#3d0f2f',
  pellet:    '#ff69b4',
  pacman:    '#ffe066',
  pacBlush:  '#ff9ecb',
  ghostScared: '#7777dd',
  rose:      '#ff1744',
  heart:     '#e91e63',
  text:      '#ffb6c1',
  ghosts: ['#ffb3c6', '#c3aed6', '#b5ead7', '#ffd6a5'],  // pink, lavender, mint, peach
};

const PAC_SPEED = 5;         // tiles per second
const GHOST_SPEED = 4;
const HEART_SPEED = 12;
const POWER_DURATION = 5;    // seconds
const SHOOT_INTERVAL = 0.25; // seconds between heart shots
const ROSE_INTERVAL = 17;    // seconds between rose spawns
const GHOST_RESPAWN = 5;     // seconds after elimination
const DEATH_DURATION = 1.5;  // seconds

// Scatter / chase mode cycle (seconds spent in each phase)
const MODE_CYCLE = [7, 20, 7, 20, 5, 20, 5, Infinity];

// ---------- Maze Data ----------
// 0 = pellet, 1 = wall, 2 = empty, 3 = ghost house, 4 = ghost door
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,2,2,1,2,2,1,1,1,0,1,1,1,1],
  [2,2,2,1,0,1,2,2,2,2,2,2,2,2,2,1,0,1,2,2,2],
  [1,1,1,1,0,1,2,1,1,4,4,4,1,1,2,1,0,1,1,1,1],
  [2,2,2,2,0,2,2,1,3,3,3,3,3,1,2,2,0,2,2,2,2],
  [1,1,1,1,0,1,2,1,3,3,3,3,3,1,2,1,0,1,1,1,1],
  [2,2,2,1,0,1,2,1,1,1,1,1,1,1,2,1,0,1,2,2,2],
  [1,1,1,1,0,1,2,2,2,2,2,2,2,2,2,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ---------- Utilities ----------
function tileToPixel(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}
function pixelToTile(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}
function isWall(col, row, maze) {
  if (row < 0 || row >= ROWS) return true;
  // tunnel wrapping
  if (col < 0 || col >= COLS) return false;
  return maze[row][col] === 1;
}
function isWalkable(col, row, maze) {
  if (row < 0 || row >= ROWS) return false;
  if (col < 0 || col >= COLS) return true; // tunnel
  const t = maze[row][col];
  return t !== 1;
}
function canPacmanEnter(col, row, maze) {
  if (row < 0 || row >= ROWS) return false;
  if (col < 0 || col >= COLS) return true;
  const t = maze[row][col];
  return t !== 1 && t !== 3 && t !== 4;
}
function wrapCol(col) {
  if (col < 0) return COLS - 1;
  if (col >= COLS) return 0;
  return col;
}
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}
function deepCopyMaze() {
  return MAZE_TEMPLATE.map(r => [...r]);
}
function countPellets(maze) {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (maze[r][c] === 0) n++;
  return n;
}
function randomEmptyTile(maze) {
  const empties = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (maze[r][c] === 2 || maze[r][c] === 0)
        empties.push({ col: c, row: r });
  return empties[Math.floor(Math.random() * empties.length)];
}
function dirName(d) {
  if (d.x === -1) return 'LEFT';
  if (d.x ===  1) return 'RIGHT';
  if (d.y === -1) return 'UP';
  if (d.y ===  1) return 'DOWN';
  return 'NONE';
}
function reverseDir(d) {
  return { x: -d.x, y: -d.y };
}
function sameDir(a, b) {
  return a.x === b.x && a.y === b.y;
}

// ---------- Drawing Functions ----------

function drawMaze(ctx, maze) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (maze[r][c] === 1) {
        const x = c * TILE;
        const y = r * TILE;
        // Draw wall edges facing non-wall tiles
        ctx.strokeStyle = COLORS.wall;
        ctx.lineWidth = 2;
        // top edge
        if (r === 0 || maze[r - 1][c] !== 1) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); ctx.stroke();
        }
        // bottom edge
        if (r === ROWS - 1 || maze[r + 1][c] !== 1) {
          ctx.beginPath(); ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y + TILE); ctx.stroke();
        }
        // left edge
        if (c === 0 || maze[r][c - 1] !== 1) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + TILE); ctx.stroke();
        }
        // right edge
        if (c === COLS - 1 || maze[r][c + 1] !== 1) {
          ctx.beginPath(); ctx.moveTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); ctx.stroke();
        }
      } else if (maze[r][c] === 4) {
        // Ghost door
        const x = c * TILE;
        const y = r * TILE;
        ctx.fillStyle = '#ff69b488';
        ctx.fillRect(x + 2, y + TILE / 2 - 2, TILE - 4, 4);
      }
    }
  }
}

function drawPellet(ctx, col, row, time) {
  const cx = col * TILE + TILE / 2;
  const cy = row * TILE + TILE / 2;
  const s = 4 + Math.sin(time * 3 + col + row) * 0.8;
  // Tiny heart shape
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 8, s / 8);
  ctx.fillStyle = COLORS.pellet;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-5, -2, -9, -6, -5, -9);
  ctx.bezierCurveTo(-1, -12, 0, -8, 0, -6);
  ctx.bezierCurveTo(0, -8, 1, -12, 5, -9);
  ctx.bezierCurveTo(9, -6, 5, -2, 0, 3);
  ctx.fill();
  ctx.restore();
}

function drawPacman(ctx, pac, time) {
  const cx = pac.x;
  const cy = pac.y;
  const mouth = 0.05 + Math.abs(Math.sin(time * 12)) * 0.3;
  let angle = 0;
  if (pac.dir.x === -1) angle = Math.PI;
  else if (pac.dir.y === -1) angle = -Math.PI / 2;
  else if (pac.dir.y ===  1) angle = Math.PI / 2;

  // Power-up aura
  if (pac.powered) {
    const auraR = TILE * 0.7 + Math.sin(time * 6) * 3;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Body
  ctx.fillStyle = COLORS.pacman;
  ctx.beginPath();
  ctx.arc(0, 0, TILE * 0.45, mouth, Math.PI * 2 - mouth);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(4, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = COLORS.pacBlush;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(6, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawGhost(ctx, ghost, time) {
  const cx = ghost.x;
  const cy = ghost.y;
  const r = TILE * 0.45;
  const scared = ghost.scared;
  const color = scared ? COLORS.ghostScared : ghost.color;

  ctx.save();
  ctx.translate(cx, cy);

  // Body: dome + rectangle + wavy bottom
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -2, r, Math.PI, 0);
  ctx.lineTo(r, r - 2);
  // Wavy bottom
  const segs = 4;
  const sw = (r * 2) / segs;
  for (let i = 0; i < segs; i++) {
    const sx = r - i * sw;
    const wobble = Math.sin(time * 8 + i * 1.5 + ghost.id) * 2;
    ctx.quadraticCurveTo(sx - sw / 2, r + 4 + wobble, sx - sw, r - 2);
  }
  ctx.closePath();
  ctx.fill();

  // Eyes
  const eyeOffX = 5;
  const eyeOffY = -4;
  for (let side = -1; side <= 1; side += 2) {
    // White of eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(side * eyeOffX, eyeOffY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupil direction
    let px = 0, py = 0;
    if (ghost.dir) { px = ghost.dir.x * 2.5; py = ghost.dir.y * 2.5; }
    ctx.fillStyle = scared ? '#fff' : '#333';
    if (scared) ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(side * eyeOffX + px, eyeOffY + py, scared ? 2 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scared: wobbly frown
  if (scared) {
    ctx.strokeStyle = '#ffb6c1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    for (let i = 0; i <= 10; i++) {
      ctx.lineTo(-5 + i, 4 + (i % 2 === 0 ? -2 : 2));
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawRose(ctx, rose, time) {
  if (!rose) return;
  const cx = rose.col * TILE + TILE / 2;
  const cy = rose.row * TILE + TILE / 2 + Math.sin(time * 3) * 3;

  // Rose emoji
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F339}', cx, cy);

  // Orbiting sparkle
  const sparkleAngle = time * 4;
  const sx = cx + Math.cos(sparkleAngle) * 14;
  const sy = cy + Math.sin(sparkleAngle) * 14;
  drawSparkle(ctx, sx, sy, 4, '#ffec8b');
}

function drawHeartProjectile(ctx, heart, time) {
  const scale = 0.85 + Math.sin(time * 10) * 0.15;
  ctx.save();
  ctx.translate(heart.x, heart.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = COLORS.heart;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-7, -2, -12, -8, -7, -12);
  ctx.bezierCurveTo(-2, -16, 0, -10, 0, -8);
  ctx.bezierCurveTo(0, -10, 2, -16, 7, -12);
  ctx.bezierCurveTo(12, -8, 7, -2, 0, 4);
  ctx.fill();
  // White highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(-3, -9, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color || '#fff';
  ctx.beginPath();
  // 4-pointed star
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const outerX = x + Math.cos(angle) * size;
    const outerY = y + Math.sin(angle) * size;
    const innerAngle = angle + Math.PI / 4;
    const innerX = x + Math.cos(innerAngle) * size * 0.3;
    const innerY = y + Math.sin(innerAngle) * size * 0.3;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSparkleEffect(ctx, particles, time) {
  for (const p of particles) {
    const age = time - p.born;
    if (age > p.life) continue;
    const alpha = 1 - age / p.life;
    ctx.globalAlpha = alpha;
    drawSparkle(ctx, p.x + p.vx * age, p.y + p.vy * age, p.size * (1 - age / p.life), p.color);
  }
  ctx.globalAlpha = 1;
}

// ---------- Game State ----------
let canvas, ctx;
let overlay, scoreEl, levelEl, livesEl;

const game = {
  state: 'start',  // start, playing, dying, gameover, levelcomplete
  maze: null,
  pacman: null,
  ghosts: [],
  rose: null,
  hearts: [],
  particles: [],
  score: 0,
  lives: 3,
  level: 1,
  pelletsLeft: 0,
  modeTimer: 0,
  modeIndex: 0,
  roseTimer: 0,
  deathTimer: 0,
  levelCompleteTimer: 0,
  time: 0,
};

function createPacman() {
  return {
    col: 10, row: 16,
    x: 10 * TILE + TILE / 2,
    y: 16 * TILE + TILE / 2,
    dir: DIR.NONE,
    nextDir: DIR.NONE,
    powered: false,
    powerTimer: 0,
    shootTimer: 0,
    speed: PAC_SPEED,
  };
}

function createGhost(id) {
  const startCol = 9 + (id % 3);
  const startRow = 10;
  const releaseDelay = id * 2;
  return {
    id,
    col: startCol,
    row: startRow,
    x: startCol * TILE + TILE / 2,
    y: startRow * TILE + TILE / 2,
    dir: DIR.UP,
    color: COLORS.ghosts[id],
    scared: false,
    inHouse: true,
    released: false,
    releaseTimer: releaseDelay,
    eliminated: false,
    respawnTimer: 0,
    speed: GHOST_SPEED,
    scatterTarget: getScatterTarget(id),
  };
}

function getScatterTarget(id) {
  switch (id) {
    case 0: return { col: COLS - 2, row: 1 };     // top-right
    case 1: return { col: 1, row: 1 };             // top-left
    case 2: return { col: COLS - 2, row: ROWS - 2 }; // bottom-right
    case 3: return { col: 1, row: ROWS - 2 };      // bottom-left
  }
}

function getChaseTarget(ghost, pacman) {
  switch (ghost.id) {
    case 0: // Blinky: targets pac-man directly
      return { col: pacman.col, row: pacman.row };
    case 1: // Pinky: 4 tiles ahead of pac-man
      return {
        col: Math.max(0, Math.min(COLS - 1, pacman.col + pacman.dir.x * 4)),
        row: Math.max(0, Math.min(ROWS - 1, pacman.row + pacman.dir.y * 4)),
      };
    case 2: { // Inky: complex vector using Blinky
      const blinky = game.ghosts[0];
      const ahead2Col = pacman.col + pacman.dir.x * 2;
      const ahead2Row = pacman.row + pacman.dir.y * 2;
      return {
        col: Math.max(0, Math.min(COLS - 1, ahead2Col + (ahead2Col - blinky.col))),
        row: Math.max(0, Math.min(ROWS - 1, ahead2Row + (ahead2Row - blinky.row))),
      };
    }
    case 3: { // Clyde: if far, target pac-man; if close, scatter
      const d = dist(ghost.col, ghost.row, pacman.col, pacman.row);
      if (d > 8) return { col: pacman.col, row: pacman.row };
      return ghost.scatterTarget;
    }
  }
}

function isScatterMode() {
  let sum = 0;
  for (let i = 0; i <= game.modeIndex; i++) {
    sum += MODE_CYCLE[i];
    if (game.modeTimer < sum) return i % 2 === 0;
  }
  return false; // default to chase
}

function initLevel() {
  game.maze = deepCopyMaze();
  game.pacman = createPacman();
  game.ghosts = [0, 1, 2, 3].map(createGhost);
  game.hearts = [];
  game.particles = [];
  game.rose = null;
  game.pelletsLeft = countPellets(game.maze);
  game.modeTimer = 0;
  game.modeIndex = 0;
  game.roseTimer = ROSE_INTERVAL * 0.5; // first rose comes sooner
  game.deathTimer = 0;
  game.levelCompleteTimer = 0;
}

function resetAfterDeath() {
  game.pacman = createPacman();
  game.ghosts = [0, 1, 2, 3].map(createGhost);
  game.hearts = [];
  game.rose = null;
  game.modeTimer = 0;
  game.modeIndex = 0;
  game.roseTimer = ROSE_INTERVAL * 0.5;
}

// ---------- Input ----------
const keys = {};

function handleKeyDown(e) {
  keys[e.code] = true;

  if (game.state === 'start' || game.state === 'gameover') {
    const wasGameOver = game.state === 'gameover';
    if (wasGameOver) {
      game.score = 0;
      game.lives = 3;
      game.level = 1;
    }
    initLevel();
    game.state = 'playing';
    showOverlay(false);
    return;
  }

  const pac = game.pacman;
  if (!pac) return;
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') pac.nextDir = DIR.LEFT;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') pac.nextDir = DIR.RIGHT;
  if (e.code === 'ArrowUp'    || e.code === 'KeyW') pac.nextDir = DIR.UP;
  if (e.code === 'ArrowDown'  || e.code === 'KeyS') pac.nextDir = DIR.DOWN;

  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
    e.preventDefault();
  }
}

// ---------- Update Logic ----------
function update(dt) {
  if (game.state !== 'playing') return;

  game.modeTimer += dt;
  game.roseTimer -= dt;

  const pac = game.pacman;
  const maze = game.maze;
  const levelMultiplier = 1 + (game.level - 1) * 0.05;

  // --- Move Pac-Man ---
  const pacSpeed = pac.speed * TILE * dt;

  // Try buffered direction at tile center
  const tileCenter = tileToPixel(pac.col, pac.row);
  const atCenterX = Math.abs(pac.x - tileCenter.x) < 2;
  const atCenterY = Math.abs(pac.y - tileCenter.y) < 2;

  if (atCenterX && atCenterY) {
    // Snap to grid
    pac.x = tileCenter.x;
    pac.y = tileCenter.y;

    // Try next direction
    if (pac.nextDir !== DIR.NONE) {
      const nc = wrapCol(pac.col + pac.nextDir.x);
      const nr = pac.row + pac.nextDir.y;
      if (canPacmanEnter(nc, nr, maze)) {
        pac.dir = pac.nextDir;
      }
    }
    // Check if current direction is still valid
    const fc = wrapCol(pac.col + pac.dir.x);
    const fr = pac.row + pac.dir.y;
    if (!canPacmanEnter(fc, fr, maze)) {
      pac.dir = DIR.NONE;
    }
  }

  if (pac.dir !== DIR.NONE) {
    pac.x += pac.dir.x * pacSpeed;
    pac.y += pac.dir.y * pacSpeed;

    // Tunnel wrapping
    if (pac.x < -TILE / 2) pac.x += WIDTH + TILE;
    if (pac.x > WIDTH + TILE / 2) pac.x -= WIDTH + TILE;

    pac.col = Math.round((pac.x - TILE / 2) / TILE);
    pac.row = Math.round((pac.y - TILE / 2) / TILE);
    pac.col = wrapCol(pac.col);

    // Snap at tile center if overshooting
    const newCenter = tileToPixel(pac.col, pac.row);
    if (pac.dir.x !== 0 && Math.sign(pac.x - newCenter.x) !== Math.sign(pac.x - newCenter.x - pac.dir.x * pacSpeed)) {
      // passed center
    }
  }

  // --- Eat pellets ---
  if (pac.col >= 0 && pac.col < COLS && pac.row >= 0 && pac.row < ROWS) {
    if (maze[pac.row][pac.col] === 0) {
      maze[pac.row][pac.col] = 2;
      game.score += 10;
      game.pelletsLeft--;
    }
  }

  // --- Rose pickup ---
  if (game.rose) {
    if (pac.col === game.rose.col && pac.row === game.rose.row) {
      pac.powered = true;
      pac.powerTimer = POWER_DURATION;
      pac.shootTimer = 0;
      game.rose = null;
      // Scare ghosts
      for (const g of game.ghosts) {
        if (!g.eliminated && !g.inHouse) g.scared = true;
      }
    }
  }

  // --- Power-up timer ---
  if (pac.powered) {
    pac.powerTimer -= dt;
    pac.shootTimer -= dt;
    if (pac.shootTimer <= 0 && pac.dir !== DIR.NONE) {
      // Shoot heart
      pac.shootTimer = SHOOT_INTERVAL;
      game.hearts.push({
        x: pac.x,
        y: pac.y,
        dx: pac.dir.x * HEART_SPEED * TILE,
        dy: pac.dir.y * HEART_SPEED * TILE,
      });
    }
    if (pac.powerTimer <= 0) {
      pac.powered = false;
      for (const g of game.ghosts) g.scared = false;
    }
  }

  // --- Move hearts ---
  for (let i = game.hearts.length - 1; i >= 0; i--) {
    const h = game.hearts[i];
    h.x += h.dx * dt;
    h.y += h.dy * dt;
    // Remove if out of bounds or hits wall
    const hc = Math.floor(h.x / TILE);
    const hr = Math.floor(h.y / TILE);
    if (h.x < 0 || h.x > WIDTH || h.y < 0 || h.y > HEIGHT || isWall(hc, hr, maze)) {
      game.hearts.splice(i, 1);
    }
  }

  // --- Spawn rose ---
  if (!game.rose && game.roseTimer <= 0) {
    const spot = randomEmptyTile(maze);
    if (spot) game.rose = { col: spot.col, row: spot.row };
    game.roseTimer = ROSE_INTERVAL;
  }

  // --- Move ghosts ---
  for (const g of game.ghosts) {
    if (g.eliminated) {
      g.respawnTimer -= dt;
      if (g.respawnTimer <= 0) {
        // Respawn in ghost house
        g.eliminated = false;
        g.col = 10;
        g.row = 10;
        g.x = 10 * TILE + TILE / 2;
        g.y = 10 * TILE + TILE / 2;
        g.inHouse = true;
        g.released = false;
        g.releaseTimer = 2;
        g.scared = false;
      }
      continue;
    }

    // Release timer
    if (g.inHouse) {
      g.releaseTimer -= dt;
      if (g.releaseTimer <= 0) {
        g.released = true;
        // Move to door and exit
        g.col = 10;
        g.row = 9;
        g.x = 10 * TILE + TILE / 2;
        g.y = 9 * TILE + TILE / 2;
        g.inHouse = false;
        g.dir = DIR.UP;
        // Move up one more to clear the door
        g.row = 8;
        g.y = 8 * TILE + TILE / 2;
      }
      continue;
    }

    const ghostSpd = g.speed * levelMultiplier * (g.scared ? 0.6 : 1) * TILE * dt;
    const gCenter = tileToPixel(g.col, g.row);
    const gAtCenter = Math.abs(g.x - gCenter.x) < 2 && Math.abs(g.y - gCenter.y) < 2;

    if (gAtCenter) {
      g.x = gCenter.x;
      g.y = gCenter.y;

      // Choose direction at intersection
      const scatter = isScatterMode();
      const target = scatter ? g.scatterTarget : getChaseTarget(g, pac);
      const rev = reverseDir(g.dir);
      let bestDir = g.dir;
      let bestDist = Infinity;

      const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];
      for (const d of dirs) {
        if (sameDir(d, rev)) continue;
        const nc = wrapCol(g.col + d.x);
        const nr = g.row + d.y;
        if (!isWalkable(nc, nr, maze)) continue;
        // Ghosts can't go up at certain tiles (classic Pac-Man restriction not fully implemented, keep simple)
        const dd = dist(nc, nr, target.col, target.row);
        if (dd < bestDist) {
          bestDist = dd;
          bestDir = d;
        }
      }
      g.dir = bestDir;
    }

    g.x += g.dir.x * ghostSpd;
    g.y += g.dir.y * ghostSpd;

    // Tunnel wrapping for ghosts
    if (g.x < -TILE / 2) g.x += WIDTH + TILE;
    if (g.x > WIDTH + TILE / 2) g.x -= WIDTH + TILE;

    g.col = Math.round((g.x - TILE / 2) / TILE);
    g.row = Math.round((g.y - TILE / 2) / TILE);
    g.col = wrapCol(g.col);
  }

  // --- Pac-Man-ghost collision ---
  for (const g of game.ghosts) {
    if (g.eliminated || g.inHouse) continue;
    const d = dist(pac.x, pac.y, g.x, g.y);
    if (d < TILE * 0.7) {
      if (g.scared) {
        // Eat scared ghost
        g.eliminated = true;
        g.respawnTimer = GHOST_RESPAWN;
        game.score += 200;
        spawnParticles(g.x, g.y, '#ff69b4');
      } else {
        // Pac-Man dies
        game.lives--;
        if (game.lives <= 0) {
          game.state = 'gameover';
          showGameOver();
        } else {
          game.state = 'dying';
          game.deathTimer = DEATH_DURATION;
        }
        return;
      }
    }
  }

  // --- Heart-ghost collision ---
  for (let hi = game.hearts.length - 1; hi >= 0; hi--) {
    const h = game.hearts[hi];
    for (const g of game.ghosts) {
      if (g.eliminated || g.inHouse) continue;
      const d2 = dist(h.x, h.y, g.x, g.y);
      if (d2 < TILE * 0.7) {
        g.eliminated = true;
        g.respawnTimer = GHOST_RESPAWN;
        game.score += 200;
        spawnParticles(g.x, g.y, g.color);
        game.hearts.splice(hi, 1);
        break;
      }
    }
  }

  // --- Win check ---
  if (game.pelletsLeft <= 0) {
    game.state = 'levelcomplete';
    game.levelCompleteTimer = 2;
  }

  updateHUD();
}

function updateDying(dt) {
  game.deathTimer -= dt;
  if (game.deathTimer <= 0) {
    game.state = 'playing';
    resetAfterDeath();
  }
}

function updateLevelComplete(dt) {
  game.levelCompleteTimer -= dt;
  if (game.levelCompleteTimer <= 0) {
    game.level++;
    initLevel();
    game.state = 'playing';
  }
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * 80,
      vy: Math.sin(angle) * 80,
      size: 4 + Math.random() * 3,
      color: color || '#ff69b4',
      born: game.time,
      life: 0.6 + Math.random() * 0.4,
    });
  }
}

// ---------- Render ----------
function render() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const maze = game.maze;
  if (!maze) return;

  drawMaze(ctx, maze);

  // Draw pellets
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (maze[r][c] === 0) {
        drawPellet(ctx, c, r, game.time);
      }
    }
  }

  // Draw rose
  if (game.rose) {
    drawRose(ctx, game.rose, game.time);
  }

  // Draw hearts
  for (const h of game.hearts) {
    drawHeartProjectile(ctx, h, game.time);
  }

  // Draw ghosts
  for (const g of game.ghosts) {
    if (g.eliminated) continue;
    if (g.inHouse && !g.released) {
      // Draw ghost in house with slight bobbing
      const bobY = Math.sin(game.time * 3 + g.id) * 3;
      const saved = g.y;
      g.y += bobY;
      drawGhost(ctx, g, game.time);
      g.y = saved;
    } else {
      drawGhost(ctx, g, game.time);
    }
  }

  // Draw Pac-Man
  if (game.state === 'dying') {
    const progress = 1 - game.deathTimer / DEATH_DURATION;
    ctx.save();
    ctx.translate(game.pacman.x, game.pacman.y);
    ctx.rotate(progress * Math.PI * 4);
    ctx.scale(1 - progress, 1 - progress);
    ctx.translate(-game.pacman.x, -game.pacman.y);
    drawPacman(ctx, game.pacman, game.time);
    ctx.restore();
  } else if (game.state === 'playing') {
    drawPacman(ctx, game.pacman, game.time);
  }

  // Draw particles
  drawSparkleEffect(ctx, game.particles, game.time);
  // Clean old particles
  game.particles = game.particles.filter(p => game.time - p.born < p.life);

  // Level complete flash
  if (game.state === 'levelcomplete') {
    const flash = Math.sin(game.time * 12) > 0;
    if (flash) {
      ctx.fillStyle = 'rgba(255, 182, 193, 0.15)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}

// ---------- HUD & Overlays ----------
function updateHUD() {
  scoreEl.textContent = `Score: ${game.score}`;
  levelEl.textContent = `Level ${game.level}`;
  livesEl.textContent = '\u2764\ufe0f'.repeat(Math.max(0, game.lives));
}

function showOverlay(show, html) {
  if (show) {
    overlay.innerHTML = html || '';
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function showStartScreen() {
  showOverlay(true, `
    <h1>\u{1F339} PAC-MAN \u2764\ufe0f</h1>
    <p>Valentine's Edition</p>
    <p class="prompt">Press any key to start</p>
    <p class="controls">Arrow keys or WASD to move</p>
    <p class="controls">Eat the \u{1F339} to shoot \u2764\ufe0f at ghosts!</p>
  `);
}

function showGameOver() {
  showOverlay(true, `
    <h1>Game Over \u{1F494}</h1>
    <p>Final Score: ${game.score}</p>
    <p class="prompt">Press any key to try again</p>
  `);
}

// ---------- Game Loop ----------
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.time += dt;

  if (game.state === 'playing') {
    update(dt);
  } else if (game.state === 'dying') {
    updateDying(dt);
  } else if (game.state === 'levelcomplete') {
    updateLevelComplete(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ---------- Bootstrap ----------
window.onload = function () {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  overlay = document.getElementById('overlay');
  scoreEl = document.getElementById('score');
  levelEl = document.getElementById('level');
  livesEl = document.getElementById('lives');

  initLevel();
  updateHUD();
  showStartScreen();

  document.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
};
