# Evidência real — menu cinematográfico

Atualizado em 17/11/2026. Implementação `ed0f2ee`, incluindo main `55e4e2a`; baseline visual `2732e9d`. As capturas abaixo vêm do Chromium 156/SwiftShader, foram abertas e inspecionadas, nas mesmas resoluções. Não são renders promocionais nem a imagem de referência.

| Viewport | Antes | Depois |
| --- | --- | --- |
| Desktop 1536×864 | [captura](before-desktop.png) | [captura](after-desktop.png) |
| Paisagem móvel emulada 852×393 | [captura](before-mobile.png) | [captura](after-mobile.png) |

[Sem WebGL](fallback.png) · [Sem os assets de arte](fallback-art-unavailable.png) · [Mundo real após ENTRAR](world-after-enter.png)

A composição foi comparada visualmente com a referência da conversa: anjo pérola à esquerda, demônio orgânico na tempestade à direita, arco fraturado, sete mundos presos a correntes, Ganância maior no centro, herói de costas, ruínas e cachoeiras. A arte é original e sua geração foi autorizada pelo criador em 17/11. A UI mantém os valores reais; não fixa 3% de progresso.

## Implementação e custo

[Origem e contrato das camadas](../../menu/cinematic/README.md). O cenário é arte 2.5D; os mundos são sete malhas curvas com UVs de um atlas, giro Y real limitado, flutuação independente e seleção interpolada. Correntes são instâncias 3D e acompanham a posição dos mundos. Só a região da capa recebe vento; corpo e espada não deformam. Não há afirmação de que a paisagem pintada seja um GLB completo. Não foi usado o bitmap da referência nem um screenshot com controles invisíveis.

| Medição após frame posterior à carga | Baseline | Desktop final | Mobile final |
| --- | ---: | ---: | ---: |
| Draw calls | 300 | 14 | 14 |
| Triângulos | 184.277 | 65.382 | 65.382 |
| Texturas GPU | 9 | 3 | 3 |
| Tempo observado até prontidão | 11.423 / 5.979 ms | 1.889 ms | 1.069 ms |

Tempos sujeitos a cache, rede e concorrência; não são benchmark de FPS. Não foi medido Android físico. A arte entregue soma cerca de 1,1 MiB; atlas compartilhado entre mundos/herói. GLBs/HDR da reserva só carregam se a arte falhar. Um canvas, nenhum novo passe de pós-processamento. A cena geométrica não é renderizada provisoriamente durante a carga da arte, evitando flash e upload de texturas desnecessárias.

## Validação

[QA do navegador](browser-report.json): sete seleções por teclado/toque, requisitos e bloqueios, configurações, três destinos desabilitados, prontidão, moedas 1.234 e progresso 31% dinâmicos, relevo não plano e alteração real do giro Y, contexto WebGL perdido/restaurado, aba oculta sem rAF, fechamento e cargas tardias. Viewport 667×375 com movimento reduzido permanece sem giro. Botões móveis de entrada e configurações têm pelo menos 44px. Sem erros JS/console/rede nos três cenários normais.

Também testados: WebGL indisponível com a mesma composição e entrada funcional; falha deliberada dos dois assets de arte com carregamento da reserva independente GLB/CC0 e entrada funcional. Regressões das penas de reserva (94 instâncias, material válido, matrizes finitas) e das âncoras de correntes fora do vão do arco aprovadas. Corrigido acúmulo do shader de névoa em materiais compartilhados.

[Integração no mundo](world-report.json): entrada pelo botão de produção, liberação do gate e preservação de quest 1/47 moedas em perfil isolado, sem bypass freeRoam ou teleporte. [Progresso](progress-tests.txt): 3/3. [Integração após incorporar a main](integration-tests.txt): 51/51. Sintaxe e diff-check aprovados.

O antigo `main-ci-baseline.txt` registra uma falha histórica anterior desta rodada. Após incorporar `55e4e2a`, os 51 testes — inclusive os dois testes de URLs antigas — passam; o histórico não representa o estado final. Os JSONs `chromium156-*` são as execuções finais da mesma versão usada pelo CI.

O briefing temporário está removido nesta PR. O criador autorizou merge após a conclusão e validação na conversa; nenhuma mudança de gameplay, Eldória, saves, HUD ou versão foi criada por esta missão.
