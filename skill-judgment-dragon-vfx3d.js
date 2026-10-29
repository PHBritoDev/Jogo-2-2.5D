import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
import { DRAGON } from './skill-judgment-dragon3d.js';
/**
 * MOD 233 — Dragão do Julgamento (VFX). Escolha técnica: dragão PROCEDURAL (malhas próprias + histórico da cabeça),
 * não GLB: a cabeça, a mandíbula articulada e o corpo serpentino são montados aqui, o que dá uma mordida exata
 * (o ângulo da mandíbula vem direto da lógica) e um corpo que segue a rota real sem precisar de rig/retarget.
 *  • Cabeça: crânio esculpido (focinho afilado, sobrancelhas, maçãs), mandíbula inferior com dobradiça, dentes, olhos
 *    brilhantes, chifres curvos, crista e bigodes de fogo. Material de ouro celestial com escamas no shader.
 *  • Corpo: 34 segmentos instanciados ao longo do histórico da cabeça (espessura afinando até a cauda), espinhos
 *    dorsais e faixas de fogo laterais que ondulam; brasas soltas e arcos de energia.
 *  • Engolir: a boca abre de verdade, a cabeça envolve o alvo e FECHA; a energia se comprime e explode em esfera de luz
 *    em camadas, com onda de choque, fragmentos, fumaça e o corpo se desfazendo em brasas da cabeça para a cauda.
 */
const GOLD_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.);
#ifdef USE_INSTANCING
 w=modelMatrix*instanceMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix*instanceMatrix)*normal);
#else
 vN=normalize(mat3(modelMatrix)*normal);
#endif
 vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const GOLD_FRAG = `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time, glow, dissolve;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){ vec3 n=normalize(vN); float f=pow(1.-abs(dot(n,vV)),2.2);
 vec2 q=vec2(vP.x*11.+vP.y*5.,vP.z*11.-vP.y*5.); float scale=smoothstep(.15,.9,abs(sin(q.x)*sin(q.y)));   // escamas em losango
 if(h3(floor(vP*18.))<dissolve) discard;
 float key=clamp(dot(n,normalize(vec3(.3,1.,.4)))*.5+.5,0.,1.);                // luz de cima (forma legível)
 vec3 deep=vec3(.42,.16,.03), gold=vec3(.95,.66,.22), pale=vec3(1.,.9,.6);
 vec3 c=mix(deep,gold,key*.85+.15)*(.55+.45*scale); c=mix(c,pale,pow(key,6.)*.5);
 c+=vec3(1.,.55,.12)*f*(1.1+glow*.8);                                             // contorno de fogo
 c+=vec3(1.,.5,.1)*(.5+.5*sin(time*6.+vP.y*7.+vP.z*4.))*.12*(1.-scale);            // brasa entre as escamas
 gl_FragColor=vec4(c*(.85+glow*.5),1.); }`;
const FIRE_FRAG = `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time, alpha, heat;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){ float fr=abs(dot(normalize(vN),vV)); float n=n2(vec2(atan(vP.z,vP.x)*3.,vP.y*3.-time*2.))*.6+n2(vec2(atan(vP.z,vP.x)*7.,vP.y*6.+time*3.))*.4;
 float i=clamp(n*heat*(.35+.65*fr),0.,1.); vec3 c=mix(vec3(.7,.2,.02),vec3(1.,.72,.2),smoothstep(.2,.55,i)); c=mix(c,vec3(1.,.97,.85),smoothstep(.6,.95,i));
 float a=i*alpha; if(a<.004) discard; gl_FragColor=vec4(c*a,a); }`;

function skullGeometry(T) {
  const g = new T.SphereGeometry(1, 28, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const front = Math.max(0, z);                                   // +Z = focinho longo e anguloso
    const taper = 1 - front * .66;
    x *= .46 * taper * (1 + .18 * Math.exp(-Math.pow((z + .05) / .3, 2))); y *= .34 * (1 - front * .5); z *= z > 0 ? 1.6 : 1.05;
    if (z > .9) y += .05 * (z - .9);                                // ponta do focinho levemente erguida
    if (y > 0) y *= .8 + .25 * Math.exp(-Math.pow((z + .1) / .35, 2)) * (Math.abs(x) > .15 ? 1.4 : 1); // sobrancelhas
    if (y < 0) y *= .55;                                            // base reta para encaixar a mandíbula
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
function jawGeometry(T) {
  const g = new T.SphereGeometry(1, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), p = g.attributes.position; // meia esfera de baixo
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const front = Math.max(0, z), taper = 1 - front * .6; p.setXYZ(i, x * .4 * taper, y * .19, z * 1.45 + 1.12); }
  g.computeVertexNormals(); return g;                               // origem na dobradiça (atrás), estende-se para a frente
}

export function createDragonVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'DragaoJulgamento'; root.visible = false; scene.add(root);
  const goldMat = new T.ShaderMaterial({ vertexShader: GOLD_VERT, fragmentShader: GOLD_FRAG, toneMapped: false, fog: false, uniforms: { time: { value: 0 }, glow: { value: .4 }, dissolve: { value: 0 } } });
  const goldInst = goldMat.clone(); goldInst.uniforms = goldMat.uniforms;
  // ---- cabeça
  const head = new T.Group(); root.add(head);
  const skullGeo = skullGeometry(T), jawGeo = jawGeometry(T), coneGeo = new T.ConeGeometry(1, 1, 6); coneGeo.translate(0, .5, 0);
  const skull = new T.Mesh(skullGeo, goldMat); head.add(skull);
  const jaw = new T.Group(); jaw.position.set(0, -.12, -.55); head.add(jaw); const jawMesh = new T.Mesh(jawGeo, goldMat); jaw.add(jawMesh);
  const toothMat = new T.MeshBasicMaterial({ color: 0xfff6dc, toneMapped: false, fog: false });
  const upperTeeth = new T.InstancedMesh(coneGeo, toothMat, 14), lowerTeeth = new T.InstancedMesh(coneGeo, toothMat, 12);
  const pose = new T.Object3D();
  for (let i = 0; i < 14; i++) { const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 6, z = .25 + k * 1.25, w = .3 * (1 - k * .55);
    pose.position.set(sx * w, -.1, z); pose.rotation.set(Math.PI, 0, 0); pose.scale.set(.035, .14 - k * .04, .035); pose.updateMatrix(); upperTeeth.setMatrixAt(i, pose.matrix); }
  for (let i = 0; i < 12; i++) { const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 5, z = .75 + k * 1.25, w = .25 * (1 - k * .55);
    pose.position.set(sx * w, .02, z); pose.rotation.set(0, 0, 0); pose.scale.set(.03, .12 - k * .03, .03); pose.updateMatrix(); lowerTeeth.setMatrixAt(i, pose.matrix); }
  head.add(upperTeeth); jaw.add(lowerTeeth);
  const hornMat = new T.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffb040, emissiveIntensity: .7, metalness: .4, roughness: .35, fog: false });
  // chifres longos varridos para trás, sobrancelhas salientes, babados laterais (identidade de dragão)
  for (const sx of [-1, 1]) { const horn = new T.Group(); horn.position.set(sx * .2, .24, -.45); horn.rotation.set(-1.15, sx * .28, 0); head.add(horn);
    let y = 0; for (let k = 0; k < 6; k++) { const L = .32 - k * .02, seg = new T.Mesh(coneGeo, hornMat); seg.scale.set(.085 - k * .013, L + .02, .085 - k * .013); seg.position.set(0, y, 0); seg.rotation.x = k * .14; horn.add(seg); y += L * .9; }
    const brow = new T.Mesh(new T.SphereGeometry(1, 10, 8), goldMat); brow.scale.set(.1, .07, .32); brow.position.set(sx * .25, .25, .12); brow.rotation.set(-.25, sx * .3, 0); head.add(brow);
    const fin = new T.InstancedMesh(coneGeo, goldMat, 4); for (let k = 0; k < 4; k++) { pose.position.set(sx * .4, -.02 - k * .06, -.25 - k * .14); pose.rotation.set(0, 0, sx * -(1.25 + k * .1)); pose.scale.set(.04, .34 - k * .05, .04); pose.updateMatrix(); fin.setMatrixAt(k, pose.matrix); } head.add(fin);
    const nostril = new T.Mesh(new T.SphereGeometry(.035, 8, 6), new T.MeshBasicMaterial({ color: 0xffe2a0, toneMapped: false, fog: false })); nostril.position.set(sx * .09, .08, 1.55); head.add(nostril); }
  const crest = new T.InstancedMesh(coneGeo, goldMat, 7); head.add(crest);
  for (let i = 0; i < 7; i++) { pose.position.set(0, .3 - i * .015, .2 - i * .17); pose.rotation.set(-1.1, 0, 0); pose.scale.set(.05, .28 - i * .02, .05); pose.updateMatrix(); crest.setMatrixAt(i, pose.matrix); }
  const eyeMat = new T.MeshBasicMaterial({ color: 0xfffbe8, toneMapped: false, fog: false }), eyes = [-1, 1].map(sx => { const e = new T.Mesh(new T.SphereGeometry(.07, 10, 8), eyeMat); e.position.set(sx * .27, .17, .2); e.scale.set(1.1, .55, 1.6); head.add(e); return e; });
  const mouthGlow = new T.Mesh(new T.SphereGeometry(.35, 14, 10), new T.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  mouthGlow.position.set(0, -.12, .7); head.add(mouthGlow);
  // ---- corpo
  const N = 34, bodyIdx = new Int32Array(34), segGeo = new T.SphereGeometry(1, 14, 10); segGeo.scale(1, .82, 1.35);
  const body = new T.InstancedMesh(segGeo, goldInst, N); body.frustumCulled = false; root.add(body);
  const spikes = new T.InstancedMesh(coneGeo, goldInst, N); spikes.frustumCulled = false; root.add(spikes);
  // ---- explosão
  const shellGeo = new T.IcosahedronGeometry(1, 3), mkFire = (heat) => new T.ShaderMaterial({ vertexShader: GOLD_VERT, fragmentShader: FIRE_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false, uniforms: { time: { value: 0 }, alpha: { value: 0 }, heat: { value: heat } } });
  const shells = [1.8, 1.3, .9].map(h => { const m = new T.Mesh(shellGeo, mkFire(h)); root.add(m); return m; });
  const glow = softParticles(T, 1600), smoke = softParticles(T, 160, { additive: false }), decals = groundDecals(T, 10), rib = ribbons(T, 3200, { flow: 20 });
  root.add(glow.mesh, smoke.mesh, decals.mesh, rib.mesh);
  const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0), tng = new T.Vector3(), side = new T.Vector3(), a3 = new T.Vector3(), b3 = new T.Vector3(), nrm = [0, 1, 0], m4 = new T.Matrix4(), upv = new T.Vector3();
  const G1 = [1, .78, .3, 1], G2 = [1, .5, .08, 1], W = [1, .97, .85, 1], c4 = (c, a) => [c[0], c[1], c[2], a];
  const tangentAt = (s, k, out) => { const a = s.sample(k), b = s.sample(k + 3); out.set(a.x - b.x, a.y - b.y, a.z - b.z); if (out.lengthSq() < 1e-8) out.set(s.dir.x, s.dir.y, s.dir.z); return out.normalize(); };
  function basis(obj, f) { side.crossVectors(up, f); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize(); upv.crossVectors(f, side); m4.makeBasis(side, upv, f); obj.quaternion.setFromRotationMatrix(m4); }
  function update(s, camera, quality = 1) {
    root.visible = s.active; if (!s.active) return;
    const t = s.time, A = s.age, ph = s.phase, low = quality === 0;
    goldMat.uniforms.time.value = t; for (const m of shells) m.material.uniforms.time.value = t;
    rib.begin(camera, t); glow.begin(); smoke.begin(); decals.begin();
    const src = s.source, formK = ph === 'channel' ? 0 : ph === 'form' ? easeOut(A / DRAGON.form) : 1;
    const dis = ph === 'explode' ? smooth(A / 1.1) : 0; goldMat.uniforms.dissolve.value = dis; goldMat.uniforms.glow.value = .4 + (ph === 'compress' ? A * 2.2 : 0) + (ph === 'engulf' ? .4 : 0);
    // ---- conjuração: espirais de luz e fogo sagrado sobem do herói
    if (ph === 'channel' || ph === 'form') {
      const k = ph === 'channel' ? smooth(A / DRAGON.channel) : 1 - smooth(A / .6);
      for (let l = 0; l < (low ? 2 : 4); l++) for (let j = 0; j < 24; j++) {
        const u0 = j / 24, u1 = (j + 1) / 24, h0 = u0 * 6 * k, h1 = u1 * 6 * k, r0 = 1.4 - u0 * .7, r1 = 1.4 - u1 * .7, a0 = u0 * 9 + t * 4 + l * 1.57, a1 = u1 * 9 + t * 4 + l * 1.57;
        rib.seg(src.x + Math.cos(a0) * r0, src.y - 1 + h0, src.z + Math.sin(a0) * r0, src.x + Math.cos(a1) * r1, src.y - 1 + h1, src.z + Math.sin(a1) * r1, .07, .07, c4(l % 2 ? G2 : G1, .9 * k), c4(W, .9 * k), u0, u1);
      }
      for (let i = 0; i < (low ? 20 : 50); i++) { const u = ((i / 50) + t * .7) % 1, a = i * 2.4 + t * 2; glow.add(src.x + Math.cos(a) * 2 * (1 - u), src.y - .8 + u * 6 * k, src.z + Math.sin(a) * 2 * (1 - u), .06, .3, 1, .7, .25, (1 - u) * k, 3, a, i); }
      glow.add(src.x, src.y + .4, src.z, 2.5 * k + .3, 2.5 * k + .3, 1, .75, .3, .5 * k, 0);
    }
    // ---- cabeça
    head.visible = ph !== 'channel' && !(ph === 'explode' && A > .5);
    head.position.set(s.head.x, s.head.y, s.head.z); tng.set(s.dir.x, s.dir.y, s.dir.z); if (tng.lengthSq() < 1e-6) tng.set(0, 0, 1); tng.normalize(); basis(head, tng);
    const shake = ph === 'compress' ? Math.sin(t * 70) * .05 : 0; head.position.x += shake; head.scale.setScalar(2.3 * (.3 + .7 * formK) * (1 - dis * .6));
    jaw.rotation.x = s.mouth * .95; mouthGlow.material.opacity = s.mouth * .55 + (ph === 'compress' ? .6 : 0);
    if (head.visible) {
      for (const e of eyes) { e.getWorldPosition(a3); glow.add(a3.x, a3.y, a3.z, .6, .6, 1, .95, .7, .9, 0); }
      // bigodes de fogo que saem do focinho e ficam para trás
      for (const sx of [-1, 1]) { let px = s.head.x, py = s.head.y, pz = s.head.z;
        for (let j = 1; j <= 8; j++) { const q = s.sample(j * 3); const nx = q.x + side.x * sx * .5 * (1 - j / 10) + Math.sin(t * 6 + j) * .08, ny = q.y - .15 - j * .02, nz = q.z + side.z * sx * .5 * (1 - j / 10);
          rib.seg(px, py, pz, nx, ny, nz, .05 * (1 - j / 9), .05 * (1 - (j + 1) / 9), c4(G1, formK * (1 - dis)), c4(G2, formK * (1 - dis) * .7)); px = nx; py = ny; pz = nz; } }
      // juba de fogo atrás da cabeça
      for (let i = 0; i < (low ? 10 : 26); i++) { const a = i * 2.4 + t * 5, r = .45 + hash(i) * .4; a3.set(Math.cos(a) * r, Math.sin(a) * r * .7 + .15, -.6 - hash(i * 3) * .6).applyQuaternion(head.quaternion).multiplyScalar(head.scale.x).add(head.position);
        glow.add(a3.x, a3.y, a3.z, .22, .55, 1, .55 + .3 * hash(i), .1, .8 * formK * (1 - dis), 3, a, i); }
    }
    // ---- corpo serpentino: segmentos ao longo do histórico real da cabeça
    // amostras do corpo por comprimento de arco (0,42 m entre segmentos), não por índice: o corpo não se amassa
    let visible = 0; if (ph !== 'channel') { let acc = 0, prev = s.sample(0);
      for (let k = 1; k < s.trailCount && visible < N; k++) { const q = s.sample(k); acc += Math.hypot(q.x - prev.x, q.y - prev.y, q.z - prev.z); prev = q; if (acc >= (visible + 1) * .42) bodyIdx[visible++] = k; } }
    let nb = 0;
    for (let j = 1; j <= visible; j++) {
      const k = bodyIdx[j - 1], p = s.sample(k), tp = j / N, r = (.62 * (1 - tp * .85) + .06) * (.3 + .7 * formK);
      const burn = ph === 'explode' ? smooth((A * 1.6) - tp * .8) : 0; if (burn >= .99) continue;
      tangentAt(s, k, tng); dummy.position.set(p.x, p.y, p.z); basis(dummy, tng); dummy.scale.setScalar(r * (1 - burn)); dummy.updateMatrix(); body.setMatrixAt(nb, dummy.matrix);
      dummy.translateY(r * .7); dummy.rotateX(-.8); dummy.scale.set(r * .22, r * 1.1, r * .22); dummy.updateMatrix(); spikes.setMatrixAt(nb, dummy.matrix); nb++;
      if (j % 2 === 0) { // faixas de fogo laterais que ondulam
        const q = s.sample(bodyIdx[Math.min(visible - 1, j)]); for (const sx of [-1, 1]) { const w = Math.sin(t * 8 + j * .7) * .15;
          a3.set(p.x + side.x * sx * (r + .15 + w), p.y + .1, p.z + side.z * sx * (r + .15 + w)); b3.set(q.x + side.x * sx * (r + .2 - w), q.y + .1, q.z + side.z * sx * (r + .2 - w));
          rib.seg(a3.x, a3.y, a3.z, b3.x, b3.y, b3.z, .22 * (1 - tp * .7), .2 * (1 - tp * .7), c4(G2, .8 * (1 - burn)), c4(G1, .6 * (1 - burn)), tp, tp + .05); } }
      if (!low && j % 3 === 0) glow.add(p.x + Math.sin(t * 3 + j) * r, p.y + r * 1.2 + hash(j + Math.floor(t * 6)) * .5, p.z + Math.cos(t * 3 + j) * r, .07, .4, 1, .6, .15, .9 * (1 - burn), 3, j, j);
      if (burn > 0 && !low) glow.add(p.x, p.y, p.z, r * 2, r * 2, 1, .65, .2, (1 - burn) * .6, 0);
    }
    body.count = spikes.count = nb; body.instanceMatrix.needsUpdate = spikes.instanceMatrix.needsUpdate = true;
    // cauda de chama
    if (visible > 4) { const tail = s.sample(bodyIdx[visible - 1]), pre = s.sample(bodyIdx[visible - 3]); rib.seg(pre.x, pre.y, pre.z, tail.x, tail.y, tail.z, .25, .02, c4(G1, .9 * (1 - dis)), c4(G2, 0)); }
    // arcos de energia no avanço
    if (ph === 'advance' && !low) for (let i = 0; i < 3; i++) { const j = 4 + ((Math.floor(t * 12) + i * 7) % 20), p = s.sample(bodyIdx[Math.min(visible - 1, j)] || 0), q = s.sample((bodyIdx[Math.min(visible - 1, j + 3)] || 0));
      rib.seg(p.x, p.y + .6, p.z, q.x + Math.sin(t * 40 + i), q.y + 1.2, q.z + Math.cos(t * 33 + i), .03, .01, c4(W, .9), c4(G1, 0)); }
    // ---- engolir e comprimir: a energia é puxada para a boca
    if (ph === 'engulf' || ph === 'compress') { const P = s.at, k = ph === 'compress' ? A / DRAGON.compress : 0;
      for (let i = 0; i < (low ? 16 : 40); i++) { const u = ((i / 40) + t * 2) % 1, a = i * 2.4, r = (1 - u) * 2.6; glow.add(P.x + Math.cos(a) * r, P.y + Math.sin(a * 1.7) * r * .6, P.z + Math.sin(a) * r, .06, .32, 1, .8, .4, u, 3, a, i); }
      glow.add(P.x, P.y, P.z, 1 + k * 2.5, 1 + k * 2.5, 1, .9, .6, .5 + k * .5, 0); }
    // ---- explosão em esfera volumétrica de luz
    shells.forEach((m, i) => { const k = (A - i * .08) / 1.1; m.visible = ph === 'explode' && k > 0 && k < 1; if (!m.visible) return; m.position.set(s.at.x, s.at.y, s.at.z);
      m.scale.setScalar((.5 + (4.2 - i * .9) * easeOut(k))); m.rotation.set(t * .4 + i, t * .3, 0); m.material.uniforms.alpha.value = (1 - smooth(k)) * 1.2; m.material.uniforms.heat.value = 1.9 - k - i * .3; });
    if (ph === 'explode') { const P = s.at, k = A / DRAGON.dissipate, gy = ground(P.x, P.z), n = groundNormal(ground, P.x, P.z, nrm);
      if (A < .16) { const q = 1 - A / .16; glow.add(P.x, P.y, P.z, 9 * q + 1, 9 * q + 1, 1, .97, .85, q, 0); glow.add(P.x, P.y, P.z, 12 * q, .5, 1, 1, .9, q, 2, 0); }
      decals.add(P.x, gy, P.z, 2 + 11 * easeOut(k), 1, .75, .3, (1 - k), 0, k, 31, n); decals.add(P.x, gy, P.z, 3.4, 1, .55, .15, (1 - smooth(k)) * .95, 1, k, 32, n); decals.add(P.x, gy, P.z, 6, 1, .6, .2, (1 - smooth(k * 1.6)) * .7, 2, 0, 33, n);
      for (let i = 0; i < (low ? 40 : 110); i++) { const a = i * 2.39996, el = hash(i) * 1.5 - .3, sp = 6 + hash(i * 3) * 12, d = sp * easeOut(A / .9);
        glow.add(P.x + Math.cos(a) * Math.cos(el) * d, P.y + Math.sin(el) * d - 2 * A * A, P.z + Math.sin(a) * Math.cos(el) * d, .08, .55, 1, .65 + .3 * hash(i + 4), .2, 1 - k, 3, a + Math.PI / 2, i); }
      for (let i = 0; i < (low ? 5 : 12); i++) { const a = i * 1.9, d = 1.2 + 4 * easeOut(k); smoke.add(P.x + Math.cos(a) * d, gy + .8 + k * 4 + (i % 3) * .6, P.z + Math.sin(a) * d, 2 + 3 * k, 2 + 3 * k, .2, .14, .1, .45 * (1 - smooth((k - .25) / .75)), 1, a, i); }
    }
    rib.end(); glow.end(); smoke.end(); decals.end(t);
  }
  return { root, update, clear() { root.visible = false; },
    dispose() { scene.remove(root); for (const g of [skullGeo, jawGeo, coneGeo, segGeo, shellGeo]) g.dispose(); for (const m of [goldMat, goldInst, toothMat, hornMat, eyeMat, mouthGlow.material]) m.dispose(); for (const m of shells) m.material.dispose(); upperTeeth.dispose(); lowerTeeth.dispose(); crest.dispose(); body.dispose(); spikes.dispose(); glow.dispose(); smoke.dispose(); decals.dispose(); rib.dispose(); } };
}
