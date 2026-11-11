/**
 * Mod 315 — cúpula de escudo esférica de hexágonos (poliedro de Goldberg: dual de um icosaedro subdividido).
 *
 * Cada célula (hexágono; 12 pentágonos) é um polígono próprio com centro, semente e coordenada radial nos atributos,
 * então o shader faz tudo sem CPU por quadro: borda luminosa por célula, preenchimento translúcido pulsante,
 * ondulação nos pontos de impacto, fissuras progressivas pela durabilidade, células apagando perto do fim e
 * estilhaçamento (cada hexágono voa para fora girando e some). Uma geometria compartilhada (≈4 mil triângulos);
 * duas passadas (fundo e frente) por escudo; sem luzes dinâmicas. Pele por entidade (cores, mistura, runas).
 */
const SKINS = {
  celeste: { core: 0x6fc6ff, edge: 0xeafcff, glow: 0x3f9cff, crack: 0xffffff, blend: 'add', fill: .045, edgeW: .12, runes: 0, ring: 0x9fe2ff, gain: .55 },
  abismo: { core: 0x14051f, edge: 0xa94cff, glow: 0x5d1ac0, crack: 0xd9a8ff, blend: 'normal', fill: .12, edgeW: .14, runes: 1, ring: 0x8a3cff, gain: .8 },
};
let SHARED = null;
function goldberg(T, detail = 3) {
  const ico = new T.IcosahedronGeometry(1, detail), P = ico.attributes.position;
  // vértices únicos e faces (a IcosahedronGeometry do three não é indexada)
  const key = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`, verts = [], map = new Map(), faces = [];
  for (let i = 0; i < P.count; i += 3) {
    const f = [];
    for (let j = 0; j < 3; j++) { const x = P.getX(i + j), y = P.getY(i + j), z = P.getZ(i + j), k = key(x, y, z); let id = map.get(k); if (id === undefined) { id = verts.length; map.set(k, id); verts.push(new T.Vector3(x, y, z).normalize()); } f.push(id); }
    faces.push(f);
  }
  const around = verts.map(() => []);
  faces.forEach((f, fi) => { for (const v of f) around[v].push(fi); });
  const cent = faces.map(f => new T.Vector3().add(verts[f[0]]).add(verts[f[1]]).add(verts[f[2]]).normalize());
  const pos = [], ctr = [], rnd = [], rad = [], idx = [];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  verts.forEach((c, vi) => {
    // ordena as faces em volta do vértice (polígono da célula)
    const ring = around[vi], ax = new T.Vector3(), ay = new T.Vector3();
    ax.copy(cent[ring[0]]).sub(c).normalize(); ay.crossVectors(c, ax).normalize();
    ring.sort((a, b) => Math.atan2(cent[a].clone().sub(c).dot(ay), cent[a].clone().sub(c).dot(ax)) - Math.atan2(cent[b].clone().sub(c).dot(ay), cent[b].clone().sub(c).dot(ax)));
    const base = pos.length / 3, r = rand();
    pos.push(c.x, c.y, c.z); ctr.push(c.x, c.y, c.z); rnd.push(r); rad.push(0);
    for (const fi of ring) { const q = cent[fi].clone().lerp(c, .06).normalize(); pos.push(q.x, q.y, q.z); ctr.push(c.x, c.y, c.z); rnd.push(r); rad.push(1); }
    for (let k = 0; k < ring.length; k++) idx.push(base, base + 1 + k, base + 1 + (k + 1) % ring.length);
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aCenter', new T.Float32BufferAttribute(ctr, 3));
  g.setAttribute('aRand', new T.Float32BufferAttribute(rnd, 1)); g.setAttribute('aRad', new T.Float32BufferAttribute(rad, 1)); g.setIndex(idx);
  g.computeBoundingSphere(); g.boundingSphere.radius = 3.5; ico.dispose();
  return { geometry: g, cells: verts.length };
}
const VERT = `attribute vec3 aCenter;attribute float aRand;attribute float aRad;
uniform float uAppear,uShatter,uTime;varying float vRad;varying float vRand;varying vec3 vN;varying vec3 vW;varying vec3 vC;
void main(){vRad=aRad;vRand=aRand;vec3 p=position;vec3 c=aCenter;
  // surge de baixo para cima (do anel no chão)
  float rise=smoothstep(c.y*.5+.5-.35,c.y*.5+.5,uAppear*1.35);p=mix(c*.2,p,rise);
  // estilhaço: cada hexágono encolhe, voa para fora (mais rápido no topo), gira em volta do próprio centro e cai
  float k=uShatter;if(k>0.){float sp=.8+aRand*1.6;vec3 off=c*(k*sp*1.6)+vec3(0.,-k*k*1.4+k*.6*aRand,0.);
    vec3 l=p-c;float a=k*(4.+aRand*9.);float ca=cos(a),sa=sin(a);vec3 ax=normalize(cross(c,vec3(0.,1.,.01)));l=l*ca+cross(ax,l)*sa+ax*dot(ax,l)*(1.-ca);
    p=c+l*(1.-k*.55)+off;}
  vN=normalize(normalMatrix*c);vC=c;vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG = `precision highp float;varying float vRad;varying float vRand;varying vec3 vN;varying vec3 vW;varying vec3 vC;
uniform vec3 uCore,uEdge,uGlow,uCrack;uniform float uTime,uAppear,uShatter,uFade,uDamage,uFill,uEdgeW,uRunes,uSide,uPulse,uGain;uniform vec4 uHits[4];
float h1(float n){return fract(sin(n)*43758.5453);}
void main(){vec3 V=normalize(cameraPosition-vW);float fres=pow(1.-abs(dot(normalize(vN),V)),2.2);
  float edge=smoothstep(1.-uEdgeW,1.,vRad);float inner=smoothstep(1.-uEdgeW*2.2,1.-uEdgeW,vRad)*.35;
  float pulse=.65+.35*sin(uTime*3.1+vRand*6.28+vC.y*4.);
  // ondas de impacto: anel que corre a partir do ponto atingido
  float hit=0.;for(int i=0;i<4;i++){vec4 H=uHits[i];if(H.w<0.)continue;float d=acos(clamp(dot(normalize(vC),normalize(H.xyz)),-1.,1.));float ring=exp(-pow((d-H.w*3.2)*5.,2.))*(1.-smoothstep(.15,.6,H.w));hit+=ring+exp(-d*d*9.)*(1.-smoothstep(0.,.3,H.w));}
  // fissuras: células sorteadas pela durabilidade ganham rachaduras finas e tremeluzem; perto do fim algumas apagam
  float cracked=step(vRand,uDamage*1.05);float hole=step(vRand,max(0.,uDamage-.55)*1.4);
  float cl=0.;if(cracked>0.){float a=vRand*40.;vec3 q=normalize(vW*7.+vec3(a));cl=smoothstep(.93,.99,abs(sin(dot(vC,vec3(13.1,7.7,9.3))*9.+atan(q.y,q.x)*3.)))*(1.-vRad*.3);}
  float runes=uRunes*smoothstep(.75,.95,abs(sin(vRad*9.+vRand*20.)))*step(.55,vRand)*.6;
  float rim=max(edge,inner*.6);float a=(uFill*(.6+.4*pulse)+rim*(.6+.25*pulse)+fres*.28+hit*(.25+.75*rim)*.7+cl*.7+runes*.35)*(1.-hole);
  vec3 col=mix(uCore,uGlow,fres)+uEdge*edge*1.2+uGlow*hit*1.2+uCrack*cl*1.3+uEdge*runes*.8;
  float flick=1.-cracked*uDamage*.35*step(.5,fract(uTime*11.+vRand*7.));
  float near=smoothstep(.8,2.6,length(cameraPosition-vW));a*=uAppear*uFade*(1.-smoothstep(.55,1.,uShatter))*flick*uSide*uGain*near;if(a<.01)discard;gl_FragColor=vec4(col,min(1.,a));}`;

export function createShieldVFX(T, scene, { ground = () => 0 } = {}) {
  if (!SHARED) SHARED = goldberg(T, 3);
  const root = new T.Group(); root.name = 'EscudoHex314'; scene.add(root);
  const ringGeo = new T.RingGeometry(.78, 1.0, 64, 1); ringGeo.rotateX(-Math.PI / 2);
  function make(skinName) {
    const S = SKINS[skinName] || SKINS.celeste, hits = Array.from({ length: 4 }, () => new T.Vector4(0, 1, 0, -1));
    const uni = () => ({ uCore: { value: new T.Color(S.core) }, uEdge: { value: new T.Color(S.edge) }, uGlow: { value: new T.Color(S.glow) }, uCrack: { value: new T.Color(S.crack) },
      uTime: { value: 0 }, uAppear: { value: 0 }, uShatter: { value: 0 }, uFade: { value: 1 }, uDamage: { value: 0 }, uFill: { value: S.fill }, uEdgeW: { value: S.edgeW }, uRunes: { value: S.runes }, uSide: { value: 1 }, uPulse: { value: 0 }, uGain: { value: S.gain ?? 1 }, uHits: { value: hits } });
    const mat = side => { const m = new T.ShaderMaterial({ uniforms: uni(), vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side, toneMapped: false, blending: S.blend === 'add' ? T.AdditiveBlending : T.NormalBlending }); m.uniforms.uHits.value = hits; return m; };
    const back = new T.Mesh(SHARED.geometry, mat(T.BackSide)), front = new T.Mesh(SHARED.geometry, mat(T.FrontSide));
    back.material.uniforms.uSide.value = .55; back.renderOrder = 8; front.renderOrder = 9; back.frustumCulled = front.frustumCulled = false;
    const ring = new T.Mesh(ringGeo, new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(S.ring) }, uA: { value: 0 }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 uC;uniform float uA,uTime;varying vec2 vUv;void main(){float r=vUv.y;float a=exp(-pow((r-.5)*4.,2.))*(.7+.3*sin(vUv.x*60.+uTime*5.));gl_FragColor=vec4(uC*a*uA,1.);}' }));
    ring.renderOrder = 7;
    const g = new T.Group(); g.add(back, front, ring); g.visible = false; root.add(g);
    return { g, back, front, ring, hits, mats: [back.material, front.material], state: 'off', t: 0, shatterT: 0, fadeT: 0, serial: -1, hitCursor: 0, lastImpacts: 0, skin: skinName };
  }
  const pool = new Map();
  /** Desenha o escudo de uma entidade. s: EnergyShield; at: {x,y,z} (pés); height do corpo. */
  function sync(id, s, at, height, now, skin, dt) {
    let v = pool.get(id); if (!v) { v = make(skin); pool.set(id, v); }
    const R = Math.max(.9, height * s.spec.radiusK), cy = at.y + height * .5;
    if (s.active && v.serial !== s.serial) { v.serial = s.serial; v.state = 'on'; v.t = 0; v.shatterT = 0; v.fadeT = 0; v.lastImpacts = 0; for (const h of v.hits) h.w = -1; }
    if (!s.active && v.state === 'on') v.state = s.endReason === 'broken' ? 'shatter' : 'fade';
    if (v.state === 'off') { v.g.visible = false; return; }
    v.t += dt; v.g.visible = true; v.g.position.set(at.x, cy, at.z); v.back.scale.setScalar(R); v.front.scale.setScalar(R);
    v.ring.position.y = Math.max(-R, ground(at.x, at.z) - cy) + .04; v.ring.scale.setScalar(R * Math.sqrt(Math.max(.05, 1 - (v.ring.position.y / R) ** 2)));
    // novos impactos (direção local do golpe)
    while (v.lastImpacts < s.impacts.length) { const im = s.impacts[v.lastImpacts++], h = v.hits[v.hitCursor++ % 4]; h.set(im.x, im.y, im.z, 0); }
    if (s.impacts.length < v.lastImpacts) v.lastImpacts = s.impacts.length;
    for (const h of v.hits) if (h.w >= 0) { h.w += dt; if (h.w > .7) h.w = -1; }
    let appear = Math.min(1, v.t / .2), fade = 1, shatter = 0;
    if (v.state === 'on') { const left = s.remaining(now); fade = left < .45 ? .35 + .65 * (Math.sin(now * 40) * .5 + .5) * (left / .45) + .3 * (left / .45) : 1; }
    if (v.state === 'fade') { v.fadeT += dt; fade = Math.max(0, 1 - v.fadeT / .3); if (fade <= 0) v.state = 'off'; }
    if (v.state === 'shatter') { v.shatterT += dt; shatter = Math.min(1, v.shatterT / .65); if (shatter >= 1) v.state = 'off'; }
    for (const m of v.mats) { const u = m.uniforms; u.uTime.value = now; u.uAppear.value = appear; u.uFade.value = fade; u.uShatter.value = shatter; u.uDamage.value = v.state === 'on' ? s.damage : 1; }
    v.ring.material.uniforms.uA.value = (v.state === 'on' ? 1 : v.state === 'fade' ? fade : 1 - shatter) * appear; v.ring.material.uniforms.uTime.value = now;
    if (v.state === 'off') v.g.visible = false;
  }
  function release(id) { const v = pool.get(id); if (!v) return; root.remove(v.g); for (const m of v.mats) m.dispose(); v.ring.material.dispose(); pool.delete(id); }
  function clear() { for (const v of pool.values()) { v.state = 'off'; v.g.visible = false; } }
  function stats() { let on = 0; for (const v of pool.values()) if (v.g.visible) on++; return { pool: pool.size, visible: on, cells: SHARED.cells, tris: SHARED.geometry.index.count / 3 }; }
  return { sync, release, clear, stats, root };
}
