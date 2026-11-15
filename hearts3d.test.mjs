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
