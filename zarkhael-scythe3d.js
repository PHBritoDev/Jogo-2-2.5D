/**
 * MISSÃO 20/11 — FOICE DO CARRASCO de ZAR'KHAEL (Bispo 3): malha 3D ORIGINAL e procedural inspirada na referência do
 * criador (haste longa retorcida, cabeça em meia-lua de metal negro com cristas cortantes, aberturas violeta, fissuras
 * laranja-avermelhadas, chamas espectrais roxas). Nada copiado de asset externo; sem imagem plana.
 *
 * Eixo local: +Y = haste rumo à cabeça; origem = punho da mão direita; +X = lado para onde a lâmina se projeta; Z = normal
 * da face da lâmina. Escala 1 = metros do jogo (o chefe tem ~2,1 m): haste 2,6 m, cabeça ~1,2 m (≈1,45× / 0,55× a altura).
 * userData: tipA/tipB (segmento do rastro), edges (traço de dano: gume interno, ponta, haste alta), head, tip, fx,
 * tick(), updateFx(time, phase, low, visible), charge(k) (energia atraída às fendas na Espiral), dispose().
 * Peças fundidas por material (≤ 7 chamadas de desenho), sem luz dinâmica, sem alocação por quadro.
 */
export const EXEC_SCYTHE = Object.freeze({ butt: -.6, top: 1.74, head: 1.6, reach: 1.15 });

function mergeStatic(T, root, keep) { // mesma técnica do Machado do Abismo (sem addons)
  const groups = new Map(); root.updateMatrixWorld(true);
  for (const m of [...root.children]) { if (!m.isMesh || keep.has(m)) continue; (groups.get(m.material) || groups.set(m.material, []).get(m.material)).push(m); }
  for (const [mat, list] of groups) {
    const parts = list.map(m => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrix); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
    for (const m of list) { root.remove(m); m.geometry.dispose(); } const mm = new T.Mesh(geo, mat); mm.name = list[0].name || 'Foice'; root.add(mm);
  }
}
const lerp = (a, b, k) => a + (b - a) * k;

export function buildExecutionerScythe(T, { quality = 1 } = {}) {
  const A = EXEC_SCYTHE, root = new T.Group(); root.name = 'ZarkhaelFoice';
  const metal = new T.MeshStandardMaterial({ color: 0x2a2233, metalness: .82, roughness: .32, emissive: 0x1a0626, emissiveIntensity: .5 });
  const dark = new T.MeshStandardMaterial({ color: 0x120d18, metalness: .6, roughness: .55, emissive: 0x08020c, emissiveIntensity: .4 });
  const lava = new T.MeshBasicMaterial({ color: 0xff5a1e, toneMapped: false });
  const violet = new T.MeshBasicMaterial({ color: 0xc64dff, toneMapped: false });
  const edgeM = new T.MeshBasicMaterial({ color: 0xffb8f2, toneMapped: false });
  const flameM = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, uniforms: { time: { value: 0 }, k: { value: .35 } },
    vertexShader: 'varying vec2 vUv;uniform float time;void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*9.+time*5.+position.y*3.)*.025*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: `uniform float time,k;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 u=vUv;float x=abs(u.x-.5)*2.;float fl=n(vec2(u.x*4.,u.y*3.-time*2.2))*.6+n(vec2(u.x*9.,u.y*7.-time*4.))*.4;
      float a=smoothstep(1.,.15,x+u.y*.55-fl*.55)*(1.-u.y)*smoothstep(0.,.12,u.y);a*=k;if(a<.02)discard;vec3 c=mix(vec3(.35,.05,.75),vec3(.95,.55,1.),a);gl_FragColor=vec4(c*1.3,min(1.,a));}` });
  const add = (geo, mat, x = 0, y = 0, z = 0, name) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; root.add(m); return m; };
  const seg = quality ? 1 : .6;
  // ---- haste retorcida: núcleo + dois cordões helicoidais (um metal, um de lava) ----
  const haftLen = A.top - A.butt, path = new T.CatmullRomCurve3(Array.from({ length: 7 }, (_, i) => { const k = i / 6; return new T.Vector3(Math.sin(k * 2.2) * .03, A.butt + haftLen * k, Math.cos(k * 1.7) * .015); }));
  add(new T.TubeGeometry(path, 40 * seg | 0, .03, 7, false), metal);
  const helix = (r, turns, ph, rad, mat, from = 0, to = 1) => { const pts = []; for (let i = 0; i <= 90; i++) { const k = lerp(from, to, i / 90), p = path.getPoint(k), a = k * turns * Math.PI * 2 + ph; pts.push(new T.Vector3(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r)); }
    return add(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120 * seg | 0, rad, 5, false), mat); };
  helix(.032, 6.5, 0, .014, dark); helix(.03, 6.5, Math.PI, .007, lava, .05, .92);
  for (const [y, r] of [[-.06, .044], [.3, .046], [1.25, .05]]) add(new T.CylinderGeometry(r, r, .05, 6), metal, 0, y);
  // ponta inferior: lâmina curta em gancho (ameaça nos dois lados)
  { const s = new T.Shape(); s.moveTo(-.03, 0); s.quadraticCurveTo(.07, -.08, .02, -.22); s.quadraticCurveTo(-.02, -.12, -.06, -.04); s.closePath(); add(new T.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1 }), metal, 0, A.butt + .02, -.016); }
  // ---- cabeça: alvado com cristas + lâmina em meia-lua projetada para +X e curvada para baixo ----
  add(new T.CylinderGeometry(.06, .075, .3, 6), metal, 0, A.head - .02);
  const R = A.reach, blade = new T.Shape(); // contorno: lombada de cima (com dentes) → ponta → gume interno côncavo → volta ao alvado
  const spine = [], edge = [];
  for (let i = 0; i <= 14; i++) { const k = i / 14, x = .04 + R * k, y = A.head + .14 + Math.sin(k * Math.PI * .92) * .2 - k * k * .58; spine.push([x, y]); }
  for (let i = 14; i >= 0; i--) { const k = i / 14, x = .05 + (R - .03) * k, y = A.head - .12 + Math.sin(k * Math.PI * .85) * .08 - k * k * .5 - (k > .9 ? (k - .9) * 1.2 : 0); edge.push([x, y]); }
  blade.moveTo(spine[0][0], spine[0][1]);
  spine.forEach(([x, y], i) => { if (i && i < 13 && i % 2 === 0) blade.lineTo(x - .02, y + .07 * (1 - i / 14)); blade.lineTo(x, y); }); // dentes da lombada
  blade.lineTo(R + .08, A.head - .66); // ponta afiada caindo
  edge.forEach(([x, y]) => blade.lineTo(x, y)); blade.closePath();
  const bodyBlade = add(new T.ExtrudeGeometry(blade, { depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1, curveSegments: 6 }), metal, 0, 0, -.015, 'LaminaFoice');
  // gume interno (faixa clara-magenta à frente do corpo)
  { const s = new T.Shape(), inner = edge.map(([x, y]) => [x, y + .05]); s.moveTo(edge[0][0], edge[0][1] - .012); edge.forEach(([x, y]) => s.lineTo(x, y - .012)); s.lineTo(R + .1, A.head - .69); for (let i = inner.length - 1; i >= 0; i--) s.lineTo(...inner[i]); s.closePath();
    add(new T.ExtrudeGeometry(s, { depth: .01, bevelEnabled: false }), edgeM, 0, 0, -.005, 'GumeFoice'); }
  // aberturas violeta (ovais) ao longo da lâmina, nas duas faces
  for (let i = 0; i < 4; i++) { const k = .18 + i * .19, x = .04 + R * k, y = lerp(spine[Math.round(k * 14)][1], edge[14 - Math.round(k * 14)][1], .5), e = new T.CircleGeometry(.055 - i * .006, 12); e.scale(1.7, .8, 1);
    for (const z of [.032, -.032]) { const m = add(e.clone(), violet, x, y, z); m.rotation.z = -.25 - k * .5; if (z < 0) m.rotation.y = Math.PI; } e.dispose(); }
  // fissuras laranja (linhas finas em zigue-zague na face)
  for (const [k0, k1, off] of [[.1, .55, .03], [.4, .85, -.02], [.25, .7, .06]]) { const pts = []; for (let i = 0; i <= 8; i++) { const k = lerp(k0, k1, i / 8), x = .04 + R * k, y = lerp(spine[Math.round(k * 14)][1], edge[14 - Math.round(k * 14)][1], .35 + off + (i % 2 ? .05 : -.05)); pts.push(new T.Vector3(x, y, 0)); }
    for (const z of [.031, -.031]) add(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .005, 3, false), lava, 0, 0, z); }
  // cristas do lado oposto (atrás do alvado) e espinhos da coroa
  for (const [x, y, r, s] of [[-.08, A.head + .08, .9, .16], [-.12, A.head - .05, 1.3, .2], [-.06, A.head + .2, .5, .13], [.02, A.top + .02, 0, .2], [.18, A.head + .3, -.4, .14]]) { const c = add(new T.ConeGeometry(.028, s, 4), dark, x, y); c.rotation.z = r; }
  // chamas espectrais violetas: poucos planos cruzados na cabeça e ao longo da haste alta
  const flames = [];
  for (const [x, y, sx, sy, rz] of [[.35, A.head + .14, .5, .42, -.2], [.75, A.head - .04, .45, .4, -.5], [0, A.head + .12, .3, .4, 0], [0, .95, .22, .8, 0]]) for (const ry of [0, Math.PI / 2]) { const f = add(new T.PlaneGeometry(sx, sy, 1, 6), flameM, x, y + sy * .35, 0); f.rotation.set(0, ry, rz); flames.push(f); }
  mergeStatic(T, root, new Set()); // chamas também fundidas: uma chamada para todas (o shader anima)
  let charge = 0; const tip = new T.Vector3(R + .08, A.head - .66, 0);
  root.userData = {
    kind: 'scythe', fx: new T.Group(), head: new T.Vector3(.45, A.head, 0), tip,
    tipA: new T.Vector3(.1, A.head - .1, 0), tipB: tip.clone(),
    // traço de dano: gume interno (2 trechos), ponta e haste alta
    edges: [[[.08, A.head - .12, 0], [.6, A.head - .2, 0]], [[.6, A.head - .2, 0], [R + .08, A.head - .66, 0]], [[0, 1.0, 0], [0, A.top, 0]], [[.4, A.head + .2, 0], [R, A.head - .3, 0]]],
    tick(time) { flameM.uniforms.time.value = time; },
    charge(k) { charge = Math.max(0, Math.min(1, k)); }, get charged() { return charge; },
    updateFx(time, phase, low, visible) { flameM.uniforms.time.value = time; flameM.uniforms.k.value = (low ? .25 : .38) + charge * .6 + (phase ? .1 : 0);
      metal.emissiveIntensity = .5 + charge * 1.3 + .1 * Math.sin(time * 3); lava.color.setRGB(1, .35 + charge * .25, .12 + charge * .1); violet.color.setRGB(.78 + charge * .2, .3 + charge * .5, 1); },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const m of [metal, dark, lava, violet, edgeM, flameM]) m.dispose(); }
  };
  root.traverse(o => { if (o.isMesh && o.material === flameM) { o.renderOrder = 9; o.frustumCulled = false; } });
  return root;
}
