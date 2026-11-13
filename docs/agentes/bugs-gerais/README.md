# Registro geral de bugs — A Batalha Contra os 7 Pecados Capitais

Atualização inicial: 2026-11-13 (BRT). Responsável: auditoria geral. **Este documento é uma recuperação histórica**, não certificação de que os defeitos persistem na main atual.

## Protocolo
- Escopo: mundo, câmera, controles fora de combate, NPCs, água, vegetação, caverna, missões, interface, carregamento e desempenho. **Combate pertence a outra auditoria**.
- Estados: **relatado** (conversa/relatório anterior); **indício estático** (código); **reproduzido** (execução e evidência); **corrigido validado** (commit + teste + evidência visual); **bloqueado** (arquivo de outra IA).
- Antes de modificar: comparar main e PRs, verificar proprietário dos arquivos, criar branch isolada, reproduzir, testar PC/mobile, examinar fotos/vídeos e logs. Sem merge/auto-merge sem aprovação expressa.
- Não inferir FPS Android de SwiftShader/Chromium. Não remover efeitos nem introduzir substitutos genéricos.
- Relatos históricos abaixo foram extraídos das auditorias anteriores disponíveis nesta conversa. Números de linhas são **referências históricas sujeitas a deslocamento**.

## Inventário recuperado

| ID | Área / arquivo (referência histórica) | Gravidade | Evidência e reprodução / causa provável | Estado e próximo teste |
|---|---|---|---|---|
| BG-001 | Caverna: `ascension-cave3d.js` ~24–45 | Alta | Indício de divergência entre `caveFloorVisual()` e piso usado por `caveCamSolid()`; relato de ficar suspenso sobre abismo. Causa não demonstrada. | Indício estático; reproduzir queda, câmera e colisão com vídeo. PRs #463–466 concorrentes: bloqueado. |
| BG-002 | Caverna/câmera/tochas: `ascension-cave3d.js`, `mundo-3d-prototype.js`, `eldoria-city-dressing.js` | Alta | PRs #463–466 documentam clamp do terreno externo aplicado na caverna e tochas procedurais indesejadas. Algumas primeiras capturas registraram tela preta e chamas remanescentes; não confundir commits de PR com correção validada. | PRs concorrentes abertos; sem merge. Reavaliar branch principal e evidências finais antes de escolher abordagem. |
| BG-003 | Controle DASH: `tools/visual-lab/dash-button-real.cjs` ~15–27 | Média | Teste anterior verificava cooldown, mas não deslocamento/direção real. Run #43239470964 relatou sucesso PC/mobile e artefatos, porém sem validação visual das capturas nesta recuperação. | Lacuna de QA; testar posição, direção, colisão e cooldown no WebGL. Combate excluído, mas controle de locomoção é escopo. |
| BG-004 | Missões: `sidequests3d.js` ~50–55 | Média | Indício de `createSideState()` não aceitar status `available` apesar de `refreshSide()` usá-lo. Possível restauração incorreta. | Indício estático; teste com save `available` e UI real; verificar se já foi corrigido. |
| BG-005 | Missões: `sidequests3d.js` ~69 | Baixa/média | Indício de progresso salvo limitado apenas a mínimo zero, sem teto da missão. | Indício estático; testar save adulterado e recompensas; não duplicar BG-004. |
| BG-006 | Fauna: `eldoria-birds3d.js` ~76–85 | Baixa | Indício de novos bandos bloqueados à noite, mas bandos existentes atualizados; podem persistir após anoitecer. | Indício estático; vídeo de transição dia/noite antes de classificar como bug artístico. |
| BG-007 | Prólogo: `prologue-road-flow.js` ~21 | Média | Configuração histórica de 4 bandidos vs briefing de 5. PR #481 foi relatado com cinco; conferir main/PR antes de qualquer ação. | Histórico potencialmente resolvido; arquivo de narrativa protegido. |
| BG-008 | Agente prólogo: `tools/visual-lab/prologue-mod317-evidence.cjs` ~74 | Alta para QA | Run #43302660957 relatado como falho: escrita em objeto nulo (`maxMeleeObserved`), 70 testes passando e 47 arquivos de evidência. Nenhuma fotografia aqui certificada. | Falha de instrumentação relatada; PR #481 de outra IA, não alterar. |
| BG-009 | Vila/desempenho | Alta | Run #43302660957 relatou p95 733,3 ms/quadro em viewport mobile SwiftShader; **não é medição de Android físico**. | Indício de gargalo; coletar perfil e vídeo real sem baixar qualidade. |
| BG-010 | Galáxias: `galaxies-three-scene.js` ~558 | Média | Comentário de limite 30 FPS e intervalo 16,7 ms (~60 FPS) em PR #483, conforme auditoria anterior. | Divergência estática histórica; verificar se já foi corrigida e medir custo, não impor 30 FPS sem análise. |
| BG-011 | Galáxias: `galaxies-three-scene.js` ~739–745 | Média | Possível `MutationObserver rmo` não desconectado em `stop()`; risco de observador remanescente. | Indício estático; repetir entrada/saída e observar recursos; conferir PR #483. |
| BG-012 | Controles: `mundo-3d-prototype.js` ~1897–1900; `pc-input-focus.test.mjs` | Média | Teste estático não simula perda de foco com joystick/defesa pressionados. | Lacuna de QA, não bug de movimento confirmado; reproduzir no browser mobile. |
| BG-013 | Árvores ancestrais | Baixa/média | PR #459 propõe afundar raízes (0,055→0,075) sem validação visual. | Não mesclar sem verificar contato, plataformas e colisões. |
| BG-014 | Cidade/água/vegetação | Alta | Relatos anteriores de paredes invisíveis, água rasa bloqueando caminhada, travadas de 0,3–0,5 s e quedas de FPS, objetos sem lógica e câmera com giro pesado. | Relatos do jogador, causas não confirmadas. Separar por localização e reproduzir com vídeo e logs. |

## Correções e integrações anteriores: não presumir validação
- PR #484 foi relatado como integrado à main no histórico; verificar commit e diff antes de atribuir correção.
- PRs #463, #464, #465 e #466 propõem variantes conflitantes para câmera/tochas; **não representam quatro correções concluídas**.
- PR #473 (história Eldória), #468 (HUD/salto), #459 (raízes), #452 (prévia de NPC), #436 (dimensão), #422 (terreno) estavam abertos na consulta de 2026-11-13; status pode mudar.
- PRs #481 e #483 foram mencionados em relatórios anteriores, mas seu estado atual requer confirmação específica.
- Não há correção nova validada por esta auditoria inicial; nenhum commit de correção de jogo é reivindicado.

## Evidências históricas / links
- DASH run: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43239470964
- Prólogo run falho relatado: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43302660957
- Artefato prólogo: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43302660957/artifacts/13982878285
- Menu galáxias run: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43323385571
- PRs de câmera/tochas: https://github.com/PHBritoDev/Jogo-2-2.5D/pulls?q=is%3Apr+is%3Aopen

## Próximas prioridades
1. Confirmar status atual de PRs #481/#483 e arquivos sob trabalho paralelo; inspecionar runs e artefatos antes de tocar em código.
2. Reproduzir BG-014 (travadas e colisões no mundo) com agente WebGL, capturas e vídeo, isolando área e linha.
3. Reproduzir BG-001/002 na caverna em branch de QA sem interferir nos PRs concorrentes.
4. Testar BG-004/005 em salvamento e BG-012 em perda de foco.
5. Documentar cada nova execução aqui: data, main SHA, PRs ativos, bug/linha, passos, evidência, testes, decisão, commit/PR, próximo alvo.

## Auditoria inicial desta branch
- Consulta GitHub: acesso ao repositório confirmado; PRs abertos #473, #468, #466, #465, #464, #463, #459, #452, #436 e #422 retornados na busca.
- `docs/agentes/bugs-gerais/README.md` não existia no momento da consulta (404).
- Nesta etapa **não foram executados novos testes WebGL nem inspecionadas novas fotografias**. Nenhum bug marcado como corrigido/validado.

## Atualização verificada após criação do registro (2026-11-13)
- **PR #481: fechado e mesclado**, conforme consulta direta de metadados GitHub. Seu texto declara testes e evidências, mas não foram inspecionadas as fotos nesta rodada. BG-007/008 devem ser reavaliados na main atual; não marcar como validados somente pelo merge.
- **PR #483: fechado e mesclado**, merge commit `f4962886842d8d6bce8b101bbd18f97ae641f348`. O texto do PR cita run #43345721240 como QA aprovado em Chromium/SwiftShader, sem prova de FPS Android real. BG-010/011 agora precisam ser verificados na main (não em PR aberto).
- **BG-004 e BG-005 confirmados estaticamente na main consultada**: `sidequests3d.js` em `createSideState()` aceita somente `active`, `ready`, `done` e normaliza progresso apenas com `Math.max(0, ...)`; `refreshSide()` utiliza `available`. Reprodução em save/UI e verificação de fluxo ainda pendentes. Sem correção nesta rodada.
- Não houve merge realizado pelo auditor. Os merges #481/#483 já existiam quando seus metadados foram consultados.

## Rodada seguinte — auditoria de fauna (13/11/2026 BRT)
- **PRs ativos consultados antes de qualquer alteração**: #490 (áudio), #489 (arte ambiental), #488 (iluminação), #487 (VFX), #486 (combate), #485 (esta documentação), além dos PRs legados. Não tocar nos arquivos de outras especialidades; nenhum merge.
- **BG-006 rechecado na main** em `eldoria-birds3d.js`, função `update()` (~linhas 76–92): o limiar `daylight > .45` controla somente a criação de bandos. Bandos já ativos continuam se movendo até `f.life` e `onCall(... * daylight)` reduz o som com a luz. Isso **não prova defeito**: pode ser transição natural deliberada. Classificação mantida como observação estética/hipótese, não bug reproduzido.
- **Evidência**: leitura do arquivo na main, SHA de blob `d46fcaf3031c81c00ae06be225c85672930dd1a3`. Sem screenshots/vídeos novos nem testes WebGL nesta rodada. Nenhuma alteração de gameplay.
- **Próxima prioridade**: capturar a passagem dia→noite com o agente e confirmar duração dos bandos; se for intencional, encerrar BG-006. Priorizar também reprodução de BG-004/005 e colisões BG-014. Não modificar `eldoria-birds3d.js` enquanto arte ambiental (#489) estiver em andamento.

## Rodada posterior — auditoria do mapa / qualidade do agente (2026-11-13)
- PRs abertos consultados antes da escrita: #490 áudio, #489 arte ambiental, #488 iluminação, #487 VFX, #486 combate, #485 auditoria, #473 narrativa (além de outros antigos). Nenhum arquivo desses agentes foi modificado.
- **BG-015 — lacuna de teste de mapa, severidade média (QA)**: em `tools/visual-lab/map-poi-audit.cjs`, o evento `pageerror` alimenta `errors`, mas `ok` só considera unicidade/descoberta/restauração dos POIs; o resultado final passa mesmo que `errors` não esteja vazio. Além disso, uma screenshot é gerada sem comparação visual. Reprodução lógica por leitura do código, sem execução WebGL nesta rodada. **Não equivale a defeito visual confirmado no mapa**. Teste necessário: injetar exceção JavaScript após o carregamento e demonstrar que o script deveria falhar; depois adicionar gate para erros inesperados, com lista de exceções justificadas se necessário.
- Evidência de código: https://github.com/PHBritoDev/Jogo-2-2.5D/blob/main/tools/visual-lab/map-poi-audit.cjs . Próxima prioridade: executar o agente de mapa e avaliar as fotos e logs reais, antes de corrigir o próprio teste em branch isolada.
- Sem novos testes, fotos examinadas, correção de gameplay ou merge nesta rodada. Este commit atualiza apenas o registro de auditoria no PR #485.

## Auditoria seguinte — BG-015 (2026-11-13)
- **Confirmado por leitura da main:** `tools/visual-lab/map-poi-audit.cjs`, linha final `if(results.some(r=>!r.ok))`, não considera `results[].errors`, apesar de registrar `pageerror` em cada viewport. Assim, o agente pode produzir `PASS` com erro JavaScript, desde que as asserções de POIs passem. Gravidade: média (falso positivo de QA), sem evidência de defeito no mapa em si.
- **Reprodução determinística proposta:** injetar `pageerror` controlado durante o teste, confirmar que a versão atual retorna exit 0; corrigir a condição para incluir `errors.length`, reexecutar teste positivo/negativo, verificar screenshot desktop/mobile e `report.json`.
- **Concorrência:** busca de PRs abertos retornou #486–490 e #473, #468, entre outros. Não foi encontrada evidência suficiente de exclusividade sobre o script para alterá-lo sem executar os testes.
- **Ação nesta execução:** somente documentação nesta branch isolada; sem teste WebGL novo, sem PR adicional e sem merge. Não afirmar correção validada.
- **Próxima prioridade:** BG-015 teste negativo controlado; em seguida BG-004 (save de missão) e BG-014 (travamentos/colisões reais).

## Nova rodada — persistência do mapa (2026-11-13)
- **Antes da escrita:** consulta de PRs abertos retornou #490, #489, #488, #487, #486, #485 e PRs legados; nenhum arquivo de outros agentes alterado.
- **BG-016 — possível exceção ao carregar salvamento de mapa malformado (média, robustez)**: `map3d.js`, `createMapState(saved)` (~linhas 61–72), faz `for (const id of saved.pois || [])` e `for (const raw of saved.waystones || [])`. Se `saved.pois` ou `saved.waystones` forem valores truthy não iteráveis (ex.: objeto `{}`), ocorre `TypeError` em vez de ignorar os dados inválidos. A causa é falta de `Array.isArray` antes da iteração. **Indício estático**, não demonstrado em sessão WebGL nem confirmado que o fluxo real aceita salvamentos corrompidos. Reprodução proposta: chamar `createMapState({pois:{},waystones:[]})` e depois `createMapState({pois:[],waystones:{}})`; verificar falha e comportamento após proteção. Não modificar sem teste de regressão e checagem de proprietário do arquivo.
- **BG-015 rechecado:** `tools/visual-lab/map-poi-audit.cjs` ainda aprova com `if(results.some(r=>!r.ok))` sem considerar `errors`, conforme leitura direta da main. Não repetido como novo achado.
- Evidências: https://github.com/PHBritoDev/Jogo-2-2.5D/blob/main/map3d.js e https://github.com/PHBritoDev/Jogo-2-2.5D/blob/main/tools/visual-lab/map-poi-audit.cjs . Nenhuma nova captura/vídeo WebGL ou teste automatizado executado; nenhuma correção ou merge.
- **Próxima prioridade:** teste negativo de BG-016 e BG-015 em ambiente isolado, depois QA WebGL de persistência de mapa desktop/mobile. Não reduzir qualidade nem mexer em código de cenário.

## Rodada 2026-11-13 — verificação de persistência do mapa
- PRs ativos consultados antes de qualquer escrita: #490 áudio, #489 arte ambiental, #488 iluminação, #487 VFX e demais resultados da busca. Arquivos de outros agentes preservados.
- BG-016 permanece no código da `main`: `map3d.js`, `createMapState()`, aproximadamente linhas 52–68; `for (const id of saved.pois || [])` e `for (const raw of saved.waystones || [])` assumem iteráveis. Valores não iteráveis e truthy, como `{}`, produzem `TypeError`. A causa está no contrato de entrada não validado. Esta é confirmação estática, não reprodução WebGL.
- Nenhuma correção aplicada ao jogo, teste automatizado disparado ou captura WebGL examinada nesta rodada. Próximo passo: executar teste negativo real para ambos os campos, depois teste de round-trip de save e QA de mapa em navegador desktop/mobile. Não mesclar sem autorização.
