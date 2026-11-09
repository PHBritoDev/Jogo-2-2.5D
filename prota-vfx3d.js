/**
 * Mod 302 — efeitos do PROTAGONISTA (só o herói): dash da referência 3900 e volumes de energia visíveis.
 *  - some: o corpo se desfaz em fiapos verticais de fumaça escura que sobem e se esticam na origem;
 *  - rastro: na chegada, uma mancha horizontal escura alongada na direção do avanço se contrai até o corpo;
 *  - energia: setor/anel que se expande e onda crescente que viaja — desenhados com o MESMO raio, banda,
 *    inclinação e alcance do volume de dano (prota-combat3d.js), então o dano só acontece quando o efeito encosta.
 * Pools fixos (28 fiapos, 2 rastros, 8 energias, 6 clarões); nada é criado durante o combate.
 */
export function createProtaVFX(T, scene) {
  const root = new T.Group(); root.name = 'ProtaVFX302'; scene.add(root);
  const noise = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}`;
  const vtx = `varying vec2 vUv;varying vec3 vP;void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  let quality = 'high', time = 0;
  // ---------------- fumaça vertical (some) ----------------
  const smokeMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
    uniforms: { age: { value: 1 }, seed: { value: 0 }, tint: { value: new T.Color(0x07050b) } },
    vertexShader: vtx,
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float age,seed;uniform vec3 tint;${noise}
      void main(){float x=vUv.x,y=vUv.y;float fil=n(vec2(x*9.+seed,y*3.-age*7.));float wisp=n(vec2(x*23.+seed*2.,y*9.-age*11.));float core=1.-smoothstep(.04+.22*fil,.42,abs(x-.5+.12*(fil-.5)));
      float tip=smoothstep(0.,.22,y)*(1.-smoothstep(.45+.4*fil,1.,y));float a=core*tip*(.55+.45*wisp)*(1.-smoothstep(.35,1.,age))*.95;if(a<.03)discard;
      gl_FragColor=vec4(tint+vec3(.05,.02,.08)*fil,a);}` });
  const plane = new T.PlaneGeometry(1, 1); plane.translate(0, .5, 0);
  const smoke = Array.from({ length: 28 }, (_, i) => { const m = new T.Mesh(plane, smokeMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 5; root.add(m); return { m, age: 1, life: .3, vx: 0, vy: 0, vz: 0, w: .1, h: 1, seed: i * 1.37 }; });
  let smokeCursor = 0;
  function vanish(p, dir) {
    const count = quality === 'low' ? 10 : quality === 'medium' ? 18 : 28;
    for (let i = 0; i < count; i++) {
      const s = smoke[smokeCursor++ % smoke.length], a = i * 2.399, r = .08 + (i % 4) * .08;
      s.m.position.set(p.x + Math.sin(a) * r, p.y + .05 + (i % 5) * .2, p.z + Math.cos(a) * r);
      s.age = 0; s.life = .26 + (i % 3) * .06; s.w = .09 + (i % 4) * .05; s.h = .55 + (i % 5) * .14;
      s.vx = -dir.x * (1.2 + (i % 3) * .5); s.vz = -dir.z * (1.2 + (i % 3) * .5); s.vy = 2.2 + (i % 4) * .7; s.m.visible = true;
      s.m.material.uniforms.seed.value = s.seed + time;
    }
  }
  // ---------------- rastro horizontal (reaparece) ----------------
  const smearMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
    uniforms: { k: { value: 1 }, seed: { value: 0 } }, vertexShader: vtx,
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k,seed;${noise}
      void main(){float x=vUv.x,y=vUv.y;float streak=n(vec2(x*3.+seed,y*26.));float lines=smoothstep(.45,.85,streak);
      float body=1.-smoothstep(.2,.5,abs(y-.5));float head=smoothstep(0.,.7,x);float a=(body*.85+lines*.7)*head*(1.-smoothstep(.6,1.,k));
      if(a<.02)discard;gl_FragColor=vec4(vec3(.03,.02,.05)+vec3(.09,.05,.12)*lines*(1.-x),a*.9);}` });
  const strip = new T.PlaneGeometry(1, 1); strip.translate(-.5, 0, 0); // origem na cabeça (corpo), cauda para -X
  const smears = Array.from({ length: 2 }, () => { const g = new T.Group(), mat = smearMat(), v = new T.Mesh(strip, mat), hz = new T.Mesh(strip, mat); hz.rotation.x = Math.PI / 2; g.add(v, hz); g.visible = false; root.add(g); return { g, v, hz, mat, age: 1, len: 2.4 }; });
  let smearCursor = 0;
  function reappear(p, dir, len = 2.4) {
    const s = smears[smearCursor++ % smears.length]; s.age = 0; s.len = len * 1.2; s.g.visible = true; s.mat.uniforms.seed.value = time * 3.1;
    s.g.position.set(p.x + dir.x * .15, p.y + .95, p.z + dir.z * .15); s.g.rotation.set(0, Math.atan2(dir.x, dir.z) - Math.PI / 2, 0);
  }
  // ---------------- energia: setor/anel e onda ----------------
  const palette = { prota: [0xffffff, 0xe6ecff, 0xff2a3a], aurora: [0xffe9ec, 0xff163a, 0xa52dff], vigilia: [0xe4fcff, 0x299bff, 0x7acfff], quantum: [0xffdf7a, 0x8f35ff, 0xff58cb], celeste: [0xffffff, 0xffd271, 0xfff1b0] };
  const energyFrag = `precision highp float;varying vec2 vUv;varying vec3 vP;uniform float radius,band,age,life,span,fade,wave,seed;uniform vec3 core,rim,fil;${noise}
    void main(){float a;float x;float t=clamp(age/life,0.,1.);
      if(wave>.5){x=vUv.y;float across=abs(vUv.x-.5)*2.;a=smoothstep(1.,.78,across)*smoothstep(0.,.35,x)*(1.-smoothstep(.75,1.,x));}
      else{float r=length(vP.xz)*radius;x=clamp((r-(radius-band))/band,0.,1.);a=step(radius-band,r)*(1.-smoothstep(.93,1.,x))*smoothstep(0.,.6,x);
        float ang=abs(atan(vP.x,vP.z));if(span<6.2)a*=1.-smoothstep(span*.5-.25,span*.5,ang);}
      float brush=n(vec2(vUv.x*40.+seed,x*6.-age*9.));a*=.55+.45*brush;a*=(1.-smoothstep(.55,1.,t))*fade;
      vec3 c=mix(rim,core,smoothstep(.55,.95,x));c+=fil*step(.82,n(vec2(vUv.x*90.+seed,x*14.)))*.8;
      if(a<.015)discard;gl_FragColor=vec4(c*1.15,a);}`;
  const energyMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { radius: { value: 1 }, band: { value: 1 }, age: { value: 0 }, life: { value: .4 }, span: { value: 6.3 }, fade: { value: 1 }, wave: { value: 0 }, seed: { value: 0 }, core: { value: new T.Color() }, rim: { value: new T.Color() }, fil: { value: new T.Color() } },
    vertexShader: vtx, fragmentShader: energyFrag });
  function sectorGeo(span) { const seg = Math.max(12, Math.ceil(span * 14)), pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const a = -span / 2 + span * i / seg; for (let j = 0; j <= 4; j++) { const r = .35 + .65 * j / 4; pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); uv.push(i / seg, j / 4); if (i < seg && j < 4) { const k = i * 5 + j; idx.push(k, k + 5, k + 1, k + 1, k + 5, k + 6); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  function waveGeo() { const pos = [], uv = [], idx = [], N = 32; // crescente: largura no eixo X (através), arco abaulado para frente (+Z)
    for (let i = 0; i <= N; i++) { const u = i / N, x = (u - .5) * 2, bow = .28 * (1 - x * x); for (let j = 0; j <= 3; j++) { const v = j / 3, taper = Math.pow(1 - x * x, .5); pos.push(x, 0, bow + (v - .5) * .9 * taper); uv.push(u, v); if (i < N && j < 3) { const k = i * 4 + j; idx.push(k, k + 4, k + 1, k + 1, k + 4, k + 5); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  // parede curva na frente do setor: dá corpo/altura ao arco (o volume de dano tem a mesma altura ±half)
  function wallGeo(span) { const seg = Math.max(12, Math.ceil(span * 14)), pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const a = -span / 2 + span * i / seg; for (let j = 0; j <= 2; j++) { pos.push(Math.sin(a), j / 2 - .5, Math.cos(a)); uv.push(i / seg, j / 2); if (i < seg && j < 2) { const k = i * 3 + j; idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4); } } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; }
  const wallMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { age: { value: 0 }, life: { value: .4 }, fade: { value: 1 }, seed: { value: 0 }, span: { value: 6.3 }, core: { value: new T.Color() }, rim: { value: new T.Color() }, fil: { value: new T.Color() } }, vertexShader: vtx,
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float age,life,fade,seed,span;uniform vec3 core,rim,fil;${noise}
      void main(){float t=clamp(age/life,0.,1.);float v=abs(vUv.y-.5)*2.;float brush=n(vec2(vUv.x*55.+seed,vUv.y*3.-age*12.));
        float taper=span<6.2?pow(sin(3.14159*vUv.x),.7):1.;float edge=exp(-pow(v*2.1/(.3+taper),2.));
        float streak=smoothstep(.35,.95,n(vec2(vUv.x*24.+seed,vUv.y*1.5-age*5.)));
        float a=edge*taper*(.35+.65*streak)*(1.-smoothstep(.45,1.,t))*fade*(.55+.45*brush);
        vec3 c=mix(rim,core,edge);c+=fil*step(.88,n(vec2(vUv.x*120.+seed,vUv.y*9.)))*.7;a=min(1.,a*1.05);if(a<.015)discard;gl_FragColor=vec4(c,a);}` });
  const wallCache = new Map(), getWall = span => { const k = span.toFixed(2); if (!wallCache.has(k)) wallCache.set(k, wallGeo(span)); return wallCache.get(k); };
  const geoCache = new Map(), getSector = span => { const k = span.toFixed(2); if (!geoCache.has(k)) geoCache.set(k, sectorGeo(span)); return geoCache.get(k); }, wGeo = waveGeo();
  const energies = Array.from({ length: 8 }, () => { const g = new T.Group(), tilt = new T.Group(), mat = energyMat(), mesh = new T.Mesh(wGeo, mat), echo = new T.Mesh(wGeo, mat), wmat = wallMat(), wall = new T.Mesh(getWall(2), wmat); mesh.frustumCulled = echo.frustumCulled = wall.frustumCulled = false; echo.position.y = .06; tilt.add(mesh, echo, wall); g.add(tilt); g.visible = false; root.add(g); return { g, tilt, mesh, echo, wall, wmat, mat, e: null, after: 1 }; });
  let energyCursor = 0;
  function energy(e) {
    const s = energies[energyCursor++ % energies.length], p = palette[e.sword] || palette.prota, u = s.mat.uniforms;
    s.e = e; s.after = 0; s.g.visible = true; s.g.position.set(e.x, e.y, e.z); s.g.rotation.set(0, e.yaw, 0);
    if (e.kind === 'sector') { s.mesh.geometry = s.echo.geometry = getSector(Math.min(e.span, Math.PI * 2)); s.wall.geometry = getWall(Math.min(e.span, Math.PI * 2)); s.wall.visible = true; s.tilt.rotation.set(0, 0, e.roll || 0); s.mesh.rotation.set(0, 0, 0); s.echo.visible = e.span > 5; u.wave.value = 0; }
    else { s.mesh.geometry = s.echo.geometry = wGeo; s.wall.visible = false; s.tilt.rotation.set(0, 0, e.roll || 0); s.mesh.rotation.set(0, 0, 0); s.echo.visible = false; u.wave.value = 1; }
    const w = s.wmat.uniforms; w.core.value.setHex(p[0]); w.rim.value.setHex(p[1]); w.fil.value.setHex(p[2]); w.life.value = e.life; w.seed.value = u.seed.value; w.span.value = e.span || 6.3; w.fade.value = 1;
    u.core.value.setHex(p[0]); u.rim.value.setHex(p[1]); u.fil.value.setHex(p[2]); u.span.value = e.span || 6.3; u.life.value = e.life; u.band.value = e.band || 1; u.seed.value = time * 7.3; u.fade.value = 1;
  }
  function syncEnergy(s, dt) {
    const e = s.e, u = s.mat.uniforms; if (!e) return;
    if (e.done) { s.after += dt; u.fade.value = s.wmat.uniforms.fade.value = Math.max(0, 1 - s.after / .12); if (s.after > .12) { s.g.visible = false; s.e = null; } }
    u.age.value = s.wmat.uniforms.age.value = e.age;
    if (e.kind === 'sector') { s.mesh.scale.setScalar(Math.max(.01, e.radius)); s.echo.scale.setScalar(Math.max(.01, e.radius * .985)); s.wall.scale.set(Math.max(.01, e.radius), (e.half || .55) * 2, Math.max(.01, e.radius)); u.radius.value = e.radius; }
    else { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), along = e.blockedAt ? Math.min(e.travel, e.blockedAt) : e.travel; s.g.position.set(e.x + fx * along, e.y, e.z + fz * along); s.mesh.scale.set(e.radius, 1, e.band); }
  }
  // ---------------- clarão de impacto ----------------
  const flashMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: T.AdditiveBlending,
    uniforms: { k: { value: 1 }, col: { value: new T.Color(0xfff3d6) }, rays: { value: 6 } }, vertexShader: vtx,
    fragmentShader: `precision highp float;varying vec2 vUv;uniform float k;uniform vec3 col;uniform float rays;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);
      float star=pow(abs(cos(a*rays*.5)),18.)*(1.-r);float disk=exp(-r*r*9.);float ring=exp(-pow((r-k*.9)*14.,2.))*.6;float v=(disk*.9+star*1.4+ring)*(1.-k);if(v<.01)discard;gl_FragColor=vec4(col*v,v);}` });
  const flashes = Array.from({ length: 6 }, () => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), flashMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 12; root.add(m); return { m, age: 1, life: .14, size: 1 }; });
  let flashCursor = 0;
  function impact(p, final = false, sword = 'prota') { const f = flashes[flashCursor++ % flashes.length]; f.m.position.set(p.x, p.y, p.z); f.age = 0; f.life = final ? .22 : .13; f.size = final ? 2.4 : 1.25; f.m.visible = true; f.m.material.uniforms.rays.value = final ? 8 : 6; f.m.material.uniforms.col.value.setHex(final ? 0xfff0c8 : (palette[sword] || palette.prota)[1]); }
  // ---------------- atualização ----------------
  const camQ = new T.Quaternion(), camP = new T.Vector3();
  function update(dt, camera, level = 'high') {
    time += dt; quality = level; camera.getWorldQuaternion(camQ); camera.getWorldPosition(camP);
    for (const s of smoke) { if (!s.m.visible) continue; s.age += dt; const k = s.age / s.life; if (k >= 1) { s.m.visible = false; continue; }
      s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.vx *= Math.exp(-6 * dt); s.vz *= Math.exp(-6 * dt);
      s.m.scale.set(s.w * (1 - .5 * k), s.h * (1 + 1.25 * k), 1); s.m.rotation.set(0, Math.atan2(camP.x - s.m.position.x, camP.z - s.m.position.z), 0); s.m.material.uniforms.age.value = k; }
    for (const s of smears) { if (!s.g.visible) continue; s.age += dt; const k = s.age / .2; if (k >= 1) { s.g.visible = false; continue; }
      const len = Math.max(.2, s.len * (1 - k) ** 1.6); s.v.scale.set(len, 1.75 * (1 - .35 * k), 1); s.hz.scale.set(len, .8 * (1 - .3 * k), 1); s.mat.uniforms.k.value = k; }
    for (const s of energies) syncEnergy(s, dt);
    for (const f of flashes) { if (!f.m.visible) continue; f.age += dt; const k = f.age / f.life; if (k >= 1) { f.m.visible = false; continue; } f.m.quaternion.copy(camQ); f.m.scale.setScalar(f.size * (.6 + .6 * k)); f.m.material.uniforms.k.value = k; }
  }
  function clear() { for (const s of smoke) s.m.visible = false; for (const s of smears) s.g.visible = false; for (const s of energies) { s.g.visible = false; s.e = null; } for (const f of flashes) f.m.visible = false; }
  function stats() { return { smoke: smoke.filter(s => s.m.visible).length, smears: smears.filter(s => s.g.visible).length, energies: energies.filter(s => s.g.visible).length, flashes: flashes.filter(f => f.m.visible).length }; }
  return { vanish, reappear, energy, impact, update, clear, stats, root };
}
