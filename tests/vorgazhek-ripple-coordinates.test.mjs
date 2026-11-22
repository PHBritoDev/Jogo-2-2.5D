import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../vorgazhek-abyss-dimension3d.js',import.meta.url),'utf8');
test('foot ripple coordinates follow rotated water plane',()=>{
 assert.match(source,/floor\.rotation\.x=-Math\.PI\/2/);
 assert.match(source,/p=position\.xy/);
 assert.match(source,/uPlayer\.value\.set\(p\.x-spec\.x,-\(p\.z-spec\.z\)\)/);
});
