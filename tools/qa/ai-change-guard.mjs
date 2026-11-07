#!/usr/bin/env node
/**
 * Agente de coordenação (somente leitura): analisa arquivos alterados num PR.
 * Não modifica o jogo, não faz merge, não executa ações de outras IAs.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const base=process.argv[2];
if(!base || !/^[a-f0-9]{40}$/.test(base)){
  console.error('Uso: node tools/qa/ai-change-guard.mjs <SHA-base-40-chars>');
  process.exit(2);
}
let raw;
try {
  raw=execFileSync('git',['diff','--name-only','--diff-filter=ACDMRT',base,'HEAD'],{encoding:'utf8',maxBuffer:5_000_000});
} catch(error) {
  console.error('Não foi possível calcular diff; confirmar checkout completo e SHA base.',error.message);
  process.exit(2);
}
const files=[...new Set(raw.split('\n').map(x=>x.trim()).filter(Boolean))].sort();
const rules=[
  {id:'seguranca',pattern:/(^|\/)(?:auth|security|secrets?|login|session|permissions?)(?:[.\/-]|$)|(?:^|\/)\.github\/workflows\//i,level:'alto',tests:'Revisar permissões, tokens, deploy e autenticação; nenhuma chave em diff.'},
  {id:'ato1',pattern:/(^|\/)(?:act1-flow|prologue-flow|cutscenes3d|world3d-terrain|eldoria)[\w.-]*\.(?:js|mjs|css|html)$/i,level:'alto',tests:'Validar fluxo do Ato 1 e capturas da floresta/cidade/caverna.'},
  {id:'entrada',pattern:/(^|\/)(?:index\.html|mundo-3d-prototype\.(?:js|html)|mod181-loader\.js)$/i,level:'alto',tests:'Conferir inicialização, cache/Mod, URLs, WebGL e navegação no Android.'},
  {id:'render',pattern:/(?:vfx|render|camera|shader|three|combat-rig|dimensions3d)/i,level:'medio',tests:'Revisar screenshots/vídeo, recursos WebGL, memória e desempenho mobile.'},
  {id:'modelos',pattern:/\.(?:glb|gltf|bin|ktx2|png|webp|jpg|mp4)$/i,level:'medio',tests:'Checar tamanho, importação, rig/escala/clipes e carregamento real.'},
  {id:'testes',pattern:/(^|\/)(?:test|tests|tools\/qa|tools\/visual-lab)\//i,level:'baixo',tests:'Rodar testes específicos; não aceitar êxito sem evidência.'}
];
const classified=files.map(file=>{
 const hits=rules.filter(x=>x.pattern.test(file));
 return {file,areas:hits.map(x=>x.id),risk:hits.some(x=>x.level==='alto')?'alto':hits.some(x=>x.level==='medio')?'medio':'baixo'};
});
const counts={alto:0,medio:0,baixo:0};
classified.forEach(x=>counts[x.risk]++);
const areas=[...new Set(classified.flatMap(x=>x.areas))];
const checks=[...new Set(rules.filter(x=>areas.includes(x.id)).map(x=>x.tests))];
if(!checks.length)checks.push('Executar validações relevantes para os arquivos do PR.');
const suspicious=files.filter(f=>/(^|\/)(?:\.env(?:\.|$)|id_rsa|private[-_.]?key|credentials?\.(?:json|txt)|.*\.(?:pem|p12|pfx))$/i.test(f));
const out={base,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:classified,counts,areas,checks,suspiciousPaths:suspicious,advisoryOnly:true};
const lines=[
 '# Coordenador de IAs — parecer consultivo',
 '',
 '> Esta verificação NÃO joga, NÃO testa FPS real e NÃO autoriza merge. Cada IA mantém sua branch e PR.',
 '',
 `**Arquivos alterados:** ${files.length} · **Alto risco:** ${counts.alto} · **Médio:** ${counts.medio} · **Baixo:** ${counts.baixo}`,
 '',
 '## Áreas impactadas',
 areas.length?areas.map(x=>'- '+x).join('\n'):'- Nenhuma regra especial identificada',
 '',
 '## Verificações recomendadas',
 ...checks.map(x=>'- '+x),
 '',
 '## Arquivos alterados',
 ...classified.map(x=>`- [${x.risk}] \`${x.file.replaceAll('\\`','')}\` (${x.areas.join(', ')||'geral'})`),
 ...(suspicious.length?['','**ATENÇÃO:** possíveis arquivos de credenciais no diff; inspecione antes do merge.']:[]),
 '',
 '## Limites',
 '- Risco baseado somente em nomes de arquivos, não prova bug nem vazamento.',
 '- Conflitos entre PRs requerem verificar a seção de sobreposição do workflow.',
 '- Conferir testes e artifacts do PR; revisão humana permanece necessária.'
];
mkdirSync('artifacts/ai-coordinator',{recursive:true});
writeFileSync('artifacts/ai-coordinator/report.json',JSON.stringify(out,null,2)+'\n');
writeFileSync('artifacts/ai-coordinator/report.md',lines.join('\n')+'\n');
console.log(lines.join('\n'));
