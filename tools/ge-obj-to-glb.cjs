#!/usr/bin/env node
/**
 * GoldenEye Setup Editor OBJ → GLB Converter
 *
 * Parses the custom OBJ format exported by the GE Setup Editor (SubDrag)
 * which stores vertex colors as #vcolor/#fvcolorindex comments.
 *
 * Usage:
 *   node tools/ge-obj-to-glb.js <input.obj> <output.glb>
 *   node tools/ge-obj-to-glb.js --batch <inputDir> <outputDir>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Document, NodeIO, Buffer: GltfBuffer } = require('@gltf-transform/core');

// ─── Muzzle Flash Room Overrides ─────────────────────────────────────────────
// Most weapons use Room04/Room05 for muzzle flash, but some are different.
const MUZZLE_OVERRIDES = {
  'golden-gun': ['Room05', 'Room06'],
  'zmgobj': ['Room04', 'Room06', 'Room07'],
  'laser': ['Room03'],
};
const DEFAULT_MUZZLE_ROOMS = ['Room04', 'Room05'];

// ─── OBJ Parser ──────────────────────────────────────────────────────────────

function parseGEObj(objPath, muzzleRooms = DEFAULT_MUZZLE_ROOMS) {
  const objDir = path.dirname(objPath);
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
  const materials = {};       // name → { texturePath, doubleSided, clampS, clampT }
  let currentMaterial = null;

  // Faces grouped by material, split into gun vs muzzle flash
  // Each face: { verts: [{pos, uv, norm}], colorIndices: [int,int,int] }
  const gunFaceGroups = {};     // materialName → face[]
  const muzzleFaceGroups = {};  // materialName → face[]
  let currentGroup = '__default';
  let currentObjGroup = '';    // tracks the 'g' group name
  let isMuzzleGroup = false;
  let lastFace = null;

  // Track which materials appear in _secondary groups (these get alpha)
  const secondaryMaterials = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('mtllib ')) {
      mtlFile = line.slice(7).trim();
    } else if (line.startsWith('g ')) {
      currentObjGroup = line.slice(2).trim();
      // Check if this group is muzzle flash geometry
      isMuzzleGroup = muzzleRooms.some(prefix => currentObjGroup.startsWith(prefix));
    } else if (line.startsWith('usemtl ')) {
      currentMaterial = line.slice(7).trim();
      currentGroup = currentMaterial;
      const target = isMuzzleGroup ? muzzleFaceGroups : gunFaceGroups;
      if (!target[currentGroup]) target[currentGroup] = [];
      // Track if this material is used in a _secondary group
      if (currentObjGroup.endsWith('_secondary')) {
        secondaryMaterials.add(currentMaterial);
      }
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
          pos: indices[0] - 1,   // 0-indexed
          uv: (indices[1] || 0) - 1,
          norm: (indices[2] || 0) - 1,
        };
      });
      const face = { verts, colorIndices: null };
      const target = isMuzzleGroup ? muzzleFaceGroups : gunFaceGroups;
      if (!target[currentGroup]) target[currentGroup] = [];
      target[currentGroup].push(face);
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
            isEnvMapped: false,
          };
          // Parse flags from material name
          if (curMat.includes('CullBoth')) materials[curMat].doubleSided = true;
          if (curMat.includes('ClampS')) materials[curMat].clampS = true;
          if (curMat.includes('ClampT')) materials[curMat].clampT = true;
          if (curMat.includes('EnvMapping')) materials[curMat].isEnvMapped = true;
        } else if (mline.startsWith('map_Kd ') && curMat) {
          const texName = mline.slice(7).trim();
          materials[curMat].texturePath = path.join(objDir, texName);
        }
      }
    }
  }

  return { positions, texcoords, normals, vcolorPalette, materials, gunFaceGroups, muzzleFaceGroups, secondaryMaterials };
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
  // BMP rows are padded to 4-byte boundaries
  const rowBytes = Math.ceil((width * bytesPerPixel) / 4) * 4;

  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    // BMP is bottom-up by default unless topDown
    const srcRow = topDown ? y : (height - 1 - y);
    const srcOffset = dataOffset + srcRow * rowBytes;

    for (let x = 0; x < width; x++) {
      const si = srcOffset + x * bytesPerPixel;
      const di = (y * width + x) * 4;
      // BMP stores as BGRA
      rgba[di + 0] = buf[si + 2]; // R
      rgba[di + 1] = buf[si + 1]; // G
      rgba[di + 2] = buf[si + 0]; // B
      rgba[di + 3] = channels === 4 ? buf[si + 3] : 255; // A
    }
  }

  // Check if alpha channel has meaningful data
  let hasAlpha = false;
  if (channels === 4) {
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 255) { hasAlpha = true; break; }
    }
  }

  const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  return { png, width, height, hasAlpha };
}

// ─── GLB Builder ─────────────────────────────────────────────────────────────

async function buildGlb(parsed, faceGroups, outputPath, isMuzzle = false) {
  const doc = new Document();
  const buffer = doc.createBuffer('main');
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode(isMuzzle ? 'MuzzleFlash' : 'Weapon');
  scene.addChild(rootNode);

  // Cache textures to avoid duplicates
  const textureCache = new Map(); // filepath → { texture, hasAlpha }

  async function getTexture(texPath) {
    if (textureCache.has(texPath)) return textureCache.get(texPath);

    if (!fs.existsSync(texPath)) {
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

  // Process each material group
  for (const [matName, faces] of Object.entries(faceGroups)) {
    if (faces.length === 0) continue;

    const matDef = parsed.materials[matName] || {};

    // Build de-indexed vertex arrays (per face-corner)
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

          // UV — env-mapped materials derive UVs from normals (N64 chrome effect)
          if (matDef.isEnvMapped && v.norm >= 0 && v.norm < parsed.normals.length) {
            const nx = parsed.normals[v.norm][0];
            const ny = parsed.normals[v.norm][1];
            uvArr.push(nx * 0.5 + 0.5, ny * 0.5 + 0.5);
          } else if (v.uv >= 0 && v.uv < parsed.texcoords.length) {
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

          // Vertex color from palette (skip for env-mapped — those "colors" are encoded normals)
          if (matDef.isEnvMapped) {
            colorArr.push(1, 1, 1, 1);
          } else if (colorTri && colorTri[j] >= 0 && colorTri[j] < parsed.vcolorPalette.length) {
            const c = parsed.vcolorPalette[colorTri[j]];
            colorArr.push(c.r, c.g, c.b, c.a);
            hasVertexColors = true;
          } else {
            colorArr.push(1, 1, 1, 1);
          }

          indexArr.push(vertIdx++);
        }
      }
    }

    // Create glTF accessors
    const posAccessor = doc.createAccessor('pos_' + matName)
      .setType('VEC3')
      .setArray(new Float32Array(posArr))
      .setBuffer(buffer);

    const uvAccessor = doc.createAccessor('uv_' + matName)
      .setType('VEC2')
      .setArray(new Float32Array(uvArr))
      .setBuffer(buffer);

    const normAccessor = doc.createAccessor('norm_' + matName)
      .setType('VEC3')
      .setArray(new Float32Array(normArr))
      .setBuffer(buffer);

    const indexAccessor = doc.createAccessor('idx_' + matName)
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
      const colorAccessor = doc.createAccessor('color_' + matName)
        .setType('VEC4')
        .setArray(new Float32Array(colorArr))
        .setBuffer(buffer);
      prim.setAttribute('COLOR_0', colorAccessor);
    }

    // Material
    const material = doc.createMaterial(matName);

    if (matDef.texturePath) {
      const { texture, hasAlpha } = await getTexture(matDef.texturePath);
      if (texture) {
        material.setBaseColorTexture(texture);
        // Apply texture wrap modes from GE material flags
        const texInfo = material.getBaseColorTextureInfo();
        if (texInfo) {
          if (matDef.clampS) texInfo.setWrapS(33071); // CLAMP_TO_EDGE
          if (matDef.clampT) texInfo.setWrapT(33071); // CLAMP_TO_EDGE
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
        // Apply alpha on _secondary group materials (not muzzle — additive blending handles transparency)
        if (hasAlpha && !isMuzzle && parsed.secondaryMaterials.has(matName)) {
          material.setAlphaMode('MASK');
          material.setAlphaCutoff(0.5);
        }
      }
    }

    material.setDoubleSided(isMuzzle || matDef.doubleSided || false);
    material.setRoughnessFactor(1.0);
    material.setMetallicFactor(0.0);

    prim.setMaterial(material);

    const mesh = doc.createMesh(matName).addPrimitive(prim);
    const node = doc.createNode(matName).setMesh(mesh);
    rootNode.addChild(node);
  }

  // Write GLB
  const io = new NodeIO();
  const glb = await io.writeBinary(doc);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(glb));

  // Print stats
  const totalVColors = Object.values(faceGroups)
    .flat()
    .filter(f => f.colorIndices).length;
  const label = isMuzzle ? 'muzzle' : 'gun';
  console.log(`  [${label}] ${Object.keys(faceGroups).length} materials, ${totalVColors} faces with vertex colors`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function convertSingle(objPath, outputDir, slug = null) {
  if (!slug) slug = slugify(path.basename(objPath, path.extname(objPath)));
  const muzzleRooms = MUZZLE_OVERRIDES[slug] || DEFAULT_MUZZLE_ROOMS;

  console.log(`Converting: ${path.basename(objPath)} (muzzle rooms: ${muzzleRooms.join(', ')})`);
  const parsed = parseGEObj(objPath, muzzleRooms);

  // Build gun.glb (everything except muzzle rooms)
  const gunPath = path.join(outputDir, 'gun.glb');
  await buildGlb(parsed, parsed.gunFaceGroups, gunPath, false);
  console.log(`  gun.glb: ${(fs.statSync(gunPath).size / 1024).toFixed(1)} KB`);

  // Build muzzle.glb (muzzle rooms only) if there are muzzle faces
  const hasMuzzle = Object.values(parsed.muzzleFaceGroups).some(f => f.length > 0);
  if (hasMuzzle) {
    const muzzlePath = path.join(outputDir, 'muzzle.glb');
    await buildGlb(parsed, parsed.muzzleFaceGroups, muzzlePath, true);
    console.log(`  muzzle.glb: ${(fs.statSync(muzzlePath).size / 1024).toFixed(1)} KB`);
  } else {
    console.log(`  (no muzzle flash geometry)`);
  }
}

async function convertBatch(inputDir, outputDir) {
  const objFiles = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.obj'));
  console.log(`Found ${objFiles.length} OBJ files in ${inputDir}\n`);

  for (const objFile of objFiles) {
    const name = slugify(path.basename(objFile, '.obj'));
    const objPath = path.join(inputDir, objFile);
    const weaponDir = path.join(outputDir, name);
    await convertSingle(objPath, weaponDir, name);
  }

  console.log(`\nAll done! Converted ${objFiles.length} weapons.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--batch' && args.length === 3) {
    await convertBatch(args[1], args[2]);
  } else if (args.length === 2) {
    await convertSingle(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node tools/ge-obj-to-glb.cjs <input.obj> <outputDir>');
    console.log('  node tools/ge-obj-to-glb.cjs --batch <inputDir> <outputDir>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
