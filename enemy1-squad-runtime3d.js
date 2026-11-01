import {bakeCombatClips} from './combat-rig3d.js';
import {BOSS_MOVES,bossPose,bossTraceContact} from './boss-choreography3d.js';
import { Enemy1Squad } from './enemy1-squad3d.js';
import { createDarkPowersVFX } from './enemy1-dark-vfx3d.js';
import { buildWardenScythe } from './warden-scythe3d.js';
import { impactDirector } from './vfx-impact3d.js';
import { volumeTrail } from './vfx-trail3d.js';
import { createChaosVFX } from './enemy2-chaos-vfx3d.js';
import { buildInfernalScythe } from './infernal-scythe3d.js';
import { createSakugaImpacts } from './sakuga-impact3d.js';
import './enemy2-squad3d.js';
import { stormDim } from './enemy3-squad3d.js';
import './enemy4-squad3d.js';
import './vhazrael3d.js';
import { createVhazraelVFX, buildCrawler } from './vhazrael-vfx3d.js';
import { createEnemy4VFX } from './enemy4-vfx3d.js';
import { createAbyssVFX } from './enemy3-abyss-vfx3d.js';
import { attachKatana, poseKatana, poseCaster, katanaPose, KATANA_SCALE, JAW_SCALE } from './enemy3-runtime3d.js';
/**
 * MOD 237 — corpo visual da esquadra Enemy1: um clone do Enemy1 por ator, com mixer, materiais (lampejo de dano
 * individual) e estado de animação próprios. Altura normalizada pelo esqueleto deformado (protocolo de escala GLB) e
 * escala de todos os nós restaurada depois do mixer. Mod 244: o Guardião usa garras presas às mãos, olhos
 * em brasa e materiais mais escuros. A lógica (enemy1-squad3d.js) decide; aqui só se desenha e se anima.
 *
 * MOD 238: várias espécies na mesma esquadra — ctx.source(kind) devolve o rig de cada uma (Enemy1 ou Enemy2), a altura
 * é normalizada por espécie, o mini-chefe Enemy2 empunha a Foice do Vulcão Sepultado e o VFX do Enemy2 (enemy2-chaos-vfx3d)
 * desenha os poderes dele.
 *
 * MOD 245: Enemy3 (rig Enemy3) e mini-chefe do Ato III (rig Enemy4, perfil miniboss3) com a Katana Dragão Carmim, poses
 * procedurais de conjuração (enemy3-runtime3d) e o VFX abissal (enemy3-abyss-vfx3d); clipe Dead nativo na morte.
 *
 * ctx: { T, scene, ground(x,z), blocked(x,z), los(ax,az,bx,bz), source(kind) → {model, actions}, clone(model),
 *   measure(model) → Box3, heroHeight(), damageTarget(id,dmg,info), event(type,data), pose?(root,kind,dur,yawFn) }
 */
const ROLE_SPEED = { idle: .38, walk: 1, run: 1.08, attack: 1, attack2: 1, cast: 1, block: 1, dash: 1, jump: 1 };
export function createEnemy1SquadRuntime(ctx) {
  const T = ctx.T, scene = ctx.scene;
  const vfx = createDarkPowersVFX(T, scene, { ground: ctx.ground }), chaos = createChaosVFX(T, scene, { ground: ctx.ground });
  const BOSSES = { warden: 1, e2boss: 1, e3boss: 1, e4boss: 1, vhazrael: 1 }, E3K = { e3: 1, e3boss: 1, e4: 1, e4boss: 1, vhazrael: 1 }, PROC = { crawler: 1, colossus: 1 }, vzfx = createVhazraelVFX(T, scene, { ground: ctx.ground }), abyss = createAbyssVFX(T, scene, { ground: ctx.ground }), ruin = createEnemy4VFX(T, scene, { ground: ctx.ground });
  // impacto sakuga do Enemy2: casca agressiva, anéis irregulares, rachaduras no terreno ao longo do golpe, placas e pedras
  const sak = createSakugaImpacts(T, scene, { ground: ctx.ground, capacity: 8 });
  // VFX Engine 2.0 (Mod 236): impactos autoritativos (pressão, fragmentos, fissuras, poeira) e rastro volumétrico da espiral
  const impacts = impactDirector(T, scene, ctx.ground, { capacity: 6 }), trails = [0, 1, 2].map(() => ({ trail: volumeTrail(T, scene, 'violet', { capacity: 32, life: .55, radius: .55 }), id: null }));
  const _tp = new T.Vector3();
  const _v = new T.Vector3(), _v2 = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4(), _box = new T.Box3();
  let squad = null, bodies = new Map(), time = 0, orbit = null; const smooth01 = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }; const measuredBy = new Map();
  function measureSource(src) {
    let measured = measuredBy.get(src.model); if (measured) return measured;
    const probe = ctx.clone(src.model); probe.position.set(0, 0, 0); probe.rotation.set(0, 0, 0); probe.scale.copy(src.model.scale); probe.updateMatrixWorld(true);
    const b = ctx.measure(probe); let top = null; probe.traverse(o => { if (top === null && o.isBone && /HeadTop_End$/i.test(o.name)) top = o.getWorldPosition(new T.Vector3()).y; });
    // altura até o topo da cabeça (as asas do Enemy1 não contam)
    measured = { h: Math.max(.5, (top !== null && top > b.min.y + .3 ? top : b.max.y) - b.min.y), minY: b.min.y }; measuredBy.set(src.model, measured); return measured;
  }
  /** Altura-alvo (topo da cabeça) por classe: comum ≈ a do herói (1,72–1,95 m), Guardião 1,22× o comum, sem virar gigante. */
  function heightFor(kind) { const hero = Math.max(1.4, Math.min(2.1, ctx.heroHeight() || 1.8)); const c = Math.min(1.95, Math.max(1.72, hero * .97)); return kind === 'warden' ? c * 1.22 : kind === 'e2' ? c * 1.03 : kind === 'e2boss' ? c * 1.3 : kind === 'e3' ? c * 1.04 : kind === 'e3boss' ? c * 1.36 : kind === 'e4' ? c * 1.05 : kind === 'e4boss' ? c * 1.42 : kind === 'vhazrael' ? c * 1.22 : c; }
  const combatCache=new Map();
  /** Criaturas da Ninhada: corpo procedural (sem GLB), sobem da fenda e marcham com as patas. */
  function makeProcBody(a) {
    const pc = buildCrawler(T, a.kind === 'colossus'), holder = new T.Group(), mats = pc.mats; holder.add(pc.group); holder.position.set(a.x, a.y, a.z); holder.rotation.y = a.yaw; scene.add(holder);
    for (const mt of mats) { mt.userData.e0 = mt.emissive.getHex(); mt.userData.i0 = mt.emissiveIntensity; }
    return { height: a.T.height, holder, model: pc.group, mixer: new T.AnimationMixer(pc.group), acts: {}, mats, scales: [], cur: null, rev: -1, flash: 0, dead: 0, hand: null, lhand: null, head: null, weapon: null, fall: 0, k: 1, proc: pc };
  }
  function makeBody(a) {
    if (PROC[a.kind]) return makeProcBody(a);
    const src = ctx.source(a.kind); if (!src || !src.model) return null;
    const m = measureSource(src), model = ctx.clone(src.model); model.visible = true; model.position.set(0, 0, 0); model.rotation.set(0, 0, 0);
    const k = heightFor(a.kind) / m.h; model.scale.copy(src.model.scale).multiplyScalar(k); model.position.y = -m.minY * k;
    const mats = [];
    model.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      o.material = [].concat(o.material).map(mt => { const c = mt.clone(); if (a.kind === 'e2boss') { if (c.color) c.color.multiplyScalar(.62); if (c.emissive) { c.emissive.setHex(0x2a0a02); c.emissiveIntensity = .5; } } if (a.kind === 'warden') { if (c.color) c.color.multiplyScalar(.5); if (c.emissive) { c.emissive.setHex(0x2a0306); c.emissiveIntensity = .55; } } if (a.kind === 'e3boss') { if (c.color) c.color.multiplyScalar(.7); if (c.emissive) { c.emissive.setHex(0x2a0208); c.emissiveIntensity = .45; } } if (a.kind === 'e4boss') { if (c.color) c.color.multiplyScalar(.68); if (c.emissive) { c.emissive.setHex(0x22041e); c.emissiveIntensity = .5; } } mats.push(c); return c; });
      if (o.material.length === 1) o.material = o.material[0]; });
    for (const mt of mats) if (mt.emissive) { mt.userData.e0 = mt.emissive.getHex(); mt.userData.i0 = mt.emissiveIntensity || 0; }
    const holder = new T.Group(); holder.add(model); holder.position.set(a.x, a.y, a.z); holder.rotation.y = a.yaw; scene.add(holder);
    const scales = []; model.traverse(o => scales.push([o, o.scale.clone()]));
    const mixer = new T.AnimationMixer(model), acts = {};
    for (const [role, act] of Object.entries(src.actions || {})) { const clip = act && act.getClip && act.getClip(); if (clip) acts[role] = mixer.clipAction(clip); }
    const b = { height:heightFor(a.kind), holder, model, mixer, acts, mats, scales, cur: null, rev: -1, flash: 0, dead: 0, hand: null, lhand: null, head: null, weapon: null, fall: 0, k };
    model.traverse(o => { if (!b.hand && /^(mixamorig)?RightHand$/i.test(o.name)) b.hand = o; if (!b.lhand && /^(mixamorig)?LeftHand$/i.test(o.name)) b.lhand = o; if (!b.head && /^(mixamorig)?Head$/i.test(o.name)) b.head = o; });
    if(a.kind==='e2boss')attachScythe(b,a.kind);
    if(a.kind==='e3boss'||a.kind==='e4boss'||a.kind==='vhazrael')attachKatana(T,scene,b,a.kind);
    if(BOSS_MOVES[a.kind]){
      if(a.kind==='warden')attachClaws(b);
      if(!combatCache.has(a.kind)){
        const ws=a.kind==='e3boss'?KATANA_SCALE:a.kind==='e4boss'?JAW_SCALE:a.kind==='vhazrael'?1:1.12,specs=a.kind==='warden'?['RightHand','LeftHand'].map(hand=>({hand,points:[[0,.08,0],[0,.53,0]]})):[{hand:'RightHand',points:[b.weapon.userData.tipA.toArray().map(x=>x*ws),b.weapon.userData.tipB.toArray().map(x=>x*ws)]}];
        combatCache.set(a.kind,bakeCombatClips(T,model,ctx.clone,acts.idle?.getClip(),BOSS_MOVES[a.kind],a.kind==='e3boss'||a.kind==='e4boss'||a.kind==='vhazrael'?katanaPose:bossPose,specs));
      }
      for(const [id,clip]of Object.entries(combatCache.get(a.kind)))acts[id]=mixer.clipAction(clip);
      const angle=a.kind==='warden'?1.9:a.kind==='e3boss'?2.3:a.kind==='e4boss'?2.5:a.kind==='vhazrael'?2.4:3.3,reach=a.kind==='warden'?1.8:a.kind==='e3boss'?3:a.kind==='e4boss'?3.4:a.kind==='vhazrael'?3:3.2;
      b.tell=new T.Mesh(new T.RingGeometry(.3,reach,28,1,-Math.PI/2-angle/2,angle),new T.MeshBasicMaterial({color:a.kind==='warden'?0xe08aff:a.kind==='e3boss'?0xff2a40:a.kind==='e4boss'?0xc040ff:a.kind==='vhazrael'?0xff1a5a:0xffa250,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false}));b.tell.rotation.x=-Math.PI/2;b.tell.position.y=.05;b.tell.visible=false;holder.add(b.tell);
    }
    play(b, 'idle', false, 1, 0);
    return b;
  }
  function attachClaws(b){
    b.claws=[];for(const hand of [b.hand,b.lhand]){if(!hand)continue;const root=new T.Group(),mat=new T.MeshStandardMaterial({color:0x1c1023,emissive:0x722a8f,emissiveIntensity:.7,metalness:.65,roughness:.3});
      for(let i=-1;i<=1;i++){const curve=new T.QuadraticBezierCurve3(new T.Vector3(i*.09,.03,0),new T.Vector3(i*.12,.32,.06),new T.Vector3(i*.10,.53,-.03));const g=new T.TubeGeometry(curve,7,.025,4,false),pos=g.attributes.position;for(let n=0;n<=7;n++){curve.getPointAt(n/7,_a);for(let j=0;j<=4;j++){const k=n*5+j;_b.fromBufferAttribute(pos,k).sub(_a).multiplyScalar(1-n/7*.95).add(_a);pos.setXYZ(k,_b.x,_b.y,_b.z);}}g.computeVertexNormals();root.add(new T.Mesh(g,mat));}scene.add(root);b.claws.push({root,hand,mat});
    }
  }
  function poseClaws(b){for(const c of b.claws||[]){c.hand.getWorldPosition(c.root.position);c.hand.getWorldQuaternion(c.root.quaternion);c.root.visible=b.holder.visible;}}
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
    const root = b.weaponRoot, h = b.hand; h.updateWorldMatrix(true, false);if(a.act?.move){h.getWorldPosition(root.position);h.getWorldQuaternion(root.quaternion);root.visible=b.holder.visible;return;}
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
    if (type === 'cast' && ctx.pose && !E3K[d.actor.kind]) { const b = bodies.get(d.actor.id); if (b) ctx.pose(b.model, POSE[d.skill] || 'cast', d.skill === 'judgment' || d.skill === 'vortex' ? 1.5 : 1.1, () => d.actor.yaw); }
    if (type === 'counterCast' && ctx.pose) { const b = bodies.get(d.actor.id); if (b) ctx.pose(b.model, 'thrust', .7, () => d.actor.yaw); }
    if (type === 'burst' && d.spell && (d.spell.type === 'spiral' || d.why === 'clash')) { const s = d.spell; impacts.emit({ id: 'e1s' + s.id, time, point: { x: s.x, y: s.y, z: s.z }, size: (s.kind === 'warden' ? 2.3 : 1.7) * (s.type === 'counter' ? .7 : 1), preset: 'violet', kind: 'ball', dir: { x: s.dx, y: 0, z: s.dz } }); }
    if (type === 'vortexImpact') { const s = d.spell, boss = s.kind === 'e2boss'; sak.emit({ id: 'e2v' + s.id + '_' + d.n, time, point: { x: s.x, y: s.y, z: s.z }, dir: { x: s.dx, z: s.dz }, size: boss ? 3.1 : 2.1, palette: boss ? 'ember' : 'abyss', rocks: boss ? 14 : 9, furrow: d.why === 'ground' ? (boss ? 5 : 3.5) : 1.5 }); }
    if (type === 'collapse_wave') { const s = d.spell, boss = s.kind === 'e2boss'; sak.emit({ id: 'e2c' + s.id, time, point: { x: s.x, y: s.y + .4, z: s.z }, size: s.r * .85, palette: boss ? 'ember' : 'abyss', rocks: boss ? 15 : 11 }); }
    if (type === 'trinityEnd') for (const h of d.spell.storms) sak.emit({ id: 'e2t' + d.spell.id + '_' + h.i, time, point: { x: h.x, y: h.y + .6, z: h.z }, size: 1.3, palette: d.spell.kind === 'e2boss' ? 'ember' : 'abyss', rocks: 8 });
    // Enemy3: impactos sakuga só em colisões confirmadas pela lógica
    if (type === 'singularityDome') { const s = d.spell, boss = s.kind === 'e3boss'; sak.emit({ id: 'e3s' + s.id, time, point: { x: s.x, y: s.y + .5, z: s.z }, size: s.T.R * .8, palette: 'abyss', rocks: boss ? 15 : 11, furrow: 1.5 }); }
    if (type === 'nadirStrike' && d.bolt.heavy) { const b = d.bolt; sak.emit({ id: 'e3n' + d.spell.id + '_' + b.id, time, point: { x: b.x, y: b.y + .3, z: b.z }, size: b.r * .9, palette: 'crimson', rocks: 8 }); }
    if (type === 'swordStick' && d.spell.kind === 'e3boss' && d.sword.id % 4 === 0) { const w = d.sword; sak.emit({ id: 'e3b' + d.spell.id + '_' + w.id, time, point: { x: w.x, y: w.y + .2, z: w.z }, dir: { x: w.dx, z: w.dz }, size: .9, palette: 'crimson', rocks: 5, furrow: 1.2 }); }
    // Enemy4: impactos sakuga só em colisões confirmadas
    if (type === 'orbBoom' && d.orb.i % 2 === 0) { const o = d.orb; sak.emit({ id: 'e4o' + d.spell.id + '_' + o.i, time, point: { x: o.x, y: o.y, z: o.z }, size: d.spell.T.R * .7, palette: 'abyss', rocks: 6 }); }
    if (type === 'biteSnap') { const s = d.spell; sak.emit({ id: 'e4b' + s.id, time, point: { x: s.bx, y: s.by + .4, z: s.bz }, size: s.T.biteR * .8, palette: 'crimson', rocks: 12, furrow: 2 }); }
    if (type === 'rift') { const s = d.spell, a = d.actor; abyss.dragon(s.x0 - s.dx * .6, s.y + .2, s.z0 - s.dz * .6, a.yaw, true); sak.emit({ id: 'e3r' + s.id, time, point: { x: s.x0, y: s.y + .3, z: s.z0 }, dir: { x: s.dx, z: s.dz }, size: 1.6, palette: 'crimson', rocks: 10, furrow: 5 }); }
    if (type === 'judgmentBlast') { const s = d.spell; impacts.emit({ id: 'e1j' + s.id, time, point: { x: s.mx, y: s.my + .6, z: s.mz }, size: s.r * 1.05, preset: 'violet', kind: 'ball', dir: { x: 0, y: 1, z: 0 } }); }
    ctx.event(type, d);
  }
  function stop() {
    for (const b of bodies.values()) { b.mixer.stopAllAction();b.mixer.uncacheRoot(b.model);b.model.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton)o.skeleton.dispose();});/* textura de ossos do clone */ for(const c of b.claws||[]){scene.remove(c.root);c.root.traverse(o=>o.geometry?.dispose());c.mat.dispose();}if(b.tell){b.tell.geometry.dispose();b.tell.material.dispose();} scene.remove(b.holder); for (const m of b.mats) m.dispose(); if (b.weapon) { b.weapon.userData.dispose(); scene.remove(b.weaponRoot); if (b.weapon.userData.fx) scene.remove(b.weapon.userData.fx); } if (b.proc) b.proc.dispose(); }
    bodies.clear(); if (squad) { squad.clear(); squad.spells.length = 0; } squad = null; vfx.clear(); chaos.clear(); abyss.clear(); ruin.clear(); vzfx.clear(); impacts.clear(); orbit = null; sak.clear(); for (const t of trails) { t.trail.clear(); t.id = null; } vfx.update(0, { position: _v.set(0, 0, 0) }, [], [], 1);
  }
  return {
    vfx,
    get squad() { return squad; },
    get active() { return !!squad && squad.actors.some(a => a.alive); },
    /** Escurecimento local pedido pela Tempestade de Nadir (0..1); o jogo aplica e restaura. */
    get dim() { return stormDim(squad); },
    /** Extinção Orbital em curso (fase, tempo, magia) — o jogo usa para câmera, cena orbital e bloqueio de controle. */
    get orbit() { return orbit; }, vhazraelVFX: vzfx,
    body(id) { return bodies.get(id) || null; },
    /** spots: [{x,z,yaw,kind,hp}] */
    start(spots, { seed = 237 } = {}) {
      stop(); squad = new Enemy1Squad({ seed, ground: ctx.ground, blocked: ctx.blocked, los: ctx.los, damageTarget: ctx.damageTarget, event: onEvent, meleeTrace:(a,act,t,lo,hi)=>bossTraceContact(combatCache.get(a.kind)?.[act.move.id]?.combatTrace,lo,hi,a,t,p=>ctx.blocked(p.x,p.z)) });
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
        let b = bodies.get(a.id); if (!b && a.alive) { b = makeBody(a); if (b) bodies.set(a.id, b); } if (!b) continue; // lacaios invocados no meio da luta
        b.holder.position.set(a.x, a.y, a.z); if (b.proc) { a.emerge = Math.min(1, (a.emerge ?? 1) + dt / .9); b.holder.position.y -= (1 - smooth01(a.emerge)) * 1.4 * a.T.height; }
        let dy = a.yaw - b.holder.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.holder.rotation.y += dy * Math.min(1, dt * 18);
        if (!a.alive) {
          // sem clipe de morte no Enemy1: tomba para trás, fica no chão e afunda devagar
          b.dead += dt; const nativeDeath = E3K[a.kind] && b.acts.death;
          if (nativeDeath) { if (!b.deathPlayed) { b.deathPlayed = true; play(b, 'death', true, 1, .12); } b.mixer.update(b.dead < 3 ? dt : 0); for (const [o, s] of b.scales) o.scale.copy(s); b.model.rotation.z = 0; }
          else { if (b.cur && b.dead < .05) b.cur.fadeOut(.2); b.model.rotation.x = -Math.min(1, (b.dead / .75) ** 2) * Math.PI / 2 * .92; }
          if (b.dead > 2.6) b.holder.position.y = a.y - (b.dead - 2.6) * .55;
          b.holder.visible = b.dead < 4.4; if (b.dead < 1 && !nativeDeath) b.mixer.update(dt * .5); if (b.katana) poseKatana(T, b, a, dt, time, quality === 0); else if (b.weaponRoot) poseScythe(b, a, dt);poseClaws(b);if(b.tell)b.tell.visible=false;continue;
        }
        if (a.anim.rev !== b.rev) { b.rev = a.anim.rev; play(b, a.anim.role, a.anim.once && a.anim.role !== 'idle', a.anim.speed); } // Idle sempre em loop: base estável para as camadas procedurais longas
        else if (!a.anim.once && b.cur) b.cur.setEffectiveTimeScale((ROLE_SPEED[a.anim.role] || 1) * a.anim.speed);
        if(a.act?.move&&b.cur){b.cur.time=a.act.t;b.cur.paused=true;}else if(b.cur)b.cur.paused=false;
        if (b.proc) b.proc.update(dt, a);
        b.mixer.update(dt);if(a.act?.move){b.cur.time=a.act.t;b.mixer.update(0);b.holder.rotation.y=a.yaw;}
        for (const [o, s] of b.scales) o.scale.copy(s);
        if (b.flash > 0) b.flash -= dt;
        const on = b.flash > 0, fury = !!BOSSES[a.kind] && a.phase2;
        for (const m of b.mats) if (m.emissive) { if (on) { m.emissive.setHex(0x9a2a3c); m.emissiveIntensity = 1.2; } else { m.emissive.setHex(fury ? 0x4a0508 : m.userData.e0); m.emissiveIntensity = fury ? .9 + .3 * Math.sin(time * 6) : m.userData.i0; } }
        // recuo da reação curta (sem clipe de dano no Enemy1)
        b.model.rotation.x = a.act && a.act.type === 'stagger' ? -Math.sin(Math.min(1, a.act.t / a.act.dur) * Math.PI) * (E3K[a.kind] && a.act.dur > .5 ? .42 : .22) : 0;
        if (E3K[a.kind]) { // Enemy3: camada de conjuração, inclinação no strafe e mão da singularidade
          poseCaster(T, b, a, squad, dt); const lat = a.vx * Math.cos(a.yaw) - a.vz * Math.sin(a.yaw); b.model.rotation.z += (-lat * .05 - b.model.rotation.z) * Math.min(1, dt * 6);
          if (a.act && a.act.spellId && b.hand) { const s = squad.spells.find(x => x.id === a.act.spellId); if (s && s.type === 'singularity') { b.hand.getWorldPosition(_v); s.hand = s.hand || {}; s.hand.x = _v.x + Math.sin(a.yaw) * .18; s.hand.y = _v.y + .12; s.hand.z = _v.z + Math.cos(a.yaw) * .18; } }
        }
        if (b.weapon) { b.weapon.userData.tick(time, fury ? 1 : 0, b.wW || 0); if (b.katana) poseKatana(T, b, a, dt, time, quality === 0); else poseScythe(b, a, dt); }
        poseClaws(b);if(b.tell){b.tell.visible=!!a.act?.move&&a.act.phase==='windup';b.tell.position.y=.05-(a.y-ctx.ground(a.x,a.z));b.tell.material.opacity=.12+.18*(a.act?.t/(a.act?.move?.open||1));}
        const act = a.act;
        if (act && !act.released && (act.type === 'cast' || act.type === 'counter') && act.release > 0) {
          const hp = (b.hand || b.model).getWorldPosition(_v), lp = b.lhand ? b.lhand.getWorldPosition(_v2) : hp, k = Math.min(1, act.t / act.release);
          const tgt = targets.find(t => t.id === act.tid) || targets[0];
          charges.push({ skill: act.skill || 'counter', k, x: (hp.x + lp.x) / 2 + Math.sin(a.yaw) * .25, y: (hp.y + lp.y) / 2, z: (hp.z + lp.z) / 2 + Math.cos(a.yaw) * .25, dx: Math.sin(a.yaw), dz: Math.cos(a.yaw), gx: tgt ? tgt.x : a.x, gz: tgt ? tgt.z : a.z, kind: a.kind });
        }
        if(b.claws&&act?.move&&act.move.hits.some(h=>Math.abs(act.t-h)<.12)){for(const c of b.claws){c.root.updateMatrixWorld(true);vfx.scythe(_v.set(0,.08,0).applyMatrix4(c.root.matrixWorld),_v2.set(0,.53,0).applyMatrix4(c.root.matrixWorld));}}
        if (b.katana && act && act.move && act.t > act.move.open - .14 && act.t < act.move.close + .06) { b.weapon.updateWorldMatrix(true, false); abyss.slash(_v.copy(b.weapon.userData.tipA).applyMatrix4(b.weapon.matrixWorld), _v2.copy(b.weapon.userData.tipB).applyMatrix4(b.weapon.matrixWorld), a.phase2, a.kind === 'e4boss'); }
        else if (b.weapon && act && act.type === 'melee' && (act.move?act.move.hits.some(h=>Math.abs(act.t-h)<.12):act.t > .3 && act.t < act.hits[act.hits.length - 1] + .18)) {
          b.weapon.updateWorldMatrix(true, false); vfx.scythe(_v.copy(b.weapon.userData.tipA).applyMatrix4(b.weapon.matrixWorld), _v2.copy(b.weapon.userData.tipB).applyMatrix4(b.weapon.matrixWorld));
        }
      }
      for (const t of trails) { const s = t.id !== null && squad.spells.find(o => o.id === t.id); if (!s) t.id = null; }
      for (const s of squad.spells) if (s.type === 'spiral' && s.phase === 'fly' && !trails.some(t => t.id === s.id)) { const free = trails.find(t => t.id === null); if (free) { free.id = s.id; free.trail.clear(); } }
      for (const t of trails) { const s = t.id !== null && squad.spells.find(o => o.id === t.id); t.trail.update(time, s ? _tp.set(s.x, s.y, s.z) : _tp, !!(s && s.phase === 'fly'), quality); }
      impacts.update(time, quality); if (camera) sak.update(time, camera, quality);
      const info = camera ? vfx.update(dt, camera, squad.spells, charges, quality) : null;
      if (camera) chaos.update(dt, camera, squad.spells, charges, quality);
      if (camera) abyss.update(dt, camera, squad.spells, charges, quality, targets[0] || null);
      if (camera) ruin.update(dt, camera, squad.spells, squad.actors, quality);
      if (camera) { const blades = {}; for (const a of squad.actors) { const b = bodies.get(a.id); if (a.kind === 'vhazrael' && b && b.weapon) { b.weapon.updateWorldMatrix(true, false); const p = new T.Vector3().copy(b.weapon.userData.tipA).applyMatrix4(b.weapon.matrixWorld), q = new T.Vector3().copy(b.weapon.userData.tipB).applyMatrix4(b.weapon.matrixWorld); blades[a.id] = { a: p, b: q }; } }
        orbit = vzfx.update(dt, camera, squad.spells, squad.actors, quality, blades, targets[0] || null); }
      return info;
    },
    dispose() { stop(); vfx.dispose(); chaos.dispose(); abyss.dispose(); ruin.dispose(); vzfx.dispose(); impacts.dispose(); sak.dispose(); for (const t of trails) t.trail.dispose && t.trail.dispose(); }
  };
}
