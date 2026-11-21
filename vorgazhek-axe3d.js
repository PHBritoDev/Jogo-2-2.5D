/**
 * MISSÃO 20/11 — MACHADO DO ABISMO de VORGAZHEK (Bispo 2): arma 3D ORIGINAL, procedural e volumétrica.
 * Inspiração do criador (machado de lâmina dupla com canais hexagonais e orbe no topo), reinterpretada na linguagem do
 * Bispo 2: metal grafite/obsidiana PBR, recessos índigo com canais hexagonais pulsando, núcleo azul-profundo com coração
 * branco-azulado contido e gumes ciano-glaciais. Nada roxo, nada copiado: silhueta ASSIMÉTRICA (lâmina frontal maior em
 * crescente com barba em gancho; lâmina traseira menor, angulosa) para ler "duas lâminas" à distância.
 *
 * Eixo local: +Y = cabeça; origem = palma (ponto da pega); +X = gume frontal; Z = normal da face. Metros, escala 1.
 * userData: tipA/tipB (segmento principal do traço), edges (segmentos de dano das DUAS lâminas + haste), head (centro),
 * core (centro do orbe), fx (grupo de mundo, vazio), tick(time), updateFx(time, phase, low, visible), charge(k) (0..1:
 * brilho do núcleo e da lâmina de energia longa ao longo da cabeça — usada na Ascensão da Maré Abissal), energyTip().
 * Geometria e materiais criados uma vez por chefe; nada é alocado por quadro.
 */
export const ABYSS_AXE = Object.freeze({ scale: 1.12, butt: -.56, top: 1.2, head: .62, core: .98, front: .47, back: .35, energy: 1.25 });

function hexTexture(T) { // canais hexagonais (emissiveMap) gerados por código: funciona sem canvas (testes em Node)
  const N = 128, d = new Uint8Array(N * N * 4), sy = Math.sqrt(3), cells = 6, fl = Math.floor;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x / N * cells, py = y / N * cells * sy / 2; // período vertical = 2 linhas de células // grade hexagonal "pointy" (distância à borda da célula mais próxima)
    const ax = px - (fl(px) + .5), ay = py - (fl(py / sy) + .5) * sy, bx = px - .5 - (fl(px - .5) + .5), by = py - sy / 2 - (fl((py - sy / 2) / sy) + .5) * sy;
    const [gx, gy] = ax * ax + ay * ay < bx * bx + by * by ? [ax, ay] : [bx, by];
    const e = .5 - Math.max(Math.abs(gx) * .5 + Math.abs(gy) * .8660254, Math.abs(gx));
    const v = Math.round(255 * Math.max(0, 1 - Math.abs(e) * 14));
    const i = (y * N + x) * 4; d[i] = v * .3; d[i + 1] = v * .55; d[i + 2] = v; d[i + 3] = 255;
  }
  const t = new T.DataTexture(d, N, N, T.RGBAFormat); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1.6, 1.6); t.needsUpdate = true; return t;
}

function bladeShape(T, P) { const s = new T.Shape(); s.moveTo(...P[0]); for (let i = 1; i < P.length; i++) { const p = P[i]; if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); } s.closePath(); return s; }
/** Faixa do gume: amostra o arco externo e o desloca para dentro (largura w) — geometria fina, emissiva, à frente do corpo. */
function edgeBand(T, pts, w) { const s = new T.Shape(), n = pts.length, inner = [];
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, k = Math.sin(Math.PI * i / (n - 1)) * .85 + .15; inner.push([pts[i][0] - ty / l * w * k * Math.sign(pts[i][0] || 1) * -1, pts[i][1] + tx / l * w * k * Math.sign(pts[i][0] || 1) * -1]); }
  s.moveTo(...pts[0]); for (let i = 1; i < n; i++) s.lineTo(...pts[i]); for (let i = n - 1; i >= 0; i--) s.lineTo(...inner[i]); s.closePath(); return s; }
const arcPts = (cx, cy, r, a0, a1, n, sx = 1) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (n - 1); return [cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r]; });

/** Junta as malhas estáticas por material (25 malhas → 4 chamadas de desenho); sem dependência de addons. */
function mergeStatic(T, root, keep) {
  const groups = new Map(); root.updateMatrixWorld(true);
  for (const m of [...root.children]) { if (!m.isMesh || keep.has(m)) continue; (groups.get(m.material) || groups.set(m.material, []).get(m.material)).push(m); }
  for (const [mat, list] of groups) {
    const parts = list.map(m => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrix); return g; });
    const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
    for (const m of list) { root.remove(m); m.geometry.dispose(); }
    const mm = new T.Mesh(geo, mat); mm.name = list[0].name || 'Machado'; root.add(mm);
  }
}

export function buildAbyssAxe(T, { quality = 1 } = {}) {
  const A = ABYSS_AXE, root = new T.Group(); root.name = 'VorgazhekMachado';
  const hex = hexTexture(T), seg = quality ? 1 : .6;
  const metal = new T.MeshStandardMaterial({ color: 0x454a5c, metalness: .8, roughness: .3, emissive: 0x1a2a8a, emissiveMap: hex, emissiveIntensity: .22 }); // grafite claro o bastante para ler na Dimensão II escura
  const dark = new T.MeshStandardMaterial({ color: 0x0d0e15, metalness: .7, roughness: .5, emissive: 0x0a0c2a, emissiveIntensity: .4 });
  const recess = new T.MeshStandardMaterial({ color: 0x10123a, metalness: .5, roughness: .6, emissive: 0x2433b8, emissiveMap: hex, emissiveIntensity: .85 });
  const edgeM = new T.MeshBasicMaterial({ color: 0x8ff2ff, toneMapped: false });
  const coreM = new T.MeshBasicMaterial({ color: 0xe6f6ff, toneMapped: false });
  const shellM = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: .35 }, time: { value: 0 } },
    vertexShader: 'varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float k,time;varying vec3 vN,vV;void main(){float f=1.-abs(dot(vN,vV));float a=(pow(f,2.2)*.9+.12)*(.55+k*.9)*(.85+.15*sin(time*6.));gl_FragColor=vec4(mix(vec3(.08,.2,1.),vec3(.55,.92,1.),f*k),a);}' });
  const add = (geo, mat, x = 0, y = 0, z = 0, name) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; root.add(m); return m; };
  // ---- haste: grafite com colares e empunhadura escura; ponta inferior em espinho ----
  const hl = A.head + .3 - A.butt; add(new T.CylinderGeometry(.024, .03, hl, 10 * seg | 0 || 6), metal, 0, A.butt + hl / 2);
  add(new T.CylinderGeometry(.034, .034, .34, 10), dark, 0, 0); // empunhadura (palma no centro)
  for (const y of [-.2, .19, .44]) add(new T.CylinderGeometry(.042, .042, .035, 6), metal, 0, y);
  add(new T.ConeGeometry(.04, .17, 6), metal, 0, A.butt - .07).rotation.x = Math.PI;
  // ---- alvado (socket) hexagonal que prende as duas lâminas ----
  add(new T.CylinderGeometry(.06, .07, .34, 6), metal, 0, A.head + .02);
  add(new T.CylinderGeometry(.075, .062, .05, 6), dark, 0, A.head + .21);
  // ---- lâmina frontal: crescente grande com chifre superior e barba em gancho ----
  const ex = { depth: .036, bevelEnabled: true, bevelThickness: .012, bevelSize: .014, bevelSegments: 1, curveSegments: quality ? 10 : 6 };
  const F = [[.04, .78], [.2, .9, .31, 1.03], [.38, .86, .45, .74], [.5, .62, .46, .44], [.42, .3, .3, .2], [.2, .34, .04, .47]];
  const fb = add(new T.ExtrudeGeometry(bladeShape(T, F), ex), metal, 0, 0, -.018 - .012); fb.name = 'LaminaFrontal';
  const Bk = [[-.04, .74], [-.17, .84, -.25, .93], [-.29, .8, -.36, .68], [-.38, .62, -.35, .55], [-.32, .44, -.23, .37], [-.15, .48, -.04, .52]];
  add(new T.ExtrudeGeometry(bladeShape(T, Bk), ex), metal, 0, 0, -.03).name = 'LaminaTraseira';
  // recessos índigo com canais hexagonais (faces das lâminas)
  const inset = (P, k, z) => { const c = P.reduce((s, p) => [s[0] + p.at(-2), s[1] + p.at(-1)], [0, 0]).map(v => v / P.length); return P.map(p => p.map((v, i) => (i % 2 ? c[1] + (v - c[1]) * k : c[0] + (v - c[0]) * k))); };
  for (const z of [.032, -.032]) { add(new T.ShapeGeometry(bladeShape(T, inset(F, .5)), 8), recess, 0, 0, z); add(new T.ShapeGeometry(bladeShape(T, inset(Bk, .45)), 8), recess, 0, 0, z); }
  // gumes ciano-glaciais (faixas finas que avançam além do corpo)
  const fe = arcPts(.13, .62, .38, 1.2, -1.15, 16), be = arcPts(-.1, .63, .28, 1.95, 4.3, 12);
  add(new T.ExtrudeGeometry(edgeBand(T, fe.map(p => [p[0] + .012, p[1]]), .045), { depth: .012, bevelEnabled: false }), edgeM, 0, 0, -.006).name = 'GumeFrontal';
  add(new T.ExtrudeGeometry(edgeBand(T, be.map(p => [p[0] - .01, p[1]]), .04), { depth: .012, bevelEnabled: false }), edgeM, 0, 0, -.006).name = 'GumeTraseiro';
  // espinhos da lombada (massa e ameaça, sem cobrir o orbe)
  for (const [x, y, r] of [[.1, .9, -.5], [-.09, .88, .55]]) { const c = add(new T.ConeGeometry(.022, .12, 5), dark, x, y); c.rotation.z = r; }
  // ---- coroa: garras que seguram o orbe-núcleo + espinho superior ----
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5, c = add(new T.ConeGeometry(.02, .16, 5), metal, Math.cos(a) * .05, A.core - .03, Math.sin(a) * .05); c.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
  add(new T.ConeGeometry(.03, .2, 6), metal, 0, A.top - .1);
  const core = add(new T.IcosahedronGeometry(.052, 1), coreM, 0, A.core, 0, 'Nucleo');
  const shell = add(new T.IcosahedronGeometry(.09, 2), shellM, 0, A.core, 0, 'Halo'); shell.renderOrder = 9;
  // ---- lâmina de energia longa (Ascensão da Maré Abissal): crescente que sai do gume frontal; escondida fora do golpe ----
  const enM = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { k: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float k,time;varying vec2 vUv;void main(){float x=vUv.x,y=vUv.y;float w=sin(y*3.14159);float edge=smoothstep(.55,1.,x)*w;float body=smoothstep(.0,.35,x)*(1.-smoothstep(.85,1.,x))*w;
      float flow=.6+.4*sin(y*22.-time*14.+x*6.);float a=(edge*1.4+body*.45*flow)*k;if(a<.01)discard;vec3 c=mix(vec3(.1,.16,.9),vec3(.6,.97,1.),edge);c=mix(c,vec3(1.),pow(edge,6.)*.8);gl_FragColor=vec4(c*1.3,min(1.,a));}` });
  const eg = new T.PlaneGeometry(1, 1, 1, 12), ep = eg.attributes.position, euv = eg.attributes.uv; // curva a faixa num crescente: u (0..1) = do gume para fora, v = ao longo
  for (let i = 0; i < ep.count; i++) { const u = euv.getX(i), v = euv.getY(i), a = (v - .5) * 2.2, r = .38 + u * A.energy * Math.sin(Math.PI * Math.min(1, v * 1.15)) ** .6; ep.setXYZ(i, .13 + Math.cos(a) * r, .62 + Math.sin(a) * r * .95, 0); }
  eg.computeBoundingSphere(); const energy = new T.Mesh(eg, enM); energy.name = 'LaminaEnergia'; energy.visible = false; energy.frustumCulled = false; energy.renderOrder = 11; root.add(energy);
  mergeStatic(T, root, new Set([core, shell, energy])); let charge = 0;
  for (const m of root.children) { m.geometry.scale(A.scale, A.scale, A.scale); m.position.multiplyScalar(A.scale); m.geometry.computeBoundingSphere(); }
  root.userData = {
    kind: 'axe', fx: new T.Group(), head: new T.Vector3(.08, A.head, 0).multiplyScalar(A.scale), core: new T.Vector3(0, A.core, 0).multiplyScalar(A.scale),
    tipA: new T.Vector3(0, .34, 0).multiplyScalar(A.scale), tipB: new T.Vector3(.46, .66, 0).multiplyScalar(A.scale),
    // segmentos de dano (escala embutida): haste alta→topo, gume frontal (chifre→barba), gume traseiro, ponta do gume frontal
    edges: [[[0, .3, 0], [0, 1.1, 0]], [[.32, 1.0, 0], [.32, .22, 0]], [[-.27, .9, 0], [-.27, .38, 0]], [[.47, .82, 0], [.46, .42, 0]]].map(e => e.map(p => p.map(v => +(v * A.scale).toFixed(4)))),
    tick(time) { shellM.uniforms.time.value = time; enM.uniforms.time.value = time; },
    charge(k) { charge = Math.max(0, Math.min(1, k)); },
    get charged() { return charge; },
    energyTip(out) { return out.set((.13 + .38 + A.energy) * A.scale, .62 * A.scale, 0); },
    updateFx(time, phase, low, visible) {
      shellM.uniforms.time.value = time; enM.uniforms.time.value = time; const c = charge;
      shellM.uniforms.k.value = .35 + c * .65 + (phase ? .1 : 0); shell.scale.setScalar(1 + c * (1.4 + .15 * Math.sin(time * 9)));
      core.scale.setScalar(1 + c * .45); metal.emissiveIntensity = .22 + c * .8 + .04 * Math.sin(time * 2.3); recess.emissiveIntensity = .85 + c * 1.8;
      energy.visible = visible && c > .02; enM.uniforms.k.value = c; energy.scale.set(1, 1, 1);
    },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const m of [metal, dark, recess, edgeM, coreM, shellM, enM]) m.dispose(); hex.dispose(); }
  };
  return root;
}
