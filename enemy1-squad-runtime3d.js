import { Enemy1Squad } from './enemy1-squad3d.js';
import { createDarkPowersVFX } from './enemy1-dark-vfx3d.js';
import { buildWardenScythe } from './warden-scythe3d.js';
import { impactDirector } from './vfx-impact3d.js';
import { volumeTrail } from './vfx-trail3d.js';
import { createChaosVFX } from './enemy2-chaos-vfx3d.js';
import { buildInfernalScythe } from './infernal-scythe3d.js';
import './enemy2-squad3d.js';
/**
 * MOD 237 — corpo visual da esquadra Enemy1: um clone do Enemy1 por ator, com mixer, materiais (lampejo de dano
 * individual) e estado de animação próprios. Altura normalizada pelo esqueleto deformado (protocolo de escala GLB) e
 * escala de todos os nós restaurada depois do mixer. O Guardião ganha a Ceifadora do Limiar presa ao osso da mão, olhos
 * em brasa e materiais mais escuros. A lógica (enemy1-squad3d.js) decide; aqui só se desenha e se anima.
 *
 * MOD 238: várias espécies na mesma esquadra — ctx.source(kind) devolve o rig de cada uma (Enemy1 ou Enemy2), a altura
 * é normalizada por espécie, o mini-chefe Enemy2 empunha a Foice do Vulcão Sepultado e o VFX do Enemy2 (enemy2-chaos-vfx3d)
 * desenha os poderes dele.
 *
 * ctx: { T, scene, ground(x,z), blocked(x,z), los(ax,az,bx,bz), source(kind) → {model, actions}, clone(model),
 *   measure(model) → Box3, heroHeight(), damageTarget(id,dmg,info), event(type,data), pose?(root,kind,dur,yawFn) }
 */
const ROLE_SPEED = { idle: .38, walk: 1, run: 1.08, attack: 1, attack2: 1, cast: 1, block: 1, dash: 1, jump: 1 };
export function createEnemy1SquadRuntime(ctx) {
  const T = ctx.T, scene = ctx.scene;
  const vfx = createDarkPowersVFX(T, scene, { ground: ctx.ground }), chaos = createChaosVFX(T, scene, { ground: ctx.ground });
  const BOSSES = { warden: 1, e2boss: 1 };
  // VFX Engine 2.0 (Mod 236): impactos autoritativos (pressão, fragmentos, fissuras, poeira) e rastro volumétrico da espiral
  const impacts = impactDirector(T, scene, ctx.ground, { capacity: 6 }), trails = [0, 1, 2].map(() => ({ trail: volumeTrail(T, scene, 'violet', { capacity: 32, life: .55, radius: .55 }), id: null }));
  const _tp = new T.Vector3();
  const _v = new T.Vector3(), _v2 = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4(), _box = new T.Box3();
  let squad = null, bodies = new Map(), time = 0; const measuredBy = new Map();
  function measureSource(src) {
    let measured = measuredBy.get(src.model); if (measured) return measured;
    const probe = ctx.clone(src.model); probe.position.set(0, 0, 0); probe.rotation.set(0, 0, 0); probe.scale.copy(src.model.scale); probe.updateMatrixWorld(true);
    const b = ctx.measure(probe); let top = null; probe.traverse(o => { if (top === null && o.isBone && /HeadTop_End$/i.test(o.name)) top = o.getWorldPosition(new T.Vector3()).y; });
    // altura até o topo da cabeça (as asas do Enemy1 não contam)
    measured = { h: Math.max(.5, (top !== null && top > b.min.y + .3 ? top : b.max.y) - b.min.y), minY: b.min.y }; measuredBy.set(src.model, measured); return measured;
  }
  /** Altura-alvo (topo da cabeça) por classe: comum ≈ a do herói (1,72–1,95 m), Guardião 1,22× o comum, sem virar gigante. */
  function heightFor(kind) { const hero = Math.max(1.4, Math.min(2.1, ctx.heroHeight() || 1.8)); const c = Math.min(1.95, Math.max(1.72, hero * .97)); return kind === 'warden' ? c * 1.22 : kind === 'e2' ? c * 1.03 : kind === 'e2boss' ? c * 1.3 : c; }
  function makeBody(a) {
    const src = ctx.source(a.kind); if (!src || !src.model) return null;
    const m = measureSource(src), model = ctx.clone(src.model); model.visible = true; model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
    const k = heightFor(a.kind) / m.h; model.scale.copy(src.model.scale).multiplyScalar(k); model.position.y = -m.minY * k;
    const mats = [];
    model.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      o.material = [].concat(o.material).map(mt => { const c = mt.clone(); if (a.kind === 'e2boss') { if (c.color) c.color.multiplyScalar(.62); if (c.emissive) { c.emissive.setHex(0x2a0a02); c.emissiveIntensity = .5; } } if (a.kind === 'warden') { if (c.color) c.color.multiplyScalar(.5); if (c.emissive) { c.emissive.setHex(0x2a0306); c.emissiveIntensity = .55; } } mats.push(c); return c; });
      if (o.material.length === 1) o.material = o.material[0]; });
    for (const mt of mats) if (mt.emissive) { mt.userData.e0 = mt.emissive.getHex(); mt.userData.i0 = mt.emissiveIntensity || 0; }
    const holder = new T.Group(); holder.add(model); holder.position.set(a.x, a.y, a.z); holder.rotation.y = a.yaw; scene.add(holder);
    const scales = []; model.traverse(o => scales.push([o, o.scale.clone()]));
    const mixer = new T.AnimationMixer(model), acts = {};
    for (const [role, act] of Object.entries(src.actions || {})) { const clip = act && act.getClip && act.getClip(); if (clip) acts[role] = mixer.clipAction(clip); }
    const b = { holder, model, mixer, acts, mats, scales, cur: null, rev: -1, flash: 0, dead: 0, hand: null, lhand: null, head: null, weapon: null, fall: 0, k };
    model.traverse(o => { if (!b.hand && /^RightHand$/i.test(o.name)) b.hand = o; if (!b.lhand && /^LeftHand$/i.test(o.name)) b.lhand = o; if (!b.head && /^Head$/i.test(o.name)) b.head = o; });
    if (a.kind === 'warden' || a.kind === 'e2boss') attachScythe(b, a.kind);
    play(b, 'idle', false, 1, 0);
    return b;
  }
  /** A foice segue a mão direita (posição no punho fechado). Em repouso, andando e conjurando fica em pé, levemente
      inclinada para a frente; no golpe passa a seguir a linha dos nós dos dedos, então o arco vem do braço de verdade. */
  function attachScythe(b, kind) {
    if (!b.hand) return; const h = b.hand;
    b.mid = h.children.find(c => /MiddleProximal/i.test(c.name)) || null; b.lit = h.children.find(c => /LittleProximal/i.test(c.name)) || null; b.thumb = h.children.find(c => /ThumbProximal/i.test(c.name)) || null;
    const w = kind === 'e2boss' ? buildInfernalScythe(T) : buildWardenScythe(T), root = new T.Group(); root.add(w); w.scale.setScalar(kind === 'e2boss' ? 1.12 : 1.04); scene.add(root);
    w.traverse(o => { if (o.isMesh) o.castShadow = true; }); b.weapon = w; b.weaponRoot = root; b.wW = 0; b.wDrop = 0;
  }
  const _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _d = new T.Vector3(), _up = new T.Vector3(), _x = new T.Vector3(), _z = new T.Vector3();
  function poseScythe(b, a, dt) {
    const root = b.weaponRoot, h = b.hand; h.updateWorldMatrix(true, false);
    const hp = h.getWorldPosition(_a); let axis = null, grip = hp;
    if (b.mid && b.lit) { b.mid.updateWorldMatrix(false, false); b.lit.updateWorldMatrix(false, false); const mp = b.mid.getWorldPosition(_b), lp = b.lit.getWorldPosition(_c); axis = _up.copy(mp).sub(lp).normalize(); grip = _a.lerp(mp, .55);
      if (b.thumb) { b.thumb.updateWorldMatrix(false, false); const tp = b.thumb.getWorldPosition(_d); if (tp.sub(lp).dot(axis) < 0) axis.negate(); } }
    else if (b.mid && b.thumb) { // rig sem o dedo mínimo (Enemy2): linha dos nós = normal da palma × direção dos dedos, para o lado do polegar
      b.mid.updateWorldMatrix(false, false); b.thumb.updateWorldMatrix(false, false); const mp = b.mid.getWorldPosition(_b), fd = _c.copy(mp).sub(hp), td = b.thumb.getWorldPosition(_d).sub(hp);
      axis = _up.crossVectors(fd, td).cross(fd).normalize(); if (axis.dot(td) < 0) axis.negate(); grip = _x.copy(hp).lerp(mp, .55); hp.copy(grip); grip = hp; }
    const act = a.act, swing = a.alive && act && act.type === 'melee' && act.t > a.T.melee.windup * .35 && act.t < act.hits[act.hits.length - 1] + .22;
    b.wW += ((swing && axis ? 1 : 0) - b.wW) * Math.min(1, dt * (swing ? 14 : 6));
    const fy = Math.sin(a.yaw), fz = Math.cos(a.yaw), idle = _x.set(fy * .2, 1, fz * .2).normalize();
    const up = axis ? axis.lerp(idle, 1 - b.wW).normalize() : idle;
    if (!a.alive) { b.wDrop = Math.min(1, b.wDrop + dt * 1.6); up.lerp(_z.set(Math.cos(a.yaw), 0, -Math.sin(a.yaw)), b.wDrop).normalize(); }
    const right = _z.set(Math.cos(a.yaw), 0, -Math.sin(a.yaw)); right.addScaledVector(up, -right.dot(up)).normalize();
    const fwd = _b.crossVectors(right, up).normalize(); _m.makeBasis(right, up, fwd); root.quaternion.setFromRotationMatrix(_m);
    root.position.copy(grip); if (!a.alive) root.position.y = Math.max(a.y + .12, root.position.y - b.wDrop * 1.2);
    root.visible = b.holder.visible;
  }
  function play(b, role, once, speed, fade = .14) {
    const act = b.acts[role] || (role === 'hit' ? b.acts.block : null) || (role === 'attack2' ? b.acts.attack : null) || b.acts.idle; if (!act) return;
    const ts = (ROLE_SPEED[role] || 1) * speed * (role === 'hit' ? 1.8 : 1);
    if (b.cur === act) { act.setEffectiveTimeScale(ts); if (!once) return; }
    if (b.cur && b.cur !== act) b.cur.fadeOut(fade);
    act.reset(); act.enabled = true; act.setEffectiveWeight(1); act.setEffectiveTimeScale(ts); act.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity); act.clampWhenFinished = !!once;
    if (ts < 0) act.time = act.getClip().duration; act.fadeIn(fade).play(); b.cur = act;
  }
  const POSE = { claws: 'slam', spiral: 'cast', judgment: 'channel', vortex: 'channel', trinity: 'slam', collapse: 'slam' };
  function onEvent(type, d) {
    if (type === 'cast' && ctx.pose) { const b = bodies.get(d.actor.id); if (b) ctx.pose(b.model, POSE[d.skill] || 'cast', d.skill === 'judgment' || d.skill === 'vortex' ? 1.5 : 1.1, () => d.actor.yaw); }
    if (type === 'counterCast' && ctx.pose) { const b = bodies.get(d.actor.id); if (b) ctx.pose(b.model, 'thrust', .7, () => d.actor.yaw); }
    if (type === 'burst' && d.spell && (d.spell.type === 'spiral' || d.why === 'clash')) { const s = d.spell; impacts.emit({ id: 'e1s' + s.id, time, point: { x: s.x, y: s.y, z: s.z }, size: (s.kind === 'warden' ? 2.3 : 1.7) * (s.type === 'counter' ? .7 : 1), preset: 'violet', kind: 'ball', dir: { x: s.dx, y: 0, z: s.dz } }); }
    if (type === 'vortexImpact') { const s = d.spell; impacts.emit({ id: 'e2v' + s.id + '_' + d.n, time, point: { x: s.x, y: s.y, z: s.z }, size: s.kind === 'e2boss' ? 2.6 : 2, preset: 'crimson', kind: 'ball', dir: { x: s.dx, y: s.dy || 0, z: s.dz } }); }
    if (type === 'collapse_wave') { const s = d.spell; impacts.emit({ id: 'e2c' + s.id, time, point: { x: s.x, y: s.y + .5, z: s.z }, size: s.r * 1.1, preset: 'violet', kind: 'ball', dir: { x: 0, y: 1, z: 0 } }); }
    if (type === 'trinityEnd') for (const h of d.spell.storms) impacts.emit({ id: 'e2t' + d.spell.id + '_' + h.i, time, point: { x: h.x, y: h.y + 1, z: h.z }, size: 1.4, preset: 'crimson', kind: 'ball', dir: { x: 0, y: 1, z: 0 } });
    if (type === 'judgmentBlast') { const s = d.spell; impacts.emit({ id: 'e1j' + s.id, time, point: { x: s.mx, y: s.my + .6, z: s.mz }, size: s.r * 1.05, preset: 'violet', kind: 'ball', dir: { x: 0, y: 1, z: 0 } }); }
    ctx.event(type, d);
  }
  function stop() {
    for (const b of bodies.values()) { b.mixer.stopAllAction(); scene.remove(b.holder); for (const m of b.mats) m.dispose(); if (b.weapon) { b.weapon.userData.dispose(); scene.remove(b.weaponRoot); } }
    bodies.clear(); if (squad) { squad.clear(); squad.spells.length = 0; } squad = null; vfx.clear(); chaos.clear(); impacts.clear(); for (const t of trails) { t.trail.clear(); t.id = null; } vfx.update(0, { position: _v.set(0, 0, 0) }, [], [], 1);
  }
  return {
    vfx,
    get squad() { return squad; },
    get active() { return !!squad && squad.actors.some(a => a.alive); },
    body(id) { return bodies.get(id) || null; },
    /** spots: [{x,z,yaw,kind,hp}] */
    start(spots, { seed = 237 } = {}) {
      stop(); squad = new Enemy1Squad({ seed, ground: ctx.ground, blocked: ctx.blocked, los: ctx.los, damageTarget: ctx.damageTarget, event: onEvent });
      squad.spawn(spots); for (const a of squad.actors) { const b = makeBody(a); if (b) bodies.set(a.id, b); }
      return squad;
    },
    stop,
    /** Lampejo de dano e reação curta num ator específico. */
    flash(id) { const b = bodies.get(id); if (b) b.flash = .16; },
    handPos(id, out) { const b = bodies.get(id); if (!b) return null; const h = b.hand || b.model; h.getWorldPosition(out); return out; },
    update(dt, { targets = [], foreign = [], camera, quality = 1, paused = false } = {}) {
      if (!squad) return null; time += dt;
      squad.setTargets(targets); squad.setForeignSpells(foreign); squad.paused = paused; squad.update(dt);
      const charges = [];
      for (const a of squad.actors) {
        const b = bodies.get(a.id); if (!b) continue;
        b.holder.position.set(a.x, a.y, a.z);
        let dy = a.yaw - b.holder.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.holder.rotation.y += dy * Math.min(1, dt * 18);
        if (!a.alive) {
          // sem clipe de morte no Enemy1: tomba para trás, fica no chão e afunda devagar
          b.dead += dt; if (b.cur && b.dead < .05) b.cur.fadeOut(.2); b.model.rotation.x = -Math.min(1, (b.dead / .75) ** 2) * Math.PI / 2 * .92;
          if (b.dead > 2.6) b.holder.position.y = a.y - (b.dead - 2.6) * .55;
          b.holder.visible = b.dead < 4.4; if (b.dead < 1) b.mixer.update(dt * .5); if (b.weaponRoot) poseScythe(b, a, dt); continue;
        }
        if (a.anim.rev !== b.rev) { b.rev = a.anim.rev; play(b, a.anim.role, a.anim.once, a.anim.speed); }
        else if (!a.anim.once && b.cur) b.cur.setEffectiveTimeScale((ROLE_SPEED[a.anim.role] || 1) * a.anim.speed);
        b.mixer.update(dt);
        for (const [o, s] of b.scales) o.scale.copy(s);
        if (b.flash > 0) b.flash -= dt;
        const on = b.flash > 0, fury = !!BOSSES[a.kind] && a.phase2;
        for (const m of b.mats) if (m.emissive) { if (on) { m.emissive.setHex(0x9a2a3c); m.emissiveIntensity = 1.2; } else { m.emissive.setHex(fury ? 0x4a0508 : m.userData.e0); m.emissiveIntensity = fury ? .9 + .3 * Math.sin(time * 6) : m.userData.i0; } }
        // recuo da reação curta (sem clipe de dano no Enemy1)
        b.model.rotation.x = a.act && a.act.type === 'stagger' ? -Math.sin(Math.min(1, a.act.t / a.act.dur) * Math.PI) * .22 : 0;
        if (b.weapon) { b.weapon.userData.tick(time, fury ? 1 : 0, b.wW || 0); poseScythe(b, a, dt); }
        const act = a.act;
        if (act && !act.released && (act.type === 'cast' || act.type === 'counter') && act.release > 0) {
          const hp = (b.hand || b.model).getWorldPosition(_v), lp = b.lhand ? b.lhand.getWorldPosition(_v2) : hp, k = Math.min(1, act.t / act.release);
          const tgt = targets.find(t => t.id === act.tid) || targets[0];
          charges.push({ skill: act.skill || 'counter', k, x: (hp.x + lp.x) / 2 + Math.sin(a.yaw) * .25, y: (hp.y + lp.y) / 2, z: (hp.z + lp.z) / 2 + Math.cos(a.yaw) * .25, dx: Math.sin(a.yaw), dz: Math.cos(a.yaw), gx: tgt ? tgt.x : a.x, gz: tgt ? tgt.z : a.z, kind: a.kind });
        }
        if (b.weapon && act && act.type === 'melee' && act.t > .3 && act.t < act.hits[act.hits.length - 1] + .18) {
          b.weapon.updateWorldMatrix(true, false); vfx.scythe(_v.copy(b.weapon.userData.tipA).applyMatrix4(b.weapon.matrixWorld), _v2.copy(b.weapon.userData.tipB).applyMatrix4(b.weapon.matrixWorld));
        }
      }
      for (const t of trails) { const s = t.id !== null && squad.spells.find(o => o.id === t.id); if (!s) t.id = null; }
      for (const s of squad.spells) if (s.type === 'spiral' && s.phase === 'fly' && !trails.some(t => t.id === s.id)) { const free = trails.find(t => t.id === null); if (free) { free.id = s.id; free.trail.clear(); } }
      for (const t of trails) { const s = t.id !== null && squad.spells.find(o => o.id === t.id); t.trail.update(time, s ? _tp.set(s.x, s.y, s.z) : _tp, !!(s && s.phase === 'fly'), quality); }
      impacts.update(time, quality);
      const info = camera ? vfx.update(dt, camera, squad.spells, charges, quality) : null;
      if (camera) chaos.update(dt, camera, squad.spells, charges, quality);
      return info;
    },
    dispose() { stop(); vfx.dispose(); chaos.dispose(); impacts.dispose(); for (const t of trails) t.trail.dispose && t.trail.dispose(); }
  };
}
