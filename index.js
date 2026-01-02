const canvas = document.getElementById("neural");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const nodes = [];
const NODE_COUNT = 60;
const LINK_DIST = 130;

for (let i = 0; i < NODE_COUNT; i++) {
  nodes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
   vx: (Math.random() - 0.5) * 0.8,
   vy: (Math.random() - 0.5) * 0.8,
    r: Math.random() * 1.5 + 0.5
  });
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];

    n.x += n.vx;
    n.y += n.vy;
