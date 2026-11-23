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

Amostragem de partida em Chromium/WebGL com SwiftShader, viewport de 800 × 450 e 12 intervalos de animação por vista. Entrada com 95 chamadas e 96.809 triângulos; patamar com 122 e 382.498; cela com 76 e 356.938; trono com 106 e 361.666. A câmera de QA posicionou o personagem em cada amostra. Os scripts narrativos reassumiram a câmera na cela e no trono. [Capturas da versão publicada](evidencias-vulcao/antes.jpg)

## Reconstrução da Mod 337

A entrada continua no flanco de Cinzária. A partir da boca, o jogador desce 21 m até o bosque, cruza o espaço das vítimas e chega ao trono pelo abismo. O mapa usa metros locais. Os polígonos das passarelas alimentam tanto a malha visível quanto a consulta de apoio. O cenário mantém os deques carregados durante a troca de setores.

| Região | Composição e orientação | Revisões após inspeção |
| --- | --- | --- |
| Santuário das Cataratas de Fogo | O parapeito conduz o olhar aos patamares de basalto e ao aqueduto distante. Os vertedouros laranja iluminam a pedra ao redor. Cristais frios e o astrolábio quebrado marcam o terraço alto. | A travessia revelou uma viga que interceptava a descida. A viga passou para baixo do nível de circulação. As quedas ganharam leito e ombreiras de rocha. |
| Bosque das Veias Ardentes | Quatro silhuetas carbonizadas enquadram o riacho, o cristal lilás e as clareiras. Três circuitos se reencontram antes dos vestígios dos prisioneiros. | Galhos próximos ganharam curvatura e os distantes perderam subdivisões. As marcas de arrasto também aparecem na convergência dos caminhos. |
| Abismo das Coroas Mortas | Torres e raízes recortam a névoa cinza. A passarela fraturada deixa o vazio visível dos dois lados. Fendas rubras levam o olhar do chão ao trono. | A captura na entrada revelou um paredão do bosque dentro do corredor de visão. O paredão foi deslocado e a tomada foi repetida. |

As nove vistas usam o construtor real da arena em um visualizador WebGL com câmera dirigida. As imagens registram o resultado estilizado e permitem comparar as silhuetas e a iluminação. [Ver os três biomas](evidencias-vulcao/tres-biomas.jpg)

## Evidência de física, câmera e recursos

- **Lava.** O controlador de movimento e dano rodou a 30, 45 e 60 passos por segundo com o relógio dos i-frames controlado. Em cada ensaio, 3 s de contato retiraram 114 de 500 HP. O ensaio restaurou a vida para medir o residual separadamente. Quatro segundos em terra retiraram mais 28 HP em quatro ticks. A reentrada renovou a queimadura, que expirou após a saída. Pausar pelo teclado congelou o relógio. A invulnerabilidade impediu novo dano.
- **Abismo.** Cinco quedas em posições diferentes zeraram a vida. O jogo devolveu o personagem ao checkpoint local (0, −68), em piso firme. O ensaio posicionou o herói junto aos pontos de queda e deixou a gravidade e o respawn agirem.
- **Câmera.** Uma tomada da arcada penetrava a rocha. O vulcão passou a usar o braço de câmera que verifica o volume entre personagem e câmera. Na repetição em oito pontos e três orientações, os 24 pontos finais estavam livres. Nenhuma das 456 sondagens intermediárias encontrou interseção. A travessia anterior alternou primeira e terceira pessoa entre a entrada e o bosque.
- **Controles.** O teclado e o joystick por toque moveram o personagem. Após o toque em Pulo, a leitura física registrou o herói no ar. O ensaio acionou também Dash e Ataque. Essa amostra de entrada, isoladamente, não mede a eficácia de um golpe.
- **WebGL.** Nos seis ciclos de construção, renderização e descarte da arena isolada, o renderer passou de 40 geometrias e 14 texturas para zero em ambas as contagens. Cada ciclo percorreu 1.453 amostras do grafo com os colisores reais montados. No mirante, o LOD dos GLBs reduziu a vista de 157.838 para 62.195 triângulos. Na versão final, as vistas de mirante, bosque e espinha usaram respectivamente 7, 32 e 6 chamadas de desenho da arena.
- **Regressão.** 53 testes Node passaram localmente, cobrindo os Atos I e II, dimensões, progressão, marcador da build, apoios, calor e porta da chave. O teste antigo verificava coordenadas da calçada reta que o novo santuário substituiu. Ele passou a verificar a nova passarela, o espaço sem piso, os respiradouros e o mesmo checkpoint de entrada.

A branch incorporou a main da Mod 336 por merge de três vias no controlador compartilhado. As mudanças dos Bispos 3 e 4 vieram da própria main. O código da missão permanece nos módulos da caverna e nos adaptadores de terreno, câmera e campanha. A verificação isolada pode ser repetida em [Auditoria WebGL](../../tools/qa/volcano-cave.html).

## Campanha e gravação

O ensaio começou na ilha, do lado de fora da boca, com a etapa de entrada já desbloqueada. A interação **Entrar no vulcão** carregou o interior. O personagem desceu as cataratas, percorreu o circuito oeste do bosque, viu as cenas, derrotou os três guardas, usou a chave, cruzou a galeria dos cinco e venceu o mini-chefe. O objetivo mudou para a etapa 13 e a interação do portal abriu o cartão VS de VORGAZHEK. A gravação usa o framebuffer do navegador com o HUD e as cenas do jogo. A automação orientou o movimento, avançou as falas e usou invulnerabilidade e dano assistido nos encontros. A travessia interna ocorreu sem teleporte. O vídeo traz o marcador 336 da branch antes de sua renumeração para 337.

O fluxo de apresentação do Bispo 2 usa um import map próprio. O carregador de GLB agora é importado sob demanda ao construir o vulcão. O visualizador original do Bispo 2 voltou a inicializar apenas com Three.js básico, com os onze observadores presentes. [Auditoria da física e dos recursos](evidencias-vulcao/auditoria.json)

O vídeo da rota condensa 6 min 53 s de captura em 84 s. A gravação complementar mostra a saída da plataforma e o retorno ao checkpoint. Em um navegador separado, um save de campanha V6 anterior à reconstrução abriu na etapa 12, subetapa 3, com 173 moedas. A entrada física levou à galeria em (0, −34), preservando a etapa, a subetapa e as moedas. [Travessia](evidencias-vulcao/travessia.mp4) · [Queda e retorno](evidencias-vulcao/queda.mp4)

## Integração

A suíte própria da caverna, a verificação da build e o render do Bispo 2 passaram no GitHub após a correção do carregador. O workflow do Bispo 3 falhou na instalação do navegador. A versão de Playwright fixada nessa suíte recusa Chromium em Ubuntu 26.04. A PR continua em rascunho com o briefing preservado até a liberação do CI e a aprovação visual. [CI da caverna](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366423) · [Build central](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366333) · [QA do Bispo 2](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366432) · [Falha do Bispo 3](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/44939366314)

## Perfil do jogo completo

Chromium com SwiftShader em CPU compartilhada. O ensaio selecionou o perfil gráfico baixo, com viewport móvel de 720 × 405 ou desktop de 1024 × 576. Cada região teve três posições, aquecimento de 12 quadros por posição e três janelas de 12 intervalos. A terceira posição solicitou dois Enemy2. Os percentis agrupam os 108 intervalos de cada região. O heap é o valor que Chromium expõe ao JavaScript.

| Perfil | Região | FPS mediano | p95 / p99 (ms) | Draw calls | Triângulos | Geometrias / texturas (máx.) | Heap (MiB, máx.) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | santuario | 1.5 | 1883 / 8483 | 61–107 | 191.930–370.033 | 878 / 105 | 190 |
| mobile | bosque | 1.7 | 1250 / 1433 | 96–103 | 282.312–344.940 | 884 / 105 | 190 |
| mobile | abismo | 1.8 | 1117 / 1283 | 67–80 | 239.885–256.313 | 884 / 105 | 190 |
| desktop | santuario | 1.9 | 1000 / 1200 | 63–109 | 191.930–370.033 | 893 / 106 | 190 |
| desktop | bosque | 2.9 | 717 / 1217 | 98–105 | 282.312–344.940 | 899 / 106 | 190 |
| desktop | abismo | 3.3 | 567 / 750 | 69–82 | 239.885–256.313 | 901 / 107 | 190 |

As pausas incluíram carregamento de recursos e disputa de CPU com a captura. Esses valores caracterizam o executor por software. O desempenho em Android físico e a meta de 40–60 FPS no Galaxy A55 continuam sem medição.

Os 27 registros de cada perfil incluem contadores WebGL, heap, intervalos individuais e número de inimigos ativos. O valor de FPS é 1.000 dividido pelo intervalo mediano em milissegundos. A carga de combate manteve dois atores vivos nas amostras previstas. [Medições por execução](evidencias-vulcao/perfil-webgl.json)

## Revisão da profundidade dos três biomas em 22/11/2026

O Santuário da versão anterior terminava visualmente na primeira arcada. O Bosque deixava ver o fundo entre troncos parecidos. No Abismo, o portal dominava o quadro antes que o jogador percebesse o desnível. As capturas abaixo usam a câmera do jogo com HUD, em três posições correspondentes por região. A casca local do jogo usada nas fotos é a Mod 344. A gravação do CI identifica o commit de cada versão em `sha.txt`. [Antes e depois](evidencias-vulcao/revisao/comparacao.jpg) · [Medições brutas](evidencias-vulcao/revisao/medicoes.json)

| Região | Escala /25 | Ícones /25 | Luz /20 | Materiais /15 | Composição /10 | Leitura móvel /5 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Santuário das Cataratas de Fogo | 22 | 22 | 16 | 10 | 8 | 4 | 82 |
| Bosque das Veias Ardentes | 21 | 21 | 16 | 11 | 8 | 4 | 81 |
| Abismo das Coroas Mortas | 22 | 22 | 16 | 10 | 8 | 4 | 82 |

Avaliação artística do autor da revisão, por comparação com as três imagens fornecidas pelo criador. No Santuário, o coro elevado e as pontes recortam a caldeira atrás do altar. As estátuas enlutadas e os vertedouros dão escala à descida. A rocha tem menos detalhe fino que a referência. No Bosque, seis famílias de troncos colocam veios incandescentes no primeiro plano e costelas de basalto contra a fenda fria ao fundo. A névoa é mais simples que na pintura. No Abismo, contrafortes espinhosos cruzam o vazio em profundidades diferentes, as placas quebradas mostram sua face inferior e as torres afunilam ao fundo. O portal e o HUD ocupam mais espaço no enquadramento da chegada.

A rota principal passou de 278,1 a 401,5 m. As 38 ligações da revisão incluem o coro, o braço da cisterna e o desvio pelo relicário. A locomoção usa os mesmos apoios de ponte e degrau que o teste de física. O primeiro save importado manteve a etapa 12, subetapa 3 e 173 moedas. O botão de TP ADM levou à nova entrada. Cinco quedas levaram ao checkpoint do abismo, as 24 poses de câmera ficaram fora da rocha e o deslocamento variou menos de 3 cm entre simulações a 30, 45 e 60 passos por segundo em primeira e terceira pessoa.

Os lotes de árvores, cristais e tochas são selecionados pela câmera final de renderização, inclusive após giros cinematográficos com o personagem parado. As silhuetas de fundo têm geometria e iluminação calculada nos vértices. O ensaio da arena fez 2.090 sondagens por ciclo. Ao fechar, 53 geometrias e oito texturas retornaram a zero em cada uma das seis repetições. As três tomadas do teste usaram 11, 39 e seis chamadas da arena. [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) · [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) · [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

As medidas de tempo foram coletadas em Chromium no Linux com SwiftShader. O perfil isolado sincroniza a GPU via leitura de um pixel em 480 × 270. O perfil de jogo usa 720 × 405 com HUD, gravação e amostras de heap. As medições em Android físico e a confirmação de FPS no Galaxy A55 permanecem pendentes.


Na rota direta, a física do jogo em passos de 1/60 s mediu 99,0 → 142,8 s caminhando e 40,95 → 59,25 s correndo. Na campanha gravada, incluindo desvios e encontros com assistência de dano, a base percorreu 313,2 m em 469,9 s e a revisão percorreu 509,8 m em 692,4 s. Ambas abriram o portal de VORGAZHEK com zero exceções JavaScript. A passagem pelo portão às 8 h e às 20 h manteve a cor e o alcance da névoa próprios de cada bioma. [Vídeos e telemetria da campanha](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45059626989)

No ensaio isolado por software, o p95 da revisão foi 402 ms no Santuário, 446 ms no Bosque e 272 ms no Abismo. No Abismo, a mediana subiu de 191 para 229 ms, mesmo com a redução de 102 mil para 71 mil triângulos. A variação entre execuções limita a extrapolação desses tempos para aparelhos.
