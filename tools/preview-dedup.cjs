#!/usr/bin/env node
/**
 * GoldenEye Level Objects Dedup Preview
 *
 * Groups objects by fingerprint into subfolders so you can visually verify
 * which objects would be merged at a given bin level. Each subfolder contains
 * all objects that share a fingerprint, with a manifest.json for the object viewer.
 *
 * Usage:
 *   node tools/preview-dedup.cjs --bins <N> <input-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const { Document, NodeIO } = require('@gltf-transform/core');

// ─── Model Scales (from src/levels/LevelRegistry.ts) ─────────────────────────

const MODEL_SCALES = {
  dam: 0.04841, facility: 0.009375, runway: 0.126281, surface1: 0.024887,
  bunker1: 0.020973, silo: 0.023934, frigate: 0.025270, surface2: 0.024887,
  bunker2: 0.020973, statue: 0.105513, archives: 0.022318, streets: 0.033083,
  depot: 0.051767, train: 0.075306, jungle: 0.119440, control: 0.022672,
  caverns: 0.042157, cradle: 0.047989, aztec: 0.032036, egyptian: 0.044166,
  complex: 0.011996,
};

// ─── OBJ + MTL Parser (same as split-level-objects.cjs) ──────────────────────

function parseObjectsObj(objDir) {
  const objPath = path.join(objDir, 'objects.obj');
  const text = fs.readFileSync(objPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  const positions = [];
  const texcoords = [];
  let mtlFile = null;
  const materials = {};
  let currentMaterial = null;
  const objects = [];
  let currentObjectIdx = -1;
  let currentType = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('mtllib ')) {
      mtlFile = line.slice(7).trim();
    } else if (line === 'g primary') {
      currentObjectIdx++; currentType = 'primary';
      objects[currentObjectIdx] = { primary: new Map(), secondary: new Map() };
    } else if (line === 'g secondary') {
      currentType = 'secondary';
      if (!objects[currentObjectIdx]) objects[currentObjectIdx] = { primary: new Map(), secondary: new Map() };
    } else if (line.startsWith('g ')) {
      currentObjectIdx++; currentType = 'primary';
      objects[currentObjectIdx] = { primary: new Map(), secondary: new Map() };
    } else if (line.startsWith('usemtl ')) {
      currentMaterial = line.slice(7).trim();
    } else if (line.startsWith('v ') && !line.startsWith('vt') && !line.startsWith('vn')) {
      const parts = line.split(/\s+/);
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith('vt ')) {
      const parts = line.split(/\s+/);
      texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (line.startsWith('f ')) {
      if (currentObjectIdx < 0 || !currentType) continue;
      const parts = line.split(/\s+/).slice(1);
      const verts = parts.map(p => {
        const indices = p.split('/').map(s => s === '' ? 0 : parseInt(s, 10));
        return { pos: indices[0] - 1, uv: (indices[1] || 0) - 1 };
      });
      const matMap = objects[currentObjectIdx][currentType];
      if (!matMap.has(currentMaterial)) matMap.set(currentMaterial, []);
      matMap.get(currentMaterial).push({ verts });
    }
  }

  if (mtlFile) {
    const mtlPath = path.join(objDir, mtlFile);
    if (fs.existsSync(mtlPath)) {
      const mtlText = fs.readFileSync(mtlPath, 'utf-8');
      const mtlLines = mtlText.split(/\r?\n/);
      let curMat = null;
      for (const ml of mtlLines) {
        const mline = ml.trim();
        if (mline.startsWith('newmtl ')) {
          curMat = mline.slice(7).trim();
          materials[curMat] = { texturePath: null, tintColor: [1,1,1], doubleSided: false, clampS: false, clampT: false, isEnvMapped: false, opacity: 1.0 };
          if (curMat.includes('CullBoth')) materials[curMat].doubleSided = true;
          if (curMat.includes('ClampS')) materials[curMat].clampS = true;
          if (curMat.includes('ClampT')) materials[curMat].clampT = true;
          if (curMat.includes('EnvMapping')) materials[curMat].isEnvMapped = true;
        } else if (mline.startsWith('Kd ') && curMat) {
          const parts = mline.split(/\s+/);
          materials[curMat].tintColor = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
        } else if (mline.startsWith('d ') && curMat) {
          materials[curMat].opacity = parseFloat(mline.split(/\s+/)[1]);
        } else if (mline.startsWith('map_Kd ') && curMat) {
          materials[curMat].texturePath = path.join(objDir, mline.slice(7).trim());
        }
      }
    }
  }

  return { positions, texcoords, materials, objects };
}

// ─── BMP → PNG ───────────────────────────────────────────────────────────────

async function bmpToPng(bmpPath) {
  const buf = fs.readFileSync(bmpPath);
  const dataOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const height = Math.abs(buf.readInt32LE(22));
  const topDown = buf.readInt32LE(22) < 0;
  const bpp = buf.readUInt16LE(28);
  const channels = bpp === 32 ? 4 : 3;
  const bytesPerPixel = bpp / 8;
  const rowBytes = Math.ceil((width * bytesPerPixel) / 4) * 4;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = topDown ? y : (height - 1 - y);
    const srcOffset = dataOffset + srcRow * rowBytes;
    for (let x = 0; x < width; x++) {
      const si = srcOffset + x * bytesPerPixel;
      const di = (y * width + x) * 4;
      rgba[di] = buf[si + 2]; rgba[di+1] = buf[si + 1]; rgba[di+2] = buf[si]; rgba[di+3] = channels === 4 ? buf[si + 3] : 255;
    }
  }
  let hasAlpha = false;
  if (channels === 4) { for (let i = 3; i < rgba.length; i += 4) { if (rgba[i] < 255) { hasAlpha = true; break; } } }
  if (hasAlpha) { for (let i = 3; i < rgba.length; i += 4) { rgba[i] = rgba[i] > 0 ? 255 : 0; } }
  const png = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { png, width, height, hasAlpha };
}

const FALLBACK_DIR = path.join(__dirname, 'fallback-textures');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeFlatNormal(p0, p1, p2) {
  const e1 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
  const e2 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
  const nx = e1[1]*e2[2]-e1[2]*e2[1], ny = e1[2]*e2[0]-e1[0]*e2[2], nz = e1[0]*e2[1]-e1[1]*e2[0];
  const len = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
  return [nx/len, ny/len, nz/len];
}

class PngCache {
  constructor() { this.cache = new Map(); }
  async get(texPath) {
    if (this.cache.has(texPath)) return this.cache.get(texPath);
    if (!fs.existsSync(texPath)) {
      const baseName = path.basename(texPath, path.extname(texPath));
      const fallbackPath = path.join(FALLBACK_DIR, baseName + '.png');
      if (fs.existsSync(fallbackPath)) {
        const pngBuf = fs.readFileSync(fallbackPath);
        const meta = await sharp(pngBuf).metadata();
        const result = { png: pngBuf, hasAlpha: meta.channels === 4 };
        this.cache.set(texPath, result); return result;
      }
      this.cache.set(texPath, null); return null;
    }
    const result = await bmpToPng(texPath);
    this.cache.set(texPath, result); return result;
  }
}

// ─── GLB Builder (same as split-level-objects.cjs) ───────────────────────────

async function buildSingleObjectGlb(parsed, matMap, isSecondary, modelScale, pngCache, outputPath) {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('Object');
  scene.addChild(rootNode);

  const textureCache = new Map();
  const materialCache = new Map();

  async function getTexture(texPath) {
    if (textureCache.has(texPath)) return textureCache.get(texPath);
    const pngData = await pngCache.get(texPath);
    if (!pngData) { textureCache.set(texPath, { texture: null, hasAlpha: false }); return { texture: null, hasAlpha: false }; }
    const texture = doc.createTexture(path.basename(texPath, path.extname(texPath))).setImage(pngData.png).setMimeType('image/png');
    const result = { texture, hasAlpha: pngData.hasAlpha };
    textureCache.set(texPath, result); return result;
  }

  const allPositions = [];
  for (const [, faces] of matMap) { for (const face of faces) { for (const v of face.verts) { if (v.pos >= 0 && v.pos < parsed.positions.length) allPositions.push(parsed.positions[v.pos]); } } }
  if (allPositions.length === 0) return false;

  let cx = 0, cy = 0, cz = 0;
  for (const p of allPositions) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= allPositions.length; cy /= allPositions.length; cz /= allPositions.length;

  const mesh = doc.createMesh('mesh');
  let totalVerts = 0;

  for (const [matName, faces] of matMap) {
    if (faces.length === 0) continue;
    const matDef = parsed.materials[matName] || {};
    const posArr = [], uvArr = [], normArr = [], indexArr = [];
    let vertIdx = 0;

    for (const face of faces) {
      for (let i = 1; i < face.verts.length - 1; i++) {
        const tri = [face.verts[0], face.verts[i], face.verts[i+1]];
        const triPos = tri.map(v => v.pos >= 0 && v.pos < parsed.positions.length ? parsed.positions[v.pos] : [0,0,0]);
        const normal = computeFlatNormal(triPos[0], triPos[1], triPos[2]);
        for (let j = 0; j < 3; j++) {
          const v = tri[j];
          if (v.pos >= 0 && v.pos < parsed.positions.length) {
            const p = parsed.positions[v.pos];
            posArr.push((p[0]-cx)*modelScale, (p[1]-cy)*modelScale, (p[2]-cz)*modelScale);
          } else { posArr.push(0,0,0); }
          if (matDef.isEnvMapped) { uvArr.push(normal[0]*0.5+0.5, normal[1]*0.5+0.5); }
          else if (v.uv >= 0 && v.uv < parsed.texcoords.length) { uvArr.push(parsed.texcoords[v.uv][0], 1.0-parsed.texcoords[v.uv][1]); }
          else { uvArr.push(0,0); }
          normArr.push(...normal);
          indexArr.push(vertIdx++);
        }
      }
    }
    if (posArr.length === 0) continue;
    totalVerts += vertIdx;

    const posA = doc.createAccessor(`pos_${matName}`).setType('VEC3').setArray(new Float32Array(posArr)).setBuffer(buffer);
    const uvA = doc.createAccessor(`uv_${matName}`).setType('VEC2').setArray(new Float32Array(uvArr)).setBuffer(buffer);
    const normA = doc.createAccessor(`norm_${matName}`).setType('VEC3').setArray(new Float32Array(normArr)).setBuffer(buffer);
    const idxA = doc.createAccessor(`idx_${matName}`).setType('SCALAR').setArray(vertIdx <= 65535 ? new Uint16Array(indexArr) : new Uint32Array(indexArr)).setBuffer(buffer);

    const prim = doc.createPrimitive().setAttribute('POSITION', posA).setAttribute('TEXCOORD_0', uvA).setAttribute('NORMAL', normA).setIndices(idxA);

    const cacheKey = `${matName}__${isSecondary ? 'sec' : 'pri'}`;
    let material;
    if (materialCache.has(cacheKey)) { material = materialCache.get(cacheKey); }
    else {
      material = doc.createMaterial(cacheKey);
      material.setRoughnessFactor(1.0); material.setMetallicFactor(0.0);
      const tint = matDef.tintColor || [1,1,1];
      material.setBaseColorFactor([tint[0], tint[1], tint[2], matDef.opacity ?? 1.0]);
      if (matDef.texturePath) {
        const { texture, hasAlpha } = await getTexture(matDef.texturePath);
        if (texture) {
          material.setBaseColorTexture(texture);
          const texInfo = material.getBaseColorTextureInfo();
          if (texInfo) { if (matDef.clampS) texInfo.setWrapS(33071); if (matDef.clampT) texInfo.setWrapT(33071); }
          if (matDef.isEnvMapped) { material.setEmissiveTexture(texture); material.setEmissiveFactor([0.6,0.6,0.6]); const eti = material.getEmissiveTextureInfo(); if (eti) { if (matDef.clampS) eti.setWrapS(33071); if (matDef.clampT) eti.setWrapT(33071); } }
          if (isSecondary && hasAlpha) { if ((matDef.opacity ?? 1.0) < 1.0) material.setAlphaMode('BLEND'); else { material.setAlphaMode('MASK'); material.setAlphaCutoff(0.5); } }
        }
      }
      material.setDoubleSided(true);
      materialCache.set(cacheKey, material);
    }
    prim.setMaterial(material);
    mesh.addPrimitive(prim);
  }

  if (totalVerts === 0) return false;
  rootNode.setMesh(mesh);
  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outputPath, Buffer.from(glb));
  return true;
}

// ─── Fingerprinting (parameterized bins) ─────────────────────────────────────

function computeFingerprint(parsed, matMap, bins) {
  const edgeLengths = [];
  for (const [, faces] of matMap) {
    for (const face of faces) {
      for (let i = 1; i < face.verts.length - 1; i++) {
        const triVerts = [face.verts[0], face.verts[i], face.verts[i+1]];
        const triPos = triVerts.map(v => v.pos >= 0 && v.pos < parsed.positions.length ? parsed.positions[v.pos] : [0,0,0]);
        for (let a = 0; a < 3; a++) {
          const b = (a+1) % 3;
          const dx = triPos[b][0]-triPos[a][0], dy = triPos[b][1]-triPos[a][1], dz = triPos[b][2]-triPos[a][2];
          edgeLengths.push(Math.sqrt(dx*dx+dy*dy+dz*dz));
        }
      }
    }
  }
  edgeLengths.sort((a,b) => a-b);
  const maxEdge = edgeLengths[edgeLengths.length-1] || 1;
  const normalized = edgeLengths.map(e => Math.round((e/maxEdge) * bins));

  const matSignatures = [];
  for (const [matName] of matMap) {
    const matDef = parsed.materials[matName] || {};
    const texBase = matDef.texturePath ? path.basename(matDef.texturePath) : 'none';
    const tint = matDef.tintColor || [1,1,1];
    matSignatures.push(`${texBase}:${tint.map(v => Math.round(v*255)).join(',')}`);
  }
  matSignatures.sort();

  return crypto.createHash('md5').update(normalized.join(',') + '|' + matSignatures.join(';')).digest('hex');
}

// ─── Clean Directory (recursive) ─────────────────────────────────────────────

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanDir(fullPath);
      fs.rmdirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function objectsSlug(dirName) {
  return dirName.replace(/\s*objects?\s*/i, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function previewDedup(inputDir, outputDir, bins) {
  const dirName = path.basename(inputDir);
  const slug = objectsSlug(dirName);
  const modelScale = MODEL_SCALES[slug] || 1.0;

  console.log(`Preview dedup: ${dirName} (bins: ${bins}, scale: ${modelScale})`);

  const parsed = parseObjectsObj(inputDir);
  const pngCache = new PngCache();

  // Clean output
  cleanDir(outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  // Group objects by fingerprint (primary only for now)
  const groups = new Map(); // fingerprint → [objIndex, ...]
  const pad = String(parsed.objects.length).length;

  for (let i = 0; i < parsed.objects.length; i++) {
    const obj = parsed.objects[i];
    if (obj.primary.size === 0) continue;
    const fp = computeFingerprint(parsed, obj.primary, bins);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(i);
  }

  // Sort groups by size (largest first) for easier review
  const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length);
  const groupPad = String(sortedGroups.length).length;
  const groupFolders = [];

  for (let g = 0; g < sortedGroups.length; g++) {
    const members = sortedGroups[g];
    const groupName = `group_${String(g).padStart(groupPad, '0')}`;
    const groupDir = path.join(outputDir, groupName);
    fs.mkdirSync(groupDir, { recursive: true });

    const manifest = [];

    for (const objIdx of members) {
      const idx = String(objIdx).padStart(pad, '0');
      const filename = `primary_${idx}.glb`;
      const outPath = path.join(groupDir, filename);
      const wrote = await buildSingleObjectGlb(parsed, parsed.objects[objIdx].primary, false, modelScale, pngCache, outPath);
      if (wrote) manifest.push(filename);
    }

    fs.writeFileSync(path.join(groupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    groupFolders.push(groupName);
  }

  // Write top-level manifest listing group folders
  fs.writeFileSync(path.join(outputDir, 'groups.json'), JSON.stringify(groupFolders, null, 2));

  // Stats
  const multiGroups = sortedGroups.filter(g => g.length > 1).length;
  const singleGroups = sortedGroups.filter(g => g.length === 1).length;
  console.log(`  ${parsed.objects.length} objects → ${sortedGroups.length} groups (${multiGroups} with duplicates, ${singleGroups} unique)`);
  console.log(`  Largest groups: ${sortedGroups.slice(0, 5).map(g => g.length).join(', ')} members`);
}

async function previewDedupBatch(levelsDir, outputDir, bins) {
  const dirs = fs.readdirSync(levelsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const objPath = path.join(levelsDir, d.name, 'objects.obj');
      return fs.existsSync(objPath);
    })
    .map(d => d.name)
    .sort();

  console.log(`Found ${dirs.length} level object folders (bins: ${bins})\n`);

  for (const dir of dirs) {
    const slug = objectsSlug(dir);
    const inputDir = path.join(levelsDir, dir);
    const outDir = path.join(outputDir, slug);
    await previewDedup(inputDir, outDir, bins);
  }

  console.log(`\nAll done! Previewed dedup for ${dirs.length} levels.`);
}

async function main() {
  const args = process.argv.slice(2);
  const binsIdx = args.indexOf('--bins');
  if (binsIdx === -1 || binsIdx + 1 >= args.length) {
    console.log('Usage:');
    console.log('  node tools/preview-dedup.cjs --bins <N> <input-dir> <output-dir>');
    console.log('  node tools/preview-dedup.cjs --bins <N> --batch <level-objects-dir> <output-dir>');
    process.exit(1);
  }
  const bins = parseInt(args[binsIdx + 1], 10);
  const filteredArgs = args.filter((_, i) => i !== binsIdx && i !== binsIdx + 1);

  if (filteredArgs[0] === '--batch' && filteredArgs.length === 3) {
    await previewDedupBatch(filteredArgs[1], filteredArgs[2], bins);
  } else if (filteredArgs.length === 2) {
    await previewDedup(filteredArgs[0], filteredArgs[1], bins);
  } else {
    console.log('Usage:');
    console.log('  node tools/preview-dedup.cjs --bins <N> <input-dir> <output-dir>');
    console.log('  node tools/preview-dedup.cjs --bins <N> --batch <level-objects-dir> <output-dir>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
