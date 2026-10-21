export const GROUND = 1.2;
export const WATER = .57;
export const WORLD_HALF = 28;
export const RIVER_HALF = 3.1;
export const SPAWN = { x: -13, y: GROUND + .06, z: -12.5 };
export const LOCATIONS = [
  { id: 'A', name: '听雨小院', note: '灯下煮茶，檐前听雨', x: -13, z: -14, radius: 9 },
  { id: 'B', name: '青石雨巷', note: '一盏街灯，照亮巷口转角', x: -13, z: -3, radius: 6 },
  { id: 'C', name: '灯下茶铺', note: '半卷竹帘，一室茶香', x: -10, z: 6, radius: 6 },
  { id: 'D', name: '望溪石桥', note: '桥下流光，随雨摇曳', x: 8, z: -3, radius: 5 },
  { id: 'E', name: '竹影水街', note: '竹影与窗灯，落在同一条街', x: 15, z: 5, radius: 9 },
  { id: 'F', name: '归云木桥', note: '沿着暖灯，慢慢回家', x: 8, z: 18, radius: 5 },
  { id: 'G', name: '柳岸回廊', note: '雨落石阶，柳梢拂水', x: -1, z: 18, radius: 7 },
] as const;
export const WAYPOINTS: Record<string, [number, number]> = {
  A: [-13, -12.5], A_GATE: [-13, -7], B: [-13, -3], C: [-10, 6],
  D_WEST: [2.5, -3], D: [8, -3], D_EAST: [13.5, -3], E: [15, 5],
  F_EAST: [13.5, 18], F: [8, 18], F_WEST: [2.5, 18], G: [-1, 18],
  B_SOUTH: [-10, 18], H: [15, -22], I: [-24, 20], I_TURN: [-12,20], C_NORTH: [-10, -3],
};
export const PATHS = [
  ['A', 'A_GATE', 'B'], ['B', 'D_WEST'], ['D_EAST', 'E', 'F_EAST'],
  ['F_WEST', 'G', 'B_SOUTH', 'C', 'C_NORTH', 'B'], ['D_EAST', 'H'], ['B_SOUTH', 'I_TURN', 'I'],
];
export type House = { x: number; z: number; w: number; d: number; yaw: number; name: string; open: boolean; floors: number };
export const HOUSES: House[] = [
  { x: -13, z: -21, w: 11, d: 5.5, yaw: 0, name: '听 雨 堂', open: true, floors: 1 },
  { x: -21, z: -13.5, w: 7, d: 3.6, yaw: Math.PI / 2, name: '竹 影', open: false, floors: 1 },
  { x: -5, z: -13.5, w: 7, d: 3.6, yaw: -Math.PI / 2, name: '云 间', open: false, floors: 1 },
  { x: -18, z: 3.6, w: 8.5, d: 5.2, yaw: Math.PI, name: '春 和 茶 铺', open: true, floors: 2 },
  { x: -18, z: 14, w: 8, d: 5.6, yaw: Math.PI / 2, name: '雨 巷 杂 货', open: false, floors: 1 },
  { x: -4.2, z: 7.5, w: 7.4, d: 5.1, yaw: Math.PI, name: '一 叶 茶', open: true, floors: 1 },
  { x: -5, z: 24, w: 12, d: 3.6, yaw: Math.PI, name: '枕 溪', open: false, floors: 2 },
  { x: 21.5, z: -15, w: 9, d: 5.8, yaw: -Math.PI / 2, name: '灯 火 人 家', open: false, floors: 2 },
  { x: 22, z: 5, w: 9, d: 5.8, yaw: -Math.PI / 2, name: '竹 里 书 屋', open: true, floors: 1 },
  { x: 20.5, z: -24.5, w: 10, d: 3, yaw: 0, name: '见 山', open: false, floors: 1 },
];
export function riverX(_z: number): number { return 8; }
export function rng(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
