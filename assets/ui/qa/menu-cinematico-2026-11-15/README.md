# Evidência real — menu cinematográfico

Atualizado em 17/11/2026. Código: `ff36a23`; baseline: `2732e9d`. PNGs capturados no Chromium, abertos e inspecionados, nos mesmos 1536×864 e 852×393. Nenhum PNG faz parte do runtime.

| Viewport | Antes | Depois |
| --- | --- | --- |
| Desktop | [captura](before-desktop.png) | [captura](after-desktop.png) |
| Paisagem móvel emulada | [captura](before-mobile.png) | [captura](after-mobile.png) |

[Fallback sem WebGL](fallback.png) · [mundo real após ENTRAR](world-after-enter.png)

GPU desktop: 300 → 233 draw calls (−22,3%); 184.277 → 380.397 triângulos; 9 → 30 texturas. Mobile usa seis instâncias de rocha em vez de dez: 229 calls / 347.285 triângulos / 30 texturas. O refinamento PBR/CC0 **aumenta custo geométrico e texturas** em relação ao baseline e à primeira proposta. A redução das rochas para 28% removeu cerca de 197 mil triângulos do primeiro ensaio com fotogrametria. Todas as texturas CC0 de superfície são 512px; HDR 1K. A efígie estática agora conserva os mapas PBR 512px, com aproximadamente 972 KiB.

Tempo observado até modelos carregados: desktop 11.423 → 4.568 ms; móvel 5.979 → 4.050 ms. São execuções isoladas sujeitas a cache, CDN e concorrência, **não um benchmark de velocidade**. A telemetria só é lida após um frame posterior ao término das cargas (incluindo movimento reduzido). Não foi medido FPS em Samsung A55 ou outro aparelho físico.

[Fontes CC0 e reprodução](../../menu/polyhaven/LICENSE-SOURCES.md): Rock Face 02, Modular Fort 01 e céu HDR da Poly Haven, usados como geometria, materiais PBR e iluminação. Downloads adicionais em runtime são locais ao repositório; não há serviço pago nem chamadas ao site de modelos. O anjo mantém os detalhes de sua textura original e o demônio usa uma derivação estática do GLB do projeto; originais preservados.

[QA navegador](browser-report.json): sete seleções por teclado/toque, bloqueios/requisitos, configurações, três destinos desabilitados, prontidão, moedas 1.234 e progresso 31% dinâmicos, contexto perdido/restaurado, aba oculta sem agendar rAF, fechamento, viewport 667×375 com movimento reduzido e WebGL indisponível. Sem erros JS, console ou rede nas três execuções WebGL.

[Integração](world-report.json): botão de produção libera o gate do mundo e preserva campanha de teste (quest 1, 47 moedas). Nenhum bypass freeRoam/teleporte foi usado. [Progresso](progress-tests.txt): 3 testes passaram. Sintaxe dos módulos alterados e `git diff --check` passaram.

Problemas encontrados e corrigidos: seleção anterior mantinha polling de prontidão; fechamento podia duplicar entrada; ator angelical usava corrida; o contexto restaurado expôs descarte de um objeto que não era material; altura 375 gerava literal inteiro incompatível no shader; título colidia com a torre/asas nas primeiras composições.

**Revisão artística pendente:** composição e interação foram implementadas, mas malhas, materiais e iluminação permanecem estilizados. A qualidade fotorealista da referência não foi igualada nem demonstrada. Não interpretar testes verdes como aprovação visual ou autorização de merge. A referência veio da conversa, não do antigo JPG do repositório; a comparação automática com aquele JPG foi retirada por medir a arte errada.

## Verificação no CI de 16/11

O Chromium 156 do GitHub expôs um timeout ao capturar o menu em animação contínua por SwiftShader. O capturador agora suspende o menu pelo seu handler de visibilidade, fotografa o último frame realmente renderizado e retoma a animação em `finally`; não altera pixels ou geometria. Passou localmente com Chromium 154 e com a mesma versão do CI, Chromium 156.0.8078.4: [navegação/captura](chromium156-report.json), [entrada no mundo](chromium156-world-report.json).

O laboratório geral encontra **dois testes já falhando na main `f5c6de45bbcc8efbcf8dd34b768fc9259566aae8`**: `vorgazhek-eclipse-sword.test.mjs` exige `testSwordEclipse=1` no HTML; `zarkhael-blackflame.test.mjs` exige `testLuaNegra=1` e `testHidra=1`. A main substituiu esse laboratório por navegação via `data-dim`. Reprodução isolada da main: 13 testes, 11 passaram, os mesmos 2 falharam ([log](main-ci-baseline.txt)). Esta PR não modifica esses testes nem o laboratório de combate; não reintroduz controles removidos por outro trabalho.

## Refinamento de enquadramento e pose

Anjo ampliado com asas inclinadas e material pérola; silhueta desvanece na atmosfera sem invadir o título. Herói de costas usa derivação estática com PBR do protagonista atual, espada baixa e capa ampliada. Os exportadores agora selecionam explicitamente o idle nativo com sufixo de rig do Blender e desativam NLA: antes, o nome sem sufixo deixava Running ativo. A exportação falha se faltar o clipe. Originais preservados. Capturas finais inspecionadas no Chromium 156, com navegação, restauração de contexto e entrada real novamente aprovadas. O custo do novo herói está incluído nas métricas acima.

## Arco e reserva de asas — 17/11

As correntes centrais agora começam nas bordas de pedra, fora do vão do arco. Faixas de ferro e relevos compartilham duas malhas instanciadas (+2 calls). Corrigido argumento ausente no batch de penas de reserva: 94 instâncias recebem o material pérola. Regressões verificam material válido, matrizes finitas e âncoras fora do vão; executadas isoladamente no Chromium e incorporadas ao QA contínuo. Capturas desktop/mobile abertas e inspecionadas, fluxo e fallback aprovados.

O [CI do menu no commit anterior](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43997699638) passou; o laboratório geral mantém os mesmos dois testes de URLs antigas (log do run 43997699651), sem alterações nesses sistemas. Nenhum merge.
