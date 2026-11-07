import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out=path.resolve(process.env.RELEASE_OUT||'dist-public');
test('release contains a working static entrypoint and world',()=>{
  for(const n of ['index.html','mundo-3d-prototype.html','mundo-3d-prototype.js','.nojekyll','COPYRIGHT.txt','release-manifest.json']) {
    assert.ok(fs.existsSync(path.join(out,n)),n+' missing');
  }
  const index=fs.readFileSync(path.join(out,'index.html'),'utf8');
  assert.match(index,/mundo-3d-prototype\.html/);
});
test('release excludes non-browser source, hidden files, scripts and development documents',()=>{
  const names=fs.readdirSync(out);
  for(const n of names) {
    assert.ok(!/^\.(?:git|github)/.test(n),n);
    assert.ok(!/\.(?:md|mjs|cjs|py|pdf|blend|map|pem|key|log)$/i.test(n),n);
    assert.ok(!/^(AGENTS|PROMPT_MESTRE|ARQUITETURA|CLAUDE_|tools|docs|tests)/.test(n),n);
    assert.equal(fs.statSync(path.join(out,n)).isDirectory(),false,n+' nested directory');
  }
  assert.ok(names.some(n=>n.toLowerCase().endsWith('.glb')),'expected runtime 3D models');
});
test('release SHA-256 manifest matches every distributed content file',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'release-manifest.json'),'utf8'));
  assert.equal(manifest.schema,1);
  assert.equal(manifest.buildKind,'browser-distribution');
  const listed=Object.keys(manifest.files).sort();
  const expected=fs.readdirSync(out).filter(n=>n!=='.nojekyll'&&n!=='release-manifest.json').sort();
  assert.deepEqual(listed,expected,'missing or extra artifact files');
  for(const n of listed) {
    const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,n))).digest('hex');
    assert.equal(manifest.files[n],digest,'hash mismatch for '+n);
  }
});

test('source-transforming game loader is never minified or corrupted',()=>{
  for(const name of ['mundo-3d-prototype.js','mod181-loader.js']){
    const source=fs.readFileSync(path.resolve(name));
    const release=fs.readFileSync(path.join(out,name));
    assert.deepEqual(release,source,`${name} must preserve loader rewrites`);
  }
  const loader=fs.readFileSync(path.join(out,'mod181-loader.js'),'utf8');
  assert.match(loader,/code\.replace\(/);
  assert.match(loader,/mundo-3d-prototype\.js/);
});

test('browser-side local JavaScript module imports exist in the distribution',()=>{
  const files=fs.readdirSync(out).filter(x=>x.endsWith('.js'));
  for(const file of files){
    const code=fs.readFileSync(path.join(out,file),'utf8');
    // Static ES module imports and literal dynamic imports only. Other
    // runtime-generated URLs cannot be resolved by static analysis.
    const re=/\b(?:from\s*|import\s*\(\s*|import\s*)['"]\.\/([^'"?#]+\.js)(?:\?[^'"]*)?['"]/g;
    let m;
    while((m=re.exec(code))){
      assert.ok(fs.existsSync(path.join(out,m[1])),`${file} refers to missing runtime module ${m[1]}`);
    }
  }
});
