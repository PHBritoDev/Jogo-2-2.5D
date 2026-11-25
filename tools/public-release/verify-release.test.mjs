import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out=path.resolve(process.env.RELEASE_OUT||'dist-public');
function contentFiles(){
  return fs.readdirSync(out,{recursive:true}).filter(name=>fs.statSync(path.join(out,name)).isFile());
}
test('release contains a working static entrypoint and world',()=>{
  for(const n of ['index.html','mundo-3d-prototype.html','mundo-3d-prototype.js','.nojekyll','COPYRIGHT.txt','release-manifest.json']) {
    assert.ok(fs.existsSync(path.join(out,n)),n+' missing');
  }
  const index=fs.readFileSync(path.join(out,'index.html'),'utf8');
  assert.match(index,/mundo-3d-prototype\.html/);
});
test('release excludes non-browser source, hidden files, scripts and development documents',()=>{
  const names=contentFiles();
  for(const n of names) {
    assert.ok(!/^\.(?:git|github)/.test(n),n);
    assert.ok(!/\.(?:md|mjs|cjs|py|pdf|blend|map|pem|key|log)$/i.test(n),n);
    assert.ok(!/^(AGENTS|PROMPT_MESTRE|ARQUITETURA|CLAUDE_|tools|docs|tests)/.test(n),n);
    if(n.includes('/')){
      assert.match(n,/^(?:assets\/(?:ui\/menu|ganancia)\/|audio\/|experiments\/aerial-combat\/(?:world-protagonist|rig|controller|shadows)\.js$)/,n);
      assert.doesNotMatch(n,/(?:^|\/)\.|(?:^|\/)(?:tests?|qa|docs)\//i,n);
      assert.match(n,/\.(?:js|bin|glb|gltf|hdr|woff2|webp|mp3)$|^audio\/audio-manifest\.json$|^assets\/ui\/menu\/fonts\/OFL\.txt$/,n);
    }
  }
  assert.ok(names.some(n=>n.toLowerCase().endsWith('.glb')),'expected runtime 3D models');
});
test('release SHA-256 manifest matches every distributed content file',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'release-manifest.json'),'utf8'));
  assert.equal(manifest.schema,1);
  assert.equal(manifest.buildKind,'browser-distribution');
  const listed=Object.keys(manifest.files).sort();
  const expected=contentFiles().filter(n=>n!=='.nojekyll'&&n!=='release-manifest.json').sort();
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
  const files=contentFiles().filter(x=>x.endsWith('.js'));
  for(const file of files){
    const code=fs.readFileSync(path.join(out,file),'utf8');
    // Static ES module imports and literal dynamic imports only. Other
    // runtime-generated URLs cannot be resolved by static analysis.
    const re=/\b(?:from\s*|import\s*\(\s*|import\s*)['"](\.{1,2}\/[^'"?#]+\.js)(?:\?[^'"]*)?['"]/g;
    let m;
    while((m=re.exec(code))){
      assert.ok(fs.existsSync(path.join(out,path.dirname(file),m[1])),`${file} refers to missing runtime module ${m[1]}`);
    }
  }
});

test('release contains the menu art, model dependencies and playable audio without production notes',()=>{
  for(const name of ['assets/ui/menu/cinematic/environment.webp','assets/ui/menu/cinematic/worlds-hero.webp',
    'assets/ui/menu/fonts/cinzel-latin.woff2','assets/ui/menu/fonts/OFL.txt','assets/ganancia/xisto-fossil.webp']){
    assert.ok(fs.existsSync(path.join(out,name)),name);
  }
  const fort='assets/ui/menu/polyhaven/modular_fort_01/modular_fort_01.gltf';
  const model=JSON.parse(fs.readFileSync(path.join(out,fort)));
  for(const {uri} of [...model.images,...model.buffers])assert.ok(fs.existsSync(path.join(out,path.dirname(fort),uri)),uri);
  const audio=JSON.parse(fs.readFileSync(path.join(out,'audio/audio-manifest.json')));
  assert.deepEqual(Object.keys(audio).sort(),['assets','versao']);
  assert.ok(audio.assets.length>0);
  for(const track of audio.assets){
    assert.ok(track.evento && track.assetId && fs.existsSync(path.join(out,track.arquivo)),track.arquivo);
    assert.ok(!('prompt' in track) && !('custo_creditos_confirmado' in track));
  }
});
