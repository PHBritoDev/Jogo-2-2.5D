import { registerKind, registerSkill, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
/**
 * MOD 247 — VHAZRAEL, o Primeiro Bispo (Bispo1-lod.glb), refeito sobre a esquadra da Mod 237 (lógica pura, 120 Hz).
 * Kit novo (os poderes antigos saem do jogo jogável) e a IA mais inteligente do jogo até aqui:
 *
 *  • Cérebro adaptativo (brain): memória curta do ESTILO observado do jogador — dash e lado preferido, tempo de guarda,
 *    agressividade, distância favorita, uso de magia — que muda pesos e parâmetros DENTRO DE LIMITES: espinhos
 *    interceptam o lado preferido, guarda constante recebe quebra de guarda, quem foge recebe dash de aproximação,
 *    quem ataca demais recebe defesa/recuo e contra-ataque. Só sinais visíveis; nada de ler botão futuro.
 *  • Ruptura do Trono Abissal (throne, MOD 251): golpe especial INCANCELÁVEL (superarmadura do lançamento ao fim da
 *    recuperação: nenhum golpe, magia, stagger, knockback ou dano do herói o interrompe; vida zerada no meio adia a morte
 *    para o fim do golpe). Erguer a espada (0–1,65 s) → carga com pilar colossal (1,65–4,45 s) → preparo e CORTE (5,15 s) →
 *    feixe rasga o chão até tocar o herói/obstáculo → dano no contato → núcleo e choque no MESMO ponto → recuperação.
 *  • Floresta de Espinhos Abissais (thorns): ondas de espinhos finos e diagonais; rachadura no chão mostra cada um
 *    antes; arcos assimétricos com vãos, um dano por onda e alvo.
 *  • Entidade do Terror (terror): silhueta colossal atrás do bispo; mãos dentadas saem de rachaduras marcadas,
 *    agarram e mordem com dano periódico limitado; DASH (ou DEF, no jogo) solta; imunidade curta depois.
 *  • Ninhada (brood): criaturas de muitas patas com HP próprio que NÃO expiram; teto de vivas; variante colossal
 *    uma vez por luta; morrem com o bispo.
 *  • Extinção Orbital (orbital): ultimate ÚNICA por encontro, ~17,5 s, só depois de mostrar três poderes (ou com
 *    pouca vida). O dano no impacto depende da RESPOSTA do jogador: guarda (dano residual), duelo de ultimates
 *    (anula) ou nada (dano massivo). Sem ponto seguro, sem dash que salve. Depois: sem exaustão nem fraqueza.
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const live = sq => sq.targets.filter(t => t.alive);
const lead = (t, k, cap) => ({ x: t.x + clamp((t.vx || 0) * k, -cap, cap), z: t.z + clamp((t.vz || 0) * k, -cap, cap) });
const anyActive = (sq, type) => sq.spells.some(s => s.type === type && !s.dead && s.phase !== 'fade');
const channeling = (sq, s) => { const o = sq.actor(s.owner); return !!(o && o.alive && o.act && o.act.type === 'cast' && o.act.spellId === s.id); };

export const THRONE = { min: 4, max: 30, cast: 9.2, release: .02, cd: 14, anim: 'idle', channel: true, unstoppable: true, raise: 1.65, charge: 4.45, cut: 5.15, speed: 24, range: 32, w: 2.8, h: 6, dmg: 26, endR: 6, endDmg: 14, impact: 3.6, shockAt: .65, blast: 1.05, fade: 2.8 };
export const THORNS = { min: 2, max: 18, cast: 1.1, release: .45, cd: 9, anim: 'idle', waves: 3, per: 6, gap: .75, warn: .85, active: .35, hold: .8, r: .42, len: 1.6, dmg: 9, ring: [1.2, 3.6], arc: 4.2, lead: .45 };
export const TERROR = { min: 2, max: 16, cast: 1.6, release: .4, cd: 16, anim: 'idle', channel: false, rise: 1.2, hands: 4, warn: .8, reach: .95, hold: 1.6, tick: .5, tickDmg: 4, endDmg: 6, fade: 1.1, grab: true, life: 4.6 };
export const BROOD = { min: 0, max: 30, cast: 1.4, release: .5, cd: 14, anim: 'idle', open: .9, cap: 2, capRage: 3, kingAt: .45 };
export const ORBITAL = { min: 0, max: 60, cast: 15.5, release: .05, cd: 999, anim: 'idle', channel: true, awaken: 3, orbit: 3.5, entry: 5, choice: 2.5, impact: .6, after: 3.2, dmg: 95, shieldDmg: 14, needSkills: 3, lowHp: .35 };
export const STOMP = { min: 0, max: 5, cast: 1.3, release: .55, cd: 6, anim: 'attack', warn: .75, r: 3.4, dmg: 14, waveH: .7 };

const VHAZ = {
  ...E1.common, hp: 900, radius: .55, height: 2.2, poise: 60, flinch: 99, stamina: 140, sight: 40, leash: 60, boss: true, pref: [1.8, 2.6], phase2: .5, furyCd: .78,
  speed: { walk: 2.2, run: 4.8, strafe: 2.1, back: 2.7, turn: 10 },
  // Bispo1-lod.glb 'Sword Aerial Combo' (1 s): dois cortes do clipe casados com as janelas
  melee: { max: 2.6, reach: 2.6, arc: .1, windup: .42, hits: [.42, .76], dur: 1.05, dmg: 12, cd: 1.5, knock: .8 },
  dash: { speed: 11, time: .3, cd: 1.6 }, block: { chance: .32, dur: .7, cd: 1.8, cost: 12, reduce: .8 }, dodge: { chance: .4, cd: 2 },
  counter: { ...E1.common.counter, chance: 0, cd: 99 },
  decide: [.16, .26], gap: .45, spellGap: 2.2, maxBig: 2, interrupt: true, feint: 'throne',
  kit: ['throne', 'thorns', 'terror', 'brood', 'orbital'], throne: THRONE, thorns: THORNS, terror: TERROR, brood: BROOD, orbital: ORBITAL,
  brain: vhazraelBrain
};
const CRAWLER = {
  ...E1.common, hp: 85, radius: .5, height: .95, poise: 10, flinch: 7, sight: 40, leash: 60,
  speed: { walk: 2.4, run: 5.2, strafe: 2, back: 2.4, turn: 11 },
  melee: { max: 2, reach: 1.9, arc: .3, windup: .45, hits: [.45], dur: .95, dmg: 7, cd: 1.6, knock: .4 },
  dash: { speed: 9, time: .3, cd: 2.4 }, block: { chance: 0, dur: .5, cd: 9, cost: 99, reduce: 0 }, dodge: { chance: .2, cd: 3 },
  counter: { ...E1.common.counter, chance: 0, cd: 99 }, decide: [.3, .45], gap: .9, kit: [], summon: true, brain: summonBrain
};
const COLOSSUS = {
  ...CRAWLER, hp: 480, radius: 1.35, height: 3, poise: 60, flinch: 99, boss: true, pref: [2.6, 3.4],
  speed: { walk: 1.9, run: 3.4, strafe: 1.4, back: 1.8, turn: 6 },
  melee: { max: 3.4, reach: 3.6, arc: .2, windup: .7, hits: [.7], dur: 1.45, dmg: 16, cd: 2.2, knock: 1.4 },
  decide: [.35, .5], spellGap: 3, maxBig: 3, kit: ['stomp'], stomp: STOMP, brain: summonBrain
};
/* MOD 247b — golpes de espada NATIVOS (assador de IK da Mod 244 sobre o esqueleto mixamo do Bispo1): substituem o clipe
   acrobático 'Sword Aerial Combo' (girava/deitava o tronco ~56°) por cortes de montante estáveis, com contato pela lâmina. */
BOSS_MOVES.vhazrael = [
  { id: 'Trono_Corte', label: 'Corte do Trono', patterns: ['diagonal', 'reverse'], hits: [.5, .92], duration: 1.55, advance: .6, heavy: true },
  { id: 'Trono_Estocada', label: 'Estocada do Condenado', patterns: ['thrust'], hits: [.68], duration: 1.4, advance: 2.4, range: [2.4, 5], score: 1, cd: 6 },
  { id: 'Trono_Queda', label: 'Sentença Vertical', patterns: ['overhead'], hits: [1.05], duration: 2, advance: 1, jump: .55, heavy: true }
];
for (const m of BOSS_MOVES.vhazrael) { m.kind = 'vhazrael'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.jump ? 1.3 : m.range ? 1.15 : 1; }
export const VZ = Object.freeze({ boss: registerKind('vhazrael', VHAZ), crawler: registerKind('crawler', CRAWLER), colossus: registerKind('colossus', COLOSSUS) });

/* ---------- cérebro adaptativo ---------- */
/** Estilo observado (médias que decaem em ~8 s) e adaptação limitada dos parâmetros do PRÓPRIO bispo. */
export function vhazraelBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge }, thorns: { ...a.T.thorns }, throne: { ...a.T.throne } }; a.ownT = true; a.style = { dash: 0, side: 0, guard: 0, aggr: 0, far: 0, cast: 0, near: 0, samples: 0 }; a.used = new Set(); }
  const S = a.style, k = Math.exp(-dt / 8);
  for (const key of ['dash', 'guard', 'aggr', 'far', 'cast', 'near']) S[key] *= k;
  if (t) {
    const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, lat = ((t.vx || 0) * dz - (t.vz || 0) * dx) / d;
    if (t.dashing && !a.sawDash) { a.sawDash = true; S.dash += 1; S.side = clamp(S.side * .8 + Math.sign(lat) * .2, -1, 1); } else if (!t.dashing) a.sawDash = false;
    S.guard += (t.blocking ? 1 : 0) * dt; S.aggr += (t.attacking && d < 3.5 ? 1 : 0) * dt; S.far += (d > 7 ? 1 : 0) * dt; S.near += (d < 3 ? 1 : 0) * dt; S.cast += (t.casting ? 1 : 0) * dt; S.samples += dt;
    // adaptação dentro de limites (nunca infalível): mais defesa contra quem ataca muito, espinhos que cortam o lado preferido
    const aggr = clamp(S.aggr / 4, 0, 1), guard = clamp(S.guard / 4, 0, 1);
    a.T.block.chance = clamp(VHAZ.block.chance + aggr * .22, 0, .55); a.T.dodge.chance = clamp(VHAZ.dodge.chance + aggr * .12 + clamp(S.cast / 3, 0, 1) * .1, 0, .6);
    a.T.thorns.bias = clamp(S.side, -1, 1) * clamp(S.dash / 3, 0, 1); a.T.thorns.delay = clamp(S.dash / 4, 0, 1) * .35; a.T.throne.guardBreak = guard > .35;
    // quem foge e mantém distância: dash de aproximação emendando o golpe (com recarga própria)
    if (!a.act && a.alert <= 0 && clamp(S.far / 4, 0, 1) > .45 && d > 6.5 && d < 14 && !a.cds.close && sq.los(a.x, a.z, t.x, t.z)) {
      a.cds.close = 4.5; sq.begin(a, { type: 'dodge', dur: a.T.dash.time * 1.6, anim: 'dash', dx: dx / d, dz: dz / d, face: true, chain: 'melee', token: 'melee', tid: t.id }); sq.event('vzClose', { actor: a });
    }
    // contra quem ataca sem parar: passo atrás logo depois de bloquear, e contra-ataque rápido
    if (a.act && a.act.type === 'block' && aggr > .4 && a.act.t > .3 && !a.cds.riposte) { a.cds.riposte = 3; a.act = null; a.cds.melee = 0; sq.startMelee(a, t); sq.event('vzRiposte', { actor: a }); }
    // strafe para o lado OPOSTO ao dash preferido (fecha a rota de fuga favorita)
    if (Math.abs(S.side) > .3) a.intent.side = -Math.sign(S.side);
  }
  // durante a Extinção Orbital ninguém mais ataca (lacaios seguram); depois, tudo segue com força total
  const orbit = sq.spells.find(s => s.type === 'orbital' && s.phase !== 'after' && s.phase !== 'done');
  for (const o of sq.actors) if (o !== a && o.alive) { if (orbit) { o.alert = Math.max(o.alert, .5); if (o.act && o.act.type !== 'stagger') o.act = null; } }
}
function summonBrain(sq, a) { const m = sq.actor(a.master); if (!m || !m.alive) sq.kill(a); } // morrem com o bispo (cleanup imediato)
const showDistinct = a => a.used ? [...a.used].filter(id => id !== 'orbital').length : 0;
const varied = (a, id) => (a.lastSkill === id ? -.4 : 0) + (a.used && !a.used.has(id) ? .25 : 0); // não repete; mostra o kit inteiro
const markUsed = (a, id) => { a.lastSkill = id; if (a.used) a.used.add(id); };

/* ---------- Ruptura do Trono Abissal (MOD 249) ---------- */
/** Linha do tempo única (s.age): raise → charge → slash (preparo) → wave (feixe) → impact → fade. O ATO do bispo é
    'cast' com unstoppable (motor da esquadra): só cleanup sistêmico (parar a luta, sair da dimensão, remover o ator)
    pode abortar — e aí a magia é limpa na hora, sem hitbox fantasma. */
registerSkill('throne', {
  score(sq, a, t, c) { if (anyActive(sq, 'throne') || !c.see) return null; return .55 + (c.d > 6 ? .3 : 0) + clamp((a.style?.far || 0) / 4, 0, .3) + (a.T.throne.guardBreak ? .25 : 0) + (c.recovering ? .2 : 0) + varied(a, 'throne'); },
  spawn(sq, a, t) {
    const T = a.T.throne; markUsed(a, 'throne');
    const s = { id: sq.nextId++, type: 'throne', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, age: 0, phase: 'raise', x: a.x, z: a.z, y: a.y, dx: Math.sin(a.yaw), dz: Math.cos(a.yaw), front: 0, len: T.range, hit: new Set(), guardBreak: !!T.guardBreak, dim: 0 };
    if (a.act) a.act.uninterruptibleSwordSpecial = s.id;
    sq.spells.push(s); sq.event('throne', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner), t = sq.target(s.tid) || live(sq)[0]; s.age += dt;
    s.dim = s.phase === 'raise' ? .45 * smooth(s.age / T.raise) : s.phase === 'charge' || s.phase === 'slash' ? .45 + .3 * smooth((s.age - T.raise) / (T.charge - T.raise)) : s.phase === 'wave' ? .75 : s.phase === 'impact' ? .75 * (1 - smooth(s.t / 1.2)) : 0;
    if (s.phase === 'raise' || s.phase === 'charge' || s.phase === 'slash') {
      // só cleanup sistêmico chega aqui (o ato é incancelável): limpa sem deixar hitbox
      if (!channeling(sq, s)) { s.phase = 'fade'; s.t = 0; s.cancel = true; s.dim = 0; sq.event('throneEnd', { spell: s, why: 'cleanup' }); return; }
      s.x = o.x; s.z = o.z; s.y = o.y;
      if (s.phase === 'raise' && s.age >= T.raise) { s.phase = 'charge'; s.t = 0; sq.event('throneCharge', { spell: s }); }
      else if (s.phase === 'charge' && s.age >= T.charge) { // mira travada no preparo do corte (com antecipação do alvo)
        const p = t ? lead(t, .3, 2.5) : { x: o.x + Math.sin(o.yaw), z: o.z + Math.cos(o.yaw) }, dx = p.x - o.x, dz = p.z - o.z, l = Math.hypot(dx, dz) || 1;
        s.dx = dx / l; s.dz = dz / l; o.yaw = Math.atan2(s.dx, s.dz); if (o.act) o.act.face = false;
        s.len = clamp(l - 1, 8, T.range); s.phase = 'slash'; s.t = 0; sq.event('throneRaise', { spell: s });
      } else if (s.phase === 'slash' && s.age >= T.cut) {
        Object.assign(s, { phase: 'wave', t: 0, x: o.x + s.dx * 1.2, z: o.z + s.dz * 1.2, y: sq.ground(o.x, o.z), front: 0 }); sq.event('throneSlash', { spell: s });
      }
      return;
    }
    if (s.phase === 'wave') {
      // Mod 251: a frente é uma única lâmina de energia. O PRIMEIRO contato válido
      // (herói ou parede) encerra o feixe exatamente no local do impacto.
      // Varredura contínua impede atravessar obstáculos entre dois frames.
      const prev = s.front, next = Math.min(s.len, prev + T.speed * dt);
      let stopAt = next, contact = null, obstruction = false;
      for (let d = Math.max(0, prev); d <= next + 1e-6; d += .25) {
        if (sq.blocked(s.x + s.dx * d, s.z + s.dz * d)) {
          stopAt = Math.max(prev, d - .12); obstruction = true; break;
        }
      }
      if (!obstruction && sq.blocked(s.x + s.dx * next, s.z + s.dz * next)) {
        stopAt = Math.max(prev, next - .12); obstruction = true;
      }
      for (const tg of live(sq)) {
        if (s.hit.has(tg.id)) continue;
        const rx = tg.x - s.x, rz = tg.z - s.z;
        const along = rx * s.dx + rz * s.dz, side = Math.abs(rx * s.dz - rz * s.dx);
        if (along < prev - tg.radius || along > stopAt + tg.radius || side > T.w + tg.radius) continue;
        if ((tg.air || 0) > T.h) {
          if (!s.jumped) { s.jumped = true; sq.event('jumpedWave', { spell: s, target: tg.id }); }
          continue;
        }
        if (tg.iframes) continue; // dash invulnerável continua atravessável
        const at = clamp(along - tg.radius, prev, stopAt);
        if (!contact || at < contact.at) contact = { at, id: tg.id };
      }
      if (contact) {
        stopAt = contact.at; s.hit.add(contact.id);
        sq.damageTarget(contact.id, T.dmg, { kind: 'throne', spell: s.id,
          x: s.x + s.dx * stopAt, z: s.z + s.dz * stopAt, knock: 1.8, guardBreak: s.guardBreak });
        sq.event('throneContact', { spell: s, target: contact.id });
      }
      s.front = stopAt;
      if (contact || obstruction || next >= s.len) {
        s.phase = 'impact'; s.t = 0;
        s.impactKind = contact ? 'target' : obstruction ? 'terrain' : 'ground';
        s.impactTarget = contact?.id ?? null;
        s.ix = s.x + s.dx * stopAt; s.iz = s.z + s.dz * stopAt;
        s.iy = sq.ground(s.ix, s.iz); // centro único para núcleo, rachaduras e ondas
        sq.event('throneImpact', { spell: s, reason: s.impactKind });
      }
      return;
    }
    if (s.phase === 'impact') {
      // A onda de choque nasce do ponto de colisão, NÃO é outro projétil.
      // Dano direto já ocorreu no contato: ninguém recebe duas vezes.
      if (!s.shocked && s.t >= T.shockAt) {
        s.shocked = true;
        for (const tg of live(sq)) {
          if (s.hit.has(tg.id) || tg.iframes ||
              Math.hypot(tg.x - s.ix, tg.z - s.iz) >= T.endR + tg.radius) continue;
          s.hit.add(tg.id);
          sq.damageTarget(tg.id, T.endDmg, { kind: 'throneImpact', spell: s.id,
            x: s.ix, z: s.iz, knock: 1.4 });
        }
        sq.event('throneShockwave', { spell: s });
      }
      if (!s.blasted && s.t >= T.blast) { s.blasted = true; sq.event('throneBlast', { spell: s }); }
      if (s.t >= T.impact) { s.phase = 'fade'; s.t = 0; }
    }
        else if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  },
  danger(sq, s) { return s.phase === 'wave' ? { x: s.x + s.dx * s.front, z: s.z + s.dz * s.front, r: s.T.w + 1, until: .4 } : null; }
});


/* ---------- Floresta de Espinhos Abissais ---------- */
registerSkill('thorns', {
  score(sq, a, t, c) { if (anyActive(sq, 'thorns')) return null; return .55 + clamp((a.style?.dash || 0) / 3, 0, .35) + (c.still ? .2 : 0) + (c.d > 3 && c.d < 9 ? .15 : 0) + varied(a, 'thorns'); },
  spawn(sq, a, t) {
    const T = a.T.thorns; markUsed(a, 'thorns');
    const s = { id: sq.nextId++, type: 'thorns', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'run', wave: 0, spikes: [], sn: 0, nextAt: 0, waves: T.waves + (a.phase2 ? 1 : 0) };
    sq.spells.push(s); sq.event('thorns', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, t = sq.target(s.tid) || live(sq)[0];
    for (let i = s.spikes.length - 1; i >= 0; i--) { const p = s.spikes[i]; p.t += dt;
      if (p.phase === 'warn' && p.t >= p.warn) { p.phase = 'active'; p.t = 0; sq.event('thornRise', { spell: s, spike: p }); }
      else if (p.phase === 'active') {
        for (const tg of live(sq)) { // cápsula do espinho (base → ponta inclinada), um dano por onda e alvo
          const key = p.wave + ':' + tg.id; if (s.hitW && s.hitW.has(key)) continue; const bx = p.x, bz = p.z, ex = p.x + p.lx * T.len, ez = p.z + p.lz * T.len, wx = ex - bx, wz = ez - bz, u = clamp(((tg.x - bx) * wx + (tg.z - bz) * wz) / (wx * wx + wz * wz), 0, 1);
          if (Math.hypot(tg.x - (bx + wx * u), tg.z - (bz + wz * u)) > T.r + tg.radius || (tg.air || 0) > 1.4 + u || tg.iframes) continue;
          (s.hitW = s.hitW || new Set()).add(key); sq.damageTarget(tg.id, T.dmg, { kind: 'thorns', spell: s.id, x: p.x, z: p.z, knock: .5 });
        }
        if (p.t >= T.active) { p.phase = 'hold'; p.t = 0; }
      } else if (p.phase === 'hold' && p.t >= T.hold) { p.phase = 'retract'; p.t = 0; }
      else if (p.phase === 'retract' && p.t >= .35) s.spikes.splice(i, 1);
    }
    if (s.phase === 'run') {
      if (s.wave < s.waves && s.t >= s.nextAt && t) { placeWave(sq, s, t); s.wave++; s.nextAt = s.t + T.gap; }
      if (s.wave >= s.waves) s.phase = 'wait';
    } else if (!s.spikes.length) s.dead = true;
  },
  danger(sq, s) { return s.spikes.filter(p => p.phase === 'warn').map(p => ({ x: p.x, z: p.z, r: s.T.len, until: p.warn - p.t })); }
});
function placeWave(sq, s, t) {
  const T = s.T, bias = T.bias || 0, p = lead(t, T.lead, 2.5), o = sq.actor(s.owner), base = o ? Math.atan2(t.x - o.x, t.z - o.z) : 0;
  // arco assimétrico (nunca o círculo inteiro), deslocado para o lado do dash preferido; a 2ª onda pode atrasar (interceptação)
  const start = base + Math.PI * .5 + bias * .9 + (sq.rand() - .5) * .6, span = T.arc * (.75 + sq.rand() * .25), n = T.per + (s.wave % 2);
  for (let i = 0; i < n; i++) {
    const ang = start + span * (i / Math.max(1, n - 1)), d = T.ring[0] + sq.rand() * (T.ring[1] - T.ring[0]), x = p.x + Math.sin(ang) * d, z = p.z + Math.cos(ang) * d;
    if (sq.blocked(x, z)) continue; const lean = ang + Math.PI + (sq.rand() - .5) * 1.2; // inclinado para dentro, diagonal
    s.spikes.push({ id: ++s.sn, wave: s.wave, x, z, y: sq.ground(x, z), lx: Math.sin(lean), lz: Math.cos(lean), warn: T.warn + (s.wave === 1 ? (T.delay || 0) : 0) + i * .03, t: 0, phase: 'warn', seed: sq.rand() * 100, h: 2.4 + sq.rand() * 1.6 });
  }
  sq.event('thornWave', { spell: s, wave: s.wave });
}

/* ---------- Entidade do Terror + Mãos Devoradoras ---------- */
registerSkill('terror', {
  score(sq, a, t, c) { if (anyActive(sq, 'terror') || sq.ccImmune.has(t.id)) return null; return .5 + clamp((a.style?.guard || 0) / 4, 0, .35) + clamp((a.style?.far || 0) / 4, 0, .25) + (a.phase2 ? .15 : 0) + varied(a, 'terror'); },
  spawn(sq, a, t) {
    const T = a.T.terror; markUsed(a, 'terror'); const p = lead(t, .35, 2), hands = [], fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), n = T.hands + (a.phase2 ? 2 : 0);
    for (let i = 0; i < n; i++) { const ang = Math.atan2(t.x - a.x, t.z - a.z) + Math.PI + (i - (n - 1) / 2) * .9 + (sq.rand() - .5) * .3, d = i === 0 ? .25 : 1.4 + sq.rand() * 1.6; hands.push({ i, x: p.x + Math.sin(ang) * d, z: p.z + Math.cos(ang) * d, y: 0, delay: .25 + i * .18, t: 0, phase: 'wait', seed: sq.rand() * 100, s: .8 + sq.rand() * .5 }); }
    for (const h of hands) h.y = sq.ground(h.x, h.z);
    const s = { id: sq.nextId++, type: 'terror', grab: true, owner: a.id, kind: a.kind, T, tid: t.id, t: 0, phase: 'rise', hands, held: null, ex: a.x - fx * 6, ez: a.z - fz * 6, ey: a.y, eyaw: a.yaw, ticks: 0, x: p.x, z: p.z };
    sq.spells.push(s); sq.event('terror', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T; s.age = (s.age || 0) + dt;
    for (const h of s.hands) { h.t += dt;
      if (h.phase === 'wait' && s.t >= h.delay) { h.phase = 'warn'; h.t = 0; }
      else if (h.phase === 'warn' && h.t >= T.warn) { h.phase = 'grab'; h.t = 0; sq.event('handRise', { spell: s, hand: h });
        if (!s.held) for (const tg of live(sq)) { if (tg.iframes || sq.ccImmune.has(tg.id) || Math.hypot(tg.x - h.x, tg.z - h.z) > T.reach + tg.radius) continue;
          s.held = { id: tg.id, t: 0, dur: T.hold, ax: h.x, az: h.z, hand: h.i }; s.x = h.x; s.z = h.z; s.ticks = 0; sq.damageTarget(tg.id, T.tickDmg, { kind: 'terror', spell: s.id, x: h.x, z: h.z, hold: true }); sq.event('grab', { spell: s, target: tg.id, dur: T.hold }); break; } }
      else if (h.phase === 'grab' && h.t >= .6 && !(s.held && s.held.hand === h.i)) { h.phase = 'sink'; h.t = 0; }
    }
    if (s.held) { s.held.t += dt; if (!sq.target(s.held.id)) sq.release(s, false);
      else if (s.held.t >= (s.ticks + 1) * T.tick && s.ticks < 2) { s.ticks++; sq.damageTarget(s.held.id, T.tickDmg, { kind: 'terror', spell: s.id, x: s.x, z: s.z }); sq.event('bite', { spell: s }); } // mordida periódica limitada
      else if (s.held && s.held.t >= s.held.dur) sq.release(s, true); }
    if (s.phase === 'sink') { s.phase = 'rise'; } // soltou (dash/DEF/tempo): a entidade continua até o fim e some
    if (s.phase === 'rise' && s.age >= T.life) { s.phase = 'fade'; s.t = 0; if (s.held) sq.release(s, false); }
    else if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  },
  danger(sq, s) { return s.hands.filter(h => h.phase === 'warn').map(h => ({ x: h.x, z: h.z, r: s.T.reach + .5, until: s.T.warn - h.t })); }
});

/* ---------- Ninhada ---------- */
const summons = (sq, a, kind) => sq.actors.filter(o => o.alive && o.master === a.id && (!kind || o.kind === kind));
registerSkill('brood', {
  score(sq, a, t, c) {
    if (anyActive(sq, 'brood')) return null; const cap = a.phase2 ? a.T.brood.capRage : a.T.brood.cap, king = !a.kingDone && a.hp < a.maxHp * a.T.brood.kingAt;
    if (!king && summons(sq, a, 'crawler').length >= (summons(sq, a, 'colossus').length ? 1 : cap)) return null; // teto de lacaios: espera alguém morrer
    return .5 + (king ? .8 : 0) + (c.d > 6 ? .15 : 0) + varied(a, 'brood');
  },
  spawn(sq, a, t) {
    const T = a.T.brood; markUsed(a, 'brood'); const king = !a.kingDone && a.hp < a.maxHp * T.kingAt; if (king) a.kingDone = true;
    const cap = king ? 0 : Math.max(0, (a.phase2 ? T.capRage : T.cap) - summons(sq, a, 'crawler').length), n = king ? 1 : Math.min(2, cap), fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), rx = fz, rz = -fx, rifts = [];
    if (king) for (const o of summons(sq, a, 'crawler').slice(1)) sq.kill(o); // na fase colossal, menos lacaios comuns
    for (let i = 0; i < n; i++) { const sd = n === 1 ? 0 : i ? 1 : -1, x = a.x + fx * (king ? 4 : 2.2) + rx * sd * 2.4, z = a.z + fz * (king ? 4 : 2.2) + rz * sd * 2.4; if (!sq.blocked(x, z)) rifts.push({ x, z, y: sq.ground(x, z), kind: king ? 'colossus' : 'crawler', done: false }); }
    const s = { id: sq.nextId++, type: 'brood', owner: a.id, kind: a.kind, T, t: 0, phase: 'open', rifts, king };
    sq.spells.push(s); sq.event('brood', { spell: s, actor: a, king }); return s;
  },
  step(sq, s) {
    const T = s.T, o = sq.actor(s.owner);
    if (s.phase === 'open' && s.t >= T.open) {
      s.phase = 'emerge'; s.t = 0; if (!o || !o.alive) { s.phase = 'fade'; return; }
      for (const r of s.rifts) { sq.spawn([{ x: r.x, z: r.z, yaw: o.yaw, kind: r.kind }]); const c = sq.actors[sq.actors.length - 1]; c.master = o.id; c.emerge = 0; c.alert = r.kind === 'colossus' ? 1.4 : .9; r.done = c.id; sq.event('summon', { spell: s, actor: c, king: r.kind === 'colossus' }); }
    } else if (s.phase === 'emerge' && s.t >= 1.2) { s.phase = 'fade'; s.t = 0; }
    else if (s.phase === 'fade' && s.t >= .6) s.dead = true;
  },
  danger() { return null; }
});
registerSkill('stomp', { // pisão da variante colossal: anel de choque baixo (dá para saltar)
  score(sq, a, t, c) { return anyActive(sq, 'stomp') || c.d > 5 ? null : .9; },
  spawn(sq, a) { const s = { id: sq.nextId++, type: 'stomp', owner: a.id, kind: a.kind, T: a.T.stomp, t: 0, phase: 'warn', x: a.x, z: a.z, y: a.y, hit: new Set() }; sq.spells.push(s); sq.event('stomp', { spell: s, actor: a }); return s; },
  step(sq, s) { const T = s.T; if (s.phase === 'warn' && s.t >= T.warn) { s.phase = 'blast'; s.t = 0; for (const tg of live(sq)) { if (tg.iframes || (tg.air || 0) > T.waveH || Math.hypot(tg.x - s.x, tg.z - s.z) > T.r + tg.radius) continue; s.hit.add(tg.id); sq.damageTarget(tg.id, T.dmg, { kind: 'stomp', spell: s.id, x: s.x, z: s.z, knock: 1.3 }); } sq.event('stompBlast', { spell: s }); } else if (s.phase === 'blast' && s.t >= .6) s.dead = true; },
  danger(sq, s) { return s.phase === 'warn' ? { x: s.x, z: s.z, r: s.T.r + .6, until: s.T.warn - s.t } : null; }
});

/* ---------- Extinção Orbital (ultimate única) ---------- */
export const ORBITAL_PHASES = ['awaken', 'orbit', 'entry', 'choice', 'impact', 'after'];
registerSkill('orbital', {
  score(sq, a) {
    if (a.ultUsed || anyActive(sq, 'orbital')) return null; const T = a.T.orbital;
    return showDistinct(a) >= T.needSkills || a.hp < a.maxHp * T.lowHp ? 1.8 : null; // só depois de mostrar o kit (ou progresso equivalente)
  },
  spawn(sq, a, t) {
    a.ultUsed = true; markUsed(a, 'orbital'); if (a.act) a.act.armor = true; // não é atordoado no meio do espetáculo
    const s = { id: sq.nextId++, type: 'orbital', owner: a.id, kind: a.kind, T: a.T.orbital, tid: t.id, t: 0, total: 0, phase: 'awaken', x: a.x, z: a.z, y: a.y, guardT: 0, result: null };
    for (const o of sq.spells) if (o !== s && o.type !== 'orbital' && o.owner === a.id) o.dead = true; // nada sobreposto
    sq.spells.push(s); sq.event('orbital', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner), t = sq.target(s.tid); s.total += dt;
    if (!o || !o.alive) { if (s.phase !== 'after') { s.phase = 'after'; s.t = 0; s.result = s.result || 'cancel'; sq.event('orbitalEnd', { spell: s, why: 'owner' }); } }
    const dur = { awaken: T.awaken, orbit: T.orbit, entry: T.entry, choice: T.choice, impact: T.impact, after: T.after };
    if (s.phase === 'choice' && t) { if (t.blocking) s.guardT += dt; if (t.ultimate) s.duel = true; }
    if (s.phase === 'after') { if (s.t >= T.after) s.dead = true; return; }
    if (s.t >= dur[s.phase]) {
      s.t -= dur[s.phase]; const next = ORBITAL_PHASES[ORBITAL_PHASES.indexOf(s.phase) + 1]; s.phase = next; sq.event('orbital_' + next, { spell: s });
      if (next === 'impact') for (const tg of live(sq)) { // sem ponto seguro: o meteoro cobre a dimensão inteira
        const guard = tg.blocking || (tg.id === s.tid && s.guardT >= .35), duel = tg.ultimate || (tg.id === s.tid && s.duel);
        const result = duel ? 'duel' : guard ? 'shield' : 'none'; if (tg.id === s.tid) s.result = result;
        if (result !== 'duel') sq.damageTarget(tg.id, result === 'shield' ? T.shieldDmg : T.dmg, { kind: 'orbital', spell: s.id, x: s.x, z: s.z, knock: result === 'shield' ? .8 : 2, unblockable: result === 'none', shieldBreak: result === 'shield' });
        sq.event('orbitalResult', { spell: s, target: tg.id, result });
      }
    }
  },
  danger() { return null; }
});
export function orbitalActive(sq) { return sq ? sq.spells.find(s => s.type === 'orbital' && s.phase !== 'after') || null : null; }
export function orbitalSpell(sq) { return sq ? sq.spells.find(s => s.type === 'orbital') || null : null; }
