# Mod 376 — menu original das galáxias restaurado, boot sem tela preta e abertura só depois de ENTRAR

Registro permanente da correção do Mod 375 relatada no Galaxy A55 (27/11/2026).

## Causas reais
1. **Menu genérico.** `showGalaxyScreen` (galaxies3d.js) pinta primeiro a ilustração SVG procedural de reserva
   (`infernalBackdrop`: anjo branco simplificado, demônio preto, planetas vetoriais) e só troca para a arte ORIGINAL
   aprovada em 17/11 (`assets/ui/menu/cinematic/environment.webp` + `worlds-hero.webp`, ~1,1 MiB) quando os dois WebP
   carregam. Até o Mod 374 o boot (`#loading`) cobria a tela até o mundo inteiro ficar pronto, então ninguém via a
   reserva. No Mod 375 o boot passou a sumir no instante em que a tela era montada (`flow.planets()`), antes da arte
   chegar — e a abertura/mundo disputavam a rede nesse momento. Em rede móvel a reserva ficava exposta (ou permanecia,
   se um WebP falhasse, e a cena WebGL caía na reserva geométrica `geometry-reserve`).
2. **Tela preta com "TESTAR".** O `index.html` só cria o iframe depois de importar `shell-navigation.js` e
   `build-info.js` (com carimbo anti-cache); até o boot do jogo pintar, a página era só o fundo escuro e o atalho
   **⚔ TESTAR**, sempre visível no canto. O boot do Mod 375 também era quase todo preto (só uma linha de progresso).

## Correção
- **Prontidão real do menu:** a tela nasce com `gx-art-pending` (invisível, sem cliques); `showGalaxyScreen` devolve
  `ready`, que resolve quando os dois WebP originais estão carregados (uma nova tentativa por arquivo). Então a tela é
  revelada de uma vez por baixo do boot e só aí o mundo chama `flow.planets()` (o boot some). Em falha real dos dois
  arquivos, a reserva procedural aparece marcada `data-gx-menu-art="reserve"`. A cena WebGL também tenta de novo antes
  de cair na reserva geométrica.
- **Arte primeiro:** `<link rel="preload" as="image" fetchpriority="high">` para os dois WebP no HTML do jogo.
- **Boot visível:** título "A BATALHA CONTRA OS 7 PECADOS CAPITAIS" no centro, a arte original escurecida por trás
  (o mesmo arquivo pré-carregado) e o progresso real; o rótulo mostra "ABRINDO AS GALÁXIAS" enquanto a arte chega.
- **Casca do index.html:** o mesmo título aparece desde o primeiro byte e some quando o boot do iframe pinta
  (`postMessage SEVEN_SINS_BOOT_PAINTED`) ou, no mínimo, no `load` do iframe.
- **TESTAR só em QA/admin:** aparece com parâmetros de teste (`testar`, `treinoEspadas`, `todasHabilidades`,
  `debug3d`, `testeDimensao`, `vfxLab236`, `testeQuantum233`, `qa`, `lab`), em automação, ou depois de `?testar=1`
  (lembrado no aparelho; `?testar=0` esquece). O link e os QAs que clicam nele continuam funcionando.
- **Ordem das etapas** (inalterada no contrato, agora respeitada no tempo): boot → menu original pronto → ENTRAR →
  abertura (marcha + Campo da Última Guerra) → READY → toque → mundo. A abertura só é criada por `flow.enter`.
- O primeiro acesso de um save novo continua no portão "Galáxia 1 · TOQUE PARA COMEÇAR" (fluxo anterior ao Mod 375,
  não alterado); a abertura também só começa depois desse toque.

## QA (Chromium + SwiftShader emulado — **não** é o Galaxy A55 físico)
Jogador emulado (`navigator.webdriver` falso, `index.html` sem parâmetros), cache frio e recarga com cache quente:

| viewport | menu na etapa planets | abertura antes de ENTRAR | READY → toque → mundo | TESTAR | erros JS/rede |
|---|---|---|---|---|---|
| 412×915 (retrato, save existente) | original (frio 4,4 s / quente 5,2 s) | não | sim (cena descartada) | oculto | 0 / 0 |
| 844×390 (paisagem) | original (4,5 s / 5,6 s) | não | sim | oculto | 0 / 0 |
| 1365×768 (desktop) | original (5,5 s / 5,7 s) | não | sim | oculto | 0 / 0 |
| 390×844 (save novo) | portão do primeiro acesso | não | sim (prólogo do céu) | oculto | 0 / 0 |

- Arte com atraso de 3–4 s: o boot permanece visível com título e progresso; o menu aparece já com a arte original.
- Falha deliberada dos dois WebP (404): reserva procedural marcada `reserve`/`geometry-reserve`, entrada funcional.
- Sem WebGL: o mundo não monta; o boot mostra o diagnóstico com **TENTAR NOVAMENTE** (sem tela preta).
- Testes: `tests/menu-original-mod376.test.mjs` (6) + suíte ampla 1415/1415.
- Evidências: `docs/loading/evidencias/376-*.jpg` (fluxo por viewport, comparação com a referência de 17/11, reservas).

Pendente no aparelho físico: confirmar no Galaxy A55 (rede móvel real) o tempo do boot até o menu original.
