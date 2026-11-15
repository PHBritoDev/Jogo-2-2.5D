// Vila da Clareira (Mod 319+): colisão ajustada à forma, conversa com moradores e saco do carregador.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VILLAGE_SOLIDS, createVillageSolidQuery, decodeVillageSolids, villageLayoutSignature } from '../eldoria-village-solids.js';
import { ELDORIA_PLOTS, ELDORIA_MARKET, ELDORIA_PROPS } from '../eldoria-live-village3d.js';
import { VILLAGE_TALK, TALK_IDS, talkPhase, openConversation, answerTopic, listOptions, loadTalkMemory, saveTalkMemory, TALK_STORE } from '../eldoria-village-talk.js';
import { createVillagerBrain } from '../eldoria-npc-life.js';

const src = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const C = { x: -12.2, z: -44.5 };

test('máscara medida no jogo corresponde ao layout atual (regerar com tools/visual-lab/village-solid-mask.cjs)', () => {
  assert.equal(villageLayoutSignature([ELDORIA_PLOTS, ELDORIA_MARKET, ELDORIA_PROPS, { x: VILLAGE_SOLIDS.cx, z: VILLAGE_SOLIDS.cz }]), VILLAGE_SOLIDS.sig);
  assert.deepEqual([VILLAGE_SOLIDS.cx, VILLAGE_SOLIDS.cz], [C.x, C.z]);
  const bits = decodeVillageSolids(); assert.equal(bits.length, VILLAGE_SOLIDS.N ** 2);
  const n = bits.reduce((a, b) => a + b, 0); assert.ok(n > 3000 && n < 12000, `${n} células sólidas`);
});

test('barracas sólidas por inteiro (centro e pontas), praça livre, fora da vila nada muda', () => {
  const q = createVillageSolidQuery();
  for (const [x, z, size, yaw] of ELDORIA_MARKET) {
    const cx = C.x + x, cz = C.z + z, r = [Math.cos(yaw), -Math.sin(yaw)];
    assert.ok(q(cx, cz), `centro da barraca ${x},${z}`);
    // pontas do balcão (além do antigo círculo de 1,22 m), dos dois lados
    const hits = [-1, 1].filter(s => [1.3, 1.45, 1.6].some(d => q(cx + r[0] * d * s, cz + r[1] * d * s))).length;
    assert.equal(hits, 2, `pontas sólidas da barraca ${x},${z}`);
  }
  assert.equal(q(C.x, C.z), false, 'centro da praça livre');
  assert.equal(q(C.x + 500, C.z), false, 'fora do quadro da vila');
});

test('integração: blockedAt consulta a máscara, com ?solidos=0 para comparar e sondas de QA', () => {
  assert.match(src, /const villageSolidAt=new URLSearchParams\(location\.search\)\.get\('solidos'\)==='0'\?\(\)=>false:createVillageSolidQuery\(\);/);
  assert.match(src, / if\(villageSolidAt\(x,z\)\)return true;\n for\(const o of marketObstacles\)/);
  for (const k of ['villageSolidMask(', 'villageSolidAudit(', 'villageReach(', 'villagers()', 'villagerBones(']) assert.ok(src.includes(k), k);
});

test('conversas: todo morador tem abertura, 2+ tópicos e despedida; fases sem contradizer o roteiro', () => {
  assert.deepEqual([...TALK_IDS].sort(), ['bento', 'carregador', 'lia', 'moradora', 'morador', 'teo'].sort());
  for (const id of TALK_IDS) {
    for (const qs of [0, 1, 3, 6, 9]) {
      const mem = { v: 1, npc: {} }, o = openConversation(id, { questStep: qs, hour: 14, hint: 'pista' }, mem);
      assert.ok(o.opening.length && o.opening.every(p => p.text && p.who === VILLAGE_TALK[id].name));
      assert.ok(o.options.length >= 3 && o.options.at(-1).id === 'tchau');
      for (const opt of o.options.slice(0, -1)) { const r = answerTopic(id, opt.id, { questStep: qs, hint: 'pista' }, mem); assert.ok(r.pages[0].text, id + '/' + opt.id); assert.equal(r.done, false); }
      assert.equal(answerTopic(id, 'tchau', {}, mem).done, true);
    }
  }
  // só Téo fala do Pecado/VHAZRAEL, e só depois da cena canônica (fase "depois" para VHAZRAEL)
  const all = TALK_IDS.flatMap(id => VILLAGE_TALK[id].topics.flatMap(t => Object.entries(t.say || {}).flatMap(([ph, l]) => l.map(s => [id, ph, s]))));
  for (const [id, ph, s] of all) if (/VHAZRAEL|Pecado/i.test(s)) assert.ok(id === 'teo' && ph === 'depois', `${id}/${ph}: ${s}`);
  assert.deepEqual([0, 1, 2, 5, 6, 7, 8].map(talkPhase), ['chegada', 'chegada', 'floresta', 'floresta', 'portal', 'portal', 'depois']);
});

test('memória: repetir tópico avança a fala; Téo fica desconfiado; noite muda a abertura; memória corrompida não quebra', () => {
  const mem = { v: 1, npc: {} };
  openConversation('lia', { questStep: 0, hour: 14 }, mem);
  const a = answerTopic('lia', 'frutas', { questStep: 0 }, mem).pages[0].text, b = answerTopic('lia', 'frutas', { questStep: 0 }, mem).pages[0].text;
  assert.notEqual(a, b);
  assert.ok(listOptions('lia', {}, mem).find(o => o.id === 'frutas').label.endsWith('·'), 'tópico já conversado marcado');
  assert.notEqual(openConversation('lia', { questStep: 0, hour: 14 }, mem).opening.at(-1).text, VILLAGE_TALK.lia.open.first[0], 'não se apresenta duas vezes');
  for (let i = 0; i < 3; i++) answerTopic('teo', 'rumores', { questStep: 1 }, mem);
  assert.match(openConversation('teo', { questStep: 1, hour: 14 }, mem).opening.at(-1).text, /pergunta demais/);
  assert.equal(openConversation('bento', { questStep: 0, hour: 22 }, { v: 1, npc: {} }).opening.at(-1).text, VILLAGE_TALK.bento.open.night[0]);
  const store = new Map(), S = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  store.set(TALK_STORE, '{quebrado'); assert.deepEqual(loadTalkMemory(S), { v: 1, npc: {} });
  assert.ok(saveTalkMemory(S, mem)); assert.equal(loadTalkMemory(S).npc.lia.topics.frutas, 2);
  assert.equal(saveTalkMemory({ setItem() { throw Error('cheio'); } }, mem), false);
});

test('jogo: CONVERSAR com vendedores e moradores, opções de resposta, missão de Téo com prioridade, conversa não dá recompensa', () => {
  assert.match(src, /nearbyVendor\?'CONVERSAR · '\+nearbyVendor\.name\.split\(' ·'\)\[0\]\.toUpperCase\(\)/);
  assert.match(src, /if\(act1Interact\(\)\)return;/);
  assert.match(src, /const talker=nearestVillageTalker\(\);if\(talker\)startVillageConversation\(talker\.id,talker\.c\);/);
  assert.match(src, /function pickDialogueOption\(id\)/);
  const conv = src.slice(src.indexOf('function startVillageConversation('), src.indexOf('let talkCam=null;'));
  assert.doesNotMatch(conv, /coins\s*[+-]=|questStep\s*=|act1Advance|save3DProgress/, 'conversa não mexe em moedas, missão nem save');
  const html = fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="dialog-options" hidden role="group" aria-label="Respostas"><\/div>/);
});

test('IA: olha o herói por um tempo e desvia; não gira para trás; gesto pedido na conversa; confere estoque', () => {
  const b = createVillagerBrain('lia', 3); let looked = 0, away = 0;
  for (let i = 0; i < 300; i++) { const it = b.update(1 / 30, { heroDist: 3, heroAngle: .3 }); if (it.look && Math.abs(it.look.yaw - .3) < 1e-9) looked++; else away++; }
  assert.ok(looked > 60 && away > 30, `olha ${looked} quadros, desvia ${away}`);
  const behind = createVillagerBrain('lia', 3); let lb = 0; for (let i = 0; i < 90; i++) { const it = behind.update(1 / 30, { heroDist: 2, heroAngle: 2.6 }); if (it.look && Math.abs(it.look.yaw) > 2) lb++; }
  assert.equal(lb, 0, 'não rastreia quem está atrás');
  const t = createVillagerBrain('teo', 5); assert.ok(t.cue('alert', 2)); assert.equal(t.update(.1, {}).clip, 'alert');
  const v = createVillagerBrain('lia', 9); const seen = new Set(); for (let i = 0; i < 4000; i++) seen.add(v.update(1 / 10, { heroDist: 50 }).state); assert.ok(seen.has('stock') && seen.has('work'));
});

test('saco do carregador: no ombro, preso ao osso, longe da cabeça (antes: esfera de 40 cm à altura da cabeça)', () => {
  const f = src.slice(src.indexOf('function porterSack(c){'), src.indexOf('function updateVillagers(dt){'));
  assert.match(f, /leftshoulder/i); assert.match(f, /sh\.attach\(sack\)/); assert.match(f, /headGap/);
  assert.doesNotMatch(src, /SphereGeometry\(\.2,8,6\),new THREE\.MeshStandardMaterial\(\{color:0x8a7150/);
});
