import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirector, sceneDuration } from './cutscenes3d.js';
import { heavenScene, awakeningScene, wingsScene, personalize, SPEAKERS, GUIDE_NAME } from './prologue-flow.js';

function run(list, opts = {}) {
  const log = [];
  const d = createDirector({
    shot: (id, u) => { if (u === 0) log.push('shot:' + id); },
    say: (who, text) => log.push('say:' + who),
    do: id => log.push('do:' + id),
    ask: id => { log.push('ask:' + id); if (opts.autoResume) queueMicrotask(() => d.resume()); },
    end: (id, skipped) => log.push('end:' + (skipped ? 'pulou' : 'fim'))
  });
  return { d, log };
}

test('diretor: planos correm no tempo, falas esperam toque, ações disparam com o passo', () => {
  const { d, log } = run();
  d.play('x', [{ type: 'shot', id: 'a', dur: 1, with: [{ id: 'som' }] }, { type: 'say', who: 'A', text: 'oi' }, { type: 'do', id: 'efeito' }, { type: 'wait', dur: .5 }]);
  assert.deepEqual(log, ['do:som', 'shot:a']);
  d.update(.5); assert.equal(d.index, 0);
  assert.equal(d.tap(), false, 'plano não é cortado por toque');
  d.update(.6); assert.equal(d.step.type, 'say');
  d.update(10); assert.equal(d.step.type, 'say', 'fala espera o toque');
  assert.equal(d.tap(), true);
  assert.deepEqual(log.slice(-2), ['say:A', 'do:efeito']);
  d.update(.6); assert.equal(d.running, false);
  assert.equal(log.at(-1), 'end:fim');
});

test('diretor: "ask" só continua quando o jogo responde; pular encerra na hora', () => {
  const { d, log } = run();
  let fim = null;
  d.play('y', [{ type: 'ask', id: 'nome' }, { type: 'say', who: 'B', text: '…' }], s => { fim = s; });
  d.update(5); assert.equal(d.waitingAsk, true);
  assert.equal(d.tap(), false);
  d.resume(); assert.equal(d.step.type, 'say');
  d.skip(); assert.equal(fim, true); assert.equal(log.at(-1), 'end:pulou');
});

test('prólogo segue o roteiro: caminhada, ajoelhar, missão dos sete mundos, asas e aura retiradas, volta no quarto mundo', () => {
  const s = heavenScene(), texto = JSON.stringify(s);
  const ids = s.flatMap(x => [x.id, ...(x.with || []).map(w => w.id)]);
  for (const id of ['heroi-caminha', 'heroi-ajoelha', 'retirar-asas']) assert.ok(ids.includes(id), id);
  assert.match(texto, /Sete mundos/);
  assert.match(texto, /Pecado Capital/);
  assert.match(texto, /asas e a tua aura/);
  assert.match(texto, /quarto mundo/);
  assert.ok(s.filter(x => x.type === 'say').every(x => [SPEAKERS.god, 'heroi'].includes(x.who)));
  assert.ok(sceneDuration(s) > 20 && sceneDuration(s) < 45, 'ritmo do prólogo');
});

test('despertar (Mod 317): deitado olhando o céu, piscadas, levanta, Aethraziel já presente, nome nas falas, missão', () => {
  const s = awakeningScene();
  const ordem = s.map(x => x.id || x.type);
  assert.deepEqual(ordem.slice(0, 3), ['deitado', 'say', 'levantar']);
  assert.ok(s[0].with.some(w => w.id === 'piscar-despertar'), 'piscadas naturais no POV');
  assert.ok(!ordem.includes('anjo-chega') && !JSON.stringify(s).includes('anjo-aparece'), 'o anjo não brota: já estava lá');
  assert.ok(ordem.indexOf('nome') < ordem.indexOf('aceitar-missao'));
  assert.ok(ordem.indexOf('aceitar-missao') < ordem.indexOf('prologo-card'));
  const falas = s.filter(x => x.type === 'say').map(x => personalize(x, 'Davi'));
  assert.ok(falas.some(f => f.who === GUIDE_NAME && /Certo, Davi\./.test(f.text)));
  assert.ok(falas.every(f => f.text.length < 90), 'falas curtas e humanas');
  assert.ok(!/Paulo/.test(JSON.stringify(s)), 'sem nome fixo');
  const ws = wingsScene(), w = ws.map(x => x.id || x.type), fold = ws.findIndex(x => (x.with || []).some(q => q.id === 'anjo-recolhe-asas'));
  assert.ok(fold >= 0 && fold < w.indexOf('carroca-ouvida'), 'asas recolhidas antes de ouvir a carroça');
});

test('cena completa roda do começo ao fim com respostas automáticas', async () => {
  const { d, log } = run(awakeningScene(), { autoResume: true });
  d.play('despertar', awakeningScene());
  for (let k = 0; k < 400 && d.running; k++) { d.update(.1); d.tap(); await Promise.resolve(); }
  assert.equal(d.running, false);
  assert.equal(log.at(-1), 'end:fim');
  assert.ok(log.includes('do:prologo-card') && log.includes('do:levantar'));
});
