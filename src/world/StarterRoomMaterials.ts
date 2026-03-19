import * as THREE from 'three';
import { AssetLoader } from '../core/AssetLoader';

export interface StarterRoomMaterials {
  floor: THREE.MeshLambertMaterial;
  wall: THREE.MeshLambertMaterial;
  ramp: THREE.MeshLambertMaterial;
  stair: THREE.MeshLambertMaterial;
}

async function loadMaterial(
  assetLoader: AssetLoader,
  basePath: string,
  repeatX: number,
  repeatY: number
): Promise<THREE.MeshLambertMaterial> {
  const color = await assetLoader.loadTexture(`${basePath}/Color.jpg`);

  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(repeatX, repeatY);

  return new THREE.MeshLambertMaterial({ map: color });
}

export async function loadStarterRoomMaterials(
  assetLoader: AssetLoader
): Promise<StarterRoomMaterials> {
  // Repeat values are tiles-per-meter (geometry UVs are scaled by world size)
  const [floor, wall, ramp, stair] = await Promise.all([
    loadMaterial(assetLoader, '/textures/concrete', 0.2, 0.2),
    loadMaterial(assetLoader, '/textures/brick', 0.25, 0.25),
    loadMaterial(assetLoader, '/textures/metal', 0.5, 0.5),
    loadMaterial(assetLoader, '/textures/wood', 1, 1),
  ]);

  return { floor, wall, ramp, stair };
}
