#!/usr/bin/env node
/**
 * Dedup Grid Tool
 *
 * Generate: Creates a single GLB with all objects from a level folder arranged
 * in a grid. Each object is a named node (matching its filename) so you can
 * select and delete duplicates in Blender.
 *
 * Prune: Reads an edited grid GLB, finds which nodes survived, and deletes
 * the corresponding individual GLBs that were removed.
 *
 * Usage:
 *   node tools/make-dedup-grid.cjs generate <objects-dir> <output.glb>
 *   node tools/make-dedup-grid.cjs prune <objects-dir> <edited-grid.glb>
 */

const fs = require('fs');
const path = require('path');
const { Document, NodeIO } = require('@gltf-transform/core');

const io = new NodeIO();

// ─── Generate Grid ───────────────────────────────────────────────────────────

async function generate(objectsDir, outputPath) {
  // Find all GLB files (exclude grid.glb itself)
  const glbFiles = fs.readdirSync(objectsDir)
    .filter(f => f.endsWith('.glb') && f !== path.basename(outputPath))
    .sort();

  console.log(`Found ${glbFiles.length} GLBs in ${objectsDir}`);

  // Load each GLB and compute bounding boxes
  const objects = [];
  for (const file of glbFiles) {
    const filePath = path.join(objectsDir, file);
    try {
      const doc = await io.read(filePath);
      const root = doc.getRoot();
      const scenes = root.listScenes();
      if (scenes.length === 0) continue;

      // Compute bounding box from all mesh positions
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      for (const mesh of root.listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const posAccessor = prim.getAttribute('POSITION');
          if (!posAccessor) continue;
          const posArray = posAccessor.getArray();
          for (let i = 0; i < posArray.length; i += 3) {
            minX = Math.min(minX, posArray[i]);
            minY = Math.min(minY, posArray[i + 1]);
            minZ = Math.min(minZ, posArray[i + 2]);
            maxX = Math.max(maxX, posArray[i]);
            maxY = Math.max(maxY, posArray[i + 1]);
            maxZ = Math.max(maxZ, posArray[i + 2]);
          }
        }
      }

      const width = maxX - minX;
      const height = maxY - minY;
      const depth = maxZ - minZ;
      const name = path.basename(file, '.glb');

      objects.push({ name, file, filePath, doc, width, height, depth });
    } catch (err) {
      console.warn(`  Skipping ${file}: ${err.message}`);
    }
  }

  if (objects.length === 0) {
    console.log('No objects to grid.');
    return;
  }

  // Compute grid layout
  const cols = Math.ceil(Math.sqrt(objects.length));
  const maxWidth = Math.max(...objects.map(o => o.width)) || 1;
  const maxDepth = Math.max(...objects.map(o => o.depth)) || 1;
  const spacingX = maxWidth * 2;
  const spacingZ = maxDepth * 2;

  // Create combined document
  const outDoc = new Document();
  const outBuffer = outDoc.createBuffer('main');
  const outScene = outDoc.createScene('Scene');
  const gridRoot = outDoc.createNode('Grid');
  outScene.addChild(gridRoot);

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * spacingX;
    const z = row * spacingZ;

    // Read the source doc's meshes and copy them into the output doc
    const srcDoc = obj.doc;
    const srcRoot = srcDoc.getRoot();

    // Create a parent node for this object
    const objNode = outDoc.createNode(obj.name);
    objNode.setTranslation([x, 0, z]);
    gridRoot.addChild(objNode);

    // Copy all meshes from source into this node
    for (const srcMesh of srcRoot.listMeshes()) {
      const outMesh = outDoc.createMesh(obj.name + '_mesh');

      for (const srcPrim of srcMesh.listPrimitives()) {
        const outPrim = outDoc.createPrimitive();

        // Copy position
        const srcPos = srcPrim.getAttribute('POSITION');
        if (srcPos) {
          const posAcc = outDoc.createAccessor(obj.name + '_pos')
            .setType(srcPos.getType())
            .setArray(srcPos.getArray().slice())
            .setBuffer(outBuffer);
          outPrim.setAttribute('POSITION', posAcc);
        }

        // Copy UVs
        const srcUV = srcPrim.getAttribute('TEXCOORD_0');
        if (srcUV) {
          const uvAcc = outDoc.createAccessor(obj.name + '_uv')
            .setType(srcUV.getType())
            .setArray(srcUV.getArray().slice())
            .setBuffer(outBuffer);
          outPrim.setAttribute('TEXCOORD_0', uvAcc);
        }

        // Copy normals
        const srcNorm = srcPrim.getAttribute('NORMAL');
        if (srcNorm) {
          const normAcc = outDoc.createAccessor(obj.name + '_norm')
            .setType(srcNorm.getType())
            .setArray(srcNorm.getArray().slice())
            .setBuffer(outBuffer);
          outPrim.setAttribute('NORMAL', normAcc);
        }

        // Copy indices
        const srcIdx = srcPrim.getIndices();
        if (srcIdx) {
          const idxAcc = outDoc.createAccessor(obj.name + '_idx')
            .setType(srcIdx.getType())
            .setArray(srcIdx.getArray().slice())
            .setBuffer(outBuffer);
          outPrim.setIndices(idxAcc);
        }

        // Copy material (basic properties)
        const srcMat = srcPrim.getMaterial();
        if (srcMat) {
          const matName = obj.name + '_' + (srcMat.getName() || 'mat');
          const outMat = outDoc.createMaterial(matName);
          outMat.setBaseColorFactor(srcMat.getBaseColorFactor());
          outMat.setRoughnessFactor(srcMat.getRoughnessFactor());
          outMat.setMetallicFactor(srcMat.getMetallicFactor());
          outMat.setDoubleSided(srcMat.getDoubleSided());
          if (srcMat.getAlphaMode() !== 'OPAQUE') {
            outMat.setAlphaMode(srcMat.getAlphaMode());
            outMat.setAlphaCutoff(srcMat.getAlphaCutoff());
          }

          // Copy base color texture
          const srcTex = srcMat.getBaseColorTexture();
          if (srcTex) {
            const imgData = srcTex.getImage();
            if (imgData) {
              const outTex = outDoc.createTexture(obj.name + '_tex')
                .setImage(imgData)
                .setMimeType(srcTex.getMimeType());
              outMat.setBaseColorTexture(outTex);

              // Copy texture info (wrap modes)
              const srcTexInfo = srcMat.getBaseColorTextureInfo();
              const outTexInfo = outMat.getBaseColorTextureInfo();
              if (srcTexInfo && outTexInfo) {
                outTexInfo.setWrapS(srcTexInfo.getWrapS());
                outTexInfo.setWrapT(srcTexInfo.getWrapT());
              }
            }
          }

          outPrim.setMaterial(outMat);
        }

        outMesh.addPrimitive(outPrim);
      }

      objNode.setMesh(outMesh);
    }
  }

  // Write output
  const glb = await io.writeBinary(outDoc);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(glb));

  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`Grid: ${objects.length} objects in ${cols} columns, spacing ${spacingX.toFixed(2)} x ${spacingZ.toFixed(2)}`);
  console.log(`Output: ${outputPath} (${sizeKB} KB)`);
}

// ─── Prune ───────────────────────────────────────────────────────────────────

async function prune(objectsDir, gridPath) {
  // Read edited grid GLB
  const doc = await io.read(gridPath);
  const root = doc.getRoot();
  const scenes = root.listScenes();

  // Collect all node names (look for Grid root → children)
  const survivingNames = new Set();

  for (const scene of scenes) {
    for (const topNode of scene.listChildren()) {
      // Grid root or direct children
      for (const child of topNode.listChildren()) {
        const name = child.getName();
        if (name) survivingNames.add(name);
      }
      // Also check if topNode itself is a named object (in case Grid root was removed in Blender)
      const topName = topNode.getName();
      if (topName && topName !== 'Grid') survivingNames.add(topName);
    }
  }

  console.log(`Found ${survivingNames.size} surviving objects in grid`);

  // Find GLB files in the directory
  const glbFiles = fs.readdirSync(objectsDir)
    .filter(f => f.endsWith('.glb') && f !== path.basename(gridPath));

  let kept = 0;
  let deleted = 0;

  for (const file of glbFiles) {
    const name = path.basename(file, '.glb');
    if (survivingNames.has(name)) {
      kept++;
    } else {
      fs.unlinkSync(path.join(objectsDir, file));
      deleted++;
      console.log(`  Deleted: ${file}`);
    }
  }

  // Update manifest
  const manifest = glbFiles
    .filter(f => survivingNames.has(path.basename(f, '.glb')))
    .sort();
  fs.writeFileSync(path.join(objectsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nKept ${kept}, deleted ${deleted}. Manifest updated.`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'generate' && args.length === 3) {
    await generate(args[1], args[2]);
  } else if (args[0] === 'prune' && args.length === 3) {
    await prune(args[1], args[2]);
  } else {
    console.log('Usage:');
    console.log('  node tools/make-dedup-grid.cjs generate <objects-dir> <output.glb>');
    console.log('  node tools/make-dedup-grid.cjs prune <objects-dir> <edited-grid.glb>');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
