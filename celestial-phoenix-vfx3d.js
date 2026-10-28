import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 229 — Tornado da Fênix Celestial, redesenhado.
 *  • Tornado: funil 3D com núcleo escuro/roxo animado por ruído (não é cilindro liso), hélices de fogo em contrarrotação,
 *    brasas que sobem girando, poeira na base. Na captura ele se alarga e rajadas de vento circulam o alvo.
 *  • Explosão do tornado: casca de fogo que se expande, coluna de chamas, onda de choque no chão e brasas radiais.
 *  • Fênix: corpo dourado, asas com duas fileiras de penas de fogo batendo, cauda longa; rastros de fogo persistentes no ar
 *    durante as duas voltas (somem aos poucos), subida com pausa no ápice e mergulho acelerado com linhas de velocidade.
 *  • Impacto final: clarão branco-amarelado, casca de fogo laranja, onda de choque, coluna curta, detritos, fumaça e
 *    queimadura residual com chamas baixas durante o burn.
 * Buffers fixos, sem luzes dinâmicas; o VFX nunca aplica dano (lógica em celestial-phoenix3d.js).
 */
const NOISE = `float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}`;
const VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const CORE_FRAG = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time, alpha; ${NOISE}
void main(){ float u=vUv.x, v=vUv.y; vec2 q=vec2(u*7.+v*4.5-time*1.6, v*3.-time*2.4); float n=fbm(q);
 float fres=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.6);
 vec3 c=mix(vec3(.06,.0,.09),vec3(.42,.04,.5),smoothstep(.3,.7,n)); c=mix(c,vec3(1.,.42,.06),smoothstep(.62,.85,n)*.9+fres*.55);
 float a=(.45+.55*smoothstep(.25,.7,n))*alpha*smoothstep(0.,.06,v)*smoothstep(1.,.8,v);
 gl_FragColor=vec4(c,a); }`;
const FIRE_FRAG = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time, alpha, heat, scroll; ${NOISE}
void main(){ float fres=abs(dot(normalize(vN),normalize(vV)));
 float n=fbm(vec2(vUv.x*8.,vUv.y*3.-time*scroll))*1.15;
 float i=clamp(n*heat*(.4+.6*fres)*smoothstep(1.,.55,vUv.y)*smoothstep(0.,.1,vUv.y),0.,1.);
 vec3 c=mix(vec3(.55,.04,.0),vec3(1.,.45,.04),smoothstep(.15,.5,i)); c=mix(c,vec3(1.,.93,.6),smoothstep(.55,.95,i));
 float a=i*alpha; if(a<.004) discard; gl_FragColor=vec4(c*a,a); }`;
const FEATHER_FRAG = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float time; ${NOISE}
void main(){ float fres=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.5); float n=n2(vec2(vUv.y*6.-time*4.,vUv.x*3.));
 vec3 c=mix(vec3(1.,.55,.08),vec3(1.,.95,.6),vUv.y*.5+fres*.5); c=mix(c,vec3(.9,.18,.02),n*.35*(1.-vUv.y));
 gl_FragColor=vec4(c*(1.25+fres),1.); }`;

export function createPhoenixVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'TornadoFenix'; scene.add(root); root.visible = false;
  const S = Object.freeze({ tornadoRadius: 1.5, tornadoHeight: 1.5, phoenix: 1.6 });
  const shader = (frag, extra = {}, blend = true) => new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false,
    blending: blend ? T.CustomBlending : T.NormalBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, uniforms: { time: { value: 0 }, alpha: { value: 1 }, ...extra } });
  // ---- tornado: funil com ondulações (as camadas giram em sentidos opostos)
  const funnel = new T.CylinderGeometry(1.25, .32, 3.4, 40, 24, true); funnel.translate(0, 1.7, 0);
  { const p = funnel.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)), r = 1 + .12 * Math.sin(a * 5 + y * 6) + .06 * Math.sin(a * 11 - y * 9); p.setX(i, p.getX(i) * r); p.setZ(i, p.getZ(i) * r); } funnel.computeVertexNormals(); }
  const coreMat = shader(CORE_FRAG, {}, false); const core = new T.Mesh(funnel, coreMat); root.add(core);
  const skinMat = shader(FIRE_FRAG, { heat: { value: .95 }, scroll: { value: 2.6 } }); const skin = new T.Mesh(funnel, skinMat); skin.scale.set(1.12, 1.02, 1.12); root.add(skin);
  // ---- explosões: casca de fogo e coluna
  const shellGeo = new T.IcosahedronGeometry(1, 3), shellMat = shader(FIRE_FRAG, { heat: { value: 1.6 }, scroll: { value: 1.2 } }); const shell = new T.Mesh(shellGeo, shellMat); root.add(shell);
  const colGeo = new T.CylinderGeometry(.7, 1.1, 1, 28, 8, true); colGeo.translate(0, .5, 0); const colMat = shader(FIRE_FRAG, { heat: { value: 1.5 }, scroll: { value: 3.4 } }); const column = new T.Mesh(colGeo, colMat); root.add(column);
  // ---- fênix
  const bird = new T.Group(); bird.scale.setScalar(S.phoenix); root.add(bird);
  const featherMat = shader(FEATHER_FRAG, {}, false); featherMat.transparent = false; featherMat.depthWrite = true;
  const goldMat = new T.MeshStandardMaterial({ color: 0xffb030, emissive: 0xff6a10, emissiveIntensity: 1.1, metalness: .3, roughness: .35 });
  const featherGeo = new T.ConeGeometry(.11, 1, 4, 1); featherGeo.translate(0, .5, 0); featherGeo.scale(1, 1, .35);
  const bodyGeo = new T.SphereGeometry(.22, 14, 10);
  const body = new T.Mesh(bodyGeo, goldMat); body.scale.set(.8, .9, 2.3); bird.add(body);
  const head = new T.Mesh(bodyGeo, goldMat); head.position.set(0, .2, .46); head.scale.setScalar(.66); bird.add(head);
  const beak = new T.Mesh(featherGeo, goldMat); beak.scale.set(.5, .32, .9); beak.rotation.x = Math.PI / 2; beak.position.set(0, .2, .56); bird.add(beak);
  const crest = new T.InstancedMesh(featherGeo, featherMat, 5); bird.add(crest);
  const pose = new T.Object3D();
  for (let i = 0; i < 5; i++) { pose.position.set(0, .3, .38 - i * .05); pose.rotation.set(-.9 - i * .12, 0, (i - 2) * .14); pose.scale.set(.5, .55 + i * .05, .5); pose.updateMatrix(); crest.setMatrixAt(i, pose.matrix); }
  const wings = [], feathersMeshes = [crest];
  for (const sign of [-1, 1]) {
    const wing = new T.Group(); wing.position.set(sign * .12, .06, .05); bird.add(wing); wings.push(wing);
    const fore = new T.Group(); fore.position.set(sign * .62, 0, -.05); wing.add(fore); wing.userData.fore = fore;
    const m1 = new T.InstancedMesh(featherGeo, featherMat, 10), m2 = new T.InstancedMesh(featherGeo, featherMat, 12);
    for (let i = 0; i < 10; i++) { pose.position.set(sign * (.06 + i * .058), 0, -i * .015); pose.rotation.set(-1.25, 0, -sign * (1.35 + i * .02)); pose.scale.set(1, .55 + i * .025, 1); pose.updateMatrix(); m1.setMatrixAt(i, pose.matrix); }
    for (let i = 0; i < 12; i++) { pose.position.set(sign * (i * .055), 0, -.04 - i * .02); pose.rotation.set(-1.45 + i * .03, 0, -sign * (1.2 + i * .07)); pose.scale.set(1.1, .9 + i * .06, 1); pose.updateMatrix(); m2.setMatrixAt(i, pose.matrix); }
    wing.add(m1); fore.add(m2); feathersMeshes.push(m1, m2);
  }
  const tail = new T.InstancedMesh(featherGeo, featherMat, 9); bird.add(tail); feathersMeshes.push(tail);
  for (let i = 0; i < 9; i++) { pose.position.set((i - 4) * .04, 0, -.42); pose.rotation.set(-Math.PI / 2 - .08, 0, (i - 4) * .1); pose.scale.set(.8, 1.7 - Math.abs(i - 4) * .14, .8); pose.updateMatrix(); tail.setMatrixAt(i, pose.matrix); }
  // ---- sistemas instanciados
  const glow = softParticles(T, 1500), smoke = softParticles(T, 260, { additive: false }), decals = groundDecals(T, 40), rib = ribbons(T, 3600, { flow: 16 });
  const debrisGeo = new T.DodecahedronGeometry(.09, 0), debrisMat = new T.MeshStandardMaterial({ color: 0x2a1a14, emissive: 0x401004, roughness: 1 });
  const debris = new T.InstancedMesh(debrisGeo, debrisMat, 60); debris.frustumCulled = false;
  root.add(glow.mesh, smoke.mesh, decals.mesh, rib.mesh, debris);
  // rastro persistente da fênix: histórico com tempo (os laços das duas voltas ficam no ar e somem aos poucos)
  let burned = false; const HN = 260, hist = Array.from({ length: HN }, () => ({ x: 0, y: 0, z: 0, t: -99 })); let head0 = 0, lastPush = -1;
  const dummy = new T.Object3D(), fwd = new T.Vector3(0, 0, 1), dir = new T.Vector3(), prev = new T.Vector3(), nrm = [0, 1, 0];
  const F1 = [1, .5, .06, 1], F2 = [1, .85, .35, 1], F3 = [.85, .12, .02, 1], c4 = (c, a) => [c[0], c[1], c[2], a];

  function update(s, camera, quality = 1) {
    root.visible = s.active; if (!s.active) { lastPush = -1; burned = false; return; }
    if (s.phase === 'cast') burned = false;
    const t = s.time, ph = s.phase, A = s.age, low = quality === 0;
    for (const m of [coreMat, skinMat, shellMat, colMat, featherMat]) m.uniforms.time.value = t;
    rib.begin(camera, t); glow.begin(); smoke.begin(); decals.begin();
    const fadeAll = ph === 'fade' ? Math.max(0, 1 - A / .6) : 1;
    // ---------- tornado (forma, viagem, captura; desmancha na explosão)
    const tornadoOn = ['form', 'flight', 'capture', 'burst'].includes(ph) || (ph === 'fade' && s.hold);
    const grow = ph === 'form' ? easeOut(A / .8) : ph === 'burst' ? 1 - smooth(A / .35) : ph === 'fade' ? 0 : 1;
    const widen = ph === 'capture' ? 1 + .35 * smooth(A / .6) : ph === 'burst' ? 1.35 : 1;
    core.visible = skin.visible = tornadoOn && grow > .01;
    const R = S.tornadoRadius * widen * grow, H = S.tornadoHeight * grow * (ph === 'capture' ? 1.15 : 1);
    core.position.set(s.p.x, s.p.y, s.p.z); core.scale.set(R, H, R); core.rotation.y = -t * 2.6;
    skin.position.copy(core.position); skin.scale.set(R * 1.12, H * 1.02, R * 1.12); skin.rotation.y = t * 3.4;
    coreMat.uniforms.alpha.value = (ph === 'capture' ? .55 : .8) * fadeAll; skinMat.uniforms.alpha.value = (ph === 'capture' ? .5 : .7) * fadeAll;
    if (core.visible) {
      const layers = low ? 3 : 5, rows = low ? 18 : 30;
      for (let l = 0; l < layers; l++) {
        const sp = (l % 2 ? -1 : 1) * (2.6 + l * .5), off = l * 1.3;
        for (let j = 0; j < rows; j++) {
          const u0 = j / rows, u1 = (j + 1) / rows, rr = u => (.38 + u * .95 + .12 * Math.sin(u * 20 + t * 5 + l)) * R, a = u => u * Math.PI * 7 + t * sp + off;
          const y0 = s.p.y + u0 * 3.4 * H, y1 = s.p.y + u1 * 3.4 * H, w = (.08 + .16 * Math.sin(u0 * Math.PI)) * R;
          const c = l === 0 ? c4(F2, .9 * fadeAll) : l % 2 ? c4(F1, .75 * fadeAll) : c4(F3, .7 * fadeAll);
          rib.seg(s.p.x + Math.cos(a(u0)) * rr(u0), y0, s.p.z + Math.sin(a(u0)) * rr(u0), s.p.x + Math.cos(a(u1)) * rr(u1), y1, s.p.z + Math.sin(a(u1)) * rr(u1), w, w, c, c, u0, u1);
        }
      }
      const ne = low ? 50 : 140;
      for (let i = 0; i < ne; i++) {
        const u = ((i / ne) + t * (.25 + (i % 5) * .04)) % 1, a = i * 2.399 + t * (3 + (i % 3)), r = (.5 + u * 1.35) * R;
        const x = s.p.x + Math.cos(a) * r, z = s.p.z + Math.sin(a) * r, y = s.p.y + u * 3.6 * H;
        if (i % 3) glow.add(x, y, z, .07, .32, 1, .55 + .3 * (i % 2), .12, (1 - u) * fadeAll, 3, a + Math.PI / 2);
        else glow.add(x, y, z, .35, .35, 1, .45, .08, .5 * (1 - u) * fadeAll, 0);
      }
      for (let i = 0; i < (low ? 4 : 10); i++) { const a = i * 1.7 + t * 2, r = R * (1.3 + .25 * Math.sin(t * 3 + i)); smoke.add(s.p.x + Math.cos(a) * r, s.p.y + .3 + (i % 3) * .2, s.p.z + Math.sin(a) * r, 1.4 * R, 1.1 * R, .22, .16, .14, .35 * fadeAll, 1, a, i); }
      const n = groundNormal(ground, s.p.x, s.p.z, nrm);
      decals.add(s.p.x, ground(s.p.x, s.p.z), s.p.z, 2.4 * R, 1, .4, .08, .55 * fadeAll, 2, 0, 1, n);
      decals.add(s.p.x, ground(s.p.x, s.p.z), s.p.z, 2 * R, 1, .55, .15, .45 * fadeAll, 0, ((t * .8) % 1), 2, n, t);
      if (ph === 'capture') { // rajadas de vento girando em volta do alvo preso
        for (let k = 0; k < (low ? 3 : 6); k++) {
          const base = t * 5 + k * 1.05, rr = R * (1.15 + .1 * k), y = s.p.y + .6 + k * .45;
          for (let j = 0; j < 8; j++) { const a0 = base + j * .12, a1 = base + (j + 1) * .12, w = .05 * Math.sin((j + .5) / 8 * Math.PI);
            rib.seg(s.p.x + Math.cos(a0) * rr, y + j * .03, s.p.z + Math.sin(a0) * rr, s.p.x + Math.cos(a1) * rr, y + (j + 1) * .03, s.p.z + Math.sin(a1) * rr, w, w, [1, .9, .75, .6], [1, .9, .75, .6], j / 8, (j + 1) / 8); }
        }
      }
    }
    // ---------- explosão do tornado
    shell.visible = column.visible = false; debris.count = 0;
    const blast = (cx, cy, cz, age, scale, dur) => {
      const k = age / dur; if (k < 0 || k >= 1) return;
      shell.visible = true; shell.position.set(cx, cy, cz); shell.scale.setScalar((.6 + 4.2 * easeOut(k)) * scale); shell.rotation.set(t * .5, t * .7, 0);
      shellMat.uniforms.alpha.value = (1 - smooth(k)) * 1.1; shellMat.uniforms.heat.value = 1.8 - k;
      column.visible = true; column.position.set(cx, ground(cx, cz), cz); column.scale.set((1 + 2.2 * easeOut(k)) * scale, (2 + 9 * easeOut(k * 1.3)) * scale, (1 + 2.2 * easeOut(k)) * scale);
      colMat.uniforms.alpha.value = (1 - smooth((k - .3) / .7)) * 1.1;
      const n = groundNormal(ground, cx, cz, nrm), gy = ground(cx, cz);
      decals.add(cx, gy, cz, (1 + 9 * easeOut(k)) * scale, 1, .55, .18, (1 - k) * .95, 0, k, 3, n);
      decals.add(cx, gy, cz, 3.2 * scale, .9, .3, .05, (1 - smooth(k)) * .9, 2, 0, 4, n);
      if (k < .18) glow.add(cx, cy, cz, 9 * scale * (1 - k / .18) + 1, 9 * scale * (1 - k / .18) + 1, 1, .92, .7, 1 - k / .18, 0);
      const nb = low ? 30 : 80;
      for (let i = 0; i < nb; i++) { const a = i * 2.399, el = hash(i) * 1.2 - .1, sp = (6 + hash(i * 3) * 9) * scale, d = age * sp * (1 - k * .5);
        const x = cx + Math.cos(a) * Math.cos(el) * d, y = cy + Math.sin(el) * d + 1 - 4 * age * age, z = cz + Math.sin(a) * Math.cos(el) * d;
        glow.add(x, Math.max(y, ground(x, z) + .05), z, .08, .5, 1, .6 + .3 * hash(i + 1), .15, (1 - k), 3, a + Math.PI / 2); }
      for (let i = 0; i < (low ? 6 : 14); i++) { const a = i * 1.9, d = (1 + 3.5 * easeOut(k)) * scale; smoke.add(cx + Math.cos(a) * d, gy + .6 + k * 3 + (i % 3) * .5, cz + Math.sin(a) * d, (1.6 + 3 * k) * scale, (1.6 + 3 * k) * scale, .16, .12, .11, .5 * (1 - smooth((k - .2) / .8)), 1, a, i); }
    };
    if (ph === 'burst') blast(s.p.x, s.p.y + 2.2, s.p.z, A, 1, PHOENIX_BURST);
    if (ph === 'impact' || (ph === 'burn' && A < .3)) {
      const age = ph === 'impact' ? A : .6 + A; blast(s.aim.x, s.aim.y, s.aim.z, age, .85, .9);
      // detritos com gravidade, presos ao terreno
      const nd = low ? 20 : 60, k = age / .9; let nn = 0;
      for (let i = 0; i < nd && k < 1; i++) { const a = i * 2.4, sp = 3 + hash(i * 5) * 6, vy = 3 + hash(i * 9) * 6, x = s.aim.x + Math.cos(a) * sp * age, z = s.aim.z + Math.sin(a) * sp * age;
        const y = Math.max(ground(x, z) + .05, s.aim.y + vy * age - 9.8 * age * age); dummy.position.set(x, y, z); dummy.rotation.set(t * 7 + i, t * 5, 0); dummy.scale.setScalar((.6 + hash(i) * .9) * (1 - k * .5)); dummy.updateMatrix(); debris.setMatrixAt(nn++, dummy.matrix); }
      debris.count = nn; debris.instanceMatrix.needsUpdate = true;
    }
    if (ph === 'burn') burned = true;
    if (ph === 'burn' || (ph === 'fade' && burned)) { // queimadura residual: marca e chamas baixas que diminuem
      const k = ph === 'burn' ? 1 - A / 3.6 : (1 - A / .6) * .15, gy = ground(s.aim.x, s.aim.z), n = groundNormal(ground, s.aim.x, s.aim.z, nrm);
      decals.add(s.aim.x, gy, s.aim.z, 2.2, 1, .45, .1, .9 * k, 1, 0, 9, n);
      for (let i = 0; i < (low ? 8 : 22); i++) { const a = i * 2.4 + t * .5, r = .3 + hash(i) * 1.3, u = (t * (.8 + hash(i + 2) * .6) + hash(i)) % 1;
        glow.add(s.aim.x + Math.cos(a) * r, gy + u * 1.6 * k + .1, s.aim.z + Math.sin(a) * r, .25 + (1 - u) * .45, .4 + (1 - u) * .7, 1, .5 + .3 * u, .08, (1 - u) * k, i % 3 ? 0 : 3, 0); }
    }
    // ---------- fênix
    bird.visible = ['form', 'flight', 'capture', 'burst', 'orbit', 'ascend', 'dive'].includes(ph);
    bird.position.set(s.bird.x, s.bird.y, s.bird.z); bird.scale.setScalar(S.phoenix * (ph === 'form' ? easeOut(A / .8) : 1));
    if (lastPush >= 0) { dir.set(s.bird.x - prev.x, s.bird.y - prev.y, s.bird.z - prev.z); if (dir.lengthSq() > 1e-7) { dir.normalize(); bird.quaternion.slerp(dummy.quaternion.setFromUnitVectors(fwd, dir), .35); } }
    const flapRate = ph === 'dive' ? 0 : ph === 'ascend' ? 9 : 12, fold = ph === 'dive' ? .9 : 0;
    wings.forEach((w, i) => { const sg = i ? 1 : -1, f = Math.sin(t * flapRate); w.rotation.z = sg * (.1 + f * .55 - fold * .2); w.rotation.y = sg * fold * .9; w.userData.fore.rotation.z = sg * (f * .35 + .1); });
    if (bird.visible) {
      glow.add(s.bird.x, s.bird.y, s.bird.z, 2.6, 2.6, 1, .55, .12, .55, 0); glow.add(s.bird.x, s.bird.y, s.bird.z, 1.2, 1.2, 1, .9, .55, .7, 0);
      if (t - lastPush > 1 / 60 || lastPush < 0) { head0 = (head0 + 1) % HN; Object.assign(hist[head0], { x: s.bird.x, y: s.bird.y, z: s.bird.z, t }); lastPush = t; }
    }
    prev.set(s.bird.x, s.bird.y, s.bird.z);
    // rastros no ar: até 1,8 s de vida (2,6 s nas voltas), largura e alfa decaem com a idade
    const life = ['orbit', 'ascend'].includes(ph) ? 2.6 : 1.8;
    for (let k = 0; k < HN - 1; k++) {
      const a = hist[(head0 - k + HN) % HN], b = hist[(head0 - k - 1 + HN) % HN]; const ag = t - a.t; if (ag > life || b.t < 0 || t - b.t > life) break;
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 3) continue;
      const fa = 1 - ag / life, fb = 1 - (t - b.t) / life, wa = .38 * fa * fa + .04, wb = .38 * fb * fb + .04;
      rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, wa, wb, c4(F1, fa * .95), c4(F3, fb * .8), k / 40, (k + 1) / 40);
      if (!low && k % 2 === 0) rib.seg(a.x, a.y + .08, a.z, b.x, b.y + .08, b.z, wa * .3, wb * .3, c4(F2, fa), c4(F2, fb), k / 40, (k + 1) / 40);
      if (!low && k % 9 === 0 && fa > .2) glow.add(a.x + Math.sin(k + t * 3) * .3, a.y - ag * .8, a.z + Math.cos(k) * .3, .07, .3, 1, .6, .15, fa, 3, k);
    }
    if (ph === 'dive') { // linhas de velocidade convergindo
      for (let i = 0; i < (low ? 4 : 10); i++) { const a = i * .63, r = .9 + (i % 3) * .3, x = s.bird.x + Math.cos(a) * r, z = s.bird.z + Math.sin(a) * r;
        rib.seg(x, s.bird.y + 1.2, z, x, s.bird.y + 4 + (i % 4), z, .025, .005, [1, .9, .6, .8], [1, .5, .1, 0], 0, 1); }
    }
    rib.end(); glow.end(); smoke.end(); decals.end(t);
  }
  const PHOENIX_BURST = .8;
  return { root, update, clear() { root.visible = false; lastPush = -1; burned = false; for (const h of hist) h.t = -99; },
    dispose() { scene.remove(root); for (const g of [funnel, shellGeo, colGeo, featherGeo, bodyGeo, debrisGeo]) g.dispose(); for (const m of [coreMat, skinMat, shellMat, colMat, featherMat, goldMat, debrisMat]) m.dispose(); feathersMeshes.forEach(m => m.dispose()); debris.dispose(); glow.dispose(); smoke.dispose(); decals.dispose(); rib.dispose(); } };
}
