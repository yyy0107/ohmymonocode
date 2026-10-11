// Deterministic, dependency-free bitmap lettering for the native NSIS header.
import { writeFileSync } from "node:fs";

const glyphs = {
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};
const width = 150, height = 57, stride = Math.ceil(width * 3 / 4) * 4;
const bmp = Buffer.alloc(54 + stride * height, 255);
bmp.fill(0, 0, 54);
bmp.write("BM");
bmp.writeUInt32LE(bmp.length, 2);
bmp.writeUInt32LE(54, 10);
bmp.writeUInt32LE(40, 14);
bmp.writeInt32LE(width, 18);
bmp.writeInt32LE(height, 22);
bmp.writeUInt16LE(1, 26);
bmp.writeUInt16LE(24, 28);
bmp.writeUInt32LE(stride * height, 34);
function rect(x, y, w, h) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++)
      bmp.fill(0, 54 + (height - 1 - row) * stride + col * 3,
        54 + (height - 1 - row) * stride + col * 3 + 3);
}
for (const [index, letter] of [..."MONOCODE"].entries())
  glyphs[letter].forEach((row, y) => [...row].forEach((bit, x) => {
    if (bit === "1") rect(28 + index * 12 + x * 2, 21 + y * 2, 2, 2);
  }));
rect(13, 21, 7, 7);
rect(13, 29, 7, 6);
writeFileSync(new URL("../src-tauri/installer/pixel-header.bmp", import.meta.url), bmp);
