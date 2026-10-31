/**
 * MOD 245 — Katana Dragão Carmim do mini-chefe do Ato III (perfil miniboss3, rig Enemy4). O Enemy4.glb não traz arma
 * (é uma malha única com braços-lâmina), então a katana é uma peça PROCEDURAL e não destrutiva presa ao osso RightHand:
 * nenhum GLB é alterado. Desenho original guiado pela referência do criador: lâmina longa e fina com curvatura (sori)
 * e ponta muito fina, corpo escuro com o fio vermelho luminoso, cabo vermelho trançado em losangos, guarda circular
 * negra, um DRAGÃO NEGRO ESCULPIDO enrolado no terço superior da lâmina (volume de verdade: corpo tubular escamado,
 * cabeça com chifres e mandíbula, espinhos dorsais) e chamas carmim de silhueta orgânica com pontas pretas e brasas,
 * no meio/terço inferior, que sobem em espaço de mundo independentemente do movimento da lâmina.
 *
 * Eixo da arma: +Y do osso da mão (o mesmo eixo usado pelos golpes nativos da Mod 244). Cabo para −Y, lâmina para +Y.
 * userData: tipA/tipB (segmento de contato da lâmina), tick(time, fury, swing), fx (Object3D em espaço de mundo,
 * adicionado à cena pelo runtime), updateFx(time, fury, low), dispose().
 */
const FLAME_VERT = `attribute vec4 aF; varying vec2 vUv; varying vec4 vF;
void main(){ vUv=uv; vF=aF; vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float w=length(instanceMatrix[0].xyz), h=length(instanceMatrix[1].xyz);
 vec3 toCam=cameraPosition-base; toCam.y=0.; vec3 side=normalize(cross(vec3(0.,1.,0.),toCam+vec3(1e-4,0.,0.)));
 float sway=sin(aF.z*6.+aF.y*3.)*.18*uv.y*uv.y; vec3 p=base+side*(position.x*w+sway*w)+vec3(0.,1.,0.)*(position.y*h);
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`;
const FLAME_FRAG = `uniform float time; varying vec2 vUv; varying vec4 vF;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){ vec2 p=vec2(vUv.x*2.-1.,vUv.y); float t=time*2.4+vF.x*7.;
 float n=n2(vec2(p.x*3.+vF.x*5.,p.y*3.2-t))*.65+n2(vec2(p.x*7.-vF.x,p.y*7.-t*1.7))*.35;
 // silhueta de chama: base larga, línguas recortadas que se afinam e se soltam no alto
 float w=(1.-p.y)*(.62+.38*sin(p.y*7.+t*1.3+vF.x*4.))*(.85+.3*n); float body=w-abs(p.x+sin(p.y*5.+t)*.18*p.y);
 float cut=body-(p.y*p.y*.55)+(n-.5)*.42; if(cut<0.||vF.w<=0.) discard;
 float hot=smoothstep(.12,.2,cut), core=smoothstep(.3,.36,cut);
 vec3 c=mix(vec3(.004,0.,.001),vec3(.5,0.,.012),hot); c=mix(c,vec3(1.,.05,.07)+vF.y*vec3(.0,.08,.02),core*.9); c+=vec3(1.,.4,.3)*smoothstep(.5,.56,cut)*.6;   // ponta preta → carmim → núcleo quente
 gl_FragColor=vec4(c*(1.+vF.y*.5),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function buildCrimsonKatana(T) {
  const root = new T.Group(); root.name = 'KatanaDragaoCarmim';
  const steel = new T.MeshStandardMaterial({ color: 0x1c0a0e, metalness: .8, roughness: .24, emissive: 0x3a0308, emissiveIntensity: .7 });
  const edgeMat = new T.MeshBasicMaterial({ color: 0xff1838, toneMapped: false });
  const black = new T.MeshStandardMaterial({ color: 0x050304, metalness: .6, roughness: .38, flatShading: true });
  const dragonMat = new T.MeshStandardMaterial({ color: 0x07050a, metalness: .55, roughness: .3, flatShading: true, emissive: 0x2a0306, emissiveIntensity: .35 });
  const wrapMat = new T.MeshStandardMaterial({ color: 0x8a0a16, roughness: .7, metalness: .05, emissive: 0x2a0004, emissiveIntensity: .4 });
  const wrapDark = new T.MeshStandardMaterial({ color: 0x140406, roughness: .6, metalness: .2 });
  const eyeMat = new T.MeshBasicMaterial({ color: 0xff2a3a, toneMapped: false });
  const mats = [steel, edgeMat, black, dragonMat, wrapMat, wrapDark, eyeMat];
  const L = 1.22, B0 = .07, curve = u => .06 * u * u; // lâmina: comprimento, início acima da guarda, sori (curvatura para as costas, −Z)
  // --- lâmina: seção em losango achatado (fio em +Z), afinando até a ponta (kissaki)
  {
    const N = 30, pos = [], idx = [], edge = [];
    for (let j = 0; j <= N; j++) {
      const u = j / N, y = B0 + u * L, tip = u > .9 ? 1 - (u - .9) / .1 : 1, wd = (.034 - u * .01) * Math.max(.02, tip ** .8), th = .009 * Math.max(.15, tip), z0 = -curve(u);
      // 0 fio, 1 lado +X, 2 costas (mune), 3 lado −X
      pos.push(0, y, z0 + wd, th, y, z0 - wd * .1, 0, y, z0 - wd * .55, -th, y, z0 - wd * .1);
      edge.push([0, y, z0 + wd]);
      if (j < N) { const a = j * 4, b = a + 4; for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; idx.push(a + k, b + k, a + k1, a + k1, b + k, b + k1); } }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    root.add(new T.Mesh(g, steel));
    // fio vermelho luminoso: fita fina sobre o fio, ligeiramente para fora
    const ep = [], ei = []; edge.forEach(([x, y, z], j) => { const u = j / N; ep.push(-.006, y, z + .003, .006, y, z + .003); if (j < edge.length - 1) { const a = j * 2; ei.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } void u; void x; });
    const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.setIndex(ei); eg.computeVertexNormals();
    const em = new T.Mesh(eg, edgeMat); em.renderOrder = 3; root.add(em);
  }
  // --- habaki e tsuba (guarda circular negra com recortes)
  { const hb = new T.Mesh(new T.CylinderGeometry(.022, .026, .05, 8), black); hb.position.y = .045; root.add(hb);
    const ts = new T.Mesh(new T.CylinderGeometry(.088, .088, .014, 24), black); ts.position.y = .012; root.add(ts);
    for (let i = 0; i < 6; i++) { const r = new T.Mesh(new T.TorusGeometry(.064, .006, 4, 10, Math.PI * .5), wrapDark); r.rotation.set(Math.PI / 2, 0, i * Math.PI / 3); r.position.y = .02; root.add(r); } }
  // --- cabo (tsuka): núcleo escuro + trançado vermelho em losangos; kashira negro
  { const core = new T.Mesh(new T.CylinderGeometry(.021, .024, .44, 8), wrapDark); core.position.y = -.215; root.add(core);
    const dg = new T.OctahedronGeometry(.026, 0); dg.scale(1, 1.25, .72);
    const wraps = new T.InstancedMesh(dg, wrapMat, 18), m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(1, 1, 1), p = new T.Vector3();
    for (let i = 0; i < 18; i++) { const side = i % 2, k = Math.floor(i / 2); p.set(0, -.02 - k * .048, 0); q.setFromAxisAngle(new T.Vector3(0, 1, 0), side * Math.PI + (k % 2) * .3); const off = new T.Vector3(0, 0, .016).applyQuaternion(q); m4.compose(p.add(off), q, s); wraps.setMatrixAt(i, m4); }
    root.add(wraps); const ka = new T.Mesh(new T.CylinderGeometry(.027, .022, .04, 10), black); ka.position.y = -.455; root.add(ka); }
  // --- dragão negro esculpido enrolado no terço superior da lâmina
  {
    const turns = 1.65, y0 = B0 + .04, y1 = B0 + L * .48, N = 64;
    const path = u => { const a = u * turns * Math.PI * 2 + .6, y = y0 + (y1 - y0) * u, r = .052 - u * .012 + .01 * Math.sin(u * 30); return [Math.cos(a) * r, y, Math.sin(a) * r * .85 - curve((y - B0) / L)]; };
    const radius = u => u < .08 ? .014 + u / .08 * .016 : .03 * (1 - (u - .08) / .92) ** .7 + .004;
    const sides = 7, pos = [], idx = [];
    const P = new T.Vector3(), Pn = new T.Vector3(), Tg = new T.Vector3(), Nn = new T.Vector3(), Bn = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    for (let j = 0; j <= N; j++) {
      const u = j / N; P.fromArray(path(u)); Pn.fromArray(path(Math.min(1, u + .01))); Tg.subVectors(Pn, P).normalize(); if (j === N) Tg.subVectors(P, new T.Vector3().fromArray(path(u - .01))).normalize();
      Bn.crossVectors(Tg, up).normalize(); Nn.crossVectors(Bn, Tg).normalize(); const r = radius(u);
      for (let k = 0; k <= sides; k++) { const a = k / sides * Math.PI * 2, sc = 1 + .18 * ((k + j) % 2); pos.push(P.x + (Bn.x * Math.cos(a) + Nn.x * Math.sin(a)) * r * sc, P.y + (Bn.y * Math.cos(a) + Nn.y * Math.sin(a)) * r * sc, P.z + (Bn.z * Math.cos(a) + Nn.z * Math.sin(a)) * r * sc); }
      if (j < N) for (let k = 0; k < sides; k++) { const a = j * (sides + 1) + k, b = a + sides + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); root.add(new T.Mesh(g, dragonMat));
    // espinhos dorsais ao longo do corpo
    const sg = new T.ConeGeometry(.007, .03, 4); sg.translate(0, .015, 0); const sp = new T.InstancedMesh(sg, dragonMat, 22), m4 = new T.Matrix4(), q = new T.Quaternion(), s1 = new T.Vector3();
    for (let i = 0; i < 22; i++) { const u = .1 + i / 22 * .82; P.fromArray(path(u)); Pn.fromArray(path(u + .01)); Tg.subVectors(Pn, P).normalize(); Bn.set(P.x, 0, P.z + curve((P.y - B0) / L)).normalize(); Nn.copy(Bn).addScaledVector(up, .35).normalize();
      q.setFromUnitVectors(up, Nn); s1.setScalar(1 - u * .6); m4.compose(P.clone().addScaledVector(Bn, radius(u) * .8), q, s1); sp.setMatrixAt(i, m4); }
    root.add(sp);
    // cabeça perto da guarda: crânio, focinho, mandíbula aberta, chifres para trás e olhos em brasa
    const hp = new T.Vector3().fromArray(path(0)), head = new T.Group(); head.position.copy(hp); head.position.y += .006; head.lookAt(hp.x * 3, hp.y + .03, hp.z * 3); root.add(head);
    const skull = new T.Mesh(new T.OctahedronGeometry(.026, 0), dragonMat); skull.scale.set(1, .8, 1.3); head.add(skull);
    const snout = new T.Mesh(new T.ConeGeometry(.016, .05, 5), dragonMat); snout.rotation.x = Math.PI / 2; snout.position.z = .042; head.add(snout);
    const jaw = new T.Mesh(new T.ConeGeometry(.012, .042, 4), dragonMat); jaw.rotation.x = Math.PI / 2 + .45; jaw.position.set(0, -.014, .03); head.add(jaw);
    for (const sx of [-1, 1]) { const horn = new T.Mesh(new T.ConeGeometry(.006, .055, 4), black); horn.position.set(sx * .014, .016, -.02); horn.rotation.set(-1.1, 0, sx * .35); head.add(horn);
      const eye = new T.Mesh(new T.SphereGeometry(.0045, 6, 4), eyeMat); eye.position.set(sx * .012, .007, .02); head.add(eye); }
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });

  // --- chamas em espaço de mundo (sobem sempre, independentes da lâmina) e brasas
  const NF = 9, fGeo = new T.PlaneGeometry(1, 1, 1, 6); fGeo.translate(0, .5, 0);
  const aF = new Float32Array(NF * 4); fGeo.setAttribute('aF', new T.InstancedBufferAttribute(aF, 4).setUsage(T.DynamicDrawUsage));
  const fMat = new T.ShaderMaterial({ vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, uniforms: { time: { value: 0 } }, side: T.DoubleSide, toneMapped: false });
  const flames = new T.InstancedMesh(fGeo, fMat, NF); flames.frustumCulled = false; flames.count = 0;
  const NE = 26, eGeo = new T.BufferGeometry(), ePos = new Float32Array(NE * 3); eGeo.setAttribute('position', new T.BufferAttribute(ePos, 3).setUsage(T.DynamicDrawUsage));
  const dot = new Uint8Array(16 * 16 * 4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5, a = Math.max(0, 1 - d * d); dot.set([255, 255, 255, Math.round(a * 255)], (y * 16 + x) * 4); }
  const dotTex = new T.DataTexture(dot, 16, 16); dotTex.needsUpdate = true;
  const embers = new T.Points(eGeo, new T.PointsMaterial({ color: 0xff2030, map: dotTex, size: .05, transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  embers.frustumCulled = false; const fx = new T.Group(); fx.name = 'KatanaChamas'; fx.add(flames, embers);
  const seeds = Array.from({ length: NE }, (_, i) => ({ u: .35 + ((i * 37) % 60) / 100, ph: (i * 0.61803) % 1, v: .35 + ((i * 53) % 40) / 100, a: i * 2.4 }));
  const M = new T.Matrix4(), V = new T.Vector3(), Q = new T.Quaternion(), S = new T.Vector3(), I = new T.Quaternion();
  let heat = 0;
  Object.assign(root.userData, {
    tipA: new T.Vector3(0, B0 + .05, 0), tipB: new T.Vector3(0, B0 + L, -curve(1)), materials: mats,
    tick(time, fury = 0, swing = 0) { heat += ((.55 + fury * .45 + swing * .35) - heat) * .1; edgeMat.color.setRGB(1, .09 + fury * .1, .2 + .06 * Math.sin(time * 9)); steel.emissiveIntensity = .5 + .4 * fury; eyeMat.color.setRGB(1, .16 + .12 * Math.sin(time * 5), .2); },
    fx,
    /** Depois de posicionar a arma: chamas ancoradas no meio/terço inferior da lâmina, subindo em +Y do mundo. */
    updateFx(time, fury = 0, low = false, visible = true) {
      fMat.uniforms.time.value = time; fx.visible = visible; if (!visible) return; root.updateWorldMatrix(true, false);
      const n = low ? 5 : NF; flames.count = n;
      for (let i = 0; i < n; i++) { const u = .42 + i / (NF - 1) * .52, wob = Math.sin(time * 3.1 + i * 1.7); V.set(Math.sin(i * 2.3) * .03, B0 + u * L, -curve(u) + .012).applyMatrix4(root.matrixWorld);
        const hgt = (.26 + .22 * ((i * 7) % 3) / 2 + .06 * wob) * (1 + fury * .5) * heat * 1.4, wd = (.12 + .05 * ((i * 5) % 3) / 2) * (1 + fury * .3); S.set(wd, hgt, 1); M.compose(V, I, S); flames.setMatrixAt(i, M); aF.set([i * .37, fury, time * .3 + i, 1], i * 4); }
      flames.instanceMatrix.needsUpdate = true; fGeo.attributes.aF.needsUpdate = true;
      for (let i = 0; i < NE; i++) { const sd = seeds[i], k = (time * sd.v + sd.ph) % 1; V.set(Math.cos(sd.a) * .05, B0 + sd.u * L, -curve(sd.u)).applyMatrix4(root.matrixWorld);
        ePos.set([V.x + Math.cos(sd.a + time) * .12 * k, V.y + k * (.7 + fury * .4), V.z + Math.sin(sd.a + time) * .12 * k], i * 3); }
      eGeo.attributes.position.needsUpdate = true; embers.material.opacity = .9 * heat; void Q;
    },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); for (const m of mats) m.dispose(); dotTex.dispose(); fGeo.dispose(); fMat.dispose(); eGeo.dispose(); embers.material.dispose(); flames.dispose(); }
  });
  return root;
}
