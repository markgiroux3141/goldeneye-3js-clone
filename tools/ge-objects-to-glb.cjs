#!/usr/bin/env node
/**
 * GoldenEye Setup Editor Level Objects OBJ → GLB Converter
 *
 * Converts level object geometry (props, furniture, etc.) exported by the
 * GE Setup Editor to GLB, preserving tint colors from MTL Kd values.
 *
 * Unlike weapons/levels which use #vcolor vertex color palettes, level objects
 * store their tint as the diffuse color (Kd) in the MTL file. This is written
 * to glTF baseColorFactor so the existing N64 shader pipeline applies it via u_color.
 *
 * Usage:
 *   node tools/ge-objects-to-glb.cjs <input-dir> <output.glb>
 *   node tools/ge-objects-to-glb.cjs --batch <level-objects-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Document, NodeIO } = require('@gltf-transform/core');

// ─── OBJ + MTL Parser ────────────────────────────────────────────────────────

function parseObjectsObj(objDir) {
  const objPath = path.join(objDir, 'objects.obj');
  const text = fs.readFileSync(objPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  const positions = [];   // vec3[]
  const texcoords = [];   // vec2[]

  // Materials
  let mtlFile = null;
  const materials = {};       // name → { texturePath, tintColor, doubleSided, clampS, clampT, isEnvMapped, opacity }
  let currentMaterial = null;

  // Faces grouped by (objGroup, material)
  // objectGroups: Map<groupName, Map<matName, face[]>>
  const objectGroups = new Map();
  let currentObjGroup = '__default';
  let lastFace = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('mtllib ')) {
      mtlFile = line.slice(7).trim();
    } else if (line.startsWith('g ')) {
      currentObjGroup = line.slice(2).trim();
    } else if (line.startsWith('usemtl ')) {
      currentMaterial = line.slice(7).trim();
    } else if (line.startsWith('v ') && !line.startsWith('vt') && !line.startsWith('vn')) {
      const parts = line.split(/\s+/);
      positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith('vt ')) {
      const parts = line.split(/\s+/);
      texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
    } else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/).slice(1);
      const verts = parts.map(p => {
        const indices = p.split('/').map(s => s === '' ? 0 : parseInt(s, 10));
        return {
          pos: indices[0] - 1,
          uv: (indices[1] || 0) - 1,
        };
      });
      const face = { verts };

      if (!objectGroups.has(currentObjGroup)) {
        objectGroups.set(currentObjGroup, new Map());
      }
      const matMap = objectGroups.get(currentObjGroup);
      if (!matMap.has(currentMaterial)) {
        matMap.set(currentMaterial, []);
      }
      matMap.get(currentMaterial).push(face);
      lastFace = face;
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
          // Parse flags from material name
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

  return { positions, texcoords, materials, objectGroups };
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

  // Binarize alpha: snap to 0 or 255 for clean cutout transparency
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

// ─── GLB Builder ─────────────────────────────────────────────────────────────

async function buildObjectsGlb(parsed, outputPath) {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('Objects');
  scene.addChild(rootNode);

  // Cache textures to avoid duplicates
  const textureCache = new Map();

  async function getTexture(texPath) {
    if (textureCache.has(texPath)) return textureCache.get(texPath);

    if (!fs.existsSync(texPath)) {
      // Check fallback folder for pre-extracted PNG
      const baseName = path.basename(texPath, path.extname(texPath));
      const fallbackPath = path.join(FALLBACK_DIR, baseName + '.png');
      if (fs.existsSync(fallbackPath)) {
        console.log(`  Using fallback: ${baseName}.png`);
        const pngBuf = fs.readFileSync(fallbackPath);
        const texture = doc.createTexture(baseName)
          .setImage(pngBuf)
          .setMimeType('image/png');
        const meta = await sharp(pngBuf).metadata();
        const hasAlpha = meta.channels === 4;
        const result = { texture, hasAlpha };
        textureCache.set(texPath, result);
        return result;
      }
      console.warn(`  Texture not found: ${texPath}`);
      textureCache.set(texPath, { texture: null, hasAlpha: false });
      return { texture: null, hasAlpha: false };
    }

    const { png, hasAlpha } = await bmpToPng(texPath);
    const texture = doc.createTexture(path.basename(texPath, path.extname(texPath)))
      .setImage(png)
      .setMimeType('image/png');

    const result = { texture, hasAlpha };
    textureCache.set(texPath, result);
    return result;
  }

  // Material cache: different versions for primary vs secondary (alpha handling)
  const materialCache = new Map();

  async function getMaterial(matName, isSecondaryGroup) {
    const cacheKey = `${matName}__${isSecondaryGroup ? 'sec' : 'pri'}`;
    if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);

    const matDef = parsed.materials[matName] || {};
    const material = doc.createMaterial(cacheKey);

    material.setRoughnessFactor(1.0);
    material.setMetallicFactor(0.0);

    // Apply tint color from Kd
    const tint = matDef.tintColor || [1, 1, 1];
    material.setBaseColorFactor([tint[0], tint[1], tint[2], matDef.opacity ?? 1.0]);

    // Texture
    if (matDef.texturePath) {
      const { texture, hasAlpha } = await getTexture(matDef.texturePath);
      if (texture) {
        material.setBaseColorTexture(texture);
        const texInfo = material.getBaseColorTextureInfo();
        if (texInfo) {
          if (matDef.clampS) texInfo.setWrapS(33071); // CLAMP_TO_EDGE
          if (matDef.clampT) texInfo.setWrapT(33071);
        }

        // Env-mapped materials self-illuminate with their chrome texture
        if (matDef.isEnvMapped) {
          material.setEmissiveTexture(texture);
          material.setEmissiveFactor([0.6, 0.6, 0.6]);
          const emissiveTexInfo = material.getEmissiveTextureInfo();
          if (emissiveTexInfo) {
            if (matDef.clampS) emissiveTexInfo.setWrapS(33071);
            if (matDef.clampT) emissiveTexInfo.setWrapT(33071);
          }
        }

        // Transparency: ONLY on secondary groups
        if (isSecondaryGroup && hasAlpha) {
          if ((matDef.opacity ?? 1.0) < 1.0) {
            material.setAlphaMode('BLEND');
          } else {
            material.setAlphaMode('MASK');
            material.setAlphaCutoff(0.5);
          }
        }
      }
    }

    // All level object materials double-sided (N64 face winding is inconsistent)
    material.setDoubleSided(true);

    materialCache.set(cacheKey, material);
    return material;
  }

  let totalFaces = 0;
  let totalGroups = 0;

  // Process each object group
  for (const [groupName, matMap] of parsed.objectGroups) {
    if (matMap.size === 0) continue;

    const isSecondaryGroup = groupName.toLowerCase().includes('secondary');
    const groupNode = doc.createNode(groupName);
    rootNode.addChild(groupNode);
    totalGroups++;

    const mesh = doc.createMesh(groupName);

    for (const [matName, faces] of matMap) {
      if (faces.length === 0) continue;

      const matDef = parsed.materials[matName] || {};

      // Build de-indexed vertex arrays
      const posArr = [];
      const uvArr = [];
      const normArr = [];
      const indexArr = [];
      let vertIdx = 0;

      for (const face of faces) {
        // Triangulate if more than 3 verts (fan triangulation)
        for (let i = 1; i < face.verts.length - 1; i++) {
          const tri = [face.verts[0], face.verts[i], face.verts[i + 1]];

          // Get positions for normal computation
          const triPos = tri.map(v =>
            v.pos >= 0 && v.pos < parsed.positions.length
              ? parsed.positions[v.pos]
              : [0, 0, 0]
          );
          const normal = computeFlatNormal(triPos[0], triPos[1], triPos[2]);

          for (let j = 0; j < 3; j++) {
            const v = tri[j];

            // Position
            if (v.pos >= 0 && v.pos < parsed.positions.length) {
              posArr.push(...parsed.positions[v.pos]);
            } else {
              posArr.push(0, 0, 0);
            }

            // UV — env-mapped materials derive UVs from normals (N64 chrome effect)
            if (matDef.isEnvMapped) {
              // For env-mapped, use the flat normal to generate UVs
              uvArr.push(normal[0] * 0.5 + 0.5, normal[1] * 0.5 + 0.5);
            } else if (v.uv >= 0 && v.uv < parsed.texcoords.length) {
              uvArr.push(parsed.texcoords[v.uv][0], 1.0 - parsed.texcoords[v.uv][1]);
            } else {
              uvArr.push(0, 0);
            }

            // Flat normal (same for all 3 verts of triangle)
            normArr.push(...normal);

            indexArr.push(vertIdx++);
          }
        }
        totalFaces++;
      }

      if (posArr.length === 0) continue;

      // Create glTF accessors
      const posAccessor = doc.createAccessor(`pos_${groupName}_${matName}`)
        .setType('VEC3')
        .setArray(new Float32Array(posArr))
        .setBuffer(buffer);

      const uvAccessor = doc.createAccessor(`uv_${groupName}_${matName}`)
        .setType('VEC2')
        .setArray(new Float32Array(uvArr))
        .setBuffer(buffer);

      const normAccessor = doc.createAccessor(`norm_${groupName}_${matName}`)
        .setType('VEC3')
        .setArray(new Float32Array(normArr))
        .setBuffer(buffer);

      const indexAccessor = doc.createAccessor(`idx_${groupName}_${matName}`)
        .setType('SCALAR')
        .setArray(vertIdx <= 65535 ? new Uint16Array(indexArr) : new Uint32Array(indexArr))
        .setBuffer(buffer);

      // Build primitive
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', posAccessor)
        .setAttribute('TEXCOORD_0', uvAccessor)
        .setAttribute('NORMAL', normAccessor)
        .setIndices(indexAccessor);

      // Material
      const material = await getMaterial(matName, isSecondaryGroup);
      prim.setMaterial(material);

      mesh.addPrimitive(prim);
    }

    groupNode.setMesh(mesh);
  }

  // Write GLB
  const io = new NodeIO();
  const glb = await io.writeBinary(doc);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(glb));

  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`  ${totalGroups} groups, ${totalFaces} faces, ${textureCache.size} textures → ${sizeKB} KB`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function objectsSlug(dirName) {
  // "facility objects" → "facility"
  return dirName.replace(/\s*objects?\s*/i, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function convertSingle(inputDir, outputPath) {
  const dirName = path.basename(inputDir);
  console.log(`Converting objects: ${dirName}`);

  const parsed = parseObjectsObj(inputDir);
  await buildObjectsGlb(parsed, outputPath);
}

async function convertBatch(levelsDir, outputDir) {
  const dirs = fs.readdirSync(levelsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const objPath = path.join(levelsDir, d.name, 'objects.obj');
      return fs.existsSync(objPath);
    })
    .map(d => d.name)
    .sort();

  console.log(`Found ${dirs.length} level object folders in ${levelsDir}\n`);

  for (const dir of dirs) {
    const slug = objectsSlug(dir);
    const inputDir = path.join(levelsDir, dir);
    const outputPath = path.join(outputDir, slug, 'objects.glb');
    await convertSingle(inputDir, outputPath);
  }

  console.log(`\nAll done! Converted ${dirs.length} level object sets.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--batch' && args.length === 3) {
    await convertBatch(args[1], args[2]);
  } else if (args.length === 2) {
    await convertSingle(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node tools/ge-objects-to-glb.cjs <input-dir> <output.glb>');
    console.log('  node tools/ge-objects-to-glb.cjs --batch <level-objects-dir> <output-dir>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
