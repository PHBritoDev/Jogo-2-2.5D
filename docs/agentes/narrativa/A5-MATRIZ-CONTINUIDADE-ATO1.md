# A5 — Matriz inicial de continuidade do Ato I (auditoria estática)

**Escopo:** inspeção de `act1-flow.js`, `cutscenes3d.js`, `docs/roteiro/M2-ATO1.md`, `ARQUITETURA.md` e `docs/MARCO-0-AUDITORIA-GALAXIA-1.md` na main. **Não é validação jogável.** Antes de implementar qualquer diálogo, evento ou consequência, confrontar integralmente `docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf` (fonte canônica), além dos gatilhos no controlador 3D, coordenadas e save. O PDF não foi lido integralmente nesta rodada; nenhuma proposta abaixo altera o cânone.

| Sequência | Fato documentado / dados | Gatilho e estado a conferir no runtime | Dependências e teste pendente |
|---|---|---|---|
| Prólogo → vila | `questStep=0→1`; nome do jogador, despertar e guia | `awakeningSeen`, `playerName`, disparo de `villageArrivalScene()` | A5/A1: início novo, save e retomada, skip de cena, UI mobile |
| Vila e vendedor | `questStep=1`, subetapa 0→1; suborno de 5 moedas documentado | `coins`, compra, recusa, cena e objetivo no HUD | A5/A1: sem moedas, compra repetida, reload durante conversa |
| Floresta noturna | `questStep=2`; 1+2 seguidores | `journeyEnemyIndex`, progresso após morte/reload | A2/A1: combate e checkpoint sem softlock |
| Gaiola | `questStep=3`; chave, duas crianças transformadas | `childrenFreed`, `act1Sub` e eventos da gaiola | A5/A1: transformação sem duplicação após skip/reload |
| Caminho aos esgotos | `questStep=4`, subetapas 0..3; 3 demônios, pista, 5 seguidores, buraco | coordenadas reais, mudança de área, mortes e respawn | A3/A1: verificar caminho real; **não editar caverna de Claude** |
| Guardião | `questStep=5`; `wardenHp=300` | `wardenTaunted`, `wardenDefeated` | A2/A1: vitória, derrota, persistência, diálogo final |
| Portal | `questStep=6→7`; VHAZRAEL | `portalOpened`, `portalRewardClaimed`, `vhazraelRewardClaimed` | A1: impedir recompensa duplicada e quebra ao reentrar |
| Encerramento | `questStep=8`; conversa com guia e transição | `bishopsDefeated`, cartão Ato II, save | A5/A1: retorno correto e progressão sem perda de inventário |

## Critérios de implementação futura

1. Um arco canônico por PR; cenas devem ter objetivo, conflito, mudança jogável e consequência persistente, sem criar retcon nem novos fatos sem aprovação.
2. Priorizar ações do jogador sobre diálogos longos; pistas ambientais e personagens devem usar espaços e NPCs existentes até A3 aceitar dependências.
3. Testar a equivalência entre cena concluída normalmente e cena pulada: `cutscenes3d.js` possui `flush(rest)`, mas sua integração e persistência precisam ser verificadas no runtime. **Hipótese de risco, não bug confirmado.**
4. Verificar `migrateProgress()` antes de acrescentar flags: versão atual do Ato I = 6, revisão = 2. Nunca perder saves antigos nem duplicar recompensas.
5. Para validar qualidade: captura real do jogo antes/depois, caminho percorrido, HUD/objetivo, estados de save e testes Android físico. Nenhum desses testes foi executado nesta auditoria.

## Estado e limites desta rodada

- Somente leitura estática e esta matriz documental; **nenhum código, gatilho, mapa, NPC, cena, save ou asset alterado**.
- Nenhum teste Node, navegador, Android, screenshot, vídeo ou medição de FPS realizado.
- Antes de trabalho de implementação: ler o PDF canônico integral, conferir os scripts e coordenadas do controlador atual, PRs de A5 e a central #519; manter isolamento de #518 (Claude).
- Fontes de pesquisa sobre narrativa interativa, agência e ritmo devem ser avaliadas em rodada de implementação; não há validação de eficácia psicológica nesta auditoria.
