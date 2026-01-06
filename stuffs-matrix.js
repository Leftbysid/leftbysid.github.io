/* =========================
   STUFF MATRIX ENGINE
========================= */

export function startStuffMatrix({
  canvasId = "matrix",
  color = "#00ff9c",
  density = 1.8,
  fontSize = 14,
  speed = 1.2,
  trail = 0.03
} = {}) {

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const chars = "0123456789";
  let rainColor = color;
  let columns = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Array(
      Math.floor((window.innerWidth / fontSize) * density)
    ).fill(0);
  }

  window.addEventListener("resize", resize);
  resize();

  function draw() {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${trail})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = rainColor;
    ctx.font = `${fontSize}px monospace`;

    columns.forEach((y, i) => {
      for (let k = 0; k < 3; k++) {
        const t = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(t, i * fontSize, (y - k) * fontSize);
      }

      if (y * fontSize > canvas.height && Math.random() > 0.92) {
        columns[i] = 0;
      }
      columns[i] += speed;
    });

    requestAnimationFrame(draw);
  }

  draw();

  return {
    setColor(newColor) {
      rainColor = newColor;
    }
  };
}
