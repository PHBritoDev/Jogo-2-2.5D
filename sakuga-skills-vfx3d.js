import { softParticles, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
import { createSakugaImpacts } from './sakuga-impact3d.js';
import { SPHERE, CELESTIAL } from './sakuga-skills3d.js';
/**
 * VFX sakuga dos três poderes do herói (flag ?vfxSakuga=1). Só lê o estado da lógica; nada aqui decide dano.
 *
 *  • Impacto Cruzado (Ruptura em X): duas lâminas EXTRUDADAS com espessura, ponta e serrilhas assimétricas, núcleo
 *    #FFFFFF, carmim #D90027, borda #5A0018 e manchas negras por erosão fBm; duas fitas helicoidais cruzando o centro,
 *    arcos elétricos vermelhos e linhas de velocidade radiais; no contato, X que se abre e impacto sakuga com sulco
 *    no vetor do golpe. (O "impact frame" de 0,15 s é uma camada de tela do jogo, abaixo do HUD.)
 *  • Esfera da Destruição: três volumes — centro #FFE4FC, casca #B90019 com manchas negras orgânicas #0B000B
 *    advectadas, borda Fresnel #FC1FD8 — e raios negros em zigue-zague com halo magenta; pedrinhas sobem na mão
 *    erguida; no contato, contração de ~3 quadros e cúpula rubro-negra com fendas e detritos.
 *  • Explosão Celestial: estrelas de quatro pontas (verde #78FFB8, ouro #FFD86A, azul #7BC8FF, rosa #FF8ADD) em espiral
 *    para a ponta da arma; 4 círculos mágicos ORIGINAIS escalonados (laranja #FF7B24 / magenta #E32DCE, triângulos,
 *    hélices e marcas rúnicas procedurais) com correntes orbitais inclinadas; pilar colossal (branco #FFFFFF, dourado
 *    #FFC62E, vermelho #C93228), cúpula de pressão branco-azulada, anéis de choque no ar e no chão, cratera e detritos.
 * Shaders compatíveis com WebGL1; tudo alocado uma vez; cada efeito fica bem abaixo de 120 chamadas de desenho.
 */
const NOISE = `float hs(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float ns(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return ns(p)*.5+ns(p*2.1)*.3+ns(p*4.3)*.2;}`;
const LIT_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const add = T => ({ transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: T.AdditiveBlending });
const c3 = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/* ===================== Impacto Cruzado (Ruptura em X) ===================== */
const XBLADE_FRAG = `${NOISE} uniform float time, alpha, erode, seed; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
void main(){ float n=fbm(vec3(vUv*vec2(3.,7.)+seed,time*.8)); float y=abs(vUv.y)/.32; float rag=fbm(vec3(vUv.x*14.-time*6.,vUv.y*9.,seed));
 if(n<erode || y>.62+rag*.55) discard;                                    // borda de fogo rasgada e viva
 float edge=1.-smoothstep(erode,erode+.07,n)+smoothstep(.45,.9,y)*.6; float core=exp(-y*y*9.)*(1.-abs(vUv.x)*.4); float f=pow(1.-abs(dot(normalize(vN),vV)),2.);
 vec3 c=mix(vec3(.851,0.,.153),vec3(1.),core); c=mix(c,vec3(.353,0.,.094),smoothstep(.55,1.,y)+f*.5);
 float blotch=smoothstep(.62,.72,fbm(vec3(vUv*vec2(5.,9.)-seed,time*1.6))); c=mix(c,vec3(.02,0.,.01),blotch*.85*(1.-core));
 c+=vec3(1.,.25,.3)*edge*1.5; gl_FragColor=vec4(c*alpha,alpha); }`;
function bladeShape(T) { // lâmina assimétrica: dorso reto-curvo, gume serrilhado irregular, ponta longa
  const s = new T.Shape(); s.moveTo(-1, 0);
  const top = [[-.7, .1], [-.45, .19], [-.2, .24], [.1, .25], [.4, .21], [.7, .12], [.93, .04]];
  for (const [x, y] of top) s.lineTo(x, y);
  s.lineTo(1.08, 0);
  const saw = [[.86, -.06], [.8, -.12], [.66, -.1], [.6, -.2], [.44, -.15], [.36, -.26], [.18, -.2], [.08, -.29], [-.12, -.22], [-.2, -.27], [-.42, -.18], [-.5, -.22], [-.72, -.12], [-.86, -.08]];
  for (const [x, y] of saw) s.lineTo(x, y);
  s.lineTo(-1, 0);
  const g = new T.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .05, bevelSize: .035, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -.05);
  // empurra o meio para trás (lâmina arqueada) para ter leitura 3D em qualquer ângulo
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) - x * x * .28); } g.computeVertexNormals(); return g;
}
export function createSakugaXVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'ImpactoCruzado'; root.visible = false; scene.add(root);
  const geo = bladeShape(T), mats = [0, 1, 2, 3].map(i => new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: XBLADE_FRAG, side: T.DoubleSide, ...add(T), blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, uniforms: { time: { value: 0 }, alpha: { value: 1 }, erode: { value: 0 }, seed: { value: i * 3.7 } } }));
  const X = new T.Group(), cut = new T.Group(); root.add(X, cut);
  const blades = [0, 1].map(i => { const m = new T.Mesh(geo, mats[i]); m.rotation.z = i ? -.72 : .72; m.frustumCulled = false; X.add(m); return m; });
  const cuts = [2, 3].map(i => { const m = new T.Mesh(geo, mats[i]); m.rotation.z = i === 3 ? -.72 : .72; m.frustumCulled = false; cut.add(m); return m; });
  const glow = softParticles(T, 220), rib = ribbons(T, 700, { flow: 26 }); root.add(glow.mesh, rib.mesh);
  const sak = createSakugaImpacts(T, scene, { ground, capacity: 3 });
  const F = new T.Vector3(), Sd = new T.Vector3(), U = new T.Vector3(), UP = new T.Vector3(0, 1, 0), M = new T.Matrix4(), V = new T.Vector3(), bolt = Array.from({ length: 24 }, () => [0, 0, 0, 0, 0, 0, 0]);
  const RED = [1, .1, .18], CAR = [.85, 0, .15], WH = [1, .96, .95], c4 = (c, a) => [c[0], c[1], c[2], a];
  let last = -1;
  function frame(obj, dx, dz) { F.set(dx, 0, dz).normalize(); Sd.crossVectors(UP, F).normalize(); U.crossVectors(F, Sd); M.makeBasis(Sd, U, F); obj.quaternion.setFromRotationMatrix(M); }
  const bladeAt = (k, local) => V.copy(local).applyQuaternion(X.quaternion).add(X.position);
  function update(s, camera, quality = 1) {
    if (!s.active && (s.hitAtTime < 0 || s.time - s.hitAtTime > 2.6)) { root.visible = false; if (last >= 0) { sak.clear(); last = -1; } return; }
    root.visible = true; const t = s.time, A = s.age, ph = s.phase, low = quality === 0; if (t < last) sak.clear(); last = t;
    for (const m of mats) m.uniforms.time.value = t;
    glow.begin(); rib.begin(camera, t);
    X.visible = s.active && (ph === 'cast' || ph === 'travel' || (ph === 'fade' && A < .5)); X.position.set(s.p.x, s.p.y, s.p.z); frame(X, s.dir.x, s.dir.z);
    const grow = ph === 'cast' ? easeOut(Math.min(1, A / .65)) : 1, fade = ph === 'fade' ? 1 - A / .5 : 1;
    blades.forEach((b, i) => { const g = ph === 'cast' ? easeOut(Math.min(1, (A - i * .12) / .55)) : 1; b.scale.set(3.1 * Math.max(.05, g), 2.6, 2.4); b.material.uniforms.alpha.value = fade; b.material.uniforms.erode.value = ph === 'fade' ? A / .5 * .9 : 0; });
    if (X.visible) {
      // duas fitas helicoidais cruzando o centro ao longo do voo + arcos elétricos vermelhos
      for (const sgn of [-1, 1]) for (let j = 0; j < 14; j++) { const u0 = j / 14, u1 = (j + 1) / 14, a0 = sgn * (u0 * 9 + t * 14), a1 = sgn * (u1 * 9 + t * 14), r0 = 1.5 * (1 - u0 * .6) * grow, r1 = 1.5 * (1 - u1 * .6) * grow;
        const p0 = V.set(Math.cos(a0) * r0, Math.sin(a0) * r0, -u0 * 3.4).applyQuaternion(X.quaternion).add(X.position).clone(), p1 = V.set(Math.cos(a1) * r1, Math.sin(a1) * r1, -u1 * 3.4).applyQuaternion(X.quaternion).add(X.position);
        rib.seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, .13 * (1 - u0) * fade, .13 * (1 - u1) * fade, c4(sgn > 0 ? WH : RED, (1 - u0) * fade), c4(CAR, (1 - u1) * fade), u0, u1); }
      if (!low) for (let i = 0; i < 3; i++) { const a = i * 2.1 + t * 9, p0 = bladeAt(0, new T.Vector3(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0)).clone(), p1 = bladeAt(0, new T.Vector3(Math.cos(a + 1.3) * 1.2, Math.sin(a + 1.3) * 1.2, -.6)); const n = lightningBolt(Math.floor(t * 30) + i * 7, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, bolt, { depth: 1, jag: .35 }); for (let k = 0; k < n; k++) { const b = bolt[k]; rib.seg(b[0], b[1], b[2], b[3], b[4], b[5], .05 * b[6], .04 * b[6], c4(RED, fade), c4(WH, fade * .7)); } }
      glow.add(s.p.x, s.p.y, s.p.z, 2.6, 2.6, 1, .15, .25, .5 * fade, 0); glow.add(s.p.x, s.p.y, s.p.z, 3.4 * grow, 3.4 * grow, 1, .97, .95, .95 * fade, 2, t * .5); glow.add(s.p.x, s.p.y, s.p.z, .9, .9, 1, 1, 1, fade, 0); // clarão de 4 pontas no cruzamento
      if (!low) for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + hash(i) * .4, r0 = .6 + hash(i * 5) * 1.6, back = 1.5 + hash(i * 7) * 3.5; const p0 = V.set(Math.cos(a) * r0, Math.sin(a) * r0, -.4).applyQuaternion(X.quaternion).add(X.position).clone(), p1 = V.set(Math.cos(a) * r0 * 1.15, Math.sin(a) * r0 * 1.15, -.4 - back).applyQuaternion(X.quaternion).add(X.position); rib.seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, .05, .01, c4(i % 3 ? RED : WH, .85 * fade), c4(CAR, 0)); } // rastros de velocidade
    }
    // linhas de velocidade radiais: no cast (convergem) e no impacto (estouram)
    const hitAge = s.hitAtTime >= 0 ? t - s.hitAtTime : -1, speedK = ph === 'cast' ? 1 - A / .75 : hitAge >= 0 && hitAge < .25 ? 1 - hitAge / .25 : 0;
    if (hitAge >= 0 && hitAge < .15) glow.add(s.at.x, s.at.y, s.at.z, 7 * (1 - hitAge / .15) + 1, 7 * (1 - hitAge / .15) + 1, 1, .95, .95, 1, 2, .3); // clarão branco do impacto
    if (speedK > 0) { const P = ph === 'cast' ? s.p : s.at; for (let i = 0; i < (low ? 14 : 36); i++) { const a = i / 36 * 6.283 + hash(i) * .3, r0 = ph === 'cast' ? 1 + speedK * 2.5 : .8 + (1 - speedK) * 3, r1 = r0 + 1.6 + hash(i * 3) * 1.6;
      const p0 = V.set(Math.cos(a) * r0, Math.sin(a) * r0, 0).applyQuaternion(X.quaternion).add(P).clone(), p1 = V.set(Math.cos(a) * r1, Math.sin(a) * r1, 0).applyQuaternion(X.quaternion).add(P); rib.seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, .03, .005, c4(WH, speedK), c4(RED, 0)); } }
    // impacto: X que se abre no ponto de contato, erosão com borda acesa, e impacto sakuga com sulco no vetor do golpe
    cut.visible = hitAge >= 0 && hitAge < .8;
    if (cut.visible) { const k = easeOut(Math.min(1, hitAge / .1)), sc = s.phase === 'wall' ? .75 : 1; cut.position.set(s.at.x, s.at.y, s.at.z); frame(cut, s.dir.x, s.dir.z);
      cuts.forEach(c => { c.scale.set(3.2 * sc * (.3 + .9 * k), 2.8 * sc * (1 + hitAge), 2.8 * sc); c.material.uniforms.alpha.value = 1 - smooth((hitAge - .25) / .55); c.material.uniforms.erode.value = smooth((hitAge - .1) / .6) * .95; });
      sak.emit({ id: 'x' + s.hitAtTime, time: s.hitAtTime, point: s.at, dir: s.dir, size: 2.4 * sc, palette: 'crimson', rocks: 12, furrow: 3 }); }
    sak.update(t, camera, quality); glow.end(); rib.end();
  }
  return { root, update, clear() { root.visible = false; sak.clear(); last = -1; }, dispose() { scene.remove(root); sak.dispose(); geo.dispose(); for (const m of mats) m.dispose(); glow.dispose(); rib.dispose(); } };
}

/* ===================== Esfera da Destruição ===================== */
const SHELL_FRAG = `${NOISE} uniform float time, alpha; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
vec3 h3(vec3 p){return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453);}
float cell(vec3 p){vec3 g=floor(p),f=fract(p);float m1=8.,m2=8.;for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec3 o=vec3(i,j,k),r=o+h3(g+o)-f;float d=dot(r,r);if(d<m1){m2=m1;m1=d;}else if(d<m2)m2=d;}return sqrt(m2)-sqrt(m1);}
void main(){ vec3 n=normalize(vP); vec3 q=n*2.4; float flow=fbm(q+vec3(time*.5,-time*.35,time*.25));
 float e=cell(n*2.1+vec3(flow*.35)); float crack=1.-smoothstep(.02,.07,e); float halo=(1.-smoothstep(.06,.24,e))*(1.-crack);
 float blot=smoothstep(.5,.7,fbm(q*1.8+vec3(0.,time*.8,0.)+flow)); float f=1.-abs(dot(normalize(vN),vV)); float center=pow(1.-f,4.);
 vec3 c=mix(vec3(.88,.05,.12),vec3(.725,0.,.098),flow); c=mix(c,vec3(.25,0.,.03),blot*.75);       // vermelho manchado
 c+=vec3(.988,.122,.847)*center*1.1+vec3(1.,.894,.988)*pow(1.-f,10.)*.8;                          // brilho magenta no centro
 c=mix(c,vec3(.988,.122,.847)*1.3,halo*.5); c=mix(c,vec3(.03,0.,.03),crack);                      // rachaduras negras com halo magenta
 c+=vec3(1.,.15,.35)*pow(f,3.)*.55; gl_FragColor=vec4(c*alpha,alpha); }`;
const RIM_FRAG = `varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),3.); float a=f*alpha; gl_FragColor=vec4(mix(vec3(1.,.08,.12),vec3(.988,.122,.847),f)*a*1.3,a); }`;
const CORE_FRAG = `varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=pow(abs(dot(normalize(vN),vV)),2.); float a=f*alpha; gl_FragColor=vec4(vec3(1.,.894,.988)*a*1.8,a); }`;
export function createSphereVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'EsferaDaDestruicao'; root.visible = false; scene.add(root);
  const sgeo = new T.IcosahedronGeometry(1, 4);
  // casca deformada (irregular, não esfera lisa)
  { const p = sgeo.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + .07 * Math.sin(v.x * 5 + v.y * 3) + .05 * Math.sin(v.z * 7 - v.y * 4); p.setXYZ(i, v.x * k, v.y * k, v.z * k); } sgeo.computeVertexNormals(); }
  const shellMat = new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: SHELL_FRAG, uniforms: { time: { value: 0 }, alpha: { value: 1 } }, transparent: true, depthWrite: true, toneMapped: false, fog: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor });
  const rimMat = new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: RIM_FRAG, uniforms: { alpha: { value: 1 } }, ...add(T) }), coreMat = new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: CORE_FRAG, uniforms: { alpha: { value: 1 } }, ...add(T) });
  const ball = new T.Group(); root.add(ball); const shell = new T.Mesh(sgeo, shellMat), rim = new T.Mesh(sgeo, rimMat), core = new T.Mesh(sgeo, coreMat); rim.scale.setScalar(1.12); core.scale.setScalar(.45); core.renderOrder = 6; ball.add(shell, core, rim);
  const domeMesh = new T.Mesh(sgeo, shellMat.clone()); domeMesh.material.uniforms = { time: { value: 0 }, alpha: { value: 1 } }; root.add(domeMesh);
  const rockGeo = new T.DodecahedronGeometry(1, 0), pebbles = new T.InstancedMesh(rockGeo, new T.MeshStandardMaterial({ color: 0x2a2026, roughness: .9, flatShading: true, emissive: 0x1a0208 }), 18); pebbles.frustumCulled = false; root.add(pebbles);
  const glow = softParticles(T, 160), rib = ribbons(T, 500, { flow: 22 }); root.add(glow.mesh, rib.mesh);
  const DR = 220, dPos = new Float32Array(DR * 12), dIdx = new Uint32Array(DR * 6); for (let i = 0; i < DR; i++) dIdx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const dGeo = new T.BufferGeometry(); dGeo.setAttribute('position', new T.BufferAttribute(dPos, 3).setUsage(T.DynamicDrawUsage)); dGeo.setIndex(new T.BufferAttribute(dIdx, 1));
  const darkBolts = new T.Mesh(dGeo, new T.MeshBasicMaterial({ color: 0x050004, side: T.DoubleSide, depthWrite: false, transparent: true, opacity: .95 })); darkBolts.frustumCulled = false; root.add(darkBolts);
  const sak = createSakugaImpacts(T, scene, { ground, capacity: 3 });
  const bolt = Array.from({ length: 24 }, () => [0, 0, 0, 0, 0, 0, 0]), M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), eye = new T.Vector3(), d = new T.Vector3(), w = new T.Vector3();
  const hist = Array.from({ length: 18 }, () => ({ x: 0, y: 0, z: 0, t: -9 })); let hi = 0, last = -1, dq = 0;
  const MAG = [.99, .12, .85], c4 = (c, a) => [c[0], c[1], c[2], a];
  function dseg(ax, ay, az, bx, by, bz, wd) { if (dq >= DR) return; d.set(bx - ax, by - ay, bz - az); w.set(ax - eye.x, ay - eye.y, az - eye.z); d.cross(w).normalize().multiplyScalar(wd); const o = dq * 12; dPos.set([ax - d.x, ay - d.y, az - d.z, ax + d.x, ay + d.y, az + d.z, bx - d.x, by - d.y, bz - d.z, bx + d.x, by + d.y, bz + d.z], o); dq++; }
  function update(s, camera, quality = 1) {
    if (!s.active) { if (last >= 0) { root.visible = false; sak.clear(); last = -1; } return; }
    root.visible = true; const t = s.time, A = s.age, ph = s.phase, low = quality === 0; if (t < last) sak.clear(); last = t; eye.copy(camera.position); dq = 0;
    shellMat.uniforms.time.value = t; glow.begin(); rib.begin(camera, t);
    const charge = ph === 'raise' ? .15 * A / SPHERE.raise : ph === 'charge' ? .15 + .85 * easeOut(A / SPHERE.charge) : 1, r = SPHERE.r * 1.45 * charge; // grande, acima da mão erguida
    ball.visible = ph === 'raise' || ph === 'charge' || ph === 'fly' || ph === 'contract'; ball.position.set(s.p.x, s.p.y, s.p.z);
    const squash = ph === 'contract' ? 1 - .45 * Math.sin(Math.min(1, A / SPHERE.contract) * Math.PI / 2) : 1; ball.scale.setScalar(r * squash); ball.rotation.y += .05; ball.rotation.x += .03;
    // pedrinhas sobem do chão com a mão erguida e orbitam até a esfera
    let pn = 0; if (ph === 'raise' || ph === 'charge') { const src = s.source; for (let i = 0; i < (low ? 8 : 14); i++) { const k = Math.min(1, (ph === 'raise' ? A / SPHERE.raise : 1) * 1.2 - hash(i) * .2), a = i * 2.4 + t * 3, rr = (1.4 - k) * (1 + hash(i * 3)), y = src.y + .1 + k * (SPHERE.lift - .2) * (ph === 'charge' ? 1 : .8);
      P.set(src.x + Math.cos(a) * rr, y, src.z + Math.sin(a) * rr); if (ph === 'charge') P.lerp(s.p, easeOut(A / SPHERE.charge)); Q.setFromEuler(E.set(t * 3 + i, t * 2, i)); S.setScalar(.05 + hash(i * 7) * .06); M.compose(P, Q, S); pebbles.setMatrixAt(pn++, M); } }
    pebbles.count = pn; pebbles.instanceMatrix.needsUpdate = true;
    if (ball.visible) {
      shellMat.uniforms.alpha.value = 1; rimMat.uniforms.alpha.value = 1; coreMat.uniforms.alpha.value = 1;
      // raios negros em zigue-zague com halo magenta (núcleo preto largo + halo aditivo mais largo)
      const nb = low ? 2 : 4; for (let i = 0; i < nb; i++) { const a = (Math.floor(t * 16) + i * 3.1) * 1.7, b = a + 1.6 + hash(i + Math.floor(t * 16)), R0 = r * 1.05, R1 = r * (1.8 + hash(i) * .8);
        const n = lightningBolt(Math.floor(t * 16) * 5 + i, s.p.x + Math.cos(a) * R0, s.p.y + Math.sin(a * 1.3) * R0, s.p.z + Math.sin(a) * R0, s.p.x + Math.cos(b) * R1, s.p.y + Math.sin(b * .7) * R1, s.p.z + Math.sin(b) * R1, bolt, { depth: 1, jag: .5, branches: .5 });
        for (let k = 0; k < n; k++) { const q = bolt[k]; rib.seg(q[0], q[1], q[2], q[3], q[4], q[5], .14 * q[6], .1 * q[6], c4(MAG, .9), c4(MAG, .6)); dseg(q[0], q[1], q[2], q[3], q[4], q[5], .045 * q[6]); } }
      if (ph === 'fly') { hi = (hi + 1) % hist.length; Object.assign(hist[hi], { x: s.p.x, y: s.p.y, z: s.p.z, t }); }
      for (let k = 0; k < hist.length - 1; k++) { const a = hist[(hi - k + hist.length) % hist.length], b = hist[(hi - k - 1 + hist.length) % hist.length]; if (b.t < 0 || t - b.t > .28) break; const fa = 1 - (t - a.t) / .28, fb = 1 - (t - b.t) / .28;
        rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, r * 1.2 * fa, r * 1.2 * fb, [.73, 0, .1, fa], [.73, 0, .1, fb * .5]); dseg(a.x, a.y, a.z, b.x, b.y, b.z, r * .35 * fa); }
      glow.add(s.p.x, s.p.y, s.p.z, r * 4.2, r * 4.2, 1, .06, .1, .42, 0); glow.add(s.p.x, s.p.y, s.p.z, r * 2.6, r * 2.6, .99, .12, .6, .35, 0); // aura vermelha + magenta
      if (!low) for (let i = 0; i < 10; i++) { const a = i * 2.39996 + t * 2, el = (hash(i) - .5) * 2, rr = r * (1.15 + hash(i * 3) * .4); glow.add(s.p.x + Math.cos(a) * Math.cos(el) * rr, s.p.y + Math.sin(el) * rr, s.p.z + Math.sin(a) * Math.cos(el) * rr, .12, .12, .05, 0, .05, .9, 0); } // lascas negras soltas
    }
    // contato: cúpula rubro-negra com fendas emissivas e detritos (impacto sakuga)
    domeMesh.visible = ph === 'contract' || ph === 'dome' || ph === 'fade';
    if (domeMesh.visible) { const da = ph === 'contract' ? 0 : ph === 'dome' ? A : SPHERE.domeT + A, k = easeOut(Math.min(1, da / .18)), out = ph === 'fade' ? 1 - A / SPHERE.fade : 1;
      domeMesh.position.set(s.at.x, ground(s.at.x, s.at.z), s.at.z); domeMesh.scale.set(3.2 * k + .2, 2.4 * k + .1, 3.2 * k + .2); domeMesh.material.uniforms.time.value = t * 1.5; domeMesh.material.uniforms.alpha.value = .85 * out;
      if (s.hitAt >= 0) sak.emit({ id: 'sph' + s.hitAt, time: s.hitAt, point: s.at, dir: s.dir, size: 3, palette: 'crimson', rocks: 13, furrow: 1.5 }); }
    dGeo.setDrawRange(0, dq * 6); dGeo.attributes.position.needsUpdate = true;
    sak.update(t, camera, quality); glow.end(); rib.end();
  }
  return { root, update, clear() { root.visible = false; sak.clear(); last = -1; for (const h of hist) h.t = -9; }, dispose() { scene.remove(root); sak.dispose(); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); glow.dispose(); rib.dispose(); } };
}

/* ===================== Explosão Celestial ===================== */
const CIRCLE_FRAG = `varying vec2 vUv; varying vec4 vFx; varying vec3 vCol;
float ring(float d,float r,float w){return exp(-pow((d-r)/w,2.));}
float sg(vec2 p,vec2 a,vec2 b,float w){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return exp(-pow(length(pa-ba*t)/w,2.));}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
void main(){ vec2 p=vUv*2.-1.; float d=length(p); float sp=vFx.z, prog=vFx.y; vec2 q=rot(p,sp); float an=atan(q.y,q.x);
 float L=ring(d,.95,.012)+ring(d,.88,.008)+ring(d,.62,.01)+ring(d,.3,.008);
 float tri=0.; for(int i=0;i<3;i++){float a0=float(i)*2.0944;tri+=sg(q,.88*vec2(cos(a0),sin(a0)),.88*vec2(cos(a0+2.0944),sin(a0+2.0944)),.01);}
 vec2 q2=rot(p,-sp*1.6); float tri2=0.; for(int i=0;i<3;i++){float a0=float(i)*2.0944+1.0472;tri2+=sg(q2,.6*vec2(cos(a0),sin(a0)),.6*vec2(cos(a0+2.0944),sin(a0+2.0944)),.008);}
 float hel=pow(max(0.,sin(an*6.+log(d+.05)*5.)),20.)*smoothstep(.3,.6,d)*smoothstep(.88,.62,d);
 float cell=floor((an+3.1416)*24./6.2832), u=fract((an+3.1416)*24./6.2832), v=(d-.89)/.055;
 float rune=(v>0.&&v<1.)?step(.35,fract(sin(cell*12.9898+vFx.z)*43758.5))*smoothstep(.16,0.,abs(u-.5)-(fract(cell*.37)<.5?.0:.18)):0.;
 float reveal=step(d,prog*1.05);
 float spiral=pow(max(0.,sin(an*5.+log(d+.04)*9.)),6.)*smoothstep(.12,.3,d)*smoothstep(.95,.7,d);   // espirais de fogo (laranja)
 float chain=(ring(d,.985,.016)+ring(d,.955,.016))*step(.35,fract(an*36./6.2832+.25*step(.5,fract(an*18./6.2832))));   // anel de corrente (magenta)
 float st=vFx.w; float a=(L+tri*.9+tri2*.7+hel*.6+rune*.9+spiral*(1.-st)*1.4+chain*st*1.3)*reveal*vFx.x; if(a<.01) discard; gl_FragColor=vec4(vCol*a*2.6,min(1.,a*1.4)); }`;
const CIRCLE_VERT = `attribute vec4 aFx; attribute vec3 aCol; varying vec2 vUv; varying vec4 vFx; varying vec3 vCol; void main(){ vUv=uv; vFx=aFx; vCol=aCol; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`;
const PILLAR_FRAG = `${NOISE} uniform float time, alpha, erode; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
void main(){ float n=fbm(vec3(vUv.x*8.,vUv.y*3.-time*4.,time*.5)); if(n<erode) discard; float f=abs(dot(normalize(vN),vV)); float core=pow(f,4.);
 vec3 c=mix(vec3(.788,.196,.157),vec3(1.,.776,.18),smoothstep(.2,.7,f+n*.3)); c=mix(c,vec3(1.),core); float streak=pow(max(0.,sin(vUv.x*60.+n*6.)),12.)*.6;
 float a=alpha*(.35+.65*f+streak)*smoothstep(1.,.85,vUv.y); gl_FragColor=vec4((c+streak)*a,a); }`;
export function createCelestialVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'ExplosaoCelestial'; root.visible = false; scene.add(root);
  const cg = new T.PlaneGeometry(2, 2); cg.rotateX(-Math.PI / 2); const cfx = new Float32Array(6 * 4), ccol = new Float32Array(6 * 3);
  cg.setAttribute('aFx', new T.InstancedBufferAttribute(cfx, 4).setUsage(T.DynamicDrawUsage)); cg.setAttribute('aCol', new T.InstancedBufferAttribute(ccol, 3).setUsage(T.DynamicDrawUsage));
  const circles = new T.InstancedMesh(cg, new T.ShaderMaterial({ vertexShader: CIRCLE_VERT, fragmentShader: CIRCLE_FRAG, side: T.DoubleSide, ...add(T) }), 6); circles.frustumCulled = false; circles.count = 0; root.add(circles);
  const pg = new T.CylinderGeometry(1, 1.15, 1, 28, 6, true); pg.translate(0, .5, 0);
  const pillarMat = new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: PILLAR_FRAG, uniforms: { time: { value: 0 }, alpha: { value: 1 }, erode: { value: 0 } }, side: T.DoubleSide, ...add(T) });
  const pillar = new T.Mesh(pg, pillarMat), pillarCore = new T.Mesh(pg, pillarMat.clone()); pillarCore.material.uniforms = { time: { value: 0 }, alpha: { value: 1 }, erode: { value: 0 } }; root.add(pillar, pillarCore); pillar.frustumCulled = pillarCore.frustumCulled = false;
  const domeMat = new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=1.-abs(dot(normalize(vN),vV)); float a=(pow(f,2.)*.9+.25)*alpha; gl_FragColor=vec4(mix(vec3(1.,.97,.85),vec3(1.,.72,.2),f)*a*1.5,a); }', uniforms: { alpha: { value: 1 } }, ...add(T) });
  const dome = new T.Mesh(new T.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat); dome.frustumCulled = false; root.add(dome);
  const ringGeo = new T.TorusGeometry(1, .04, 6, 72), ringMat = new T.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), airRings = new T.InstancedMesh(ringGeo, ringMat, 6); airRings.frustumCulled = false; airRings.count = 0; root.add(airRings);
  const waveGeo = new T.CylinderGeometry(1, 1, 1, 64, 1, true); waveGeo.translate(0, .5, 0); const wave = new T.Mesh(waveGeo, new T.ShaderMaterial({ vertexShader: LIT_VERT, fragmentShader: 'varying vec2 vUv; uniform float alpha; void main(){ float a=alpha*(1.-vUv.y)*(.7+.3*sin(vUv.x*120.)); gl_FragColor=vec4(vec3(1.,.82,.4)*a*1.5,a); }', uniforms: { alpha: { value: 1 } }, side: T.DoubleSide, ...add(T) })); wave.frustumCulled = false; root.add(wave);
  const stars = softParticles(T, 220), sparks = softParticles(T, 200), rib = ribbons(T, 420, { flow: 18 }); root.add(stars.mesh, sparks.mesh, rib.mesh);
  const sak = createSakugaImpacts(T, scene, { ground, capacity: 2, maxRocks: 32 });
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler();
  const STAR = [c3(0x78ffb8), c3(0xffd86a), c3(0x7bc8ff), c3(0xff8add)], ORANGE = c3(0xff7b24), MAGENTA = c3(0xe32dce), GOLD = c3(0xffc62e), c4 = (c, a) => [c[0], c[1], c[2], a];
  let last = -1;
  function update(s, camera, quality = 1) {
    if (!s.active) { if (last >= 0) { root.visible = false; sak.clear(); last = -1; } return; }
    root.visible = true; const t = s.time, A = s.age, ph = s.phase, low = quality === 0; if (t < last) sak.clear(); last = t;
    stars.begin(); sparks.begin(); rib.begin(camera, t); circles.count = 0; airRings.count = 0;
    const at = s.at, gy = ground(at.x, at.z);
    if (ph === 'charge') { const k = A / CELESTIAL.charge, tip = s.tip; // estrelas de quatro pontas em espiral até a ponta da arma
      stars.add(tip.x, tip.y, tip.z, .5 + k * 1.2, .5 + k * 1.2, 1, .2, .85, .9, 0);
      for (let i = 0; i < (low ? 24 : 56); i++) { const u = (i / 56 + t * .7) % 1, a = i * 2.39996 + t * 4 + u * 6, r = (1 - u) * 3.2, c = STAR[i % 4]; stars.add(tip.x + Math.cos(a) * r, tip.y - (1 - u) * 1.4 + Math.sin(a * 1.7) * .3, tip.z + Math.sin(a) * r, .22 * (1 - u * .5), .22 * (1 - u * .5), ...c, .9 * u + .1, 2, a, i); }
      for (let h = 0; h < (low ? 3 : 7); h++) { const BLUE = [.2, .35, 1]; let px = 0, py = 0, pz = 0; for (let j = 0; j <= 16; j++) { const u = j / 16, a = h * .9 + u * 5 + t * 3.5, rr = 1.4 + u * 2.2 + Math.sin(h + t) * .3, x = s.source.x + Math.cos(a) * rr, y = s.source.y + .3 + u * 3.6, z = s.source.z + Math.sin(a) * rr; if (j) rib.seg(px, py, pz, x, y, z, .12 * (1 - u * .5), .12 * (1 - u * .5), c4(BLUE, .8 * k), c4([.5, .7, 1], .6 * k)); px = x; py = y; pz = z; } } // faixas azuis em redemoinho
      for (let i = 0; i < 3; i++) { const rr = .9 + i * .35, y = s.source.y + ((k * 2 + i * .33) % 1) * 2.2; for (let j = 0; j < 24; j++) { const a0 = j / 24 * 6.283 + t * 3, a1 = (j + 1) / 24 * 6.283 + t * 3; rib.seg(s.source.x + Math.cos(a0) * rr, y, s.source.z + Math.sin(a0) * rr, s.source.x + Math.cos(a1) * rr, y, s.source.z + Math.sin(a1) * rr, .03, .03, c4(MAGENTA, .7), c4(MAGENTA, .7)); } } }
    const circlesOn = ph === 'circles' || ph === 'pillar' || (ph === 'fade' && A < .4);
    if (circlesOn) { // 4 círculos escalonados sobre o alvo, laranja e magenta alternados, girando em sentidos opostos
      const prog = ph === 'circles' ? A / CELESTIAL.circles : 1, out = ph === 'fade' ? 1 - A / .4 : ph === 'pillar' ? 1 - smooth((A - .9) / .4) : 1;
      for (let i = 0; i < 4; i++) { const y = gy + 2.6 + i * 2.3, R = 4.6 - i * .6, pk = Math.min(1, Math.max(0, prog * 1.6 - i * .2)); P.set(at.x, y, at.z); Q.identity(); S.set(R, 1, R); M.compose(P, Q, S); circles.setMatrixAt(circles.count, M);
        cfx.set([out, easeOut(pk), t * (i % 2 ? -.8 : .6) + i, i % 2], circles.count * 4); ccol.set(i % 2 ? MAGENTA : ORANGE, circles.count * 3); circles.count++; }
      if (!low) for (let c = 0; c < 2; c++) { const tilt = c ? .5 : -.4; for (let j = 0; j < 36; j++) { const a0 = j / 36 * 6.283 + t * (c ? 1.3 : -1.1), a1 = (j + 1) / 36 * 6.283 + t * (c ? 1.3 : -1.1), r = 4.4, y0 = gy + 5 + Math.sin(a0) * r * tilt, y1 = gy + 5 + Math.sin(a1) * r * tilt;
        rib.seg(at.x + Math.cos(a0) * r, y0, at.z + Math.sin(a0) * r * Math.cos(tilt), at.x + Math.cos(a1) * r, y1, at.z + Math.sin(a1) * r * Math.cos(tilt), .05, .05, c4(j % 3 ? ORANGE : GOLD, .8 * out), c4(MAGENTA, .7 * out)); } }
    }
    pillar.visible = pillarCore.visible = ph === 'pillar' || ph === 'fade';
    if (pillar.visible) { const pa = ph === 'pillar' ? A : CELESTIAL.pillar + A, fall = smooth(Math.min(1, pa / CELESTIAL.strike)), out = ph === 'fade' ? 1 - A / CELESTIAL.fade : 1, front = gy + 34 * (1 - fall), H = Math.max(.5, gy + 34 - front), boom = Math.max(0, pa - CELESTIAL.strike), wide = pa < CELESTIAL.strike ? 1.2 : 2.6 + .4 * Math.sin(t * 20); // o feixe desce do céu e só depois engrossa
      pillar.position.set(at.x, front, at.z); pillar.scale.set(wide, H, wide); pillarMat.uniforms.time.value = t; pillarMat.uniforms.alpha.value = out; pillarMat.uniforms.erode.value = ph === 'fade' ? A / CELESTIAL.fade * .9 : 0;
      pillarCore.position.copy(pillar.position); pillarCore.scale.set(wide * .4, H, wide * .4); pillarCore.material.uniforms.time.value = t * 1.6; pillarCore.material.uniforms.alpha.value = out; pillarCore.material.uniforms.erode.value = pillarMat.uniforms.erode.value;
      // cúpula de pressão, anéis de choque no ar, brasas e detritos
      const dk = easeOut(Math.min(1, boom / .45)); dome.visible = pa >= CELESTIAL.strike && boom < 1.6; dome.position.set(at.x, gy, at.z); dome.scale.set(1 + dk * 10, 1 + dk * 7, 1 + dk * 10); domeMat.uniforms.alpha.value = 1 - smooth(boom / 1.6);
      for (let i = 0; i < 3; i++) { const ra = boom - i * .12; if (pa < CELESTIAL.strike) continue; if (ra < 0 || ra > .9) continue; const R = 2 + easeOut(ra / .9) * (13 + i * 3); P.set(at.x, gy + 3 + i * 4, at.z); Q.setFromEuler(E.set(Math.PI / 2, 0, 0)); S.set(R, R, 1); M.compose(P, Q, S); airRings.setMatrixAt(airRings.count++, M); }
      ringMat.opacity = 1 - smooth(boom / .9);
      for (let i = 0; i < (low ? 20 : 48); i++) { const u = (t * 1.6 + i / 48) % 1, a = i * 2.4 + t * 2; sparks.add(at.x + Math.cos(a) * 2.6 * (1 + u), gy + u * 22, at.z + Math.sin(a) * 2.6 * (1 + u), .08, .5, 1, .78, .2, (1 - u) * out, 3, a, i); }
      if (s.struck) { sak.emit({ id: 'cel' + Math.round(s.time - pa), time: t - boom, point: { x: at.x, y: gy + .5, z: at.z }, size: 6, palette: 'celestial', rocks: 15 }); sak.emit({ id: 'cel2' + Math.round(s.time - pa), time: t - boom + .15, point: { x: at.x, y: gy + 2.5, z: at.z }, size: 4.2, palette: 'crimson', rocks: 10 }); }
      if (pa < CELESTIAL.strike) { sparks.add(at.x, front, at.z, 3, 3, 1, .95, .7, 1, 0); sparks.add(at.x, front, at.z, 5, 1.2, 1, .8, .3, .8, 2, t); } // ponta do feixe descendo
      else if (boom < .5) { sparks.add(at.x, gy + 2, at.z, 16 * (1 - boom * 1.6) + 3, 16 * (1 - boom * 1.6) + 3, 1, .9, .6, 1 - boom * 2, 0); for (let i = 0; i < (low ? 24 : 64); i++) { const a = i * 2.39996, el = hash(i) * 1.4, d = (4 + hash(i * 3) * 12) * smooth(boom / .6); sparks.add(at.x + Math.cos(a) * Math.cos(el) * d, gy + 1 + Math.sin(el) * d, at.z + Math.sin(a) * Math.cos(el) * d, .1, .8, 1, .7 + hash(i) * .3, .2, 1 - boom * 2, 3, a + 1.57, i); } } // explosão maior
    } else dome.visible = false;
    wave.visible = (ph === 'pillar' && A >= CELESTIAL.waveAt) || (ph === 'fade' && A < .3);
    if (wave.visible) { const F = Math.max(.5, s.front || CELESTIAL.waveR); wave.position.set(at.x, gy, at.z); wave.scale.set(F, CELESTIAL.waveH * 1.2, F); wave.material.uniforms.alpha.value = ph === 'fade' ? 1 - A / .3 : 1; }
    cfx && (circles.geometry.attributes.aFx.needsUpdate = circles.geometry.attributes.aCol.needsUpdate = true); circles.instanceMatrix.needsUpdate = true; airRings.instanceMatrix.needsUpdate = true;
    sak.update(t, camera, quality); stars.end(); sparks.end(); rib.end();
  }
  return { root, update, clear() { root.visible = false; sak.clear(); last = -1; }, dispose() { scene.remove(root); sak.dispose(); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); stars.dispose(); sparks.dispose(); rib.dispose(); } };
}
