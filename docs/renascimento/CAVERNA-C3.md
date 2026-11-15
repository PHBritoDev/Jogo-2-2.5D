# Caverna de Eldória — C3: material, espeleotemas e água

Etapa C3 do `PLANO-CAVERNA-ELDORIA.md`, empilhada sobre a C2 (#534).

## O que muda

| Tema | Antes (C2) | Agora (C3) |
|---|---|---|
| Rocha | `triplanarRock` com faceta plana e cor teal quase uniforme ("plástico escuro") | Um programa só (`caverna-rocha-c3`) para paredes, abóbada, piso, ponte, pilares e lábio do abismo |
| Estratos | Só na forma (C2) | Também na cor: calcário quente e frio alternados, com juntas finas **interrompidas** (sem efeito de tijolo), seguindo as mesmas bancadas inclinadas do SDF |
| Escorrimentos | — | Veios verticais claros de calcita nas paredes íngremes |
| Umidade | — | Rocha mais escura e com brilho perto das poças e sob as frestas; respingos na face de baixo das saliências |
| Musgo | — | Só onde a luz das frestas chega e a face olha para cima |
| Relevo | Facetas da malha | Normais suaves pelo gradiente do campo 3D + bump por derivadas de campos suaves (sem textura extra) |
| Oclusão | — | Assada no Worker: 3 amostras do campo ao longo da normal. As reentrâncias escurecem sem custo no shader |
| Espeleotemas | Cones de 7 lados flutuando sob a folha antiga | Perfis de gota (estalactite) e de pingo espalhado (estalagmite) em calcita úmida, com cachos de canudos. Penduradas no **teto real** do volume 3D (marcha no SDF) |
| Cortinas | — | Fitas de calcita onduladas na abóbada alta junto às paredes (14 no mobile, 26 no desktop) |
| Poças | Disco emissivo "neon" e opaco (bug 4 do plano) | Bacia real com profundidade por vértice: borda rasa transparente, centro verde-azulado escuro, Fresnel, cáusticas e brilho **só onde a fresta toca a água** |

## Regras de jogo preservadas

- Estalactites e cortinas: a ponta fica a ≥ 2,9 m do piso onde se anda. O jogo mede o vão e o publica em `stats().speleo.minClear`: **4,87 m** no mobile.
- Estalagmites: engastadas no pé da parede (o raio não cruza `caveField = 0,75`, a linha onde se anda) e na borda das poças, onde já não se pisa.
- Piso, colisão, câmera (SDF da C2), ponte, abismo, portal, gatilhos, NPCs, jaulas e narrativa não mudam.
- Rollback: `?caverna=0` volta à folha antiga, e os pendurados assentam nela.

## Desempenho (mobile 852×393, SwiftShader; não é FPS de Android)

Jaulas (13 k triângulos cada), tochas (10 k) e cristais-herói (10 k) eram desenhados da caverna inteira; a névoa escondia, mas a GPU pagava. Agora só aparecem perto: jaulas a 55 m, tochas a 42 m e cristais-herói (mobile) a 62 m, com histerese de 4 m.

| Ponto | C2: draw calls / triângulos | C3: draw calls / triângulos |
|---|---|---|
| Entrada | 79 / 212 k | 74 / 163 k |
| Salão | 70 / 192 k | 67 / 152 k |
| Gruta | — | 54 / 161 k |
| Cristal | 75 / 252 k | 66 / 194 k |

Tudo dentro do orçamento do plano: ≤ 90 draw calls e ≤ 220 k triângulos. Antes, a entrada e o cristal passavam do teto.

A malha 3D (mobile) leva 438 ms no Worker, incluindo normais e oclusão. Fora da thread principal.

## Testes

- `tests/caverna-c3.test.mjs` (5):
  - normais apontam para o ar e são unitárias;
  - a oclusão marca reentrâncias reais;
  - regra das cortinas: vão ≥ 3,4 m, espaçamento e determinismo;
  - perfis dos espeleotemas;
  - frestas dentro da caverna;
  - contrato de integração.
- C1 e C2 continuam passando. O contrato da C2 foi ajustado para o campo exposto como valor (`makeGridSDF`).

## Evidência

`evidencias/caverna-c3/jogo-9-pontos-c2-vs-c3.jpg`: os 9 pontos da baseline, C2 à esquerda e C3 à direita, no mesmo enquadramento. A luz ainda é a antiga, escura e azul-petróleo; ela muda na C4.
