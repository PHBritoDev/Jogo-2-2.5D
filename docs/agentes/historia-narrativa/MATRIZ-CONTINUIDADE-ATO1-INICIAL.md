# A5 — Auditoria inicial de continuidade do Ato I

**Natureza:** auditoria estática, sem mudança jogável. O PDF canônico foi localizado no repositório, mas **não foi lido integralmente nesta rodada**; portanto nenhuma nova fala, escolha ou fato canônico é autorizado por este documento.

## Matriz preliminar (fonte: act1-flow.js)

| Etapa | Evento e objetivo existente | Estado relevante | Teste pendente |
| --- | --- | --- | --- |
| 0 | Conversar com o Anjo-Guia | questStep | Retomar após cutscene pulada |
| 1 | Vila, vendedor e informação sobre Ganância | act1Sub, coins | Sem moedas; não duplicar pagamento |
| 2 | Floresta noturna e Seguidores | journeyEnemyIndex | Morte/reload no combate |
| 3 | Chave, gaiola, crianças possuídas | childrenFreed, act1Sub | Reentrada após transformação |
| 4 | Massacre, mapa, esgotos, buraco | questStep, act1Sub | Preservar área protegida de Claude (#518) |
| 5 | Guardião do Portal | wardenTaunted, wardenDefeated | Morte e checkpoint |
| 6–7 | Portal e VHAZRAEL | portalOpened, portalRewardClaimed | Recompensa única; retorno da dimensão |
| 8 | Vitória e encerramento do Ato I | bishopsDefeated, vhazraelRewardClaimed | Save e transição Ato II |

**Constatações do código:** ACT1.version=6, ACT1.rev=2; migrateProgress() migra saves antigos e pode reiniciar subetapas; questPresentation() expõe objetivos de 0–8; migrateBishopOneName() preserva progresso do nome anterior. Nomes de vila/vendedor constam como provisórios no documento histórico M2-ATO1, não devem ser canonizados silenciosamente.

**Próximo incremento:** confrontar integralmente o PDF canônico com os gatilhos reais do runtime, selecionar uma falha comprovada na continuidade da vila e corrigir em PR mínima com teste de save/reload, sem alterar a caverna. Separar fatos, hipóteses e propostas. Aplicar princípios de agência, curiosidade e vínculo como critérios de design, sem presumir resultados psicológicos.

**Limites:** não foram executados testes Node, navegador, Android, screenshots, vídeo ou medição FPS/heap. Coordenadas e gatilhos do mundo principal ainda não foram auditados. Este documento não comprova qualidade jogável ou ausência de softlocks.
