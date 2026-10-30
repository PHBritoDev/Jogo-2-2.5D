/**
 * MOD 237 — "Ceifadora do Limiar", arma do Guardião do Portal (mini-chefe Enemy1). Design original inspirado na
 * silhueta de uma foice dupla demoníaca: haste longa de ferro negro com runas e veias vermelhas, máscara com chifres no
 * centro, duas lâminas curvas simétricas (aço escuro com fio prateado e gume vermelho-sangue) e ponta de lança embaixo.
 *
 * Geometria procedural de baixo custo (~20 malhas), materiais PBR + gume emissivo que pulsa. Origem no ponto de
 * empunhadura, haste ao longo de +Y (cabeça para cima), lâminas abertas no eixo ±X. userData: tick(t, fúria), tipA/tipB
 * (pontas das lâminas para o rastro), length.
 */
export function buildWardenScythe(T) {
  const g = new T.Group(); g.name = 'CeifadoraDoLimiar';
  const iron = new T.MeshStandardMaterial({ color: 0x17141a, metalness: .85, roughness: .42 });
  const steel = new T.MeshStandardMaterial({ color: 0x3a3a44, metalness: .95, roughness: .26 });
  const silver = new T.MeshStandardMaterial({ color: 0xb9b6c4, metalness: 1, roughness: .2 });
  const bone = new T.MeshStandardMaterial({ color: 0xc9c0b2, metalness: .1, roughness: .55, emissive: 0x200404, emissiveIntensity: .4 });
  const blood = new T.MeshStandardMaterial({ color: 0x5a0008, emissive: 0xc0101c, emissiveIntensity: 1.4, metalness: .3, roughness: .35 });
  const glowM = new T.MeshBasicMaterial({ color: 0xff2030, toneMapped: false });
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  /** Tubo que afina (chifres, nervuras, veias). */
  const taper = (pts, r0, r1, seg = 16, rad = 6) => {
    const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), geo = new T.TubeGeometry(curve, seg, 1, rad, false), pos = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3();
    for (let i = 0; i <= seg; i++) { const u = i / seg, r = r0 + (r1 - r0) * u; curve.getPointAt(u, c); for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(pos, n).sub(c).multiplyScalar(r); pos.setXYZ(n, c.x + v.x, c.y + v.y, c.z + v.z); } }
    geo.computeVertexNormals(); return geo;
  };
  const L = 2.15, low = -.62, top = low + L; // empunhadura em y=0; haste de -0,62 a +1,53
  // haste: ferro negro com anéis, runas e veia vermelha em espiral
  add(new T.CylinderGeometry(.026, .031, L, 10), iron, 0, low + L / 2);
  for (const y of [-.5, -.18, .2, .62, 1.02, 1.32]) add(new T.TorusGeometry(.034, .009, 6, 14), steel, 0, y, 0, Math.PI / 2);
  const vein = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * Math.PI * 9; vein.push([Math.cos(a) * .031, low + .08 + u * (L - .3), Math.sin(a) * .031]); }
  add(taper(vein, .006, .004, 80, 4), blood);
  for (let i = 0; i < 5; i++) { const y = -.4 + i * .36, a = i * 1.3; add(new T.BoxGeometry(.012, .05, .006), glowM, Math.cos(a) * .033, y + .1, Math.sin(a) * .033, 0, -a, 0); } // runas sutis
  // empunhadura envolta em couro
  add(new T.CylinderGeometry(.033, .033, .34, 10), new T.MeshStandardMaterial({ color: 0x2a0a0c, roughness: .8 }), 0, .02);
  // gema no meio da haste
  add(new T.OctahedronGeometry(.045, 0), blood, 0, .42).scale.set(1, 1.6, 1);
  // ponta inferior: lança curta com aletas
  add(new T.ConeGeometry(.045, .3, 6), steel, 0, low - .14, 0, Math.PI);
  for (const s of [-1, 1]) add(new T.ConeGeometry(.018, .14, 4), steel, s * .04, low - .02, 0, 0, 0, s * 2.4);
  // cabeça: máscara de caveira com chifres
  const hy = top - .1;
  const skull = add(new T.SphereGeometry(.105, 18, 14), bone, 0, hy, .01); skull.scale.set(1, 1.08, .9);
  add(new T.BoxGeometry(.13, .06, .09), bone, 0, hy - .11, .02); // mandíbula
  for (const s of [-1, 1]) { add(new T.SphereGeometry(.026, 10, 8), new T.MeshBasicMaterial({ color: 0x070002 }), s * .042, hy + .01, .085); add(new T.SphereGeometry(.012, 8, 6), glowM, s * .042, hy + .01, .095); }
  for (let i = -2; i <= 2; i++) add(new T.ConeGeometry(.008, .028, 4), bone, i * .019, hy - .085, .07, Math.PI);
  for (const s of [-1, 1]) {
    add(taper([[s * .07, hy + .06, 0], [s * .13, hy + .2, -.02], [s * .1, hy + .36, -.04], [s * .03, hy + .46, -.02]], .03, .004, 18, 6), bone); // chifres que sobem e se curvam para dentro
    add(taper([[s * .06, hy + .02, -.03], [s * .16, hy + .08, -.06], [s * .2, hy + .16, -.08]], .016, .003, 10, 5), steel); // espinhos laterais
  }
  // lâminas simétricas: crescente com dentes internos, aço escuro, fio prateado e gume vermelho
  const blade = new T.Shape();
  blade.moveTo(.08, -.04);
  blade.bezierCurveTo(.32, .02, .58, .18, .62, .52); // dorso externo
  blade.bezierCurveTo(.64, .7, .58, .84, .5, .96); // ponta superior
  blade.bezierCurveTo(.52, .78, .46, .6, .36, .46);
  blade.lineTo(.4, .4); blade.lineTo(.3, .36); blade.lineTo(.33, .3); blade.lineTo(.22, .22); blade.lineTo(.24, .15); blade.lineTo(.12, .1); // dentes
  blade.lineTo(.08, -.04);
  const bladeGeo = new T.ExtrudeGeometry(blade, { depth: .012, bevelEnabled: true, bevelThickness: .008, bevelSize: .01, bevelSegments: 1, curveSegments: 18 }); bladeGeo.translate(0, 0, -.006);
  const edgePts = [[.08, -.04], [.32, .02], [.5, .14], [.6, .36], [.62, .52], [.6, .72], [.5, .96]];
  const bl = [];
  for (const s of [-1, 1]) {
    const b = new T.Group(); b.position.set(0, hy - .02, -.005); b.scale.set(s, 1, 1); g.add(b);
    const m = new T.Mesh(bladeGeo, steel); m.castShadow = true; b.add(m);
    // fio prateado no dorso e gume vermelho que pulsa (tubos finos sobre a borda)
    const edge = taper(edgePts.map(([x, y]) => [x, y, .016]), .01, .004, 24, 4); const e1 = new T.Mesh(edge, silver); b.add(e1);
    const red = taper(edgePts.map(([x, y]) => [x * 1.015, y * 1.01, 0]), .014, .005, 24, 5); const e2 = new T.Mesh(red, blood); b.add(e2);
    // nervuras que ligam a máscara à lâmina (as "asas")
    for (let k = 0; k < 3; k++) { const geo = taper([[.06, .02 + k * .05, .01], [.18 + k * .05, .1 + k * .1, .015], [.3 + k * .08, .2 + k * .16, .012]], .014, .004, 10, 5); const r = new T.Mesh(geo, iron); r.castShadow = true; b.add(r); }
    bl.push(b);
  }
  g.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const tipLocal = [new T.Vector3(-.5, hy - .02 + .96, 0), new T.Vector3(.5, hy - .02 + .96, 0)];
  g.userData.tipA = tipLocal[0]; g.userData.tipB = tipLocal[1]; g.userData.length = L;
  g.userData.tick = (t, fury = 0) => { const p = .5 + .5 * Math.sin(t * (4 + fury * 5)); blood.emissiveIntensity = 1 + p * (.8 + fury * 1.4); glowM.color.setRGB(1, .12 + p * .1, .18); };
  g.userData.dispose = () => g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  return g;
}
