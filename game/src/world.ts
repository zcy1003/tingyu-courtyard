import * as T from 'three';
import { Builder } from './builder';
import { Environment } from './environment';
import { GROUND, WATER, riverX, rng } from './config';
import { makeMaterials } from './materials';
import type { Physics } from './physics';
import { addMountains } from './atmosphere';
import { mooredBoat } from './waterfront';
import { Reflector } from 'three/addons/objects/Reflector.js';

export class Town {
  materials = makeMaterials();
  water: T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
  birds = new T.Group();
  butterflies: T.Mesh[] = [];
  reflectionTarget?:T.WebGLCubeRenderTarget;
  environmentTarget?: T.WebGLRenderTarget;
  mirror?: Reflector;
  quality = 'standard';
  mirrorTime = -1;
  mirrorPosition = new T.Vector3(999, 999, 999);
  mirrorRotation = new T.Quaternion();
  mirrorProjection = new T.Matrix4();
  petals:T.Points;
  constructor(public scene: T.Scene, public physics: Physics) {
    const b = new Builder(scene, physics), m = this.materials;
    for (const side of [-1, 1]) {
      const pts: T.Vector2[] = [];
      pts.push(new T.Vector2(side * 90, 90));
      for (let z = -90; z <= 90; z += 3) pts.push(new T.Vector2(riverX(z) + side * 9, -z));
      pts.push(new T.Vector2(side * 90, -90));
      const shape = new T.Shape(pts); const geo = new T.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2); geo.translate(0, GROUND, 0);
      const pos=geo.getAttribute('position'); const uv=[]; for(let i=0;i<pos.count;i++)uv.push(pos.getX(i)/5,pos.getZ(i)/5);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      const mesh = new T.Mesh(geo, m.ground); mesh.receiveShadow = true; scene.add(mesh); physics.geometry(geo);
    }
    // A continuous bank wall and rail make the river boundary visible and physical.
    for (let z = -89; z < 90; z += 2) for (const side of [-1, 1]) {
      const x = riverX(z) + side * 9;
      const yaw = Math.atan2(riverX(z + 1) - riverX(z - 1), 2);
      b.box(x, .81, z, .62, .85, 2.05, m.stone, false, yaw);
      b.box(x, GROUND + .025, z, .77, .13, 2.05, m.roofEdge, false, yaw);
      for (let course = 0; course < 3; course++) for (let k = 0; k < 3; k++) {
        b.box(x - side * .335, .43 + course * .25, z - .7 + k * .69 + (course % 2) * .15, .10, .22, .64, m.paving[(course + k) % 5]!, false, yaw);
      }
      if (Math.abs(z + 38) < 2 || Math.abs(z - 44) < 2) continue;
      physics.box(x, GROUND + .43, z, .25, .86, 2.1, yaw);
      b.cyl(x, GROUND + .46, z, .075, .92, m.wood);
      b.box(x, GROUND + .9, z, .10, .09, 2.05, m.woodLight, false, yaw);
      b.box(x, GROUND + .42, z, .06, .055, 2.05, m.wood, false, yaw);
    }
    for (const side of [-1, 1]) {
      physics.box(side * 88, 4, 0, 1, 10, 180);
      physics.box(0, 4, side * 88, 180, 10, 1);
    }
    this.bridge(b, -38, -3, 25, false);
    this.bridge(b, 44, -5, 27, true);
    const env = new Environment(b, m); env.build();
    this.water = this.makeWater(); scene.add(this.water);
    this.setupMirror();
    // Mooring boats are scenery; the river is not a swimming area in this version.
    for (const [x, z, yaw] of [[13, -9, .13], [8, 65, -.2], [9, -70, .1]]) {
      b.transform(x!, WATER, z!, yaw!, () => {
        mooredBoat(b, m);
      });
    }
    addMountains(scene);
    b.finish();
    const rand = rng(102);
    const wing = new T.PlaneGeometry(.12, .14);
    const butterflyMat = new T.MeshBasicMaterial({ color: '#fff1b4', side: T.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const f = new T.Mesh(wing, butterflyMat); f.userData.home = new T.Vector3(i < 8 ? -61 : 30, GROUND + .9, i < 8 ? -46 : -7);
      f.userData.phase = rand() * 20; scene.add(f); this.butterflies.push(f);
    }
    const positions=[];for(let i=0;i<100;i++){const home=i<50?[-65,-65]:[50,8];positions.push(home[0]!+rand()*12-6,GROUND+rand()*7,home[1]!+rand()*12-6);}
    const petalGeo=new T.BufferGeometry();petalGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const pc=canvas.getContext('2d')!;pc.fillStyle='#f5d5d6';pc.beginPath();pc.ellipse(16,16,10,6,-.5,0,Math.PI*2);pc.fill();
    this.petals=new T.Points(petalGeo,new T.PointsMaterial({color:'#f3cbcd',map:new T.CanvasTexture(canvas),size:.08,alphaTest:.3,transparent:true,depthWrite:false}));scene.add(this.petals);
  }
  bridge(b: Builder, z: number, start: number, end: number, wood: boolean) {
    const m = this.materials, width = wood ? 3.8 : 4.5, n = 32;
    const yAt = (t: number) => GROUND + .05 + (wood ? .45 : 2.1) * Math.sin(Math.PI * t);
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= n; i++) { const t = i / n, x = start + (end - start) * t; vertices.push(x, yAt(t), z - width / 2, x, yAt(t), z + width / 2); }
    for (let i = 0; i < n; i++) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    b.mesh(geo, wood ? m.woodLight : m.stone); b.physics.geometry(geo);
    if (!wood) {
      const shape = new T.Shape();
      for (let i = 0; i <= n; i++) { const t = i / n, x = start + (end - start) * t; if (i === 0) shape.moveTo(x, yAt(t) - .03); else shape.lineTo(x, yAt(t) - .03); }
      for (let i = n; i >= 0; i--) { const t = i / n; shape.lineTo(start + (end - start) * t, yAt(t) - .65); }
      shape.closePath(); const arch = new T.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }); b.mesh(arch, m.stone, 0, 0, z - width / 2);
      // Individual voussoirs expose the curved masonry at both faces of the bridge.
      for (const side of [-1, 1]) for (let i = 0; i < 48; i++) {
        const t = (i + .5) / 48, x = start + (end - start) * t;
        const slope = Math.atan((yAt(t + .002) - yAt(t - .002)) / ((end - start) * .004));
        b.put(b.boxGeo, m.paving[i % 5]!, x, yAt(t) - .37, z + side * (width / 2 + .035), (end - start) / 48 - .025, .60, .13, 0, 0, slope);
      }
    }
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, x = start + (end - start) * t, y = yAt(t), slope = Math.atan((yAt((i + 1) / n) - yAt(i / n)) / ((end - start) / n));
      b.put(b.boxGeo, wood ? (i % 3 ? m.wood : m.woodLight) : m.paving[i % 5]!, x, y + .018, z, (end - start) / n - .015, .045, width - .08, 0, 0, slope);
    }
    const steps = 16;
    for (const side of [-1, 1]) for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = start + (end - start) * t, y = yAt(t);
      b.box(x, y + .5, z + side * (width / 2 - .06), wood ? .13 : .18, 1.0, wood ? .13 : .18, wood ? m.wood : m.roofEdge);
      if (!wood) {
        b.box(x, y + .11, z + side * (width / 2 - .06), .32, .18, .32, m.stone);
        b.box(x, y + .97, z + side * (width / 2 - .06), .25, .13, .25, m.stone);
        b.ball(x, y + 1.12, z + side * (width / 2 - .06), .13, .16, .13, m.stone);
      }
      if (i < steps) {
        const nextX = start + (end - start) * (i + 1) / steps, nextY = yAt((i + 1) / steps);
        for (const h of [.45, .91]) b.beam([x, y + h, z + side * (width / 2 - .06)], [nextX, nextY + h, z + side * (width / 2 - .06)], wood ? .055 : .075, wood ? m.woodLight : m.roofEdge);
        if (!wood) {
          const slope = Math.atan2(nextY - y, nextX - x);
          b.put(b.boxGeo, m.stone, (x + nextX) / 2, (y + nextY) / 2 + .20, z + side * (width / 2 - .06), (end - start) / steps - .19, .23, .16, 0, 0, slope);
          for (const t of [.22, .78]) b.box(x + (nextX - x) * t, y + (nextY - y) * t + .66, z + side * (width / 2 - .06), .095, .45, .11, m.stone);
        }
        b.physics.box((x + nextX) / 2, (y + nextY) / 2 + .53, z + side * (width / 2 - .06), (end - start) / steps + .05, 1.1, .18);
      }
    }
  }
  makeWater() {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let j = 0; j <= 180; j++) for (let i = 0; i <= 12; i++) { const z = j - 90; vertices.push(riverX(z) - 9 + i * 1.5, WATER, z); uv.push(i / 12, j / 180); }
    for (let j = 0; j < 180; j++) for (let i = 0; i < 12; i++) { const a = j * 13 + i; indices.push(a, a + 13, a + 1, a + 1, a + 13, a + 14); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
    const mat = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, cameraPos: { value: new T.Vector3() },reflections:{value:null}, mirrorMap:{value:null}, mirrorMatrix:{value:new T.Matrix4()}, useMirror:{value:0} }, side: T.DoubleSide,
      vertexShader: `varying vec3 vWorld; varying vec2 vUv; varying vec4 vMirror; uniform float time; uniform mat4 mirrorMatrix;
      void main(){vec3 p=position; p.y+=sin(p.z*1.9+time)*.010+sin(p.x*2.3+p.z+time*.7)*.007; vWorld=p; vUv=uv; vMirror=mirrorMatrix*vec4(p,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `varying vec3 vWorld; varying vec2 vUv; varying vec4 vMirror; uniform float time; uniform vec3 cameraPos;uniform samplerCube reflections;uniform sampler2D mirrorMap;uniform float useMirror;
      void main(){
        float a=sin(vWorld.x*2.3+vWorld.z+time*.7), b=cos(vWorld.z*1.9+time);
        vec3 n=normalize(vec3(-.030*a,1.,-.035*b)); vec3 view=normalize(cameraPos-vWorld);
        float fres=pow(1.-max(dot(n,view),0.),3.);
        float wave=sin(vWorld.x*5.+sin(vWorld.z*2.+time)*2.+time*.5)*sin(vWorld.z*7.-time*.5);
        float caustic=pow(max(0.,wave),10.);
        float shallow=pow(abs(vUv.x-.5)*2.,5.);
        vec3 color=mix(vec3(.045,.285,.25),vec3(.22,.48,.36),shallow*.7);
        vec3 reflection=textureCube(reflections,reflect(-view,n),2.0).rgb;
        if(useMirror>.5&&vMirror.w>0.){
          vec2 mirrorUV=vMirror.xy/vMirror.w+n.xz*.023;
          vec2 edge=min(mirrorUV,1.-mirrorUV);
          float coverage=smoothstep(0.,.025,min(edge.x,edge.y));
          reflection=mix(reflection,texture2D(mirrorMap,clamp(mirrorUV,vec2(.001),vec2(.999))).rgb,coverage);
        }
        color=mix(color,reflection,.26+fres*.43);color=mix(color,vec3(.30,.55,.51),fres*.06);color+=caustic*.025;
        float spec=pow(max(dot(reflect(normalize(vec3(.4,-1.,-.3)),n),view),0.),160.);
        color+=vec3(1.,.94,.75)*spec*.75;
        float ripple=pow(max(0.,sin(vWorld.z*21.+vWorld.x*8.+sin(vWorld.x*3.-time)*2.+time)),30.);
        color+=vec3(.65,.79,.64)*ripple*.035*(.4+fres);
        float haze=1.-exp(-length(cameraPos-vWorld)*.003);
        color=mix(color,vec3(.70,.81,.74),haze*.5);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    return new T.Mesh(geo, mat);
  }
  captureReflection(renderer:T.WebGLRenderer){
    this.reflectionTarget=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
    const capture=new T.CubeCamera(.1,300,this.reflectionTarget);capture.position.set(11,1.4,-24);
    this.water.visible=false;capture.update(renderer,this.scene);this.water.visible=true;
    this.water.material.uniforms.reflections!.value=this.reflectionTarget.texture;
    const pmrem = new T.PMREMGenerator(renderer);
    this.environmentTarget = pmrem.fromCubemap(this.reflectionTarget.texture);
    this.scene.environment = this.environmentTarget.texture; this.scene.environmentIntensity = .22;
    pmrem.dispose();
  }
  setupMirror() {
    const mirror = new Reflector(new T.PlaneGeometry(1, 1), { textureWidth: 768, textureHeight: 512, multisample: 0, clipBias: .002 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = WATER; mirror.updateMatrixWorld();
    this.mirror = mirror;
    const inverse = mirror.matrixWorld.clone().invert();
    this.water.material.uniforms.mirrorMap!.value = mirror.getRenderTarget().texture;
    this.water.onBeforeRender = (renderer, scene, camera) => {
      if (this.quality === 'low') { this.water.material.uniforms.useMirror!.value = 0; return; }
      // Auxiliary depth/normal passes must not replace the reflected color image.
      if (scene.overrideMaterial) return;
      const time = this.water.material.uniforms.time!.value as number;
      const displacement = camera.position.distanceToSquared(this.mirrorPosition);
      const rotation = camera.quaternion.angleTo(this.mirrorRotation);
      const moved = displacement > .0004 || rotation > .002;
      const invalid = this.mirrorTime < 0 || !camera.projectionMatrix.equals(this.mirrorProjection);
      // Keep fast camera turns responsive while sharing the cost of small movements across frames.
      const refresh = moved && time - this.mirrorTime >= 1 / (this.quality === 'high' ? 45 : 30);
      if (invalid || displacement > 4 || rotation > .15 || refresh || time - this.mirrorTime > .18) {
        this.water.visible = false;
        try { mirror.onBeforeRender(renderer, scene, camera, mirror.geometry, mirror.material as T.Material, null!); }
        finally { this.water.visible = true; }
        this.water.material.uniforms.mirrorMatrix!.value.copy((mirror.material as T.ShaderMaterial).uniforms.textureMatrix!.value).multiply(inverse);
        this.mirrorPosition.copy(camera.position); this.mirrorRotation.copy(camera.quaternion); this.mirrorProjection.copy(camera.projectionMatrix); this.mirrorTime = time;
      }
      this.water.material.uniforms.useMirror!.value = 1;
    };
  }
  setQuality(quality: string) {
    this.quality = quality;
    this.mirror?.getRenderTarget().setSize(quality === 'high' ? 1152 : 768, quality === 'high' ? 768 : 512); this.mirrorTime = -1;
  }
  update(time: number, camera: T.Camera) {
    this.materials.wind.value=time;
    this.water.material.uniforms.time!.value = time;
    this.water.material.uniforms.cameraPos!.value.copy(camera.position);
    for (const f of this.butterflies) {
      const phase = f.userData.phase as number, h = f.userData.home as T.Vector3;
      f.position.set(h.x + Math.sin(time * .35 + phase) * 2.5, h.y + Math.sin(time * 1.1 + phase) * .35, h.z + Math.cos(time * .4 + phase) * 2.5);
      f.rotation.set(Math.sin(time * 12 + phase) * .8, time * .5, .3); f.scale.x = .3 + Math.abs(Math.sin(time * 12 + phase));
    }
    const p=this.petals.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const y=GROUND+((i*.74-time*.16)%6+6)%6;p.setY(i,y);}p.needsUpdate=true;
  }
}
