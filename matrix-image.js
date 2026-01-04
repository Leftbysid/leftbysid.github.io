const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const img = document.getElementById("matrixImage");
const fontSize = 16;
const chars = "0123456789";

let columns = Math.floor(canvas.width / fontSize);
let drops = [];
let imgData = null;

img.onload = () => {
  // offscreen canvas to read pixels
  const off = document.createElement("canvas");
  off.width = img.width;
  off.height = img.height;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(img, 0, 0);

  imgData = offCtx.getImageData(0, 0, img.width, img.height).data;

  drops = Array.from({ length: columns }).map(() =>
    Math.floor(Math.random() * canvas.height / fontSize)
  );
};

function draw() {
  // trail fade
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ff9c";
  ctx.font = fontSize + "px monospace";

  const imgX = Math.floor(canvas.width / 2 - img.width / 2);
  const imgY = Math.floor(canvas.height / 2 - img.height / 2);

  drops.forEach((row, i) => {
    const x = i * fontSize;
    const y = row * fontSize;

    const px = x - imgX;
    const py = y - imgY;

    if (
      imgData &&
      px >= 0 && py >= 0 &&
      px < img.width && py < img.height
    ) {
      const alpha = imgData[(py * img.width + px) * 4 + 3];

      if (alpha > 30) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);
      }
    }

    // move down in discrete steps
    drops[i] += 1;

    if (drops[i] * fontSize > canvas.height) {
      drops[i] = Math.floor(Math.random() * -20);
    }
  });
}

setInterval(draw, 70);

// resize handling
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  columns = Math.floor(canvas.width / fontSize);
});
