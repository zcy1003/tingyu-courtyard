import * as T from 'three';
import { rng } from './config';

function canvasTexture(draw: (c: CanvasRenderingContext2D, n: number) => void, size = 256, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!; draw(c, size);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
  return tex;
}

// Periodic, interpolated noise gives broad wear before the tiny surface grain.
// All surfaces are generated locally and repeat without a visible texture seam.
function noise(seed: number, columns: number, rows = columns) {
  const random = rng(seed), grid = Array.from({ length: columns * rows }, () => random());
  return (u: number, v: number) => {
    const x = ((u % 1 + 1) % 1) * columns, y = ((v % 1 + 1) % 1) * rows;
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => grid[(b % rows) * columns + a % columns]!;
    return T.MathUtils.lerp(T.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), sx), T.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy);
  };
}
type SurfacePixel = [number, number, number, number, number];
function surface(sample: (u: number, v: number) => SurfacePixel, size = 256) {
  const pixels = new Float32Array(size * size * 5);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) pixels.set(sample(x / size, y / size), (y * size + x) * 5);
  const channel = (offset: number, color: boolean) => canvasTexture((c, n) => {
    const data = c.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      for (let rgb = 0; rgb < 3; rgb++) data.data[i * 4 + rgb] = color ? pixels[i * 5 + rgb]! : pixels[i * 5 + offset]! * 255;
      data.data[i * 4 + 3] = 255;
    }
    c.putImageData(data, 0, 0);
  }, size, color);
  return { map: channel(0, true), bumpMap: channel(3, false), roughnessMap: channel(4, false) };
}
function plasterTexture() {
  const cloud = noise(29, 5), wash = noise(74, 16), grain = noise(381, 110);
  return surface((u, v) => {
    const a = cloud(u, v) - .5, b = wash(u, v) - .5, fine = grain(u, v) - .5;
    const tone = a * 12 + b * 5 + fine * 4;
    return [237 + tone, 231 + tone, 218 + tone, .5 + b * .13 + fine * .17, .94 + fine * .06];
  });
}
function woodTexture() {
  const cloud = noise(98, 6, 2), grain = noise(340, 95, 5);
  return surface((u, v) => {
    const bend = Math.sin(v * Math.PI * 2) * .006 + Math.sin(v * Math.PI * 6 + u * Math.PI * 2) * .004;
    const lines = Math.sin((u + bend) * Math.PI * 116) * .5 + .5;
    const fine = grain(u, v) - .5, broad = cloud(u, v) - .5;
    const pores = Math.pow(lines, 14), tone = broad * 25 + fine * 7 - pores * 13;
    return [153 + tone, 114 + tone * .8, 78 + tone * .55, .5 + fine * .12 - pores * .22, .77 + broad * .09 + pores * .06];
  }, 512);
}
function stoneTexture(paving = false) {
  const cloud = noise(751, 5), strata = noise(401, 14), grain = noise(223, 115), fine = noise(771, 230);
  return surface((u, v) => {
    const a = cloud(u, v), b = strata(u, v), c = grain(u, v) - .5;
    const wet = T.MathUtils.smoothstep(a * .72 + b * .28, paving ? .46 : .35, paving ? .70 : .69), vein = Math.pow(1 - Math.abs(b - .5) * 2, 18);
    const mossField = cloud(u + .37, v + .19) * .42 + b * .35 + (c + .5) * .23;
    const moss = T.MathUtils.smoothstep(mossField, .63, .77) * .6;
    const tone = (a - .5) * (paving ? 14 : 8) + (b - .5) * (paving ? 18 : 13) + c * 7 + (fine(u, v) - .5) * 2.5 - vein * 3;
    if (paving) {
      // Local damp patches deepen the blue-grey stone while dry areas stay matte.
      // Keep this treatment separate from the lighter bridge and foundation stone.
      return [163 + tone - wet * 32 - moss * 25, 169 + tone - wet * 29 - moss * 7, 168 + tone - wet * 24 - moss * 28,
        .5 + (b - .5) * .18 + c * .22 - vein * .035, .90 - wet * .37 + moss * .05 + c * .04];
    }
    return [172 + tone - wet * 22 - moss * 25, 178 + tone - wet * 20 - moss * 7, 178 + tone - wet * 16 - moss * 28, .5 + (b - .5) * .2 + c * .22 - vein * .035, .84 - wet * .32 + moss * .08 + c * .06];
  }, 512);
}
function roofTexture() {
  const cloud = noise(17, 5), flecks = noise(645, 45), fine = noise(939, 120);
  return surface((u, v) => {
    const broad = cloud(u, v) - .5, grain = flecks(u, v) - .5;
    const wear = (Math.sin(v * Math.PI * 28 + cloud(u, v) * 2) * .5 + .5) * 2;
    const tone = broad * 18 + grain * 9 + wear;
    return [111 + tone, 125 + tone, 132 + tone, .5 + grain * .2 + (fine(u, v) - .5) * .1, .84 + broad * .1 + grain * .06];
  });
}
function ceramicTexture() {
  const cloud = noise(123, 6), glaze = noise(44, 48), fine = noise(4, 140);
  return surface((u, v) => {
    const a = cloud(u, v), b = glaze(u, v), detail = fine(u, v);
    const fleck = T.MathUtils.smoothstep(b * .66 + detail * .34, .56, .75);
    const ring = Math.sin(v * Math.PI * 48) * .008, tone = (a - .5) * 16 + (b - .5) * 11;
    return [91 + tone + fleck * 20, 133 + tone + fleck * 10, 130 + tone - fleck * 3, .5 + (b - .5) * .035 + (detail - .5) * .025 + ring, .34 + b * .14];
  });
}
function groundTexture() {
  const broad = noise(56, 6), moss = noise(130, 36), grain = noise(790, 170);
  return canvasTexture((c, n) => {
    const pixels = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n, a = broad(u, v), b = moss(u, v), tone = (grain(u, v) - .5) * 13;
      const i = (y * n + x) * 4;
      pixels.data[i] = 133 + a * 27 + b * 15 + tone;
      pixels.data[i + 1] = 142 + a * 25 + b * 14 + tone;
      pixels.data[i + 2] = 100 + a * 22 + b * 10 + tone;
      pixels.data[i + 3] = 255;
    }
    c.putImageData(pixels, 0, 0);
  }, 512);
}
type FoliageKind = 'crown' | 'willow' | 'bush' | 'flower' | 'blossom';
function foliageTexture(kind: FoliageKind) {
  return canvasTexture((c, n) => {
    c.scale(n / 256, n / 256); n = 256;
    const random = rng(kind === 'willow' ? 18 : 92);
    const colors = ['#638541', '#78964d', '#8fa75b', '#a4b86a', '#57773c'];
    const leaf = (x: number, y: number, len: number, angle: number) => {
      c.save(); c.translate(x, y); c.rotate(angle);
      const tint = colors[Math.floor(random() * colors.length)]!;
      const fill = c.createLinearGradient(-len * .23, 0, len * .23, 0);
      fill.addColorStop(0, tint); fill.addColorStop(.5, '#a0b467'); fill.addColorStop(.53, tint); fill.addColorStop(1, tint);
      c.fillStyle = fill;
      const width = kind === 'willow' ? .17 : .29;
      c.beginPath(); c.moveTo(0, -len * .5);
      c.bezierCurveTo(len * width, -len * .2, len * width, len * .25, 0, len * .5);
      c.bezierCurveTo(-len * width, len * .25, -len * width, -len * .2, 0, -len * .5); c.fill();
      c.strokeStyle = '#d0d69c66'; c.lineWidth = .65;
      c.beginPath(); c.moveTo(0, -len * .35); c.lineTo(0, len * .4); c.stroke(); c.restore();
    };
    const flower = (x: number, y: number, radius: number, pink: boolean) => {
      for (let j = 0; j < 5; j++) {
        const angle = j / 5 * Math.PI * 2;
        c.fillStyle = pink ? (j % 2 ? '#ecc8c5' : '#f4dad0') : (j % 2 ? '#f7efd7' : '#ece4cc');
        c.beginPath(); c.ellipse(x + Math.cos(angle) * radius * .65, y + Math.sin(angle) * radius * .65, radius * .52, radius * .75, angle, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#c4a056'; c.beginPath(); c.arc(x, y, radius * .28, 0, Math.PI * 2); c.fill();
    };
    if (kind === 'willow') {
      for (let branch = 0; branch < 7; branch++) {
        const x = n * (.15 + branch * .115), end = n * (.7 + random() * .29);
        c.strokeStyle = '#7e8a4f'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 12, end * .5, x - 6, end); c.stroke();
        for (let y = 10; y < end; y += 14) for (const side of [-1, 1]) leaf(x + side * 7 + Math.sin(y * .02) * 4, y, 21 + random() * 8, side * .5);
      }
    } else {
      c.strokeStyle = '#70804a'; c.lineWidth = 1.4;
      for (let i = 0; i < 16; i++) {
        const angle = random() * Math.PI * 2, radius = (.18 + random() * .24) * n;
        c.beginPath(); c.moveTo(n * .5, n * .66); c.quadraticCurveTo(n * .5, n * .45, n * .5 + Math.sin(angle) * radius, n * .5 + Math.cos(angle) * radius); c.stroke();
      }
      const count = kind === 'blossom' ? 80 : 165;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * n * .43;
        leaf(n * .5 + Math.cos(angle) * radius, n * .5 + Math.sin(angle) * radius * (kind === 'bush' || kind === 'flower' ? .8 : 1), 12 + random() * 19, random() * Math.PI * 2);
      }
      if (kind === 'flower' || kind === 'blossom') for (let i = 0; i < (kind === 'blossom' ? 95 : 23); i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * n * .39;
        flower(n * .5 + Math.cos(angle) * radius, n * .5 + Math.sin(angle) * radius * (kind === 'flower' ? .8 : 1), 3.2 + random() * 1.6, kind === 'blossom' || i % 5 === 0);
      }
    }
  }, 512);
}
const rough = (color: T.ColorRepresentation, roughness = .85) => new T.MeshStandardMaterial({ color, roughness });
export function makeMaterials() {
  const wind = { value: 0 };
  const plasterMaps = plasterTexture(), woodMaps = woodTexture(), stoneMaps = stoneTexture(), pavingMaps = stoneTexture(true), roofMaps = roofTexture();
  const wall = new T.MeshStandardMaterial({ ...plasterMaps, color: '#fffdf8', roughness: 1, bumpScale: .012 });
  const wood = new T.MeshStandardMaterial({ ...woodMaps, color: '#ffffff', roughness: 1, bumpScale: .013 });
  const stone = new T.MeshStandardMaterial({ ...stoneMaps, color: '#ffffff', roughness: 1, bumpScale: .025 });
  const leaf = ['#73914e', '#8ca65b', '#a3b96b', '#5b7b42', '#789651'].map(color => new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: .92 }));
  const foliage = (kind: FoliageKind) => {
    const material = new T.MeshStandardMaterial({ map: foliageTexture(kind), color: '#ffffff', alphaTest: .38, alphaToCoverage: true, side: T.DoubleSide, roughness: .92 });
    material.onBeforeCompile = shader => {
      shader.uniforms.townTime = wind; shader.vertexShader = 'uniform float townTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float sway = sin(townTime * 1.25 + instanceMatrix[3].x * .4 + instanceMatrix[3].z * .35);
      transformed.x += sway * .035 * (position.y + .55);
      transformed.z += cos(townTime + instanceMatrix[3].x * .2) * .016;
      #endif`);
    };
    material.customProgramCacheKey = () => 'courtyard-foliage-wind-v2';
    return material;
  };
  return {
    wall, wood, stone, leaf, wind,
    crown: foliage('crown'), willow: foliage('willow'), bush: foliage('bush'), flowerBush: foliage('flower'), blossom: foliage('blossom'),
    plaster: new T.MeshStandardMaterial({ ...plasterMaps, color: '#e3ddcf', roughness: 1, bumpScale: .014 }),
    darkWood: new T.MeshStandardMaterial({ ...woodMaps, color: '#b4a18a', roughness: 1, bumpScale: .013 }),
    woodLight: new T.MeshStandardMaterial({ ...woodMaps, color: '#fff0ce', roughness: 1, bumpScale: .013 }),
    roof: ['#ffffff', '#f5f7f8', '#e9edef', '#f9f7f2'].map(color => new T.MeshStandardMaterial({ ...roofMaps, color, roughness: 1, bumpScale: .014, side: T.DoubleSide })),
    roofEdge: new T.MeshStandardMaterial({ ...roofMaps, color: '#ffffff', roughness: 1, bumpScale: .016 }),
    mortar: rough('#8a9281', .96),
    paving: ['#f4f3e9', '#dfe7e2', '#fff8e8', '#d5e0dc', '#ebebde'].map((color, i) => {
      // The five paver families vary their UV phase as well as their tint.
      const maps = { map: pavingMaps.map.clone(), bumpMap: pavingMaps.bumpMap.clone(), roughnessMap: pavingMaps.roughnessMap.clone() };
      for (const texture of Object.values(maps)) { texture.offset.set((i * .29) % 1, (i * .43) % 1); texture.needsUpdate = true; }
      return new T.MeshStandardMaterial({ ...maps, color, roughness: 1 - i % 3 * .025, bumpScale: .021 });
    }),
    grass: rough('#8b9d69'), ground: new T.MeshStandardMaterial({ color: '#ffffff', map: groundTexture(), roughness: 1 }), soil: rough('#85765d', 1),
    red: rough('#c87650', .84), gold: rough('#c9a365', .72),
    ceramic: new T.MeshPhysicalMaterial({ ...ceramicTexture(), color: '#ffffff', roughness: 1, bumpScale: .008, clearcoat: .28, clearcoatRoughness: .3 }),
    cream: rough('#e8dfc2'), pink: rough('#e7bdba'), flower: rough('#f2ebd6'),
    warm: new T.MeshStandardMaterial({ color: '#f4cb8a', emissive: '#ffd493', emissiveIntensity: .35, roughness: .8 }),
    glass: new T.MeshStandardMaterial({ color: '#b8c8bc', transparent: true, opacity: .15, roughness: .3, depthWrite: false }),
    black: rough('#35433c'),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;
export function labelTexture(text: string, background = '#ede0b9', foreground = '#544735') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const c = canvas.getContext('2d')!;
  c.fillStyle = background; c.fillRect(0, 0, 512, 160);
  c.strokeStyle = foreground; c.lineWidth = 3; c.strokeRect(9, 9, 494, 142);
  c.fillStyle = foreground; c.font = '88px "KaiTi", "STKaiti", "SimSun", serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 83);
  const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace; return tex;
}
