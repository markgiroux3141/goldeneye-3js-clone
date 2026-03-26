#!/usr/bin/env node
/**
 * Bake modelScale into Level GLBs
 *
 * One-time operation: multiplies all vertex positions in each level GLB
 * by its modelScale, so runtime scaling is no longer needed.
 *
 * Usage:
 *   node tools/bake-level-scale.cjs
 */

const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');

const MODEL_SCALES = {
  dam: 0.04841,
  facility: 0.009375,
  runway: 0.126281,
  surface1: 0.024887,
  bunker1: 0.020973,
  silo: 0.023934,
  frigate: 0.025270,
  surface2: 0.024887,
  bunker2: 0.020973,
  statue: 0.105513,
  archives: 0.022318,
  streets: 0.033083,
  depot: 0.051767,
  train: 0.075306,
  jungle: 0.119440,
  control: 0.022672,
  caverns: 0.042157,
  cradle: 0.047989,
  aztec: 0.032036,
  egyptian: 0.044166,
  complex: 0.011996,
};

const levelsDir = path.join(__dirname, '..', 'public', 'models', 'levels');

async function main() {
  const io = new NodeIO();

  for (const [level, scale] of Object.entries(MODEL_SCALES)) {
    const glbPath = path.join(levelsDir, `${level}.glb`);
    if (!fs.existsSync(glbPath)) {
      console.log(`  ${level}.glb — not found, skipping`);
      continue;
    }

    const glbBuffer = fs.readFileSync(glbPath);
    const doc = await io.readBinary(new Uint8Array(glbBuffer));

    let vertexCount = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const posAccessor = prim.getAttribute('POSITION');
        if (!posAccessor) continue;
        const arr = posAccessor.getArray();
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          arr[i] *= scale;
        }
        posAccessor.setArray(arr);
        vertexCount += arr.length / 3;

        // Also scale normals? No — normals are direction vectors, scale doesn't affect them.
      }
    }

    const output = await io.writeBinary(doc);
    fs.writeFileSync(glbPath, Buffer.from(output));

    const sizeMB = (output.byteLength / 1024 / 1024).toFixed(1);
    console.log(`  ${level}.glb — ${vertexCount} verts × ${scale} → ${sizeMB}MB`);
  }

  console.log('\nDone! All level GLBs now have modelScale baked in.');
  console.log('Set modelScale=1 in LevelRegistry.ts and remove runtime scaling.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
