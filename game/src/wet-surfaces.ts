import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GROUND, RIVER_HALF, WATER, WORLD_HALF } from './config';

/** Two physically placed planes: wet stone and the lower canal water. */
export class WetSurfaces {
  floor: Reflector;
  water: Reflector;
  time = 0;
  quality = 'standard';
  hiddenDuringCapture: T.Object3D[] = [];
  constructor() {
    this.floor = this.make(WORLD_HALF * 2 - .45, WORLD_HALF * 2 - .45, false);
    this.floor.position.y = GROUND + .054;
    this.water = this.make(RIVER_HALF * 2, WORLD_HALF * 2 - .4, true);
    this.water.position.set(8, WATER, 0);
    this.hiddenDuringCapture.push(this.floor, this.water);
  }
  make(w: number, d: number, water: boolean) {
    const mirror = new Reflector(new T.PlaneGeometry(w, d), {
      textureWidth: 896, textureHeight: 640, multisample: 0, clipBias: .002,
      shader: {
        uniforms: { tDiffuse: { value: null }, color: { value: new T.Color('#a2b8c4') }, textureMatrix: { value: new T.Matrix4() }, time: { value: 0 }, isWater: { value: water ? 1 : 0 }, eye: { value: new T.Vector3() }, wetness: {value:1}, rainAmount: {value:.58} },
        vertexShader: `uniform mat4 textureMatrix;varying vec4 vMirror;varying vec3 vWorld;
          void main(){vMirror=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D tDiffuse;uniform float time,isWater,wetness,rainAmount;uniform vec3 eye;varying vec4 vMirror;varying vec3 vWorld;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
          void main(){
            if(isWater<.5&&abs(vWorld.x-8.)<3.13)discard;
            vec2 uv=vMirror.xy/vMirror.w;
            vec2 ripple=vec2(sin(vWorld.z*7.+time*1.5+sin(vWorld.x*3.)),cos(vWorld.x*8.-time))*mix(.0006,.0022,isWater);
            uv=clamp(uv+ripple,vec2(.002),vec2(.998));
            vec3 reflected=texture2D(tDiffuse,uv).rgb*.50;
            reflected+=(texture2D(tDiffuse,uv+vec2(.0016,0.)).rgb+texture2D(tDiffuse,uv-vec2(.0016,0.)).rgb)*.18;
            reflected+=(texture2D(tDiffuse,uv+vec2(0.,.001)).rgb+texture2D(tDiffuse,uv-vec2(0.,.001)).rgb)*.07;
            vec3 view=normalize(eye-vWorld);float fres=pow(1.-max(view.y,0.),3.);
            vec2 cell=floor(vWorld.xz*1.8);float phase=fract(time*.72+hash(cell));
            float radius=length(fract(vWorld.xz*1.8)-.5);
            float ring=(1.-smoothstep(.007,.025,abs(radius-phase*.40)))*(1.-phase)*step(1.-rainAmount*.6,hash(cell+10.))*rainAmount;
            vec3 color;float alpha;
            if(isWater>.5){
              color=mix(vec3(.018,.065,.082),reflected,.48+fres*.40);
              color+=vec3(.14,.24,.28)*ring*.16;alpha=1.;
            }else{
              float field=noise(vWorld.xz*.7)*.72+noise(vWorld.xz*2.1)*.28;
              alpha=(.03+smoothstep(.34,.68,field)*.18)*(.8+fres*.45)*wetness;
              color=reflected*vec3(.95,1.,1.03)+vec3(.15,.24,.28)*ring*.15;
            }
            gl_FragColor=vec4(color,alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`
      }
    });
    mirror.name = water ? 'Rain canal reflection' : 'Broken wet-stone reflections';
    mirror.rotation.x = -Math.PI / 2;
    const material = mirror.material as T.ShaderMaterial;
    material.transparent = !water; material.depthWrite = water;
    mirror.renderOrder = water ? 0 : 1;
    const capture = mirror.onBeforeRender.bind(mirror);
    const lastPosition = new T.Vector3(999,999,999), lastRotation = new T.Quaternion(), lastProjection = new T.Matrix4();
    let capturedAt = -10;
    mirror.onBeforeRender = (renderer, scene, camera, geometry, mat, group) => {
      material.uniforms.time!.value = this.time; material.uniforms.eye!.value.copy(camera.position);
      const moved = lastPosition.distanceToSquared(camera.position) > .0001 || lastRotation.angleTo(camera.quaternion) > .001;
      const invalid = !lastProjection.equals(camera.projectionMatrix) || capturedAt < 0;
      const interval = this.quality === 'low' ? 1/12 : this.quality === 'high' ? 1/35 : 1/24;
      if (!invalid && this.time-capturedAt < (moved ? interval : .22)) return;
      const visibility = this.hiddenDuringCapture.map(object => object.visible);
      this.hiddenDuringCapture.forEach(object => { object.visible = false; });
      try { capture(renderer,scene,camera,geometry,mat,group); }
      finally { this.hiddenDuringCapture.forEach((object,i) => { object.visible = visibility[i]!; }); }
      capturedAt=this.time;lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);lastProjection.copy(camera.projectionMatrix);
    };
    mirror.userData.invalidateReflection = () => { capturedAt=-10; };
    return mirror;
  }
  setQuality(quality: string) {
    this.quality=quality;
    const width=quality==='high'?1280:quality==='low'?512:896;
    for(const mirror of [this.floor,this.water]){mirror.getRenderTarget().setSize(width,Math.round(width*.714));mirror.userData.invalidateReflection();}
  }
  setWeather(wetness:number,rain:number){
    this.floor.visible=wetness>.008;
    for(const mirror of [this.floor,this.water]){
      const u=(mirror.material as T.ShaderMaterial).uniforms;u.wetness!.value=wetness;u.rainAmount!.value=rain;
    }
  }
  invalidate(){for(const mirror of [this.floor,this.water])mirror.userData.invalidateReflection();}
  dispose() { for(const mirror of [this.floor,this.water]){mirror.geometry.dispose();mirror.dispose();} }
}
