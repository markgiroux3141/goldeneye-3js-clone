import * as THREE from 'three';

export class Engine {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // F18: Clamp pixel ratio to avoid perf bomb on high-DPI
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Shadows disabled — N64 had no real-time shadow mapping
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.15,
      200
    );

    window.addEventListener('resize', this.onResize);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  renderOverlay(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(scene, camera);
    this.renderer.autoClear = true;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
