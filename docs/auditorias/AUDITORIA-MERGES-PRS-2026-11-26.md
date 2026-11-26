# Auditoria de merges, PRs abertas e prompts temporários — 26/11/2026

Registro permanente da FASE 2 da missão "loading cinematográfico + auditoria de merges" (26/11/2026). A FASE 1 foi integrada antes pela PR #716 (Mod 374).

## Método
- **Base auditada**: main em `0fc704ec` (após #716 e #710).
- **Escopo**: os 40 commits de primeiro pai mais recentes da main, de 22/11 a 26/11, cobrindo os Mods 354 a 374, mais todas as PRs abertas.
- **Evidência usada**:
  - suíte Node completa (`node --test tests/*.test.mjs *.test.mjs`, com three.js real via `COMBAT_THREE_DIR`): **1403/1403** na main do Mod 374;
  - checks de CI dos HEADs integrados;
  - workflow `Combate cinematográfico (Mod 315)` nos pushes da main;
  - diffs e ancestralidade com `git`.
- **Inspeção visual nova**: só na FASE 1. Os outros sistemas não foram re-filmados nesta auditoria; nesses casos a decisão se apoia nos testes e nas evidências registradas nas próprias PRs.
- **Ambiente**: Chromium/SwiftShader. Não há medição de FPS em Android físico.

## Regressão comprovada e corrigida
| Origem | Sintoma | Correção |
|---|---|---|
| `282b93d6` / #715 (loading do Mod 373) | O workflow `Combate cinematográfico (Mod 315)` ficou **vermelho na main** de `282b93d6` até `64ac20ea`. Causa: o teste `tests/carregamento-modulos.test.mjs` exigia o literal `id = 'load-retry'`, que o loader refatorado não tinha mais; o retry continuava funcionando (`getElementById('load-retry')` + `location.reload()`). | Correção para frente em #716: o teste passou a verificar o retry real. Não houve revert: o loader do Mod 373 era bom e foi preservado e ampliado no Mod 374. |

Nenhuma outra regressão foi reproduzida: a suíte inteira passa na main atual e nenhum teste foi pulado.

## Merges auditados (main, primeiro pai)
| Commit | Data | Arq. | Origem / objetivo | Decisão | Evidência / motivo |
|---|---|---:|---|---|---|
| `0f70c11d` | 2026-11-26 | 1 | Build Mod 373 | SUBSTITUÍDO | superado pelo Mod 374 (#716); número/cache seguem a fonte única build-info.js |
| `282b93d6` | 2026-11-26 | 2 | Loading do planeta restaurado (#715) | MELHORAR | progresso real preservado e ampliado no Mod 374; o teste `carregamento-modulos` ficou vermelho na main (regex `id = 'load-retry'`) — corrigido em #716 sem mudar o loader |
| `8a35b0e2` | 2026-11-26 | 1 | Briefing de restauração do loading | REMOVER (prompt executado) | missão concluída no Mod 373 e substituída pelo Mod 374; arquivo temporário removido nesta auditoria |
| `ba2cb22e` | 2026-11-26 | 27 | #708 integração Mod 372 (A1/A2/A3/A5 via #707 + #704) | MANTER | CI 31/31 verde no HEAD; suíte Node completa verde na main atual |
| `067094ac` | 2026-11-25 | 1 | Docs da missão silenciosa | MANTER | arquivo da missão já removido em #708 |
| `8549a9c4` | 2026-11-25 | 1 | Docs da missão silenciosa | MANTER | idem |
| `5ce0c99c` | 2026-11-25 | 21 | #706 trilhas/cipós, água adaptativa, acertos da espada (Mod 370) | MANTER | testes a3/a4/a2 verdes; A4 continua refinando na #711 (separada) |
| `3aab0c84` | 2026-11-25 | 5 | #705 ADM mobile e pausa dos inimigos (Mod 369) | MANTER | testes de ADM/pausa verdes |
| `9449f5e6` | 2026-11-25 | 19 | #701 jogabilidade Mod 367 | MANTER | suíte verde; sem regressão reproduzida |
| `2169f66b` | 2026-11-25 | 1 | #696 QA do reflexo | MANTER | ferramenta de QA usada por workflows ativos |
| `5713d1e0` | 2026-11-25 | 7 | #695 lava Mod 366 | MANTER | testes de lava/vulcão verdes |
| `4b487606` | 2026-11-25 | 7 | #694 cache do vulcão | MANTER | pré-carga versionada coberta por `carregamento-modulos` |
| `2dad5486` | 2026-11-25 | 3 | #693 espada Mod 364 | MANTER | combat315 verde |
| `ebfd3961` | 2026-11-25 | 4 | #688 densidade da floresta | MANTER | forest-stutter verde no CI da #708 |
| `a61c3fe9` | 2026-11-25 | 8 | #686 replay de Eldória | MANTER | testes de replay verdes |
| `c25cee3e` | 2026-11-25 | 2 | #687 pacote do protagonista | MANTER | GLB do protagonista usado também pela miniatura do Mod 374 |
| `1b280bc0` | 2026-11-24 | 72 | #682 integração geral Mod 361 (72 arquivos) | MANTER | base de todas as integrações seguintes; reverter quebraria dependências |
| `cda924d5` | 2026-11-24 | 3 | #681 A2 cortes com direção travada | MANTER | combat315 verde |
| `e5416581` | 2026-11-24 | 2 | #680 A4 ruído do capuz de Zar'khael | MANTER | teste de reutilização verde |
| `30355fa4` | 2026-11-24 | 1 | Missão Codex de integração geral | INVESTIGAR | prompt de outro agente; não removido sem confirmação do dono |
| `99a717df` | 2026-11-24 | 1 | Mod 360 retry do save do mapa | MANTER | map-save-retry verde |
| `6011db2d` | 2026-11-24 | 4 | A3 retry do save | MANTER | idem |
| `6cb8d43e` | 2026-11-24 | 1 | Build Mod 359 | SUBSTITUÍDO | build marker posterior |
| `78037796` | 2026-11-24 | 4 | #677 A4 reflexo rasante do VORGAZHEK | MANTER | sem luz extra; teste verde |
| `579e070b` | 2026-11-24 | 2 | #678 A2 menos probes de colisão | MANTER | combat315 verde |
| `ae910f64` | 2026-11-24 | 1 | Build Mod 358 | SUBSTITUÍDO | build marker posterior |
| `43a29680` | 2026-11-24 | 7 | A4 iluminação local de Zar'khael | MANTER | teste verde |
| `0a7fe642` | 2026-11-24 | 1 | Build Mod 357 | SUBSTITUÍDO | build marker posterior |
| `4060bf91` | 2026-11-24 | 13 | A2 impacto multialvo e colisão das lâminas | MANTER | a2-basic-blade-multitarget verde |
| `59d6b23c` | 2026-11-24 | 1 | Build Mod 356 | SUBSTITUÍDO | build marker posterior |
| `377d217c` | 2026-11-24 | 5 | A3 recuperação da fauna | MANTER | fauna-retry verde |
| `1e17b612` | 2026-11-23 | 1 | Docs Codex Ato III | MANTER | referência da #665 ativa |
| `769d101d` | 2026-11-23 | 1 | Build Mod 355 | SUBSTITUÍDO | build marker posterior |
| `89d1135f` | 2026-11-23 | 7 | #668 A4 silhuetas na arena do VORGAZHEK | MANTER | teste verde |
| `59068b22` | 2026-11-23 | 4 | #667 A1 captura em keydown duplicado | MANTER | agent-qa.test verde |
| `236943b5` | 2026-11-23 | 1 | Build Mod 354 | SUBSTITUÍDO | build marker posterior |
| `5cd33dd4` | 2026-11-23 | 6 | #655 A3 transição da grade do terreno | MANTER | testes de terreno verdes |
| `3a60b58e` | 2026-11-23 | 12 | #666 explosão violeta da Ganância | MANTER | greed-ultimate testes verdes |
| `f232693e` | 2026-11-23 | 19 | #662 Juízo da Usura | MANTER | idem |
| `7a89f832` | 2026-11-22 | 1 | #664 docs Ato III | MANTER | autorização do criador para a #665 |

Legenda: **MANTER** = melhoria válida em uso; **MELHORAR** = mantido e completado depois; **SUBSTITUÍDO** = marcador de build superado (a fonte única é `build-info.js`, sem código morto); **INVESTIGAR** = sem evidência para mexer; **REMOVER** = prompt temporário já executado.

## PRs abertas (estado em 26/11, ~12:40 UTC)
| PR | Autor/branch | Estado | Decisão | Motivo |
|---|---|---|---|---|
| #716 | Claude · loading Mod 374 | — | **INTEGRADA** | FASE 1; 11/11 checks verdes no HEAD `fb368bb0`. |
| #710 | A1 · captura contínua da floresta | READY, 2 arquivos | **INTEGRADA** | Só workflow e teste estático: acrescenta `workflow_dispatch` manual (`pr=0`), gatilhos de terreno/cipós/movimento e nome de artifact consistente. Na main nova: `agent-qa.test.cjs` 13/13 e YAML válido; checks do HEAD verdes. Não muda gameplay. |
| #714 | A1 · câmera nos pilares do abrigo | Draft, ativa hoje | PRESERVAR | Trabalho em andamento do agente. |
| #712 | A2 · Passagem do Julgamento | Draft, ativa hoje | PRESERVAR | Idem. |
| #711 | A4 · aurora no perfil baixo + A/B | Draft, ativa hoje | PRESERVAR | Idem; os gates A/B do próprio agente estão em aberto. |
| #709 | A3 · cipós e sub-bosque (Mod 372) | Draft, ativa hoje | PRESERVAR | Idem. |
| #691 | A5 · HUD/câmera de Téo + proposta narrativa | Draft | PRESERVAR | Narrativa NÃO canônica depende do criador; a parte de HUD já entrou pela #707/#708. |
| #665 | Codex · Ato III (Sakura/Invernália) | Draft, centenas de commits | PRESERVAR | Implementação em andamento e não mergeable. |
| #515 | Claude · plano da caverna (só docs) | Draft | PRESERVAR | Plano; a caverna está reservada a outro trabalho. |
| #468, #392, #216, #118, #37, #10 | antigas (out–nov) | READY, divergentes | PRESERVAR (E) | Base muito anterior à main atual (Mods 3xx/1xx). Sem evidência de que ainda faltem; integrar exigiria refazer contra a main. Não presumidas abandonadas. |
| #466, #465, #464, #463, #459, #436, #422, #420, #417, #411, #403, #400, #295, #115, #452 | antigas | Draft ou QA/diagnóstico | PRESERVAR (E) | Ferramentas de QA temporárias, diagnósticos, briefs para outro agente ou implementações incompletas: não são melhorias de produção. |

Nenhuma PR foi fechada e nenhuma branch foi apagada ou reescrita.

## Prompts temporários
| Arquivo | Ação | Motivo |
|---|---|---|
| `docs/briefings-temporarios/CLAUDE-MISSAO-GANANCIA-COMPLETA-20261122.md` | **removido** | Missão executada (PR #654); registro permanente em `docs/combate/MISSAO-GANANCIA-COMPLETA-2026-11-22.md`. |
| `docs/MISSAO-RESTAURAR-LOADING-PLANETA-2026-11-26.md` | **removido** | Executada no Mod 373 (#715) e substituída pelo Mod 374; registro em `docs/loading/LOADING-CINEMATICO-MOD374.md` e nesta auditoria. |
| `docs/briefings-temporarios/CLAUDE-MISSAO-LOADING-CINEMATICO-E-AUDITORIA-MERGES-2026-11-26.md` | **removido** (último commit desta entrega) | Esta missão; o resultado está neste documento e no registro da FASE 1. |
| `docs/briefings-temporarios/CODEX-ATO3-JORNADA-SAKURA-NEVE-CASTELO-20261122.md` | mantido | Associado à #665, ativa. |
| `docs/briefings-temporarios/CODEX-ULTIMATE-GANANCIA-ATOMIC-20261122.md` | mantido | Prompt do Codex sem registro de conclusão encontrado; o dono decide. |
| `CODEX_TEMP_GANANCIA_CRIATURA_REFERENCIA_QA_MERGES_20261121.md` | mantido | Prompt do Codex/A6; não há prova de conclusão. |
| `CLAUDE_EXECUTAR_ELDORIA_E_APAGAR_AO_FINAL.md` | mantido | Ordem de 07/11 sem registro de conclusão localizado; o arquivo ainda pede para ser apagado só ao final. |
| `PROMPT_MESTRE_DO_JOGO.md`, `docs/combate/MISSAO-*.md`, `docs/missoes/*`, `docs/renascimento/*` | mantidos | Documentação permanente, contrato ou registro de resultado. |

## Integrações desta rodada
- #716: Mod 374, loading cinematográfico (FASE 1).
- #710: workflow A1 de captura contínua, sem Mod novo (não toca o jogo).
- Esta PR: só documentação e limpeza, sem Mod novo.
