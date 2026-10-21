import RAPIER from '@dimforge/rapier3d-compat';
import * as T from 'three';

export class Physics {
  world: RAPIER.World;
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) {
    const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw);
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z).setRotation(q));
  }
  geometry(g: T.BufferGeometry, matrix = new T.Matrix4()) {
    const copy = g.clone().applyMatrix4(matrix);
    const p = copy.getAttribute('position');
    const verts = new Float32Array(p.array);
    const indices = copy.index ? new Uint32Array(copy.index.array) : Uint32Array.from({ length: p.count }, (_, i) => i);
    const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(verts, indices));
    copy.dispose();
    return collider;
  }
  ray(origin: T.Vector3, direction: T.Vector3, maxDistance: number, exclude?: RAPIER.Collider) {
    return this.world.castRay(new RAPIER.Ray(origin, direction), maxDistance, true, undefined, undefined, exclude);
  }
}
export { RAPIER };
