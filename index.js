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
    vx: (Math.random() - 0.5) * (0.2 + Math.random() * 0.6),
    vy: (Math.random() - 0.5) * (0.2 + Math.random() * 0.6),
    r: Math.random() * 1.5 + 0.5
  });
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];

    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
    if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

    // Draw node
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff9c";
    ctx.shadowColor = "#00ff9c";
    ctx.shadowBlur = 8;
    ctx.fill();

    // Connections
    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j];
      const dist = Math.hypot(n.x - m.x, n.y - m.y);

      if (dist < LINK_DIST) {
        ctx.strokeStyle = `rgba(0,255,156,${1 - dist / LINK_DIST})`;
        ctx.lineWidth = 1 + (1 - dist / LINK_DIST);
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(animate);
}

animate();
    
