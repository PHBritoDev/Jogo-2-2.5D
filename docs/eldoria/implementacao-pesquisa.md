# Eldória — pesquisa aplicada à implementação (Mod 291)

> Base técnica e narrativa das decisões do Mod 291. Fonte de verdade da história: `docs/narrativa/ato-1-eldoria-roteiro-v1.md`.
> As referências visuais do criador (prado, vila entre árvores ancestrais, lago turquesa, boca de caverna, túnel de cristais e
> círculo ritual) foram usadas como **relações de composição**, nunca copiadas. Referências bibliográficas abaixo são conhecidas
> e citadas pelo título; os links não foram reabertos nesta sessão de trabalho.

## 1. Geografia e psicologia do percurso
- **Queda longe da cidade.** O roteiro (P0) pede “um campo entre pedras altas e flores silvestres, afastado da floresta” e só no
  horizonte “uma estrada e uma coluna de fumaça fina”. O prado agora fica ~215 m ao sul de Eldória, atrás de uma serra (teste de
  linha de visão em `eldoria-mod291.test.mjs`). A cidade só aparece no fim da viagem de carroça, ao amanhecer — revelação
  conquistada, não pano de fundo do spawn.
- **Legibilidade × mistério** (Kaplan & Kaplan, *The Experience of Nature*, 1989; Herzog & Kropscott, 2004): o prado é aberto e
  legível (curiosidade sem ameaça); a garganta da estrada estreita a visão (antecipação); a mata ao sul do rio é densa e com chão
  coberto (mistério). Cada trecho tem uma intenção emocional explícita (matriz em `mod291-matriz-fidelidade.md`).
- **Agência e significado** (Tanenbaum & Tanenbaum, *Commitment to Meaning*, 2009): a escolha com os bandidos muda a expressão
  do herói (deixar ir × pedir ajuda no reparo), nunca pune nem mata — coerente com “moralidade com nuance” do roteiro.

## 2. Água corrente
- **Flow maps** (Alex Vlachos, *Water Flow in Portal 2*, SIGGRAPH 2010 — Advances in Real-Time Rendering): rolar ruído/normais
  na direção do escoamento. Como o rio é uma fita com UV.x = distância ao longo da curva, a direção do fluxo é a própria tangente
  (flow map implícito, sem textura extra); a velocidade cai perto das margens (perfil parabólico).
- **Fresnel** (Schlick, *An Inexpensive BRDF Model for Physically-based Rendering*, 1994): mistura da cor do corpo d'água com o
  céu/neblina pelo ângulo de visão; brilho especular do sol/lua; cor por profundidade (turquesa raso → verde-azulado fundo).
- **Espuma** nas margens (UV.y) e anéis ao redor das pedras (até 10 por corpo d'água, uniforme), com o ruído atenuado na
  distância para não cintilar no celular.
- Custo: 1 draw call por corpo d'água, sem render target nem reflexo planar.

## 3. Floresta em estratos sem perder FPS
- Dossel (árvores instanciadas já existentes) + **segunda passada de dispersão** só na faixa entre o rio e a serra + **arbustos e
  samambaias instanciados** ao pé das árvores e nas margens. Tudo com corte por distância/direção (`registerInstanceCull`).
- Inspiração de produção: *Procedural Grass in Ghost of Tsushima* (GDC 2021) — vento por instância no vertex shader, densidade por
  manchas, nada de malha individual por planta.

## 4. Cidade: aterramento, LOD e draw calls
- **Aterramento pelo ponto mais baixo da pegada** (9 amostras giradas): nenhum canto flutua; soleira de pedra única (1 draw call).
- **LOD geométrico** com meshoptimizer (Arseny Kapoulkine, <https://meshoptimizer.org>) e glTF Transform (Don McCurdy,
  <https://gltf-transform.dev>): as malhas `output_unwrapped` têm costura de UV em quase todo vértice e travavam o simplificador;
  o script `tools/eldoria/build-lod-glbs.mjs` solda por posição numa malha auxiliar, simplifica e volta a um vértice original
  (UV preservada). LOD1 ≈ 4–7 mil triângulos, sem textura própria (reaproveita a do LOD0), 40–110 KB por arquivo.
- `THREE.LOD` (<https://threejs.org/docs/#api/en/objects/LOD>) troca o nível por distância (17 m celular / 26 m desktop).
- **Agrupamento por material** dos moradores procedurais (centenas de peças) e das 12 trilhas (1 malha só).
- **Streaming por zona**: no prado/estrada do sul a cidade inteira deixa de ser enviada à GPU, e vice-versa.

## 5. Cristais
- Selenita/gipsita (cristais de Naica) cresce em **prismas** com terminações facetadas, em direções variadas — nada de cones.
  `eldoria-crystal-geometry.js`: prisma hexagonal levemente afunilado + pirâmide de 6 faces com ponta deslocada, `flatShading`
  para as facetas, aglomerados com satélites inclinados. Aplicado à prévia da caverna e à câmara final do esgoto/caverna do Ato I
  (sem mexer no portal nem na dimensão de VHAZRAEL).

## 6. Desempenho: o que foi medido e o que NÃO foi
- Medido no Chromium/SwiftShader (CPU) desta máquina: draw calls reais por quadro (`SevenSinsDebug3D.drawList()` intercepta
  `renderBufferDirect`), triângulos, geometrias e texturas — ver tabela na matriz.
- **Não medido**: FPS em Android real (Samsung A55 / Xclipse 530). SwiftShader não representa GPU móvel; nenhum número de FPS
  deste documento deve ser lido como benchmark de celular. Ferramenta recomendada para o criador: Android GPU Inspector
  (<https://developer.android.com/agi>) ou `chrome://inspect` com o contador de FPS do próprio jogo (`?debug3d=1`).
