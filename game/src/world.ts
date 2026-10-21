import * as T from 'three';
import { Builder } from './builder';
import { Environment } from './environment';
import { GROUND, RIVER_HALF, WATER, WORLD_HALF } from './config';
import { makeMaterials } from './materials';
import type { Physics } from './physics';
import { NightLighting } from './night-lighting';
import { WetSurfaces } from './wet-surfaces';
import { Rain } from './rain';
import { mooredBoat } from './waterfront';

export class Town {
  materials=makeMaterials();
  lighting:NightLighting;
  wet:WetSurfaces;
  rain:Rain;
  quality='standard';
  windStrength = 1;
  constructor(public scene:T.Scene,public physics:Physics){
    const b=new Builder(scene,physics),m=this.materials;
    this.lighting=new NightLighting(scene);
    // A single dark, ceramic-edged square supports the entire miniature neighbourhood.
    b.box(0,-.25,0,56,1.1,56,m.black);b.box(0,.36,0,56.16,.10,56.16,m.roofEdge);
    for(const [left,right]of [[-WORLD_HALF,8-RIVER_HALF],[8+RIVER_HALF,WORLD_HALF]]){
      const width=right!-left!,x=(left!+right!)/2;
      b.box(x,GROUND-.45,0,width,.90,56,m.ground);physics.box(x,GROUND-.16,0,width,.32,56);
    }
    for(let z=-27;z<=27;z+=1.1)for(const side of [-1,1]){
      const x=8+side*RIVER_HALF;
      b.box(x,.86,z,.45,.75,1.12,m.mortar);b.box(x,GROUND+.03,z,.58,.13,1.1,m.stone);
      for(let row=0;row<3;row++)for(let j=0;j<2;j++)b.box(x-side*.25,.57+row*.22,z-.25+j*.51,.07,.20,.48,m.brick[(row+j)%4]!);
      if(Math.abs(z+3)<1.9||Math.abs(z-18)<1.6)continue;
      physics.box(x,GROUND+.42,z,.20,.9,1.14);
      b.box(x,GROUND+.48,z,.095,.95,.095,m.darkWood);b.box(x,GROUND+.92,z,.09,.08,1.14,m.woodLight);b.box(x,GROUND+.43,z,.06,.06,1.14,m.wood);
    }
    for(const side of [-1,1]){
      physics.box(side*(WORLD_HALF-.35),GROUND+1,0,.3,4,56);
      physics.box(0,GROUND+1,side*(WORLD_HALF-.35),56,4,.3);
      b.box(side*27.8,GROUND+.08,0,.28,.17,56,m.roofEdge);b.box(0,GROUND+.08,side*27.8,56,.17,.28,m.roofEdge);
    }
    this.bridge(b,-3,2.5,13.5,false);this.bridge(b,18,2.5,13.5,true);
    const env=new Environment(b,m,this.lighting);env.build();
    b.transform(8,WATER,9,.05,()=>mooredBoat(b,m));
    b.finish();
    this.wet=new WetSurfaces();scene.add(this.wet.floor,this.wet.water);
    this.rain=new Rain(env.roofs);scene.add(this.rain.mesh);this.wet.hiddenDuringCapture.push(this.rain.mesh);
  }
  bridge(b: Builder, z: number, start: number, end: number, wood: boolean) {
    const m = this.materials, width = wood ? 2.7 : 3.3, n = 32;
    const yAt = (t: number) => GROUND + .05 + (wood ? .25 : .90) * Math.sin(Math.PI * t);
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
    const steps = 8;
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
  setQuality(quality:string){this.quality=quality;this.wet.setQuality(quality);}
  setClimate(rain:number,wetness:number,lamps:number,wind:number){
    this.rain.setIntensity(rain);this.wet.setWeather(wetness,rain);this.lighting.strength=lamps;this.windStrength=.45+wind;
    this.materials.ground.roughness=T.MathUtils.lerp(.82,.32,wetness);
    this.materials.paving.forEach((material,i)=>{material.roughness=T.MathUtils.lerp(.83,.34+i*.027,wetness);});
    this.materials.paper.emissiveIntensity=.28*lamps;this.materials.warm.emissiveIntensity=1.7*Math.max(.2,lamps);
    this.materials.lantern.color.setRGB(.80,.055,.025).multiplyScalar(.42+.58*lamps);
    this.materials.paperLantern.color.setRGB(1.15,.70,.28).multiplyScalar(.45+.55*lamps);
  }
  update(time:number,camera:T.Camera,dt=.016){
    this.materials.wind.value=time*this.windStrength;this.wet.time=time;this.rain.update(dt);this.lighting.update(camera,time);
  }
  dispose(){this.wet.dispose();this.lighting.dispose();}
}
