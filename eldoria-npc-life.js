/**
 * Eldória — vida dos moradores (Mod 318+): rotina por função, reação ao herói e animações REAIS dos GLBs Meshy.
 *
 * Inventário dos clipes (verificado nos GLBs, ver tests/npcs-vivos.test.mjs):
 *  - homem: Walking, Running, idle (_01a1b3e4…), "inspecionar" (_01a1b3e6…: curva-se e volta), Alert, Arise,
 *    Wave_One_Hand, victory, Regular_Jump, falling_down, Triple_Combo_Attack;
 *  - mulher: Walking, Running, idle (_01a1b3e4…), "inspecionar" (_01a1b3e6…), Wave_One_Hand, SideLying_Reach_Help.
 * Sem morph targets nem ossos faciais nos dois modelos: não há sorriso, piscar ou boca. A atuação é corporal
 * (postura, cabeça, olhar, gesto, ritmo) e fica separada disso na documentação; nenhuma expressão facial é fingida.
 *
 * Cérebro: máquina de estados pequena e DETERMINÍSTICA (semente por NPC), com duração mínima por estado, cooldown de
 * saudação e retomada da tarefa. Puro (sem Three) — testável em Node. O motor (driveVillager) aplica a intenção:
 * crossfade de clipes, olhar/inclinação por cima do clipe e caminhada com a velocidade do passo do próprio clipe
 * (sem deslizar).
 */
export const NPC_CLIP_PATTERNS = Object.freeze({
  idle: /^_01a1b3e4/i, inspect: /^_01a1b3e6/i, wave: /^wave_one_hand$/i, alert: /^alert$/i, walk: /^walking$/i,
});
export const clipFor = (clips, key) => (clips || []).find(c => NPC_CLIP_PATTERNS[key].test(c.name)) || null;

/** Perfis: o que cada um faz, para onde olha quando "vigia", com que frequência trabalha e saúda. */
export const VILLAGER_PROFILES = Object.freeze({
  bento: { kind: 'vendor', name: 'Bento', mood: 'cansado', work: .55, rest: .35, watch: 0, greetR: 5, nodEvery: 5.5, greetCooldown: 50 },
  teo: { kind: 'vendor', name: 'Téo', mood: 'desconfiado', work: .45, rest: 0, watch: .35, greetR: 5.5, nodEvery: 4.5, greetCooldown: 45 },
  lia: { kind: 'vendor', name: 'Lia', mood: 'cordial', work: .65, rest: 0, watch: 0, greetR: 6, nodEvery: 3.8, greetCooldown: 40 },
  morador: { kind: 'vendor', name: 'Morador da praça', mood: 'apreensivo', work: .3, rest: 0, watch: .4, greetR: 3.6, nodEvery: 6, greetCooldown: 60 },
  moradora: { kind: 'walker', name: 'Moradora com balde', greetR: 2.6, greetCooldown: 70 },
});

export function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const between = (r, a, b) => a + (b - a) * r();

/**
 * Cérebro de um morador. sense: {heroDist, heroAngle (rad, relativo à frente do NPC), heroAhead (bool, no caminho),
 * talking (diálogo aberto com ESTE NPC), atTarget (walker chegou ao ponto), danger (combate perto)}.
 * Devolve a intenção do quadro: {state, clip, once, look:{yaw,pitch}|null, lean, nod, move:boolean, target:int}.
 */
export function createVillagerBrain(profile, seed = 1, { roadYaw = 0, waypoints = 2 } = {}) {
  const P = typeof profile === 'string' ? VILLAGER_PROFILES[profile] : profile, R = rng(seed);
  const B = { state: P.kind === 'walker' ? 'walk' : 'idle', t: 0, dur: between(R, 3, 6), lastGreet: -1e9, clock: 0, target: 1, history: [] };
  const go = (s, dur) => { B.history.push(s); if (B.history.length > 40) B.history.shift(); B.state = s; B.t = 0; B.dur = dur; };
  const ONCE = { work: 2.4, greet: 2.6 };
  function update(dt, sense = {}) {
    B.t += dt; B.clock += dt; const d = sense.heroDist ?? 1e9, canGreet = B.clock - B.lastGreet > P.greetCooldown;
    // reação ao herói tem prioridade, mas nunca interrompe um gesto já começado
    if (sense.danger && B.state !== 'cower') go('cower', 3);
    else if ((sense.talking || (d < P.greetR && canGreet)) && !['greet', 'attend', 'work', 'cower'].includes(B.state)) {
      if (P.kind === 'walker' && !sense.heroAhead && !sense.talking) { /* segue o caminho: só olha */ }
      else { B.lastGreet = B.clock; go(sense.talking ? 'attend' : 'greet', sense.talking ? 3 : ONCE.greet); }
    }
    switch (B.state) {
      case 'idle': if (B.t > B.dur) { const r = R();
        if (r < P.work) go('work', ONCE.work); else if (r < P.work + P.rest) go('rest', between(R, 4, 7)); else if (r < P.work + P.rest + P.watch) go('watchRoad', between(R, 3, 5)); else go('lookAround', between(R, 2.5, 4)); } break;
      case 'work': if (B.t > B.dur) go('idle', between(R, 3, 7)); break;
      case 'rest': case 'watchRoad': case 'lookAround': if (B.t > B.dur) go('idle', between(R, 2.5, 5)); break;
      case 'greet': if (B.t > B.dur) go('attend', 2); break;
      case 'attend': if (sense.talking || d < P.greetR + 2.5) B.t = Math.min(B.t, B.dur - .01); else if (B.t > B.dur) go(P.kind === 'walker' ? 'walk' : 'resume', 1.5); break;
      case 'resume': if (B.t > B.dur) go(P.kind === 'vendor' ? 'work' : 'idle', P.kind === 'vendor' ? ONCE.work : between(R, 3, 6)); break;
      case 'cower': if (B.t > B.dur && !sense.danger) go(P.kind === 'walker' ? 'walk' : 'idle', 3); break;
      // moradora: vai à fonte seca com o balde, olha dentro, volta; dá passagem ao herói
      case 'walk': if (sense.heroAhead) go('yield', 1.2); else if (sense.atTarget) go('pause', B.target === 1 ? ONCE.work : between(R, 3.5, 6)); break;
      case 'yield': if (B.t > B.dur && !sense.heroAhead) go('walk', 0); break;
      case 'pause': if (B.t > B.dur) { B.target = (B.target + 1) % waypoints; go('walk', 0); } break;
      default: break;
    }
    return intent(sense);
  }
  function intent(sense) {
    const s = B.state, look = (sense.heroDist ?? 1e9) < (P.greetR + 3) ? { yaw: sense.heroAngle || 0, pitch: 0 } : null;
    const base = { state: s, clip: 'idle', once: false, look: null, lean: 0, nod: 0, move: false, target: B.target };
    switch (s) {
      case 'work': return { ...base, clip: 'inspect', once: true };
      case 'rest': return { ...base, lean: .55, look: { yaw: 0, pitch: .18 } }; // apoia-se no balcão, olha para baixo
      case 'watchRoad': return { ...base, clip: 'alert', look: { yaw: roadYaw, pitch: -.04 } };
      case 'lookAround': return { ...base, look: { yaw: Math.sin(B.t * 1.4) * .6, pitch: 0 } };
      case 'greet': return { ...base, clip: 'wave', once: true, look };
      case 'attend': case 'resume': return { ...base, look, nod: P.nodEvery ? (B.t % P.nodEvery < .55 ? Math.sin(B.t % P.nodEvery / .55 * Math.PI) : 0) : 0 };
      case 'cower': return { ...base, clip: 'alert', look, lean: -.2 };
      case 'walk': return { ...base, clip: 'walk', move: true };
      case 'yield': return { ...base, look };
      case 'pause': return { ...base, clip: B.target === 1 && B.t < 2.4 ? 'inspect' : 'idle', once: B.target === 1 && B.t < 2.4, look };
      default: return { ...base, look };
    }
  }
  return { update, get state() { return B.state; }, get history() { return B.history.slice(); }, profile: P };
}

/**
 * Motor: aplica a intenção ao NPC real (mixer, ossos, posição). npc: {holder, model, mixer, animations}.
 * opts.walkSpeed (m/s no timeScale 1, medido no clipe Walking), opts.waypoints [[x,z],…], opts.ground(x,z).
 * Chamado DEPOIS de mixer.update (o mixer reescreve os ossos; os acréscimos não acumulam).
 */
export function createVillagerDriver(THREE, npc, brain, { walkSpeed = .67, waypoints = null, ground = () => 0, blocked = () => false } = {}) {
  const clips = npc.animations || [], mixer = npc.mixer, actions = {}, head = findBone(npc.model, /^head$/i), chest = findBone(npc.model, /^(upperchest|chest)$/i), neck = findBone(npc.model, /^neck$/i);
  let current = null, curKey = null, look = { yaw: 0, pitch: 0 }, lean = 0, last = null, stuck = 0;
  const action = key => { if (actions[key] !== undefined) return actions[key]; const c = clipFor(clips, key); actions[key] = c && mixer ? mixer.clipAction(c) : null; return actions[key]; };
  if (mixer) mixer.stopAllAction(); // o factory deixou um clipe congelado: a vida assume
  function play(key, it) {
    const a = action(key) || action('idle'); if (!a) return;
    if (key === curKey && !it.once) return; if (key === curKey && it.once && current && current.isRunning()) return; curKey = key;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1);
    a.setLoop(it.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = true;
    a.timeScale = key === 'walk' ? walkScale : 1;
    a.play(); if (current && current !== a) current.crossFadeTo(a, .35, false); current = a;
  }
  const walkScale = .82, speed = walkSpeed * walkScale, _v = new THREE.Vector3();
  function update(dt, sense) {
    const it = brain.update(dt, sense); last = it;
    play(it.clip, it);
    // caminhada: anda à velocidade do passo do próprio clipe (sem deslizar), vira suave para o alvo
    if (it.move && waypoints) {
      const h = npc.holder, [tx, tz] = waypoints[it.target % waypoints.length], dx = tx - h.position.x, dz = tz - h.position.z, dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz); let dy = want - h.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); h.rotation.y += dy * Math.min(1, dt * 3);
      const step = Math.min(dist, speed * dt * Math.max(.2, Math.cos(dy))), nx = h.position.x + Math.sin(h.rotation.y) * step, nz = h.position.z + Math.cos(h.rotation.y) * step;
      if (!blocked(nx, nz)) { h.position.set(nx, ground(nx, nz), nz); stuck = 0; } else stuck += dt;
      sense.atTarget = dist < .35 || stuck > 2; // obstáculo no caminho: desiste daquele ponto e volta (nunca trava andando no lugar)
      if (sense.atTarget) stuck = 0;
    }
    // olhar e postura por cima do clipe (suavizados)
    const k = Math.min(1, dt * 3), tl = it.look || { yaw: 0, pitch: 0 };
    look.yaw += (THREE.MathUtils.clamp(tl.yaw, -.85, .85) - look.yaw) * k; look.pitch += ((tl.pitch || 0) - look.pitch) * k; lean += ((it.lean || 0) - lean) * Math.min(1, dt * 2);
    if (neck) neck.rotateY(look.yaw * .35);
    if (head) { head.rotateY(look.yaw * .65); head.rotateX(look.pitch + (it.nod || 0) * .16); }
    if (chest && lean) chest.rotateX(lean * .32);
    return it;
  }
  return { update, brain, get intent() { return last; }, get walkSpeed() { return speed; } };
}
function findBone(root, re) { let b = null; root && root.traverse(o => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; }

/** Velocidade de caminhada pelo próprio clipe: quanto o pé de apoio corre para trás num ciclo (m/s, timeScale 1). */
export function measureWalkSpeed(THREE, npc) {
  const c = clipFor(npc.animations, 'walk'); if (!c || !npc.mixer) return .67;
  const foot = findBone(npc.model, /^leftfoot$/i); if (!foot) return .67;
  const m = new THREE.AnimationMixer(npc.model), a = m.clipAction(c); a.play(); const v = new THREE.Vector3(), zs = [];
  for (let i = 0; i <= 40; i++) { m.setTime(c.duration * i / 40); npc.model.updateMatrixWorld(true); foot.getWorldPosition(v); npc.holder.worldToLocal(v); zs.push(v.z); }
  a.stop(); m.uncacheRoot(npc.model);
  const range = Math.max(...zs) - Math.min(...zs); return range > .1 && range < 2 ? range / c.duration : .67;
}
