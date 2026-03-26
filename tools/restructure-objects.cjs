#!/usr/bin/env node
/**
 * Restructure: Flat Object Pool + Separate Level Data
 *
 * Moves GLBs from per-level folders into a flat pool with level-prefixed names,
 * and moves placements/renames into public/data/levels/{level}/.
 *
 * Usage:
 *   node tools/restructure-objects.cjs
 */

const fs = require('fs');
const path = require('path');

const MISSION_ORDER = [
  'dam', 'facility', 'runway', 'surface1', 'bunker1', 'silo', 'frigate',
  'surface2', 'bunker2', 'statue', 'archives', 'streets', 'depot', 'train',
  'jungle', 'control', 'caverns', 'cradle', 'aztec', 'egyptian', 'complex',
];

const publicDir = path.join(__dirname, '..', 'public');
const objectsSourceDir = path.join(publicDir, 'models', 'objects');
const objectsPoolDir = path.join(publicDir, 'models', 'objects'); // same dir, flat
const dataDir = path.join(publicDir, 'data', 'levels');

function main() {
  // Create data directory
  fs.mkdirSync(dataDir, { recursive: true });

  const allGlbs = [];
  const levels = MISSION_ORDER.filter(level =>
    fs.existsSync(path.join(objectsSourceDir, level)) &&
    fs.statSync(path.join(objectsSourceDir, level)).isDirectory()
  );

  console.log(`Processing ${levels.length} levels\n`);

  for (const level of levels) {
    const levelDir = path.join(objectsSourceDir, level);
    const levelDataDir = path.join(dataDir, level);
    fs.mkdirSync(levelDataDir, { recursive: true });

    // Read manifest to know which files are GLBs
    const manifestPath = path.join(levelDir, 'manifest.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    // Copy GLBs to flat pool with level prefix
    let glbCount = 0;
    for (const filename of manifest) {
      const srcPath = path.join(levelDir, filename);
      const prefixedName = `${level}_${filename}`;
      const dstPath = path.join(objectsPoolDir, prefixedName);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        allGlbs.push(prefixedName);
        glbCount++;
      }
    }

    // Move renames.json to data dir
    const renamesPath = path.join(levelDir, 'renames.json');
    if (fs.existsSync(renamesPath)) {
      // Update renames to use prefixed names: { "dam_guard.glb": "primary_000.glb" }
      const renames = JSON.parse(fs.readFileSync(renamesPath, 'utf-8'));
      const prefixedRenames = {};
      for (const [humanName, origName] of Object.entries(renames)) {
        prefixedRenames[`${level}_${humanName}`] = origName;
      }
      fs.writeFileSync(
        path.join(levelDataDir, 'renames.json'),
        JSON.stringify(prefixedRenames, null, 2)
      );
    }

    // Move placements.json to data dir, updating mesh references
    const placementsPath = path.join(levelDir, 'placements.json');
    if (fs.existsSync(placementsPath)) {
      const raw = JSON.parse(fs.readFileSync(placementsPath, 'utf-8'));

      if (raw.objects && Array.isArray(raw.objects)) {
        // New format — prefix mesh filenames
        for (const obj of raw.objects) {
          obj.meshes = obj.meshes.map(m => `${level}_${m}`);
        }
        fs.writeFileSync(
          path.join(levelDataDir, 'placements.json'),
          JSON.stringify(raw, null, 2)
        );
      } else {
        // Old flat format — just copy as-is (shouldn't happen after convert-placements)
        fs.copyFileSync(placementsPath, path.join(levelDataDir, 'placements.json'));
      }
    }

    console.log(`  ${level}: ${glbCount} GLBs → flat pool, data → data/levels/${level}/`);
  }

  // Write master manifest
  allGlbs.sort();
  fs.writeFileSync(
    path.join(objectsPoolDir, 'manifest.json'),
    JSON.stringify(allGlbs, null, 2)
  );

  // Delete old per-level subdirectories
  for (const level of levels) {
    const levelDir = path.join(objectsSourceDir, level);
    if (fs.existsSync(levelDir)) {
      fs.rmSync(levelDir, { recursive: true });
      console.log(`  Deleted ${level}/`);
    }
  }

  console.log(`\nDone! ${allGlbs.length} GLBs in flat pool, ${levels.length} level data folders`);
}

main();
