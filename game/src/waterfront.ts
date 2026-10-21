import * as T from 'three';
import { Builder } from './builder';
import type { Materials } from './materials';

export function mooredBoat(b: Builder, m: Materials) {
  const n = 32, positions: number[] = [], uv: number[] = [], indices: number[] = [];
  // Three rings make a hollow, pointed wooden hull instead of a solid ellipsoid.
  for (const [w, y, length] of [[.24, -.13, 1.75], [.71, .33, 2.45], [.62, .28, 2.34]]) {
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      positions.push(Math.sin(a) * w!, y! + Math.abs(Math.cos(a)) ** 8 * .16, Math.cos(a) * length!);
      uv.push(i / n * 3, y! * 3);
      if (positions.length > (n + 1) * 3 && i < n) { const k = positions.length / 3 - 1; indices.push(k, k + 1, k - n - 1, k + 1, k - n, k - n - 1); }
    }
  }
  const hull = new T.BufferGeometry(); hull.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); hull.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); hull.setIndex(indices); hull.computeVertexNormals();
  const hullMat = m.wood.clone(); hullMat.side = T.DoubleSide; b.mesh(hull, hullMat);
  for (let i = 0; i < 9; i++) b.box(0, .04, -1.7 + i * .39, .79, .065, .35, i % 3 ? m.wood : m.woodLight);
  for (const side of [-1, 1]) for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI, c = (i + 1) / 16 * Math.PI;
    b.beam([side * Math.sin(a) * .715, .35 + Math.abs(Math.cos(a)) ** 8 * .16, Math.cos(a) * 2.45], [side * Math.sin(c) * .715, .35 + Math.abs(Math.cos(c)) ** 8 * .16, Math.cos(c) * 2.45], .035, m.woodLight);
  }
  for (const z of [-1.25, 1.2]) b.box(0, .31, z, 1.1, .075, .30, m.wood);
  const canopy = new T.CylinderGeometry(.71, .71, 1.65, 24, 1, true, 0, Math.PI);
  canopy.rotateZ(Math.PI / 2); canopy.rotateY(Math.PI / 2);
  const canvas = m.cream.clone(); canvas.side = T.DoubleSide; b.mesh(canopy, canvas, 0, .46, -.1);
  for (const z of [-.93, -.5, -.1, .31, .72]) for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI, c = (i + 1) / 12 * Math.PI;
    b.beam([Math.cos(a) * .718, .46 + Math.sin(a) * .718, z], [Math.cos(c) * .718, .46 + Math.sin(c) * .718, z], .024, m.wood);
  }
  b.beam([-.6, .45, .9], [.72, .49, 2.25], .026, m.woodLight);
  b.put(b.boxGeo, m.wood, .73, .49, 2.28, .16, .04, .52, 0, .72);
}
