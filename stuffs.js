import { startStuffMatrix } from "./stuff-matrix.js";

/* =========================
   START MATRIX
========================= */
const matrix = startStuffMatrix({
  canvasId: "matrix",
  color: "#00ff9c",
  density: 1.8,
  fontSize: 14,
  speed: 1.2,
  trail: 0.03
});

/* =========================
   BACKGROUND SWITCHING
========================= */
const bgs = {
  default: document.getElementById("bg-default"),
  series: document.getElementById("bg-series"),
  movies: document.getElementById("bg-movies"),
  documentary: document.getElementById("bg-documentary"),
};

function showBg(key) {
  Object.values(bgs).forEach(img => {
    if (img) img.classList.remove("active");
  });
  bgs[key]?.classList.add("active");
}

/* =========================
   BUTTON LOGIC
========================= */
const seriesBtn = document.getElementById("seriesBtn");
const moviesBtn = document.getElementById("moviesBtn");
const docBtn = document.getElementById("docBtn");

seriesBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#00ff9c");
  showBg("series");
});

moviesBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#00aaff");
  showBg("movies");
});

docBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#ffaa00");
  showBg("documentary");
});

[seriesBtn, moviesBtn, docBtn].forEach(btn => {
  btn.addEventListener("mouseleave", () => {
    matrix.setColor("#00ff9c");
    showBg("default");
  });
});

/* =========================
   CLICK ROUTING
========================= */
seriesBtn.onclick = () => location.href = "series.html";
moviesBtn.onclick = () => location.href = "movies.html";
docBtn.onclick = () => location.href = "documentary.html";
