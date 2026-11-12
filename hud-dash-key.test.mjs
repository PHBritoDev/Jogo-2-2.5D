import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
const css=readFileSync(new URL('./hud3d.css',import.meta.url),'utf8');
const game=readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
test('atalho visível do DASH corresponde à tecla realmente programada',()=>{
 assert.match(game,/e\.code==='KeyF'\)\{action\('dash'\)/);
 assert.match(css,/#actions #dash \.btn-label::after\{content:" · F"\}/);
});
