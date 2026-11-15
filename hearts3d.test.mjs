import test from 'node:test';
import assert from 'node:assert/strict';
import { HEARTS, normalizeHearts, tickHearts, loseHeart, msToNextHeart, canChallengeBishop, formatTimer } from './hearts3d.js';

test('começa cheio e perde um por queda diante de Bispo', () => {
  const s = normalizeHearts(null, 0);
  assert.equal(s.hearts, HEARTS.max);
  const a = loseHeart(s, 1000);
  assert.equal(a.hearts, HEARTS.max - 1);
  assert.equal(msToNextHeart(a, 1000), HEARTS.regenMs);
});

test('regenera um a cada três minutos, mesmo com o jogo fechado, sem passar do máximo', () => {
  let s = { hearts: 0, since: 0 };
  s = tickHearts(s, HEARTS.regenMs * 2 + 5);
  assert.equal(s.hearts, 2);
  assert.equal(msToNextHeart(s, HEARTS.regenMs * 2 + 5), HEARTS.regenMs - 5);
  assert.equal(tickHearts({ hearts: 9, since: 0 }, HEARTS.regenMs * 50).hearts, HEARTS.max);
});

test('sem coração não desafia Bispo; cronômetro legível', () => {
  assert.equal(canChallengeBishop({ hearts: 0 }), false);
  assert.equal(canChallengeBishop({ hearts: 1 }), true);
  assert.equal(formatTimer(151000), '2:31');
  assert.equal(normalizeHearts({ hearts: 'x' }, 0).hearts, HEARTS.max);
});

test('salvamento com timestamp futuro não bloqueia regeneração nem cria timer enorme', () => {
  const now = 1000000;
  const future = now + HEARTS.regenMs * 100;
  const loaded = normalizeHearts({ hearts: 3, since: future }, now);
  assert.equal(loaded.hearts, 3);
  assert.equal(loaded.since, now, 'um timestamp futuro deve ser reancorado ao relógio atual');
  assert.equal(msToNextHeart(loaded, now), HEARTS.regenMs);
  assert.equal(tickHearts(loaded, now + HEARTS.regenMs).hearts, 4);

  const live = tickHearts({ hearts: 3, since: future }, now);
  assert.equal(live.since, now, 'ajuste de relógio também durante sessão aberta');
  assert.equal(msToNextHeart({ hearts: 3, since: future }, now), HEARTS.regenMs);
});

test('save com data negativa não concede corações instantâneos', () => {
  const now = 1000000;
  const loaded = normalizeHearts({ hearts: 3, since: -5000000 }, now);
  assert.equal(loaded.hearts, 3, 'um save inválido não pode presentear horas de regeneração');
  assert.equal(loaded.since, now);
  assert.equal(msToNextHeart(loaded, now), HEARTS.regenMs);
});

test('cronômetro não exibe NaN para marca temporal inválida', () => {
  const now = 1000000;
  const state = { hearts: 4, since: Number.NaN };
  assert.equal(msToNextHeart(state, now), HEARTS.regenMs);
  const recovered = tickHearts(state, now);
  assert.equal(recovered.hearts, 4);
  assert.equal(recovered.since, now);
});

test('salvamento de corações vazio não deve virar zero por coerção JavaScript', () => {
  const now = 1000000;
  for (const hearts of [null, '', '  ']) {
    const state = normalizeHearts({ hearts, since: now }, now);
    assert.equal(state.hearts, HEARTS.max, 'valor vazio de save não equivale a 0 corações');
  }
  assert.equal(normalizeHearts({ hearts: '0', since: now }, now).hearts, 0,
    'zero explícito em save antigo continua válido');
});

test('regressão de 400 saves variados: corações, timer e timestamp sempre seguros', () => {
  const now = 1700000000000;
  const timestamps = [now - 3600000, now - 100000, now, now + 1000, now + 3600000, -5000, NaN, Infinity, null, ''];
  const values = [0, 1, 3, 7, 9, 10, 11, -2, null, '', '  ', '4', 'x', Infinity, NaN];
  for (let i = 0; i < 400; i++) {
    const raw = { hearts: values[i % values.length], since: timestamps[(i * 7) % timestamps.length] };
    const state = normalizeHearts(raw, now);
    assert.ok(Number.isInteger(state.hearts) && state.hearts >= 0 && state.hearts <= HEARTS.max,
      'corações devem permanecer inteiros no intervalo 0..10');
    assert.ok(Number.isFinite(state.since) && state.since >= 0 && state.since <= now,
      'timestamp deve permanecer em intervalo válido');
    const timer = msToNextHeart(state, now);
    assert.ok(Number.isFinite(timer) && timer >= 0 && timer <= HEARTS.regenMs,
      'cronômetro deve estar entre 0 e 3 minutos');
    const next = tickHearts(state, now + HEARTS.regenMs);
    assert.ok(next.hearts >= state.hearts && next.hearts <= HEARTS.max);
  }
});

test('fluxo realista de save/reload após relógio incorreto mantém o progresso', () => {
  const start = 1700000000000;
  const legacySave = JSON.stringify({ hearts: 2, since: start + 86400000, explained: true });
  let state = normalizeHearts(JSON.parse(legacySave), start);
  assert.equal(state.hearts, 2);
  assert.equal(state.since, start);
  state = tickHearts(state, start + 90000);
  assert.equal(state.hearts, 2, '90 segundos não bastam para ganhar 1 coração');
  const persisted = JSON.stringify(state);
  state = normalizeHearts(JSON.parse(persisted), start + 90000);
  assert.equal(state.hearts, 2);
  assert.equal(msToNextHeart(state, start + 90000), 90000);
  state = tickHearts(state, start + HEARTS.regenMs);
  assert.equal(state.hearts, 3);
  state = loseHeart(state, start + HEARTS.regenMs + 1000);
  assert.equal(state.hearts, 2);
  assert.equal(msToNextHeart(state, start + HEARTS.regenMs + 1000), HEARTS.regenMs - 1000);
});

test('tipos inválidos no save não zeram o contador de corações', () => {
  const now = 1700000000000;
  for (const hearts of [false, true, [], {}, '-Infinity']) {
    const state = normalizeHearts({ hearts, since: now }, now);
    assert.equal(state.hearts, HEARTS.max,
      'tipo corrompido não deve ser interpretado como vida perdida');
  }
  for (const hearts of [0, '0', 4, '4']) {
    assert.equal(normalizeHearts({ hearts, since: now }, now).hearts, Number(hearts));
  }
});


test('save com timestamp zero válido recupera corações ao reabrir', () => {
  const now = HEARTS.regenMs * 4;
  const state = normalizeHearts({ hearts: 2, since: 0 }, now);
  assert.equal(state.hearts, 6, 'quatro intervalos completos devem regenerar quatro corações');
  assert.equal(state.since, now);
  assert.equal(msToNextHeart(state, now), HEARTS.regenMs);
});

test('timestamp zero preservado em JSON e em save legado textual', () => {
  const now = HEARTS.regenMs * 2 + 30000;
  for (const since of [0, '0']) {
    const saved = JSON.parse(JSON.stringify({ hearts: 3, since, explained: true }));
    const state = normalizeHearts(saved, now);
    assert.equal(state.hearts, 5, 'dois intervalos completos devem regenerar');
    assert.equal(state.since, HEARTS.regenMs * 2, 'fração de 30 segundos permanece para a próxima regeneração');
    assert.equal(msToNextHeart(state, now), HEARTS.regenMs - 30000);
    const reopened = normalizeHearts(JSON.parse(JSON.stringify(state)), now + HEARTS.regenMs - 30000);
    assert.equal(reopened.hearts, 6, 'reabrir o save não deve perder a contagem parcial');
  }
});
