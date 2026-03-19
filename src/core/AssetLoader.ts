import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
  private gltfLoader = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader();

  async loadGLTF(url: string): Promise<THREE.Group> {
    const gltf = await this.gltfLoader.loadAsync(url);
    return gltf.scene;
  }

  async loadTexture(url: string): Promise<THREE.Texture> {
    return this.textureLoader.loadAsync(url);
  }
}
