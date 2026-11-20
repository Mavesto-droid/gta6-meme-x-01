// gta6-meme-x-01 entry (Node 22, standard library only).
//
// What it does:
//   1. Assembles the meme deterministically from the repository's assets --
//      the Vice City scene, the two caption layers and the real make.fun
//      ghost -- and writes it to /output/meme.png.
//   2. Copies POST.json (the X post's address) to /output/POST.json, where
//      the gate reads it. The post itself is judged from X, not from here.
//
// No network, no wall clock, no files outside the repository: the two runs
// of the entry write the same bytes.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ASSETS = join(BOT_DIR, 'assets');

// Layout, identical to compose.py (the build-time composer):
// the scene is 1920x1280, the caption layers are full-size transparencies.
const GHOST_SIZE = 250;
const GHOST_X = 1515;
const GHOST_Y = 635;

type RGBA = { width: number; height: number; data: Uint8Array };

// ---- PNG: minimal 8-bit, non-interlaced decoder (colour types 0, 2, 3, 4, 6) ----

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function decodePng(buf: Buffer): RGBA {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('not a PNG file');
  }
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 2;
  let interlace = 0;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = Buffer.from(data);
    } else if (type === 'tRNS') {
      trns = Buffer.from(data);
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error(`unsupported PNG: bitDepth ${bitDepth}, interlace ${interlace}`);
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (channels === undefined) throw new Error(`unsupported colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const recon = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? recon[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      const v = line[i];
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      recon[i] = (v + pred) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      if (colorType === 2) {
        out[di] = recon[si];
        out[di + 1] = recon[si + 1];
        out[di + 2] = recon[si + 2];
        out[di + 3] = 255;
      } else if (colorType === 6) {
        out[di] = recon[si];
        out[di + 1] = recon[si + 1];
        out[di + 2] = recon[si + 2];
        out[di + 3] = recon[si + 3];
      } else if (colorType === 0) {
        out[di] = out[di + 1] = out[di + 2] = recon[si];
        out[di + 3] = 255;
      } else if (colorType === 4) {
        out[di] = out[di + 1] = out[di + 2] = recon[si];
        out[di + 3] = recon[si + 1];
      } else {
        const idx = recon[si] * 3;
        out[di] = palette![idx];
        out[di + 1] = palette![idx + 1];
        out[di + 2] = palette![idx + 2];
        out[di + 3] = trns && recon[si] < trns.length ? trns[recon[si]] : 255;
      }
    }
    prev = recon;
  }
  return { width, height, data: out };
}

// ---- PNG: RGB encoder, filter 0, fixed deflate level (deterministic) ----

function encodePng(img: RGBA): Buffer {
  const { width, height, data } = img;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      raw[row + 1 + x * 3] = data[si];
      raw[row + 1 + x * 3 + 1] = data[si + 1];
      raw[row + 1 + x * 3 + 2] = data[si + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const header = Buffer.from('89504e470d0a1a0a', 'hex');
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Compositing: bilinear resize (premultiplied alpha) + source-over ----

function resizeBilinear(src: RGBA, w: number, h: number): RGBA {
  const out = new Uint8Array(w * h * 4);
  const sx = src.width / w;
  const sy = src.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (x + 0.5) * sx - 0.5;
      const gy = (y + 0.5) * sy - 0.5;
      const x0 = Math.max(0, Math.floor(gx));
      const y0 = Math.max(0, Math.floor(gy));
      const x1 = Math.min(src.width - 1, x0 + 1);
      const y1 = Math.min(src.height - 1, y0 + 1);
      const fx = Math.min(1, Math.max(0, gx - x0));
      const fy = Math.min(1, Math.max(0, gy - y0));
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = src.data[(y0 * src.width + x0) * 4 + c];
        const p10 = src.data[(y0 * src.width + x1) * 4 + c];
        const p01 = src.data[(y1 * src.width + x0) * 4 + c];
        const p11 = src.data[(y1 * src.width + x1) * 4 + c];
        // Interpolate premultiplied values for colour, plain for alpha.
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;
        if (c < 3) {
          const a00 = src.data[(y0 * src.width + x0) * 4 + 3] / 255;
          const a10 = src.data[(y0 * src.width + x1) * 4 + 3] / 255;
          const a01 = src.data[(y1 * src.width + x0) * 4 + 3] / 255;
          const a11 = src.data[(y1 * src.width + x1) * 4 + 3] / 255;
          const a = p00 * a00 * w00 + p10 * a10 * w10 + p01 * a01 * w01 + p11 * a11 * w11;
          const alpha = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;
          out[di + c] = alpha > 0 ? Math.round(a / alpha) : 0;
        } else {
          out[di + c] = Math.round(p00 * w00 + p10 * w10 + p01 * w01 + p11 * w11);
        }
      }
    }
  }
  return { width: w, height: h, data: out };
}

function compositeOver(dst: RGBA, src: RGBA, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      const sa = src.data[si + 3] / 255;
      if (sa === 0) continue;
      const di = (ty * dst.width + tx) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] = Math.round(src.data[si + c] * sa + dst.data[di + c] * (1 - sa));
      }
      dst.data[di + 3] = 255;
    }
  }
}

// ---- Entry point ----

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const scene = decodePng(readFileSync(join(ASSETS, 'scene.png')));
  const top = decodePng(readFileSync(join(ASSETS, 'caption-top.png')));
  const bottom = decodePng(readFileSync(join(ASSETS, 'caption-bottom.png')));
  const ghost = decodePng(readFileSync(join(ASSETS, 'ghost.png')));
  // The caption layers are full-size transparencies: they must match the
  // scene exactly, or the composite would silently shift. Fail loudly.
  for (const [name, layer] of [['caption-top', top], ['caption-bottom', bottom]] as const) {
    if (layer.width !== scene.width || layer.height !== scene.height) {
      throw new Error(`${name}.png is ${layer.width}x${layer.height}, scene is ${scene.width}x${scene.height}`);
    }
  }
  const ghostSmall = resizeBilinear(ghost, GHOST_SIZE, GHOST_SIZE);
  compositeOver(scene, top, 0, 0);
  compositeOver(scene, bottom, 0, 0);
  compositeOver(scene, ghostSmall, GHOST_X, GHOST_Y);
  writeFileSync(join(OUTPUT_DIR, 'meme.png'), encodePng(scene));
  try {
    copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
  } catch (err) {
    console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
