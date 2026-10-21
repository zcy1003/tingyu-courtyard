import * as T from 'three';
import { Physics, RAPIER } from './physics';
import { Town } from './world';
import { Player } from './player';
import { FollowCamera } from './camera';
import { Ambience } from './audio';
import { makeSky } from './atmosphere';
import { ScenicRenderer } from './rendering';
import { LOCATIONS, PATHS, WAYPOINTS, riverX, GROUND } from './config';
import './style.css';

const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
type Mode = 'title' | 'playing' | 'paused' | 'map' | 'photo';
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const progress = (percent: number, text: string) => { $('load-progress').style.width = `${percent}%`; $('load-label').textContent = text; };

class Game {
  scene = new T.Scene();
  renderer: T.WebGLRenderer;
  scenic: ScenicRenderer;
  camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, .08, 500);
  physics!: Physics; town!: Town; player!: Player; follow!: FollowCamera;
  mode: Mode = 'title'; keys = new Set<string>(); audio = new Ambience();
  sun = new T.DirectionalLight('#fff1d9', 3.25);
  shadowAnchor = new T.Vector3(999, 0, 999);
  visited = new Set<string>(); location = 'A';
  elapsed = 0; accumulator = 0; previous = 0; mapTimer = 0; frame = 0;
  quality = 'standard'; running = true; dragging = false; pointerId = -1;
  arrivalTimer?: ReturnType<typeof setTimeout>; toastTimer?: ReturnType<typeof setTimeout>;
  abort = new AbortController();
  starting=false;
  shadowWasMoving = false;
  constructor() {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.02;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.domElement.setAttribute('aria-label', '可用键盘行走、拖动鼠标观察的中式小镇');
    $('world').append(this.renderer.domElement);
    this.scene.fog = new T.Fog('#c7ddd5', 82, 310);
    this.scene.add(new T.HemisphereLight('#d7e8f4', '#b3a891', 1.65));
    this.scene.add(makeSky());
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 150 });
    this.sun.shadow.normalBias = .025; this.sun.shadow.bias = -.00015; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.scenic = new ScenicRenderer(this.renderer, this.scene, this.camera);
  }
  async init() {
    progress(12, '让溪水流进小镇…'); await nextFrame(); await RAPIER.init();
    this.physics = new Physics(); progress(30, '搭好屋檐与月洞门…'); await nextFrame();
    this.town = new Town(this.scene, this.physics);
    progress(72, '等一阵风穿过竹林…'); await nextFrame();
    this.player = new Player(this.physics, this.scene); this.physics.world.step(); this.player.sync();
    this.follow = new FollowCamera(this.camera, this.player); this.events();
    this.camera.position.set(-21, 9.5, -7); this.camera.lookAt(8, 2.1, -36); this.updateShadow(new T.Vector3(-12, 0, -26));
    progress(90, '春天快到了…'); await nextFrame();
    await this.renderer.compileAsync(this.scene, this.camera);
    this.player.avatar.root.visible=false;this.town.captureReflection(this.renderer);this.renderer.shadowMap.needsUpdate=true;
    progress(100, '走进小镇'); ($('start') as HTMLButtonElement).disabled = false;
    this.previous = performance.now(); this.tick(this.previous);
    if (import.meta.env.DEV) this.debug();
  }
  events() {
    const opt = { signal: this.abort.signal };
    $('start').addEventListener('click', () => this.start(), opt);
    $('help').addEventListener('click', () => this.setMode('paused'), opt);
    $('resume').addEventListener('click', () => this.setMode('playing'), opt);
    $('reset').addEventListener('click', () => this.reset(), opt);
    $('mini-map-button').addEventListener('click', () => this.setMode('map'), opt);
    $('close-map').addEventListener('click', () => this.setMode('playing'), opt);
    $('exit-photo').addEventListener('click', () => this.setMode('playing'), opt);
    $('save-photo').addEventListener('click', () => this.savePhoto(), opt);
    $('quality').addEventListener('change', e => this.setQuality((e.target as HTMLSelectElement).value), opt);
    $('audio').addEventListener('click', () => { void this.audio.toggle().then(on => { $('audio').setAttribute('aria-pressed', String(on)); $('audio').setAttribute('aria-label', on ? '关闭环境声音' : '开启环境声音'); this.toast(on ? '听见风、水与远处的鸟鸣' : '环境声音已关闭'); }).catch(() => this.toast('当前浏览器暂时无法播放声音')); }, opt);
    window.addEventListener('keydown', e => {
      if (this.mode === 'title') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      if (!e.repeat) {
        if (e.code === 'Escape') { this.setMode(this.mode === 'playing' ? 'paused' : 'playing'); return; }
        if (e.code === 'KeyM') { this.setMode(this.mode === 'map' ? 'playing' : 'map'); return; }
        if (e.code === 'KeyP') { this.setMode(this.mode === 'photo' ? 'playing' : 'photo'); return; }
        if (e.code === 'KeyR') { this.reset(); return; }
      }
      if (this.mode === 'playing') this.keys.add(e.code);
    }, opt);
    window.addEventListener('keyup', e => this.keys.delete(e.code), opt);
    window.addEventListener('blur', () => { this.clearInput(); if (this.mode === 'playing' || this.mode === 'photo') this.setMode('paused'); }, opt);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clearInput(); this.accumulator = 0; if (this.mode !== 'title') this.setMode('paused'); } }, opt);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('contextmenu', e => e.preventDefault(), opt);
    canvas.addEventListener('pointerdown', e => { if (this.mode !== 'playing' && this.mode !== 'photo') return; this.dragging = true; this.pointerId = e.pointerId; canvas.setPointerCapture(e.pointerId); }, opt);
    canvas.addEventListener('pointermove', e => { if (this.dragging && (this.mode === 'playing' || this.mode === 'photo')) this.follow.rotate(e.movementX, e.movementY); }, opt);
    const up = () => { this.dragging = false; this.pointerId = -1; };
    canvas.addEventListener('pointerup', up, opt); canvas.addEventListener('pointercancel', up, opt); canvas.addEventListener('lostpointercapture', up, opt);
    canvas.addEventListener('wheel', e => { if (this.mode === 'playing' || this.mode === 'photo') { e.preventDefault(); this.follow.zoom(e.deltaY); } }, { passive: false, ...opt });
    window.addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.scenic.resize(); }, opt);
    window.addEventListener('pagehide', () => this.dispose(), { once: true, ...opt });
  }
  clearInput() { this.keys.clear(); this.dragging = false; const c = this.renderer.domElement; if (this.pointerId >= 0 && c.hasPointerCapture(this.pointerId)) c.releasePointerCapture(this.pointerId); this.pointerId = -1; }
  start() {
    if(this.starting)return;this.starting=true;($('start')as HTMLButtonElement).disabled=true;
    $('fade').classList.add('active');
    setTimeout(() => { $('intro').hidden = true; this.player.reset(); this.follow.reset(); this.visited.add('A'); this.mode = 'playing'; this.setMode('playing'); this.updateShadow(this.player.position); $('fade').classList.remove('active'); this.toast('出发吧。按 M 看看小镇地图'); }, 550);
  }
  setMode(mode: Mode) {
    if (this.mode === 'title') return;
    this.mode = mode; this.clearInput(); this.accumulator = 0;
    $('hud').hidden = mode !== 'playing'; $('pause-panel').hidden = mode !== 'paused'; $('map-panel').hidden = mode !== 'map'; $('photo-ui').hidden = mode !== 'photo';
    if (mode === 'map') this.drawMap($<HTMLCanvasElement>('large-map'), false);
    if (mode === 'paused') $('resume').focus({ preventScroll: true });
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  reset() { this.player.reset(); this.follow.reset(); this.setMode('playing'); this.updateShadow(this.player.position); this.toast('回到听雨小院'); }
  setQuality(value: string) {
    this.quality = value;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, value === 'low' ? 1 : value === 'high' ? 1.7 : 1.35)); this.renderer.setSize(innerWidth, innerHeight);
    this.scenic.setQuality(value);
    this.town.setQuality(value);
    this.sun.shadow.mapSize.set(value === 'low' ? 1024 : value === 'high' ? 4096 : 2048, value === 'low' ? 1024 : value === 'high' ? 4096 : 2048);
    this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; this.renderer.shadowMap.needsUpdate = true;
    this.toast(value === 'low' ? '已切换为轻盈画质' : value === 'high' ? '已切换为细致画质' : '已切换为均衡画质');
  }
  updateShadow(center: T.Vector3) {
    if (center.distanceToSquared(this.shadowAnchor) < 16) return;
    this.shadowAnchor.copy(center);
    this.sun.position.set(center.x - 32, 65, center.z + 35); this.sun.target.position.set(center.x, 0, center.z); this.sun.target.updateMatrixWorld();
    this.renderer.shadowMap.needsUpdate=true;
  }
  toast(text: string) { if (this.toastTimer) clearTimeout(this.toastTimer); $('toast').textContent = text; $('toast').classList.add('show'); this.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3300); }
  updateLocation() {
    const p = this.player.position;
    const nearest = [...LOCATIONS].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]!;
    if (Math.hypot(nearest.x - p.x, nearest.z - p.z) > nearest.radius) { $('place-name').textContent = '听雨小镇'; $('place-note').textContent = '在春风里，随处走走'; return; }
    $('place-name').textContent = nearest.name; $('place-note').textContent = nearest.note;
    if (!this.visited.has(nearest.id)) {
      this.visited.add(nearest.id); $('arrival').querySelector('strong')!.textContent = nearest.name; $('arrival').querySelector('p')!.textContent = nearest.note; $('arrival').classList.add('show');
      if (this.arrivalTimer) clearTimeout(this.arrivalTimer); this.arrivalTimer = setTimeout(() => $('arrival').classList.remove('show'), 3000);
      if (this.visited.size === 7) this.toast('七处风景，都留下了你的脚步');
    }
    this.location = nearest.id;
  }
  drawMap(canvas: HTMLCanvasElement, mini: boolean) {
    const c = canvas.getContext('2d')!, n = canvas.width, k = n / 200;
    const point = (x: number, z: number): [number, number] => [n / 2 + x * k, n / 2 + z * k];
    c.clearRect(0, 0, n, n); c.fillStyle = '#dce1bf'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#96c5b5'; c.beginPath();
    for (let z = -100; z <= 100; z += 3) { const [x, y] = point(riverX(z) - 9, z); if (z === -100) c.moveTo(x, y); else c.lineTo(x, y); }
    for (let z = 100; z >= -100; z -= 3) c.lineTo(...point(riverX(z) + 9, z)); c.closePath(); c.fill();
    c.strokeStyle = '#f6f0d9'; c.lineWidth = 4.5 * k; c.lineJoin = 'round'; c.lineCap = 'round';
    const paths = [...PATHS, ['D_WEST', 'D', 'D_EAST'], ['F_WEST', 'F', 'F_EAST']];
    for (const ids of paths) { c.beginPath(); ids.forEach((id, i) => { const p = WAYPOINTS[id]!; if (i === 0) c.moveTo(...point(...p)); else c.lineTo(...point(...p)); }); c.stroke(); }
    c.fillStyle = '#adb89b';
    for (const [x, z, w, d] of [[-52, -66, 14, 8], [-65, -55, 6, 12], [-39, -55, 6, 12], [-61, -23, 7, 10], [-39, -6, 9, 7], [-64, 1, 8, 10], [-63, 21, 8, 11], [-20, 8, 7, 10], [-31, 29, 9, 7], [-58, 65, 11, 8], [46, 32, 7, 10], [46, 60, 8, 10], [-31, 69, 10, 8]]) { const p = point(x! - w! / 2, z! - d! / 2); c.fillRect(p[0], p[1], w! * k, d! * k); }
    for (const l of LOCATIONS) {
      const [x, y] = point(l.x, l.z); c.fillStyle = this.visited.has(l.id) ? '#52765e' : '#e8edcf';
      c.beginPath(); c.arc(x, y, mini ? 3.8 * k : 3.0 * k, 0, Math.PI * 2); c.fill();
      if (!mini) { c.fillStyle = '#50694f'; c.font = `${n * .018}px "Microsoft YaHei",sans-serif`; c.textAlign = 'center'; c.fillText(l.name, x, y + 6.9 * k); }
    }
    const [px, py] = point(this.player.position.x, this.player.position.z);
    c.save(); c.translate(px, py); c.rotate(-this.follow.yaw); c.fillStyle = '#fffdf4'; c.strokeStyle = '#5e7960'; c.lineWidth = 1.5 * k;
    c.beginPath(); c.moveTo(0, -4.7 * k); c.lineTo(3.1 * k, 3.4 * k); c.lineTo(0, 1.6 * k); c.lineTo(-3.1 * k, 3.4 * k); c.closePath(); c.fill(); c.stroke(); c.restore();
    if (!mini) { c.fillStyle = '#6d8467'; c.font = `${n * .018}px serif`; c.textAlign = 'right'; c.fillText('北 ↑', n - 16, 25); }
    $('visited').textContent = `已到访 ${this.visited.size} / 7 处风景`;
  }
  savePhoto() {
    this.scenic.render();
    this.renderer.domElement.toBlob(blob => {
      if (!blob) { this.toast('照片暂时未能保存，请再试一次'); return; }
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `听雨小镇-${new Date().toISOString().replace(/[:.]/g, '-')}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
      this.toast('照片已保存');
    }, 'image/png');
  }
  tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(Math.max(0, (now - this.previous) / 1000), .075); this.previous = now;
    requestAnimationFrame(this.tick);
    if (document.hidden) return;
    this.elapsed += dt; this.frame++;
    if (this.mode === 'title') {
      this.player.avatar.root.visible = false;
      this.camera.position.set(-21 + Math.sin(this.elapsed * .045) * 2, 9.5, -7); this.camera.lookAt(8, 2.1, -36);
    } else {
      if (this.mode === 'playing') {
        this.accumulator = Math.min(this.accumulator + dt, 5 / 60);
        while (this.accumulator >= 1 / 60) { this.player.step(1 / 60, this.keys, this.follow.yaw); this.physics.world.step(); this.accumulator -= 1 / 60; }
        this.player.sync(); this.updateLocation();
      }
      this.player.avatar.update(dt, this.mode === 'playing' ? this.player.speed : 0, this.elapsed);
      this.follow.update(dt); this.updateShadow(this.player.position);
      const moving = this.mode === 'playing' && this.player.speed > .025;
      if ((moving && this.frame % (this.quality === 'low' ? 6 : 3) === 0) || this.shadowWasMoving !== moving) this.renderer.shadowMap.needsUpdate = true;
      this.shadowWasMoving = moving;
      $('heading').textContent = ['北', '西', '南', '东'][T.MathUtils.euclideanModulo(Math.round(this.follow.yaw / (Math.PI / 2)), 4)]!;
    }
    this.town.update(this.elapsed, this.camera);
    this.renderer.info.reset(); this.scenic.render();
    this.mapTimer += dt;
    if (this.mapTimer > .3 && this.mode !== 'title') { this.mapTimer = 0; this.drawMap($<HTMLCanvasElement>('mini-map'), true); if (this.mode === 'map') this.drawMap($<HTMLCanvasElement>('large-map'), false); }
  };
  debug() {
    const state = () => ({ mode: this.mode, position: this.player.position.toArray(), yaw: this.follow.yaw, grounded: this.player.controller.computedGrounded(), speed: this.player.speed, visited: [...this.visited], calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, frame: this.frame, camera: this.camera.position.toArray(), cameraDistance: this.follow.actualDistance });
    Object.defineProperty(window, '__tingyu', { configurable: true, value: {
      state, teleport: (x: number, y: number, z: number) => { this.player.teleport(x, y, z); this.follow.reset(); return state(); },
      face: (yaw: number) => { this.follow.yaw = yaw; },
      simulate: (input: string[], frames: number, yaw: number) => {
        const keys = new Set(input); this.follow.yaw = yaw;
        for (let i = 0; i < Math.min(frames, 36000); i++) { this.player.step(1 / 60, keys, yaw); this.physics.world.step(); }
        this.player.sync(); this.player.avatar.update(1 / 60, this.player.speed, this.elapsed); this.follow.update(1); this.updateLocation(); return state();
      },
      camera: (yaw: number, pitch: number, distance: number) => { this.follow.yaw = yaw; this.follow.pitch = pitch; this.follow.distance = distance; this.follow.update(1); },
      location: (id: string) => { const l = LOCATIONS.find(l => l.id === id); if (l) { this.player.teleport(l.x, GROUND + .1, l.z); this.follow.reset(); } },
    }});
  }
  dispose() {
    this.running = false; this.abort.abort(); this.audio.dispose();
    if (this.arrivalTimer) clearTimeout(this.arrivalTimer); if (this.toastTimer) clearTimeout(this.toastTimer);
    const geos = new Set<T.BufferGeometry>(), mats = new Set<T.Material>(), textures = new Set<T.Texture>();
    this.scene.traverse(o => { if (o instanceof T.SkinnedMesh) o.skeleton.dispose(); if (o instanceof T.Mesh) { geos.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { mats.add(m); for (const value of Object.values(m)) if (value instanceof T.Texture) textures.add(value); } } });
    geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    this.town?.reflectionTarget?.dispose();this.sun.shadow.map?.dispose();
    this.town?.environmentTarget?.dispose(); this.town?.mirror?.geometry.dispose(); this.town?.mirror?.dispose();
    this.scenic.dispose(); this.physics?.world.free(); this.renderer.dispose();
  }
}

async function boot() {
  try { const game = new Game(); await game.init(); }
  catch (error) { console.error(error); $('fatal').hidden = false; $('fatal-message').textContent = '请使用支持 WebGL 2 的电脑浏览器，并开启硬件加速。若页面加载中断，请刷新重试。'; }
}
void boot();
