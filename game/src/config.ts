export const GROUND = 1.2;
export const WATER = 0.55;
export const SPAWN = { x: -52, y: GROUND + 0.05, z: -53 };
export const LOCATIONS = [
  { id: 'A', name: '听雨小院', note: '竹影入窗，茶香正好', x: -52, z: -56, radius: 19 },
  { id: 'B', name: '青石巷', note: '一条慢慢醒来的老街', x: -50, z: -17, radius: 18 },
  { id: 'C', name: '榕荫小集', note: '在树下，停一停', x: -24, z: -19, radius: 16 },
  { id: 'D', name: '望溪桥', note: '一桥青山，两岸春色', x: 11, z: -38, radius: 15 },
  { id: 'E', name: '听风竹里', note: '清风过竹，水声入耳', x: 37, z: -4, radius: 22 },
  { id: 'F', name: '归云木桥', note: '沿着水岸，慢慢回家', x: 11, z: 44, radius: 17 },
  { id: 'G', name: '柳岸', note: '水光与柳色相逢', x: -22, z: 44, radius: 18 },
] as const;
export const WAYPOINTS: Record<string, [number, number]> = {
  A: [-52, -56], A_GATE: [-52, -40], B: [-50, -20], C: [-24, -19],
  D_WEST: [-3, -38], D: [11, -38], D_EAST: [25, -38], E: [37, -4],
  F_EAST: [27, 44], F: [11, 44], F_WEST: [-5, 44], G: [-22, 44],
  B_SOUTH: [-48, 25], H: [49, -54], I: [-65, 48],
};
export const PATHS = [
  ['A', 'A_GATE', 'B'], ['B', 'C', 'D_WEST'], ['D_EAST', 'E', 'F_EAST'],
  ['F_WEST', 'G', 'B_SOUTH', 'B'], ['E', 'H'], ['G', 'I'],
];
const riverPoints = [[-90, 5], [-60, 6], [-38, 11], [-5, 12], [26, 10], [44, 11], [90, 4]];
export function riverX(z: number): number {
  for (let i = 1; i < riverPoints.length; i++) {
    const a = riverPoints[i - 1]!, b = riverPoints[i]!;
    if (z <= b[0]!) return a[1]! + (b[1]! - a[1]!) * Math.max(0, (z - a[0]!) / (b[0]! - a[0]!));
  }
  return 4;
}
export function rng(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
