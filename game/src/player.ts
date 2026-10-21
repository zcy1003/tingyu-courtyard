import * as T from 'three';
import { Character } from './character';
import { SPAWN } from './config';
import { Physics, RAPIER } from './physics';

export class Player {
  avatar = new Character();
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  velocity = new T.Vector3();
  vertical = 0;
  speed = 0;
  position = new T.Vector3();
  constructor(public physics: Physics, scene: T.Scene) {
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SPAWN.x, SPAWN.y + .825, SPAWN.z));
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(.545, .28).setFriction(0), this.body);
    this.controller = physics.world.createCharacterController(.018);
    this.controller.enableAutostep(.27, .25, false);
    this.controller.enableSnapToGround(.3);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4);
    this.controller.setMinSlopeSlideAngle(Math.PI / 3);
    scene.add(this.avatar.root); this.avatar.root.rotation.y = Math.PI; this.sync();
  }
  step(dt: number, keys: Set<string>, yaw: number) {
    let forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    let right = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const len = Math.hypot(forward, right); if (len > 1) { forward /= len; right /= len; }
    const rate = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.8 : 2.2;
    const vx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * rate;
    const vz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * rate;
    this.velocity.x = T.MathUtils.damp(this.velocity.x, vx, 14, dt);
    this.velocity.z = T.MathUtils.damp(this.velocity.z, vz, 14, dt);
    this.vertical = this.controller.computedGrounded() ? -1.5 : Math.max(-18, this.vertical - 16 * dt);
    this.controller.computeColliderMovement(this.collider, { x: this.velocity.x * dt, y: this.vertical * dt, z: this.velocity.z * dt });
    const d = this.controller.computedMovement(), p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
    this.speed = Math.hypot(d.x, d.z) / dt;
    if (this.speed > .04 && len > 0) {
      const target = Math.atan2(d.x, d.z);
      const diff = T.MathUtils.euclideanModulo(target - this.avatar.root.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.avatar.root.rotation.y += diff * (1 - Math.exp(-14 * dt));
    }
    if(this.velocity.lengthSq()<.001)this.speed=0;
    if (p.y < -5 || Math.abs(p.x) > 93 || Math.abs(p.z) > 93) this.reset();
  }
  sync() {
    const p = this.body.translation(); this.position.set(p.x, p.y - .825, p.z);
    this.avatar.root.position.copy(this.position); this.avatar.root.position.y += .04;
  }
  teleport(x: number, feetY: number, z: number) {
    const p = { x, y: feetY + .825, z };
    this.body.setTranslation(p, true); this.body.setNextKinematicTranslation(p);
    this.velocity.set(0, 0, 0); this.vertical = 0; this.speed = 0;
    this.physics.world.step(); this.sync();
  }
  reset() { this.teleport(SPAWN.x, SPAWN.y, SPAWN.z); this.avatar.root.rotation.y = Math.PI; }
}
