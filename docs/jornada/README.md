# Jornada Eldória → Cinzária (Mod 321)

Registro permanente da missão de 15/11/2026. O briefing temporário foi removido na mesma PR.

Eldória (Cidade 1) não foi tocada. A antiga Cidade 2, que ficava a 150 m de Eldória, foi substituída por uma
jornada contínua e caminhável até a nova Cinzária e o vulcão. A antiga Cidade 2 tinha:

- o Distrito da Ferrugem;
- o beco dos bandidos;
- a mina e o canal;
- o altar do selo e os livros-caixa;
- um cone de 50 m.

## Arquivos

| arquivo | papel |
|---|---|
| `jornada3d.js` | Regras puras, testadas sem navegador. Define o percurso, o relevo, os limites caminháveis, o abismo, o tabuleiro da ponte, o cone do vulcão, o layout modular da cidade, as rotas dos moradores, os pontos de TP e os checkpoints, os POIs e as áreas reservadas. |
| `jornada-world3d.js` | Parte visual. Terreno em blocos com LOD e streaming, vegetação instanciada, rio e cachoeira, ponte, névoa do abismo, vulcão, entrada da caverna, Cinzária e aurora. Também guarda os sólidos simples. |
| `mundo-3d-prototype.js` | Recebe só integrações pontuais (detalhadas na seção seguinte). |
| `act2-flow.js` | Coordenadas do Ato II apontando para a nova cidade e para o sopé, mais a migração `migrateAct2Step`. |
| `map3d.js` | Limites novos, POIs e abrigos da jornada, alias `distrito → cinzaria` e conversão da névoa v3 (`migrateLegacyFog`). |

Integrações em `mundo-3d-prototype.js`:

- invólucro de `terrain3D.height`, `boundaryDistance` e `waterDepth` a oeste de x = −112, com mistura entre −112 e −150 para a saída ficar orgânica;
- recorte `JOURNEY_HOLES` na malha antiga;
- tabuleiro da ponte em `terrainHeightAt`;
- sólidos em `blockedAt`;
- `updateJourney`, que cuida da queda, dos checkpoints e do streaming;
- `journeyTeleport` e o painel ADM.

## Percurso (≈ 1,3 km de caminho medido pela polilinha `ROUTE`)

1. **Saída de Eldória**: a Garganta (x ≈ −70) continua como portão do Ato II. A estrada desce para o vale sem degrau.
2. **Vale do Entardecer** (x −112 … −620):
   - capim alto com vento no shader e flores agrupadas;
   - bosques naturais (nunca em grade) e pedras;
   - um rio raso de até 0,7 m, que se atravessa a pé, nascendo numa cachoeira na serra norte;
   - montanhas por relevo *ridged*.
3. **Subida da Serra** (x −620 … −806): estrada em zigue-zague até cerca de 62 m de altitude. O Mirante (x −748) mostra o vulcão ao longe.
4. **Ponte do Abismo** (x −806 … −930):
   - 124 m de tábuas, postes e cordas, com âncoras de pedra nas duas pontas firmes;
   - abaixo dela só existe névoa (dois planos com ruído, sem sprites), sobre um chão a −320 m.
5. **Terras de Cinza** (x −930 … −1205):
   - a grama dá lugar, aos poucos, à cinza e ao basalto, com rochas escuras;
   - o vulcão cresce de silhueta a marco monumental.
6. **Cinzária** (centro −1262, −66):
   - **Estrutura**: anéis de casas modulares formando a praça e os bairros mercado, oficinas e alto. A rua principal leste–oeste e as radiais norte–sul ficam livres.
   - **Casas**: embasamento de pedra vulcânica escura, reboco claro, esteios de madeira e telhado de telhas.
   - **Praça**: fonte, bancas, lanternas, torre do sino e caixotes.
   - **Moradores**: o sistema de moradores existente percorre as `CITY_ROUTES2`.
7. **Sopé do vulcão**:
   - **Cone**: cerca de 290 m acima da cidade, com cratera legível, ravinas incandescentes discretas e fumaça limitada a 8–16 sprites.
   - **Portal de basalto** (−1327, −66): os **2 guardas Enemy2** do Ato II ficam nele. A caverna é o interior já existente (`volcano3d.js`); nada da dimensão de VORGAZHEK foi refeito.

## Céu, noite e aurora

O ciclo de dia e noite é o global do jogo, salvo junto com o horário e o clima. Na jornada inteira, inclusive na cidade
vulcânica, a noite ganha:

- uma aurora azul-violeta: uma faixa de shader, um único draw;
- as estrelas e a lua já existentes;
- janelas e lanternas que acendem.

## Física e sólidos

- **Chão**: vem sempre da mesma função de relevo, que também gera a malha.
- **Bloqueios**: encostas além de 7 m da borda caminhável, o cone do vulcão e os corrimãos (para quem anda no tabuleiro).
- **Sólidos simples**: casas (retângulo girado), fonte, bancas, torre, postes, árvores, rochas grandes, pilares da ponte e portal. Ficam numa grade espacial de 16 m.
- **Sem colisão**: capim e flores.
- **Queda real**: quem pula o corrimão, ou sai pela borda da rocha, cai com a gravidade normal. A 38 m abaixo do tabuleiro, morre e volta ao último checkpoint pisado: vale, serra, ponte leste, ponte oeste, cinzas ou Cinzária. Quem está abaixo do tabuleiro nunca é puxado de volta para cima.

## Desempenho

- **Blocos finos** (64 m, célula 2 m, saia contra frestas): até cerca de 150 m do herói.
- **Blocos grossos** (256 m, célula 8 m): até cerca de 560 m. Escondem as células já cobertas pelos finos.
- **Construção e descarte**: no máximo 1 bloco fino e 1 grosso por quadro; descarte (`geometry.dispose`) ao se afastar.
- **Instâncias**: capim, flores, árvores e rochas usam um `InstancedMesh` cada, repovoado só quando o herói anda cerca de 30 m.
- **Vulcão**: malha própria, sem névoa, com bruma calculada no shader para ser visto de muito longe.
- **Luzes**: nenhuma `PointLight` nova; brilho emissivo e sprites aditivos.

FPS: os números da CI e do SwiftShader não equivalem a um Android real e não foram medidos em aparelho.

## Ato II provisório e saves

A narrativa nova do Ato II será escrita depois.

- **Removido**: as cenas do beco e do Desconhecido, que dependiam da cidade antiga.
- **Fluxo provisório**:
  1. passo 9: chegar a Cinzária, com o título e a fala de chegada;
  2. passo 11: os dois guardas;
  3. passos 12–14: o interior do vulcão, que não mudou.
- **Migração**: saves parados no passo 10 vão para o 11 (`migrateAct2Step`), sem recompensa duplicada.
- **Depois de VORGAZHEK**: a sequência existente (VÉRAXION, abismo, bilhete) acontece agora sobre a nova praça.
- **Mapa**: o salvamento passa para a v4. A névoa da v3 é convertida célula a célula. O POI `distrito` vira `cinzaria`, e Mina e Canal deixam de existir.

## Painel ADM (somente `?adm=1`)

O painel tem os botões **TP Cidade 1 — Eldória** e **TP Cidade 2 — Cinzária**, e também existe
`SevenSinsDebug3D.tpCity(1|2)` no modo debug.

- **Não é autorização segura**: um site estático não valida privilégios.
- **Não altera nada**: progresso, itens, inimigos e saves continuam como estavam.
- **Quando recusa**: em dimensões, áreas internas, cenas e combates.
- **Antes de posicionar**: carrega os blocos do destino e zera queda e velocidade.

## Áreas reservadas para histórias futuras (sem conteúdo canônico)

`RESERVED_SITES` em `jornada3d.js`:

- ruína baixa no vale;
- círculo de pedras;
- abrigo de rocha no mirante;
- forja abandonada nas cinzas;
- ossada petrificada.

## QA no jogo real (Playwright + SwiftShader, `?debug3d=1&adm=1`)

Capturas em `docs/jornada/evidencias/` (01–14) e resultados brutos em `evidencias/qa-jornada.json`.

| verificação | resultado |
|---|---|
| Caminhada em 8 trechos (saída de Eldória, vale, rio, subida, ponte, cinzas, rua da cidade, portão) | todos andam, sempre no chão, sem bloqueio indevido, HP intacto |
| Paredes das casas (3 casas, andando contra o centro) | param à meia-profundidade + 0,2 m |
| Corrimão da ponte | para em z −48,67, ainda no tabuleiro |
| Pulo no abismo | queda real (y 60 → −94), morte, volta ao checkpoint (−797, −50) com HP cheio |
| TP Eldória ↔ Cinzária (4 vezes) | posições seguras no chão; painel só com `?adm=1` |
| Passo 11 no sopé | 2 Enemy2 (`demon2`) surgem nos postos do portal após a cena e atacam juntos |

Correções achadas no QA: comentário de linha que engolia o retorno em `updateCityFolk` (erro
`cityFolk is not iterable` que parava o resto do quadro), gatilho dos guardas ampliado de 14 m para 20 m
(antes o jogador só chegava ao raio já entre os guardas), painel ADM abaixo do botão PULAR.

Testes: `node --test` geral com 830 aprovados; as falhas restantes já existem na `main` ou dependem do
ambiente (build-info, Mod 305 ×2, Mod 262, Mod 278, `dist-public` não gerado, `sharp` ausente no visual-lab).
