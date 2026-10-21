import * as T from 'three';

export function makeSky(){
  const sky=new T.Mesh(new T.SphereGeometry(180,32,20),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 direction;
      void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec3 color=mix(vec3(.024,.043,.066),vec3(.012,.022,.038),pow(h,.6));
      float clouds=sin(d.x*17.+sin(d.z*11.))*sin(d.z*21.-d.x*7.);color+=vec3(.005,.008,.011)*smoothstep(.1,.8,clouds);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  }));sky.name='Rain-night blue hour sky';return sky;
}
