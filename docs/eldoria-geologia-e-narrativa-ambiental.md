# Eldória — pesquisa aplicada de geologia, psicologia ambiental e narrativa silenciosa

> Base de implementação do PR #407. Direção de arte original, referências fornecidas pelo usuário prioritárias. Não substitui o roteiro canônico do Ato 1.

## 1. O que a imagem precisa comunicar (não só decorar)

O jogador chega a uma cidade com belas casas sob árvores impossivelmente antigas, porém a sobrevivência das pessoas está comprometida. O caminho visual deve revelar o contraste: árvores monumentais (esperança e tempo), telhados cobertos de musgo (convívio com a natureza), fontes secas e recipientes vazios (privação), rio relativamente próximo (contradição que gera perguntas). Não insinuar solução de enredo que o roteiro ainda não confirmou.

A cidade precisa ser lida em pelo menos duas perspectivas: do caminho de chegada e do rio. Enquadramento atual da prévia usa câmera do lado da chegada apontada à mata; testes anteriores mostravam o oposto — casas contra um prado vazio —, incompatível com a referência. Esta alteração deliberadamente mudou a direção da câmera no estudo.

## 2. Geologia: o que copiar da natureza, e o que não copiar de jogos

- **Cristais de Naica, México**: grandes prismas de gipsita crescem em direções variadas no solo e nos blocos de rocha, inclusive em longas vigas cruzadas. Isso é muito mais convincente que um campo homogêneo de cones pontudos.
  Referência: https://www.nationalgeographic.com/science/article/photos-mexico-cave-of-crystals
- A formação em águas minerais durante grande intervalo de tempo justifica visualmente fraturas, veios, superfícies e poças mineralizadas. **Não é a história oficial da caverna**: é apenas gramática geológica.
  Referência: https://www.sciencedirect.com/science/article/pii/S0012821X09007195
- Na implementação, cada nível de estrutura tem papel: rocha grafite estratificada ao redor (contenção); veios azul-esverdeados quebrados (orientação); 12 vigas transversais seleníticas (escala monumental); cristal central emoldurado pelos arcos (reverência); obelisco com luz violeta longe do centro (inquietação).
- Desvios intencionais do realismo: minerais bioluminescentes e dimensões ampliadas, pois Eldória é fantasia. Não reproduzir literalmente a caverna mexicana nem ativos de terceiros.

## 3. Psicologia de espaço aplicada sem manipular o jogador

Estudos de preferência por ambientes naturais relacionam legibilidade, marcos visuais e acesso visual com sensação de segurança e orientação. Ambientes misteriosos despertam interesse, mas pouca legibilidade pode gerar ameaça ou confusão. Isso sugere um **caminho principal reconhecível** e um **ramal obscuro opcional**, em vez de escurecer todo o mapa.
- Herzog & Kropscott, *Legibility, Mystery, and Visual Access as Predictors of Preference and Perceived Danger in Forest Settings without Pathways* (2004): https://journals.sagepub.com/doi/10.1177/0013916504264138
- GDC 2010, Worch & Smith, *What Happened Here? Environmental Storytelling*: https://www.gdcvault.com/play/1012647/What-Happened-Here-Environmental
- GDC 2021, Miriam Bellard, *Environment Design as Visual Storytelling: Theory and Practice*: https://gdcvault.com/play/1027254/Environment-Design-as-Visual-Storytelling

Aplicação: salão claro e amplo (curiosidade e admiração), feixes de cristais com direções convergentes (orientação sem seta UI), pedras quebradas próximas à entrada (vestígio), obelisco em ala lateral (risco percebido). O jogador deve **inferir** uma história passada por conta própria; não associar sofrimento a efeitos artificiais obrigatórios.

## 4. Verificação e restrições tecnológicas

- A prévia usa Three.js, geometria instanciada para rochas/veios repetidos e poucos materiais distintos. Isso baixa draw calls, mas não certifica memória nem FPS no celular.
- Os cristais autorais `CristalCaverna01.glb` devem carregar somente ao acessar o interior. Mantemos os 14 GLBs anteriores na cena ou em estágios de ritual/caverna, totalizando **15 modelos distintos de cenário**, sem personagens.
- Cada mudança visual passa por testes estáticos e **16 screenshots reais** em WebGL no GitHub Actions, formatos retrato/paisagem. Falhas de import, glTF e carregamento não podem ser tratadas como sucesso.
- Reflexos de tela, fog volumétrico em tempo real, TAA, ray tracing, transmissão intensa e dezenas de sombras não são exigência estética se prejudicarem Android. Primeiro medir o custo.
- O navegador de teste usa SwiftShader em CI; não equivale a FPS Android real.

## 5. Lacunas intencionais após este marco

Ainda são necessários interiores com passagem jogável, colisões, telemetria de FPS no Android físico, escala definitiva da caverna e validação lado a lado com as imagens do usuário. A prévia isolada **não deve ser mesclada automaticamente** na main.
