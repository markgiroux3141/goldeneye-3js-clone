/**
 * Recenter door GLB models so geometry is at origin:
 *   - X: centered (min+max / 2 = 0)
 *   - Z: centered
 *   - Y: bottom at 0
 *
 * Run: node scripts/recenter-doors.mjs
 */

import { NodeIO } from '@gltf-transform/core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOORS_DIR = path.resolve(__dirname, '../public/models/doors');

const FILES = [
  'grey-swinging-door.glb',
  'bathroom-door.glb',
  'brown-sliding-door.glb',
];

async function recenter(filePath) {
  const io = new NodeIO();
  const doc = await io.read(filePath);
  const root = doc.getRoot();

  // Collect all position accessors and compute global bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const positionAccessors = [];

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      if (!posAccessor) continue;
      positionAccessors.push(posAccessor);

      const count = posAccessor.getCount();
      for (let i = 0; i < count; i++) {
        const v = posAccessor.getElement(i, [0, 0, 0]);
        minX = Math.min(minX, v[0]);
        minY = Math.min(minY, v[1]);
        minZ = Math.min(minZ, v[2]);
        maxX = Math.max(maxX, v[0]);
        maxY = Math.max(maxY, v[1]);
        maxZ = Math.max(maxZ, v[2]);
      }
    }
  }

  if (positionAccessors.length === 0) {
    console.log(`  No mesh data found, skipping.`);
    return;
  }

  // Compute offset: center on X/Z, bottom at Y=0
  const offsetX = (minX + maxX) / 2;
  const offsetY = minY; // shift so bottom = 0
  const offsetZ = (minZ + maxZ) / 2;

  console.log(`  Bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}] Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}] Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
  console.log(`  Offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}, ${offsetZ.toFixed(2)})`);

  if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01 && Math.abs(offsetZ) < 0.01) {
    console.log(`  Already centered, skipping.`);
    return;
  }

  // Apply offset to all position accessors
  const seen = new Set();
  for (const posAccessor of positionAccessors) {
    // Avoid processing shared accessors twice
    const id = posAccessor.getName() + '_' + posAccessor.getCount();
    if (seen.has(posAccessor)) continue;
    seen.add(posAccessor);

    const count = posAccessor.getCount();
    for (let i = 0; i < count; i++) {
      const v = posAccessor.getElement(i, [0, 0, 0]);
      v[0] -= offsetX;
      v[1] -= offsetY;
      v[2] -= offsetZ;
      posAccessor.setElement(i, v);
    }
  }

  // Also zero out any node translations that might add additional offset
  for (const node of root.listNodes()) {
    const t = node.getTranslation();
    if (t[0] !== 0 || t[1] !== 0 || t[2] !== 0) {
      console.log(`  Zeroing node "${node.getName()}" translation: [${t.join(', ')}]`);
      node.setTranslation([0, 0, 0]);
    }
  }

  await io.write(filePath, doc);
  console.log(`  Saved.`);
}

for (const file of FILES) {
  const filePath = path.join(DOORS_DIR, file);
  console.log(`Processing ${file}...`);
  await recenter(filePath);
}

console.log('Done!');
