#!/usr/bin/env node
/**
 * GoldenEye Level Objects Splitter
 *
 * Reads the source OBJ/MTL from GE Setup Editor and splits into individual
 * per-object GLB files. Each `g primary` / `g secondary` occurrence in the OBJ
 * is a separate object. Objects are centered at origin and scaled by the level's
 * modelScale so they're in normalized world units.
 *
 * Output files: primary_NNN.glb, secondary_NNN.glb
 *
 * Usage:
 *   node tools/split-level-objects.cjs <input-dir> <output-dir>
 *   node tools/split-level-objects.cjs --batch <level-objects-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Document, NodeIO } = require('@gltf-transform/core');

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

// ─── OBJ + MTL Parser ────────────────────────────────────────────────────────

function parseObjectsObj(objDir) {
  const objPath = path.join(objDir, 'objects.obj');
  const text = fs.readFileSync(objPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  const positions = [];   // vec3[]
  const texcoords = [];   // vec2[]

  // Materials
  let mtlFile = null;
  const materials = {};
  let currentMaterial = null;

  // Per-object tracking: each `g primary` starts a new object index
  // objects[i] = { primary: Map<matName, face[]>, secondary: Map<matName, face[]> }
  const objects = [];
  let currentObjectIdx = -1;
  let currentType = null; // 'primary' or 'secondary'

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('mtllib ')) {
      mtlFile = line.slice(7).trim();
    } else if (line === 'g primary') {
      currentObjectIdx++;
      currentType = 'primary';
      objects[currentObjectIdx] = {
        primary: new Map(),
        secondary: new Map(),
      };
    } else if (line === 'g secondary') {
      currentType = 'secondary';
      // Ensure object exists (secondary without prior primary — shouldn't happen, but be safe)
      if (!objects[currentObjectIdx]) {
        objects[currentObjectIdx] = {
          primary: new Map(),
          secondary: new Map(),
        };
      }
    } else if (line.startsWith('g ')) {
      // Other group names — treat as primary
      currentObjectIdx++;
      currentType = 'primary';
      objects[currentObjectIdx] = {
        primary: new Map(),
        secondary: new Map(),
      };
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
        return {
          pos: indices[0] - 1,
          uv: (indices[1] || 0) - 1,
        };
      });
      const face = { verts };

      const matMap = objects[currentObjectIdx][currentType];
      if (!matMap.has(currentMaterial)) {
        matMap.set(currentMaterial, []);
      }
      matMap.get(currentMaterial).push(face);
    }
  }

  // Parse MTL file
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
          materials[curMat] = {
            texturePath: null,
            tintColor: [1, 1, 1],
            doubleSided: false,
            clampS: false,
            clampT: false,
            isEnvMapped: false,
            opacity: 1.0,
          };
          if (curMat.includes('CullBoth')) materials[curMat].doubleSided = true;
          if (curMat.includes('ClampS')) materials[curMat].clampS = true;
          if (curMat.includes('ClampT')) materials[curMat].clampT = true;
          if (curMat.includes('EnvMapping')) materials[curMat].isEnvMapped = true;
        } else if (mline.startsWith('Kd ') && curMat) {
          const parts = mline.split(/\s+/);
          materials[curMat].tintColor = [
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3]),
          ];
        } else if (mline.startsWith('d ') && curMat) {
          materials[curMat].opacity = parseFloat(mline.split(/\s+/)[1]);
        } else if (mline.startsWith('map_Kd ') && curMat) {
          const texName = mline.slice(7).trim();
          materials[curMat].texturePath = path.join(objDir, texName);
        }
      }
    }
  }

  return { positions, texcoords, materials, objects };
}

// ─── BMP → PNG Converter ─────────────────────────────────────────────────────

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
      rgba[di + 0] = buf[si + 2]; // R
      rgba[di + 1] = buf[si + 1]; // G
      rgba[di + 2] = buf[si + 0]; // B
      rgba[di + 3] = channels === 4 ? buf[si + 3] : 255; // A
    }
  }

  let hasAlpha = false;
  if (channels === 4) {
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 255) { hasAlpha = true; break; }
    }
  }

  if (hasAlpha) {
    for (let i = 3; i < rgba.length; i += 4) {
      rgba[i] = rgba[i] > 0 ? 255 : 0;
    }
  }

  const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  return { png, width, height, hasAlpha };
}

// ─── Fallback Textures ───────────────────────────────────────────────────────

const FALLBACK_DIR = path.join(__dirname, 'fallback-textures');

// ─── Flat Normal Computation ─────────────────────────────────────────────────

function computeFlatNormal(p0, p1, p2) {
  const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const nx = e1[1] * e2[2] - e1[2] * e2[1];
  const ny = e1[2] * e2[0] - e1[0] * e2[2];
  const nz = e1[0] * e2[1] - e1[1] * e2[0];
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}

// ─── PNG Cache (shared across all GLBs for a level) ──────────────────────────

class PngCache {
  constructor() {
    this.cache = new Map(); // texPath → { png, hasAlpha }
  }

  async get(texPath) {
    if (this.cache.has(texPath)) return this.cache.get(texPath);

    if (!fs.existsSync(texPath)) {
      const baseName = path.basename(texPath, path.extname(texPath));
      const fallbackPath = path.join(FALLBACK_DIR, baseName + '.png');
      if (fs.existsSync(fallbackPath)) {
        const pngBuf = fs.readFileSync(fallbackPath);
        const meta = await sharp(pngBuf).metadata();
        const result = { png: pngBuf, hasAlpha: meta.channels === 4 };
        this.cache.set(texPath, result);
        return result;
      }
      this.cache.set(texPath, null);
      return null;
    }

    const result = await bmpToPng(texPath);
    this.cache.set(texPath, result);
    return result;
  }
}

// ─── Single Object GLB Builder ───────────────────────────────────────────────

async function buildSingleObjectGlb(parsed, matMap, isSecondary, modelScale, pngCache, outputPath) {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('Object');
  scene.addChild(rootNode);

  const textureCache = new Map(); // texPath → gltf texture
  const materialCache = new Map();

  async function getTexture(texPath) {
    if (textureCache.has(texPath)) return textureCache.get(texPath);

    const pngData = await pngCache.get(texPath);
    if (!pngData) {
      textureCache.set(texPath, { texture: null, hasAlpha: false });
      return { texture: null, hasAlpha: false };
    }

    const texture = doc.createTexture(path.basename(texPath, path.extname(texPath)))
      .setImage(pngData.png)
      .setMimeType('image/png');

    const result = { texture, hasAlpha: pngData.hasAlpha };
    textureCache.set(texPath, result);
    return result;
  }

  // First pass: collect all positions to compute centroid
  const allPositions = [];
  for (const [matName, faces] of matMap) {
    for (const face of faces) {
      for (const v of face.verts) {
        if (v.pos >= 0 && v.pos < parsed.positions.length) {
          allPositions.push(parsed.positions[v.pos]);
        }
      }
    }
  }

  if (allPositions.length === 0) return { wrote: false, centroid: null };

  // Compute centroid
  let cx = 0, cy = 0, cz = 0;
  for (const p of allPositions) {
    cx += p[0]; cy += p[1]; cz += p[2];
  }
  cx /= allPositions.length;
  cy /= allPositions.length;
  cz /= allPositions.length;

  const centroid = [cx * modelScale, cy * modelScale, cz * modelScale];

  const mesh = doc.createMesh('mesh');
  let totalVerts = 0;

  for (const [matName, faces] of matMap) {
    if (faces.length === 0) continue;

    const matDef = parsed.materials[matName] || {};

    const posArr = [];
    const uvArr = [];
    const normArr = [];
    const indexArr = [];
    let vertIdx = 0;

    for (const face of faces) {
      for (let i = 1; i < face.verts.length - 1; i++) {
        const tri = [face.verts[0], face.verts[i], face.verts[i + 1]];

        const triPos = tri.map(v =>
          v.pos >= 0 && v.pos < parsed.positions.length
            ? parsed.positions[v.pos]
            : [0, 0, 0]
        );
        const normal = computeFlatNormal(triPos[0], triPos[1], triPos[2]);

        for (let j = 0; j < 3; j++) {
          const v = tri[j];

          // Position: center at origin, then scale by modelScale
          if (v.pos >= 0 && v.pos < parsed.positions.length) {
            const p = parsed.positions[v.pos];
            posArr.push(
              (p[0] - cx) * modelScale,
              (p[1] - cy) * modelScale,
              (p[2] - cz) * modelScale,
            );
          } else {
            posArr.push(0, 0, 0);
          }

          // UV
          if (matDef.isEnvMapped) {
            uvArr.push(normal[0] * 0.5 + 0.5, normal[1] * 0.5 + 0.5);
          } else if (v.uv >= 0 && v.uv < parsed.texcoords.length) {
            uvArr.push(parsed.texcoords[v.uv][0], 1.0 - parsed.texcoords[v.uv][1]);
          } else {
            uvArr.push(0, 0);
          }

          // Normal
          normArr.push(...normal);

          indexArr.push(vertIdx++);
        }
      }
    }

    if (posArr.length === 0) continue;
    totalVerts += vertIdx;

    // Accessors
    const posAccessor = doc.createAccessor(`pos_${matName}`)
      .setType('VEC3')
      .setArray(new Float32Array(posArr))
      .setBuffer(buffer);

    const uvAccessor = doc.createAccessor(`uv_${matName}`)
      .setType('VEC2')
      .setArray(new Float32Array(uvArr))
      .setBuffer(buffer);

    const normAccessor = doc.createAccessor(`norm_${matName}`)
      .setType('VEC3')
      .setArray(new Float32Array(normArr))
      .setBuffer(buffer);

    const indexAccessor = doc.createAccessor(`idx_${matName}`)
      .setType('SCALAR')
      .setArray(vertIdx <= 65535 ? new Uint16Array(indexArr) : new Uint32Array(indexArr))
      .setBuffer(buffer);

    // Primitive
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', posAccessor)
      .setAttribute('TEXCOORD_0', uvAccessor)
      .setAttribute('NORMAL', normAccessor)
      .setIndices(indexAccessor);

    // Material
    const cacheKey = `${matName}__${isSecondary ? 'sec' : 'pri'}`;
    let material;
    if (materialCache.has(cacheKey)) {
      material = materialCache.get(cacheKey);
    } else {
      material = doc.createMaterial(cacheKey);
      material.setRoughnessFactor(1.0);
      material.setMetallicFactor(0.0);

      const tint = matDef.tintColor || [1, 1, 1];
      material.setBaseColorFactor([tint[0], tint[1], tint[2], matDef.opacity ?? 1.0]);

      if (matDef.texturePath) {
        const { texture, hasAlpha } = await getTexture(matDef.texturePath);
        if (texture) {
          material.setBaseColorTexture(texture);
          const texInfo = material.getBaseColorTextureInfo();
          if (texInfo) {
            if (matDef.clampS) texInfo.setWrapS(33071);
            if (matDef.clampT) texInfo.setWrapT(33071);
          }

          if (matDef.isEnvMapped) {
            material.setEmissiveTexture(texture);
            material.setEmissiveFactor([0.6, 0.6, 0.6]);
            const emissiveTexInfo = material.getEmissiveTextureInfo();
            if (emissiveTexInfo) {
              if (matDef.clampS) emissiveTexInfo.setWrapS(33071);
              if (matDef.clampT) emissiveTexInfo.setWrapT(33071);
            }
          }

          if (isSecondary && hasAlpha) {
            if ((matDef.opacity ?? 1.0) < 1.0) {
              material.setAlphaMode('BLEND');
            } else {
              material.setAlphaMode('MASK');
              material.setAlphaCutoff(0.5);
            }
          }
        }
      }

      material.setDoubleSided(true);
      materialCache.set(cacheKey, material);
    }

    prim.setMaterial(material);
    mesh.addPrimitive(prim);
  }

  if (totalVerts === 0) return { wrote: false, centroid: null };

  rootNode.setMesh(mesh);

  // Write GLB
  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outputPath, Buffer.from(glb));

  return { wrote: true, centroid };
}

// ─── Centroid-only computation (for --placements-only) ────────────────────────

function computeCentroidOnly(parsed, matMap, modelScale) {
  const allPositions = [];
  for (const [matName, faces] of matMap) {
    for (const face of faces) {
      for (const v of face.verts) {
        if (v.pos >= 0 && v.pos < parsed.positions.length) {
          allPositions.push(parsed.positions[v.pos]);
        }
      }
    }
  }
  if (allPositions.length === 0) return null;

  let cx = 0, cy = 0, cz = 0;
  for (const p of allPositions) {
    cx += p[0]; cy += p[1]; cz += p[2];
  }
  cx /= allPositions.length;
  cy /= allPositions.length;
  cz /= allPositions.length;

  return [cx * modelScale, cy * modelScale, cz * modelScale];
}

// ─── 3x3 SVD via Jacobi (ported from src/editor/ObjectReplaceSystem.ts) ──────

function mat3Multiply(a, b) {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

function mat3Transpose(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

function mat3Det(m) {
  return m[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*m[7]-m[4]*m[6]);
}

function mat3Identity() {
  return [1,0,0, 0,1,0, 0,0,1];
}

function jacobiRotate(s, v, p, q) {
  const pi = p * 3, qi = q * 3;
  if (Math.abs(s[pi + q]) < 1e-12) return;
  const tau = (s[qi + q] - s[pi + p]) / (2 * s[pi + q]);
  const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
  const c = 1 / Math.sqrt(1 + t * t);
  const sn = t * c;

  const sCopy = [...s];
  for (let i = 0; i < 3; i++) {
    s[i * 3 + p] = c * sCopy[i * 3 + p] - sn * sCopy[i * 3 + q];
    s[i * 3 + q] = sn * sCopy[i * 3 + p] + c * sCopy[i * 3 + q];
  }
  const sCopy2 = [...s];
  for (let j = 0; j < 3; j++) {
    s[p * 3 + j] = c * sCopy2[p * 3 + j] - sn * sCopy2[q * 3 + j];
    s[q * 3 + j] = sn * sCopy2[p * 3 + j] + c * sCopy2[q * 3 + j];
  }

  const vCopy = [...v];
  for (let i = 0; i < 3; i++) {
    v[i * 3 + p] = c * vCopy[i * 3 + p] - sn * vCopy[i * 3 + q];
    v[i * 3 + q] = sn * vCopy[i * 3 + p] + c * vCopy[i * 3 + q];
  }
}

function svd3x3(H) {
  const HtH = mat3Multiply(mat3Transpose(H), H);
  const s = [...HtH];
  const V = mat3Identity();
  for (let iter = 0; iter < 30; iter++) {
    jacobiRotate(s, V, 0, 1);
    jacobiRotate(s, V, 0, 2);
    jacobiRotate(s, V, 1, 2);
  }
  const sig = [Math.sqrt(Math.max(0, s[0])), Math.sqrt(Math.max(0, s[4])), Math.sqrt(Math.max(0, s[8]))];
  const HV = mat3Multiply(H, V);
  const U = [...HV];
  for (let col = 0; col < 3; col++) {
    const sv = sig[col] > 1e-10 ? sig[col] : 1;
    U[0 * 3 + col] = HV[0 * 3 + col] / sv;
    U[1 * 3 + col] = HV[1 * 3 + col] / sv;
    U[2 * 3 + col] = HV[2 * 3 + col] / sv;
  }
  return { U, V };
}

function computeOptimalRotation(H) {
  const { U, V } = svd3x3(H);
  let R = mat3Multiply(V, mat3Transpose(U));
  if (mat3Det(R) < 0) {
    const Vfix = [...V];
    Vfix[0 * 3 + 2] *= -1;
    Vfix[1 * 3 + 2] *= -1;
    Vfix[2 * 3 + 2] *= -1;
    R = mat3Multiply(Vfix, mat3Transpose(U));
  }
  return R;
}

// ─── Vertex Collection + Rotation Computation ─────────────────────────────────

/**
 * Collect all triangle vertex positions and flat normals from a matMap in
 * deterministic order (same iteration order as computeFingerprint/buildSingleObjectGlb).
 */
function collectVerticesAndNormals(parsed, matMap) {
  const positions = [];
  const normals = [];

  for (const [matName, faces] of matMap) {
    for (const face of faces) {
      for (let i = 1; i < face.verts.length - 1; i++) {
        const tri = [face.verts[0], face.verts[i], face.verts[i + 1]];
        const triPos = tri.map(v =>
          v.pos >= 0 && v.pos < parsed.positions.length
            ? parsed.positions[v.pos]
            : [0, 0, 0]
        );
        const normal = computeFlatNormal(triPos[0], triPos[1], triPos[2]);

        for (let j = 0; j < 3; j++) {
          positions.push(triPos[j]);
          normals.push(normal);
        }
      }
    }
  }

  return { positions, normals };
}

/**
 * Compute the Y-axis rotation (in degrees) that best aligns the prototype's
 * centered vertices to the instance's centered vertices using SVD.
 * protoVerts/instVerts: arrays of [x,y,z], same length and order.
 * protoNormals/instNormals: flat normals per vertex.
 */
function computeAlignmentRotation(protoVerts, protoNormals, instVerts, instNormals) {
  const n = protoVerts.length;
  if (n === 0 || instVerts.length !== n) return 0;

  // Compute centroids
  let pcx = 0, pcy = 0, pcz = 0;
  let icx = 0, icy = 0, icz = 0;
  for (let i = 0; i < n; i++) {
    pcx += protoVerts[i][0]; pcy += protoVerts[i][1]; pcz += protoVerts[i][2];
    icx += instVerts[i][0]; icy += instVerts[i][1]; icz += instVerts[i][2];
  }
  pcx /= n; pcy /= n; pcz /= n;
  icx /= n; icy /= n; icz /= n;

  // Compute RMS of centered positions
  let rmsP = 0, rmsI = 0;
  for (let i = 0; i < n; i++) {
    const px = protoVerts[i][0] - pcx, py = protoVerts[i][1] - pcy, pz = protoVerts[i][2] - pcz;
    rmsP += px * px + py * py + pz * pz;
    const ix = instVerts[i][0] - icx, iy = instVerts[i][1] - icy, iz = instVerts[i][2] - icz;
    rmsI += ix * ix + iy * iy + iz * iz;
  }
  rmsP = Math.sqrt(rmsP / n);
  rmsI = Math.sqrt(rmsI / n);

  const invP = rmsP > 1e-10 ? 1 / rmsP : 1;
  const invI = rmsI > 1e-10 ? 1 / rmsI : 1;
  const normalWeight = rmsP > 1e-10 ? 0.1 * rmsP : 0.1;
  const nw = normalWeight * invP;

  // Build cross-covariance H
  const H = [0,0,0, 0,0,0, 0,0,0];
  for (let i = 0; i < n; i++) {
    // Normalized centered positions
    const px = (protoVerts[i][0] - pcx) * invP;
    const py = (protoVerts[i][1] - pcy) * invP;
    const pz = (protoVerts[i][2] - pcz) * invP;
    const qx = (instVerts[i][0] - icx) * invI;
    const qy = (instVerts[i][1] - icy) * invI;
    const qz = (instVerts[i][2] - icz) * invI;

    H[0] += px * qx; H[1] += px * qy; H[2] += px * qz;
    H[3] += py * qx; H[4] += py * qy; H[5] += py * qz;
    H[6] += pz * qx; H[7] += pz * qy; H[8] += pz * qz;

    // Normal contribution (weighted)
    const pnx = protoNormals[i][0] * nw;
    const pny = protoNormals[i][1] * nw;
    const pnz = protoNormals[i][2] * nw;
    const qnx = instNormals[i][0] * nw;
    const qny = instNormals[i][1] * nw;
    const qnz = instNormals[i][2] * nw;

    H[0] += pnx * qnx; H[1] += pnx * qny; H[2] += pnx * qnz;
    H[3] += pny * qnx; H[4] += pny * qny; H[5] += pny * qnz;
    H[6] += pnz * qnx; H[7] += pnz * qny; H[8] += pnz * qnz;
  }

  const R = computeOptimalRotation(H);
  // Extract Y-axis rotation: atan2(R[0][2], R[0][0]) = atan2(R[2], R[0])
  const rotRad = Math.atan2(R[2], R[0]);
  return parseFloat((rotRad * 180 / Math.PI).toFixed(2));
}

// ─── Rotation-Invariant Fingerprinting ────────────────────────────────────────

const crypto = require('crypto');

/**
 * Compute a rotation/scale-invariant fingerprint for an object's face group.
 * Uses sorted triangle edge lengths normalized by the max edge (invariant to
 * rotation, translation, reflection, and uniform scale), combined with
 * material identity (texture filenames + tint colors).
 */
function computeFingerprint(parsed, matMap) {
  // Geometry: collect all triangle edge lengths
  const edgeLengths = [];

  for (const [matName, faces] of matMap) {
    for (const face of faces) {
      // Triangulate (fan) and measure edges
      for (let i = 1; i < face.verts.length - 1; i++) {
        const triVerts = [face.verts[0], face.verts[i], face.verts[i + 1]];
        const triPos = triVerts.map(v =>
          v.pos >= 0 && v.pos < parsed.positions.length
            ? parsed.positions[v.pos]
            : [0, 0, 0]
        );

        // 3 edges per triangle
        for (let a = 0; a < 3; a++) {
          const b = (a + 1) % 3;
          const dx = triPos[b][0] - triPos[a][0];
          const dy = triPos[b][1] - triPos[a][1];
          const dz = triPos[b][2] - triPos[a][2];
          edgeLengths.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
        }
      }
    }
  }

  // Sort for rotation invariance, normalize by max edge for scale invariance
  edgeLengths.sort((a, b) => a - b);
  const maxEdge = edgeLengths[edgeLengths.length - 1] || 1;
  const normalized = edgeLengths.map(e => Math.round((e / maxEdge) * 50));

  // Material: sorted list of (texture basename, tint)
  const matSignatures = [];
  for (const [matName] of matMap) {
    const matDef = parsed.materials[matName] || {};
    const texBase = matDef.texturePath ? path.basename(matDef.texturePath) : 'none';
    const tint = matDef.tintColor || [1, 1, 1];
    const tintKey = tint.map(v => Math.round(v * 255)).join(',');
    matSignatures.push(`${texBase}:${tintKey}`);
  }
  matSignatures.sort();

  // Hash combined
  const raw = normalized.join(',') + '|' + matSignatures.join(';');
  return crypto.createHash('md5').update(raw).digest('hex');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function objectsSlug(dirName) {
  return dirName.replace(/\s*objects?\s*/i, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function splitSingle(inputDir, outputDir, dedup = false, placementsOnly = false) {
  const dirName = path.basename(inputDir);
  const slug = objectsSlug(dirName);
  const modelScale = MODEL_SCALES[slug];

  if (!modelScale) {
    console.warn(`  WARNING: No modelScale found for "${slug}", using 1.0 (objects will NOT be normalized)`);
  }
  const scale = modelScale || 1.0;

  if (placementsOnly) {
    console.log(`Placements only: ${dirName} (scale: ${scale})`);
  } else {
    console.log(`Splitting: ${dirName} (scale: ${scale}${dedup ? ', dedup ON' : ''})`);
  }

  const parsed = parseObjectsObj(inputDir);
  const placements = {}; // filename → [x, y, z] centroid in scaled world space

  if (placementsOnly) {
    // Compute centroids and match deduplicated objects to surviving GLBs via fingerprinting.
    // Output format: { "primary_005.glb": [[x,y,z], [x,y,z], ...], ... }
    // Each key is a GLB that exists in the manifest; each value is all instance positions.
    fs.mkdirSync(outputDir, { recursive: true });
    const pad = String(parsed.objects.length).length;

    // Read existing manifest to know which GLBs survived dedup
    let existingManifest = [];
    const manifestPath = path.join(outputDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
    const existingSet = new Set(existingManifest);

    // Read existing renames to resolve current filenames back to original IDs
    let existingRenames = {};
    const renamesPath = path.join(outputDir, 'renames.json');
    if (fs.existsSync(renamesPath)) {
      existingRenames = JSON.parse(fs.readFileSync(renamesPath, 'utf-8'));
    }
    // Build reverse map: original_name → current_name
    const originalToCurrentName = {};
    for (const [currentName, origName] of Object.entries(existingRenames)) {
      originalToCurrentName[origName] = currentName;
    }

    // First pass: compute fingerprint for each OBJ object and build fingerprint → GLB filename map
    // Also store the prototype's vertices+normals for rotation computation
    const fingerprintToGlb = { primary: new Map(), secondary: new Map() };
    // fingerprint → { positions: [x,y,z][], normals: [x,y,z][] } (prototype's raw vertices)
    const protoVertices = { primary: new Map(), secondary: new Map() };

    for (let i = 0; i < parsed.objects.length; i++) {
      const obj = parsed.objects[i];
      const idx = String(i).padStart(pad, '0');

      if (obj.primary.size > 0) {
        const origName = `primary_${idx}.glb`;
        const currentName = originalToCurrentName[origName] || origName;
        if (existingSet.has(currentName)) {
          const fp = computeFingerprint(parsed, obj.primary);
          if (!fingerprintToGlb.primary.has(fp)) {
            fingerprintToGlb.primary.set(fp, origName);
            protoVertices.primary.set(fp, collectVerticesAndNormals(parsed, obj.primary));
          }
        }
      }
      if (obj.secondary.size > 0) {
        const origName = `secondary_${idx}.glb`;
        const currentName = originalToCurrentName[origName] || origName;
        if (existingSet.has(currentName)) {
          const fp = computeFingerprint(parsed, obj.secondary);
          if (!fingerprintToGlb.secondary.has(fp)) {
            fingerprintToGlb.secondary.set(fp, origName);
            protoVertices.secondary.set(fp, collectVerticesAndNormals(parsed, obj.secondary));
          }
        }
      }
    }

    // Second pass: for every OBJ object, compute centroid + fingerprint + rotation, map to surviving GLB
    // Output format: [x, y, z, rotDeg] per placement
    let totalPlacements = 0;

    function processObject(matMap, type) {
      const centroid = computeCentroidOnly(parsed, matMap, scale);
      if (!centroid) return;
      const fp = computeFingerprint(parsed, matMap);
      const fpMap = type === 'primary' ? fingerprintToGlb.primary : fingerprintToGlb.secondary;
      const glbOrigName = fpMap.get(fp);
      if (!glbOrigName) return;

      // Compute rotation relative to prototype
      const protoMap = type === 'primary' ? protoVertices.primary : protoVertices.secondary;
      const proto = protoMap.get(fp);
      const inst = collectVerticesAndNormals(parsed, matMap);
      const rotDeg = computeAlignmentRotation(proto.positions, proto.normals, inst.positions, inst.normals);

      if (!placements[glbOrigName]) placements[glbOrigName] = [];
      placements[glbOrigName].push([centroid[0], centroid[1], centroid[2], rotDeg]);
      totalPlacements++;
    }

    for (let i = 0; i < parsed.objects.length; i++) {
      const obj = parsed.objects[i];
      if (obj.primary.size > 0) processObject(obj.primary, 'primary');
      if (obj.secondary.size > 0) processObject(obj.secondary, 'secondary');
    }

    fs.writeFileSync(path.join(outputDir, 'placements.json'), JSON.stringify(placements, null, 2));
    console.log(`  ${parsed.objects.length} objects → ${Object.keys(placements).length} unique GLBs, ${totalPlacements} total placements`);
    return;
  }

  const pngCache = new PngCache();

  // Clean output directory (remove old GLBs and manifest)
  if (fs.existsSync(outputDir)) {
    for (const f of fs.readdirSync(outputDir)) {
      if (f.endsWith('.glb') || f === 'manifest.json') {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  let primaryCount = 0;
  let secondaryCount = 0;
  let primarySkipped = 0;
  let secondarySkipped = 0;
  const pad = String(parsed.objects.length).length;
  const obj_primary_written = new Set();
  const obj_secondary_written = new Set();
  const seenPrimaryFingerprints = new Set();
  const seenSecondaryFingerprints = new Set();

  for (let i = 0; i < parsed.objects.length; i++) {
    const obj = parsed.objects[i];
    const idx = String(i).padStart(pad, '0');

    // Primary part
    if (obj.primary.size > 0) {
      let dominated = false;
      if (dedup) {
        const fp = computeFingerprint(parsed, obj.primary);
        if (seenPrimaryFingerprints.has(fp)) {
          dominated = true;
          primarySkipped++;
        } else {
          seenPrimaryFingerprints.add(fp);
        }
      }
      if (!dominated) {
        const outPath = path.join(outputDir, `primary_${idx}.glb`);
        const result = await buildSingleObjectGlb(parsed, obj.primary, false, scale, pngCache, outPath);
        if (result.wrote) {
          primaryCount++;
          obj_primary_written.add(i);
          if (result.centroid) placements[`primary_${idx}.glb`] = [result.centroid];
        }
      }
    }

    // Secondary part
    if (obj.secondary.size > 0) {
      let dominated = false;
      if (dedup) {
        const fp = computeFingerprint(parsed, obj.secondary);
        if (seenSecondaryFingerprints.has(fp)) {
          dominated = true;
          secondarySkipped++;
        } else {
          seenSecondaryFingerprints.add(fp);
        }
      }
      if (!dominated) {
        const outPath = path.join(outputDir, `secondary_${idx}.glb`);
        const result = await buildSingleObjectGlb(parsed, obj.secondary, true, scale, pngCache, outPath);
        if (result.wrote) {
          secondaryCount++;
          obj_secondary_written.add(i);
          if (result.centroid) placements[`secondary_${idx}.glb`] = [result.centroid];
        }
      }
    }
  }

  // Write manifest.json listing all generated files
  const manifest = [];
  for (let i = 0; i < parsed.objects.length; i++) {
    const idx = String(i).padStart(pad, '0');
    if (obj_primary_written.has(i)) manifest.push(`primary_${idx}.glb`);
    if (obj_secondary_written.has(i)) manifest.push(`secondary_${idx}.glb`);
  }
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write placements.json with centroid positions
  fs.writeFileSync(path.join(outputDir, 'placements.json'), JSON.stringify(placements, null, 2));

  const totalUnique = primaryCount + secondaryCount;
  const totalSkipped = primarySkipped + secondarySkipped;
  if (dedup) {
    console.log(`  ${parsed.objects.length} objects → ${primaryCount} primary + ${secondaryCount} secondary unique GLBs (${totalSkipped} duplicates removed), ${Object.keys(placements).length} placements`);
  } else {
    console.log(`  ${parsed.objects.length} objects → ${primaryCount} primary + ${secondaryCount} secondary GLBs, ${Object.keys(placements).length} placements`);
  }
}

async function splitBatch(levelsDir, outputDir, dedup = false, placementsOnly = false) {
  const dirs = fs.readdirSync(levelsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const objPath = path.join(levelsDir, d.name, 'objects.obj');
      return fs.existsSync(objPath);
    })
    .map(d => d.name)
    .sort();

  console.log(`Found ${dirs.length} level object folders${placementsOnly ? ' (placements only)' : dedup ? ' (dedup ON)' : ''}\n`);

  for (const dir of dirs) {
    const slug = objectsSlug(dir);
    const inputDir = path.join(levelsDir, dir);
    const outDir = path.join(outputDir, slug);
    await splitSingle(inputDir, outDir, dedup, placementsOnly);
  }

  console.log(`\nAll done! Processed ${dirs.length} levels.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dedup = args.includes('--dedup');
  const placementsOnly = args.includes('--placements-only');
  const filteredArgs = args.filter(a => a !== '--dedup' && a !== '--placements-only');

  if (filteredArgs[0] === '--batch' && filteredArgs.length === 3) {
    await splitBatch(filteredArgs[1], filteredArgs[2], dedup, placementsOnly);
  } else if (filteredArgs.length === 2) {
    await splitSingle(filteredArgs[0], filteredArgs[1], dedup, placementsOnly);
  } else {
    console.log('Usage:');
    console.log('  node tools/split-level-objects.cjs [--dedup] [--placements-only] <input-dir> <output-dir>');
    console.log('  node tools/split-level-objects.cjs [--dedup] [--placements-only] --batch <level-objects-dir> <output-dir>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
