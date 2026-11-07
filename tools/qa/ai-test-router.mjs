#!/usr/bin/env node
// Planejador de QA: usa apenas arquivos tocados no PR; não altera o jogo.
import {readFileSync,writeFileSync} from 'node:fs';
const root='artifacts/ai-coordinator/';
const data=JSON.parse(readFileSync(root+'report.json','utf8'));
const touched=data.files.map(x=>x.file);
const matches=(re)=>touched.some(f=>re.test(f));
const plans=[
 {id:'bootstrap', title:'Inicialização e imports 3D', when:/^(index\.html|mundo-3d-prototype\.(js|html)|mod181-loader\.js|.*loader.*\.js)$/, commands:['node --test enemy1-integration.test.mjs','node --input-type=module --check < mundo-3d-prototype.js'],evidence:'Laboratório visual → smoke de carregamento WebGL',critical:true},
 {id:'ato1',title:'Campanha, mundo e Eldória',when:/(act1-flow|prologue-flow|cutscenes3d|world3d-terrain|eldoria|forest|cave|village|terrain)/i,commands:['node --test act1-flow.test.mjs'],evidence:'Comparar capturas reais de cidade, floresta, rios e caverna; Android físico para FPS',critical:true},
 {id:'boss3',title:'Bispo 3 — Hidra, chamas e ultimate',when:/(zarkhael|hydra|blackflame|six-seals)/i,commands:['node --test zarkhael-hydra.test.mjs zarkhael-blackflame.test.mjs zarkhael-six-seals-ultimate.test.mjs'],evidence:'Laboratório visual — fases da Hidra e Chamas, vídeo e estado de conjuração',critical:false},
 {id:'boss2',title:'Bispo 2 — combate e efeitos',when:/(vorgazhek|eclipse-sakuga)/i,commands:['node --test vorgazhek-eclipse-sword.test.mjs vorgazhek-eclipse-sakuga.test.mjs'],evidence:'Evidência WebGL de VFX e contato das lâminas',critical:false},
 {id:'boss4',title:'Bispo 4 — cinematográfica lunar',when:/(veraxion|lunar|cinematic)/i,commands:['node --test tools/visual-lab/cinematic-criteria.test.cjs tools/visual-lab/cinematic-visual.test.cjs'],evidence:'Vídeo da ultimate em retrato e paisagem (workflow cinematica)',critical:false},
 {id:'enemy',title:'Inimigos, rigs e animações',when:/(enemy[1-4]|squad|rig3d|animation|\.glb$)/i,commands:[],evidence:'Abrir modelo real e conferir animações, colisões, grounding e captura 360°',critical:false},
 {id:'mobile',title:'Câmera, HUD e performance',when:/(camera|input|hud|ui|quality|render|vfx|\.glb$|\.ktx2$)/i,commands:[],evidence:'Conferir controles retrato/paisagem e FPS real em Android; SwiftShader não serve como benchmark',critical:false},
 {id:'security',title:'Segurança, sessão e deploy',when:/(auth|security|secret|session|login|\.github\/workflows|deploy|permissions)/i,commands:[],evidence:'Revisão especializada da segurança e permissões; conferir nenhuma credencial no diff',critical:true}
];
const selection=plans.filter(p=>matches(p.when));
const commands=[...new Set(selection.flatMap(x=>x.commands))];
const output={
 version:1,base:data.base,head:data.head,
 selected:selection.map(({id,title,commands,evidence,critical})=>({id,title,commands,evidence,critical})),
 commands,untested:['webgl-real','android-fisico','avaliacao-artistica'],
 warning:'Plano sugerido com base em nomes de arquivos: NAO executa estes testes e NAO comprova sucesso.'
};
writeFileSync(root+'test-plan.json',JSON.stringify(output,null,2)+'\n');

const handoff=[
 '# Passagem de trabalho para a próxima IA',
 '',
 '> Estado do código nesta análise, NÃO é um plano aprovado nem substitui o último pedido do criador.',
 '',
 '- Commit analisado: \`'+data.head+'\`',
 '- Base da comparação: \`'+data.base+'\`',
 '- Arquivos alterados: '+touched.length,
 '- Áreas identificadas: '+(selection.map(x=>x.title).join('; ')||'nenhuma área especializada'),
 '',
 '## Antes de escrever código',
 '1. Ler \`AGENTS.md\`, \`docs/GUIA-PARA-IAS.md\` e \`ARQUITETURA.md\` na branch atual.',
 '2. Confirmar o último pedido do criador, branch atual e PRs abertos; não assumir que esta captura permanece atual.',
 '3. Revisar \`overlaps.json\` (se existir): coincidência de arquivo requer coordenação, nunca sobrescrever outro trabalho.',
 '4. Trabalhar em branch própria; não modificar segurança nem Ato 1 se a tarefa não for dessas áreas.',
 '5. Rodar verificações aplicáveis e inspecionar vídeo/prints dos laboratórios existentes; não alegar testes que não executou.',
 '6. Abrir PR pequeno e reversível. Não fazer merge sem validação.',
 '',
 '## Arquivos alterados nesta revisão',
 ...(touched.length?touched.map(x=>'- \`'+x.replaceAll('\\`','')+'\`'):['- Nenhum arquivo alterado']),
 '',
 '## Verificações sugeridas (não executadas aqui)',
 ...(commands.length?commands.map(x=>'- \`'+x+'\`'):['- Conferir testes pertinentes à mudança e evidência WebGL quando necessário']),
 ...selection.map(x=>'- Evidência '+x.title+': '+x.evidence),
 '',
 '## Referências',
 '- Laboratório de QA: \`tools/visual-lab/README.md\`',
 '- Guia das IAs: \`docs/GUIA-PARA-IAS.md\`',
 '- Artefatos desta análise: \`report.md\`, \`report.json\`, \`test-plan.json\`, \`overlaps.json\` (quando disponível)',
 '',
 '## Pendências não verificadas',
 '- Conflitos de linha/semântica entre PRs; desempenho e toque em Android físico; qualidade artística.',
 '- Estado e conclusão dos outros PRs após este commit. Verificar GitHub novamente.',
 ''
];
writeFileSync(root+'HANDOFF.md',handoff.join('\\n')+'\\n');

const md=['','## Plano de validação direcionado','',
 'O coordenador **não executou os testes abaixo**; consulte os checks e artifacts da PR. Não confunda plano com aprovação.',
 ...selection.flatMap(p=>['',`### ${p.title}`,...p.commands.map(x=>'- Comando sugerido: `'+x+'`'),'- Evidência necessária: '+p.evidence]),
 ...(selection.length?[]:['','Nenhuma regra de área especializada; validar lint/sintaxe, testes afetados e integração no jogo.']),
 '','### Evidências ainda não comprovadas por este relatório',
 '- WebGL real / capturas e vídeos de jogo em execução',
 '- FPS e controles no Android físico',
 '- Fidelidade artística às referências fornecidas pelo criador',
 ''];
writeFileSync(root+'report.md',readFileSync(root+'report.md','utf8')+md.join('\n'));
console.log('QA por área:',selection.map(x=>x.id).join(', ')||'geral');
