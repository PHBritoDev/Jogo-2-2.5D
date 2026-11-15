# Evidência real — menu cinematográfico

Código: `35c415b`; baseline: `2732e9d`. PNGs capturados no Chromium, abertos e inspecionados, nos mesmos 1536×864 e 852×393. Nenhum PNG faz parte do runtime.

| Viewport | Antes | Depois |
| --- | --- | --- |
| Desktop | [captura](before-desktop.png) | [captura](after-desktop.png) |
| Paisagem móvel emulada | [captura](before-mobile.png) | [captura](after-mobile.png) |

[Fallback sem WebGL](fallback.png) · [mundo real após ENTRAR](world-after-enter.png)

GPU: 300 → 194 draw calls (−35,3%); 184.277 → 206.400 triângulos (+12,0%); 9 → 11 texturas. O oitavo planeta duplicado do painel foi eliminado. A nova efígie estática tem aproximadamente 317 KiB, sem texturas/animações.

Tempo observado até modelos carregados: desktop 11.423 → 4.295 ms; móvel 5.979 → 1.851 ms. São execuções isoladas sujeitas a cache, CDN e concorrência, **não um benchmark de velocidade**. Não foi medido FPS em Samsung A55 ou outro aparelho físico.

[QA navegador](browser-report.json): sete seleções por teclado/toque, bloqueios/requisitos, configurações, três destinos desabilitados, prontidão, moedas 1.234 e progresso 31% dinâmicos, contexto perdido/restaurado, aba oculta sem agendar rAF, fechamento, viewport 667×375 com movimento reduzido e WebGL indisponível. Sem erros JS, console ou rede nas três execuções WebGL.

[Integração](world-report.json): botão de produção libera o gate do mundo e preserva campanha de teste (quest 1, 47 moedas). Nenhum bypass freeRoam/teleporte foi usado. [Progresso](progress-tests.txt): 3 testes passaram. Sintaxe dos módulos alterados e `git diff --check` passaram.

Problemas encontrados e corrigidos: seleção anterior mantinha polling de prontidão; fechamento podia duplicar entrada; ator angelical usava corrida; o contexto restaurado expôs descarte de um objeto que não era material; altura 375 gerava literal inteiro incompatível no shader; título colidia com a torre/asas nas primeiras composições.

**Revisão artística pendente:** composição e interação foram implementadas, mas malhas, materiais e iluminação permanecem estilizados. A qualidade fotorealista da referência não foi igualada nem demonstrada. Não interpretar testes verdes como aprovação visual ou autorização de merge. A referência veio da conversa, não do antigo JPG do repositório; a comparação automática com aquele JPG foi retirada por medir a arte errada.
