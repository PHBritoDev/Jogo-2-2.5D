import { orbitalPath, orbitalMeteorAt, segSegDist, orbitalBlastR } from './vhazrael-orbital-path.js';
import { registerKind, registerSkill, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
import { SHIELD_SPECS } from './combat-defense3d.js';
import { VZ_MOVES } from './vhazrael-rig3d.js';
// Selo do motor, importado pela página para provar que a lógica nova carregou.
export const VHAZRAEL_BUILD = '320-ceifador-glb';
/**
 * MOD 247 — VHAZRAEL, o Primeiro Bispo (Bispo1-lod.glb), refeito sobre a esquadra da Mod 237 (lógica pura, 120 Hz).
 * Kit novo (os poderes antigos saem do jogo jogável) e a IA mais inteligente do jogo até aqui:
 *
 *  • Cérebro adaptativo (brain): memória curta do ESTILO observado do jogador — dash e lado preferido, tempo de guarda,
 *    agressividade, distância favorita, uso de magia — que muda pesos e parâmetros DENTRO DE LIMITES: espinhos
 *    interceptam o lado preferido, guarda constante recebe quebra de guarda, quem foge recebe dash de aproximação,
 *    quem ataca demais recebe defesa/recuo e contra-ataque. Só sinais visíveis; nada de ler botão futuro.
 *  • Ruptura do Trono Abissal (throne, MOD 252): golpe especial INCANCELÁVEL (superarmadura do lançamento ao fim da
 *    recuperação: nenhum golpe, magia, stagger, knockback ou dano do herói o interrompe; vida zerada no meio adia a morte
 *    para o fim do golpe). Erguer a espada (0–1,65 s) → carga com pilar colossal (1,65–4,45 s) → preparo e CORTE (5,15 s) →
 *    feixe rasga o chão até tocar o herói/obstáculo → dano no contato → núcleo e choque no MESMO ponto → recuperação.
 *  • Floresta de Espinhos Abissais (thorns): ondas de espinhos finos e diagonais; rachadura no chão mostra cada um
 *    antes; arcos assimétricos com vãos, um dano por onda e alvo.
 *  • Bombardeio Abissal Perseguidor (bombard, MOD 254): um emissor suspenso de lâminas rubro-negras dispara descargas em
 *    SEQUÊNCIA contra o chão por ~5,6 s. A mira é recalculada ANTES de cada disparo (posição atual + previsão curta e
 *    limitada da velocidade, com padrões centro/lateral e erro controlado); depois de disparada, a rajada tem rumo e ponto
 *    de impacto TRAVADOS. Marca no chão antes de cada impacto; dano só no contato com a explosão; fogo residual leve com
 *    tique por alvo. (MOD 254 removeu a Entidade do Terror e a Ninhada; a futura invocação terá modelo próprio.)
 *  • Extinção Orbital (orbital): ultimate ÚNICA por encontro, ~18 s (Mod 253: 7 fases/tomadas), só depois de mostrar três poderes (ou com
 *    pouca vida). O dano no impacto depende da RESPOSTA do jogador: guarda (dano residual), duelo de ultimates
 *    (anula) ou nada (dano massivo). Sem ponto seguro, sem dash que salve. Depois: sem exaustão nem fraqueza.
 */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const live = sq => sq.targets.filter(t => t.alive);
const lead = (t, k, cap) => ({ x: t.x + clamp((t.vx || 0) * k, -cap, cap), z: t.z + clamp((t.vz || 0) * k, -cap, cap) });
const anyActive = (sq, type) => sq.spells.some(s => s.type === type && !s.dead && s.phase !== 'fade');
const channeling = (sq, s) => { const o = sq.actor(s.owner); return !!(o && o.alive && o.act && o.act.type === 'cast' && o.act.spellId === s.id); };

export const THRONE = { min: 4, max: 30, cast: 9.2, release: .02, cd: 20, anim: 'idle', channel: true, unstoppable: true, raise: 1.65, charge: 4.45, cut: 5.15, speed: 24, range: 32, w: 4.6, h: 6, dmg: 26, endR: 6, endDmg: 14, impact: 3.6, shockAt: .25, shockTravel: 1.6, blast: .6, fade: 2.8,
  /* Mod 320: SEGUNDA explosão — mesmo epicentro do contato, .6 s após a primeira (compressão + detonação), frente que cresce até r em grow s;
     dano próprio por CONTATO da frente (no máximo 1 por alvo), telegrafado desde o impacto pelo anel no chão; pular acima de h, dash (iframes) ou sair do raio escapa. */
  second: { r: 4.8, grow: .42, h: 3.2, dmg: 14 } };
export const THORNS = { min: 2, max: 18, cast: 1.1, release: .45, cd: 14, anim: 'idle', waves: 3, per: 6, gap: .75, warn: .85, active: .35, hold: .8, r: .42, len: 1.6, dmg: 9, ring: [1.2, 3.6], arc: 4.2, lead: .45 };
export const BOMBARD = { min: 3, max: 26, cast: .9, release: .45, cd: 18, anim: 'idle', channel: false, rise: .6, dur: 5.6, every: .22, fall: .62, r: 1.45, dmg: 6, lead: .12, leadCap: 1.6, side: 2.6, jitter: .5, fireR: 1.45, fireLife: 2.6, fireTick: .6, fireDmg: 2, maxFires: 12, alt: 10.5 };
/* Mod 320 — Extinção Orbital refeita (briefing §7/§8): 3 tomadas LONGAS travadas (awaken 3,2 s · orbit 6,4 s contínua · entry 2,6 s
   reentrada→plano aberto→câmera devolvida) e então a QUEDA jogável (fall) com tudo liberado menos a ultimate do herói.
   Dano SÓ por contato: corpo do meteoro (esfera meteorR, teste contínuo do segmento percorrido contra a cápsula) e a
   explosão (domo que cresce de 0 a blastR em blastGrow s; altura blastH), no máximo 1 acerto de cada por alvo. */
export const ORBITAL = { min: 0, max: 60, cast: 18, release: .05, cd: 999, anim: 'idle', channel: true, awaken: 3.2, orbit: 6.4, entry: 2.6, fall: 4.2, impact: 1.6, after: 2.4,
  meteorR: 6.5, approach: 300, sink: .35, meteorDmg: 150, blastR: 15, blastH: 6, blastGrow: .95, blastDmg: 120, needSkills: 3, lowHp: .35 };

/* Mod 320 — vida e fases. Baseline REAL da luta jogável = DIMENSIONS.bishop1.hp 260 × squadHp 2,5 = 650 (o 900 daqui
   nunca valia na dimensão). 4× → 2600 em jogo (DIMENSIONS 1040 × 2,5) e aqui. Fases pela vida: 0 ensino (>70 %), 1 técnica (70–40 %), 2 ritmo (40–15 %),
   3 fúria (≤15 %). Fases sobem a variedade e a pressão de ESPADA, nunca transformam o chefe em canhão de magia. */
export const VZ_HP = 2600, VZ_PHASES = [.7, .4, .15];
/** Mod 320: o golpe do herói pesa 1,6× no VHAZRAEL — vida 4× maior sem virar desgaste (tempo de luta ≈ 2,5× o antigo, com herói 5× mais resistente). */
export const VZ_HERO_DMG = 1.6;
export const vzPhaseOf = (hp, max) => { const k = hp / Math.max(1, max); return k > VZ_PHASES[0] ? 0 : k > VZ_PHASES[1] ? 1 : k > VZ_PHASES[2] ? 2 : 3; };
/** Duplo salto REAL (motor da esquadra: 2 impulsos, dash aéreo travado no alvo, corte descendente no pouso). */
export const VZ_LEAP = Object.freeze({ min: 3.4, max: 9, crouch: .2, v1: 7.4, v2: 5.8, second: .38, dash: .26, dashSpeed: 12.5, fall: -15, maxAir: 1.5, gravity: 18, strike: { r: 2.1, dmg: 16, arc: -.3 }, recover: .55, cd: 7.5, role: 'jump', from: 1.45, speed: 1.2 });
/** Dash: recarga de 0,5 s, mas com orçamento (no máximo 3 em 2,5 s) e compromisso — nunca vira teleporte em série. */
export const VZ_DASH = Object.freeze({ speed: 13, time: .24, cd: .5, budget: 3, window: 2.5, lockout: 1.3 });
/** Proporção de decisões ofensivas: a magia é pontuação de ritmo (alvo 25–40 % das últimas 12 decisões). */
export const VZ_MIX = Object.freeze({ window: 12, maxSpell: .34, minSpellGap: 6 });
const VHAZ = {
  ...E1.common, hp: VZ_HP, radius: .55, height: 2.3, poise: 70, flinch: 99, stamina: 160, sight: 40, leash: 60, boss: true, pref: [1.6, 2.4], phase2: .4, furyCd: .8,
  speed: { walk: 2.2, run: 4.9, strafe: 2.2, back: 2.8, turn: 10 },
  melee: { max: 2.8, reach: 2.7, arc: .1, windup: .42, hits: [.42, .76], dur: 1.05, dmg: 13, cd: 1.1, knock: .8 },
  dash: VZ_DASH, block: { chance: .32, dur: .7, cd: 1.6, cost: 12, reduce: .8 }, dodge: { chance: .42, cd: VZ_DASH.cd },
  counter: { ...E1.common.counter, chance: 0, cd: 99 },
  leap: VZ_LEAP, shield: SHIELD_SPECS.vhazrael, shieldAI: { react: .22, chanceVsCast: .5, chanceVsMelee: .26, minGap: 1.1, maxGap: 10, gap: 2.4 },
  decide: [.16, .26], gap: .42, spellGap: VZ_MIX.minSpellGap, maxBig: 1, interrupt: true, feint: 'throne',
  kit: ['throne', 'thorns', 'bombard', 'orbital'], throne: THRONE, thorns: THORNS, bombard: BOMBARD, orbital: ORBITAL,
  brain: vhazraelBrain, pickMove: vhazraelPickMove, holdDeath: (sq, a) => orbitalHoldsDeath(sq, a)
};
/* Mod 320 — golpes de espada NATIVOS do VHAZRAEL.glb (vhazrael-rig3d.js): clipes reais, janelas nos picos medidos da
   mão, contato pelo traço da lâmina amostrado do mesmo clipe. Substituem os 3 golpes de IK do rig antigo. */
BOSS_MOVES.vhazrael = VZ_MOVES.map(m => ({ ...m, patterns: ['diagonal'] }));
for (const m of BOSS_MOVES.vhazrael) { m.kind = 'vhazrael'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.heavy ? 1.35 : m.fast ? .8 : m.range ? 1.1 : m.hits.length > 2 ? .85 : 1; }
/** Escolha do golpe: fase, situação observada (guarda → golpe pesado; alvo de lado/atrás → giro; janela de castigo →
    abertura rápida) e anti-repetição (nunca o mesmo duas vezes seguidas; peso cai para os recentes). */
export function vhazraelPickMove(sq, a, t, pool) {
  if (!pool.length) return null; const recent = a.recentMoves || (a.recentMoves = []), st = sq.study(t.id).rates;
  const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz) || 1, front = (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / d;
  const recovering = sq.time - sq.study(t.id).lastAttack < .9;
  let best = null, bs = -Infinity;
  for (const m of pool) {
    let w = m.weight || 1;
    if (recent[recent.length - 1] === m.id) w -= 2; else if (recent.includes(m.id)) w -= .45;
    if (m.guardBreak && (t.blocking || st.block > .25)) w += 1.1;
    if (m.spin && front < .35) w += 1.2;
    if (m.fast && recovering) w += .8;
    if (m.opener && !a.lastMoveAt) w += .6;
    if (m.hits.length > 2) w += .25 * (a.vzPhase || 0);
    w += (sq.rand() - .5) * .5;
    if (w > bs) { bs = w; best = m; }
  }
  recent.push(best.id); if (recent.length > 3) recent.shift(); a.lastMoveAt = sq.time; return best;
}
export const VZ = Object.freeze({ boss: registerKind('vhazrael', VHAZ) });

/* ---------- cérebro adaptativo ---------- */
/** Estilo observado (médias que decaem em ~8 s) e adaptação limitada dos parâmetros do PRÓPRIO bispo. */
export function vhazraelBrain(sq, a, dt, t) {
  if (!a.ownT) { a.T = { ...a.T, block: { ...a.T.block }, dodge: { ...a.T.dodge }, thorns: { ...a.T.thorns }, throne: { ...a.T.throne } }; a.ownT = true; a.style = { dash: 0, side: 0, guard: 0, aggr: 0, far: 0, cast: 0, near: 0, samples: 0 }; a.used = new Set(); }
  vzTick(sq, a, dt);
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
/** Mod 320 — fase pela vida, orçamento de dash e proporção espada × magia (com registro auditável em a.vzStats). */
function vzTick(sq, a, dt) {
  const ph = vzPhaseOf(a.hp, a.maxHp); if (ph !== a.vzPhase) { const was = a.vzPhase; a.vzPhase = ph; if (was !== undefined) sq.event('vzPhase', { actor: a, phase: ph }); }
  a.cdMul = Math.min(a.cdMul || 1, [1, .9, .8, .7][ph]);
  const S = a.vzStats || (a.vzStats = { melee: 0, leap: 0, dash: 0, block: 0, shield: 0, spell: 0, log: [], dashAt: [] });
  if (a.act && a.act !== a._vzAct) { a._vzAct = a.act; const x = a.act, kind = x.type === 'cast' && x.skill && x.skill !== 'counter' ? 'spell' : x.type === 'melee' ? 'melee' : x.type === 'leap' ? 'leap' : x.type === 'dodge' ? 'dash' : x.type === 'block' ? 'block' : null;
    if (kind) { S[kind]++; if (kind !== 'block') { S.log.push(kind); if (S.log.length > VZ_MIX.window) S.log.shift(); } if (kind === 'dash') S.dashAt.push(sq.time); } }
  if (!a.act && a.shield && a.shield.active && !a._vzShield) { a._vzShield = true; S.shield++; } else if (!(a.shield && a.shield.active)) a._vzShield = false;
  // magia demais nas últimas decisões → segura a próxima até a espada voltar a liderar
  const spells = S.log.filter(k => k === 'spell').length; if (S.log.length >= 6 && spells / S.log.length > VZ_MIX.maxSpell) a.cds.spellGap = Math.max(a.cds.spellGap || 0, 2.5);
  // dash: no máximo VZ_DASH.budget em VZ_DASH.window s; estourou → trava esquiva/avanço por um tempo (compromisso)
  S.dashAt = S.dashAt.filter(t0 => sq.time - t0 < VZ_DASH.window); if (S.dashAt.length >= VZ_DASH.budget) { a.cds.dodge = Math.max(a.cds.dodge || 0, VZ_DASH.lockout); a.cds.lunge = Math.max(a.cds.lunge || 0, VZ_DASH.lockout); a.cds.close = Math.max(a.cds.close || 0, VZ_DASH.lockout); }
}
/** Proporção auditável (testes/QA): fração de decisões ofensivas de espada/manobra × magia. */
export function vzMix(a) { const S = a.vzStats; if (!S) return null; const off = S.melee + S.leap + S.dash, tot = off + S.spell; return { ...S, log: undefined, dashAt: undefined, swordShare: tot ? +(off / tot).toFixed(3) : null }; }
const showDistinct = a => a.used ? [...a.used].filter(id => id !== 'orbital').length : 0;
const varied = (a, id) => (a.lastSkill === id ? -.4 : 0) + (a.used && !a.used.has(id) ? .25 : 0); // não repete; mostra o kit inteiro
const markUsed = (a, id) => { a.lastSkill = id; if (a.used) a.used.add(id); };

/* ---------- Ruptura do Trono Abissal (MOD 252) ---------- */
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
      // MOD 252: a lâmina colossal JÁ percorreu a trajetória no corte.
      // O feixe não é um segundo projétil: resolve TODO o contato em um tick
      // imediatamente após a pose da espada atingir T.cut.
      let stopAt = s.len, obstruction = false;
      // varredura de terreno primeiro; nunca dá dano através de parede.
      for (let d = .35; d <= s.len; d += .2) {
        if (sq.blocked(s.x + s.dx * d, s.z + s.dz * d)) {
          stopAt = Math.max(0, d - .12); obstruction = true; break;
        }
      }
      if (!obstruction && sq.blocked(s.x + s.dx * s.len, s.z + s.dz * s.len)) {
        stopAt = Math.max(0, s.len - .12); obstruction = true;
      }
      let contact = null;
      for (const tg of live(sq)) {
        if (s.hit.has(tg.id)) continue;
        const rx = tg.x - s.x, rz = tg.z - s.z;
        const along = rx * s.dx + rz * s.dz;
        const side = Math.abs(rx * s.dz - rz * s.dx);
        // Envelope de dano corresponde à casca visível: o VFX chega a 4,6 m.
        const visibleWidth = 1.1 + (T.w - 1.1) * smooth(along / Math.max(1, s.len * .45));
        if (along < -.3 || along > stopAt + tg.radius ||
            side > visibleWidth + tg.radius) continue;
        if ((tg.air || 0) > T.h) {
          if (!s.jumped) { s.jumped = true; sq.event('jumpedWave', { spell: s, target: tg.id }); }
          continue;
        }
        if (tg.iframes) continue; // dash invulnerável passa pela lâmina
        const at = clamp(along, 0, stopAt);
        if (!contact || at < contact.at) contact = { at, tg };
      }
      let outcome = null;
      if (contact) {
        stopAt = contact.at;
        s.hit.add(contact.tg.id);
        outcome = sq.damageTarget(contact.tg.id, T.dmg, {
          kind: 'throne', spell: s.id,
          x: s.x + s.dx * stopAt, z: s.z + s.dz * stopAt,
          knock: 0, guardBreak: s.guardBreak // Bispo 1: não desloca o herói para fora das explosões
        });
        sq.event('throneContact', { spell: s, target: contact.tg.id,
          result: outcome, damage: T.dmg, at: s.age });
      }
      s.front = stopAt;
      s.phase = 'impact'; s.t = 0; // impacto sempre é a consequência do CORTE
      s.impactKind = contact ? 'target' : obstruction ? 'terrain' : 'ground';
      s.impactTarget = contact?.tg.id ?? null;
      // Acerto: centro coincide com o corpo atingido, não com uma bomba depois.
      s.ix = contact ? contact.tg.x : s.x + s.dx * stopAt;
      s.iz = contact ? contact.tg.z : s.z + s.dz * stopAt;
      s.iy = sq.ground(s.ix, s.iz);
      sq.event('throneImpact', { spell: s, reason: s.impactKind });
      return;
    }
    if (s.phase === 'impact') {
      // MOD 252: a onda de choque varre uma distância REAL a partir do epicentro.
      // Dano direto ocorreu no corte; a expansão só alcança OUTROS alvos.
      if (!s.shocked && s.t >= T.shockAt) {
        s.shocked = true;
        sq.event('throneShockwave', { spell: s });
      }
      if (s.shocked) {
        const k = clamp((s.t - T.shockAt) / T.shockTravel, 0, 1);
        const waveRadius = 1.1 + 19 * (1 - (1 - k) ** 3);
        const oldRadius = s.waveRadius || 0;
        s.wavePassed = s.wavePassed || new Set();
        for (const tg of live(sq)) {
          if (s.hit.has(tg.id) || s.wavePassed.has(tg.id)) continue;
          const d = Math.hypot(tg.x - s.ix, tg.z - s.iz);
          if (d > T.endR + tg.radius || d > waveRadius + tg.radius) continue;
          // A onda PASSOU neste frame: nunca reaplica dano depois de a invulnerabilidade acabar.
          s.wavePassed.add(tg.id);
          if (tg.iframes || d < oldRadius - tg.radius) continue;
          if (sq.los && !sq.los(s.ix, s.iz, tg.x, tg.z)) continue;
          s.hit.add(tg.id);
          sq.damageTarget(tg.id, T.endDmg, { kind: 'throneImpact',
            spell: s.id, x: s.ix, z: s.iz, knock: 0 /* onda de choque sem empurrão */ });
        }
        s.waveRadius = waveRadius;
      }
      if (!s.blasted && s.t >= T.blast) {
        s.blasted = true;
        sq.event('throneBlast', { spell: s }); // Mod 320: segunda explosão no MESMO epicentro (s.ix/s.iz), dano abaixo
      }
      if (s.blasted && T.second && !s.secondDone) { // frente da segunda explosão: só quem ela TOCA, uma vez, nunca o que já passou
        const S2 = T.second, k = clamp((s.t - T.blast) / S2.grow, 0, 1), R = S2.r * (1 - (1 - k) ** 2), R0 = s.r2 || 0;
        s.hit2 = s.hit2 || new Set();
        for (const tg of live(sq)) {
          if (s.hit2.has(tg.id)) continue;
          const d = Math.hypot(tg.x - s.ix, tg.z - s.iz);
          if (d - tg.radius > R || d + tg.radius < R0) continue; // a frente ainda não chegou / já passou por dentro dele
          if ((tg.air || 0) > S2.h || tg.iframes) continue;
          if (sq.los && !sq.los(s.ix, s.iz, tg.x, tg.z)) continue;
          s.hit2.add(tg.id);
          const res = sq.damageTarget(tg.id, S2.dmg, { kind: 'throneSecond', spell: s.id, x: s.ix, z: s.iz, knock: 0 });
          sq.event('throneSecondHit', { spell: s, target: tg.id, result: res, damage: S2.dmg });
        }
        s.r2 = R; if (k >= 1) s.secondDone = true;
      }
      if (s.t >= T.impact) { s.phase = 'fade'; s.t = 0; }
    }
        else if (s.phase === 'fade' && s.t >= T.fade) s.dead = true;
  },
  danger(sq, s) { return s.phase === 'wave' ? { x: s.x + s.dx * s.front, z: s.z + s.dz * s.front, r: s.T.w + 1, until: .4 } : s.phase === 'impact' && s.T.second && !s.secondDone ? { x: s.ix, z: s.iz, r: s.T.second.r + .5, until: Math.max(.1, s.T.blast + s.T.second.grow - s.t) } : null; }
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

/* ---------- Bombardeio Abissal Perseguidor (MOD 254) ---------- */
/** Padrões de mira por disparo (sem teleguiar depois de lançado): 0 previsão, 1 lateral +, 2 posição atual, 3 lateral −, 4 adiante. */
const BOMB_PATTERN = [0, 1, 2, 3, 0, 4, 1, 2, 3, 0, 4, 2, 1, 3];
registerSkill('bombard', {
  score(sq, a, t, c) { if (anyActive(sq, 'bombard') || !c.see) return null; return .5 + (c.d > 5 ? .25 : 0) + clamp((a.style?.far || 0) / 4, 0, .25) + clamp((a.style?.dash || 0) / 4, 0, .15) + varied(a, 'bombard'); },
  spawn(sq, a, t) {
    const T = a.T.bombard; markUsed(a, 'bombard'); const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    const s = { id: sq.nextId++, type: 'bombard', owner: a.id, kind: a.kind, T, tid: t.id, t: 0, age: 0, phase: 'rise', ox: a.x + fx * 2.5, oz: a.z + fz * 2.5, oy: a.y + T.alt, shots: [], fires: [], fired: 0, next: T.rise, lastFire: {}, hitAt: {} };
    sq.spells.push(s); sq.event('bombard', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner); s.age += dt;
    if (!o || !o.alive) { if (s.phase !== 'fade') { s.phase = 'fade'; s.t = 0; s.shots = s.shots.filter(p => p.state === 'boom'); s.fires.length = 0; sq.event('bombardEnd', { spell: s, why: 'owner' }); } } // sem dano depois do dono morrer
    if (s.phase === 'rise' && s.age >= T.rise) { s.phase = 'fire'; s.t = 0; }
    // emissor acompanha o bispo devagar (sobre o campo, entre ele e o alvo)
    const t = sq.target(s.tid) || live(sq)[0];
    if (o && o.alive && t) { const wx = o.x + (t.x - o.x) * .35, wz = o.z + (t.z - o.z) * .35, k = 1 - Math.exp(-dt * 1.2); s.ox += (wx - s.ox) * k; s.oz += (wz - s.oz) * k; s.oy = sq.ground(s.ox, s.oz) + T.alt; }
    // um disparo por vez: a mira é calculada AGORA e o ponto de impacto fica travado
    if (s.phase === 'fire' && s.age >= s.next && s.age < T.rise + T.dur - T.fall && t && t.alive) {
      const pat = BOMB_PATTERN[s.fired % BOMB_PATTERN.length], sp = Math.hypot(t.vx || 0, t.vz || 0), ux = sp > .3 ? t.vx / sp : 0, uz = sp > .3 ? t.vz / sp : 0;
      const lead = Math.min(T.leadCap, sp * T.lead), r1 = sq.rand(), r2 = sq.rand(), j = T.jitter * (.35 + .65 * r1), ja = r2 * Math.PI * 2;
      let x = t.x + ux * lead, z = t.z + uz * lead;
      if (pat === 1 || pat === 3) { const sd = pat === 1 ? 1 : -1, px = sp > .3 ? -uz : Math.cos(s.fired), pz = sp > .3 ? ux : Math.sin(s.fired); x += px * T.side * sd; z += pz * T.side * sd; }
      else if (pat === 2) { x = t.x; z = t.z; } else if (pat === 4) { const ah = Math.min(2.4, sp * .3); x += ux * ah; z += uz * ah; }
      x += Math.cos(ja) * j; z += Math.sin(ja) * j;
      const shot = { n: s.fired, fx: s.ox, fy: s.oy, fz: s.oz, x, z, y: sq.ground(x, z), tFire: s.age, tImpact: s.age + T.fall, state: 'fall', bt: 0, hit: new Set(), scale: .85 + .3 * sq.rand(), blocked: sq.blocked(x, z) };
      s.shots.push(shot); s.fired++; s.next = s.age + T.every * (.88 + .24 * sq.rand()); sq.event('bombardShot', { spell: s, shot });
    }
    for (const p of s.shots) {
      if (p.state === 'fall' && s.age >= p.tImpact) { // contato com o chão: dano NO ponto travado, uma vez por alvo
        p.state = 'boom'; p.bt = 0;
        for (const tg of live(sq)) { if (p.hit.has(tg.id) || tg.iframes || (tg.air || 0) > 2.4) continue; const d = Math.hypot(tg.x - p.x, tg.z - p.z); if (d > T.r * p.scale + tg.radius || !sq.los(p.x, p.z, tg.x, tg.z)) continue;
          p.hit.add(tg.id); s.hitAt[tg.id] = s.age; sq.damageTarget(tg.id, T.dmg, { kind: 'bombard', spell: s.id, x: p.x, z: p.z, knock: .7 }); }
        if (!p.blocked) { s.fires.push({ x: p.x, z: p.z, y: p.y, r: T.fireR * p.scale, born: s.age }); while (s.fires.length > T.maxFires) s.fires.shift(); }
        sq.event('bombardImpact', { spell: s, shot: p });
      } else if (p.state === 'boom') { p.bt += dt; if (p.bt > 2.2) p.state = 'done'; }
    }
    s.shots = s.shots.filter(p => p.state !== 'done');
    // fogo residual: risco leve, tique por alvo (um só tique mesmo com várias manchas; nunca no mesmo instante da explosão)
    s.fires = s.fires.filter(f => s.age - f.born < T.fireLife);
    for (const tg of live(sq)) { if (tg.iframes || (tg.air || 0) > .6) continue; if (s.age - (s.lastFire[tg.id] ?? -9) < T.fireTick || s.age - (s.hitAt[tg.id] ?? -9) < T.fireTick) continue;
      if (s.fires.some(f => s.age - f.born > .25 && Math.hypot(tg.x - f.x, tg.z - f.z) < f.r + tg.radius * .5)) { s.lastFire[tg.id] = s.age; sq.damageTarget(tg.id, T.fireDmg, { kind: 'bombardFire', spell: s.id, x: tg.x, z: tg.z, knock: 0 }); } }
    if (s.phase === 'fire' && s.age >= T.rise + T.dur) { s.phase = 'fade'; s.t = 0; sq.event('bombardEnd', { spell: s, why: 'done' }); }
    if (s.phase === 'fade' && !s.shots.length && !s.fires.length) s.dead = true;
  },
  danger(sq, s) { return s.shots.filter(p => p.state === 'fall').map(p => ({ x: p.x, z: p.z, r: s.T.r + .6, until: p.tImpact - s.age })); }
});

/* ---------- Extinção Orbital (ultimate única) ---------- */
/* Mod 320 — storyboard em 3 tomadas longas + queda jogável: awaken (A: câmera baixa atrás do herói, o bispo ergue a espada,
   a luz cai e o céu abre) → orbit (B: tomada orbital contínua, o ponto de luz vira meteoro) → entry (C: reentrada e plano
   aberto da arena; a câmera VOLTA ao jogador antes do impacto) → fall (jogável: sombra crescendo sobre o alvo TRAVADO) →
   impact (explosão por contato) → after. Sem dano global, sem cancelar se o dono zerar a vida (morte pendente). */
export const ORBITAL_PHASES = ['awaken', 'orbit', 'entry', 'fall', 'impact', 'after'];
export const ORBITAL_LOCKED = /^(awaken|orbit|entry)$/;
export { orbitalPath, orbitalMeteorAt, segSegDist, orbitalBlastR };
const capsule = (sq, tg) => { const y0 = (sq.ground ? sq.ground(tg.x, tg.z) : (tg.y || 0)) + (tg.air || 0), r = tg.radius || .42, h = tg.height || 1.8; return { a: { x: tg.x, y: y0 + r, z: tg.z }, b: { x: tg.x, y: y0 + Math.max(r, h - r), z: tg.z }, r }; };
/** Ponto da cápsula mais próximo de c, com a escala vertical do domo (elipsoide blastR × blastH). */
function domeDist(c, cap, R, H) { const k = R / H, y = clamp(c.y, cap.a.y, cap.b.y), dy = (c.y - y) * k; return Math.hypot(c.x - cap.a.x, dy, c.z - cap.a.z) - cap.r; }
registerSkill('orbital', {
  score(sq, a) {
    if (a.ultUsed || anyActive(sq, 'orbital') || a.pendingDeath) return null; const T = a.T.orbital;
    return showDistinct(a) >= T.needSkills || a.hp < a.maxHp * T.lowHp ? 1.8 : null; // só depois de mostrar o kit (ou progresso equivalente)
  },
  spawn(sq, a, t) {
    a.ultUsed = true; markUsed(a, 'orbital'); if (a.act) a.act.armor = true; // não é atordoado no meio do espetáculo
    const s = { id: sq.nextId++, type: 'orbital', owner: a.id, kind: a.kind, T: a.T.orbital, tid: t.id, t: 0, total: 0, phase: 'awaken', x: a.x, z: a.z, y: a.y, result: null, hitM: new Set(), hitB: new Set(), log: [] };
    for (const o of sq.spells) if (o !== s && o.type !== 'orbital' && o.owner === a.id) o.dead = true; // nada sobreposto
    sq.spells.push(s); sq.event('orbital', { spell: s, actor: a }); return s;
  },
  step(sq, s, dt) {
    const T = s.T, o = sq.actor(s.owner), t = sq.target(s.tid); s.total += dt;
    if (!o) { s.dead = true; return; } // limpeza sistêmica (ator removido da cena): nenhum dano
    // Mod 320: NÃO cancela por !owner.alive — o meteoro já foi chamado; com o dono em 0 a morte fica pendente até o resultado
    const dur = { awaken: T.awaken, orbit: T.orbit, entry: T.entry, fall: T.fall, impact: T.impact, after: T.after };
    s.dim = s.phase === 'awaken' ? .7 * smooth(s.t / .8) : s.phase === 'orbit' || s.phase === 'entry' ? .55 : s.phase === 'fall' ? .35 + .25 * smooth(s.t / T.fall) : s.phase === 'impact' ? .6 * (1 - smooth(s.t / 1.4)) : 0;
    if (s.phase === 'after') { if (!s.resolved) this.resolve(sq, s, o); if (s.t >= T.after) s.dead = true; return; }
    if ((s.phase === 'fall' || s.phase === 'impact') && !s.path) this.lock(sq, s, o, t); // PULAR direto para a queda: trava o alvo no mesmo tick
    if (s.phase === 'fall') this.fall(sq, s);
    if (s.phase === 'impact') this.blast(sq, s);
    if (s.t >= dur[s.phase]) {
      s.t -= dur[s.phase]; const next = ORBITAL_PHASES[ORBITAL_PHASES.indexOf(s.phase) + 1];
      if (next === 'entry' || (next === 'fall' && !s.path)) this.lock(sq, s, o, t); // alvo TRAVADO antes do plano aberto (o jogador vê onde cai)
      if (next === 'impact') this.fall(sq, s, true); // fecha o último trecho da trajetória no mesmo tick (nada atravessa entre frames)
      s.phase = next; sq.event('orbital_' + next, { spell: s });
      if (next === 'impact') { s.prevR = 0; sq.event('orbitalImpact', { spell: s, x: s.path.ix, z: s.path.iz }); this.blast(sq, s); }
    }
  },
  /** trava o epicentro: posição do alvo no instante (estável até o fim) e a direção de chegada vinda de trás do bispo */
  lock(sq, s, o, t) {
    const hx = t ? t.x : s.x + 6, hz = t ? t.z : s.z + 6, bx = o.x - hx, bz = o.z - hz, l = Math.hypot(bx, bz) || 1, fx = bx / l, fz = bz / l;
    const dx = -fx * .85 - fz * .25, dz = -fz * .85 + fx * .25, dy = -.62, n = Math.hypot(dx, dy, dz);
    s.path = { ix: hx, iz: hz, iy: sq.ground ? sq.ground(hx, hz) : 0, dx: dx / n, dy: dy / n, dz: dz / n };
    const m = orbitalPath(s); s.prevC = orbitalMeteorAt(s, T_DIST(s), {}); sq.event('orbitalLock', { spell: s, x: hx, z: hz, r: s.T.blastR, meteorR: s.T.meteorR, m });
  },
  /** corpo do meteoro: segmento percorrido neste tick (prevC→C) contra cada cápsula; triscar conta; uma vez por alvo */
  fall(sq, s, final = false) {
    if (!s.path) return; const T = s.T, dist = final ? 0 : orbitalPath(s).dist, C = orbitalMeteorAt(s, dist, {}), P = s.prevC || C;
    for (const tg of live(sq)) {
      if (s.hitM.has(tg.id)) continue; const cap = capsule(sq, tg), d = segSegDist(P, C, cap.a, cap.b) - cap.r;
      if (d > T.meteorR) continue; if (tg.iframes) continue; // esquiva com i-frames atravessa o corpo (não marca: se ainda tocar depois, conta)
      s.hitM.add(tg.id); const res = sq.damageTarget(tg.id, T.meteorDmg, { kind: 'orbitalMeteor', spell: s.id, x: C.x, z: C.z, knock: 0 });
      s.log.push({ k: 'meteor', id: tg.id, res, at: s.total }); sq.event('orbitalMeteorHit', { spell: s, target: tg.id, result: res });
    }
    s.prevC = C; s.meteor = C;
  },
  /** explosão: domo que cresce do epicentro; quem a borda ou o volume ativo TOCA leva 1 acerto; fora dele, zero */
  blast(sq, s) {
    const T = s.T, P = s.path, k = clamp(s.t / T.blastGrow, 0, 1); if (s.t > T.blastGrow + 1e-6 && s.blastDone) return;
    const R = orbitalBlastR(T, s.t), c = { x: P.ix, y: P.iy, z: P.iz };
    for (const tg of live(sq)) {
      if (s.hitB.has(tg.id)) continue; const cap = capsule(sq, tg); if (domeDist(c, cap, R, T.blastH) > R) continue;
      if (tg.iframes) continue; if (sq.los && !sq.los(P.ix, P.iz, tg.x, tg.z)) continue;
      s.hitB.add(tg.id); const res = sq.damageTarget(tg.id, T.blastDmg, { kind: 'orbitalBlast', spell: s.id, x: P.ix, z: P.iz, knock: 0 });
      s.log.push({ k: 'blast', id: tg.id, res, at: s.total }); sq.event('orbitalBlastHit', { spell: s, target: tg.id, result: res });
    }
    s.blastR = R; if (k >= 1) s.blastDone = true;
  },
  /** resultado (UMA vez, depois de TODO dano resolvido): herói vivo → morte do chefe pendente se confirma (vitória única) */
  resolve(sq, s, o) {
    s.resolved = true; const t = sq.target(s.tid), heroAlive = !!(t && t.alive);
    s.result = s.hitM.size || s.hitB.size ? 'hit' : 'escaped'; sq.event('orbitalResult', { spell: s, target: s.tid, result: s.result, meteor: s.hitM.has(s.tid), blast: s.hitB.has(s.tid) });
    if (o.pendingDeath) {
      o.pendingDeath = false; o.act = null;
      if (heroAlive) { o.hp = 0; sq.event('deathConfirmed', { actor: o, spell: s }); sq.kill(o); }
      else { o.hp = Math.max(1, o.hp); sq.event('deathPendingDefeat', { actor: o, spell: s }); } // herói caiu: DERROTA, sem recompensa (o jogo reinicia o duelo)
    }
  },
  danger(sq, s) { return s.path && (s.phase === 'fall' || s.phase === 'impact') ? { x: s.path.ix, z: s.path.iz, r: s.T.blastR + 1, until: s.phase === 'fall' ? s.T.fall - s.t : .5 } : null; }
});
const T_DIST = s => orbitalPath(s).dist;
/** Mod 320: chefe com ultimate em curso segura a morte (vale até o resultado; depois, morte normal). */
export function orbitalHoldsDeath(sq, a) { return !!sq.spells.find(s => s.type === 'orbital' && s.owner === a.id && !s.resolved && !s.dead); }
export function orbitalActive(sq) { return sq ? sq.spells.find(s => s.type === 'orbital' && s.phase !== 'after') || null : null; }
export function orbitalSpell(sq) { return sq ? sq.spells.find(s => s.type === 'orbital') || null : null; }
