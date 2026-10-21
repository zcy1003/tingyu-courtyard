import * as T from 'three';
import { Builder } from './builder';
import { GROUND, PATHS, WAYPOINTS, riverX, rng } from './config';
import { labelTexture, type Materials } from './materials';
import { foliageSpray, lanternShell, lilyLeaf, mossPatch, pavingStone, vessel } from './environment-geometry';

export class Environment {
  random = rng(7613);
  detailRandom = rng(9471);
  potGeo = vessel();
  jarGeo = vessel(true);
  lanternGeo = lanternShell();
  lilyGeo = lilyLeaf();
  pavingGeos = [0, 1, 2].map(pavingStone);
  petalOvalGeo = new T.SphereGeometry(1, 8, 5);
  ringGeo = new T.TorusGeometry(1, .055, 5, 24);
  eaveRingGeo = new T.TorusGeometry(1, .16, 4, 12);
  petalGeo = new T.CircleGeometry(1, 5);
  clumpGeo = new T.IcosahedronGeometry(1, 1);
  foliageGeo = foliageSpray();
  willowGeo = foliageSpray(true);
  mossGeo = mossPatch();
  pavingAreas:{inverse:T.Matrix4;w:number;d:number}[]=[];
  grassGeo = new T.BufferGeometry();
  constructor(public b: Builder, public m: Materials) {
    this.petalGeo.rotateX(-Math.PI / 2);
    const v:number[]=[];
    for(let i=0;i<5;i++){
      const a=i*2.4,dx=Math.cos(a)*.012,dz=Math.sin(a)*.012,h=.15+(i%3)*.05,lx=Math.sin(a)*.07,lz=Math.cos(a)*.07;
      v.push(-dx,0,-dz,dx,0,dz,lx*.35+dx*.55,h*.57,lz*.35+dz*.55);
      v.push(-dx,0,-dz,lx*.35+dx*.55,h*.57,lz*.35+dz*.55,lx*.35-dx*.55,h*.57,lz*.35-dz*.55);
      v.push(lx*.35-dx*.55,h*.57,lz*.35-dz*.55,lx*.35+dx*.55,h*.57,lz*.35+dz*.55,lx,h,lz);
    }
    this.grassGeo.setAttribute('position',new T.Float32BufferAttribute(v,3));this.grassGeo.computeVertexNormals();
  }
  r(a: number, c: number) { return a + (c - a) * this.random(); }
  detail(a: number, c: number) { return a + (c - a) * this.detailRandom(); }
  sign(text: string, x: number, y: number, z: number, w: number, h: number, dark = false) {
    const mat = new T.MeshStandardMaterial({ map: labelTexture(text, dark ? '#3e5e50' : '#eee1bd', dark ? '#e8ce94' : '#65513a'), roughness: .85 });
    this.b.mesh(new T.PlaneGeometry(w, h), mat, x, y, z);
  }
  roof(w: number, d: number, eave = 3.55, rise = 1.1) {
    const b = this.b, m = this.m, half = d / 2;
    const corner = d > 2.5 ? .30 : .15;
    const profile = (t: number, x = 0) => eave + rise * (1 - t) - .20 * Math.sin(Math.PI * t) + .21 * t ** 7 + corner * (Math.abs(x) / (w / 2)) ** 8 * t ** 3;
    const vertices: number[] = [], indices: number[] = [];
    const across = 16, rows = 16;
    for (const s of [-1, 1]) {
      const offset = vertices.length / 3;
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= across; i++) {
        const x = -w / 2 + i / across * w;
        vertices.push(x, profile(j / rows, x) - .065, s * j / rows * half);
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < across; i++) {
        const k = offset + j * (across + 1) + i;
        indices.push(k, k + 1, k + across + 1, k + 1, k + across + 2, k + across + 1);
      }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const uv: number[] = []; for (let i = 0; i < vertices.length; i += 3) uv.push(vertices[i]! / 3, vertices[i + 2]! / 3); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    b.mesh(geo, m.roof[0]!);
    const nx = Math.ceil(w / .26), nz = Math.ceil(half / .40);
    for (const s of [-1, 1]) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const t = (j + .5) / nz, x = -w / 2 + (i + .5) * w / nx;
      const slope = (profile(t + .001, x) - profile(t - .001, x)) / (.002 * half) * s;
      b.put(b.tileGeo, m.roof[Math.floor(this.random() * 4)]!, x, profile(t, x) + .012, s * t * half, 1.02, 1.25, half / nz * Math.sqrt(1 + slope * slope) + .09, -Math.atan(slope));
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i < across; i++) {
        const xa = -w / 2 + i / across * w, xb = xa + w / across;
        b.beam([xa, profile(1, xa) - .115, s * half], [xb, profile(1, xb) - .115, s * half], .09, m.darkWood);
      }
      for (let i = 0; i < nx; i++) {
        const x = -w / 2 + (i + .5) * w / nx, y = profile(1, x);
        // A pale clay rim and recessed dark centre make each rounded eave end readable.
        b.put(this.eaveRingGeo, m.roofEdge, x, y + .005, s * (half + .045), .090, .073, .12, 0, 0);
        b.ball(x, y + .005, s * (half + .027), .061, .052, .016, m.roof[0]!);
        if (i % 2 === 0) b.box(x, y - .21, s * (half - .25), .075, .10, .72, m.wood);
      }
      for (const side of [-1, 1]) for (let j = 0; j < rows; j++) {
        const a = j / rows, c = (j + 1) / rows;
        b.beam([side * w / 2, profile(a, w / 2) + .07, s * a * half], [side * w / 2, profile(c, w / 2) + .07, s * c * half], .088, m.roofEdge);
      }
      for (const side of [-1, 1]) b.beam([side * w / 2, profile(1, w / 2) + .07, s * half], [side * (w / 2 + .14), profile(1, w / 2) + .31, s * (half + .16)], .07, m.roofEdge);
    }
    b.box(0, eave + rise + .055, 0, w + .12, .14, .22, m.roof[0]!);
    b.beam([-w / 2 - .13, eave + rise + .17, 0], [w / 2 + .13, eave + rise + .17, 0], .115, m.roofEdge);
    for (const side of [-1, 1]) {
      b.beam([side * (w / 2 - .07), eave + rise + .17, 0], [side * (w / 2 + .24), eave + rise + .31, 0], .105, m.roofEdge);
      b.beam([side * (w / 2 + .24), eave + rise + .31, 0], [side * (w / 2 + .20), eave + rise + .48, 0], .085, m.roofEdge);
    }
  }
  window(x: number, y: number, z: number, w = 1.8, h = 1.7, clear = false) {
    const b = this.b, m = this.m;
    if(clear)b.box(x,y,z,w,h,.035,m.glass,true);
    else {b.box(x, y, z, w, h, .07, m.darkWood);b.box(x, y, z + .045, w - .13, h - .13, .025, m.cream);}
    for (const s of [-1, 1]) { b.box(x + s * w / 2, y, z + .07, .075, h + .12, .09, m.wood); b.box(x, y + s * h / 2, z + .07, w + .14, .075, .09, m.wood); }
    for (let i = -2; i <= 2; i++) b.box(x + i * w / 6, y, z + .1, .028, h, .04, m.wood);
    for (let i = -2; i <= 2; i++) b.box(x, y + i * h / 6, z + .1, w, .026, .04, m.wood);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.put(b.boxGeo, m.woodLight, x + s * w * .37, y - h * .32 + i * h * .32, z + .125, .23, .024, .035, 0, 0, s * Math.PI / 4);
    b.box(x, y - h / 2 - .065, z + .055, w + .25, .11, .24, m.wood);
    b.box(x, y + h / 2 + .055, z + .055, w + .23, .085, .18, m.darkWood);
    for (const s of [-1, 1]) b.box(x + s * (w / 2 - .11), y, z + .14, .026, h - .12, .045, m.woodLight);
  }
  lantern(x: number, y: number, z: number, size = 1) {
    const b = this.b, m = this.m;
    b.put(this.lanternGeo, m.red, x, y, z, size, size, size);
    for (const s of [-1, 1]) b.cyl(x, y + s * .35 * size, z, .14 * size, .06 * size, m.gold);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      for (let j = 0; j < 7; j++) {
        const t0 = Math.PI * (.12 + .76 * j / 7), t1 = Math.PI * (.12 + .76 * (j + 1) / 7);
        b.beam([x + Math.sin(a) * Math.sin(t0) * .303 * size, y + Math.cos(t0) * .405 * size, z + Math.cos(a) * Math.sin(t0) * .303 * size], [x + Math.sin(a) * Math.sin(t1) * .303 * size, y + Math.cos(t1) * .405 * size, z + Math.cos(a) * Math.sin(t1) * .303 * size], .0038 * size, m.gold);
      }
    }
    b.beam([x, y + .38 * size, z], [x, y + .75 * size, z], .012, m.darkWood);
    for (let i = 0; i < 4; i++) b.beam([x + (i - 1.5) * .025, y - .41 * size, z], [x + (i - 1.5) * .035, y - .65 * size, z], .012, m.red);
  }
  table(x: number, y: number, z: number, w = 1.5, d = .9) {
    const b = this.b, m = this.m;
    b.box(x, y + .76, z, w, .08, d, m.wood, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * (w / 2 - .12), y + .37, z + sz * (d / 2 - .1), .09, .74, .09, m.darkWood);
    b.box(x, y + .51, z, w - .1, .05, d - .1, m.woodLight);
  }
  bench(x: number, z: number, yaw = 0) {
    const b = this.b, m = this.m;
    b.transform(x, 0, z, yaw, () => {
      b.box(0, .48, 0, 1.65, .1, .43, m.wood, true);
      for (const sx of [-.62, .62]) { b.box(sx, .25, 0, .12, .5, .35, m.darkWood); b.box(sx, .73, -.2, .07, .7, .07, m.wood); }
      b.box(0, .95, -.2, 1.6, .13, .06, m.woodLight);
    });
  }
  building(x: number, z: number, w: number, d: number, yaw = 0, name = '', open = false, floors = 1) {
    const b = this.b, m = this.m;
    b.transform(x, GROUND, z, yaw, () => {
      const front = d / 2, height = floors === 2 ? 6 : 3.3;
      this.pavingRect(0,front+1.6,w+1,3.2);
      b.box(0, .15, 0, w + .25, .3, d + .25, m.stone, true);
      b.box(0, .33, 0, w, .08, d, m.woodLight, true);
      b.box(0, height / 2 + .32, -front, w, height, .24, m.wall, true);
      for (const s of [-1, 1]) b.box(s * w / 2, height / 2 + .32, 0, .23, height, d, m.wall, true);
      if (open) {
        for (const s of [-1, 1]) {
          const left=s<0?-w/2:1.4,right=s<0?-1.4:w/2,wx=s*(w/4+.5),ww=Math.min(2.5,w/2-2);
          b.box((left+right)/2,.72,front,right-left,.74,.19,m.wall,true);
          b.box((left+right)/2,3.05,front,right-left,.8,.19,m.wall,true);
          b.box((left+wx-ww/2)/2,1.9,front,wx-ww/2-left,1.7,.19,m.wall,true);
          b.box((right+wx+ww/2)/2,1.9,front,right-wx-ww/2,1.7,.19,m.wall,true);
        }
        b.box(0, 3.25, front, 2.8, .45, .2, m.wood, true);
      } else b.box(0, height / 2 + .32, front, w, height, .18, m.wall, true);
      for (let i = 0; i < 3; i++) b.box(0, .06 + i * .12, front + .9 - i * .3, 3.7 - i * .2, .12, .42, m.stone, true);
      for (const s of [-1, 1]) {
        b.box(s * w / 2, 1.85, front + .14, .17, 3.15, .17, m.wood);
        b.box(s * 1.5, 1.85, front + .14, .15, 3.15, .15, m.wood);
        this.window(s * (w / 4 + .5), 1.9, front + .12, Math.min(2.5, w / 2 - 2), 1.7,open);
        this.lantern(s * (w / 2 - .6), 2.85, front + .6, .85);
      }
      b.box(0, 3.44, front + .12, w + .2, .2, .26, m.darkWood);
      b.box(0, 3.28, front + .20, w + .06, .07, .18, m.woodLight);
      for (const xx of [-w / 2, -1.5, 1.5, w / 2]) {
        b.box(xx, .50, front + .14, .25, .27, .25, m.stone);
        b.box(xx, 3.12, front + .14, .31, .09, .30, m.wood);
        b.box(xx, 3.24, front + .14, .43, .08, .42, m.wood);
        for (const s of [-1, 1]) b.beam([xx, 2.95, front + .15], [xx + s * .35, 3.30, front + .15], .043, m.woodLight);
      }
      for (const side of [-1, 1]) {
        b.transform(side * (w / 2 + .135), 0, -d * .13, side * Math.PI / 2, () => this.window(0, 1.85, 0, 1.25, 1.50));
        const ix = side * (w / 2 - .38);
        this.creeper(ix, front + .16, side < 0 ? 1.35 : 1.65, side, .35);
        this.leafClump(ix, front + .32, .85, .30, side < 0 ? 1 : 3);
      }
      // Dressed stone foundations and wall corner courses give the houses a human scale.
      for(const side of [-1,1]) for(let j=0;j<3;j++) for(let i=0;i<Math.ceil(d/.74);i++)
        b.box(side*(w/2+.035),.10+j*.15,-front+.35+i*.74,.27,.135,.69,j%2?m.stone:m.paving[(i+j)%5]!);
      for(let i=0;i<Math.ceil(w/.72);i++) b.box(-w/2+.35+i*.72,.19,front+.025,.67,.25,.28,m.stone);
      for(const side of [-1,1]) for(let j=0;j<8;j++) b.box(side*(w/2+.025),.52+j*.32,front+.03,.32,.29,.27,j%2?m.plaster:m.stone);
      if (!open) {
        b.box(0, 1.6, front + .13, 2.0, 2.45, .06, m.darkWood);
        for (let i = -3; i <= 3; i++) b.box(i * .27, 1.6, front + .19, .23, 2.3, .025, m.wood);
        for (const s of [-1, 1]) b.ball(s * .15, 1.55, front + .25, .04, .04, .03, m.gold);
      }
      if (name) this.sign(name, 0, 3.18, front + .28, Math.min(2.6, w * .35), .45, true);
      if (floors === 2) {
        b.box(0, 3.5, 0, w, .18, d, m.wood);
        b.box(0, 3.55, front + .6, w + .2, .16, 1.4, m.woodLight);
        for (let i = 0; i <= Math.floor(w / .5); i++) b.box(-w / 2 + i * .5, 4.1, front + 1.24, .055, .9, .055, m.wood);
        b.box(0, 4.6, front + 1.24, w + .25, .09, .09, m.woodLight);
        for (const xx of [-w / 3, 0, w / 3]) this.window(xx, 4.95, front + .13, 1.65, 1.7);
        b.transform(0,0,front+.4,0,()=>this.roof(w + .9, 2.5, 3.5, .25));
      }
      this.roof(w + 1.1, d + 1.25, height + .35, floors === 2 ? 1.05 : 1.2);
      for(const side of [-1,1]){
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([side*w/2,height+.32,-front,side*w/2,height+.32,front,side*w/2,height+1.45,0],3));geo.computeVertexNormals();
        const material=m.wall.clone();material.side=T.DoubleSide;b.mesh(geo,material);
        b.beam([side*w/2,height+.35,-front],[side*w/2,height+1.45,0],.055,m.darkWood);b.beam([side*w/2,height+1.45,0],[side*w/2,height+.35,front],.055,m.darkWood);
      }
      for (let i = 0; i < Math.floor(w / .36); i++) b.box(-w / 2 + i * .36, height + .19, front + .12, .065, .13, .82, m.woodLight);
      if (open) {
        for (const s of [-1, 1]) b.transform(s * 1.4, 0, front, s * -.95, () => { this.window(s * -.57, 1.98, 0, 1.12, 2.25); });
        this.table(0, .38, -.2, 2, 1.2);
        for (const sx of [-1.65, 1.65]) this.bench(sx, -.2, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
        for (const xx of [-.5, .3, .6]) { b.cyl(xx, 1.22, .1, .085, .12, m.cream); b.cyl(xx, 1.287, .1, .065, .008, m.darkWood); }
        b.ball(0, 1.28, -.3, .18, .15, .16, m.ceramic); b.cyl(0, 1.44, -.3, .1, .04, m.gold);
        this.table(0, .38, -front + .6, w * .5, .55);
        this.landscape(0,2.3,-front+.15);
        b.box(w*.32,1.65,-front+.43,2.0,2.5,.48,m.darkWood);
        for(const y of [.6,1.2,1.8,2.4,2.9])b.box(w*.32,y,-front+.75,2.0,.07,.4,m.woodLight);
        for(let j=0;j<3;j++)for(let i=0;i<3;i++)b.ball(w*.32-.65+i*.65,.85+j*.6,-front+.88,.14,.22,.14,i%2?m.cream:m.ceramic);
        for(let i=0;i<3;i++)b.transform(-w*.3+i*.6,0,-front+1.3,-.2+(i%2)*.4,()=>{b.box(0,1.7,0,.62,2.2,.07,m.darkWood);b.box(0,1.75,.05,.52,1.9,.025,m.cream);for(let j=0;j<4;j++)b.put(b.leafGeo,m.leaf[3]!,this.r(-.2,.2),1.15+j*.4,.08,.6,.6,.4,0,j);});
        for (const xx of [-w * .3, w * .3]) this.pot(xx, -front + .8, 1.1, false, 1.18);
        this.lantern(0, 2.8, -.3, .8);
        const light = new T.PointLight('#ffe0aa', 16, 10, 2);
        light.position.set(0, 2.8, -.2).applyMatrix4(b.frame); b.scene.add(light);
      }
      this.pot(-w / 2 + .4, front + 1.4, .8);
      this.pot(w / 2 - .4, front + 1.1, .7);
      for(const side of [-1,1]){
        this.bush(side*(w/2+.55),front*.4,.7,true,0);
        for(let j=0;j<4;j++) this.bush(side*(w/2+.5),-front+.8+j*d/4,.42,j%2===0,0);
        this.plantingFloor(side * (w / 2 + .46), -.15, .55, d - .7, .02);
      }
    });
  }
  landscape(x:number,y:number,z:number){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;const c=canvas.getContext('2d')!;
    c.fillStyle='#b9a27b';c.fillRect(0,0,512,640);c.fillStyle='#e5d9b6';c.fillRect(25,22,462,596);
    for(let i=0;i<4;i++){c.fillStyle=['#b7c0ab','#98ac9a','#738f80','#526f61'][i]!;c.beginPath();c.moveTo(25,600);for(let xx=25;xx<490;xx+=10)c.lineTo(xx,230+i*65+Math.sin(xx*.018+i*.7)*70+Math.cos(xx*.045)*25);c.lineTo(490,600);c.fill();}
    c.fillStyle='#a56852';c.fillRect(411,72,24,32);c.font='25px KaiTi,serif';c.fillStyle='#596c51';c.fillText('听雨',60,85);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    this.b.mesh(new T.PlaneGeometry(1.55,1.85),new T.MeshStandardMaterial({map:texture,roughness:1}),x,y,z);
    for(const yy of [-.95,.95])this.b.beam([x-.9,y+yy,z+.02],[x+.9,y+yy,z+.02],.03,this.m.darkWood);
  }
  wall(x: number, z: number, length: number, yaw = 0, height = 2.7) {
    const b = this.b, m = this.m;
    b.transform(x, GROUND, z, yaw, () => {
      b.box(0, height / 2, 0, length, height, .32, m.wall, true);
      b.box(0, .18, 0, length + .07, .36, .42, m.mortar);
      b.box(0, height + .06, 0, length + .1, .12, .55, m.roofEdge);
      for (let i = 0; i < length; i += .32) b.put(b.tileGeo, m.roof[Math.floor(this.random() * 4)]!, -length / 2 + i, height + .12, 0, 1.3, .8, .65);
      for (let i = 1; i < length - 1; i += .82) {
        const px = -length / 2 + i + this.detail(-.10, .10);
        for (const side of [-1, 1]) {
          b.put(this.mossGeo, m.grass, px, .022, side * .37, .53, 1, .29, 0, this.detail(0, 6), 0, false);
          this.leafClump(px, side * .41, this.detail(.55, .85), .03, Math.floor(i) % 5);
        }
        if (Math.floor(i * 2) % 7 === 0) this.creeper(px, .19, this.detail(.65, 1.6), i % 2 ? 1 : -1, .04);
      }
    });
  }
  gate(x: number, z: number) {
    const b = this.b, m = this.m;
    b.transform(x, GROUND, z, 0, () => {
      const shape = new T.Shape(); shape.moveTo(-2.25, 0); shape.lineTo(2.25, 0); shape.lineTo(2.25, 3.6); shape.lineTo(-2.25, 3.6); shape.closePath();
      const hole = new T.Path(); hole.absarc(0, 1.48, 1.42, 0, Math.PI * 2, true); shape.holes.push(hole);
      const geo = new T.ExtrudeGeometry(shape, { depth: .4, bevelEnabled: false, curveSegments: 32 });
      const mesh = b.mesh(geo, m.wall, 0, 0, -.2); mesh.updateMatrixWorld(); b.physics.geometry(geo, mesh.matrixWorld);
      b.put(this.ringGeo, m.stone, 0, 1.48, .23, 1.46, 1.46, .8);
      this.roof(5.1, 1.5, 3.62, .6);
      this.sign('听 雨 小 院', 0, 3.38, .3, 2.2, .42, true);
      for (const s of [-1, 1]) this.lantern(s * 1.9, 2.8, .64, .85);
    });
  }
  pot(x: number, z: number, scale = 1, flowers = true, y = 0) {
    const b = this.b, m = this.m;
    b.put(this.potGeo, m.ceramic, x, y, z, scale, scale, scale);
    b.cyl(x, y + .53 * scale, z, .27 * scale, .015, m.soil);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4, h = this.r(.79, 1.14) * scale;
      const dx = Math.sin(a) * this.r(.16, .38) * scale, dz = Math.cos(a) * this.r(.16, .38) * scale;
      b.beam([x, y + .51 * scale, z], [x + dx, y + h, z + dz], .008 * scale, m.leaf[3]!);
      for (let j = 0; j < 3; j++) {
        const t = .48 + j * .20;
        b.put(b.leafGeo, m.leaf[(i + j) % 5]!, x + dx * t, y + (.50 * scale + (h - .50 * scale) * t), z + dz * t, 1.05 * scale, scale, .26 * scale, .65 + j * .22, a + (j % 2 ? .85 : -.85));
      }
      if (flowers) {
        for (let j = 0; j < 5; j++) {
          const angle = j / 5 * Math.PI * 2;
          b.put(this.petalOvalGeo, i % 3 ? m.flower : m.pink, x + dx + Math.cos(angle) * .040 * scale, y + h, z + dz + Math.sin(angle) * .040 * scale, .038 * scale, .015 * scale, .053 * scale, 0, -angle + Math.PI / 2);
        }
        b.ball(x + dx, y + h + .015, z + dz, .019 * scale, .016 * scale, .019 * scale, m.gold);
      }
    }
  }
  waterJar(x: number, z: number, scale: number, y = 0) {
    const b = this.b, m = this.m;
    b.put(this.jarGeo, m.ceramic, x, y, z, scale, scale, scale);
    b.cyl(x, y + .559 * scale, z, .313 * scale, .012, m.ceramic);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = this.r(.065, .21) * scale;
      b.put(this.lilyGeo, m.leaf[(i + 1) % 3]!, x + Math.cos(a) * r, y + .568 * scale + i * .0004, z + Math.sin(a) * r, this.r(.052, .09) * scale, 1, this.r(.052, .09) * scale, 0, a);
    }
    b.put(this.lilyGeo, m.flower, x + .10 * scale, y + .58 * scale, z - .12 * scale, .04 * scale, 1, .04 * scale, 0, .6);
  }
  leafClump(x: number, z: number, size: number, y: number, shade = 0) {
    const b = this.b, m = this.m;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + this.detail(-.2, .2), reach = this.detail(.30, .52) * size;
      b.put(b.leafGeo, m.leaf[(i + shade) % 5]!, x + Math.sin(a) * .035 * size, y + .025 * size, z + Math.cos(a) * .035 * size,
        this.detail(.8, 1.2) * size, size, reach, -.22 - (i % 3) * .18, a);
    }
  }
  gardenBloom(x: number, z: number, size: number, y: number, pink = false) {
    const b = this.b, m = this.m, top = y + .40 * size;
    b.beam([x, y, z], [x + .025 * size, top, z], .005 * size, m.leaf[3]!);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      b.put(this.petalOvalGeo, pink ? m.pink : m.flower, x + .025 * size + Math.sin(a) * .040 * size, top, z + Math.cos(a) * .040 * size,
        .035 * size, .012 * size, .052 * size, -.10, a);
    }
    b.ball(x + .025 * size, top + .010 * size, z, .018 * size, .013 * size, .018 * size, m.gold);
  }
  plantingFloor(x: number, z: number, w: number, d: number, y: number) {
    const b = this.b, m = this.m;
    const nx = Math.ceil(w / .52), nz = Math.ceil(d / .48);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const px = x - w / 2 + (ix + .5) * w / nx + this.detail(-.07, .07);
      const pz = z - d / 2 + (iz + .5) * d / nz + this.detail(-.06, .06);
      b.put(this.mossGeo, (ix + iz) % 4 ? m.grass : m.leaf[3]!, px, y + .006, pz, this.detail(.32, .47), 1, this.detail(.29, .42), 0, this.detail(0, 6), 0, false);
      if ((ix + iz) % 2 === 0) b.put(this.grassGeo, m.leaf[(ix + iz) % 5]!, px, y + .01, pz, .7, this.detail(.4, .8), .7, 0, this.detail(0, 6), 0, false);
      if ((ix + iz * 3) % 4 === 0) this.leafClump(px, pz, this.detail(.55, .9), y + .02, (ix + iz) % 5);
      if ((ix * 2 + iz) % 7 === 0) this.gardenBloom(px, pz, this.detail(.65, 1.1), y + .10, (ix + iz) % 3 !== 0);
    }
  }
  creeper(x: number, z: number, h: number, side = 1, y = 0) {
    const b = this.b, m = this.m;
    const count = Math.ceil(h / .22);
    for (let i = 0; i < count; i++) {
      const t = i / count, t1 = (i + 1) / count;
      const px = x + Math.sin(t * 8) * .14 + side * t * .16;
      const next = x + Math.sin(t1 * 8) * .14 + side * t1 * .16;
      b.beam([px, y + t * h, z], [next, y + t1 * h, z + .004], .007, m.leaf[3]!);
      for (const s of [-1, 1]) b.put(b.leafGeo, m.leaf[(i + (s > 0 ? 1 : 3)) % 5]!, px, y + t * h + .04, z + .012,
        .70, .7, this.detail(.17, .27), -1.1, s * this.detail(.6, 1.3), s * .25);
    }
  }
  bush(x: number, z: number, size = 1, flowers = false, y = GROUND) {
    const b = this.b, m = this.m;
    for(let i=0;i<7;i++){
      const a=i*2.4, rr = (i < 5 ? .27 : .13) * size;
      b.put(this.foliageGeo, flowers && i === 5 ? m.flowerBush : m.bush, x + Math.sin(a) * rr, y + (i < 5 ? .28 : .49) * size, z + Math.cos(a) * rr,
        (i < 5 ? 1.03 : .72) * size, (i < 5 ? .73 : .61) * size, size, this.r(-.7, .7), a);
    }
    for (let i = 0; i < 3; i++) {
      const a = i * 2.4;
      this.leafClump(x + Math.sin(a) * .32 * size, z + Math.cos(a) * .32 * size, .7 * size, y + .035 * size, i + 1);
      if (flowers) this.gardenBloom(x + Math.sin(a) * .30 * size, z + Math.cos(a) * .30 * size, .8 * size, y + .26 * size, i !== 0);
    }
  }
  shoreMeadow(x: number, z: number, rx: number, rz: number, canPlant: (x: number, z: number, radius: number) => boolean) {
    const b = this.b, m = this.m;
    // A few overlapping low sprays make a planted bank, with open soil between groups.
    // Only the detail stream is used, so this dressing cannot move existing world objects.
    for (let i = 0; i < 48; i++) {
      const a = this.detail(0, Math.PI * 2), r = Math.sqrt(this.detail(0, 1));
      const px = x + Math.cos(a) * r * rx, pz = z + Math.sin(a) * r * rz;
      const size = this.detail(.42, .76) * (1 - r * .25);
      if (!canPlant(px, pz, size * .8)) continue;
      b.put(this.mossGeo, i % 5 === 0 ? m.soil : i % 3 ? m.grass : m.leaf[3]!, px, GROUND + .009, pz,
        size * .82, .45, size * .67, 0, a, 0, false);
      b.put(this.grassGeo, m.leaf[(i + 1) % 5]!, px + size * .25, GROUND + .018, pz - size * .2,
        size * 1.1, this.detail(.7, 1.25), size, 0, a, 0, false);
      if (i % 4 === 0) {
        this.leafClump(px, pz, size * 1.15, GROUND + .02, i % 5);
      } else {
        for (let j = 0; j < 3; j++) {
          const angle = a + j * 2.4;
          b.put(this.foliageGeo, i % 6 === 0 && j === 1 ? m.flowerBush : m.bush,
            px + Math.sin(angle) * size * .15, GROUND + size * (.26 + j * .025), pz + Math.cos(angle) * size * .15,
            size, size * .55, size, this.detail(-.55, .35), angle, 0, false);
        }
      }
    }
  }
  tree(x: number, z: number, size = 1, willow = false, bloom=false) {
    const b = this.b, m = this.m;
    b.transform(x, GROUND, z, this.r(0, 6), () => {
      b.beam([0, 0, 0], [.12 * size, 1.7 * size, .10 * size], .23 * size, m.darkWood);
      b.beam([.12 * size, 1.7 * size, .10 * size], [.38 * size, 3.25 * size, -.08 * size], .16 * size, m.wood);
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4;
        b.beam([.025, .55 * size, 0], [Math.sin(a) * .60 * size, .04, Math.cos(a) * .60 * size], .085 * size, m.darkWood);
      }
      b.physics.box(x, GROUND + 1.6 * size, z, .48 * size, 3.2 * size, .48 * size);
      for (let i = 0; i < 6; i++) {
        const a = i * 2.4, spread = i < 4 ? 1.65 : .70, xx = Math.sin(a) * spread * size, zz = Math.cos(a) * spread * size;
        const h = this.r(i < 4 ? 3.65 : 4.8, i < 4 ? 4.35 : 5.45) * size;
        b.beam([.15, 2.1 * size, 0], [xx * .58, h - .85 * size, zz * .58], .095 * size, m.wood);
        b.beam([xx * .58, h - .85 * size, zz * .58], [xx, h - .25 * size, zz], .043 * size, m.wood);
        for(let j=0;j<12;j++){
          const a2=j*2.4;
          const radius = this.r(.25, .95) * size;
          const py = h + this.r(-.50, .65) * size, width = (1.1 + this.r(0, .35)) * size;
          const height = (1.05 + this.r(0, .3)) * size, tilt = this.r(-1.2, 1.2);
          b.put(this.foliageGeo, bloom ? m.blossom : m.crown, xx + Math.sin(a2) * radius, py, zz + Math.cos(a2) * radius,
            width * 1.08, height * .90, size, tilt - (j % 3 === 0 ? .5 : 0), a2, this.detail(-.18, .18));
          if (j % 2 === 0) b.put(b.leafGeo, m.leaf[(i + j) % 5]!, xx + Math.sin(a2) * (radius + .32 * size), py - .20 * size, zz + Math.cos(a2) * (radius + .32 * size),
            1.25 * size, size, .42 * size, this.detail(-.35, .3), a2);
        }
        if (willow) for (let j = 0; j < 6; j++) {
          const a2 = j / 6 * Math.PI * 2;
          const px = xx + Math.sin(a2) * size, pz = zz + Math.cos(a2) * size;
          const drop = this.r(.9, 2.0) * size;
          b.beam([xx, h + .25 * size, zz], [px, h - .08, pz], .012, m.leaf[3]!);
          const tilt = this.r(-.14, .14);
          for (let k = 0; k < 2; k++) {
            const reach = this.detail(.05, .28) * size, length = drop * this.detail(.62, 1.02);
            const sx = px + Math.sin(a2 + .8) * reach * (k ? 1 : -1), sz = pz + Math.cos(a2 + .8) * reach * (k ? 1 : -1);
            b.put(this.willowGeo, m.willow, sx, h - length / 2 + this.detail(-.12, .16) * size, sz,
              this.detail(.24, .36) * size, length, size, tilt + this.detail(-.22, .22), a2 + this.detail(-.45, .45), this.detail(-.14, .14));
          }
        }
      }
    });
  }
  bamboo(x: number, z: number, size = 1) {
    const b = this.b, m = this.m;
    for (let i = 0; i < 6; i++) {
      const xx = x + this.r(-.8, .8), zz = z + this.r(-.8, .8), h = this.r(3.0, 5.5) * size;
      b.cyl(xx, GROUND + h / 2, zz, .045 * size, h, m.leaf[2]!);
      for (let y = 1; y < h; y += .6) {
        b.cyl(xx, GROUND + y, zz, .055 * size, .028, m.leaf[3]!);
        const a = this.r(0, 6);
        if (y > h * .4) {
          b.beam([xx,GROUND+y,zz],[xx+Math.sin(a)*.8,GROUND+y+.2,zz+Math.cos(a)*.8],.012,m.leaf[3]!);
          for (let j = 0; j < 10; j++) for(const s of [-1,1]) b.put(b.leafGeo, m.leaf[(i + j) % 5]!, xx+Math.sin(a)*j*.075, GROUND + y + j*.02, zz+Math.cos(a)*j*.075, .9 * size, size, .38 * size, this.r(-.4,.3), a+s*.9);
        }
      }
    }
  }
  pavingRect(x: number, z: number, w: number, d: number) {
    const matrix=this.b.frame.clone().multiply(new T.Matrix4().makeTranslation(x,0,z));
    this.pavingAreas.push({inverse:matrix.invert(),w,d});
  }
  finishPaving(){
    const b=this.b,m=this.m,p=new T.Vector3();
    const inside=(x:number,z:number)=>this.pavingAreas.some(a=>{p.set(x,0,z).applyMatrix4(a.inverse);return Math.abs(p.x)<a.w/2&&Math.abs(p.z)<a.d/2;});
    let row = 0;
    for (let z = -86; z < 86;) {
      const depth = .50 + (row % 3) * .035;
      for (let x = -87 - (row % 2) * .38; x < 87;) {
        const width = this.r(.64, 1.04), cx = x + width / 2, cz = z + depth / 2;
        x += width;
        if(!inside(cx,cz))continue;
        const geo = this.pavingGeos[Math.floor(this.random() * this.pavingGeos.length)]!;
        b.put(geo, m.paving[Math.floor(this.random()*5)]!, cx, GROUND + .027 + this.r(-.003,.003), cz, width - .022, .046, depth - .018, 0, this.r(-.007,.007), 0, false);
        // Moss is sparse and low within the joints; the walking surface stays legible.
        if(this.random()<.025)b.put(this.grassGeo,m.leaf[3]!,cx+width/2,GROUND+.035,cz+depth/2,.22,.12,.22,0,this.r(0,6),0,false);
      }
      z += depth; row++;
    }
  }
  path(a: [number, number], c: [number, number], width = 4.4) {
    const dx = c[0] - a[0], dz = c[1] - a[1], length = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const b = this.b;
    b.transform((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
      this.pavingRect(0, 0, width, length + 1.2);
    });
  }
  pavilion(x: number, z: number, size = 1) {
    const b = this.b, m = this.m;
    b.transform(x, GROUND, z, 0, () => {
      b.cyl(0, .13, 0, 3.0 * size, .26, m.stone);
      b.physics.box(x, GROUND + .11, z, 4.6 * size, .22, 4.6 * size);
      for (const xx of [-2, 2]) for (const zz of [-2, 2]) b.box(xx * size, 1.9, zz * size, .18, 3.55, .18, m.wood, true);
      this.roof(5.4 * size, 5.3 * size, 3.65, 1.45);
      this.table(0, .25, 0, 1.3, 1.1);
      this.bench(0, 1.4); this.bench(0, -1.4, Math.PI);
      for (const s of [-1, 1]) this.lantern(s * 2 * size, 3.0, 2 * size, .75);
    });
  }
  build() {
    const b = this.b, m = this.m;
    this.pavingRect(-52, -55, 33, 29);
    for (const ids of PATHS) for (let i = 1; i < ids.length; i++) if(ids[i-1]!=='A')this.path(WAYPOINTS[ids[i - 1]!]!, WAYPOINTS[ids[i]!]!);
    this.pavingRect(-24, -19, 18, 16);
    this.building(-52, -66, 14, 8, 0, '听 雨 堂', true);
    this.building(-65, -55, 12, 6, Math.PI / 2, '竹 影');
    this.building(-39, -55, 12, 6, -Math.PI / 2, '云 间');
    this.wall(-52, -72, 34); this.wall(-69, -56, 32, Math.PI / 2); this.wall(-35, -56, 32, Math.PI / 2);
    this.wall(-61.7, -40, 14.6); this.wall(-42.3, -40, 14.6); this.gate(-52, -40);
    const houses: [number, number, number, number, number, string, number][] = [
      [-61, -23, 10, 7, Math.PI / 2, '春 和 茶 铺', 1], [-39, -6, 9, 7, Math.PI, '花 间', 2],
      [-64, 1, 10, 8, Math.PI / 2, '青 禾', 1], [-63, 21, 11, 8, Math.PI / 2, '松 风', 2],
      [-20, 8, 10, 7, Math.PI / 2, '临 水 居', 2], [-31, 29, 9, 7, Math.PI, '归 云', 1],
      [-58, 65, 11, 8, 0, '南 山', 1], [46, 32, 10, 7, -Math.PI / 2, '竹 里', 2],
      [46, 60, 10, 8, -Math.PI / 2, '见 山', 1], [-77, -19, 8, 7, Math.PI / 2, '小 满', 1],
      [-31, 69, 10, 8, Math.PI, '枕 溪', 2],
      [-19,-33,10,7,0,'一 叶 茶',1],[-12,-57,11,8,0,'望 溪',2],[34,-68,10,7,Math.PI,'云 水',1],
    ];
    houses.forEach(([x, z, w, d, yaw, name, floors]) => this.building(x, z, w, d, yaw, name, name.includes('茶'), floors));
    this.pavilion(44, -4); this.pavilion(49, -54, .8);
    // The courtyard keeps a clear central route, with layered planting along its walls.
    for (const [x, z] of [[-64, -44], [-40, -44], [-64, -60], [-41, -61]]) this.bamboo(x!, z!, .85);
    b.transform(-61, GROUND, -51, 0, () => {
      this.waterJar(0, 0, 2);
    });
    for (let i = 0; i < 18; i++) {
      const x = i % 2 ? -64 + this.r(-1, 1) : -40 + this.r(-1, 1), z = this.r(-60, -43);
      this.bush(x, z, this.r(.6, 1), true);
    }
    this.tree(-28, -23, 1.15); this.tree(-60, -33, .95, true);
    this.tree(-32, -53, 1.15, true);
    this.tree(-10, -23, 1.25, true); this.tree(-12, 24, 1.25, true); this.tree(-21, 48, 1.05, true);
    this.tree(27, -23, 1.2, true); this.tree(26, 20, 1.1, true); this.tree(25, 66, 1.2, true);
    // Planting beds frame the courtyard rather than filling the main walking corridor.
    for(const x of [-61,-43])for(const z of [-47,-55]){
      b.box(x,GROUND+.09,z,3.8,.18,3.4,m.mortar);
      b.box(x,GROUND+.19,z,3.55,.04,3.15,m.soil);
      for(const s of [-1,1]){b.box(x+s*1.9,GROUND+.22,z,.17,.24,3.6,m.stone);b.box(x,GROUND+.22,z+s*1.7,3.9,.24,.17,m.stone);}
      this.plantingFloor(x, z, 3.3, 2.9, GROUND + .215);
      for(let i=0;i<7;i++)this.bush(x+this.r(-1.2,1.2),z+this.r(-1.1,1.1),this.r(.4,.65),true,GROUND+.2);
      for(let i=0;i<5;i++)b.put(this.clumpGeo,m.stone,x+this.r(-1.5,1.5),GROUND+.26,z+this.r(-1.3,1.3),this.r(.18,.38),this.r(.15,.31),this.r(.2,.35),this.r(0,1),this.r(0,6));
    }
    this.tree(-62,-58,.8);
    for(const x of [-57.5,-46.5]){
      b.box(x,GROUND+.11,-56,3.1,.22,4.6,m.stone);
      b.box(x,GROUND+.23,-56,2.9,.04,4.4,m.soil);
      this.plantingFloor(x, -56, 2.7, 4.2, GROUND + .255);
      for(let i=0;i<11;i++)this.bush(x+this.r(-1.2,1.2),-56+this.r(-1.9,1.9),this.r(.55,.85),true,GROUND+.24);
      for (let i = 0; i < 5; i++) {
        const px = x + this.detail(-1.05, 1.05), pz = -56 + this.detail(-1.65, 1.65);
        b.put(this.clumpGeo, i % 2 ? m.stone : m.mortar, px, GROUND + .31, pz, this.detail(.15, .26), this.detail(.10, .20), this.detail(.14, .27), this.detail(0, 1), this.detail(0, 6));
        this.leafClump(px + .17, pz - .08, .7, GROUND + .28, i);
      }
      for(let j=0;j<8;j++)b.put(this.pavingGeos[j%3]!,m.paving[j%5]!,x-1.45+(j%2)*2.9,GROUND+.28,-57.9+Math.floor(j/2)*1.10,.22,.22,.85,0,this.r(-.1,.1));
    }
    this.tree(-58,-58,.78,true);this.bamboo(-46,-59,.75);
    this.tree(53,-57,.9,false,true);this.tree(-66,-66,.8,false,true);this.tree(48,9,1.1,false,true);
    b.transform(-55.5,GROUND,-53.4,0,()=>{
      this.waterJar(0, 0, 1.7);
    });
    // Small street objects, awnings and outdoor seating carry the life of the reference.
    b.transform(-57,GROUND,-26,Math.PI/2,()=>{
      b.box(0,2.65,1.1,4.7,.07,2.4,m.cream,false,.0);
      for(const x of [-2.15,2.15])b.box(x,1.4,2.1,.065,2.8,.065,m.wood);
      this.table(-1,0,1.3,1.5,.8);this.bench(-1,2.15);this.pot(1.5,2.1,.8);
      b.box(2.1,.64,1.3,.65,1.28,.1,m.darkWood);this.sign('新 茶',2.1,.7,1.365,.5,.7);
    });
    for(const [x,z]of [[-35,-18],[-25,-13],[-46,-27],[-48,1],[-42,27],[33,-18],[31,27],[-19,39]])b.transform(x!,GROUND,z!,0,()=>{this.pot(0,0,1);this.pot(.75,.25,.65);});
    for(const [x,z]of [[-28,-10],[39,5],[-19,48]])b.transform(x!,GROUND,z!,0,()=>{this.bench(0,0);this.pot(1.25,0,.75);});
    // A narrow covered veranda beside the courtyard's eastern wing.
    b.transform(-43,GROUND,-55,Math.PI/2,()=>{
      for(const x of [-5,-2,1,4])b.box(x,1.6,0,.15,3.2,.15,m.wood,true);
      this.roof(11.4,2.1,3.1,.35);
    });
    b.transform(-29, GROUND, -17, 0, () => { this.bench(0, 0, -.2); this.bench(7, -5, .5); });
    b.transform(-54.8, GROUND, -20, 0, () => { this.table(0, 0, 0); this.bench(0, .9); this.pot(1.7, 0, .9); });
    // Garden foreground, bamboo groves and naturally dense town edges.
    for (let i = 0; i < 36; i++) {
      const x = this.r(45, 74), z = this.r(-73, 25);
      if (Math.hypot(x - 49, z + 54) < 7 || Math.hypot(x - 44, z + 4) < 8) continue;
      this.bamboo(x, z, this.r(.8, 1.2));
    }
    for (let i = 0; i < 25; i++) {
      const side = i % 2 ? -1 : 1, x = side * this.r(76, 91), z = this.r(-86, 86);
      this.tree(x, z, this.r(1, 1.6));
    }
    for (let i = 0; i < 170; i++) {
      const z = this.r(-83, 84), side = i % 2 ? -1 : 1;
      if (Math.abs(z + 38) < 5 || Math.abs(z - 44) < 5) continue;
      const x = riverX(z) + side * this.r(10.2, 14.5);
      this.bush(x, z, this.r(.35, .9), i % 4 === 0);
    }
    for (let i = 0; i < 50; i++) this.bush(this.r(-84, -71), this.r(-75, 78), this.r(.8, 1.4), i % 3 === 0);
    for (let i = 0; i < 15; i++) this.bush(-65 + this.r(-4, 4), 48 + this.r(-4, 4), .7, true);
    this.tree(-71, 51, 1.25); this.path([-65, 48], [-69, 50], 2.5);
    for(const [x,z]of [[-8,-68],[-25,-48],[-37,-33],[-7,3],[34,-49],[48,-29],[32,19],[-40,49],[-61,77],[-7,74],[63,17],[67,-62]])this.tree(x!,z!,this.r(1.0,1.5),this.random()>.6);
    const pathSegments: [[number,number],[number,number]][]=[];
    for(const ids of PATHS)for(let i=1;i<ids.length;i++)pathSegments.push([WAYPOINTS[ids[i-1]!]!,WAYPOINTS[ids[i]!]!]);
    const distToPath=(x:number,z:number)=>Math.min(...pathSegments.map(([a,c])=>{const dx=c[0]-a[0],dz=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}));
    const pavingPoint = new T.Vector3();
    const isPaved = (x:number,z:number) => this.pavingAreas.some(area=>{
      pavingPoint.set(x,0,z).applyMatrix4(area.inverse);
      return Math.abs(pavingPoint.x)<area.w/2+.25&&Math.abs(pavingPoint.z)<area.d/2+.25;
    });
    for(let i=0;i<23000;i++){
      const x=this.r(-86,85),z=this.r(-85,85),dist=distToPath(x,z);
      if(Math.abs(x-riverX(z))<9.6 || (x>-69&&x<-35&&z>-72&&z<-40) || dist<2.6 || isPaved(x,z))continue;
      if(dist>9&&this.random()>.45)continue;
      b.put(this.grassGeo,m.leaf[i%3]!,x,GROUND+.025,z,this.r(.75,1.35),this.r(.65,1.05),this.r(.75,1.35),0,this.r(0,6),0,false);
      if(i%160===0)this.bush(x,z,this.r(.35,.7),i%320===0);
    }
    for(const [a,c]of pathSegments){
      const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
      for(let t=0;t<len;t+=3.5)for(const side of [-1,1]){
        const x=a[0]+dx*t/len+nx*side*3.6,z=a[1]+dz*t/len+nz*side*3.6;
        if(Math.abs(x-riverX(z))<10 || (x>-69&&x<-35&&z>-72&&z<-40))continue;
        const size = this.r(.35, .65);
        if (isPaved(x, z)) {
          // Preserve the original layout RNG even when a decorative clump is omitted.
          for (let i = 0; i < 7; i++) this.random();
          continue;
        }
        this.bush(x,z,size,true);
      }
    }
    for (const [x, z] of [[-44, -34], [-33, -22], [-16, -34], [30, -35], [33, 13], [29, 39], [-15, 44], [-47, 20]]) {
      b.transform(x!, GROUND, z!, 0, () => {
        b.box(0, .1, 0, .55, .2, .55, m.stone);
        b.box(0, .95, 0, .11, 1.8, .11, m.wood);
        b.box(0, 1.8, 0, .43, .5, .43, m.warm);
        for (const s of [-1, 1]) { b.box(s * .22, 1.8, .22, .04, .54, .04, m.darkWood); b.box(s * .22, 1.8, -.22, .04, .54, .04, m.darkWood); }
        b.put(b.coneGeo, m.roof[0]!, 0, 2.18, 0, .4, .26, .4, 0, Math.PI / 4);
      });
    }
    for(const [x,z,yaw,text]of [[-46,-22,Math.PI,'望溪桥 →'],[-18,-25,-.6,'竹里 →'],[32,4,.8,'归云桥 →'],[-29,43,Math.PI,'听雨小院 →']]as const){
      b.transform(x,GROUND,z,yaw,()=>{b.box(0,.9,0,.1,1.8,.1,m.wood);b.box(0,1.65,0,1.6,.42,.1,m.woodLight);this.sign(text,0,1.65,.065,1.5,.35);});
    }
    this.finishPaving();
    // Local foreground beds tie bridge masonry and waterside trees into the landscape.
    // Clearance includes each clump's reach, not only its centre, and leaves both bridge mouths open.
    const canPlantShore = (x: number, z: number, radius: number) => {
      if (Math.abs(x - riverX(z)) < 9.9 + radius || distToPath(x, z) < 2.65 + radius) return false;
      if ((x > -7 - radius && x < 29 + radius) && (Math.abs(z + 38) < 3.0 + radius || Math.abs(z - 44) < 2.7 + radius)) return false;
      return !this.pavingAreas.some(area => {
        pavingPoint.set(x, 0, z).applyMatrix4(area.inverse);
        return Math.abs(pavingPoint.x) < area.w / 2 + radius + .18 && Math.abs(pavingPoint.z) < area.d / 2 + radius + .18;
      });
    };
    for (const [x, z, rx, rz] of [
      [-1.5, -30.7, 2.3, 3.5], [-1.0, -45.7, 2.5, 2.6],
      [23.1, -29.0, 2.0, 3.4], [23.1, -45.7, 2.3, 2.6],
      [-10, -23, 3.0, 2.4], [27, -23, 2.5, 2.6],
      [-12, 24, 2.8, 2.4], [26, 20, 2.4, 2.8],
    ]) this.shoreMeadow(x!, z!, rx!, rz!, canPlantShore);
  }
}
