import * as T from 'three';
import { GROUND } from './config';

type Source = { position: T.Vector3; color: T.Color; intensity: number; range: number; phase: number; indoor: boolean };
function radial() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!, g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,222,156,.8)'); g.addColorStop(.16, 'rgba(255,180,91,.35)');
  g.addColorStop(.48, 'rgba(255,145,66,.07)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}

/** Warm sources are visible everywhere; ten nearby lights shade the geometry. */
export class NightLighting {
  sources: Source[] = [];
  lamps: T.PointLight[] = [];
  strength = 1;
  halos: T.SpriteMaterial[] = [];
  pools: T.MeshBasicMaterial[] = [];
  glowTexture = radial();
  constructor(public scene: T.Scene) {
    for (let i = 0; i < 10; i++) { const light = new T.PointLight('#ffba74', 0, 7, 2); scene.add(light); this.lamps.push(light); }
  }
  add(position: T.Vector3, intensity = 12, range = 6, color = '#ffb477', halo = true) {
    this.sources.push({ position: position.clone(), intensity, range, color: new T.Color(color), phase: this.sources.length * 2.3, indoor: !halo });
    if (halo) {
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: this.glowTexture, transparent: true, opacity: .25, depthWrite: false, blending: T.AdditiveBlending }));
      sprite.position.copy(position); sprite.scale.set(1.55, 1.55, 1); this.scene.add(sprite);
      this.halos.push(sprite.material);
    }
  }
  pool(x: number, z: number, w = 3, d = 3, yaw = 0, y = GROUND + .056) {
    const material = new T.MeshBasicMaterial({ map: this.glowTexture, color: '#ffaf65', transparent: true, opacity: .19, depthWrite: false, blending: T.AdditiveBlending });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), material);
    mesh.position.set(x, y, z); mesh.rotation.set(-Math.PI / 2, 0, yaw); mesh.renderOrder = 2; this.scene.add(mesh);
    this.pools.push(material);
  }
  update(camera: T.Camera, time: number) {
    const direction=camera.getWorldDirection(new T.Vector3()),focus=camera.position.clone().addScaledVector(direction,4);
    const ranked = this.sources.map(source => ({ source, distance: focus.distanceToSquared(source.position) / Math.sqrt(source.intensity) })).sort((a, b) => a.distance - b.distance);
    this.lamps.forEach((light, i) => {
      const source = ranked[i]?.source; if (!source) { light.intensity = 0; return; }
      light.position.copy(source.position); light.color.copy(source.color); light.distance = source.range;
      light.intensity = source.intensity * (source.indoor ? Math.max(.42,this.strength) : this.strength) * (1 + Math.sin(time * 1.2 + source.phase) * .015);
    });
    for(const material of this.halos)material.opacity=.25*this.strength;
    for(const material of this.pools)material.opacity=.19*this.strength;
  }
  dispose() { this.glowTexture.dispose(); }
}
