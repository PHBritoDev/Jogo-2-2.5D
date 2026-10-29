import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 233 — Espada Quantum. Mesmo referencial das outras lâminas procedurais (origem no pomo, lâmina ao longo de +Y,
 * comprimento ~1,38), então encaixa na mão pelo mesmo alinhamento da Aurora.
 *  • Empunhadura vermelha ornamentada (anéis dourados), pomo dourado com gema.
 *  • Guarda: aro dourado em volta de um NÚCLEO ESCURO (poço de luz com horizonte brilhante) e duas órbitas finas —
 *    dourado-branca e violeta — girando em eixos inclinados, com faíscas discretas em órbita.
 *  • Lâmina longa e fina de luz: volume real (extrusão com bisel), gradiente ouro → magenta → violeta no shader, filete
 *    central branco e borda que pulsa no ritmo das órbitas.
 * Baixa geometria; nada de luz dinâmica. O núcleo é decorativo (não puxa nada do cenário).
 */
const BLADE_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const BLADE_FRAG = `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time, len;
void main(){ float u=clamp(vP.y/len,0.,1.); float f=pow(1.-abs(dot(normalize(vN),vV)),2.);
 vec3 c=mix(vec3(1.,.78,.32),vec3(1.,.28,.66),smoothstep(.1,.6,u)); c=mix(c,vec3(.66,.42,1.),smoothstep(.55,1.,u));
 float core=exp(-pow(vP.x/.008,2.))*.9; float pulse=.85+.15*sin(time*6.-u*14.);
 vec3 col=c*(1.1+f*1.4)*pulse+vec3(1.)*core; gl_FragColor=vec4(col,1.); }`;
const CORE_FRAG = `varying vec3 vN; varying vec3 vV; uniform float time; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),3.);
 vec3 c=vec3(.0)+mix(vec3(1.,.85,.5),vec3(.7,.45,1.),.5+.5*sin(time*2.))*f*2.2; gl_FragColor=vec4(c,1.); }`;

export function buildQuantumSword(T) {
  const g = new T.Group(); g.name = 'Quantum';
  const uniforms = { time: { value: 0 }, len: { value: .86 } };
  // lâmina: longa e fina, com bisel (volume) e ponta alongada
  const sh = new T.Shape(); sh.moveTo(-.034, 0); sh.lineTo(-.036, .62); sh.lineTo(-.022, .8); sh.lineTo(0, .9); sh.lineTo(.022, .8); sh.lineTo(.036, .62); sh.lineTo(.034, 0); sh.lineTo(-.034, 0);
  const bladeGeo = new T.ExtrudeGeometry(sh, { depth: .01, bevelEnabled: true, bevelThickness: .009, bevelSize: .008, bevelSegments: 1 }); bladeGeo.translate(0, 0, -.005);
  const blade = new T.Mesh(bladeGeo, new T.ShaderMaterial({ vertexShader: BLADE_VERT, fragmentShader: BLADE_FRAG, uniforms, toneMapped: false })); blade.position.y = .48; g.add(blade);
  // guarda com núcleo escuro e órbitas
  const gold = new T.MeshStandardMaterial({ color: 0xe8b450, metalness: .85, roughness: .28, emissive: 0x4a2a06, emissiveIntensity: .6 });
  const guardY = .36, frame = new T.Mesh(new T.TorusGeometry(.085, .014, 8, 32), gold); frame.position.y = guardY; g.add(frame);
  for (const sx of [-1, 1]) { const q = new T.Mesh(new T.ConeGeometry(.022, .14, 6), gold); q.position.set(sx * .14, guardY + .01, 0); q.rotation.z = -sx * 1.25; g.add(q); }
  const core = new T.Mesh(new T.SphereGeometry(.06, 20, 14), new T.ShaderMaterial({ vertexShader: BLADE_VERT, fragmentShader: CORE_FRAG, uniforms, toneMapped: false })); core.position.y = guardY; g.add(core);
  const orbitMats = [new T.MeshBasicMaterial({ color: 0xffe7b0, toneMapped: false }), new T.MeshBasicMaterial({ color: 0xa877ff, toneMapped: false })];
  const orbits = orbitMats.map((m, i) => { const o = new T.Group(); o.position.y = guardY; o.rotation.set(i ? 1.1 : .35, 0, i ? -.5 : .7); const ring = new T.Mesh(new T.TorusGeometry(.13 + i * .025, .0045, 4, 48), m); ring.scale.set(1, .62, 1); o.add(ring);
    const bead = new T.Mesh(new T.SphereGeometry(.012, 6, 5), m); bead.position.set(.13 + i * .025, 0, 0); ring.add(bead); g.add(o); return { o, ring }; });
  // empunhadura vermelha ornamentada e pomo
  const grip = new T.Mesh(new T.CylinderGeometry(.024, .028, .26, 10), new T.MeshStandardMaterial({ color: 0x8a0e18, roughness: .55, metalness: .2, emissive: 0x2a0204, emissiveIntensity: .6 })); grip.position.y = .18; g.add(grip);
  for (let k = 0; k < 4; k++) { const r = new T.Mesh(new T.TorusGeometry(.029, .006, 6, 16), gold); r.rotation.x = Math.PI / 2; r.position.y = .07 + k * .07; g.add(r); }
  const pommel = new T.Mesh(new T.OctahedronGeometry(.04, 0), gold); pommel.position.y = .02; pommel.scale.set(1, 1.3, 1); g.add(pommel);
  const gem = new T.Mesh(new T.SphereGeometry(.018, 8, 6), new T.MeshBasicMaterial({ color: 0xff3a50, toneMapped: false })); gem.position.y = .02; g.add(gem);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  g.userData.tick = t => { uniforms.time.value = t; orbits[0].ring.rotation.z = t * 2.4; orbits[1].ring.rotation.z = -t * 1.8; };
  g.userData.tipLocal = new T.Vector3(0, 1.38, 0); g.userData.coreLocal = new T.Vector3(0, guardY, 0);
  return g; // origem no pomo, lâmina ao longo de +Y, comprimento ~1,38
}

/**
 * VFX exclusivos da Quantum: no golpe, a ponta da lâmina deixa um arco de energia (centro claro, bordas violeta) e
 * duas órbitas elípticas que se alongam no sentido do corte; no acerto, um "colapso estelar" em miniatura:
 * implosão curta de faíscas para o ponto, anel que se fecha e estoura num clarão dourado-violeta.
 */
export function createQuantumFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'QuantumFX'; scene.add(root);
  const glow = softParticles(T, 260), rib = ribbons(T, 260, { flow: 30 }), decals = groundDecals(T, 4); root.add(glow.mesh, rib.mesh, decals.mesh);
  const HN = 24, hist = Array.from({ length: HN }, () => ({ tip: new T.Vector3(), base: new T.Vector3(), t: -9 })); let hi = 0;
  const impacts = Array.from({ length: 4 }, () => ({ p: new T.Vector3(), t: -9 })); let ii = 0, time = 0;
  const G = [1, .82, .45, 1], V = [.7, .45, 1, 1], M = [1, .35, .75, 1], c4 = (c, a) => [c[0], c[1], c[2], a], nrm = [0, 1, 0];
  return {
    root,
    impact(p) { const s = impacts[ii = (ii + 1) % impacts.length]; s.p.copy(p); s.t = time; },
    update(dt, camera, { tip = null, base = null, swinging = false, quality = 1 } = {}) {
      time += dt; const low = quality === 0; rib.begin(camera, time); glow.begin(); decals.begin();
      if (swinging && tip && base) { hi = (hi + 1) % HN; hist[hi].tip.copy(tip); hist[hi].base.copy(base); hist[hi].t = time; }
      for (let k = 0; k < HN - 1; k++) {
        const a = hist[(hi - k + HN) % HN], b = hist[(hi - k - 1 + HN) % HN]; if (b.t < 0 || time - b.t > .22) break;
        const fa = 1 - (time - a.t) / .22, fb = 1 - (time - b.t) / .22;
        // arco energético: faixa entre o meio da lâmina e a ponta, com centro claro
        const mx = (a.tip.x + a.base.x) / 2, my = (a.tip.y + a.base.y) / 2, mz = (a.tip.z + a.base.z) / 2, nx = (b.tip.x + b.base.x) / 2, ny = (b.tip.y + b.base.y) / 2, nz = (b.tip.z + b.base.z) / 2;
        rib.seg(a.tip.x, a.tip.y, a.tip.z, b.tip.x, b.tip.y, b.tip.z, .11 * fa, .11 * fb, c4(V, fa), c4(M, fb * .8), k / 10, (k + 1) / 10);
        rib.seg(mx, my, mz, nx, ny, nz, .05 * fa, .05 * fb, c4(G, fa * .9), c4(G, fb * .6), k / 10, (k + 1) / 10);
        if (!low && k % 3 === 0) { // órbitas elípticas que se alongam no sentido do golpe
          const ang = time * 9 + k, ox = Math.cos(ang) * .16, oy = Math.sin(ang) * .07;
          glow.add(a.tip.x + ox, a.tip.y + oy, a.tip.z - ox, .08, .08, k % 2 ? .7 : 1, k % 2 ? .45 : .85, k % 2 ? 1 : .45, fa, 2, ang, k);
        }
      }
      for (const s of impacts) { const A = time - s.t; if (A < 0 || A > .55) continue; const P = s.p;
        if (A < .16) { for (let i = 0; i < (low ? 8 : 18); i++) { const a = i * 2.39996, r = (1 - A / .16) * 1.2; glow.add(P.x + Math.cos(a) * r, P.y + Math.sin(a * 1.3) * r * .7, P.z + Math.sin(a) * r, .04, .22, i % 2 ? .7 : 1, i % 2 ? .45 : .85, i % 2 ? 1 : .45, A / .16, 3, a + Math.PI / 2, i); }
          glow.add(P.x, P.y, P.z, .3 + A * 2, .3 + A * 2, 0, 0, 0, 0, 0); }
        else { const k = (A - .16) / .39; glow.add(P.x, P.y, P.z, 2.2 * (1 - k) + .3, 2.2 * (1 - k) + .3, 1, .8, .9, 1 - k, 0); glow.add(P.x, P.y, P.z, 3 * (1 - k), .14, .8, .6, 1, 1 - k, 2, 0);
          for (let i = 0; i < (low ? 6 : 14); i++) { const a = i * 2.39996, d = 2.5 * easeOut(k); glow.add(P.x + Math.cos(a) * d, P.y + Math.sin(a * 2) * d * .4, P.z + Math.sin(a) * d, .05, .3, 1, .7, 1, 1 - k, 3, a, i); }
          const gy = ground(P.x, P.z); if (P.y - gy < 2.2) decals.add(P.x, gy, P.z, .6 + 2 * easeOut(k), .8, .5, 1, (1 - k) * .8, 0, k, 9, groundNormal(ground, P.x, P.z, nrm)); }
      }
      rib.end(); glow.end(); decals.end(time);
    },
    clear() { for (const h of hist) h.t = -9; for (const s of impacts) s.t = -9; },
    dispose() { scene.remove(root); glow.dispose(); rib.dispose(); decals.dispose(); }
  };
}
