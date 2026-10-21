import * as T from 'three';
import { toonGradient } from './materials';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const unitBall = new T.SphereGeometry(1, 24, 18);
const material = (color: string, _roughness = .88) => new T.MeshToonMaterial({ color, gradientMap: toonGradient });
type Ring = [y: number, radiusX: number, radiusZ: number, fold?: number, centerX?: number, centerZ?: number];

function part(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geometry, mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
function ball(parent: T.Object3D, mat: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = part(parent, unitBall, mat, x, y, z); mesh.scale.set(sx, sy, sz); return mesh;
}
function tube(parent: T.Object3D, mat: T.Material, points: number[][], radius: number, sides = 6) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])));
  return part(parent, new T.TubeGeometry(curve, 20, radius, sides, false), mat);
}

// Each garment is one continuous surface. Irregular radial folds change its
// silhouette and lighting; the knees deform smoothly without separate rings.
function garment(rings: Ring[], segments = 40, phase = 0) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  rings.forEach(([y, rx, rz, fold = 0, cx = 0, cz = 0], row) => {
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2;
      const pleat = fold * (Math.sin(a * 7 + phase + y * 4) * .58 + Math.sin(a * 11 - y * 7) * .26 + Math.sin(a * 3 + y * 6) * .16);
      positions.push(cx + Math.cos(a) * (rx + pleat), y, cz + Math.sin(a) * (rz + pleat));
      uvs.push(j / segments * 2, row / (rings.length - 1) * 2);
      if (row < rings.length - 1 && j < segments) {
        const a0 = row * (segments + 1) + j, b = a0 + segments + 1;
        indices.push(a0, b, a0 + 1, a0 + 1, b, b + 1);
      }
    }
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}
// The bag's shoulder strap is a flat textile ribbon, with separate sewn edges.
function ribbon(parent: T.Object3D, mat: T.Material, points: number[][], width: number, depth = .004) {
  const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])));
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let j = 0; j <= 30; j++) {
    const t = j / 30, p = path.getPoint(t), tangent = path.getTangent(t);
    const edge = new T.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(width / 2);
    for (const side of [-1, 1]) {
      positions.push(p.x + edge.x * side, p.y + edge.y * side, p.z + depth);
      uv.push((side + 1) / 2, t * 4);
    }
    if (j < 30) { const a = j * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
  return part(parent, g, mat);
}
function hairLock(parent: T.Object3D, mat: T.Material, points: number[][], radius: number) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])));
  const g = new T.TubeGeometry(curve, 18, radius, 8, false), pos = g.getAttribute('position');
  for (let j = 0; j <= 18; j++) {
    const p = curve.getPoint(j / 18), taper = .12 + .88 * Math.sin(Math.PI * (.11 + j / 18 * .87));
    for (let k = 0; k <= 8; k++) {
      const i = j * 9 + k;
      pos.setXYZ(i, p.x + (pos.getX(i) - p.x) * taper, p.y + (pos.getY(i) - p.y) * taper, p.z + (pos.getZ(i) - p.z) * taper * .55);
    }
  }
  g.computeVertexNormals(); return part(parent, g, mat);
}

function combineRigidParts(root: T.Object3D) {
  const parents: T.Object3D[] = []; root.traverse(o => parents.push(o));
  for (const parent of parents) {
    const batches = new Map<T.Material, T.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof T.Mesh) || child instanceof T.SkinnedMesh || Array.isArray(child.material)) continue;
      const meshes = batches.get(child.material) ?? []; meshes.push(child); batches.set(child.material, meshes);
    }
    for (const [mat, meshes] of batches) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map(mesh => { mesh.updateMatrix(); const g = mesh.geometry.clone().applyMatrix4(mesh.matrix); return g.index ? g.toNonIndexed() : g; });
      const merged = mergeGeometries(geometries);
      if (merged) { meshes.forEach(mesh => parent.remove(mesh)); part(parent, merged, mat); }
      geometries.forEach(g => g.dispose());
    }
  }
}

function faceGeometry() {
  const g = new T.SphereGeometry(1, 40, 32), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i), front = Math.max(0, p.getZ(i));
    const y = 1.510 + v * .143, jaw = 1 - .19 * T.MathUtils.smoothstep(-v, .12, .95);
    const x = u * .114 * jaw;
    let z = p.getZ(i) * .103;
    if (front > 0) {
      const bump = (cx: number, cy: number, wx: number, wy: number) => Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
      z += .026*bump(0,1.489,.017,.025) + .010*bump(0,1.52,.012,.044);
      z += .004*(bump(-.053,1.478,.036,.024)+bump(.053,1.478,.036,.024));
      z -= .005*(bump(-.042,1.523,.031,.018)+bump(.042,1.523,.031,.018));
      z += .004*bump(0,1.45,.030,.013);
    }
    p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals(); return g;
}

function hairCapGeometry() {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for(let row=0;row<=18;row++)for(let col=0;col<=48;col++) {
    const a=col/48*Math.PI*2, back=(1-Math.cos(a))*.5, polar=row/18*(1.12+1.10*back);
    positions.push(Math.sin(a)*Math.sin(polar)*.12,1.529+Math.cos(polar)*.131,-.006+Math.cos(a)*Math.sin(polar)*.11);
    uvs.push(col/48,row/18);
    if(row<18&&col<48){const k=row*49+col;indices.push(k,k+49,k+1,k+1,k+49,k+50);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export class Character {
  root = new T.Group(); body = new T.Group(); head = new T.Group(); satchel = new T.Group();
  hips: T.Bone[] = []; knees: T.Bone[] = []; ankles: T.Group[] = []; arms: T.Group[] = []; elbows: T.Group[] = [];
  phase = 0; blend = 0;

  constructor() {
    // Cloth folds carry the shading; pixel-scale bump noise breaks cel bands at sunset.
    const cloth = (color: string) => material(color, .96);
    const coat = cloth('#477e79'), coatEdge = cloth('#548982'), seam = cloth('#345e5a');
    const cream = cloth('#e7dfcb'), creamEdge = cloth('#cfc8b7'), skin = material('#e8b797', .73), skinShade = material('#c68c72', .84);
    const hair = material('#292820', .71), hairLight = material('#35342b', .74), hairShine = material('#414034', .71);
    const shoes = cloth('#303c38'), sole = material('#b8ad93', .97), leather = cloth('#8e6846'), leatherEdge = cloth('#755239');
    leather.side = leatherEdge.side = T.DoubleSide;
    const brass = material('#b99a5d', .48), stitch = material('#bc9b72', 1), lip = material('#b77969', .8);
    this.root.name = 'Traveler'; this.root.add(this.body);

    const jacketRings: Ring[] = [
      [.765,.195,.116,.003], [.778,.205,.123,.007], [.80,.205,.125,.008], [.85,.201,.126,.009],
      [.93,.188,.118,.009], [1.02,.171,.112,.006], [1.10,.169,.119,.005], [1.18,.183,.126,.006],
      [1.24,.211,.123,.005], [1.285,.219,.113,.003], [1.31,.187,.100,.002], [1.337,.093,.071,.001],
    ];
    part(this.body, garment(jacketRings), coat);
    part(this.body, garment([[.744,.183,.105,.004],[.755,.186,.108,.004],[.787,.186,.108,.003]]), cream);
    part(this.body, garment([[.767,.199,.119,.003],[.774,.207,.127,.004],[.784,.207,.127,.004]]), coatEdge);
    part(this.body, garment([[1.325,.058,.05],[1.398,.046,.046]]), skin);
    part(this.body, garment([[1.31,.071,.063],[1.325,.071,.064],[1.376,.059,.058],[1.379,.057,.056]]), coat);
    tube(this.body, coatEdge, [[-.058,1.378,.015],[-.042,1.378,.047],[0,1.355,.061],[.04,1.379,.043],[.058,1.379,.006]], .0035);
    ribbon(this.body, seam, [[0,1.35,.066],[.014,1.27,.126],[.012,1.10,.129],[.016,.92,.126],[.015,.78,.133]], .012, .003);
    for (let i = 0; i < 4; i++) {
      const y = 1.27 - i * .105, z = i === 0 ? .129 : .135;
      tube(this.body, coatEdge, [[-.034,y,z],[-.016,y+.004,z+.004],[.025,y,z+.004],[.033,y-.007,z]], .004);
      ball(this.body, seam, .027, y, z + .007, .009, .008, .008);
    }
    for (const side of [-1, 1]) {
      tube(this.body, seam, [[side*.192,.793,.01],[side*.192,.875,.00],[side*.172,1.005,-.006],[side*.18,1.13,-.005]], .0025);
      // Bone weighting makes the whole trouser leg bend without an exposed joint.
      const hip = new T.Bone(); hip.position.set(side * .102, .88, 0); this.body.add(hip); this.hips.push(hip);
      const knee = new T.Bone(); knee.position.y = -.38; hip.add(knee); this.knees.push(knee);
      const rings: Ring[] = [
        [.145,.056,.055,.002],[.162,.063,.060,.005],[.195,.076,.068,.010],[.23,.095,.082,.015],
        [.29,.111,.092,.013],[.36,.115,.096,.011],[.43,.110,.100,.008],[.49,.104,.098,.006],
        [.55,.102,.099,.007],[.61,.103,.100,.008],[.69,.103,.096,.007],[.77,.083,.084,.004],[.84,.075,.077,.002],[.88,.072,.074,.001],
      ];
      const g = garment(rings, 40, side * .8); g.translate(side * .102, 0, 0);
      const pos = g.getAttribute('position'), weights: number[] = [], bones: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const t = T.MathUtils.smoothstep(pos.getY(i), .44, .575);
        bones.push(0, 1, 0, 0); weights.push(t, 1 - t, 0, 0);
      }
      g.setAttribute('skinIndex', new T.Uint16BufferAttribute(bones, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
      const pants = new T.SkinnedMesh(g, cream); this.body.add(pants); this.body.updateMatrixWorld(true);
      pants.bind(new T.Skeleton([hip, knee])); pants.castShadow = true; pants.receiveShadow = true;
      part(knee, garment([[-.36,.057,.055,.002],[-.349,.065,.059,.003],[-.322,.065,.061,.004],[-.316,.061,.059,.002]]), cream);
      tube(knee, creamEdge, [[-.044,-.34,.04],[0,-.341,.061],[.041,-.34,.046]], .002);
      part(knee, garment([[-.451,.039,.047],[-.427,.043,.044],[-.34,.041,.042]]), skin);
      const ankle = new T.Group(); ankle.position.y=-.43; knee.add(ankle); this.ankles.push(ankle);
      const shoe = part(ankle, new RoundedBoxGeometry(.143,.082,.236,3,.039), shoes, 0,-.026,.037); shoe.rotation.x = -.015;
      part(ankle, new RoundedBoxGeometry(.147,.024,.243,3,.011), sole, 0,-.063,.04);
      ball(ankle, shoes, 0,.007,.011,.059,.044,.070);
      tube(ankle, creamEdge, [[-.059,-.053,.101],[-.038,-.052,.15],[0,-.052,.16],[.039,-.052,.151],[.061,-.053,.10]], .0017);
      tube(ankle, shoes, [[-.047,.013,.044],[0,.023,.09],[.047,.013,.044]], .005);
      const arm = new T.Group(); arm.position.set(side*.204,1.268,0); arm.rotation.z = side*.125; arm.scale.set(.93,1,.96); this.body.add(arm); this.arms.push(arm);
      part(arm, garment([[-.269,.082,.080,.002],[-.249,.090,.088,.004],[-.224,.096,.090,.007],[-.17,.096,.089,.009],[-.10,.099,.086,.008],[-.036,.093,.082,.003],[.012,.073,.069,.001],[.038,.034,.041]]), coat);
      part(arm, garment([[-.282,.080,.077,.003],[-.273,.093,.088,.004],[-.242,.098,.092,.005],[-.231,.092,.086,.004]]), cream);
      tube(arm, creamEdge, [[-.075,-.267,.033],[-.042,-.27,.08],[.024,-.269,.089],[.072,-.267,.042]], .0025);
      const elbow = new T.Group(); elbow.position.set(0,-.265,0); arm.add(elbow); this.elbows.push(elbow);
      part(elbow, garment([[-.215,.030,.028],[-.18,.034,.030],[-.13,.043,.038],[-.07,.049,.044],[.01,.045,.043]]), skin);
      const hand = new T.Group(); hand.position.set(0,-.21,.003); elbow.add(hand);
      ball(hand, skin, 0,-.032,0,.034,.048,.021);
      for (let finger = 0; finger < 4; finger++) {
        const x = (finger-1.5)*.015, length = [.040,.054,.056,.044][finger]!;
        const f = part(hand,new T.CapsuleGeometry(.009,length*.5,4,8),skin,x,-.064-length*.2,.006+Math.abs(finger-1.5)*.002); f.rotation.x = -.16;
      }
      const thumb = part(hand,new T.CapsuleGeometry(.012,.025,4,10),skin,-side*.034,-.03,.014); thumb.rotation.z = -side*.36;
    }

    this.body.add(this.head);
    part(this.head, faceGeometry(), skin);
    const whites = material('#e9e6d7', .72), iris = material('#554334', .6), pupil = material('#242a23', .58), glint = material('#fff8df', .3);
    for (const side of [-1, 1]) {
      ball(this.head,skin,side*.106,1.498,-.002,.020,.035,.023); ball(this.head,skinShade,side*.116,1.499,.013,.008,.021,.009);
      ball(this.head,whites,side*.042,1.519,.096,.025,.011,.008); ball(this.head,iris,side*.041,1.519,.103,.011,.011,.005);
      ball(this.head,pupil,side*.041,1.519,.107,.0058,.007,.0025); ball(this.head,glint,side*.037,1.523,.109,.0028,.0028,.0015);
      tube(this.head,hair,[[side*.018,1.524,.102],[side*.038,1.532,.105],[side*.06,1.528,.096],[side*.07,1.522,.087]],.0023);
      tube(this.head,hairLight,[[side*.020,1.549,.097],[side*.04,1.556,.100],[side*.063,1.551,.086]],.0035);
    }
    ball(this.head,skinShade,-.010,1.478,.117,.003,.0018,.002); ball(this.head,skinShade,.010,1.478,.117,.003,.0018,.002);
    tube(this.head,lip,[[-.023,1.454,.09],[-.010,1.457,.103],[0,1.456,.106],[.01,1.457,.103],[.023,1.454,.09]],.0031);
    part(this.head,hairCapGeometry(),hair);
    // Swept, tapered locks follow the tied hair instead of forming a helmet.
    for(let i=0;i<17;i++){
      const a=(i/16-.5)*Math.PI*.98, x=Math.sin(a)*.113, z=-.017-Math.cos(a)*.097;
      const endY=1.416+Math.abs(Math.sin(a))*.056+Math.sin(i*1.9)*.012;
      hairLock(this.head,i%4===0?hairLight:hair,[[Math.sin(a)*.025,1.663,-.034],[x*.77,1.62,z*.91],[x,1.54,z],[x*.9,endY,z*.92]],.017);
      if(i%2===0)tube(this.head,hairShine,[[Math.sin(a)*.023,1.655,-.047],[x*.82,1.60,z-.008],[x*.97,1.515,z-.006]],.0011);
    }
    for(const side of [-1,1]){
      hairLock(this.head,hair,[[side*.01,1.644,.021],[side*.055,1.608,.087],[side*.084,1.552,.080],[side*.111,1.486,.036]],.025);
      hairLock(this.head,hairLight,[[side*.022,1.642,.025],[side*.078,1.605,.075],[side*.104,1.544,.036],[side*.099,1.43,.025]],.014);
      hairLock(this.head,hair,[[side*.102,1.521,-.053],[side*.091,1.461,-.07],[side*.068,1.393,-.043]],.012);
    }
    ball(this.head,hair,0,1.682,-.041,.055,.052,.053);
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2;
      hairLock(this.head,i%3===0?hairLight:hair,[[Math.cos(a)*.043,1.657,-.041+Math.sin(a)*.037],[Math.cos(a+.55)*.051,1.70,-.043+Math.sin(a+.55)*.044],[Math.cos(a+1.1)*.026,1.721,-.043+Math.sin(a+1.1)*.026],[0,1.684,-.021]],.015);
    }
    const tie=part(this.head,new T.TorusGeometry(.048,.004,6,24),seam,0,1.66,-.041);tie.rotation.x=Math.PI/2;

    // Local +Z faces forward; negative X is the traveler's anatomical right.
    this.satchel.position.set(-.244,.855,.100); this.satchel.rotation.z=-.10; this.body.add(this.satchel);
    part(this.satchel,new RoundedBoxGeometry(.185,.241,.114,3,.027),leather,0,-.008,.018);
    part(this.satchel,new RoundedBoxGeometry(.196,.121,.025,3,.012),leatherEdge,0,.076,.086);
    part(this.satchel,new RoundedBoxGeometry(.033,.12,.018,2,.007),leather,0,.033,.105);
    part(this.satchel,new RoundedBoxGeometry(.03,.039,.009,2,.004),brass,0,.001,.116);
    for(const side of [-1,1])tube(this.satchel,stitch,[[side*.073,.086,.099],[side*.075,-.054,.078],[side*.067,-.109,.063],[side*.02,-.121,.078]],.0015);
    tube(this.satchel,stitch,[[-.071,.113,.101],[0,.119,.103],[.071,.113,.101]],.0015);
    const front=[[.165,1.316,.003],[.144,1.285,.097],[.094,1.20,.133],[-.029,1.045,.143],[-.203,.886,.19]];
    const back=[[.165,1.316,.003],[.148,1.282,-.11],[.056,1.15,-.143],[-.10,.978,-.144],[-.229,.866,.035]];
    ribbon(this.body,leather,front,.043); ribbon(this.body,leather,back,.043,-.004);
    for(const path of [front,back])for(const edge of [-1,1]) {
      const border=path.map((p,i)=>{const next=path[Math.min(path.length-1,i+1)]!,previous=path[Math.max(0,i-1)]!,dx=next[0]!-previous[0]!,dy=next[1]!-previous[1]!,len=Math.hypot(dx,dy)||1;return[p[0]!-dy/len*.016*edge,p[1]!+dx/len*.016*edge,p[2]!+(path===front?.007:-.007)];});
      tube(this.body,stitch,border,.0011,4);
    }
    combineRigidParts(this.root);
    // Thin overlapping cloth folds self-shadow poorly under a low sunset sun.
    // Keep architectural shade on the traveler and use the soft contact patch below.
    this.root.traverse(object=>{if(object instanceof T.Mesh)object.castShadow=false;});
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d')!;
    const gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(31,40,30,.27)');gradient.addColorStop(.40,'rgba(31,40,30,.13)');gradient.addColorStop(1,'rgba(31,40,30,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);
    const contact=part(this.root,new T.PlaneGeometry(.70,.60),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}),0,-.019,0);contact.rotation.x=-Math.PI/2;contact.castShadow=false;
  }

  update(dt: number, speed: number, elapsed: number) {
    this.blend=T.MathUtils.damp(this.blend,Math.min(1,speed/1.9),9,dt);
    this.phase+=dt*Math.max(1.5,speed*4.3);
    for(let i=0;i<2;i++){
      const phase=this.phase+i*Math.PI,s=Math.sin(phase),side=i===0?-1:1;
      this.hips[i]!.rotation.x=s*.46*this.blend; this.hips[i]!.rotation.z=side*.014*this.blend;
      this.knees[i]!.rotation.x=Math.max(0,-s)*1.10*this.blend;
      this.ankles[i]!.rotation.x=-this.hips[i]!.rotation.x-this.knees[i]!.rotation.x+Math.max(0,-s)*.12*this.blend;
      this.arms[i]!.rotation.x=-s*.31*this.blend+.025; this.arms[i]!.rotation.z=side*(.125+Math.sin(elapsed*1.35)*.005);
      this.elbows[i]!.rotation.x=-.09-Math.max(0,s)*.10*this.blend;
    }
    // Lower the pelvis by the support leg's lost vertical reach and level the
    // planted foot. This keeps the walk grounded instead of lifting both soles.
    this.body.position.y=-.035-.81*(1-Math.cos(Math.sin(this.phase)*.46*this.blend))+Math.sin(elapsed*1.8)*.0015;
    this.body.rotation.z=Math.sin(this.phase)*.015*this.blend; this.body.rotation.y=Math.sin(this.phase)*.022*this.blend;
    this.satchel.rotation.x=Math.sin(this.phase+.4)*.045*this.blend; this.satchel.rotation.z=-.10+Math.cos(this.phase)*.025*this.blend;
  }
}
