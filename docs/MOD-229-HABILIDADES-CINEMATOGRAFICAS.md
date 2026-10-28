# Mod 229 — Skills 2 e 3 e Ultimate cinematográficas

A Skill 2 (Chuva de Estrelas), a Skill 3 (Tornado da Fênix) e a Ultimate (Julgamento Divino: Colapso da Luz Eterna) foram reconstruídas. Os efeitos não foram só ampliados: material, geometria, coreografia e reação do ambiente foram redesenhados. A lógica de combate continua separada do visual. O dano roda num passo fixo de 120 Hz e o VFX nunca aplica dano.

## Base comum: `celestial-fxkit3d.js`

Os três efeitos usam os mesmos sistemas:

- **Partículas billboard instanciadas.** A forma é desenhada no fragment shader: brilho gaussiano, fumaça com ruído, cintilação de 4 pontas ou brasa alongada. Por isso nunca aparecem quadrados.
- **Decalques no terreno**, alinhados à normal do chão (calculada por diferenças finitas):
  - onda de choque;
  - marca de energia com glifos que esfriam;
  - poça de luz, que substitui luzes dinâmicas.
- **Fitas viradas para a câmera** com largura e cor por ponto: rastros, raios e filamentos.
- **Raio ramificado determinístico** escrito num buffer fixo.

Os buffers são alocados uma vez. Não há alocação por quadro nem luzes novas, que obrigariam a recompilar os shaders.

## Skill 2 — Chuva de Estrelas Celestiais

- **Selo:** três camadas empilhadas em profundidades diferentes, de 1,75 a 5,3 m de raio (cerca de 1,4 vez o anterior), com inclinação, contrarrotação e trilhos concêntricos.
  - As runas do alfabeto inventado são desenhadas no shader e acendem em sequência.
  - Um pulso viaja para fora, arcos de energia ligam as camadas e há partículas em órbita.
- **Carga:** um núcleo se condensa e uma hélice de luz sobe da mão até o selo.
- **Estrelas:** cristal 3D de 4 pontas, uma geometria facetada com fresnel e volume real. Têm halo, cauda em três faixas (azul, dourada e núcleo branco) e cintilações.
  - A última estrela de cada salva é **pesada**: maior, dourada, com mais estilhaços e um tremor sutil.
- **Impacto** no ponto exato da colisão, já assentado no terreno:
  - clarão concentrado;
  - onda de choque na encosta;
  - marca de energia que esfria em cerca de 1,5 s;
  - estilhaços de cristal com gravidade, presos ao chão;
  - poeira que sobe e brasas.
- **Contrato mantido:** 90 estrelas, 60 acertos, mesma mana, recarga e dano.

## Skill 3 — Tornado da Fênix Celestial

- **Fases:** `cast → form → flight → capture → burst → orbit (2 voltas) → ascend → dive → impact → burn → fade`. A sequência é determinística: o teste compara o dano a 10, 30, 60 e 120 FPS.
- **Captura de 3 s:** o tornado se ancora no ponto do encontro e não explode no toque. O alvo é erguido e gira em espiral, sofrendo 6 ticks de fogo e vento.
  - No jogo, o inimigo fica sob um lease (`phoenixHold`): a IA, a locomoção e os ataques são pausados.
  - O lease sempre devolve o inimigo ao chão, no fim da captura, no cancelamento, na morte ou na troca de cena (`try/finally`).
  - **Chefes resistem:** recebem o dano inteiro, mas não levitam, só tremem.
- **Explosão do tornado:** casca de fogo que se expande, coluna de chamas, onda de choque e brasas radiais.
- **Fênix:** dá exatamente 2 voltas (testado), deixando no ar rastros de fogo persistentes que se dissipam. Depois sobe 14 m com uma pausa no ápice e mergulha acelerando, com as asas recolhidas e linhas de velocidade.
- **Impacto final:** clarão branco-amarelado, casca laranja, onda de choque, coluna curta, detritos com gravidade, fumaça e queimadura residual com chamas baixas.
- **Dano total igual ao anterior (77 × nível):** captura 6×3, explosão 16, mergulho 28 e queimadura 3×5.

## Ultimate — Julgamento Divino: Colapso da Luz Eterna

- **Asas primeiro:** reaproveitam as asas do prólogo (`Asas.glb`, as que Deus retira na introdução).
  - Material de luz com fresnel, borda iridescente e dissolução por ruído com borda dourada, mais três fileiras de penas de energia instanciadas.
  - Abrem com pulso de vento no chão, batem na subida (que agora começa só depois de 0,8 s), ficam abertas no lançamento e se desfazem em penas de luz no fim.
  - Se o GLB não carregar, as penas de energia sozinhas formam as asas.
- **Tempestade** (`celestial-storm3d.js`), visual em toda a área à vista, mas com recursos locais à câmera:
  - **Céu e luz:** cúpula carmesim, neblina vermelha mais densa e luz de fim do mundo (hemisfério e sol avermelhados).
  - **Nuvens:** cumulonimbus em fatias empilhadas, com fBm, deformação do domínio, erosão e sombra própria aproximada; base vermelha e topo negro. Uma abertura luminosa acompanha o White Hole e os relâmpagos iluminam as nuvens por dentro.
  - **Chuva:** caixa de gotas presa à câmera, animada toda na GPU, que cai das nuvens. Há respingos no terreno real em volta do jogador.
  - **Vento:** poeira, folhas e brasas cruzam a tela, e as árvores e a grama aceleram.
  - **Raios:** ramificados, com gancho de áudio (`onBolt`; trovão já tocado nos que atingem o chão).
  - **Restauração:** progressiva (14,3 a 15,6 s). O snapshot do lease guarda céu, fundo, neblina (cor e distâncias), sol (intensidade e cor), hemisfério, exposição, câmera, pose e controles; as asas e a tempestade são escondidas na restauração idempotente.
- **White Hole:** disco negro absoluto (malha 3D) com coroa branca em shader (aro ofuscante, anel de "lente", turbulência fBm radial e filamentos), fissura celeste ramificada e partículas de luz em órbita.
  - **Lançamento:** o disco acelera com sensação de massa e deixa rastro.
  - **Impacto:** implosão curta, cascas brancas em camadas, ondas de choque 3D e no chão, explosão de partículas de luz e marca no terreno.
  - **Flash:** com "reduzir clarões" (`userSettings.reduceFlash`), o clarão fica em 55%.
- **Contrato mantido:** 17 s, impacto aos 13 s, 80 de mana, 30 s de recarga e um único dano de 160 × nível.

## Pesquisa técnica (referências de princípio, sem copiar assets)

- **Three.js:**
  - [ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial)
  - [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh)
  - [InstancedBufferGeometry](https://threejs.org/docs/#api/en/core/InstancedBufferGeometry)
  - [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
  - [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
  - [AnimationMixer](https://threejs.org/docs/#api/en/animation/AnimationMixer)
  - [EffectComposer/UnrealBloomPass](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer)
- **Nuvens volumétricas:**
  - A. Schneider, *The Real-time Volumetric Cloudscapes of Horizon Zero Dawn* (SIGGRAPH 2015): formas por fBm/Perlin-Worley com erosão, perfil vertical por tipo de nuvem e luz aproximada.
  - [Inigo Quilez — fBm](https://iquilezles.org/articles/fbm/) e [domain warping](https://iquilezles.org/articles/warp/).
  - Escolhemos a versão em **fatias** (*slice-based volume rendering*), em vez de raymarching por pixel, para caber no WebGL de celular: 5, 7 ou 9 fatias com 3 ou 4 oitavas, conforme o preset.
- **Chuva relativa à câmera:** a técnica clássica de caixa de partículas que acompanha a câmera e repete as posições (por exemplo, a demo *ToyShop*, da ATI, e o exemplo de chuva do SDK da NVIDIA). Aqui ela foi feita só no vertex shader, com custo zero de CPU.
- **Impacto:** antecipação, hitstop, onda de choque e decalque.
  - Os princípios de "impact frames" já registrados no Marco 11 (Mod 213).
  - A estrutura antecipação → impacto → resíduo usada em VFX estilizado de RPG de ação (estudos do RealtimeVFX).
- **Tradeoffs:**
  - Sem pós-processamento de bloom: custaria um passe de tela cheia a mais no celular. O brilho vem de blending aditivo com cor pré-multiplicada.
  - Sem luzes dinâmicas novas: elas recompilariam os shaders do mundo. As poças de luz são decalques.

## Validação executada

- `node --test`: **156 testes aprovados**, incluindo:
  - `celestial-phoenix3d.test.mjs` (12 testes): fases na ordem, captura de cerca de 3 s com espiral, exatamente 2 voltas, ápice, determinismo de 10 a 120 FPS, alvo que morre ou é trocado ou troca de cena no meio da captura, chefe resistente e reuso;
  - `celestial-mod229.test.mjs` (5 testes): raio determinístico, normal da encosta, estrelas pesadas sem mudar os 60 acertos, regras de integração da Ultimate (asas antes da subida, snapshot e restauração da tempestade, sem nuvens de esferas nem chuva local, disco negro) e lease da Skill 3;
  - os testes já existentes da Skill 2 e da Ultimate, sem alteração.
- **Chromium headless com SwiftShader (renderização por software):**
  - **Prévias isoladas:** Skill 2 e Skill 3.
  - **No mundo do jogo:**
    - **Skill 2:** a chuva roda completa, sem erros de página.
    - **Skill 3:** o HP do alvo cai de 300 para 223 (77 de dano). O inimigo é erguido até cerca de 1,6 m em espiral e volta exatamente ao chão no ponto do encontro.
    - **Ultimate:** HP de 300 para 140, com céu, neblina e luz vermelhos durante a tempestade e mundo restaurado aos 17,2 s.
- **Capturas:** `docs/evidencias/mod229/`.

## Limitações reais

- **Android físico não testado.** Não há medição de FPS móvel. O SwiftShader roda em 1 a 5 FPS e não serve de referência.
- **Nuvens:** são fatias de ruído (pseudo-volumétricas), não raymarching. Vistas muito de lado, perto do horizonte, viram uma faixa escura.
- **Chuva:** não tem oclusão por telhados. Some abaixo da altura do chão do jogador, como aproximação.
- **Áudio:** o trovão e os ganchos de áudio usam os sons atuais; sons novos ficam para a etapa de áudio.
- **Asas:** seguem a coluna do herói, mas não têm rig próprio. O bater é uma rotação das duas metades.

## Como testar

- **No celular:** https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?todasHabilidades=1&debug3d=1&mod=229
- **Prévias isoladas:** `skill2-preview.html` e `skill3-preview.html`.
