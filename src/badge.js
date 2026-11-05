const MESSAGE_RED = [229, 57, 53, 255];
const CALL_GREEN = [46, 184, 92, 255];
const WHITE = [255, 255, 255, 255];

const PHONE = [
  0b00011100, 0b00100010, 0b00100010, 0b00010100, 0b00101000, 0b01010000, 0b10001000, 0b01110000,
];

function withActivity(base, messages, incomingCall) {
  const icon = {
    width: base.width,
    height: base.height,
    data: Buffer.from(base.data),
  };
  if (messages === 0 && !incomingCall) return icon;

  const size = Math.min(icon.width, icon.height);
  if (messages > 0 && incomingCall) {
    drawCount(icon, messages, "bottom-right", size, MESSAGE_RED);
    drawPhone(icon, "top-right", size);
  } else if (incomingCall) {
    drawPhone(icon, "bottom-right", size);
  } else {
    drawCount(icon, messages, "bottom-right", size, MESSAGE_RED);
  }
  return icon;
}

function drawCount(icon, messages, corner, size, fill) {
  const label = messages > 99 ? "99+" : String(messages);
  const [centerX, centerY, radius] = badgeGeometry(icon, corner, size);
  fillCircle(icon, centerX, centerY, radius, WHITE);
  fillCircle(icon, centerX, centerY, radius * 0.84, fill);
  drawText(icon, label, centerX, centerY, radius * 1.15);
}

function drawPhone(icon, corner, size) {
  const [centerX, centerY, radius] = badgeGeometry(icon, corner, size);
  fillCircle(icon, centerX, centerY, radius, WHITE);
  fillCircle(icon, centerX, centerY, radius * 0.84, CALL_GREEN);
  blitMask(icon, PHONE, 8, centerX, centerY, radius * 0.95, WHITE);
}

function badgeGeometry(icon, corner, size) {
  const radius = size * 0.21;
  const margin = size * 0.03;
  const centerX = icon.width - margin - radius;
  const centerY = corner === "top-right" ? margin + radius : icon.height - margin - radius;
  return [centerX, centerY, radius];
}

function fillCircle(icon, cx, cy, radius, color) {
  const reach = Math.ceil(radius) + 1;
  const originX = Math.round(cx);
  const originY = Math.round(cy);
  for (let y = originY - reach; y <= originY + reach; y += 1) {
    for (let x = originX - reach; x <= originX + reach; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const coverage = Math.min(1, Math.max(0, radius + 0.5 - Math.hypot(dx, dy)));
      blendAt(icon, x, y, color, coverage);
    }
  }
}

function blendAt(icon, x, y, color, coverage) {
  if (coverage <= 0 || x < 0 || y < 0 || x >= icon.width || y >= icon.height) return;
  const offset = (y * icon.width + x) * 4;
  const pixel = icon.data;
  const alpha = (color[3] / 255) * coverage;
  for (let channel = 0; channel < 3; channel += 1) {
    const mixed = color[channel] * alpha + pixel[offset + channel] * (1 - alpha);
    pixel[offset + channel] = clampByte(mixed);
  }
  const destinationAlpha = pixel[offset + 3] / 255;
  pixel[offset + 3] = clampByte((alpha + destinationAlpha * (1 - alpha)) * 255);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function drawText(icon, text, cx, cy, maxWidth) {
  const glyphs = [...text].map(digitGlyph);
  if (glyphs.length === 0) return;
  const glyphWidth = 5;
  const gap = 1;
  const unscaled = glyphs.length * glyphWidth + (glyphs.length - 1) * gap;
  const scale = Math.max(1, Math.floor(maxWidth / unscaled));
  const width = unscaled * scale;
  const height = 7 * scale;
  let originX = cx - width / 2;
  const originY = cy - height / 2;
  for (const glyph of glyphs) {
    blitMask(icon, glyph, 5, originX + (glyphWidth * scale) / 2, originY + height / 2, glyphWidth * scale, WHITE);
    originX += (glyphWidth + gap) * scale;
  }
}

function blitMask(icon, rows, bits, cx, cy, width, color) {
  const scale = width / bits;
  const height = rows.length * scale;
  const originX = cx - width / 2;
  const originY = cy - height / 2;
  rows.forEach((rowBits, row) => {
    for (let col = 0; col < bits; col += 1) {
      const mask = 1 << (bits - 1 - col);
      if ((rowBits & mask) === 0) continue;
      const x0 = Math.floor(originX + col * scale);
      const y0 = Math.floor(originY + row * scale);
      const x1 = Math.ceil(originX + (col + 1) * scale);
      const y1 = Math.ceil(originY + (row + 1) * scale);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) blendAt(icon, x, y, color, 1);
      }
    }
  });
}

function digitGlyph(character) {
  switch (character) {
    case "0":
      return [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110];
    case "1":
      return [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110];
    case "2":
      return [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111];
    case "3":
      return [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110];
    case "4":
      return [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010];
    case "5":
      return [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110];
    case "6":
      return [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110];
    case "7":
      return [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000];
    case "8":
      return [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110];
    case "9":
      return [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100];
    case "+":
      return [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000];
    default:
      return [0, 0, 0, 0, 0, 0, 0];
  }
}

function fromNativeImage(image) {
  const { width, height } = image.getSize();
  const bgra = image.toBitmap();
  const data = Buffer.alloc(bgra.length);
  for (let offset = 0; offset < bgra.length; offset += 4) {
    data[offset] = bgra[offset + 2];
    data[offset + 1] = bgra[offset + 1];
    data[offset + 2] = bgra[offset];
    data[offset + 3] = bgra[offset + 3];
  }
  return { width, height, data };
}

function toNativeImage(nativeImage, bitmap) {
  const bgra = Buffer.alloc(bitmap.data.length);
  for (let offset = 0; offset < bitmap.data.length; offset += 4) {
    bgra[offset] = bitmap.data[offset + 2];
    bgra[offset + 1] = bitmap.data[offset + 1];
    bgra[offset + 2] = bitmap.data[offset];
    bgra[offset + 3] = bitmap.data[offset + 3];
  }
  return nativeImage.createFromBitmap(bgra, { width: bitmap.width, height: bitmap.height });
}

module.exports = { withActivity, fromNativeImage, toNativeImage };
