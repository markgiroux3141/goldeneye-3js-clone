import * as THREE from 'three';
import { init, NavMesh, NavMeshQuery } from 'recast-navigation';
import { threeToSoloNavMesh, NavMeshHelper } from '@recast-navigation/three';
import type { SoloNavMeshGeneratorConfig } from 'recast-navigation/generators';

export interface NavPoint {
  x: number;
  y: number;
  z: number;
}

export class NavMeshSystem {
  private navMesh: NavMesh | null = null;
  private query: NavMeshQuery | null = null;
  private debugGroup: THREE.Object3D | null = null;
  private visible = false;

  constructor(private scene: THREE.Scene) {}

  async init(): Promise<void> {
    await init();
    console.log('[NavMesh] WASM initialized');
  }

  async generate(
    levelGroup: THREE.Group,
    config?: Partial<SoloNavMeshGeneratorConfig>
  ): Promise<boolean> {
    const t0 = performance.now();

    // Collect walkable meshes, filtering out decals/secondary (renderOrder === 1)
    const meshes: THREE.Mesh[] = [];
    levelGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.renderOrder === 0) {
        meshes.push(obj);
      }
    });

    if (meshes.length === 0) {
      console.warn('[NavMesh] No meshes found in level group');
      return false;
    }

    console.log(`[NavMesh] Generating from ${meshes.length} meshes...`);

    const navMeshConfig: Partial<SoloNavMeshGeneratorConfig> = {
      cs: 0.05,
      ch: 0.05,
      walkableSlopeAngle: 45,
      walkableHeight: 3,
      walkableClimb: 2,
      walkableRadius: 2,
      maxEdgeLen: 24,
      maxSimplificationError: 1.3,
      minRegionArea: 8,
      mergeRegionArea: 20,
      maxVertsPerPoly: 6,
      detailSampleDist: 6,
      detailSampleMaxError: 1,
      ...config,
    };

    const result = threeToSoloNavMesh(meshes, navMeshConfig);

    if (!result.success) {
      console.error('[NavMesh] Generation failed:', (result as { error?: string }).error);
      return false;
    }

    this.dispose();
    this.navMesh = result.navMesh;
    this.query = new NavMeshQuery(this.navMesh);

    // Create debug visualization
    const helper = new NavMeshHelper(this.navMesh, {
      navMeshMaterial: new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    });
    helper.mesh.frustumCulled = false;
    helper.visible = this.visible;
    this.debugGroup = helper;
    this.scene.add(helper);

    const dt = (performance.now() - t0).toFixed(0);
    console.log(`[NavMesh] Generated in ${dt}ms`);

    return true;
  }

  computePath(start: NavPoint, end: NavPoint): NavPoint[] | null {
    if (!this.query) return null;
    const result = this.query.computePath(start, end, {
      halfExtents: { x: 1, y: 2, z: 1 },
    });
    if (!result.success || result.path.length === 0) return null;
    return result.path;
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.debugGroup) {
      this.debugGroup.visible = this.visible;
    }
    console.log(`[NavMesh] Debug ${this.visible ? 'ON' : 'OFF'}`);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.debugGroup) {
      this.debugGroup.visible = visible;
    }
  }

  getNavMesh(): NavMesh | null {
    return this.navMesh;
  }

  dispose(): void {
    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
      this.debugGroup = null;
    }
    if (this.query) {
      this.query.destroy();
      this.query = null;
    }
    if (this.navMesh) {
      this.navMesh.destroy();
      this.navMesh = null;
    }
  }
}
