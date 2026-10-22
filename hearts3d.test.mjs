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
