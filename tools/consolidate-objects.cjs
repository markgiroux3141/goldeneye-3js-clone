#!/usr/bin/env node
/**
 * Consolidate Level Objects into Shared Pool
 *
 * Reads all per-level object folders, rescales GLBs to scale 1.0 (removing
 * baked modelScale), and writes them to a single shared folder with
 * level-prefixed names. Generates per-level placement files that reference
 * the shared pool.
 *
 * Usage:
 *   node tools/consolidate-objects.cjs [objects-dir]
 *
 * Default objects-dir: public/models/objects
 * Output: public/models/objects/shared/
 */

const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');

// ─── Model Scales (from src/levels/LevelRegistry.ts) ─────────────────────────

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

// Mission order for processing priority
const MISSION_ORDER = [
  'dam', 'facility', 'runway', 'surface1', 'bunker1', 'silo', 'frigate',
  'surface2', 'bunker2', 'statue', 'archives', 'streets', 'depot', 'train',
  'jungle', 'control', 'caverns', 'cradle', 'aztec', 'egyptian', 'complex',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round4(n) { return Math.round(n * 10000) / 10000; }
function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Rescale all POSITION accessors by dividing by modelScale, then bbox-normalize
 * so the object fits in a unit cube. Returns the bboxSize (max extent before normalization).
 *
 * Vertex pipeline: (centered * modelScale) → /modelScale → /bboxSize → unit-normalized
 */
function rescaleAndNormalize(doc, modelScale) {
  // First pass: divide by modelScale and compute bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      if (!posAccessor) continue;
      const arr = posAccessor.getArray();
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] /= modelScale;
        arr[i + 1] /= modelScale;
        arr[i + 2] /= modelScale;
        minX = Math.min(minX, arr[i]);     maxX = Math.max(maxX, arr[i]);
        minY = Math.min(minY, arr[i + 1]); maxY = Math.max(maxY, arr[i + 1]);
        minZ = Math.min(minZ, arr[i + 2]); maxZ = Math.max(maxZ, arr[i + 2]);
      }
    }
  }

  const bboxSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;

  // Second pass: normalize by bboxSize
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      if (!posAccessor) continue;
      const arr = posAccessor.getArray();
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        arr[i] /= bboxSize;
      }
      posAccessor.setArray(arr);
    }
  }

  return bboxSize;
}

/**
 * Convert a 4-element placement [x,y,z,rotY] to 9-element format.
 */
function normalizePlacement(pos) {
  if (pos.length >= 9) {
    return pos.map((v, i) => i < 3 || i >= 6 ? round4(v) : round2(v));
  }
  return [
    round4(pos[0]), round4(pos[1]), round4(pos[2]),
    0, round2(pos[3] || 0), 0,
    1, 1, 1,
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const objectsDir = args[0] || path.join(__dirname, '..', 'public', 'models', 'objects');
  const sharedDir = path.join(objectsDir, 'shared');
  const placementsDir = path.join(sharedDir, 'placements');

  // Clean and create output directories
  if (fs.existsSync(sharedDir)) {
    fs.rmSync(sharedDir, { recursive: true });
  }
  fs.mkdirSync(sharedDir, { recursive: true });
  fs.mkdirSync(placementsDir, { recursive: true });

  const io = new NodeIO();
  const allSharedFiles = [];
  const bboxSizes = {}; // sharedName → bboxSize
  let totalInput = 0;
  let totalOutput = 0;
  let totalPlacements = 0;

  // Discover which levels have object folders
  const availableLevels = MISSION_ORDER.filter(level => {
    const levelDir = path.join(objectsDir, level);
    return fs.existsSync(path.join(levelDir, 'manifest.json'));
  });

  console.log(`Found ${availableLevels.length} levels with object data\n`);

  for (const level of availableLevels) {
    const levelDir = path.join(objectsDir, level);
    const modelScale = MODEL_SCALES[level];

    if (!modelScale) {
      console.warn(`  WARNING: No modelScale for "${level}", skipping`);
      continue;
    }

    // Read level data
    const manifest = JSON.parse(fs.readFileSync(path.join(levelDir, 'manifest.json'), 'utf-8'));
    let renames = {};
    const renamesPath = path.join(levelDir, 'renames.json');
    if (fs.existsSync(renamesPath)) {
      renames = JSON.parse(fs.readFileSync(renamesPath, 'utf-8'));
    }
    let placements = {};
    const placementsPath = path.join(levelDir, 'placements.json');
    if (fs.existsSync(placementsPath)) {
      placements = JSON.parse(fs.readFileSync(placementsPath, 'utf-8'));
    }

    // Build reverse renames: originalName → humanName
    const originalToHuman = {};
    for (const [humanName, origName] of Object.entries(renames)) {
      originalToHuman[origName] = humanName;
    }

    const levelPlacements = {};
    let levelCount = 0;
    let levelSkipped = 0;

    for (const filename of manifest) {
      const originalName = renames[filename] || filename;
      const sharedName = `${level}_${filename}`;
      const glbPath = path.join(levelDir, filename);

      if (!fs.existsSync(glbPath)) {
        levelSkipped++;
        continue;
      }

      try {
        // Read, rescale by modelScale, and bbox-normalize
        const glbBuffer = fs.readFileSync(glbPath);
        const doc = await io.readBinary(new Uint8Array(glbBuffer));
        const bboxSize = rescaleAndNormalize(doc, modelScale);
        const rescaledGlb = await io.writeBinary(doc);

        // Write to shared folder
        fs.writeFileSync(path.join(sharedDir, sharedName), Buffer.from(rescaledGlb));
        allSharedFiles.push(sharedName);
        bboxSizes[sharedName] = round4(bboxSize);
        levelCount++;

        // Map placements for this object
        const positions = placements[originalName];
        if (positions && positions.length > 0) {
          levelPlacements[sharedName] = positions.map(normalizePlacement);
          totalPlacements += positions.length;
        }
      } catch (err) {
        console.warn(`    Failed to process ${level}/${filename}: ${err.message}`);
        levelSkipped++;
      }
    }

    totalInput += manifest.length;
    totalOutput += levelCount;

    // Write per-level placements
    fs.writeFileSync(
      path.join(placementsDir, `${level}.json`),
      JSON.stringify(levelPlacements, null, 2)
    );

    console.log(`  ${level}: ${manifest.length} objects → ${levelCount} shared GLBs, ${Object.keys(levelPlacements).length} with placements${levelSkipped > 0 ? ` (${levelSkipped} skipped)` : ''}`);
  }

  // Write shared manifest and bboxSizes
  allSharedFiles.sort();
  fs.writeFileSync(
    path.join(sharedDir, 'manifest.json'),
    JSON.stringify(allSharedFiles, null, 2)
  );
  fs.writeFileSync(
    path.join(sharedDir, 'bboxSizes.json'),
    JSON.stringify(bboxSizes, null, 2)
  );

  console.log(`\nDone! ${totalInput} input objects → ${totalOutput} shared GLBs`);
  console.log(`${totalPlacements} total placement instances across ${availableLevels.length} levels`);
  console.log(`Output: ${sharedDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
