#!/usr/bin/env node
/**
 * Dedup Shared Object Pool + Migrate to Object-Oriented Placements
 *
 * Reads the shared pool (level-prefixed GLBs from consolidate-objects.cjs),
 * deduplicates by geometry fingerprint, assigns clean level-agnostic names,
 * detects primary/secondary mesh pairs, and generates new object-oriented
 * placement files.
 *
 * Usage:
 *   node tools/dedup-objects.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NodeIO } = require('@gltf-transform/core');

const objectsDir = path.join(__dirname, '..', 'public', 'models', 'objects');
const sharedDir = path.join(objectsDir, 'shared');
const placementsDir = path.join(sharedDir, 'placements');

const MISSION_ORDER = [
  'dam', 'facility', 'runway', 'surface1', 'bunker1', 'silo', 'frigate',
  'surface2', 'bunker2', 'statue', 'archives', 'streets', 'depot', 'train',
  'jungle', 'control', 'caverns', 'cradle', 'aztec', 'egyptian', 'complex',
];

function round4(n) { return Math.round(n * 10000) / 10000; }
function round2(n) { return Math.round(n * 100) / 100; }

// ─── Fingerprinting (from analyze-dedup.cjs) ─────────────────────────────────

function dist(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeGlbFingerprint(doc) {
  const edgeLengths = [];
  const matSignatures = [];

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      if (!posAccessor) continue;
      const positions = posAccessor.getArray();
      if (!positions) continue;

      const indexAccessor = prim.getIndices();
      let indices;
      if (indexAccessor) {
        indices = indexAccessor.getArray();
      } else {
        indices = new Uint32Array(positions.length / 3);
        for (let i = 0; i < indices.length; i++) indices[i] = i;
      }

      for (let i = 0; i + 2 < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
        const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
        const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];
        edgeLengths.push(dist(p0, p1), dist(p1, p2), dist(p2, p0));
      }

      const material = prim.getMaterial();
      if (material) {
        const tex = material.getBaseColorTexture();
        let texKey = 'none';
        if (tex) {
          const img = tex.getImage();
          if (img) texKey = crypto.createHash('md5').update(Buffer.from(img)).digest('hex').substring(0, 8);
        }
        const color = material.getBaseColorFactor();
        const tintKey = color ? color.slice(0, 3).map(v => Math.round(v * 255)).join(',') : '255,255,255';
        matSignatures.push(`${texKey}:${tintKey}`);
      }
    }
  }

  if (edgeLengths.length === 0) return null;

  edgeLengths.sort((a, b) => a - b);
  const maxEdge = edgeLengths[edgeLengths.length - 1] || 1;
  const normalized = edgeLengths.map(e => Math.round((e / maxEdge) * 50));
  matSignatures.sort();

  const raw = normalized.join(',') + '|' + matSignatures.join(';');
  return crypto.createHash('md5').update(raw).digest('hex');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip level prefix: "dam_guard.glb" → "guard.glb" */
function stripLevelPrefix(sharedName) {
  const idx = sharedName.indexOf('_');
  return idx >= 0 ? sharedName.substring(idx + 1) : sharedName;
}

/** Extract level from shared name: "dam_guard.glb" → "dam" */
function extractLevel(sharedName) {
  const idx = sharedName.indexOf('_');
  return idx >= 0 ? sharedName.substring(0, idx) : '';
}

/** Derive type name from GLB filename: strip .glb, _primary, _secondary */
function deriveTypeName(glbName) {
  return glbName
    .replace(/\.glb$/i, '')
    .replace(/_(primary|secondary)(_\d+)?$/, '')
    .replace(/_(primary|secondary)$/, '');
}

/** Normalize a 4-element or 9-element placement to 9-element */
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
  const manifestPath = path.join(sharedDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('No shared manifest found. Run consolidate-objects.cjs first.');
    process.exit(1);
  }

  // Load bboxSizes for scale baking
  const bboxSizesPath = path.join(sharedDir, 'bboxSizes.json');
  const bboxSizes = fs.existsSync(bboxSizesPath)
    ? JSON.parse(fs.readFileSync(bboxSizesPath, 'utf-8'))
    : {};

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Reading ${manifest.length} shared GLBs...\n`);

  // ── Phase A: Fingerprint all GLBs ──────────────────────────────────────
  const io = new NodeIO();
  const fileToFingerprint = new Map(); // sharedName → fingerprint
  const fingerprintToFiles = new Map(); // fingerprint → [sharedName, ...]
  let processed = 0;

  for (const filename of manifest) {
    try {
      const glbBuffer = fs.readFileSync(path.join(sharedDir, filename));
      const doc = await io.readBinary(new Uint8Array(glbBuffer));
      const fp = computeGlbFingerprint(doc);
      if (fp) {
        fileToFingerprint.set(filename, fp);
        if (!fingerprintToFiles.has(fp)) fingerprintToFiles.set(fp, []);
        fingerprintToFiles.get(fp).push(filename);
      }
      processed++;
    } catch (err) {
      console.warn(`  Failed: ${filename}: ${err.message}`);
    }
    if (processed % 100 === 0) process.stdout.write(`  ${processed}/${manifest.length}\r`);
  }

  console.log(`Fingerprinted: ${processed} files → ${fingerprintToFiles.size} unique\n`);

  // ── Phase B: Assign clean canonical names ──────────────────────────────
  // Process in mission order so first-seen level gets naming priority
  const claimedNames = new Set();
  const fingerprintToCanonical = new Map(); // fingerprint → canonical filename
  const sharedToCanonical = new Map(); // old shared name → canonical filename

  // Sort files within each fingerprint group by mission order
  for (const [fp, files] of fingerprintToFiles) {
    files.sort((a, b) => {
      const la = MISSION_ORDER.indexOf(extractLevel(a));
      const lb = MISSION_ORDER.indexOf(extractLevel(b));
      return (la === -1 ? 999 : la) - (lb === -1 ? 999 : lb);
    });
  }

  for (const [fp, files] of fingerprintToFiles) {
    // Use the human name from the first file (highest priority level)
    let baseName = stripLevelPrefix(files[0]);

    // Resolve collision: same name claimed by a different fingerprint
    if (claimedNames.has(baseName)) {
      const nameWithoutExt = baseName.replace(/\.glb$/i, '');
      let version = 2;
      while (claimedNames.has(`${nameWithoutExt}_v${version}.glb`)) version++;
      baseName = `${nameWithoutExt}_v${version}.glb`;
    }

    claimedNames.add(baseName);
    fingerprintToCanonical.set(fp, baseName);

    for (const sharedName of files) {
      sharedToCanonical.set(sharedName, baseName);
    }
  }

  console.log(`Canonical names assigned: ${fingerprintToCanonical.size}`);

  // ── Phase C: Detect primary/secondary pairs ────────────────────────────
  // For each level, find OBJ index pairs from renames.json
  // Then map through to canonical names to build pair registry
  const pairRegistry = new Map(); // canonicalPrimary → canonicalSecondary

  const availableLevels = MISSION_ORDER.filter(level =>
    fs.existsSync(path.join(objectsDir, level, 'renames.json'))
  );

  for (const level of availableLevels) {
    const renames = JSON.parse(fs.readFileSync(path.join(objectsDir, level, 'renames.json'), 'utf-8'));

    // Group by OBJ index
    const byIndex = {};
    for (const [humanName, origName] of Object.entries(renames)) {
      const m = origName.match(/^(primary|secondary)_(\d+)\.glb$/);
      if (m) {
        const [, type, idx] = m;
        if (!byIndex[idx]) byIndex[idx] = {};
        byIndex[idx][type] = humanName;
      }
    }

    // For each pair, map through shared pool → canonical
    for (const [idx, types] of Object.entries(byIndex)) {
      if (!types.primary || !types.secondary) continue;

      const sharedPrimary = `${level}_${types.primary}`;
      const sharedSecondary = `${level}_${types.secondary}`;

      const canonPrimary = sharedToCanonical.get(sharedPrimary);
      const canonSecondary = sharedToCanonical.get(sharedSecondary);

      if (canonPrimary && canonSecondary && canonPrimary !== canonSecondary) {
        // Register pair (first registration wins if conflicts)
        if (!pairRegistry.has(canonPrimary)) {
          pairRegistry.set(canonPrimary, canonSecondary);
        }
      }
    }
  }

  console.log(`Primary/secondary pairs detected: ${pairRegistry.size}`);

  // ── Phase D: Generate types.json ───────────────────────────────────────
  const types = {}; // typeName → { meshes: [filename, ...] }
  const canonicalToType = new Map(); // canonical filename → typeName

  // Build types from pairs first
  const pairedSecondaries = new Set(pairRegistry.values());

  for (const [canonPrimary, canonSecondary] of pairRegistry) {
    const typeName = deriveTypeName(canonPrimary);
    types[typeName] = { meshes: [canonPrimary, canonSecondary] };
    canonicalToType.set(canonPrimary, typeName);
    canonicalToType.set(canonSecondary, typeName);
  }

  // Add standalone objects (not part of any pair)
  for (const [fp, canonName] of fingerprintToCanonical) {
    if (!canonicalToType.has(canonName)) {
      const typeName = deriveTypeName(canonName);
      // Handle type name collision with existing types
      let finalType = typeName;
      if (types[finalType] && !types[finalType].meshes.includes(canonName)) {
        let v = 2;
        while (types[`${typeName}_v${v}`]) v++;
        finalType = `${typeName}_v${v}`;
      }
      types[finalType] = { meshes: [canonName] };
      canonicalToType.set(canonName, finalType);
    }
  }

  console.log(`Types defined: ${Object.keys(types).length}`);

  // ── Phase E: Generate new placements per level ─────────────────────────
  let totalObjects = 0;

  for (const level of availableLevels) {
    const oldPlacementsPath = path.join(placementsDir, `${level}.json`);
    if (!fs.existsSync(oldPlacementsPath)) continue;

    const oldPlacements = JSON.parse(fs.readFileSync(oldPlacementsPath, 'utf-8'));

    // Collect all placement instances mapped to their canonical name
    // canonicalName → [{position, rotation, scale}, ...]
    const canonicalPlacements = new Map();

    for (const [sharedName, positions] of Object.entries(oldPlacements)) {
      const canonName = sharedToCanonical.get(sharedName);
      if (!canonName) continue;
      if (!canonicalPlacements.has(canonName)) canonicalPlacements.set(canonName, []);

      // Look up bboxSize for this source file to bake into scale
      const bbox = bboxSizes[sharedName] || 1;

      for (const pos of positions) {
        const p = normalizePlacement(pos);
        canonicalPlacements.get(canonName).push({
          position: [p[0], p[1], p[2]],
          rotation: [p[3], p[4], p[5]],
          scale: [round4(p[6] * bbox), round4(p[7] * bbox), round4(p[8] * bbox)],
        });
      }
    }

    // Build object entries, merging primary+secondary pairs by position proximity
    const objects = [];
    const typeCounters = {}; // typeName → next counter

    function nextId(typeName) {
      if (!typeCounters[typeName]) typeCounters[typeName] = 1;
      const n = typeCounters[typeName]++;
      return `${typeName}_${String(n).padStart(2, '0')}`;
    }

    const processedCanonicals = new Set();

    // First handle paired types
    for (const [canonPrimary, canonSecondary] of pairRegistry) {
      const primaryPlacements = canonicalPlacements.get(canonPrimary) || [];
      const secondaryPlacements = canonicalPlacements.get(canonSecondary) || [];
      const typeName = canonicalToType.get(canonPrimary);
      const meshes = types[typeName].meshes;

      if (primaryPlacements.length === 0 && secondaryPlacements.length === 0) continue;

      // Match primary to secondary by position proximity
      const usedSecondaries = new Set();
      const EPSILON = 5.0; // world-space distance threshold for matching

      for (const prim of primaryPlacements) {
        let bestSecIdx = -1;
        let bestDist = Infinity;
        for (let si = 0; si < secondaryPlacements.length; si++) {
          if (usedSecondaries.has(si)) continue;
          const sec = secondaryPlacements[si];
          const d = Math.sqrt(
            (prim.position[0] - sec.position[0]) ** 2 +
            (prim.position[1] - sec.position[1]) ** 2 +
            (prim.position[2] - sec.position[2]) ** 2
          );
          if (d < bestDist) { bestDist = d; bestSecIdx = si; }
        }

        if (bestSecIdx >= 0 && bestDist < EPSILON) {
          usedSecondaries.add(bestSecIdx);
        }

        // Use primary's transform for the merged object
        objects.push({
          id: nextId(typeName),
          type: typeName,
          meshes: [...meshes],
          position: prim.position,
          rotation: prim.rotation,
          scale: prim.scale,
          properties: {},
        });
      }

      // Any unmatched secondaries become standalone
      for (let si = 0; si < secondaryPlacements.length; si++) {
        if (usedSecondaries.has(si)) continue;
        const sec = secondaryPlacements[si];
        objects.push({
          id: nextId(typeName),
          type: typeName,
          meshes: [canonSecondary],
          position: sec.position,
          rotation: sec.rotation,
          scale: sec.scale,
          properties: {},
        });
      }

      processedCanonicals.add(canonPrimary);
      processedCanonicals.add(canonSecondary);
    }

    // Then handle standalone objects
    for (const [canonName, placements] of canonicalPlacements) {
      if (processedCanonicals.has(canonName)) continue;
      const typeName = canonicalToType.get(canonName);
      if (!typeName) continue;
      const meshes = types[typeName].meshes;

      for (const p of placements) {
        objects.push({
          id: nextId(typeName),
          type: typeName,
          meshes: [...meshes],
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
          properties: {},
        });
      }
    }

    totalObjects += objects.length;

    // Write new format placement file
    fs.writeFileSync(
      oldPlacementsPath,
      JSON.stringify({ objects }, null, 2)
    );
  }

  console.log(`Total placement objects across all levels: ${totalObjects}`);

  // ── Phase F: Write deduped GLBs ────────────────────────────────────────
  // Copy canonical files with new names, remove old level-prefixed files
  const newManifest = [];

  for (const [fp, canonName] of fingerprintToCanonical) {
    const sourceFile = fingerprintToFiles.get(fp)[0]; // first file in group
    const srcPath = path.join(sharedDir, sourceFile);
    const dstPath = path.join(sharedDir, canonName);

    if (srcPath !== dstPath) {
      fs.copyFileSync(srcPath, dstPath);
    }
    newManifest.push(canonName);
  }

  // Remove old level-prefixed files that aren't also canonical names
  const canonicalSet = new Set(fingerprintToCanonical.values());
  for (const filename of manifest) {
    if (!canonicalSet.has(filename)) {
      const filePath = path.join(sharedDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  // Write new manifest and types
  newManifest.sort();
  fs.writeFileSync(path.join(sharedDir, 'manifest.json'), JSON.stringify(newManifest, null, 2));
  fs.writeFileSync(path.join(sharedDir, 'types.json'), JSON.stringify(types, null, 2));

  console.log(`\nDone!`);
  console.log(`  ${manifest.length} input → ${newManifest.length} deduped GLBs (${manifest.length - newManifest.length} removed)`);
  console.log(`  ${Object.keys(types).length} object types (${pairRegistry.size} with primary+secondary pairs)`);
  console.log(`  ${totalObjects} total placement instances`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
