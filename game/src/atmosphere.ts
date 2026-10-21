import * as T from 'three';

/** A painted sky dome; every palette change uses the same output transform. */
export function makeSky() {
  return new T.Mesh(new T.SphereGeometry(180, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new T.Color('#203044') }, horizon: { value: new T.Color('#2b4052') },
      cloudColor: { value: new T.Color('#62747e') }, cloudCover: { value: .78 },
      sunDirection: { value: new T.Vector3(-16,32,20).normalize() }, sunColor: { value: new T.Color('#c6dbed') },
      sunVisibility: { value: .02 }, daylight: { value: 0 }, time: { value: 0 },
    },
    vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 direction;uniform vec3 top,horizon,cloudColor,sunDirection,sunColor;
      uniform float cloudCover,sunVisibility,daylight,time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.07)*.17;}
      void main(){
        vec3 d=normalize(direction);float h=max(d.y,0.);
        vec3 color=mix(horizon,top,pow(h,.52));
        vec2 p=d.xz/(h+.22)*2.7+vec2(time*.003,0.);
        float field=fbm(p+vec2(3.1,8.7));
        float coverage=smoothstep(.73-cloudCover*.34,.86-cloudCover*.27,field)*smoothstep(.015,.15,h);
        color=mix(color,cloudColor,coverage*(.5+cloudCover*.40));
        float sun=max(dot(d,sunDirection),0.);
        color+=sunColor*(pow(sun,28.)*.18+smoothstep(.9992,.99985,sun)*.55)*sunVisibility*(1.-coverage);
        vec2 stars=floor(d.xz/max(h,.08)*330.);float sparkle=step(.998,hash(stars))*pow(max(h,0.),.6);
        color+=vec3(.28,.34,.4)*sparkle*(1.-daylight)*(1.-cloudCover);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
}
