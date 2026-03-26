#!/usr/bin/env node
/**
 * Dedup Analysis (dry-run, read-only)
 *
 * Computes scale-invariant fingerprints across all shared GLBs and reports
 * how many duplicates exist. Does NOT modify any files.
 *
 * Usage:
 *   node tools/analyze-dedup.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NodeIO } = require('@gltf-transform/core');

const sharedDir = path.join(__dirname, '..', 'public', 'models', 'objects', 'shared');

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

      // Get indices (or generate sequential)
      const indexAccessor = prim.getIndices();
      let indices;
      if (indexAccessor) {
        indices = indexAccessor.getArray();
      } else {
        indices = new Uint32Array(positions.length / 3);
        for (let i = 0; i < indices.length; i++) indices[i] = i;
      }

      // Walk triangles, compute edge lengths
      for (let i = 0; i + 2 < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        const p0 = [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]];
        const p1 = [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]];
        const p2 = [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]];
        edgeLengths.push(dist(p0, p1), dist(p1, p2), dist(p2, p0));
      }

      // Material signature
      const material = prim.getMaterial();
      if (material) {
        const tex = material.getBaseColorTexture();
        let texKey = 'none';
        if (tex) {
          const img = tex.getImage();
          if (img) {
            texKey = crypto.createHash('md5').update(Buffer.from(img)).digest('hex').substring(0, 8);
          }
        }
        const color = material.getBaseColorFactor();
        const tintKey = color ? color.slice(0, 3).map(v => Math.round(v * 255)).join(',') : '255,255,255';
        matSignatures.push(`${texKey}:${tintKey}`);
      }
    }
  }

  if (edgeLengths.length === 0) return null;

  // Sort + normalize by max edge (scale-invariant)
  edgeLengths.sort((a, b) => a - b);
  const maxEdge = edgeLengths[edgeLengths.length - 1] || 1;
  const normalized = edgeLengths.map(e => Math.round((e / maxEdge) * 50));
  matSignatures.sort();

  const raw = normalized.join(',') + '|' + matSignatures.join(';');
  return crypto.createHash('md5').update(raw).digest('hex');
}

async function main() {
  const manifestPath = path.join(sharedDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('No shared manifest found. Run consolidate-objects.cjs first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Analyzing ${manifest.length} shared GLBs for duplicates...\n`);

  const io = new NodeIO();
  const fingerprintMap = new Map(); // fingerprint → [filename, ...]
  let processed = 0;
  let failed = 0;

  for (const filename of manifest) {
    const glbPath = path.join(sharedDir, filename);
    try {
      const glbBuffer = fs.readFileSync(glbPath);
      const doc = await io.readBinary(new Uint8Array(glbBuffer));
      const fp = computeGlbFingerprint(doc);

      if (fp) {
        if (!fingerprintMap.has(fp)) fingerprintMap.set(fp, []);
        fingerprintMap.get(fp).push(filename);
      }
      processed++;
    } catch (err) {
      failed++;
    }

    if ((processed + failed) % 100 === 0) {
      process.stdout.write(`  ${processed + failed}/${manifest.length}\r`);
    }
  }

  console.log(`\nProcessed: ${processed}, Failed: ${failed}`);
  console.log(`Total unique fingerprints: ${fingerprintMap.size}`);
  console.log(`Total files: ${manifest.length}`);
  console.log(`Potential savings: ${manifest.length - fingerprintMap.size} files (${((1 - fingerprintMap.size / manifest.length) * 100).toFixed(1)}% reduction)\n`);

  // Find duplicate groups (>1 file sharing same fingerprint)
  const dupeGroups = [];
  for (const [fp, files] of fingerprintMap) {
    if (files.length > 1) {
      dupeGroups.push({ fingerprint: fp, files, count: files.length });
    }
  }
  dupeGroups.sort((a, b) => b.count - a.count);

  console.log(`Duplicate groups: ${dupeGroups.length}\n`);

  // Show top groups
  const showCount = Math.min(30, dupeGroups.length);
  console.log(`Top ${showCount} duplicate groups:`);
  console.log('─'.repeat(80));
  for (let i = 0; i < showCount; i++) {
    const g = dupeGroups[i];
    // Extract level prefixes to show cross-level sharing
    const levels = [...new Set(g.files.map(f => f.split('_')[0]))];
    const baseName = g.files[0].replace(/^[a-z0-9]+_/, '');
    console.log(`\n  ${g.count}x "${baseName}" across ${levels.length} level(s): ${levels.join(', ')}`);
    if (g.count <= 6) {
      for (const f of g.files) console.log(`      ${f}`);
    } else {
      for (const f of g.files.slice(0, 3)) console.log(`      ${f}`);
      console.log(`      ... and ${g.count - 3} more`);
    }
  }

  // Summary by level
  console.log('\n\n─'.repeat(40));
  console.log('Per-level breakdown:');
  console.log('─'.repeat(80));
  const levelStats = {};
  for (const [fp, files] of fingerprintMap) {
    for (const f of files) {
      const level = f.split('_')[0];
      if (!levelStats[level]) levelStats[level] = { total: 0, unique: 0, dupes: 0 };
      levelStats[level].total++;
    }
    if (files.length > 1) {
      // Only first is "unique", rest are dupes
      const firstLevel = files[0].split('_')[0];
      levelStats[firstLevel].unique++;
      for (let i = 1; i < files.length; i++) {
        const level = files[i].split('_')[0];
        levelStats[level].dupes++;
      }
    } else {
      const level = files[0].split('_')[0];
      levelStats[level].unique++;
    }
  }

  for (const [level, stats] of Object.entries(levelStats).sort((a, b) => b[1].dupes - a[1].dupes)) {
    console.log(`  ${level.padEnd(12)} ${String(stats.total).padStart(3)} total, ${String(stats.unique).padStart(3)} unique, ${String(stats.dupes).padStart(3)} duplicates`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
