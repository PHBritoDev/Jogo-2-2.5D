import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./mundo-3d-prototype.js',import.meta.url),'utf8');
test('foco interrompido limpa teclas, joystick, velocidade e defesa',()=>{
  const reset = src.match(/function resetInterruptedControls\(\)\{([^}]+)\}/)?.[1] || '';
  assert.match(reset,/Object\.keys\(keys\)/);
  assert.match(reset,/keys\[key\]=false/);
  assert.match(reset,/endJoy\(\)/);
  assert.match(reset,/moveVX=moveVZ=0/);
  assert.match(reset,/setDefending\(false\)/);
  assert.match(src,/addEventListener\('blur',resetInterruptedControls\)/);
  assert.match(src,/document\.addEventListener\('visibilitychange',\(\)=>\{if\(document\.hidden\)resetInterruptedControls\(\);\}\)/);
  assert.match(src,/stick\.addEventListener\('lostpointercapture',endJoy\)/);
});
