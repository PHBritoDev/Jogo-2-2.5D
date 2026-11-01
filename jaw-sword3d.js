/**
 * MOD 246 — Espada-Mandíbula do mini-chefe Enemy4 (procedural, presa ao osso RightHand; o Enemy4.glb não traz arma).
 * Desenho original guiado pelas referências do criador: duas lâminas serrilhadas ABERTAS como uma mandíbula, dentes
 * ósseos apontados para dentro, tecido carmim pulsante entre elas, olho vermelho na guarda, cabo negro e chamas de
 * tinta líquida negra com contorno magenta e veios carmim que sobem em espaço de mundo. Eixo +Y = lâmina (mesmo eixo
 * dos golpes nativos da Mod 244). userData: tipA/tipB, tick(time,fury,swing), fx, updateFx(time,fury,low,visible), dispose().
 */
const INK_VERT = `attribute vec4 aF; varying vec2 vUv; varying vec4 vF;
void main(){ vUv=uv; vF=aF; vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float w=length(instanceMatrix[0].xyz), h=length(instanceMatrix[1].xyz);
 vec3 toCam=cameraPosition-base; toCam.y=0.; vec3 side=normalize(cross(vec3(0.,1.,0.),toCam+vec3(1e-4,0.,0.)));
 float sway=sin(aF.z*5.+uv.y*4.)*.22*uv.y*uv.y; gl_Position=projectionMatrix*viewMatrix*vec4(base+side*(position.x+sway)*w+vec3(0.,position.y*h,0.),1.); }`;
const INK_FRAG = `uniform float time; varying vec2 vUv; varying vec4 vF;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 p=vec2(vUv.x*2.-1.,vUv.y); float t=time*2.+vF.x*9.; float n=n2(vec2(p.x*3.+vF.x*4.,p.y*3.-t))*.65+n2(vec2(p.x*8.,p.y*8.-t*1.6))*.35;
 float w=(1.-p.y)*(.7+.3*sin(p.y*6.+t))*(.85+.3*n), body=w-abs(p.x+sin(p.y*4.+t)*.2*p.y)-p.y*p.y*.5+(n-.5)*.45; if(body<0.) discard;
 float rim=1.-smoothstep(0.,.07,body), vein=smoothstep(.93,.97,1.-abs(n2(vec2(p.x*9.,p.y*5.-t*2.))-.5)*2.)*step(.12,body);
 vec3 c=vec3(.0012,0.,.0024); c=mix(c,vec3(.8,.02,.45)*(1.+vF.y*.4),rim); c=mix(c,vec3(.6,0.,.01),vein*.9); gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function buildJawSword(T) {
  const root = new T.Group(); root.name = 'EspadaMandibula';
  const steel = new T.MeshStandardMaterial({ color: 0x1a1016, metalness: .75, roughness: .32, emissive: 0x2a0410, emissiveIntensity: .5, flatShading: true, side: T.DoubleSide });
  const rim = new T.MeshStandardMaterial({ color: 0x3a0812, metalness: .6, roughness: .3, emissive: 0x8a0018, emissiveIntensity: .6, flatShading: true });
  const bone = new T.MeshStandardMaterial({ color: 0xd9c8ae, roughness: .55, metalness: .05, flatShading: true });
  const flesh = new T.MeshStandardMaterial({ color: 0x5a0410, roughness: .6, emissive: 0xc0001c, emissiveIntensity: .6, side: T.DoubleSide });
  const black = new T.MeshStandardMaterial({ color: 0x060306, metalness: .5, roughness: .4, flatShading: true });
  const eye = new T.MeshBasicMaterial({ color: 0xff1a2a, toneMapped: false }), pupil = new T.MeshBasicMaterial({ color: 0x050005 });
  const mats = [steel, rim, bone, flesh, black, eye, pupil], geos = [];
  const G0 = .12, L = 1.85, gap = y => .03 + .1 * y / L; // abertura entre as lâminas cresce até a ponta
  // duas lâminas serrilhadas abertas (mandíbula): borda externa em dente de serra, interna lisa onde nascem os dentes ósseos
  for (const sd of [-1, 1]) {
    const sh = new T.Shape(), N = 22; sh.moveTo(sd * gap(0), G0);
    for (let i = 0; i <= N; i++) { const u = i / N, y = G0 + u * L, w = (.16 - .1 * u) * (u > .88 ? (1 - u) / .12 : 1) + .01, saw = i % 2 ? .05 * (1 - u * .6) : 0; sh.lineTo(sd * (gap(y - G0) + w + saw), y + (i % 2 ? .02 : 0)); }
    sh.lineTo(sd * gap(L) * .6, G0 + L + .14); for (let i = N; i >= 0; i--) { const y = G0 + i / N * L; sh.lineTo(sd * gap(y - G0), y); }
    const g = new T.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false }); g.translate(0, 0, -.025); geos.push(g);
    root.add(new T.Mesh(g, steel));
    const spine = new T.Mesh(new T.BoxGeometry(.02, L * .92, .06), rim); spine.position.set(sd * (gap(L * .5) + .07), G0 + L * .48, 0); spine.rotation.z = -sd * .05; root.add(spine); geos.push(spine.geometry);
  }
  // dentes ósseos na borda interna, apontados para dentro (a "boca")
  { const tg = new T.ConeGeometry(.022, .1, 4); tg.rotateZ(Math.PI / 2); geos.push(tg); const n = 24, teeth = new T.InstancedMesh(tg, bone, n), m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1, k = Math.floor(i / 2), y = G0 + .12 + k / (n / 2) * L * .82, l = .7 + .5 * ((k * 7) % 3) / 2; q.setFromAxisAngle(new T.Vector3(0, 0, 1), sd > 0 ? Math.PI : 0); s.set(l, 1, 1); p.set(sd * (gap(y - G0) + .01), y, 0); m4.compose(p, q, s); teeth.setMatrixAt(i, m4); }
    root.add(teeth); }
  // tecido carmim pulsante entre as lâminas
  { const pos = [], idx = [], N = 10; for (let i = 0; i <= N; i++) { const y = G0 + .05 + i / N * L * .8, g = gap(y - G0) * .8; pos.push(-g, y, 0, g, y, 0); if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); geos.push(g); root.add(new T.Mesh(g, flesh)); }
  // guarda óssea com o olho vermelho; cabo negro com anéis; pomo em garra
  { const gd = new T.Mesh(new T.CylinderGeometry(.13, .1, .1, 7), black); gd.rotation.x = Math.PI / 2; gd.position.y = .06; root.add(gd); geos.push(gd.geometry);
    for (const sd of [-1, 1]) { const horn = new T.Mesh(new T.ConeGeometry(.035, .26, 5), bone); horn.position.set(sd * .17, .08, 0); horn.rotation.z = -sd * 1.9; root.add(horn); geos.push(horn.geometry); }
    const ball = new T.Mesh(new T.SphereGeometry(.045, 12, 8), eye); ball.position.set(0, .07, .055); root.add(ball); geos.push(ball.geometry);
    const sl = new T.Mesh(new T.BoxGeometry(.012, .07, .01), pupil); sl.position.set(0, .07, .098); root.add(sl); geos.push(sl.geometry);
    const grip = new T.Mesh(new T.CylinderGeometry(.03, .034, .5, 8), black); grip.position.y = -.24; root.add(grip); geos.push(grip.geometry);
    for (let i = 0; i < 5; i++) { const r = new T.Mesh(new T.TorusGeometry(.036, .007, 4, 10), rim); r.rotation.x = Math.PI / 2; r.position.y = -.05 - i * .1; root.add(r); geos.push(r.geometry); }
    const pm = new T.Mesh(new T.OctahedronGeometry(.06, 0), bone); pm.scale.set(.8, 1.4, .8); pm.position.y = -.53; root.add(pm); geos.push(pm.geometry); }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  // chamas de tinta negra (mundo), veios carmim
  const NF = 8, fGeo = new T.PlaneGeometry(1, 1, 1, 6); fGeo.translate(0, .5, 0); const aF = new Float32Array(NF * 4); fGeo.setAttribute('aF', new T.InstancedBufferAttribute(aF, 4).setUsage(T.DynamicDrawUsage));
  const fMat = new T.ShaderMaterial({ vertexShader: INK_VERT, fragmentShader: INK_FRAG, uniforms: { time: { value: 0 } }, side: T.DoubleSide, toneMapped: false });
  const flames = new T.InstancedMesh(fGeo, fMat, NF); flames.frustumCulled = false; flames.count = 0; const fx = new T.Group(); fx.name = 'MandibulaChamas'; fx.add(flames);
  const M = new T.Matrix4(), V = new T.Vector3(), S = new T.Vector3(), I = new T.Quaternion(); let heat = .6;
  Object.assign(root.userData, {
    tipA: new T.Vector3(0, G0 + .1, 0), tipB: new T.Vector3(0, G0 + L, 0), fx, materials: mats,
    tick(time, fury = 0, swing = 0) { heat += ((.6 + fury * .4 + swing * .3) - heat) * .1; const pulse = .5 + .5 * Math.sin(time * (3 + fury * 3)); flesh.emissiveIntensity = .35 + .55 * pulse + fury * .3; eye.color.setRGB(1, .08 + .12 * pulse, .14); rim.emissiveIntensity = .45 + .4 * fury; },
    updateFx(time, fury = 0, low = false, visible = true) {
      fMat.uniforms.time.value = time; fx.visible = visible; if (!visible) return; root.updateWorldMatrix(true, false); const n = low ? 4 : NF; flames.count = n;
      for (let i = 0; i < n; i++) { const u = .15 + i / (NF - 1) * .8, sd = i % 2 ? 1 : -1; V.set(sd * (gap(u * L) + .12), G0 + u * L, 0).applyMatrix4(root.matrixWorld);
        S.set((.2 + .06 * (i % 3)) * (1 + fury * .3), (.36 + .14 * ((i * 5) % 3)) * heat * 1.5 * (1 + fury * .4), 1); M.compose(V, I, S); flames.setMatrixAt(i, M); aF.set([i * .41, fury, time * .25 + i, 1], i * 4); }
      flames.instanceMatrix.needsUpdate = true; fGeo.attributes.aF.needsUpdate = true;
    },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); fGeo.dispose(); fMat.dispose(); flames.dispose(); }
  });
  return root;
}
