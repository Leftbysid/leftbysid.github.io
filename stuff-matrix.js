/* =========================
   STUFF MATRIX ENGINE
   (Slow, Clean, Cinematic)
========================= */

export function startStuffMatrix(canvasId = "matrix") {

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  /* 🔒 LOCKED SETTINGS (SLOW) */
  const chars = "0123456789";
  const fontSize = 14;
  const density = 1.1;   // slightly calmer
  const speed = 0.35;    // ⬅️ MAIN SLOWDOWN
  const trail = 0.06;    // clean long trails

  let rainColor = "#00ff9c";
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
    /* Fade previous frame (transparent background preserved) */
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${trail})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = rainColor;
    ctx.font = `${fontSize}px monospace`;

    columns.forEach((row, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = row * fontSize * 1.15; // extra vertical spacing

      ctx.fillText(char, x, y);

      // slower, more natural reset
      if (y > canvas.height && Math.random() > 0.985) {
        columns[i] = 0;
      } else {
        columns[i] += speed;
      }
    });

    requestAnimationFrame(draw);
  }

  draw();

  /* 🔓 LIMITED API */
  return {
    setColor(newColor) {
      rainColor = newColor;
    }
  };
}
