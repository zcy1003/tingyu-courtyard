
// Moon-gate pavilion: the wall is extruded around a true circular opening.
const gateX=1.0,gateZ=2.22;
const gs=new T.Shape();gs.moveTo(-1.72,.52);gs.lineTo(1.72,.52);gs.lineTo(1.72,3.13);gs.lineTo(-1.72,3.13);gs.closePath();
const hole=new T.Path();hole.absarc(0,1.73,1.11,0,Math.PI*2,true);gs.holes.push(hole);
const gateGeo=new T.ExtrudeGeometry(gs,{depth:.36,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:48});
mesh(gateGeo,M.wall,gateX,0,gateZ-.18,root);
const ring=torus(gateX,1.73,gateZ+.208,1.13,.085,M.stoneDark);ring.scale.z=.62;
torus(gateX,1.73,gateZ+.221,1.035,.023,M.stone);
// Gate base stonework and panel edges.
for(const s of [-1,1]){box(gateX+s*1.48,.76,gateZ,.46,.47,.48,M.stoneDark,root,true);box(gateX+s*1.48,1.94,gateZ+.22,.07,1.95,.055,M.woodLight);}
box(gateX,3.1,gateZ,3.53,.18,.5,M.darkWood,root,true);
roof('月洞院门屋顶',gateX,gateZ,3.95,1.4,3.21,.57);
textPlane('枕 雨 小 院',1.51,.34,'#2f4346','#e6c786',root,gateX,3.12,gateZ+.29,123);
// A low front wall allows the planted courtyard to remain visible.
brickWall(-2.95,2.22,3.65,.72);
for(let i=0;i<12;i++){const x=-4.65+i*.3;box(x,1.53,2.22,.036,.61,.06,M.darkWood);box(x,1.62,2.22,.25,.034,.06,M.wood);}
box(-2.95,1.22,2.22,3.65,.1,.16,M.wood,root,true);box(-2.95,1.84,2.22,3.65,.1,.17,M.wood,root,true);
// Side masonry, turning out toward the alley.
brickWall(3.1,1.36,1.68,1.48,Math.PI/2);
roof('左侧院墙压顶',-2.95,2.22,3.84,.65,1.83,.14);
for(let i=0;i<3;i++)box(gateX,.375+i*.083,3.07-i*.24,2.28-i*.17,.115,.48,M.stoneDark,root,true);
box(gateX,.64,2.25,2.05,.12,.4,M.stone,root,true);
// Gate drums carved from stone.
for(const x of [-.57,2.57]){box(x,.57,2.76,.4,.4,.48,M.stoneDark,root,true);const drum=cylinder(x,.95,2.77,.23,.17,M.stone,root,.23,16);drum.rotation.z=Math.PI/2;const r=torus(x,.95,2.87,.15,.022,M.stoneDark);}

// Covered side passage, with a narrow second roof and warm lamps.
for(const z of [-3.9,-2.0,-.1]){box(2.76,1.89,z,.12,2.78,.12,M.red,root,true);box(2.76,.67,z,.23,.26,.23,M.stoneDark);}
box(2.76,3.22,-2,.18,.17,4.6,M.wood);
const corridor=group(2.72,0,-2.0,Math.PI/2);roof('回廊瓦檐',0,0,4.83,1.08,3.3,.35,corridor);
for(let j=0;j<8;j++)box(2.76,.6,-4.4+j*.58,.75,.06,.53,M.stoneDark);

// Red ribbed lanterns, gold collars, silk tassels, warm translucent centers.
const lanterns=[];
const redLantern=new T.MeshToonMaterial({color:'#de6351',emissive:'#9e2718',emissiveIntensity:.5,gradientMap:gradient});
function lantern(x,y,z,s=1){const g=group(x,y,z);g.scale.setScalar(s);g.userData.dynamic=true;
 const profile=[new T.Vector2(.13,-.35),new T.Vector2(.24,-.29),new T.Vector2(.31,-.12),new T.Vector2(.32,.09),new T.Vector2(.25,.29),new T.Vector2(.13,.35)];
 mesh(new T.LatheGeometry(profile,24),redLantern,0,0,0,g);
 for(let a=0;a<12;a++){const angle=a/12*Math.PI*2;const pts=profile.map(v=>[Math.sin(angle)*(v.x+.006),v.y,Math.cos(angle)*(v.x+.006)]);line(pts,.008,toon('#9f382d'),g);}
 for(const yy of [-.35,.35]){cylinder(0,yy,0,.16,.055,M.gold,g);cylinder(0,yy+(yy>0?.038:-.038),0,.11,.04,M.darkWood,g);}
 beam([0,.4,0],[0,.63,0],.015,M.darkWood,g);
 for(let i=0;i<6;i++)beam([-.05+i*.02,-.39,0],[-.06+i*.024,-.67-R(0,.05),0],.009,M.red,g);
 // The lantern character is a physical decorative face, not an interface label.
 textPlane('福',.31,.28,'#c6503d','#e9bd77',g,0,-.02,.31,168);
 const l=point('#ff8540',3.0*s,x,y,z,3.3);halo(x,y,z,1.55*s,.35);lanterns.push({g,l,phase:R(0,6),s});return g;
}
lantern(-.55,2.54,2.63,.92);lantern(2.55,2.54,2.63,.92);
lantern(-3.98,2.96,-.73,.8);lantern(1.6,2.96,-.73,.8);
lantern(2.7,2.73,-3.8,.5);

// Warm reflected pools and window light on the wet stone.
const poolTex=texture(256,256,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.49);g.addColorStop(0,'rgba(255,173,71,.43)');g.addColorStop(.4,'rgba(255,160,60,.2)');g.addColorStop(1,'rgba(255,140,60,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
function lightPool(x,z,w,d,y=.36){let o=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:poolTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),x,y,z);o.rotation.x=-Math.PI/2;return o;}
lightPool(1,3.38,3.2,3);lightPool(-1.2,-.32,4.7,2.9,.555);lightPool(-.55,2.9,1.8,2.3);lightPool(2.55,2.9,1.8,2.2);
// Broken, elongated warm glints are much softer than perfect mirror discs.
for(let i=0;i<36;i++){let z=R(2.88,5.0),x=1+R(-.5,.5)*(1+(z-3)*.7);let glint=box(x,.365,z,R(.08,.45),.005,R(.018,.05),new T.MeshBasicMaterial({color:i%3?'#c7946a':'#f5c082',transparent:true,opacity:R(.12,.35),depthWrite:false}));}

// Tea garden: banana, bamboo, flowering plum, bonsai and a little water basin.
function pot(x,y,z,r=.28,h=.42,color=M.pot,parent=root){cylinder(x,y+h/2,z,r,h,color,parent,r*.7,16);cylinder(x,y+h-.025,z,r+.018,.065,color,parent);cylinder(x,y+h+.009,z,r*.86,.012,M.soil,parent);}
// Curved lanceolate leaves have a raised central vein and a defined silhouette.
const leafVertices=[],leafIndices=[];
for(let j=0;j<=8;j++){let t=j/8,w=Math.sin(t*Math.PI)**.78*.22;leafVertices.push(-w,Math.sin(t*Math.PI)*.08,t,0,Math.sin(t*Math.PI)*.12,t,w,Math.sin(t*Math.PI)*.08,t);if(j<8){let k=j*3;leafIndices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}}
const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(leafVertices,3));leafGeo.setIndex(leafIndices);leafGeo.computeVertexNormals();
const leafMats=['#4e8264','#679876','#396953','#7aa47b'].map(c=>new T.MeshToonMaterial({color:c,gradientMap:gradient,side:T.DoubleSide}));
function leaf(x,y,z,len,ry,rx,parent=root,k=0){const o=mesh(leafGeo,leafMats[k%4],x,y,z,parent);o.scale.set(len,len,len);o.rotation.set(rx,ry,0);return o;}
// Bamboo at the left rear corner, with joint rings and sprays of narrow leaves.
for(let i=0;i<10;i++){const x=R(-4.74,-3.95),z=R(-.15,1.2),height=R(1.8,3.5);const g=group(x,.54,z,R(0,6));g.rotation.z=R(-.12,.12);cylinder(0,height/2,0,.038,height,M.bamboo,g,.048,8);
 for(let y=.28;y<height;y+=.38){cylinder(0,y,0,.048,.03,M.green,g);if(y>height*.45){const sign=rand()>.5?1:-1;beam([0,y,0],[sign*.36,y+.15,.14],.013,M.bamboo,g);for(let j=0;j<5;j++)leaf(sign*.1+j*.045*sign,y+.07+j*.027,.08,.25,R(-2,2),R(-.5,.5),g,j);}}
}
// Two broad-leaved banana plants, each growing out of a stone-edged bed.
function banana(x,z,s=1){const g=group(x,.55,z);g.scale.setScalar(s);pot(0,0,0,.42,.44,M.stoneDark,g);
 for(let i=0;i<8;i++){let a=i/8*Math.PI*2,h=R(.7,1.5);beam([0,.3,0],[Math.sin(a)*.12,h,Math.cos(a)*.12],.029,M.bamboo,g);let l=leaf(Math.sin(a)*.1,h,Math.cos(a)*.1,R(.65,1.12),a,R(-.45,.45),g,i);l.scale.x*=.9;}
}
banana(2.19,.32,.95);banana(-4.2,-4.52,.82);
// Stone-edged bonsai display, complete with the contorted trunk and flat foliage pads.
const bonsai=group(-3.5,.55,1.37);pot(0,0,0,.43,.27,toon('#678788'),bonsai);line([[0,.25,0],[-.08,.6,.03],[.15,.94,0],[.1,1.3,.03]],.057,M.wood,bonsai);line([[.03,.72,0],[-.35,.95,.03],[-.48,.98,.06]],.032,M.wood,bonsai);
for(const p of [[-.46,1.03,.06,.38],[.19,1.4,.02,.42],[.39,1.13,.12,.3]]){for(let j=0;j<4;j++)ball(p[0]+R(-.1,.1),p[1]+R(-.04,.04),p[2]+R(-.1,.1),p[3],.11,p[3]*.7,j%2?M.green:M.leaf,bonsai);}
box(-3.5,.63,1.37,.87,.14,.57,M.wood,root,true);
// Plum tree, subtle blossoms, not a large canopy hiding the room.
pot(2.43,.55,1.48,.34,.42,M.pot);
line([[2.43,.85,1.48],[2.38,1.43,1.45],[2.14,2.08,1.38],[2.25,2.67,1.34]],.055,M.wood);
for(const pts of [[[2.2,1.9,1.39],[1.82,2.1,1.25],[1.56,2.33,1.2]],[[2.19,2.12,1.38],[2.68,2.35,1.34],[2.9,2.64,1.4]],[[2.25,2.48,1.34],[1.99,2.75,1.38]]])line(pts,.023,M.wood);
const blossom=toon('#d999a4');
for(let i=0;i<24;i++){let x=R(1.65,2.88),y=R(2.15,2.78),z=R(1.2,1.44);for(let p=0;p<5;p++){let a=p/5*Math.PI*2;ball(x+Math.cos(a)*.035,y+Math.sin(a)*.035,z,.027,.027,.018,blossom);}ball(x,y,z+.016,.012,.012,.012,M.gold);}
// Water jar with ceramic lip, cool blue water, and floating leaves.
const jarX=-3.72,jarZ=-.26;
const jarProfile=[[.34,0],[.45,.12],[.5,.41],[.47,.65],[.36,.79],[.36,.84]].map(p=>new T.Vector2(...p));
mesh(new T.LatheGeometry(jarProfile,24),standard('#537d84',.28,.12),jarX,.55,jarZ);
torus(jarX,1.39,jarZ,.36,.037,M.pot).rotation.x=Math.PI/2;
cylinder(jarX,1.35,jarZ,.323,.014,M.water,root,.323,32);
for(let i=0;i<3;i++){const l=mesh(new T.CircleGeometry(.08,12),M.green,jarX+R(-.18,.18),1.36,jarZ+R(-.18,.18));l.rotation.x=-Math.PI/2;}
// Stone lantern with glowing square windows, and a small pile of garden rocks.
function stoneLantern(x,z){box(x,.62,z,.56,.16,.56,M.stoneDark,root,true);cylinder(x,.95,z,.13,.56,M.stone);box(x,1.28,z,.53,.14,.53,M.stoneDark,root,true);box(x,1.52,z,.32,.37,.32,glow('#ffd692',1.1));
 for(const dx of [-.2,.2])for(const dz of [-.2,.2])box(x+dx,1.51,z+dz,.065,.4,.065,M.stoneDark);
 const top=mesh(new T.ConeGeometry(.47,.3,4),M.stoneDark,x,1.89,z);top.rotation.y=Math.PI/4;ball(x,2.08,z,.09,.12,.09,M.stone);point('#ffc778',2,x,1.5,z,2.5);halo(x,1.5,z,.9,.3);
}
stoneLantern(-2.72,.6);
for(let i=0;i<8;i++){const rock=mesh(new T.DodecahedronGeometry(R(.09,.18),0),M.stoneDark,R(-4.1,-2.9),.61,R(.52,1.0));rock.scale.y=R(.5,1.4);}
// Stepping stones lead from the moon gate toward the warm open doorway.
for(let i=0;i<4;i++){const x=.96-i*.56,z=1.68-i*.58;box(x,.57,z,.68,.09,.46,M.stone,root,true);}
// Woven bamboo mat outside the tea room.
box(-1.3,.635,-.1,1.18,.035,.56,toon('#aa9367'),root,true);
for(let i=0;i<24;i++)box(-1.86+i*.049,.659,-.1,.019,.006,.51,M.woodLight);

// The little corner of the lane: bicycle, mail, noticeboard, drain, railing.
function bicycle(x,z,angle){const g=group(x,.36,z,angle);const paint=toon('#8caa9a'),rubber=toon('#203942'),metal=standard('#8da5ad',.35,.55);
 for(const xx of [-.72,.72]){const wheel=torus(xx,.5,0,.48,.043,rubber,g);torus(xx,.5,.006,.414,.012,metal,g);for(let j=0;j<14;j++){const a=j/14*Math.PI*2;beam([xx,.5,.005],[xx+Math.sin(a)*.418,.5+Math.cos(a)*.418,.005],.004,metal,g);}cylinder(xx,.5,0,.056,.12,metal,g).rotation.x=Math.PI/2;}
 const A=[-.72,.5,0],B=[-.25,.54,0],C=[-.4,1.13,0],D=[.42,1.16,0],E=[.72,.5,0];
 for(const [a,b]of[[A,B],[A,C],[B,C],[B,D],[C,D],[D,E]])beam(a,b,.025,paint,g);
 beam([.42,1.1,0],[.43,1.45,0],.022,metal,g);line([[.43,1.43,-.2],[.43,1.47,-.3],[.43,1.47,.3],[.43,1.43,.25]],.022,metal,g);
 beam([-.4,1.08,0],[-.43,1.31,0],.022,metal,g);box(-.47,1.34,0,.33,.07,.2,M.darkWood,g,true);
 beam([-.25,.55,0],[-.15,.4,.15],.012,metal,g);box(-.15,.4,.17,.15,.025,.12,rubber,g);torus(-.25,.54,0,.15,.018,metal,g);
 // Rear luggage rack and front wire basket.
 box(-.75,1.05,0,.54,.025,.25,metal,g);for(const zz of [-.12,.12])beam([-.95,.55,zz],[-.9,1.05,zz],.011,metal,g);
 box(.72,1.24,0,.38,.02,.4,M.gold,g);for(const xx of [.53,.91])for(const zz of [-.2,.2])beam([xx,1.25,zz],[xx,1.59,zz],.009,M.gold,g);
 for(let j=0;j<4;j++){let y=1.28+j*.09;for(const zz of [-.2,.2])beam([.53,y,zz],[.91,y,zz],.009,M.gold,g);for(const xx of [.53,.91])beam([xx,y,-.2],[xx,y,.2],.009,M.gold,g);}
 beam([-.15,.6,-.05],[-.32,.04,-.25],.015,metal,g);
 return g;
}
bicycle(4.18,.42,Math.PI/2-.16);
// Painted parking lines are worn and quiet.
for(let i=0;i<3;i++){box(4.31,.36,.0+i*.72,.9,.008,.025,toon('#a0aba2'));}
// A red pillar mailbox, with an actual slot, enamel face and little roof.
box(3.68,1.21,1.53,.46,1.38,.34,M.redMetal,root,true);box(3.68,.5,1.53,.58,.17,.45,M.stoneDark,root,true);box(3.68,1.85,1.53,.53,.13,.42,M.redMetal,root,true);
box(3.68,1.59,1.712,.3,.06,.012,M.black);box(3.68,1.27,1.712,.31,.35,.012,M.gold);
textPlane('邮 政',.26,.12,'#b99b61','#274944',root,3.68,1.32,1.726,126);box(3.68,.94,1.71,.31,.18,.016,M.red);ball(3.79,1.02,1.74,.018,.018,.018,M.gold);
// Side-wall air conditioner, piping and fan blades.
const ac=group(3.43,1.93,-3.73,Math.PI/2);
box(0,0,0,1.0,.64,.42,toon('#b3bcb6'),ac,true);const fan=torus(-.17,0,.223,.23,.021,M.stoneDark,ac);
for(let i=0;i<7;i++)for(let j=0;j<2;j++)box(-.17+(i-3)*.059,0,.25,.012,.42,.008,M.stoneDark,ac);
for(let i=0;i<3;i++)box(.3,(i-1)*.13,.23,.22,.024,.02,M.stoneDark,ac);
line([[3.44,1.7,-3.2],[3.55,1.5,-3.1],[3.55,.7,-3.1],[3.25,.58,-3.1]],.03,M.ivory);
// Noticeboard and a Chinese New Year print under a small lean-to.
const board=group(3.46,0,-1.9,Math.PI/2);
box(0,1.78,0,1.12,1.27,.08,M.wood,board,true);box(0,1.78,.05,.97,1.12,.012,toon('#aba58e'),board);
textPlane('街 坊 公 告',.94,.18,'#736e58','#e0d3a4',board,0,2.26,.069,122);
textPlane('雨巷邻里\n',.52,.48,'#d5c69e','#665a41',board,-.16,1.77,.075,104);
textPlane('福',.29,.35,'#b84a3c','#f0cd89',board,.27,1.66,.077,180);
box(0,2.47,.09,1.28,.08,.58,M.cap,board,true).rotation.x=.12;
// Umbrella stand beneath the passage eave and a woven waste basket.
const stand=group(2.83,.58,-.55);for(const x of [-.23,.23])for(const z of [-.15,.15])box(x,.34,z,.04,.62,.04,M.wood,stand);box(0,.12,0,.51,.04,.35,M.darkWood,stand);box(0,.59,0,.51,.05,.35,M.wood,stand);
for(let i=0;i<3;i++){let x=-.14+i*.13;beam([x,.18,0],[x+.03,1.15,.02],.017,M.wood,stand);line([[x+.03,1.05,.02],[x+.03,1.2,.02],[x+.14,1.23,.02],[x+.17,1.14,.02]],.016,M.darkWood,stand);let u=mesh(new T.ConeGeometry(.085,.7,8),i===1?M.red:M.cap,x,.67,0,stand);u.rotation.z=.06;}
const waste=group(3.72,.36,2.58);pot(0,0,0,.22,.42,M.woodLight,waste);for(let i=0;i<15;i++){let a=i/15*Math.PI*2;beam([Math.sin(a)*.18,.02,Math.cos(a)*.18],[Math.sin(a)*.22,.42,Math.cos(a)*.22],.011,M.bamboo,waste);}for(let j=0;j<6;j++)torus(0,.055+j*.066,0,.19+j*.005,.012,M.wood,waste).rotation.x=Math.PI/2;
// Wooden rail at the end of the turn, and stone curb blocks.
for(let i=0;i<5;i++){box(5.42,.81,-3.0+i*.6,.1,.93,.1,M.darkWood);ball(5.42,1.29,-3+i*.6,.075,.045,.075,M.woodLight);}
box(5.42,1.13,-1.8,.08,.09,2.52,M.wood);box(5.42,.7,-1.8,.08,.07,2.52,M.wood);
for(let i=0;i<17;i++)box(3.12,.41,-5.3+i*.52,.19,.19,.47,M.stoneDark,root,true);
// Open drainage channel and iron grates carry rain around the corner.
box(3.42,.34,3.17,5.0,.025,.17,M.black);
box(3.42,.34,-.95,.17,.025,8.4,M.black);
for(let i=0;i<34;i++)box(3.42,.367,-5.1+i*.25,.19,.02,.034,M.stoneDark);
for(let i=0;i<12;i++)box(.88+i*.43,.367,3.17,.035,.02,.2,M.stoneDark);

// Period street light and power pole. All posts stay on the square base.
const streetX=5.05,streetZ=3.78;
cylinder(streetX,2.1,streetZ,.055,3.5,M.cap);cylinder(streetX,.54,streetZ,.14,.36,M.stoneDark);
line([[streetX,3.76,streetZ],[streetX-.05,4.14,streetZ],[streetX-.48,4.31,streetZ],[streetX-.89,4.18,streetZ]],.047,M.cap);
mesh(new T.ConeGeometry(.3,.18,16),M.cap,streetX-.87,4.08,streetZ);ball(streetX-.87,3.94,streetZ,.16,.085,.16,glow('#ffe2a5',1.5));
point('#ffe0a2',12,streetX-.87,3.83,streetZ,5);halo(streetX-.87,3.98,streetZ,1.7,.4);lightPool(4.2,4.0,3.6,3.3);
const poleX=4.83,poleZ=-4.65;
cylinder(poleX,2.96,poleZ,.09,5.15,toon('#747f82'),root,.14);
box(poleX,5.14,poleZ,1.2,.1,.12,M.darkWood);
for(const dx of [-.45,0,.45]){cylinder(poleX+dx,5.29,poleZ,.065,.18,M.ivory);for(let j=0;j<3;j++)cylinder(poleX+dx,5.24+j*.04,poleZ,.085,.025,M.stoneDark);}
// Short catenaries stop at brackets mounted to the building, never outside the model.
for(let i=0;i<2;i++)line([[poleX-.35+i*.4,5.36,poleZ],[2.1,4.67,-4.8],[-.4,4.83,-4.85],[-3.85,5.0,-4.82]],.013,M.black);
line([[poleX,4.65,poleZ],[5.08,3.7,-1],[5.05,3.7,3.78]],.014,M.black);
// Two small enamel street plaques on the corner pillar.
const plaque=group(3.36,1.65,1.65,Math.PI/2);textPlane('听雨巷',.55,.25,'#315d70','#d4e1d5',plaque,0,0,0,164);textPlane('廿三',.24,.19,'#52716a','#e5e0c6',plaque,0,-.26,0,155);

// Brass rain chains descend from each eave into wet stone bowls.
for(const [x,z,top] of [[-4.8,-.8,3.9],[2.53,2.78,3.33]]){
 for(let i=0;i<18;i++){const r=torus(x,top-.1-i*.14,z,.058,.011,M.gold);if(i%2)r.rotation.y=Math.PI/2;}
 cylinder(x,.6,z,.2,.15,M.stoneDark);cylinder(x,.686,z,.15,.005,M.water);
}

// Wet surfaces: narrow cool highlights, irregular puddles, and animated ripple rings.
const puddleMat=new T.MeshStandardMaterial({color:'#8aabb7',roughness:.08,metalness:.62,transparent:true,opacity:.22,depthWrite:false});
for(const [x,z,rx,rz]of[[-2.7,4.45,1.05,.24],[.0,5.15,.9,.2],[4.58,2.7,.31,.7],[4.6,-2.0,.3,.65],[-4.6,3.62,.6,.18],[2.52,4.8,.6,.18]]){
 const shape=new T.Shape();for(let j=0;j<=30;j++){let a=j/30*Math.PI*2,r=1+Math.sin(a*5)*.08+Math.cos(a*7)*.04;let px=Math.cos(a)*rx*r,pz=Math.sin(a)*rz*r;if(j===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);}const o=mesh(new T.ShapeGeometry(shape),puddleMat,x,.361,z);o.rotation.x=-Math.PI/2;
}
for(let i=0;i<50;i++){let x=R(-5.7,5.7),z=R(2.9,5.6);box(x,.365,z,R(.04,.19),.005,.012,new T.MeshBasicMaterial({color:'#b9d9e0',transparent:true,opacity:R(.08,.24),depthWrite:false}));}
const ripples=[];
for(let i=0;i<45;i++){let x,z;do{x=R(-5.7,5.7);z=R(-5.7,5.7);}while(x<3.4&&z<2.9);
 const o=mesh(new T.RingGeometry(.93,1,40),new T.MeshBasicMaterial({color:'#b0d5dd',transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false}),x,.368,z);o.rotation.x=-Math.PI/2;o.castShadow=false;ripples.push({o,phase:R(0,2),speed:R(.55,1.0)});
}
// Slanting rain is made from fine line streaks, with actual downward motion.
const rainCount=720,rainArray=new Float32Array(rainCount*6),rainState=[];
function rainFloor(x,z){if(x>-5.1&&x<2.6&&z>-5.02&&z<-.85){let t=Math.min(1,Math.abs(z+2.93)/2.065);return 3.89+1.0*(1-t)-.17*Math.sin(t*Math.PI)+.18*t**8+.08;}if(x>2.1&&x<3.3&&z>-4.43&&z<.43)return 3.65;if(x>-.98&&x<2.98&&z>1.5&&z<2.95)return 3.8;if(x>-4.87&&x<-.98&&z>1.85&&z<2.6)return 2.05;return x<3.24&&z<2.65?.56:.4;}
for(let i=0;i<rainCount;i++){const x=R(-5.85,5.85),z=R(-5.85,5.85);rainState.push({x,y:R(rainFloor(x,z)+.05,8),z,speed:R(5,8),length:R(.09,.22),floor:rainFloor(x,z)});}
const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainArray,3));
const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#adccdf',transparent:true,opacity:.28,depthWrite:false}));rain.frustumCulled=false;root.add(rain);
// Small hanging eave drops.
for(let i=0;i<33;i++){let x=R(-4.85,2.45);ball(x,3.91-R(0,.14),-.84,.009,.04,.009,standard('#b2d1dd',.08,.1));}

// One low-contrast planar reflection adds wet-stone depth to the whole lane.
const wetMirror=new Reflector(new T.PlaneGeometry(12.0,12.0),{color:0x7c8f9b,textureWidth:768,textureHeight:768,clipBias:.003,multisample:0});
wetMirror.rotation.x=-Math.PI/2;wetMirror.position.y=.3555;wetMirror.material.transparent=true;wetMirror.material.depthWrite=false;wetMirror.renderOrder=1;root.add(wetMirror);
// Batch the fixed architecture into instances; retain individually animated lanterns.
function batchStatic(){root.updateMatrixWorld(true);const buckets=new Map(),outlinePositions=[];const outlines=[];
 function dynamic(o){while(o&&o!==root){if(o.userData.dynamic)return true;o=o.parent;}return false;}
 root.traverse(o=>{if(dynamic(o))return;
  if(o.isLineSegments&&o.material===edgeMat){const pos=o.geometry.attributes.position;const v=new T.Vector3();for(let j=0;j<pos.count;j++){v.fromBufferAttribute(pos,j).applyMatrix4(o.matrixWorld);outlinePositions.push(v.x,v.y,v.z);}outlines.push(o);}
  if(o.isMesh&&!o.isInstancedMesh&&!o.isReflector&&!o.material.transparent){const key=o.geometry.uuid+':'+o.material.uuid;let a=buckets.get(key);if(!a){a=[];buckets.set(key,a);}a.push(o);}
 });
 outlines.forEach(o=>o.removeFromParent());
 if(outlinePositions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(outlinePositions,3));root.add(new T.LineSegments(g,edgeMat));}
 buckets.forEach(a=>{if(a.length<3)return;const inst=new T.InstancedMesh(a[0].geometry,a[0].material,a.length);a.forEach((o,i)=>{inst.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});inst.castShadow=true;inst.receiveShadow=true;inst.computeBoundingSphere();root.add(inst);});
}
batchStatic();
// Orbit with inertia, wheel / pinch zoom, and right-drag panning.
let pointers=new Map(),lastPinch=0,velocity={x:0,y:0},panning=false,dirty=false;
function zoomOutLimit(){return Math.max(42,26.3*Math.max(1,1.1/(innerWidth/innerHeight))*1.6);}
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});panning=e.button===2;velocity.x=velocity.y=0;dirty=true;});
canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const a=[...pointers.values()];const dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastPinch)view.distance=Math.max(5.5,Math.min(zoomOutLimit(),view.distance*lastPinch/dist));lastPinch=dist;}
 else if(panning){const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0);view.target.addScaledVector(right,-dx*.009);view.target.y=Math.max(.5,Math.min(3.5,view.target.y+dy*.008));}
 else{const sx=-dx*.0045,sy=dy*.0038;view.yaw+=sx;view.pitch=Math.max(.18,Math.min(1.23,view.pitch+sy));velocity.x=sx*.2;velocity.y=sy*.2;}cam();
});
function pointerUp(e){pointers.delete(e.pointerId);lastPinch=0;panning=false;}
canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);
canvas.addEventListener('wheel',e=>{e.preventDefault();view.distance=Math.max(5.5,Math.min(zoomOutLimit(),view.distance*Math.exp(e.deltaY*.00085)));cam();},{passive:false});
canvas.addEventListener('dblclick',()=>{view.yaw=.64;view.pitch=.51;view.distance=26.3*Math.max(1,1.1/(innerWidth/innerHeight));view.target.set(0,.85,0);velocity.x=velocity.y=0;cam();});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);view.distance=26.3*Math.max(1,1.1/(innerWidth/innerHeight));cam();}addEventListener('resize',resize);resize();
let previous=performance.now();let elapsed=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;elapsed+=dt;
 if(!pointers.size&&(Math.abs(velocity.x)+Math.abs(velocity.y)>.00005)){view.yaw+=velocity.x;view.pitch=Math.max(.18,Math.min(1.23,view.pitch+velocity.y));velocity.x*=.91;velocity.y*=.91;cam();}
 for(let i=0;i<rainCount;i++){const p=rainState[i];p.y-=dt*p.speed;if(p.y<p.floor){p.y=R(7.1,8.3);}let k=i*6;rainArray[k]=p.x;rainArray[k+1]=p.y;rainArray[k+2]=p.z;rainArray[k+3]=p.x-.032;rainArray[k+4]=p.y+p.length;rainArray[k+5]=p.z-.015;}rainGeo.attributes.position.needsUpdate=true;
 for(const r of ripples){let phase=(elapsed*r.speed+r.phase)%1;let s=.025+phase*.21;r.o.scale.setScalar(s);r.o.material.opacity=(1-phase)*.24;}
 for(const l of lanterns){l.g.rotation.z=Math.sin(elapsed*.7+l.phase)*.018;l.l.intensity=(2.95+Math.sin(elapsed*1.6+l.phase)*.1)*l.s;}
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
// Read-only diagnostics support rendering checks without adding visible controls.
window.courtyard={scene,root,camera,renderer,view,setView(yaw,pitch,distance){view.yaw=yaw;view.pitch=pitch;view.distance=distance;velocity.x=velocity.y=0;cam();},get stats(){return renderer.info.render;}};
})();
