/**
 * MISSÃO 20/11 — AS DUAS ESPADAS DE VÉRAXION (Bispo 4), malhas 3D ORIGINAIS e procedurais a partir das referências do
 * criador (nada extraído de asset de terceiros; nenhuma imagem plana/billboard):
 *  A · ROSÁRIO CARMESIM (mão direita): lâmina longa assimétrica perolada-rosa de bordas onduladas e farpadas, sulco
 *      carmesim com olhos vermelhos de pupila em fenda; guarda dourada com olho central, ganchos em crescente, ASAS DE
 *      QUERUBIM de penas, correntes com cruzes; cabo vinho com vinha dourada de espinhos; pomo em mitra com coroa de
 *      espinhos; fitas de tecido branco danificado com cruz rubra; pequenas flores rosadas.
 *  B · ABISMO VORAZ (mão esquerda): lâmina negra de gumes prateados e sulco violeta com dentes de osso; guarda em
 *      MANDÍBULA ABERTA com fileiras de dentes, garganta violeta, vários olhos roxos e chifres em gancho; panos vinho com
 *      cruzes douradas e correntes; pomo em anel de espinhos com estrela-cruz e gema roxa; fumaça violeta por shader.
 * Eixo local: +Y = ponta; origem = pega (mão); +X = gume; Z = normal da face. Metros do jogo (chefe ~2,2 m).
 * userData: tipA/tipB (base/ponta da lâmina), edges (traço de dano), tip, fx, tick, updateFx(time,phase,low,visible),
 * charge(k), dispose(). Peças fundidas por material (≤ 9 chamadas por espada), sem luz dinâmica.
 */
export const VX_SWORDS = Object.freeze({ A: { blade: 1.14, guard: .1 }, B: { blade: 1.02, guard: .12 } });

function mergeStatic(T, root, keep = new Set()) {
  const groups = new Map(); root.updateMatrixWorld(true);
  const all = []; root.traverse(o => { if (o.isMesh && !keep.has(o)) all.push(o); });
  // cores chapadas (olhos, pétalas, pistilos) viram UM material com cor por vértice: menos chamadas de desenho
  const vc = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, toneMapped: false, name: 'detalhes' });
  for (const m of all) if (m.material.userData.bake) { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, n = g.attributes.position.count, c = new Float32Array(n * 3), col = m.material.color; for (let i = 0; i < n; i++) col.toArray(c, i * 3); g.setAttribute('color', new T.BufferAttribute(c, 3)); m.geometry = g; m.material = vc; }
  for (const m of all) (groups.get(m.material) || groups.set(m.material, []).get(m.material)).push(m);
  for (const [mat, list] of groups) {
    const parts = list.map(m => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
    if (list[0].geometry.attributes.color) { const cc = new Float32Array(n * 3); let q = 0; for (const m of list) { cc.set(m.geometry.attributes.color.array, q * 3); q += m.geometry.attributes.position.count; } geo.setAttribute('color', new T.BufferAttribute(cc, 3)); }
    for (const m of list) { m.parent.remove(m); m.geometry.dispose(); } const mm = new T.Mesh(geo, mat); mm.name = mat.name || 'Espada'; root.add(mm);
  }
  for (const c of [...root.children]) if (c.isGroup && !c.children.length) root.remove(c);
}
const flameMat = (T, c1, c2) => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { time: { value: 0 }, k: { value: .4 } },
  vertexShader: 'varying vec2 vUv;uniform float time;void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*8.+time*3.+position.y*4.)*.03*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
  fragmentShader: `uniform float time,k;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    void main(){vec2 u=vUv;float x=abs(u.x-.5)*2.;float fl=n(vec2(u.x*3.,u.y*2.5-time*1.4))*.6+n(vec2(u.x*7.,u.y*6.-time*2.6))*.4;float a=smoothstep(1.,.1,x+u.y*.6-fl*.6)*(1.-u.y)*smoothstep(0.,.15,u.y)*k;if(a<.02)discard;gl_FragColor=vec4(mix(vec3(${c1}),vec3(${c2}),a)*1.2,min(1.,a));}` });

/* ---------- peças compartilhadas ---------- */
function almond(T, w = 1, h = .45) { const s = new T.Shape(); s.moveTo(-w, 0); s.quadraticCurveTo(0, h * 2, w, 0); s.quadraticCurveTo(0, -h * 2, -w, 0); return s; }
function eye(T, add, M, x, y, z, r, rot = 0, faces = [1, -1]) { // olho em amêndoa com íris luminosa e pupila em fenda, nas duas faces
  for (const f of faces) { const e = add(new T.ShapeGeometry(almond(T, r, r * .5), 10), M.eyeWhite, x, y, z * f + .002 * f); e.rotation.z = rot; if (f < 0) e.rotation.y = Math.PI;
    const i = add(new T.CircleGeometry(r * .55, 14), M.iris, x, y, z * f + .004 * f); if (f < 0) i.rotation.y = Math.PI;
    const p = add(new T.ShapeGeometry(almond(T, r * .12, r * .9), 6), M.pupil, x, y, z * f + .006 * f); p.rotation.z = rot + Math.PI / 2; if (f < 0) p.rotation.y = Math.PI; }
}
function cross(T, add, mat, x, y, z, s) { add(new T.BoxGeometry(.012 * s, .07 * s, .01 * s), mat, x, y, z); add(new T.BoxGeometry(.045 * s, .012 * s, .01 * s), mat, x, y + .012 * s, z); }
function chain(T, add, mat, x, y, z, n, crossMat) { for (let i = 0; i < n; i++) { const t = add(new T.TorusGeometry(.011, .003, 4, 8), mat, x, y - i * .02, z); t.rotation.y = i % 2 ? Math.PI / 2 : 0; } if (crossMat) cross(T, add, crossMat, x, y - n * .02 - .04, z, 1); }
function flower(T, add, M, x, y, z, s, rot = 0) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + rot, p = add(new T.CircleGeometry(.014 * s, 7), M.petal, x + Math.cos(a) * .014 * s, y + Math.sin(a) * .014 * s, z); p.scale.set(1, 1.5, 1); p.rotation.z = a - Math.PI / 2; }
  add(new T.CircleGeometry(.007 * s, 6), M.pistil, x, y, z + .001); }
function ribbon(T, add, mat, x, y, z, len, w, sway) { const g = new T.PlaneGeometry(w, len, 1, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i), u = (len / 2 - yy) / len; p.setXYZ(i, p.getX(i) + Math.sin(u * 3) * sway * u, yy - len / 2, Math.sin(u * 4.5) * .03 * u); } g.computeVertexNormals(); return add(g, mat, x, y, z); }

export function buildRosarySword(T, { quality = 1 } = {}) {
  const A = VX_SWORDS.A, root = new T.Group(); root.name = 'VeraxionRosarioCarmesim'; const G = new T.Group(); root.add(G);
  const M = { pearl: new T.MeshStandardMaterial({ color: 0xf0d3d8, metalness: .45, roughness: .32, emissive: 0x3a0a14, emissiveIntensity: .35, name: 'perola' }),
    gold: new T.MeshStandardMaterial({ color: 0xc89a52, metalness: .9, roughness: .3, emissive: 0x2a1404, emissiveIntensity: .4, name: 'ouro' }),
    crimson: new T.MeshStandardMaterial({ color: 0x7a0a1c, metalness: .3, roughness: .45, emissive: 0x8a0a1e, emissiveIntensity: .8, name: 'sulco' }),
    wine: new T.MeshStandardMaterial({ color: 0x4a0a16, metalness: .2, roughness: .6, name: 'cabo' }),
    feather: new T.MeshStandardMaterial({ color: 0xf6e4ea, metalness: .05, roughness: .7, side: T.DoubleSide, emissive: 0x2a0a10, emissiveIntensity: .25, name: 'penas' }),
    cloth: new T.MeshStandardMaterial({ color: 0xece4e2, roughness: .9, side: T.DoubleSide, name: 'tecido' }),
    eyeWhite: new T.MeshBasicMaterial({ color: 0xff3048, toneMapped: false, name: 'olho' }), iris: new T.MeshBasicMaterial({ color: 0xffd0d6, toneMapped: false, name: 'iris' }), pupil: new T.MeshBasicMaterial({ color: 0x120006, name: 'pupila' }),
    petal: new T.MeshBasicMaterial({ color: 0xffa8c8, side: T.DoubleSide, name: 'petala' }), pistil: new T.MeshBasicMaterial({ color: 0xffe08a, name: 'pistilo' }) };
  M.eyeWhite.side = M.iris.side = M.pupil.side = T.DoubleSide; for (const k of ['eyeWhite', 'iris', 'pupil', 'petal', 'pistil']) M[k].userData.bake = true;
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  const B = A.blade, g0 = A.guard;
  // lâmina: borda esquerda farpada, direita ondulada, ponta longa
  const bl = new T.Shape(); bl.moveTo(-.055, g0);
  for (let i = 1; i <= 9; i++) { const u = i / 10, y = g0 + B * u, w = .06 * (1 - u * .85); bl.lineTo(-w - (i % 2 ? .022 * (1 - u) : 0), y - (i % 2 ? .02 : 0)); }
  bl.lineTo(0, g0 + B); for (let i = 9; i >= 1; i--) { const u = i / 10, y = g0 + B * u, w = .055 * (1 - u * .85) + Math.sin(u * 19) * .008; bl.lineTo(w, y); } bl.lineTo(.055, g0); bl.closePath();
  add(new T.ExtrudeGeometry(bl, { depth: .016, bevelEnabled: true, bevelThickness: .007, bevelSize: .008, bevelSegments: 1 }), M.pearl, 0, 0, -.008);
  const fu = new T.Shape(); fu.moveTo(-.018, g0 + .04); fu.quadraticCurveTo(-.03, g0 + B * .5, 0, g0 + B * .9); fu.quadraticCurveTo(.03, g0 + B * .5, .018, g0 + .04); fu.closePath();
  for (const z of [.0165, -.0165]) add(new T.ShapeGeometry(fu, 10), M.crimson, 0, 0, z);
  for (const [y, r] of [[g0 + .2, .026], [g0 + .42, .021], [g0 + .62, .017], [g0 + .8, .013]]) eye(T, add, M, 0, y, .018, r, Math.PI / 2);
  // guarda: disco com olho central, braços dourados com ganchos em crescente
  add(new T.CylinderGeometry(.055, .055, .04, 14), M.gold, 0, g0 - .01, 0).rotation.x = Math.PI / 2; eye(T, add, M, 0, g0 - .01, .022, .038);
  for (const sx of [1, -1]) { const arm = add(new T.CylinderGeometry(.012, .018, .2, 6), M.gold, sx * .14, g0 - .005, 0); arm.rotation.z = Math.PI / 2;
    const hook = new T.Shape(); hook.moveTo(0, 0); hook.quadraticCurveTo(.06 * sx, .02, .07 * sx, .11); hook.quadraticCurveTo(.035 * sx, .04, 0, .02); hook.closePath();
    add(new T.ExtrudeGeometry(hook, { depth: .012, bevelEnabled: false }), M.gold, sx * .22, g0, -.006); eye(T, add, M, sx * .13, g0 - .005, .02, .014);
    // asas de querubim: penas em leque para baixo-fora
    for (let k = 0; k < (quality ? 7 : 4); k++) { const f = new T.Shape(), L = .16 - k * .012; f.moveTo(0, 0); f.quadraticCurveTo(.022, -L * .45, 0, -L); f.quadraticCurveTo(-.016, -L * .5, 0, 0);
      const m = add(new T.ShapeGeometry(f, 6), M.feather, sx * (.06 + k * .022), g0 - .02, .012 - k * .003); m.rotation.z = sx * (.35 + k * .13); }
    chain(T, add, M.gold, sx * .24, g0 - .02, 0, quality ? 4 : 2, M.gold); }
  // cabo com vinha dourada em espiral, pomo em mitra + coroa de espinhos, fitas
  add(new T.CylinderGeometry(.026, .03, .27, 10), M.wine, 0, -.09, 0);
  const vine = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * 14; vine.push(new T.Vector3(Math.cos(a) * .031, -.22 + u * .27, Math.sin(a) * .031)); }
  add(new T.TubeGeometry(new T.CatmullRomCurve3(vine), 60, .004, 4, false), M.gold);
  add(new T.CylinderGeometry(.04, .03, .04, 8), M.gold, 0, -.245, 0); add(new T.ConeGeometry(.032, .09, 8), M.gold, 0, -.31, 0).rotation.x = Math.PI; add(new T.SphereGeometry(.03, 10, 8), M.gold, 0, -.27, 0);
  eye(T, add, M, 0, -.27, .028, .011);
  const crown = add(new T.TorusGeometry(.075, .004, 5, 24), M.gold, 0, -.29, -.02); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = add(new T.ConeGeometry(.006, .045, 4), M.gold, Math.cos(a) * .095, -.29 + Math.sin(a) * .095, -.02); c.rotation.z = a - Math.PI / 2; }
  for (const sx of [1, -1]) { const r = ribbon(T, add, M.cloth, sx * .035, -.24, .02, .3, .045, sx * .05); r.rotation.z = sx * .2; cross(T, add, M.crimson, sx * .045, -.33, .028, .8); }
  // flores
  for (const [x, y, s] of [[.05, g0 + .03, 1.2], [-.07, g0 + .02, 1], [.03, g0 + .3, .8], [-.025, g0 + .55, .7], [0, -.02, .9]]) flower(T, add, M, x, y, .022, s, x * 9);
  const fm = flameMat(T, '.9,.15,.35', '1.,.75,.85'), flames = []; for (const [y, h] of [[g0 + .3, .5], [g0 + .7, .4]]) for (const ry of [0, Math.PI / 2]) { const f = new T.Mesh(new T.PlaneGeometry(.18, h, 1, 6), fm); f.position.set(0, y, 0); f.rotation.y = ry; root.add(f); flames.push(f); }
  mergeStatic(T, root, new Set(flames)); const fl = new T.Group(); for (const f of flames) { root.remove(f); fl.add(f); f.renderOrder = 9; } root.add(fl); fl.visible = !!quality;
  let charge = 0; const mats = Object.values(M);
  root.userData = { kind: 'rosary', fx: new T.Group(), tipA: new T.Vector3(0, g0 + .08, 0), tipB: new T.Vector3(0, g0 + B, 0), tip: new T.Vector3(0, g0 + B, 0), edges: [[[0, g0 + .05, 0], [0, g0 + B, 0]], [[-.06, g0 + .1, 0], [0, g0 + B * .8, 0]]],
    tick(time) { fm.uniforms.time.value = time; }, charge(k) { charge = Math.max(0, Math.min(1, k)); }, get charged() { return charge; },
    updateFx(time, phase, low) { fm.uniforms.time.value = time; fm.uniforms.k.value = (low ? .15 : .25) + charge * .8; M.crimson.emissiveIntensity = .8 + charge * 1.6 + .15 * Math.sin(time * 3); fl.visible = !low || charge > .1; },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const m of mats) m.dispose(); fm.dispose(); } };
  return root;
}

export function buildAbyssJawSword(T, { quality = 1 } = {}) {
  const S = VX_SWORDS.B, root = new T.Group(); root.name = 'VeraxionAbismoVoraz'; const G = new T.Group(); root.add(G);
  const M = { steel: new T.MeshStandardMaterial({ color: 0x2c2434, metalness: .85, roughness: .3, emissive: 0x12061c, emissiveIntensity: .5, name: 'aco' }),
    silver: new T.MeshStandardMaterial({ color: 0xcfc8dc, metalness: .95, roughness: .2, name: 'gume' }),
    groove: new T.MeshBasicMaterial({ color: 0x9a3cff, toneMapped: false, name: 'sulco' }),
    bone: new T.MeshStandardMaterial({ color: 0xe2d6c0, metalness: .1, roughness: .55, name: 'dentes' }),
    flesh: new T.MeshStandardMaterial({ color: 0x3a1438, metalness: .2, roughness: .5, emissive: 0x2a0838, emissiveIntensity: .6, name: 'mandibula' }),
    throat: new T.MeshBasicMaterial({ color: 0xb04cff, toneMapped: false, side: T.DoubleSide, name: 'garganta' }),
    gold: new T.MeshStandardMaterial({ color: 0xb8904c, metalness: .9, roughness: .35, name: 'ouro' }),
    cloth: new T.MeshStandardMaterial({ color: 0x5a1426, roughness: .85, side: T.DoubleSide, name: 'pano' }),
    eyeWhite: new T.MeshBasicMaterial({ color: 0xc040ff, toneMapped: false, side: T.DoubleSide, name: 'olho' }), iris: new T.MeshBasicMaterial({ color: 0xf0c8ff, toneMapped: false, side: T.DoubleSide, name: 'iris' }), pupil: new T.MeshBasicMaterial({ color: 0x0a0010, side: T.DoubleSide, name: 'pupila' }),
    grip: new T.MeshStandardMaterial({ color: 0x241628, roughness: .7, name: 'cabo' }) };
  for (const k of ['eyeWhite', 'iris', 'pupil']) M[k].userData.bake = true;
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  const B = S.blade, g0 = S.guard + .06;
  // lâmina negra com gumes prateados e sulco violeta ladeado de dentes de osso
  const bl = new T.Shape(); bl.moveTo(-.06, g0); bl.lineTo(-.05, g0 + B * .55); bl.lineTo(-.03, g0 + B * .86); bl.lineTo(0, g0 + B); bl.lineTo(.03, g0 + B * .86); bl.lineTo(.05, g0 + B * .55); bl.lineTo(.06, g0); bl.closePath();
  add(new T.ExtrudeGeometry(bl, { depth: .018, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1 }), M.steel, 0, 0, -.009);
  for (const sx of [1, -1]) { const e = new T.Shape(); e.moveTo(sx * .06, g0); e.lineTo(sx * .05, g0 + B * .55); e.lineTo(sx * .03, g0 + B * .86); e.lineTo(0, g0 + B + .01); e.lineTo(sx * .02, g0 + B * .86); e.lineTo(sx * .038, g0 + B * .55); e.lineTo(sx * .046, g0); e.closePath();
    add(new T.ExtrudeGeometry(e, { depth: .008, bevelEnabled: false }), M.silver, 0, 0, -.004); }
  for (const z of [.016, -.016]) { const gr = add(new T.PlaneGeometry(.012, B * .8), M.groove, 0, g0 + B * .42, z); if (z < 0) gr.rotation.y = Math.PI; }
  for (let i = 0; i < (quality ? 9 : 5); i++) { const y = g0 + .12 + i * .085; for (const sx of [1, -1]) for (const z of [.017, -.017]) { const t = add(new T.ConeGeometry(.007, .04, 4), M.bone, sx * .014, y, z); t.rotation.z = sx * -2.2; } }
  // guarda: mandíbula aberta com fileiras de dentes, garganta violeta e olhos roxos; chifres em gancho
  const head = new T.Shape(); head.moveTo(-.2, g0 - .03); head.quadraticCurveTo(-.12, g0 + .09, 0, g0 + .07); head.quadraticCurveTo(.12, g0 + .09, .2, g0 - .03); head.quadraticCurveTo(.1, g0 - .12, 0, g0 - .14); head.quadraticCurveTo(-.1, g0 - .12, -.2, g0 - .03);
  const mouth = new T.Path(); mouth.moveTo(-.1, g0 - .03); mouth.quadraticCurveTo(0, g0 + .045, .1, g0 - .03); mouth.quadraticCurveTo(0, g0 - .11, -.1, g0 - .03); head.holes.push(mouth);
  add(new T.ExtrudeGeometry(head, { depth: .06, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1, curveSegments: 8 }), M.flesh, 0, 0, -.03);
  add(new T.ShapeGeometry(new T.Shape(mouth.getPoints(16)), 8), M.throat, 0, 0, 0);
  for (let i = 0; i <= 10; i++) { const u = i / 10, x = -.095 + u * .19, yu = g0 - .03 + Math.sin(u * Math.PI) * .07, yl = g0 - .03 - Math.sin(u * Math.PI) * .075, s = .7 + Math.sin(u * Math.PI) * .6;
    for (const z of [.035, -.035]) { const up = add(new T.ConeGeometry(.008 * s, .045 * s, 4), M.bone, x, yu - .015 * s, z); up.rotation.z = Math.PI; add(new T.ConeGeometry(.008 * s, .045 * s, 4), M.bone, x, yl + .015 * s, z); } }
  for (const [x, y, r] of [[-.05, g0 + .05, .012], [.05, g0 + .05, .012], [-.13, g0 + .02, .01], [.13, g0 + .02, .01], [0, g0 + .075, .009], [-.17, g0 - .05, .008], [.17, g0 - .05, .008]]) eye(T, add, M, x, y, .043, r, 0);
  for (const sx of [1, -1]) { const h = new T.Shape(); h.moveTo(0, 0); h.quadraticCurveTo(.09 * sx, -.01, .11 * sx, .14); h.quadraticCurveTo(.05 * sx, .04, 0, .03); h.closePath();
    add(new T.ExtrudeGeometry(h, { depth: .02, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 1 }), M.bone, sx * .19, g0 - .02, -.01);
    for (let k = 0; k < 3; k++) { const sp = add(new T.ConeGeometry(.01, .05, 4), M.bone, sx * (.06 + k * .045), g0 + .07 - k * .01, 0); sp.rotation.z = -sx * .4; }
    const r = ribbon(T, add, M.cloth, sx * .2, g0 - .06, .02, .34, .06, sx * .03); cross(T, add, M.gold, sx * .2, g0 - .2, .03, .9); cross(T, add, M.gold, sx * .2, g0 - .32, .03, .7);
    chain(T, add, M.gold, sx * .15, g0 - .1, .02, quality ? 5 : 2, M.gold); }
  // cabo escuro com cruz dourada; pomo em anel de espinhos com estrela-cruz e gema roxa
  add(new T.CylinderGeometry(.025, .028, .26, 10), M.grip, 0, -.07, 0); cross(T, add, M.gold, 0, -.07, .028, 1.1);
  add(new T.TorusGeometry(.055, .006, 5, 22), M.gold, 0, -.25, 0); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = add(new T.ConeGeometry(.005, .035, 4), M.gold, Math.cos(a) * .068, -.25 + Math.sin(a) * .068, 0); c.rotation.z = a - Math.PI / 2; }
  add(new T.OctahedronGeometry(.02, 0), M.eyeWhite, 0, -.25, 0); add(new T.ConeGeometry(.012, .09, 4), M.gold, 0, -.33, 0).rotation.x = Math.PI;
  // fumaça violeta
  const fm = flameMat(T, '.35,.05,.6', '.8,.45,1.'), flames = []; for (const [y, h, w] of [[g0 + .25, .55, .2], [g0 + .65, .45, .16], [g0 - .02, .35, .34]]) for (const ry of [0, Math.PI / 2]) { const f = new T.Mesh(new T.PlaneGeometry(w, h, 1, 6), fm); f.position.set(0, y, 0); f.rotation.y = ry; root.add(f); flames.push(f); }
  mergeStatic(T, root, new Set(flames)); const fl = new T.Group(); for (const f of flames) { root.remove(f); fl.add(f); f.renderOrder = 9; } root.add(fl); fl.visible = !!quality;
  let charge = 0; const mats = Object.values(M);
  root.userData = { kind: 'jaw', fx: new T.Group(), tipA: new T.Vector3(0, g0 + .08, 0), tipB: new T.Vector3(0, g0 + B, 0), tip: new T.Vector3(0, g0 + B, 0), edges: [[[0, g0 + .02, 0], [0, g0 + B, 0]], [[-.2, g0 - .02, 0], [.2, g0 - .02, 0]]],
    tick(time) { fm.uniforms.time.value = time; }, charge(k) { charge = Math.max(0, Math.min(1, k)); }, get charged() { return charge; },
    updateFx(time, phase, low) { fm.uniforms.time.value = time; fm.uniforms.k.value = (low ? .2 : .35) + charge * .7; M.throat.color.setRGB(.69 + charge * .3, .3 + charge * .4, 1); M.groove.color.setRGB(.6 + charge * .35, .24 + charge * .45, 1); fl.visible = !low || charge > .1; },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const m of mats) m.dispose(); fm.dispose(); } };
  return root;
}
