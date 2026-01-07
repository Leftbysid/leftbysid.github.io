/* =========================
   STUFF MATRIX ENGINE
   (Music-reactive, isolated)
========================= */

export function startStuffMatrix(canvasId = "matrix") {

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const chars = "0123456789";
  const fontSize = 14;
  const density = 1.1;
  const baseSpeed = 0.35;
  const trail = 0.015;

  let rainColor = "#00ff9c";
  let audioEnergy = 0;
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
    ctx.globalAlpha = 0.8 + audioEnergy * 0.4;

    columns.forEach((row, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = row * fontSize * 1.15;

      ctx.fillText(char, x, y);

      const speed = baseSpeed + audioEnergy * 0.4;

      if (y > canvas.height && Math.random() > 0.985) {
        columns[i] = 0;
      } else {
        columns[i] += speed;
      }
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  draw();

  return {
    setColor(color) {
      rainColor = color;
    },
    setEnergy(value) {
      audioEnergy = Math.min(1, Math.max(0, value));
    }
  };
}
