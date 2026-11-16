# Evidência real — menu cinematográfico

Atualizado em 16/11/2026. Código: `385dab9`; baseline: `2732e9d`. PNGs capturados no Chromium, abertos e inspecionados, nos mesmos 1536×864 e 852×393. Nenhum PNG faz parte do runtime.

| Viewport | Antes | Depois |
| --- | --- | --- |
| Desktop | [captura](before-desktop.png) | [captura](after-desktop.png) |
| Paisagem móvel emulada | [captura](before-mobile.png) | [captura](after-mobile.png) |

[Fallback sem WebGL](fallback.png) · [mundo real após ENTRAR](world-after-enter.png)

GPU desktop: 300 → 230 draw calls (−23,3%); 184.277 → 347.186 triângulos; 9 → 28 texturas. Mobile usa seis instâncias de rocha em vez de dez: 226 calls / 314.074 triângulos / 28 texturas. O refinamento PBR/CC0 **aumenta custo geométrico e texturas** em relação ao baseline e à primeira proposta. A redução das rochas para 28% removeu cerca de 197 mil triângulos do primeiro ensaio com fotogrametria. Todas as texturas CC0 de superfície são 512px; HDR 1K. A efígie estática agora conserva os mapas PBR 512px, com aproximadamente 972 KiB.

Tempo observado até modelos carregados: desktop 11.423 → 7.159 ms; móvel 5.979 → 3.409 ms. São execuções isoladas sujeitas a cache, CDN e concorrência, **não um benchmark de velocidade**. A telemetria só é lida após um frame posterior ao término das cargas (incluindo movimento reduzido). Não foi medido FPS em Samsung A55 ou outro aparelho físico.

[Fontes CC0 e reprodução](../../menu/polyhaven/LICENSE-SOURCES.md): Rock Face 02, Modular Fort 01 e céu HDR da Poly Haven, usados como geometria, materiais PBR e iluminação. Downloads adicionais em runtime são locais ao repositório; não há serviço pago nem chamadas ao site de modelos. O anjo mantém os detalhes de sua textura original e o demônio usa uma derivação estática do GLB do projeto; originais preservados.

[QA navegador](browser-report.json): sete seleções por teclado/toque, bloqueios/requisitos, configurações, três destinos desabilitados, prontidão, moedas 1.234 e progresso 31% dinâmicos, contexto perdido/restaurado, aba oculta sem agendar rAF, fechamento, viewport 667×375 com movimento reduzido e WebGL indisponível. Sem erros JS, console ou rede nas três execuções WebGL.

[Integração](world-report.json): botão de produção libera o gate do mundo e preserva campanha de teste (quest 1, 47 moedas). Nenhum bypass freeRoam/teleporte foi usado. [Progresso](progress-tests.txt): 3 testes passaram. Sintaxe dos módulos alterados e `git diff --check` passaram.

Problemas encontrados e corrigidos: seleção anterior mantinha polling de prontidão; fechamento podia duplicar entrada; ator angelical usava corrida; o contexto restaurado expôs descarte de um objeto que não era material; altura 375 gerava literal inteiro incompatível no shader; título colidia com a torre/asas nas primeiras composições.

**Revisão artística pendente:** composição e interação foram implementadas, mas malhas, materiais e iluminação permanecem estilizados. A qualidade fotorealista da referência não foi igualada nem demonstrada. Não interpretar testes verdes como aprovação visual ou autorização de merge. A referência veio da conversa, não do antigo JPG do repositório; a comparação automática com aquele JPG foi retirada por medir a arte errada.
