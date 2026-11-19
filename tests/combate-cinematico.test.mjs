/** Missão combate cinematográfico + carregamento: dash visível/aproximação, contra-ataque, alvo do chefe e lock-on opcional. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTA_DASH, dashApproach, protaSegments } from '../prota-combat3d.js';
import { MOBILITY } from '../combat-mobility3d.js';

const m = fs.readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');

test('dash: o MESMO dash (recarga, i-frames, distância livre) com pose visível do slide_right e levantada do mesmo clipe', () => {
  assert.equal(PROTA_DASH.cooldown, MOBILITY.dashCooldown); assert.equal(PROTA_DASH.distance, 5.4); assert.equal(PROTA_DASH.iframes, .30);
  const seg = Object.fromEntries(protaSegments().map(s => [s.id, s]));
  assert.ok(seg.Prota302_dash.vertical && seg.Prota302_dash.clip === 'slide_right' && seg.Prota302_rise.clip === 'slide_right');
  assert.ok(seg.Prota302_rise.start > seg.Prota302_dash.end, 'levanta com o fim do deslize (sem pose de salto)');
  assert.equal((m.match(/function protaDashStart\(/g) || []).length, 1, 'sem segundo dash');
  assert.equal((m.match(/heroMob\.dash\(combatClock\)/g) || []).length, 1, 'mesma recarga/callback');
  assert.ok(/playOnce\('Prota302_dash',\.04\)/.test(m) && /heroShadows\?\.emit\(\);\}/.test(m), 'corpo visível com silhuetas no caminho');
});
test('dash de aproximação: vai ao inimigo à frente e para na distância de golpe; para o lado ou sem alvo, 5,4 m livres', () => {
  const t = { id: 'b', x: 0, z: 7, alive: true, radius: .8 };
  const a = dashApproach({ x: 0, z: 0 }, { x: .2, z: .98 }, [t]);
  assert.equal(a.target, t); assert.ok(Math.abs(a.dist - (7 - .8 - PROTA_DASH.approach.stop)) < 1e-9); assert.ok(Math.abs(a.dir.z - 1) < 1e-9);
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 1, z: 0 }, [t]).dist, PROTA_DASH.distance, 'dash lateral não é puxado');
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [{ ...t, z: 20 }]).target, null, 'longe demais');
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [t], { blocked: () => true }).target, null, 'parede no meio');
  assert.equal(dashApproach({ x: 0, z: 0 }, { x: 0, z: 1 }, [{ ...t, z: 1.6 }]).dist, PROTA_DASH.approach.min, 'colado: passo curto, nunca para dentro');
});
test('esquiva perfeita → contra-ataque: golpe absorvido pelos i-frames do dash abre a janela; o próximo golpe sai mais forte', () => {
  assert.ok(/if\(now<playerInvulnerableUntil\)\{protaPerfectDodge\(\);return false;\}/.test(m));
  assert.ok(/prota302\.counterUntil=prota302\.clock\+PROTA_DASH\.counter\.window/.test(m) && /\(counter\?PROTA_DASH\.counter\.damage:1\)/.test(m));
  assert.ok(/if\(!newHero\|\|prota302\.dodged\|\|/.test(m), 'uma vez por dash');
});
test('chefes/esquadrão: o golpe resolve o alvo travado pelo id do ator (antes a aproximação nunca rodava e a espada cortava o vento)', () => {
  assert.ok(/if\(a\.lockId!=null&&\(!target\|\|target\.id!==a\.lockId\)\)\{const c=protaCandidates\(\)\.find\(x=>x\.id===a\.lockId\);if\(c\)target=c;\}/.test(m));
});
test('lock-on opcional: tocar no inimigo trava/solta (celular), R ou botão do meio (PC); câmera enquadra os dois', () => {
  assert.ok(/function tapLock\(x,y\)/.test(m) && /e\.timeStamp-tap\.t<320\)tapLock/.test(m));
  assert.ok(/e\.code==='KeyR'&&!e\.repeat/.test(m) && /e\.button===1\)\{e\.preventDefault\(\);toggleLockOn\(\);\}/.test(m));
  assert.ok(/else if\(lockOnActive&&foeOn\)\{[^}]*k=Math\.min\(\.35,4\/fd\)/.test(m) && /lockOnActive&&cameraDistance>=1\.05\?Math\.min\(3\.2/.test(m));
  assert.ok(!/id="aim"/.test(fs.readFileSync(new URL('../mundo-3d-prototype.html', import.meta.url), 'utf8')), 'sem botão MIRAR de volta');
});
