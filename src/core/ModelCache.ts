import * as THREE from 'three';
import type { AssetLoader } from './AssetLoader';

export class ModelCache {
  private cache = new Map<string, THREE.Group>();

  constructor(private assetLoader: AssetLoader) {}

  async preload(urls: string[]): Promise<void> {
    const unique = [...new Set(urls)];
    await Promise.all(
      unique.map(async (url) => {
        if (this.cache.has(url)) return;
        const group = await this.assetLoader.loadGLTF(url);
        this.cache.set(url, group);
      })
    );
  }

  clone(url: string): THREE.Group {
    const cached = this.cache.get(url);
    if (!cached) throw new Error(`Model not preloaded: ${url}`);
    return cached.clone();
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  clear(): void {
    this.cache.clear();
  }
}
