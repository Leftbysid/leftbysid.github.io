import { startStuffMatrix } from "./stuff-matrix.js";

/* =========================
   START MATRIX (ENGINE OWNED)
========================= */
const matrix = startStuffMatrix("matrix");

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
   UI ELEMENTS
========================= */
const seriesBtn = document.getElementById("seriesBtn");
const moviesBtn = document.getElementById("moviesBtn");
const docBtn = document.getElementById("docBtn");

/* =========================
   HOVER BEHAVIOR (UI ONLY)
========================= */
seriesBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#00aaff"); // BLUE
  showBg("series");
});

moviesBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#ffffff"); // WHITE
  showBg("movies");
});

docBtn.addEventListener("mouseenter", () => {
  matrix.setColor("#ff2b2b"); // RED
  showBg("documentary");
});

/* Reset to default */
[seriesBtn, moviesBtn, docBtn].forEach(btn => {
  btn.addEventListener("mouseleave", () => {
    matrix.setColor("#00ff9c"); // MATRIX GREEN
    showBg("default");
  });
});

/* =========================
   CLICK ROUTING
========================= */
seriesBtn.addEventListener("click", () => {
  location.href = "series.html";
});

moviesBtn.addEventListener("click", () => {
  location.href = "movies.html";
});

docBtn.addEventListener("click", () => {
  location.href = "documentary.html";
});
