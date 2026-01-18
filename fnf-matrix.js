/* =========================
   MATRIX RAIN
========================= */
const matrix = document.getElementById("matrix");
const mctx = matrix.getContext("2d");

const chars = "0123456789";
const fontSize = 16;
let rainColor = "#00ff9c";
let columns = [];
let lastTime = 0;

function resizeMatrix() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  matrix.width = window.innerWidth * dpr;
  matrix.height = window.innerHeight * dpr;
  matrix.style.width = window.innerWidth + "px";
  matrix.style.height = window.innerHeight + "px";
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const densityMultiplier = 2.2; // 👈 increase this for more density
  columns = Array(Math.floor((window.innerWidth / fontSize) * densityMultiplier)).fill(0);
}
window.addEventListener("resize", resizeMatrix);
resizeMatrix();

function drawMatrix(time) {
  if (time - lastTime < 33) {
    requestAnimationFrame(drawMatrix);
    return;
  }
  lastTime = time;

  mctx.globalCompositeOperation = "destination-out";
  mctx.fillStyle = "rgba(0,0,0,0.03)";
  mctx.fillRect(0, 0, matrix.width, matrix.height);
  mctx.globalCompositeOperation = "source-over";
  mctx.fillStyle = rainColor;
  mctx.font = `${fontSize}px monospace`;

  columns.forEach((y, i) => {
    const t = chars[Math.floor(Math.random() * chars.length)];
    mctx.fillText(t, i * fontSize, y * fontSize);
    if (y * fontSize > matrix.height && Math.random() > 0.96) columns[i] = 0;
    columns[i]++;
  });

  requestAnimationFrame(drawMatrix);
}
requestAnimationFrame(drawMatrix);

/* =========================
   RIPPLE EFFECT
========================= */
const rippleCanvas = document.getElementById("ripples");
const rctx = rippleCanvas.getContext("2d");
let ripples = [];

function resizeRipples() {
  rippleCanvas.width = window.innerWidth;
  rippleCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeRipples);
resizeRipples();

function addRipple(x, y, color) {
  ripples.push({ x, y, r: 0, alpha: 1, color });
}

function drawRipples() {
  rctx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);

  ripples.forEach(r => {
    rctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
    rctx.lineWidth = 2;
    rctx.beginPath();
    rctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    rctx.stroke();

    r.r += 1.5;
    r.alpha -= 0.008;
  });

  ripples = ripples.filter(r => r.alpha > 0);
  requestAnimationFrame(drawRipples);
}
drawRipples();

/* =========================
   BUTTON INTERACTION
========================= */
const fictionBtn = document.getElementById("fictionBtn");
const nonFictionBtn = document.getElementById("nonFictionBtn");

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

if (fictionBtn) {
  fictionBtn.addEventListener("mouseenter", () => {
    rainColor = "#00aaff";
    const p = centerOf(fictionBtn);
    addRipple(p.x, p.y, "0,170,255");
  });
  fictionBtn.addEventListener("mouseleave", () => {
    rainColor = "#00ff9c";
  });
}

if (nonFictionBtn) {
  nonFictionBtn.addEventListener("mouseenter", () => {
    rainColor = "#ff2b2b";
    const p = centerOf(nonFictionBtn);
    addRipple(p.x, p.y, "255,43,43");
  });
  nonFictionBtn.addEventListener("mouseleave", () => {
    rainColor = "#00ff9c";
  });
}

/* =========================
   MUSIC TOGGLE
========================= */
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");

let playing = false;

if (music && musicBtn) {
  music.volume = 0.5;

  musicBtn.addEventListener("click", () => {
    if (!playing) {
      music.play().catch(() => {});
      musicBtn.textContent = "⏸";
    } else {
      music.pause();
      musicBtn.textContent = "▶";
    }
    playing = !playing;
  });
}

<script>
  document.querySelectorAll('.home-gif img').forEach(img => {
    const staticSrc = img.src;
    const animatedSrc = img.dataset.anim;

    img.addEventListener('mouseenter', () => {
      img.src = animatedSrc;
    });

    img.addEventListener('mouseleave', () => {
      img.src = staticSrc;
    });
  });
</script>


    img.addEventListener('mouseleave', () => {
      img.src = staticSrc;
    });
  });
</script>
