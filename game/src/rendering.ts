import * as T from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
/** Linear-light contact shading, restrained lamp bloom and fine depth contours. */
export class ScenicRenderer {
  target:T.WebGLRenderTarget;
  glowA:T.WebGLRenderTarget;
  glowB:T.WebGLRenderTarget;
  material:T.ShaderMaterial;
  extract:T.ShaderMaterial;
  blur:T.ShaderMaterial;
  quad:FullScreenQuad;
  quality='standard';
  constructor(public renderer:T.WebGLRenderer,public scene:T.Scene,public camera:T.PerspectiveCamera){
    this.target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:2,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
    this.glowA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});this.glowB=this.glowA.clone();
    this.extract=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader,uniforms:{image:{value:this.target.texture}},
      fragmentShader:`uniform sampler2D image;varying vec2 vUv;void main(){vec3 c=texture2D(image,vUv).rgb;float peak=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.55,1.6,peak),1.);}`});
    this.blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader,uniforms:{image:{value:this.glowA.texture},stepUV:{value:new T.Vector2()}},
      fragmentShader:`uniform sampler2D image;uniform vec2 stepUV;varying vec2 vUv;void main(){vec3 c=texture2D(image,vUv).rgb*.227027;c+=(texture2D(image,vUv+stepUV*1.384615).rgb+texture2D(image,vUv-stepUV*1.384615).rgb)*.316216;c+=(texture2D(image,vUv+stepUV*3.230769).rgb+texture2D(image,vUv-stepUV*3.230769).rgb)*.07027;gl_FragColor=vec4(c,1.);}`});
    this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader,
      uniforms:{tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},tGlow:{value:this.glowA.texture},inverseProjection:{value:camera.projectionMatrixInverse},resolution:{value:new T.Vector2()},strength:{value:.55}},
      fragmentShader:`varying vec2 vUv;uniform sampler2D tColor,tDepth,tGlow;uniform mat4 inverseProjection;uniform vec2 resolution;uniform float strength;
        vec3 viewPosition(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        void main(){
          vec3 col=texture2D(tColor,vUv).rgb;float depth=texture2D(tDepth,vUv).r;
          vec3 p=viewPosition(vUv),n=normalize(cross(dFdx(p),dFdy(p)));
          if(depth<.9995&&p.z> -50.){
            float occ=0.;vec2 spread=vec2(resolution.y/resolution.x,1.)*min(.065,.56/max(-p.z,1.));
            for(int i=0;i<10;i++){
              float angle=float(i)*2.39996323;vec2 offset=vec2(cos(angle),sin(angle))*spread*(.3+.7*float(i+1)/10.);
              vec3 q=viewPosition(clamp(vUv+offset,vec2(.001),vec2(.999))),delta=q-p;float len=length(delta);
              occ+=max(0.,dot(n,delta/max(len,.001))-.16)*(1.-smoothstep(.04,.60,len));
            }
            col*=1.-clamp(occ*.43,0.,.35)*strength;
            vec2 pixel=1./resolution;
            float discontinuity=max(abs(viewPosition(vUv+vec2(pixel.x,0.)).z-p.z),abs(viewPosition(vUv+vec2(0.,pixel.y)).z-p.z));
            col*=1.-smoothstep(.12,.45,discontinuity)*.11;
          }
          col+=texture2D(tGlow,vUv).rgb*.26;
          vec2 edge=vUv*2.-1.;col*=1.-dot(edge,edge)*.035;
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.quad=new FullScreenQuad(this.material);this.resize();
  }
  resize(){
    const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.target.setSize(size.x,size.y);this.material.uniforms.resolution!.value.copy(size);
    const w=Math.max(1,Math.ceil(size.x/4)),h=Math.max(1,Math.ceil(size.y/4));this.glowA.setSize(w,h);this.glowB.setSize(w,h);
  }
  setQuality(quality:string){this.quality=quality;this.target.samples=quality==='high'?4:2;this.material.uniforms.strength!.value=quality==='high'?.7:.55;this.target.dispose();this.resize();}
  render(){
    if(this.quality==='low'){this.renderer.render(this.scene,this.camera);return;}
    const r=this.renderer;r.setRenderTarget(this.target);r.render(this.scene,this.camera);
    r.setRenderTarget(this.glowA);this.quad.material=this.extract;this.quad.render(r);
    r.setRenderTarget(this.glowB);this.blur.uniforms.image!.value=this.glowA.texture;this.blur.uniforms.stepUV!.value.set(1/this.glowA.width,0);this.quad.material=this.blur;this.quad.render(r);
    r.setRenderTarget(this.glowA);this.blur.uniforms.image!.value=this.glowB.texture;this.blur.uniforms.stepUV!.value.set(0,1/this.glowA.height);this.quad.render(r);
    r.setRenderTarget(null);this.quad.material=this.material;this.quad.render(r);
  }
  dispose(){this.target.dispose();this.glowA.dispose();this.glowB.dispose();this.material.dispose();this.extract.dispose();this.blur.dispose();this.quad.dispose();}
}
