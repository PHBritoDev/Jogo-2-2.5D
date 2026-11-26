/**
 * MOD 375 — peças compartilhadas da abertura (marcha + Campo da Última Guerra):
 *  • silhouetteMaterial: sombra quase preta + recorte direcional discreto; opcionalmente DISSOLVE (derrota sem sangue:
 *    o corpo se desfaz em brasas pela borda de um ruído 3D fixo no corpo).
 *  • treadmill: remove o avanço do quadril de um clipe e devolve a velocidade nativa medida.
 *  • Olhos: assinaturas poucas e distintas, finas e de baixa intensidade (fenda curta, núcleo pequeno, olho único, fissura).
 *    Nada de boca, dentes, lábios ou sangue.
 *  • IK de dois ossos (braço/antebraço/mão) para as poses de CARREGAR as armas fictícias de cada antagonista.
 * Todos os objetos criados aqui são registrados em `keep` para o descarte da cena.
 */
export const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
export const PLANE_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
export const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Silhueta: quase preta + recorte (2º acento) pela borda, só do lado de uRimDir. dissolve: uDis 0..1 com borda de brasa. */
export function silhouetteMaterial(T, rimHex, rimDir = [0, 1], k = 1, { dissolve = false, color = 0x030304 } = {}) {
  const m = new T.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
  const rim = new T.Color(rimHex), dir = new T.Vector2(rimDir[0], rimDir[1]).normalize();
  m.userData.rim = { value: rim }; m.userData.rimK = { value: k }; m.userData.dir = { value: dir }; m.userData.dis = { value: 0 };
  m.onBeforeCompile = s => {
    s.uniforms.uRim = m.userData.rim; s.uniforms.uRimK = m.userData.rimK; s.uniforms.uRimDir = m.userData.dir; s.uniforms.uDis = m.userData.dis;
    if (dissolve) s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDisP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDisP=position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform vec2 uRimDir; uniform float uDis;' + (dissolve ? `\nvarying vec3 vDisP;
float dh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float dn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(dh(i),dh(i+vec3(1,0,0)),f.x),mix(dh(i+vec3(0,1,0)),dh(i+vec3(1,1,0)),f.x),f.y),mix(mix(dh(i+vec3(0,0,1)),dh(i+vec3(1,0,1)),f.x),mix(dh(i+vec3(0,1,1)),dh(i+vec3(1,1,1)),f.x),f.y),f.z);}` : ''))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 vv=normalize(vViewPosition); float fr=1.-clamp(abs(dot(normal,vv)),0.,1.); float side=smoothstep(.15,.95,dot(normalize(normal.xy+1e-4),uRimDir)*.5+.5);
        totalEmissiveRadiance+=uRim*uRimK*pow(fr,5.)*side; }` + (dissolve ? `
      if(uDis>0.){ float dn3=dn(vDisP*9.)*.65+dn(vDisP*23.)*.35; float th=uDis*1.15-.08; if(dn3<th) discard; float e=1.-smoothstep(0.,.07,dn3-th); totalEmissiveRadiance+=vec3(1.,.36,.08)*e*2.2*step(.001,uDis); }` : ''));
  };
  m.customProgramCacheKey = () => 'lc-sil' + (dissolve ? '-d' : '');
  return m;
}

/** Remove o avanço horizontal do quadril do clipe (esteira) e devolve a velocidade NATIVA medida (m/s no mundo). */
export function treadmill(T, clip, root, hips) {
  const tr = clip.tracks.find(t => t.name === hips.name + '.position'); if (!tr) return 0;
  const mixer = new T.AnimationMixer(root), a = mixer.clipAction(clip); a.play();
  const p0 = new T.Vector3(), p1 = new T.Vector3(); mixer.setTime(0); root.updateMatrixWorld(true); hips.getWorldPosition(p0);
  mixer.setTime(clip.duration - 1e-3); root.updateMatrixWorld(true); hips.getWorldPosition(p1); mixer.stopAllAction(); mixer.uncacheRoot(root);
  const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  return Math.hypot(p1.x - p0.x, p1.z - p0.z) / clip.duration;
}

/* ---------------- olhos ---------------- */
// uShape: 0 fenda curta horizontal · 1 núcleo pequeno · 2 olho único concentrado (amêndoa) · 3 fissura estreita.
// Núcleo nítido e halo CURTO: lê no celular sem virar barra, feixe ou LED.
const EYE_F = `uniform float uShape,uT,uSeed,uI,uPulse,uCurve; varying vec2 vUv;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){ vec2 p=vUv*2.-1.; float t=uT+uSeed*7.; float core=0., halo=0.;
 if(uShape<.5){ float y=p.y-uCurve*(p.x*p.x-.4); float w=.16*(1.-p.x*p.x)+.02; float d=max(abs(y)-w*.35,abs(p.x)-.92); core=1.-smoothstep(0.,.07,d); halo=exp(-max(d,0.)*9.)*.22; }
 else if(uShape<1.5){ float r=length(p); core=1.-smoothstep(.16,.3,r); halo=exp(-r*6.)*.2; }
 else if(uShape<2.5){ float lid=.42*(1.-p.x*p.x); float d=max(abs(p.y)-lid,abs(p.x)-.95); float r=length(p*vec2(1.,1.5)); core=(1.-smoothstep(0.,.06,d))*.55+(1.-smoothstep(.12,.26,r))*.9; halo=exp(-max(d,0.)*10.)*.16; }
 else { float d=seg(p,vec2(-.12,-.85),vec2(.1,.85))-.05*(1.-p.y*p.y); core=1.-smoothstep(0.,.06,d); halo=exp(-max(d,0.)*10.)*.15; }
 float pulse=1.+uPulse*(.18*sin(t*2.1)+.07*sin(t*5.3+1.1));
 vec3 c=vec3(1.,.03,.05)*(core*1.25+halo)+vec3(1.,.5,.42)*core*core*.45; c*=pulse*uI;
 float a=clamp(core+halo,0.,1.)*uI; if(a<.01) discard; gl_FragColor=vec4(c*a,a); }`;
/** Assinaturas: poucas, distintas, assimétricas. Dimensões em múltiplos do `size` facial do personagem. */
export const EYES = {
  ganancia: [{ shape: 0, side: -1, dy: .0016, w: 1.2, h: .34, curve: .1, i: .85 }, { shape: 0, side: 1, dy: -.0008, w: .95, h: .3, curve: -.06, i: .7, tilt: .12 }],
  bispo1: [{ shape: 2, side: 1, w: .78, h: .5, i: .95 }],                                        // um só olho carmesim concentrado; o outro apagado
  bispo2: [{ shape: 3, side: -1, w: .34, h: .86, i: .42, tilt: .3 }],                           // fissura estreita, fraca
  bispo3: [{ shape: 1, side: -1, w: .42, h: .42, i: .9, pulse: 1 }, { shape: 1, side: 1, w: .36, h: .36, i: .72, pulse: 1 }], // núcleos pequenos, pulso sutil
  bispo4: []                                                                                    // olhos escuros
};
/** Posição do rosto (fração da altura): separação, altura, frente e tamanho do olho. Medidas no QA de 374 (headfront). */
export const FACE = {
  ganancia: { sep: .0135, up: .018, fwd: .006, size: .03 }, bispo1: { sep: .0135, up: .012, fwd: .012, size: .024 },
  bispo2: { sep: .017, up: .008, fwd: .012, size: .03 }, bispo3: { sep: .015, up: .012, fwd: .022, size: .03 }, bispo4: { sep: .016, up: .014, fwd: .016, size: .034 }
};
export function dressEyes(T, a, keep, geo) {
  const F = FACE[a.def.id], sig = EYES[a.def.id], head = a.bones.Head, hf = a.bones.headfront; a.eyes = []; if (!F || !sig || !head) return;
  a.model.updateMatrixWorld(true); const hp = head.getWorldPosition(new T.Vector3()), fp = (hf || head).getWorldPosition(new T.Vector3());
  const fwd = new T.Vector3().subVectors(fp, hp).setY(0); if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
  const right = new T.Vector3(fwd.z, 0, -fwd.x), up = new T.Vector3(0, 1, 0), H = a.H, hs = head.getWorldScale(new T.Vector3()).x;
  for (const e of sig) {
    const wp = fp.clone().addScaledVector(right, e.side * F.sep * H).addScaledVector(up, (F.up + (e.dy || 0)) * H).addScaledVector(fwd, F.fwd * H);
    const m = keep(new T.ShaderMaterial({ uniforms: { uShape: { value: e.shape }, uT: { value: 0 }, uSeed: { value: e.side * 1.7 + a.def.x }, uI: { value: e.i }, uPulse: { value: e.pulse || 0 }, uCurve: { value: e.curve || 0 } },
      vertexShader: PLANE_V, fragmentShader: EYE_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    const o = new T.Mesh(geo, m); o.renderOrder = 12; head.worldToLocal(o.position.copy(wp));
    const hq = head.getWorldQuaternion(new T.Quaternion()).invert(), look = new T.Matrix4().lookAt(wp.clone().add(fwd), wp, up);
    o.quaternion.copy(hq).multiply(new T.Quaternion().setFromRotationMatrix(look)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), (e.tilt || 0) * e.side));
    o.scale.set(F.size * H * e.w / hs, F.size * H * e.h / hs, 1); head.add(o); a.eyes.push(o);
  }
}

/* ---------------- IK de dois ossos ---------------- */
let K = null; // rascunho fixo (nenhuma alocação por quadro)
function scratch(T) { if (!K) K = { v: Array.from({ length: 10 }, () => new T.Vector3()), q: Array.from({ length: 6 }, () => new T.Quaternion()) }; return K; }
/** Leva a MÃO (origem do osso) até `target`, com o cotovelo para o lado de `pole` (direção de mundo); depois orienta a mão
    para `handQ` (mundo), se dado. Só gira os ossos; comprimento e hierarquia ficam intactos. `weight` mistura com a pose animada. */
export function twoBoneIK(T, upper, lower, hand, target, pole, handQ = null, weight = 1) {
  if (weight <= 0) return; const { v, q } = scratch(T), [S, E, W, d, e2, tmp, dir, perp] = v, [qa, qb, qc, r, wq, pq] = q;
  qa.copy(upper.quaternion); qb.copy(lower.quaternion); qc.copy(hand.quaternion);
  upper.updateWorldMatrix(true, true); upper.getWorldPosition(S); lower.getWorldPosition(E); hand.getWorldPosition(W);
  const a = S.distanceTo(E), b = E.distanceTo(W), c = clamp(S.distanceTo(target), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  dir.subVectors(target, S).normalize(); perp.copy(pole).addScaledVector(dir, -pole.dot(dir)); if (perp.lengthSq() < 1e-8) perp.set(0, -1, 0).addScaledVector(dir, dir.y); perp.normalize();
  const cosA = clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  e2.copy(S).addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA); // cotovelo desejado
  const turn = (bone, from, to) => { r.setFromUnitVectors(from, to); bone.getWorldQuaternion(wq); bone.parent.getWorldQuaternion(pq); bone.quaternion.copy(pq.invert().multiply(r.multiply(wq))); };
  turn(upper, d.subVectors(E, S).normalize(), tmp.subVectors(e2, S).normalize());
  lower.updateWorldMatrix(true, true); lower.getWorldPosition(E); hand.getWorldPosition(W);
  turn(lower, d.subVectors(W, E).normalize(), tmp.subVectors(target, E).normalize());
  if (handQ) { hand.updateWorldMatrix(true, false); hand.parent.getWorldQuaternion(pq); hand.quaternion.copy(pq.invert().multiply(r.copy(handQ))); }
  if (weight < 1) { upper.quaternion.copy(qa.slerp(upper.quaternion, weight)); lower.quaternion.copy(qb.slerp(lower.quaternion, weight)); hand.quaternion.copy(qc.slerp(hand.quaternion, weight)); }
  upper.updateWorldMatrix(false, true);
}

/* ---------------- poses de carregar (marcha) ---------------- */
/** Referencial do corpo medido nos ombros reais: Rt = direita do personagem, F = frente, U = cima. */
export function bodyFrame(T, a, out) {
  const b = a.bones; b.LeftUpperArm.getWorldPosition(out.LS); b.RightUpperArm.getWorldPosition(out.RS);
  out.Rt.subVectors(out.RS, out.LS).setY(0).normalize(); out.U.set(0, 1, 0); out.F.crossVectors(out.U, out.Rt); out.Lt.copy(out.Rt).multiplyScalar(-1);
  (b.Neck || b.Head).getWorldPosition(out.N); (b.UpperChest || b.Chest || b.Spine).getWorldPosition(out.C); b.Hips.getWorldPosition(out.P); return out;
}
/** Quaternion da arma a partir do cabo (Y local → H) e da direção da lâmina (X local → B, ortogonalizada). */
export function weaponQuat(T, H, B, out, tx, tz, m) { tx.copy(B).addScaledVector(H, -B.dot(H)).normalize(); tz.crossVectors(tx, H); return out.setFromRotationMatrix(m.makeBasis(tx, H, tz)); }
/* ---------------- armas fictícias (as do jogo, em silhueta) ---------------- */
export function weaponBuilders(T, base) {
  const imp = (f, fn) => () => import(new URL(f, base).href).then(m => m[fn](T));
  return { greedA: imp('./greed-weapons3d.js?v=mod342', 'buildCosmicScythe'), greedB: imp('./greed-weapons3d.js?v=mod342', 'buildBloodScythe'), throne: imp('./vhazrael-vfx3d.js', 'buildThroneBlade'),
    axe: imp('./vorgazhek-axe3d.js?v=mod331', 'buildAbyssAxe'), scythe: imp('./zarkhael-scythe3d.js?v=mod332', 'buildExecutionerScythe') };
}
/* empunhaduras medidas no jogo (zarkhael-squad3d.js zkGrip, vorgazhek3d.js vgGrip e greed-runtime3d.js) */
export function grips(T) {
  const basis = (x, y, z) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(...x), new T.Vector3(...y), new T.Vector3(...z)));
  return { greedA: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), greedB: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), scythe: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]), axe: basis([0, 1, 0], [0, 0, -1], [-1, 0, 0]) };
}
/** Silhueta da arma: metal vira sombra com recorte; acentos luminosos viram um tom fosco do próprio acento (identidade
    sem neon); chamas/energia/halos (shader, aditivos) somem. Escala pela extensão no eixo do cabo (Y). */
export function silhouetteWeapon(T, w, key, a, keep) {
  const wm = keep(silhouetteMaterial(T, a.def.rim, a.def.rimDir, .55)); const acc = new Map();
  w.traverse(o => {
    if (!(o.isMesh || o.isLine || o.isPoints)) return; keep(o.geometry); o.frustumCulled = false;
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    // some só o que é FX (aditivo/transparente: chamas, energia, halos); corpo e bisel das lâminas (shader opaco) viram sombra
    if (!o.isMesh || /LaminaEnergia|Nucleo|Halo/.test(o.name) || (m0 && (m0.blending === T.AdditiveBlending || m0.transparent))) { o.visible = false; return; }
    if (m0 && m0.isMeshBasicMaterial) { const hx = m0.color.getHex(); if (!acc.has(hx)) { const c = new T.Color(hx), l = c.r * .3 + c.g * .55 + c.b * .15; c.lerp(new T.Color(l, l, l), .45).multiplyScalar((/greed/.test(key) ? .16 : .09) * (l > .6 ? .45 : 1)); acc.set(hx, keep(new T.MeshBasicMaterial({ color: c, toneMapped: false }))); } o.material = acc.get(hx); } // acento fosco: identidade sem LED
    else o.material = wm;
  });
  if (w.userData.fx) w.userData.fx.visible = false;
  const bb = new T.Box3().setFromObject(w), ext = bb.max.y - bb.min.y, want = { greedA: 1.0, greedB: 1.0, scythe: 1.06, axe: .64, throne: .62 }[key] || .8;
  const s = (a.H * want) / Math.max(.01, key === 'throne' ? Math.max(...bb.getSize(new T.Vector3()).toArray()) : ext); w.scale.setScalar(s);
  return { mat: wm, s, bb, tip: w.userData.tip ? w.userData.tip.clone() : key === 'scythe' ? new T.Vector3(1.23, .94, 0) : new T.Vector3(0, bb.max.y, 0) };
}
