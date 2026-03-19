import * as THREE from 'three';
import { crtVertexShader, crtFragmentShader } from './CRTShaders';

export class CRTPostProcess {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(sourceResolution: THREE.Vector2) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: crtVertexShader,
      fragmentShader: crtFragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_sourceResolution: { value: sourceResolution.clone() },
        u_time: { value: 0 },
        u_crt: { value: 1.0 },
        u_scanlines: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const geom = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geom, this.material);
    this.scene.add(this.mesh);
  }

  setTexture(texture: THREE.Texture): void {
    this.material.uniforms.tDiffuse.value = texture;
  }

  setTime(time: number): void {
    this.material.uniforms.u_time.value = time;
  }

  setResolution(width: number, height: number): void {
    this.material.uniforms.u_resolution.value.set(width, height);
  }

  setSourceResolution(width: number, height: number): void {
    this.material.uniforms.u_sourceResolution.value.set(width, height);
  }

  setEffect(name: string, enabled: boolean): void {
    const val = enabled ? 1.0 : 0.0;
    const u = this.material.uniforms;
    if (name === 'crt') u.u_crt.value = val;
    else if (name === 'scanlines') u.u_scanlines.value = val;
  }

  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
