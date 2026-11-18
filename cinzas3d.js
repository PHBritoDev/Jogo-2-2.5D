/**
 * Mod 327 (P2) — morte confirmada → desintegração em pó. Pipeline ÚNICO por entidade:
 *   vivo → clipe de morte (do próprio rig, já existente) → dissolve_ash (aqui) → limpeza/respawn (de quem chamou).
 *
 *  - Shader barato por onBeforeCompile num CLONE do material (o material compartilhado dos vivos nunca é tocado):
 *    limiar de ruído 3D que sobe de baixo para cima, borda estreita incandescente e fuligem escurecendo o que resta.
 *  - Poucas partículas num pool fixo (2 Points: fuligem com mistura normal + brasas/pó celeste aditivo), sem malha
 *    por pedaço, sem copiar geometria skinned. Qualidade baixa: só o dissolve, sem partículas.
 *  - Variantes: demon (cinza escura, brasas), boss (rachaduras energizadas antes de ruir, detritos), human (pó claro e
 *    respeitoso, lento), hero (partículas celestiais e REMATERIALIZA no respawn), animal (sutil; não há mortes de
 *    animais no jogo — só existe para o futuro). Uma entidade só se desfaz uma vez (start repetido é ignorado).
 *  - cancel()/clear() devolvem os materiais originais e descartam os clones (pular cena, teleporte, troca de ato).
 */
export const ASH = Object.freeze({
  demon: { dur: 1.7, edge: [1, .38, .08], soot: [.07, .06, .06], glow: [1, .45, .12], parts: 26, crack: 0 },
  boss: { dur: 2.5, edge: [1, .55, .18], soot: [.06, .05, .05], glow: [1, .6, .2], parts: 40, crack: 1 },
  human: { dur: 2.3, edge: [.72, .7, .66], soot: [.5, .48, .45], glow: [.85, .82, .76], parts: 16, crack: 0 },
  hero: { dur: .7, edge: [1, .93, .66], soot: [.95, .9, .75], glow: [1, .95, .78], parts: 34, crack: 0, celestial: 1 },
  animal: { dur: 2, edge: [.6, .6, .58], soot: [.55, .55, .52], glow: [.7, .7, .68], parts: 0, crack: 0 }
});
/** Limiar puro (testável): um fragmento à altura relativa h (0 pé … 1 cabeça) e ruído n some quando p o alcança. */
export function ashVisible(p, h, n) { return (h * .7 + n * .3) - (p * 1.2 - .1) >= 0; }

const NOISE = 'float ashH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}float ashN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(ashH(i),ashH(i+vec3(1,0,0)),f.x),mix(ashH(i+vec3(0,1,0)),ashH(i+vec3(1,1,0)),f.x),f.y),mix(mix(ashH(i+vec3(0,0,1)),ashH(i+vec3(1,0,1)),f.x),mix(ashH(i+vec3(0,1,1)),ashH(i+vec3(1,1,1)),f.x),f.y),f.z);}';
function patch(material, U) {
  const m = material.clone(), prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey?.();
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAshP;').replace('#include <project_vertex>', '#include <project_vertex>\nvAshP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAshP;uniform float uAshP,uAshCrack;uniform vec2 uAshY;uniform vec3 uAshEdge,uAshSoot;' + NOISE + 'float ashD;')
      .replace('#include <map_fragment>', `#include <map_fragment>
{float h=clamp((vAshP.y-uAshY.x)/max(.01,uAshY.y-uAshY.x),0.,1.);float n=ashN(vAshP*3.1)*.7+ashN(vAshP*9.3)*.3;ashD=(h*.7+n*.3)-(uAshP*1.2-.1);if(ashD<0.)discard;
diffuseColor.rgb=mix(diffuseColor.rgb,uAshSoot,smoothstep(.22,0.,ashD)*.85);}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{float e=1.-smoothstep(0.,.05,ashD);float cr=uAshCrack*smoothstep(.93,.99,abs(sin(ashN(vAshP*2.2)*24.)))*smoothstep(.45,.0,ashD)*(.4+.6*smoothstep(0.,.3,uAshP));totalEmissiveRadiance+=uAshEdge*(e*2.2+cr*1.6);}`);
  };
  m.customProgramCacheKey = () => 'cinza327|' + (prevKey || material.type);
  m.transparent = material.transparent; m.needsUpdate = true;
  return m;
}

export function createAshDissolve(T, scene, { low = false } = {}) {
  const jobs = new Map(), N = low ? 0 : 72, box = new T.Box3(), tmp = new T.Vector3();
  const mk = (blending) => { const g = new T.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setDrawRange(0, 0);
    const p = new T.Points(g, new T.PointsMaterial({ size: blending ? .09 : .12, vertexColors: true, transparent: true, opacity: blending ? .95 : .8, depthWrite: false, blending: blending ? T.AdditiveBlending : T.NormalBlending, sizeAttenuation: true }));
    p.frustumCulled = false; p.name = blending ? 'cinzas-brasas' : 'cinzas-fuligem'; if (N) scene.add(p); return { p, pos, col, vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0 }; };
  const soot = mk(false), glow = mk(true);
  function emit(sys, x, y, z, c, up, wind) { if (!N) return; const i = sys.next; sys.next = (sys.next + 1) % N; sys.pos.set([x, y, z], i * 3); sys.col.set(c, i * 3); sys.vel.set([(Math.random() - .5) * .5 + wind, up * (.6 + Math.random() * .9), (Math.random() - .5) * .5], i * 3); sys.life[i] = 1 + Math.random() * .9; }
  function stepSys(sys, dt) { if (!N) return; let alive = 0; for (let i = 0; i < N; i++) { if (sys.life[i] <= 0) { sys.pos[i * 3 + 1] = -1e5; continue; } sys.life[i] -= dt; alive++; for (let k = 0; k < 3; k++) sys.pos[i * 3 + k] += sys.vel[i * 3 + k] * dt; sys.vel[i * 3] *= .98; sys.vel[i * 3 + 1] *= .985; const f = Math.max(0, sys.life[i]); for (let k = 0; k < 3; k++) sys.col[i * 3 + k] *= .985 + .015 * f; }
    sys.p.geometry.attributes.position.needsUpdate = true; sys.p.geometry.attributes.color.needsUpdate = true; sys.p.geometry.setDrawRange(0, alive ? N : 0); }
  function restore(J) { for (const [mesh, orig] of J.swaps) { const cur = mesh.material; mesh.material = orig; (Array.isArray(cur) ? cur : [cur]).forEach(m => m.dispose()); } J.swaps.length = 0; }
  return {
    ASH, get count() { return jobs.size; },
    /** Começa a desfazer `root` (uma vez). opts: { reverse (rematerializar), onDone } */
    start(root, variant = 'demon', { reverse = false, onDone = null } = {}) {
      if (!root || (jobs.has(root) && !reverse)) return false; const old = jobs.get(root); if (old) { restore(old); jobs.delete(root); }
      const V = ASH[variant] || ASH.demon; root.updateMatrixWorld(true); box.setFromObject(root);
      if (!isFinite(box.min.y)) { box.min.set(root.position.x - .5, root.position.y, root.position.z - .5); box.max.set(root.position.x + .5, root.position.y + 1.9, root.position.z + .5); }
      const U = { uAshP: { value: reverse ? 1 : 0 }, uAshY: { value: new T.Vector2(box.min.y, box.max.y) }, uAshEdge: { value: new T.Color(...V.edge) }, uAshSoot: { value: new T.Color(...V.soot) }, uAshCrack: { value: V.crack } };
      const J = { root, V, U, t: 0, reverse, onDone, swaps: [], box: box.clone(), variant, carry: 0 };
      root.traverse(o => { if (!o.isMesh || !o.material || o.isPoints) return; const orig = o.material; J.swaps.push([o, orig]); o.material = Array.isArray(orig) ? orig.map(m => patch(m, U)) : patch(orig, U); });
      jobs.set(root, J); return true;
    },
    active(root) { return jobs.has(root); },
    cancel(root) { const J = jobs.get(root); if (!J) return; restore(J); jobs.delete(root); },
    clear() { for (const J of jobs.values()) restore(J); jobs.clear(); for (const s of [soot, glow]) { s.life.fill(0); s.p.geometry.setDrawRange(0, 0); } },
    update(dt) {
      for (const [root, J] of jobs) {
        J.t += dt; const u = Math.min(1, J.t / J.V.dur), p = J.reverse ? 1 - u : u; J.U.uAshP.value = p;
        if (!root.parent || !root.visible && !J.reverse) { restore(J); jobs.delete(root); J.onDone?.(); continue; }
        // partículas na faixa que está se desfazendo (a quantidade acompanha a velocidade do dissolve)
        J.carry += dt * J.V.parts / J.V.dur * (low ? 0 : 1); const b = J.box, band = b.min.y + (b.max.y - b.min.y) * Math.min(1, Math.max(0, p * 1.15 - .05));
        while (J.carry >= 1) { J.carry--; tmp.set(b.min.x + Math.random() * (b.max.x - b.min.x), band + (Math.random() - .5) * .25, b.min.z + Math.random() * (b.max.z - b.min.z));
          if (J.V.celestial) emit(glow, tmp.x, tmp.y, tmp.z, J.V.glow, 1.6, 0); else { emit(soot, tmp.x, tmp.y, tmp.z, J.V.soot, .9, .35); if (Math.random() < .35) emit(glow, tmp.x, tmp.y, tmp.z, J.V.glow, 1.2, .2); } }
        if (u >= 1) { if (!J.reverse) root.visible = false; restore(J); jobs.delete(root); J.onDone?.(); } // fim: some de vez (ou volta inteiro) e os clones são descartados
      }
      stepSys(soot, dt); stepSys(glow, dt);
    },
    dispose() { this.clear(); for (const s of [soot, glow]) { scene.remove(s.p); s.p.geometry.dispose(); s.p.material.dispose(); } }
  };
}
