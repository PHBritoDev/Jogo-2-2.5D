# Eldória — direção artística aprofundada (07/11/2026)

## Hierarquia obrigatória
1. As sete imagens originais do usuário são o alvo visual primário. A vila 1000363692.jpg e o lago 1000363693.jpg governam este marco; as demais governam os próximos lugares.
2. O roteiro canônico `docs/narrativa/ato-1-eldoria-roteiro-v1.md` governa o significado narrativo: natureza bela e luminosa, cidade empobrecida, fonte seca, mercadorias ausentes, contraste com horror da mata.
3. Jogos famosos e pesquisa são referências de **técnica**, nunca modelos para copiar, importar assets proprietários ou substituir o conceito original.

## Pesquisa externa e princípios transferíveis
- GDC 2021, *Genshin Impact: Crafting an Anime Style Open World*: arte anime não fotorealista exige direção de arte e pipeline coerentes: https://gdcvault.com/play/1027539/-Genshin-Impact-Crafting-an
- Entrevista com designers de Genshin: a qualidade da imagem é avaliada de vários ângulos; usar marcos, enquadramento, terreno, arquitetura e caminhos para produzir cenas legíveis: https://apps.apple.com/cn/iphone/story/id1576338984?l=en-GB
- Diário de cenários Liyue: lugares precisam ter funções sociais e detalhes cotidianos; integrar paisagem com cultura e atividades locais: https://www.hoyolab.com/article/97853
- Three.js `InstancedMesh`: compartilhar geometria/material e variar transformações para reduzir draw calls: https://threejs.org/docs/pages/InstancedMesh.html
- Técnicas modernas de água estilizada: espuma de contato, Voronoi, ondas em GPU, grama animada e feixes de luz; referências de *ideias* que exigem testes e custo por aparelho: https://water-anime-shader.vercel.app/

## Composição por área
**Cidade 1**: árvore ancestral e telhados arredondados com identidade forte; plano principal fonte seca, barraca de frutas vazia, poço e ferreiro; pequenas pontes, passarelas e vegetação enraizada na arquitetura; evitar repetir casas com o mesmo ângulo e escala; guiar o jogador com trilhas até o mercado e o rio. A escassez deve ser visível sem letreiros ou exposição.

**Floresta**: troncos antigos de escala monumental, folhagem irregular com 3-4 camadas de profundidade, raios de luz entre copas, samambaias e raízes, pequenos intervalos de visão para o jogador. Evitar árvores idênticas ou folhagem que tape o caminho e o horizonte.

**Lago**: água turquesa translúcida e pedras cobertas de musgo; contorno assimétrico, margem com raízes e vegetação úmida; luz suave no centro; trilha de descoberta. Espuma discreta só na transição, não um anel circular branco.

**Caverna e ritual**: fases próprias, não contam como finalizados no Marco 1. O contraste de luminosidade e silêncio deve crescer gradualmente; não inserir inimigos antigos.

## Técnicas e decisões de performance
- InstancedMesh para grama, flores, árvores de fundo, pedras e samambaias; objetos de silhueta única com GLB real. Não confundir redução de draw calls com FPS garantido.
- Desenhar grama com lâminas triangulares em vez de cones; flores com pétalas reais e miolo quando houver orçamento.
- Usar fog atmosférico e luz de preenchimento em vez de dezenas de luzes dinâmicas; sombras direcionais em objetos-chave.
- Água: ondas e brilho no shader; espuma/gradiente de margem; reflexões dinâmicas, SSR, TAA, pós-processamento e volumetria **não** ativados automaticamente em Android sem benchmark.
- Comparar sempre imagens de gameplay a partir da altura real da câmera, não só ângulos aéreos.
- Android: medir FPS, tempo de carregamento, memória, draw calls, triângulos e aquecimento no dispositivo físico; não extrapolar do Chromium SwiftShader.

## Definição de pronto
- Visual de cada local deve ser comparado com a referência original lado a lado; anotar lacunas de silhueta, materiais, água, vegetação e arquitetura.
- 12 capturas automatizadas devem passar (mobile e desktop), sem falhas de GLB, JS, shader, sombra ou render em branco.
- Testar navegação e colisões após integrar ao jogo real; prévia isolada não substitui gameplay.
- Não fazer merge de estudo inacabado ou mexer em personagens antigos por acidente.
