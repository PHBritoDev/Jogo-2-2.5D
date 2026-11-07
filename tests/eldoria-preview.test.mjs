import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ELDORIA_ASSETS,ELDORIA_ZONES,assetsForStage} from '../eldoria-asset-plan.js';
const html=readFileSync(new URL('../eldoria-cenario-preview.html',import.meta.url),'utf8');
const details=readFileSync(new URL('../eldoria-scene-details.js',import.meta.url),'utf8');
const manifest=readFileSync(new URL('../eldoria-asset-plan.js',import.meta.url),'utf8');
const lighting=readFileSync(new URL('../eldoria-light-water.js',import.meta.url),'utf8');
const art=readFileSync(new URL('../eldoria-environment-art.js',import.meta.url),'utf8');
const canopy=readFileSync(new URL('../eldoria-forest-canopy.js',import.meta.url),'utf8');
test('prévia isolada mantém o jogo principal e os personagens fora',()=>{
  assert.match(html,/import \{buildEldoriaDetails\}/);
  for(const zone of Object.keys(ELDORIA_ZONES)) assert.match(html,new RegExp('data-place="'+zone+'"'));
  for(const source of [html,manifest]) assert.doesNotMatch(source,/Demonio1\.glb|Protagonista\.glb|Bispo1\.0\.glb|Enemy2\.glb/);
});
test('14 modelos de cenário listados e presentes',()=>{
  assert.equal(ELDORIA_ASSETS.length,14);
  assert.equal(new Set(ELDORIA_ASSETS.map(a=>a.file)).size,ELDORIA_ASSETS.length);
  const required=['ArvoreAncestralEldoria.glb','ArvoreFloresta01.glb','BarracaFrutasEldoria.glb',
    'CasaEldoria01.glb','CasaEldoria02.glb','EntradaCavernaAto1.glb','FerreiroEldoria.glb',
    'JaulaRitualAto1.glb','MontanhaEldoria01.glb','PassarelaSuspensaEldoria.glb',
    'PocoEldoria.glb','RochedoMusgoEldoria.glb'];
  for(const file of required) assert.ok(ELDORIA_ASSETS.some(a=>a.file===file),'model missing: '+file);
  for(const asset of ELDORIA_ASSETS){
    assert.ok(existsSync(new URL('../'+asset.file,import.meta.url)),'missing file '+asset.file);
    assert.ok(asset.placements.length>0);
    for(const p of asset.placements)for(const k of ['x','z','size','rotation'])assert.ok(Number.isFinite(p[k]));
  }
});
test('carregamento da cena principal não inclui caverna e ritual',()=>{
  assert.equal(assetsForStage('core').length,11);
  assert.equal(assetsForStage('ritual').length,1);
  assert.equal(assetsForStage('caverna').length,2);
  assert.match(html,/loadStage\('core'\)/);
  assert.match(html,/if\(name==='ritual'\|\|name==='caverna'\)loadStage\(name\)/);
});
test('sintaxe dos scripts da prévia e dos módulos ambientais',()=>{
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script?.length>3000);
  for(const [name,source] of [['preview',script],['details',details],['manifest',manifest],['lighting',lighting],['art',art],['canopy',canopy]]){
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(result.status,0,name+': '+result.stderr);
  }
});
test('indicadores FPS, falha de GLBs e árvore com instancing',()=>{
  assert.match(html,/renderer\.info\.render\.calls/);
  assert.match(html,/Falhas de modelos:/);
  assert.match(html,/readyStats/);
  assert.match(html,/new THREE\.InstancedMesh/);
  assert.match(html,/normalized\.clone\(true\)/);
  assert.match(details,/new THREE\.InstancedMesh/);
  assert.match(details,/streamDistance\(x,z\)/);
  assert.match(details,/roadDistance\(x,z\)/);
  assert.match(details,/village<18/);
});

test('sombras focadas no sol e água animada na GPU com qualidade mobile',()=>{
  assert.match(html,/lighting=createEldoriaLighting/);
  assert.match(html,/water=createEldoriaWater/);
  assert.match(html,/water\.update\(now\*\.001,night\)/);
  assert.match(html,/terrainMesh\.receiveShadow=true/);
  assert.match(html,/lighting\.focus\(/);
  assert.match(lighting,/renderer\.shadowMap\.enabled=true/);
  assert.match(lighting,/THREE\.PCFSoftShadowMap/);
  assert.match(lighting,/sun\.castShadow=true/);
  assert.match(lighting,/renderer\.shadowMap\.autoUpdate=false/);
  assert.match(lighting,/lowSpec\?1024:2048/);
  assert.match(lighting,/new THREE\.DataTexture/);
  assert.match(lighting,/new THREE\.MeshPhysicalMaterial/);
  assert.match(lighting,/new THREE\.MeshStandardMaterial/);
  assert.match(lighting,/waveExpression/);
  assert.match(lighting,/transformed\.z \+=/);
  assert.match(lighting,/transformed\.y \+=/);
  assert.doesNotMatch(lighting,/WebGLRenderTarget|Reflector\(/);
});

test('cenografia da vila e bosque segue referências com instancing e centro visual',()=>{
 assert.match(html,/buildEldoriaArt\(THREE,scene/);
 assert.match(art,/fountain/);
 assert.match(art,/fencePosts/);
 assert.match(art,/new THREE\.InstancedMesh/);
 assert.match(art,/CatmullRomCurve3/);
 assert.match(art,/QuadraticBezierCurve3/);
 assert.doesNotMatch(art,/Protagonista|Demonio1|Bispo/);
});

test('árvores de apoio recebem canopy irregular com cores por vértice',()=>{
 assert.match(html,/createEldoriaCanopy\(THREE\)/);
 assert.match(canopy,/IcosahedronGeometry/);
 assert.match(canopy,/positions\.setXYZ/);
 assert.match(canopy,/computeVertexNormals/);
 assert.match(html,/vertexColors:true/);
});

test('lago utiliza margem orgânica e trilha verde de plantas aquáticas',()=>{
 assert.match(art,/foamPositions/);
 assert.match(art,/shoreRocks/);
 assert.match(art,/lilyPads/);
 assert.match(art,/pondSdf/);
});

test('árvores GLB não nascem dentro da lâmina do lago',()=>{
 const forest=ELDORIA_ASSETS.find(a=>a.file==='ArvoreFloresta01.glb');
 assert.ok(forest?.placements?.length>=8);
 for(const p of forest.placements){
  const lakeDistance=Math.hypot((p.x+42)/15,(p.z-24)/11);
  assert.ok(lakeDistance>=1.25,'GLB no lago: '+p.x+','+p.z);
 }
});
