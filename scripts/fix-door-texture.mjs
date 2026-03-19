/**
 * Fix UV seam bleeding on door textures.
 * Clones interior pixels to edge rows/columns so bilinear filtering
 * at UV boundaries never samples the dark groove pixels at texture edges.
 *
 * Run: node scripts/fix-door-texture.mjs
 */

import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOORS_DIR = path.resolve(__dirname, '../public/models/doors');
const DEBUG_DIR = path.resolve(__dirname, '../debug-textures');

/**
 * Clone interior pixels to edges to prevent UV seam bleeding.
 * Copies the 2nd row/column to the 1st, and the 2nd-to-last to the last.
 */
function fixEdges(pixels, width, height) {
  const out = new Uint8Array(pixels);

  for (let x = 0; x < width; x++) {
    // Clone row 1 → row 0
    const src0 = (1 * width + x) * 4;
    const dst0 = (0 * width + x) * 4;
    out[dst0] = out[src0]; out[dst0+1] = out[src0+1]; out[dst0+2] = out[src0+2]; out[dst0+3] = out[src0+3];

    // Clone row (h-2) → row (h-1)
    const srcN = ((height - 2) * width + x) * 4;
    const dstN = ((height - 1) * width + x) * 4;
    out[dstN] = out[srcN]; out[dstN+1] = out[srcN+1]; out[dstN+2] = out[srcN+2]; out[dstN+3] = out[srcN+3];
  }

  for (let y = 0; y < height; y++) {
    // Clone col 1 → col 0
    const src0 = (y * width + 1) * 4;
    const dst0 = (y * width + 0) * 4;
    out[dst0] = out[src0]; out[dst0+1] = out[src0+1]; out[dst0+2] = out[src0+2]; out[dst0+3] = out[src0+3];

    // Clone col (w-2) → col (w-1)
    const srcN = (y * width + (width - 2)) * 4;
    const dstN = (y * width + (width - 1)) * 4;
    out[dstN] = out[srcN]; out[dstN+1] = out[srcN+1]; out[dstN+2] = out[srcN+2]; out[dstN+3] = out[srcN+3];
  }

  return out;
}

async function fixTextures(filePath, saveDebug = false) {
  const io = new NodeIO();
  const doc = await io.read(filePath);
  const root = doc.getRoot();
  const textures = root.listTextures();
  console.log(`  Found ${textures.length} texture(s)`);

  if (saveDebug && !fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

  let fixed = 0;
  for (let i = 0; i < textures.length; i++) {
    const tex = textures[i];
    const imageData = tex.getImage();
    if (!imageData) continue;

    const image = sharp(Buffer.from(imageData));
    const { width, height } = await image.metadata();
    const rawPixels = await image.raw().ensureAlpha().toBuffer();

    console.log(`  Texture ${i}: ${width}x${height}`);

    if (saveDebug) {
      const name = path.basename(filePath, '.glb');
      await sharp(rawPixels, { raw: { width, height, channels: 4 } })
        .png().toFile(path.join(DEBUG_DIR, `${name}_tex${i}_before.png`));
    }

    const fixedPixels = fixEdges(rawPixels, width, height);

    if (saveDebug) {
      const name = path.basename(filePath, '.glb');
      await sharp(Buffer.from(fixedPixels), { raw: { width, height, channels: 4 } })
        .png().toFile(path.join(DEBUG_DIR, `${name}_tex${i}_after.png`));
    }

    const fixedBuffer = await sharp(Buffer.from(fixedPixels), { raw: { width, height, channels: 4 } })
      .png().toBuffer();

    tex.setImage(new Uint8Array(fixedBuffer));
    tex.setMimeType('image/png');
    fixed++;
  }

  if (fixed > 0) {
    await io.write(filePath, doc);
    console.log(`  Saved with ${fixed} fixed texture(s).`);
  }
}

const files = ['brown-sliding-door.glb'];
for (const file of files) {
  console.log(`Processing ${file}...`);
  await fixTextures(path.join(DOORS_DIR, file), true);
}
console.log('Done!');
