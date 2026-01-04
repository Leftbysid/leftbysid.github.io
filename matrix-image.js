const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const img = document.getElementById("matrixImage");

const fontSize = 16;
const chars = "0123456789";

let cols = Math.floor(canvas.width / fontSize);
let rows = Math.floor(canvas.height / fontSize);

let rain = new Array(cols).fill(0);
let mask = new Array(cols * rows).fill(false);

img.onload = () => {
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const offCtx = off.getContext("2d");

  // scale & center image into grid
  const scale = Math.min(cols / img.width, rows / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (cols - w) / 2;
  const y = (rows - h) / 2;

  offCtx.drawImage(img, x, y, w, h);

  const data = offCtx.getImageData(0, 0, cols, rows).data;

  for (let i = 0; i < data.length; i += 4) {
    mask[i / 4] = data[i + 3] > 40;
  }

  rain = rain.map(() => Math.floor(Math.random() * rows));
};

function draw() {
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = fontSize + "px monospace";

  for (let c = 0; c < cols; c++) {
    const r = rain[c];
    const idx = r * cols + c;

    // background rain
    ctx.fillStyle = "#00aa66";
    ctx.fillText(
      chars[Math.floor(Math.random() * chars.length)],
      c * fontSize,
      r * fontSize
    );

    // image mask highlight
    if (mask[idx]) {
      ctx.fillStyle = "#00ff9c";
      ctx.fillText(
        chars[Math.floor(Math.random() * chars.length)],
        c * fontSize,
        r * fontSize
      );
    }

    rain[c]++;

    if (rain[c] > rows) {
      rain[c] = Math.floor(Math.random() * -20);
    }
  }
}

setInterval(draw, 70);
