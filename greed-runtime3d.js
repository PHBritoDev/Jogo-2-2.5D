/**
 * MISSÃO 21/11 — corpo da GANÂNCIA no runtime da esquadra: armas nas mãos (osso + empunhadura medida), armas autônomas /
 * telecinéticas na posição LÓGICA (uma instância por arma — nunca na mão e no ar ao mesmo tempo), rastro real por arma,
 * asas da fase II batendo por ossos (procedural: nenhum clipe do GLB move as asas), fase III (chifres ×2, asas maiores,
 * par inferior GananciaAsas2.glb nas costas, garras nos dedos), olhos em vórtice presos ao crânio, gotas de sangue
 * com física até o chão, penas ocasionais e aura de contorno no próprio material.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildGreedArsenal } from './greed-weapons3d.js?v=mod342';
import { GK_BONES, GK_WINGS } from './greed-boss3d.js?v=mod342';
import { createGreedVFX } from './greed-vfx3d.js?v=mod342';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v, ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const EYE_F = `uniform float uTime,uK;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);float sw=sin(4.*a+14.*r-uTime*2.2);
float iris=1.-smoothstep(.55,.95,r);vec3 c=mix(vec3(.5,0.,.02),vec3(1.,.12,.08),smoothstep(-.3,.8,sw))*iris+vec3(1.,.6,.5)*(1.-smoothstep(0.,.25,r))*.8;float pup=1.-smoothstep(.06,.12,length(vec2(p.x*2.6,p.y)));c*=1.-pup*.85;
float a2=iris*uK;if(a2<.02)discard;gl_FragColor=vec4(c*a2*1.6,a2);}`;

export function createGreedRuntime(T, scene, ctx = {}) {
  const vfx = createGreedVFX(T, scene), _v = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _m = new T.Matrix4(), _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3();
  let wingsSrc = null, wingsLoading = false, time = 0; const grip = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0)));
  const eyeGeo = new T.CircleGeometry(.016, 16), clawGeo = (() => { const g = new T.ConeGeometry(.018, 1, 5, 4); g.translate(0, .5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + .35 * y * y); } g.computeVertexNormals(); return g; })();
  const clawMat = new T.MeshStandardMaterial({ color: 0x140808, metalness: .8, roughness: .3, emissive: 0x5a0808, emissiveIntensity: .8 });
  function loadWings() { if (wingsSrc || wingsLoading) return; wingsLoading = true; new GLTFLoader().load(GK_WINGS, g => { wingsSrc = g.scene; }, undefined, () => { wingsLoading = false; }); }
  function boneMap(model) { const m = {}; model.traverse(o => { if (o.isBone) m[o.name] = o; }); return m; }
  function bindAxis(bone, worldAxis) { bone.updateWorldMatrix(true, false); bone.getWorldQuaternion(_q); return worldAxis.clone().applyQuaternion(_q.clone().invert()).normalize(); }
  const FILL = { value: .42 }; // intensidade da luz própria do chefe (qualidade baixa reduz em pose())
  function aura(mats, color) { for (const m of mats) { if (!m.isMeshStandardMaterial || m.userData.gkAura) continue; m.userData.gkAura = { value: 0 }; const U = m.userData.gkAura, C = new T.Color(color);
      // 22/11 (Etapa 9): LUZ SÓ DO CHEFE — chave virtual em espaço de vista (de cima/esquerda da câmera) + preenchimento suave aplicados
      // como emissivo no próprio material: realça ouro, vermelho, joias e rosto na arena escura sem luz nova, sombra ou draw call extra.
      m.onBeforeCompile = sh => { sh.uniforms.gkRimK = U; sh.uniforms.gkRimC = { value: C }; sh.uniforms.gkFill = FILL; sh.fragmentShader = 'uniform float gkRimK;uniform vec3 gkRimC;uniform float gkFill;\n' + sh.fragmentShader.replace('#include <lights_fragment_begin>', '#include <lights_fragment_begin>\n totalEmissiveRadiance += gkRimC * pow(1.0 - saturate(dot(normal, geometryViewDir)), 3.0) * gkRimK;\n { vec3 gkL = normalize(vec3(-.45, .75, .5)); float gkD = max(dot(normal, gkL), 0.); vec3 gkH = normalize(gkL + geometryViewDir); totalEmissiveRadiance += gkFill * (diffuseColor.rgb * (.22 + .78 * gkD) + mix(vec3(.04), diffuseColor.rgb, metalnessFactor) * pow(max(dot(normal, gkH), 0.), 24.) * (1. - roughnessFactor) * 2.2); }'); };
      m.customProgramCacheKey = () => 'gkAura2'; m.needsUpdate = true; } }
  return {
    vfx,
    /** Prende o arsenal e os enfeites ao corpo novo (chamado uma vez por corpo). */
    attach(b, a) {
      const W = buildGreedArsenal(T), roots = {}; for (const k of 'ABCD') { const r = new T.Group(); r.add(W[k]); r.visible = false; scene.add(r); roots[k] = r; }
      const bones = boneMap(b.model), phase2 = a.kind === 'greedB', S = b.model.scale.x;
      const G = b.gk = { W, roots, bones, phase2, S, prevTip: {}, keyRev: {}, eyes: [], claws: [], wings: null, horn0: null, flap: 0, flapPh: 0, p3: 0, lower: null, drops: 0, feather: 0, vis: {} };
      // olhos: dois discos de vórtice presos ao osso da cabeça, à frente do rosto (medido a partir de headfront)
      const head = bones.Head, hf = bones.headfront; if (head && hf) { b.model.updateMatrixWorld(true); head.getWorldPosition(_v); hf.getWorldPosition(_v2); const fwd = _v3.subVectors(_v2, _v).setY(0).normalize(), right = _x.set(fwd.z, 0, -fwd.x);
        for (const s of [-1, 1]) { const mat = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: 1 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: EYE_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
          const e = new T.Mesh(eyeGeo, mat); const wp = _y.copy(_v2).addScaledVector(right, s * .033 * (phase2 ? 1 : 1.05)).addScaledVector(fwd, .028).add(_z.set(0, phase2 ? .07 : .045, 0));
          head.worldToLocal(e.position.copy(wp)); e.scale.setScalar(1 / S); head.add(e); e.lookAt(_y.copy(wp).addScaledVector(fwd, 1)); e.renderOrder = 12; G.eyes.push(e); } G.mouth = { head, fwd: fwd.clone(), right: right.clone(), at: _v2.clone().addScaledVector(fwd, .03).add(_z.set(0, -.035, 0)) }; head.worldToLocal(G.mouth.at); }
      // garras demoníacas: 4 talões por mão presos às falanges distais (visíveis na fase III)
      for (const side of ['Left', 'Right']) for (const f of ['Index', 'Middle', 'Ring', 'Little']) { const bn = bones[side + f + 'Distal']; if (!bn) continue; const c = new T.Mesh(clawGeo, clawMat); c.scale.set(1 / S, .42 / S * (f === 'Middle' ? 1.15 : 1), 1 / S); bn.add(c); c.visible = false; G.claws.push(c); }
      if (phase2) { const R = bones[GK_BONES.wingBaseR], L = bones[GK_BONES.wingBaseL]; b.model.updateMatrixWorld(true);
        const fwd = new T.Vector3(0, 0, 1), up = new T.Vector3(0, 1, 0);
        G.wings = [R, L].map((bn, i) => bn && { bn, q0: bn.quaternion.clone(), ax: bindAxis(bn, fwd), up: bindAxis(bn, up), s: i ? -1 : 1, s0: bn.scale.clone() }).filter(Boolean);
        G.wingTips = ['Bone_048', 'Bone_090', 'Bone_051', 'Bone_083'].map(n => bones[n]).filter(Boolean);
        G.horns = GK_BONES.horns.map(n => bones[n]).filter(Boolean).map(bn => ({ bn, s0: bn.scale.clone() }));
        loadWings(); }
      aura(b.mats, phase2 ? 0x8a1020 : 0x6a0a14);
    },
    /** Pose por quadro (depois do mixer). */
    pose(b, a, dt, low, camera, slash) {
      const G = b.gk, g = a.gk; if (!G) return; G.tick = (G.tick || 0) + dt; const vis = b.holder.visible, phase = g?.phase || 1;
      const placeHand = (root, hand) => { hand.updateWorldMatrix(true, false); hand.getWorldPosition(root.position); hand.getWorldQuaternion(root.quaternion).multiply(grip);
        const L = 1.2, ax = _v.set(0, L, 0).applyQuaternion(root.quaternion), floor = (a.y || 0) + .1 - root.position.y; if (ax.y < floor) { const want = Math.asin(clamp(floor / L, -1, 1)), cur = Math.asin(clamp(ax.y / L, -1, 1)); _v2.set(-ax.z, 0, ax.x); if (_v2.lengthSq() < 1e-4) _v2.set(Math.cos(a.yaw), 0, -Math.sin(a.yaw)); _q.setFromAxisAngle(_v2.normalize(), want - cur); root.quaternion.premultiply(_q); } };
      const ents = g ? g.ents : [], held = { [g?.hands?.R]: 'R', [g?.hands?.L]: 'L' };
      for (const k of 'ABCD') { const r = G.roots[k], w = G.W[k]; let on = false, trail = false, tkey = null;
        if (a.alive && held[k] && !(a.act && a.act.type === 'gkPhase')) { placeHand(r, held[k] === 'R' ? b.hand : b.lhand); on = true; trail = !!(a.act && a.act.move) || (a.act && a.act.type === 'gkFly' && a.act.stage === 'dive'); }
        else { const e = ents.find(x => x.key === k && x.mode !== 'gone'); const sp = k === 'C' && g?.spear && (g.spear.alive || g.spear.dead < .5) ? g.spear : null;
          if (sp) { r.position.set(sp.x, sp.y, sp.z); _y.set(sp.dx, sp.dy, sp.dz).normalize(); _z.set(0, 1, 0).cross(_y).normalize(); if (_z.lengthSq() < .01) _z.set(1, 0, 0); _x.crossVectors(_y, _z); _m.makeBasis(_x, _y, _z); r.quaternion.setFromRotationMatrix(_m); r.position.addScaledVector(_y, -.6); on = sp.alive; trail = sp.alive; }
          else if (e) { r.position.set(e.x, e.y, e.z); _y.set(...e.ax).normalize(); _z.set(...e.nrm); _z.addScaledVector(_y, -_z.dot(_y)); if (_z.lengthSq() < 1e-4) _z.set(1, 0, 0).addScaledVector(_y, -_y.x); _z.normalize(); _x.crossVectors(_y, _z); _m.makeBasis(_x, _y, _z); r.quaternion.setFromRotationMatrix(_m);
            /* 22/11: a origem lógica JÁ é o punho (pivô do golpe) — sem deslocamento: o gume visto é o gume que dá dano */
            on = true; trail = !!(e.strike && e.strike.t > e.strike.w - .06 && e.strike.t < e.strike.w + e.strike.d + .12) || e.mode === 'outbound'; tkey = e.strike ? 'gkE' + k + ':' + e.strike.id : 'gkO' + k + ':' + e.id; vfx.weaponAura(k, r, e.mode, dt); } }
        r.visible = on && vis; if (r.visible !== G.vis[k]) { if (G.vis[k] !== undefined) vfx.flashWeapon(k, r.position, r.visible); G.vis[k] = r.visible; }
        w.userData.updateFx(time, (a.act && a.act.glow) || (phase >= 3 ? .35 : 0), low);
        if (trail && r.visible && slash) { r.updateMatrixWorld(true); const ud = w.userData; _v.copy(ud.tipA).applyMatrix4(w.matrixWorld); _v2.copy(ud.tipB).applyMatrix4(w.matrixWorld); const key = tkey || ('gk' + k + ':' + (a.act?.rev ?? '') + (a.anim?.rev ?? 0)); slash.sample(key, _v, _v2, { style: ud.style, gain: tkey ? 1 : .7, extend: tkey ? .7 : .45, inner: .15 }); } } /* 22/11: rastro por GOLPE da arma autônoma (não emenda golpes) */
      // asas (fase II/III): batida procedural pelos ossos-base nas costas, com fase/amplitude pelo modo de voo
      if (G.wings) { const wm = g?.wing || { mode: 'fold', k: 0 }, mode = wm.mode, f = mode === 'flap' ? 2.3 : mode === 'hover' ? 3.1 : mode === 'brake' ? 1.6 : .7, amp = mode === 'flap' ? .62 : mode === 'hover' ? .48 : mode === 'brake' ? .3 : mode === 'dive' ? .05 : .06;
        G.flapPh += dt * f * Math.PI * 2; G.flap += ((mode === 'dive' ? -.55 : mode === 'brake' ? .55 : mode === 'fold' ? -.08 : .1) - G.flap) * Math.min(1, dt * 4);
        const beat = Math.sin(G.flapPh) * amp, spread = G.flap + (phase >= 3 ? .12 : 0), big = 1 + .35 * G.p3;
        for (const w of G.wings) { w.bn.quaternion.copy(w.q0).multiply(_q.setFromAxisAngle(w.ax, w.s * (beat + spread * .6))).multiply(_q2.setFromAxisAngle(w.up, -w.s * (spread * .5 + Math.cos(G.flapPh) * amp * .25))); w.bn.scale.copy(w.s0).multiplyScalar(big); }
        if (a.alive && (mode === 'flap' || mode === 'hover') && Math.random() < dt * (low ? .6 : 1.4) && G.wingTips?.length) { const tb = G.wingTips[(Math.random() * G.wingTips.length) | 0]; tb.getWorldPosition(_v); vfx.feather(_v, phase); } }
      // fase III: chifres ×2 e par inferior de asas nas costas
      if (phase >= 3 && G.p3 < 1) G.p3 = Math.min(1, G.p3 + dt / 1.2);
      if (G.horns) for (const h of G.horns) h.bn.scale.copy(h.s0).multiplyScalar(1 + ease(G.p3));
      for (const c of G.claws) c.visible = phase >= 3 && vis && a.alive;
      if (phase >= 3 && wingsSrc && !G.lower) { const sp = G.bones.Spine || G.bones.Chest; if (sp) { const L = wingsSrc.clone(true); L.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } }); sp.add(L);
          L.scale.setScalar(1.75 / G.S); L.position.set(0, -.06 / G.S, -.16 / G.S); L.rotation.set(-.25, Math.PI, Math.PI); const bm = boneMap(L); G.lower = { L, chains: [['bone_1', 1], ['tripoHead_0', -1], ['bone_18', .6], ['bone_24', -.6]].map(([n, s]) => bm[n] && { bn: bm[n], q0: bm[n].quaternion.clone(), s }).filter(Boolean) }; vfx.burstAt(L.getWorldPosition(_v), 'wings'); } }
      if (G.lower) { G.lower.L.visible = vis; const k = Math.min(1, G.p3); for (const c of G.lower.chains) c.bn.quaternion.copy(c.q0).multiply(_q.setFromAxisAngle(_v.set(0, 0, 1), c.s * (Math.sin(G.flapPh + .9) * .32 + .12) * k)); }
      // olhos (vórtice) e sangue nas comissuras
      for (const e of G.eyes) { e.material.uniforms.uTime.value = time; e.material.uniforms.uK.value = a.alive ? (phase >= 3 ? 1.3 : phase === 2 ? 1.1 : .9) : Math.max(0, e.material.uniforms.uK.value - dt); e.visible = vis; }
      if (G.mouth && a.alive && vis) { G.drops -= dt; if (G.drops <= 0) { G.drops = 1.6 + Math.random() * 2.6; const s = Math.random() < .5 ? -1 : 1; _v.copy(G.mouth.at); _v.x += s * .022 * (G.phase2 ? 1 : 1); G.mouth.head.localToWorld(_v); vfx.blood(_v, ctx.ground ? ctx.ground(_v.x, _v.z) : a.y); } }
      for (const m of b.mats) if (m.userData.gkAura) m.userData.gkAura.value = a.alive ? (phase >= 3 ? .9 : phase === 2 ? .55 : .35) + .1 * Math.sin(time * 2.4) : 0;
      // pouso invertido no teto: o corpo gira 180° em torno do eixo lateral (pés no teto)
      // pouso invertido: o clipe Upside_Down_Rope_Hang_1 já pendura o corpo de cabeça para baixo; os PÉS ficam presos ao teto real
      if (b.modelY0 === undefined) b.modelY0 = b.model.position.y; const flip = ease(a.gkFlip || 0); let off = 0;
      if (flip > 0 && a.gkCeil !== undefined && G.bones.LeftFoot) { G.bones.LeftFoot.getWorldPosition(_v); G.bones.RightFoot?.getWorldPosition(_v2); const feet = Math.max(_v.y, _v2.y || -1e9); G.hangOff = (G.hangOff || 0) + (a.gkCeil - .05 - feet) * Math.min(1, dt * 8); off = G.hangOff * flip; } else G.hangOff = 0;
      b.model.position.y = b.modelY0 + off;
    },
    event(type, d, bodies) { vfx.event(type, d, bodies); if (type === 'gkPhase' && d.stage === 'burst') { const B = bodies.get(d.actor.id); if (B && B.gk) B.gk.p3 = .001; } },
    update(dt, quality, camera) { time += dt; vfx.update(dt, quality, camera); },
    detach(b) { const G = b.gk; if (!G) return; for (const k of 'ABCD') { scene.remove(G.roots[k]); G.W[k].userData.dispose(); } for (const e of G.eyes) e.material.dispose(); b.gk = null; },
    clear() { vfx.clear(); },
    stats() { return vfx.stats(); }
  };
}
