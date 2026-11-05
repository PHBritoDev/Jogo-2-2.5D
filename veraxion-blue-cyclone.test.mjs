import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBlueCyclone, satellites, CY } from './veraxion-blue-cyclone3d.js';
import { kitFor, KITS, pickMove } from './powers3d.js';
import { ultimateFor } from './ultimates3d.js';

const GY = -1000, ground = () => GY, BOSS = { x: 1600, y: GY, z: -9, yaw: 0 }, ARENA = { x: 1600, z: 0, r: 30 };
function run(move = () => {}, o = {}) {
  const fps = o.fps || 60, s = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA), h = { x: 1601, z: 3, y: GY, iframes: false, alive: true, ...(o.hero || {}) }, L = { ev: [], aura: [], pullMax: 0 };
  for (let i = 0; i < fps * 15 && !s.done; i++) { move(h, s.st.t, s); if (o.pull !== false) { const p = s.pullAt(h.x, h.z, !!h.dash); if (p) { h.x += p.x / fps; h.z += p.z / fps; L.pullMax = Math.max(L.pullMax, p.mag); } }
    for (const e of s.step(1 / fps, { hero: h })) { e.t = s.st.t; L.ev.push(e); } L.aura.push([s.st.t, s.st.aura]); }
  L.s = s; L.h = h; return L;
}
const all = (L, t) => L.ev.filter(e => e.type === t), at = (L, t) => L.ev.find(e => e.type === t);
const dmg = L => L.ev.filter(e => e.dmg).reduce((a, e) => a + e.dmg, 0);

test('Quatro Vórtices — ordem: mira → desenho → 4 tornados → convergência → fusão → mega → implosão → pausa → UMA explosão → fogo; 8–15 s', () => {
  const L = run(); const seq = ['aim', 'draw', 'drawn', 'approach', 'merge', 'mega', 'implode', 'silence', 'blast', 'afterfire', 'end'].map(t => at(L, t).t);
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] >= seq[i - 1], 'ordem ' + i);
  assert.equal(all(L, 'spawn').length, 4); assert.deepEqual(all(L, 'spawn').map(e => e.id), [0, 1, 2, 3].map(i => 'veraxion-vortice-' + i));
  assert.ok(at(L, 'spawn').t >= at(L, 'drawn').t - 1e-9, 'tornados só depois do desenho'); assert.equal(all(L, 'blast').length, 1, 'uma explosão');
  const sil = at(L, 'blast').t - at(L, 'silence').t; assert.ok(sil > .15 && sil < .4, 'pausa breve antes do clímax: ' + sil.toFixed(2));
  const dur = at(L, 'end').t; assert.ok(dur >= 8 && dur <= 15, 'duração ' + dur.toFixed(2));
  // aura contínua até o fim do poder (não some na fusão), sem salto
  assert.ok(L.aura.filter(a => a[0] > .7 && a[0] < CY.fireEnd).every(a => a[1] > .9), 'aura presa ao bispo durante todo o poder');
  let jump = 0; for (let i = 1; i < L.aura.length; i++) jump = Math.max(jump, Math.abs(L.aura[i][1] - L.aura[i - 1][1])); assert.ok(jump < .06);
});

test('Quatro Vórtices — mandala 24–30 de diâmetro sob p0 FIXO; satélites nas diagonais; tornados vão para p0 mesmo se o herói fugir', () => {
  assert.ok(CY.R * 2 >= 24 && CY.R * 2 <= 30, 'diâmetro ' + CY.R * 2);
  const L = run((h, t) => { if (t > .5) { h.x += 6 / 60; } }, { pull: false }); const p0 = L.s.st.p0; assert.ok(Math.abs(p0.x - 1601) < 1e-9 && Math.abs(p0.z - 3) < 1e-9, 'p0 = posição no início');
  const sats = satellites(p0, ARENA); for (const s of sats) { const a = Math.atan2(s.z - p0.z, s.x - p0.x); assert.ok(Math.abs(Math.abs(Math.sin(2 * a)) - 1) < .02, 'diagonal'); }
  const merge = run((h, t) => { if (t > .5) h.x += 6 / 60; }, { pull: false }); const s = merge.s;
  // pouco antes da fusão terminar, os quatro estão perto de p0 (não do herói)
  const s2 = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA); const far = { x: 1625, z: 0, y: GY, alive: true }; for (let i = 0; i < 60 * 6.6; i++) s2.step(1 / 60, { hero: far });
  for (const o of s2.st.torn) assert.ok(Math.hypot(o.x - 1601, o.z - 3) < 2.5, 'converge para p0');
  // herói perto da borda: centro continua sob ele, satélites ficam dentro da arena
  const edge = satellites({ x: 1600 + 22, z: 0 }, ARENA); for (const q of edge) assert.ok(Math.hypot(q.x - 1600, q.z) <= ARENA.r - CY.edge + .3);
  assert.ok(s.done);
});

test('Quatro Vórtices — sucção ampliada: nunca soma os quatro, teto global, dash 18%, mega mais forte; sem sucção antes dos tornados', () => {
  const s = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA); const hero = { x: 1601, z: 3, y: GY, alive: true };
  for (let i = 0; i < 60 * 1.5; i++) s.step(1 / 60, { hero }); assert.equal(s.pullAt(1601, 3, false), null, 'nada durante o desenho');
  for (let i = 0; i < 60 * 3; i++) s.step(1 / 60, { hero }); let mx = 0; for (let x = -15; x <= 15; x += .5) for (let z = -15; z <= 15; z += .5) { const p = s.pullAt(1601 + x, 3 + z, false); if (p) mx = Math.max(mx, p.mag); } assert.ok(mx <= CY.pull.max * Math.hypot(1, CY.pull.tangent) + 1e-6, 'quatro tornados não somam: ' + mx.toFixed(2));
  for (let i = 0; i < 60 * 3.5; i++) s.step(1 / 60, { hero }); const pm = s.pullAt(1601 + 4, 3, false), pd = s.pullAt(1601 + 4, 3, true); assert.ok(pm.mag > CY.pull.max, 'mega mais forte'); assert.ok(pm.mag <= CY.pullCap + 1e-6, 'teto');
  assert.ok(Math.abs(pd.mag / pm.mag - CY.dashMul) < 1e-6, 'dash reduz a 18%'); assert.ok(s.pullAt(1601 + 20, 3, false)?.mag > 0, 'sucção agora alcança 20 m do mega tornado'); assert.equal(s.pullAt(1601 + CY.megaPull.infl + .5, 3, false), null, 'sucção tem alcance finito');
  // corrida a 7,2 m/s escapa do mega a partir de ~5 m; 3 dashes de 0,25 s a 18 m/s escapam até do centro
  const run2 = (x0, sp, dash) => { const q = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA); for (let i = 0; i < 60 * 7.2; i++) q.step(1 / 60, { hero: { x: 1640, z: 0, y: GY, alive: true } }); let x = 1601 + x0;
    for (let i = 0; i < 60 * 2.2; i++) { const d = dash && (i % 40) < 15, v = d ? 18 : sp, p = q.pullAt(x, 3, d); x += (v + (p ? p.x : 0)) / 60; q.step(1 / 60, { hero: { x, z: 3, y: GY, alive: true } }); } return x - 1601; };
  assert.ok(run2(5, 7.2, false) > 8, 'corrida progride para fora mesmo sob sucção forte'); assert.ok(run2(1, 4.3, true) > 9, 'dash repetido escapa do centro');
});

test('Quatro Vórtices — dano: contato com cooldown global, queimadura 3,7 s até 3 acúmulos, um tick por vez, explosão única; i-frames; sem empurrão', () => {
  const still = run(); const touches = all(still, 'touch'); for (let i = 1; i < touches.length; i++) assert.ok(touches[i].t - touches[i - 1].t >= CY.contactCd - 1e-6, 'cooldown global');
  assert.ok(Math.max(...all(still, 'burn').map(e => e.stacks)) <= CY.maxStacks, 'máximo 3 acúmulos'); const ticks = all(still, 'tick'); for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i].t - ticks[i - 1].t >= CY.burnTick - 1e-6, 'um tick canônico por vez');
  assert.ok(ticks.every(e => e.dmg <= CY.burnPerStack * CY.maxStacks), 'tick capado'); assert.equal(all(still, 'blast_hit').length, 1); assert.ok(dmg(still) < 100, 'parado o tempo todo não morre de uma vez (' + dmg(still) + ')');
  for (const e of still.ev) for (const k of ['push', 'impulse', 'knockback', 'vx', 'vy', 'vz']) assert.ok(!(k in e), 'sem empurrão: ' + e.type);
  // a queimadura dura 3,7 s depois do último contato e então acaba sozinha
  const s = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA); s.st.fires.push({ id: 1, x: 1601, z: 3, y: GY, born: 0, life: 99, r: 1 }); const h = { x: 1601, z: 3, y: GY, alive: true }; for (let i = 0; i < 30; i++) s.step(1 / 60, { hero: h }); h.x = 1590;
  let t = 0; while (s.st.burn && t < 6) { s.step(1 / 60, { hero: h }); t += 1 / 60; } assert.ok(Math.abs(t - CY.burnDur) < .05, 'queimadura ' + t.toFixed(2));
  // dash/i-frames durante tudo: nenhum dano
  const dash = run((h2) => { h2.iframes = true; }); assert.equal(dmg(dash), 0); assert.ok(all(dash, 'blast_dodge').length === 1);
  // longe do círculo: nada
  const far = run((h2, tt) => { if (tt > .2) { h2.x = 1600 - 26; h2.z = 0; } }, { pull: false }); assert.equal(dmg(far), 0);
  // fogo perde dano no instante em que some (7 s de vida por segmento de rastro)
  const fz = run(() => {}); assert.ok(fz.s.st.fires.length === 0);
});

test('Quatro Vórtices — 10/30/60 FPS sem divergência; interrupção limpa; nunca persiste', () => {
  const r = [10, 30, 60].map(fps => run(() => {}, { fps }));
  const sig = L => ['spawn', 'merge', 'mega', 'implode', 'blast', 'blast_hit'].map(t => all(L, t).length).join(','); assert.equal(sig(r[0]), sig(r[2])); assert.equal(sig(r[1]), sig(r[2]));
  const d = r.map(dmg); assert.ok(Math.max(...d) - Math.min(...d) <= 12, 'dano parecido em qualquer FPS: ' + d.join('/'));
  for (const cut of [1, 4, 8, 10.3]) { const s = createBlueCyclone({ ground }).start(BOSS, { x: 1601, z: 3 }, ARENA), hero = { x: 1601, z: 3, y: GY, alive: true }, ev = [];
    for (let i = 0; i < 60 * 16 && !s.done; i++) { if (Math.abs(s.st.t - cut) < 1 / 120) s.abort(); for (const e of s.step(1 / 60, { hero })) { e.t = s.st.t; ev.push(e); } }
    assert.ok(s.done && !s.holdBoss && !s.st.burn && s.st.fires.length === 0, 'limpo depois de abortar em ' + cut); assert.ok(!ev.some(e => e.t > cut + .02 && (e.dmg || e.type === 'blast')), 'sem dano depois de abortar'); }
});

test('Bispo 4 — só as duas magias autorais; nada genérico no kit, IA, ultimate ou roteamento; outros perfis intactos', () => {
  const k = kitFor('veraxion'); assert.deepEqual(k.skills.map(s => s.type), ['veraxion_four_swords', 'veraxion_four_blue_tornadoes']); assert.equal(k.sword, null); assert.equal(k.ult.type, 'veraxion_lunar_devourer'); assert.equal(k, kitFor('fallen4'));
  assert.equal(ultimateFor('veraxion').kind, 'veraxion_lunar_devourer'); assert.equal(ultimateFor('fallen4').kind, 'veraxion_lunar_devourer'); /* MOD 288: ultimate autoral */
  const seen = new Set(); let last = ''; const cds = {}; for (let i = 0; i < 400; i++) { const m = pickMove('veraxion', cds, 4 + (i % 12), last); if (m) { seen.add(m.type); last = m.id; } } assert.deepEqual([...seen].sort(), ['veraxion_four_blue_tornadoes', 'veraxion_four_swords'], 'a IA só escolhe as duas');
  assert.equal(KITS.greed2.skills[0].type, 'vortex', 'o vórtice genérico continua para quem o usa'); assert.equal(KITS.zarkhael.skills[0].type, 'hydra_judgment');
  const src = fs.readFileSync(new URL('./mundo-3d-prototype.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if(m.type==='veraxion_four_blue_tornadoes'){startVeraxionCyclone(m);return;}") && src.includes('if(isVeraxionProfile(encounterProfile))return;'), 'roteamento exclusivo, sem fallback genérico');
  assert.ok(src.includes('updateVeraxionCyclone(dt);') && src.includes('applyCycloneSuction(dt);') && src.includes('stopVeraxionCyclone();stopVeraxionSwords();'), 'integração e limpeza');
  assert.ok(!/function startVoidUlt|tickVoidUlt|BOSS_POWERS\.veraxion|veraxion:\{cd:/.test(src), 'Buraco Negro e Fogo Abissal genéricos excluídos');
  assert.ok(src.includes('if(vxSwords||cySkill||lunarUlt)return;') && src.includes('if(cySkill||vxSwords||lunarUlt)return;'), 'S1 e S2 nunca simultâneas');
  const lab = fs.readFileSync(new URL('./laboratorio-inimigos.html', import.meta.url), 'utf8'); assert.ok(lab.includes('testCicloneAzul=1') && lab.includes('testQuatroEspadas=1'));
});


test('Mod 287 — fogo azul permanece após a convergência e após o grande impacto', () => {
  assert.ok(CY.fireLife >= 6.5, 'rastro persiste pelo menos 6,5 s');
  assert.ok(CY.afterLife >= 4, 'fogo residual persiste por ~4 s');
  assert.ok(CY.megaPull.infl >= 23, 'mega suga além dos antigos 15 metros');
  assert.ok(CY.pull.infl >= 11, 'quatro tornados sugam além dos antigos 7 metros');
  assert.ok(CY.dashMul <= .2, 'dash mantém resistência forte');
  const c = createBlueCyclone({ground}).start(BOSS,{x:1601,z:3},ARENA);
  const h = {x:1640,z:3,y:GY,alive:true,iframes:false};
  for(let i=0;i<60*13;i++)c.step(1/60,{hero:h});
  assert.ok(c.st.fires.some(f=>f.big&&c.st.t-f.born >= 2.2), 'fogo grande permanece bem depois do impacto');
  assert.ok(c.st.fires.some(f=>!f.big&&c.st.t-f.born >= 6), 'rastro permanece após convergência');
  while(!c.done)c.step(1/60,{hero:h});
  assert.equal(c.st.fires.length,0,'limpa fogo no fim');
});

test('Mod 287 — queimadura visual acompanha o protagonista e não usa copa/cone genérico', () => {
  const src = fs.readFileSync(new URL('./veraxion-blue-burn3d.js',import.meta.url),'utf8');
  assert.match(src,/uAnchor\[10\]/,'flamas 3D ancoradas a dez regiões do rig');
  assert.match(src,/getWorldPosition/,'ancoragem acompanha animação');
  assert.match(src,/uHeat/,'intensidade depende do status de queimadura');
  assert.doesNotMatch(src,/ConeGeometry|CylinderGeometry|SphereGeometry|IcosahedronGeometry/,'não é capa/copa/cone/esfera genérica');
  const world=fs.readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
  assert.match(world,/createVeraxionHeroBurnVFX/);
  assert.match(world,/cyBurnFx.update\(dt,!s.st.aborted&&playerHP>0&&s.st.burn\?s.st.burn.stacks:0\)/);
  assert.match(world,/cyBurnFx.clear\(\)/,'limpa o fogo ao encerrar ou cancelar');
});
