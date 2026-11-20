/**
 * MISSÃO 19/11 — VFX físicos do VORGAZHEK no treino dos Bispos (nenhum é magia):
 *  • Espada: a ESPADA CÓSMICA autoral da Mod 262 (vorgazhek-cosmic-sword3d) na mão do corpo novo, no formato que o motor
 *    da esquadra espera (tipA/tipB/fx/tick/updateFx). Uma só lâmina: nada de duas espadas sobrepostas.
 *  • Fenda do dash: risco fino índigo com borda ciano na direção do deslocamento + compressão breve no ponto de saída.
 *  • Anel de pouso do Atravessamento Aéreo: onda rasteira ciano curta (não é fogo nem fumaça).
 *  • Arco elétrico abissal: 2–3 filamentos ciano-brancos SÓ nos cortes "arc" (Queda da Fenda e Sentença Tripla), ligados
 *    ao segmento real da lâmina no quadro do contato, com bifurcação limitada e vida de ~0,14 s.
 * Pools fixos, sem alocação por quadro, sem luzes dinâmicas; qualidade baixa reduz contagem.
 */
import { buildCosmicSword, COSMIC_SWORD } from './vorgazhek-cosmic-sword3d.js';

export function buildVoidBlade(T) {
  const root = new T.Group(), s = buildCosmicSword(T); root.add(s); root.name = 'VorgazhekLamina';
  const L = COSMIC_SWORD.blade + COSMIC_SWORD.guardY;
  root.userData = { tipA: new T.Vector3(0, COSMIC_SWORD.guardY + .06, 0), tipB: new T.Vector3(0, L, 0), fx: new T.Group(), sword: s,
    tick(time) { if (s.userData.time) s.userData.time.value = time; }, updateFx() {} };
  return root;
}

const NOISE = 'float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}';
export function createVorgazhekVFX(T, scene) {
  const root = new T.Group(); root.name = 'VorgazhekVFX'; scene.add(root);
  let time = 0, low = false;
  // ---- fenda do dash (faixa achatada no chão, alongada na direção) ----
  const slitMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending, uniforms: { k: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k;${NOISE}void main(){float x=vUv.x,y=abs(vUv.y-.5)*2.;float core=exp(-y*y*60.),body=exp(-y*y*8.);float along=smoothstep(0.,.15,x)*(1.-smoothstep(.75,1.,x));
      float a=(core*1.6+body*.5)*along*(1.-k)*(1.-k);if(a<.01)discard;vec3 c=mix(vec3(.16,.08,.55),vec3(.45,.95,1.),core);gl_FragColor=vec4(c*1.4,min(1.,a));}` });
  const slits = Array.from({ length: 6 }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), slitMat()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 8; root.add(m); return { m, age: 1, life: .32 }; });
  let slitC = 0;
  function dash(from, to) { const s = slits[slitC++ % slits.length], dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz); if (L < .3) return;
    s.m.position.set((from.x + to.x) / 2, Math.min(from.y, to.y) + .06, (from.z + to.z) / 2); s.m.rotation.set(-Math.PI / 2, 0, -Math.atan2(dz, dx)); s.m.scale.set(L + .6, .55, 1); s.age = 0; s.m.visible = true; }
  // ---- anel de pouso ----
  const ringMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending, uniforms: { k: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-pow((r-.25-.7*k)*14.,2.));float a=ring*(1.-k);if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.25,.15,.8),vec3(.55,1.,1.),ring)*1.3,a);}` });
  const rings = Array.from({ length: 3 }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), ringMat()); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 8; root.add(m); return { m, age: 1, life: .45 }; });
  let ringC = 0;
  function land(p, size = 3.2) { const r = rings[ringC++ % rings.length]; r.m.position.set(p.x, p.y + .05, p.z); r.m.scale.setScalar(size); r.age = 0; r.m.visible = true; }
  // ---- arcos elétricos (segmentos de linha em pool) ----
  const ARCS = 3, SEG = 9, arcPos = new Float32Array(ARCS * SEG * 2 * 3), arcGeo = new T.BufferGeometry();
  arcGeo.setAttribute('position', new T.BufferAttribute(arcPos, 3).setUsage(T.DynamicDrawUsage)); arcGeo.setDrawRange(0, 0);
  const arcMat = new T.LineBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  const arcLines = new T.LineSegments(arcGeo, arcMat); arcLines.frustumCulled = false; arcLines.renderOrder = 12; root.add(arcLines);
  let arcAge = 1, arcLife = .14;
  function arc(a, b, power = 1) { // a/b: base e ponta da lâmina no mundo
    const n = low ? 1 : Math.min(ARCS, 2 + (power > .9 ? 1 : 0)); let w = 0;
    for (let k = 0; k < n; k++) { let px = a.x, py = a.y, pz = a.z; const jx = (Math.random() - .5), jz = (Math.random() - .5);
      for (let i = 1; i <= SEG; i++) { const u = i / SEG, off = Math.sin(u * Math.PI) * .32 * power;
        const x = a.x + (b.x - a.x) * u + (Math.random() - .5) * off + jx * off, y = a.y + (b.y - a.y) * u + (Math.random() - .5) * off, z = a.z + (b.z - a.z) * u + (Math.random() - .5) * off + jz * off;
        arcPos.set([px, py, pz, x, y, z], w); w += 6; px = x; py = y; pz = z; } }
    arcGeo.attributes.position.needsUpdate = true; arcGeo.setDrawRange(0, w / 3); arcAge = 0; arcLines.visible = true;
  }
  function update(dt, quality = 1) { time += dt; low = quality === 0;
    for (const s of slits) { if (!s.m.visible) continue; s.age += dt / s.life; if (s.age >= 1) { s.m.visible = false; continue; } s.m.material.uniforms.k.value = s.age; }
    for (const r of rings) { if (!r.m.visible) continue; r.age += dt / r.life; if (r.age >= 1) { r.m.visible = false; continue; } r.m.material.uniforms.k.value = r.age; }
    if (arcLines.visible) { arcAge += dt / arcLife; arcMat.opacity = Math.max(0, .95 * (1 - arcAge)); if (arcAge >= 1) arcLines.visible = false; }
  }
  function stats() { return { slits: slits.filter(s => s.m.visible).length, rings: rings.filter(r => r.m.visible).length, arc: arcLines.visible }; }
  function clear() { for (const s of slits) s.m.visible = false; for (const r of rings) r.m.visible = false; arcLines.visible = false; }
  return { dash, land, arc, update, stats, clear, root };
}
