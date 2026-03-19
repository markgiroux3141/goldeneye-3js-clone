import * as THREE from 'three';
import { AssetLoader } from '../core/AssetLoader';

const MAX_DECALS = 20;
const DECAL_SIZE = 0.12;
const SURFACE_OFFSET = 0.005;
const ATLAS_COLS = 3;
const ATLAS_ROWS = 2;
const ALPHA_THRESHOLD = 180;

const _zAxis = new THREE.Vector3(0, 0, 1);

export class BulletDecalManager {
  private decals: THREE.Mesh[] = [];
  private nextIndex = 0;
  private geometry: THREE.PlaneGeometry | null = null;
  private materials: THREE.MeshLambertMaterial[] = [];

  constructor(private scene: THREE.Scene) {}

  async init(assetLoader: AssetLoader): Promise<void> {
    const tex = await assetLoader.loadTexture('/textures/misc/bullet holes.jpg');
    const canvasTex = this.processTexture(tex);

    this.geometry = new THREE.PlaneGeometry(DECAL_SIZE, DECAL_SIZE);

    for (let i = 0; i < MAX_DECALS; i++) {
      const mat = new THREE.MeshLambertMaterial({
        map: canvasTex.clone(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      });
      this.materials.push(mat);

      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.decals.push(mesh);
    }
  }

  addDecal(point: THREE.Vector3, normal: THREE.Vector3): void {
    const mesh = this.decals[this.nextIndex];
    const mat = this.materials[this.nextIndex];

    // Random bullet hole variant from the 3×2 atlas
    const variant = Math.floor(Math.random() * (ATLAS_COLS * ATLAS_ROWS));
    const col = variant % ATLAS_COLS;
    const row = Math.floor(variant / ATLAS_COLS);

    mat.map!.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_ROWS);
    mat.map!.offset.set(col / ATLAS_COLS, 1 - (row + 1) / ATLAS_ROWS);

    // Position slightly off the surface
    mesh.position.copy(point).addScaledVector(normal, SURFACE_OFFSET);

    // Orient plane to face along surface normal
    mesh.quaternion.setFromUnitVectors(_zAxis, normal);
    // Random rotation for variety
    mesh.rotateZ(Math.random() * Math.PI * 2);

    mesh.visible = true;
    this.nextIndex = (this.nextIndex + 1) % MAX_DECALS;
  }

  dispose(): void {
    for (const mesh of this.decals) {
      this.scene.remove(mesh);
    }
    for (const mat of this.materials) {
      mat.map?.dispose();
      mat.dispose();
    }
    this.geometry?.dispose();
    this.decals.length = 0;
    this.materials.length = 0;
  }

  private processTexture(tex: THREE.Texture): THREE.CanvasTexture {
    const img = tex.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i] > ALPHA_THRESHOLD &&
        data[i + 1] > ALPHA_THRESHOLD &&
        data[i + 2] > ALPHA_THRESHOLD
      ) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const canvasTex = new THREE.CanvasTexture(canvas);
    canvasTex.colorSpace = THREE.SRGBColorSpace;
    canvasTex.wrapS = THREE.ClampToEdgeWrapping;
    canvasTex.wrapT = THREE.ClampToEdgeWrapping;

    // Clean up the original texture
    tex.dispose();

    return canvasTex;
  }
}
