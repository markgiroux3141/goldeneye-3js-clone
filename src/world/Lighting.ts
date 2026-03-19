import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.6);
  directional.position.set(10, 20, 10);
  directional.target.position.set(0, 0, 0);
  scene.add(directional);
  scene.add(directional.target);
}
