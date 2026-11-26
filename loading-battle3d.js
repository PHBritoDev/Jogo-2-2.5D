/**
 * MOD 375 — CAMPO DA ÚLTIMA GUERRA: a segunda parte da abertura (depois da marcha).
 *
 * Revelação (céu vermelho, lua pálida atrás de nuvens, névoa baixa, bandeiras rasgadas, árvores mortas, armas fincadas e a
 * espada monumental no horizonte) → três confrontos de Bispos, cada um com a SUA identidade original de VFX → a Ganância
 * no ar → os quatro Bispos juntos com a Ganância acima e o título formado por partículas.
 *
 *  1. VHAZRAEL cercado por seis: superioridade (giro do machado, combo) e o fim pelo próprio SELO DO JUÍZO (vhazrael-judgment-vfx3d.js).
 *  2. VORGAZHEK sob pressão: o JUÍZO DA ESPADA CÓSMICA original (vorgazhek-ultimate3d.js + vorgazhek-cosmic-sword3d.js),
 *     com a própria gramática de câmera da ultimate, comprimida no tempo.
 *  3. ZAR'KHAEL em combate circular, uma pausa intencional e OS SEIS SELOS originais (zarkhael-six-seals-*.js); termina sereno.
 *  4. GANÂNCIA agressiva no chão; a fase II (asas por ossos, como em greed-boss3d.js) sobe a uma altura moderada, inimigos
 *     saltam, câmera lenta de UM tempo, e a ultimate revista em batidas curtas — preparação, concentração, liberação,
 *     consequência — com a COROA original da Ganância (greed-ultimate-corona3d.js). Homenagem à intenção de um poder
 *     absoluto contido; nada de enquadramento, falas, música ou efeitos de outra obra.
 *  5. Os quatro Bispos no chão, a Ganância acima; "A Batalha Contra os 7 Pecados Capitais" nasce de partículas e respira.
 *
 * Sem violência gráfica: derrotas viram brasas/sombra (dissolve) ou caem inteiras. NPCs: um pool fixo de 10 clones da
 * silhueta adulta (variações de altura, recorte em 3 famílias, adereços, líderes maiores); reforços entram nos cortes ou
 * de dentro da névoa. Tudo pré-compilado antes do primeiro quadro da batalha; nenhuma alocação por quadro nos laços.
 */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BATTLE_LEN = 53;
export const SEGMENTS = [
  { id: 'revelacao', from: 0, to: 3.2 }, { id: 'vhazrael', from: 3.2, to: 12.4 }, { id: 'vorgazhek', from: 12.4, to: 24.2 },
  { id: 'zarkhael', from: 24.2, to: 34.6 }, { id: 'ganancia', from: 34.6, to: 45 }, { id: 'final', from: 45, to: BATTLE_LEN }
];
export const NPC_BUDGET = 10;
export const TITLE = 'A Batalha Contra\nos 7 Pecados Capitais', TITLE_P = 'A Batalha\nContra os 7\nPecados Capitais';
// instantes de golpe (s do clipe) medidos no QA da abertura; o arco nasce no instante e acerta quem está no alcance
const HITS = { Triple_Combo_Attack: [1.1, 2.25, 3.3], Axe_Spin_Attack: [1.0, 1.45], Double_Blade_Spin: [1.3, 2.4, 3.6], Weapon_Combo: [1.15, 1.95, 3.0], Double_Combo_Attack: [1.0, 1.7], Attack: [1.2] };
const C1 = [-6, -6], C2 = [6, -12], C3 = [-4, -24], C4 = [0, -6];
const AURAS = [0x8a2a26, 0x56647a, 0x857236]; // três famílias de recorte, baixa intensidade

export async function createBattle(ctx) {
  const { T, scene, camera, renderer, keep, url, base, loader, low, reduced, state, byId, kit, FX, explosions, smears, loadActor, play, updateWeapons, placeMoon, skyU, groundU } = ctx;
  const { clamp, lerp, smooth, hash, silhouetteMaterial } = kit;
  const imp = f => import(url(f)); // mesmo token de build da abertura: nunca um módulo de VFX vindo de cache antigo
  const B = { ready: false, t: 0, seg: '', fired: new Set(), npcs: [], g2: null, trauma: 0, qaCam: null, portrait: false, title: null, telemetry: { maxNpcs: 0 } };
  const field = new T.Group(); field.visible = false; scene.add(field);
  const _v = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4(), _s = new T.Vector3(), _e = new T.Euler(), _c = new T.Color();

  /* ================= cenário ================= */
  const envMat = keep(silhouetteMaterial(T, 0x8a6a50, [0, 1], .22, { color: 0x060404 }));
  const mono = (() => { // espada monumental: lâmina afilada com nervura, guarda, punho e pomo — uma única malha
    const blade = new T.BoxGeometry(1, 1, 1, 2, 10, 1), p = blade.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + .5, tap = 1 - Math.pow(y, 1.5) * .94; p.setXYZ(i, p.getX(i) * 1.7 * tap, -y * 21, p.getZ(i) * .34 * tap * (Math.abs(p.getX(i)) < .01 ? 1.6 : 1)); }
    blade.computeVertexNormals();
    const guard = new T.BoxGeometry(6.4, .75, 1, 6, 1, 1), gp = guard.attributes.position; for (let i = 0; i < gp.count; i++) gp.setY(i, gp.getY(i) - Math.pow(Math.abs(gp.getX(i)) / 3.2, 2) * .55); guard.computeVertexNormals();
    const grip = new T.CylinderGeometry(.3, .34, 3.6, 8).translate(0, 2.15, 0), pom = new T.SphereGeometry(.62, 10, 8).translate(0, 4.3, 0);
    const g = keep(mergeGeometries([blade.toNonIndexed(), guard.toNonIndexed(), grip.toNonIndexed(), pom.toNonIndexed()])); [blade, guard, grip, pom].forEach(x => x.dispose());
    const m = new T.Mesh(g, envMat); m.position.set(-9, 17.5, -78); m.rotation.set(.05, .3, -.1); m.frustumCulled = false; field.add(m); return m; })();
  const mound = new T.Mesh(keep(new T.IcosahedronGeometry(1, 2).scale(9, 2.2, 6)), envMat); mound.position.set(-9, -.6, -78); field.add(mound);
  /* armas fincadas, escudos partidos, elmos, ossos discretos e montes: InstancedMesh (geometria estática compartilhada) */
  function scatter(geo, n, place) { const im = new T.InstancedMesh(keep(geo), envMat, n); im.frustumCulled = false; const o = new T.Object3D(); for (let i = 0; i < n; i++) { place(o, i); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } field.add(im); return im; }
  const clearOf = (x, z) => [C1, C2, C3, C4, [0, 3]].every(([cx, cz]) => Math.hypot(x - cx, z - cz) > 4.2);
  const spot = (i, rMin, rMax, seed) => { for (let k = 0; k < 12; k++) { const a = hash(i * 7.1 + seed + k) * 6.283, r = rMin + hash(i * 3.3 + seed * 2 + k) * (rMax - rMin), x = Math.cos(a) * r * 1.4, z = -14 + Math.sin(a) * r; if (clearOf(x, z)) return [x, z]; } return [rMax * 1.4, -14 - rMax]; };
  const swordGeo = (() => { const bl = new T.BoxGeometry(.11, 1.25, .025, 1, 4, 1), p = bl.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + .625; p.setX(i, p.getX(i) * (1 - Math.pow(y / 1.25, 3) * .9)); } bl.translate(0, .625, 0);
    const gd = new T.BoxGeometry(.46, .05, .07).translate(0, 1.27, 0), gr = new T.CylinderGeometry(.022, .026, .3, 6).translate(0, 1.45, 0); const g = mergeGeometries([bl.toNonIndexed(), gd.toNonIndexed(), gr.toNonIndexed()]); [bl, gd, gr].forEach(x => x.dispose()); g.rotateX(Math.PI); g.translate(0, 1.6, 0); return g; })();
  scatter(swordGeo, low ? 22 : 36, (o, i) => { const [x, z] = spot(i, 3, 24, 1); o.position.set(x, -.25 - hash(i) * .35, z); o.rotation.set((hash(i + 3) - .5) * .5, hash(i + 5) * 6.28, (hash(i + 9) - .5) * .5); o.scale.setScalar(.85 + hash(i + 11) * .5); });
  scatter(new T.CylinderGeometry(.42, .42, .06, 14, 1, false, 0, Math.PI * 1.3), low ? 8 : 14, (o, i) => { const [x, z] = spot(i, 2.5, 22, 2); o.position.set(x, .08, z); o.rotation.set((hash(i + 1) - .5) * 1.1 + .2, hash(i + 2) * 6.28, (hash(i + 4) - .5) * .9); o.scale.setScalar(.8 + hash(i + 6) * .5); });
  scatter(new T.SphereGeometry(.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), low ? 6 : 10, (o, i) => { const [x, z] = spot(i, 2.5, 20, 3); o.position.set(x, .02, z); o.rotation.set(hash(i + 7) * 2.6, hash(i + 8) * 6.28, hash(i + 2) * 1.2); });
  scatter(new T.CapsuleGeometry(.025, .42, 2, 5), low ? 5 : 8, (o, i) => { const [x, z] = spot(i, 3, 18, 4); o.position.set(x, .03, z); o.rotation.set(Math.PI / 2, 0, hash(i + 3) * 6.28); });
  scatter(new T.IcosahedronGeometry(1, 1), 12, (o, i) => { const [x, z] = spot(i, 9, 34, 5); o.position.set(x, -.35, z - 6); o.scale.set(2 + hash(i) * 3, .35 + hash(i + 1) * .7, 1.5 + hash(i + 2) * 2.5); o.rotation.y = hash(i + 4) * 6.28; });
  /* árvores mortas: uma geometria de galhos recursiva, instanciada */
  const treeGeo = (() => { const parts = []; const rec = (p, dir, len, r, depth) => { const c = new T.CylinderGeometry(r * .62, r, len, 5, 1); c.translate(0, len / 2, 0); _q.setFromUnitVectors(_v.set(0, 1, 0), dir); c.applyQuaternion(_q); c.translate(p.x, p.y, p.z); parts.push(c.toNonIndexed()); c.dispose();
      if (depth <= 0) return; const end = p.clone().addScaledVector(dir, len); const n = depth > 2 ? 2 : 3; for (let i = 0; i < n; i++) { const d = dir.clone().applyAxisAngle(_v2.set(1, 0, 0), (hash(depth * 9 + i) - .5) * 1.5).applyAxisAngle(_v3.set(0, 1, 0), i * 2.4 + depth).normalize(); d.y = Math.max(.15, d.y); d.normalize(); rec(end, d, len * (.62 + hash(i + depth) * .15), r * .6, depth - 1); } };
    rec(new T.Vector3(), new T.Vector3(.05, 1, 0).normalize(), 2.6, .2, 4); const g = mergeGeometries(parts); parts.forEach(x => x.dispose()); return g; })();
  scatter(treeGeo, 6, (o, i) => { const [x, z] = spot(i, 10, 30, 6); o.position.set(x, 0, z - 4); o.rotation.set((hash(i) - .5) * .2, hash(i + 1) * 6.28, (hash(i + 2) - .5) * .25); o.scale.setScalar(1.1 + hash(i + 3) * .9); });
  /* bandeiras rasgadas: mastro + pano com onda no vértice (instanciado) */
  const FLAG_V = `attribute float aSeed; uniform float uT; varying vec2 vUv; varying float vS; void main(){ vUv=uv; vS=aSeed; vec3 p=position; float k=uv.x;
    p.z+=sin(k*5.-uT*2.2+aSeed*9.)*.22*k+sin(k*11.-uT*3.7+aSeed*4.)*.06*k; p.y-=k*k*.35+sin(uT*1.3+aSeed*7.)*.08*k; gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.); }`;
  const FLAG_F = `${kit.NOISE} uniform vec3 uCol; varying vec2 vUv; varying float vS; void main(){ vec2 p=vUv; float n=fbm(p*vec2(6.,4.)+vS*13.);
    float edge=p.x+(n-.5)*.55+.18*fbm(p*vec2(2.,9.)+vS); if(edge>.92) discard; if(fbm(p*9.+vS*5.)>.66&&p.x>.25) discard;
    float fold=.6+.4*sin(p.x*14.+n*5.); vec3 c=uCol*fold*(.55+.45*p.y); gl_FragColor=vec4(c,1.); }`;
  const flagU = { uT: { value: 0 }, uCol: { value: new T.Color(0x1d0507) } }, NF = 7, flagGeo = keep(new T.PlaneGeometry(2.7, 1.5, 18, 6).translate(1.35, -.75, 0)); const fs = new Float32Array(NF); for (let i = 0; i < NF; i++) fs[i] = hash(i * 5.3);
  flagGeo.setAttribute('aSeed', new T.InstancedBufferAttribute(fs, 1));
  const flags = new T.InstancedMesh(flagGeo, keep(new T.ShaderMaterial({ uniforms: flagU, vertexShader: FLAG_V, fragmentShader: FLAG_F, side: T.DoubleSide })), NF); flags.frustumCulled = false; field.add(flags);
  const poles = new T.InstancedMesh(keep(new T.CylinderGeometry(.045, .06, 5.4, 5).translate(0, 2.7, 0)), envMat, NF); poles.frustumCulled = false; field.add(poles);
  { const o = new T.Object3D(); const spots = [[-8.5, -2], [9.5, -4], [-12, -16], [4, -20], [13, -26], [-15, -32], [1.5, -38]]; spots.forEach(([x, z], i) => { const tilt = (hash(i) - .5) * .4;
      o.position.set(x, 0, z); o.rotation.set(0, hash(i + 2) * 1.2 - .6, tilt); o.scale.setScalar(1); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
      o.position.set(x - Math.sin(tilt) * 5.1, Math.cos(tilt) * 5.1, z); o.rotation.set(0, hash(i + 2) * 1.2 - .6 + .4, tilt); o.updateMatrix(); flags.setMatrixAt(i, o.matrix); }); }
  /* névoa vermelha baixa e distante (atrás dos combates; nunca cobre os personagens) */
  const MIST_F = `${kit.NOISE} uniform float uT,uSeed,uA; varying vec2 vUv; void main(){ vec2 p=vUv*2.-1.; float n=fbm(vec2(p.x*2.2+uT*.03+uSeed,p.y*1.6));
    float a=smoothstep(1.,.2,abs(p.y)+(n-.5)*.6)*smoothstep(1.,.6,abs(p.x))*uA*(.55+.45*n); if(a<.01) discard; gl_FragColor=vec4(vec3(.38,.05,.035)*(.6+.5*n),a); }`;
  const mists = [[-14, 2.2, -34, 46, 6], [16, 2.6, -44, 52, 7], [0, 1.6, -26, 40, 4.5], [-4, 3.4, -58, 70, 9]].map(([x, y, z, w, h], i) => { const m = new T.Mesh(ctx.curtains[0].geometry, keep(new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uSeed: { value: i * 3.7 }, uA: { value: .5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)); gl_Position=projectionMatrix*mv; }', fragmentShader: MIST_F, transparent: true, depthWrite: false, fog: false })));
    m.position.set(x, y, z); m.scale.set(w, h, 1); m.renderOrder = -2; m.frustumCulled = false; field.add(m); return m; });

  /* ================= NPCs: pool fixo ================= */
  const npcFile = 'npc-adulto-silhueta.glb';
  const propSword = keep((() => { const g = swordGeo.clone(); g.translate(0, -1.6, 0); g.rotateX(Math.PI); g.scale(.75, .75, .75); g.translate(0, -.08, 0); return g; })());
  const propSpear = keep(mergeGeometries([new T.CylinderGeometry(.018, .02, 2, 5).translate(0, .4, 0).toNonIndexed(), new T.ConeGeometry(.05, .26, 4).translate(0, 1.52, 0).toNonIndexed()]));
  const hornGeo = keep(mergeGeometries([new T.ConeGeometry(.03, .2, 5).rotateZ(-.5).translate(.07, .12, 0).toNonIndexed(), new T.ConeGeometry(.03, .2, 5).rotateZ(.5).translate(-.07, .12, 0).toNonIndexed()]));
  const gripQ = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0)));
  async function loadNpcs() {
    const first = await loadActor({ id: 'npc0', file: npcFile, h: 1.84, rim: AURAS[0], rimK: .3, rimDir: [1, .4] }, { npc: true, dissolve: true }); if (!first) return;
    for (let i = 0; i < NPC_BUDGET; i++) {
      const leader = i % 5 === 4, def = { id: 'npc' + i, file: npcFile, h: leader ? 2.08 : 1.66 + hash(i * 3.7) * .26, rim: AURAS[i % 3], rimK: leader ? .42 : .26 + hash(i) * .1, rimDir: [i % 2 ? 1 : -1, .4] };
      const a = i === 0 ? first : await loadActor(def, { npc: true, dissolve: true, src: first.gltf, clone: true, mill: false }); if (!a) return; if (i === 0) { a.mat.userData.rim.value.setHex(def.rim); }
      a.holder.visible = false; a.mode = 'battle';
      const hand = a.bones.RightHand, kind = leader ? 'spear' : i % 3 === 1 ? 'none' : 'sword';
      if (hand && kind !== 'none') { const pm = new T.Mesh(kind === 'spear' ? propSpear : propSword, a.mat); pm.quaternion.copy(gripQ); const hs = hand.getWorldScale(_v).x; pm.scale.setScalar(1 / hs); pm.position.set(0, .06 / hs, 0); pm.frustumCulled = false; hand.add(pm); }
      if (leader && a.bones.Head) { const hm = new T.Mesh(hornGeo, a.mat); const hs = a.bones.Head.getWorldScale(_v).x; hm.scale.setScalar(1 / hs); hm.position.set(0, .1 / hs, 0); hm.frustumCulled = false; a.bones.Head.add(hm); }
      B.npcs.push({ a, i, leader, on: false, st: 'idle', t: 0, tgt: new T.Vector3(), speed: 0, face: null, dis: -1, kb: new T.Vector3(), leap: null, yaw: 0, hp: 1 });
    }
  }
  const npcFree = () => B.npcs.find(n => !n.on);
  function spawn(x, z, yaw, anim = 'Alert', from = Math.random() * 2) {
    const n = npcFree(); if (!n) return null; const a = n.a; n.on = true; n.st = 'idle'; n.t = 0; n.dis = -1; n.leap = null; n.kb.set(0, 0, 0); n.face = null; n.hp = 1;
    a.holder.visible = true; a.holder.position.set(x, 0, z); a.holder.rotation.set(0, yaw, 0); n.yaw = yaw; a.mat.userData.dis.value = 0; a.mixer.stopAllAction(); a.act = null;
    const act = play(a, anim, { fade: 0, loop: anim !== 'falling_down', from }); return n;
  }
  function moveTo(n, x, z, run = false) { if (!n || !n.on || n.dis >= 0) return; n.st = 'move'; n.tgt.set(x, 0, z); n.speed = run ? 3.1 : 1.15; play(n.a, run ? 'Running' : 'Walking', { fade: .2, loop: true }); const nat = n.a.clips[run ? 'Running' : 'Walking'].userData.natural || 1; n.a.act.timeScale = n.speed / nat; }
  function attackAnim(n, from = .3) { if (!n || !n.on || n.dis >= 0) return; n.st = 'attack'; play(n.a, 'Triple_Combo_Attack', { fade: .15, loop: true, from }); }
  function leapAt(n, x, y, z, dur = 1.1) { if (!n || !n.on || n.dis >= 0) return; const p = n.a.holder.position; n.st = 'leap'; n.leap = { from: p.clone(), to: new T.Vector3(x, y, z), t: 0, dur }; const a = play(n.a, 'Regular_Jump', { fade: .1, from: .35 }); if (a) a.timeScale = 1.1; }
  /** Derrota sem sangue: tranco para trás, queda inteira e o corpo se desfaz em brasas pela borda. */
  function strike(n, fx, fz, power = 1) {
    if (!n || !n.on || n.dis >= 0) return; const p = n.a.holder.position; n.dis = 0; n.st = 'hit'; _v.set(p.x - fx, 0, p.z - fz).normalize(); n.kb.copy(_v).multiplyScalar(2.6 * power);
    n.face = Math.atan2(-_v.x, -_v.z); play(n.a, 'falling_down', { fade: .08, from: .5 }); ember(p.x, 1.1, p.z, 10);
  }
  function npcUpdate(n, dt) {
    const a = n.a, p = a.holder.position; n.t += dt;
    if (n.st === 'move') { _v.subVectors(n.tgt, p); const d = _v.length(); if (d < .08) { n.st = 'idle'; play(a, 'Alert', { fade: .3, loop: true }); } else { _v.multiplyScalar(1 / d); p.addScaledVector(_v, Math.min(d, n.speed * dt)); n.face = Math.atan2(_v.x, _v.z); } }
    if (n.st === 'leap' && n.leap) { const L = n.leap; L.t += dt; const k = clamp(L.t / L.dur, 0, 1); p.lerpVectors(L.from, L.to, k); p.y = L.from.y + (L.to.y - L.from.y) * k + Math.sin(Math.PI * Math.min(1, k * 1.15)) * 1.6; n.face = Math.atan2(L.to.x - L.from.x, L.to.z - L.from.z); }
    if (n.dis >= 0) { n.dis += dt; p.addScaledVector(n.kb, dt); n.kb.multiplyScalar(Math.max(0, 1 - dt * 3.2)); if (p.y > 0) p.y = Math.max(0, p.y - dt * 3.5); a.mat.userData.dis.value = smooth((n.dis - .18) / .95);
      if (n.dis > .3 && n.dis < 1.05 && Math.random() < dt * 14) ember(p.x + (Math.random() - .5) * .5, .3 + Math.random() * 1.3, p.z + (Math.random() - .5) * .5, 1);
      if (n.dis > 1.25) { n.on = false; a.holder.visible = false; a.mixer.stopAllAction(); a.act = null; } }
    if (n.face != null) { let d = n.face - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 8); a.holder.rotation.y = n.yaw; }
    a.mixer.update(dt);
  }
  /* brasas/cinzas das derrotas (um Points fixo) */
  const EN = 140, eP = new Float32Array(EN * 3), eA = new Float32Array(EN), eV = new Float32Array(EN * 3), eG = keep(new T.BufferGeometry()); let eNext = 0;
  eG.setAttribute('position', new T.BufferAttribute(eP, 3).setUsage(T.DynamicDrawUsage)); eG.setAttribute('aA', new T.BufferAttribute(eA, 1).setUsage(T.DynamicDrawUsage));
  const emberPts = new T.Points(eG, keep(new T.ShaderMaterial({ uniforms: { uPix: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
    vertexShader: 'attribute float aA; uniform float uPix; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPix*9./-mv.z*(.5+aA); }',
    fragmentShader: 'varying float vA; void main(){ vec2 p=gl_PointCoord*2.-1.; float r=dot(p,p); if(r>1.||vA<.01) discard; vec3 c=mix(vec3(.35,.3,.28),vec3(1.,.42,.1),smoothstep(.2,.8,vA)); gl_FragColor=vec4(c*(1.-r)*vA*1.4,(1.-r)*vA); }' })));
  emberPts.frustumCulled = false; field.add(emberPts);
  function ember(x, y, z, n) { for (let i = 0; i < n; i++) { const k = eNext++ % EN; eP[k * 3] = x + (Math.random() - .5) * .4; eP[k * 3 + 1] = y + (Math.random() - .5) * .6; eP[k * 3 + 2] = z + (Math.random() - .5) * .4; eV[k * 3] = (Math.random() - .5) * .6; eV[k * 3 + 1] = .6 + Math.random() * 1.2; eV[k * 3 + 2] = (Math.random() - .5) * .6; eA[k] = 1; } }
  function emberUpdate(dt) { for (let k = 0; k < EN; k++) { if (eA[k] <= 0) continue; eP[k * 3] += eV[k * 3] * dt + Math.sin(B.t * 3 + k) * .2 * dt; eP[k * 3 + 1] += eV[k * 3 + 1] * dt; eP[k * 3 + 2] += eV[k * 3 + 2] * dt; eA[k] = Math.max(0, eA[k] - dt * .55); } eG.attributes.position.needsUpdate = true; eG.attributes.aA.needsUpdate = true; }

  /* ================= VFX originais dos Bispos ================= */
  const [judgeM, cosmicM, swordM, sealsM, sealsVfxM, coronaM] = await Promise.all([imp('./vhazrael-judgment-vfx3d.js'), imp('./vorgazhek-ultimate3d.js'), imp('./vorgazhek-cosmic-sword3d.js'), imp('./zarkhael-six-seals-ultimate3d.js'), imp('./zarkhael-six-seals-vfx3d.js'), imp('./greed-ultimate-corona3d.js')]);
  const judge = judgeM.makeJudgmentSeal(T, field, 4.2), judgeActor = { alive: true, x: 0, y: 0, z: 0, act: null };
  // Espada Cósmica: as quatro fases originais, comprimidas (8 s) — sem o branco de tela cheia (fica abaixo de whiteAt)
  const COSMIC_U = { phases: [['boss_aura', 1.5], ['circle_build', 2.3], ['sword_emerge_and_fall', 1.8], ['impact_and_return', 2.4]],
    circles: [{ r: 15, h: 15, spin: .14, from: .1, to: 1.45 }, { r: 7.5, h: 23, spin: -.24, from: .45, to: 1.85 }, { r: 3.75, h: 30, spin: .38, from: .8, to: 2.2 }],
    release: .55, whiteAt: 99, stages: { contact: .08, compress: .3, form: .62, deton: 1.25 }, rings: [.64, .78, .94], wind: 1.05 };
  const cosmicVfx = cosmicM.createCosmicUltVFX(T, field, { makeSword: () => swordM.buildCosmicSword(T, { clip: true }) }); let cosmic = null;
  // Seis Selos: aura → seis círculos empilhados → a erupção; alturas a 40 % para caber no campo, tempos comprimidos (5,3 s)
  const SEALS_U = { aura: .8, seals: 2.6, explosions: 1.9, total: 5.3, sealGap: 2.6 / 6 * .92, sealBuild: .5, burstAt: .3, burstPeriod: 1.9, heights: [.11, 2.6, 5.2, 7.8, 10.4, 13] };
  const sealsVfx = sealsVfxM.createSixSealsVFX(T, field); let seals = null;
  // Coroa da Ganância: arena sem zona segura (a borda fica no limite), origem sob o próprio Pecado
  const CR = 13, corArena = { radius: CR, edge: CR - .02, origin: { x: C4[0], z: C4[1] }, normal: { x: 0, z: 1 }, walkable: () => true, safe: () => false, reach: CR + 2 };
  const corona = coronaM.createCorona(T, field, corArena, low ? 'low' : 'medium', { x: C4[0], y: 0, z: C4[1] }); const corS = { phase: 'idle', progress: 0, front: 0 }, corAnchor = new T.Vector3();

  /* ================= Ganância, fase II (asas por ossos) ================= */
  async function loadG2() {
    const g = await loader.loadAsync(url('assets/loading/ganancia2-silhueta.glb')); if (state.disposed) return;
    for (const c of g.animations) c.tracks = c.tracks.filter(t => !/^Bone_0(4[89]|5[0-9]|8[0-9]|9[0-2]|3[01])\./.test(t.name)); // asas 100 % procedurais (como gkSynthB)
    const ar = g.animations.find(c => c.name === 'Arise'); if (ar) g.animations.push(T.AnimationUtils.subclip(ar, 'GK_cast', 40, 55, 30));
    const G = byId.ganancia, def = { ...G.def, file: 'ganancia2-silhueta.glb' }; // mesmo id: mesmos olhos e recorte
    const a = await loadActor(def, { src: g, clone: false, mill: true, like: G }); if (!a) return; a.holder.visible = false; a.mode = 'battle';
    const bn = a.bones, up = bn.UpperChest, bR = bn.Bone_059, bL = bn.Bone_057; a.model.updateMatrixWorld(true);
    if (up && bR && bR.parent !== up) up.attach(bR); if (bR && bn.Bone_050 && bn.Bone_050.parent !== bR) bR.attach(bn.Bone_050); if (bL && bn.Bone_053 && bn.Bone_053.parent !== bL) bL.attach(bn.Bone_053);
    const bind = (bone, w) => { bone.updateWorldMatrix(true, false); return w.clone().applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert()).normalize(); };
    a.wings = [bR, bL].map((bone, i) => bone && { bn: bone, q0: bone.quaternion.clone(), ax: bind(bone, new T.Vector3(0, 0, 1)), up: bind(bone, new T.Vector3(0, 1, 0)), s: i ? -1 : 1 }).filter(Boolean);
    a.flapPh = 0; a.airY = 0; B.g2 = a;
  }
  function wings(a, dt, mode) { const f = mode === 'flap' ? 2.1 : mode === 'hover' ? 2.7 : .6, amp = mode === 'flap' ? .55 : mode === 'hover' ? .42 : .05; a.flapPh += dt * f * Math.PI * 2;
    const beat = Math.sin(a.flapPh) * amp, spread = mode === 'fold' ? .2 : .1; for (const w of a.wings) w.bn.quaternion.copy(w.q0).multiply(_q.setFromAxisAngle(w.ax, w.s * (beat + spread * .6 + .35))).multiply(_q2.setFromAxisAngle(w.up, -w.s * (spread * .5 + Math.cos(a.flapPh) * amp * .25))); }
  const _q2 = new T.Quaternion();

  /* ================= controle dos antagonistas ================= */
  const ids = ['ganancia', 'bispo1', 'bispo2', 'bispo3', 'bispo4'];
  function stage(id, x, z, yaw, clip, opts = {}) { const a = byId[id]; if (!a) return null; a.mode = 'battle'; a.holder.visible = true; a.holder.position.set(x, opts.y || 0, z); a.holder.rotation.set(0, yaw, 0);
    for (const w of a.weapons) { w.boneWant = 1; if (opts.snap !== false) w.bone = 1; w.root.visible = true; } a.mixer.stopAllAction(); a.act = null; a.hitsDone = new Set();
    if (clip) { const act = play(a, clip, { fade: 0, loop: !!opts.loop, from: opts.from || 0 }); if (act && opts.speed != null) act.timeScale = opts.speed; } return a; }
  function hide(id) { const a = byId[id]; if (!a) return; a.holder.visible = false; for (const w of a.weapons) w.root.visible = false; }
  function attack(id, clip, from = 0, speed = 1) { const a = byId[id]; if (!a) return; const act = play(a, clip, { fade: .18, from }); if (act) act.timeScale = speed; a.hitsDone = new Set(); a.atkClip = clip; }
  const EDGE = { bispo1: 0xa64cff, bispo2: 0x2ed6c4, bispo3: 0xe6dccb, ganancia: 0xff2a34, ganancia2: 0xff2a34 };
  const REACH = { bispo1: 2.1, bispo2: 2.4, bispo3: 2.6, ganancia: 2.5, ganancia2: 2.5 };
  /** Golpes nos instantes do clipe: arco crescente + quem está no alcance (e à frente, salvo nos giros) cai e se desfaz. */
  function hits(a) {
    const act = a.act, clip = act && act.getClip(), list = clip && HITS[clip.name]; if (!list) return;
    for (let i = 0; i < list.length; i++) { const key = clip.name + i; if (a.hitsDone.has(key) || act.time < list[i]) continue; a.hitsDone.add(key);
      const p = a.holder.position, yaw = a.holder.rotation.y, spin = /Spin/.test(clip.name), R = REACH[a.def.id] || 2.2; _v.set(Math.sin(yaw), 0, Math.cos(yaw));
      (a.bones.Chest || a.bones.Spine || a.bones.Hips).getWorldPosition(_v2); const tilt = (hash(i * 3.1 + B.t) - .5) * .9, dir = i % 2 ? 1 : -1;
      _v3.set(0, 1, 0).applyAxisAngle(_v, tilt); smears.fire(_v2, _v3, -1.35 * dir, (spin ? 4.6 : 2.7) * dir, R * .62, EDGE[a.def.id] || 0xff2030, .3, spin ? .42 : .32, _v);
      for (const n of B.npcs) { if (!n.on || n.dis >= 0) continue; const np = n.a.holder.position, dx = np.x - p.x, dz = np.z - p.z, d = Math.hypot(dx, dz); if (d > R + .4) continue; if (!spin && (dx * _v.x + dz * _v.z) / Math.max(.01, d) < .1) continue; strike(n, p.x, p.z, 1); } }
  }

  /* ================= câmera ================= */
  const cam = { pos: new T.Vector3(), look: new T.Vector3(), fov: 40 };
  const P = () => B.portrait, F = (land, port) => (B.portrait ? port : land);
  function shot(px, py, pz, lx, ly, lz, fov) { cam.pos.set(px, py, pz); cam.look.set(lx, ly, lz); cam.fov = fov; }
  function lerpShot(k, a, b) { k = smooth(k); cam.pos.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)); cam.look.set(lerp(a[3], b[3], k), lerp(a[4], b[4], k), lerp(a[5], b[5], k)); cam.fov = lerp(a[6], b[6], k); }
  const once = (key, t, bt, fn) => { if (bt >= t && !B.fired.has(key)) { B.fired.add(key); fn(); } };

  /* ================= linha do tempo ================= */
  function begin() {
    B.t = 0; B.fired.clear(); B.trauma = 0; field.visible = true; groundU.uRoad.value = 0; groundU.uScroll.value = 0; skyU.uCloud.value = 1;
    skyU.uSky.value.set(.36, .035, .025); skyU.uGlow.value.set(1, .2, .07); scene.fog.color.setHex(0x1a0504); scene.fog.density = .011; if (ctx.lights) ctx.lights('battle');
    for (const n of B.npcs) { n.on = false; n.a.holder.visible = false; } if (B.g2) B.g2.holder.visible = false;
    // revelação: os cinco de costas, encarando o campo; a horda parada lá longe
    const xs = F([0, -2.3, -4.5, 2.3, 4.5], [0, -1.5, -2.9, 1.5, 2.9]); ids.forEach((id, i) => stage(id, xs[i], 4.2 + Math.abs(xs[i]) * .18, Math.PI, id === 'bispo4' ? 'Idle_14' : 'Walking', { loop: true, speed: 0, from: .2 + i * .1 }));
    for (let i = 0; i < 8; i++) spawn(-9 + i * 2.6 + hash(i) * .8, -16 - hash(i + 3) * 5, 0, 'Alert');
    cosmic = null; seals = null; corS.phase = 'idle'; judgeActor.act = null; judge.update(judgeActor); cosmicVfx.clear(); sealsVfx.clear(); corona.update(corS, 0, corAnchor);
    if (B.titles) for (const k in B.titles) { B.titles[k].object.visible = false; B.titles[k].set(0, 0, 0); } if (B.titles) B.title = B.portrait ? B.titles.P : B.titles.L;
  }
  function end() { field.visible = false; for (const n of B.npcs) { n.on = false; n.a.holder.visible = false; } if (B.g2) B.g2.holder.visible = false; cosmicVfx.clear(); sealsVfx.clear(); corS.phase = 'idle'; corona.update(corS, 0, corAnchor); judgeActor.act = null; judge.update(judgeActor); if (B.titles) for (const k in B.titles) B.titles[k].object.visible = false;
    const G = byId.ganancia; if (G) for (const w of G.weapons) w.hand = G.bones[w.side + 'Hand']; for (const id of ids) { const a = byId[id]; if (a) { a.holder.visible = true; a.holder.position.y = 0; for (const w of a.weapons) w.root.visible = true; } } }

  function update(bt, dt, rdt) {
    B.t = bt; let slow = 1; const seg = SEGMENTS.find(s => bt >= s.from && bt < s.to) || SEGMENTS[SEGMENTS.length - 1]; B.seg = seg.id;
    flagU.uT.value += dt; for (const m of mists) m.material.uniforms.uT.value = state.real;
    placeMoon(F(-16, -10), F(31, 36), -170, F(26, 21));
    /* ---- 0. revelação ---- */
    if (seg.id === 'revelacao') { const k = bt / 3.2; lerpShot(k, [0, 1.25, 10.5, 0, 1.6, -20, F(38, 54)], [0, 2.4, 13.2, -1, 3.2, -30, F(36, 52)]); }
    /* ---- 1. VHAZRAEL cercado ---- */
    if (seg.id === 'vhazrael') { const t = bt - 3.2, [cx, cz] = C1;
      once('s1', 3.2, bt, () => { for (const id of ids) hide(id); for (const n of B.npcs) if (n.on) { n.on = false; n.a.holder.visible = false; }
        stage('bispo1', cx, cz, .3, 'Axe_Spin_Attack', { speed: 0, from: .05 }); for (let i = 0; i < 6; i++) { const ang = i / 6 * 6.283 + .3; spawn(cx + Math.sin(ang) * 3.5, cz + Math.cos(ang) * 3.5, ang + Math.PI, 'Alert', i * .4); } });
      once('s1a', 4.5, bt, () => { B.npcs.filter(n => n.on).forEach((n, i) => { const p = n.a.holder.position, ang = Math.atan2(p.x - cx, p.z - cz); moveTo(n, cx + Math.sin(ang) * (i % 2 ? 1.45 : 2.5), cz + Math.cos(ang) * (i % 2 ? 1.45 : 2.5), i % 2 === 1); }); });
      once('s1b', 5.4, bt, () => { attack('bispo1', 'Axe_Spin_Attack', .35, 1.05); B.npcs.filter(n => n.on && n.st !== 'move').slice(0, 2).forEach(n => attackAnim(n)); });
      once('s1c', 7.3, bt, () => { attack('bispo1', 'Triple_Combo_Attack', .6, 1.1); const rest = B.npcs.filter(n => n.on && n.dis < 0); rest.slice(0, 2).forEach((n, i) => { const p = n.a.holder.position; moveTo(n, cx + (p.x - cx) * .45, cz + (p.z - cz) * .45, true); }); });
      once('s1d', 9.4, bt, () => { attack('bispo1', 'mage_soell_cast_7', .2, 1.15); judgeActor.x = cx; judgeActor.y = 0; judgeActor.z = cz; judgeActor.act = { mark: { x: cx, y: 0, z: cz }, phase: 'cast', t: 0, landAt: 0, fizzle: false };
        for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + 1; const n = spawn(cx + Math.sin(a) * 6.5, cz + Math.cos(a) * 6.5, a + Math.PI, 'Running'); moveTo(n, cx + Math.sin(a) * 2.8, cz + Math.cos(a) * 2.8, true); } });
      if (judgeActor.act) { const A = judgeActor.act; A.t += dt; if (A.phase === 'cast' && bt >= 10.5) { A.phase = 'land'; A.landAt = A.t; for (const n of B.npcs) if (n.on && n.dis < 0) { const p = n.a.holder.position; if (Math.hypot(p.x - cx, p.z - cz) < 4.4) strike(n, cx, cz, .5); } explosions.burst(_v.set(cx, .4, cz), .7, { dir: _v2.set(0, 1, 0), dur: 1.6 }); B.trauma = .35; }
        if (A.phase === 'land' && A.t - A.landAt > .6) judgeActor.act = null; judge.update(judgeActor); }
      // câmera: plano aberto que orbita → médio no giro → curto e baixo no combo → consequência alta sobre o selo
      if (t < 2.1) lerpShot(t / 2.1, [cx + F(7.5, 5.2), 2.6, cz + F(8, 9), cx, 1.0, cz, F(38, 56)], [cx + F(6, 4), 2.2, cz + F(8.8, 9.5), cx, 1.1, cz, F(38, 56)]);
      else if (t < 4.1) lerpShot((t - 2.1) / 2, [cx - 3.4, 1.25, cz + 3.6, cx, 1.15, cz, F(44, 60)], [cx - 2.9, 1.3, cz + 3.2, cx, 1.2, cz, F(44, 60)]);
      else if (t < 6.2) lerpShot((t - 4.1) / 2.1, [cx + 1.5, .55, cz + 2.4, cx, 1.55, cz, F(50, 66)], [cx + 1.8, .6, cz + 2.1, cx, 1.6, cz, F(50, 66)]);
      else lerpShot((t - 6.2) / 3, [cx + 3.6, 3.6, cz + 5.4, cx, .6, cz, F(46, 62)], [cx + 4.2, 4.4, cz + 6.2, cx, .5, cz, F(46, 62)]);
    }
    /* ---- 2. VORGAZHEK: pressão e o Juízo da Espada Cósmica ---- */
    if (seg.id === 'vorgazhek') { const t = bt - 12.4, [cx, cz] = C2, px = cx, pz = cz + 7.5;
      once('s2', 12.4, bt, () => { hide('bispo1'); judgeActor.act = null; judge.update(judgeActor); for (const n of B.npcs) if (n.on) { n.on = false; n.a.holder.visible = false; }
        stage('bispo2', cx, cz, 0, 'Triple_Combo_Attack', { from: .4 }); byId.bispo2.atkClip = 'Triple_Combo_Attack';
        [[-1.1, 1.5], [.4, 1.7], [1.5, 1.2], [-.3, 2.6]].forEach(([dx, dz], i) => { const n = spawn(cx + dx, cz + dz, Math.PI + dx * .3, 'Triple_Combo_Attack', i * .7); if (n) n.st = 'attack'; }); });
      once('s2a', 15.1, bt, () => { attack('bispo2', 'Double_Blade_Spin', 1.0, 1.15); });
      once('s2b', 16.0, bt, () => { attack('bispo2', 'Attack', 0, .35); B.npcs.filter(n => n.on && n.dis < 0).forEach((n, i) => moveTo(n, px + (i - 1) * 1.1, pz + (i % 2) * .8, true));
        for (let i = 0; i < 4; i++) { const n = spawn(px - 7 + i * 4.5, pz + 9 + hash(i) * 2, Math.PI, 'Running'); moveTo(n, px - 2.2 + i * 1.4, pz + .6 + hash(i + 1), true); }
        cosmic = cosmicM.createCosmicUlt({ U: COSMIC_U, ground: () => 0 }).start({ x: px, z: pz }, { x: cx, z: cz }, { x: cx, z: cz + 3, r: 40 }); });
      if (cosmic && !cosmic.done) { for (const ev of cosmic.step(dt, { x: px, y: 0, z: pz, iframes: true })) {
          if (ev.type === 'impact') { B.trauma = Math.max(B.trauma, reduced ? .2 : .7); explosions.burst(_v.set(px, .6, pz), 2.6, { dir: _v2.set(0, 1, 0), dur: 2.8 }); for (const n of B.npcs) if (n.on && n.dis < 0) { const p = n.a.holder.position; if (Math.hypot(p.x - px, p.z - pz) < 7) strike(n, px, pz, 1.4); } }
          if (ev.type === 'detonate') { for (let i = 0; i < (low ? 3 : 5); i++) { const a = i / 5 * 6.283; explosions.burst(_v.set(px + Math.cos(a) * 4.5, .8, pz + Math.sin(a) * 4.5), 1.6, { dir: _v2.set(Math.cos(a), .6, Math.sin(a)), dur: 2.2 }); } state.flash = Math.max(state.flash, reduced ? .2 : .55); } }
        const B2 = byId.bispo2; cosmicVfx.update(cosmic, { camera, boss: { x: cx, y: 0, z: cz, yaw: B2.holder.rotation.y }, low }, dt); }
      if (t < 3.6 || !cosmic) lerpShot(t / 3.6, [cx + 1.6, .45, cz + 5.6, cx, 1.7, cz, F(44, 62)], [cx + .9, .5, cz + 5.1, cx, 1.8, cz, F(44, 62)]);
      else if (cosmic.st.pi === 0) { const k = smooth(cosmic.st.pt / 1.5); shot(cx + 2.6 - k * .6, .55, cz + 6.2 - k * 1.4, cx, 2.4 + 2.6 * k, cz, F(50, 66)); } // baixa, 3/4 de frente, aproximando: o bispo e a presença acima dele
      else { const c = cosmic.camera({ boss: { x: cx, y: 0, z: cz, yaw: 0 }, hero: { x: px, y: 0, z: pz }, camYaw: 0 }); // a gramática da própria ultimate (fov = base do jogo + desvio do plano)
        if (c.w > 0) shot(c.pos[0], c.pos[1], c.pos[2], c.look[0], c.look[1], c.look[2], clamp(F(56, 70) + c.fov + (cosmic.st.fovAdd || 0), 30, 100)); else shot(px - 18, 7, pz + 18, px, 3, pz, F(40, 56)); }
    }
    /* ---- 3. ZAR'KHAEL: combate circular, pausa, Seis Selos ---- */
    if (seg.id === 'zarkhael') { const t = bt - 24.2, [cx, cz] = C3;
      once('s3', 24.2, bt, () => { hide('bispo2'); cosmicVfx.clear(); cosmic = null; for (const n of B.npcs) if (n.on) { n.on = false; n.a.holder.visible = false; }
        stage('bispo3', cx, cz, .6, 'Weapon_Combo', { from: .1, speed: .0 }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const n = spawn(cx + Math.sin(a) * 4.2, cz + Math.cos(a) * 4.2, a + Math.PI, 'Walking', i * .2); moveTo(n, cx + Math.sin(a) * 2.2, cz + Math.cos(a) * 2.2, i % 2 === 0); } });
      once('s3a', 24.9, bt, () => attack('bispo3', 'Weapon_Combo', .35, 1.1));
      once('s3b', 27.0, bt, () => { attack('bispo3', 'Axe_Spin_Attack', .3, 1.05); });
      once('s3c', 28.6, bt, () => { const a = play(byId.bispo3, 'Skill_03', { fade: .4, from: 0 }); if (a) a.timeScale = 0; byId.bispo3.atkClip = null; // pausa intencional: tudo hesita
        for (let i = 0; i < 4; i++) { const ang = i / 4 * 6.283 + .7, n = spawn(cx + Math.sin(ang) * 9, cz + Math.cos(ang) * 9, ang + Math.PI, 'Walking'); moveTo(n, cx + Math.sin(ang) * 3.6, cz + Math.cos(ang) * 3.6, false); }
        B.npcs.filter(n => n.on && n.dis < 0 && n.st !== 'move').forEach(n => { n.st = 'idle'; play(n.a, 'Alert', { fade: .4, loop: true }); }); });
      once('s3d', 29.4, bt, () => { const a = play(byId.bispo3, 'Skill_03', { fade: .2, from: 0 }); if (a) a.timeScale = .8; seals = sealsM.createZarkhaelSixSeals({ U: SEALS_U }).start({ x: cx, y: 0, z: cz, yaw: .6 }, { x: cx, z: cz, y: 0, r: 11 }); });
      if (seals && !seals.done) { for (const ev of seals.step(dt, null)) if (ev.type === 'burst') { for (const n of B.npcs) if (n.on && n.dis < 0) strike(n, cx, cz, 1.2); for (let i = 0; i < (low ? 3 : 6); i++) { const a = i / 6 * 6.283; explosions.burst(_v.set(cx + Math.cos(a) * 6, 1 + hash(i) * 2, cz + Math.sin(a) * 6), 1.5, { dir: _v2.set(0, 1, 0), dur: 2 }); } B.trauma = Math.max(B.trauma, reduced ? .15 : .5); state.flash = Math.max(state.flash, reduced ? .15 : .4); }
        sealsVfx.update(seals, { boss: { x: cx, y: 0, z: cz, yaw: .6 }, camera, low, ground: () => 0 }, dt); }
      if (t < 4.4) { const ang = .9 + t * .42, r = F(5.6, 6.6); shot(cx + Math.sin(ang) * r, .85, cz + Math.cos(ang) * r, cx, 1.6, cz, F(44, 60)); }
      else if (t < 5.2) lerpShot((t - 4.4) / .8, [cx + 1.9, 1.1, cz + 2.6, cx, 1.8, cz, F(36, 50)], [cx + 1.7, 1.1, cz + 2.35, cx, 1.8, cz, F(35, 49)]);
      else if (seals && !seals.done) { const st = seals.st, k = st.pi === 0 ? 0 : st.pi === 1 ? smooth(st.pt / SEALS_U.seals) : 1, h = SEALS_U.heights[5] * k; // sobe com a pilha de selos; a erupção é vista de cima, inclinada
        if (st.pi < 2) shot(cx + F(7.5, 8.5), 1.4 + h * .75, cz + F(9, 11), cx, 1.6 + h * .62, cz, F(46, 64)); else lerpShot(st.pt / SEALS_U.explosions, [cx + 10, 12, cz + 13, cx, 2, cz, F(50, 68)], [cx + 11, 13, cz + 14.5, cx, 2.4, cz, F(50, 68)]); }
      else lerpShot((t - 9.7) / .9, [cx + 2.6, .8, cz + 3.4, cx, 1.6, cz, F(40, 56)], [cx + 2.3, .8, cz + 3.0, cx, 1.65, cz, F(40, 56)]);
    }
    /* ---- 4. GANÂNCIA: agressão, fase II no ar, câmera lenta, a Coroa ---- */
    if (seg.id === 'ganancia') { const t = bt - 34.6, [cx, cz] = C4, G = byId.ganancia, G2 = B.g2;
      once('s4', 34.6, bt, () => { hide('bispo3'); sealsVfx.clear(); seals = null; for (const n of B.npcs) if (n.on) { n.on = false; n.a.holder.visible = false; }
        stage('ganancia', cx, cz, 0, 'Triple_Combo_Attack', { from: .5 }); G.atkClip = 'Triple_Combo_Attack';
        for (let i = 0; i < 6; i++) { const x = cx - 3.5 + i * 1.4, n = spawn(x, cz + 6 + (i % 2) * 1.5, Math.PI, 'Running'); moveTo(n, cx - 1.6 + i * .65, cz + 1.3 + (i % 3) * .35, true); } });
      once('s4a', 36.1, bt, () => attack('ganancia', 'Weapon_Combo', .45, 1.15));
      once('s4b', 37.5, bt, () => { if (!G2) return; hide('ganancia'); G2.holder.visible = true; G2.holder.position.set(cx, 0, cz); G2.holder.rotation.set(0, 0, 0); G2.mixer.stopAllAction(); G2.act = null; play(G2, 'GK_cast', { fade: 0, loop: true }); if (G2.act) { G2.act.setLoop(T.LoopPingPong, Infinity); G2.act.timeScale = .45; }
        for (const w of G.weapons) { w.hand = G2.bones[w.side + 'Hand']; w.root.visible = true; w.boneWant = 1; w.bone = 1; } G2.airY = 0;
        for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .4; spawn(cx + Math.sin(a) * 7, cz + Math.cos(a) * 7, a + Math.PI, 'Running'); } B.npcs.filter(n => n.on && n.dis < 0).forEach((n, i) => { const p = n.a.holder.position, a = Math.atan2(p.x - cx, p.z - cz); moveTo(n, cx + Math.sin(a) * 3.2, cz + Math.cos(a) * 3.2, true); }); });
      once('s4c', 38.7, bt, () => { B.npcs.filter(n => n.on && n.dis < 0).forEach((n, i) => { const p = n.a.holder.position; leapAt(n, lerp(p.x, cx, .6), 2.2 + (i % 3) * .4, lerp(p.z, cz, .6), 1.5); }); corS.phase = 'charge'; corS.progress = 0; });
      once('s4d', 40.6, bt, () => { corS.phase = 'detonate'; corS.progress = 0; corS.front = 0; B.trauma = reduced ? .2 : .8; state.flash = Math.max(state.flash, reduced ? .2 : .6);
        for (const n of B.npcs) if (n.on && n.dis < 0) strike(n, cx, cz, 1.6); for (let i = 0; i < (low ? 4 : 7); i++) { const a = i / 7 * 6.283; explosions.burst(_v.set(cx + Math.cos(a) * (3 + hash(i) * 4), .6 + hash(i + 2) * 1.5, cz + Math.sin(a) * (3 + hash(i) * 4)), 1.4 + hash(i + 4) * .8, { dir: _v2.set(Math.cos(a), .7, Math.sin(a)), dur: 2.4 }); } explosions.burst(_v.set(cx, 4.2, cz), 1.2, { dir: _v2.set(0, -1, 0), dur: 1.6 }); });
      if (G2 && G2.holder.visible) { const want = t < 3.0 ? 0 : t < 4.6 ? 4.2 * smooth((t - 3.0) / 1.6) : 4.2 + Math.sin(bt * 1.6) * .12; G2.airY = want; G2.holder.position.y = want; wings(G2, dt, t < 4.6 ? 'flap' : 'hover'); G2.blob.position.y = -want / G2.holder.scale.y + .012; G2.blob.scale.setScalar(G2.H / 2.1 * (1 - clamp(want / 8, 0, .6)));
        G2.mixer.update(dt); G2.model.updateMatrixWorld(true); updateWeapons(G, dt); for (const e of G2.eyes) e.material.uniforms.uT.value = state.real; G2.bones.UpperChest.getWorldPosition(corAnchor); }
      // câmera lenta: UM tempo, só na concentração (inimigos suspensos no salto)
      if (t >= 4.5 && t < 6.0 && !reduced) slow = .2;
      if (corS.phase !== 'idle') { const dur = corS.phase === 'charge' ? 1.9 : corS.phase === 'detonate' ? 1.15 : 2.6; corS.progress = Math.min(1, corS.progress + dt / dur); corS.front = corS.phase === 'detonate' ? CR * smooth(corS.progress) + 1 : 0; corona.update(corS, state.real, corAnchor); if (corS.phase === 'detonate' && corS.progress >= 1) { corS.phase = 'idle'; corona.update(corS, state.real, corAnchor); } } // a consequência fica com fumaça e brasas (sem o lençol do 'aftermath')
      if (t < 1.5) lerpShot(t / 1.5, [cx - 2.8, .9, cz + 3.6, cx, 1.6, cz + .3, F(46, 62)], [cx - 2.2, .85, cz + 3.2, cx, 1.65, cz + .3, F(46, 62)]);
      else if (t < 2.9) lerpShot((t - 1.5) / 1.4, [cx + 1.2, .5, cz + 2.3, cx, 1.65, cz, F(52, 68)], [cx + 1.4, .55, cz + 2.05, cx, 1.7, cz, F(52, 68)]);
      else if (t < 4.5) lerpShot((t - 2.9) / 1.6, [cx + 6, 1.4, cz + 9, cx, 2.2, cz, F(40, 56)], [cx + 5, 1.2, cz + 8, cx, 3.6, cz, F(40, 56)]);
      else if (t < 6.0) lerpShot((t - 4.5) / 1.5, [cx - 2.2, .8, cz + 6.4, cx, 5.0, cz, F(48, 64)], [cx - 1.9, .7, cz + 6.0, cx, 5.2, cz, F(46, 62)]);
      else if (t < 7.2) lerpShot((t - 6) / 1.2, [cx + 11, 2.2, cz + 15, cx, 3.2, cz, F(40, 56)], [cx + 12, 2.6, cz + 16.5, cx, 3.6, cz, F(42, 58)]);
      else lerpShot((t - 7.2) / 3.2, [cx - 5, 1.6, cz + 9, cx, 3.8, cz, F(38, 54)], [cx - 3.8, 1.8, cz + 7.6, cx, 4.2, cz, F(38, 54)]);
    }
    /* ---- 5. os quatro Bispos e a Ganância acima; o título nasce ---- */
    if (seg.id === 'final') { const t = bt - 45, G2 = B.g2, G = byId.ganancia;
      once('s5', 45, bt, () => { corS.phase = 'idle'; corona.update(corS, state.real, corAnchor); for (const n of B.npcs) if (n.on) { n.on = false; n.a.holder.visible = false; }
        const xs = F([-3.4, -1.15, 1.15, 3.4], [-1.9, -.65, .65, 1.9]), zs = [.3, 0, 0, .3];
        stage('bispo1', xs[0], zs[0], .12, 'Axe_Spin_Attack', { speed: 0, from: .05 }); stage('bispo2', xs[1], zs[1], .05, 'Attack', { speed: 0, from: .15 }); stage('bispo3', xs[2], zs[2], -.05, 'Weapon_Combo', { speed: 0, from: .05 }); stage('bispo4', xs[3], zs[3], -.12, 'Idle_14', { loop: true, speed: .5 });
        if (G2) { G2.holder.visible = true; G2.holder.position.set(0, F(3.4, 3.7), -4.5); G2.holder.rotation.set(0, 0, 0); for (const w of G.weapons) { w.hand = G2.bones[w.side + 'Hand']; w.root.visible = true; } } else stage('ganancia', 0, -1.4, 0, 'Idle_14', { loop: true, speed: .5 });
        if (B.title) { B.title.object.visible = true; layoutTitle(); } });
      if (G2 && G2.holder.visible) { G2.holder.position.y = F(3.4, 3.7) + Math.sin(bt * 1.4) * .1; wings(G2, dt, 'hover'); G2.blob.position.y = -G2.holder.position.y + .012; G2.mixer.update(dt); G2.model.updateMatrixWorld(true); updateWeapons(G, dt); for (const e of G2.eyes) e.material.uniforms.uT.value = state.real; }
      lerpShot(t / 8, [0, .75, F(9.2, 9.8), 0, F(2.45, 3.3), -1, F(46, 62)], [0, .8, F(8.4, 9.0), 0, F(2.55, 3.4), -1, F(46, 62)]);
      if (B.title) B.title.set(smooth((t - 1.2) / 2.8), smooth((t - 3.6) / 1.4), state.real, renderer.getPixelRatio());
    }
    // antagonistas em batalha: animação, golpes, olhos e armas
    for (const id of ids) { const a = byId[id]; if (!a || a.mode !== 'battle' || !a.holder.visible) continue; a.mixer.update(dt); a.model.updateMatrixWorld(true); if (a.act && a.atkClip) hits(a); for (const e of a.eyes) e.material.uniforms.uT.value = state.real; updateWeapons(a, dt); }
    if (B.g2 && B.g2.holder.visible) { const a = B.g2; if (a.act && a.atkClip) hits(a); }
    let active = 0; for (const n of B.npcs) if (n.on) { npcUpdate(n, dt); active++; } B.telemetry.maxNpcs = Math.max(B.telemetry.maxNpcs, active); B.active = active;
    emberUpdate(dt); emberPts.material.uniforms.uPix.value = renderer.getPixelRatio();
    // câmera final (QA pode fixar), tremor curto
    B.trauma = Math.max(0, B.trauma - rdt * 1.4); const tr = reduced ? 0 : B.trauma * B.trauma;
    if (B.qaCam) { camera.position.set(...B.qaCam[0]); camera.lookAt(...B.qaCam[1]); if (B.qaCam[2]) camera.fov = B.qaCam[2]; }
    else { camera.position.copy(cam.pos).add(_v.set(Math.sin(state.real * 37) * .12 * tr, Math.sin(state.real * 41 + 1) * .09 * tr, 0)); camera.lookAt(cam.look); camera.fov = cam.fov; }
    camera.updateProjectionMatrix();
    return { slow, done: bt >= BATTLE_LEN };
  }

  /* título por partículas, preso à câmera; largura cabe na tela em retrato e paisagem */
  function layoutTitle() { if (!B.titles) return; const on = B.title && B.title.object.visible; B.titles.L.object.visible = B.titles.P.object.visible = false; B.title = B.portrait ? B.titles.P : B.titles.L; B.title.object.visible = !!on; const d = 6, vh = 2 * d * Math.tan(camera.fov * Math.PI / 360), vw = vh * camera.aspect, w = Math.min(vw * .86, vh * 1.3);
    B.title.object.scale.setScalar(w); B.title.object.position.set(0, vh * F(.355, .31), -d); }

  /* ================= montagem: NPCs, fase II, título e pré-compilação ================= */
  await Promise.all([loadNpcs(), loadG2().catch(e => ctx.log('fase II indisponível: ' + e.message))]);
  if (state.disposed) return null;
  const titleL = FX.createTitle(T, camera, TITLE, { width: 1, low, keep }), titleP = FX.createTitle(T, camera, TITLE_P, { width: 1, low, keep, lines: 3 }); titleL.object.visible = titleP.object.visible = false;
  B.titles = { L: titleL, P: titleP }; B.title = B.portrait ? titleP : titleL;
  // pré-compila TUDO o que a batalha usa (cenário, NPCs, VFX originais, título) antes do primeiro quadro dela: força a
  // visibilidade só dentro da chamada síncrona (o compileAsync recolhe os materiais na hora) e desfaz em seguida
  const roots = [field, ...B.npcs.map(n => n.a.holder), B.g2 && B.g2.holder, titleL.object, titleP.object].filter(Boolean), saved = [];
  for (const r of roots) r.traverse(o => saved.push([o, o.visible])); const force = () => { for (const [o] of saved) o.visible = true; }, restore = () => { for (const [o, v] of saved) o.visible = v; };
  force(); let p = null; try { p = renderer.compileAsync ? renderer.compileAsync(scene, camera) : (renderer.compile(scene, camera), null); } catch (e) { p = null; } restore();
  if (p) await p.catch(() => {});
  // primeiro uso (buffers e uniformes) fatiado: um grupo por quadro, desenhado em 1 px
  for (const r of roots) { if (state.disposed) return null; await new Promise(res => requestAnimationFrame(res)); const sv = []; r.traverse(o => { sv.push([o, o.visible]); o.visible = true; });
    try { const sc = renderer.getScissorTest(); renderer.setScissorTest(true); renderer.setScissor(0, 0, 1, 1); renderer.render(scene, camera); renderer.setScissorTest(sc); } catch (_) {} for (const [o, v] of sv) o.visible = v; }
  B.ready = true;
  return { get ready() { return B.ready; }, B, field, begin, end, update, layout(portrait) { B.portrait = portrait; layoutTitle(); },
    stats() { return { seg: B.seg, t: +B.t.toFixed(2), npcsActive: B.active || 0, npcsMax: B.telemetry.maxNpcs, npcPool: B.npcs.length, g2: !!B.g2, embers: EN, titlePoints: B.title ? B.title.count : 0 }; },
    dispose() { try { judge.dispose(); } catch (_) {} try { cosmicVfx.dispose(); } catch (_) {} try { sealsVfx.dispose(); } catch (_) {} try { corona.dispose(); } catch (_) {} for (const n of B.npcs) { n.a.mixer.stopAllAction(); n.a.mixer.uncacheRoot(n.a.model); } if (B.g2) { B.g2.mixer.stopAllAction(); } } };
}
