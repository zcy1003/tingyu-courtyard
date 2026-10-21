import * as T from 'three';
import { clamp } from './config';
import { RAPIER } from './physics';
import type { Player } from './player';

export class FollowCamera {
  yaw = 0; pitch = .30; distance = 5.3;
  target = new T.Vector3(); actualDistance = 5.3;
  shape = new RAPIER.Ball(.18);
  direction = new T.Vector3(); desired = new T.Vector3();
  constructor(public camera: T.PerspectiveCamera, public player: Player) { this.reset(); }
  rotate(dx: number, dy: number) { this.yaw -= dx * .004; this.pitch = clamp(this.pitch + dy * .003, -.06, 1.05); }
  zoom(delta: number) { this.distance = clamp(this.distance * Math.exp(delta * .0008), 2.2, 7); }
  reset() { this.yaw = 0; this.pitch = .30; this.distance = 5.3; this.target.copy(this.player.position).add(new T.Vector3(0, 1.45, 0)); this.actualDistance = 5.3; this.update(1); }
  update(dt: number) {
    this.desired.copy(this.player.position).add(new T.Vector3(0, 1.45, 0));
    this.target.lerp(this.desired, 1 - Math.exp(-16 * dt));
    this.direction.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const hit = this.player.physics.world.castShape(this.target, { x: 0, y: 0, z: 0, w: 1 }, this.direction, this.shape, .04, this.distance, true, undefined, undefined, this.player.collider);
    const available = hit ? Math.max(.35, hit.time_of_impact - .12) : this.distance;
    this.actualDistance = available < this.actualDistance ? available : T.MathUtils.damp(this.actualDistance, available, 7, dt);
    this.camera.position.copy(this.target).addScaledVector(this.direction, this.actualDistance);
    this.camera.lookAt(this.target); this.player.avatar.root.visible = this.actualDistance > .72;
  }
}
