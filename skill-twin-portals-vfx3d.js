import { softParticles, groundDecals, groundNormal, ribbons, smooth, easeOut, hash } from './celestial-fxkit3d.js';
/**
 * MOD 233 — Portais da Perseguição (VFX).
 * Cada portal tem aro de energia animado, disco interno escuro com redemoinho na cor do portal (rubro à esquerda,
 * violeta à direita), um túnel cônico atrás do disco que dá profundidade quando visto de lado e fragmentos que giram e
 * são sugados. Abrem com sobressalto e fecham colapsando numa linha e num clarão.
 * Cada fio tem cabeça luminosa e rastro 3D contínuo da sua própria rota, com faíscas que seguem a curva; cada acerto
 * tem um estouro pequeno. A convergência termina numa esfera de pressão rubro-violeta e num anel de choque no chão.
 */
const PORTAL_VERT = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const DISC_FRAG = `varying vec2 vUv; uniform float time, alpha, open; uniform vec3 col;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 p=vUv*2.-1.; float d=length(p); if(d>1.) discard; float a=atan(p.y,p.x);
 float sw=a*3.+log(d+.05)*4.-time*3.;                                   // braços do redemoinho caindo para dentro
 float arms=smoothstep(.35,1.,.5+.5*sin(sw))*n2(vec2(a*4.,d*6.-time*2.));
 float depth=smoothstep(.0,.9,d);                                       // centro quase negro: dá a sensação de fundo
 vec3 c=mix(vec3(.01,.0,.02),col*.55,depth*.6)+col*arms*(.4+.9*depth);
 c+=col*exp(-pow((d-.95)/.05,2.))*1.6;
 float al=alpha*smoothstep(1.,.93,d)*(.82+.18*depth);
 gl_FragColor=vec4(c*al,al); }`;
const RIM_FRAG = `varying vec2 vUv; uniform float time, alpha; uniform vec3 col;
float h(float p){return fract(sin(p*91.7)*47453.3);}
void main(){ float u=vUv.x, v=abs(vUv.y*2.-1.); float flow=.6+.4*sin(u*80.-time*14.)+.3*sin(u*23.+time*5.);
 vec3 c=mix(col,vec3(1.,.95,.95),pow(1.-v,6.)*.8)*(1.4+flow*.6); float a=alpha*pow(1.-v,1.5)*(.7+.3*flow);
 gl_FragColor=vec4(c*a,a); }`;
const TUNNEL_FRAG = `varying vec2 vUv; uniform float time, alpha; uniform vec3 col;
void main(){ float streak=pow(.5+.5*sin(vUv.x*40.+vUv.y*6.-time*7.),8.); float k=vUv.y;
 vec3 c=mix(vec3(.0),col*.6,k*k)+col*streak*k*.6; float a=alpha*(.55+.45*k); gl_FragColor=vec4(c*a,a); }`;

export function createTwinPortalsVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'PortaisPerseguicao'; root.visible = false; scene.add(root);
  const COL = [new T.Color(1, .1, .18), new T.Color(.62, .22, 1)];
  const mat = (frag, col, side = T.DoubleSide) => new T.ShaderMaterial({ vertexShader: PORTAL_VERT, fragmentShader: frag, transparent: true, depthWrite: false, side, toneMapped: false, fog: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, uniforms: { time: { value: 0 }, alpha: { value: 1 }, open: { value: 1 }, col: { value: col } } });
  const discGeo = new T.CircleGeometry(1, 48), rimGeo = new T.TorusGeometry(1, .075, 10, 72), tunGeo = new T.CylinderGeometry(.98, .25, 1.4, 40, 1, true);
  tunGeo.rotateX(Math.PI / 2); tunGeo.translate(0, 0, -.7);
  const portals = COL.map(c => {
    const g = new T.Group(); root.add(g);
    const disc = new T.Mesh(discGeo, mat(DISC_FRAG, c)), rim = new T.Mesh(rimGeo, mat(RIM_FRAG, c)), rim2 = new T.Mesh(rimGeo, mat(RIM_FRAG, c)), tun = new T.Mesh(tunGeo, mat(TUNNEL_FRAG, c, T.BackSide));
    rim2.scale.setScalar(1.12); rim2.material.uniforms.alpha.value = .5; g.add(tun, disc, rim, rim2); return { g, disc, rim, rim2, tun, col: [c.r, c.g, c.b] };
  });
  const shardGeo = new T.TetrahedronGeometry(.07, 0), shardMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false, vertexColors: false });
  const shards = new T.InstancedMesh(shardGeo, shardMat, 80); shards.frustumCulled = false; shards.instanceColor = new T.InstancedBufferAttribute(new Float32Array(80 * 3), 3); root.add(shards);
  const sphereGeo = new T.IcosahedronGeometry(1, 3), sphereMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false, uniforms: { alpha: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float alpha, time; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),1.6); float m=.5+.5*sin(atan(vP.z,vP.x)*3.+vP.y*4.+time*3.); vec3 c=mix(vec3(1.,.12,.22),vec3(.62,.24,1.),m); gl_FragColor=vec4(c*(.35+f*1.5),(.08+f)*alpha); }' });
  const sphere = new T.Mesh(sphereGeo, sphereMat); root.add(sphere);
  const glow = softParticles(T, 900), decals = groundDecals(T, 14), rib = ribbons(T, 1500, { flow: 26 }); root.add(glow.mesh, decals.mesh, rib.mesh);
  const HN = 48, hist = Array.from({ length: 8 }, () => Array.from({ length: HN }, () => ({ x: 0, y: 0, z: 0, t: -9 }))), heads = new Array(8).fill(0); let lastT = -1;
  const dummy = new T.Object3D(), fwd = new T.Vector3(), nrm = [0, 1, 0], c4 = (c, a) => [c[0], c[1], c[2], a], W = [1, .96, .96, 1], color = new T.Color();
  function update(s, camera, quality = 1) {
    root.visible = s.active; if (!s.active) { lastT = -1; return; }
    const t = s.time, A = s.age, ph = s.phase, low = quality === 0;
    rib.begin(camera, t); glow.begin(); decals.begin(); sphereMat.uniforms.time.value = t;
    // ---- portais: abrem com sobressalto, fecham colapsando
    const openK = ph === 'open' ? easeOut(A / .45) * (1 + .12 * Math.sin(Math.min(1, A / .6) * Math.PI)) : ph === 'close' ? 1 - smooth(A / .45) : 1;
    const squash = ph === 'close' ? Math.max(.02, 1 - smooth(A / .3)) : 1;
    let ns = 0;
    portals.forEach((P, i) => {
      const at = s.portals[i]; P.g.visible = openK > .01; P.g.position.set(at.x, at.y, at.z);
      const sd = i ? 1 : -1; fwd.set(-s.f.x * .7 + s.r.x * sd * .62, .08, -s.f.z * .7 + s.r.z * sd * .62).normalize(); P.g.lookAt(at.x + fwd.x, at.y + fwd.y, at.z + fwd.z); // de frente para o jogador, voltado um pouco para fora
      P.g.scale.set(1.05 * openK, 1.05 * openK * squash, 1.05 * Math.max(.2, openK));
      for (const m of [P.disc, P.rim, P.rim2, P.tun]) { m.material.uniforms.time.value = t + i * 3; }
      P.disc.material.uniforms.alpha.value = P.rim.material.uniforms.alpha.value = P.tun.material.uniforms.alpha.value = Math.min(1, openK * 1.3);
      P.rim.rotation.z = t * (i ? -1.4 : 1.4); P.rim2.rotation.z = -t * .7;
      // fragmentos: giram no aro e são sugados para o centro
      const n = low ? 14 : 36;
      for (let k = 0; k < n && P.g.visible; k++) { const u = ((k / n) + t * .55 + i * .3) % 1, a = k * 2.39996 + t * (i ? -2 : 2), r = (1.35 - u * 1.1) * openK;
        dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, -u * .5); dummy.position.applyQuaternion(P.g.quaternion).add(P.g.position);
        dummy.rotation.set(t * 3 + k, t * 2, k); dummy.scale.setScalar((1 - u) * 1.3 + .2); dummy.updateMatrix(); shards.setMatrixAt(ns, dummy.matrix);
        color.setRGB(P.col[0] * 1.4 + .2, P.col[1] * 1.4 + .2, P.col[2] * 1.4 + .2); shards.setColorAt(ns++, color);
        if (k % 3 === 0) glow.add(dummy.position.x, dummy.position.y, dummy.position.z, .14, .14, P.col[0], P.col[1], P.col[2], .9 * (1 - u), 2, a, k); }
      if (P.g.visible) glow.add(at.x, at.y, at.z, 3.2 * openK, 3.2 * openK, P.col[0], P.col[1], P.col[2], .28, 0);
      if (ph === 'close' && A > .28 && A < .5) { const k = 1 - (A - .28) / .22; glow.add(at.x, at.y, at.z, 3 * k, .3, 1, .9, 1, k, 2, 0); }
    });
    shards.count = ns; shards.instanceMatrix.needsUpdate = true; if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
    // ---- fios: cabeça, rastro da rota real e faíscas que seguem a curva
    if (t !== lastT) { s.threads.forEach((th, i) => { if (th.phase === 'flight') { heads[i] = (heads[i] + 1) % HN; Object.assign(hist[i][heads[i]], { x: th.p.x, y: th.p.y, z: th.p.z, t }); } }); lastT = t; }
    s.threads.forEach((th, i) => {
      const P = portals[th.side < 0 ? 0 : 1], C = P.col, H = hist[i], life = .5;
      if (th.phase === 'flight') { glow.add(th.p.x, th.p.y, th.p.z, .75, .75, C[0], C[1], C[2], .95, 0); glow.add(th.p.x, th.p.y, th.p.z, .28, .28, 1, .95, .98, 1, 0); glow.add(th.p.x, th.p.y, th.p.z, 1.3, .1, 1, .9, 1, .8, 2, t * 6 + i); }
      for (let k = 0; k < HN - 1; k++) {
        const a = H[(heads[i] - k + HN) % HN], b = H[(heads[i] - k - 1 + HN) % HN]; if (b.t < 0 || t - b.t > life) break;
        const fa = 1 - (t - a.t) / life, fb = 1 - (t - b.t) / life;
        rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, .13 * fa + .02, .13 * fb + .02, c4(C, fa), c4(C, fb * .7), k / 16, (k + 1) / 16);
        if (!low && k < 18) rib.seg(a.x, a.y, a.z, b.x, b.y, b.z, .035 * fa, .035 * fb, c4(W, fa), c4(W, fb * .6), k / 16, (k + 1) / 16);
        if (!low && k % 6 === 3) glow.add(a.x + Math.sin(k + t * 9 + i) * .12, a.y + Math.cos(k * 1.3 + t * 7) * .12, a.z, .045, .2, C[0], C[1], C[2], fa, 3, k + i, k);
      }
      // estouro de cada acerto (ou no obstáculo), distribuído no tempo
      const age = th.endAt >= 0 ? t - th.endAt : -1;
      if ((th.phase === 'hit' || th.phase === 'wall' || th.phase === 'spent') && age >= 0 && age < .45) {
        const k = 1 - age / .45, P2 = th.at, big = th.phase === 'hit' ? 1 : .6;
        if (age < .1) glow.add(P2.x, P2.y, P2.z, 2.2 * big * (1 - age / .1) + .3, 2.2 * big * (1 - age / .1) + .3, 1, .9, .95, 1, 0);
        for (let j = 0; j < (low ? 5 : 12); j++) { const a = j * 2.39996 + i, el = (hash(j + i * 7) - .3) * 1.6, sp = 3 + hash(j * 3 + i) * 4, d = sp * age;
          glow.add(P2.x + Math.cos(a) * Math.cos(el) * d, P2.y + Math.sin(el) * d - 3 * age * age, P2.z + Math.sin(a) * Math.cos(el) * d, .05, .3, C[0] + .2, C[1] + .2, C[2] + .2, k, 3, a + Math.PI / 2, j); }
        const gy = ground(P2.x, P2.z); if (P2.y - gy < 2.5) decals.add(P2.x, gy, P2.z, 1 + 1.6 * easeOut(age / .45), C[0], C[1], C[2], k * .8, 0, age / .45, i, groundNormal(ground, P2.x, P2.z, nrm));
      }
    });
    // ---- convergência: esfera de pressão e anel de choque no chão
    sphere.visible = ph === 'burst';
    if (ph === 'burst') {
      const c = s.center, k = A / .9; sphere.position.set(c.x, c.y, c.z); sphere.scale.setScalar(.4 + 2.6 * easeOut(Math.min(1, A / .3)) * (1 - smooth((A - .55) / .35) * .5)); sphereMat.uniforms.alpha.value = 1 - smooth((A - .4) / .5);
      if (A < .14) { const q = 1 - A / .14; glow.add(c.x, c.y, c.z, 6 * q + .5, 6 * q + .5, 1, .85, .95, q, 0); }
      const gy = ground(c.x, c.z), n = groundNormal(ground, c.x, c.z, nrm);
      decals.add(c.x, gy, c.z, 1 + 7 * easeOut(k), 1, .25, .6, (1 - k) * .95, 0, k, 21, n); decals.add(c.x, gy, c.z, 2.6, .8, .2, .7, (1 - smooth(k)) * .8, 1, k, 22, n);
      for (let j = 0; j < (low ? 16 : 44); j++) { const a = j * 2.39996, el = hash(j) * 1.2 - .2, sp = 5 + hash(j * 5) * 7, d = sp * easeOut(A / .6), C = j % 2 ? portals[0].col : portals[1].col;
        glow.add(c.x + Math.cos(a) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.sin(a) * Math.cos(el) * d, .07, .45, C[0] + .2, C[1] + .2, C[2] + .2, 1 - k, 3, a + Math.PI / 2, j); }
    }
    rib.end(); glow.end(); decals.end(t);
  }
  return { root, update, clear() { root.visible = false; lastT = -1; for (const H of hist) for (const h of H) h.t = -9; },
    dispose() { scene.remove(root); for (const g of [discGeo, rimGeo, tunGeo, shardGeo, sphereGeo]) g.dispose(); for (const P of portals) for (const m of [P.disc, P.rim, P.rim2, P.tun]) m.material.dispose(); shardMat.dispose(); sphereMat.dispose(); shards.dispose(); glow.dispose(); decals.dispose(); rib.dispose(); } };
}
