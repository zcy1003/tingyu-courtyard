import * as T from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** A depth-only contact pass: foliage keeps its cutout, and no second scene draw is needed. */
export class ScenicRenderer {
  target: T.WebGLRenderTarget;
  material: T.ShaderMaterial;
  quad: FullScreenQuad;
  quality = 'standard';
  constructor(public renderer: T.WebGLRenderer, public scene: T.Scene, public camera: T.PerspectiveCamera) {
    this.target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 2, depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType) });
    this.material = new T.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture }, inverseProjection: { value: camera.projectionMatrixInverse }, resolution: { value: new T.Vector2() }, strength: { value: .60 } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform sampler2D tColor,tDepth;uniform mat4 inverseProjection;uniform vec2 resolution;uniform float strength;
        vec3 viewPosition(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        void main(){
          vec3 col=texture2D(tColor,vUv).rgb;
          float depth=texture2D(tDepth,vUv).r;
          vec3 p=viewPosition(vUv),dx=dFdx(p),dy=dFdy(p);
          vec3 n=normalize(cross(dx,dy));
          if(depth<.9995&&p.z> -65.){
            float radius=.65,occ=0.;vec2 spread=vec2(resolution.y/resolution.x,1.)*min(.065,.64/max(-p.z,1.));
            for(int i=0;i<12;i++){
              float angle=float(i)*2.39996323;
              vec2 offset=vec2(cos(angle),sin(angle))*spread*(.3+.7*float(i+1)/12.);
              vec3 q=viewPosition(clamp(vUv+offset,vec2(.001),vec2(.999))),delta=q-p;
              float len=length(delta);
              occ+=max(0.,dot(n,delta/max(len,.001))-.16)*(1.-smoothstep(.04,radius,len));
            }
            float ao=clamp(occ*.43,0.,.35)*strength;
            col*=vec3(1.-ao*.86,1.-ao*.92,1.-ao);
          }
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.quad = new FullScreenQuad(this.material); this.resize();
  }
  resize() {
    const size = this.renderer.getDrawingBufferSize(new T.Vector2());
    this.target.setSize(size.x, size.y); this.material.uniforms.resolution!.value.copy(size);
  }
  setQuality(quality: string) { this.quality = quality; this.target.samples = quality === 'high' ? 4 : 2; this.material.uniforms.strength!.value = quality === 'high' ? .8 : .6; this.target.dispose(); this.resize(); }
  render() {
    if (this.quality === 'low') { this.renderer.render(this.scene, this.camera); return; }
    this.renderer.setRenderTarget(this.target); this.renderer.render(this.scene, this.camera); this.renderer.setRenderTarget(null); this.quad.render(this.renderer);
  }
  dispose() { this.target.dispose(); this.material.dispose(); this.quad.dispose(); }
}
