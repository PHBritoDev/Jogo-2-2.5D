// Mod 318 — NPCs vivos de Eldória: inventário real dos GLBs, encaixe do cabelo, rotina determinística e contrato da vila.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ELDORIA_NPC_MODELS, ELDORIA_HAIR_COLORS, ELDORIA_HAIR_FITS, fitMeshyHair } from '../eldoria-meshy-npcs.js';
import { createVillagerBrain, VILLAGER_PROFILES, NPC_CLIP_PATTERNS, rng } from '../eldoria-npc-life.js';

const root = new URL('../', import.meta.url);
const read = f => fs.readFileSync(new URL(f, root), 'utf8');
function glbJson(file) { const b = fs.readFileSync(new URL(file, root)), len = b.readUInt32LE(12); return JSON.parse(b.slice(20, 20 + len).toString()); }

test('inventário real: clipes usados pela rotina existem nos GLBs; sem morphs nem ossos faciais (sem expressão facial fingida)', () => {
  for (const [sex, need] of [['man', ['idle', 'inspect', 'wave', 'alert', 'walk']], ['woman', ['idle', 'inspect', 'wave', 'walk']]]) {
    const j = glbJson(ELDORIA_NPC_MODELS[sex]), names = (j.animations || []).map(a => a.name);
    for (const k of need) assert.ok(names.some(n => NPC_CLIP_PATTERNS[k].test(n)), `${sex}: clipe ${k} em ${names.join(',')}`);
    for (const m of j.meshes) for (const p of m.primitives) assert.equal((p.targets || []).length, 0, 'sem morph targets');
    const bones = j.skins[0].joints.map(i => j.nodes[i].name);
    assert.ok(!bones.some(b => /jaw|eye|lid|brow|lip/i.test(b)), 'sem ossos faciais');
    assert.ok(bones.includes('Head') && bones.includes('headfront'), 'Head e headfront (eixo do rosto) presentes');
  }
});

test('encaixe do cabelo (sintético): cobre o couro cabeludo de uma cabeça elipsoidal sem entrar nela', () => {
  const head = [], R = [.09, .115, .105];
  for (let i = 0; i < 1600; i++) { const a = rng(9)(), t = Math.acos(1 - 2 * ((i + .5) / 1600)), p = i * 2.399963; head.push(R[0] * Math.sin(t) * Math.cos(p), R[1] * Math.cos(t), R[2] * Math.sin(t) * Math.sin(p)); }
  const n = head.length / 3, U = new Float32Array(n), V = new Float32Array(n), W = new Float32Array(n); let wMax = -1, noseV = 0;
  for (let i = 0; i < n; i++) { U[i] = head[i * 3]; V[i] = head[i * 3 + 1]; W[i] = head[i * 3 + 2]; if (W[i] > wMax) { wMax = W[i]; noseV = V[i]; } }
  const F = { U, V, W, n, ru: R[0], rv: R[1], rw: R[2], crownV: R[1], noseV: -.07, chinV: -R[1], wMax };
  // casca de cabelo (meia esfera um pouco maior), em outra escala e com origem deslocada, como num GLB
  const hair = []; for (let i = 0; i < 1200; i++) { const t = Math.acos(1 - ((i + .5) / 1200)), p = i * 2.399963, s = 3.1; if (Math.cos(t) < .05) continue; hair.push(5 + s * .1 * Math.sin(t) * Math.cos(p), 2 + s * .125 * Math.cos(t), -1 + s * .115 * Math.sin(t) * Math.sin(p)); }
  const fit = fitMeshyHair(F, hair, { female: false });
  assert.ok(fit.coverage > .85, `cobertura ${fit.coverage.toFixed(2)}`); assert.ok(fit.penetration < .03, `penetração ${fit.penetration.toFixed(3)}`);
  assert.ok(Math.abs(fit.S * 3.1 * .1 - .1) < .025, 'escala devolvida perto do tamanho da cabeça');
  // busca grossa (só para combinação fora da tabela): resultado parecido e muito mais barata
  const t0 = performance.now(); const fc = fitMeshyHair(F, hair, { female: false, coarse: true }); const tc = performance.now() - t0;
  const t1 = performance.now(); fitMeshyHair(F, hair, { female: false }); const tf = performance.now() - t1;
  assert.ok(fc.coverage > .8 && fc.penetration < .05, `grossa: cobertura ${fc.coverage.toFixed(2)}, penetração ${fc.penetration.toFixed(3)}`);
  assert.ok(tc * 10 < tf, `grossa ${tc.toFixed(0)} ms × completa ${tf.toFixed(0)} ms`);
});

test('desempenho: em jogo o cabelo usa encaixe PRÉ-CALCULADO (a busca completa travava o celular por dezenas de segundos)', () => {
  const src = fs.readFileSync(new URL('../eldoria-meshy-npcs.js', import.meta.url), 'utf8');
  const M = ELDORIA_NPC_MODELS;
  for (const k of [`${M.man}|${M.maleHair}|short`, `${M.woman}|${M.femaleHair}|long`, `${M.boy}|${M.maleHair}|short`, `${M.girl}|${M.femaleHair}|long`]) {
    const f = ELDORIA_HAIR_FITS[k]; assert.ok(f, 'sem encaixe pré-calculado: ' + k);
    for (const n of ['S', 'dy', 'dw', 'tilt', 'hcx', 'hcz', 'hy1']) assert.ok(Number.isFinite(f[n]), k + ' ' + n);
    assert.ok(f.S > .15 && f.S < .5, k + ' escala plausível');
  }
  assert.match(src, /let fit=fitCache\.get\(key\)\|\|ELDORIA_HAIR_FITS\[key\]\|\|null;/, 'tabela antes de qualquer busca');
  assert.match(src, /fitMeshyHair\(headFrame,pts,\{female:style==='long',coarse:true\}\)/, 'fora da tabela, só a busca grossa roda em jogo');
  assert.doesNotMatch(src, /fitMeshyHair\(headFrame,pts,\{female:style==='long'\}\)/, 'a busca completa não roda em jogo');
});

test('rotina: determinística por semente, papéis distintos, saudação sem spam, retoma o trabalho, dá passagem', () => {
  const run = (id, seed, hero) => { const b = createVillagerBrain(id, seed), out = []; for (let i = 0; i < 1200; i++) out.push(b.update(.1, hero(i)).state); return { out, b }; };
  const far = () => ({ heroDist: 30 });
  assert.deepEqual(run('teo', 5, far).out, run('teo', 5, far).out, 'mesma semente, mesma rotina');
  const sets = Object.keys(VILLAGER_PROFILES).filter(k => VILLAGER_PROFILES[k].kind === 'vendor').map(k => new Set(run(k, 3, far).out));
  assert.ok(sets.some(s => s.has('rest')) && sets.some(s => s.has('watchRoad')) && sets.some(s => s.has('lookAround')), 'cada função tem gestos próprios');
  // herói parado ao lado por 2 min: no máximo 3 saudações (cooldown), depois atende olhando
  const near = run('lia', 2, () => ({ heroDist: 2, heroAngle: .4 })); let greets = 0; for (let i = 0; i < near.out.length; i++) if (near.out[i] === 'greet' && near.out[i - 1] !== 'greet') greets++;
  assert.ok(greets >= 1 && greets <= 3, `saudações ${greets}`);
  // herói vai embora: volta a trabalhar em até ~12 s
  const back = run('bento', 4, i => ({ heroDist: i < 100 ? 2 : 30 })); assert.ok(back.out.slice(100, 220).includes('work'), 'retoma a tarefa');
  // moradora: para quando o herói está à frente, segue depois; e alterna casa ↔ fonte
  const w = createVillagerBrain('moradora', 8), seen = [];
  for (let i = 0; i < 600; i++) seen.push(w.update(.1, { heroDist: i > 100 && i < 130 ? 1 : 30, heroAhead: i > 100 && i < 130, atTarget: i % 90 === 89 }).state);
  assert.ok(seen.slice(100, 130).every(s => s !== 'walk'), 'não anda sobre o herói'); assert.ok(seen.includes('pause') && seen.slice(140).includes('walk'), 'retoma o caminho');
});

test('vila: sem desmaiados nem moscas neles; cada morador com aparência e rotina próprias', () => {
  const world = read('mundo-3d-prototype.js'), lv = world.slice(world.indexOf('function loadVillagers()'), world.indexOf('function npcIdleLife('));
  assert.doesNotMatch(lv, /role:'down'/, 'nenhum caído na vila'); assert.doesNotMatch(world, /flyNpcTargets/, 'moscas dos corpos removidas');
  assert.match(world, /const spots=marketStalls\.map\(s=>\(\{x:s\.x,z:s\.z,h:\.95\}\)\);/, 'moscas só na comida das bancas');
  const looks = [...lv.matchAll(/look:\{([^}]*)\}/g)].map(m => m[1]); assert.ok(new Set(looks).size >= 5, 'aparências distintas');
  for (const l of looks) { const c = /hairColor:'(\w+)'/.exec(l); if (c) assert.ok(ELDORIA_HAIR_COLORS[c[1]], c[1]); }
  assert.ok(looks.some(l => /beard:'full'/.test(l)) && looks.some(l => /beard:'short'/.test(l)) && looks.some(l => /beard:'stubble'/.test(l)), 'barbas variadas');
  for (const id of ['bento', 'teo', 'lia', 'morador', 'moradora']) assert.match(lv, new RegExp(`life:'${id}'`)); assert.match(world, /attachVillagerLife\(c,/);
  const fac = read('eldoria-meshy-npcs.js');
  assert.match(fac, /F\.head\.attach\(accessory\)/, 'cabelo preso ao osso Head'); assert.match(fac, /fitMeshyHair\(headFrame/);
  assert.doesNotMatch(fac, /skinBox\.max\.y-holder\.position\.y-\(child\?\.10:\.15\)/, 'sem o encaixe antigo pelo topo da caixa do corpo');
});
