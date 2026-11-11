/**
 * Mod 314 — cortes cinematográficos reutilizáveis (espada do protagonista e garras do Demônio1).
 *
 *  • Crescente varrido: a cada passo da janela ATIVA o host entrega a base e a ponta reais da arma no mundo; a malha é
 *    uma faixa larga que vai da metade da lâmina até ALÉM da ponta (halo de energia), com nascimento por amostra —
 *    o rastro nasce na lâmina, acompanha o braço e se desfaz pela cauda. Nada aparece antes do golpe nem fica parado.
 *  • Onda: crescente destacado que viaja (o MESMO volume de dano de prota-combat3d/energyTouches), com núcleo branco,
 *    bordas prateadas e franjas da paleta; some ao bater em parede.
 *  • Estilhaços e faíscas instanciados (uma InstancedMesh, quads esticados pela velocidade), estrela de impacto de 4
 *    pontas com anel de choque. Tudo em pools fixos: nenhuma malha criada durante o combate.
 *
 * Estilos: 'prota' (branco intenso, prata, toques de ouro pálido/ciano) e 'demon' (núcleo escuro, borda violeta
 * elétrica, três riscos paralelos de garra). Um golpe comum nunca usa o tamanho/brilho de ultimate.
 */
const STYLES = {
  prota: { core: 0xffffff, body: 0xdfe8ff, rim: 0x9fd8ff, accent: 0xffe7a8, dark: 0x000000, blend: 'add', rakes: 1, width: 1, ext: 1.25, inner: .25, life: .22, sparks: 0xf4fbff, spark2: 0xffe3a0, star: 0xffffff },
  demon: { core: 0xf3d9ff, body: 0x8b2cff, rim: 0x4a0f8f, accent: 0x1a0626, dark: 0x0b0212, blend: 'add', rakes: 3, width: .55, ext: .9, inner: .1, life: .22, sparks: 0xc57cff, spark2: 0x2b0a40, star: 0xe7c2ff },
};
const NOISE = 'float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}';

export function createSlashVFX(T, scene, { segments = 40, slashes = 6, waves = 8, sparks = 220, stars = 6 } = {}) {
  const root = new T.Group(); root.name = 'CortesCinematicos314'; scene.add(root);
  let time = 0, quality = 'high';
  // ---------------- crescente varrido (faixa com nascimento por amostra) ----------------
  const slashMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLife: { value: st.life }, uCore: { value: new T.Color(st.core) }, uBody: { value: new T.Color(st.body) }, uRim: { value: new T.Color(st.rim) }, uAccent: { value: new T.Color(st.accent) }, uRakes: { value: st.rakes }, uGain: { value: 1 }, uSeed: { value: 0 }, uHead: { value: 0 } },
    vertexShader: 'attribute float aBirth;varying vec2 vUv;varying float vBirth;void main(){vUv=uv;vBirth=aBirth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;varying float vBirth;uniform float uTime,uLife,uRakes,uGain,uSeed,uHead;uniform vec3 uCore,uBody,uRim,uAccent;${NOISE}
      void main(){float age=(uTime-vBirth)/uLife;if(age>1.)discard;float u=vUv.x,v=vUv.y;
        float lead=smoothstep(uHead-.35,uHead,u);float tail=smoothstep(0.,.22,u);
        float n=vn(vec2(u*14.+uSeed,v*3.-uTime*6.)),n2=vn(vec2(u*38.+uSeed*2.,v*9.+uTime*3.));
        float edgeV=smoothstep(.2,.92,v)*(1.-smoothstep(.96,1.,v));float core=exp(-pow((v-.86)*7.,2.));
        float rake=1.;if(uRakes>1.5){float r=fract(v*3.);rake=smoothstep(.0,.18,r)*(1.-smoothstep(.42,.62,r));core=exp(-pow((r-.3)*9.,2.));edgeV=rake;}
        float erode=smoothstep(age*1.05,age*1.05+.25,n*.75+n2*.25+(1.-v)*.15);
        float halo=smoothstep(0.,.55,v)*(1.-smoothstep(.9,1.,v));
        float a=(halo*.45+edgeV*.9+core*2.2)*tail*(.6+.4*lead)*erode*(1.-smoothstep(.6,1.,age))*uGain;
        vec3 c=mix(uRim,uBody,smoothstep(.2,.7,v));c=mix(c,uCore,clamp(core*(.7+.3*lead),0.,1.));c+=uAccent*step(.82,n2)*smoothstep(.45,.9,v)*.8;
        if(a<.012)discard;gl_FragColor=vec4(c*(1.2+core*.8),min(1.,a));}` });
  function makeSlash() {
    const N = segments, pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), birth = new Float32Array(N * 2), idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('uv', new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aBirth', new T.BufferAttribute(birth, 1).setUsage(T.DynamicDrawUsage)); g.setIndex(idx); g.setDrawRange(0, 0);
    const mats = { prota: slashMat(STYLES.prota), demon: slashMat(STYLES.demon) };
    const m = new T.Mesh(g, mats.prota); m.frustumCulled = false; m.renderOrder = 10; m.visible = false; root.add(m);
    return { m, g, pos, uv, birth, mats, n: 0, key: null, last: 0, style: 'prota', lastP: null };
  }
  const slashPool = Array.from({ length: slashes }, makeSlash), byKey = new Map();
  let slashCursor = 0;
  const _a = new T.Vector3(), _b = new T.Vector3(), _d = new T.Vector3();
  /**
   * Amostra da arma: key identifica o golpe (serial); base/tip no mundo; style; gain (0,7 comum … 1,15 finalizador).
   * extend: quanto o halo passa da ponta (m); inner: fração da lâmina onde a faixa começa.
   */
  function sample(key, base, tip, { style = 'prota', gain = 1, extend, inner } = {}) {
    let s = byKey.get(key);
    if (!s) { s = slashPool[slashCursor++ % slashPool.length]; if (s.key !== null) byKey.delete(s.key); s.key = key; s.n = 0; s.style = style; s.m.material = s.mats[style] || s.mats.prota; s.m.material.uniforms.uSeed.value = Math.random() * 50; s.m.material.uniforms.uGain.value = gain; s.m.visible = true; byKey.set(key, s); s.lastP = null; }
    const st = STYLES[s.style] || STYLES.prota, ext = extend ?? st.ext, inn = inner ?? st.inner;
    _d.set(tip.x - base.x, tip.y - base.y, tip.z - base.z); const L = _d.length() || 1; _d.multiplyScalar(1 / L);
    _a.set(base.x + _d.x * L * inn, base.y + _d.y * L * inn, base.z + _d.z * L * inn);
    _b.set(tip.x + _d.x * ext * st.width, tip.y + _d.y * ext * st.width, tip.z + _d.z * ext * st.width);
    if (s.lastP && s.lastP.distanceToSquared(_b) < .0009) return; // parado: não acumula amostras inúteis
    s.lastP = (s.lastP || new T.Vector3()).copy(_b);
    if (s.n === segments) { s.pos.copyWithin(0, 6); s.birth.copyWithin(0, 2); s.n--; }
    const i = s.n++;
    s.pos.set([_a.x, _a.y, _a.z, _b.x, _b.y, _b.z], i * 6); s.birth[i * 2] = s.birth[i * 2 + 1] = time; s.last = time;
    for (let k = 0; k < s.n; k++) { const u = s.n > 1 ? k / (s.n - 1) : 1; s.uv[k * 4] = u; s.uv[k * 4 + 1] = 0; s.uv[k * 4 + 2] = u; s.uv[k * 4 + 3] = 1; }
    s.g.attributes.position.needsUpdate = s.g.attributes.uv.needsUpdate = s.g.attributes.aBirth.needsUpdate = true; s.g.setDrawRange(0, Math.max(0, (s.n - 1) * 6));
    s.m.material.uniforms.uHead.value = 1;
    // faíscas soltas na borda de ataque (poucas por amostra, mais nos golpes grandes)
    if (quality !== 'low' && Math.random() < .55 * gain) spark(_b, { x: _d.x * 2 + (Math.random() - .5) * 3, y: _d.y * 2 + Math.random() * 1.5, z: _d.z * 2 + (Math.random() - .5) * 3 }, s.style, .22);
  }
  function end(key) { byKey.delete(key); }
  // ---------------- onda destacada (volume de dano visível) ----------------
  const waveMat = st => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { uAge: { value: 0 }, uLife: { value: .4 }, uFade: { value: 1 }, uSeed: { value: 0 }, uCore: { value: new T.Color(st.core) }, uBody: { value: new T.Color(st.body) }, uRim: { value: new T.Color(st.rim) }, uAccent: { value: new T.Color(st.accent) }, uRakes: { value: st.rakes }, uGain: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float uAge,uLife,uFade,uSeed,uRakes,uGain;uniform vec3 uCore,uBody,uRim,uAccent;${NOISE}
      void main(){float t=clamp(uAge/uLife,0.,1.);float x=vUv.x*2.-1.,v=vUv.y;float taper=pow(max(0.,1.-x*x),.6);
        float band=v;if(uRakes>1.5){band=fract(v*3.);}
        float front=exp(-pow((band-.8)*6./(.35+taper),2.));float body=smoothstep(0.,.75,band)*(1.-smoothstep(.85,1.,band));
        float n=vn(vec2(vUv.x*22.+uSeed,v*4.-uAge*14.)),n2=vn(vec2(vUv.x*60.+uSeed,v*12.));
        float erode=smoothstep(t*.9,t*.9+.3,n*.8+.2*(1.-v));
        float a=(front*2.1+body*.7)*taper*erode*(1.-smoothstep(.6,1.,t))*uFade*uGain;
        vec3 c=mix(uRim,uBody,body);c=mix(c,uCore,front);c+=uAccent*step(.84,n2)*front*.7;
        if(a<.012)discard;gl_FragColor=vec4(c*1.25,min(1.,a));}` });
  function crescentGeo() { const pos = [], uv = [], idx = [], N = 36, M = 6;
    for (let i = 0; i <= N; i++) { const u = i / N, ang = (u - .5) * 2.3; for (let j = 0; j <= M; j++) { const v = j / M, r = .55 + .45 * v; pos.push(Math.sin(ang) * r, 0, Math.cos(ang) * r - .75); uv.push(u, v); if (i < N && j < M) { const k = i * (M + 1) + j; idx.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  const cGeo = crescentGeo();
  const wavePool = Array.from({ length: waves }, () => { const g = new T.Group(), tilt = new T.Group(), mats = { prota: waveMat(STYLES.prota), demon: waveMat(STYLES.demon) }, m = new T.Mesh(cGeo, mats.prota), halo = new T.Mesh(cGeo, mats.prota);
    halo.scale.set(1.12, 1, 1.12); halo.position.y = .05; m.frustumCulled = halo.frustumCulled = false; m.renderOrder = halo.renderOrder = 10; tilt.add(m, halo); g.add(tilt); g.visible = false; root.add(g); return { g, tilt, m, halo, mats, e: null, after: 0 }; });
  let waveCursor = 0;
  /** e: volume de energia (prota-combat3d.makeEnergy ou equivalente das garras). */
  function wave(e, { style = 'prota', gain = 1 } = {}) {
    const w = wavePool[waveCursor++ % wavePool.length], mat = w.mats[style] || w.mats.prota;
    w.m.material = w.halo.material = mat; w.e = e; w.after = 0; w.g.visible = true; w.style = style;
    const u = mat.uniforms; u.uLife.value = e.life; u.uSeed.value = Math.random() * 40; u.uGain.value = gain; u.uFade.value = 1;
    w.g.position.set(e.x, e.y, e.z); w.g.rotation.set(0, e.yaw, 0); w.tilt.rotation.set(0, 0, e.roll || 0);
  }
  function syncWave(w, dt) {
    const e = w.e; if (!e) return; const u = w.m.material.uniforms;
    if (e.done) { w.after += dt; u.uFade.value = Math.max(0, 1 - w.after / .1); if (w.after > .1) { w.g.visible = false; w.e = null; return; } }
    u.uAge.value = e.age;
    if (e.kind === 'sector') { const r = Math.max(.05, e.radius); w.g.position.set(e.x, e.y, e.z); w.tilt.scale.set(r * (e.span < 6.2 ? Math.min(1.4, e.span / 2.3) : 2.6), 1, r); w.m.position.z = w.halo.position.z = .75; }
    else { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), along = e.blockedAt ? Math.min(e.travel, e.blockedAt) : e.travel; w.g.position.set(e.x + fx * along, e.y, e.z + fz * along); const s = e.radius * 1.05; w.tilt.scale.set(s, 1, Math.max(.6, e.band * 1.6)); w.m.position.z = w.halo.position.z = .75; }
  }
  // ---------------- faíscas / estilhaços (instanciados) ----------------
  const quad = new T.PlaneGeometry(1, 1); quad.translate(0, .5, 0);
  const sparkGeo = new T.InstancedBufferGeometry(); sparkGeo.index = quad.index; sparkGeo.setAttribute('position', quad.attributes.position); sparkGeo.setAttribute('uv', quad.attributes.uv);
  const sp = { pos: new Float32Array(sparks * 3), vel: new Float32Array(sparks * 3), life: new Float32Array(sparks), age: new Float32Array(sparks).fill(1), size: new Float32Array(sparks), col: new Float32Array(sparks * 3) };
  const aPos = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage), aVel = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage), aK = new T.InstancedBufferAttribute(new Float32Array(sparks * 2), 2).setUsage(T.DynamicDrawUsage), aCol = new T.InstancedBufferAttribute(new Float32Array(sparks * 3), 3).setUsage(T.DynamicDrawUsage);
  sparkGeo.setAttribute('aPos', aPos); sparkGeo.setAttribute('aVel', aVel); sparkGeo.setAttribute('aK', aK); sparkGeo.setAttribute('aCol', aCol); sparkGeo.instanceCount = 0;
  const sparkMesh = new T.Mesh(sparkGeo, new T.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
    vertexShader: `attribute vec3 aPos,aVel,aCol;attribute vec2 aK;varying vec2 vUv;varying float vA;varying vec3 vC;
      void main(){vUv=uv;vC=aCol;float k=aK.x;vA=(1.-k)*(1.-k);vec4 c=viewMatrix*vec4(aPos,1.);vec3 vv=(viewMatrix*vec4(aVel,0.)).xyz;vec2 d=length(vv.xy)>1e-4?normalize(vv.xy):vec2(0.,1.);
        float len=aK.y*(.25+min(2.5,length(aVel))*.09)*(1.-k*.5),wid=aK.y*.06;vec2 side=vec2(-d.y,d.x);c.xy+=d*(position.y-.5)*len*2.+side*position.x*wid*2.;gl_Position=projectionMatrix*c;}`,
    fragmentShader: 'precision highp float;varying vec2 vUv;varying float vA;varying vec3 vC;void main(){float x=abs(vUv.x-.5)*2.,y=vUv.y;float a=(1.-x*x)*smoothstep(0.,.25,y)*(1.-smoothstep(.7,1.,y))*vA;if(a<.01)discard;gl_FragColor=vec4(vC*1.8,a);}' }));
  sparkMesh.frustumCulled = false; sparkMesh.renderOrder = 11; root.add(sparkMesh);
  let sparkCursor = 0; const _c = new T.Color();
  function spark(p, v, style = 'prota', life = .3, size = 1) {
    const i = sparkCursor++ % sparks, st = STYLES[style] || STYLES.prota;
    sp.pos[i * 3] = p.x; sp.pos[i * 3 + 1] = p.y; sp.pos[i * 3 + 2] = p.z; sp.vel[i * 3] = v.x; sp.vel[i * 3 + 1] = v.y; sp.vel[i * 3 + 2] = v.z;
    sp.life[i] = life * (.7 + Math.random() * .6); sp.age[i] = 0; sp.size[i] = size * (.6 + Math.random() * .8);
    _c.setHex(Math.random() < .7 ? st.sparks : st.spark2); sp.col[i * 3] = _c.r; sp.col[i * 3 + 1] = _c.g; sp.col[i * 3 + 2] = _c.b;
  }
  // ---------------- estrela de impacto (4 pontas) + anel de choque ----------------
  const starMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { k: { value: 1 }, col: { value: new T.Color() }, rim: { value: new T.Color() }, rot: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k,rot;uniform vec3 col,rim;void main(){vec2 p=(vUv-.5)*2.;float c=cos(rot),s=sin(rot);p=mat2(c,-s,s,c)*p;float r=length(p);
      float star=max(exp(-abs(p.x)*22.)*exp(-abs(p.y)*1.6),exp(-abs(p.y)*22.)*exp(-abs(p.x)*1.6));float star2=max(exp(-abs(p.x+p.y)*30.),exp(-abs(p.x-p.y)*30.))*exp(-r*3.)*.6;
      float disk=exp(-r*r*14.);float ring=exp(-pow((r-k*.95)*12.,2.))*.7*(1.-k);float v=((star+star2)*1.6+disk*1.2)*(1.-k)*(1.-k)+ring;if(v<.01)discard;gl_FragColor=vec4(mix(rim,col,clamp(disk+star,0.,1.))*1.3,min(1.,v));}` });
  const starPool = Array.from({ length: stars }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), starMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 13; root.add(m); return { m, age: 1, life: .18, size: 1 }; });
  let starCursor = 0;
  /** Impacto: estrela + estilhaços em leque na direção do golpe. power 0..1 (finalizador ≈ 1). */
  function impact(p, dir = { x: 0, y: 0, z: 1 }, { style = 'prota', power = .5 } = {}) {
    const s = starPool[starCursor++ % starPool.length], st = STYLES[style] || STYLES.prota, u = s.m.material.uniforms;
    s.m.position.set(p.x, p.y, p.z); s.age = 0; s.life = .14 + power * .12; s.size = 1.1 + power * 1.6; s.m.visible = true; u.col.value.setHex(st.star); u.rim.value.setHex(st.rim); u.rot.value = Math.random() * .6 - .3;
    const n = quality === 'low' ? 8 : Math.round(14 + power * 16);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, up = Math.random() * 2.5, sp2 = 3 + Math.random() * 6 * (.6 + power);
      spark(p, { x: dir.x * sp2 * .7 + Math.cos(a) * sp2 * .6, y: up + dir.y * sp2 * .4, z: dir.z * sp2 * .7 + Math.sin(a) * sp2 * .6 }, style, .26 + power * .18, 1 + power * .6); }
  }
  // ---------------- atualização ----------------
  const camQ = new T.Quaternion();
  function update(dt, camera, level = 'high') {
    time += dt; quality = level; camera.getWorldQuaternion(camQ);
    for (const s of slashPool) { if (!s.m.visible) continue; s.m.material.uniforms.uTime.value = time; if (time - s.last > (STYLES[s.style] || STYLES.prota).life + .05) { s.m.visible = false; if (s.key !== null) { byKey.delete(s.key); s.key = null; } s.n = 0; s.g.setDrawRange(0, 0); } }
    for (const w of wavePool) syncWave(w, dt);
    let live = 0; const P = aPos.array, V = aVel.array, K = aK.array, C = aCol.array;
    for (let i = 0; i < sparks; i++) { if (sp.age[i] >= 1) continue; sp.age[i] += dt / sp.life[i]; if (sp.age[i] >= 1) continue;
      sp.vel[i * 3 + 1] -= 9 * dt; const drag = Math.exp(-3.5 * dt); sp.vel[i * 3] *= drag; sp.vel[i * 3 + 2] *= drag;
      sp.pos[i * 3] += sp.vel[i * 3] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
      P.set(sp.pos.subarray(i * 3, i * 3 + 3), live * 3); V.set(sp.vel.subarray(i * 3, i * 3 + 3), live * 3); K[live * 2] = sp.age[i]; K[live * 2 + 1] = sp.size[i]; C.set(sp.col.subarray(i * 3, i * 3 + 3), live * 3); live++; }
    sparkGeo.instanceCount = live; if (live) { aPos.needsUpdate = aVel.needsUpdate = aK.needsUpdate = aCol.needsUpdate = true; aPos.addUpdateRange?.(0, live * 3); }
    for (const s of starPool) { if (!s.m.visible) continue; s.age += dt; const k = s.age / s.life; if (k >= 1) { s.m.visible = false; continue; } s.m.quaternion.copy(camQ); s.m.scale.setScalar(s.size * (.7 + .5 * k)); s.m.material.uniforms.k.value = k; }
  }
  function clear() { for (const s of slashPool) { s.m.visible = false; s.key = null; s.n = 0; s.g.setDrawRange(0, 0); } byKey.clear(); for (const w of wavePool) { w.g.visible = false; w.e = null; } sp.age.fill(1); sparkGeo.instanceCount = 0; for (const s of starPool) s.m.visible = false; }
  function stats() { return { slashes: slashPool.filter(s => s.m.visible).length, waves: wavePool.filter(w => w.g.visible).length, sparks: sparkGeo.instanceCount, stars: starPool.filter(s => s.m.visible).length, capacity: { slashes, waves, sparks, stars } }; }
  return { sample, end, wave, impact, spark, update, clear, stats, root };
}
