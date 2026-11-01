import { registerKind, registerSkill, E1 } from './enemy1-squad3d.js';
import { BOSS_MOVES } from './boss-choreography3d.js';
// Selo do motor, importado pela página para provar que a lógica nova carregou.
export const VHAZRAEL_BUILD = '255-bombardeio-dobro';
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

export const THRONE = { min: 4, max: 30, cast: 9.2, release: .02, cd: 14, anim: 'idle', channel: true, unstoppable: true, raise: 1.65, charge: 4.45, cut: 5.15, speed: 24, range: 32, w: 4.6, h: 6, dmg: 26, endR: 6, endDmg: 14, impact: 3.6, shockAt: .25, shockTravel: 1.6, blast: 1.05, fade: 2.8 };
export const THORNS = { min: 2, max: 18, cast: 1.1, release: .45, cd: 9, anim: 'idle', waves: 3, per: 6, gap: .75, warn: .85, active: .35, hold: .8, r: .42, len: 1.6, dmg: 9, ring: [1.2, 3.6], arc: 4.2, lead: .45 };
export const BOMBARD = { min: 3, max: 26, cast: .9, release: .45, cd: 13, anim: 'idle', channel: false, rise: .6, dur: 5.6, every: .22, fall: .62, r: 1.45, dmg: 6, lead: .12, leadCap: 1.6, side: 2.6, jitter: .5, fireR: 1.45, fireLife: 2.6, fireTick: .6, fireDmg: 2, maxFires: 12, alt: 10.5 };
export const ORBITAL = { min: 0, max: 60, cast: 15.8, release: .05, cd: 999, anim: 'idle', channel: true, awaken: 2.6, orbit: 3, entry: 4, arrival: 1.6, choice: 2.6, impact: 2, after: 2.2, guard: .35, dmg: 95, shieldDmg: 14, needSkills: 3, lowHp: .35 };

const VHAZ = {
  ...E1.common, hp: 900, radius: .55, height: 2.2, poise: 60, flinch: 99, stamina: 140, sight: 40, leash: 60, boss: true, pref: [1.8, 2.6], phase2: .5, furyCd: .78,
  speed: { walk: 2.2, run: 4.8, strafe: 2.1, back: 2.7, turn: 10 },
  // Bispo1-lod.glb 'Sword Aerial Combo' (1 s): dois cortes do clipe casados com as janelas
  melee: { max: 2.6, reach: 2.6, arc: .1, windup: .42, hits: [.42, .76], dur: 1.05, dmg: 12, cd: 1.5, knock: .8 },
  dash: { speed: 11, time: .3, cd: 1.6 }, block: { chance: .32, dur: .7, cd: 1.8, cost: 12, reduce: .8 }, dodge: { chance: .4, cd: 2 },
  counter: { ...E1.common.counter, chance: 0, cd: 99 },
  decide: [.16, .26], gap: .45, spellGap: 2.2, maxBig: 2, interrupt: true, feint: 'throne',
  kit: ['throne', 'thorns', 'bombard', 'orbital'], throne: THRONE, thorns: THORNS, bombard: BOMBARD, orbital: ORBITAL,
  brain: vhazraelBrain
};
/* MOD 247b — golpes de espada NATIVOS (assador de IK da Mod 244 sobre o esqueleto mixamo do Bispo1): substituem o clipe
   acrobático 'Sword Aerial Combo' (girava/deitava o tronco ~56°) por cortes de montante estáveis, com contato pela lâmina. */
BOSS_MOVES.vhazrael = [
  { id: 'Trono_Corte', label: 'Corte do Trono', patterns: ['diagonal', 'reverse'], hits: [.5, .92], duration: 1.55, advance: .6, heavy: true },
  { id: 'Trono_Estocada', label: 'Estocada do Condenado', patterns: ['thrust'], hits: [.68], duration: 1.4, advance: 2.4, range: [2.4, 5], score: 1, cd: 6 },
  { id: 'Trono_Queda', label: 'Sentença Vertical', patterns: ['overhead'], hits: [1.05], duration: 2, advance: 1, jump: .55, heavy: true }
];
for (const m of BOSS_MOVES.vhazrael) { m.kind = 'vhazrael'; m.open = m.hits[0] - .11; m.close = m.hits.at(-1) + .11; m.recovery = m.duration - m.close; m.damageScale = m.jump ? 1.3 : m.range ? 1.15 : 1; }
export const VZ = Object.freeze({ boss: registerKind('vhazrael', VHAZ) });

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
          knock: 1.8, guardBreak: s.guardBreak
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
            spell: s.id, x: s.ix, z: s.iz, knock: 1.4 });
        }
        s.waveRadius = waveRadius;
      }
      if (!s.blasted && s.t >= T.blast) {
        s.blasted = true;
        sq.event('throneBlast', { spell: s }); // apenas reforço VISUAL, nunca outra bomba
      }
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
/* MOD 253 — storyboard: awaken (close do tirano, X no rosto) → orbit (Terra + ameaça distante) → entry (montagem da viagem e
   reentrada) → arrival (arena: o meteoro surge no céu) → choice (POV jogável: DEF/ULTIMATE) → impact (choque) → after. */
export const ORBITAL_PHASES = ['awaken', 'orbit', 'entry', 'arrival', 'choice', 'impact', 'after'];
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
    const dur = { awaken: T.awaken, orbit: T.orbit, entry: T.entry, arrival: T.arrival, choice: T.choice, impact: T.impact, after: T.after };
    if (s.phase === 'choice' && t) { if (t.blocking) s.guardT += dt; if (t.ultimate) s.duel = true; if (!s.guardOk && s.guardT >= T.guard) { s.guardOk = true; sq.event('orbitalGuard', { spell: s, target: t.id }); } } // retorno ANTES do impacto
    s.dim = s.phase === 'awaken' ? .7 * smooth(s.t / .6) : s.phase === 'arrival' ? .35 * smooth(s.t / T.arrival) : s.phase === 'choice' ? .35 : s.phase === 'impact' ? .35 * (1 - smooth(s.t / 1.5)) : 0; // silhueta no despertar, sombra do meteoro
    if (s.phase === 'after') { if (s.t >= T.after) s.dead = true; return; }
    if (s.t >= dur[s.phase]) {
      s.t -= dur[s.phase]; const next = ORBITAL_PHASES[ORBITAL_PHASES.indexOf(s.phase) + 1]; s.phase = next; sq.event('orbital_' + next, { spell: s });
      if (next === 'impact') for (const tg of live(sq)) { // sem ponto seguro: o meteoro cobre a dimensão inteira
        const guard = tg.blocking || (tg.id === s.tid && s.guardT >= T.guard), duel = tg.ultimate || (tg.id === s.tid && s.duel);
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
