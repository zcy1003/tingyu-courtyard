import * as T from 'three';

// Shared low-poly bevels: real rim highlights without a unique mesh per paving stone.
export function pavingStone(variant: number) {
  const c = .065 + variant * .012;
  const ring = [[-.5 + c, -.5], [.5 - c * .7, -.5], [.5, -.5 + c], [.5, .5 - c * 1.2], [.5 - c, .5], [-.5 + c * .8, .5], [-.5, .5 - c], [-.5, -.5 + c * .7]];
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (const [scale, y] of [[1, -.5], [1, .1], [.964, .5]]) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!;
      const x = p[0]! * scale!, z = p[1]! * scale!;
      positions.push(x, y!, z); uv.push(x + .5, z + .5);
    }
  }
  positions.push(0, .5, 0); uv.push(.5, .5);
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    for (let row = 0; row < 2; row++) {
      const a = row * 8 + i, b = row * 8 + j;
      indices.push(a, a + 8, b, b, a + 8, b + 8);
    }
    indices.push(24, 16 + j, 16 + i);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function vessel(wide = false) {
  const profile = wide
    ? [[.22, 0], [.29, .015], [.34, .05], [.41, .14], [.445, .26], [.43, .4], [.39, .50], [.33, .555], [.33, .595], [.35, .61], [.35, .63], [.32, .642], [.294, .63], [.292, .60], [.30, .57], [.32, .53], [.36, .48], [.37, .38]]
    : [[.19, 0], [.22, .01], [.24, .04], [.30, .12], [.35, .25], [.36, .36], [.33, .47], [.285, .54], [.285, .59], [.30, .60], [.305, .625], [.29, .64], [.263, .635], [.258, .61], [.26, .56], [.28, .52], [.30, .47]];
  const points = new T.CatmullRomCurve3(profile.map(p => new T.Vector3(p[0]!, p[1]!, 0))).getPoints(48);
  return new T.LatheGeometry(points.map(p => new T.Vector2(p.x, p.y)), 28);
}

export function lanternShell() {
  const pts: T.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (.12 + .76 * i / 16);
    pts.push(new T.Vector2(Math.sin(a) * .30, Math.cos(a) * .405));
  }
  pts.reverse();
  const geometry = new T.LatheGeometry(pts, 32);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), a = Math.atan2(x, z);
    const fold = 1 + Math.cos(a * 16) * .017;
    positions.setXYZ(i, x * fold, positions.getY(i), z * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function lilyLeaf() {
  const shape = new T.Shape();
  shape.moveTo(0, 0); shape.lineTo(.80, -.20);
  shape.absarc(0, 0, 1, -.24, Math.PI * 2 - .03, false); shape.lineTo(0, 0);
  const geometry = new T.ShapeGeometry(shape, 18);
  geometry.rotateX(-Math.PI / 2); return geometry;
}

// A gently cupped spray keeps foliage from reading as intersecting flat cards.
export function foliageSpray(drooping = false) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const columns = 3, rows = drooping ? 3 : 2;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const u = i / columns, v = j / rows;
    const taper = drooping ? .58 + v * .42 : .79 + Math.sin(v * Math.PI) * .21;
    const x = (u - .5) * taper;
    const y = v - .5;
    const z = drooping
      ? Math.sin((1 - v) * Math.PI * .7) * .20 + x * x * .30
      : Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .22;
    positions.push(x, y, z); uv.push(u, v);
    if (i < columns && j < rows) {
      const k = j * (columns + 1) + i;
      indices.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function mossPatch() {
  const positions = [0, .014, 0], indices: number[] = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, r = .86 + Math.sin(i * 2.4) * .14;
    positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    indices.push(0, (i + 1) % 14 + 1, i + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
