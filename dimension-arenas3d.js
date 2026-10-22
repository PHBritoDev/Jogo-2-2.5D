/**
 * MOD 202 — Arenas e portais das dimensões dos Bispos (geometria procedural, sem arquivos novos).
 * O módulo recebe o THREE como parâmetro (o mundo já o carrega) e só cria objetos quando a dimensão é aberta,
 * então não pesa na entrada do jogo. Tudo é instanciado/agrupado: poucas chamadas de desenho para o celular.
 * Referências do criador: Valério (câmara macabra de moedas e correntes), Vorgazhek (vazio de olhos vermelhos e
 * lua sorridente), Zar'khael (cogumelos gigantes com olhos sobre piso xadrez), Véraxion (corredor torto com claraboias).
 */
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
  }
};

/** Cria a arena (invisível) de uma dimensão. Retorna {group, env, update(t, dt, camera, viewH), dispose()}. */
export function buildDimensionArena(THREE, theme, spec) {
  const make = THEMES[theme] || THEMES.vault;
  const group = new THREE.Group(); group.position.set(spec.x, spec.y, spec.z); group.visible = false;
  const ctx = { eyes: [], swirls: [], tick: [] };
  const env = make(THREE, group, spec, ctx);
  let last = 0;
  return {
    group, env,
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
