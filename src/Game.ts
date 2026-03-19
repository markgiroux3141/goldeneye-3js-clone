import * as THREE from 'three';
import type RAPIER_API from '@dimforge/rapier3d-compat';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { AssetLoader } from './core/AssetLoader';
import { World } from './core/World';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { ColliderFactory } from './physics/ColliderFactory';
import { FPSCamera } from './player/FPSCamera';
import { PlayerController } from './player/PlayerController';
import { LevelLoader } from './world/LevelLoader';
import { setupLighting } from './world/Lighting';
import { loadStarterRoomMaterials } from './world/StarterRoomMaterials';
import { WeaponSystem } from './weapons/WeaponSystem';
import { PISTOL, RCP90, AR33, KF7 } from './weapons/WeaponConfig';
import { GamepadManager } from './core/GamepadManager';
import { N64GraphicsSystem } from './n64/N64GraphicsSystem';
import { N64SettingsUI } from './n64/N64SettingsUI';
import { DecalFixer } from './tools/DecalFixer';
import type { DecalOverrides } from './tools/DecalFixer';
import { DecalTaggingMode } from './tools/DecalTaggingMode';
import { AudioManager } from './audio/AudioManager';
import { DoorPlacer } from './tools/DoorPlacer';
import type { DoorConfig } from './entities/DoorEntity';
import { createDoorSpawner } from './entities/spawners/DoorSpawner';
import { createPropSpawner } from './entities/spawners/PropSpawner';
import { createConsoleSpawner } from './entities/spawners/ConsoleSpawner';
import { createSecuritySpawner } from './entities/spawners/SecuritySpawner';
import { FreeFlyCamera } from './editor/FreeFlyCamera';
import { PlacementSystem } from './editor/PlacementSystem';
import { EditorUI } from './editor/EditorUI';
import { registerDefinitions, getDefinition, autoSave, autoLoad, fetchLevelData } from './editor/LevelData';
import { DOOR_DEFINITIONS } from './editor/definitions/DoorDefinitions';
import { PROP_DEFINITIONS } from './editor/definitions/PropDefinitions';
import { CONSOLE_DEFINITIONS } from './editor/definitions/ConsoleDefinitions';
import { SECURITY_DEFINITIONS } from './editor/definitions/SecurityDefinitions';
import { ObjectReplaceSystem } from './editor/ObjectReplaceSystem';
import { ObjectReplaceUI } from './editor/ObjectReplaceUI';
import { getLevelConfig, getDoorScale, type LevelConfig, type LevelType } from './levels/LevelRegistry';
import { bakeVertexColors } from './world/VertexColorBaker';
export type { LevelType } from './levels/LevelRegistry';

export class Game {
  private engine!: Engine;
  private gameLoop!: GameLoop;
  private inputManager!: InputManager;
  private physicsWorld!: PhysicsWorld;
  private fpsCamera!: FPSCamera;
  private playerController!: PlayerController;
  private weaponSystem!: WeaponSystem;
  private gamepadManager!: GamepadManager;
  private n64System!: N64GraphicsSystem;
  private n64UI!: N64SettingsUI;
  private world!: World;
  private debugEl: HTMLElement | null = null;
  private bgMusic: HTMLAudioElement | null = null;

  private freeFlyCamera!: FreeFlyCamera;
  private placementSystem!: PlacementSystem;
  private editorUI!: EditorUI;
  private objectReplaceSystem!: ObjectReplaceSystem;
  private objectReplaceUI!: ObjectReplaceUI;

  private readonly levelConfig: LevelConfig;
  private levelData: import('./editor/LevelData').LevelData | null = null;

  constructor(
    private RAPIER: typeof RAPIER_API,
    private levelType: LevelType = 'procedural',
    private mode: 'gameplay' | 'editor' | 'object-replace' = 'gameplay'
  ) {
    this.levelConfig = getLevelConfig(this.levelType)!;
  }

  private get spawn(): { x: number; y: number; z: number } {
    return this.levelData?.spawn ?? this.levelConfig.spawn;
  }

  async init(): Promise<void> {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const overlay = document.getElementById('overlay')!;

    this.engine = new Engine(canvas);
    this.inputManager = new InputManager(canvas);
    this.physicsWorld = new PhysicsWorld(this.RAPIER);

    const colliderFactory = new ColliderFactory(this.physicsWorld, this.RAPIER);
    const assetLoader = new AssetLoader();

    const levelLoader = new LevelLoader(
      this.engine,
      this.physicsWorld,
      colliderFactory,
      assetLoader
    );

    setupLighting(this.engine.scene);

    // Fetch level data (spawn, doors, fog, etc.) once for both editor and gameplay
    this.levelData = await fetchLevelData(this.levelType);

    // N64-authentic distance fog — JSON > LevelRegistry > default
    const jsonFog = this.levelData?.fog;
    if (jsonFog) {
      const c = jsonFog.color;
      const color = new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
      this.engine.scene.fog = new THREE.Fog(color, jsonFog.near, jsonFog.far);
      this.engine.scene.background = color;
    } else {
      const fogCfg = this.levelConfig.fog ?? { color: 0x8090a0, near: 30, far: 120 };
      this.engine.scene.fog = new THREE.Fog(fogCfg.color, fogCfg.near, fogCfg.far);
      this.engine.scene.background = new THREE.Color(fogCfg.color);
    }

    if (this.mode === 'editor') {
      await this.initEditor(canvas, overlay, levelLoader, colliderFactory, assetLoader);
    } else if (this.mode === 'object-replace') {
      await this.initObjectReplace(canvas, overlay, levelLoader, colliderFactory, assetLoader);
    } else {
      await this.initGameplay(canvas, overlay, levelLoader, colliderFactory, assetLoader);
    }
  }

  // ── Editor mode initialization ──────────────────────────────────

  private async initEditor(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    levelLoader: LevelLoader,
    colliderFactory: ColliderFactory,
    assetLoader: AssetLoader
  ): Promise<void> {
    // Load level geometry (same as gameplay)
    await this.loadLevelGeometry(levelLoader, colliderFactory, assetLoader);

    // Hide the click-to-play overlay, show editor banner instead
    overlay.innerHTML = '<h1>Level Editor</h1><p>Right-click drag to look · WASD to fly · Scroll to change speed</p>';
    overlay.addEventListener('click', () => overlay.classList.add('hidden'));

    // Audio manager (needed for door spawning)
    const audioManager = new AudioManager();

    // World (entity management, doors — no player spawned)
    this.world = new World(this.engine.scene, this.physicsWorld, this.RAPIER, audioManager, assetLoader);

    // Preload door models
    await this.world.modelCache.preload([
      '/models/doors/grey-swinging-door.glb',
      '/models/doors/bathroom-door.glb',
      '/models/doors/brown-sliding-door.glb',
    ]);

    // Register placeable definitions
    registerDefinitions([...DOOR_DEFINITIONS, ...PROP_DEFINITIONS, ...CONSOLE_DEFINITIONS, ...SECURITY_DEFINITIONS]);

    // Free-fly camera
    this.freeFlyCamera = new FreeFlyCamera(this.engine.camera, canvas, this.inputManager);
    // Start at a reasonable position
    this.freeFlyCamera.setPosition(this.spawn.x, this.spawn.y + 1, this.spawn.z);

    // Placement system
    const doorScale = getDoorScale(this.levelConfig);
    this.placementSystem = new PlacementSystem(
      this.engine.scene, this.engine.camera, canvas,
      this.world, assetLoader, doorScale
    );

    // Auto-save on any data change (debounced)
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    this.placementSystem.onDataChanged = () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSave(this.levelType, this.placementSystem.objects, this.spawn);
      }, 1000);
    };

    // Auto-load previously saved editor state
    const saved = autoLoad(this.levelType);
    if (saved && saved.objects.length > 0) {
      await this.placementSystem.loadObjects(saved.objects, getDefinition);
      console.log(`[Editor] Auto-loaded ${saved.objects.length} objects from localStorage`);
    }

    // Decal tagging mode
    const decalTagging = new DecalTaggingMode(
      this.engine.scene, this.engine.camera, canvas, this.levelType
    );

    // Editor UI panel
    this.editorUI = new EditorUI(this.placementSystem, this.freeFlyCamera, this.levelType, this.spawn, decalTagging);

    // N64 graphics (optional visual preview — no weapon scene in editor)
    const dummyWeaponScene = new THREE.Scene();
    const dummyWeaponCamera = new THREE.PerspectiveCamera();
    this.n64System = new N64GraphicsSystem(this.engine, dummyWeaponScene, dummyWeaponCamera);
    this.n64UI = new N64SettingsUI(this.n64System);

    // Editor game loop
    this.gameLoop = new GameLoop(
      (dt) => {
        this.freeFlyCamera.update(dt);
        this.placementSystem.update();
        this.n64System.update(dt);
        this.editorUI.updateStatus();
        // No physics stepping, no world.update()
      },
      () => {
        if (this.n64System.isEnabled()) {
          this.n64System.render();
        } else {
          this.engine.render();
        }
      }
    );
  }

  // ── Object Replace mode initialization ─────────────────────────

  private async initObjectReplace(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    levelLoader: LevelLoader,
    colliderFactory: ColliderFactory,
    assetLoader: AssetLoader
  ): Promise<void> {
    // Load level geometry (same as gameplay/editor)
    await this.loadLevelGeometry(levelLoader, colliderFactory, assetLoader);

    // Hide click-to-play overlay, show object replace banner
    overlay.innerHTML = '<h1>Object Replace</h1><p>Load a GLB · Click objects · Assign types</p>';
    overlay.addEventListener('click', () => overlay.classList.add('hidden'));

    // Register placeable definitions (doors, props, consoles, security)
    registerDefinitions([...DOOR_DEFINITIONS, ...PROP_DEFINITIONS, ...CONSOLE_DEFINITIONS, ...SECURITY_DEFINITIONS]);

    // Free-fly camera
    this.freeFlyCamera = new FreeFlyCamera(this.engine.camera, canvas, this.inputManager);
    this.freeFlyCamera.setPosition(this.spawn.x, this.spawn.y + 1, this.spawn.z);

    // Object Replace system
    this.objectReplaceSystem = new ObjectReplaceSystem(
      this.engine.scene,
      this.engine.camera,
      canvas,
      this.levelConfig.modelScale ?? 1,
      assetLoader
    );

    // Object Replace UI
    this.objectReplaceUI = new ObjectReplaceUI(
      this.objectReplaceSystem,
      this.freeFlyCamera,
      this.levelType,
      this.spawn
    );

    // N64 graphics (optional visual preview)
    const dummyWeaponScene = new THREE.Scene();
    const dummyWeaponCamera = new THREE.PerspectiveCamera();
    this.n64System = new N64GraphicsSystem(this.engine, dummyWeaponScene, dummyWeaponCamera);
    this.n64UI = new N64SettingsUI(this.n64System);

    // Game loop
    this.gameLoop = new GameLoop(
      (dt) => {
        this.freeFlyCamera.update(dt);
        this.objectReplaceSystem.update();
        this.n64System.update(dt);
        this.objectReplaceUI.updateStatus();
      },
      () => {
        if (this.n64System.isEnabled()) {
          this.n64System.render();
        } else {
          this.engine.render();
        }
      }
    );
  }

  // ── Gameplay mode initialization ────────────────────────────────

  private async initGameplay(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    levelLoader: LevelLoader,
    colliderFactory: ColliderFactory,
    assetLoader: AssetLoader
  ): Promise<void> {
    const doorScale = getDoorScale(this.levelConfig);
    const modelScale = this.levelConfig.modelScale ?? 1;

    this.fpsCamera = new FPSCamera(this.engine.camera, canvas);

    // Handle pointer lock changes (UI responsibility)
    this.fpsCamera.onLockChange = (locked) => {
      if (locked) {
        overlay.classList.add('hidden');
      } else {
        overlay.classList.remove('hidden');
      }
    };

    this.playerController = new PlayerController(
      this.physicsWorld,
      this.fpsCamera,
      this.inputManager,
      this.engine.camera,
      this.RAPIER
    );

    await this.loadLevelGeometry(levelLoader, colliderFactory, assetLoader);

    this.playerController.teleportTo(this.spawn.x, this.spawn.y, this.spawn.z);

    // Audio manager (shared for doors and other systems)
    const audioManager = new AudioManager();

    // World (entity management, events, damage, doors)
    this.world = new World(this.engine.scene, this.physicsWorld, this.RAPIER, audioManager, assetLoader);
    this.world.spawnPlayer(this.playerController, this.fpsCamera, this.inputManager);

    // Gamepad (N64 controller support)
    this.gamepadManager = new GamepadManager(this.inputManager, this.playerController);

    // Weapon system
    this.weaponSystem = new WeaponSystem(
      this.engine, this.physicsWorld, this.inputManager,
      this.fpsCamera, this.playerController, this.RAPIER,
      [
        { config: PISTOL, magazineAmmo: PISTOL.magazineSize, reserveAmmo: 50 },
        { config: RCP90, magazineAmmo: RCP90.magazineSize, reserveAmmo: 800 },
        { config: AR33, magazineAmmo: AR33.magazineSize, reserveAmmo: 200 },
        { config: KF7, magazineAmmo: KF7.magazineSize, reserveAmmo: 200 },
      ]
    );
    await this.weaponSystem.init(assetLoader);
    this.weaponSystem.setGamepadManager(this.gamepadManager);
    this.weaponSystem.setWorld(this.world);

    // N64 graphics system
    this.n64System = new N64GraphicsSystem(
      this.engine,
      this.weaponSystem.getWeaponScene(),
      this.weaponSystem.getWeaponCamera()
    );
    this.n64UI = new N64SettingsUI(this.n64System);

    // Register object spawners
    this.world.objectRegistry.register('door-', createDoorSpawner(doorScale));
    this.world.objectRegistry.register('prop-', createPropSpawner(modelScale));
    this.world.objectRegistry.register('console-', createConsoleSpawner(modelScale));
    this.world.objectRegistry.register('security-', createSecuritySpawner(modelScale));

    // Spawn level objects via registry (doors, future: consoles, cameras, etc.)
    let spawnedDoors = 0;
    if (this.levelData && this.levelData.objects.length > 0) {
      const entities = await this.world.objectRegistry.spawnAll(this.world, this.levelData.objects);
      spawnedDoors = entities.length;
      console.log(`[Game] Spawned ${entities.length} objects from level-${this.levelType}.json`);
    }

    // Fallback to hardcoded sandbox doors if no level file
    if (spawnedDoors === 0 && this.levelType === 'sandbox') {
      const fallbackDoors: DoorConfig[] = [
        { type: 'swinging', position: { x: -9, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/grey-swinging-door.glb', modelScale: doorScale, hingeSide: 'left', swingDirection: 1 },
        { type: 'swinging', position: { x: -6, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/grey-swinging-door.glb', modelScale: doorScale, hingeSide: 'right', swingDirection: 1 },
        { type: 'swinging', position: { x: -3, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/grey-swinging-door.glb', modelScale: doorScale, hingeSide: 'left', swingDirection: -1 },
        { type: 'swinging', position: { x: 0, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/grey-swinging-door.glb', modelScale: doorScale, hingeSide: 'right', swingDirection: -1 },
        { type: 'sliding', position: { x: 3, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/brown-sliding-door.glb', modelScale: doorScale, slideAxis: 'x', slideDirection: -1 },
        { type: 'sliding', position: { x: 6, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/brown-sliding-door.glb', modelScale: doorScale, slideAxis: 'x', slideDirection: 1 },
        { type: 'swinging', position: { x: 9, y: 0, z: 0 }, rotation: 0, modelUrl: '/models/doors/bathroom-door.glb', modelScale: doorScale, hingeSide: 'left', swingDirection: 1 },
      ];
      await this.world.spawnDoors(fallbackDoors);
    }

    // Preload door models for the placer tool
    await this.world.modelCache.preload([
      '/models/doors/grey-swinging-door.glb',
      '/models/doors/bathroom-door.glb',
      '/models/doors/brown-sliding-door.glb',
    ]);

    // Door placement debug tool
    const doorPlacer = new DoorPlacer(
      this.engine.scene,
      this.engine.camera,
      this.world,
      assetLoader,
      doorScale
    );
    (window as any).__doorPlacer = doorPlacer;

    // Debug position HUD
    const debugEl = document.createElement('div');
    debugEl.style.cssText =
      'position:fixed;top:8px;left:8px;color:#0f0;font:14px monospace;background:rgba(0,0,0,0.5);padding:4px 8px;pointer-events:none;z-index:999';
    document.body.appendChild(debugEl);
    this.debugEl = debugEl;

    this.gameLoop = new GameLoop(
      (dt) => {
        this.gamepadManager.poll(dt);
        if (this.fpsCamera.isLocked || this.gamepadManager.isActive) {
          const mouse = this.inputManager.consumeMouseDelta();
          this.fpsCamera.update(mouse.dx, mouse.dy);

          // Auto-level pitch when player is moving (GoldenEye style)
          if (this.world.player.isMoving()) {
            this.fpsCamera.autoLevel(dt, 2.0);
          }

          this.world.update(dt);
          doorPlacer.update();
          this.weaponSystem.update(dt, mouse.dx);
          this.n64System.update(dt);
          this.physicsWorld.step();
          const p = this.playerController.getPosition();
          debugEl.textContent = `x:${p.x.toFixed(2)} y:${p.y.toFixed(2)} z:${p.z.toFixed(2)}`;
        }
      },
      () => {
        if (this.n64System.isEnabled()) {
          this.n64System.render();
        } else {
          this.engine.render();
          this.weaponSystem.render();
        }
      }
    );

    // Background music
    const musicPath = this.levelData?.music ?? '/music/102 Facility.mp3';
    this.bgMusic = new Audio(musicPath);
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.4;

    // Click-to-play
    overlay.addEventListener('click', () => {
      this.fpsCamera.lock();
      this.bgMusic?.play();
    });

    // F9 toggles door placer
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F9') {
        e.preventDefault();
        doorPlacer.toggle();
      }
    });

    // Dev tools: scan/fix z-fighting decals in GLB levels
    (window as any).__scanDecals = async (offset?: number) => {
      if (!this.levelConfig.modelPath) return;
      const fixer = new DecalFixer();
      await fixer.scan(this.levelConfig.modelPath, this.engine.scene, offset);
    };
    (window as any).__fixDecals = async (offset = 0.5) => {
      if (!this.levelConfig.modelPath) return;
      const fixer = new DecalFixer();
      await fixer.run(this.levelConfig.modelPath, offset);
    };
    (window as any).__clearDebug = () => {
      DecalFixer.clearDebug(this.engine.scene);
    };
  }

  // ── Shared level geometry loading ───────────────────────────────

  private async loadLevelGeometry(
    levelLoader: LevelLoader,
    colliderFactory: ColliderFactory,
    assetLoader: AssetLoader
  ): Promise<void> {
    const config = this.levelConfig;
    if (config.type === 'glb' && config.modelPath) {
      // Load per-level decal overrides (manual include/exclude list)
      let decalOverrides: DecalOverrides | undefined;
      try {
        const resp = await fetch(`/levels/level-${this.levelType}-decals.json`);
        if (resp.ok) {
          const data = await resp.json();
          decalOverrides = {
            include: new Set(data.include ?? []),
            exclude: new Set(data.exclude ?? []),
          };
          console.log(`[Game] Loaded decal overrides: +${decalOverrides.include.size} / -${decalOverrides.exclude.size}`);
        }
      } catch { /* no overrides file — that's fine */ }
      const levelGroup = await levelLoader.loadLevel(config.modelPath, config.modelScale, decalOverrides);
      // Vertex color baking disabled — too slow without BVH acceleration
      // const lights = this.levelData?.lights ?? [];
      // bakeVertexColors(levelGroup, { lights });
      void levelGroup; // keep reference for future baking use

    } else if (config.type === 'sandbox') {
      const planeGeo = new THREE.PlaneGeometry(50, 50);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.receiveShadow = true;
      this.engine.scene.add(plane);
      colliderFactory.createCuboidFromBox({ x: 25, y: 0.01, z: 25 }, { x: 0, y: -0.01, z: 0 });
    } else {
      const materials = await loadStarterRoomMaterials(assetLoader);
      levelLoader.createLevel(materials);
    }
  }

  start(): void {
    this.gameLoop.start();
  }

  // Proper cleanup for all subsystems
  dispose(): void {
    this.debugEl?.remove();
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic = null;
    }
    this.n64UI?.dispose();
    this.n64System?.dispose();
    if (this.mode === 'editor') {
      this.editorUI?.dispose();
      this.placementSystem?.dispose();
      this.freeFlyCamera?.dispose();
    } else if (this.mode === 'object-replace') {
      this.objectReplaceUI?.dispose();
      this.objectReplaceSystem?.dispose();
      this.freeFlyCamera?.dispose();
    } else {
      this.weaponSystem?.dispose();
      this.gamepadManager?.dispose();
      this.fpsCamera?.dispose();
    }
    this.world?.dispose();
    this.gameLoop.stop();
    this.inputManager.dispose();
    this.physicsWorld.dispose();
    this.engine.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.engine.dispose();
  }
}
