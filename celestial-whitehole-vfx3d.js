import { softParticles, groundDecals, groundNormal, ribbons, lightningBolt, smooth, easeOut, easeIn, hash } from './celestial-fxkit3d.js';
/**
 * MOD 229 — Julgamento Divino: Colapso da Luz Eterna (VFX). Mantém a identidade: disco NEGRO absoluto + coroa BRANCA.
 *  • Asas celestiais nascem primeiro nas costas do herói: as asas do prólogo (Asas.glb) com material de luz (fresnel,
 *    borda iridescente, dissolução por ruído) e uma camada de penas de energia instanciadas por cima; abrem com pulso de
 *    vento, batem na subida e se desfazem em penas de luz no fim.
 *  • Fissura celeste ramificada, coroa 3D com turbulência (shader de fBm radial, filamentos e anel de "lente"),
 *    partículas de luz em órbita, fragmentos sugados e rastro no lançamento.
 *  • Impacto: implosão curta → casca branca em camadas, ondas de choque 3D e no chão, explosão de partículas de luz,
 *    marca no terreno. O clima (céu carmesim, nuvens, chuva, raios, vento) é o módulo celestial-storm3d.js.
 * Nenhuma luz dinâmica; buffers fixos. O dano é só da linha do tempo (celestial-whitehole3d.js).
 */
const CORONA_VERT = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const CORONA_FRAG = `varying vec2 vUv; uniform float time, alpha;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.07;a*=.5;}return s;}
void main(){
 vec2 p=vUv*2.-1.; float d=length(p)*2.; float ang=atan(p.y,p.x);
 if(d<.86) discard;                                              // o centro é o disco negro (malha 3D própria)
 float ring=exp(-pow((d-.975)/.045,2.))*2.2;                     // aro ofuscante
 float lens=exp(-pow((d-1.07)/.05,2.))*(.55+.45*sin(ang*3.-time*.7)); // anel de "lente": luz curvada em volta do disco
 float streak=fbm(vec2(ang*7.,d*2.2-time*.35))*fbm(vec2(ang*23.+time*.2,d*5.));
 float corona=pow(streak,1.6)*2.4*exp(-(d-.95)*2.1);              // turbulência fina da coroa
 float fil=pow(max(0.,sin(ang*41.+fbm(vec2(ang*5.,time*.3))*9.)),40.)*exp(-(d-.95)*3.)*1.2; // filamentos
 float a=(ring+lens*.6+corona+fil)*alpha*smoothstep(2.,1.55,d);
 if(a<.004) discard;
 vec3 c=mix(vec3(.82,.9,1.),vec3(1.),clamp(ring,0.,1.));
 gl_FragColor=vec4(c*a,a);
}`;
const WING_VERT = `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
const WING_FRAG = `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float time, alpha, dissolve;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 float n=n3(vP*3.2+time*.15); if(n<dissolve) discard;
 float f=pow(1.-abs(dot(normalize(vN),vV)),2.2);
 vec3 irid=.5+.5*cos(6.2831*(f*.8+vec3(0.,.33,.67)+time*.05));    // borda iridescente
 vec3 c=mix(vec3(1.,.97,.9),vec3(1.,.86,.55),.25+.25*sin(vP.y*4.+time));
 c=mix(c,irid,f*.45)+vec3(1.,.95,.8)*f*1.2;
 float burn=smoothstep(dissolve+.08,dissolve,n);                     // borda dourada que queima ao dissolver
 c=mix(c,vec3(1.,.8,.35)*2.,burn);
 gl_FragColor=vec4(c*1.15,alpha);
}`;

export function createWhiteHoleVFX(T, scene, { ground = () => 0 } = {}) {
  const root = new T.Group(); root.name = 'ColapsoLuzEterna'; root.visible = false; scene.add(root);
  const portal = new T.Group(); root.add(portal);
  const black = new T.MeshBasicMaterial({ color: 0x000000, toneMapped: false, fog: false });
  const lensGeo = new T.SphereGeometry(.86, 48, 24), lens = new T.Mesh(lensGeo, black); lens.scale.z = .055; portal.add(lens);
  const white = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false, fog: false, uniforms: { time: { value: 0 }, alpha: { value: 1 } },
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;uniform float time;uniform float alpha;void main(){float a=atan(p.y,p.x);float f=.82+.18*sin(a*19.-time*3.+sin(a*7.+time));gl_FragColor=vec4(vec3(1.),alpha*f);}' });
  const ringGeo = new T.TorusGeometry(.975, .07, 14, 160), ring = new T.Mesh(ringGeo, white); portal.add(ring);
  const coronaMat = new T.ShaderMaterial({ vertexShader: CORONA_VERT, fragmentShader: CORONA_FRAG, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, toneMapped: false, fog: false, uniforms: { time: { value: 0 }, alpha: { value: 1 } } });
  const coronaGeo = new T.PlaneGeometry(4, 4), corona = new T.Mesh(coronaGeo, coronaMat); corona.position.z = -.01; portal.add(corona);
  const filamentGeo = new T.TorusGeometry(1.16, .005, 4, 120, Math.PI * 1.3); const filaments = [];
  for (let i = 0; i < 3; i++) { const m = new T.Mesh(filamentGeo, white); m.rotation.x = .12 * (i - 1); m.scale.setScalar(1 + i * .035); portal.add(m); filaments.push(m); }
  // explosão: casca branca e ondas 3D
  const shellGeo = new T.IcosahedronGeometry(1, 3), shellMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false, uniforms: { alpha: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform float alpha; void main(){ float f=pow(1.-abs(dot(normalize(vN),vV)),1.5); gl_FragColor=vec4(vec3(1.,.98,.94),(.15+f)*alpha); }' });
  const shells = [0, 1, 2].map(() => { const m = new T.Mesh(shellGeo, shellMat.clone()); root.add(m); return m; });
  const shockGeo = new T.TorusGeometry(1, .035, 8, 128), shocks = [0, 1].map(() => { const m = new T.Mesh(shockGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); root.add(m); return m; });
  // fragmentos sugados e feixe da espada
  const rockGeo = new T.DodecahedronGeometry(.14, 0), rockMat = new T.MeshStandardMaterial({ color: 0x3a3330, roughness: 1, emissive: 0x220000 });
  const debris = new T.InstancedMesh(rockGeo, rockMat, 100); debris.frustumCulled = false; root.add(debris);
  const glow = softParticles(T, 1400), decals = groundDecals(T, 12), rib = ribbons(T, 1600, { flow: 18 }); root.add(glow.mesh, decals.mesh, rib.mesh);
  // ---- asas
  const wingHolder = new T.Group(); wingHolder.visible = false; root.add(wingHolder);
  const wingMat = new T.ShaderMaterial({ vertexShader: WING_VERT, fragmentShader: WING_FRAG, transparent: true, side: T.DoubleSide, toneMapped: false, fog: false, uniforms: { time: { value: 0 }, alpha: { value: 1 }, dissolve: { value: 0 } } });
  const wingL = new T.Group(), wingR = new T.Group(); wingHolder.add(wingL, wingR);
  // penas de energia instanciadas (três fileiras por asa): dão volume e funcionam sozinhas se o GLB não carregar
  const featherGeo = new T.ConeGeometry(.07, 1, 5, 1); featherGeo.translate(0, -.5, 0); featherGeo.scale(1, 1, .3);
  const energyMat = wingMat.clone(); energyMat.uniforms = wingMat.uniforms; energyMat.blending = T.AdditiveBlending; energyMat.depthWrite = false;
  const pose = new T.Object3D(), energy = [];
  for (const [g, sg] of [[wingL, 1], [wingR, -1]]) {
    const m = new T.InstancedMesh(featherGeo, energyMat, 46); let i = 0;
    for (let row = 0; row < 3; row++) { const n = [18, 15, 13][row];
      for (let k = 0; k < n; k++) { const u = k / (n - 1), x = sg * (.1 + u * 1.55 * (1 - row * .12)), y = .2 + Math.sin(u * Math.PI * .85) * .55 - row * .12;
        pose.position.set(x, y, -.05 - row * .03); pose.rotation.set(0, 0, sg * (.15 + u * .9)); pose.scale.set(1.2 - row * .2, (.55 + u * .9) * (1 - row * .25), 1); pose.updateMatrix(); m.setMatrixAt(i++, pose.matrix); } }
    m.count = i; g.add(m); energy.push(m);
  }
  let glbWings = null;
  function setWings(obj) { if (!obj || glbWings) return; glbWings = obj;
    const L = obj.getObjectByName('AsaEsquerda'), R = obj.getObjectByName('AsaDireita');
    for (const [src, dst] of [[L, wingL], [R, wingR]]) if (src) { const c = src.clone(); c.traverse(o => { if (o.isMesh) { o.material = wingMat; o.frustumCulled = false; } }); dst.add(c); dst.userData.glb = c; }
  }
  const dummy = new T.Object3D(), from = new T.Vector3(), to = new T.Vector3(), dir = new T.Vector3(), up = new T.Vector3(0, 1, 0), nrm = [0, 1, 0], segs = Array.from({ length: 60 }, () => null);
  const W = [1, 1, 1, 1], col = (a) => [1, 1, 1, a];

  /** hero: { pos: Vector3 (costas, na altura da coluna), yaw, scale } — vem da integração, para as asas seguirem o modelo. */
  function update(s, camera, quality = 1, hero = null) {
    root.visible = s.active; if (!s.active) return;
    const t = s.time, origin = s.source, target = s.target, low = quality === 0, fade = t > 14 ? Math.max(0, 1 - (t - 14) / 3) : 1;
    white.uniforms.time.value = coronaMat.uniforms.time.value = wingMat.uniforms.time.value = t; white.uniforms.alpha.value = coronaMat.uniforms.alpha.value = fade;
    rib.begin(camera, t); glow.begin(); decals.begin();
    // --------- asas (primeiro de tudo)
    wingHolder.visible = !!hero && t < 14.8;
    if (wingHolder.visible) {
      const open = easeOut(t / .9), dis = smooth((t - 13.2) / 1.4);
      wingHolder.position.copy(hero.pos); wingHolder.rotation.set(0, hero.yaw, 0); wingHolder.scale.setScalar((hero.scale || 1) * (.25 + .75 * open) * .62);
      const flap = t < 3.6 ? Math.sin(t * 4.6) * .38 * (1 - smooth((t - 2.6) / 1)) : t < 11 ? Math.sin(t * 1.6) * .07 : Math.sin(t * 3) * .12;
      const fold = (1 - open) * 1.25, spread = t > 10.6 && t < 13 ? -.18 * smooth((t - 10.6) / .5) : 0;
      wingL.rotation.set(0, fold + flap * .3 + spread, -flap); wingR.rotation.set(0, -fold - flap * .3 - spread, flap);
      for (const g of [wingL, wingR]) if (g.userData.glb) { g.userData.glb.rotation.y = 0; }
      wingMat.uniforms.dissolve.value = dis * 1.05; wingMat.uniforms.alpha.value = 1; energy.forEach(m => m.visible = !low || !glbWings);
      // pulso de vento ao abrir e penas de luz que se soltam
      if (t < 1.1) { const k = t / 1.1, gy = ground(hero.pos.x, hero.pos.z); decals.add(hero.pos.x, gy, hero.pos.z, 1 + 7 * easeOut(k), 1, .95, .85, (1 - k) * .9, 0, k, 5, groundNormal(ground, hero.pos.x, hero.pos.z, nrm));
        glow.add(hero.pos.x, hero.pos.y, hero.pos.z, 5 * (1 - k) + 1, 5 * (1 - k) + 1, 1, .95, .8, (1 - k) * .8, 0); }
      const nf = low ? 14 : 40;
      for (let i = 0; i < nf; i++) { const life = 1.8, ph = (t * (.5 + hash(i) * .3) + hash(i * 3)) % 1, side = i % 2 ? 1 : -1, sx = hero.pos.x + Math.cos(hero.yaw) * side * (.4 + hash(i * 5) * 1.6), sz = hero.pos.z - Math.sin(hero.yaw) * side * (.4 + hash(i * 5) * 1.6);
        const a = (1 - ph) * (t < 13.2 ? .55 : .95) * (t > 13.2 ? 1.6 : 1) * Math.min(1, t / .6);
        glow.add(sx + Math.sin(t + i) * ph * .6, hero.pos.y + .4 + hash(i * 7) * 1 - ph * 1.6, sz + Math.cos(t * 1.3 + i) * ph * .6, .06, .28, 1, .92, .7, Math.min(1, a), 3, .6 * side + ph, i); }
    }
    // --------- aura de subida e feixe da espada
    const heroY = hero ? hero.pos.y : origin.y;
    if (t < 11 && hero) for (let i = 0; i < (low ? 16 : 40); i++) { const a = i * 2.39996 + t * .8, u = (i / 40 + t * .25) % 1; glow.add(hero.pos.x + Math.cos(a) * .8, heroY - 1 + u * 3.2, hero.pos.z + Math.sin(a) * .8, .12, .12, 1, .95, .82, (1 - u) * .8, 2, a); }
    const portalY = origin.y + 49, launch = smooth((t - 11) / 2);
    if (t >= 3 && t < 6.2) { const k = smooth((t - 3) / .5) * (1 - smooth((t - 5.8) / .4)); from.set(origin.x, heroY + 1.6, origin.z); to.set(origin.x, portalY, origin.z);
      rib.seg(from.x, from.y, from.z, to.x, to.y, to.z, .35, .12, col(.9 * k), col(.6 * k)); rib.seg(from.x, from.y, from.z, to.x, to.y, to.z, .09, .05, col(k), col(k)); }
    // --------- fissura celeste ramificada
    if (t >= 4.4 && t < 6.6) { const k = smooth((t - 4.4) / .8), L = 4 + 14 * k, a = (1 - smooth((t - 6.1) / .5));
      for (let j = 0; j < 3; j++) { const n = lightningBolt(31 + j * 7, origin.x, portalY + L * .5, origin.z - 1, origin.x + (j - 1) * 3 * k, portalY - L * .5, origin.z - 1, segs, { depth: 2, jag: .25, branches: .55 });
        for (let i = 0; i < n; i++) { const g = segs[i]; rib.seg(g[0], g[1], g[2], g[3], g[4], g[5], .5 * g[6] * k, .5 * g[6] * k, col(a), col(a)); } }
      glow.add(origin.x, portalY, origin.z - 1, 10 * k, 18 * k, 1, 1, 1, .5 * a, 0); }
    // --------- portal
    const size = t < 6 ? smooth((t - 4.8) / 1.2) * 2 : 2 + smooth((t - 6) / 4) * 20;
    const implode = t > 12.85 ? 1 - .6 * smooth((t - 12.85) / .15) : 1;
    from.set(origin.x, portalY, origin.z); to.set(target.x, target.y + 2, target.z);
    portal.position.copy(from).lerp(to, easeIn(launch) * .25 + launch * .75);
    portal.scale.setScalar(size * implode * (t > 13 ? Math.max(0, 1 - (t - 13) / .3) : 1)); portal.visible = t >= 4.8 && t < 13.3;
    portal.rotation.set(-.22, 0, .05 * Math.sin(t * .35)); ring.rotation.z = t * .12; filaments.forEach((f, i) => f.rotation.z = t * (i % 2 ? -.17 : .22)); corona.rotation.z = t * .03;
    if (portal.visible) {
      const n = low ? 70 : quality === 1 ? 160 : 300;
      for (let i = 0; i < n; i++) { const a = i * 2.39996 + t * (.15 + (i % 7) * .02), r = size * (1.08 + (i % 13) / 30 + .25 * hash(i)), z = (hash(i * 7) - .5) * size * .12;
        dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, z); dummy.position.applyEuler(portal.rotation).add(portal.position);
        glow.add(dummy.position.x, dummy.position.y, dummy.position.z, .5 + size * .03, .5 + size * .03, .9, .95, 1, .8 * fade, i % 3 ? 0 : 2, a); }
      if (t > 11 && t < 13) for (let j = 0; j < 12; j++) { const u0 = j / 12, u1 = (j + 1) / 12; from.set(origin.x, portalY, origin.z);
        const p0 = from.clone().lerp(portal.position, Math.max(0, 1 - u0 * .5)), p1 = from.clone().lerp(portal.position, Math.max(0, 1 - u1 * .5));
        rib.seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, size * .5 * (1 - u0), size * .5 * (1 - u1), col(.45 * (1 - u0)), col(.45 * (1 - u1))); }
    }
    // --------- fragmentos sugados (cópias visuais)
    const storm = smooth((t - 6) / 3) * fade, nd = low ? 24 : quality === 1 ? 50 : 100; debris.count = storm > 0 && t < 13 ? nd : 0;
    for (let i = 0; i < debris.count; i++) { const u = (t * .13 + i / nd) % 1, a = i * 2.4 + t * (1 + u), r = (1 - u) * 14;
      dummy.position.set(origin.x + Math.cos(a) * r, origin.y + u * 44, origin.z + Math.sin(a) * r); dummy.scale.set(.7 + i % 3, (i % 4 === 0 ? 3 : .7), .7); dummy.rotation.set(t + i, t * 2, 0); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix); }
    debris.instanceMatrix.needsUpdate = true;
    // --------- impacto: implosão → explosão branca em camadas
    const ia = t - 13;
    shells.forEach((m, i) => { const k = (ia - i * .12) / 1.3; m.visible = k > 0 && k < 1; if (!m.visible) return; m.position.set(target.x, target.y + 1.5, target.z); m.scale.setScalar(1 + (10 + i * 6) * easeOut(k)); m.material.uniforms.alpha.value = (1 - smooth(k)) * (1 - i * .25); });
    shocks.forEach((m, i) => { const k = (ia - i * .2) / 1.6; m.visible = k > 0 && k < 1; if (!m.visible) return; m.position.set(target.x, target.y + 1 + i * 2, target.z); m.rotation.set(i ? 0 : -Math.PI / 2, 0, 0); m.scale.setScalar(2 + 34 * easeOut(k)); m.material.opacity = (1 - k) * .9; });
    if (ia > 0 && ia < 2.2) { const k = ia / 2.2, gy = ground(target.x, target.z), n = groundNormal(ground, target.x, target.z, nrm);
      decals.add(target.x, gy, target.z, 3 + 30 * easeOut(k), 1, 1, 1, (1 - k), 0, k, 7, n); decals.add(target.x, gy, target.z, 6, 1, .95, .8, (1 - smooth(k)) * .9, 1, k, 8, n);
      const nb = low ? 60 : 180; for (let i = 0; i < nb; i++) { const a = i * 2.399, el = hash(i) * 1.4 - .2, sp = 8 + hash(i * 3) * 22, d = sp * easeOut(ia / 1.4);
        glow.add(target.x + Math.cos(a) * Math.cos(el) * d, target.y + 1.5 + Math.sin(el) * d, target.z + Math.sin(a) * Math.cos(el) * d, .12, .7, 1, 1, .95, (1 - k), 3, a + Math.PI / 2); } }
    if (ia > -.15 && ia < .15) glow.add(target.x, target.y + 1.5, target.z, 6 * (1 - Math.abs(ia) / .15), 6 * (1 - Math.abs(ia) / .15), 1, 1, 1, 1, 0);
    rib.end(); glow.end(); decals.end(t);
  }
  return { root, update, setWings, clear() { root.visible = false; wingHolder.visible = false; },
    dispose() { scene.remove(root); for (const g of [lensGeo, ringGeo, coronaGeo, filamentGeo, shellGeo, shockGeo, rockGeo, featherGeo]) g.dispose(); for (const m of [black, white, coronaMat, shellMat, rockMat, wingMat, energyMat]) m.dispose(); shells.forEach(m => m.material.dispose()); shocks.forEach(m => m.material.dispose()); debris.dispose(); energy.forEach(m => m.dispose()); glow.dispose(); decals.dispose(); rib.dispose(); } };
}
