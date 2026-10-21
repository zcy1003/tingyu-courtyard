import * as T from 'three';

// Continuous ridgelines with several frequencies keep the horizon organic from every street.
export function addMountains(scene: T.Scene) {
  for (let layer = 0; layer < 3; layer++) {
    const segments = 768, rows = 24, radius = 160 + layer * 57;
    const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
    const low = new T.Color(['#577e69', '#7c9e8e', '#a0b8ad'][layer]!);
    const high = new T.Color(['#91a88a', '#a1b6a3', '#bed0c2'][layer]!);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2, t = j / rows;
      const ridge = 26 + layer * 10 + Math.sin(a * 5 + layer) * 11 + Math.sin(a * 11 - layer * 2) * 6 + Math.sin(a * 23 + layer) * 2.9 + Math.sin(a * 49) * 1.1 + Math.sin(a * 113 + layer) * .42 + Math.sin(a * 251) * .14;
      const fold = Math.sin(a * 19 + Math.sin(t * 4 + layer)) * 3.6 + Math.sin(a * 37 - t * 5) * 1.3;
      const r = radius + Math.sin(t * Math.PI / 2) * 24 + fold * Math.sin(t * Math.PI);
      const height = -5 + Math.sin(t * Math.PI / 2) * ridge;
      vertices.push(Math.sin(a) * r, height, Math.cos(a) * r);
      const forest = Math.sin(a * 223 + t * 92) * Math.sin(a * 77 - t * 58) * .08;
      const slope = Math.sin(a * 19 + Math.sin(t * 4 + layer) + .65);
      const grove = Math.sin(a * 43 + t * 14 + Math.sin(a * 17)) * .055;
      const shade = 1 + (slope * .14 + grove + forest) / (1 + layer * .6);
      const c = low.clone().lerp(high, T.MathUtils.clamp(t * .58 + grove, 0, 1)).multiplyScalar(shade);
      colors.push(c.r, c.g, c.b);
      if (j < rows && i < segments) { const k = j * (segments + 1) + i; indices.push(k, k + 1, k + segments + 1, k + 1, k + segments + 2, k + segments + 1); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, fog: true }));
    mesh.name = `Mist mountain layer ${layer + 1}`; scene.add(mesh);
  }
}

export function makeSky() {
  return new T.Mesh(new T.SphereGeometry(430, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vP;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.26+noise(p*4.07)*.13+noise(p*8.13)*.06;}
      void main(){
        vec3 d=normalize(vP);float h=max(d.y,0.);
        vec3 col=mix(vec3(.65,.81,.85),vec3(.12,.40,.70),pow(h,.38));
        float sun=max(dot(d,normalize(vec3(-.46,.72,.5))),0.);
        col+=vec3(.20,.15,.07)*pow(sun,12.)+vec3(.64,.48,.24)*pow(sun,520.);
        vec2 p=d.xz/(max(d.y,.025)+.22)*2.7;
        float field=fbm(p+vec2(3.1,8.7));
        float clouds=smoothstep(.57,.74,field)*smoothstep(.025,.16,h)*(1.-smoothstep(.60,.98,h));
        vec3 cloud=mix(vec3(.77,.83,.81),vec3(1.,.98,.9),smoothstep(.52,.76,field));
        col=mix(col,cloud,clouds*.88);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
}
