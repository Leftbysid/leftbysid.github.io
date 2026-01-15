import { auth, db } from "../../firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* ======================
   CANVAS SETUP
====================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const COLS = 10;
const ROWS = 20;
const BLOCK = 20;
ctx.scale(BLOCK, BLOCK);

/* ======================
   STATE
====================== */
let board, dropCounter, lastTime;
let score = 0;
let lines = 0;
let level = 1;
let running = false;
let paused = false;
let bestScore = 0;
let userId = null;

/* ======================
   AUTH LOAD
====================== */
auth.onAuthStateChanged(async user => {
  if (!user) return;
  userId = user.uid;
  await loadBestScore();
});

/* ======================
   FIRESTORE
====================== */
async function loadBestScore() {
  const ref = doc(db, "tetris_scores", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    bestScore = snap.data().best || 0;
    document.getElementById("best").textContent = bestScore;
  }
}

async function saveBestScore() {
  if (score <= bestScore) return;
  bestScore = score;
  document.getElementById("best").textContent = bestScore;

  await setDoc(doc(db, "tetris_scores", userId), {
    best: bestScore,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/* ======================
   MATRIX HELPERS
====================== */
function createMatrix(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function collide(board, p) {
  for (let y = 0; y < p.matrix.length; y++) {
    for (let x = 0; x < p.matrix[y].length; x++) {
      if (
        p.matrix[y][x] &&
        (board[y + p.pos.y] &&
         board[y + p.pos.y][x + p.pos.x]) !== 0
      ) return true;
    }
  }
  return false;
}

function merge(board, p) {
  p.matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) board[y + p.pos.y][x + p.pos.x] = v;
    });
  });
}

/* ======================
   PIECES
====================== */
const PIECES = {
  T: [[0,1,0],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};

function randomPiece() {
  const keys = Object.keys(PIECES);
  return PIECES[keys[Math.floor(Math.random()*keys.length)]];
}

/* ======================
   PLAYER
====================== */
const player = { pos:{x:0,y:0}, matrix:null };

function resetPlayer() {
  player.matrix = randomPiece();
  player.pos.y = 0;
  player.pos.x = (COLS/2|0) - (player.matrix[0].length/2|0);

  if (collide(board, player)) {
    running = false;
    saveBestScore();
    alert("GAME OVER");
  }
}

/* ======================
   GAME LOGIC
====================== */
function sweep() {
  outer: for (let y = board.length - 1; y >= 0; y--) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === 0) continue outer;
    }
    board.splice(y,1);
    board.unshift(Array(COLS).fill(0));
    lines++;
    score += 100;
  }
  level = Math.floor(lines / 10) + 1;
}

function drop() {
  player.pos.y++;
  if (collide(board, player)) {
    player.pos.y--;
    merge(board, player);
    sweep();
    resetPlayer();
    updateHUD();
  }
  dropCounter = 0;
}

function rotate(m) {
  m.forEach((row,y) => {
    for (let x = 0; x < y; x++) {
      [m[x][y], m[y][x]] = [m[y][x], m[x][y]];
    }
  });
  m.forEach(row => row.reverse());
}

/* ======================
   DRAW
====================== */
function drawMatrix(m, o) {
  m.forEach((row,y) => {
    row.forEach((v,x) => {
      if (v) {
        ctx.fillStyle = "#00ff9c";
        ctx.fillRect(x+o.x, y+o.y, 1, 1);
      }
    });
  });
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0,0,COLS,ROWS);
  drawMatrix(board,{x:0,y:0});
  drawMatrix(player.matrix, player.pos);
}

/* ======================
   LOOP
====================== */
function update(time=0) {
  if (!running || paused) return;

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  const speed = Math.max(100, 1000 - (level-1)*100);
  if (dropCounter > speed) drop();

  draw();
  requestAnimationFrame(update);
}

/* ======================
   INPUT
====================== */
document.addEventListener("keydown", e => {
  if (!running) return;

  if (e.key === "ArrowLeft") {
    player.pos.x--;
    if (collide(board,player)) player.pos.x++;
  }
  if (e.key === "ArrowRight") {
    player.pos.x++;
    if (collide(board,player)) player.pos.x--;
  }
  if (e.key === "ArrowDown") drop();
  if (e.key === "ArrowUp") rotate(player.matrix);

  if (e.key === " ") {
    while (!collide(board,player)) player.pos.y++;
    player.pos.y--;
    drop();
  }

  if (e.key.toLowerCase() === "p") {
    paused = !paused;
    if (!paused) requestAnimationFrame(update);
  }
});

/* ======================
   UI
====================== */
function updateHUD() {
  score && (document.getElementById("score").textContent = score);
  document.getElementById("lines").textContent = lines;
  document.getElementById("level").textContent = level;
}

document.getElementById("startBtn").onclick = () => {
  board = createMatrix(COLS, ROWS);
  score = lines = 0;
  level = 1;
  running = true;
  paused = false;
  dropCounter = 0;
  lastTime = 0;
  resetPlayer();
  updateHUD();
  requestAnimationFrame(update);
};
