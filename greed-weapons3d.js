/**
 * MISSÃO 21/11 — ARSENAL DA GANÂNCIA (ref. do criador 1000366131.jpg): quatro armas ORIGINAIS e procedurais, uma
 * identidade cada — nada de cone + cilindro + brilho genérico.
 *  A · Foice do Cosmo Faminto — lâmina-crescente de céu estrelado violeta com um buraco negro no meio, gume lavanda,
 *      haste negra/ouro gótica com espinhos e corrente em hélice.
 *  B · Foice Sanguínea — lâmina carmesim de veias vivas, caveira no alvado, correntes pendentes com pingentes, panos
 *      vermelhos rasgados.
 *  C · Lança Solar — haste dourada com chama branca em espiral, ponta-folha branco-dourada e disco de sol raiado
 *      com núcleo incandescente.
 *  D · Picareta Gêmea (lâmina híbrida) — cabeça dupla em crescente (violeta de um lado, carmesim do outro) sobre guarda
 *      gótica dourada com gema rubra, correntes e fita vermelha.
 * Eixo local: +Y = haste rumo à cabeça; origem = punho; +X = lado da lâmina principal; Z = normal da face.
 * userData: kind, key, len, tipA/tipB (rastro), tip, edges (traço de dano local), style (rastro), updateFx(time,k,low),
 * charge(k), dispose(). Peças fundidas por material (≤ 7 draws por arma), sem luz dinâmica, sem alocação por quadro.
 */
const NOISE = `float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}`;
const BV = 'varying vec3 vL,vN,vW;void main(){vL=position;vN=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const BLADE_F = {
  cosmic: `uniform float time,k;uniform vec2 hole;varying vec3 vL,vN,vW;${NOISE}
void main(){vec2 p=vL.xy;float neb=n2(p*5.+time*.08)*.6+n2(p*13.-time*.05)*.4;vec3 c=mix(vec3(.04,.0,.1),vec3(.32,.08,.62),neb);c=mix(c,vec3(.16,.1,.62),smoothstep(.6,.85,n2(p*3.1+7.))*.6);
vec2 g=floor(p*42.);float st=step(.985,h21(g))*smoothstep(.5,.0,length(fract(p*42.)-.5))*(.6+.4*sin(time*3.+h21(g)*20.));c+=vec3(.95,.9,1.)*st*1.6;
float d=length(p-hole),a=atan(p.y-hole.y,p.x-hole.x);float sw=.5+.5*sin(a*3.-time*2.5+d*60.);float ring=smoothstep(.04,.0,abs(d-.075))*(.45+.55*sw);c=mix(c,vec3(.01,0.,.02),smoothstep(.068,.045,d));c+=vec3(.62,.3,1.)*ring*1.2+vec3(.35,.12,.7)*smoothstep(.16,.07,d)*sw*.5;
c+=vec3(.6,.4,1.)*pow(1.-abs(dot(normalize(vN),vec3(0,0,1))),2.)*.4;gl_FragColor=vec4(c*(1.+k*.8),1.);}`,
  blood: `uniform float time,k;uniform vec2 hole;varying vec3 vL,vN,vW;${NOISE}
void main(){vec2 p=vL.xy;float v=abs(n2(p*9.)-.5)*2.,v2=abs(n2(p*21.+3.)-.5)*2.;float vein=smoothstep(.08,.0,v)*.9+smoothstep(.06,.0,v2)*.5;float pulse=.6+.4*sin(time*2.2+p.x*6.);
vec3 c=mix(vec3(.22,.0,.02),vec3(.62,.02,.05),n2(p*4.+time*.05));c+=vec3(1.,.18,.1)*vein*pulse*(.8+k);c=mix(c,vec3(.05,0.,.01),smoothstep(.55,.85,n2(p*6.-1.))*.5);
gl_FragColor=vec4(c*(1.+k*.6),1.);}`,
  solar: `uniform float time,k;uniform vec2 hole;varying vec3 vL,vN,vW;${NOISE}
void main(){vec2 p=vL.xy;float f=n2(p*vec2(6.,14.)-vec2(0.,time*1.6))*.6+n2(p*vec2(14.,30.)-vec2(0.,time*3.))*.4;vec3 c=mix(vec3(1.,.62,.12),vec3(1.,.95,.75),f);
c=mix(c,vec3(1.),smoothstep(.15,.0,abs(p.x))*.7);gl_FragColor=vec4(c*(1.15+k*.9),1.);}`
};
function mergeStatic(T, root, keep = new Set()) {
  const groups = new Map(); root.updateMatrixWorld(true);
  for (const m of [...root.children]) { if (!m.isMesh || keep.has(m)) continue; (groups.get(m.material) || groups.set(m.material, []).get(m.material)).push(m); }
  for (const [mat, list] of groups) {
    const parts = list.map(m => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrix); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
    for (const m of list) { root.remove(m); m.geometry.dispose(); } const mm = new T.Mesh(geo, mat); mm.name = list[0].name || 'Arma'; root.add(mm);
  }
}
const lerp = (a, b, k) => a + (b - a) * k;
function kit(T, root) {
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); root.add(m); return m; };
  const tube = (pts, r, mat, seg = 24, rs = 6) => add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg, r, rs, false), mat);
  const ext = (shape, depth, mat, bevel = .008, z = 0) => add(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 }), mat, 0, 0, z - depth / 2);
  const chainLine = (pts, mat, n) => { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))); for (let i = 0; i < n; i++) { const p = c.getPoint(i / (n - 1)), t = c.getTangent(i / (n - 1)), m = add(new T.TorusGeometry(.018, .006, 4, 8), mat, p.x, p.y, p.z); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), t); if (i % 2) m.rotateOnAxis(new T.Vector3(0, 1, 0), Math.PI / 2); } };
  const rag = (x, y, z, len, w, mat, sway = .08) => { const g = new T.PlaneGeometry(w, len, 2, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i), k = (len / 2 - yy) / len; p.setX(i, p.getX(i) * (1 - k * .5) + Math.sin(k * 5) * sway * k); p.setZ(i, Math.sin(k * 7 + p.getX(i) * 20) * .02 * k); if (k > .8 && i % 3 === 0) p.setY(i, yy - .04); } g.translate(0, -len / 2, 0); g.computeVertexNormals(); return add(g, mat, x, y, z); };
  return { add, tube, ext, chainLine, rag };
}
/** Crescente de foice no plano XY: lombada → ponta → gume côncavo, projetada para +X e caindo. Retorna shape + amostras. */
function crescent(T, head, reach, drop, thick = .2, teeth = true, flip = 1) {
  const spine = [], edge = [], s = new T.Shape();
  for (let i = 0; i <= 16; i++) { const k = i / 16; spine.push([flip * (.05 + reach * k), head + thick * .7 + Math.sin(k * Math.PI * .9) * thick - k * k * drop]); }
  for (let i = 16; i >= 0; i--) { const k = i / 16; edge.push([flip * (.06 + (reach - .04) * k), head - thick * .55 + Math.sin(k * Math.PI * .8) * thick * .3 - k * k * (drop - .1) - (k > .88 ? (k - .88) * 1.4 : 0)]); }
  s.moveTo(...spine[0]); spine.forEach(([x, y], i) => { if (teeth && i && i < 15 && i % 3 === 0) s.lineTo(x - flip * .025, y + .06 * (1 - i / 16)); s.lineTo(x, y); });
  const tip = [flip * (reach + .1), head - drop - .12]; s.lineTo(...tip); edge.forEach(p => s.lineTo(...p)); s.closePath();
  return { s, spine, edge, tip };
}
/** Fio claro ao longo do gume côncavo (base → ponta, faixa fina), nas duas faces. */
function edgeBand(T, c, mat, ext) { const E = [...c.edge].reverse(), s = new T.Shape(); s.moveTo(E[0][0], E[0][1] - .004); for (const [x, y] of E) s.lineTo(x, y - .004); s.lineTo(c.tip[0], c.tip[1]); for (let i = E.length - 1; i >= 0; i--) s.lineTo(E[i][0], E[i][1] + .014); s.closePath(); ext(s, .04, mat, 0); }
function bladeMat(T, kind, hole = [0, 0]) { return new T.ShaderMaterial({ uniforms: { time: { value: 0 }, k: { value: 0 }, hole: { value: new T.Vector2(...hole) } }, vertexShader: BV, fragmentShader: BLADE_F[kind], side: T.DoubleSide }); }

/* ---------------- A · Foice do Cosmo Faminto ---------------- */
export function buildCosmicScythe(T, { quality = 1 } = {}) {
  const root = new T.Group(); root.name = 'GananciaFoiceCosmica';
  const gold = new T.MeshStandardMaterial({ color: 0x8a6a2a, metalness: .9, roughness: .3, emissive: 0x2a1604, emissiveIntensity: .5 });
  const dark = new T.MeshStandardMaterial({ color: 0x15101c, metalness: .7, roughness: .45, emissive: 0x0c0418, emissiveIntensity: .5 });
  const edgeM = new T.MeshBasicMaterial({ color: 0xc8b0ff, toneMapped: false }), glowM = new T.MeshBasicMaterial({ color: 0x9a6bff, toneMapped: false });
  const { add, tube, ext, chainLine } = kit(T, root), H = 1.42, R = 1.05, DROP = .78;
  const c = crescent(T, H, R, DROP, .22); const blade = bladeMat(T, 'cosmic', [.55, H - .18]);
  ext(c.s, .034, blade, .01); // lâmina de céu estrelado (as duas faces)
  edgeBand(T, c, edgeM, ext);
  // haste: núcleo negro + corrente dourada em hélice + anéis góticos
  tube([[0, -.58, 0], [.02, .1, 0], [-.01, .8, .01], [0, H + .12, 0]], .028, dark, 30);
  { const pts = []; for (let i = 0; i <= 70; i++) { const k = i / 70, y = lerp(-.45, H - .05, k), a = k * 13 * Math.PI; pts.push([Math.cos(a) * .036, y, Math.sin(a) * .036]); } tube(pts, .008, gold, 140, 4); }
  for (const y of [-.5, -.05, .55, 1.15]) { add(new T.CylinderGeometry(.045, .045, .05, 8), gold, 0, y); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; add(new T.ConeGeometry(.012, .07, 4), gold, Math.cos(a) * .05, y, Math.sin(a) * .05, 0, 0, -Math.PI / 2).rotation.y = -a; } }
  // alvado gótico: coroa de espinhos e garra dourada abraçando a lâmina
  add(new T.CylinderGeometry(.07, .085, .28, 8), gold, 0, H - .02);
  for (const [x, y, r, s] of [[-.1, H + .12, .8, .22], [-.14, H - .06, 1.3, .26], [-.04, H + .24, .35, .2], [.02, H + .32, 0, .26], [.16, H + .22, -.5, .16], [-.12, H + .3, .6, .14]]) add(new T.ConeGeometry(.026, s, 5), gold, x, y, 0, 0, 0, r);
  { const s = new T.Shape(); s.moveTo(.04, H + .12); s.quadraticCurveTo(.3, H + .22, .45, H + .05); s.quadraticCurveTo(.28, H + .1, .08, H - .04); s.closePath(); ext(s, .05, gold, .008); }
  // orbes violetas e espiral gravitacional na base da lâmina
  for (const z of [.045, -.045]) add(new T.SphereGeometry(.028, 8, 6), glowM, .12, H + .02, z);
  chainLine([[-.02, H - .2, .05], [.12, H - .45, .09], [.06, H - .7, .05]], gold, 9);
  add(new T.ConeGeometry(.03, .22, 5), gold, 0, -.66, 0, Math.PI);
  mergeStatic(T, root);
  const tip = new T.Vector3(...c.tip, 0);
  return fin(T, root, { kind: 'scythe', key: 'A', style: 'greedCosmic', len: H + .3, tip, tipA: new T.Vector3(.14, H - .1, 0), tipB: tip.clone(),
    edges: [[[.08, H - .1, 0], [.6, H - .3, 0]], [[.6, H - .3, 0], tip.toArray()], [[0, .6, 0], [0, H + .1, 0]]], mats: [gold, dark, edgeM, glowM, blade], blade, glow: glowM, edgeM, tint: 0x9a6bff });
}
/* ---------------- B · Foice Sanguínea ---------------- */
export function buildBloodScythe(T, { quality = 1 } = {}) {
  const root = new T.Group(); root.name = 'GananciaFoiceSanguinea';
  const iron = new T.MeshStandardMaterial({ color: 0x2a1410, metalness: .85, roughness: .4, emissive: 0x200402, emissiveIntensity: .5 });
  const bone = new T.MeshStandardMaterial({ color: 0xcdbca0, metalness: .1, roughness: .7, emissive: 0x1a0c06, emissiveIntensity: .3 });
  const cloth = new T.MeshStandardMaterial({ color: 0x8a0a12, roughness: .9, side: T.DoubleSide, emissive: 0x2a0004, emissiveIntensity: .5 });
  const edgeM = new T.MeshBasicMaterial({ color: 0xff9a8a, toneMapped: false }), eyeM = new T.MeshBasicMaterial({ color: 0xff2a10, toneMapped: false });
  const { add, tube, ext, chainLine, rag } = kit(T, root), H = 1.4, R = 1.0, DROP = .82;
  const c = crescent(T, H, R, DROP, .24); const blade = bladeMat(T, 'blood');
  ext(c.s, .034, blade, .012);
  edgeBand(T, c, edgeM, ext);
  // lombada serrilhada em osso/ferro (rasgos na lâmina)
  for (let i = 2; i < 15; i += 2) { const [x, y] = c.spine[i]; add(new T.ConeGeometry(.02, .1, 4), iron, x, y + .03, 0, 0, 0, -.4 - i * .05); }
  // haste de ferro retorcido enrolada em corrente
  tube([[0, -.6, 0], [-.02, .2, .01], [.01, .9, 0], [0, H + .1, 0]], .03, iron, 30);
  chainLine(Array.from({ length: 9 }, (_, i) => { const y = lerp(-.4, H - .2, i / 8), a = i * 1.3; return [Math.cos(a) * .045, y, Math.sin(a) * .045]; }), iron, 42);
  add(new T.CylinderGeometry(.075, .09, .3, 8), iron, 0, H - .02);
  // CAVEIRA no alvado (crânio, maxilar, órbitas acesas)
  { const sk = add(new T.SphereGeometry(.11, 14, 10), bone, .0, H + .1, .0); sk.scale.set(1, .92, 1.05); add(new T.BoxGeometry(.13, .06, .1), bone, 0, H + .01, .02);
    for (const x of [-.04, .04]) add(new T.SphereGeometry(.026, 8, 6), eyeM, x, H + .1, .095); add(new T.ConeGeometry(.016, .04, 3), iron, 0, H + .06, .105, Math.PI / 2);
    for (let i = 0; i < 6; i++) add(new T.BoxGeometry(.012, .022, .01), bone, -.035 + i * .014, H + .02, .07); }
  // correntes pendentes com pingentes e panos rasgados
  chainLine([[.1, H + .02, .06], [.25, H - .3, .09], [.2, H - .62, .07]], iron, 10); add(new T.ConeGeometry(.025, .09, 4), eyeM, .2, H - .68, .07, Math.PI);
  chainLine([[-.08, H, .05], [-.12, H - .28, .07], [-.1, H - .5, .05]], iron, 8); add(new T.OctahedronGeometry(.03), eyeM, -.1, H - .55, .05);
  rag(-.03, H - .12, .04, .55, .11, cloth, .1); rag(.04, H - .18, -.04, .42, .08, cloth, -.08);
  add(new T.ConeGeometry(.032, .22, 5), iron, 0, -.68, 0, Math.PI);
  mergeStatic(T, root);
  const tip = new T.Vector3(...c.tip, 0);
  return fin(T, root, { kind: 'scythe', key: 'B', style: 'greedBlood', len: H + .3, tip, tipA: new T.Vector3(.14, H - .1, 0), tipB: tip.clone(),
    edges: [[[.08, H - .1, 0], [.6, H - .3, 0]], [[.6, H - .3, 0], tip.toArray()], [[0, .6, 0], [0, H + .1, 0]]], mats: [iron, bone, cloth, edgeM, eyeM, blade], blade, glow: eyeM, edgeM, tint: 0xff2a1a });
}
/* ---------------- C · Lança Solar ---------------- */
export function buildSolarSpear(T, { quality = 1 } = {}) {
  const root = new T.Group(); root.name = 'GananciaLancaSolar';
  const gold = new T.MeshStandardMaterial({ color: 0xd8a640, metalness: .95, roughness: .22, emissive: 0x6a3a08, emissiveIntensity: .7 });
  const core = new T.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false });
  const flame = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { time: { value: 0 }, k: { value: .5 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float time,k;varying vec2 vUv;${NOISE}void main(){float f=n2(vec2(vUv.x*30.-time*4.,vUv.y*3.))*.7+n2(vec2(vUv.x*70.-time*7.,vUv.y*6.))*.3;float a=smoothstep(.15,.8,f)*k*1.3;if(a<.02)discard;gl_FragColor=vec4(mix(vec3(1.,.7,.25),vec3(1.,1.,.95),f)*a*1.4,a);}` });
  const { add, tube, ext } = kit(T, root), TOP = 1.55;
  tube([[0, -.75, 0], [0, .2, 0], [0, TOP - .2, 0]], .026, gold, 12, 8);
  // chama branca em espiral ao longo da haste (fita aditiva)
  { const pts = []; for (let i = 0; i <= 60; i++) { const k = i / 60, a = k * 9 * Math.PI, y = lerp(-.55, TOP - .3, k), r = .055 + .02 * Math.sin(k * 20); pts.push(new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, .03, 4, false); add(g, flame); }
  for (const y of [-.7, -.2, .5, TOP - .3]) add(new T.TorusGeometry(.04, .01, 5, 12), gold, 0, y, 0, Math.PI / 2);
  // disco de SOL raiado atrás da ponta + núcleo incandescente
  const sunY = TOP - .05; add(new T.TorusGeometry(.17, .022, 6, 28), gold, 0, sunY, 0); add(new T.TorusGeometry(.11, .012, 6, 24), gold, 0, sunY, 0);
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, L = i % 2 ? .12 : .26; add(new T.ConeGeometry(i % 2 ? .016 : .024, L, 4), gold, Math.cos(a) * (.18 + L / 2), sunY + Math.sin(a) * (.18 + L / 2), 0, 0, 0, a - Math.PI / 2); }
  add(new T.SphereGeometry(.09, 16, 12), core, 0, sunY, 0);
  // ponta-folha longa e asas laterais da ponta
  { const s = new T.Shape(); s.moveTo(0, sunY + .12); s.quadraticCurveTo(.16, sunY + .34, .03, sunY + .74); s.lineTo(0, sunY + .78); s.lineTo(-.03, sunY + .74); s.quadraticCurveTo(-.16, sunY + .34, 0, sunY + .12); ext(s, .026, gold, .01);
    const s2 = new T.Shape(); s2.moveTo(0, sunY + .16); s2.quadraticCurveTo(.05, sunY + .32, .008, sunY + .66); s2.lineTo(-.008, sunY + .66); s2.quadraticCurveTo(-.05, sunY + .32, 0, sunY + .16); ext(s2, .03, core, 0); }
  for (const f of [1, -1]) { const s = new T.Shape(); s.moveTo(0, sunY - .1); s.quadraticCurveTo(f * .2, sunY - .02, f * .26, sunY + .2); s.quadraticCurveTo(f * .12, sunY - .02, 0, sunY - .02); ext(s, .02, gold, .006); }
  add(new T.ConeGeometry(.03, .2, 6), gold, 0, -.84, 0, Math.PI); add(new T.SphereGeometry(.035, 8, 6), core, 0, -.72, 0);
  mergeStatic(T, root);
  const tip = new T.Vector3(0, sunY + .78, 0);
  return fin(T, root, { kind: 'spear', key: 'C', style: 'greedSolar', len: TOP + .9, tip, tipA: new T.Vector3(0, sunY, 0), tipB: tip.clone(),
    edges: [[[0, sunY, 0], tip.toArray()], [[0, .4, 0], [0, sunY, 0]]], mats: [gold, core, flame], blade: flame, glow: core, edgeM: core, tint: 0xffc23a });
}
/* ---------------- D · Picareta Gêmea (lâmina híbrida) ---------------- */
export function buildTwinPick(T, { quality = 1 } = {}) {
  const root = new T.Group(); root.name = 'GananciaPicaretaGemea';
  const gold = new T.MeshStandardMaterial({ color: 0x9a6a28, metalness: .92, roughness: .28, emissive: 0x2a1204, emissiveIntensity: .6 });
  const dark = new T.MeshStandardMaterial({ color: 0x1a0c10, metalness: .75, roughness: .4, emissive: 0x100206, emissiveIntensity: .5 });
  const cloth = new T.MeshStandardMaterial({ color: 0x9a0c14, roughness: .9, side: T.DoubleSide, emissive: 0x2a0004, emissiveIntensity: .4 });
  const gem = new T.MeshBasicMaterial({ color: 0xff2030, toneMapped: false }), edgeM = new T.MeshBasicMaterial({ color: 0xffe2c0, toneMapped: false });
  const { add, tube, ext, chainLine, rag } = kit(T, root), H = 1.12;
  const cos = bladeMat(T, 'cosmic', [-.4, H - .05]), blood = bladeMat(T, 'blood');
  const cR = crescent(T, H, .72, .5, .2, true, 1), cL = crescent(T, H, .66, .44, .19, true, -1);
  ext(cR.s, .03, blood, .01); ext(cL.s, .03, cos, .01);
  for (const c of [cR, cL]) edgeBand(T, c, edgeM, ext);
  // haste negra com faixas douradas e corrente
  tube([[0, -.55, 0], [.01, .3, 0], [0, H + .05, 0]], .03, dark, 16);
  for (const y of [-.45, 0, .45, .85]) add(new T.TorusGeometry(.036, .012, 5, 10), gold, 0, y, 0, Math.PI / 2);
  // guarda gótica (cruz de espinhos) com gema rubra no centro e ponta de lança acima
  add(new T.BoxGeometry(.12, .3, .07), gold, 0, H, 0); add(new T.OctahedronGeometry(.045), gem, 0, H, .045);
  for (const [x, y, r, s] of [[0, H + .28, 0, .3], [.09, H + .16, -.6, .18], [-.09, H + .16, .6, .18], [.07, H - .18, -2.4, .16], [-.07, H - .18, 2.4, .16]]) add(new T.ConeGeometry(.025, s, 5), gold, x, y, 0, 0, 0, r);
  chainLine([[.05, H - .12, .05], [.1, H - .4, .07], [.05, H - .62, .05]], gold, 9); rag(-.04, H - .1, .045, .5, .09, cloth, .09);
  add(new T.ConeGeometry(.03, .18, 5), gold, 0, -.64, 0, Math.PI);
  mergeStatic(T, root);
  const tip = new T.Vector3(...cR.tip, 0), tip2 = new T.Vector3(...cL.tip, 0);
  return fin(T, root, { kind: 'pick', key: 'D', style: 'greedHybrid', len: H + .4, tip, tipA: new T.Vector3(0, H + .3, 0), tipB: tip.clone(), tip2,
    edges: [[[.06, H - .1, 0], tip.toArray()], [[-.06, H - .1, 0], tip2.toArray()], [[0, .5, 0], [0, H + .3, 0]]], mats: [gold, dark, cloth, gem, edgeM, cos, blood], blade: cos, blade2: blood, glow: gem, edgeM, tint: 0xd8a040 });
}
function fin(T, root, o) {
  let charge = 0; const blades = [o.blade, o.blade2].filter(Boolean);
  root.traverse(m => { if (m.isMesh) { m.frustumCulled = false; if (m.material.transparent) m.renderOrder = 8; } });
  root.userData = { kind: o.kind, key: o.key, style: o.style, len: o.len, tip: o.tip, tipA: o.tipA, tipB: o.tipB, tip2: o.tip2 || null, edges: o.edges, tint: o.tint,
    charge(k) { charge = Math.max(0, Math.min(1, k)); },
    updateFx(time, k = 0, low = false) { for (const b of blades) { b.uniforms.time.value = time; b.uniforms.k.value = Math.max(charge, k); } if (o.edgeM && o.edgeM.color) { const f = .85 + .15 * Math.sin(time * 6) + charge * .4; o.edgeM.color.setHex(o.edgeM === o.glow ? 0xfff2c0 : 0xffffff).multiplyScalar(Math.min(1.4, f)); } },
    dispose() { root.traverse(m => { if (m.geometry) m.geometry.dispose(); }); for (const m of o.mats) m.dispose(); } };
  return root;
}
/** As quatro armas (uma instância de cada — a arma nunca existe em dois lugares ao mesmo tempo). */
export function buildGreedArsenal(T, opts) { return { A: buildCosmicScythe(T, opts), B: buildBloodScythe(T, opts), C: buildSolarSpear(T, opts), D: buildTwinPick(T, opts) }; }
