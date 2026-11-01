import test from 'node:test';
import assert from 'node:assert/strict';
import { Enemy1Squad, KINDS } from './enemy1-squad3d.js';
import { VZ, orbitalSpell } from './vhazrael3d.js';
import './enemy2-squad3d.js'; import './enemy3-squad3d.js'; import './enemy4-squad3d.js';

const hero = (o = {}) => ({ id: 'hero', team: 'hero', x: 0, y: 0, z: 0, vx: 0, vz: 0, radius: .42, height: 1.8, alive: true, priority: 1, iframes: false, air: 0, ...o });
function world(o = {}) { const log = [], dmg = []; const sq = new Enemy1Squad({ seed: o.seed || 3, blocked: o.blocked || (() => false), damageTarget: (id, n, info) => { dmg.push({ id, n, ...info }); return 'hit'; }, event: (type, d) => log.push({ type, ...d }) }); return { sq, log, dmg }; }
const run = (sq, secs, dt = 1 / 60, each) => { for (let i = 0; i < Math.round(secs / dt); i++) { if (each) each(i * dt); sq.update(dt); } };
const boss = (sq, z = 9) => sq.spawn([{ x: 0, z, yaw: Math.PI, kind: 'vhazrael' }])[0];
const cast = (sq, a, t, id) => { a.act = null; a.cds[id] = 0; sq.startCast(a, t, id); };

test('VHAZRAEL é a espécie mais capaz: decide mais rápido, mais defesa/esquiva e kit próprio com ultimate única', () => {
  const v = VZ.boss; assert.deepEqual(v.kit, ['throne', 'thorns', 'terror', 'brood', 'orbital']);
  for (const k of ['common', 'warden', 'e2', 'e2boss', 'e3', 'e3boss', 'e4', 'e4boss']) { const o = KINDS[k]; assert.ok(v.decide[1] < o.decide[1], k + ' decide'); assert.ok(v.dodge.chance >= o.dodge.chance && v.block.chance >= (o.block?.chance || 0) - .05, k); }
  assert.equal(typeof v.brain, 'function');
});

/** Simula um "estilo" de jogador por alguns segundos e devolve o estilo aprendido + decisões. */
function styleRun(style, secs = 14, seed = 5) {
  const { sq, log } = world({ seed }); const h = hero(); sq.setTargets([h]); const a = boss(sq, 7); a.alert = 0; let side = 1;
  run(sq, secs, 1 / 60, tt => {
    h.dashing = false; h.blocking = false; h.attacking = false; h.vx = 0; h.vz = 0;
    if (style === 'dash') { if (Math.floor(tt * 2) % 2 === 0 && (tt * 2) % 1 < .15) { h.dashing = true; h.vx = 8 * side; } h.x += h.vx / 60; }
    if (style === 'guard') h.blocking = true;
    if (style === 'aggr') { const d = Math.hypot(a.x - h.x, a.z - h.z); if (d > 2.2) { h.x += (a.x - h.x) / d * 4 / 60; h.z += (a.z - h.z) / d * 4 / 60; } h.attacking = (tt * 3) % 1 < .5; }
    if (style === 'kite') { const d = Math.hypot(a.x - h.x, a.z - h.z) || 1; if (d < 11) { h.x -= (a.x - h.x) / d * 5 / 60; h.z -= (a.z - h.z) / d * 5 / 60; h.vx = -(a.x - h.x) / d * 5; h.vz = -(a.z - h.z) / d * 5; } }
  });
  return { a, log, S: a.style };
}

test('IA adaptativa: aprende o estilo observado e muda decisões (dash lateral, guarda, agressão, distância)', () => {
  const dash = styleRun('dash'), guard = styleRun('guard'), aggr = styleRun('aggr'), kite = styleRun('kite');
  assert.ok(dash.S.dash > 1 && Math.abs(dash.S.side) > .3, 'percebe o lado preferido do dash'); assert.ok(Math.abs(dash.a.T.thorns.bias) > .1, 'espinhos interceptam o lado preferido');
  assert.equal(guard.a.T.throne.guardBreak, true, 'guarda constante → ruptura quebra a guarda');
  assert.ok(aggr.a.T.block.chance > VZ.boss.block.chance && aggr.a.T.dodge.chance > VZ.boss.dodge.chance, 'agressão → mais defesa/esquiva');
  assert.ok(kite.log.some(e => e.type === 'vzClose'), 'quem foge recebe dash de aproximação');
  assert.ok(aggr.a.T.block.chance <= .55 && aggr.a.T.dodge.chance <= .6, 'adaptação com teto (não é infalível)');
  assert.equal(VZ.boss.block.chance, .32, 'não altera a ficha compartilhada');
});

test('IA: variedade (não repete o mesmo poder em sequência), ultimate só depois de mostrar três poderes e só uma vez', () => {
  const { sq, log } = world({ seed: 8 }); const h = hero({ z: -2 }); sq.setTargets([h]); const a = boss(sq, 8); a.alert = 0;
  run(sq, 70, 1 / 30, tt => { h.x = Math.sin(tt * .7) * 5; h.vx = Math.cos(tt * .7) * 3.5; });
  const casts = log.filter(e => e.type === 'cast').map(e => e.skill), firstUlt = casts.indexOf('orbital');
  assert.ok(new Set(casts).size >= 4, 'varia: ' + casts.join(','));
  for (let i = 1; i < casts.length; i++) if (casts[i] !== 'brood') assert.ok(casts[i] !== casts[i - 1] || casts[i] === 'orbital', 'repetição seguida: ' + casts.join(','));
  if (firstUlt >= 0) assert.ok(new Set(casts.slice(0, firstUlt)).size >= 3, 'mostrou o kit antes');
  assert.ok(casts.filter(c => c === 'orbital').length <= 1, 'ultimate única');
  const moves = log.filter(e => ['dodge', 'guard', 'lunge', 'vzClose', 'windup'].includes(e.type)).map(e => e.type); assert.ok(new Set(moves).size >= 2, 'move-se e defende: ' + [...new Set(moves)]);
});

test('Extinção Orbital: ~17 s, sem ponto seguro; resposta decide o dano (guarda, duelo, nada); ninguém ataca durante; sem fraqueza depois', () => {
  const R = resp => { const { sq, log, dmg } = world(); const h = hero({ x: 30 }); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; a.used = new Set(['throne', 'thorns', 'terror']);
    sq.spawn([{ x: 3, z: 3, kind: 'crawler' }]).at(-1).master = a.id; cast(sq, a, h, 'orbital'); let t = 0, attacks = 0;
    run(sq, 18.5, 1 / 60, tt => { t = tt; const s = orbitalSpell(sq); if (s && s.phase === 'choice') { h.blocking = resp === 'shield'; h.ultimate = resp === 'duel'; } if (s && s.phase !== 'after') attacks += dmg.filter(d => d.kind !== 'orbital').length; });
    return { a, log, dmg, hits: dmg.filter(d => d.kind === 'orbital'), attacks, phases: log.filter(e => e.type.startsWith('orbital_')).map(e => e.type), res: log.find(e => e.type === 'orbitalResult') };
  };
  const none = R('none'), shield = R('shield'), duel = R('duel');
  assert.deepEqual(none.phases, ['orbital_orbit', 'orbital_entry', 'orbital_arrival', 'orbital_choice', 'orbital_impact', 'orbital_after']);
  assert.ok(shield.log.some(e => e.type === 'orbitalGuard'), 'a guarda firme é confirmada antes do impacto'); assert.ok(shield.log.findIndex(e => e.type === 'orbitalGuard') < shield.log.findIndex(e => e.type === 'orbital_impact'));
  assert.ok(!none.log.some(e => e.type === 'orbitalGuard'));
  assert.equal(none.res.result, 'none'); assert.equal(none.hits[0].n, 95, 'longe (x=30) e sem resposta: dano massivo — não existe ponto seguro');
  assert.equal(shield.res.result, 'shield'); assert.ok(shield.hits[0].n < 20 && shield.hits[0].shieldBreak);
  assert.equal(duel.res.result, 'duel'); assert.equal(duel.hits.length, 0);
  assert.equal(none.attacks, 0, 'nada ataca durante a cinematografia');
  assert.ok(none.a.alive && none.a.ultUsed && !none.a.act, 'retoma sem exaustão');
  { const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq); a.alert = 0; a.used = new Set(['throne', 'thorns', 'terror']); run(sq, 40); assert.ok(log.filter(e => e.type === 'orbital').length <= 1); }
});

test('Mod 252 — Ruptura: coreografia completa, feixe para no alvo, núcleo e choque ancorados, sem dano duplicado', () => {
  const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq, 16); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'throne');
  const phases = []; run(sq, 13.5, 1 / 60, () => { const s = sq.spells.find(x => x.type === 'throne'); if (s && phases.at(-1) !== s.phase) phases.push(s.phase); });
  assert.deepEqual(phases, ['raise', 'charge', 'slash', 'wave', 'impact', 'fade']);
  for (const e of ['throne', 'throneCharge', 'throneRaise', 'throneSlash', 'throneImpact', 'throneBlast']) assert.equal(log.filter(x => x.type === e).length, 1, e);
  const slashAt = log.findIndex(e => e.type === 'throneSlash'); assert.ok(slashAt > log.findIndex(e => e.type === 'throneCharge'));
  assert.equal(dmg.filter(d => d.kind === 'throne' || d.kind === 'throneImpact').length, 1, 'um único dano por alvo');
  assert.ok(!sq.spells.some(s => s.type === 'throne'), 'magia limpa ao fim'); assert.ok(!a.act || a.act.skill !== 'throne', 'bispo volta à postura de combate');
  // dash com i-frames no instante em que a frente passa: nenhum dano (regras normais de esquiva)
  { const { sq, dmg } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq, 16); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'throne'); run(sq, 4.9); h.iframes = true; run(sq, 3); h.iframes = false; run(sq, 5);
    assert.equal(dmg.length, 0); }
});

test('Mod 252 — Ruptura INCANCELÁVEL: spam de golpes, stagger, knockback, quebra de postura e dano letal não interrompem', () => {
  const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq, 12); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'throne');
  const x0 = a.x, z0 = a.z;
  run(sq, 9, 1 / 60, t => {
    sq.damageActor(a.id, 6, { x: 0, z: 0, kind: 'melee', by: 'hero', knock: 3 }); // ataque básico em spam com empurrão
    if (Math.round(t * 60) % 20 === 0) { sq.stagger(a, .9, true); sq.damageActor(a.id, 30, { x: 0, z: 0, kind: 'area', by: 'hero' }); } // magias/ultimate + stagger forçado
    a.kx += 4; a.kz -= 4; // colisão/empurrão externo
    if (t < 8.9) assert.ok(a.alive && a.act && a.act.skill === 'throne', 'o ato nunca é trocado: t=' + t.toFixed(2));
  });
  assert.ok(Math.hypot(a.x - x0, a.z - z0) < .35, 'nem empurrão nem knockback deslocam o bispo');
  assert.ok(log.some(e => e.type === 'throneSlash') && log.some(e => e.type === 'throneImpact'), 'corte e impacto aconteceram');
  assert.ok(log.some(e => e.type === 'superArmor') && log.some(e => e.type === 'deathDeferred'));
  assert.equal(log.filter(e => e.type === 'death').length, 0, 'vida zerada no meio: a morte espera o golpe terminar'); assert.equal(a.hp, 1);
  run(sq, .5); assert.equal(a.alive, false); assert.equal(a.hp, 0); assert.equal(log.filter(e => e.type === 'death').length, 1, 'morte uma única vez, sem recompensa duplicada');
  // fúria (fase 2) atravessada no meio também espera o fim do golpe
  { const { sq, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq, 12); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'throne'); run(sq, 1);
    sq.damageActor(a.id, a.hp * .6, { kind: 'area' }); run(sq, 1); assert.equal(a.act.skill, 'throne'); assert.ok(!log.some(e => e.type === 'phase2')); run(sq, 8); assert.ok(log.some(e => e.type === 'phase2')); }
  // só cleanup sistêmico aborta (remover o ato): a magia some sem hitbox fantasma
  { const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'throne'); run(sq, 1.5); a.act = null; run(sq, 6);
    assert.equal(dmg.length, 0); assert.ok(log.some(e => e.type === 'throneEnd' && e.why === 'cleanup')); assert.ok(!sq.spells.some(s => s.type === 'throne')); }
});


test('Mod 252: hit imediato no feixe, contato único e choque depois no MESMO ponto', () => {
  const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]);
  const a = boss(sq, 16); a.alert = a.decideT = 1e9; cast(sq, a, h, 'throne');
  // Corte e contato em 5,15s (+ no máximo 1 tick de física de 120 Hz).
  run(sq, 5.22);
  const contact = log.find(e => e.type === 'throneContact');
  const impact = log.find(e => e.type === 'throneImpact');
  assert.ok(contact && impact, 'feixe tocou o herói e encerrou a viagem');
  assert.equal(impact.reason, 'target', 'primeiro contato determina o epicentro');
  assert.equal(contact.target, 'hero');
  assert.ok(Math.hypot(impact.spell.ix - h.x, impact.spell.iz - h.z) < 2,
    'explosão nasce no lugar do jogador, não no fim da arena');
  assert.ok(contact.at !== undefined && contact.at <= contact.spell.T.cut + .1, 'contato até 100 ms após o corte'); 
  assert.deepEqual(dmg.filter(d => d.kind === 'throne').map(d => d.n), [26],
    'dano direto no toque sem esperar pelas explosões');
  assert.equal(log.some(e => e.type === 'throneShockwave'), false,
    'a onda de choque vem depois do contato');
  run(sq, 1.4);
  assert.equal(log.filter(e => e.type === 'throneShockwave').length, 1);
  assert.equal(log.filter(e => e.type === 'throneBlast').length, 1);
  assert.equal(dmg.filter(d => d.id === 'hero').length, 1,
    'um único dano por jogador, sem segunda bomba');
});

test('Mod 252: obstáculo encerra feixe antes do jogador e i-frames respeitam esquiva', () => {
  {
    const { sq, dmg, log } = world({ blocked: (x, z) => z < 8 });
    const h = hero(); sq.setTargets([h]); const a = boss(sq, 16);
    a.alert = a.decideT = 1e9; cast(sq, a, h, 'throne'); run(sq, 7);
    const impact = log.find(e => e.type === 'throneImpact');
    assert.ok(impact && impact.reason === 'terrain', 'barreira absorve o feixe');
    assert.ok(impact.spell.iz > 7, 'colisão antes do herói');
    assert.equal(dmg.filter(d => d.kind === 'throne').length, 0, 'não atravessa parede');
  }
  {
    const { sq, dmg, log } = world(); const h = hero({ iframes: true }); sq.setTargets([h]);
    const a = boss(sq, 16); a.alert = a.decideT = 1e9; cast(sq, a, h, 'throne');
    run(sq, 8);
    assert.equal(dmg.length, 0, 'dash invulnerável atravessa sem dano');
    assert.equal(log.some(e => e.type === 'throneContact'), false, 'sem falso contato');
  }
});


test('Mod 252: onda de choque NÃO persegue alvo após i-frames expirarem', () => {
  const { sq, dmg } = world();
  const h = hero({ iframes: true }); sq.setTargets([h]);
  const a = boss(sq, 16); a.alert = a.decideT = 1e9;
  cast(sq, a, h, 'throne');
  run(sq, 6); // o corte e a onda já passaram pelo jogador protegido
  h.iframes = false;
  run(sq, 5);
  assert.equal(dmg.length, 0, 'não existe hit atrasado depois da onda');
});

test('Mod 252: a onda radial alcança aliados por propagação, sem duplicar dano do alvo direto', () => {
  const { sq, dmg, log } = world();
  const h = hero(), ally = hero({ id: 'ally', team: 'ally', x: 5, z: 0, priority: .5 });
  sq.setTargets([h, ally]);
  const a = boss(sq, 16); a.alert = a.decideT = 1e9;
  cast(sq, a, h, 'throne');
  run(sq, 7);
  assert.equal(dmg.filter(x => x.id === h.id && x.kind === 'throne').length, 1);
  assert.equal(dmg.filter(x => x.id === h.id && x.kind === 'throneImpact').length, 0);
  assert.equal(dmg.filter(x => x.id === ally.id && x.kind === 'throneImpact').length, 1);
  assert.equal(log.filter(x => x.type === 'throneShockwave').length, 1);
});

test('Espinhos: rachadura antes de cada espinho, arcos com vãos, um dano por onda; Mãos: agarram, mordida limitada, DASH solta, imunidade', () => {
  { const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'thorns'); run(sq, 6);
    const waves = log.filter(e => e.type === 'thornWave').length, rises = log.filter(e => e.type === 'thornRise'); assert.ok(waves >= 3 && rises.length > 10); for (const e of rises) assert.ok(e.spike.warn >= .8);
    assert.ok(dmg.length <= waves, 'no máximo um dano por onda'); }
  { const { sq, dmg } = world({ seed: 4 }); const h = hero(); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'thorns');
    run(sq, 6, 1 / 60, () => { const s = sq.spells.find(x => x.type === 'thorns'); if (!s) return; for (const p of s.spikes) if (p.phase === 'warn' && Math.hypot(h.x - p.x, h.z - p.z) < 2.9) { const dx = h.x - p.x, dz = h.z - p.z, l = Math.hypot(dx, dz) || 1; h.x += dx / l * 5 / 60; h.z += dz / l * 5 / 60; } });
    assert.equal(dmg.length, 0, 'quem lê as rachaduras escapa'); }
  { const { sq, dmg, log } = world(); const h = hero(); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; cast(sq, a, h, 'terror'); let freed = false;
    run(sq, 6, 1 / 60, () => { if (!freed && sq.heldBy('hero') && sq.heldBy('hero').t > .4) freed = sq.breakFree('hero'); });
    assert.ok(log.some(e => e.type === 'grab'), 'agarrou'); assert.ok(freed, 'DASH solta depois de 0,3 s'); assert.ok(dmg.filter(d => d.kind === 'terror').length <= 3, 'mordida limitada'); assert.ok(sq.ccImmune.has('hero') || log.some(e => e.type === 'release')); }
});

test('Ninhada: criaturas com HP que não expiram, teto de vivas, colossal uma vez, todas morrem com o bispo', () => {
  const { sq, log } = world(); const h = hero({ z: -6 }); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9;
  for (let i = 0; i < 4; i++) { cast(sq, a, h, 'brood'); run(sq, 2.5); }
  const crawlers = () => sq.actors.filter(o => o.alive && o.kind === 'crawler'); assert.ok(crawlers().length >= 1 && crawlers().length <= VZ.boss.brood.cap, 'teto: ' + crawlers().length);
  run(sq, 20); assert.ok(crawlers().length >= 1, 'não expiram enquanto vivas');
  a.hp = a.maxHp * .4; cast(sq, a, h, 'brood'); run(sq, 2.5); assert.equal(sq.actors.filter(o => o.kind === 'colossus').length, 1); assert.ok(crawlers().length <= 1, 'menos lacaios na fase colossal');
  cast(sq, a, h, 'brood'); run(sq, 2.5); assert.equal(sq.actors.filter(o => o.kind === 'colossus').length, 1, 'colossal só uma vez');
  sq.damageActor(a, 99999, {}); run(sq, .2); assert.ok(sq.actors.every(o => !o.alive), 'cleanup com a morte do bispo'); assert.ok(log.some(e => e.type === 'summon' && e.king));
});

test('Determinismo do VHAZRAEL a 30/60/144 FPS e limpeza após ciclos', () => {
  const sig = fps => { const { sq, log } = world({ seed: 12 }); const h = hero(); sq.setTargets([h]); boss(sq).alert = 0; for (let i = 0; i < 20 * fps; i++) sq.update(1 / fps); return log.filter(e => e.type === 'cast').map(e => e.skill).join(','); };
  assert.equal(sig(30), sig(60)); assert.equal(sig(60), sig(144));
});

test('Mod 247b: golpes do VHAZRAEL são cortes nativos estáveis (sem o clipe acrobático), contato só pela lâmina; poderes conjurados sobre o Idle', async () => {
  const { BOSS_MOVES } = await import('./boss-choreography3d.js');
  assert.deepEqual(BOSS_MOVES.vhazrael.map(m => m.id), ['Trono_Corte', 'Trono_Estocada', 'Trono_Queda']);
  for (const k of ['throne', 'thorns', 'terror', 'brood', 'orbital']) assert.equal(VZ.boss[k].anim, 'idle', k);
  for (const m of BOSS_MOVES.vhazrael) { const { sq, dmg } = world(); const t = hero({ z: 2.4 }); sq.meleeTrace = () => true; sq.setTargets([t]); const a = boss(sq, 0); a.alert = a.decideT = 1e9; a.z = 0; sq.startMelee(a, t, m.id); run(sq, m.duration + .2);
    assert.equal(dmg.filter(d => d.kind === 'melee').length, m.hits.length, m.id); assert.ok(a.z < t.z - t.radius); }
  { const { sq, dmg } = world(); const t = hero({ z: 2 }); sq.setTargets([t]); const a = boss(sq, 0); a.alert = a.decideT = 1e9; a.z = 0; sq.startMelee(a, t, 'Trono_Corte'); run(sq, 2); assert.equal(dmg.length, 0, 'sem traço da lâmina, sem dano'); }
});

test('Mod 253 — Extinção Orbital: storyboard de 7 fases na mesma linha do tempo, silhueta no despertar, DEF jogável e cleanup', async () => {
  const { ORBITAL, ORBITAL_PHASES } = await import('./vhazrael3d.js');
  assert.deepEqual(ORBITAL_PHASES, ['awaken', 'orbit', 'entry', 'arrival', 'choice', 'impact', 'after']);
  assert.ok(ORBITAL.choice >= 2, 'janela jogável de defesa com pelo menos 2 s'); assert.equal(ORBITAL.guard, .35);
  assert.ok(Math.abs(ORBITAL.cast - (ORBITAL.awaken + ORBITAL.orbit + ORBITAL.entry + ORBITAL.arrival + ORBITAL.choice + ORBITAL.impact)) < .01, 'o ato do bispo dura até o fim do impacto');
  const { sq, log } = world(); const h = hero({ x: 12 }); sq.setTargets([h]); const a = boss(sq); a.alert = 1e9; a.decideT = 1e9; a.used = new Set(['throne', 'thorns', 'terror']); cast(sq, a, h, 'orbital');
  const dims = {}; run(sq, 19, 1 / 60, () => { const s = orbitalSpell(sq); if (s) dims[s.phase] = Math.max(dims[s.phase] || 0, s.dim || 0); });
  assert.ok(dims.awaken > .5, 'luz da arena cai no despertar (silhueta)'); assert.ok((dims.after || 0) === 0, 'luz devolvida no fim');
  assert.ok(!orbitalSpell(sq), 'nenhum meteoro fantasma depois'); assert.equal(log.filter(e => e.type === 'orbitalResult').length, 1);
  const fs = await import('node:fs'), src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8'), vfx = fs.readFileSync(new URL('./vhazrael-vfx3d.js', import.meta.url), 'utf8');
  assert.ok(/vzSkip\(\)\{[^\n]*awaken\|orbit\|entry\|arrival/.test(src), 'PULAR cobre todas as tomadas travadas');
  assert.ok(src.includes("body.vz-choice #actions>button:not(#defend):not(#ultimate)"), 'na janela só DEF e ULTIMATE ficam na tela');
  assert.ok(/lock=!!o&&\/\^\(awaken\|orbit\|entry\|arrival\)\$\//.test(src), 'controles travados só nas tomadas, nunca na escolha');
  assert.ok(src.includes('vzApplyShot(sh)') && src.includes('vzCamRestore()'), 'tomada aplicada só no quadro desenhado');
  assert.ok(vfx.includes("vhazrael-extinction3d.js?v=mod253"), 'módulo novo da Extinção com cache versionado');
});
