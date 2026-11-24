# Matriz de continuidade — campanha das sete galáxias (proposta A5)

> **STATUS: CANDIDATO 0.1 — NÃO É CANON APROVADO.** Matriz de auditoria e migração. Não aplicar flags novas nem alterar saves até o criador revisar o Cânone Mestre.

**Main auditada:** 1e17b61253db7bcc443820382f41597d53248f9a (23/11/2026).  
**Documento narrativo relacionado:** CANONE-MESTRE-7-MUNDOS-PROPOSTA.md.

## 1. Fontes e grau de autoridade

| Fonte | Conteúdo | Uso correto |
|---|---|---|
| docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf | Roteiro original de Galáxia 1, prólogo e Atos I–VI. | Fonte primária para fatos explicitamente descritos. |
| docs/MARCO-0-AUDITORIA-GALAXIA-1.md | Comparação histórica entre PDF e jogo. | Auditoria antiga; não substitui o PDF. |
| docs/roteiro/M1–M8 | Transcrição/revisão e execução dos atos. | Referência de implementação; conferir divergências. |
| docs/roteiro/M13–M14 | Revisão de Atos II–III e VHAZRAEL. | Evidência de decisões/pendências técnicas, não aprovação automática de todo o texto. |
| docs/narrativa/ato-1-eldoria-roteiro-v1.md | Alternativa com personagens/eventos adicionais. | Proposta histórica não aprovada; preservar. |
| docs/eldoria/implementacao-pesquisa.md | Pesquisa e notas de implementação. | Material de trabalho; não chamar v1 de fonte de verdade. |
| act1-flow.js–act6-flow.js e prologue-flow.js | Diálogos, etapas e transições atuais. | Estado implementado, não canon por si só. |
| galaxies3d.js | Menu das sete galáxias. | UI atual; contém contradição de nomenclatura (Avareza/Preguiça). |
| #665/#673 e briefing Codex Ato III | Jornada Sakura/Neve/Castelo. | Trabalho de outro agente; não editar nem incorporar fatos sem revisão. |

## 2. Arquitetura de save encontrada

| Armazenamento | Campos/uso observados | Risco para a revisão |
|---|---|---|
| sevenSins3DCampaignV6 | Objeto principal; version 6, act1Rev 2, questStep, act1Sub, coins, playerName, awakeningSeen, actCardSeen, XP, inventário, bestiário, conquistas e flags de chefes. | Não renomear/remover campos sem migração idempotente. |
| seven-sins-3d-side | Estado separado das missões opcionais: ervas, pingente, abrigos; state/progress. | IDs e vendedores atuais são provisórios. |
| seven-sins-3d-map-v4 | POIs e array waystones. | IDs de abrigos precisam permanecer estáveis ou ser migrados. |
| seven-sins-3d-prologo-ceu | Flag de cena do prólogo. | Skip/reload deve evitar repetir a retirada de asas. |
| seven-sins-3d-guide-wings | Estado de asas do guia. | Não confundir com asas do protagonista, recuperadas no mundo 4. |
| seven-sins-3d-clock | Relógio/ambiente. | Não é progresso narrativo. |
| seven-sins-3d-graphics | Qualidade gráfica. | Fora do canon; preservar. |
| Save da tela de galáxias | galaxies3d.js recebe objeto com unlocked e celebrate. | Chave física do armazenamento ainda precisa ser localizada no runtime grande; não inventar. |

### Campos de campanha observados

- Identidade e início: version, act1Rev, playerName, awakeningSeen, actCardSeen.
- Progressão: questStep, act1Sub, journeyEnemyIndex, mountainIndex, bishopsDefeated.
- Ato I: captorsTaunted, childrenFreed, wardenTaunted, wardenDefeated, portalOpened, portalRewardClaimed, vhazraelRewardClaimed.
- Ato II: vorgazhekRewardClaimed.
- Ato III: coatOwned, coatOn, zarkhaelClaimed.
- Ato IV: scrollOwned, veraxionClaimed.
- Ato V/VI e legado: owned, sword, lateFound, lateFoundStep, lateFightIndex, lateBossClaimed, gauntletIndex, finaleClaimed; nomes/uso exato precisam de conferência no runtime antes de migrar.
- Progressão complementar: xp, stats, achievementsClaimed, bestiary, bestiaryRewarded, shopVisited, playSeconds, ledgersFound.
- Missões opcionais: state locked/available/active/ready/done, progress e recompensa única. A PR #670 corrige restauração de available, teto de progresso e escopo local de waystones; não altera o conteúdo narrativo.

## 3. Mapa atual de etapas

| Ato | questStep | Subetapas atuais | Evento principal | Campos/flags observados | Próximo checkpoint |
|---|---:|---|---|---|---|
| Prólogo | 0 | cenas do céu/despertar | missão, remoção de asas/aura, nome do jogador | awakeningSeen, playerName, actCardSeen; flags de prólogo separadas | chegada à vila |
| I — Eldória | 1–8 | act1Sub; 1 tem 0–1, 3 tem 0–2, 4 tem 0–3 | vila, floresta, gaiolas, esgotos, guardião, VHAZRAEL | journeyEnemyIndex, mountainIndex, captorsTaunted, childrenFreed, wardenTaunted/Defeated, portalOpened/RewardClaimed, bishopsDefeated, vhazraelRewardClaimed | Ato II começa em 8/9 |
| II — Cinzária | 9–14 | act1Sub reutilizado como act2Sub | viagem, cidade, guardas, vulcão, laboratório, VORGAZHEK | vorgazhekRewardClaimed, bishopsDefeated; migrateAct2Step move antigo passo 10 para 11 | cidade de neve |
| III — Invernália | 15–19; passo 20 não usado no mapa atual | act1Sub reutilizado | estrada/casaco, cidade, estalagem/armadilha, incêndio, caverna de gelo, ZAR'KHAEL, verdade do Anjo | coatOwned, coatOn, zarkhaelClaimed, bishopsDefeated | Ganância leva o Anjo; Ato IV começa em 21 |
| IV — Torre | 21–24 | act1Sub = piso 1–7 e subetapas da estrada | torre de sete pisos, pergaminho, VÉRAXION, queda, pessoa misteriosa | scrollOwned, veraxionClaimed, bishopsDefeated | Coliseu |
| V — Coliseu | 25–26 | act1Sub = jornada/chegada/round | oito rounds, quatro elites, Espada Celestial | owned/sword e flags de recompensa; conferir persistência exata | Deserto |
| VI — Deserto | 27–30 | act1Sub = jornada, fragmentos, revanche 0–4, fases da Ganância/epílogo | estátua, quatro fragmentos, quatro revanches, Ganância em três formas, Inveja | lateFound, lateFoundStep, lateFightIndex, lateBossClaimed, gauntletIndex, finaleClaimed; unlock 2 | Galáxia 2 |

**Alerta:** act1Sub é reutilizado por vários atos. Um save em um subpasso pode ser interpretado errado se a nova narrativa mudar a quantidade ou a ordem de cenas sem migração explícita.

## 4. Matriz de cena e recuperação — Galáxia 1

| ID estável proposto | Estado atual | Interação/resultado | Reação de NPC necessária | Falha e retomada |
|---|---|---|---|---|
| p0.heaven | questStep 0; cena heavenScene | aceitar missão; asas/aura removidas uma vez | Deus encerra a missão; guia já aguarda | skip/reload não repetir retirada nem travar nome |
| p0.awakening | awakeningSeen/playerName | despertar e escolher nome | guia usa nome salvo | recarga durante input reabre pergunta sem duplicar card |
| g1.a1.village | questStep 1 | falar com vendedor, comprar/recusar suborno | vendedor reage à compra/recusa | salvar antes/depois da conversa não repetir cobrança |
| g1.a1.forest | questStep 2/journeyEnemyIndex | derrotar ondas | guia e sobreviventes reconhecem avanço | morte/reload preserva inimigos restantes |
| g1.a1.cages | questStep 3/act1Sub/childrenFreed | usar chave e resolver encontro | sobreviventes reagem sem duplicar resgate | skip da cena não repetir transformação/recompensa |
| g1.a1.sewers | questStep 4/act1Sub/mountainIndex | atravessar massacre, pista, caverna e buraco | pista aponta ao guardião | retornar à superfície não apaga objetivo |
| g1.a1.portal-warden | questStep 5/6/wardenDefeated | derrotar guardião e abrir portal | guardião/guia reconhecem portal aberto | repetir luta não paga duas vezes |
| g1.a1.vhazrael | questStep 7/8/vhazraelRewardClaimed | dimensão e chefe | fala de VHAZRAEL reflete a dívida e a vitória | morte/reload reinicia arena, não o Ato I |
| g1.a2.road | questStep 9 | atravessar vale/serra/ponte até Cinzária | guia reconhece sinais da Ganância | checkpoints por trecho, sem teleporte obrigatório |
| g1.a2.city | questStep 10; migration para 11 em saves antigos | bandido e pessoa misteriosa (conteúdo provisório) | reação depende do encontro | migração step10 deve ser idempotente |
| g1.a2.gate | questStep 11 | vencer dois guardas | guardas reconhecem invasão | derrota não consome chave |
| g1.a2.volcano-lab | questStep 12/act1Sub 0–4 | laboratório, chave, ouro, galeria e trono | prisioneiros/guia respondem às descobertas | cada subpasso salva; porta não pode ficar sem chave |
| g1.a2.vorgazhek | questStep 13–14 | portal e chefe | VORGAZHEK reage aos livros de dívida | recompensa única; eruption/cutscene retoma após reload |
| g1.a3.invernalia | questStep 15–16 | casaco, pescador, moradora, estalagem | NPCs reagem ao horário e à busca do Anjo | compra do casaco não duplica custo |
| g1.a3.trap | questStep 17 | porão, fuga, cidade em chamas, guia | sobreviventes reconhecem resgate | checkpoint antes/depois da fuga |
| g1.a3.ice-dimension | questStep 18 | caverna, controles invertidos, mini-chefe, portal | guia dá pistas, não resolve puzzle | inverter controles sempre retorna ao normal após sair/reload |
| g1.a3.zarkhael | questStep 19 | chefe e revelação humana/5% | guia reage à pergunta do protagonista | duelo do Anjo precisa de motivo explícito e retomada segura |
| g1.a4.tower | questStep 21–22 | sete pisos e pergaminho | sobreviventes/guardas reagem ao avanço | cada piso é checkpoint; 5º piso é descanso |
| g1.a4.veraxion | questStep 23–24 | chefe, passado e queda da torre | pessoa misteriosa revela identidade por etapas | cena de colapso não pode repetir nem prender o jogador |
| g1.a5.colosseum | questStep 25–26 | oito rounds e Espada Celestial | Sandra/rival reconhece cada round | round atual salvo; rewardClaimed evita duplicação |
| g1.a6.desert | questStep 27 | estátua e fragmentos | Sandra explica encaixes sem resolver pelo jogador | fragmentos não somem após reload |
| g1.a6.rematch | questStep 28/act1Sub 0–4 | revanches nas quatro dimensões | cada Bispo reconhece a primeira derrota | ordem e índice persistem |
| g1.a6.greed | questStep 29 | três formas e epílogo | Anjo/Sandra respondem ao estado final | forma atual e rewardClaimed persistem |
| g1.a6.unlock-envious | questStep 30/unlocked=2/celebrate=2 | Inveja rouba alma da Ganância e mundo 2 desperta | Sandra e guia reconhecem novo objetivo | desbloqueio só uma vez; reabrir menu mostra mundo 2 |

## 5. Matriz proposta — mundos 2–7

| Mundo | Estado inicial | Loop principal | Escolha com consequência local | Falha/retomada | Flags candidatas |
|---|---|---|---|---|---|
| 2 Inveja | mundo 2 desbloqueado; alma da Ganância roubada | espelhos, cópias, recuperar nomes e identidade | revelar verdade ou preservar memória de um NPC | puzzle e cópia reiniciam no último espelho ativado | envy.namesRestored, envy.mirrorTruth, envy.soulRecovered |
| 3 Preguiça | corrente do mundo 3 visível | reativar relógios e acordar bairros | acordar um NPC ou manter seu descanso enquanto salva os demais | cada sino ativado vira checkpoint | sloth.bells, sloth.awakenedNPCs |
| 4 Soberba | mundo 4; recuperar asas/aura | subir a cidade vertical e enfrentar tribunal | usar poder para proteger ou provar superioridade | checkpoint por torre/piso; asas não se perdem por morte | pride.wingsRestored, pride.trialChoice |
| 5 Gula | mundo 5 | interromper cadeia de consumo e redistribuir alimento | priorizar distrito A/B; altera diálogos e recursos opcionais | pontos de distribuição persistem | gluttony.routes, gluttony.districtA/B |
| 6 Ira | mundo 6 | investigar origem da guerra e interromper retaliação | entregar ou proteger prisioneiro-testemunha | batalhas podem ser repetidas sem duplicar recompensa | wrath.testimony, wrath.factionTrust |
| 7 Luxúria | mundo 7 | atravessar ilusões e recuperar lembranças verdadeiras | preservar lembrança ou aceitar perda | cada memória estabilizada vira checkpoint | lust.memoryTruth, lust.acceptance |

Esses flags são nomes candidatos. Não criar no runtime até o roteiro e a migração serem aprovados.

## 6. Modelo de estado recomendado

Não substituir V6 diretamente. Depois da aprovação, introduzir um estado versionado que mantenha campos legados durante a transição:

    {
      version: 7,
      narrativeVersion: "a5-canon-1",
      sceneId: "g1.a1.village",
      actId: "g1.a1",
      substep: 0,
      legacy: { questStep: 1, act1Sub: 0 },
      flags: {},
      choices: {},
      npcRelations: {},
      worldUnlocks: [1],
      rewardClaims: []
    }

Regras:
1. sceneId é estável e independente da ordem visual das cenas.
2. Cada ato tem substep próprio; não reutilizar act1Sub para todos os atos.
3. Toda recompensa tem ID de claim e é aplicada uma vez.
4. NPCs derivam falas do estado salvo, nunca de variável efêmera.
5. Cada cena tem checkpoint explícito, ação de skip idempotente e caminho de retomada.
6. Migração V6→V7 é pura, testada, idempotente e preserva moedas, XP, nome, compras, bestiário, conquistas, mapa, missões e desbloqueios.
7. Se uma etapa antiga não puder ser identificada com certeza, retomar no início do checkpoint seguro da mesma etapa; nunca zerar toda a campanha.
8. Não converter o save em V7 antes de existir teste de fixture para cada faixa de questStep e subpasso.

## 7. Testes de aceitação obrigatórios

- Novo jogo: prólogo, escolha de nome, skip e reload.
- Save V5 e V6 em cada faixa de questStep; V6 com act1Rev 1 e 2.
- Cada subpasso de cada ato: salvar, recarregar, repetir diálogo, morrer e voltar.
- Cutscene concluída/skipada não concede duas recompensas.
- Recompensa de cada Bispo e de cada missão opcional é única.
- NPCs reagem ao estado salvo após reload.
- Mapa: waystones/POIs restaurados; missão de Eldória conta apenas os três IDs locais.
- Galaxy unlock: mundo 2 só abre após conclusão do Ato VI; outros mundos permanecem bloqueados até os requisitos.
- Dados inválidos (NaN, Infinity, array, objeto, step fora do intervalo) não liberam missão, item ou mundo.
- Playwright/WebGL em paisagem e retrato; depois teste de toque/Android físico quando disponível.
- Fotos/vídeo inspecionados manualmente; relatório sem console/page errors e sem aceitar screenshot que não mostre o evento.

## 8. Protocolo de playtest narrativo

Amostras pequenas servem para encontrar confusão e ritmo ruim; não provam efeito universal. Fazer primeiro teste formativo com 5–8 jogadores, corrigir, e repetir com outra amostra. Não explicar a história antes do teste.

Depois de cada cena, perguntar sem induzir:
1. Qual é seu objetivo agora?
2. Que pergunta você quer ver respondida?
3. O que o NPC queria e o que ele temia?
4. O que mudou por causa da sua escolha?
5. Qual imagem, objeto ou frase ficou na memória?
6. O que você faria em seguida?

Registrar:
- se o jogador consegue repetir o objetivo sem ajuda;
- se identifica pelo menos uma pista antes da revelação;
- se distingue o que é fato, suspeita e mentira;
- se percebe a consequência da escolha no NPC/ambiente;
- se o motivo sensorial retorna com significado novo;
- onde pula diálogo, fica parado ou pede orientação;
- se a pausa de exploração recupera a atenção depois de tensão alta.

### Rubrica de aceitação por cena

Pontuar cada item 0–2: 0 = falha; 1 = parcial; 2 = claro. Cena não passa com 0 em objetivo, continuidade ou retomada.

| Critério | 0 | 1 | 2 |
|---|---|---|---|
| Objetivo | jogador não sabe o que fazer | precisa de marcador/ajuda excessiva | consegue explicar e localizar o próximo passo |
| Curiosidade | segredo sem pista | uma pista ambígua | pergunta específica + duas pistas observáveis |
| Personagem | NPC só entrega exposição | desejo é percebido, mas não a contradição | jogador explica desejo, medo e limite |
| Agência | escolha cosmética | muda fala/recompensa pequena | muda reação/estado persistente e é percebida |
| Memória | motivo não é notado | motivo lembrado sem significado | motivo retorna e o jogador percebe a reinterpretação |
| Ritmo | cena longa sem ação/pausa | tensão e alívio pouco equilibrados | alternância clara de ação, exploração e recuperação |
| Continuidade | save/skip perde estado | retoma com uma correção manual | reload/skip/morte retoma no mesmo objetivo sem duplicar recompensa |

Não usar a pontuação como “nota científica”. É uma ferramenta de revisão interna; comparar observações e falas dos jogadores, não apenas somar números.

## 9. Coordenação e áreas protegidas

- #670 é a única PR A5 ativa e foi reduzida a correções técnicas de sidequests (BG-004/BG-005 e IDs locais). Não usar como PR de história.
- #665/#673: Codex, Ato III/Sakura/Neve/Castelo; não editar.
- #672: A3/fauna; não editar.
- #674: A4/iluminação; não editar.
- #675: A1/locomoção; não editar.
- #656: combate; não editar.
- #468/#515: áreas de locomoção/caverna; não editar.
- O hunk A5 em mundo-3d-prototype.js é somente o argumento waystones em refreshSideQuests; foi comparado com os hunks concorrentes.

## 10. Sequência de implementação após aprovação

1. Aprovar a lista de pecados e os nomes dos personagens.
2. Congelar o Cânone Mestre e publicar roteiro aprovado por ato.
3. Corrigir os documentos de execução (M1–M14) sem apagar os históricos; arquivar versões antigas só após revisão.
4. Criar IDs estáveis de cena e matriz de checkpoints.
5. Implementar prólogo/Ato I com transições e flags aprovadas.
6. Reescrever Atos II–VI em PRs pequenas, preservando sistemas de mapa, combate, dimensões, loja, clima e câmera.
7. Implementar mundos 2–7 em entregas separadas, com loop de gameplay próprio.
8. Implementar migração V6→V7 e testes de fixtures.
9. Validar percurso completo, saves, NPCs, screenshots/vídeo e Android físico.
10. Só então retirar flags antigas e documentos obsoletos, após aprovação explícita.

## 11. Pendências de auditoria

- Localizar no runtime grande a chave física do save de galáxias (a API usa unlocked/celebrate, mas a chave não foi identificada).
- Conferir o uso real de lateFound/lateFightIndex/lateBossClaimed/gauntletIndex/finaleClaimed em cada cena.
- Conferir a persistência exata da Espada Celestial e de Sandra.
- Verificar se a rota Sakura é obrigatória, opcional ou apenas ambiental.
- Conferir os NPCs reais de Eldória e aprovar vendedores antes de religar missões.
