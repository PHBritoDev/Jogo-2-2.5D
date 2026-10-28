import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 229 — Chuva de Estrelas Celestiais, redesenhada.
 *  • Selo 3D em três camadas empilhadas (profundidades diferentes), anéis em contrarrotação, runas próprias desenhadas
 *    no shader, acendimento em sequência, pulsos e arcos de energia ligando as camadas; partículas orbitais.
 *  • Estrela = cristal 3D de 4 pontas (geometria facetada com fresnel), halo, cauda em três faixas e cintilações.
 *  • Impacto pesado no terreno real: clarão concentrado, onda de choque assentada na encosta, marca de energia que
 *    esfria, estilhaços de cristal com gravidade, poeira que sobe e brasas. Estrelas pesadas (1 a cada 10) pontuam a chuva.
 * Tudo instanciado e com buffers fixos; nenhuma luz dinâmica. O VFX nunca causa dano (a lógica está em celestial-starfall3d.js).
 */
const SIGIL_VERT = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SIGIL_FRAG = `
varying vec2 vUv; uniform float time, ignite, opacity, inner, outer, cells, seed, pulse, spin;
uniform vec3 colA, colB;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed)*43758.5453);}
float line(float x,float w){return smoothstep(w,0.,abs(x));}
void main(){
 vec2 p=vUv*2.-1.; float d=length(p); if(d>1.||d<inner/outer) discard;
 float r=(d*outer-inner)/(outer-inner);                       // 0 na borda interna, 1 na externa
 float ang=atan(p.y,p.x)+3.14159265; float u=ang/6.2831853;
 float a=0.;
 a+=line(r-.04,.025)+line(r-.96,.025)+line(r-.5,.012)*.6;     // trilhos concêntricos
 // faixa de runas: cada célula sorteia traços (vertical, horizontal, diagonais e um ponto) — alfabeto inventado
 float cu=u*cells, ci=floor(cu); vec2 c=vec2(fract(cu),(r-.12)/.76);
 float g=0.;
 if(c.y>0.&&c.y<1.){
  vec2 q=c*vec2(1.,1.)-.5;
  if(h(vec2(ci,1.))>.35) g=max(g,line(q.x,.06)*step(abs(q.y),.38));
  if(h(vec2(ci,2.))>.5) g=max(g,line(q.y-.25*(h(vec2(ci,3.))-.5)*2.,.06)*step(abs(q.x),.3));
  if(h(vec2(ci,4.))>.55) g=max(g,line(q.x-q.y*.8,.06)*step(abs(q.y),.32));
  if(h(vec2(ci,5.))>.6) g=max(g,line(q.x+q.y*.8,.06)*step(abs(q.y),.32));
  if(h(vec2(ci,6.))>.7) g=max(g,smoothstep(.12,.05,length(q-vec2(0.,.3))));
  g*=step(.06,c.x)*step(c.x,.94);
 }
 float lit=smoothstep(ignite*1.05-.05,ignite*1.05-.12,u);      // as runas acendem em sequência
 a+=g*(.35+.65*lit);
 a+=line(fract(cu)-.0,.03)*step(.82,r)*.5;                    // marcas entre células
 float wave=exp(-pow((r-pulse)/.08,2.))*.9;                     // pulso que viaja para fora
 float shimmer=.8+.2*sin(u*120.-time*6.+r*20.);
 vec3 col=mix(colA,colB,g*lit*.8+wave*.3);
 col=mix(col,vec3(1.),wave*.6);
 float alpha=(a*shimmer+wave*.5+exp(-pow((r-.5)/.5,2.))*.05)*opacity;
 if(alpha<.004) discard;
 gl_FragColor=vec4(col*alpha,alpha);
}`;
const STAR_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vHeavy; attribute float aHeavy;
void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vP=position; vHeavy=aHeavy; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const STAR_FRAG = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vHeavy;
void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),2.); float tip=clamp(length(vP.xy),0.,1.);
 vec3 blue=vec3(.35,.75,1.), gold=vec3(1.,.8,.38); vec3 base=mix(vec3(1.),mix(blue,gold,vHeavy),tip*.9);
 gl_FragColor=vec4(base*(1.2+f*1.6),1.); }`;

function starCrystal(T) {
  // Estrela de 4 pontas facetada: oito vértices no contorno e dois ápices (frente/trás) — volume real, não um plano.
  const pts = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? .26 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); }
  const pos = [], f = [0, 0, .32], b = [0, 0, -.32];
  for (let i = 0; i < 8; i++) { const p = pts[i], q = pts[(i + 1) % 8]; pos.push(...f, ...p, ...q, ...b, ...q, ...p); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

export function createStarfallVFX(T, scene, { ground = () => 0 } = {}) {
  const group = new T.Group(); group.name = 'ChuvaEstrelas'; scene.add(group); group.visible = false;
  // ---- selo em três camadas
  const blue = new T.Color(.18, .55, 1), gold = new T.Color(1, .72, .28);
  const layerDefs = [{ inner: 3.7, outer: 5.3, cells: 64, y: 0, dir: 1, colA: blue, colB: gold, seed: 1 },
    { inner: 1.9, outer: 3.5, cells: 40, y: -.6, dir: -1.6, colA: gold, colB: blue, seed: 7 },
    { inner: .35, outer: 1.75, cells: 18, y: -1.15, dir: 2.4, colA: blue, colB: new T.Color(1, 1, 1), seed: 13 }];
  const layers = layerDefs.map(L => {
    const mat = new T.ShaderMaterial({ vertexShader: SIGIL_VERT, fragmentShader: SIGIL_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false,
      uniforms: { time: { value: 0 }, ignite: { value: 0 }, opacity: { value: 1 }, inner: { value: L.inner }, outer: { value: L.outer }, cells: { value: L.cells }, seed: { value: L.seed }, pulse: { value: -1 }, spin: { value: 0 }, colA: { value: L.colA }, colB: { value: L.colB } } });
    const geo = new T.PlaneGeometry(L.outer * 2, L.outer * 2); geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, mat); m.renderOrder = 4; return { ...L, mat, geo, mesh: m };
  });
  const sigil = new T.Group(); group.add(sigil); for (const L of layers) sigil.add(L.mesh);
  // ---- estrelas 3D
  const crystal = starCrystal(T), heavyAttr = new Float32Array(91);
  crystal.setAttribute('aHeavy', new T.InstancedBufferAttribute(heavyAttr, 1).setUsage(T.DynamicDrawUsage));
  const starMat = new T.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, toneMapped: false, fog: false });
  const stars = new T.InstancedMesh(crystal, starMat, 91); stars.frustumCulled = false; group.add(stars);
  // ---- estilhaços de cristal
  const shardGeo = new T.OctahedronGeometry(.07, 0); shardGeo.scale(.6, 2.4, .6);
  const shardMat = new T.MeshBasicMaterial({ color: 0xbfe8ff, toneMapped: false, fog: false });
  const shards = new T.InstancedMesh(shardGeo, shardMat, 1100); shards.frustumCulled = false; group.add(shards);
  const glow = softParticles(T, 1600), dust = softParticles(T, 520, { additive: false }), decals = groundDecals(T, 300), rib = ribbons(T, 5200, { flow: 14 });
  group.add(glow.mesh, dust.mesh, decals.mesh, rib.mesh);
  const dummy = new T.Object3D(), dir = new T.Vector3(), up = new T.Vector3(0, 1, 0), nrm = [0, 1, 0], bolt = Array.from({ length: 40 }, () => null);
  const B = [.45, .8, 1, 1], G = [1, .78, .36, 1], W = [1, 1, 1, 1], col = (c, a) => [c[0], c[1], c[2], a];
  const ringPoint = (state, R, ang, y, out) => { // ponto de uma camada do selo no mundo (mesma inclinação do selo)
    const x = Math.cos(ang) * R, z = Math.sin(ang) * R, ct = Math.cos(.38), st = Math.sin(.38);
    out[0] = state.center.x + x; out[1] = state.center.y + y * ct - z * st; out[2] = state.center.z + z * ct + y * st; return out;
  };
  const pa = [0, 0, 0], pb = [0, 0, 0];

  function update(state, camera, low = false) {
    group.visible = state.active; if (!state.active) return;
    const t = state.time, open = easeOut((t - 1.5) / .5), fade = smooth((10 - t) / .8);
    // selo: condensa, acende e pulsa; contrarrotação por camada
    const charge = smooth((t - .9) / .6);
    sigil.visible = t >= .85; sigil.position.set(state.center.x, state.center.y, state.center.z); sigil.rotation.set(.38, 0, 0);
    const sc = (.25 + .75 * open) * fade * (t < 1.5 ? .35 + .65 * charge * .5 : 1);
    layers.forEach((L, k) => {
      if (low && k === 1) { L.mesh.visible = false; return; } L.mesh.visible = true;
      L.mesh.position.y = L.y * open; L.mesh.rotation.y = t * .16 * L.dir; L.mesh.scale.setScalar(sc);
      const u = L.mat.uniforms; u.time.value = t; u.opacity.value = (.35 + .65 * open) * fade * (.9 + .1 * Math.sin(t * 7 + k));
      u.ignite.value = smooth((t - 1.1 - k * .12) / .9); u.pulse.value = ((t * .9 + k * .33) % 1.4) - .2;
    });
    rib.begin(camera, t); glow.begin(); dust.begin(); decals.begin();
    let ns = 0, np = 0;
    // núcleo de carga e feixe da mão até o selo
    if (t < 1.75) {
      const core = t < .7 ? state.launch : state.center, k = t < .7 ? t / .7 : 1 - smooth((t - 1.45) / .3);
      glow.add(core.x, core.y, core.z, 1.4 + 2.6 * charge, 1.4 + 2.6 * charge, .55, .85, 1, .9 * k, 0);
      glow.add(core.x, core.y, core.z, 3.5 * charge + .5, .35, 1, .9, .7, .7 * k, 2, t * 2);
      if (t >= .7) {
        const h = state.launch.y - state.source.y;
        for (let j = 0; j < (low ? 10 : 24); j++) {
          const n = low ? 10 : 24, u0 = j / n, u1 = (j + 1) / n, w0 = .16 * (1 - u0 * .5), w1 = .16 * (1 - u1 * .5);
          for (const [r, c, w, ph] of [[0, B, 1, 0], [.22, G, .3, 0], [.22, B, .3, Math.PI]]) {
            if (low && r) continue;
            const x0 = state.source.x + Math.sin(u0 * 14 - t * 10 + ph) * r, z0 = state.source.z + Math.cos(u0 * 14 - t * 10 + ph) * r;
            const x1 = state.source.x + Math.sin(u1 * 14 - t * 10 + ph) * r, z1 = state.source.z + Math.cos(u1 * 14 - t * 10 + ph) * r;
            rib.seg(x0, state.source.y + h * u0, z0, x1, state.source.y + h * u1, z1, w0 * w, w1 * w, c, c, u0, u1);
          }
        }
      }
    }
    // arcos de energia entre as camadas e partículas orbitais
    if (sigil.visible && open > .1) {
      const arcs = low ? 3 : 7;
      for (let k = 0; k < arcs; k++) {
        const ph = Math.floor(t * 9 + k * 3.1), ang = hash(ph * 1.7 + k) * 6.283, a0 = 1.75 * sc, a1 = (k % 2 ? 3.7 : 1.9) * sc, y0 = -1.15 * open, y1 = (k % 2 ? 0 : -.6) * open;
        ringPoint(state, a0, ang, y0, pa); ringPoint(state, a1, ang + .25, y1, pb);
        const n = lightningBolt(ph + k * 13, pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], bolt, { depth: 1, jag: .35, branches: .3 });
        for (let i = 0; i < n; i++) { const s = bolt[i]; rib.seg(s[0], s[1], s[2], s[3], s[4], s[5], .05 * s[6], .05 * s[6], col(B, .9 * fade), col(W, .9 * fade)); }
      }
      const motes = low ? 30 : 90;
      for (let i = 0; i < motes; i++) {
        const R = (1 + (i % 3) * 1.7 + hash(i) * .9) * sc, ang = i * 2.39996 + t * (.4 + (i % 3) * .2) * (i % 2 ? 1 : -1), y = [-1.15, -.6, 0][i % 3] * open;
        ringPoint(state, R, ang, y + Math.sin(t * 3 + i) * .12, pa);
        glow.add(pa[0], pa[1], pa[2], .16, .16, i % 4 ? .6 : 1, i % 4 ? .85 : .8, i % 4 ? 1 : .45, .9 * fade, 2, t + i);
      }
      glow.add(state.center.x, state.center.y - .9 * open, state.center.z, 2.2 * sc, 2.2 * sc, .4, .7, 1, .45 * fade, 0);
    }
    // estrelas em voo: cristal + halo + cauda em três faixas + cintilações
    for (const s of state.stars) {
      const big = s.heavy ? 1.7 : 1;
      if (s.phase === 'flight') {
        const age = t - s.born, spin = t * 9 + s.i;
        dir.set(s.aim.x - s.from.x, s.aim.y - s.from.y, s.aim.z - s.from.z).normalize();
        dummy.position.set(s.p.x, s.p.y, s.p.z); dummy.quaternion.setFromUnitVectors(up, dir); dummy.rotateY(spin); dummy.rotateX(Math.PI / 2);
        dummy.scale.setScalar(.42 * big * (.8 + .2 * Math.sin(t * 20 + s.i))); dummy.updateMatrix(); stars.setMatrixAt(ns, dummy.matrix); heavyAttr[ns++] = s.heavy ? 1 : 0;
        glow.add(s.p.x, s.p.y, s.p.z, 1.5 * big, 1.5 * big, s.heavy ? 1 : .5, s.heavy ? .8 : .8, s.heavy ? .45 : 1, .85, 0);
        glow.add(s.p.x, s.p.y, s.p.z, 2.4 * big, .14 * big, 1, 1, 1, .6, 2, spin * .1);
        const segs = low ? 7 : 14, bands = low ? 1 : 3;
        for (let j = 0; j < segs; j++) {
          const u0 = Math.max(0, (age - j * .028) / .65), u1 = Math.max(0, (age - (j + 1) * .028) / .65); if (u0 <= 0) break;
          const fall = k => [s.from.x + (s.aim.x - s.from.x) * k, s.from.y + (s.aim.y - s.from.y) * k * k, s.from.z + (s.aim.z - s.from.z) * k];
          const A = fall(u0), Bp = fall(u1), w = 1 - j / segs;
          for (let band = 0; band < bands; band++) {
            const off = band ? Math.sin(j * .7 + t * 14 + s.i + band * 2) * .1 * w * (band === 1 ? 1 : -1) : 0;
            const c = band === 0 ? col(B, .9 * w) : band === 1 ? col(G, .8 * w) : col(W, .7 * w);
            rib.seg(A[0] + off, A[1], A[2] + off, Bp[0] + off, Bp[1], Bp[2] - off, (band ? .03 : .17) * big * w, (band ? .03 : .17) * big * (w - 1 / segs), c, c, j / segs, (j + 1) / segs);
          }
          if (!low && j % 3 === 1) glow.add(A[0] + Math.sin(t * 30 + j) * .15, A[1], A[2] + Math.cos(t * 30 + j) * .15, .22, .22, .8, .9, 1, .7 * w, 2, t + j);
        }
      }
      // impacto: o contato acontece exatamente no ponto da colisão (s.p), já assentado no terreno
      const age = t - s.impactAt;
      if (s.phase === 'impact' && s.impactAt >= 0 && age >= 0 && age < 1.6) {
        const x = s.p.x, z = s.p.z, y = ground(x, z), n = groundNormal(ground, x, z, nrm), H = s.heavy ? 1.6 : 1;
        if (age < .14) { const k = 1 - age / .14; glow.add(x, y + .5, z, 3.2 * H * k + .4, 3.2 * H * k + .4, 1, .95, .85, k, 0); glow.add(x, y + .35, z, 5 * H * k, .3 * H, 1, 1, 1, k, 2, s.i); }
        if (age < .5) decals.add(x, y, z, (.6 + 3.2 * easeOut(age / .5)) * H, .6, .85, 1, (1 - age / .5) * .9, 0, age / .5, s.i, n);
        if (age < .35) decals.add(x, y, z, 1.8 * H, .5, .75, 1, (1 - age / .35) * .8, 2, 0, s.i, n);
        decals.add(x, y, z, 1.25 * H, .55, .8, 1, (1 - smooth((age - .2) / 1.4)) * .75, 1, age, s.i, n, s.i);
        const nShards = (low ? 4 : 9) * (s.heavy ? 2 : 1);
        for (let j = 0; j < nShards && age < 1.1; j++) {
          const ang = j * 2.39996 + s.i, sp = (2.2 + hash(s.i * 7 + j) * 3.5) * (s.heavy ? 1.3 : 1), vy = 3 + hash(j + s.i) * 4;
          let px = x + Math.cos(ang) * sp * age, pz = z + Math.sin(ang) * sp * age, py = y + .1 + vy * age - 9.8 * age * age;
          const gy = ground(px, pz) + .05; if (py < gy) py = gy;
          dir.set(Math.cos(ang) * sp, vy - 19.6 * age, Math.sin(ang) * sp).normalize();
          dummy.position.set(px, py, pz); dummy.quaternion.setFromUnitVectors(up, dir); dummy.scale.setScalar((1 - age / 1.1) * (.7 + hash(j) * .6) * H); dummy.updateMatrix(); shards.setMatrixAt(np++, dummy.matrix);
          if (!low && j % 2 === 0) glow.add(px, py, pz, .25, .25, .6, .85, 1, (1 - age / 1.1) * .8, 2, j);
        }
        const nDust = (low ? 2 : 5) * (s.heavy ? 2 : 1);
        for (let j = 0; j < nDust; j++) {
          const ang = j * 2.1 + s.i * .7, r = .4 + age * (1.2 + hash(j + 3 * s.i) * 1.6), k = smooth(age / .2) * (1 - smooth((age - .3) / 1.2));
          dust.add(x + Math.cos(ang) * r, y + .25 + age * (.8 + hash(j) * .6), z + Math.sin(ang) * r, (.7 + age * 1.6) * H, (.7 + age * 1.6) * H, .62, .6, .58, .38 * k, 1, ang, s.i + j);
        }
        for (let j = 0; j < (low ? 3 : 7) && age < .7; j++) {
          const ang = j * 2.7 + s.i, sp = 3 + hash(s.i + j * 5) * 4, px = x + Math.cos(ang) * sp * age, pz = z + Math.sin(ang) * sp * age, py = y + .2 + 4 * age - 9 * age * age;
          glow.add(px, Math.max(py, y + .05), pz, .07, .45, 1, .85, .5, (1 - age / .7), 3, Math.atan2(Math.sin(ang), Math.cos(ang)) + Math.PI / 2);
        }
      }
    }
    // dissipação final: o selo se recolhe num clarão
    if (t > 9.3) { const k = smooth((t - 9.3) / .4) * (1 - smooth((t - 9.8) / .2)); glow.add(state.center.x, state.center.y - .5, state.center.z, 6 * k, 6 * k, .6, .85, 1, .6 * k, 0); }
    stars.count = ns; shards.count = np; stars.instanceMatrix.needsUpdate = shards.instanceMatrix.needsUpdate = true; crystal.attributes.aHeavy.needsUpdate = true;
    rib.end(); glow.end(); dust.end(); decals.end(t);
  }
  return { group, update, clear() { group.visible = false; },
    dispose() { scene.remove(group); for (const L of layers) { L.geo.dispose(); L.mat.dispose(); } for (const g of [crystal, shardGeo]) g.dispose(); for (const m of [starMat, shardMat]) m.dispose(); stars.dispose(); shards.dispose(); glow.dispose(); dust.dispose(); decals.dispose(); rib.dispose(); } };
}
