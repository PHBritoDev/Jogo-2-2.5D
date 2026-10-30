# Mod 235 — Ruptura em X, Portais, Dragão e corrida

O briefing solicitado como Mod 234 foi integrado sobre `3d145b459f640fcfd36204687aa68c60d22124e3`, que já continha outra Mod 234. Esta entrega usa **235** para preservar o trabalho existente de câmera, espadas e combate em movimento.

## Referências e implementação

Foram inspecionados o vídeo compacto de 19,42 s (montagem dos quatro testes enviados), seus 20 quadros de contato e a imagem do dragão celestial do ZIP. A comparação orientou a correção da espada vertical, do X pequeno/rápido, dos projéteis finos e do corpo segmentado do dragão. Os arquivos originais enviados não foram adicionados ao jogo.

- **Ruptura em X:** duas lâminas curvas com volume e formação defasada, dimensão visual aproximadamente dobrada, ruído animado, descargas negras e velocidade de 16 unidades/s. A onda atravessa o alvo e continua até 7 m, respeitando o alcance total. Política explícita: somente o alvo do encontro travado recebe um acerto; não há dano adicional a outro encontro. Colisão considera as diagonais, com varreduras do centro e das bordas contra cenário. Impacto usa fragmentos sólidos e fissuras temporárias, sem anel chapado.
- **Portais da Perseguição:** 24 projéteis, três ondas e oito padrões de trajetória, disparos/voos distribuídos por aproximadamente 7,5 s; cabeças volumétricas, caudas e impactos individuais. Convergência/compressão precede uma explosão maior. Dano base permanece limitado a 58 (36 nos projéteis + 22 no finalizador); arredondamento acumulado evita multiplicar dano ao aumentar a quantidade. Reações físicas são espaçadas para não reiniciar animação a cada quadro.
- **Dragão do Julgamento:** corpo contínuo de até 58 m, crista e línguas de fogo, crânio largo, chifres curvos, olhos, presas e mandíbula articulada. Canalização de 1,35 s em carmesim/violeta, ascensão espiral até cerca de 20 m, esfera negra/carmesim com colisão própria, mergulho, mordida, compressão e explosão. Sequência completa aproximadamente 10,5 s; o herói pode voltar a se mover após a canalização. Dano base preservado em 66 (16 + 22 + 28); bosses não são movidos. Alvos fora de alcance não provocam perseguição ilimitada. A câmera amplia o enquadramento em terceira pessoa sem reescrever yaw, pitch ou zoom escolhidos pelo jogador.
- **Corrida:** `Protagonista-corrida-235.glb` foi realmente gerado com Blender 4.3.2, não apenas o script. Contém exclusivamente `Hero_Run`, sobre os ossos originais, ciclo de 0,68 s, espada mais baixa, contrabalanço do braço livre, recuperação elevada do pé e fase de apoio linear. Não substitui os clipes de combate 232. Nenhum canal de escala nem translação horizontal do root foi adicionado.
- **Mão/espada:** a pose procedural é aplicada antes da atualização do encaixe na mão. O viewmodel em primeira pessoa acompanha a canalização. A correção preserva corrida contínua e ataques em movimento.

Os módulos das três habilidades celestiais anteriores e da Ultimate permanecem intactos. A documentação permanente, os atos, saves, loja e dimensões não foram removidos. Apenas a pasta temporária deste briefing é retirada na entrega.

## Evidências executadas

Os resultados e capturas estão em [`evidencias/mod235/`](evidencias/mod235/). Os scripts de QA ficam em `tools/qa/`.

| Verificação | Resultado |
| --- | --- |
| `node --test` | 221 testes passaram; zero falhas, ignorados ou cancelados |
| `node --check` / `git diff --check` | Sintaxe dos 11 JS alterados/novos e espaços verificados |
| `python3 tools/qa/check_run235_asset.py` | 83 amostras, 53 canais, quaternions finitos/normalizados, sem escala animada; deslocamento horizontal do quadril abaixo de 0,000001 m |
| Chromium, jogo real em 844 × 480 com toque emulado | As três habilidades lançadas pelos espaços do jogo; mana 26/40/55; dano observado 38/49/66; término e ausência de erros de JavaScript/shader |
| Dano dos portais no cenário | 49 porque seis projéteis encontram obstáculos; 58 confirmado na simulação sem obstáculos. A colisão não foi desativada para obter o teto |
| Encaixe da espada | Prota, Aurora e Quantum; fases da corrida e conjuração; erro de posição zero nos casos medidos |
| Combate em movimento | Seis combinações de espada e 1ª/3ª pessoa; deslocamento preservado durante ataque e espada acompanhando a mão |
| Interrupções | Pausa mantém relógios; perda de contexto WebGL simulada cancela efeitos; testes de morte/perda de alvo, cena inválida, reset, paredes, alvo móvel/boss e alcance |
| Repetição dos VFX | 18 reativações por habilidade entre três qualidades; contagens de geometrias/programas estáveis após aquecimento; sem erros de console/shader |
| Custo da cena isolada | Nos instantes amostrados: X 13 draw calls; portais 17; dragão 25–29. Incluem três chamadas da cena de referência. Até 14.738 triângulos nessas amostras |

O vídeo [`skills-235.mp4`](evidencias/mod235/skills-235.mp4) registra os efeitos renderizados em sequência, com simulação capturada a 10 quadros/s; **não é uma medição de FPS do dispositivo**. As capturas `game-*` mostram integração no mundo e os modelos reais. Os pools, malha contínua, instâncias e limites por qualidade reduzem trabalho e alocações; o cenário existente continua contribuindo para o custo total.

Limites reais: testes visuais realizados em Chromium com SwiftShader, não em aparelho Android. Não foi medida autonomia/temperatura nem taxa de quadros em celular. Os atos completos não foram rejogados manualmente; a regressão narrativa coberta é a dos testes existentes. A perda de contexto foi disparada sinteticamente, não causada por falha física da GPU.

## Reprodução

Na raiz, executar `python3 -m http.server 8775`; em outro terminal, `python3 tools/qa/refinement235_browser.py` e `python3 tools/qa/refinement235_movement.py`. A prévia e o ensaio de pools são reproduzidos por `python3 tools/qa/refinement235_preview.py`. Dependências de QA: Chromium, Playwright Python, NumPy/SciPy para o GLB e FFmpeg para o vídeo. Blender só é necessário para regerar o asset.

[Treino direto](https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?testeQuantum233=1&v=235). O parâmetro antigo do treino foi mantido por compatibilidade; o marcador visível deve mostrar **235**.
