# Caverna subterrânea de Cinzária

## Estado de partida · Mod 332

| Contrato | Fonte e implicação |
| --- | --- |
| Entrada da ilha | `act2StoryLabel` e `act2StoryInteract` verificam distância ao `DISTRICT_SPOTS.volcanoGate`, inimigos e etapa. `travelVeil` chama `enterVolcano`. O TP do ADM usa o mesmo interior. |
| Geometria e luz | `getDimArena('vulcao')` conserva uma instância de `buildDimensionArena`. O construtor `THEMES.volcano` em `dimension-arenas3d.js` desenha túnel, calçada, sala, laboratório e trono. `updateVoid` aplica a luz e névoa à cena compartilhada. |
| Objetos de campanha | `VOLCANO` fornece posições locais. `volcanoLocal` aplica o centro mundial. Cela e vítimas, círculo, porta da chave, ouro, cinco inimigos da galeria, trono, estátuas, mini-chefe e portal têm consumidores próprios em `mundo-3d-prototype.js`. |
| Saves e regresso | `volcanoCheckpoint(sub)` seleciona entrada, laboratório, galeria ou trono. A vitória abre o portal de VORGAZHEK através de `syncVolcanoPortal`. |
| Física | `blockedAt` consulta `voidSpec.walk`. `terrainHeightAt`, `updatePlayerMovement` e o braço da câmera admitem superfícies, teto e colisores locais. A Ascensão já possui queda e retorno ao checkpoint. |
| Calor | `refs.lavaHeat` alimenta `updateLavaContact`, que usa o relógio de jogo, HP, i-frames e HUD existentes. |
| Recursos | `CristalCaverna01.glb` contém uma malha indexada com 10.329 triângulos e material BakedMaterial. Extensão local de 1,90 × 1,85 × 1,77. `TochaMedievalTripo.glb` tem 9.972 triângulos, base em Y=0 e altura de 1,00. Ambos são GLBs binários texturizados. |

A caverna anterior tem piso plano na rota, patamar no lago e corredor central estreito. Bosque e abismo exploráveis não existem nela. As três vistas originais registram os eixos de entrada, magma e aproximação do trono.

## Propriedade

Os módulos de cenário e colisão do vulcão pertencem a esta missão. O construtor de arenas e o controlador do mundo são compartilhados. Mudanças nesses arquivos exigem comparação com a base antes da integração. IA, rigs, ataques, dimensões dos Bispos e a missão do Claude ficam sob seus responsáveis.
