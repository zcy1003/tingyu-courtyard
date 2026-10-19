(() => {
'use strict';
const T = THREE;
let seed=7613;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const R=(a,b)=>a+(b-a)*rand();
const scene=new T.Scene();
scene.background=new T.Color('#172332');
const root=new T.Group();scene.add(root);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
document.getElementById('world').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','可旋转缩放的雨夜中式庭院微缩三维模型');
const camera=new T.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);
const view={yaw:.64,pitch:.51,distance:26.3,target:new T.Vector3(0,.85,0)};
function cam(){let d=view.distance;camera.position.set(view.target.x+d*Math.sin(view.yaw)*Math.cos(view.pitch),view.target.y+d*Math.sin(view.pitch),view.target.z+d*Math.cos(view.yaw)*Math.cos(view.pitch));camera.lookAt(view.target);}
cam();
const ambient=new T.HemisphereLight(0xb9d2f1,0x424652,1.0);scene.add(ambient);
const moon=new T.DirectionalLight(0xa9d1ff,1.2);moon.position.set(-5,11,8);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-9,right:9,top:10,bottom:-10,near:1,far:30});moon.shadow.normalBias=.035;moon.shadow.bias=-.0003;moon.shadow.radius=3;scene.add(moon);
const rim=new T.DirectionalLight(0x7bafc9,.7);rim.position.set(4,6,-8);scene.add(rim);
const gradient=new T.DataTexture(new Uint8Array([75,135,194,245]),4,1,T.RedFormat);gradient.minFilter=T.NearestFilter;gradient.magFilter=T.NearestFilter;gradient.needsUpdate=true;
const mats={};
function toon(c){const k='t'+c;if(!mats[k])mats[k]=new T.MeshToonMaterial({color:c,gradientMap:gradient});return mats[k];}
function standard(c,rough=.65,metal=0){return new T.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});}
function glow(c,power=1){return new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:power,roughness:.7});}
const M={wood:toon('#573c31'),woodLight:toon('#957052'),darkWood:toon('#302a2a'),red:toon('#95443b'),gold:toon('#d9ad69'),brick:toon('#687e87'),mortar:toon('#384e59'),cap:toon('#3f5967'),roof:toon('#4c6c80'),roofLight:toon('#7493a2'),wall:toon('#d1c8b0'),stone:toon('#a2b1b1'),stoneDark:toon('#6d878d'),green:toon('#376957'),leaf:toon('#56846a'),bamboo:toon('#7d9672'),ivory:toon('#e4d7bd'),pot:toon('#6d7f85'),soil:toon('#2c3d34'),black:toon('#29383f'),redMetal:toon('#b54e49'),water:standard('#375e70',.13,.35)};
const edgeMat=new T.LineBasicMaterial({color:0x152d38,transparent:true,opacity:.55});
const geos={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,12),sphere:new T.SphereGeometry(1,14,10)};
function edges(o,angle=30){const e=new T.LineSegments(new T.EdgesGeometry(o.geometry,angle),edgeMat);e.name='ink edges';o.add(e);return o;}
function mesh(g,m,x,y,z,parent=root,ink=false){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);if(ink)edges(o);return o;}
function box(x,y,z,w,h,d,m,parent=root,ink=false){const o=mesh(geos.box,m,x,y,z,parent,ink);o.scale.set(w,h,d);return o;}
function cylinder(x,y,z,r,h,m,parent=root,r2=r,n=16){const key=`c${r},${r2},${h},${n}`;if(!geos[key])geos[key]=new T.CylinderGeometry(r,r2,h,n);return mesh(geos[key],m,x,y,z,parent);}
function ball(x,y,z,rx,ry,rz,m,parent=root){const o=mesh(geos.sphere,m,x,y,z,parent);o.scale.set(rx,ry,rz);return o;}
function torus(x,y,z,r,tube,m,parent=root){return mesh(new T.TorusGeometry(r,tube,6,40),m,x,y,z,parent);}
function line(points,r,m,parent=root){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(path,Math.max(8,points.length*6),r,6,false),m,0,0,0,parent);}
function beam(a,b,r,m,parent=root){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),length=v1.distanceTo(v2);const o=mesh(geos.cyl,m,...v1.clone().add(v2).multiplyScalar(.5).toArray(),parent);o.scale.set(r,length,r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v2.sub(v1).normalize());return o;}
function group(x=0,y=0,z=0,ry=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;root.add(g);return g;}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function textPlane(txt,w,h,bg,fg,parent=root,x=0,y=0,z=0,size=120){const t=texture(1024,256,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle=fg;c.lineWidth=5;c.strokeRect(14,14,W-28,H-28);c.fillStyle=fg;c.font=`${size}px "KaiTi","STKaiti","SimSun",serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,W/2,H/2+2);});const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,side:T.DoubleSide}),x,y,z,parent);return o;}
function point(c,intensity,x,y,z,range=5,shadow=false){const l=new T.PointLight(c,intensity,range,2);l.position.set(x,y,z);l.castShadow=shadow;if(shadow){l.shadow.mapSize.set(512,512);l.shadow.bias=-.002;}scene.add(l);return l;}
const haloTex=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,230,180,.8)');g.addColorStop(.18,'rgba(255,194,100,.35)');g.addColorStop(.5,'rgba(255,150,50,.09)');g.addColorStop(1,'rgba(255,100,20,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
function halo(x,y,z,size=1.4,opacity=.65){const s=new T.Sprite(new T.SpriteMaterial({map:haloTex,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}));s.position.set(x,y,z);s.scale.set(size,size,1);root.add(s);return s;}

// A complete square ceramic-and-stone plinth. Streets meet at a right angle.
box(0,-.18,0,12.2,.78,12.2,toon('#283e4b'),root,true);
box(0,.215,0,12.24,.09,12.24,toon('#9aa8aa'),root,true);
box(0,.275,0,12,.06,12,toon('#425d69'));
for(let i=-5.7;i<6;i+=.6){box(i,.14,6.12,.56,.13,.025,M.stoneDark);box(6.12,.14,i,.025,.13,.56,M.stoneDark);}
const paveMaterials=['#526d7b','#637c87','#5b7681','#78909b','#5b717a'].map(c=>standard(c,.3,.12));
const pavers=[];
for(let iz=0;iz<22;iz++)for(let ix=0;ix<17;ix++){
 const z=-5.7+iz*.535,x=-5.64+ix*.69+(iz%2)*.1;
 if(x<3.22&&z<2.65)continue;
 pavers.push([x,.322,z,.65,.058,.49,Math.floor(rand()*paveMaterials.length)]);
}
for(let k=0;k<paveMaterials.length;k++){let ps=pavers.filter(p=>p[6]===k);let im=new T.InstancedMesh(geos.box,paveMaterials[k],ps.length);let dummy=new T.Object3D();ps.forEach((p,i)=>{dummy.position.set(p[0],p[1],p[2]);dummy.scale.set(p[3],p[4],p[5]);dummy.rotation.y=R(-.012,.012);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});im.receiveShadow=true;root.add(im);}
// Courtyard platform, edged in stone, raised one step from the alley.
box(-.85,.37,-1.4,8.35,.2,8.3,M.stoneDark,root,true);
box(-.85,.48,-1.4,8.15,.04,8.1,toon('#66827c'));
for(let i=0;i<9;i++)for(let j=0;j<7;j++){
 const x=-4.65+i*.87,z=-4.7+j*.98;
 box(x,.518,z,.82,.045,.93,toon(['#8b9c94','#84998e','#96a69a'][Math.floor(rand()*3)]));
}
// Irregular moss and a pebble edging along the garden wall.
for(let i=0;i<100;i++){const x=R(-4.9,-3.9),z=R(-.6,2.25);ball(x,.54,z,R(.025,.07),.025,R(.025,.07),i%4?M.stoneDark:M.green);}

// Brick walls are actual staggered masonry, with visible mortar between blocks.
function brickWall(x,z,len,height,rotation=0,y=.52){const g=group(x,y,z,rotation);box(0,height/2,0,len,height,.28,M.mortar,g);
 const rows=Math.floor(height/.245), columns=Math.ceil(len/.51), brickMats=['#738990','#667f89','#7b9295','#617783'].map(toon);
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const left=-len/2+i*.51+(j%2)*.255;const bw=Math.min(.485,len/2-left);if(bw<.07)continue;box(left+bw/2,(j+.5)*.245,0,bw,.219,.307,brickMats[Math.floor(rand()*4)],g);}
 box(0,height+.04,0,len+.13,.13,.4,M.stoneDark,g,true);return g;}
brickWall(-4.96,-1.05,8.05,2.25,Math.PI/2);
brickWall(-.85,-5.13,8.5,2.45,0);
brickWall(3.24,-2.9,4.5,2.15,Math.PI/2);

// Upturned tiled roofs. Tiles are curved ceramic shells, instanced along both slopes.
function roof(name,cx,cz,width,depth,eave,rise,parent=root){const g=new T.Group();g.name=name;g.position.set(cx,0,cz);parent.add(g);
 const half=depth/2;
 const profile=t=>eave+rise*(1-t)-.17*Math.sin(t*Math.PI)+.18*Math.pow(t,8);
 const verts=[],idx=[];
 for(const sign of [-1,1]){const offset=verts.length/3;for(let i=0;i<=16;i++){const t=i/16;verts.push(-width/2,profile(t),sign*t*half,width/2,profile(t),sign*t*half);}for(let i=0;i<16;i++){let a=offset+i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
 const under=new T.MeshToonMaterial({color:'#304a59',gradientMap:gradient,side:T.DoubleSide});mesh(geo,under,0,0,0,g);
 // Rounded trough tile surface, alternating channels and raised caps.
 const tv=[],ti=[];for(let j=0;j<2;j++)for(let a=0;a<=8;a++){const th=a/8*Math.PI;tv.push(Math.cos(th)*.103,Math.sin(th)*.061,j-.5);}for(let a=0;a<8;a++){ti.push(a,a+9,a+1,a+1,a+9,a+10);}const tileGeo=new T.BufferGeometry();tileGeo.setAttribute('position',new T.Float32BufferAttribute(tv,3));tileGeo.setIndex(ti);tileGeo.computeVertexNormals();
 const configs=[];const nx=Math.floor(width/.21),nz=8;
 for(const s of [-1,1])for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
  const t=(j+.5)/nz,dt=.001,dydz=(profile(t+dt)-profile(t-dt))/(2*dt*half)*s;
  configs.push({x:-width/2+.1+i*width/nx,y:profile(t)+.037,z:s*t*half,ang:-Math.atan(dydz),length:half/nz*Math.sqrt(1+dydz*dydz)+.035,k:(i+j)%4});
 }
 const tileMats=['#506f82','#5f8294','#68889a','#456779'].map(toon);
 configs.forEach(p=>{p.k=Math.floor(rand()*4);});
 tileMats.forEach((m,k)=>{m.side=T.DoubleSide;const a=configs.filter(p=>p.k===k);const inst=new T.InstancedMesh(tileGeo,m,a.length);const d=new T.Object3D();a.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.rotation.set(p.ang,0,0);d.scale.set(1,1,p.length);d.updateMatrix();inst.setMatrixAt(i,d.matrix);});inst.castShadow=true;inst.receiveShadow=true;g.add(inst);});
 // Horizontal eave beams and sculpted ridge.
 for(const s of [-1,1]){
  box(0,profile(1)-.12,s*half,width+.2,.15,.16,M.darkWood,g,true);
  line([[-width/2-.09,profile(1)+.02,s*half],[0,profile(1),s*half],[width/2+.09,profile(1)+.02,s*half]],.06,M.roofLight,g);
  for(let i=0;i<nx;i++){let disc=cylinder(-width/2+.1+i*width/nx,profile(1)-.015,s*(half+.025),.089,.06,M.roofLight,g,.089,10);disc.rotation.x=Math.PI/2;const t=torus(-width/2+.1+i*width/nx,profile(1)-.015,s*(half+.06),.052,.01,M.cap,g);}
 }
 line([[-width/2-.15,eave+rise+.22,0],[-width/2+.2,eave+rise+.08,0],[0,eave+rise+.07,0],[width/2-.2,eave+rise+.08,0],[width/2+.15,eave+rise+.22,0]],.115,M.roofLight,g);
 for(const s of [-1,1])for(const side of [-1,1]){const pts=[];for(let j=0;j<=12;j++){let t=j/12;pts.push([side*width/2,profile(t)+.06,s*t*half]);}line(pts,.065,M.roofLight,g);}
 return g;
}

// Main tea hall: three bays, two large windows, and two genuinely hinged open doors.
box(-1.25,.62,-2.95,7.1,.25,3.65,M.stone,root,true);
box(-1.25,.78,-2.95,6.85,.09,3.45,M.woodLight);
for(let i=0;i<23;i++)box(-4.55+i*.3,.833,-2.95,.277,.016,3.3,toon(i%3?'#a2815a':'#8f6e50'));
box(-1.25,2.29,-4.7,6.95,2.9,.18,M.wall,root,true);
box(-4.73,2.25,-2.98,.16,2.8,3.45,M.wall);
// Right side remains a wall with its own big glazed window opening.
box(2.23,1.05,-2.95,.18,.52,3.4,M.wall);
box(2.23,3.53,-2.95,.18,.3,3.4,M.wall);
for(const z of [-4.55,-3.4,-1.25])box(2.23,2.18,z,.2,2.65,.16,M.wood);
for(const x of [-4.65,-2.55,.15,2.15]){
 box(x,2.24,-1.18,.19,2.95,.19,M.red,root,true);
 box(x,.93,-1.18,.29,.27,.29,M.stoneDark,root,true);
 box(x,3.53,-1.18,.42,.16,.32,M.woodLight);
}
box(-1.25,3.67,-1.18,7.15,.23,.22,M.darkWood,root,true);
box(-1.25,3.42,-1.16,7.05,.13,.2,M.woodLight);
box(-3.63,1.07,-1.18,1.95,.42,.15,M.wall);
box(1.14,1.07,-1.18,1.91,.42,.15,M.wall);
box(-1.22,.89,-1.05,2.42,.09,.25,M.wood);
const glass=new T.MeshPhysicalMaterial({color:'#bee8dc',transparent:true,opacity:.08,roughness:.07,metalness:.1,side:T.DoubleSide,depthWrite:false});
function lattice(x,y,z,w,h,parent=root){
 box(x,y,z,w+.12,.105,.13,M.darkWood,parent,true);box(x,y+h,z,w+.12,.105,.13,M.darkWood,parent,true);
 box(x-w/2,y+h/2,z,.1,h,.13,M.darkWood,parent);box(x+w/2,y+h/2,z,.1,h,.13,M.darkWood,parent);
 mesh(new T.PlaneGeometry(w,h),glass,x,y+h/2,z-.025,parent);
 // Thin perimeter lattice surrounds broad clear panes.
 for(const xx of [-w*.3,0,w*.3])box(x+xx,y+h/2,z+.035,.035,h-.05,.045,M.wood,parent);
 for(const yy of [.15,h*.52,h-.15])box(x,y+yy,z+.035,w-.05,.034,.045,M.wood,parent);
 for(const side of [-1,1])for(let j=0;j<3;j++){let ob=box(x+side*w*.4,y+.3+j*(h-.6)/2,z+.037,.23,.023,.037,M.woodLight,parent);ob.rotation.z=side*Math.PI/4;}
}
lattice(-3.63,1.34,-1.065,1.8,1.94);lattice(1.14,1.34,-1.065,1.75,1.94);
const sideWin=group(2.32,0,-2.78,Math.PI/2);lattice(0,1.36,0,2.7,1.85,sideWin);
function doorLeaf(hingeX,angle,dir){const g=group(hingeX,0,-1.13,angle);const cx=dir*.53;
 for(const xx of [-.5,.5])box(cx+xx,2.15,0,.065,2.57,.09,M.wood,g,true);
 for(const yy of [.9,1.72,3.4])box(cx,yy,0,1.06,.08,.09,M.wood,g,true);
 box(cx,1.29,0,.94,.7,.08,M.red,g,true);
 mesh(new T.PlaneGeometry(.91,1.57),glass,cx,2.55,.015,g);
 for(let i=-2;i<=2;i++)box(cx+i*.165,2.51,.084,.025,1.43,.025,M.darkWood,g);
 for(let i=0;i<5;i++)box(cx,1.85+i*.31,.084,.87,.025,.025,M.darkWood,g);
 let ring=torus(cx-dir*.31,1.9,.13,.06,.012,M.gold,g);return g;
}
doorLeaf(-2.49,-1.04,1);doorLeaf(.05,1.15,-1);
box(-1.22,.7,-.8,2.55,.15,.55,M.stone,root,true);box(-1.22,.59,-.51,2.85,.12,.42,M.stoneDark,root,true);
roof('堂屋黛瓦屋顶',-1.25,-2.93,7.68,4.13,3.89,1.0);
for(const x of [-4.73,2.23]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x,3.64,-4.7,x,3.64,-1.18,x,4.84,-2.93],3));g.computeVertexNormals();mesh(g,new T.MeshToonMaterial({color:'#b2b7a7',gradientMap:gradient,side:T.DoubleSide}),0,0,0);beam([x,3.73,-4.7],[x,4.84,-2.93],.04,M.darkWood);beam([x,4.84,-2.93],[x,3.73,-1.18],.04,M.darkWood);}
// Exposed red rafters and carved brackets underneath the eaves.
for(let x=-4.75;x<=2.4;x+=.34)box(x,3.74,-1.03,.065,.12,.58,M.woodLight);
for(const x of [-4.65,-2.55,.15,2.15]){box(x,3.43,-1.03,.42,.1,.24,M.red);box(x,3.32,-1.07,.29,.1,.18,M.gold);}
textPlane('听 雨 堂',1.67,.4,'#294049','#e5c691',root,-1.25,3.53,-1.02,148);

// Fully furnished tea-room interior.
point('#ffb85d',24,-1.2,2.9,-2.8,6.5);
point('#ffdca1',9,1.1,2.3,-2.9,4.2);
box(-1.3,.87,-2.55,3.4,.025,1.8,toon('#b1a17b'));
box(-1.3,.89,-2.55,3.15,.018,1.58,toon('#897955'));
function table(x,z,w=1.85,d=1.15,h=1.56,parent=root){box(x,h,z,w,.16,d,M.wood,parent,true);box(x,h-.14,z,w-.12,.14,d-.12,M.darkWood,parent);for(const xx of [-1,1])for(const zz of [-1,1]){box(x+xx*(w/2-.15),(h+.85)/2-.1,z+zz*(d/2-.14),.11,h-.92,.11,M.wood,parent,true);}box(x,h-.34,z,w-.3,.055,d-.27,M.gold,parent);}
table(-1.3,-2.5);
function chair(x,z,rot){const g=group(x,0,z,rot);box(0,1.2,0,.66,.1,.6,M.wood,g,true);for(const xx of [-.25,.25])for(const zz of [-.23,.23])box(xx,1.0,zz,.07,.45,.07,M.wood,g);
 for(const xx of [-.29,.29])box(xx,1.7,-.23,.065,1.07,.065,M.wood,g);box(0,2.19,-.23,.67,.09,.1,M.wood,g,true);box(0,1.85,-.23,.17,.55,.065,M.woodLight,g);
 for(const xx of [-.29,.29]){box(xx,1.64,.03,.07,.06,.6,M.wood,g);box(xx,1.42,.26,.05,.45,.05,M.wood,g);}torus(0,1.9,-.28,.12,.025,M.gold,g);
}
chair(-2.7,-2.5,Math.PI/2);chair(.1,-2.5,-Math.PI/2);chair(-1.3,-3.48,0);
box(-1.3,1.67,-2.5,.85,.035,.52,M.darkWood,root,true);
function porcelain(x,y,z,r=.12,h=.2,m=M.ivory,parent=root){cylinder(x,y+h*.3,z,r*.7,h*.6,m,parent,r*.8);ball(x,y+h*.54,z,r,h*.35,r,m,parent);cylinder(x,y+h*.9,z,r*.48,h*.22,m,parent,r*.62);torus(x,y+h*.97,z,r*.5,.013,M.gold,parent).rotation.x=Math.PI/2;}
porcelain(-1.32,1.69,-2.52,.16,.27,M.pot);cylinder(-1.32,1.99,-2.52,.12,.04,M.ivory);
beam([-1.18,1.79,-2.52],[-1.05,1.87,-2.52],.035,M.pot);torus(-1.48,1.82,-2.52,.095,.023,M.pot);
for(const [x,z]of[[-1.6,-2.37],[-1.05,-2.37],[-1.55,-2.72]]){cylinder(x,1.73,z,.075,.08,M.ivory);cylinder(x,1.775,z,.058,.006,toon('#745136'));}
// Back console and ink landscape scroll.
table(-1.45,-4.24,3.5,.5,1.48);
const scrollTex=texture(512,640,(c,w,h)=>{c.fillStyle='#d4bf90';c.fillRect(0,0,w,h);c.fillStyle='#b19d76';c.fillRect(30,25,w-60,h-50);c.fillStyle='#e2d0a6';c.fillRect(55,42,w-110,h-84);
 for(let i=0;i<4;i++){c.fillStyle=['#939c91','#6d817d','#506c6a','#365958'][i];c.beginPath();c.moveTo(55,h-80-i*25);for(let x=55;x<w-55;x+=14)c.lineTo(x,220+i*65+Math.sin(x*.018+i)*65+Math.sin(x*.052)*18);c.lineTo(w-55,h-65);c.fill();}c.strokeStyle='#3c5752';c.lineWidth=7;c.beginPath();c.moveTo(100,480);c.bezierCurveTo(190,410,120,350,180,290);c.stroke();c.fillStyle='#a25348';c.fillRect(374,115,29,38);});
mesh(new T.PlaneGeometry(1.6,1.75),new T.MeshBasicMaterial({map:scrollTex}),-1.35,2.6,-4.585);
for(const y of [1.68,3.52]){let roller=cylinder(-1.35,y,-4.55,.035,1.8,M.darkWood);roller.rotation.z=Math.PI/2;}
porcelain(-2.75,1.6,-4.25,.15,.52,M.pot);porcelain(.02,1.6,-4.25,.13,.3,M.ivory);
// Asymmetric display shelf with porcelain, folded books, and a small tea caddy.
const shelf=group(.98,0,-4.24);
for(const x of [-.57,.57])box(x,2.02,0,.085,2.28,.42,M.darkWood,shelf,true);
for(const y of [.93,1.43,2.02,2.63,3.13])box(0,y,0,1.22,.07,.47,M.wood,shelf,true);
box(.12,1.74,0,.06,.59,.4,M.wood,shelf);box(-.17,2.32,0,.06,.58,.4,M.wood,shelf);
porcelain(.33,2.67,-.05,.14,.38,M.pot,shelf);porcelain(-.27,2.07,-.06,.1,.35,M.ivory,shelf);
for(let i=0;i<4;i++)box(-.28,1.5+i*.06,0,.45,.044,.28,toon(i%2?'#94a7a1':'#b59878'),shelf);
cylinder(.34,1.58,0,.15,.25,M.gold,shelf);
// Folding screen to the left of the room.
for(let i=0;i<3;i++){const panel=group(-4.0+i*.42,0,-3.67,-.32+(i%2)*.65);box(0,1.97,0,.45,1.97,.06,M.darkWood,panel,true);box(0,2.05,.038,.36,1.6,.015,toon('#a7ac89'),panel);for(const x of [-.17,.17])box(x,1.0,0,.05,.35,.08,M.wood,panel);beam([-.12,1.45,.06],[.08,2.64,.06],.015,M.green,panel);for(let j=0;j<6;j++)ball(R(-.14,.15),R(1.6,2.7),.072,.06,.026,.009,M.green,panel);}
// Paper ceiling lantern and bamboo roller shades.
cylinder(-1.25,3.26,-2.75,.27,.43,glow('#ffe0a1',1.4),root,.3);cylinder(-1.25,3.5,-2.75,.29,.04,M.darkWood);cylinder(-1.25,3.03,-2.75,.29,.04,M.darkWood);beam([-1.25,3.55,-2.75],[-1.25,3.9,-2.75],.014,M.darkWood);
for(const x of [-3.6,1.14]){cylinder(x,3.3,-.98,.065,1.74,M.bamboo).rotation.z=Math.PI/2;for(let i=0;i<11;i++)box(x,3.27-i*.026,-.98,1.75,.018,.03,M.woodLight);}
