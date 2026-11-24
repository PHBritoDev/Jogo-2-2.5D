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
| g1.a2.city | questStep 10; Mod321 substituiu a cidade antiga e migrateAct2Step leva saves do passo 10 direto ao 11 | funções antigas de bandido/duelo ainda existem no módulo, mas não presumir que sejam alcançáveis no fluxo atual | se recuperadas, NPCs reagem ao encontro; se removidas, registrar a decisão | migração step10→11 deve ser idempotente e preservar recursos |
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


## 12. Matriz de aplicação crítica da pesquisa

A pesquisa informa hipóteses de design; não garante uma reação emocional. Separar modelos teóricos, estudos experimentais, revisões de escopo e observação do nosso próprio playtest.

| Base e tipo de evidência | Efeito pretendido no jogador | Técnica narrativa/jogável proposta | Risco de abuso ou falha | Como testar no RPG |
|---|---|---|---|---|
| **Curiosidade — Loewenstein (1994), modelo teórico de lacuna de conhecimento.** | Formar uma pergunta específica que o jogador queira responder. | Apresentar uma pista concreta antes da explicação: recibo numerado → mesma marca na gaiola → livro de cobrança. | Mistério vago, pistas invisíveis ou informação escondida sem possibilidade razoável de descoberta. | Perguntar o que o jogador quer descobrir e que pista sustenta sua hipótese; verificar se ele identifica a pergunta sem ajuda. |
| **Suspense — Lehne & Koelsch (2015), modelo psicológico teórico.** | Antecipar um resultado incerto que importa para alguém ou algo já conhecido. | Mostrar o risco (crianças na mata), indicar sinais (luz, ruído, marcas) e alternar aproximação, silêncio e encontro. | Jumpscare constante, ameaça sem regras ou ansiedade prolongada sem resolução. | Depois da cena, perguntar qual perigo o jogador esperava e o que ainda era incerto; observar se a tensão sobe e depois diminui. |
| **Transporte narrativo — Green & Brock (2000), quatro experimentos sobre absorção em narrativas.** | Integrar atenção, imagem mental e afeto ao percurso, não apenas ao texto. | Fazer o jogador caminhar pelo lugar, observar objetos e ouvir falas curtas enquanto o cenário confirma a informação. | Cutscene longa, exposição redundante ou ambiente tão carregado que a pista principal se perde. | Comparar o que jogadores lembram do espaço e da conversa; observar pausas, abandono de diálogo e orientação no mapa. |
| **Agência e controle — Green & Jenkins (2014), revisão/enquadramento teórico de narrativas interativas.** | Fazer a ação do jogador expressar intenção e responsabilidade, sem exigir ramificações impossíveis de sustentar. | Escolha local (examinar ou seguir) com consequência de interpretação e diálogo; ambas as rotas reconvergem no objetivo principal. | Escolha cosmética, consequência imperceptível ou falsa promessa de salvar alguém quando o roteiro não permite. | Perguntar o que mudou por causa da escolha e se a consequência foi percebida; conferir o estado persistido após reload. |
| **Autonomia, competência e vínculo — Ryan, Rigby & Przybylski (2006), quatro estudos de motivação em jogos.** | Apoiar senso de escolha, domínio das ações e relação com personagens. | Dar objetivo legível, interação que o jogador consegue executar e NPC com desejo, medo e limite observáveis. | Confundir autonomia com quantidade de botões; confundir vínculo com NPC que elogia o herói. | Perguntar se o jogador entendeu as opções, se sentiu capaz de agir e o que sabe sobre o NPC; combinar relato com observação. |
| **Memória emocional — Kensinger (2009), revisão de evidência comportamental/neural.** | Favorecer lembrança de um detalhe central e sua reinterpretação posterior. | Repetir um único motivo sensorial (a marca/recibo) em outro contexto, com significado ampliado. | Acumular símbolos, depender apenas de sofrimento ou presumir que emoção melhora a memória de todos os detalhes. | Após um intervalo, perguntar qual objeto/frase ficou e o que significa agora; não exigir que o jogador recorde detalhes periféricos. |
| **Personagens e conexão — Zaini et al. (2025), scoping review de 69 estudos; Zaini et al. (2026), piloto N=15.** | Construir personagem por motivação, ação, performance e consequência, não por biografia despejada. | NPC demonstra objetivo, medo e contradição em gesto, escolha e reação; o protagonista também age para alterar a situação. | Tratar revisão de escopo como prova causal ou generalizar um piloto pequeno para todos os jogadores. | Perguntar o que o NPC queria, o que temia e por que agiu assim; comparar respostas entre jogadores sem presumir unanimidade. |
| **Ritmo e recuperação — síntese de design baseada nos modelos de suspense e nos playtests.** | Alternar antecipação, ação, descoberta e alívio para que o jogador consiga processar o que ocorreu. | Usar a vila como pausa legível antes da floresta; depois do encontro, permitir exploração curta e retorno ao objetivo. | Escalada contínua, pausas sem função ou ritmo tão lento que o objetivo se perde. | Registrar duração, skips, momentos de desorientação e resposta às perguntas de objetivo; ajustar por trecho, não por regra universal. |

### Fontes verificadas e limites de interpretação

- Loewenstein, G. (1994). *The Psychology of Curiosity: A Review and Reinterpretation*. Psychological Bulletin, 116(1), 75–98. https://doi.org/10.1037/0033-2909.116.1.75 — modelo teórico de curiosidade como lacuna percebida de conhecimento.
- Lehne, M. & Koelsch, S. (2015). *Toward a General Psychological Model of Tension and Suspense*. Frontiers in Psychology, 6, 79. https://doi.org/10.3389/fpsyg.2015.00079 — modelo teórico que relaciona conflito, incerteza, previsão e importância emocional.
- Green, M. C. & Brock, T. C. (2000). *The Role of Transportation in the Persuasiveness of Public Narratives*. Journal of Personality and Social Psychology, 79(5), 701–721. https://doi.org/10.1037/0022-3514.79.5.701 — quatro experimentos; transporte inclui imagem mental, afeto e foco atencional. Não é estudo específico de RPG 3D.
- Green, M. C. & Jenkins, K. M. (2014). *Interactive Narratives: Processes and Outcomes in User-Directed Stories*. Journal of Communication, 64(3), 479–500. https://doi.org/10.1111/jcom.12093 — revisão e enquadramento teórico; destaca controle do usuário e estrutura mais flexível, sem prometer efeito uniforme.
- Ryan, R. M., Rigby, C. S. & Przybylski, A. (2006). *The Motivational Pull of Video Games: A Self-Determination Theory Approach*. Motivation and Emotion. https://doi.org/10.1007/s11031-006-9051-8 — quatro estudos relacionando autonomia, competência e vínculo com experiência de jogo.
- Kensinger, E. A. (2009). *Remembering the Details: Effects of Emotion*. Emotion Review, 1(2), 99–113. https://doi.org/10.1177/1754073908100432 — revisão: emoção pode favorecer detalhes centrais de forma seletiva; não melhora igualmente todos os detalhes.
- Zaini, A. et al. (2025). *Character-Driven Storytelling Design for Digital Games: A Scoping Review*. Games and Culture. https://doi.org/10.1177/15554120251380423 — mapeia 69 estudos; 48% empíricos segundo a revisão. É mapa do campo, não estimativa causal.
- Zaini, A. et al. (2026). *Action Before Empathy: How Player Agency Shapes Emotional Connection in Interactive Narrative*. CHI EA '26. https://doi.org/10.1145/3772363.3799339 — piloto com N=15 em uma cena de negociação de Detroit: Become Human; evidência exploratória, não generalizável.

## 13. Sequência de amostra

A sequência completa **“A marca no recibo”** está em [SEQUENCIA-AMOSTRA-ELDORIA-PROPOSTA.md](SEQUENCIA-AMOSTRA-ELDORIA-PROPOSTA.md). Ela preserva a transação de 5 moedas do roteiro M2, acrescenta uma inspeção opcional e reconvergente e demonstra como uma pista visual pode reaparecer em outro ato. É amostra de tom e estrutura, não aprovação de fala, NPC, flag ou mudança de runtime.


## 14. Auditoria de elenco e continuidade — fatos do runtime vs decisões pendentes

Esta seção é uma auditoria de código/documentação, não uma autorização para alterar o roteiro. Os itens marcados como proposta precisam de revisão do criador.

| Área | Fato verificado na main | Risco de continuidade | Encaminhamento candidato |
|---|---|---|---|
| Vendedor principal de Eldória | `act1-flow.js` identifica o falante como **Téo · Provisões**; `eldoria-village-talk.js` registra Téo como provisões e Lia como frutas. A apresentação de missão em `act1-flow.js` continua dizendo “vendedor de frutas”. | A divergência permanece na main e na PR #670: a PR foi reduzida a correções técnicas de save/waystones e não altera `act1-flow.js`. Não tratar o texto de “frutas” como resolvido; corrigir só depois de o criador aprovar o vendedor e a função narrativa da cena. |
| Elenco das missões laterais | `eldoria-npc-life.js` e `eldoria-village-talk.js` registram Bento, Téo e Lia como vendedores conversáveis. `sidequests3d.js` ainda mostra “Mara · Ervas” e “Nara · Artesanato”; esses nomes não aparecem nos registros ativos consultados. Os IDs continuam `ERVAS`, `FRUTAS`, `ARTESANATO`. | Fato de runtime: `trySideQuestTalk(vendor)` consulta `questForGiver(sideState,vendor.shortName)`; os shortNames ativos são `ALIMENTOS`, `PROVISÕES`, `FRUTAS`. Portanto, somente `FRUTAS` encontra giver compatível; Flores de Vigília e Pedras que Lembram continuam sem oferta acessível no controlador atual. A PR #670 foi deliberadamente limpa: não remapeia essas categorias nem canoniza Bento/Téo/Lia. A decisão entre adaptar as missões aos vendedores existentes ou reintroduzir Mara/Nara exige revisão narrativa e implementação própria após aprovação.
| Pingente atribuído a Lia | A oferta chama a pessoa de “meu filho”, depois de “pingente da mãe dele”; a entrega diz “Ela gravou o nome dele”. O giver aparece como `Lia · Frutas`, mas a relação exata entre Lia, a mãe e a criança não está narrativamente consolidada. | A fala alterna primeira e terceira pessoa e deixa ambíguo quem perdeu o pingente e quem gravou o nome. A PR #670 não altera falas nem pronomes após a separação do conteúdo provisório. Manter como contradição aberta; não corrigir por suposição antes da revisão do elenco.
| Gaiola e crianças | `act1-flow.js` mantém `childrenFreed`; a função de abertura da jaula marca a gaiola aberta, mas a cena seguinte transforma as duas crianças em Seguidores. O teste `tests/a5-vendor-rescue-actual.test.mjs` confirma que abrir a jaula não incrementa estatística de resgates. | O nome da flag pode ser lido como “crianças salvas”, embora o fato persistido seja a abertura da gaiola. | Tratar a flag como estado técnico de jaula aberta; não usá-la como prova de sobreviventes. Uma renomeação exigiria migração e regressão de save, não é necessária para esta revisão narrativa. |
| Estalajadeiro e filha | Em `act3-flow.js`, o estalajadeiro diz que aceitou prender o herói porque o demônio prometeu libertar sua filha; o demônio o mata e admite que nunca cumpriria a promessa. | A filha vira uma pessoa ausente sem destino conhecido; não se sabe se está presa, morta, escondida ou se a promessa foi inventada. | Resolver explicitamente em cena/diálogo posterior ou marcar como gancho deliberado. Não acrescentar uma morte fora de tela sem evidência/decisão. |
| Origem do protagonista e regra dos 5% | `zarkhaelDefeatScene()` revela que o protagonista talvez não seja completamente anjo; `angelTruthScene()` explica que anjos têm corpo físico e 5% do poder real neste mundo, enquanto o protagonista pode usar todo o poder por ter nascido humano. | O jogador recebe uma regra importante, mas ainda não sabe por que Deus o escolheu, como sua natureza mudou nem quais limites concretos a regra impõe ao Anjo-Guia. | Preservar o mistério, mas estabelecer limites observáveis e um motivo dramático para o duelo com o Anjo; a luta não deve parecer um teste sem consequência. |
| VÉRAXION | `act4-flow.js` conta que ele veio da Terra há 50 anos, perdeu a mãe após um meteoro, viu a justiça ser comprada, aceitou poder da Ganância e matou centenas de milhões; depois demonstra arrependimento. | A explicação pode soar como absolvição se a dor passada substituir a responsabilidade pelos crimes. | Manter causalidade e arrependimento, mas deixar claro que compreender a origem não desfaz o dano nem obriga o jogador a perdoá-lo. |
| Pessoa Misteriosa / Sandra | No Ato IV, ela diz que era um quinto Bispo e quer destruir a Ganância; no Ato V se transforma em demônio para entrar no Coliseu; no epílogo do Ato VI revela o nome Sandra e o gênero com “você era mulher esse tempo todo?”. | A revelação atual depende de surpresa de gênero, enquanto motivação, disfarce, confiança e passado ainda precisam carregar o impacto. | Fazer a revelação principal ser identidade, intenção e risco assumido; gênero pode ser informação normal, não o clímax. |
| Cela no Ato VI | `greedPhase3Scene()` diz “Como vocês escaparam da cela?” e chama o Anjo e a Pessoa Misteriosa para a luta; a captura e a localização dos dois na cela não são estabelecidas claramente nas cenas anteriores de `act6-flow.js`. | O jogador pode perguntar quando os aliados foram capturados e como chegaram à arena. | Inserir uma batida visual curta de captura/encarceramento ou reescrever a fala para corresponder ao que o jogador realmente viu. |
| Sete pecados na tela de galáxias | `galaxies3d.js` lista Ganância no mundo 1 e Avareza no mundo 3 (duplicação semântica); o mundo 7 aparece como Luxúria, mas o subtítulo menciona “um sono mais pesado que correntes”, que sugere Preguiça. | A lista tradicional fica sem Preguiça e repete Ganância/Avareza; o texto de ambientação do mundo 7 aponta para outro pecado. | A proposta 0.1 usa Preguiça no mundo 3 e mantém Luxúria no 7, mas a ordem dos mundos 3–7 não está confirmada pelo PDF consultado. Aprovar a taxonomia e revisar nome, subtítulo, mapa e tela juntos. |

### Fontes de runtime para esta auditoria

- [`act1-flow.js`](../../act1-flow.js), [`act3-flow.js`](../../act3-flow.js), [`act4-flow.js`](../../act4-flow.js), [`act6-flow.js`](../../act6-flow.js) — falas, cenas e etapas.
- [`eldoria-npc-life.js`](../../eldoria-npc-life.js) e [`eldoria-village-talk.js`](../../eldoria-village-talk.js) — perfis e nomes dos NPCs ativos.
- [`sidequests3d.js`](../../sidequests3d.js) — nomes e categorias das missões laterais.
- [`galaxies3d.js`](../../galaxies3d.js) — taxonomia e subtítulos visíveis da tela de galáxias.
- [`docs/roteiro/M2-ATO1.md`](../roteiro/M2-ATO1.md), [`M3-ATO2.md`](../roteiro/M3-ATO2.md), [`M4-ATO3.md`](../roteiro/M4-ATO3.md), [`M5-ATO4.md`](../roteiro/M5-ATO4.md), [`M6-ATO5.md`](../roteiro/M6-ATO5.md), [`M7-ATO6.md`](../roteiro/M7-ATO6.md) — resumos de produção e limites registrados.

**Limite:** esta tabela não substitui a inspeção de todos os call-sites de cena. O call-site de missões foi conferido: `trySideQuestTalk` usa `vendor.shortName`; apenas `FRUTAS` corresponde aos shortNames atuais. A correção de progresso/waystones na PR #670 é independente e não resolve as ofertas nem aprova o conteúdo narrativo. O QA dessa PR ainda está pendente no SHA atual.
