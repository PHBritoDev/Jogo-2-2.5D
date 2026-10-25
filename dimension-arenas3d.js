/**
 * MOD 202 — Arenas e portais das dimensões dos Bispos (geometria procedural, sem arquivos novos).
 * O módulo recebe o THREE como parâmetro (o mundo já o carrega) e só cria objetos quando a dimensão é aberta,
 * então não pesa na entrada do jogo. Tudo é instanciado/agrupado: poucas chamadas de desenho para o celular.
 * Referências do criador: Valério (câmara macabra de moedas e correntes), Vorgazhek (vazio de olhos vermelhos e
 * lua sorridente), Zar'khael (cogumelos gigantes com olhos sobre piso xadrez), Véraxion (corredor torto com claraboias).
 */
import { SEWER } from './sewer3d.js';
import { VOLCANO } from './volcano3d.js';
import { INN, ICE_CAVE, DISTORTED } from './snow3d.js';
import { TOWER_HALL } from './tower3d.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function canvasTex(THREE, w, h, draw, { repeat = null, aniso = 4 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

function eyeTexture(THREE, { sclera = ['#5a0a10', '#c02030'], iris = '#e83040', ring = '#220004' } = {}) {
  return canvasTex(THREE, 128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, sclera[1]); grad.addColorStop(1, sclera[0]);
    g.fillStyle = grad; g.beginPath(); g.ellipse(64, 64, 62, 34, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(40,0,6,.55)'; g.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 33); g.quadraticCurveTo(64 + Math.cos(a + .3) * 38, 64 + Math.sin(a + .3) * 20, 64 + Math.cos(a) * 26, 64 + Math.sin(a) * 15); g.stroke(); }
    const ig = g.createRadialGradient(64, 64, 4, 64, 64, 28);
    ig.addColorStop(0, '#000'); ig.addColorStop(.4, ring); ig.addColorStop(.75, iris); ig.addColorStop(1, ring);
    g.fillStyle = ig; g.beginPath(); g.arc(64, 64, 28, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(64, 64, 5, 20, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(55, 54, 4, 0, Math.PI * 2); g.fill();
  });
}

const EYE_VERT = 'attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uScale;varying float vA;varying float vBlink;' +
  'void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float b=abs(sin(uTime*.55+aPhase*6.2831));vBlink=b>.965?.12:1.;' +
  'gl_PointSize=clamp(aSize*uScale/max(-mv.z,1.),0.,120.);vA=.62+.38*sin(uTime*1.3+aPhase*17.);}';
const EYE_FRAG = 'uniform sampler2D uMap;uniform vec3 uTint;varying float vA;varying float vBlink;' +
  'void main(){vec2 uv=vec2(gl_PointCoord.x,(gl_PointCoord.y-.5)/vBlink+.5);if(uv.y<0.||uv.y>1.)discard;vec4 t=texture2D(uMap,uv);if(t.a<.04)discard;gl_FragColor=vec4(t.rgb*uTint*vA,t.a);}';

/** Nuvem de olhos numa única chamada de desenho. place(i, rand) → {x,y,z,size}. */
function eyeField(THREE, { count, seed, tex, tint = [1, 1, 1], place }) {
  const r = rng(seed), pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) { const p = place(i, r); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; size[i] = p.size; phase[i] = r(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: EYE_VERT, fragmentShader: EYE_FRAG, transparent: true, depthWrite: false, fog: false,
    uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uScale: { value: 600 }, uTint: { value: new THREE.Vector3(...tint) } } });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 3;
  return pts;
}

const SWIRL_FRAG = 'uniform float uTime;uniform vec3 uA;uniform vec3 uB;varying vec2 vUv;' +
  'void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float s=sin(a*5.-log(r+.03)*7.-uTime*1.7);float v=smoothstep(.15,1.,s*.5+.5)*(1.-r*.5);' +
  'vec3 c=mix(uA,uB,v);float edge=smoothstep(1.,.82,r);gl_FragColor=vec4(c*(.25+v*1.5),edge*(.78+.22*v));}';
function swirlMaterial(THREE, a, b) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SWIRL_FRAG,
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) } } });
}

function dispose(group) {
  group.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { for (const mm of Array.isArray(m) ? m : [m]) { if (mm.map) mm.map.dispose(); mm.dispose(); } } });
}

function instanced(THREE, geo, mat, items, { castShadow = false } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, items.length), d = new THREE.Object3D();
  items.forEach((it, i) => { d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0); d.scale.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.instanceMatrix.needsUpdate = true; m.castShadow = castShadow; m.frustumCulled = false; return m;
}

function checkerTexture(THREE, repeat, { a = '#0a0a0c', b = '#c8c8d0', cracks = true } = {}) {
  return canvasTex(THREE, 512, 512, (g, w, h) => {
    const n = 8, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
    if (cracks) { const r = rng(7); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.4; for (let i = 0; i < 26; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); } }
  }, { repeat });
}

/* ===================== ARENAS ===================== */
const THEMES = {
  // Valério — a câmara macabra: pedra preta, ouro velho, correntes, gaiolas com enforcados e sangue seco.
  vault(THREE, g, spec, ctx) {
    const r = rng(101), R = spec.radius;
    const floorTex = canvasTex(THREE, 1024, 1024, (c, w, h) => {
      c.fillStyle = '#0e0a08'; c.fillRect(0, 0, w, h);
      const rr = rng(5);
      for (let i = 0; i < 520; i++) { c.fillStyle = 'rgba(' + (30 + rr() * 30) + ',' + (22 + rr() * 20) + ',16,' + (.25 + rr() * .3) + ')'; c.fillRect(rr() * w, rr() * h, 8 + rr() * 40, 8 + rr() * 26); }
      c.strokeStyle = 'rgba(224,176,64,.5)'; c.lineWidth = 5;
      for (const rad of [90, 190, 300, 420]) { c.beginPath(); c.arc(w / 2, h / 2, rad, 0, Math.PI * 2); c.stroke(); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 90, h / 2 + Math.sin(a) * 90); c.lineTo(w / 2 + Math.cos(a) * 430, h / 2 + Math.sin(a) * 430); c.stroke(); }
      for (let i = 0; i < 260; i++) { const a = rr() * 6.28, d = 60 + rr() * 440, x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d; c.fillStyle = 'rgba(200,150,40,' + (.35 + rr() * .4) + ')'; c.beginPath(); c.ellipse(x, y, 9, 7, rr() * 3, 0, 6.3); c.fill(); }
      for (let i = 0; i < 16; i++) { const x = rr() * w, y = rr() * h; const gr = c.createRadialGradient(x, y, 2, x, y, 40 + rr() * 60); gr.addColorStop(0, 'rgba(110,8,12,.7)'); gr.addColorStop(1, 'rgba(110,8,12,0)'); c.fillStyle = gr; c.fillRect(x - 120, y - 120, 240, 240); }
      c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2; for (let i = 0; i < 40; i++) { let x = rr() * w, y = rr() * h; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rr() - .5) * 90; y += (rr() - .5) * 90; c.lineTo(x, y); } c.stroke(); }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 72), new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0x6a5020, emissiveIntensity: .42, roughness: .55, metalness: .35 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 1.6, .16, 6, 96), new THREE.MeshBasicMaterial({ color: 0xc89a30, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = .06; g.add(rim);
    // Pilares negros enrolados em correntes douradas.
    const pil = [], bands = [], cages = [], chains = [], bodies = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rad = R + 6, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      pil.push({ x, y: 14, z, sx: 1, sy: 1, sz: 1 });
      for (const y of [4, 11, 18]) bands.push({ x, y, z, rx: Math.PI / 2 });
      if (i % 2 === 0) { const a2 = a + Math.PI / 16, cx = Math.cos(a2) * (R - 3), cz = Math.sin(a2) * (R - 3), cy = 9 + r() * 7;
        cages.push({ x: cx, y: cy, z: cz, ry: a2 }); chains.push({ x: cx, y: cy + 9, z: cz, sy: 1 }); bodies.push({ x: cx, y: cy - .2, z: cz, rz: (r() - .5) * .4 }); } }
    g.add(instanced(THREE, new THREE.CylinderGeometry(1.1, 1.6, 28, 8), new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: .8, metalness: .3 }), pil));
    g.add(instanced(THREE, new THREE.TorusGeometry(1.5, .22, 6, 14), new THREE.MeshStandardMaterial({ color: 0xc89a30, emissive: 0x6a4a10, emissiveIntensity: .9, metalness: .8, roughness: .35 }), bands));
    g.add(instanced(THREE, new THREE.BoxGeometry(2.2, 3.4, 2.2), new THREE.MeshBasicMaterial({ color: 0x8a6a28, wireframe: true, toneMapped: false }), cages));
    g.add(instanced(THREE, new THREE.CylinderGeometry(.05, .05, 18, 4), new THREE.MeshBasicMaterial({ color: 0x6a5020 }), chains));
    g.add(instanced(THREE, new THREE.CapsuleGeometry(.38, 1.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: 1 }), bodies));
    // Costelas gigantes em arco e crânios empilhados na base dos pilares.
    const ribs = [], skulls = [], sockets = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + .13; ribs.push({ x: Math.cos(a) * (R + 3.5), y: 0, z: Math.sin(a) * (R + 3.5), ry: -a, sx: 1, sy: 1.5, sz: 1 }); }
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = R - 1 + r() * 9, s = .38 + r() * .22, x = Math.cos(a) * d, z = Math.sin(a) * d; skulls.push({ x, y: s * .8, z, s }); sockets.push({ x: x + Math.cos(a + 3.14) * s * .18, y: s * .9, z: z + Math.sin(a + 3.14) * s * .18, s: s * .3 }); }
    g.add(instanced(THREE, new THREE.TorusGeometry(6, .32, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: .8, emissive: 0x30281c, emissiveIntensity: .8 }), ribs));
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: .85, emissive: 0x3a3022, emissiveIntensity: .7 }), skulls));
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial({ color: 0x050202 }), sockets));
    // Pilhas de moedas e moedas soltas no chão.
    const piles = [], loose = [];
    for (let i = 0; i < 20; i++) { const a = r() * 6.28, d = 12 + r() * (R - 10); piles.push({ x: Math.cos(a) * d, y: .25, z: Math.sin(a) * d, sx: .6 + r() * 1.1, sy: .35 + r() * .6, sz: .6 + r() * 1.1 }); }
    for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = r() * (R + 1); loose.push({ x: Math.cos(a) * d, y: .04, z: Math.sin(a) * d, ry: r() * 3, sx: .5, sy: .5, sz: .5 }); }
    const gold = new THREE.MeshStandardMaterial({ color: 0xd8a830, emissive: 0x7a5010, emissiveIntensity: 1.1, metalness: .85, roughness: .3 });
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1.4, 12), gold, piles));
    g.add(instanced(THREE, new THREE.CylinderGeometry(.5, .5, .08, 10), gold, loose));
    // Moedas no ar (sobem e giram devagar).
    const air = []; for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = 6 + r() * 70; air.push({ x: Math.cos(a) * d, y: 3 + r() * 40, z: Math.sin(a) * d, rx: r() * 3, ry: r() * 3, s: .8 + r() * .9 }); }
    const airMesh = instanced(THREE, new THREE.CylinderGeometry(.6, .6, .1, 10), gold, air); g.add(airMesh);
    // Feixe dourado sobre o centro e olhos do ledger acima do trono.
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(7, 11, 60, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: .09, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    beam.position.y = 30; g.add(beam);
    const eyes = eyeField(THREE, { count: 26, seed: 31, tex: eyeTexture(THREE, { sclera: ['#3a2a08', '#c89a30'], iris: '#ff7a20', ring: '#2a1004' }), tint: [1, .9, .7],
      place: (i, rr) => { const a = rr() * 6.28, d = 60 + rr() * 90; return { x: Math.cos(a) * d, y: 10 + rr() * 70, z: Math.sin(a) * d, size: 6 + rr() * 8 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    ctx.tick.push((t, dt) => { airMesh.rotation.y += dt * .05; airMesh.position.y = Math.sin(t * .6) * .6; beam.material.opacity = .08 + Math.sin(t * 1.3) * .025; });
    return { bg: 0x090303, fog: 0x1a0807, fogNear: 22, fogFar: 140, hemi: [0xb89868, 0x2a1408, .75], sun: [0xffc880, .55], light: [0xffa040, 2.6, 80, [0, 12, 0]], exposure: 1.15 };
  },

  // Vorgazhek — vazio de olhos vermelhos, monólitos que pingam e uma lua que sorri.
  eyes(THREE, g, spec, ctx) {
    const r = rng(202), R = spec.radius;
    const floorTex = canvasTex(THREE, 1024, 1024, (c, w, h) => {
      c.fillStyle = '#120406'; c.fillRect(0, 0, w, h); const rr = rng(9);
      c.strokeStyle = 'rgba(230,40,50,.65)'; c.lineWidth = 3;
      for (const rad of [80, 170, 270, 390, 470]) { c.beginPath(); c.arc(w / 2, h / 2, rad, 0, 6.3); c.stroke(); }
      for (let i = 0; i < 70; i++) { let x = w / 2, y = h / 2, a = rr() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (rr() - .5) * .8; x += Math.cos(a) * 55; y += Math.sin(a) * 55; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 40; i++) { const x = rr() * w, y = rr() * h; c.fillStyle = 'rgba(190,20,30,.35)'; c.beginPath(); c.ellipse(x, y, 20 + rr() * 30, 9 + rr() * 14, rr() * 3, 0, 6.3); c.fill(); }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 72), new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0xa01018, emissiveIntensity: .75, roughness: .25, metalness: .45 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 1.6, .14, 6, 96), new THREE.MeshBasicMaterial({ color: 0xff2a38, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = .06; g.add(rim);
    // Degraus e portão ao fundo, coberto de olhos.
    const steps = []; for (let i = 0; i < 4; i++) steps.push({ x: 0, y: .35 + i * .7, z: -R - 4 - i * 1.4, sx: 26 - i * 3, sy: .7, sz: 1.6 });
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1a0a0c, roughness: .5, metalness: .3, emissive: 0x300408, emissiveIntensity: .6 }), steps));
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x140608, roughness: .6, metalness: .2, emissive: 0x4a0a10, emissiveIntensity: .8 });
    const gate = new THREE.Mesh(new THREE.BoxGeometry(30, 46, 5), gateMat); gate.position.set(0, 24, -R - 12); g.add(gate);
    const gateInner = new THREE.Mesh(new THREE.PlaneGeometry(14, 32), swirlMaterial(THREE, '#300008', '#ff2a3a')); gateInner.position.set(0, 18, -R - 9.4); g.add(gateInner); ctx.swirls.push(gateInner.material);
    // Monólitos flutuantes.
    const mono = []; for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 36 + r() * 70; mono.push({ x: Math.cos(a) * d, y: 4 + r() * 50, z: Math.sin(a) * d, sx: 2 + r() * 3, sy: 6 + r() * 14, sz: 2 + r() * 3, ry: r() * 3, rz: (r() - .5) * .4 }); }
    const monoMesh = instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x150a0c, roughness: .8, emissive: 0x3a0408, emissiveIntensity: .7 }), mono); g.add(monoMesh);
    // Campo de olhos por todo o céu e abaixo.
    const tex = eyeTexture(THREE);
    const eyes = eyeField(THREE, { count: 520, seed: 77, tex, tint: [1.05, .85, .85],
      place: (i, rr) => { const a = rr() * 6.28, el = (rr() - .35) * 1.9, d = 42 + rr() * 150; return { x: Math.cos(a) * Math.cos(el) * d, y: Math.sin(el) * d * .8 + 18, z: Math.sin(a) * Math.cos(el) * d, size: 2 + rr() * rr() * 16 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    // Lua que sorri.
    const moonTex = canvasTex(THREE, 512, 512, (c, w, h) => {
      const gr = c.createRadialGradient(256, 256, 40, 256, 256, 250); gr.addColorStop(0, '#d8d4d0'); gr.addColorStop(1, '#6a6460'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const rr = rng(3); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(40,36,34,.35)'; c.beginPath(); c.arc(rr() * w, rr() * h, 6 + rr() * 24, 0, 6.3); c.fill(); }
      c.fillStyle = '#100608'; c.beginPath(); c.ellipse(180, 200, 28, 38, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(330, 200, 28, 38, 0, 0, 6.3); c.fill();
      c.fillStyle = '#e02a38'; c.beginPath(); c.arc(180, 205, 10, 0, 6.3); c.fill(); c.beginPath(); c.arc(330, 205, 10, 0, 6.3); c.fill();
      c.fillStyle = '#100608'; c.beginPath(); c.moveTo(110, 320); c.quadraticCurveTo(256, 470, 400, 320); c.quadraticCurveTo(256, 400, 110, 320); c.fill();
      c.fillStyle = '#e8e4e0'; for (let i = 0; i < 9; i++) { const x = 130 + i * 31; c.fillRect(x, 345 + Math.sin(i / 8 * Math.PI) * 28, 20, 24); }
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 16), new THREE.MeshBasicMaterial({ map: moonTex, fog: false, toneMapped: false })); moon.position.set(70, 80, -110); moon.lookAt(0, 20, 0); g.add(moon);
    ctx.tick.push((t, dt) => { monoMesh.position.y = Math.sin(t * .35) * 1.2; rim.material.color.setHSL(.99, .85, .5 + .08 * Math.sin(t * 2.2)); });
    return { bg: 0x050102, fog: 0x0c0204, fogNear: 22, fogFar: 170, hemi: [0xff8890, 0x40080c, .95], sun: [0xff9a9a, .5], light: [0xff3040, 3.4, 90, [0, 12, 0]], exposure: 1.2 };
  },

  // Zar'khael — cogumelos gigantes de olhos abertos, piso xadrez e uma luz distante no fim do corredor.
  mushrooms(THREE, g, spec, ctx) {
    const r = rng(303), R = spec.radius;
    const chk = checkerTexture(THREE, 4);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 64), new THREE.MeshStandardMaterial({ map: chk, roughness: .22, metalness: .2, emissiveMap: chk, emissive: 0x505058, emissiveIntensity: .16 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const runwayTex = checkerTexture(THREE, 1, {}); runwayTex.wrapS = runwayTex.wrapT = THREE.RepeatWrapping; runwayTex.repeat.set(2, 14);
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(16, 180), new THREE.MeshStandardMaterial({ map: runwayTex, roughness: .2, metalness: .2, emissiveMap: runwayTex, emissive: 0x585860, emissiveIntensity: .3 }));
    runway.rotation.x = -Math.PI / 2; runway.position.set(0, .01, -R - 90); g.add(runway);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: .85, emissive: 0x5a5444, emissiveIntensity: .7 }), capMat = new THREE.MeshStandardMaterial({ color: 0xb01420, roughness: .4, emissive: 0x80101a, emissiveIntensity: 1 });
    const stems = [], caps = [], eyeAt = [];
    const place = (x, z, h, w, i) => { stems.push({ x, y: h / 2, z, sx: w, sy: h, sz: w }); caps.push({ x, y: h, z, sx: w * 2.7, sy: w * 1.15, sz: w * 2.7 });
      for (let k = 0; k < 6; k++) { const a = r() * 6.28, el = .35 + r() * .8; eyeAt.push({ x: x + Math.cos(a) * Math.cos(el) * w * 2.5, y: h + Math.sin(el) * w * 1.1, z: z + Math.sin(a) * Math.cos(el) * w * 2.5, size: w * (2 + r() * 2.5) }); } };
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + .2, d = R + 8 + r() * 14; place(Math.cos(a) * d, Math.sin(a) * d, 16 + r() * 20, 2.6 + r() * 2, i); }
    for (let i = 0; i < 14; i++) { const z = -R - 8 - i * 11, side = i % 2 ? 1 : -1; place(side * (11 + r() * 5), z, 9 + r() * 12, 1.6 + r(), i); }
    g.add(instanced(THREE, new THREE.CylinderGeometry(.62, 1, 1, 10), stemMat, stems));
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat, caps));
    const eyes = eyeField(THREE, { count: eyeAt.length, seed: 5, tex: eyeTexture(THREE, { sclera: ['#8a8a92', '#f0eee8'], iris: '#4a4a58', ring: '#101014' }), tint: [1, 1, 1], place: i => eyeAt[i] });
    g.add(eyes); ctx.eyes.push(eyes);
    const pillars = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .4; pillars.push({ x: Math.cos(a) * (R + 2), y: 3.2, z: Math.sin(a) * (R + 2), sx: 2.4, sy: 6.4 + r() * 3, sz: 2.4, ry: r() }); }
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: .9 }), pillars));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, map: canvasTex(THREE, 128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }) }));
    glow.position.set(0, 4, -R - 180); g.add(glow); ctx.tick.push((t) => { glow.material.opacity = .82 + Math.sin(t * 1.4) * .12; });
    return { bg: 0x020203, fog: 0x050506, fogNear: 26, fogFar: 190, hemi: [0xd8d0e0, 0x201018, 1.0], sun: [0xe8e0f0, .6], light: [0xffe8e8, 2.4, 90, [0, 14, 0]], exposure: 1.2 };
  },

  // Véraxion — corredor torto: paredes inclinadas, portas escuras, claraboias e piso xadrez lustroso.
  hall(THREE, g, spec, ctx) {
    const r = rng(404), R = spec.radius;
    const chk = checkerTexture(THREE, 4, { a: '#050507', b: '#c0c0ca' });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 4, 64), new THREE.MeshStandardMaterial({ map: chk, roughness: .14, metalness: .3, emissiveMap: chk, emissive: 0x606070, emissiveIntensity: .14 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const walls = [], doors = [], sky = [];
    const N = 22;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, x = Math.cos(a) * (R + 3), z = Math.sin(a) * (R + 3), tilt = Math.sin(i * 1.7) * .22;
      walls.push({ x, y: 12, z, ry: -a + Math.PI / 2, rz: tilt, sx: 9.6, sy: 26, sz: 1.4 });
      if (i % 2 === 0) doors.push({ x: Math.cos(a) * (R + 2.2), y: 6, z: Math.sin(a) * (R + 2.2), ry: -a + Math.PI / 2, rz: tilt, sx: 4.4, sy: 10, sz: .2 }); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = 10 + (i % 3) * 8; sky.push({ x: Math.cos(a) * d, y: 24.6 - (i % 3) * .3, z: Math.sin(a) * d, ry: -a + (r() - .5) * .8, rx: Math.PI / 2, sx: 7, sy: 2.6, sz: 1 }); }
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: .95, emissive: 0x24242e, emissiveIntensity: 1 }), walls));
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x020203 }), doors));
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(R + 6, 48), new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: 0x16161c, emissiveIntensity: 1, roughness: 1, side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 25; g.add(ceil);
    const skyMesh = instanced(THREE, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xf2f4ff, toneMapped: false, side: THREE.DoubleSide }), sky); g.add(skyMesh);
    // Quadros de porta flutuando em fuga, como no corredor da referência.
    const frames = []; for (let i = 0; i < 12; i++) { const z = -R - 6 - i * 7; frames.push({ x: 0, y: 7.5, z, rz: i * .09, sx: 15 - i * .6, sy: 15 - i * .6, sz: .8 }); }
    g.add(instanced(THREE, new THREE.TorusGeometry(.5, .04, 4, 4), new THREE.MeshBasicMaterial({ color: 0x9aa0b8, toneMapped: false }), frames.map(f => ({ ...f, rz: f.rz + Math.PI / 4, sx: f.sx * 1.6, sy: f.sy * 1.6, sz: 1 }))));
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); lamp.position.set(0, 7, -R - 90); g.add(lamp);
    ctx.tick.push((t) => { lamp.material.opacity = .78 + Math.sin(t * 1.1) * .12; });
    return { bg: 0x030304, fog: 0x07070a, fogNear: 22, fogFar: 160, hemi: [0xc8d0f0, 0x101018, .95], sun: [0xdfe6ff, .75], light: [0xb8c8ff, 2.8, 80, [0, 16, 0]], exposure: 1.2 };
  },
  // Dimensão do Pecado (5) — caverna monocromática de raízes com olhos, uma boca colossal ao fundo e moedas sobre a rocha.
  root(THREE, g, spec, ctx) {
    const r = rng(505), R = spec.radius;
    const floorTex = canvasTex(THREE, 1024, 1024, (c, w, h) => {
      c.fillStyle = '#08080a'; c.fillRect(0, 0, w, h); const rr = rng(21);
      for (let i = 0; i < 700; i++) { c.fillStyle = 'rgba(' + (24 + rr() * 30) + ',' + (24 + rr() * 30) + ',' + (28 + rr() * 30) + ',' + (.3 + rr() * .4) + ')'; c.fillRect(rr() * w, rr() * h, 6 + rr() * 30, 6 + rr() * 22); }
      c.strokeStyle = 'rgba(210,210,225,.55)'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2, h); c.bezierCurveTo(w * .2, h * .75, w * .8, h * .55, w / 2, h * .1); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = 'rgba(190,24,30,.6)'; c.lineWidth = 3; for (let i = 0; i < 40; i++) { let x = rr() * w, y = rr() * h, a2 = rr() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 8; k++) { a2 += (rr() - .5) * .9; x += Math.cos(a2) * 40; y += Math.sin(a2) * 40; c.lineTo(x, y); } c.stroke(); }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 72), new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0x707078, emissiveIntensity: .35, roughness: .6, metalness: .2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 1.6, .14, 6, 96), new THREE.MeshBasicMaterial({ color: 0xc0302a, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = .06; g.add(rim);
    // Espinhos de rocha e moedas.
    const spikes = [], coins = [];
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = R + 2 + r() * 22, h = 3 + r() * 10; spikes.push({ x: Math.cos(a) * d, y: h / 2, z: Math.sin(a) * d, sx: .8 + r() * 1.6, sy: h, sz: .8 + r() * 1.6, rx: (r() - .5) * .3, rz: (r() - .5) * .3 }); }
    for (let i = 0; i < 140; i++) { const a = r() * 6.28, d = r() * (R + 2); coins.push({ x: Math.cos(a) * d, y: .05, z: Math.sin(a) * d, ry: r() * 3, s: .5 }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 5), new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .9, emissive: 0x18181e, emissiveIntensity: .8 }), spikes));
    g.add(instanced(THREE, new THREE.CylinderGeometry(.5, .5, .08, 10), new THREE.MeshStandardMaterial({ color: 0xd8a830, emissive: 0x6a4a10, emissiveIntensity: 1, metalness: .85, roughness: .3 }), coins));
    // Raízes colossais em arco.
    const rootMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: .85, emissive: 0x202026, emissiveIntensity: .9 });
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + r() * .3, d = R + 6 + r() * 8, pts = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6, rad = d * (1 - t * .45) + Math.sin(t * 9 + i) * 2; pts.push(new THREE.Vector3(Math.cos(a + t * .9) * rad, Math.sin(t * Math.PI * .5) * (16 + (i % 3) * 5), Math.sin(a + t * .9) * rad)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 1.6 - 0.04 * i, 7, false), rootMat); g.add(tube);
    }
    // Boca colossal ao fundo, com dentes voltados para dentro.
    const mawZ = -R - 34, maw = new THREE.Mesh(new THREE.TorusGeometry(16, 3.2, 8, 36), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: .8, emissive: 0x2a2a30, emissiveIntensity: .9 })); maw.position.set(0, 22, mawZ); g.add(maw);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); inner.position.set(0, 22, mawZ - .5); g.add(inner);
    const teeth = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; teeth.push({ x: Math.cos(a) * 13.5, y: 22 + Math.sin(a) * 13.5, z: mawZ + 1, rz: a - Math.PI / 2 + Math.PI, sx: .9, sy: 4.5, sz: .9 }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 5), new THREE.MeshStandardMaterial({ color: 0xcfcfd6, roughness: .6, emissive: 0x404048, emissiveIntensity: .8 }), teeth));
    const eyes = eyeField(THREE, { count: 260, seed: 9, tex: eyeTexture(THREE, { sclera: ['#707078', '#e8e8ee'], iris: '#c0141e', ring: '#100204' }), tint: [1, .95, .95],
      place: (i, rr) => { const a = rr() * 6.28, el = (rr() - .2) * 1.6, d = 40 + rr() * 90; return { x: Math.cos(a) * Math.cos(el) * d, y: 8 + Math.sin(el) * d * .6, z: Math.sin(a) * Math.cos(el) * d, size: 2 + rr() * rr() * 12 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xffd8d0, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, map: canvasTex(THREE, 128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }) }));
    glow.position.set(0, 14, mawZ - 6); g.add(glow);
    ctx.tick.push((t) => { rim.material.color.setHSL(0, .75, .38 + .1 * Math.sin(t * 3)); glow.material.opacity = .42 + Math.sin(t * 1.5) * .12; maw.scale.setScalar(1 + Math.sin(t * .8) * .015); });
    return { bg: 0x030304, fog: 0x070708, fogNear: 22, fogFar: 160, hemi: [0xc0c0d0, 0x1a0a0a, .9], sun: [0xffd8d0, .55], light: [0xff6a5a, 3.2, 95, [0, 14, 0]], exposure: 1.2 };
  },
  // MOD 203 — Reino Celestial (prólogo): mar de nuvens, caminho de luz entre colunas, feixes do alto e poeira dourada.
  // O trono, a figura de luz e os anjos (GLB) são acrescentados pelo mundo depois de carregados.
  heaven(THREE, g, spec, ctx) {
    const r = rng(909);
    const cloudTex = canvasTex(THREE, 512, 512, (c, w, h) => {
      c.fillStyle = '#efe2c4'; c.fillRect(0, 0, w, h); const rr = rng(4);
      for (let i = 0; i < 900; i++) { const x = rr() * w, y = rr() * h, rad = 10 + rr() * 60; const gr = c.createRadialGradient(x, y, 0, x, y, rad); const a = .05 + rr() * .12; gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      for (let i = 0; i < 160; i++) { const x = rr() * w, y = rr() * h, rad = 20 + rr() * 50; const gr = c.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(214,180,120,.10)'); gr.addColorStop(1, 'rgba(214,180,120,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    }, { repeat: 6 });
    // Céu em degradê: azul suave no alto, dourado no horizonte (dá profundidade e contraste ao branco do mármore).
    const sky = new THREE.Mesh(new THREE.SphereGeometry(210, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new THREE.Color(0x6f98cf) }, uMid: { value: new THREE.Color(0xc9d6e6) }, uLow: { value: new THREE.Color(0xf3d9a2) } },
      vertexShader: 'varying float vY;void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uLow;varying float vY;void main(){vec3 c=mix(uLow,uMid,smoothstep(.02,.28,vY));c=mix(c,uTop,smoothstep(.28,.85,vY));gl_FragColor=vec4(c,1.);}' }));
    sky.renderOrder = -1; g.add(sky);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshBasicMaterial({ map: cloudTex, fog: true }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -1.2; g.add(sea);
    // Caminho de luz até o trono.
    const pathTex = canvasTex(THREE, 256, 1024, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d9b45e'); gr.addColorStop(.08, '#fbf3e0'); gr.addColorStop(.92, '#fbf3e0'); gr.addColorStop(1, '#d9b45e');
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(200,150,60,.55)'; c.lineWidth = 3;
      for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(20, y); c.lineTo(w - 20, y); c.stroke(); c.beginPath(); c.arc(w / 2, y + 32, 14, 0, 6.3); c.stroke(); }
    });
    pathTex.wrapT = THREE.RepeatWrapping; pathTex.repeat.set(1, 6);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 90), new THREE.MeshStandardMaterial({ map: pathTex, emissiveMap: pathTex, emissive: 0xffe9b0, emissiveIntensity: .35, roughness: .35, metalness: .15 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0, -10); path.receiveShadow = true; g.add(path);
    // Colunas de mármore com capitéis dourados, perdendo-se na luz.
    const cols = [], caps = [], bases = [];
    for (let k = 0; k < 9; k++) for (const sx of [-1, 1]) { const z = 28 - k * 8.5, x = sx * 9.5; cols.push({ x, y: 13, z, sx: 1, sy: 1, sz: 1 }); caps.push({ x, y: 25.3, z, s: 1 }); bases.push({ x, y: .6, z, s: 1 }); }
    const marble = new THREE.MeshStandardMaterial({ color: 0xf2ebdc, roughness: .45, emissive: 0xfff3dc, emissiveIntensity: .1 });
    const goldM = new THREE.MeshStandardMaterial({ color: 0xe0b45a, metalness: .85, roughness: .3, emissive: 0x6a4a10, emissiveIntensity: .6 });
    g.add(instanced(THREE, new THREE.CylinderGeometry(.9, 1.05, 26, 16), marble, cols));
    g.add(instanced(THREE, new THREE.CylinderGeometry(1.7, 1.3, 1.4, 16), goldM, caps));
    g.add(instanced(THREE, new THREE.CylinderGeometry(1.5, 1.6, 1.2, 16), goldM, bases));
    // Feixes de luz do alto.
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const beams = [];
    for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(2 + r() * 2, 6 + r() * 4, 90, 18, 1, true), beamMat); b.position.set((r() - .5) * 40, 40, 20 - k * 12 - r() * 6); b.rotation.z = (r() - .5) * .3; g.add(b); beams.push(b); }
    const throneBeam = new THREE.Mesh(new THREE.CylinderGeometry(6, 16, 120, 24, 1, true), beamMat.clone()); throneBeam.material.opacity = .2; throneBeam.position.set(0, 55, -50); g.add(throneBeam);
    // Nuvens soltas e poeira dourada (pontos com textura suave: 1 chamada de desenho cada).
    const soft = canvasTex(THREE, 128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const puffs = eyeField(THREE, { count: 260, seed: 3, tex: soft, tint: [1, .97, .9], place: (i, rr) => { const a = rr() * 6.28, d = 14 + rr() * 120; return { x: Math.cos(a) * d, y: -3 + rr() * 9, z: Math.sin(a) * d - 10, size: 18 + rr() * 34 }; } });
    // Nuvens brancas que variam na transparência (o brilho variável dos olhos as deixava cinzentas sobre o céu claro).
    puffs.material.fragmentShader = puffs.material.fragmentShader.replace('vec2 uv=vec2(gl_PointCoord.x,(gl_PointCoord.y-.5)/vBlink+.5);', 'vec2 uv=gl_PointCoord;').replace('gl_FragColor=vec4(t.rgb*uTint*vA,t.a);', 'gl_FragColor=vec4(t.rgb*uTint,t.a*(.45+.4*vA));');
    g.add(puffs); ctx.eyes.push(puffs);
    const dust = eyeField(THREE, { count: 420, seed: 5, tex: soft, tint: [1.4, 1.15, .7], place: (i, rr) => ({ x: (rr() - .5) * 60, y: rr() * 30, z: 30 - rr() * 90, size: .25 + rr() * .5 }) });
    dust.material.blending = THREE.AdditiveBlending;
    dust.material.fragmentShader = EYE_FRAG.replace('vec2 uv=vec2(gl_PointCoord.x,(gl_PointCoord.y-.5)/vBlink+.5);', 'vec2 uv=gl_PointCoord;');
    g.add(dust); ctx.eyes.push(dust);
    ctx.tick.push((t) => { dust.position.y = (t * .6) % 6; for (const b of beams) b.material.opacity = .1 + Math.sin(t * .7 + b.position.z) * .03; throneBeam.material.opacity = .18 + Math.sin(t * .9) * .04; });
    return { bg: 0xf3d9a2, fog: 0xf0dcae, fogNear: 40, fogFar: 260, hemi: [0xfff6e6, 0xc9a86a, 1.2], sun: [0xffe8c0, 1.5], light: [0xffe2a0, 2.6, 140, [0, 22, -46]], exposure: .9 };
  },
  // MOD 204 — Esgoto do Ato I (layout em sewer3d.js): túnel abobadado com canal de água e gotas, rastros de sangue,
  // a sala dos Seguidores com o buraco, a cela mais abaixo, os dois caminhos e o "lugar estranho" com o portal de Valério.
  sewer(THREE, g, spec, ctx) {
    const L = SEWER, r = rng(404), refs = ctx.refs;
    const brick = canvasTex(THREE, 256, 256, (c, w, h) => {
      c.fillStyle = '#2b2a24'; c.fillRect(0, 0, w, h); const rr = rng(7);
      for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) {
        const v = 52 + rr() * 30 | 0; c.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 14) + ')'; c.fillRect(x + 2, y + 2, 60, 28);
        if (rr() < .35) { c.fillStyle = 'rgba(40,70,30,' + (.2 + rr() * .35) + ')'; c.fillRect(x + 2, y + 18 + rr() * 8, 60, 12); }
      }
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,50,20,.45)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
    const stoneTex = canvasTex(THREE, 256, 256, (c, w, h) => {
      c.fillStyle = '#3a372f'; c.fillRect(0, 0, w, h); const rr = rng(9);
      for (let i = 0; i < 70; i++) { const x = rr() * w, y = rr() * h, s = 18 + rr() * 40; const v = 48 + rr() * 26 | 0; c.fillStyle = 'rgb(' + v + ',' + (v - 3) + ',' + (v - 10) + ')'; c.beginPath(); c.ellipse(x, y, s, s * .7, rr() * 3, 0, 6.3); c.fill(); }
      for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(20,35,16,' + (.15 + rr() * .3) + ')'; c.beginPath(); c.arc(rr() * w, rr() * h, 6 + rr() * 22, 0, 6.3); c.fill(); }
    });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: .9, side: THREE.BackSide, color: 0xbab3a0 });
    const floorMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .55, metalness: .05, color: 0xa8a090 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1c2a18, roughness: .08, metalness: .3, transparent: true, opacity: .82, emissive: 0x081208, emissiveIntensity: .6 });
    const bloodTex = canvasTex(THREE, 128, 128, (c, w, h) => { const rr = rng(23); for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(' + (70 + rr() * 30 | 0) + ',6,8,' + (.55 + rr() * .4) + ')'; c.beginPath(); c.ellipse(20 + rr() * 88, 20 + rr() * 88, 6 + rr() * 22, 3 + rr() * 10, rr() * 3, 0, 6.3); c.fill(); } });
    const bloodMat = new THREE.MeshBasicMaterial({ map: bloodTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0xffffff });
    const dirOf = s => Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z), lenOf = s => Math.hypot(s.to.x - s.from.x, s.to.z - s.from.z);
    // Túnel/corredor abobadado entre dois pontos.
    function corridor(seg, wallR, h, water) {
      const len = lenOf(seg), yaw = dirOf(seg), mx = (seg.from.x + seg.to.x) / 2, mz = (seg.from.z + seg.to.z) / 2;
      const grp = new THREE.Group(); grp.position.set(mx, 0, mz); grp.rotation.y = yaw; g.add(grp);
      const fm = floorMat.clone(); fm.map = stoneTex.clone(); fm.map.repeat.set(wallR * .5, len / 4); fm.map.needsUpdate = true;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(wallR * 2, len), fm); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; grp.add(floor);
      const wm = wallMat.clone(); wm.map = brick.clone(); wm.map.repeat.set(len / 3, 2); wm.map.needsUpdate = true;
      const vg = new THREE.CylinderGeometry(wallR, wallR, len, 18, 1, true, Math.PI / 2, Math.PI); vg.rotateX(Math.PI / 2); vg.scale(1, h / wallR, 1);
      grp.add(new THREE.Mesh(vg, wm));
      if (water) {
        const ch = new THREE.Mesh(new THREE.PlaneGeometry(1.1, len), waterMat); ch.rotation.x = -Math.PI / 2; ch.position.set(wallR - .8, .03, 0); grp.add(ch);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, len), floorMat); lip.position.set(wallR - 1.43, .06, 0); grp.add(lip);
        ctx.tick.push(t => { waterMat.emissiveIntensity = .5 + Math.sin(t * 1.3) * .1; });
      }
      return grp;
    }
    // Sala circular com parede, cúpula e chão.
    // Sala circular com parede (com vãos onde chegam os corredores), cúpula e chão. Ângulo 0 = +z, π/2 = +x.
    function room(c, h, gaps) {
      const fm = floorMat.clone(); fm.map = stoneTex.clone(); fm.map.repeat.set(c.r / 3, c.r / 3); fm.map.needsUpdate = true;
      const floor = new THREE.Mesh(new THREE.CircleGeometry(c.r + .4, 40), fm); floor.rotation.x = -Math.PI / 2; floor.position.set(c.x, 0, c.z); floor.receiveShadow = true; g.add(floor);
      const wm = wallMat.clone(); wm.map = brick.clone(); wm.map.repeat.set(c.r * 1.2, h / 2.2); wm.map.needsUpdate = true;
      const R = c.r + .4, cuts = gaps.map(a => ({ a, w: Math.asin(Math.min(.95, 3.2 / R)) })).sort((p, q) => p.a - q.a);
      for (let i = 0; i < cuts.length; i++) {
        const a0 = cuts[i].a + cuts[i].w, a1 = (i + 1 < cuts.length ? cuts[i + 1].a - cuts[i + 1].w : cuts[0].a - cuts[0].w + Math.PI * 2);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 32, 1, true, a0, a1 - a0), wm); wall.position.set(c.x, h / 2, c.z); g.add(wall);
      }
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), wm); dome.scale.y = .45; dome.position.set(c.x, h, c.z); g.add(dome);
    }
    corridor(L.tunnel, L.tunnel.r + .5, 4.6, true);
    room(L.feeding, 5.2, [0]); room(L.cell, 5, [Math.PI / 2, Math.PI]); corridor(L.emptyPath, L.emptyPath.r + .6, 4.2, false); corridor(L.hordePath, L.hordePath.r + .6, 4.2, false);
    // Rastros de sangue do túnel até a sala.
    for (let i = 0; i < 16; i++) { const t = i / 15, z = L.tunnel.from.z - 4 + (L.feeding.z + 4 - L.tunnel.from.z + 4) * t; const b = new THREE.Mesh(new THREE.PlaneGeometry(1 + r() * .8, 1.4 + r()), bloodMat); b.rotation.set(-Math.PI / 2, 0, r() * 6); b.position.set(-.6 + Math.sin(i * 1.7) * .6, .02, z); g.add(b); }
    // A "presa" dos Seguidores: um monte escuro coberto (sem detalhe gráfico).
    const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshStandardMaterial({ color: 0x2a0d0c, roughness: .7 })); lump.scale.set(1.3, .45, .9); lump.position.set(L.carcass.x, .2, L.carcass.z); g.add(lump);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), bloodMat); pool.rotation.x = -Math.PI / 2; pool.position.set(L.carcass.x, .015, L.carcass.z); g.add(pool);
    // O buraco: disco negro com borda de pedras quebradas.
    const hole = new THREE.Mesh(new THREE.CircleGeometry(L.hole.r, 28), new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: -3 })); hole.rotation.x = -Math.PI / 2; hole.position.set(L.hole.x, .03, L.hole.z); g.add(hole);
    const rubble = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; rubble.push({ x: L.hole.x + Math.cos(a) * (L.hole.r + .3), y: .12, z: L.hole.z + Math.sin(a) * (L.hole.r + .3), s: .2 + r() * .25, ry: r() * 3 }); }
    g.add(instanced(THREE, new THREE.DodecahedronGeometry(1, 0), floorMat, rubble));
    refs.hole = { x: L.hole.x, z: L.hole.z };
    // A cela: jaula de barras no meio da sala de baixo.
    const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: .6, roughness: .45 });
    const bars = []; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; bars.push({ x: L.cage.x + Math.cos(a) * 1.5, y: 1.3, z: L.cage.z + Math.sin(a) * 1.5, sx: 1, sy: 1, sz: 1 }); }
    const cageBars = instanced(THREE, new THREE.CylinderGeometry(.05, .05, 2.6, 6), iron, bars); g.add(cageBars);
    const cageTop = new THREE.Mesh(new THREE.TorusGeometry(1.5, .07, 6, 24), iron); cageTop.rotation.x = Math.PI / 2; cageTop.position.set(L.cage.x, 2.6, L.cage.z); g.add(cageTop);
    refs.cage = { bars: cageBars, top: cageTop };
    // Musgo e poças nas salas.
    for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(.6 + r() * 1.2, 14), waterMat); p.rotation.x = -Math.PI / 2; const room2 = i < 5 ? L.feeding : L.cell, a = r() * 6.28, d = r() * (room2.r - 2); p.position.set(room2.x + Math.cos(a) * d, .02, room2.z + Math.sin(a) * d); g.add(p); }
    // Gotas caindo do teto (uma chamada de desenho).
    const N = 60, dp = new Float32Array(N * 3), dv = [];
    for (let i = 0; i < N; i++) { const onT = i < 40, z = onT ? L.tunnel.to.z + r() * (L.tunnel.from.z - L.tunnel.to.z) : L.feeding.z + (r() - .5) * 12, x = onT ? (r() - .5) * 3.6 : (r() - .5) * 12; dp[i * 3] = x; dp[i * 3 + 1] = r() * 4; dp[i * 3 + 2] = z; dv.push(2.5 + r() * 2); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dropTex = canvasTex(THREE, 32, 32, (c, w, h) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(220,235,220,1)'); gr.addColorStop(1, 'rgba(220,235,220,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const drips = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9fb4a0, size: .045, map: dropTex, transparent: true, opacity: .75, depthWrite: false })); drips.frustumCulled = false; g.add(drips);
    ctx.tick.push((t, dt) => { const a = dg.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] - dv[i] * dt; if (y < 0) y = 4.2; a.array[i * 3 + 1] = y; } a.needsUpdate = true; });
    // Lamparinas esverdeadas nas paredes (só brilho, sem luz extra).
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xc9e08a, toneMapped: false });
    const lamps = []; for (let i = 0; i < 7; i++) lamps.push({ x: (i % 2 ? -1 : 1) * (L.tunnel.r + .35), y: 2.4, z: L.tunnel.from.z - 3 - i * 5, s: .14 });
    for (const c of [L.cell, L.feeding]) for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + .3; lamps.push({ x: c.x + Math.cos(a) * (c.r + .1), y: 2.6, z: c.z + Math.sin(a) * (c.r + .1), s: .14 }); }
    for (let i = 0; i < 6; i++) lamps.push({ x: L.emptyPath.from.x + (i % 2 ? -1 : 1) * (L.emptyPath.r + .4), y: 2.3, z: L.emptyPath.from.z - 2 - i * 4.5, s: .13 });
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 8, 6), lampMat, lamps));
    // O "lugar estranho": caverna vermelha e roxa, pedras flutuando, olhos e o portal de Valério ao fundo.
    const S2 = L.strange;
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x1a0c14, roughness: .95, side: THREE.BackSide, emissive: 0x1a0410, emissiveIntensity: .7 });
    const cave = new THREE.Mesh(new THREE.SphereGeometry(S2.r + 3, 30, 16), caveMat); cave.scale.set(1, .55, 1.25); cave.position.set(S2.x, 0, S2.z - 2); g.add(cave);
    const cf = new THREE.Mesh(new THREE.CircleGeometry(S2.r + 2, 40), new THREE.MeshStandardMaterial({ color: 0x2a1820, roughness: .8, map: stoneTex })); cf.rotation.x = -Math.PI / 2; cf.position.set(S2.x, .01, S2.z); g.add(cf);
    const floating = []; for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = 6 + r() * (S2.r - 2); floating.push({ x: S2.x + Math.cos(a) * d, y: 3 + r() * 6, z: S2.z + Math.sin(a) * d, s: .3 + r() * .9, ry: r() * 3 }); }
    const rocks = instanced(THREE, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x241820, roughness: .9, emissive: 0x200810, emissiveIntensity: .5 }), floating); g.add(rocks);
    ctx.tick.push(t => { rocks.position.y = Math.sin(t * .6) * .35; });
    const eyes = eyeField(THREE, { count: 40, seed: 31, tex: eyeTexture(THREE), tint: [1, .8, .8], place: (i, rr) => { const a = rr() * 6.28; return { x: S2.x + Math.cos(a) * (S2.r + 1), y: 1.5 + rr() * 6, z: S2.z - 2 + Math.sin(a) * (S2.r + 2) * 1.2, size: .8 + rr() * 1.6 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    // Portal de Valério: arco de moedas douradas e redemoinho carmim.
    const P = L.portal, pg = new THREE.Group(); pg.position.set(P.x, 0, P.z); g.add(pg);
    const goldM = new THREE.MeshStandardMaterial({ color: 0xc9962e, metalness: .85, roughness: .35, emissive: 0x4a2a06, emissiveIntensity: .8 });
    const coins = []; for (let i = 0; i < 46; i++) { const a = Math.PI * (i / 45); coins.push({ x: Math.cos(a) * 3.4, y: 3.6 + Math.sin(a) * 3.4 * 1.15 - (i % 2) * .1, z: 0, rx: Math.PI / 2, s: .42 }); }
    pg.add(instanced(THREE, new THREE.CylinderGeometry(1, 1, .14, 14), goldM, coins));
    for (const sx of [-1, 1]) { const pil = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 3.6, 10), goldM); pil.position.set(sx * 3.4, 1.8, 0); pg.add(pil); }
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(3.1, 40), swirlMaterial(THREE, '#200206', '#e8b040')); swirl.scale.set(1, 1.35, 1); swirl.position.set(0, 3.7, .05); pg.add(swirl); ctx.swirls.push(swirl.material);
    refs.portal = pg;
    return { bg: 0x070907, fog: 0x0e130d, fogNear: 10, fogFar: 60, hemi: [0xa8b89c, 0x3a2e22, 1.35], sun: [0xc0d0b0, .45], light: [0xd8e0a0, 3.6, 32, [0, 3, 0]], exposure: 1.3, lightFollow: true };
  },
  // MOD 205 — Interior do vulcão falso (Ato II; layout em volcano3d.js): rocha basáltica com veios incandescentes,
  // caveiras e ossos, o laboratório, a porta medonha, a sala do ouro, a galeria e a sala secreta do trono.
  volcano(THREE, g, spec, ctx) {
    const V = VOLCANO, r = rng(505), refs = ctx.refs;
    const rockTex = canvasTex(THREE, 256, 256, (c, w, h) => {
      c.fillStyle = '#1c1714'; c.fillRect(0, 0, w, h); const rr = rng(13);
      for (let i = 0; i < 90; i++) { const v = 28 + rr() * 26 | 0; c.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 7) + ')'; c.beginPath(); c.ellipse(rr() * w, rr() * h, 10 + rr() * 30, 6 + rr() * 18, rr() * 3, 0, 6.3); c.fill(); }
    });
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
    const veinTex = canvasTex(THREE, 256, 256, (c, w, h) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const rr = rng(29); c.lineCap = 'round';
      for (let i = 0; i < 14; i++) { let x = rr() * w, y = rr() * h; c.strokeStyle = 'rgba(255,' + (70 + rr() * 60 | 0) + ',20,' + (.5 + rr() * .5) + ')'; c.lineWidth = 1 + rr() * 2.5; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rr() - .5) * 60; y += (rr() - .5) * 60; c.lineTo(x, y); } c.stroke(); }
    });
    veinTex.wrapS = veinTex.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshStandardMaterial({ map: rockTex, emissiveMap: veinTex, emissive: 0xff4a10, emissiveIntensity: .9, roughness: .95, side: THREE.BackSide });
    const floorMat = new THREE.MeshStandardMaterial({ map: rockTex, emissiveMap: veinTex, emissive: 0xff5a18, emissiveIntensity: .7, roughness: .8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: .7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: .65, roughness: .45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd8a032, metalness: .9, roughness: .3, emissive: 0x5a3008, emissiveIntensity: .7 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x6a5e4c, roughness: .95 });
    const tex = (m, rx, ry) => { const c = m.clone(); c.map = m.map.clone(); c.map.repeat.set(rx, ry); c.map.needsUpdate = true; if (m.emissiveMap) { c.emissiveMap = m.emissiveMap.clone(); c.emissiveMap.repeat.set(rx, ry); c.emissiveMap.needsUpdate = true; } return c; };
    function corridor(seg, R, h) {
      const len = Math.hypot(seg.to.x - seg.from.x, seg.to.z - seg.from.z), grp = new THREE.Group();
      grp.position.set((seg.from.x + seg.to.x) / 2, 0, (seg.from.z + seg.to.z) / 2); grp.rotation.y = Math.atan2(seg.to.x - seg.from.x, seg.to.z - seg.from.z); g.add(grp);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, len), tex(floorMat, R * .5, len / 5)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; grp.add(floor);
      const vg = new THREE.CylinderGeometry(R, R, len, 16, 1, true, Math.PI / 2, Math.PI); vg.rotateX(Math.PI / 2); vg.scale(1, h / R, 1);
      grp.add(new THREE.Mesh(vg, tex(wallMat, len / 4, 2)));
    }
    function room(c, h, gaps) {
      const R = c.r + .4;
      const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 40), tex(floorMat, c.r / 3, c.r / 3)); floor.rotation.x = -Math.PI / 2; floor.position.set(c.x, 0, c.z); floor.receiveShadow = true; g.add(floor);
      const wm = tex(wallMat, c.r * 1.1, h / 3), cuts = gaps.map(a => ({ a, w: Math.asin(Math.min(.95, 3.3 / R)) })).sort((p, q) => p.a - q.a);
      for (let i = 0; i < cuts.length; i++) {
        const a0 = cuts[i].a + cuts[i].w, a1 = i + 1 < cuts.length ? cuts[i + 1].a - cuts[i + 1].w : cuts[0].a - cuts[0].w + Math.PI * 2;
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.08, h, 36, 1, true, a0, a1 - a0), wm); wall.position.set(c.x, h / 2, c.z); g.add(wall);
      }
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), wm); dome.scale.y = .5; dome.position.set(c.x, h, c.z); g.add(dome);
    }
    corridor(V.tunnel, V.tunnel.r + .6, 5); corridor(V.goldPath, V.goldPath.r + .6, 4); corridor(V.deepPath, V.deepPath.r + .6, 4.6); corridor(V.thronePath, V.thronePath.r + .6, 5);
    room(V.lab, 5.4, [0, -Math.PI / 2, Math.PI]); room(V.gold, 4.6, [Math.PI / 2]); room(V.hall, 6, [0, Math.PI]); room(V.throne, 9, [0]);
    // Caveiras e ossos pelo chão do túnel e das salas.
    const skulls = [], bones = [];
    for (let i = 0; i < 46; i++) {
      const inT = i < 26, z = inT ? V.tunnel.to.z + r() * (V.tunnel.from.z - V.tunnel.to.z) : V.hall.z + (r() - .5) * 18, x = inT ? (r() - .5) * 4.6 : (r() - .5) * 18;
      if (i % 2) skulls.push({ x, y: .14, z, s: .16 + r() * .05, ry: r() * 6 }); else bones.push({ x, y: .05, z, rz: Math.PI / 2, ry: r() * 6, s: .8 + r() * .5 });
    }
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 9, 7), boneMat, skulls)); g.add(instanced(THREE, new THREE.CylinderGeometry(.04, .05, .7, 6), boneMat, bones));
    // Laboratório: mesas com corpos sob panos, correntes nas paredes, roda e lâminas (sem sangue explícito).
    const L = V.lab, tables = [], shrouds = [], links = [];
    for (let i = 0; i < 5; i++) { const a = -2.4 + i * 1.2, x = L.x + Math.sin(a) * 6.6, z = L.z + Math.cos(a) * 6.6; tables.push({ x, y: .45, z, sx: 2.1, sy: .14, sz: .9, ry: a }); shrouds.push({ x, y: .66, z, sx: 1.7, sy: .28, sz: .55, ry: a }); }
    const bodies = new THREE.Group(); g.add(bodies); refs.bodies = bodies;
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), ironMat, tables)); bodies.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), clothMat, shrouds));
    for (let k = 0; k < 6; k++) { const a = .6 + k * .9, x = L.x + Math.sin(a) * (L.r + .1), z = L.z + Math.cos(a) * (L.r + .1); for (let j = 0; j < 10; j++) links.push({ x, y: 3.8 - j * .2, z, s: .1, rx: j % 2 ? Math.PI / 2 : 0, ry: a }); }
    g.add(instanced(THREE, new THREE.TorusGeometry(1, .3, 5, 10), ironMat, links));
    for (let k = 0; k < 4; k++) { const a = 1 + k * 1.5, x = L.x + Math.sin(a) * (L.r - .4), z = L.z + Math.cos(a) * (L.r - .4); const fig = new THREE.Mesh(new THREE.CapsuleGeometry(.28, 1, 4, 8), clothMat); fig.position.set(x, 1.3, z); bodies.add(fig); }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.1, .1, 6, 20), ironMat); wheel.position.set(L.x - 6, 1.4, L.z - 6); wheel.rotation.y = .7; g.add(wheel);
    // Círculo mágico da purificação (o jogo acende e gira).
    const circleTex = canvasTex(THREE, 512, 512, (c, w, h) => { c.strokeStyle = '#ffe6a0'; c.lineWidth = 8; c.beginPath(); c.arc(256, 256, 230, 0, 6.3); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(256, 256, 180, 0, 6.3); c.stroke(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, b = (i + 3) / 7 * 6.283; c.beginPath(); c.moveTo(256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180); c.lineTo(256 + Math.cos(b) * 180, 256 + Math.sin(b) * 180); c.stroke(); } c.font = 'bold 34px serif'; c.fillStyle = '#ffe6a0'; for (let i = 0; i < 12; i++) { c.save(); c.translate(256, 256); c.rotate(i / 12 * 6.283); c.fillText('✝', -10, -196); c.restore(); } });
    const circle = new THREE.Mesh(new THREE.CircleGeometry(4.4, 48), new THREE.MeshBasicMaterial({ map: circleTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    circle.rotation.x = -Math.PI / 2; circle.position.set(V.circle.x, .04, V.circle.z); g.add(circle); refs.circle = circle;
    // A porta medonha: ferro com espinhos e uma caveira; o jogo a abre com a chave.
    const door = new THREE.Group(); door.position.set(V.door.x, 0, V.door.z); door.rotation.y = Math.PI / 2; g.add(door);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.2, .35), ironMat); slab.position.y = 2.1; door.add(slab);
    const spikes = []; for (let i = 0; i < 18; i++) spikes.push({ x: -1.9 + (i % 6) * .76, y: .7 + Math.floor(i / 6) * 1.3, z: .3, rx: Math.PI / 2, s: .5 });
    door.add(instanced(THREE, new THREE.ConeGeometry(.12, .5, 6), ironMat, spikes));
    const skull = new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 8), boneMat); skull.position.set(0, 3.1, .3); door.add(skull);
    for (const ex of [-.15, .15]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3010 })); e.position.set(ex, 3.15, .68); door.add(e); }
    refs.door = door;
    // Sala do ouro: montes de moedas, barras e baús.
    const G = V.gold, coins = [], bars = [];
    for (let i = 0; i < 160; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * (G.r - 1.2), hgt = Math.max(0, 1.2 - d * .2) * r(); coins.push({ x: G.x + Math.cos(a) * d, y: .04 + hgt, z: G.z + Math.sin(a) * d, s: .2 + r() * .1, rx: r() * .6, ry: r() * 6 }); }
    for (let i = 0; i < 24; i++) bars.push({ x: G.x - 2 + (i % 6) * .45, y: .12 + Math.floor(i / 6) * .14, z: G.z + 2.6, sx: .4, sy: .12, sz: .2 });
    g.add(instanced(THREE, new THREE.CylinderGeometry(1, 1, .15, 10), goldMat, coins)); g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), goldMat, bars));
    const goldLight = new THREE.Mesh(new THREE.SphereGeometry(.01), new THREE.MeshBasicMaterial()); goldLight.position.set(G.x, 1, G.z); g.add(goldLight); refs.goldSpot = { x: G.x, z: G.z };
    // Galeria e sala do trono: colunas, braseiros, trono enorme e dois pedestais para as estátuas.
    const pillars = []; for (const c of [V.hall, V.throne]) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .2; pillars.push({ x: c.x + Math.cos(a) * (c.r - 1.6), y: 3, z: c.z + Math.sin(a) * (c.r - 1.6), sx: 1, sy: 1, sz: 1 }); }
    g.add(instanced(THREE, new THREE.CylinderGeometry(.6, .8, 6, 10), tex(floorMat, 1, 2), pillars));
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false }), braziers = [];
    for (const c of [V.hall, V.throne]) for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .8; braziers.push({ x: c.x + Math.cos(a) * (c.r - 3), y: 1.3, z: c.z + Math.sin(a) * (c.r - 3), s: .3 }); }
    g.add(instanced(THREE, new THREE.SphereGeometry(1, 8, 6), fireMat, braziers));
    const T = V.throne, S = V.seat, stoneD = new THREE.MeshStandardMaterial({ color: 0x241c1a, roughness: .7, emissive: 0x200604, emissiveIntensity: .6 });
    const tg = new THREE.Group(); tg.position.set(S.x, 0, S.z); g.add(tg);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(9 - i * 2, .5, 4 - i * .8), stoneD); st.position.set(0, .25 + i * .5, i * -.3); tg.add(st); }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.4), stoneD); seat.position.set(0, 2.3, -.4); tg.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 7, .7), stoneD); back.position.set(0, 5.5, -1.4); tg.add(back);
    for (const sx of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(.45, 3, 8), goldMat); horn.position.set(sx * 1.5, 9.4, -1.4); horn.rotation.z = -sx * .4; tg.add(horn); }
    refs.statues = [{ x: T.x - 7.5, z: T.z - 6 }, { x: T.x + 7.5, z: T.z - 6 }];
    for (const s of refs.statues) { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.2, 10), stoneD); p.position.set(s.x, .6, s.z); g.add(p); }
    refs.portal = V.portal;
    // Brasas subindo (uma chamada de desenho).
    const N = 120, ep = new Float32Array(N * 3), ev = []; for (let i = 0; i < N; i++) { const rm = [V.lab, V.hall, V.throne][i % 3]; ep[i * 3] = rm.x + (r() - .5) * rm.r * 1.6; ep[i * 3 + 1] = r() * 6; ep[i * 3 + 2] = rm.z + (r() - .5) * rm.r * 1.6; ev.push(.4 + r() * .8); }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    const ember = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xff8a30, size: .07, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); ember.frustumCulled = false; g.add(ember);
    ctx.tick.push((t, dt) => { const a = eg.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + ev[i] * dt; if (y > 6.5) y = 0; a.array[i * 3 + 1] = y; } a.needsUpdate = true; wallMat.emissiveIntensity = .8 + Math.sin(t * 1.1) * .15; });
    return { bg: 0x0b0503, fog: 0x1a0805, fogNear: 10, fogFar: 62, hemi: [0xffc0a0, 0x401408, 1.15], sun: [0xffa070, .5], light: [0xffa060, 3.6, 30, [0, 3, 0]], exposure: 1.25, lightFollow: true };
  },
  // MOD 206 — Interior da estalagem da cidade de neve (Ato III; layout em snow3d.js): salão com lareira e balcão,
  // o quarto do andar de cima e o porão de pedra. Móveis do NeveKit (balcão, cama, correntes, escada) entram pelo jogo.
  inn(THREE, g, spec, ctx) {
    const refs = ctx.refs, r = rng(606);
    const plank = canvasTex(THREE, 256, 256, (c, w, h) => { c.fillStyle = '#4a3020'; c.fillRect(0, 0, w, h); const rr = rng(3); for (let i = 0; i < 8; i++) { const v = 60 + rr() * 30 | 0; c.fillStyle = 'rgb(' + v + ',' + (v * .66 | 0) + ',' + (v * .42 | 0) + ')'; c.fillRect(0, i * 32 + 1, w, 30); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, i * 32, w, 2); for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(30,18,10,.5)'; c.beginPath(); c.ellipse(rr() * w, i * 32 + 16, 6, 3, 0, 0, 6.3); c.fill(); } } });
    plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
    const stoneT = canvasTex(THREE, 256, 256, (c, w, h) => { c.fillStyle = '#2c2a2a'; c.fillRect(0, 0, w, h); const rr = rng(9); for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { const v = 50 + rr() * 30 | 0; c.fillStyle = 'rgb(' + v + ',' + (v - 2) + ',' + (v - 4) + ')'; c.fillRect(x * 44 + (y % 2) * 22 + 2, y * 32 + 2, 40, 28); } });
    stoneT.wrapS = stoneT.wrapT = THREE.RepeatWrapping;
    const mk = (tex, rx, ry, extra) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: .9 }, extra || {})); };
    function room(R, H, wallTex, floorTex) {
      const W = R.hx * 2, D = R.hz * 2;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mk(floorTex, W / 2.5, D / 2.5)); floor.rotation.x = -Math.PI / 2; floor.position.set(R.x, 0, R.z); floor.receiveShadow = true; g.add(floor);
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mk(plank, W / 3, D / 3, { side: THREE.BackSide })); ceil.rotation.x = -Math.PI / 2; ceil.position.set(R.x, H, R.z); g.add(ceil);
      for (const [x, z, w, ry] of [[R.x, R.z - R.hz, W, 0], [R.x, R.z + R.hz, W, Math.PI], [R.x - R.hx, R.z, D, Math.PI / 2], [R.x + R.hx, R.z, D, -Math.PI / 2]]) {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, H), mk(wallTex, w / 2.5, H / 2.5)); wall.position.set(x, H / 2, z); wall.rotation.y = ry; g.add(wall);
      }
      const beams = []; for (let i = 0; i < Math.floor(W / 2); i++) beams.push({ x: R.x - R.hx + 1 + i * 2, y: H - .15, z: R.z, sx: .25, sy: .3, sz: D });
      g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), mk(plank, 1, 2), beams));
    }
    room(INN.hall, 3.6, plank, plank); room(INN.room, 3, plank, plank); room(INN.cellar, 3.2, stoneT, stoneT);
    // Lareira do salão, mesas e bancos.
    const fp = new THREE.Group(); fp.position.set(-INN.hall.hx + .5, 0, -1); g.add(fp);
    const st = new THREE.MeshStandardMaterial({ color: 0x5a5654, roughness: .95 });
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 2.4), st); hearth.position.set(0, 1.2, 0); fp.add(hearth);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1, 1.3), new THREE.MeshBasicMaterial({ color: 0x120804 })); hole.position.set(.02, .55, 0); fp.add(hole);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.3, .7, 8), new THREE.MeshBasicMaterial({ color: 0xff9a3a, toneMapped: false })); flame.position.set(.4, .45, 0); fp.add(flame);
    ctx.tick.push(t => { flame.scale.set(1 + Math.sin(t * 9) * .1, 1 + Math.sin(t * 13) * .2, 1); });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: .85 }), tables = [], benches = [];
    for (const [x, z] of [[-2.5, 1.5], [2.6, 1.6], [3, -1.2]]) { tables.push({ x, y: .75, z, sx: 1.6, sy: .1, sz: .9 }); for (const s of [-1, 1]) benches.push({ x, y: .42, z: z + s * .75, sx: 1.5, sy: .08, sz: .3 }); }
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), wood, tables)); g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), wood, benches));
    // Janela do quarto (noite lá fora) e manchas de umidade no porão.
    const night = new THREE.Mesh(new THREE.PlaneGeometry(1, .9), new THREE.MeshBasicMaterial({ color: 0x0c1830 })); night.position.set(INN.room.x - INN.room.hx + .02, 1.6, INN.room.z); night.rotation.y = Math.PI / 2; g.add(night);
    refs.hall = INN.hall; refs.room = INN.room; refs.cellar = INN.cellar;
    return { bg: 0x0a0604, fog: 0x140c08, fogNear: 6, fogFar: 26, hemi: [0xffd8a8, 0x2a1a10, 1.1], sun: [0xffc080, .25], light: [0xffb060, 3.2, 16, [0, 2.6, 0]], exposure: 1.2, lightFollow: true };
  },
  // MOD 206 — Caverna de gelo (Ato III): túnel sinuoso de paredes de gelo azulado, cristais e estalactites;
  // no fundo, um salão sem saída. O portal da dimensão distorcida aparece "atrás" (no túnel por onde se veio).
  icecave(THREE, g, spec, ctx) {
    const C = ICE_CAVE, r = rng(707), refs = ctx.refs;
    const iceTex = canvasTex(THREE, 256, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9cc8e8'); gr.addColorStop(1, '#4a7aa8'); c.fillStyle = gr; c.fillRect(0, 0, w, h); const rr = rng(5); c.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) { c.lineWidth = .5 + rr() * 2; c.beginPath(); let x = rr() * w, y = rr() * h; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rr() - .5) * 50; y += (rr() - .5) * 50; c.lineTo(x, y); } c.stroke(); } });
    iceTex.wrapS = iceTex.wrapT = THREE.RepeatWrapping;
    const wallMat = new THREE.MeshStandardMaterial({ map: iceTex, roughness: .25, metalness: .05, emissive: 0x1a3a5a, emissiveIntensity: .5, side: THREE.BackSide });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xdfeaf4, roughness: .55 });
    const tex = (m, rx, ry) => { const c = m.clone(); if (m.map) { c.map = m.map.clone(); c.map.repeat.set(rx, ry); c.map.needsUpdate = true; } return c; };
    for (let i = 0; i < C.path.length - 1; i++) {
      const a = C.path[i], b = C.path[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z) + 2, R = C.r + .5;
      const grp = new THREE.Group(); grp.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2); grp.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); g.add(grp);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, len), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; grp.add(floor);
      const vg = new THREE.CylinderGeometry(R, R, len, 18, 1, true, Math.PI / 2, Math.PI); vg.rotateX(Math.PI / 2); vg.scale(1, 1.25, 1);
      const pos = vg.attributes.position; for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setX(k, pos.getX(k) * (1 + (r() - .5) * .12)); pos.setY(k, y * (1 + (r() - .5) * .1)); } vg.computeVertexNormals();
      grp.add(new THREE.Mesh(vg, tex(wallMat, len / 4, 2)));
    }
    const E = C.end, floor = new THREE.Mesh(new THREE.CircleGeometry(E.r + .5, 40), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(E.x, 0, E.z); g.add(floor);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(E.r + .5, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), tex(wallMat, 6, 3)); dome.scale.y = .7; dome.position.set(E.x, 0, E.z); g.add(dome);
    refs.crystals = []; refs.icicles = [];
    for (let i = 0; i < 18; i++) { const seg = Math.floor(r() * (C.path.length - 1)), a = C.path[seg], b = C.path[seg + 1], t = r(), side = r() < .5 ? -1 : 1, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; refs.crystals.push({ x: a.x + dx * t + (-dz / l) * side * (C.r - .9), z: a.z + dz * t + (dx / l) * side * (C.r - .9), s: .5 + r() * .7, yaw: r() * 6 }); }
    for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 4 + r() * (E.r - 5); refs.crystals.push({ x: E.x + Math.cos(a) * d, z: E.z + Math.sin(a) * d, s: .7 + r() * .9, yaw: r() * 6 }); }
    for (let i = 0; i < 24; i++) { const seg = Math.floor(r() * (C.path.length - 1)), a = C.path[seg], b = C.path[seg + 1], t = r(); refs.icicles.push({ x: a.x + (b.x - a.x) * t + (r() - .5) * 3, z: a.z + (b.z - a.z) * t + (r() - .5) * 3, y: 4.2, s: .6 + r() * .8 }); }
    // Neve fina caindo de rachaduras no teto (uma chamada de desenho).
    const N = 160, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const seg = Math.floor(r() * (C.path.length - 1)), a = C.path[seg], b = C.path[seg + 1], t = r(); sp[i * 3] = a.x + (b.x - a.x) * t + (r() - .5) * 4; sp[i * 3 + 1] = r() * 4.5; sp[i * 3 + 2] = a.z + (b.z - a.z) * t + (r() - .5) * 4; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .05, transparent: true, opacity: .8, depthWrite: false })); snow.frustumCulled = false; g.add(snow);
    ctx.tick.push((t, dt) => { const a = sg.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] - dt * .6; if (y < 0) y = 4.5; a.array[i * 3 + 1] = y; } a.needsUpdate = true; });
    refs.portal = C.portal;
    return { bg: 0x0a1420, fog: 0x2a4a68, fogNear: 6, fogFar: 46, hemi: [0xcfe6ff, 0x34506a, 1.35], sun: [0xbad8ff, .4], light: [0x9ed0ff, 3.2, 26, [0, 3, 0]], exposure: 1.2, lightFollow: true };
  },
  // MOD 206 — Dimensão distorcida (Ato III): tudo ao contrário. Um chão de gelo espelhado sobre o vazio, montanhas
  // de cabeça para baixo penduradas no céu, neve que sobe e um horizonte girado. Os controles ficam invertidos no jogo.
  distorted(THREE, g, spec, ctx) {
    const D = DISTORTED, r = rng(808), refs = ctx.refs;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(D.floor.r, 64), new THREE.MeshStandardMaterial({ color: 0x9ab4d0, roughness: .15, metalness: .4, emissive: 0x10203a, emissiveIntensity: .6 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(D.floor.r, .3, 8, 64), new THREE.MeshBasicMaterial({ color: 0x8ad0ff, toneMapped: false })); rim.rotation.x = Math.PI / 2; g.add(rim);
    const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(3 + i * 3.6, 3.15 + i * 3.6, 64), new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: .35, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.y = .02; g.add(m); rings.push(m); }
    // Montanhas e pinheiros de cabeça para baixo no céu.
    const rock = new THREE.MeshStandardMaterial({ color: 0x4a5a6c, roughness: .9, flatShading: true }), peaks = [], pines = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + r() * .3, d = 30 + r() * 18, h = 10 + r() * 16; peaks.push({ x: Math.cos(a) * d, y: 26 + h / 2, z: Math.sin(a) * d, sx: 6 + r() * 6, sy: h, sz: 6 + r() * 6, rx: Math.PI }); }
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 24 + r() * 14; pines.push({ x: Math.cos(a) * d, y: 20 + r() * 4, z: Math.sin(a) * d, sx: 1.4, sy: 4 + r() * 3, sz: 1.4, rx: Math.PI }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 7), rock, peaks)); g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: .9 }), pines));
    // Neve que sobe (ao contrário).
    const N = 220, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = r() * 6.28, d = r() * D.floor.r; sp[i * 3] = Math.cos(a) * d; sp[i * 3 + 1] = r() * 14; sp[i * 3 + 2] = Math.sin(a) * d; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfefff, size: .08, transparent: true, opacity: .85, depthWrite: false })); snow.frustumCulled = false; g.add(snow);
    // Cristais flutuando de ponta-cabeça em volta.
    const ice = new THREE.MeshStandardMaterial({ color: 0xa8d8ff, roughness: .1, emissive: 0x2a6aa8, emissiveIntensity: .6, transparent: true, opacity: .85 }), shards = [];
    for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = D.floor.r - 2 + r() * 6; shards.push({ x: Math.cos(a) * d, y: 3 + r() * 6, z: Math.sin(a) * d, sx: .6, sy: 2 + r() * 2, sz: .6, rx: Math.PI, ry: r() * 3 }); }
    const shardMesh = instanced(THREE, new THREE.OctahedronGeometry(1, 0), ice, shards); g.add(shardMesh);
    ctx.tick.push((t, dt) => { const a = sg.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + dt * .9; if (y > 14) y = 0; a.array[i * 3 + 1] = y; } a.needsUpdate = true; rings.forEach((m, i) => { m.rotation.z = t * (i % 2 ? .15 : -.12); }); shardMesh.position.y = Math.sin(t * .6) * .6; });
    refs.portal = D.portal;
    return { bg: 0x0c1830, fog: 0x2a3a5a, fogNear: 18, fogFar: 80, hemi: [0xc8dcff, 0x3a2a4a, 1.3], sun: [0xbad0ff, .5], light: [0x9ac8ff, 3, 30, [0, 4, 0]], exposure: 1.25, lightFollow: true };
  },
  // MOD 207 — Um piso da torre de VÉRAXION (Ato IV): salão redondo de pedra negra, colunas com anéis de luz branca,
  // janelas altas para o céu e um estrado no centro onde surge o portal para o próximo piso. A cor muda a cada piso.
  tower(THREE, g, spec, ctx) {
    const T = TOWER_HALL, r = rng(909), refs = ctx.refs;
    const tile = canvasTex(THREE, 256, 256, (c, w, h) => { c.fillStyle = '#1c1c22'; c.fillRect(0, 0, w, h); const rr = rng(4); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 34 + rr() * 22 | 0; c.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 6) + ')'; c.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(7, 7);
    const floorMat = new THREE.MeshStandardMaterial({ map: tile, roughness: .55, metalness: .1, color: 0x9a98b0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(T.r, 48), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor); refs.floorMat = floorMat;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x24242c, roughness: .9, side: THREE.BackSide }); refs.wallMat = wallMat;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(T.r + .3, T.r + .3, 11, 8, 1, true), wallMat); wall.position.y = 5.5; g.add(wall);
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(T.r + .3, 8), new THREE.MeshStandardMaterial({ color: 0x141418, side: THREE.BackSide })); ceil.rotation.x = -Math.PI / 2; ceil.position.y = 11; g.add(ceil);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xeef2ff, toneMapped: false }), stone = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: .85 });
    const cols = [], rings = [], wins = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; cols.push({ x: Math.cos(a) * (T.r - 1.2), y: 5.5, z: Math.sin(a) * (T.r - 1.2), sx: 1, sy: 11, sz: 1 }); for (let j = 0; j < 3; j++) rings.push({ x: Math.cos(a) * (T.r - 1.2), y: 2 + j * 3.2, z: Math.sin(a) * (T.r - 1.2), rx: Math.PI / 2, s: .75 });
      const b = k / 8 * Math.PI * 2; wins.push({ x: Math.cos(b) * (T.r + .2), y: 6, z: Math.sin(b) * (T.r + .2), ry: -b + Math.PI / 2, sx: 1.4, sy: 4, sz: .1 }); }
    g.add(instanced(THREE, new THREE.CylinderGeometry(.5, .6, 1, 8), stone, cols)); g.add(instanced(THREE, new THREE.TorusGeometry(.62, .05, 6, 20), ringMat, rings));
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x8a9ad8, toneMapped: false }), wins));
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, .4, 8), stone); dais.position.set(T.center.x, .2, T.center.z); g.add(dais);
    const sigil = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: THREE.DoubleSide, toneMapped: false })); sigil.rotation.x = -Math.PI / 2; sigil.position.set(T.center.x, .42, T.center.z); g.add(sigil); refs.sigil = sigil;
    // Poeira subindo devagar (uma chamada de desenho).
    const N = 120, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = r() * 6.28, d = r() * (T.r - 1); sp[i * 3] = Math.cos(a) * d; sp[i * 3 + 1] = r() * 10; sp[i * 3 + 2] = Math.sin(a) * d; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const dust = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe4ff, size: .05, transparent: true, opacity: .6, depthWrite: false })); dust.frustumCulled = false; g.add(dust);
    ctx.tick.push((t, dt) => { const a = sg.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + dt * .25; if (y > 10) y = 0; a.array[i * 3 + 1] = y; } a.needsUpdate = true; sigil.rotation.z = t * .2; });
    return { bg: 0x08080c, fog: 0x14141c, fogNear: 10, fogFar: 40, hemi: [0xd8dcff, 0x2a2a34, 1.25], sun: [0xc8d0ff, .4], light: [0xdfe6ff, 3.2, 26, [0, 5, 0]], exposure: 1.2, lightFollow: true };
  }
};

/** Cria a arena (invisível) de uma dimensão. Retorna {group, env, update(t, dt, camera, viewH), dispose()}. */
export function buildDimensionArena(THREE, theme, spec) {
  const make = THEMES[theme] || THEMES.vault;
  const group = new THREE.Group(); group.position.set(spec.x, spec.y, spec.z); group.visible = false;
  const ctx = { eyes: [], swirls: [], tick: [], refs: {} };
  const env = make(THREE, group, spec, ctx);
  let last = 0;
  return {
    group, env, refs: ctx.refs,
    update(now, camera, viewH) {
      const t = now * .001, dt = Math.min(.1, t - last || .016); last = t;
      const scale = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      for (const e of ctx.eyes) { e.material.uniforms.uTime.value = t; e.material.uniforms.uScale.value = scale; }
      for (const s of ctx.swirls) s.uniforms.uTime.value = t;
      for (const fn of ctx.tick) fn(t, dt);
    },
    dispose() { dispose(group); }
  };
}

/* ===================== PORTAIS NO MUNDO ===================== */
const PORTALS = {
  // Portão gótico vermelho coberto de olhos, com a lua sorridente acima.
  bishop2(THREE, g, ctx) {
    const stone = new THREE.MeshStandardMaterial({ color: 0x180809, roughness: .7, metalness: .15, emissive: 0x3a0610, emissiveIntensity: .8 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3.6, 19, 3.4), stone); p.position.set(sx * 6.2, 9.5, 0); g.add(p); const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 4), stone); cap.position.set(sx * 6.2, 21, 0); cap.rotation.y = Math.PI / 4; g.add(cap); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(6.2, 1.2, 8, 28, Math.PI), stone); arch.position.set(0, 17.2, 0); g.add(arch);
    const steps = []; for (let i = 0; i < 3; i++) steps.push({ x: 0, y: .3 + i * .6, z: 3.5 + (2 - i) * 1.6, sx: 18 - i * 2, sy: .6, sz: 1.8 });
    g.add(instanced(THREE, new THREE.BoxGeometry(1, 1, 1), stone, steps));
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(6.2, 40), swirlMaterial(THREE, '#2a0006', '#ff2a3a')); swirl.scale.set(1, 1.55, 1); swirl.position.set(0, 9.6, .3); g.add(swirl); ctx.swirls.push(swirl.material);
    const eyes = eyeField(THREE, { count: 26, seed: 12, tex: eyeTexture(THREE), tint: [1.1, .85, .85], place: (i, rr) => ({ x: (rr() - .5) * 16, y: 2 + rr() * 22, z: 2.1 + rr() * .6, size: 1.4 + rr() * 2.8 }) });
    g.add(eyes); ctx.eyes.push(eyes);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 18, 12), new THREE.MeshBasicMaterial({ color: 0xd8d4d0, fog: false })); moon.position.set(12, 27, -4); g.add(moon);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(1.7, .16, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x100406 })); mouth.position.set(12, 26.4, -.85); mouth.rotation.z = Math.PI; g.add(mouth);
    for (const ex of [-.95, .95]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.38, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe02a38 })); e.position.set(12 + ex, 27.7, -.8); g.add(e); }
    return { height: 28, radius: 9 };
  },
  // Cogumelo gigante de olhos abertos; no tronco, um redemoinho negro.
  bishop3(THREE, g, ctx) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 6, 16, 14), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: .95, emissive: 0x101014, emissiveIntensity: .6 })); stem.position.y = 8; g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(13, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x35343a, roughness: .8, emissive: 0x16161a, emissiveIntensity: .7 })); cap.scale.set(1, .55, 1); cap.position.y = 16; g.add(cap);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), swirlMaterial(THREE, '#000000', '#c8c8e0')); hole.scale.set(1, 1.5, 1); hole.position.set(0, 6, 5.2); g.add(hole); ctx.swirls.push(hole.material);
    const eyes = eyeField(THREE, { count: 24, seed: 8, tex: eyeTexture(THREE, { sclera: ['#8a8a92', '#f0eee8'], iris: '#4a4a58', ring: '#101014' }), tint: [1, 1, 1],
      place: (i, rr) => { const a = rr() * 6.28, el = .25 + rr() * .9; return { x: Math.cos(a) * Math.cos(el) * 12.5, y: 16 + Math.sin(el) * 6.8, z: Math.sin(a) * Math.cos(el) * 12.5, size: 2.2 + rr() * 2.8 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    const minis = [], minicaps = [], r = rng(61); for (let i = 0; i < 7; i++) { const a = -1.1 + i * .38, d = 13 + r() * 5, h = 3 + r() * 4; minis.push({ x: Math.sin(a) * d, y: h / 2, z: Math.cos(a) * d * .55 + 3, sx: .9, sy: h, sz: .9 }); minicaps.push({ x: Math.sin(a) * d, y: h, z: Math.cos(a) * d * .55 + 3, sx: 2.6, sy: 1.1, sz: 2.6 }); }
    g.add(instanced(THREE, new THREE.CylinderGeometry(.6, 1, 1, 8), cap.material, minis)); g.add(instanced(THREE, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap.material, minicaps));
    return { height: 24, radius: 15 };
  },
  // Arco de pedra negra com anéis de luz branca, estilhaços flutuando e figuras encapuzadas.
  bishop4(THREE, g, ctx) {
    const stone = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: .85, metalness: .1, emissive: 0x16161e, emissiveIntensity: .8 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, 17, 3), stone); p.position.set(sx * 6, 8.5, 0); g.add(p);
      for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .7, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false })); ring.position.set(sx * 6, 4 + k * 4.5, 1.55); g.add(ring); }
      const line = new THREE.Mesh(new THREE.BoxGeometry(.08, 22, .08), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, toneMapped: false })); line.position.set(sx * 8, 24, 0); g.add(line); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(6, 1.3, 8, 28, Math.PI), stone); arch.position.set(0, 16.6, 0); g.add(arch);
    const halo = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.55, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false })); halo.position.set(0, 22, 1.2); g.add(halo);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000 })); eye.position.set(0, 22, 1.3); g.add(eye);
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(6, 40), swirlMaterial(THREE, '#02020a', '#a8b4ff')); swirl.scale.set(1, 1.5, 1); swirl.position.set(0, 9, .2); g.add(swirl); ctx.swirls.push(swirl.material);
    const r = rng(77), shards = []; for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = 10 + r() * 12; shards.push({ x: Math.cos(a) * d, y: 8 + r() * 24, z: Math.sin(a) * d * .5 - 3, sx: .8 + r() * 1.6, sy: 1.8 + r() * 3, sz: .8 + r() * 1.4, rx: r() * 3, ry: r() * 3 }); }
    const shardMesh = instanced(THREE, new THREE.OctahedronGeometry(1, 0), stone, shards); g.add(shardMesh);
    const hoods = [], heads = []; for (const [x, z] of [[-11, 4], [11, 4], [-14, 8], [14, 8]]) { hoods.push({ x, y: 2.1, z, sx: 1.5, sy: 4.2, sz: 1.5 }); heads.push({ x, y: 4.5, z, s: .7 }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 8), stone, hoods)); g.add(instanced(THREE, new THREE.SphereGeometry(1, 8, 6), stone, heads));
    ctx.tick.push((t) => { shardMesh.position.y = Math.sin(t * .5) * .5; halo.rotation.z = t * .2; });
    return { height: 26, radius: 10 };
  },
  // Portal do Pecado: árvore colossal cheia de olhos, com moedas penduradas e um portal rubro no tronco.
  greed(THREE, g, ctx) {
    const bark = new THREE.MeshStandardMaterial({ color: 0x120a0a, roughness: .9, emissive: 0x3a0808, emissiveIntensity: .8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 8, 28, 12), bark); trunk.position.y = 14; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), bark); crown.scale.set(1.3, .6, 1.3); crown.position.y = 27; g.add(crown);
    const r = rng(81), roots = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; roots.push({ x: Math.cos(a) * 8.5, y: 1.4, z: Math.sin(a) * 8.5, ry: -a, rz: -.9, sx: 2.2, sy: 12, sz: 2.2 }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1, 6), bark, roots));
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(4.2, 36), swirlMaterial(THREE, '#200004', '#ff2a2a')); swirl.scale.set(1, 1.55, 1); swirl.position.set(0, 6.8, 7.6); g.add(swirl); ctx.swirls.push(swirl.material);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xd8a830, emissive: 0x7a5010, emissiveIntensity: 1.1, metalness: .85, roughness: .3 }), hang = [], chains = [];
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 6 + r() * 12, y = 14 + r() * 14; hang.push({ x: Math.cos(a) * d, y, z: Math.sin(a) * d, rx: Math.PI / 2, ry: r() * 3, s: 1.1 + r() * .8 }); chains.push({ x: Math.cos(a) * d, y: y + 5, z: Math.sin(a) * d }); }
    g.add(instanced(THREE, new THREE.CylinderGeometry(.6, .6, .1, 10), coinMat, hang)); g.add(instanced(THREE, new THREE.CylinderGeometry(.04, .04, 10, 4), new THREE.MeshBasicMaterial({ color: 0x6a5020 }), chains));
    const piles = []; for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 7 + r() * 8; piles.push({ x: Math.cos(a) * d, y: .3, z: Math.sin(a) * d + 3, sx: .8 + r(), sy: .5 + r() * .5, sz: .8 + r() }); }
    g.add(instanced(THREE, new THREE.ConeGeometry(1, 1.4, 10), coinMat, piles));
    const eyes = eyeField(THREE, { count: 40, seed: 14, tex: eyeTexture(THREE, { sclera: ['#5a0a10', '#c02030'], iris: '#ffb020', ring: '#220004' }), tint: [1.1, .9, .85],
      place: (i, rr) => { const a = rr() * 6.28, y = 4 + rr() * 24, rad = 5.6 + (28 - y) * .08; return { x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, size: 1.6 + rr() * 3 }; } });
    g.add(eyes); ctx.eyes.push(eyes);
    return { height: 40, radius: 16 };
  }
};

/** Cria o portal de um Bispo no mundo. Retorna {group, update(now, camera, viewH), setActive(on), height, radius}. */
export function buildDimensionPortal(THREE, key) {
  const make = PORTALS[key];
  if (!make) return null;
  const group = new THREE.Group(), ctx = { eyes: [], swirls: [], tick: [] };
  const info = make(THREE, group, ctx);
  group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  group.visible = false;
  return {
    group, height: info.height, radius: info.radius,
    setActive(on) { group.visible = !!on; },
    update(now, camera, viewH) {
      if (!group.visible) return;
      const t = now * .001, scale = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      for (const e of ctx.eyes) { e.material.uniforms.uTime.value = t; e.material.uniforms.uScale.value = scale; }
      for (const s of ctx.swirls) s.uniforms.uTime.value = t;
      for (const fn of ctx.tick) fn(t, .016);
    }
  };
}
