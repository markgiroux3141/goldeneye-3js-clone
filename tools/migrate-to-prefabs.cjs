#!/usr/bin/env node
/**
 * Migrate placements.json files to prefab-based v2 format
 *
 * 1. Scans all levels' placements.json files
 * 2. Generates public/data/prefabs.json from unique mesh combinations
 * 3. Converts each placements.json from v1 to v2 format
 * 4. Keeps v1 backups as placements.v1.json
 *
 * Usage:
 *   node tools/migrate-to-prefabs.cjs
 */

const fs = require('fs');
const path = require('path');

const levelsDir = path.join(__dirname, '..', 'public', 'data', 'levels');
const prefabsPath = path.join(__dirname, '..', 'public', 'data', 'prefabs.json');

// ── Name pattern → type inference (mirrors PrefabRegistry) ──────────────────

// Order matters: more specific patterns first to avoid false matches
const TYPE_PATTERNS = [
  // prop-destructible (before prop patterns)
  { type: 'prop-destructible', patterns: ['explosive_barrel', 'window_glass'] },
  // security (before generic patterns)
  { type: 'security-camera', patterns: ['security_camera', 'camera_primary', 'camera_secondary', 'alarm'] },
  // doors
  { type: 'door', patterns: ['door', 'sliding', 'blast_door', 'hatch'] },
  // characters
  { type: 'character', patterns: ['guard', 'scientist', 'natalia', 'trevelyn', 'boris', 'xenia', 'orumov', 'baron', 'jaws', 'natalya', 'mishkin', 'valentin', 'invisible'] },
  // console/interactive
  { type: 'console', patterns: ['console', 'mainframe', 'keyboard', 'computer'] },
  // pickups
  { type: 'pickup', patterns: ['body_armor', 'ammo_crate', 'ammo_box', 'ammo_box', 'key', 'pp7', 'rcp90', 'ar33', 'kf7', 'dk5', 'k47', 'silenced_pp7', 'golden_gun', 'sniper_rifle', 'rocket_launcher', 'grenade', 'circuit_board', 'encryption_key', 'helicopter_blackbox', 'audio_tape', 'checklist', 'VHS', 'helicopter_schematic', 'book', 'knife', 'c4_explosive', 'poison_gas_tank', 'torn_paper'] },
  // props
  { type: 'prop', patterns: ['crate', 'barrel', 'table', 'chair', 'box', 'shelf', 'desk', 'cabinet', 'locker', 'filing_cabinet', 'bookshelf', 'trash', 'beaker', 'calculator', 'test_tubes', 'tv', 'radio', 'rack_device', 'metal_safe', 'wedge', 'divider', 'metal_cage', 'metal_crate', 'wooden_crate', 'cardboard_crate', 'padlock'] },
  // environment
  { type: 'environment', patterns: ['fence', 'lamp', 'tree', 'bush', 'rock', 'truck', 'tank', 'plane', 'satellite', 'satelite', 'dish', 'barricade', 'railing', 'sign', 'helicopter', 'car', 'ship', 'rocket', 'buildings', 'metal_bracket', 'metal_gate', 'stone_platform', 'black_barrier', 'wall_display', 'drone_gun', 'gun_turret', 'missile_turret', 'ship_engine', 'ship_gun', 'ship_turret', 'rocket_ship'] },
];

function inferType(firstMesh) {
  const lower = firstMesh.toLowerCase();
  for (const { type, patterns } of TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return type;
      }
    }
  }
  return 'mesh';
}

// ── Derive prefab ID from mesh filenames ────────────────────────────────────

function derivePrefabId(meshes) {
  if (meshes.length === 1) {
    // Single mesh: strip .glb extension
    return meshes[0].replace(/\.glb$/i, '');
  }

  // Multi-mesh: find common prefix
  // e.g., ["jungle_tree_primary.glb", "jungle_tree_secondary.glb"] → "jungle_tree"
  const names = meshes.map(m => m.replace(/\.glb$/i, ''));

  // Strip _primary/_secondary/_N suffixes to find common base
  const bases = names.map(n => {
    return n
      .replace(/_primary(?:_\d+)?$/, '')
      .replace(/_secondary(?:_\d+)?$/, '')
      .replace(/_\d+$/, '');
  });

  // Use the shortest common base
  const uniqueBases = [...new Set(bases)];
  if (uniqueBases.length === 1) {
    return uniqueBases[0];
  }

  // Fallback: use first mesh name
  return names[0];
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Discover all levels
  const levels = fs.readdirSync(levelsDir).filter(d => {
    const placementsPath = path.join(levelsDir, d, 'placements.json');
    return fs.existsSync(placementsPath);
  });

  console.log(`Found ${levels.length} levels with placements.json`);

  // ── Phase 1: Collect all unique mesh combos ─────────────────────────────
  // Key: JSON-serialized meshes array → { meshes, inferredType, count, levels }
  const meshComboMap = new Map();
  const allLevelData = new Map(); // level → parsed placements data

  for (const level of levels) {
    const placementsPath = path.join(levelsDir, level, 'placements.json');
    const data = JSON.parse(fs.readFileSync(placementsPath, 'utf-8'));

    // Skip if already v2
    if (data.version === 2) {
      console.log(`  ${level}: already v2, skipping`);
      continue;
    }

    if (!data.objects || !Array.isArray(data.objects)) {
      console.log(`  ${level}: no objects array, skipping`);
      continue;
    }

    allLevelData.set(level, data);

    for (const obj of data.objects) {
      const key = JSON.stringify(obj.meshes);
      if (!meshComboMap.has(key)) {
        meshComboMap.set(key, {
          meshes: obj.meshes,
          inferredType: inferType(obj.meshes[0] || ''),
          count: 0,
          levels: new Set(),
        });
      }
      const entry = meshComboMap.get(key);
      entry.count++;
      entry.levels.add(level);
    }
  }

  console.log(`\nFound ${meshComboMap.size} unique mesh combinations across ${allLevelData.size} levels`);

  // ── Phase 2: Generate prefab IDs ────────────────────────────────────────
  const prefabs = {};
  const meshesToPrefabId = new Map(); // JSON meshes key → prefab ID

  // Track used IDs to handle collisions
  const usedIds = new Set();

  for (const [key, entry] of meshComboMap) {
    let prefabId = derivePrefabId(entry.meshes);

    // Handle ID collisions (different mesh combos with same derived ID)
    if (usedIds.has(prefabId)) {
      let i = 2;
      while (usedIds.has(`${prefabId}_v${i}`)) i++;
      prefabId = `${prefabId}_v${i}`;
    }
    usedIds.add(prefabId);
    meshesToPrefabId.set(key, prefabId);

    const prefabDef = {
      type: entry.inferredType,
      meshes: entry.meshes,
    };

    prefabs[prefabId] = prefabDef;
  }

  // ── Phase 3: Write prefabs.json ─────────────────────────────────────────
  const prefabsData = {
    version: 1,
    prefabs,
  };

  fs.writeFileSync(prefabsPath, JSON.stringify(prefabsData, null, 2));
  console.log(`\nWrote ${Object.keys(prefabs).length} prefabs to ${path.relative(process.cwd(), prefabsPath)}`);

  // ── Phase 4: Convert each placements.json to v2 ────────────────────────
  let totalConverted = 0;

  for (const [level, data] of allLevelData) {
    const placementsPath = path.join(levelsDir, level, 'placements.json');
    const backupPath = path.join(levelsDir, level, 'placements.v1.json');

    // Backup original
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    // Convert objects
    const v2Objects = data.objects.map(obj => {
      const key = JSON.stringify(obj.meshes);
      const prefabId = meshesToPrefabId.get(key);

      const v2Obj = {
        id: obj.id,
        prefab: prefabId || 'unknown',
        position: obj.position,
        rotation: obj.rotation,
        scale: obj.scale,
      };

      // Only include overrides if properties is non-empty
      if (obj.properties && Object.keys(obj.properties).length > 0) {
        v2Obj.overrides = obj.properties;
      }

      return v2Obj;
    });

    const v2Data = {
      version: 2,
      objects: v2Objects,
    };

    fs.writeFileSync(placementsPath, JSON.stringify(v2Data, null, 2));
    totalConverted += v2Objects.length;
    console.log(`  ${level}: converted ${v2Objects.length} objects`);
  }

  console.log(`\nDone! Converted ${totalConverted} objects across ${allLevelData.size} levels`);

  // ── Stats ──────────────────────────────────────────────────────────────
  const typeCounts = {};
  for (const prefab of Object.values(prefabs)) {
    typeCounts[prefab.type] = (typeCounts[prefab.type] || 0) + 1;
  }
  console.log('\nPrefab type distribution:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

main();
