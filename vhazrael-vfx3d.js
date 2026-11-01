import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
import { createRuptureVFX } from './vhazrael-rupture3d.js?v=mod253-extincao-orbital';
import { createExtinctionVFX } from './vhazrael-extinction3d.js?v=mod253-extincao-orbital';
/**
 * MOD 247b — VFX do VHAZRAEL refeito (só desenha o estado de vhazrael3d.js). Correção visual pedida pelo criador:
 *  • ANATOMIA ARTICULADA INSTANCIADA: criaturas da Ninhada e Mãos Devoradoras são montadas por cinemática direta em
 *    peças instanciadas compartilhadas (segmentos, garras de três pontas, dentes, lábios em losango, palmas, olhos):
 *    dezenas de membros articulados em ~8 chamadas de desenho, em vez de dezenas de meshes por bicho.
 *  • Ninhada: corpo = BOCA HORIZONTAL EM LOSANGO com lábios recortados, fileiras de dentes brancos/rosados, garganta
 *    negra com dois pontos brancos; 10 braços/patas assimétricos de três juntas (joelhos altos, como na referência) e
 *    garras de três pontas; marcha com pés plantados, bote, mordida, reação, morte por dissolução. Colosso = 4×.
 *  • Mãos: antebraço segmentado e torcido saindo da rachadura, palma com BOCA dentada, cinco dedos de três falanges
 *    com garras; antecipação → subida → agarrão → mordidas → retração.
 *  • Entidade do Terror: superfície curva gigante atrás do bispo pintada em shader (silhueta de sombra com contorno que
 *    se deforma, braços ao fundo, olhos vermelhos com íris irregular e centro claro que seguem o jogador, bocarra com
 *    fileiras de dentes serrilhados que abre e respira).
 *  • Espinhos: lâminas facetadas, longas e finas com farpas (não cones), negras com filetes violeta nas arestas;
 *    espinhos de dano perto do jogador + floresta decorativa de 14–22 m cruzando-se em vários planos.
 *  • Ruptura do Trono (MOD 249): módulo próprio vhazrael-rupture3d.js — erguer, carga com pilar colossal em camadas,
 *    corte com leque e flare em cruz, feixe gigante que rasga o chão e colisão em várias fases (ver o cabeçalho dele).
 *  • Extinção Orbital (MOD 253): módulo próprio vhazrael-extinction3d.js (storyboard em 8 tomadas). Texto antigo: cena orbital ISOLADA (entrada
 *    atmosférica com plasma acompanhada de perto), fundo de chamas sólidas no despertar, meteoro que cobre o céu e
 *    impacto em camadas.
 */
const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.03+1.7)*.3+n2(p*4.1+3.1)*.2;}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const TONE = `
 #include <tonemapping_fragment>
 #include <colorspace_fragment>`;
const LIT_V = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
// peças anatômicas instanciadas: preto sólido iluminado + borda carmim (rim) + realce por instância (aTint: flash/dissolução)
const PART_V = `attribute vec2 aTint; varying vec3 vN; varying vec3 vV; varying vec2 vT; varying vec3 vW;
void main(){ vT=aTint; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(transpose(inverse(mat3(modelMatrix*instanceMatrix)))*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const PART_F = `${NOISE} uniform vec3 base, rim, hot; uniform float time; varying vec3 vN; varying vec3 vV; varying vec2 vT; varying vec3 vW;
void main(){ if(vT.y>0.&&n3(vW*3.)<vT.y) discard; vec3 n=normalize(vN), v=normalize(vV); float l=max(0.,dot(n,normalize(vec3(.35,1.,.25)))), f=1.-abs(dot(n,v));
 vec3 c=base*(.35+.65*l)+rim*pow(f,3.6)*.9+hot*vT.x; c+=rim*smoothstep(vT.y+.06,vT.y,n3(vW*3.))*step(.001,vT.y)*2.; gl_FragColor=vec4(c,1.);${TONE}
}`;
// espinho facetado: preto, filetes violeta nas arestas (aEdge), rim; cresce pela escala da instância
const SPIKE_V = `attribute float aEdge; varying float vE; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vE=aEdge; vY=position.y; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(transpose(inverse(mat3(modelMatrix*instanceMatrix)))*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SPIKE_F = `uniform float time; varying float vE; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec3 n=normalize(vN), v=normalize(vV); float l=max(0.,dot(n,normalize(vec3(.3,1.,.2)))), f=1.-abs(dot(n,v));
 vec3 c=vec3(.003,.001,.006)+vec3(.012,.008,.02)*l; c+=vec3(.3,.08,.6)*pow(f,5.)*.15; c=mix(c,vec3(.5,.18,.95)*(1.+.25*sin(time*4.+vY*2.)),smoothstep(.85,.99,vE)*.6); c+=vec3(.9,.2,.7)*smoothstep(.08,0.,vY)*.5;
 gl_FragColor=vec4(c,1.);${TONE}
}`;
// Entidade do Terror pintada numa superfície curva: uv.x largura, uv.y altura; olhar (look) desloca as pupilas
const ENT_F = `${NOISE} uniform float time, open, alpha, breathe; uniform vec2 look; varying vec2 vUv;
float tooth(float x, float n){ return abs(fract(x*n)-.5)*2.; }
void main(){ vec2 p=vec2((vUv.x-.5)*2.2, vUv.y*1.6-.5); float t=time;
 // silhueta: cabeça/ombros em massa negra com contorno que se deforma em gavinhas; braços ao fundo
 float head=length(p*vec2(.82,1.05)-vec2(0.,.18))-.62-.05*breathe; float arms=min(length(vec2(abs(p.x)-1.,p.y+.3)*vec2(.55,1.7))-.38,abs(p.y+.55+.25*sin(p.x*3.+t))-.12+abs(p.x)*.03);
 float body=min(head,arms); float edge=fbm(vec2(atan(p.y,p.x)*4.+t*.3,length(p)*3.-t*.5)); body+=(edge-.5)*.22; if(body>0.) discard;
 vec3 c=vec3(.004,0.,.003)+vec3(.05,0.,.01)*smoothstep(-.12,0.,body);
 // olhos: anéis vermelhos irregulares, íris recortada, centro claro e pupila negra que segue o jogador
 for(int i=0;i<2;i++){ vec2 e=vec2(i==0?-.27:.27,.34); vec2 q=p-e; float r=length(q), a=atan(q.y,q.x); float jag=.02*n2(vec2(a*6.,t*2.+float(i)*4.));
  float ring=smoothstep(.2+jag,.18,r)*smoothstep(.07,.1,r); float glowR=exp(-pow((r-.15)/.08,2.));
  c=mix(c,vec3(1.,.05,.05)*(1.3+.4*sin(t*7.)),ring); c+=vec3(.9,0.,.02)*glowR*.35; float core=smoothstep(.075,.05,r); c=mix(c,vec3(1.,.95,.9),core);
  float pupil=smoothstep(.035,.02,length(q-look*.03)); c=mix(c,vec3(0.),pupil*core); }
 // bocarra: elipse larga que abre, várias fileiras de dentes serrilhados, garganta funda
 vec2 m=p-vec2(0.,-.05); float H=.06+.2*open, mouth=(m.x*m.x)/.3+(m.y*m.y)/(H*H)-1.;
 if(mouth<0.){ float d=abs(m.y)/H, rows=floor((1.-d)*3.); float tt=tooth(m.x+rows*.07,9.+rows*3.); float teeth=step(1.-d,.18+.62*(1.-tt)*(1.-rows*.22));
  c=mix(vec3(.004,0.,.002),vec3(.32,0.,.03),smoothstep(-.4,-.02,mouth)); c=mix(c,mix(vec3(.95,.8,.8),vec3(.85,.3,.35),rows*.45),teeth*step(rows,2.)); }
 c+=vec3(.55,0.,.04)*smoothstep(.0,-.015,body)*smoothstep(-.03,0.,body); gl_FragColor=vec4(c,alpha);${TONE}
}`;

/* ---------------- arma do bispo ---------------- */
/** Lâmina do Trono: montante largo de seção em losango (não uma vareta), sulco carmim aceso, guarda negra com espinhos
    para baixo e gema, cabo de duas mãos. Proporção de montante (~1,45 m de lâmina para um bispo de ~2,2 m). +Y = lâmina. */
export function buildThroneBlade(T) {
  const root = new T.Group(); root.name = 'LaminaDoTrono'; const geos = [], mats = [];
  const steel = new T.MeshStandardMaterial({ color: 0x15090d, metalness: .85, roughness: .26, emissive: 0x220308, emissiveIntensity: .7, flatShading: true });
  const red = new T.MeshBasicMaterial({ color: 0xff1030, toneMapped: false }), dark = new T.MeshStandardMaterial({ color: 0x0a0507, metalness: .7, roughness: .35, flatShading: true }), gold = new T.MeshStandardMaterial({ color: 0x5a3214, metalness: .9, roughness: .3, emissive: 0x3a0806, flatShading: true });
  mats.push(steel, red, dark, gold);
  { const N = 18, L = 1.45, pos = [], idx = [], fl = []; // lâmina: losango largo afinando até a ponta
    for (let j = 0; j <= N; j++) { const u = j / N, y = .1 + u * L, w = (.11 - .03 * u) * (u > .82 ? (1 - u) / .18 : 1) + .004, t = .028 * (1 - u * .5) + .004;
      pos.push(-w, y, 0, 0, y, t, w, y, 0, 0, y, -t); if (j < N) { const a = j * 4, b = a + 4; for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; idx.push(a + k, b + k, a + k1, a + k1, b + k, b + k1); } }
      if (u < .8) fl.push(-.009, y, t + .002, .009, y, t + .002, -.009, y, -t - .002, .009, y, -t - .002); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); geos.push(g); root.add(new T.Mesh(g, steel));
    const fi = []; const n = fl.length / 12; for (let i = 0; i < n - 1; i++) for (const off of [0, 2]) { const a = i * 4 + off, b = a + 4; fi.push(a, b, a + 1, a + 1, b, b + 1); }
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(fl, 3)); fg.setIndex(fi); geos.push(fg); root.add(new T.Mesh(fg, red)); }
  const guard = new T.BoxGeometry(.46, .07, .08); geos.push(guard); const gm = new T.Mesh(guard, dark); gm.position.y = .07; root.add(gm);
  const sp = new T.ConeGeometry(.03, .16, 4); geos.push(sp); for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const m = new T.Mesh(sp, gold); m.position.set(sx * (.17 + i * .06), .0, 0); m.rotation.z = Math.PI + sx * .4; root.add(m); }
  const gem = new T.OctahedronGeometry(.045, 0); geos.push(gem); const gq = new T.Mesh(gem, red); gq.position.set(0, .07, .045); root.add(gq);
  const grip = new T.CylinderGeometry(.03, .034, .44, 8); grip.translate(0, -.2, 0); geos.push(grip); root.add(new T.Mesh(grip, dark));
  const pm = new T.OctahedronGeometry(.06, 0); geos.push(pm); const p = new T.Mesh(pm, gold); p.position.y = -.45; root.add(p);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  Object.assign(root.userData, { tipA: new T.Vector3(0, .15, 0), tipB: new T.Vector3(0, 1.55, 0), fx: new T.Group(), tick(time, fury = 0, swing = 0) { red.color.setRGB(1, .04 + .05 * Math.sin(time * 6) + fury * .05, .12 + swing * .1); steel.emissiveIntensity = .6 + fury * .5; }, updateFx(time, fury, low, visible) { root.userData.fx.visible = visible; },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); } });
  return root;
}
/** Compatibilidade com o runtime: o corpo da Ninhada agora é desenhado pelo kit anatômico do VFX (instanciado). */
export function buildCrawler(T) { const g = new T.Group(); g.name = 'NinhadaProxy'; return { group: g, mats: [], update() {}, dispose() {} }; }

/* ---------------- geometrias procedurais ---------------- */
function spikeGeo(T, seed) { // lâmina espinhosa longa e fina, seção em losango irregular, leve curva, farpas laterais; aEdge=1 nas arestas
  const r = i => { const x = Math.sin(seed * 91.7 + i * 12.9) * 43758.5; return x - Math.floor(x); };
  const pos = [], edge = [], idx = [], N = 10; let prev = null;
  for (let j = 0; j <= N; j++) { const u = j / N, w = (.08 + .03 * r(j)) * (1 - u) ** .85 + .002, t = w * (.45 + .2 * r(j + 7)), bend = (u * u) * .12 * (r(3) - .5), y = u;
    const ring = [[w, y, bend], [0, y, t + bend], [-w * .8, y, bend], [0, y, -t + bend]].map((v, k) => { pos.push(...v); edge.push(k % 2 === 0 ? 1 : 0); return pos.length / 3 - 1; });
    if (prev) for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; idx.push(prev[k], ring[k], prev[k1], prev[k1], ring[k], ring[k1]); } prev = ring; }
  for (let b = 0; b < 3; b++) { const u = .2 + b * .22 + r(b + 20) * .08, w = (.08 * (1 - u)) + .01, sd = b % 2 ? 1 : -1, base = pos.length / 3; // farpas
    pos.push(sd * w, u, 0, sd * (w + .07 + r(b) * .05), u + .06 + r(b + 5) * .05, 0, sd * w, u + .05, .01); edge.push(0, .9, 0); idx.push(base, base + 1, base + 2, base + 2, base + 1, base); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new T.Float32BufferAttribute(edge, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function clawGeo(T) { const g = new T.ConeGeometry(.5, 1, 4, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + .5; p.setZ(i, p.getZ(i) + y * y * .45); } g.translate(0, .5, 0); g.computeVertexNormals(); return g; }

export function createVhazraelVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'VhazraelVFX'; scene.add(root); const uTime = { value: 0 }, geos = [], mats = [];
  const M = new T.Matrix4(), Q = new T.Quaternion(), Q2 = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), up = new T.Vector3(0, 1, 0), D = new T.Vector3(), cam = new T.Vector3(), nrm = [0, 1, 0];
  const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), F = new T.Vector3(), K1 = new T.Vector3(), K2 = new T.Vector3(), O = new T.Vector3(), R = new T.Vector3(), U = new T.Vector3();
  const glow = softParticles(T, 900), rib = ribbons(T, 1400, { flow: 14 }), decals = groundDecals(T, 64); root.add(glow.mesh, rib.mesh, decals.mesh);
  /* --- kit anatômico instanciado --- */
  const partMat = (base, rim, hot) => { const m = new T.ShaderMaterial({ vertexShader: PART_V, fragmentShader: PART_F, uniforms: { time: uTime, base: { value: new T.Color(...base) }, rim: { value: new T.Color(...rim) }, hot: { value: new T.Color(...hot) } }, side: T.DoubleSide, toneMapped: false }); mats.push(m); return m; };
  const kit = {}; const mkPart = (name, geo, mat, n) => { const tint = new Float32Array(n * 2); geo.setAttribute('aTint', new T.InstancedBufferAttribute(tint, 2).setUsage(T.DynamicDrawUsage)); const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; root.add(m); geos.push(geo); kit[name] = { m, tint, n: 0, max: n }; };
  const segG = new T.CylinderGeometry(.62, 1, 1, 7, 1); segG.translate(0, .5, 0);
  const flesh = partMat([.012, .006, .01], [.3, .008, .035], [1, .2, .25]), boneM = partMat([.95, .78, .8], [1, .5, .55], [1, .3, .3]), throatM = partMat([0, 0, 0], [.25, 0, .04], [0, 0, 0]), eyeM = partMat([1.4, 1.4, 1.4], [1, 1, 1], [0, 0, 0]);
  mkPart('seg', segG, flesh, 900); mkPart('claw', clawGeo(T), flesh, 420); mkPart('tooth', new T.ConeGeometry(.5, 1, 4).translate(0, .5, 0), boneM, 900);
  mkPart('lip', new T.TorusGeometry(1, .16, 5, 4), flesh, 40); mkPart('throat', new T.CircleGeometry(1, 4), throatM, 40); mkPart('eye', new T.SphereGeometry(1, 8, 6), eyeM, 80);
  mkPart('palm', new T.OctahedronGeometry(1, 0), flesh, 24);
  const put = (name, pos, quat, sx, sy, sz, hot = 0, dis = 0) => { const k = kit[name]; if (k.n >= k.max) return; S.set(sx, sy, sz); M.compose(pos, quat, S); k.m.setMatrixAt(k.n, M); k.tint[k.n * 2] = hot; k.tint[k.n * 2 + 1] = dis; k.n++; };
  /** segmento de a até b com raio (base) r0 */
  const seg = (a, b, r0, hot, dis, name = 'seg') => { D.subVectors(b, a); const L = D.length(); if (L < 1e-4) return; Q.setFromUnitVectors(up, D.multiplyScalar(1 / L)); put(name, a, Q, r0, L, r0, hot, dis); };
  /** garra de três pontas no fim de um membro (dir = direção do membro) */
  const claw3 = (p, dir, s, hot, dis) => { for (let i = 0; i < 3; i++) { const a = (i - 1) * .55; D.copy(dir).applyAxisAngle(up, a); D.y -= .5; D.normalize(); Q.setFromUnitVectors(up, D); put('claw', p, Q, .045 * s, .28 * s, .045 * s, hot, dis); } };
  /* --- espinhos --- */
  const spikeMat = new T.ShaderMaterial({ vertexShader: SPIKE_V, fragmentShader: SPIKE_F, uniforms: { time: uTime }, side: T.DoubleSide, toneMapped: false }); mats.push(spikeMat);
  const spikeSets = [0, 1, 2].map(i => { const g = spikeGeo(T, i + 1); geos.push(g); const m = new T.InstancedMesh(g, spikeMat, 120); m.frustumCulled = false; m.count = 0; root.add(m); return { m, n: 0 }; });
  const spike = (x, y, z, lean, az, len, k, w = 1) => { if (k <= .01) return; const set = spikeSets[(Math.abs(Math.floor(x * 7 + z * 3))) % 3]; if (set.n >= 120) return;
    D.set(Math.sin(az) * Math.sin(lean), Math.cos(lean), Math.cos(az) * Math.sin(lean)); Q.setFromUnitVectors(up, D); Q2.setFromAxisAngle(up, az * 3.1); Q.multiply(Q2); P.set(x, y, z); S.set(w * len * .06 + .6, len * k, w * len * .06 + .6); M.compose(P, Q, S); set.m.setMatrixAt(set.n++, M); };
  const shardG = new T.OctahedronGeometry(1, 0); shardG.scale(.55, 1.1, .45); geos.push(shardG); const rockM = new T.MeshStandardMaterial({ color: 0x15100e, roughness: .9, flatShading: true }); mats.push(rockM);
  const shards = new T.InstancedMesh(shardG, rockM, 360); shards.frustumCulled = false; shards.count = 0; root.add(shards); let sn = 0;
  const magmaM = new T.MeshStandardMaterial({ color: 0x1a0a06, roughness: .7, emissive: 0xff3a08, emissiveIntensity: .9, flatShading: true }); mats.push(magmaM);
  const plates = new T.InstancedMesh(new T.BoxGeometry(1, .22, .8), magmaM, 80); geos.push(plates.geometry); plates.frustumCulled = false; plates.count = 0; root.add(plates); let pn = 0;
  function shard(x, y, z, s, rx, ry, rz, sy) { if (sn >= 360 || s <= .005) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.set(s, sy || s, s); M.compose(P, Q, S); shards.setMatrixAt(sn++, M); }
  function plate(x, y, z, s, rx, ry, rz) { if (pn >= 80 || s <= .01) return; P.set(x, y, z); Q.setFromEuler(E.set(rx, ry, rz)); S.setScalar(s); M.compose(P, Q, S); plates.setMatrixAt(pn++, M); }
  /* --- domos, onda, pilar, entidade, fundo --- */
  const ringG = new T.TorusGeometry(1, .035, 4, 48); ringG.rotateX(Math.PI / 2); geos.push(ringG); const ringM = new T.MeshBasicMaterial({ color: 0xffd6f4, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }); mats.push(ringM);
  const rings = new T.InstancedMesh(ringG, ringM, 12); rings.frustumCulled = false; rings.count = 0; root.add(rings); let rn = 0;
  const ring = (x, y, z, r, th) => { if (rn >= 12) return; P.set(x, y, z); Q.identity(); S.set(r, th, r); M.compose(P, Q, S); rings.setMatrixAt(rn++, M); };
  const entG = new T.CylinderGeometry(15, 15, 16, 32, 1, true, -.75, 1.5); entG.translate(0, 8, 0); entG.scale(-1, 1, 1); geos.push(entG);
  const entMat = new T.ShaderMaterial({ vertexShader: LIT_V, fragmentShader: ENT_F, uniforms: { time: uTime, open: { value: 0 }, alpha: { value: 1 }, breathe: { value: 0 }, look: { value: new T.Vector2() } }, side: T.DoubleSide, transparent: true, depthWrite: false, toneMapped: false, fog: false }); mats.push(entMat);
  const ent = new T.Mesh(entG, entMat); ent.frustumCulled = false; ent.visible = false; ent.renderOrder = -2; root.add(ent);
  const bolt = Array.from({ length: 30 }, () => [0, 0, 0, 0, 0, 0, 0]); let time = 0, low = false;
  const MAG = [1, .2, .8], RED = [1, .05, .12], VIO = [.6, .25, 1], WHT = [1, .95, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  const gaitOf = new Map();
  function boltRib(seed, ax, ay, az, bx, by, bz, w, col, a) { const n = lightningBolt(seed, ax, ay, az, bx, by, bz, bolt, { depth: 1, jag: .45, branches: .35 }); for (let i = 0; i < n; i++) { const q = bolt[i]; rib.seg(q[0], q[1], q[2], q[3], q[4], q[5], w * q[6], w * q[6] * .8, c4(col, a), c4(col, a * .8)); } }

  /* ---------- Skill 1: Floresta de Espinhos ---------- */
  function drawThorns(s) {
    const waves = new Map();
    for (const p of s.spikes) {
      const lean = .55 + (p.seed % 1) * .5, az = Math.atan2(p.lx, p.lz), gy = p.y, L = 3.4 + (p.h - 2.4) * 1.1;
      if (p.phase === 'warn') { const k = p.t / p.warn; groundNormal(ground, p.x, p.z, nrm); decals.add(p.x, gy, p.z, .7 + k * .25, .5, .05, .9, .55 + .45 * k, 1, k, p.id, nrm);
        rib.seg(p.x, gy + .04, p.z, p.x + p.lx * L * Math.sin(lean) * k, gy + .04, p.z + p.lz * L * Math.sin(lean) * k, .08, .02, c4(MAG, .95), c4(MAG, .4)); // rachadura com a direção real
        if (k > .55) for (let i = 0; i < 2; i++) shard(p.x + Math.cos(i * 3 + p.id) * .3, gy + .04 + .06 * Math.sin(time * 40 + i), p.z + Math.sin(i * 3 + p.id) * .3, .08, i, p.id, 0); continue; }
      const k = p.phase === 'active' ? easeOut(Math.min(1, p.t / .14)) : p.phase === 'retract' ? 1 - smooth(p.t / .35) : 1;
      spike(p.x, gy - .25, p.z, lean, az, L, k, 1.7); spike(p.x + .2, gy - .25, p.z - .15, lean * .7 + .2, az + .9, L * .75, k, 1.3); spike(p.x - .15, gy - .25, p.z + .2, lean * .5 + .1, az - 1.1, L * .55, k, 1.1); // par entrecruzado
      if (p.phase === 'active' && p.t < .25) for (let i = 0; i < (low ? 3 : 7); i++) { const a = i * 2.3 + p.id, u = p.t / .25; shard(p.x + Math.cos(a) * u * 1.1, gy + Math.sin(u * 3.14) * .9, p.z + Math.sin(a) * u * 1.1, .14 * (1 - u * .3), a, u * 6, i); }
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + p.id; shard(p.x + Math.cos(a) * .45, gy + .05, p.z + Math.sin(a) * .45, .22 * k, Math.cos(a) * .9, a, Math.sin(a) * .9, .5 * k); } // raízes rompendo o solo
      const w = waves.get(p.wave) || { x: 0, z: 0, n: 0, k: 0, gy }; w.x += p.x; w.z += p.z; w.n++; w.k = Math.max(w.k, k); waves.set(p.wave, w);
    }
    // floresta decorativa (sem dano): lâminas de 14–22 m que se cruzam acima da arena, em vários planos e profundidades
    for (const [wv, w] of waves) { const cx = w.x / w.n, cz = w.z / w.n, n = low ? 8 : 22;
      for (let i = 0; i < n; i++) { const sd = s.id * 31 + wv * 17 + i, a = hash(sd) * 6.283, d = 6 + hash(sd + 1) * 8, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, gy = ground(x, z);
        const lean = .26 + hash(sd + 2) * .87, az = a + Math.PI + (hash(sd + 3) - .5) * 1.4, L = 14 + hash(sd + 4) * 8, kk = smooth((w.k - hash(sd + 5) * .4) / .6);
        spike(x, gy - .4, z, lean, az, L, kk, 2.6); if (i % 4 === 0 && kk > .2) glow.add(x + Math.sin(az) * L * .25, gy + L * .3, z + Math.cos(az) * L * .25, 5, 7, .35, .1, .6, .18 * kk, 0); /* luz violeta que revela as arestas */ if (kk > .3 && i % 3 === 0) { groundNormal(ground, x, z, nrm); decals.add(x, gy, z, 1.6, .02, 0, .03, .85 * kk, 1, 1, sd, nrm); } } }
  }
  /* ---------- Skill 2: Entidade + Mãos ---------- */
  function hand(h, s, target) {
    const T0 = s.T, held = s.held && s.held.hand === h.i, sc = h.s * 1.5;
    const e = h.phase === 'grab' ? easeOut(Math.min(1, h.t / .3)) : h.phase === 'sink' ? 1 - smooth(h.t / .4) : 0; if (e <= .01) return;
    const curl = held ? 1.25 + .1 * Math.sin(time * 14) : Math.min(1, h.t / .4) * 1.05, bite = held ? .5 + .5 * Math.sin(time * 16) : .3 + .2 * Math.sin(time * 5 + h.i);
    const bx = held ? s.held.ax : h.x, bz = held ? s.held.az : h.z, gy = h.y; let tx = target ? target.x - bx : 0, tz = target ? target.z - bz : 1; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    // antebraço torcido em 3 segmentos saindo da rachadura, inclinando para o alvo
    A.set(bx - tx * .6, gy - .3, bz - tz * .6); const H = 2.2 * sc * e; let px = A.x, py = A.y, pz = A.z;
    for (let i = 1; i <= 3; i++) { const u = i / 3, tw = Math.sin(u * 3 + h.seed + time * 1.5) * .25 * sc; B.set(A.x + tx * u * .9 * sc + tz * tw, A.y + H * u, A.z + tz * u * .9 * sc - tx * tw); C.set(px, py, pz); seg(C, B, (.2 - u * .05) * sc, 0, 0); px = B.x; py = B.y; pz = B.z; }
    // palma voltada para o alvo com BOCA dentada
    const wrist = B.clone(); D.set(tx, .9, tz).normalize(); Q.setFromUnitVectors(up, D); O.copy(wrist).addScaledVector(D, .22 * sc); put('palm', O, Q, .26 * sc, .3 * sc, .1 * sc);
    F.set(tx, -.15, tz).normalize(); R.set(-tz, 0, tx); const mouthC = O.clone().addScaledVector(F, .1 * sc);
    Q.setFromUnitVectors(new T.Vector3(0, 0, 1), F); put('lip', mouthC, Q, .16 * sc, .07 * sc * (.6 + bite), .16 * sc); put('throat', mouthC, Q, .14 * sc, .055 * sc * (.6 + bite), 1);
    for (let i = 0; i < 8; i++) { const u = (i % 4) / 3 - .5, top = i < 4 ? 1 : -1; P.copy(mouthC).addScaledVector(R, u * .18 * sc).addScaledVector(U.set(0, 1, 0), top * .05 * sc * (.6 + bite)); D.set(0, -top, 0).addScaledVector(F, .2).normalize(); Q.setFromUnitVectors(up, D); put('tooth', P, Q, .022 * sc, .07 * sc, .022 * sc); }
    // cinco dedos de três falanges com garra, que se curvam no agarrão
    for (let f = 0; f < 5; f++) { const thumb = f === 4, spread = thumb ? -1.1 : (f - 1.5) * .28; let p = O.clone().addScaledVector(D, .22 * sc).addScaledVector(R, (thumb ? -.22 : (f - 1.5) * .09) * sc);
      let dir = D.clone().applyAxisAngle(F, spread * .6).normalize(); const nSeg = thumb ? 2 : 3;
      for (let j = 0; j < nSeg; j++) { const len = (thumb ? .2 : .26 - j * .04) * sc * (f === 1 || f === 2 ? 1.15 : 1); dir.applyAxisAngle(R, curl * (.45 + j * .12)).normalize(); const q = p.clone().addScaledVector(dir, len); seg(p, q, .045 * sc * (1 - j * .2), 0, 0); p = q; }
      Q.setFromUnitVectors(up, dir); put('claw', p, Q, .03 * sc, .16 * sc, .03 * sc); }
  }
  function drawTerror(s, actors, target) {
    const T0 = s.T, age = s.age || s.t, rise = smooth(age / T0.rise), out = s.phase === 'fade' ? 1 - smooth(s.t / T0.fade) : 1, k = rise * out;
    if (k > .01) { ent.visible = true; const dx = cam.x - s.ex, dz = cam.z - s.ez, yaw = Math.atan2(dx, dz); const dl = Math.hypot(dx, dz) || 1; ent.position.set(s.ex - dx / dl * 15, s.ey - 6 * (1 - k) - 1, s.ez - dz / dl * 15); ent.rotation.y = yaw; ent.scale.set(1 + .02 * Math.sin(time * 1.3), 1, 1);
      entMat.uniforms.open.value = .35 + .35 * Math.sin(time * 1.7) + (s.held ? .3 : 0); entMat.uniforms.breathe.value = Math.sin(time * 1.6); entMat.uniforms.alpha.value = Math.min(1, k * 1.3);
      if (target) { const lx = target.x - s.ex, lz = target.z - s.ez; entMat.uniforms.look.value.set(Math.max(-1, Math.min(1, (lx * Math.cos(yaw) - lz * Math.sin(yaw)) / 8)), -.5); } }
    for (const h of s.hands) { groundNormal(ground, h.x, h.z, nrm);
      if (h.phase === 'warn') { const kk = h.t / T0.warn; decals.add(h.x, h.y, h.z, 1 + .4 * kk, .03, 0, .03, .9, 1, kk, h.i, nrm); decals.add(h.x, h.y, h.z, 1.2, .9, .03, .12, .7 * kk, 0, kk, h.i + 9, nrm);
        for (let i = 0; i < 4; i++) shard(h.x + Math.cos(i * 1.6 + h.i) * .5, h.y + .05 + Math.abs(Math.sin(time * 30 + i)) * .1 * kk, h.z + Math.sin(i * 1.6 + h.i) * .5, .1, i, h.i, 0); continue; }
      if (h.phase === 'grab' || h.phase === 'sink') { hand(h, s, target); if (h.phase === 'grab' && h.t < .2) for (let i = 0; i < 6; i++) shard(h.x + Math.cos(i * 1.1) * .6, h.y + h.t * 4, h.z + Math.sin(i * 1.1) * .6, .12, i, h.t * 9, 0); }
    }
  }
  /* ---------- Skill 3: Ninhada (anatomia articulada) ---------- */
  function creature(a) {
    const colossal = a.kind === 'colossus', sc = colossal ? 4 : 1.05, em = smooth(a.emerge ?? 1), dead = !a.alive, dis = dead ? Math.min(1, (a.deadT || 0) / 1.2) : 0; if (dead && dis >= 1) return;
    let g = gaitOf.get(a.id); if (!g) gaitOf.set(a.id, g = { t: hash(a.x) * 6, hit: 0 }); g.t += (.02 + Math.min(1, (a.speed || 0) / 3) * .14) * (colossal ? .6 : 1);
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx, gy = a.y, atk = a.act && a.act.type === 'melee' ? Math.sin(Math.min(1, a.act.t / a.act.dur) * Math.PI) : 0, hit = a.act && a.act.type === 'stagger' ? Math.sin(Math.min(1, a.act.t / a.act.dur) * Math.PI) : 0;
    const bodyY = gy + (1.35 + .06 * Math.sin(g.t * 2) + atk * .35 - hit * .25) * sc * (em * .9 + .1) - (1 - em) * 1.2 * sc - dis * .8 * sc, mouthF = .25 * sc + atk * .55 * sc, hot = hit * .8;
    O.set(a.x + fx * (mouthF - hit * .2 * sc), bodyY, a.z + fz * (mouthF - hit * .2 * sc));
    // corpo = boca em losango (lábios recortados), garganta negra, dois pontos brancos, fileiras de dentes
    F.set(fx, .35 + atk * .3, fz).normalize(); Q.setFromUnitVectors(new T.Vector3(0, 0, 1), F); Q2.setFromAxisAngle(F, Math.PI / 4); Q.premultiply(Q2);
    const open = .55 + .25 * Math.sin(g.t * 1.3) + atk * .6;
    put('lip', O, Q, .95 * sc, .95 * sc * open, .95 * sc, hot, dis); put('throat', O, Q, .88 * sc, .88 * sc * open, 1, 0, dis);
    R.set(rx, 0, rz); U.crossVectors(F, R).normalize();
    for (const sx of [-1, 1]) { P.copy(O).addScaledVector(R, sx * .11 * sc).addScaledVector(U, -.03 * sc).addScaledVector(F, -.06 * sc); put('eye', P, Q, .045 * sc, .045 * sc, .045 * sc, 0, dis); }
    const nt = colossal ? 16 : 13; for (let row = 0; row < 2; row++) for (let i = 0; i < nt; i++) { const u = i / (nt - 1) * 2 - 1, top = row ? -1 : 1, edge = 1 - Math.abs(u);
      P.copy(O).addScaledVector(R, u * .95 * sc * .72).addScaledVector(U, top * (.66 * open * edge + .04) * sc); D.copy(U).multiplyScalar(-top).addScaledVector(F, .25).normalize(); Q2.setFromUnitVectors(up, D);
      put('tooth', P, Q2, .065 * sc, (.2 + .1 * edge) * sc, .065 * sc, 0, dis); }
    // massa do corpo atrás da boca (tronco escuro que sobe)
    A.copy(O).addScaledVector(F, -.35 * sc); B.set(A.x - fx * .5 * sc, A.y + .55 * sc, A.z - fz * .5 * sc); seg(A, B, .32 * sc, hot, dis); C.set(B.x - fx * .3 * sc, B.y + .5 * sc, B.z - fz * .3 * sc); seg(B, C, .2 * sc, hot, dis);
    // 10 patas assimétricas de três juntas, joelhos altos, garras de três pontas, pés plantados com marcha alternada
    const moving = Math.min(1, (a.speed || 0) / 2);
    for (let i = 0; i < 10; i++) { const side = i < 5 ? -1 : 1, k = i % 5, ang = (-.9 + k * .45) + hash(i + 3) * .12, ph = g.t + (k % 2 ? Math.PI : 0) + (side > 0 ? Math.PI / 2 : 0);
      const ox = rx * side * Math.cos(ang) + fx * Math.sin(ang), oz = rz * side * Math.cos(ang) + fz * Math.sin(ang);
      A.copy(O).addScaledVector(F, -.25 * sc); A.x += ox * .25 * sc; A.z += oz * .25 * sc;
      const reach = (1.5 + hash(i) * .35) * sc, stride = Math.sin(ph) * .35 * sc * moving, lift = Math.max(0, Math.cos(ph)) * .45 * sc * moving + atk * (k < 2 ? .9 : 0) * sc;
      F.set(a.x + ox * reach + fx * stride, 0, a.z + oz * reach + fz * stride); F.y = ground(F.x, F.z) + lift - (1 - em) * 1.4 * sc;
      K1.set(A.x + ox * .35 * sc, A.y + .3 * sc, A.z + oz * .35 * sc); K2.set((K1.x + F.x) / 2 + ox * .15 * sc, Math.max(K1.y, F.y) + (.75 + hash(i + 9) * .35) * sc, (K1.z + F.z) / 2 + oz * .15 * sc);
      seg(A, K1, .17 * sc, hot, dis); seg(K1, K2, .13 * sc, hot, dis); seg(K2, F, .09 * sc, hot, dis); D.subVectors(F, K2).normalize(); claw3(F, D, sc, hot, dis); }
  }
  function drawBrood(s) { for (const r of s.rifts) { groundNormal(ground, r.x, r.z, nrm); const k = s.phase === 'open' ? s.t / s.T.open : s.phase === 'emerge' ? 1 : 1 - s.t / .6, big = r.kind === 'colossus' ? 3.5 : 1.2;
    decals.add(r.x, r.y, r.z, 1.2 * big * Math.max(.1, k), .02, 0, .02, .95 * k, 1, k, s.id, nrm); decals.add(r.x, r.y, r.z, 1.4 * big * k, .9, .05, .15, .8 * k, 0, k, s.id + 3, nrm);
    for (let i = 0; i < (low ? 4 : 9); i++) { const a = i / 9 * 6.283 + s.id, rr = (.7 + hash(i) * .4) * big; shard(r.x + Math.cos(a) * rr, r.y + .1 + k * .15, r.z + Math.sin(a) * rr, .25 * big * k, Math.cos(a) * .9, a, Math.sin(a) * .9, .5 * k); }
    if (!low && s.phase === 'open') boltRib(s.id * 7 + Math.floor(time * 18), r.x, r.y + .05, r.z, r.x + (hash(time) - .5) * 2 * big, r.y + .05, r.z + (hash(time + 1) - .5) * 2 * big, .05, RED, .8); } }
  function drawStomp(s) { groundNormal(ground, s.x, s.z, nrm); if (s.phase === 'warn') decals.add(s.x, s.y, s.z, s.T.r, 1, .05, .15, .75, 0, s.t / s.T.warn, s.id, nrm); else { const k = s.t / .6; decals.add(s.x, s.y, s.z, s.T.r * (1 + k), 1, .1, .3, 1 - k, 0, k, s.id + 1, nrm); ring(s.x, s.y + .2, s.z, s.T.r * (1 + k * .6), 1 + k * 3); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; shard(s.x + Math.cos(a) * s.T.r * k, s.y + .2, s.z + Math.sin(a) * s.T.r * k, .25 * (1 - k), a, a, 0, .5); } } }
  /* ---------- Ruptura do Trono (MOD 249) ---------- */
  const rupture = createRuptureVFX(T, { root, glow, rib, decals, shard, plate, ring, boltRib, ground });
  /* ---------- Extinção Orbital (MOD 253): módulo próprio vhazrael-extinction3d.js ---------- */
  const extinction = createExtinctionVFX(T, { root, glow, rib, decals, shard, plate, ring, ground });
  return {
    root, orbitalScene: extinction.oScene, orbitalCamera: extinction.oCam, meteor: extinction.meteor,
    /** MOD 253: tomada de câmera da Extinção ({space} = renderizar a cena orbital; senão pos/look/fov/blend na arena) */
    get orbitShot() { return extinction.shot; },
    /** luz temporária da cena (carmim da Ruptura/despertar, laranja quente do meteoro): { k, hex } */
    get sceneTint() { const a = rupture.tint, b = extinction.tint; return a >= b ? { k: a, hex: 0x9a0618 } : { k: b, hex: extinction.tintHex }; },
    /** blades: {id → {a,b}} pontas da Lâmina do Trono em mundo. Devolve a Extinção em curso (fase/tempo) para câmera e cena. */
    update(dt, camera, spells, actors = [], quality = 1, blades = {}, target = null, heads = {}) {
      time += dt; uTime.value = time; low = quality === 0; cam.copy(camera.position); sn = pn = rn = 0; for (const k in kit) kit[k].n = 0; for (const st of spikeSets) st.n = 0;
      ent.visible = false;
      glow.begin(); rib.begin(camera, time); decals.begin(); rupture.begin(camera, time, quality, target); extinction.begin(camera, time, quality); const boss = actors.find(a => a.alive && a.kind === 'vhazrael');
      for (const s of spells) { if (s.type === 'thorns') drawThorns(s); else if (s.type === 'throne') rupture.draw(s, blades[s.owner], actors.find(a => a.id === s.owner && a.alive)); else if (s.type === 'terror') drawTerror(s, actors, target); else if (s.type === 'brood') drawBrood(s); else if (s.type === 'stomp') drawStomp(s); else if (s.type === 'orbital') { const o = actors.find(a => a.id === s.owner && a.alive); extinction.draw(s, o, target, o ? heads[o.id] : null); } }
      for (const a of actors) if (a.kind === 'crawler' || a.kind === 'colossus') creature(a);
      for (const id of gaitOf.keys()) if (!actors.some(a => a.id === id)) gaitOf.delete(id);
      if (boss && boss.phase2 && !low) for (let i = 0; i < 6; i++) { const a = i * 1.05 + time * 1.3, u = (time * .7 + i / 6) % 1; glow.add(boss.x + Math.cos(a) * .7, boss.y + u * 2.6, boss.z + Math.sin(a) * .7, .25, .5, 1, .03, .06, (1 - u) * .7, 0); }
      for (const k in kit) { const p = kit[k]; p.m.count = p.n; p.m.instanceMatrix.needsUpdate = true; p.m.geometry.attributes.aTint.needsUpdate = true; }
      for (const st of spikeSets) { st.m.count = st.n; st.m.instanceMatrix.needsUpdate = true; }
      shards.count = sn; shards.instanceMatrix.needsUpdate = true; plates.count = pn; plates.instanceMatrix.needsUpdate = true; rings.count = rn; rings.instanceMatrix.needsUpdate = true;
      extinction.end(); glow.end(); rib.end(); decals.end(time); rupture.end(); return extinction.info;
    },
    /** pedido de câmera da Ruptura (abrir o plano/olhar para cima durante a carga) — o jogo decide se usa */
    get throneHint() { return rupture.camHint; }, get throneTint() { return rupture.tint; },
    clear() { rupture.clear(); extinction.clear(); ent.visible = false; for (const k in kit) kit[k].m.count = 0; for (const st of spikeSets) st.m.count = 0; shards.count = plates.count = rings.count = 0; gaitOf.clear(); },
    dispose() { scene.remove(root); rupture.dispose(); extinction.dispose(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); glow.dispose(); rib.dispose(); decals.dispose(); }
  };
}
