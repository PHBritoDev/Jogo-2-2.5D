# Integração narrativa de Eldória — reconstrução em uma única rodada (12/11/2026)

**Fontes e ordem de prioridade:** decisões recentes da história em 12 partes desenvolvida com o criador > regras de coerência/saves do jogo > roteiros v1/v2 anteriores. O antigo rascunho oral foi descartado. Os roteiros antigos podem auxiliar a localizar eventos, mas não valem como aprovação de acontecimentos conflitantes.

## Jornada e estado de integração

| Etapa narrativa | Batida confirmada da versão nova | Sistema existente / condição |
| --- | --- | --- |
| 1 | Preservar o prólogo e encontro com Deus; protagonista chega ao mundo e é guiado pelo anjo | `prologue-flow.js` preservado; cenas do jogo ainda requerem QA |
| 2 | Teren auxilia na estrada; chegada orgânica; Osren e Ilyan devem ganhar contexto humano antes de qualquer destino trágico | `prologue-road-flow.js` já tem Teren e carroça; modelo, interação e apresentação de Ilyan ainda não conferidos |
| 3 | Ponte de entrada; cobrança por cargas e recibos, Osren; Ilyan perto do poço; símbolos e vestígios | Ilyan implementado como Meshy masculino em encontro opcional perto do poço; investigação física de recibos ainda não implementada |
| 4 | Seguir pistas ao rio e à clareira; combater Varkhen/Drazek; ritual, jaulas e crianças | As cenas antigas têm Seguidores genéricos; não renomear chefes até confirmar modelos/IA; destino das crianças não está aprovado |
| 5 | Eldória sofre ataque organizado; resgates, Osren/Teren e ligação dos confiscos | `massacreScene` e `clueScene` têm texto revisado; resgate e consequências dinâmicas precisam de lógica/QA |
| 6 | Galerias da caverna: separação do anjo, reencontro com Ilyan, prisioneiros, rotas bloqueadas | Cenário da caverna melhorado pelo Claude Mod 316; Ilyan reaparece na cela da galeria mediante carregamento Meshy; acompanhamento de fugas/ação cooperativa ainda não implementado; não inventar desfecho |
| 7 | Travessia, Zarkun e confronto do bispo Vhazrael, menção aos quatro selos/Vorgazhek | O jogo já possui Guardião do Portal; evitar duplicar Zarkun sem decidir identidade/funcionamento; diálogo com Vhazrael revisado |
| 8 | Fuga da dimensão e retorno, recuperação parcial de Eldória | `afterVhazraelScene` revisada; recuperar persistência e NPCs conforme consequências reais é trabalho separado |
| 9 | Registros antigos e atuais comparados por Teren mostram como a Ganância retirou suprimentos | Falas de Osren introduzem recibos e cargas, mas comparação jogável ainda não existe |
| 10 | Auditoria da continuidade: Deus, Ilyan, crianças, caverna versus esgoto e Guardião versus Zarkun | Sem mudança destrutiva de eventos ou saves |
| 11 | Final com Teren, Osren e Vaelthar e resultados coerentes com escolhas, sem afirmar crianças salvas por `childrenFreed` | Ainda requer eventos condicionais; não afirmar sobrevivência automaticamente |
| 12 | Prova de cargas rumo ao vulcão após Vhazrael; preparo da próxima jornada | `afterVhazraelScene` atualizada diretamente no fluxo jogável |

## O que esta branch altera de verdade
- Cerca de 47 substituições de falas nas cenas **já chamadas pelo jogo** em `act1-flow.js` e nova conclusão depois de Vhazrael. Tom cotidiano, com fala curta e motivação humana; investigação por mercadorias/recibos/símbolos e ligação da vila com a caverna.
- Objetivos e título de Eldória no HUD, acompanhando a ponte, as cargas, o ritual e a caverna.
- Testes narrativos e de transição atualizados.
- **Sem** alterar `questStep`, `act1Sub`, salvamento, ordem das ações do diretor, roteiro de combate, cenários ou estado da IA. O prólogo celestial com Deus permanece intacto.

## Questões que NÃO se pode resolver por invenção
1. A história recente deixou **pendente** decidir se as duas crianças são salvas ou transformadas; o jogo antigo ainda executa a transformação. Alterar esta mecânica exige definir ramificações, cenas, inimigos, saves e objetivos juntos.
2. **Ilyan** agora possui modelo real reutilizado entre vila e cela e falas nas duas cenas; seu destino continua não confirmado. Não criar morte automática, personagem duplicado nem falas de fantasma.
3. **Zarkun** pode ou não corresponder ao Guardião existente; conferir canon antes de criar segundo chefe.
4. Como a Ganância chegou, como surgiram os bispos e o objetivo final dos Sete Pecados **ainda não foram definidos**. Não criar lore oficial sem decisão.

## Verificação exigida antes de mesclar
- Executar `node --test act1-flow.test.mjs tests/eldoria-epilogue-story.test.mjs`, suíte completa e CI.
- Inspecionar no jogo a chegada por ponte, os diálogos do vendedor, a cena das jaulas, a caverna, o Guardião e a saída da dimensão. Confirmar que texto foi efetivamente mostrado.
- Garantir que a reescrita não introduz contradições com as transformações já existentes, personagem do vendedor ou valores de recompensa; comparar com saves novo e antigo.
- Manter PR como rascunho enquanto faltar comprovação visual/funcional ou conteúdo canônico essencial. Não marcar as doze partes como implementadas só por existirem neste mapa.

**Este documento registra o esforço integral da rodada; não substitui cenas programadas nem significa que todo o arco já esteja jogável.**

## Continuação da rodada após reconexão
- Corrigida a contagem indevida de resgate no ato de abrir as jaulas; o ritual ainda pode transformar crianças e a estatística não deve premiar um resgate inexistente.
- Epílogo agora consulta `childrenFreed` e `wardenDefeated` do progresso atual e acrescenta falas sem assumir sobreviventes.
- Ilyan implementado com um **único modelo Meshy masculino já usado no jogo**, próximo ao poço enquanto a vila está ativa e na cela dentro do esgoto/caverna narrativa; duas conversas sem desfecho imposto, condicionadas ao carregamento do GLB. Não cria duplicata ou NPC por geometria procedural.
- Dependências ainda faltantes: missão de Ilyan pela caverna e sequência com Zarkun (exigirão validação de cenários e IA); não representar como concluídas.
