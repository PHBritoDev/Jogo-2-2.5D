import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, hash } from './celestial-fxkit3d.js';
import { createRuptureVFX } from './vhazrael-rupture3d.js?v=mod254-bombardeio';
import { createExtinctionVFX } from './vhazrael-extinction3d.js?v=mod254-bombardeio';
import { createBombardVFX } from './vhazrael-bombard3d.js?v=mod254-bombardeio';
/**
 * MOD 247b — VFX do VHAZRAEL refeito (só desenha o estado de vhazrael3d.js). Correção visual pedida pelo criador:
 *  • MOD 254: Entidade do Terror (mãos) e Ninhada (criaturas) REMOVIDAS do kit; entra o Bombardeio Abissal
 *    Perseguidor (módulo vhazrael-bombard3d.js).
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
// espinho facetado: preto, filetes violeta nas arestas (aEdge), rim; cresce pela escala da instância
const SPIKE_V = `attribute float aEdge; varying float vE; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vE=aEdge; vY=position.y; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(transpose(inverse(mat3(modelMatrix*instanceMatrix)))*normal); vV=cameraPosition-w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SPIKE_F = `uniform float time; varying float vE; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec3 n=normalize(vN), v=normalize(vV); float l=max(0.,dot(n,normalize(vec3(.3,1.,.2)))), f=1.-abs(dot(n,v));
 vec3 c=vec3(.003,.001,.006)+vec3(.012,.008,.02)*l; c+=vec3(.3,.08,.6)*pow(f,5.)*.15; c=mix(c,vec3(.5,.18,.95)*(1.+.25*sin(time*4.+vY*2.)),smoothstep(.85,.99,vE)*.6); c+=vec3(.9,.2,.7)*smoothstep(.08,0.,vY)*.5;
 gl_FragColor=vec4(c,1.);${TONE}
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

export function createVhazraelVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'VhazraelVFX'; scene.add(root); const uTime = { value: 0 }, geos = [], mats = [];
  const M = new T.Matrix4(), Q = new T.Quaternion(), Q2 = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler(), up = new T.Vector3(0, 1, 0), D = new T.Vector3(), cam = new T.Vector3(), nrm = [0, 1, 0];
  const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), F = new T.Vector3(), K1 = new T.Vector3(), K2 = new T.Vector3(), O = new T.Vector3(), R = new T.Vector3(), U = new T.Vector3();
  const glow = softParticles(T, 900), rib = ribbons(T, 1400, { flow: 14 }), decals = groundDecals(T, 64); root.add(glow.mesh, rib.mesh, decals.mesh);
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
  const bolt = Array.from({ length: 30 }, () => [0, 0, 0, 0, 0, 0, 0]); let time = 0, low = false;
  const MAG = [1, .2, .8], RED = [1, .05, .12], VIO = [.6, .25, 1], WHT = [1, .95, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
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
  /* ---------- Ruptura do Trono (MOD 249) ---------- */
  const rupture = createRuptureVFX(T, { root, glow, rib, decals, shard, plate, ring, boltRib, ground });
  /* ---------- Extinção Orbital (MOD 253): módulo próprio vhazrael-extinction3d.js ---------- */
  const extinction = createExtinctionVFX(T, { root, glow, rib, decals, shard, plate, ring, ground });
  /* ---------- Bombardeio Abissal Perseguidor (MOD 254): módulo próprio ---------- */
  const bombard = createBombardVFX(T, { root, glow, rib, decals, shard, plate, ring, ground });
  return {
    root, orbitalScene: extinction.oScene, orbitalCamera: extinction.oCam, meteor: extinction.meteor,
    /** MOD 253: tomada de câmera da Extinção ({space} = renderizar a cena orbital; senão pos/look/fov/blend na arena) */
    get orbitShot() { return extinction.shot; },
    /** luz temporária da cena (carmim da Ruptura/despertar, laranja quente do meteoro): { k, hex } */
    get sceneTint() { const a = rupture.tint, b = extinction.tint; return a >= b ? { k: a, hex: 0x9a0618 } : { k: b, hex: extinction.tintHex }; },
    /** blades: {id → {a,b}} pontas da Lâmina do Trono em mundo. Devolve a Extinção em curso (fase/tempo) para câmera e cena. */
    update(dt, camera, spells, actors = [], quality = 1, blades = {}, target = null, heads = {}) {
      time += dt; uTime.value = time; low = quality === 0; cam.copy(camera.position); sn = pn = rn = 0; for (const st of spikeSets) st.n = 0;
      glow.begin(); rib.begin(camera, time); decals.begin(); rupture.begin(camera, time, quality, target); extinction.begin(camera, time, quality); bombard.begin(camera, time, quality); const boss = actors.find(a => a.alive && a.kind === 'vhazrael');
      for (const s of spells) { if (s.type === 'thorns') drawThorns(s); else if (s.type === 'throne') rupture.draw(s, blades[s.owner], actors.find(a => a.id === s.owner && a.alive)); else if (s.type === 'bombard') bombard.draw(s, actors.find(a => a.id === s.owner && a.alive), target); else if (s.type === 'orbital') { const o = actors.find(a => a.id === s.owner && a.alive); extinction.draw(s, o, target, o ? heads[o.id] : null); } }
      if (boss && boss.phase2 && !low) for (let i = 0; i < 6; i++) { const a = i * 1.05 + time * 1.3, u = (time * .7 + i / 6) % 1; glow.add(boss.x + Math.cos(a) * .7, boss.y + u * 2.6, boss.z + Math.sin(a) * .7, .25, .5, 1, .03, .06, (1 - u) * .7, 0); }
      for (const st of spikeSets) { st.m.count = st.n; st.m.instanceMatrix.needsUpdate = true; }
      shards.count = sn; shards.instanceMatrix.needsUpdate = true; plates.count = pn; plates.instanceMatrix.needsUpdate = true; rings.count = rn; rings.instanceMatrix.needsUpdate = true;
      extinction.end(); bombard.end(); glow.end(); rib.end(); decals.end(time); rupture.end(); return extinction.info;
    },
    /** pedido de câmera da Ruptura (abrir o plano/olhar para cima durante a carga) — o jogo decide se usa */
    get throneHint() { return rupture.camHint; }, get throneTint() { return rupture.tint; },
    clear() { rupture.clear(); extinction.clear(); bombard.clear(); for (const st of spikeSets) st.m.count = 0; shards.count = plates.count = rings.count = 0;  },
    dispose() { scene.remove(root); rupture.dispose(); extinction.dispose(); bombard.dispose(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); glow.dispose(); rib.dispose(); decals.dispose(); }
  };
}
