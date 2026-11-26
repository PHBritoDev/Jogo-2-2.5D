/**
 * MOD 291 — Sub-bosque da mata de Eldória (estratos da floresta: dossel → arvoretas → arbustos → samambaias).
 * A mata antiga tinha troncos sobre gramado liso; a referência pede chão coberto. Tudo instanciado e cortado por
 * distância (registerCull), em manchas que seguem as árvores e as margens do rio/lago.
 */
import { makeRng } from './eldoria-prologue-meadow.js';

/** Alturas-base do extras.height do GLB tropical (tools/eldoria/trees/tree-species.mjs). */
export const TROPICAL_SPECIES_HEIGHTS = Object.freeze({
  sumauma: 30.4,
  copaLarga: 14.6,
  figueira: 14.4,
  palmeira: 14.5,
  embauba: 15.6
});

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

/**
 * Fade pontilhado das plantas que ficam entre a câmera e o protagonista. O controlador compartilhado mantém
 * seu fade-base de 2,2 m; esta camada leva a transição a 5,6 m para alcançar folhas/folíolos que ainda cobriam
 * as pernas na pose de entrada (-14,-82). Bayer 4x4 distribui 16 limiares uniformes sem alpha blending,
 * remoção de instâncias ou abertura de clareiras.
 */
export const UNDERGROWTH_CAMERA_FADE_METERS = 5.6;
/**
 * Fade focal: só afeta vegetação próxima dentro do cone de visão centrado no protagonista.
 * O restante do sub-bosque continua opaco, evitando uma clareira que acompanha a câmera.
 * O Bayer 8x8 é ancorado em coordenadas de mundo para não rastejar pela tela durante a caminhada.
 */
export function applyUndergrowthCameraFade(material, fadeSpanMeters = UNDERGROWTH_CAMERA_FADE_METERS) {
  if (!material || typeof material !== 'object') return material;
  const fadeSpan = Number.isFinite(fadeSpanMeters) ? Math.max(.61, fadeSpanMeters) : UNDERGROWTH_CAMERA_FADE_METERS;
  const marker = 'a3-undergrowth-focus-fade-' + fadeSpan.toFixed(2) + '-world-bayer8-32';
  material.userData ||= {};
  if (material.userData[marker]) return material;
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    if (previous) previous.call(this, shader, renderer);
    const common = '#include <common>';
    const worldPositionChunk = '#include <worldpos_vertex>';
    const clippingChunk = '#include <clipping_planes_fragment>';
    if (!shader.vertexShader.includes(common) || !shader.vertexShader.includes(worldPositionChunk)) {
      throw new Error('Shader do sub-bosque sem common/worldpos_vertex');
    }
    if (!shader.fragmentShader.includes(common) || !shader.fragmentShader.includes(clippingChunk)) {
      throw new Error('Shader do sub-bosque sem common/clipping_planes_fragment');
    }
    shader.vertexShader = shader.vertexShader.replace(common, common + '\nvarying vec3 vA3UndergrowthWorldPosition;');
    shader.vertexShader = shader.vertexShader.replace(
      worldPositionChunk,
      worldPositionChunk + '\nvA3UndergrowthWorldPosition = worldPosition.xyz;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(common, common + '\nvarying vec3 vA3UndergrowthWorldPosition;');
    const fade = '\n{float a3UnderDepth=max(-vViewPosition.z,0.001);vec2 a3UnderViewAngle=vec2(vViewPosition.x/a3UnderDepth,vViewPosition.y/a3UnderDepth+0.10);float a3UnderFocusRadius=length(a3UnderViewAngle/vec2(0.30,0.38));float a3UnderFocus=1.0-smoothstep(0.72,1.05,a3UnderFocusRadius);float a3UnderFade=clamp((length(vViewPosition)-0.6)/'
      + fadeSpan.toFixed(2)
      + ',0.0,1.0);a3UnderFade=mix(1.0,a3UnderFade,a3UnderFocus);vec2 a3UnderCell=mod(floor(vA3UndergrowthWorldPosition.xz*32.0),8.0);float a3UnderX0=mod(a3UnderCell.x,2.0);float a3UnderY0=mod(a3UnderCell.y,2.0);float a3UnderX1=mod(floor(a3UnderCell.x*0.5),2.0);float a3UnderY1=mod(floor(a3UnderCell.y*0.5),2.0);float a3UnderX2=floor(a3UnderCell.x*0.25);float a3UnderY2=floor(a3UnderCell.y*0.25);float a3UnderBayer4=4.0*mod(2.0*a3UnderX0+3.0*a3UnderY0,4.0)+mod(2.0*a3UnderX1+3.0*a3UnderY1,4.0);float a3UnderBayer8=4.0*a3UnderBayer4+mod(2.0*a3UnderX2+3.0*a3UnderY2,4.0);float a3UnderDither=(a3UnderBayer8+0.5)/64.0;if(a3UnderDither>a3UnderFade)discard;}';
    shader.fragmentShader = shader.fragmentShader.replace(clippingChunk, clippingChunk + fade);
  };
  material.customProgramCacheKey = function() {
    const key = previousKey ? previousKey.call(this) : '';
    return key + '|' + marker;
  };
  material.needsUpdate = true;
  material.userData[marker] = true;
  return material;
}
export function buildUndergrowth(THREE, o) {
  const { scene, groundHeightAt, addWind, registerCull, lowSpec } = o, plan = planUndergrowth(o), d = new THREE.Object3D(), group = new THREE.Group();
  group.name = 'eldoria-undergrowth-mod291'; scene.add(group);
  const fernMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  if (addWind) addWind(fernMat, .05, 'clamp(position.y*2.2,0.0,1.0)', .9, 'mod291-fern');
  applyUndergrowthCameraFade(fernMat);
  const ferns = new THREE.InstancedMesh(fernGeometry(THREE), fernMat, Math.max(1, plan.ferns.length));
  plan.ferns.forEach((f, i) => { d.position.set(f.x, groundHeightAt(f.x, f.z) - .03, f.z); d.rotation.set(0, f.rot, 0); d.scale.setScalar(f.s); d.updateMatrix(); ferns.setMatrixAt(i, d.matrix); });
  ferns.count = plan.ferns.length; ferns.instanceMatrix.needsUpdate = true; ferns.receiveShadow = true; ferns.name = 'eldoria-ferns'; group.add(ferns);
  const bushMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: false, side: THREE.DoubleSide });
  applyUndergrowthCameraFade(bushMat);
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
/** A ponta de um folíolo alcança y=-0.1; a origem da instância não é o limite inferior real. */
const VINE_GEOMETRY_MIN_Y = -.1;
const VINE_GEOMETRY_MAX_Y = 1;
const VINE_GEOMETRY_VERTICAL_SPAN = VINE_GEOMETRY_MAX_Y - VINE_GEOMETRY_MIN_Y;

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
  // Envelope horizontal da malha instanciada (~0,275 m) + oscilação máxima do shader (~0,123 m).
  // Validar a borda inteira evita que a fita/folhas do cipó invadam a trilha mesmo com o pivô livre.
  const vineFits = (x, z) => {
    const radius = .4, boundarySamples = 16, gridSteps = 4;
    // Grade interna de 0,1 m: o anel sozinho deixava bolsões estreitos no meio do envelope sem testar.
    for (let ix = -gridSteps; ix <= gridSteps; ix++) {
      for (let iz = -gridSteps; iz <= gridSteps; iz++) {
        const dx = ix * radius / gridSteps, dz = iz * radius / gridSteps;
        if (dx * dx + dz * dz > radius * radius + 1e-9) continue;
        if (!isFree(x + dx, z + dz)) return false;
      }
    }
    // Reforça o perímetro circular entre os pontos da grade.
    for (let i = 0; i < boundarySamples; i++) {
      const a = i * Math.PI * 2 / boundarySamples;
      if (!isFree(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) return false;
    }
    return true;
  };
  for (const t of trees) {
    const n = 1 + ((rnd() * 2) | 0);
    for (let k = 0; k < n && leaves.length < maxL; k++) { const a = rnd() * 6.28, r = 2.2 + rnd() * 4, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (isFree(x, z)) leaves.push({ x, z, s: .9 + rnd() * 1.1, rot: rnd() * 6.28 }); }
    const nv = (rnd() < .7 ? 2 : 1) + (rnd() < .3 ? 1 : 0);
    // Os cipós também precisam respeitar o corredor; antes só as folhas consultavam isFree.
    for (let k = 0; k < nv; k++) {
      const a = rnd() * 6.28, r = 1.4 + rnd() * 2.2;
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
      // Consome os mesmos valores antes do filtro para manter o RNG dos próximos troncos estável.
      // planTropicalBelt fornece sp/s, mas não h; usa a altura-base real do GLB por espécie.
      // h explícito continua prioritário; a escala s acompanha a mesma instância do tronco.
      const speciesHeight = TROPICAL_SPECIES_HEIGHTS[t.sp] || 12;
      const treeHeight = Number.isFinite(t.h) && t.h > 0
        ? t.h
        : speciesHeight * (Number.isFinite(t.s) && t.s > 0 ? t.s : 1);
      const top = treeHeight * (.62 + rnd() * .2);
      const rawLength = treeHeight * (.35 + rnd() * .35);
      // O último folíolo passa de y=0 até y=-0.1; limitar pelo span real da malha evita enterrá-lo.
      // O topo continua fixo e a menor coordenada renderizada fica a pelo menos 20 cm do terreno.
      const maxLengthAboveGround = Math.max(0, (top - .2) / VINE_GEOMETRY_VERTICAL_SPAN);
      const len = Math.min(rawLength, maxLengthAboveGround);
      const rot = rnd() * 6.28;
      if (len > 0 && vineFits(x, z)) vines.push({ x, z, top, len, rot });
    }
  }
  if (zone) for (let i = 0; i < (lowSpec ? 280 : 560) && leaves.length < maxL; i++) { const x = zone.x0 + rnd() * (zone.x1 - zone.x0), z = zone.z0 + rnd() * (zone.z1 - zone.z0); if (isFree(x, z)) leaves.push({ x, z, s: .8 + rnd() * .9, rot: rnd() * 6.28 }); }
  return { leaves, vines };
}
export function buildTropical(THREE, o) {
  const { scene, groundHeightAt, addWind, registerCull, lowSpec } = o, plan = planTropical(o), d = new THREE.Object3D(), group = new THREE.Group();
  group.name = 'eldoria-tropical-mod291'; scene.add(group);
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  if (addWind) addWind(leafMat, .05, 'clamp(position.y*1.6,0.0,1.0)', .8, 'mod291-broadleaf');
  applyUndergrowthCameraFade(leafMat);
  const leaves = new THREE.InstancedMesh(broadLeafGeometry(THREE), leafMat, Math.max(1, plan.leaves.length));
  plan.leaves.forEach((l, i) => { d.position.set(l.x, groundHeightAt(l.x, l.z) - .02, l.z); d.rotation.set(0, l.rot, 0); d.scale.setScalar(l.s); d.updateMatrix(); leaves.setMatrixAt(i, d.matrix); });
  leaves.count = plan.leaves.length; leaves.instanceMatrix.needsUpdate = true; leaves.receiveShadow = true; leaves.name = 'eldoria-broadleaf'; group.add(leaves);
  const vineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide });
  if (addWind) addWind(vineMat, .12, 'clamp(1.0-position.y,0.0,1.0)', .6, 'mod291-vine');
  const vines = new THREE.InstancedMesh(vineGeometry(THREE), vineMat, Math.max(1, plan.vines.length));
  plan.vines.forEach((v, i) => { const gy = groundHeightAt(v.x, v.z); d.position.set(v.x, gy + v.top - v.len, v.z); d.rotation.set(0, v.rot, 0); d.scale.set(1.4, v.len, 1.4); d.updateMatrix(); vines.setMatrixAt(i, d.matrix); });
  vines.count = plan.vines.length; vines.instanceMatrix.needsUpdate = true; vines.name = 'eldoria-vines'; group.add(vines);
  if (registerCull) { registerCull(leaves, lowSpec ? 40 : 55, 12); registerCull(vines, lowSpec ? 45 : 60, 14); }
  const finiteVines = plan.vines.filter(v => Number.isFinite(v.top) && Number.isFinite(v.len) && v.top > 0 && v.len > 0).length;
  return { group, stats: { leaves: plan.leaves.length, vines: plan.vines.length, finiteVines, invalidVines: plan.vines.length - finiteVines } };
}
