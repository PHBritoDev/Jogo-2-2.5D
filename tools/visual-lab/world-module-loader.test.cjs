"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
  fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
const loader=fs.readFileSync(path.join(root,"mod181-loader.js"),"utf8");
const world=fs.readFileSync(path.join(root,"mundo-3d-prototype.js"),"utf8");
const html=fs.readFileSync(path.join(root,"mundo-3d-prototype.html"),"utf8");
const replaceImports=(code,base,build)=>code.replace(
  /\b(from\s+|import\s+)(['"])\.\/([a-z0-9-]+\.js)(?:\?[^'"]*)?\2/gi,
  (_,prefix,q,file)=>prefix+q+new URL("./"+file+"?v="+build,base).href+q
);
test("Mod277 — modulo principal dentro de blob so tem imports HTTP absolutos apos reescrita",()=>{
 const build="mod277-smoke",base="https://example.org/Jogo-2-2.5D/";
 const result=replaceImports(world,base,build);
 const leftovers=[...result.matchAll(/\bfrom\s*['"]\.\/[^'"]+|import\s*['"]\.\/[^'"]+/g)];
 assert.deepEqual(leftovers.map(x=>x[0]),[],
   "imports relativos em blob impedem carregar o mundo inteiro");
 assert.ok(result.includes("https://example.org/Jogo-2-2.5D/vhazrael3d.js?v="+build));
 assert.ok(result.includes("https://example.org/Jogo-2-2.5D/vhazrael-feather-wings3d.js?v="+build));
 assert.ok(!world.includes("from './vhazrael3d.js?v="),
  "import versionado no topo reintroduz o crash do blob");
 assert.ok(!world.includes("from './vhazrael-feather-wings3d.js?v="));
 assert.ok(loader.includes("code = code.replace(/\\b(from") && loader.includes("(?:\\?"),
   "loader deve converter imports versionados antes de executar blob");
 // A pagina deve anunciar a versao atual; nao prender o teste a Mod 277.
 const marker=html.match(/id="marker" aria-label="Modificação (\d+)">(\d+)<\/div>/);
 assert.ok(marker && marker[1]===marker[2], "marcador e texto devem coincidir");
 const version=Number(marker[1]);
 assert.ok(version>=277,"nao aceitar regressao da versao publicada");
 assert.match(html,new RegExp("mod181-loader\\.js\\?v=mod"+version+"-"));
 assert.ok(loader.includes("const BUILD = 'mod"+version+"-"),"loader nao pode usar build antigo");
});
test("Mod277 — parser reescreve também imports versionados futuros e side-effect",()=>{
 const src=[
   'import {foo} from "./vhazrael3d.js?v=276";',
   "import {bar} from './powers3d.js';",
   "import './vhazrael3d.js?v=mod276';",
   "import '../mundo-3d.js';"
 ].join("\n");
 const result=replaceImports(src,"https://example.org/demo/","test");
 assert.equal((result.match(/https:\/\/example\.org\/demo\//g)||[]).length,3);
 assert.ok(result.includes("import '../mundo-3d.js'"),
   "sem reescrever caminho parent não suportado silenciosamente");
 assert.ok(!result.includes('from "./vhazrael3d.js?'));
});
