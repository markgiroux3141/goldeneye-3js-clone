import type RAPIER_API from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  public readonly world: RAPIER_API.World;
  public readonly characterController: RAPIER_API.KinematicCharacterController;

  constructor(private RAPIER: typeof RAPIER_API) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    this.characterController = this.world.createCharacterController(0.01);
    this.characterController.enableAutostep(0.4, 0.2, false);
    this.characterController.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.characterController.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    this.characterController.setSlideEnabled(true);
    this.characterController.enableSnapToGround(0.5);
  }

  step(): void {
    this.world.step();
  }

  createFixedBody(
    x: number,
    y: number,
    z: number
  ): RAPIER_API.RigidBody {
    const desc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    return this.world.createRigidBody(desc);
  }

  createKinematicBody(
    x: number,
    y: number,
    z: number
  ): RAPIER_API.RigidBody {
    const desc = this.RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
    return this.world.createRigidBody(desc);
  }

  createEnemyCharacterController(): RAPIER_API.KinematicCharacterController {
    const c = this.world.createCharacterController(0.01);
    c.enableAutostep(0.3, 0.15, false);
    c.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    c.setSlideEnabled(true);
    c.enableSnapToGround(0.3);
    return c;
  }

  // F13: Free character controller before world
  dispose(): void {
    this.characterController.free();
    this.world.free();
  }
}
