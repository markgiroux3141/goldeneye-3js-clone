/**
 * Inspect texture edge pixels to understand seam cause.
 */
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../public/models/doors/brown-sliding-door.glb');

const io = new NodeIO();
const doc = await io.read(filePath);
const textures = doc.getRoot().listTextures();

for (let i = 0; i < textures.length; i++) {
  const tex = textures[i];
  const imageData = tex.getImage();
  if (!imageData) continue;

  const image = sharp(Buffer.from(imageData));
  const { width, height } = await image.metadata();
  const raw = await image.raw().ensureAlpha().toBuffer();

  console.log(`\n=== Texture ${i} (${width}x${height}) ===`);

  // Check bottom row
  console.log(`Bottom row (y=${height - 1}):`);
  for (let x = 0; x < Math.min(width, 8); x++) {
    const idx = ((height - 1) * width + x) * 4;
    console.log(`  [${x}]: R=${raw[idx]} G=${raw[idx+1]} B=${raw[idx+2]} A=${raw[idx+3]}`);
  }

  // Check top row
  console.log(`Top row (y=0):`);
  for (let x = 0; x < Math.min(width, 8); x++) {
    const idx = x * 4;
    console.log(`  [${x}]: R=${raw[idx]} G=${raw[idx+1]} B=${raw[idx+2]} A=${raw[idx+3]}`);
  }

  // Check right column
  console.log(`Right column (x=${width - 1}):`);
  for (let y = 0; y < Math.min(height, 8); y++) {
    const idx = (y * width + (width - 1)) * 4;
    console.log(`  [${y}]: R=${raw[idx]} G=${raw[idx+1]} B=${raw[idx+2]} A=${raw[idx+3]}`);
  }

  // Check left column
  console.log(`Left column (x=0):`);
  for (let y = 0; y < Math.min(height, 8); y++) {
    const idx = (y * width) * 4;
    console.log(`  [${y}]: R=${raw[idx]} G=${raw[idx+1]} B=${raw[idx+2]} A=${raw[idx+3]}`);
  }

  // Check middle row for comparison
  const midY = Math.floor(height / 2);
  console.log(`Middle row (y=${midY}):`);
  for (let x = 0; x < Math.min(width, 8); x++) {
    const idx = (midY * width + x) * 4;
    console.log(`  [${x}]: R=${raw[idx]} G=${raw[idx+1]} B=${raw[idx+2]} A=${raw[idx+3]}`);
  }
}
