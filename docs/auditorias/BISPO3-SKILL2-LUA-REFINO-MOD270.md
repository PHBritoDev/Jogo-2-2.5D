# Mod 270 — ZAR'KHAEL (Bispo 3): refino da Skill 2 "LUA TENEBROSA — O FOGO QUE NÃO MORRE"

## Lua refeita a partir da imagem de referência
- **Método:** o shader da lua (`MOON_F` em `zarkhael-blackflame3d.js`) foi reescrito com as proporções medidas na imagem de referência (coordenadas normalizadas do rosto). Ele foi renderizado sozinho em Chromium e comparado **lado a lado** com a imagem a cada rodada, e refeito até ficar próximo (12 iterações). As comparações estão em `docs/evidencias/mod270/lua-antes-x-referencia.png` e `lua-depois-x-referencia.png`.
- **Forma:** crânio pálido mais alto que largo (proporção ≈ 1,26), topo largo e achatado, lado esquerdo quase reto, queixo cortado em curva e borda irregular de aquarela.
- **Superfície:** osso sujo com manchas de aquarela de borda escura (as grandes ficam no topo, como na pintura), papel granulado, rubor avermelhado leve e uma rachadura vertical entre os olhos.
- **Vazio:** negro, colossal, à direita, em superelipse. O crescente claro é fino à direita e grosso em cima e embaixo.
- **Olhos:** dois olhos esbugalhados e desiguais (o esquerdo redondo e grande, o direito estreito e alto, encostado no vazio), em órbitas negras com sombra pintada. A íris escura fica para o lado, num olhar fixo e desconfortável.
- **Nariz:** cunha branca afilada que alarga até a ponta arredondada, com a sombra da narina.
- **Boca:** sorriso em cunha que cresce até o vazio, com duas fileiras de dentes pontudos, irregulares e rosados sobre gengiva vermelha, e sombra do lábio. Abaixo, a dobra escura do queixo contorna o sorriso.
- **Estática:** a exigência de a lua seguir o jogador com os olhos foi **removida**. Não existe mais `gaze`/`stare` (uniformes, lógica e brilho vermelho). A lua fica parada e ameaçadora.
- **Uma lua só:** a Skill 2 cria uma única malha de lua. A decoração da dimensão, que já existia, não foi alterada.
- **Posicionamento:** alta (+15 m), a 34 m do centro da arena, atrás do bispo visto do herói, com 17 × 21 m. A inclinação da câmera de jogo foi ajustada (`ultCam`, peso de olhar 0,6 no eixo vertical, sem mudar o yaw nem os controles) para a lua aparecer inteira sem esconder o combate.

## Chamas negras
| | Mod 269 | Mod 270 |
|---|---|---|
| Chamas menores | 7, a cada 0,95 s | **10**, a cada 0,85 s (antecipação de 0,36 s) |
| Tamanho da menor | tocha pequena (13 línguas, escala 0,85) | **o tamanho da antiga colossal** (34 línguas, escala 1,05) |
| Colossal | escala 1,05 | **3× (escala 3,15)**; a carga também é 3× e fica erguida acima do bispo |
| Colisão (raio) | 0,45 / 1,25 | 0,9 / 2,4 (altura da cápsula 2,4 / 5,0) |
| Carga final | 8,9 s → disparo 11,4 s | 10,0 s → disparo 12,5 s |
| Dano da menor | 4 | 3 (10 disparos; o total continua justo) |
| Mancha pequena / incêndio | 1,6 m / 5,5 m | 1,8 m / 6,5 m |

- **Contagem genérica:** não há mais o número 7 fixo. A lógica e o VFX usam `BF.shots` (índice da colossal = `T.shots`), e os pools são dimensionados por `BF.shots` e `BF.maxFields` (12 manchas, mais o incêndio).
- **Fogo orgânico:** são as mesmas línguas fluidas da Mod 269, com ondulação em S, núcleo de tinta, contorno prata e violeta e fumaça. A base da forma grande agora é irregular, sem corte reto embaixo.
- **Chão:** os projéteis e a carga descartam fragmentos abaixo do chão (`groundY`), então o fogo não atravessa o chão.
- **Legibilidade:**
  - uma chama gigante perto da câmera fica translúcida (até 25%), para o combate não ficar cego;
  - a explosão no corpo do herói é reduzida (45% nas menores e 26% na colossal);
  - o aviso no chão da colossal continua.

**O que continua igual**
- queimadura não acumulativa;
- contato consolidado;
- ticks de 0,6 s;
- i-frames e dash;
- mira travada e colisão varrida;
- lua inteira até o lançamento da colossal;
- IA alternando com a Hidra;
- teste `?testeDimensao=bishop3&testLuaNegra=1`;
- Skill 1 (Hidra);
- remoção dos poderes genéricos (Mods 264/267/268).

## Testes
- **`node --test`:** 356 testes passando, 0 falhas. Novos testes em `zarkhael-blackflame.test.mjs`:
  - exatamente 10 chamas com 0,75–1,0 s entre elas e antecipação, mais 1 colossal (11 impactos, colossal com índice 10);
  - escalas 1,05 / 3,15 (3×);
  - colisão proporcional;
  - lua sem `gaze`/`stare` e com uma única malha.
- **Equilíbrio:** parado o tempo todo, o herói não morre de uma vez (dano total menor que 100).
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop3&testLuaNegra=1`:**
  - lua inteira no alto, 10 disparos, carga e colossal, aura forte e fim da sequência;
  - FOV restaurado;
  - 0 erros de console.
  - Evidências: `docs/evidencias/mod270/jogo_a..h.png` e as prévias.

## Pesquisa usada
- **Horror surreal e rosto assimétrico:**
  - a leitura vem da própria pintura de referência (aquarela de baixa luz);
  - manchas de aquarela com escurecimento da borda (técnica clássica de "edge darkening" em NPR/aquarela);
  - assimetria forte e olhar desviado (íris deslocada) para o desconforto.
- **Fogo grande sem perder qualidade:**
  - aumentar a forma, não o número de partículas, para manter as draw calls e evitar overdraw (fitas instanciadas por pool);
  - fade por proximidade da câmera para efeitos gigantes, prática comum em VFX de chefes para preservar a legibilidade.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido.
- A lua é uma recriação procedural no shader, comparada com a imagem, não uma cópia da textura.
