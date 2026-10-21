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
export const toonGradient = new T.DataTexture(new Uint8Array([75, 132, 192, 245]), 4, 1, T.RedFormat);
toonGradient.minFilter = toonGradient.magFilter = T.NearestFilter; toonGradient.needsUpdate = true;
const toon = (color: T.ColorRepresentation) => new T.MeshToonMaterial({ color, gradientMap: toonGradient });
export function makeMaterials() {
  const wind = { value: 0 }, stoneMaps = stoneTexture(true);
  // Fine noise no longer dominates the palette: the lighting and silhouette do the work.
  const wall = toon('#d0cbbb'), wood = toon('#72503e'), stone = toon('#91a4aa');
  const leaf = ['#56846a', '#6e9676', '#839c7b', '#396653', '#4d7965'].map(color => {
    const material = toon(color); material.side = T.DoubleSide; return material;
  });
  const foliage = (kind: FoliageKind) => {
    const material = new T.MeshToonMaterial({ map: foliageTexture(kind), color: '#b3cab3', gradientMap: toonGradient, alphaTest: .4, side: T.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.townTime = wind; shader.vertexShader = 'uniform float townTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      transformed.x += sin(townTime + instanceMatrix[3].x * .4 + instanceMatrix[3].z * .35) * .024 * (position.y + .55);
      #endif`);
    };
    material.customProgramCacheKey = () => 'rain-night-foliage'; return material;
  };
  const red = toon('#a35042');
  const lantern = new T.MeshBasicMaterial({ color: new T.Color(.80,.055,.025) });
  const lanternRib = new T.MeshBasicMaterial({ color: new T.Color(.24,.066,.027) });
  const paperLantern = new T.MeshBasicMaterial({ color: new T.Color(1.15,.70,.28) });
  return {
    wall, wood, stone, leaf, wind, red, lantern, lanternRib, paperLantern,
    crown: foliage('crown'), willow: foliage('willow'), bush: foliage('bush'), flowerBush: foliage('flower'), blossom: foliage('blossom'),
    plaster: toon('#b6bdaf'), darkWood: toon('#3c302e'), woodLight: toon('#aa8155'),
    roof: ['#4b6c80', '#5c7b8c', '#68899a', '#456376'].map(color => { const m = toon(color); m.side = T.DoubleSide; return m; }),
    roofEdge: toon('#718e9c'), brick: ['#70868d', '#617d88', '#7c9296', '#59717e'].map(toon),
    mortar: toon('#364c58'),
    paving: ['#566d7a', '#687d88', '#5e7682', '#7c909a', '#506a78'].map((color, i) => new T.MeshStandardMaterial({
      color, roughness: .34 + i * .027, metalness: .10, bumpMap: stoneMaps.bumpMap, bumpScale: .012,
    })),
    grass: toon('#3d685b'), ground: new T.MeshStandardMaterial({ color: '#405866', roughness: .32, metalness: .14 }), soil: toon('#293f38'),
    gold: toon('#c4a36c'), ceramic: new T.MeshPhysicalMaterial({ color: '#567f85', roughness: .23, metalness: .12, clearcoat: .45, clearcoatRoughness: .22 }),
    cream: toon('#e6d8b7'), pink: toon('#d7a3ad'), flower: toon('#d9d6b2'),
    warm: new T.MeshStandardMaterial({ color: '#ffe0a3', emissive: '#ffd495', emissiveIntensity: 1.7, roughness: .55 }),
    paper: new T.MeshToonMaterial({ color: '#f2d9a9', emissive: '#ffb765', emissiveIntensity: .28, gradientMap: toonGradient }),
    glass: new T.MeshPhysicalMaterial({ color: '#b8d5ce', transparent: true, opacity: .08, roughness: .08, metalness: .1, depthWrite: false, side: T.DoubleSide }),
    black: toon('#24363f'),
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
