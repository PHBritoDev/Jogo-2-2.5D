# Novo protagonista — catálogo verificável de animações (Prota.glb)

**Fonte primária:** arquivo `Prota.glb` entregue pelo criador em 2026-11-07, acompanhado de `1000363890.mp4` (8,41 segundos, tela Meshy > Animações adicionadas). **Não confundir com o antigo `Protagonista.glb` existente no projeto.**

## Inventário exato do GLB

Arquivo original: **60.801.132 bytes** (~58,0 MiB). glTF 2.0 / GLB, **1 malha**, **1 skin / 73 ossos**, **19 animações**, **3 imagens PNG 4096×4096** (normal, base color e metallic-roughness). Nomes abaixo foram extraídos diretamente do JSON do arquivo, não inventados a partir de miniaturas.

| # | Identificador exato no GLB | Duração (s) | Interpretação / uso pretendido |
|---|---|---:|---|
| 1 | `Running` | 0,63 | Corrida (loop a conferir) |
| 2 | `Walking` | 1,03 | Caminhada (loop a conferir) |
| 3 | `_01a1b3e4_6f0c_705b_82f5_e9447d85cbef` | 4,97 | Nome opaco no GLB; **possível Idle**, verificar reprodução |
| 4 | `_01a1b3e6_e46e_7367_9007_2e104dc2e6b7` | 2,47 | Nome opaco no GLB; **possível Hit Damage**, verificar reprodução |
| 5 | `_360_Power_Spin_Jump` | 3,03 | Salto com giro de poder de 360° |
| 6 | `Combat_Stance` | 1,67 | Postura de combate |
| 7 | `Dead` | 2,97 | Morte |
| 8 | `Jump_Over_Obstacle_2` | 0,87 | Salto sobre obstáculo |
| 9 | `Quick_Step_and_Spin_Dodge` | 1,17 | Esquiva com passo rápido e giro |
| 10 | `Roll_Dodge_1` | 1,27 | Esquiva em rolamento |
| 11 | `Run_Jump_and_Roll` | 3,43 | Corrida, salto e rolamento |
| 12 | `Skill_03` | 1,63 | Habilidade 3 (movimento a conferir) |
| 13 | `Triple_Combo_Attack` | 4,33 | Combo triplo de ataques |
| 14 | `Walk_Backward` | 0,87 | Caminhar para trás |
| 15 | `Walk_Forward_with_Bow_Aimed` | 1,20 | Caminhar para frente mirando arco (pode não ser adequado ao kit de espada) |
| 16 | `Weapon_Combo` | 3,67 | Combo de arma |
| 17 | `Weapon_Combo_1` | 3,50 | Combo de arma variante 1 |
| 18 | `Weapon_Combo_2` | 4,50 | Combo de arma variante 2 |
| 19 | `slide_right` | 1,73 | Deslizamento para a direita |

**O vídeo** apresenta miniaturas de movimentos nomeados na UI do Meshy, incluindo Idle, reação a dano, ataques e esquivas; ele **não prova sozinho a correspondência** das duas animações de UUID. Reproduza os clipes 3 e 4 em um visualizador para confirmar antes de renomear.

## Compactação entregue ao criador

Arquivo separado fora do repositório: `Prota_otimizado_2K.glb`. Resultado obtido pela recompressão **exclusivamente das três texturas**, preservando byte a byte todos os buffers de geometria, skin e animações. PNG normal 4096→2048 (PNG sem perdas adicionais após redimensionamento); base-color 4096→2048 JPEG q93; metallic-roughness 4096→2048 JPEG q93. Original 60.801.132 bytes; otimizado **21.977.932 bytes** (~20,96 MiB), redução ~63,9%.

**Não se trata de equivalência visual garantida**: houve redução da resolução de textura e JPEG é com perdas. Testar visualmente antes de usar em produção, sobretudo costuras, normal map e canais metálico/roughness. O GLB mantém as 19 animações, nomes, durações, ossos e geometria. A extensão `KHR_texture_basisu` não foi usada; as texturas JPEG/PNG são suportadas por GLTFLoader.

## Recomendações de integração

1. **Não substituir** `Protagonista.glb` de imediato. Importar `Prota_otimizado_2K.glb` numa página/laboratório 3D isolado.
2. Validar cada um dos 19 clipes por nome exato, com câmera de corpo inteiro e sem espada mesclada ao modelo; confirmar especialmente os UUIDs.
3. Medir escala, origem, orientação frontal, altura, root motion, nós/ossos e retarget antes de trocar player.
4. Verificar deformação de capa/capuz, deslizamento de pés, blending/loops, frames de impacto e sincronização de hitboxes.
5. Preservar o arquivo original do usuário como referência; **não colocar a versão original de 58 MiB na main**.
6. Para celular, testar tempo de download, pico de memória, draw calls e FPS no dispositivo real. A compressão do arquivo **não garante** o mesmo ganho na memória da GPU.
7. Os dois pontos vermelhos dos olhos, se desejados, podem ser reforçados por material emissivo e luz/VFX em runtime, sem comprometer rig ou a capacidade de animação.

**Status:** catálogo e contagem inspecionados no GLB; não é laudo de qualidade visual das animações ou de integração no jogo.
