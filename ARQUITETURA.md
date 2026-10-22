# Estrutura do jogo — Galáxia 1 (mundo 3D)

O jogo é **100% 3D** (Three.js 0.160). O antigo mundo 2D em Canvas foi removido no Mod 202:
a dimensão de Valério e as dos demais Bispos acontecem dentro do mesmo mundo 3D, com os mesmos
HUDs, combate, câmera, habilidades, vida e corações.

## Arquivos

- `index.html` — hospeda o mundo em um iframe (repassa `?debug3d=1`, `?galaxias=1`, `?resetGalaxy1=1`).
- `mundo-3d-prototype.html` / `.js` / `hud3d.css` — mundo, combate, HUD, loja, mapa, perfil. `mod181-loader.js`
  carrega o `.js` como texto, reescreve caminhos de módulos/ativos com o token de cache (`BUILD`) e o importa por Blob.
- Regras puras (testadas com `node --test`): `world3d-terrain.js`, `skills3d.js`, `map3d.js`, `progression3d.js`,
  `galaxies3d.js`, `hearts3d.js`, `sidequests3d.js`, `act1-flow.js`, `act2-flow.js`, `acts34-flow.js`,
  `finale-flow.js`, `dimensions3d.js`.
- `dimension-arenas3d.js` — geometria procedural das arenas e dos portais (recebe o `THREE` por parâmetro e só cria
  objetos quando a dimensão é aberta).
- `shop-icons3d.js` — arte própria (SVG) das Palavras, ultimates, espadas e categorias da Loja e do HUD.

## Dimensões dos Bispos

`DIMENSIONS` (em `dimensions3d.js`) define nome, fala, foto, arena e tema de cada uma:
1 Valério (câmara macabra de moedas), 2 VORGAZHEK (vazio de olhos vermelhos e lua sorridente),
3 ZAR'KHAEL (cogumelos de olhos sobre piso xadrez), 4 VÉRAXION (corredor torto de claraboias) e
5 Ganância (caverna de raízes e olhos; é o Pecado, não um quinto Bispo).

Fluxo: portal no mundo → `startDimensionBattle(key)` → cartão **jogador VS Bispo** (foto do herói, foto do Bispo,
nome e fala) → arena abaixo do mundo (`voidMode` + `voidSpec`) → luta com o motor normal → vitória/sem corações →
volta ao portal. Durante o cartão (mundo parado) a arena, o modelo e as texturas são preparados e os shaders
compilados, para a luta nunca travar. Quedas gastam um coração; sem corações o portal expulsa o jogador.

## Dia e noite

Relógio contínuo (`gameClock`): 24 h de jogo = 16 min reais, 12 h de dia + 12 h de noite. Nenhuma etapa força a
noite. Braseiros (`BRAZIER_SPOTS`) iluminam os pontos de luta com 4 chamadas de desenho e uma única luz móvel.

## Desempenho (regras do projeto)

- Nunca ligar/desligar luzes ou sombras em jogo (recompila shaders). No modo Auto só a resolução varia.
- Shaders do mundo compilam em `precompileWorld()` enquanto a tela de galáxias está aberta.
- Instâncias de árvores passam por `registerInstanceCull` (raio + frente da câmera, com LOD distante para carvalhos);
  moradores e modelos pesados são ocultados longe do jogador; a grama usa tufos de ~30 triângulos.
- Ativos grandes têm versão leve (`*-lod.glb`, `*-ui.webp`); os originais permanecem no repositório.
- Use `?debug3d=1` e `SevenSinsDebug3D.triBreakdown()` para ver onde estão os triângulos.

## Marcadores de versão

Ao mudar código: incremente o número visível (`#marker`), `BUILD` em `mod181-loader.js`, `?v=` em
`mundo-3d-prototype.html` e `refresh/build` em `index.html`.
