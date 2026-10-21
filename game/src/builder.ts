import * as T from 'three';
import type { Physics } from './physics';

type Batch = { geometry: T.BufferGeometry; material: T.Material; matrices: T.Matrix4[]; shadow: boolean };
export class Builder {
  frame = new T.Matrix4();
  batches = new Map<string, Batch>();
  inkPositions: number[] = [];
  boxGeo = new T.BoxGeometry(1, 1, 1);
  sphereGeo = new T.IcosahedronGeometry(1, 2);
  smallSphereGeo = new T.IcosahedronGeometry(1, 1);
  cylinderGeo = new T.CylinderGeometry(1, 1, 1, 10);
  coneGeo = new T.ConeGeometry(1, 1, 8);
  leafGeo: T.BufferGeometry;
  tileGeo: T.BufferGeometry;
  constructor(public scene: T.Scene, public physics: Physics) {
    this.leafGeo = new T.BufferGeometry();
    const lv: number[] = [], li: number[] = [];
    for (let j = 0; j <= 5; j++) { const t = j / 5, w = Math.sin(t * Math.PI) * .11; lv.push(-w, Math.sin(t * Math.PI) * .035, t, 0, Math.sin(t * Math.PI) * .065, t, w, Math.sin(t * Math.PI) * .035, t); if (j < 5) { const k = j * 3; li.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5); } }
    this.leafGeo.setAttribute('position', new T.Float32BufferAttribute(lv, 3)); this.leafGeo.setIndex(li); this.leafGeo.computeVertexNormals();
    const tv: number[] = [], ti: number[] = [], tu: number[] = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; tv.push(Math.cos(a) * .132, Math.sin(a) * .061, j - .5); tu.push(i / 8, j); }
    for (let i = 0; i < 8; i++) ti.push(i, i+9, i+1, i+1, i+9, i+10);
    this.tileGeo = new T.BufferGeometry(); this.tileGeo.setAttribute('position',new T.Float32BufferAttribute(tv,3)); this.tileGeo.setAttribute('uv',new T.Float32BufferAttribute(tu,2)); this.tileGeo.setIndex(ti); this.tileGeo.computeVertexNormals();
  }
  transform(x: number, y: number, z: number, yaw: number, fn: () => void) {
    const old = this.frame;
    this.frame = old.clone().multiply(new T.Matrix4().makeRotationY(yaw).setPosition(x, y, z));
    fn(); this.frame = old;
  }
  put(geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, shadow = true) {
    const q = new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz));
    const matrix = this.frame.clone().multiply(new T.Matrix4().compose(new T.Vector3(x, y, z), q, new T.Vector3(sx, sy, sz)));
    const p = new T.Vector3().setFromMatrixPosition(matrix);
    const key = `${geo.uuid}/${mat.uuid}/${Math.floor(p.x / 48)}/${Math.floor(p.z / 48)}/${shadow}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry: geo, material: mat, matrices: [], shadow }; this.batches.set(key, batch); }
    batch.matrices.push(matrix);
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, mat: T.Material, solid = false, ry = 0) {
    this.put(this.boxGeo, mat, x, y, z, w, h, d, 0, ry);
    if ((solid || Math.max(w,h,d)>2) && Math.min(w,h,d)>.1) {
      const matrix=this.frame.clone().multiply(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),ry),new T.Vector3(w,h,d)));
      const edge=new T.EdgesGeometry(this.boxGeo),position=edge.getAttribute('position'),v=new T.Vector3();
      for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i).applyMatrix4(matrix);this.inkPositions.push(v.x,v.y,v.z);}edge.dispose();
    }
    if (solid) {
      const p = new T.Vector3(x, y, z).applyMatrix4(this.frame);
      const yaw = Math.atan2(this.frame.elements[8]!, this.frame.elements[0]!) + ry;
      this.physics.box(p.x, p.y, p.z, w, h, d, yaw);
    }
  }
  ball(x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: T.Material) {
    // Flower centres and recessed tile ends occupy only a few pixels, even nearby.
    const geometry = Math.max(sx, sy, sz) <= .07 ? this.smallSphereGeo : this.sphereGeo;
    this.put(geometry, mat, x, y, z, sx, sy, sz);
  }
  cyl(x: number, y: number, z: number, r: number, h: number, mat: T.Material, ry = 0) { this.put(this.cylinderGeo, mat, x, y, z, r, h, r, 0, ry); }
  beam(a: number[], c: number[], r: number, mat: T.Material) {
    const start = new T.Vector3(...a as [number, number, number]), end = new T.Vector3(...c as [number, number, number]);
    const pos = start.clone().add(end).multiplyScalar(.5);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    const e = new T.Euler().setFromQuaternion(q);
    this.put(this.cylinderGeo, mat, pos.x, pos.y, pos.z, r, start.distanceTo(end), r, e.x, e.y, e.z);
  }
  mesh(geo: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
    const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0); mesh.updateMatrix();
    mesh.matrix.premultiply(this.frame); mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.castShadow = !mat.transparent; mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }
  finish() {
    if(this.inkPositions.length){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(this.inkPositions,3));
      const ink=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#102b38',transparent:true,opacity:.32}));ink.name='Architectural ink contours';this.scene.add(ink);this.inkPositions=[];
    }
    for (const { geometry, material, matrices, shadow } of this.batches.values()) {
      const mesh = new T.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.scene.add(mesh);
    }
    this.batches.clear();
  }
}
