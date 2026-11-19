# Fauna do Ato I

Cada vídeo WebM mostra o canvas do jogo em Chromium. O teste aproxima o jogador por teleporte e acompanha o animal com a câmera de QA. O spawn de inspeção passa pelas verificações de bioma, solo, água, lava, estrada e obstáculos. A câmera começa de frente e passa para a lateral. O relógio da simulação roda a 2× para registrar também o retorno das aves. Os arquivos JSON registram a reação, o pouso, as contagens simultâneas, a memória do heap JavaScript e a taxa de quadros observada durante a gravação.

| Modelo da main | Juntas | Movimento |
| --- | ---: | --- |
| Coelhinho.glb | 28 | Respiração, cabeça e quatro pernas, saltos com deslocamento e fuga |
| Passaro_Vale_Dourado.glb | 34 | Observação, bicada, asas, voo curto e pouso |
| PassaroMontanha.glb | 24 | Ombros articulados, batida, planeio e pouso na serra |
| PassaroLava.glb | 30 | Ombros articulados, decolagem e pouso em encosta seca |
| Grilo.glb | 0 | Malha instanciada com salto, inclinação e pouso |

Cada GLB contém uma malha, um material e zero clipes. As aves buscam a superfície dos rochedos instanciados próximos. Na ausência de um poleiro adequado, pousam no terreno do habitat. Na qualidade baixa há no máximo um indivíduo por espécie e o grilo visual fica desativado. O teste desktop confirma seu desaparecimento durante o dia.

Para repetir, sirva a raiz do projeto em HTTP e execute `tools/visual-lab/fauna-19-smoke.cjs` com Node, Playwright, Chromium e ffprobe. Use `FAUNA_URL` para indicar a página do mundo com `?debug3d=1`. A opção `--mobile` emula viewport horizontal e ponteiro de toque. Os FPS foram medidos com SwiftShader, sem GPU dedicada. A medição de memória cobre o heap JS e a contagem de draws da fauna é independente da contagem do mundo.

O percurso independente `fauna-19-habitats.cjs` desloca o jogador entre células e aguarda o controlador normal, sem chamar o spawn de inspeção. As cinco espécies apareceram por esse caminho. Os pontos e biomas estão em `habitats.json`.
