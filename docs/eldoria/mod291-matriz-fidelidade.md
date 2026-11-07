# Eldória — Mod 291: matriz de fidelidade, intenção emocional e benchmarks

Capturas reais do jogo (câmera do jogador, Chromium/SwiftShader, celular paisagem 960×432 e desktop 1280×720) em
`docs/evidencias/mod291/` (`land-*.jpg`, `desk-*.jpg`, `estrada-*.jpg`). As referências do criador não foram copiadas para o
repositório; são citadas pelo conteúdo. Notas atribuídas por inspeção lado a lado (julgamento artístico, não métrica
automática), pela rubrica do briefing: silhueta/composição 25, vegetação/arquitetura/rochas 25, materiais/luz/atmosfera 20,
escala/profundidade 15, água/movimento/contato/efeitos 15.

| Local | Referência | Intenção emocional | Comp. | Veg/Arq | Luz | Escala | Água/contato | Total | Situação |
|---|---|---|---|---|---|---|---|---|---|
| Prado da queda | campo ensolarado, rochedos musgosos, flores | estranhamento/curiosidade, amplidão | 20 | 17 | 12 | 12 | 11 | **72** | abaixo de 80 — luz diurna fria/cinza, flores pequenas, rochedos procedurais simples |
| Estrada / garganta | (roteiro P1) | antecipação, isolamento | 18 | 13 | 11 | 12 | 10 | **64** | sem vestígios suficientes de saque além da roda; carroça e mula funcionam |
| Chegada a Eldória | vila entre árvores ancestrais, ponte, rio | empatia e inquietação (beleza × escassez) | 17 | 16 | 13 | 11 | 12 | **69** | faltam passarelas em espiral nos troncos, mais árvores colossais e telhados integrados às copas |
| Praça / fonte seca | fonte redonda de tronco (substituída pela fonte SECA do roteiro) | privação silenciosa | 16 | 15 | 12 | 10 | 10 | **63** | moradores procedurais destoam dos GLBs; fonte seca simples |
| Rio e ponte | rio sob pontes claras de pedra | contradição: água perto, fome na cidade | 18 | 14 | 14 | 12 | 13 | **71** | correnteza, espuma e Fresnel reais; ponte em blocos ainda “de caixas” |
| Lago da mata | lago turquesa sombreado, rochas musgosas | calma inquieta antes do ritual | 17 | 14 | 14 | 11 | 13 | **69** | turquesa e espuma de margem ok; dossel ainda ralo comparado à referência |
| Mata densa | dossel em camadas | antecipação/medo | 13 | 13 | 11 | 10 | 9 | **56** | sub-bosque adicionado, mas faltam troncos grandes e dossel fechado |
| Boca da caverna | entrada na encosta com cercas e samambaias | ameaça | — | — | — | — | — | **não refeito** | porta do esgoto atual mantida |
| Interior de cristais | túnel com aglomerados azuis facetados | descoberta/horror | 15 | 14 | 12 | 10 | 8 | **59** | cristais hexagonais na câmara final e na prévia; não há a galeria colossal jogável |
| Círculo ritual | runas, velas, piso de pedra | impotência e luto | — | — | — | — | — | **não refeito** | cena das jaulas atual mantida |

**Resultado: nenhum local atingiu 80/100.** Pelo briefing, todos precisam de nova iteração; o PR não deve ser mesclado como
“cenário final”.

## Benchmarks (Chromium + SwiftShader, CPU — NÃO é Android)
Mesma câmera, mesmo build de QA (`?debug3d=1`), viewport 960×432 móvel; `renderer.info` após 2,5 s (acumula os passes do quadro).

| Ponto | Base (main bfc2160): draw calls / triângulos / ms | Mod 291: draw calls / triângulos / ms |
|---|---|---|
| Ponto de início do jogador | 354 / 769.733 / 420 ms | 134 / 323.453 / 316 ms |
| Chegada a Eldória | 350 / 633.988 / 543 ms | 298 / 390.974 / 495 ms |
| Praça | 337 / 471.346 / 366 ms | 286 / 321.628 / 341 ms |
| Lago | 69 / 170.885 / 173 ms | 70 / 190.440 / 198 ms (água nova + sub-bosque) |
| Mata | 43 / 157.775 / 201 ms | 43 / 161.131 / 201 ms |

Draw calls reais de um quadro (interceptando `renderBufferDirect`, `SevenSinsDebug3D.drawList()`): prado ≈ 38; chegada
≈ 280 (moradores procedurais 4 × ~8 grupos, loja e distrito ao fundo continuam caros). LOD1 dos 9 GLBs da cidade: 4–7 mil
triângulos cada (antes 6–30 mil), +587 KB no total. Luzes: 7 (mais 1 lanterna só na estrada à noite). Sombras: inalteradas
(não foram desligadas como “otimização”).

**Bloqueio declarado:** a meta de ≥ 30 FPS no Samsung A55 não pode ser confirmada nem negada daqui (sem dispositivo Android
nem GPU real). Os ganhos acima são de carga de cena (draw calls/triângulos), que costumam se traduzir em frametime no celular,
mas isso precisa ser medido no aparelho.

## Rota canônica do roteiro v1 — o que está jogável no Mod 291
1. ✅ Queda no prado aberto (sem mata colada, sem cidade à vista, ~215 m da cidade, atrás de uma serra).
2. ✅ Conversa com o Anjo (cena existente) → objetivo novo: seguir a estrada.
3. ✅ Teren encontra os dois; prender a lona; subir na carroça (interação, sem teleporte arbitrário — a carroça percorre a estrada).
4. ✅ Balanço/piscadas/sono → noite → 4 bandidos humanos famintos (sem magia) → luta → “Não comemos há dois dias” → escolha de
   expressão (deixar ir / pedir ajuda no reparo), ninguém morre.
5. ✅ Time-lapse até o amanhecer pela estrada real; chegada a Eldória; Teren promete voltar; missão da vila retoma.
6. ⛔ Missões 1–10 do roteiro v1 (Osren, fita/pegadas, ritual de Varkhen/Drazek com jaulas, cidade em chamas com resgate
   jogável, boca da montanha, prisão/Ilyan, Zarkun, fuga) **não foram reescritas**: o jogo segue o fluxo do Ato I existente
   (vendedor, floresta, jaulas, esgoto, portal de VHAZRAEL). Exige personagens inéditos (Teren tem placeholder humano, Osren,
   Ilyan, Varkhen, Drazek, Zarkun) e várias cenas novas.

## Marco 2 (revisão ChatGPT de 07/11): mata fechada e lago
O que mudou:
- **Mata fechada** com `ArvoreFloresta01.glb`, o modelo do criador (tronco grosso, raízes, musgo).
  - 118 árvores maduras no celular e mais no desktop, instanciadas: LOD1 até 42–58 m e copa barata até 150 m.
  - Ficam num anel em volta do lago e em manchas entre o rio e a serra, sem fileiras e sem clones de pinheiro.
- **Chão musgoso e sombreado** sob a mata, pela cor do relevo (custo zero de GPU).
- **Margem do lago** com ruído em duas escalas: menos círculo.
- **Espuma**: no lago, limitada pelo PR #414 do ChatGPT; no rio, some nos últimos 14 m antes da foz.

Capturas: `docs/evidencias/mod291/marco2-mata-*.jpg`.

| Local | Antes (marco 1) | Agora | Por quê |
|---|---|---|---|
| Lago da mata | 69 | **76** | lago emoldurado por árvores maduras, margem orgânica, sem faixa de espuma. Falta reflexo dos troncos e luz filtrada |
| Mata densa | 56 | **72** | dossel fechado e visão curta na trilha. Copas escuras demais no topo, raízes e musgo ainda pouco variados |

Custo medido (SwiftShader/CPU, mesma câmera; **não é Android**):

| Local | Draw calls | Triângulos | Frametime SwiftShader |
|---|---|---|---|
| Lago | 70 → 76 | 190 mil → 309 mil | 198 → 445 ms |
| Mata | 43 → 45 | 161 mil → 261 mil | 201 → 520 ms |

No SwiftShader o custo cresce com os triângulos (raster por CPU). Num celular com GPU a relação é outra, mas **precisa ser medida no A55** antes de aumentar a densidade. Próximo passo de otimização, se o aparelho pedir: setores espaciais (sugestão do ChatGPT) e LOD2 da árvore.

### Marco 2b (após a revisão visual de 19:27)
- **Fim das copas facetadas genéricas** na faixa da mata: o 2º passe procedural saiu e a faixa ficou exclusiva de `ArvoreFloresta01.glb`.
  - 97 árvores no jogo, depois dos filtros de trilha, água, jaulas e ponte.
- **Dois níveis de detalhe**: malha completa do criador até 24 m (tronco texturizado, sem facetas grandes) e LOD1 de 24 a 58 m. Copa barata de 55 a 150 m.
- **Variação de silhueta**: largura 0,8–1,35×, tons por instância, inclinação.
- **Meio-tom na copa**: emissão fraca com a própria textura. Casca com rugosidade alta, sem brilho de plástico.
- **Manchas de sol filtradas** no chão da mata: discos aditivos, 1 draw call, somem à noite.
- **Lago**:
  - reflexo aproximado da mata na faixa da margem (bandas verde-escuras recortadas, sem render target);
  - margem rasa mais transparente, para a água não parecer placa sobreposta.
- Custo SwiftShader nos pontos da sequência: 46–77 draw calls e 275–289 mil triângulos (sob o dossel olhando a cidade: 256 / 553 mil). Não é A55.
- Capturas: `docs/evidencias/mod291/marco2b-*.jpg`.

## Marco 3 (cidade bonita e íntegra — correção canônica do criador)
O Bispo levou o **dinheiro**, não as casas. Eldória fica encantadora; a pobreza está nas pessoas e na comida (moradores fracos, frutas podres e moscas discretas, já existentes). `eldoria-city-dressing.js`:
- **Deques de madeira em anel** presos a três árvores ancestrais: tábuas, balaústres, corrimão, escoras e **escada em espiral** do chão ao deque. Uma malha mesclada.
- **Passarela suspensa do criador** (`PassarelaSuspensaEldoria.glb`) ligando os deques de duas ancestrais. O vão é medido entre os anéis.
- **Canteiros floridos** em três cores na frente das casas, **sebes**, **cercas claras** baixas atrás das casas e **8 lampiões** de madeira com lanterna emissiva (sem luz extra) ao longo das trilhas.
- Nada de ruínas.

Capturas: `docs/evidencias/mod291/marco3-c1-chegada.jpg`, `-c2-praca.jpg`, `-c3-passarela.jpg`.

Custo SwiftShader (não é A55): chegada 311 draw calls e 457 mil triângulos (antes 299 / 407 mil); praça 295 / 346 mil (antes 286 / 322 mil).

**Pendências para ≥80**, mantendo as coordenadas da loja:
- A **Loja Central** (bloco branco de torre azul) e os vendedores/props procedurais antigos (losango bege da banca) ainda destoam dos GLBs.
- Falta o espelho/fonte circular central da referência: o roteiro pede a fonte seca, então ela fica pequena.
- Falta mais densidade de telhados verdes integrados às copas.
