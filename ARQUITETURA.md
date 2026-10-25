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
  `finale-flow.js`, `dimensions3d.js`, `prologue-flow.js` + `cutscenes3d.js` (diretor de cenas), `sewer3d.js` (esgoto do Ato I).
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

## Ato I (Mod 204)

Roteiro do autor em `docs/roteiro/M2-ATO1.md`. As cenas são dados em `act1-flow.js` e rodam no diretor (`cutscenes3d.js`)
com câmera por atores; etapas 1–8 com sub-etapas (`act1Sub`). Lutas em grupo: um inimigo luta e os demais esperam
visíveis (`startPack`). O esgoto é uma área abaixo do mundo (tema `sewer`, colisão por `sewerWalkable`) com o portal de
Valério no fim. Modelos: `VilaKit.glb`, `MoradoresPose.glb`, `Enemy2-rig.glb` (scripts em `tools/blender/`).

## Ato II (Mod 205)

Roteiro do autor em `docs/roteiro/M3-ATO2.md`. Cenas em `act2-flow.js` (etapas 8–14, sub-etapas em `act1Sub`).
Cidade Cinzária a oeste (`DISTRICT_SPOTS`); depois de VORGAZHEK ela vira ruína e abismo (`act2Abyss`, bloqueado).
O interior do vulcão é uma área abaixo do mundo (dimensão `vulcao`, tema `volcano`, colisão por `volcanoWalkable`,
porta liberada pela chave) com laboratório, sala do ouro, salão, trono e o portal de VORGAZHEK. A visão da erupção
mostra o mundo por alguns segundos no meio da luta (`visao-inicio`/`visao-fim`). Modelo novo: `Misteriosa-rig.glb`.

## Ato III (Mod 206)

Roteiro do autor em `docs/roteiro/M4-ATO3.md`. Cenas em `act3-flow.js` (etapas 15–19); lugares, colisão, frio e casaco
em `snow3d.js`. A cidade de neve (Invernália) ocupa o vale leste; o motor antigo de etapas (`acts34-flow.js`) ignora
15–20 e o jogo volta a ele no passo 21 (Ato IV). Três áreas abaixo do mundo: estalagem (`inn`), caverna de gelo
(`icecave`) e dimensão distorcida (`distorted`, controles invertidos). Casaco: `Casaco.glb` sem esqueleto, ligado ao
esqueleto do herói em tempo de execução (`attachCoat`). Rig `anjo`: AnjoGuia com clipes emprestados do Protagonista
(`RIG_DEFS.*.extra`). Modelos novos: `NeveKit.glb`, `Casaco.glb` (scripts em `tools/blender/m4_*.py`).

## Ato IV (Mod 207)

Roteiro do autor em `docs/roteiro/M5-ATO4.md`. Cenas em `act4-flow.js` (etapas 21–24; na torre, `act1Sub` = piso);
lugares e colisão em `tower3d.js`. A torre (`TorreKit.glb`, script `tools/blender/m5_torre.py`) fica na antiga Serra;
cada piso é a mesma área abaixo do mundo (tema `tower`), redecorada. O motor antigo ignora 15–25; depois do Ato IV o
jogo segue para o arco final antigo (passo 27). Pergaminho: `scrollMul()` no dano da espada.

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
