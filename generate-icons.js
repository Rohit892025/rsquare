/**
 * generate-icons.js
 * Generates PWA icons for RSquare Music Player.
 * Uses the 'canvas' npm package if available, otherwise falls back to
 * a pure-JS minimal PNG encoder.
 *
 * Usage:
 *   npm install canvas   (optional — speeds things up)
 *   node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR);

// ─── Try to use the 'canvas' package ─────────────────────────────────────────
let canvasLib;
try { canvasLib = require('canvas'); } catch (_) {}

if (canvasLib) {
  generateWithCanvas(canvasLib);
} else {
  // Fallback: write pre-built minimal PNGs encoded as base64
  console.log('canvas package not found — using built-in PNG encoder fallback.');
  generateWithPureJS();
}

// ─── Canvas implementation ────────────────────────────────────────────────────
function generateWithCanvas(canvas) {
  const sizes = [
    { file: 'icon-192.png',       size: 192 },
    { file: 'icon-512.png',       size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { file, size } of sizes) {
    const { createCanvas } = canvas;
    const c = createCanvas(size, size);
    const ctx = c.getContext('2d');
    drawIcon(ctx, size);
    const buf = c.toBuffer('image/png');
    fs.writeFileSync(path.join(ICONS_DIR, file), buf);
    console.log(`Generated icons/${file} (${size}x${size})`);
  }
}

function drawIcon(ctx, size) {
  const s = size;
  const cx = s / 2, cy = s / 2, r = s / 2;

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0f';
  ctx.fill();

  // Outer accent ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.strokeStyle = '#7c6aef';
  ctx.lineWidth = s * 0.04;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(124,106,239,0.35)';
  ctx.lineWidth = s * 0.015;
  ctx.stroke();

  // Music note (♩) shape
  const unit = s * 0.09;
  const noteX = cx - unit * 0.6;
  const noteY = cy + unit * 0.8;

  ctx.fillStyle = '#ffffff';

  // Note head (filled ellipse)
  ctx.beginPath();
  ctx.ellipse(noteX, noteY, unit * 0.85, unit * 0.65, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Note stem
  const stemX = noteX + unit * 0.75;
  const stemBottom = noteY - unit * 0.3;
  const stemTop = noteY - unit * 3.2;
  ctx.fillRect(stemX - unit * 0.13, stemTop, unit * 0.26, stemBottom - stemTop);

  // Flag
  ctx.beginPath();
  ctx.moveTo(stemX, stemTop);
  ctx.bezierCurveTo(
    stemX + unit * 1.8, stemTop + unit * 0.6,
    stemX + unit * 1.8, stemTop + unit * 1.4,
    stemX, stemTop + unit * 1.8
  );
  ctx.bezierCurveTo(
    stemX + unit * 1.4, stemTop + unit * 1.4,
    stemX + unit * 1.4, stemTop + unit * 0.8,
    stemX, stemTop + unit * 0.4
  );
  ctx.closePath();
  ctx.fill();
}

// ─── Pure-JS PNG encoder fallback ────────────────────────────────────────────
function generateWithPureJS() {
  const sizes = [
    { file: 'icon-192.png',         size: 192 },
    { file: 'icon-512.png',         size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { file, size } of sizes) {
    const pixels = renderIconPixels(size);
    const png = encodePNG(size, size, pixels);
    fs.writeFileSync(path.join(ICONS_DIR, file), png);
    console.log(`Generated icons/${file} (${size}x${size})`);
  }
}

/** Render RGBA pixel buffer for the icon at given size */
function renderIconPixels(size) {
  const buf = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size / 2;

  function setPixel(x, y, R, G, B, A) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha blending over existing pixel
    const a = A / 255;
    buf[i]   = Math.round(buf[i]   * (1 - a) + R * a);
    buf[i+1] = Math.round(buf[i+1] * (1 - a) + G * a);
    buf[i+2] = Math.round(buf[i+2] * (1 - a) + B * a);
    buf[i+3] = Math.min(255, buf[i+3] + A);
  }

  // Draw filled circle background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= r) {
        // Anti-alias edge
        const alpha = dist > r - 1 ? Math.round((r - dist) * 255) : 255;
        setPixel(x, y, 10, 10, 15, alpha);
      }
    }
  }

  // Draw accent ring
  const ringR = r * 0.88, ringW = size * 0.04;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const d = Math.abs(dist - ringR);
      if (d < ringW) {
        const alpha = d < ringW - 1 ? 255 : Math.round((ringW - d) * 255);
        setPixel(x, y, 124, 106, 239, alpha);
      }
    }
  }

  // Draw a simple waveform in the center (5 vertical bars)
  const barHeights = [0.22, 0.42, 0.62, 0.42, 0.22].map(h => h * size);
  const totalBarW = size * 0.5;
  const barW = Math.floor(totalBarW / 9); // bar + gap
  const gapW = barW;
  const startX = Math.floor(cx - totalBarW / 2);

  for (let b = 0; b < 5; b++) {
    const bh = barHeights[b];
    const bx = startX + b * (barW + gapW);
    const by = Math.floor(cy - bh / 2);
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + barW; x++) {
        setPixel(x, y, 255, 255, 255, 220);
      }
    }
  }

  return buf;
}

/** Minimal PNG encoder (no external deps) */
function encodePNG(width, height, rgba) {
  const zlib = require('zlib');

  // Build raw image data: filter byte (0) + RGBA per row
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[1 + x*4]   = rgba[i];
      row[1 + x*4+1] = rgba[i+1];
      row[1 + x*4+2] = rgba[i+2];
      row[1 + x*4+3] = rgba[i+3];
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  function u32(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcData);
    return Buffer.concat([u32(data.length), typeBytes, data, u32(crc)]);
  }

  const IHDR = chunk('IHDR', Buffer.concat([
    u32(width), u32(height),
    Buffer.from([8, 6, 0, 0, 0]) // bit depth=8, RGBA, compression=0, filter=0, interlace=0
  ]));
  const IDAT = chunk('IDAT', compressed);
  const IEND = chunk('IEND', Buffer.alloc(0));

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, IHDR, IDAT, IEND]);
}

function crc32(buf) {
  const table = makeCRCTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

var _crcTable;
function makeCRCTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}
