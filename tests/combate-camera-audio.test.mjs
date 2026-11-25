/**
 * Missão combate/câmera/movimento/áudio (briefing 17/11/2026) — regras travadas por teste.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTA_LOCO, protaMoveDef, BASIC_TRAIL } from '../prota-combat3d.js';
import { MOBILITY } from '../combat-mobility3d.js';
import { BOSS_MOVES } from '../boss-choreography3d.js';
import '../vhazrael3d.js';
import { bossGap } from '../enemy1-squad3d.js';

const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');

test('P1: canvas acompanha resize/zoom/rotação (sem faixa de fundo); estilo controlado pelo CSS', () => {
  assert.ok(/renderer\.setSize\(innerWidth,innerHeight,false\);/.test(m), 'o setSize inicial não grava px no estilo');
  assert.ok(/function resize\(\)\{[^}]*renderer\.setSize\(w,h,false\)/.test(m), 'todo resize ajusta o buffer');
  assert.ok(/addEventListener\('orientationchange'/.test(m) && /visualViewport\.addEventListener\('resize',resize\)/.test(m));
  assert.ok(/#scene\{position:fixed;inset:0;width:100%;height:100%/.test(html));
});
test('P1: mouse no PC — pointer lock, yaw 360° contínuo, pitch só sem inverter, mesma sensibilidade 1ª/3ª pessoa', () => {
  assert.ok(/requestPointerLock/.test(m) && /document\.addEventListener\('mousemove',e=>\{if\(!mouseLocked\)return;/.test(m));
  assert.ok(/function lookDelta\(dx,dy\)\{const s=\.004\*userSettings\.sensitivity;[^}]*cameraYaw-=dx\*s;cameraPitch=THREE\.MathUtils\.clamp\(cameraPitch\+dy\*s,-1\.32,1\.32\);\}/.test(m));
  assert.ok(!/cameraYaw=THREE\.MathUtils\.clamp/.test(m), 'yaw nunca é limitado');
  assert.ok(/if\(cineActive\|\|dialogueOpen\|\|namePromptOpen\|\|gamePaused\|\|menuGate\)\{try\{document\.exitPointerLock\(\);/.test(m), 'cena/diálogo/pausa soltam o ponteiro');
});
test('P2: sem botão MIRAR; trava suave automática com histerese; golpe sempre orientado ao alvo válido', () => {
  assert.ok(!/id="aim"/.test(html) && !/MIRAR<\/span>/.test(html));
  // missão 19/11: a trava suave com histerese vive em chooseAttackTarget (alvo atual com bônus; analógico não solta o alvo perto)
  assert.ok(/chooseAttackTarget\(from,\{heroYaw:playerYaw,camYaw:cameraYaw\+Math\.PI,stick:st,cands,lockedId,currentId:prota302\.lockId/.test(m));
  assert.ok(/assist:true,range:lockOnActive\?18:9/.test(m));
  assert.ok(/function cycleSoftTarget\(\)/.test(m) && /cycleSoftTarget\(\);\}/.test(m));
});
test('P2: poder inimigo não prende a câmera — tomadas só nas fases de cena (com PULAR); queda/impacto jogáveis com a câmera do jogador', () => {
  const ex = fs.readFileSync(new URL('../vhazrael-extinction3d.js', import.meta.url), 'utf8');
  assert.ok(/else \{ if \(ph !== 'entry'\) shot = null;/.test(ex), 'nenhum resto de tomada na fase jogável');
  assert.ok(/blend: 1 - smooth\(\(u - \.7\) \/ \.3\)/.test(ex), 'a tomada da entrada devolve a câmera com blend antes da queda');
  assert.ok(/cine=!!o&&\/\^\(awaken\|orbit\|entry\)\$\/\.test\(o\.phase\)/.test(m) && /sk\.textContent='PULAR ›'/.test(m), 'tomadas travadas só nas fases de cena, com PULAR');
  assert.ok(/function vzCamRestore\(\)/.test(m) && /\/\*\* MOD 249[^]*nunca trava\s+controle/.test(m), 'deslocamento só no quadro desenhado; câmera do jogador devolvida');
  assert.ok(/if\(engaged&&!lockOnActive\)\{const k=portrait\?\.focusBlend\?\?\(newHero&&rites\.active\?\.def\?\.drive\?\.3:\.22\);/.test(m), 'fora do perfil de retrato de VORGAZHEK, o foco de combate conserva o limite de 30 %');
});
test('P3: VHAZRAEL — cadência por golpe (leve/médio/pesado), telegraph legível, cadeia de 3–4 e pausa tática', () => {
  const pool = BOSS_MOVES.vhazrael; assert.ok(pool.length >= 6);
  for (const mv of pool) {
    const real = mv.duration / mv.rate, first = mv.hits[0] / mv.rate;
    assert.ok(mv.rate >= 1 && mv.rate <= 1.7, mv.id);
    assert.ok(first >= .32, `${mv.id}: 1º impacto em ${first.toFixed(2)} s (precisa dar para ler)`);
    if (mv.fast) assert.ok(real <= .8, mv.id); else if (mv.heavy) assert.ok(real >= 1 && real <= 1.6, mv.id); else assert.ok(real <= 1.75, mv.id);
    for (let i = 1; i < mv.hits.length; i++) assert.ok((mv.hits[i] - mv.hits[i - 1]) / mv.rate >= .2, `${mv.id}: golpes distintos (sem dano duplo no mesmo arco)`);
  }
  const a = { id: 'vz' }; const gaps = Array.from({ length: 12 }, () => bossGap(a));
  assert.ok(gaps.filter(g => g < .2).length >= 8 && gaps.some(g => g > .6), 'quase colados, com respiração');
  const src = fs.readFileSync(new URL('../enemy1-squad3d.js', import.meta.url), 'utf8');
  assert.ok(/act\.t \+= dt \* \(act\.move\?\.rate \|\| 1\)/.test(src), 'janelas/traço/avanço/clipe no mesmo relógio');
  const rt = fs.readFileSync(new URL('../enemy1-squad-runtime3d.js', import.meta.url), 'utf8'); assert.ok(/b\.cur\.time=a\.act\.t/.test(rt), 'o clipe segue act.t (sem timeScale solto)');
});
test('P4: golpe básico sem projétil, dano pelo rastro colado à lâmina', () => {
  for (const mode of ['ground', 'run', 'dash', 'air', 'plunge']) for (let i = 0; i < (mode === 'ground' ? 5 : 1); i++) { const d = protaMoveDef(mode, i); assert.equal(d.energy, null); assert.equal(d.hit, 'physical'); assert.equal(d.trail, BASIC_TRAIL); }
});
test('P5: andar mais ágil (corrida só com comando) e 2º salto mais alto; 1º salto intacto', () => {
  assert.ok(PROTA_LOCO.walk >= 2.8 && PROTA_LOCO.walk <= 3.5 && PROTA_LOCO.run >= 6 && PROTA_LOCO.run <= 7.5);
  assert.ok(MOBILITY.airJumpK ** 2 / .92 ** 2 >= 1.25 && MOBILITY.airJumpK ** 2 / .92 ** 2 <= 1.45 && MOBILITY.maxJumps === 2);
});

/* ---------- P6: áudio real (ElevenLabs, fallback autorizado) no lugar do procedural genérico ---------- */
import { indexManifest, pickVariant, createSampleBank, BANK_LIMITS } from '../audio-banco3d.js';
const man = JSON.parse(fs.readFileSync(new URL('../audio/audio-manifest.json', import.meta.url), 'utf8'));
test('P6: manifesto rastreável — arquivo existe, hash confere, custo e origem registrados, um resultado por chamada', async () => {
  const { createHash } = await import('node:crypto');
  assert.ok(man.assets.length >= 35 && man.gasto_total_creditos > 0);
  for (const a of man.assets) {
    const buf = fs.readFileSync(new URL('../' + a.arquivo, import.meta.url)); assert.equal(createHash('sha256').update(buf).digest('hex'), a.sha256, a.assetId);
    assert.ok((a.custo_creditos_confirmado > 0 || a.custo_observacao) && /1 resultado por chamada/.test(a.origem) && a.prompt && a.evento);
    assert.ok(a.pico_dbfs <= 0 && a.pico_dbfs >= -3 || a.loop, a.assetId + ': pico normalizado'); assert.ok(a.media_db > -30, a.assetId + ': não é arquivo mudo');
    assert.ok(buf.length < (a.categoria === 'musica' ? 1.6 * 1024 * 1024 : 200 * 1024), a.assetId + ': leve para o celular');
  }
  for (const ev of ['swing:0', 'swing:1', 'swing:2', 'hit', 'block', 'parry', 'hurt', 'vz:light', 'vz:heavy', 'vz:hit', 'whoosh', 'jump', 'land', 'step:grass', 'step:path', 'step:water', 'step:ash', 'thunder', 'amb:forestDay', 'amb:forestNight', 'amb:rain', 'amb:river', 'amb:falls', 'amb:cave', 'amb:dim:bishop1', 'mus:bishop1', 'mus:bishop2', 'mus:bishop3', 'mus:bishop4'])
    assert.ok(indexManifest(man).has(ev), 'evento coberto: ' + ev);
  assert.ok(!man.assets.some(a => /ganancia|greed|buraco negro|black hole/i.test(a.assetId + a.prompt)), 'sem sons da Ganância nem dos poderes futuros do protagonista');
});
test('P6: banco — variação sem repetir, carregamento preguiçoso com fallback, limite de vozes', async () => {
  const idx = indexManifest(man), list = idx.get('swing:0').concat(idx.get('swing:1')); let last = null;
  for (let i = 0; i < 20; i++) { const a = pickVariant(list, last); assert.notEqual(a.assetId, last); last = a.assetId; }
  const decoded = []; const ctx = { state: 'running', currentTime: 0, decodeAudioData: (ab, ok) => { decoded.push(ab); ok({ duration: 1 }); },
    createBufferSource: () => ({ playbackRate: { value: 1 }, connect() {}, start() {}, stop() {} }), createGain: () => ({ gain: { value: 1, setTargetAtTime(v) { this.value = v; } }, connect() {} }) };
  const bank = createSampleBank(ctx, { fetchFn: async (u) => u.endsWith('.json') ? { ok: true, json: async () => man } : { arrayBuffer: async () => new ArrayBuffer(8) } });
  await bank.init; assert.equal(bank.play('hit', {}), false, '1º pedido: ainda carregando → o chamador usa o procedural');
  await new Promise(r => setTimeout(r, 10)); assert.equal(bank.play('hit', {}), true, 'depois: só a amostra');
  for (let i = 0; i < 30; i++) bank.play('hit', {}); assert.ok(bank.stats().vozes <= BANK_LIMITS.voices);
  assert.equal(bank.play('nao-existe', {}), false);
  const mus = createSampleBank(ctx, { fetchFn: async (u) => u.endsWith('.json') ? { ok: true, json: async () => man } : { arrayBuffer: async () => new ArrayBuffer(8) } });
  await mus.init; assert.equal(mus.loop('mus:bishop2', {}, .9, { release: true }), false, 'música só baixa ao entrar na dimensão');
  await new Promise(r => setTimeout(r, 10)); assert.equal(mus.loop('mus:bishop2', {}, .9, { release: true }), true);
  assert.equal(mus.stats().decodificados, 1); mus.loop('mus:bishop2', {}, 0, { release: true });
  assert.equal(mus.stats().decodificados, 1, 'ainda em fade-out: não libera');
  mus.loop('mus:bishop2', {}, 0, { release: true }); assert.equal(mus.stats().decodificados, 0, 'depois do fade-out a faixa sai da memória'); assert.equal(mus.stats().loops, 0);
});
test('P6: trilhas originais por dimensão dos 4 Bispos, custo medido, sem pré-carregar música no celular', () => {
  const mus = man.assets.filter(a => a.categoria === 'musica'); assert.equal(mus.length, 4);
  assert.deepEqual(mus.map(a => a.evento).sort(), ['mus:bishop1', 'mus:bishop2', 'mus:bishop3', 'mus:bishop4']);
  for (const a of mus) { assert.ok(/no vocals, no lyrics/i.test(a.prompt) && /^Original instrumental/.test(a.prompt), a.assetId); assert.ok(!/shadow fight|anime|naruto|zelda|dark souls/i.test(a.prompt), a.assetId + ': sem pedir imitação'); }
  assert.ok(mus.filter(a => a.custo_creditos_confirmado > 0).length >= 3);
  const au = fs.readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
  assert.ok(/a\.categoria !== 'musica'\)/.test(au) && /\{ release: true \}/.test(au), 'música baixada ao entrar e liberada depois do fade');
});
test('P6: audio3d usa as amostras nos eventos cobertos (procedural só de reserva); ambiente por bioma/dimensão', () => {
  const au = fs.readFileSync(new URL('../audio3d.js', import.meta.url), 'utf8');
  for (const ev of ["'hit'", "'hurt'", "'block'", "'parry'", "'whoosh'", "'land'", "'thunder'", "'swing:'"]) assert.ok(au.includes('bank.play(' + ev), ev);
  assert.ok(/bank\.loop\('amb:rain'/.test(au) && /L\('amb:dim:bishop1'/.test(au) && /layers\.wind\.g\.gain\.setTargetAtTime\(0, t, \.5\)/.test(au), 'loop real cala o procedural equivalente');
  assert.ok(/case 'windup':if\(a\?\.kind==='vhazrael'\)/.test(m) && /worldAudio\.bossHit\(\)/.test(m), 'VHAZRAEL com vush no corte e impacto próprio');
  assert.ok(/biome:audioBiome\(\),dimension:voidMode\?\(dimKey\|\|'void'\):null/.test(m));
  assert.ok(/bank\.loop\('mus:' \+ k, musicBus, on \? \.9 : 0, \{ release: true \}\)/.test(au) && /music\.set\(realMusic \? 'silent'/.test(au), 'trilha real da dimensão cala a música sintética');
});
