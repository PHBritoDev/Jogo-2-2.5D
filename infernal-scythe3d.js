import { energyMaterial, flameGeometry } from './vfx-flow3d.js';
/**
 * MOD 238 — "Foice do Vulcão Sepultado", arma do mini-chefe Enemy2 (Ato II). Original, inspirada na silhueta de uma foice
 * de guerra longa com crânio: haste de obsidiana com vértebras e espinhos, crânio com chifres na junção, lâmina larga em
 * crescente (aço negro, fio de brasa) e contrapeso em gancho. Fogo laranja VOLUMÉTRICO: línguas de chama instanciadas
 * (flameGeometry da VFX Engine 2.0, material 'cinder') ao longo do gume e saindo do crânio, com núcleo, ponta escura e
 * brasas — contraste quente com as magias roxo-magenta do corpo.
 *
 * Origem no ponto de empunhadura, haste em +Y, lâmina abrindo para +X. userData: tick(t, fúria, balanço), tipA/tipB
 * (ponta e calcanhar da lâmina para o rastro), length, dispose().
 */
export function buildInfernalScythe(T) {
  const g = new T.Group(); g.name = 'FoiceDoVulcaoSepultado';
  const obs = new T.MeshStandardMaterial({ color: 0x111014, metalness: .55, roughness: .38, emissive: 0x060203 });
  const steel = new T.MeshStandardMaterial({ color: 0x24222a, metalness: .65, roughness: .3, emissive: 0x0a0505 });
  const bone = new T.MeshStandardMaterial({ color: 0xbfb4a2, metalness: .08, roughness: .6, emissive: 0x220a02, emissiveIntensity: .5 });
  const ember = new T.MeshStandardMaterial({ color: 0x3a0a00, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: .5 });
  const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  const taper = (pts, r0, r1, seg = 14, rad = 6) => { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), geo = new T.TubeGeometry(c, seg, 1, rad, false), pos = geo.attributes.position, p = new T.Vector3(), v = new T.Vector3();
    for (let i = 0; i <= seg; i++) { c.getPointAt(i / seg, p); const r = r0 + (r1 - r0) * i / seg; for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(pos, n).sub(p).multiplyScalar(r); pos.setXYZ(n, p.x + v.x, p.y + v.y, p.z + v.z); } } geo.computeVertexNormals(); return geo; };
  const L = 2.5, low = -.75, top = low + L;
  add(new T.CylinderGeometry(.03, .034, L, 10), obs, 0, low + L / 2);
  for (let i = 0; i < 16; i++) { const y = low + .18 + i * .135; add(new T.CylinderGeometry(.042, .038, .05, 8), i % 4 === 0 ? steel : obs, 0, y); if (i % 4 === 2) for (const s of [-1, 1]) add(new T.ConeGeometry(.012, .07, 4), steel, s * .045, y, 0, 0, 0, -s * 1.3); } // vértebras e espinhos
  add(new T.CylinderGeometry(.036, .036, .36, 10), new T.MeshStandardMaterial({ color: 0x1c0a06, roughness: .85 }), 0, .04);
  // contrapeso em gancho e ponta
  add(taper([[0, low, 0], [.05, low - .12, 0], [.13, low - .16, 0], [.18, low - .08, 0]], .03, .006), steel); add(new T.ConeGeometry(.035, .22, 5), steel, 0, low - .14, 0, Math.PI);
  // crânio com chifres na junção da lâmina
  const hy = top - .14; const sk = add(new T.SphereGeometry(.1, 16, 12), bone, 0, hy, .01); sk.scale.set(1, 1.12, .92);
  add(new T.BoxGeometry(.12, .055, .08), bone, 0, hy - .11, .025);
  for (const s of [-1, 1]) { add(new T.SphereGeometry(.024, 8, 6), new T.MeshBasicMaterial({ color: 0x050000 }), s * .04, hy + .01, .08); add(new T.SphereGeometry(.011, 6, 5), new T.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false }), s * .04, hy + .01, .09);
    add(taper([[s * .06, hy + .05, -.01], [s * .15, hy + .13, -.04], [s * .2, hy + .26, -.03], [s * .16, hy + .36, .01]], .028, .004, 16, 6), bone); }
  add(taper([[0, hy + .1, -.02], [0, hy + .24, -.05], [.02, hy + .34, -.02]], .02, .004), steel); // crista
  // lâmina: crescente larga e longa, dorso grosso, ponta em gancho, dentes ósseos no dorso
  const sh = new T.Shape(); sh.moveTo(.06, -.05); sh.bezierCurveTo(.45, .02, .9, .02, 1.25, -.28); sh.bezierCurveTo(1.1, -.12, .78, -.05, .55, -.06); sh.bezierCurveTo(.4, -.08, .26, -.14, .12, -.2); sh.lineTo(.06, -.05);
  const bladeGeo = new T.ExtrudeGeometry(sh, { depth: .016, bevelEnabled: true, bevelThickness: .01, bevelSize: .012, bevelSegments: 1, curveSegments: 24 }); bladeGeo.translate(0, 0, -.008);
  const blade = add(bladeGeo, steel, 0, hy + .02, 0);
  const edgeCurve = [[.12, -.2], [.4, -.09], [.7, -.05], [1, -.14], [1.25, -.28]];
  const glowEdge = add(taper(edgeCurve.map(([x, y]) => [x, y + hy + .02, 0]), .012, .004, 24, 5), ember);
  for (let i = 0; i < 6; i++) { const x = .2 + i * .17, y = hy + .02 + .02 - Math.pow((x - .65) / .7, 2) * .05; add(new T.ConeGeometry(.018, .08 + (i % 2) * .04, 4), bone, x, y + .05, 0, 0, 0, -.25); }
  // fogo: línguas instanciadas ao longo do gume e no crânio (não sprites), com material de chama da VFX Engine 2.0
  const fireMat = energyMaterial(T, 'cinder', { alpha: .9, flame: 1, warp: .1, frequency: 1.4 });
  const fl = new T.InstancedMesh(flameGeometry(T), fireMat, 22); fl.frustumCulled = false; g.add(fl);
  const spots = []; for (let i = 0; i < 14; i++) { const u = i / 13, x = .12 + u * 1.1, y = hy + .02 + (-.2 + (u < .5 ? u * .3 : .15 - (u - .5) * .55)); spots.push([x, y, 0, .32 + Math.sin(u * 3) * .12, u]); }
  for (let i = 0; i < 8; i++) spots.push([(i - 3.5) * .03, hy + .12, -.02, .28, i / 8]);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), E = new T.Euler();
  g.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  g.userData.tipA = new T.Vector3(1.25, hy - .26, 0); g.userData.tipB = new T.Vector3(.5, hy - .04, 0); g.userData.length = L;
  g.userData.tick = (t, fury = 0, swing = 0) => {
    fireMat.uniforms.time.value = t; ember.emissiveIntensity = 1.3 + .5 * Math.sin(t * 7) + fury * .8;
    spots.forEach(([x, y, z, s, u], i) => { const k = s * (1 + fury * .5 + swing * .4) * (.85 + .25 * Math.sin(t * 9 + i * 1.7));
      P.set(x, y, z); Q.setFromEuler(E.set(-.15 - swing * .9, Math.sin(t * 3 + i) * .4, -.3 + u * .4 + Math.sin(t * 5 + i) * .12)); S.set(k * .9, k, k * .9); M.compose(P, Q, S); fl.setMatrixAt(i, M); });
    fl.instanceMatrix.needsUpdate = true;
  };
  g.userData.dispose = () => g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  void blade; void glowEdge; return g;
}
