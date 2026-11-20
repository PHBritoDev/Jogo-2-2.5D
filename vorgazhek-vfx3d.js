/**
 * MISSÃO 19/11 — VFX físicos do VORGAZHEK no treino dos Bispos (nenhum é magia):
 *  • Arma: desde 20/11 é o MACHADO DO ABISMO (vorgazhek-axe3d.js), preso à mão pelo attachKatana.
 *  • Fenda do dash: risco fino índigo com borda ciano na direção do deslocamento + compressão breve no ponto de saída.
 *  • Anel de pouso do Atravessamento Aéreo: onda rasteira ciano curta (não é fogo nem fumaça).
 *  • Arco elétrico abissal: 2–3 filamentos ciano-brancos SÓ nos cortes "arc" (Queda da Fenda e Sentença Tripla), ligados
 *    ao segmento real da lâmina no quadro do contato, com bifurcação limitada e vida de ~0,14 s.
 *  • Missão 20/11 — Ascensão da Maré Abissal: anéis/espirais de plasma azul em volta do núcleo do machado no preparo
 *    (fluido, sem fumaça), marca do ponto de pouso no chão (raio + direção, trava visível), e no impacto um núcleo
 *    branco-azulado compacto, 3 arcos-lâmina de energia, anel de choque e marcas no chão que somem.
 * Pools fixos, sem alocação por quadro, sem luzes dinâmicas; qualidade baixa reduz contagem.
 */
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
  // ---- Maré Abissal: anéis de carga no núcleo, marca de pouso, impacto ----
  const V = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const addMat = (frag, extra = {}) => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending, uniforms: { k: { value: 0 }, t: { value: 0 }, ...extra }, vertexShader: V, fragmentShader: frag });
  const chargeRing = 'precision highp float;varying vec2 vUv;uniform float k,t;void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float band=exp(-pow((r-.78)*16.,2.));float flow=.5+.5*sin(a*3.-t*9.+r*6.);float al=band*(.35+.65*flow)*k;if(al<.01)discard;gl_FragColor=vec4(mix(vec3(.12,.25,1.),vec3(.7,.96,1.),flow*band)*1.4,al);}';
  const charges = Array.from({ length: 3 }, (_, i) => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), addMat(chargeRing)); m.visible = false; m.frustumCulled = false; m.renderOrder = 10; root.add(m); return { m, tilt: [.3, 1.2, 2.1][i], spin: [1.8, -2.6, 3.4][i], size: [.55, .8, 1.05][i] }; });
  let chargeK = 0, chargeSeen = 0; const cpos = new T.Vector3();
  function charge(p, k) { cpos.copy(p); chargeK = k; chargeSeen = time; }
  const markM = addMat('precision highp float;varying vec2 vUv;uniform float k,t,lock;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-pow((r-.92)*22.,2.))+exp(-pow((r-.45-.45*fract(t*1.6))*18.,2.))*.5*(1.-lock);float hex=step(.86,fract(atan(p.y,p.x)*0.954929658+t*.2))*smoothstep(1.,.7,r)*smoothstep(.2,.5,r)*.25;float al=(ring+hex)*k*(.6+.4*lock);if(al<.01)discard;gl_FragColor=vec4(mix(vec3(.2,.3,1.),vec3(.6,.98,1.),lock)*1.3,al);}', { lock: { value: 0 } });
  const mark = new T.Mesh(new T.PlaneGeometry(1, 1), markM); mark.rotation.x = -Math.PI / 2; mark.visible = false; mark.frustumCulled = false; mark.renderOrder = 8; root.add(mark); let markAge = 9;
  function markAt(p, locked) { mark.position.set(p.x, p.y + .06, p.z); mark.scale.setScalar(5.2); mark.visible = true; markM.uniforms.lock.value = locked ? 1 : 0; markAge = 0; }
  const flashM = addMat('precision highp float;varying vec2 vUv;uniform float k;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float c=exp(-r*r*9.)*1.6+exp(-r*r*2.5)*.5;float al=c*(1.-k);if(al<.01)discard;gl_FragColor=vec4(mix(vec3(.3,.55,1.),vec3(1.),exp(-r*r*14.)),al);}');
  const flash = new T.Mesh(new T.PlaneGeometry(1, 1), flashM); flash.visible = false; flash.frustumCulled = false; flash.renderOrder = 13; root.add(flash); let flashAge = 9;
  const bladeArc = 'precision highp float;varying vec2 vUv;uniform float k;void main(){float x=vUv.x,y=vUv.y;float w=sin(y*3.14159);float edge=exp(-pow((x-.8)*9.,2.))*w;float body=smoothstep(.0,.8,x)*(1.-smoothstep(.8,1.,x))*w*.35;float al=(edge*1.5+body)*(1.-k)*(1.-k);if(al<.01)discard;gl_FragColor=vec4(mix(vec3(.15,.2,.95),vec3(.75,.98,1.),edge)*1.4,min(1.,al));}';
  const arcsI = Array.from({ length: 3 }, () => { const g = new T.PlaneGeometry(1, 1, 1, 10), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const u = uv.getX(i), v = uv.getY(i), a = (v - .5) * 2.4, r = .3 + u * .7; p.setXYZ(i, Math.sin(a) * r, Math.cos(a) * r * .55 + .05, 0); } const m = new T.Mesh(g, addMat(bladeArc)); m.visible = false; m.frustumCulled = false; m.renderOrder = 12; root.add(m); return { m, age: 9 }; });
  const scar = 'precision highp float;varying vec2 vUv;uniform float k;void main(){float x=vUv.x,y=abs(vUv.y-.5)*2.;float a=exp(-y*y*30.)*smoothstep(0.,.2,x)*(1.-smoothstep(.6,1.,x));float al=a*(1.-k);if(al<.01)discard;gl_FragColor=vec4(mix(vec3(.08,.1,.5),vec3(.4,.9,1.),exp(-y*y*120.))*1.2,al);}';
  const scars = Array.from({ length: 4 }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), addMat(scar)); m.rotation.x = -Math.PI / 2; m.visible = false; m.frustumCulled = false; m.renderOrder = 7; root.add(m); return { m, age: 9 }; });
  function impact(p, yaw, landed) {
    flash.position.set(p.x, p.y + .5, p.z); flash.visible = true; flashAge = 0; land(p, landed ? 6.2 : 5.2); mark.visible = false;
    const n = low ? 2 : 3; arcsI.forEach((A, i) => { if (i >= n) return; const a = yaw + (i - (n - 1) / 2) * .62; A.m.position.set(p.x + Math.sin(a) * .6, p.y + .15, p.z + Math.cos(a) * .6); A.m.rotation.set(0, a + Math.PI / 2, 0); A.m.scale.setScalar(2.4 + i % 2 * .5); A.age = 0; A.m.visible = true; });
    scars.forEach((S, i) => { if (low && i > 1) return; const a = yaw + (i - 1.5) * .7 + (i % 2 ? .12 : -.12), L = 2.2 + (i % 2) * .8; S.m.position.set(p.x + Math.sin(a) * L * .5, p.y + .04, p.z + Math.cos(a) * L * .5); S.m.rotation.set(-Math.PI / 2, 0, -(Math.PI / 2 - a)); S.m.scale.set(L, .38, 1); S.age = 0; S.m.visible = true; });
  }
  function update(dt, quality = 1) { time += dt; low = quality === 0;
    const ck = time - chargeSeen < .1 ? chargeK : 0; charges.forEach((c, i) => { const on = ck > .04 && !(low && i === 2); c.m.visible = on; if (!on) return; const u = c.m.material.uniforms; u.k.value = ck; u.t.value = time; c.m.position.copy(cpos); c.m.rotation.set(c.tilt + Math.sin(time * 1.3 + i) * .3, time * c.spin, 0); c.m.scale.setScalar(c.size * (1.15 - ck * .3) * (1 + .06 * Math.sin(time * 7 + i))); });
    if (mark.visible) { markAge += dt; markM.uniforms.t.value = time; markM.uniforms.k.value = Math.min(1, markAge * 5); if (markAge > 2.6) mark.visible = false; }
    if (flash.visible) { flashAge += dt / .28; flash.material.uniforms.k.value = flashAge; flash.scale.setScalar(1.2 + flashAge * 2.6); if (flashAge >= 1) flash.visible = false; }
    for (const A of arcsI) if (A.m.visible) { A.age += dt / .38; A.m.material.uniforms.k.value = A.age; A.m.scale.multiplyScalar(1 + dt * 2.2); if (A.age >= 1) A.m.visible = false; }
    for (const S of scars) if (S.m.visible) { S.age += dt / 1.3; S.m.material.uniforms.k.value = S.age; if (S.age >= 1) S.m.visible = false; }
    for (const s of slits) { if (!s.m.visible) continue; s.age += dt / s.life; if (s.age >= 1) { s.m.visible = false; continue; } s.m.material.uniforms.k.value = s.age; }
    for (const r of rings) { if (!r.m.visible) continue; r.age += dt / r.life; if (r.age >= 1) { r.m.visible = false; continue; } r.m.material.uniforms.k.value = r.age; }
    if (arcLines.visible) { arcAge += dt / arcLife; arcMat.opacity = Math.max(0, .95 * (1 - arcAge)); if (arcAge >= 1) arcLines.visible = false; }
  }
  function stats() { return { slits: slits.filter(s => s.m.visible).length, rings: rings.filter(r => r.m.visible).length, arc: arcLines.visible, charge: charges.filter(c => c.m.visible).length, mark: mark.visible, flash: flash.visible, arcs: arcsI.filter(a => a.m.visible).length, scars: scars.filter(x => x.m.visible).length }; }
  function clear() { for (const s of slits) s.m.visible = false; for (const r of rings) r.m.visible = false; arcLines.visible = false; for (const o of [...charges, ...arcsI, ...scars]) o.m.visible = false; mark.visible = flash.visible = false; chargeK = 0; }
  return { dash, land, arc, charge, mark: markAt, impact, update, stats, clear, root };
}
