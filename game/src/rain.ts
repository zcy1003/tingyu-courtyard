import * as T from 'three';
import { GROUND, WORLD_HALF, rng } from './config';
import type { Environment } from './environment';

export class Rain {
  mesh: T.LineSegments;
  drops: {x:number;y:number;z:number;speed:number;length:number;floor:number}[]=[];
  random=rng(829);
  positions:Float32Array;
  intensity = .58;
  constructor(roofs:Environment['roofs']) {
    const count=2400,point=new T.Vector3();this.positions=new Float32Array(count*6);
    for(let i=0;i<count;i++){
      const x=(this.random()*2-1)*(WORLD_HALF-.4),z=(this.random()*2-1)*(WORLD_HALF-.4);
      let floor=GROUND+.06;
      for(const roof of roofs){point.set(x,0,z).applyMatrix4(roof.inverse);if(Math.abs(point.x)<roof.w/2+.05&&Math.abs(point.z)<roof.d/2+.05){const t=Math.min(1,Math.abs(point.z)/(roof.d/2));floor=Math.max(floor,roof.y+roof.eave+roof.rise*(1-t)-.20*Math.sin(Math.PI*t)+.35);}}
      this.drops.push({x,y:floor+this.random()*(15-floor),z,floor,speed:7+this.random()*4,length:.12+this.random()*.16});
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));
    this.mesh=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#acc5d6',transparent:true,opacity:.23,depthWrite:false}));
    this.mesh.name='Roof-aware rain';this.mesh.frustumCulled=false;this.update(.016);
  }
  update(dt:number){
    if(!this.mesh.visible)return;
    this.drops.forEach((drop,i)=>{drop.y-=dt*drop.speed*(.75+this.intensity*.45);if(drop.y<drop.floor)drop.y=14+this.random()*1.5;const k=i*6;this.positions.set([drop.x,drop.y,drop.z,drop.x-(.025+this.intensity*.05),drop.y+drop.length*(.75+this.intensity*.5),drop.z-.016],k);});
    this.mesh.geometry.getAttribute('position').needsUpdate=true;
  }
  setIntensity(value:number){
    this.intensity=value;this.mesh.visible=value>.004;
    this.mesh.geometry.setDrawRange(0,Math.round(this.drops.length*Math.min(1,value/.72))*2);
    (this.mesh.material as T.LineBasicMaterial).opacity=.14+value*.16;
  }
}
