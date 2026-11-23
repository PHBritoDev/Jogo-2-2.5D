# Estado do cânone — Galáxia 1

**Data da auditoria:** 23/11/2026  
**Base técnica:** main 1e17b61253db7bcc443820382f41597d53248f9a (Mod 355).  
**Estado:** auditoria documental e de runtime concluída; proposta mestre aguardando revisão do criador.  
**Autoridade:** este arquivo organiza fontes. Não aprova sozinho nenhuma alteração de história.

## 1. Hierarquia de fontes

1. **Roteiro integral original do criador (PDF de 21 páginas).** A cópia foi localizada na Biblioteca do projeto e lida página por página nesta auditoria. Ela continua sendo o registro histórico da intenção original. O caminho docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf citado por vários Markdown não existe na main consultada; não se deve afirmar que o link do repositório está funcional. A cópia da Biblioteca não foi alterada.
2. **Correções explícitas posteriores do criador.** Prevalecem sobre rótulos antigos do PDF quando forem inequívocas. Exemplo: o projeto usa VHAZRAEL; a anotação antiga “Valério” não deve ser reintroduzida.
3. **CANONE-MESTRE-GALAXIA-1-PROPOSTA.md.** É a proposta de reconstrução completa para revisão. **Não é cânone aprovado** até o criador aceitar as decisões.
4. **M1–M7 em docs/roteiro.** São transcrições, resumos e decisões de produção derivados do material original. Preservar como histórico e evidência de implementação; não tratar divergências entre eles e o PDF como resolvidas automaticamente.
5. **ato-1-eldoria-roteiro-v1.md.** É uma proposta narrativa de 06/11, explicitamente não implementada. Seus nomes, cenas e explicações não se tornam cânone por aparecerem no código.
6. **implementacao-pesquisa.md, mod291-matriz-fidelidade.md e documentos de Renascimento.** São registros técnicos de ambiente, NPCs, performance e implementação. Não são autoridade para decidir personagens, motivos ou acontecimentos.
7. **Runtime e PRs.** Comprovam o que o jogo faz hoje; não comprovam que o criador aprovou a história. Um teste que passa não canoniza um diálogo.

## 2. Contradições que ficam explícitas

| Tema | Fonte original / histórico | Runtime / proposta posterior | Tratamento nesta revisão |
|---|---|---|---|
| Nome do primeiro Bispo | A capa/anotação antiga menciona “Valério”; o corpo do roteiro não fixa consistentemente o nome | Código atual usa VHAZRAEL | Propor VHAZRAEL; “Valério” fica como rótulo histórico descartado, não como alias narrativo |
| Anjo-Guia | O original o chama de Anjo-Guia | v1 e prologue-flow usam Aethraziel (verdadeiro) e Vaelthar (público) | Manter “Anjo-Guia” até aprovação dos dois nomes |
| Teren, Ilyan, Osren | Não pertencem ao texto integral original | Acrescentados pelo roteiro v1 e/ou documentação de produção | Candidatos, não personagens canônicos |
| Varkhen, Drazek e Zarkun | Não pertencem ao texto integral original | Acrescentados no v1 | Não migrar para o roteiro aprovado sem revisão |
| Crianças na floresta | O original descreve jaulas, ritual e transformação em criaturas | v1 amplia a cena e a consequência | Preservar a gravidade do evento; revisar agência, clareza e tratamento sem apagar a versão antiga |
| Sandra | O original revela a pessoa misteriosa como Sandra, ex-5ª Bispo | Modelo e falas atuais implementam a revelação | Preservar a revelação; motivo, culpa e reparação precisam de arco contínuo |
| Quatro Bispos | Subordinados à Ganância; o 4º revela origem humana e passado ligado à Terra | VHAZRAEL, VORGAZHEK, ZAR'KHAEL e VÉRAXION no código | Preservar a hierarquia; não confundir quatro Bispos com quatro Pecados |
| Mundo 4 | Asas e aura retornam no quarto mundo/planeta | Ato IV da Galáxia 1 é a torre de VÉRAXION | São coisas diferentes: restauração no **quarto mundo**, não no Ato IV |
| Ato II | O texto antigo previa cidade/beco/bandidos e outros marcos | Mod 321 substituiu a antiga Cidade 2 por Cinzária e migra saves do passo 10 para a entrada do vulcão | Não reintroduzir o beco antigo sem redesenhar a rota |
| Ato III | Roteiro M4 descreve cidade de neve, armadilha, caverna e ZAR'KHAEL | PR #673 propõe Caminho das Pétalas/dojo e cidadela de Invernália | Preservar a geometria e o trabalho da #673; não inventar fatos de história para Sakura/Neve/Castelo nesta PR |
| Motor legado | acts34-flow.js contém outro encadeamento de atos | ARQUITETURA.md o identifica como motor antigo ignorado pelo fluxo atual | Não ressuscitar nem mesclar sua história sem decisão explícita |
| Final legado | finale-flow.js contém um epílogo antigo com Auren e um gauntlet alternativo | act6-flow.js substitui o arco final nos passos 27–30 | Não tratar Auren nem o gauntlet antigo como cânone atual |

## 3. Estado técnico que não deve ser confundido com aprovação

- Main consultada: Mod 355, SHA 1e17b61253db7bcc443820382f41597d53248f9a.
- Ato I: etapas 0–8; Ato II começa no passo 8/9 e termina no 14; Ato III usa 15–19; o Ato IV usa 21–24; Ato V usa 25; Ato VI usa 27–30. Há fronteiras/etapas legadas entre os marcos; não renumerar.
- O campo act1Sub é reutilizado como subetapa de vários atos. Não o reinterpretar sem migração.
- act2-flow.js migra saves antigos no passo 10 para a entrada do vulcão. O mapa usa seven-sins-3d-map-v4, aliases de POI/waystone e estado de névoa; não limpar esses dados durante uma revisão narrativa.
- eldoria-village-talk.js grava memória local em seven-sins-3d-village-talk. Conversas atuais de Bento, Téo e Lia são conteúdo de runtime, não aprovação de suas histórias.
- sidequests3d.js na main contém Flores de Vigília/Mara, Pingente de Lia e Pedras que Lembram/Nara. A PR #670 realinha givers para Bento/Téo/Lia e contém correções técnicas, mas continua draft e não aprova esses nomes ou diálogos como cânone.
- A captura A5 do SHA 4dd587d60f74b727955576a15ed18977d2a49318 (run #45275356791, artifact #14868522185) registrou 3/3 missões, 136 moedas e 105 XP após save/reload, sem erros de console/rede. O próprio relatório ainda aponta avisos de enquadramento: duas capturas com câmera não estabilizada e uma com protagonista fora do quadro. Portanto, não é validação visual perfeita nem prova narrativa.
- PR #673 está aberta e em trabalho de Ato III; PRs #672, #674, #675 e #656 também têm áreas reservadas. Esta proposta é documental e não altera arquivos de runtime desses agentes.

## 4. Regra de aprovação

Até o criador revisar a proposta:
- nenhuma nova fala, nome, morte, parentesco ou motivação proposta é cânone;
- não substituir M1–M7 nem apagar v1;
- não migrar saves nem alterar questStep;
- não mesclar a PR #670 por causa de seus testes;
- qualquer implementação posterior deve ser dividida em PRs pequenas, com cenas, saves e gameplay verificáveis.
