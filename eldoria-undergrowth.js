/**
 * MOD 291 — Sub-bosque da mata de Eldória (estratos da floresta: dossel → arvoretas → arbustos → samambaias).
 * A mata antiga tinha troncos sobre gramado liso; a referência pede chão coberto. Tudo instanciado e cortado por
 * distância (registerCull), em manchas que seguem as árvores e as margens do rio/lago.
 */
import { makeRng } from './eldoria-prologue-meadow.js';

export function fernGeometry(THREE) {
  const pos = [], col = [], base = [.12, .22, .09], tip = [.36, .52, .2];
  for (let f = 0; f < 7; f++) {
    const a = f / 7 * Math.PI * 2 + (f % 2) * .3, L = .55 + (f % 3) * .12, w = .07;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const p0 = [0, .02, 0], p1 = [dx * L * .5, .32, dz * L * .5], p2 = [dx * L, .2, dz * L];
    // dois quads afinando até a ponta, arqueados
    pos.push(p0[0] - px, p0[1], p0[2] - pz, p0[0] + px, p0[1], p0[2] + pz, p1[0] + px * .8, p1[1], p1[2] + pz * .8);
    pos.push(p0[0] - px, p0[1], p0[2] - pz, p1[0] + px * .8, p1[1], p1[2] + pz * .8, p1[0] - px * .8, p1[1], p1[2] - pz * .8);
    pos.push(p1[0] - px * .8, p1[1], p1[2] - pz * .8, p1[0] + px * .8, p1[1], p1[2] + pz * .8, p2[0], p2[1], p2[2]);
    const mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2];
    col.push(...base, ...base, ...mid, ...base, ...mid, ...mid, ...mid, ...mid, ...tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere(); return g;
}

/** Arbusto folhoso de folhas curvas, sem esfera verde facetada.
 *  Geometria unica e barata (~80 triangulos), instanciavel em toda a mata.
 */
export function bushGeometry(THREE, seed = 3) {
  const rnd = makeRng(seed), pos = [], col = [];
  const push = (p,c) => { pos.push(...p);col.push(...c); };
  for(let i=0;i<18;i++){
    const angle=i*2.39996+(rnd()-.5)*.28;
    const radius=.16+rnd()*.26;
    const len=.55+rnd()*.5;
    const height=.32+rnd()*.43;
    const w=.10+rnd()*.09;
    const dx=Math.cos(angle),dz=Math.sin(angle),sx=-dz,sz=dx;
    const bx=dx*radius,bz=dz*radius;
    const tip=[bx+dx*len,height+.10+rnd()*.15,bz+dz*len];
    const mid=[bx+dx*len*.55,height+.24,bz+dz*len*.55];
    const root=[bx*.25,.12,bz*.25];
    const left=[mid[0]+sx*w,mid[1],mid[2]+sz*w],right=[mid[0]-sx*w,mid[1],mid[2]-sz*w];
    const shade=.78+rnd()*.22, dark=[.055*shade,.19*shade,.065*shade], light=[.13*shade,.36*shade,.11*shade];
    push(root,dark);push(left,light);push(right,light);
    push(left,light);push(tip,dark);push(right,light);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

/** Plano puro: samambaias ao pé das árvores do vale, arbustos entre elas e faixa densa nas margens d'água. */
export function planUndergrowth({ trees, banks = [], isFree, lowSpec = false, seed = 9911 }) {
  const rnd = makeRng(seed), ferns = [], bushes = [], maxF = lowSpec ? 750 : 1400, maxB = lowSpec ? 48 : 96;
  const valley = trees.filter(t => t.collide);
  for (const t of valley) {
    const n = 2 + ((rnd() * 4) | 0);
    for (let k = 0; k < n && ferns.length < maxF; k++) { const a = rnd() * 6.28, r = .9 + rnd() * 2.8 * t.s, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) ferns.push({ x, z, s: .7 + rnd() * .7, rot: rnd() * 6.28 }); }
    if (rnd() < .13 && bushes.length < maxB) { const a = rnd() * 6.28, r = 1.6 + rnd() * 2.6, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) bushes.push({ x, z, s: .45 + rnd() * .55, rot: rnd() * 6.28 }); }
  }
  for (const p of banks) {
    for (let k = 0; k < 3 && ferns.length < maxF + 400; k++) { const x = p.x + (rnd() - .5) * 3, z = p.z + (rnd() - .5) * 3; if (isFree(x, z)) ferns.push({ x, z, s: .8 + rnd() * .6, rot: rnd() * 6.28 }); }
    if (rnd() < .07 && bushes.length < maxB + 18) { const x = p.x + (rnd() - .5) * 4, z = p.z + (rnd() - .5) * 4; if (isFree(x, z)) bushes.push({ x, z, s: .5 + rnd() * .5, rot: rnd() * 6.28 }); }
  }
  return { ferns, bushes };
}

export function buildUndergrowth(THREE, o) {
  const { scene, groundHeightAt, addWind, registerCull, lowSpec } = o, plan = planUndergrowth(o), d = new THREE.Object3D(), group = new THREE.Group();
  group.name = 'eldoria-undergrowth-mod291'; scene.add(group);
  const fernMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  if (addWind) addWind(fernMat, .05, 'clamp(position.y*2.2,0.0,1.0)', .9, 'mod291-fern');
  const ferns = new THREE.InstancedMesh(fernGeometry(THREE), fernMat, Math.max(1, plan.ferns.length));
  plan.ferns.forEach((f, i) => { d.position.set(f.x, groundHeightAt(f.x, f.z) - .03, f.z); d.rotation.set(0, f.rot, 0); d.scale.setScalar(f.s); d.updateMatrix(); ferns.setMatrixAt(i, d.matrix); });
  ferns.count = plan.ferns.length; ferns.instanceMatrix.needsUpdate = true; ferns.receiveShadow = true; ferns.name = 'eldoria-ferns'; group.add(ferns);
  const bushMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: false, side: THREE.DoubleSide });
  const bushes = new THREE.InstancedMesh(bushGeometry(THREE), bushMat, Math.max(1, plan.bushes.length));
  plan.bushes.forEach((b, i) => { d.position.set(b.x, groundHeightAt(b.x, b.z) + b.s * .25, b.z); d.rotation.set(0, b.rot, 0); d.scale.set(b.s * 1.4, b.s, b.s * 1.2); d.updateMatrix(); bushes.setMatrixAt(i, d.matrix); });
  bushes.count = plan.bushes.length; bushes.instanceMatrix.needsUpdate = true; bushes.receiveShadow = true; bushes.castShadow = !lowSpec; bushes.name = 'eldoria-bushes'; group.add(bushes);
  if (registerCull) { registerCull(ferns, lowSpec ? 38 : 52, 12); registerCull(bushes, lowSpec ? 60 : 80, 16); }
  return { group, stats: { ferns: plan.ferns.length, bushes: plan.bushes.length } };
}

/* MOD 291 — densidade de floresta tropical úmida (direção do criador, 08/11): plantas de folha larga em leque
   (tipo costela-de-adão/helicônia, desenho próprio) e cipós pendendo das copas. Instanciados e cortados por distância. */
export function broadLeafGeometry(THREE) {
  // Folhas lanceoladas estreitas, curvas e de tamanhos desencontrados:
  // elimina o aspecto de estrelas de triangulos grandes sem texturas extras.
  const pos=[],col=[],N=6;
  const shades=[[.045,.145,.048],[.065,.20,.064],[.085,.235,.075]];
  for(let k=0;k<N;k++){
    const angle=k*2.399963+(k%3)*.13,dx=Math.cos(angle),dz=Math.sin(angle),px=-dz,pz=dx;
    const len=.52+(k%3)*.10,width=.15+(k%2)*.025,lift=.22+(k%3)*.045;
    const color=shades[k%shades.length];
    const point=(t,side)=>{
      const taper=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.85);
      const d=.09+len*t, bend=Math.sin(t*Math.PI)*.065;
      return [dx*d+px*(side*width*taper+bend),lift+.21*Math.sin(Math.PI*t)-.19*t*t,dz*d+pz*(side*width*taper+bend)];
    };
    for(let i=0;i<5;i++){
      const t0=i/5,t1=(i+1)/5,l0=point(t0,-1),r0=point(t0,1),l1=point(t1,-1),r1=point(t1,1);
      const edge=color.map(v=>v*.81),face=color.map(v=>v*(1+.07*Math.sin(t1*Math.PI)));
      pos.push(...l0,...r0,...r1,...l0,...r1,...l1);
      col.push(...edge,...face,...face,...edge,...face,...edge);
    }
    pos.push(0,.035,0,.015,.035,0,dx*.09,lift,dz*.09);
    col.push(...color,...color,...color);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.computeVertexNormals();g.computeBoundingSphere();return g;
}
/** Cipó: fita fina curva de altura 1 (topo em y=1), balança com o vento do jogo. */
export function vineGeometry(THREE) {
  const pos = [], col = [], S = 8, w = .035;
  for (let i = 0; i < S; i++) {
    const t0 = i / S, t1 = (i + 1) / S, x0 = Math.sin(t0 * 3.1) * .05, x1 = Math.sin(t1 * 3.1) * .05;
    const y0 = 1 - t0, y1 = 1 - t1, c0 = [.16, .2 + t0 * .1, .1], c1 = [.16, .2 + t1 * .1, .1];
    pos.push(x0 - w, y0, 0, x0 + w, y0, 0, x1 + w, y1, 0, x0 - w, y0, 0, x1 + w, y1, 0, x1 - w, y1, 0);
    col.push(...c0, ...c0, ...c1, ...c0, ...c1, ...c1);
    if (i % 2 === 1) { pos.push(x1, y1, 0, x1 + .14, y1 - .03, .05, x1 + .05, y1 - .1, -.04); col.push(.12, .32, .1, .2, .45, .14, .2, .45, .14); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
export function planTropical({ trees, zone, isFree, lowSpec = false, seed = 4242 }) {
  const rnd = makeRng(seed), leaves = [], vines = [], maxL = lowSpec ? 180 : 360;
  for (const t of trees) {
    const n = 1 + ((rnd() * 2) | 0);
    for (let k = 0; k < n && leaves.length < maxL; k++) { const a = rnd() * 6.28, r = 2.2 + rnd() * 4, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) leaves.push({ x, z, s: .9 + rnd() * 1.1, rot: rnd() * 6.28 }); }
    const nv = (rnd() < .7 ? 2 : 1) + (rnd() < .3 ? 1 : 0);
    for (let k = 0; k < nv; k++) { const a = rnd() * 6.28, r = 1.4 + rnd() * 2.2; vines.push({ x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r, top: t.h * (.62 + rnd() * .2), len: t.h * (.35 + rnd() * .35), rot: rnd() * 6.28 }); }
  }
  if (zone) for (let i = 0; i < (lowSpec ? 280 : 560) && leaves.length < maxL; i++) { const x = zone.x0 + rnd() * (zone.x1 - zone.x0), z = zone.z0 + rnd() * (zone.z1 - zone.z0); if (isFree(x, z)) leaves.push({ x, z, s: .8 + rnd() * .9, rot: rnd() * 6.28 }); }
  return { leaves, vines };
}
export function buildTropical(THREE, o) {
  const { scene, groundHeightAt, addWind, registerCull, lowSpec } = o, plan = planTropical(o), d = new THREE.Object3D(), group = new THREE.Group();
  group.name = 'eldoria-tropical-mod291'; scene.add(group);
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  if (addWind) addWind(leafMat, .05, 'clamp(position.y*1.6,0.0,1.0)', .8, 'mod291-broadleaf');
  const leaves = new THREE.InstancedMesh(broadLeafGeometry(THREE), leafMat, Math.max(1, plan.leaves.length));
  plan.leaves.forEach((l, i) => { d.position.set(l.x, groundHeightAt(l.x, l.z) - .02, l.z); d.rotation.set(0, l.rot, 0); d.scale.setScalar(l.s); d.updateMatrix(); leaves.setMatrixAt(i, d.matrix); });
  leaves.count = plan.leaves.length; leaves.instanceMatrix.needsUpdate = true; leaves.receiveShadow = true; leaves.name = 'eldoria-broadleaf'; group.add(leaves);
  const vineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide });
  if (addWind) addWind(vineMat, .12, 'clamp(1.0-position.y,0.0,1.0)', .6, 'mod291-vine');
  const vines = new THREE.InstancedMesh(vineGeometry(THREE), vineMat, Math.max(1, plan.vines.length));
  plan.vines.forEach((v, i) => { const gy = groundHeightAt(v.x, v.z); d.position.set(v.x, gy + v.top - v.len, v.z); d.rotation.set(0, v.rot, 0); d.scale.set(1.4, v.len, 1.4); d.updateMatrix(); vines.setMatrixAt(i, d.matrix); });
  vines.count = plan.vines.length; vines.instanceMatrix.needsUpdate = true; vines.name = 'eldoria-vines'; group.add(vines);
  if (registerCull) { registerCull(leaves, lowSpec ? 40 : 55, 12); registerCull(vines, lowSpec ? 45 : 60, 14); }
  return { group, stats: { leaves: plan.leaves.length, vines: plan.vines.length } };
}
