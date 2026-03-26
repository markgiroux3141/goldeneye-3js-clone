#!/usr/bin/env node
/**
 * Convert flat placements to object-oriented format
 *
 * Reads each level's placements.json (flat format) + renames.json + manifest.json
 * and generates the new { objects: [...] } format, with primary/secondary pairing.
 *
 * Usage:
 *   node tools/convert-placements.cjs
 */

const fs = require('fs');
const path = require('path');

const objectsDir = path.join(__dirname, '..', 'public', 'models', 'objects');

const MISSION_ORDER = [
  'dam', 'facility', 'runway', 'surface1', 'bunker1', 'silo', 'frigate',
  'surface2', 'bunker2', 'statue', 'archives', 'streets', 'depot', 'train',
  'jungle', 'control', 'caverns', 'cradle', 'aztec', 'egyptian', 'complex',
];

function round4(n) { return Math.round(n * 10000) / 10000; }
function round2(n) { return Math.round(n * 100) / 100; }

function normalizePlacement(pos) {
  if (pos.length >= 9) {
    return {
      position: [round4(pos[0]), round4(pos[1]), round4(pos[2])],
      rotation: [round2(pos[3]), round2(pos[4]), round2(pos[5])],
      scale: [round4(pos[6]), round4(pos[7]), round4(pos[8])],
    };
  }
  return {
    position: [round4(pos[0]), round4(pos[1]), round4(pos[2])],
    rotation: [0, round2(pos[3] || 0), 0],
    scale: [1, 1, 1],
  };
}

/** Derive type name: strip .glb, _primary, _secondary */
function deriveTypeName(filename) {
  return filename
    .replace(/\.glb$/i, '')
    .replace(/_(primary|secondary)(_\d+[a-z]?)?$/, '')
    .replace(/_(primary|secondary)$/, '');
}

function main() {
  const levels = MISSION_ORDER.filter(level =>
    fs.existsSync(path.join(objectsDir, level, 'manifest.json'))
  );

  console.log(`Converting placements for ${levels.length} levels\n`);

  for (const level of levels) {
    const levelDir = path.join(objectsDir, level);
    const manifest = JSON.parse(fs.readFileSync(path.join(levelDir, 'manifest.json'), 'utf-8'));

    let renames = {};
    const renamesPath = path.join(levelDir, 'renames.json');
    if (fs.existsSync(renamesPath)) {
      renames = JSON.parse(fs.readFileSync(renamesPath, 'utf-8'));
    }

    const placementsPath = path.join(levelDir, 'placements.json');
    if (!fs.existsSync(placementsPath)) {
      console.log(`  ${level}: no placements.json, skipping`);
      continue;
    }

    const rawPlacements = JSON.parse(fs.readFileSync(placementsPath, 'utf-8'));

    // Already in new format?
    if (rawPlacements.objects && Array.isArray(rawPlacements.objects)) {
      console.log(`  ${level}: already in new format, skipping`);
      continue;
    }

    // Build reverse renames: originalName → humanName
    const originalToHuman = {};
    for (const [humanName, origName] of Object.entries(renames)) {
      originalToHuman[origName] = humanName;
    }

    // Detect primary/secondary pairs by OBJ index
    const byIndex = {};
    for (const [humanName, origName] of Object.entries(renames)) {
      const m = origName.match(/^(primary|secondary)_(\d+)\.glb$/);
      if (m) {
        const [, type, idx] = m;
        if (!byIndex[idx]) byIndex[idx] = {};
        byIndex[idx][type] = humanName;
      }
    }

    // Build pair map: primaryFilename → secondaryFilename
    const pairMap = new Map();
    const pairedSecondaries = new Set();
    for (const [idx, types] of Object.entries(byIndex)) {
      if (types.primary && types.secondary) {
        pairMap.set(types.primary, types.secondary);
        pairedSecondaries.add(types.secondary);
      }
    }

    // Generate objects
    const objects = [];
    const typeCounters = {};
    const processedFiles = new Set();

    function nextId(typeName) {
      if (!typeCounters[typeName]) typeCounters[typeName] = 1;
      const n = typeCounters[typeName]++;
      return `${typeName}_${String(n).padStart(2, '0')}`;
    }

    for (const filename of manifest) {
      if (processedFiles.has(filename)) continue;
      processedFiles.add(filename);

      const originalName = renames[filename] || filename;
      const positions = rawPlacements[originalName];
      if (!positions || positions.length === 0) continue;

      const typeName = deriveTypeName(filename);
      const secondaryFile = pairMap.get(filename);
      const meshes = secondaryFile ? [filename, secondaryFile] : [filename];

      if (secondaryFile) {
        processedFiles.add(secondaryFile);
      }

      // Skip if this is a secondary that was already paired
      if (pairedSecondaries.has(filename)) continue;

      for (const pos of positions) {
        const p = normalizePlacement(pos);
        objects.push({
          id: nextId(typeName),
          type: typeName,
          meshes,
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
          properties: {},
        });
      }
    }

    // Write new format
    fs.writeFileSync(placementsPath, JSON.stringify({ objects }, null, 2));
    console.log(`  ${level}: ${Object.keys(rawPlacements).length} flat entries → ${objects.length} objects (${pairMap.size} pairs)`);
  }

  console.log('\nDone!');
}

main();
