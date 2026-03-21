#!/usr/bin/env node
/**
 * GoldenEye Setup Editor Level OBJ → GLB Converter
 *
 * Converts level geometry exported by the GE Setup Editor (SubDrag) to GLB,
 * preserving vertex colors (baked N64 lighting), textures, and group structure.
 *
 * Usage:
 *   node tools/ge-level-to-glb.cjs <input-dir> <output.glb>
 *   node tools/ge-level-to-glb.cjs --batch <levels-dir> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Document, NodeIO } = require('@gltf-transform/core');

// ─── OBJ Parser ──────────────────────────────────────────────────────────────

function parseLevelObj(objDir) {
  const objPath = path.join(objDir, 'LevelIndices.obj');
  const text = fs.readFileSync(objPath, 'utf-8');
  const lines = text.split(/\r?\n/);

  // Standard OBJ data
  const positions = [];   // vec3[]
  const texcoords = [];   // vec2[]
  const normals = [];     // vec3[]

  // GE custom: vertex color palette (1-indexed in fvcolorindex)
  const vcolorPalette = []; // {r,g,b,a}[]

  // Materials
  let mtlFile = null;
  const materials = {};       // name → { texturePath, doubleSided, clampS, clampT, topFlag, transparent, opacity }
  let currentMaterial = null;

  // Faces grouped by (objGroup, material)
  // roomGroups: Map<groupName, Map<matName, face[]>>
  const roomGroups = new Map();
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
    } else if (line.startsWith('vn ')) {
      const parts = line.split(/\s+/);
      normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (line.startsWith('#vcolor ')) {
      const parts = line.split(/\s+/);
      vcolorPalette.push({
        r: parseFloat(parts[1]) / 255,
        g: parseFloat(parts[2]) / 255,
        b: parseFloat(parts[3]) / 255,
        a: parseFloat(parts[4]) / 255,
      });
    } else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/).slice(1);
      const verts = parts.map(p => {
        const indices = p.split('/').map(s => s === '' ? 0 : parseInt(s, 10));
        return {
          pos: indices[0] - 1,
          uv: (indices[1] || 0) - 1,
          norm: (indices[2] || 0) - 1,
        };
      });
      const face = { verts, colorIndices: null };

      // Get or create the room group and material bucket
      if (!roomGroups.has(currentObjGroup)) {
        roomGroups.set(currentObjGroup, new Map());
      }
      const matMap = roomGroups.get(currentObjGroup);
      if (!matMap.has(currentMaterial)) {
        matMap.set(currentMaterial, []);
      }
      matMap.get(currentMaterial).push(face);
      lastFace = face;
    } else if (line.startsWith('#fvcolorindex ')) {
      if (lastFace) {
        const parts = line.split(/\s+/).slice(1);
        lastFace.colorIndices = parts.map(s => parseInt(s, 10) - 1); // 0-indexed into palette
      }
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
            doubleSided: false,
            clampS: false,
            clampT: false,
            topFlag: false,
            transparent: false,
            opacity: 1.0,
          };
          // Parse flags from material name
          if (curMat.includes('CullBoth')) materials[curMat].doubleSided = true;
          if (curMat.includes('ClampS')) materials[curMat].clampS = true;
          if (curMat.includes('ClampT')) materials[curMat].clampT = true;
          if (curMat.includes('TopFlag')) materials[curMat].topFlag = true;
          if (curMat.includes('Transparent')) materials[curMat].transparent = true;
        } else if (mline.startsWith('d ') && curMat) {
          materials[curMat].opacity = parseFloat(mline.split(/\s+/)[1]);
        } else if (mline.startsWith('map_Kd ') && curMat) {
          const texName = mline.slice(7).trim();
          materials[curMat].texturePath = path.join(objDir, texName);
        }
      }
    }
  }

  return { positions, texcoords, normals, vcolorPalette, materials, roomGroups };
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
  // (GE textures have intermediate alpha values that cause dark areas to appear transparent)
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

// ─── GLB Builder ─────────────────────────────────────────────────────────────

async function buildLevelGlb(parsed, outputPath) {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('Level');
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
        // Detect alpha in PNG via sharp
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

  // Material cache: we may need different versions of a material for primary vs secondary
  // Secondary gets transparency, primary does not
  const materialCache = new Map(); // key → gltf material

  async function getMaterial(matName, isSecondaryGroup) {
    const cacheKey = `${matName}__${isSecondaryGroup ? 'sec' : 'pri'}`;
    if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);

    const matDef = parsed.materials[matName] || {};
    const material = doc.createMaterial(cacheKey);

    material.setRoughnessFactor(1.0);
    material.setMetallicFactor(0.0);

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

        // Transparency: ONLY on secondary groups
        if (isSecondaryGroup && hasAlpha) {
          if (matDef.opacity < 1.0) {
            material.setAlphaMode('BLEND');
            material.setBaseColorFactor([1, 1, 1, matDef.opacity]);
          } else {
            material.setAlphaMode('MASK');
            material.setAlphaCutoff(0.5);
          }
        }
      }
    }

    // Double-sided: CullBoth or TopFlag (applies regardless of primary/secondary)
    // All level materials are double-sided — N64 face winding is inconsistent
    material.setDoubleSided(true);

    materialCache.set(cacheKey, material);
    return material;
  }

  let totalFaces = 0;
  let totalRooms = 0;

  // Process each room group
  for (const [groupName, matMap] of parsed.roomGroups) {
    if (matMap.size === 0) continue;

    const isSecondaryGroup = groupName.toLowerCase().startsWith('secondary');
    const groupNode = doc.createNode(groupName);
    rootNode.addChild(groupNode);
    totalRooms++;

    // Create one mesh per room with multiple primitives (one per material)
    const mesh = doc.createMesh(groupName);

    for (const [matName, faces] of matMap) {
      if (faces.length === 0) continue;

      // Build de-indexed vertex arrays
      const posArr = [];
      const uvArr = [];
      const normArr = [];
      const colorArr = [];
      const indexArr = [];
      let hasVertexColors = false;
      let vertIdx = 0;

      for (const face of faces) {
        // Triangulate if more than 3 verts (fan triangulation)
        for (let i = 1; i < face.verts.length - 1; i++) {
          const tri = [face.verts[0], face.verts[i], face.verts[i + 1]];
          const colorTri = face.colorIndices
            ? [face.colorIndices[0], face.colorIndices[Math.min(i, face.colorIndices.length - 1)], face.colorIndices[Math.min(i + 1, face.colorIndices.length - 1)]]
            : null;

          for (let j = 0; j < 3; j++) {
            const v = tri[j];

            // Position
            if (v.pos >= 0 && v.pos < parsed.positions.length) {
              posArr.push(...parsed.positions[v.pos]);
            } else {
              posArr.push(0, 0, 0);
            }

            // UV
            if (v.uv >= 0 && v.uv < parsed.texcoords.length) {
              uvArr.push(parsed.texcoords[v.uv][0], 1.0 - parsed.texcoords[v.uv][1]);
            } else {
              uvArr.push(0, 0);
            }

            // Normal
            if (v.norm >= 0 && v.norm < parsed.normals.length) {
              normArr.push(...parsed.normals[v.norm]);
            } else {
              normArr.push(0, 1, 0);
            }

            // Vertex color from palette
            if (colorTri && colorTri[j] >= 0 && colorTri[j] < parsed.vcolorPalette.length) {
              const c = parsed.vcolorPalette[colorTri[j]];
              colorArr.push(c.r, c.g, c.b, c.a);
              hasVertexColors = true;
            } else {
              colorArr.push(1, 1, 1, 1);
            }

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

      // Add vertex colors if any face had them
      if (hasVertexColors) {
        const colorAccessor = doc.createAccessor(`color_${groupName}_${matName}`)
          .setType('VEC4')
          .setArray(new Float32Array(colorArr))
          .setBuffer(buffer);
        prim.setAttribute('COLOR_0', colorAccessor);
      }

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
  console.log(`  ${totalRooms} rooms, ${totalFaces} faces, ${textureCache.size} textures → ${sizeKB} KB`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function levelSlug(dirName) {
  // "02 - Facility" → "facility", "Complex" → "complex"
  const match = dirName.match(/^\d+\s*-\s*(.+)$/);
  const name = match ? match[1] : dirName;
  return name.toLowerCase().replace(/\s+/g, '-');
}

async function convertSingleLevel(inputDir, outputPath) {
  const dirName = path.basename(inputDir);
  console.log(`Converting level: ${dirName}`);

  const parsed = parseLevelObj(inputDir);
  await buildLevelGlb(parsed, outputPath);
}

async function convertBatchLevels(levelsDir, outputDir) {
  const dirs = fs.readdirSync(levelsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      // Only numbered levels + "Complex"
      const objPath = path.join(levelsDir, d.name, 'LevelIndices.obj');
      return fs.existsSync(objPath);
    })
    .map(d => d.name)
    .sort();

  console.log(`Found ${dirs.length} levels in ${levelsDir}\n`);

  for (const dir of dirs) {
    const slug = levelSlug(dir);
    const inputDir = path.join(levelsDir, dir);
    const outputPath = path.join(outputDir, `${slug}.glb`);
    await convertSingleLevel(inputDir, outputPath);
  }

  console.log(`\nAll done! Converted ${dirs.length} levels.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--batch' && args.length === 3) {
    await convertBatchLevels(args[1], args[2]);
  } else if (args.length === 2) {
    await convertSingleLevel(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node tools/ge-level-to-glb.cjs <input-dir> <output.glb>');
    console.log('  node tools/ge-level-to-glb.cjs --batch <levels-dir> <output-dir>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
