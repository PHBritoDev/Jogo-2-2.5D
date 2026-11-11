/**
 * Mod 311 — dimensão da escadaria e ilha flutuante do deserto negro (uma zona contínua: sobe-se a pé até a ilha).
 *
 * Referências 5–7: vazio monocromático escuro com feixes de luz e névoa; escadaria longa iluminada; ilha suspensa entre
 * anéis cósmicos violeta; deserto negro com arcos e agulhas curvas e lua. A névoa abre e o céu cósmico acende conforme
 * a altura (ascentProgress): a ilha surge aos poucos durante a subida.
 */
import { ASCENT, ASCENT_PORTAL, ARENA_ROCKS, arenaRockAt, arenaRockFeet, ascentRise, ascentStairsEnd, ascentTopY, islandCenter, onIsland, islandRelief, ascentWalk, ascentFloor, ascentProgress, hash2, fbm } from './ascension-layout.js';
import { triplanarRock, ensureUv, vortexPortal, lightShaft, dustField, disposeGroup } from './ascension-fx3d.js';
import { mergeGeos } from './ascension-cave3d.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export function ascentCamSolid(x, y, z) {
  if (onIsland(x, z, 1.5)) {
    if (y < ascentTopY() + islandRelief(x, z) + .25) return true;
    for (const r of ARENA_ROCKS) { const p = arenaRockAt(r), H = (r.kind === 'arco' ? 13 : r.kind === 'agulha' ? 19 : 7) * r.s; if (y > ascentTopY() + H) continue; for (const f of arenaRockFeet(r)) if (Math.hypot(x - f.x, z - f.z) < f.r + .2) return true; if (r.kind === 'arco' && Math.hypot(x - p.x, z - p.z) < 7.5 * r.s && y > ascentTopY() + 9 * r.s && y < ascentTopY() + 14 * r.s) return true; }
    return false;
  }
  // degraus e patamares são sólidos por baixo; o vazio ao redor é livre (a câmera flutua ao lado da escada)
  if (Math.abs(x) < 3.4 && z < 8 && z > -ascentStairsEnd() - 1 && y < ascentFloor(x, z) + .2) return true;
  return false;
}

export function buildAscent(THREE, { GLTFLoader, prepareBaked, lowSpec = false, origin = { x: 0, z: 0 } } = {}) {
  const group = new THREE.Group(); group.name = 'dimensao-ascensao'; group.position.set(origin.x, 0, origin.z); group.visible = false;
  const updaters = [], tpMats = [];
  const rise = ascentRise(), N = Math.round(ASCENT.flightLen / ASCENT.tread), per = ASCENT.flightLen + ASCENT.landing, top = ascentTopY();
  // ---------- escadaria: degraus instanciados (pedra escura) + filete luminoso no focinho ----------
  const stepGeo = ensureUv(THREE, new THREE.BoxGeometry(ASCENT.width, .62, ASCENT.tread + .015));
  const stoneMat = triplanarRock(THREE, { key: 'escada', scale: .25, tint: 1.1, roughness: .82, color: 0xffffff }); tpMats.push(stoneMat);
  stoneMat.vertexColors = false; stoneMat.color.set(0xc4c6d2); stoneMat.emissive.set(0x0d0e14);
  const steps = new THREE.InstancedMesh(stepGeo, stoneMat, ASCENT.flights * N), o = new THREE.Object3D();
  const glowGeo = new THREE.BoxGeometry(ASCENT.width - .5, .02, .03), glowMat = new THREE.MeshBasicMaterial({ color: 0x7e86b4, fog: true });
  const glows = new THREE.InstancedMesh(glowGeo, glowMat, ASCENT.flights * N);
  let n = 0;
  for (let k = 0; k < ASCENT.flights; k++) for (let i = 0; i < N; i++, n++) {
    const z = -(4 + k * per + (i + .5) * ASCENT.tread), y = k * rise + (i + 1) * ASCENT.riser;
    o.position.set(0, y - .31, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); steps.setMatrixAt(n, o.matrix);
    o.position.set(0, y - .012, z + ASCENT.tread / 2 - .03); o.updateMatrix(); glows.setMatrixAt(n, o.matrix);
  }
  steps.name = 'degraus'; glows.name = 'focinhos-luminosos'; group.add(steps, glows);
  // longarinas inclinadas sob cada lance + patamares (uma malha só)
  {
    const geos = [];
    for (let k = 0; k < ASCENT.flights; k++) {
      const z0 = -(4 + k * per), z1 = z0 - ASCENT.flightLen, y0 = k * rise, y1 = (k + 1) * rise, L = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z0 - z1);
      for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(.42, 1.25, L); g.rotateX(ang); g.translate(sx * (ASCENT.width / 2 + .12), (y0 + y1) / 2 - .5, (z0 + z1) / 2); geos.push(g.toNonIndexed()); }
      const b = new THREE.BoxGeometry(ASCENT.width - .2, .5, L); b.rotateX(ang); b.translate(0, (y0 + y1) / 2 - .78, (z0 + z1) / 2); geos.push(b.toNonIndexed());
      const land = new THREE.BoxGeometry(ASCENT.landingWidth, 1.1, ASCENT.landing + .1); land.translate(0, y1 - .55, z1 - ASCENT.landing / 2); geos.push(land.toNonIndexed());
      // pilarete com cristal de luz em cada patamar (marca o ritmo da subida)
      for (const sx of [-1, 1]) { const p = new THREE.CylinderGeometry(.16, .22, 1.6, 6); p.translate(sx * (ASCENT.landingWidth / 2 - .25), y1 + .8, z1 - ASCENT.landing / 2); geos.push(p.toNonIndexed()); }
    }
    const base = new THREE.BoxGeometry(12.4, 1.4, 13); base.translate(0, -.7, 2.2); geos.push(base.toNonIndexed());
    const g = mergeGeos(THREE, geos); g.computeVertexNormals(); ensureUv(THREE, g);
    const m = new THREE.Mesh(g, stoneMat); m.name = 'estrutura-escada'; group.add(m);
    const lampGeo = new THREE.SphereGeometry(.17, 8, 6), lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xe4e8ff }), ASCENT.flights * 2);
    let q = 0; for (let k = 0; k < ASCENT.flights; k++) for (const sx of [-1, 1]) { o.position.set(sx * (ASCENT.landingWidth / 2 - .25), (k + 1) * rise + 1.7, -(4 + k * per + ASCENT.flightLen + ASCENT.landing / 2)); o.updateMatrix(); lamps.setMatrixAt(q++, o.matrix); }
    group.add(lamps);
  }
  // ---------- feixes de luz no vazio (de cima, levemente inclinados) e poeira ----------
  const shafts = [];
  for (let k = 0; k <= ASCENT.flights; k++) {
    const z = -(4 + k * per + ASCENT.flightLen * .55), y = k * rise + 70, s = lightShaft(THREE, { top: 3, bottom: 9, height: 95, color: 0xdfe6ff, intensity: .16 + .04 * (k % 2) });
    s.mesh.position.set((k % 2 ? 1 : -1) * 6, y, z); s.mesh.rotation.z = (k % 2 ? -1 : 1) * .22; group.add(s.mesh); shafts.push(s);
  }
  const dust = dustField(THREE, { count: lowSpec ? 300 : 700, box: [26, 60, 60], color: 0xdde4ff, size: 2.1 });
  group.add(dust.points);
  // ---------- portal de volta (base) ----------
  const P = ASCENT_PORTAL, portal = vortexPortal(THREE, { radius: P.r, lowSpec, deep: 0x0b1440, mid: 0x3a6bff, hot: 0xcfe2ff, rim: 0x6f9bff });
  portal.group.position.set(P.x, P.h + .2, P.z); group.add(portal.group);
  {
    const frame = new THREE.TorusGeometry(P.r + .5, .45, 8, 48); frame.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(frame.attributes.position.count * 3).fill(.5), 3)); ensureUv(THREE, frame);
    const fm = new THREE.Mesh(frame, stoneMat); fm.position.copy(portal.group.position); group.add(fm);
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(ensureUv(THREE, new THREE.CylinderGeometry(.45, .7, P.h - P.r + .7, 7)), stoneMat); leg.position.set(sx * (P.r + .25), (P.h - P.r + .7) / 2 - .1, P.z); group.add(leg); }
  }
  // ---------- ilha flutuante: topo de areia negra (microrrelevo, rachaduras) e base rochosa invertida ----------
  const C = islandCenter(), R = ASCENT.island.r;
  {
    const seg = lowSpec ? 96 : 150, rings = lowSpec ? 34 : 52, pos = [], idx = [];
    pos.push(C.x, top + islandRelief(C.x, C.z), C.z);
    for (let r = 1; r <= rings; r++) for (let s = 0; s < seg; s++) {
      const a = s / seg * Math.PI * 2, d = Math.pow(r / rings, .85) * (R + 2.5), x = C.x + Math.cos(a) * d, z = C.z + Math.sin(a) * d;
      const edge = smooth(R - 6, R + 2.5, d + (fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2, 71, 3) - .5) * 7);
      pos.push(x, top + islandRelief(x, z) - edge * 2.2, z);
    }
    for (let s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
    for (let r = 1; r < rings; r++) for (let s = 0; s < seg; s++) { const a = 1 + (r - 1) * seg + s, b = 1 + (r - 1) * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); ensureUv(THREE, g);
    const sand = new THREE.MeshStandardMaterial({ color: 0x29272b, roughness: .88, metalness: .05 });
    sand.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vSW;
        vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
        float vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = h2(i + g); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return d2 - d1; }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 wp = vSW.xz + vec2(sin(vSW.z * .21) * 2.4 + sin(vSW.x * .07) * 5.0 + sin(vSW.z * .9 + vSW.x * .3) * .7, cos(vSW.x * .19) * 2.4 + sin(vSW.z * .05) * 5.0 + cos(vSW.x * .8 - vSW.z * .4) * .7);
        float mask = smoothstep(.45, .75, fract(sin(dot(floor(wp * .055), vec2(41.3, 289.1))) * 9631.7));
        float crack = (1.0 - smoothstep(.0, .025, vor(wp * .11))) * mask; float crack2 = (1.0 - smoothstep(.0, .03, vor(wp * .5 + 3.0))) * .5;
        float grain = fract(sin(dot(floor(vSW.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
        float dune = .5 + .5 * sin(dot(vSW.xz, vec2(.42, .17)) + sin(vSW.z * .05) * 3.0);
        diffuseColor.rgb *= (1.0 - crack * .65 - crack2 * .25) * (.8 + .3 * grain) * (.85 + .3 * dune);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(.32, .16, .6) * crack * .05 + vec3(.6, .62, .8) * step(.992, grain) * .18;`);
    };
    sand.customProgramCacheKey = () => 'areia-negra';
    const isle = new THREE.Mesh(g, sand); isle.name = 'ilha-topo'; isle.receiveShadow = true; group.add(isle);
    // base invertida (perfil de torno com ruído), raízes pendentes
    const prof = []; for (let k = 0; k <= 18; k++) { const t = k / 18; prof.push(new THREE.Vector2((R + 2.5) * (1 - Math.pow(t, .7)) * (1 + .08 * Math.sin(t * 9)) + .01, -t * 105 - 2.2)); }
    const under = new THREE.LatheGeometry(prof, lowSpec ? 40 : 64); const U = under.attributes.position;
    for (let i = 0; i < U.count; i++) { const x = U.getX(i), y = U.getY(i), z = U.getZ(i), n = 1 + .26 * (fbm(x * .05 + y * .03, z * .05, 951, 3) - .5) * 2 * smooth(-4, -18, y); U.setXYZ(i, C.x + x * n, top + y, C.z + z * n); }
    let ug = under.toNonIndexed(); ug.computeVertexNormals(); ensureUv(THREE, ug);
    ug.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ug.attributes.position.count * 3).fill(.45), 3));
    const underMat = triplanarRock(THREE, { key: 'ilha-base', scale: .04, tint: .9 }); tpMats.push(underMat);
    const um = new THREE.Mesh(ug, underMat); um.name = 'ilha-base'; group.add(um);
  }
  // ---------- formações curvas da arena (arcos, agulhas, blocos) — pés = colisão de arenaRockFeet ----------
  {
    const geos = [];
    for (const r of ARENA_ROCKS) {
      const p = arenaRockAt(r), y0 = top - .8;
      if (r.kind === 'arco') {
        const half = 7.5 * r.s, H = 12.5 * r.s, cx = Math.cos(r.rot), sz = Math.sin(r.rot), pts = [];
        for (let k = 0; k <= 24; k++) { const t = k / 24, a = Math.PI * t; pts.push(new THREE.Vector3(p.x + cx * half * Math.cos(a), y0 + Math.sin(a) * H + (1 - Math.sin(a)) * .4, p.z + sz * half * Math.cos(a))); }
        const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(curve, 48, 1, 10, false), T = tube.attributes.position, nrm = tube.attributes.normal;
        for (let i = 0; i < T.count; i++) { const u = Math.floor(i / 11) / 48, w = (2.05 - 1.15 * Math.sin(Math.PI * u)) * r.s, nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i), c = curve.getPointAt(Math.min(1, u)), j = 1 + .3 * (fbm(T.getX(i) * .25, T.getY(i) * .25 + T.getZ(i) * .2, 952, 3) - .5) * 2; T.setXYZ(i, c.x + nx * w * j, c.y + ny * w * j, c.z + nz * w * j); }
        geos.push(tube.toNonIndexed());
      } else if (r.kind === 'agulha') {
        const H = 18 * r.s, base = 2.45 * r.s, prof = []; for (let k = 0; k <= 16; k++) { const t = k / 16; prof.push(new THREE.Vector2(base * Math.pow(1 - t, 1.25) * (1 + .18 * Math.sin(t * 11)) + .05, t * H)); }
        const g = new THREE.LatheGeometry(prof, 9), G = g.attributes.position, bend = (hash2(Math.round(r.a * 100), 1, 953) - .5) * 2;
        for (let i = 0; i < G.count; i++) { const x = G.getX(i), y = G.getY(i), zz = G.getZ(i), t = y / H, ang = t * 1.4 * bend, ca = Math.cos(ang), sa = Math.sin(ang), j = 1 + .22 * (fbm(x * .4 + y * .1, zz * .4, 954, 2) - .5) * 2; G.setXYZ(i, p.x + (x * ca - zz * sa) * j + bend * t * t * 4 * r.s, y0 + y, p.z + (x * sa + zz * ca) * j); }
        geos.push(g.toNonIndexed());
      } else {
        const g = new THREE.IcosahedronGeometry(3.2 * r.s, 2), G = g.attributes.position;
        for (let i = 0; i < G.count; i++) { const x = G.getX(i), y = G.getY(i), zz = G.getZ(i), j = 1 + .3 * (fbm(x * .3, y * .3 + zz * .3, 955, 3) - .5) * 2; G.setXYZ(i, p.x + x * j, y0 + Math.max(-.8, y * .75 * j + 1.6 * r.s), p.z + zz * j); }
        geos.push(g.index ? g.toNonIndexed() : g);
      }
    }
    const g = mergeGeos(THREE, geos); g.computeVertexNormals(); ensureUv(THREE, g);
    const cc = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) { const k = .22 + .12 * hash2(i, 2, 956); cc[i] = k; cc[i + 1] = k * .97; cc[i + 2] = k * 1.06; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const rockMat = triplanarRock(THREE, { key: 'arena-rocha', scale: .06, tint: .85, roughness: .8 }); tpMats.push(rockMat);
    const rocks = new THREE.Mesh(g, rockMat); rocks.name = 'formacoes-arena'; rocks.castShadow = true; rocks.receiveShadow = true; group.add(rocks);
  }
  // ---------- céu: vazio cinza-escuro embaixo → céu cósmico (estrelas, nebulosa, aurora sutil) no alto ----------
  const skyU = { uTime: { value: 0 }, uProg: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uProg; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fb(vec3 p){ float v = 0.0, a = .5; for (int i = 0; i < 4; i++) { v += a * n3(p); p *= 2.02; a *= .5; } return v; }
      void main(){ vec3 d = normalize(vD); float up = d.y;
        vec3 voidC = mix(vec3(.028, .03, .036), vec3(.075, .078, .09), smoothstep(-.2, .6, up));
        vec3 cosmic = mix(vec3(.02, .012, .05), vec3(.09, .04, .19), smoothstep(-.3, .8, up));
        float neb = fb(d * 3.0 + vec3(0.0, uTime * .004, 0.0)); float neb2 = fb(d * 6.5 + 4.0);
        cosmic += vec3(.32, .12, .55) * pow(neb, 3.0) * .9 + vec3(.05, .25, .35) * pow(neb2, 4.0) * .6;
        vec3 sc = floor(d * 380.0); float st = h(sc); float star = step(.9965, st) * (.55 + .45 * sin(uTime * (1.0 + st * 4.0) + st * 60.0));
        cosmic += vec3(.85, .88, 1.0) * star * 1.4;
        // aurora: cortinas sutis acima do horizonte, ondulando devagar
        float az = atan(d.z, d.x); float band = smoothstep(.05, .25, up) * smoothstep(.62, .3, up);
        float cur = fb(vec3(az * 3.0, up * 6.0 - uTime * .05, uTime * .02)); float rays = .5 + .5 * sin(az * 26.0 + cur * 6.0 + uTime * .15);
        vec3 aur = mix(vec3(.15, .9, .65), vec3(.55, .3, 1.0), smoothstep(.15, .5, up)) * band * pow(cur, 2.0) * (.35 + .65 * rays) * .55;
        vec3 col = mix(voidC, cosmic + aur, smoothstep(.15, .85, uProg));
        gl_FragColor = vec4(col, 1.0); }`,
  }));
  sky.name = 'ceu-ascensao'; sky.renderOrder = -10; sky.frustumCulled = false; group.add(sky);
  // anéis cósmicos (aditivos) em volta da ilha e a lua
  const ringU = { uTime: skyU.uTime, uProg: skyU.uProg };
  const rings = [];
  for (const [rad, w, tx, tz, col] of [[520, 34, .95, -.3, 0x9b5cff], [600, 14, .9, -.26, 0x6c7bff], [690, 48, 1.02, -.34, 0x7a3cff]]) {
    const g = new THREE.RingGeometry(rad - w, rad + w, 160, 1), U = g.attributes.uv, Pp = g.attributes.position;
    for (let i = 0; i < Pp.count; i++) U.setXY(i, (Math.atan2(Pp.getY(i), Pp.getX(i)) / 6.2832 + 1) % 1, (Math.hypot(Pp.getX(i), Pp.getY(i)) - (rad - w)) / (2 * w));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...ringU, uC: { value: new THREE.Color(col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime, uProg; uniform vec3 uC; varying vec2 vUv;
        float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
        void main(){ float k = 1.0 - abs(vUv.y * 2.0 - 1.0); float lanes = .55 + .45 * sin(vUv.y * 40.0 + h(floor(vUv.y * 12.0)) * 6.0); float flow = .7 + .3 * sin(vUv.x * 60.0 - uTime * .08);
          gl_FragColor = vec4(uC * pow(k, 1.3) * lanes * flow * .7 * smoothstep(.25, .9, uProg), 1.0); }` }));
    m.rotation.set(Math.PI / 2 + tx, 0, tz); m.position.set(C.x, top + 150, C.z); m.renderOrder = -9; m.frustumCulled = false; group.add(m); rings.push(m);
  }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uProg; varying vec3 vN; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ float l = max(0.0, dot(vN, normalize(vec3(-.5, .3, .8)))); float m = n3(vP * .05) * .6 + n3(vP * .13) * .4; vec3 c = mix(vec3(.55, .56, .62), vec3(.86, .87, .92), m) * (.08 + l * 1.1);
        gl_FragColor = vec4(c * smoothstep(.2, .8, uProg), 1.0); }` }));
  moon.position.set(C.x - 380, top + 260, C.z - 620); moon.renderOrder = -9; moon.frustumCulled = false; group.add(moon);
  // ---------- luzes: brilho do portal de volta e luar da ilha ----------
  const portalLight = new THREE.PointLight(0x5f86ff, 2.6, 18, 1.6); portalLight.position.set(P.x, P.h, P.z - 2); portalLight.name = 'ascensao-luz-portal'; group.add(portalLight);
  const isleLight = new THREE.PointLight(0xa58cff, 0, 140, 1.2); isleLight.position.set(C.x, top + 30, C.z); isleLight.name = 'ascensao-luz-ilha'; group.add(isleLight);
  // ---------- texturas assadas (rocha do maciço) para o triplanar ----------
  const ready = new Promise(res => {
    if (!GLTFLoader) { res(); return; }
    new GLTFLoader().load('./MontanhaEldoria01.glb', g => { let mesh = null; g.scene.traverse(q => { if (!mesh && q.isMesh) mesh = q; }); prepareBaked && prepareBaked(g.scene); const tex = mesh && mesh.material.map; for (const m of tpMats) { m.map = tex; m.needsUpdate = true; } disposeGroup(g.scene, new Set([tex])); res(); }, undefined, () => res());
  });
  let t = 0, prog = 0;
  const env = { bg: 0x08090b, fog: 0x0b0c0f, fogNear: 18, fogFar: 150, hemi: [0x9aa0b4, 0x101014, .55], sun: [0xe8ecff, 1.0], exposure: 1.05 };
  return {
    group, ready, portal, walk: ascentWalk, floor: ascentFloor, camSolid: ascentCamSolid, env,
    progress: () => prog,
    update(dt, cam, player) {
      t += dt; for (const s of shafts) s.update(t); dust.update(t); portal.update(dt);
      // a poeira acompanha o herói (caixa móvel) — a subida inteira tem partículas sem custo extra
      if (player) dust.points.position.set(-13 + 0, Math.max(0, player.y - 25), player.z - 30);
      const target = ascentProgress(player ? player.y : 0); prog += (target - prog) * (1 - Math.exp(-dt * 2));
      skyU.uTime.value = t; skyU.uProg.value = prog;
      if (cam) sky.position.copy(cam.position).sub(group.position);
      // revelação: a névoa abre com a altura; no alto o mundo vira céu cósmico com a ilha recortada
      env.fogNear = lerp(18, 180, smooth(.05, .95, prog)); env.fogFar = lerp(150, 1500, smooth(.05, .9, prog));
      const c = new THREE.Color(0x0b0c0f).lerp(new THREE.Color(0x120a22), smooth(.2, .9, prog)); env.fog = c.getHex(); env.bg = env.fog;
      env.hemi = [new THREE.Color(0x9aa0b4).lerp(new THREE.Color(0x8f7cff), prog).getHex(), 0x0b0a10, lerp(.55, .75, prog)];
      env.sun = [new THREE.Color(0xe8ecff).lerp(new THREE.Color(0xc8c0ff), prog).getHex(), lerp(1.0, .7, prog)];
      isleLight.intensity = 2.2 * smooth(.6, 1, prog);
      for (const r of rings) r.rotation.y = Math.sin(t * .01) * .02;
    },
    dispose() { disposeGroup(group); },
    stats() { let tris = 0; group.traverse(q => { if (q.isMesh && q.geometry) { const k = (q.geometry.index ? q.geometry.index.count : q.geometry.attributes.position.count) / 3; tris += q.isInstancedMesh ? k * q.count : k; } }); return { tris: Math.round(tris), steps: ASCENT.flights * N, top }; },
  };
}
