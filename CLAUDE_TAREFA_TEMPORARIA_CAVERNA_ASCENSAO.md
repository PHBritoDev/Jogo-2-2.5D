# TAREFA TEMPORÁRIA — RECONSTRUÇÃO DA FRONTEIRA, CAVERNA E ASCENSÃO ABISSAL

> **DESTINATÁRIO: CLAUDE, AGENTE DE IMPLEMENTAÇÃO DO RPG.** Este arquivo é uma ordem de trabalho, não documentação permanente.
> **REGRA ABSOLUTA DE COMUNICAÇÃO:** NÃO escrever atualizações, comentários, relatórios, raciocínios, planos, perguntas ou resumos ao usuário. ECONOMIZAR TOKENS AO MÁXIMO. Executar silenciosamente; no término, enviar **exclusivamente** a palavra `CONCLUIDO`. Não anexar lista, links, explicações ou resumo. Se houver bloqueio real, registrar informação objetiva no próprio PR/commit (não no chat). Após executar e validar, **APAGAR ESTE ARQUIVO** em commit final; não deixar lixo temporário.
> Não usar a regra de silêncio para esconder erros: verificar logs/testes/commits rigorosamente.

## Objetivo e limites

Implementar de verdade **CENÁRIOS JOGÁVEIS**, não imagens, propostas, pseudocódigo, apenas prompts, cenários falsos ou decoração sem colisão. Jogo atual Three.js/WebGL em GitHub Pages (mobile prioritário), sem migrar engine nem descaracterizar Eldória. Manter a qualidade visual alta; otimizar tecnicamente, **não diminuir qualidade para subir FPS**. **Não implementar inimigos, batalhas, novas skills, roteiros ou missões nesta rodada**. Preservar fluxos de jogo, HUD, controle, spawn, FPS, demais áreas e código dos outros agentes. Verificar branch/PR/commits ativos antes de tocar arquivos; evitar sobrescrever trabalho concorrente. Entregar código funcional integrado e mesclado somente após validação; preservar rollback fácil.

### Referências visuais fornecidas pelo usuário nesta conversa

1. Screenshot do jogo **Mod 310**, floresta com X preto — a região marcada indica **aproximadamente** o setor da futura caverna, não um portal diretamente naquele ponto do gramado.
2. Referência da **gruta escura vertical gigantesca**, com estalactites e passagens escalonadas.
3. Referência da **gruta de luz verde-azulada**, com poças, rochas, colunas e névoa.
4. Referência de **portal violeta-azul em vórtice 3D** com centro profundo e borda energética viva.
5. Referência da **escadaria muito longa e iluminada dramaticamente no vazio escuro**.
6. Referência de **ilha/estrutura celestial suspensa entre anéis cósmicos roxos**.
7. Referência do **deserto negro, chão escuro e formações rochosas curvas/pontiagudas**, espaço da futura arena final.
As imagens estão na mensagem original do usuário. **Não reproduzir literalmente as artes nem gerar imagens como substituto de cenário.** Superar referências na construção do mundo em Three.js, respeitando coerência e performance.

## A. Floresta: fronteira montanhosa e entrada real de caverna

- Identificar, no mapa 3D atual, a região indicada pelo X (ao fundo, na floresta). Estudar pontos de spawn, vila, ritual/jaulas, topografia, rios, caminhos, caverna existente, navegação, colisões e assets para evitar destruir áreas.
- Transformar esse setor em **fronteira natural crível de montanhas monumentais**: silhuetas altas, estratificação rochosa não repetitiva, cristas, paredes, desfiladeiros, maciços, variações de escala/erosão e transição orgânica floresta→montanha. Uma barreira de fim de mapa construída pelo relevo, não paredões planos nem muros invisíveis. Picos inacessíveis por geografia/declive/rocha **com colisões reais**, sem permitir escalar até o topo, sem matar o jogador ou teletransportá-lo arbitrariamente.
- **A boca da caverna deve estar FISICAMENTE FUNDIDA nessa montanha**, profunda, encaixada na rocha, com caminho lógico e aproximação gradual, arcada natural, teto e paredes sólidos. Não deixar caverna ou portal soltos no gramado.
- Montanhas visíveis de vários ângulos, escalonando modelos e técnicas de terreno, silhoueta distante com geometrias conservadoras e shading/texturas ricas; evitar padrões óbvios, triângulos lisos, faixas de texturas e árvores atravessando pedra.
- Caminho real até a entrada; o personagem pode caminhar até ela e entrar. **Gatilho de transição conforme avança no túnel**, com tolerância à movimentação, fade/transição sem susto nem travamento, carregamento antecipado e spawn correto dentro do cenário interno. O jogador deve sentir que atravessou uma passagem física; não usar botão genérico de teleporte ou acionar ao apenas se aproximar de longe.
- **Massas sólidas**: montanha, entrada e bordas têm volume visual+colisão consistente. Personagem NÃO atravessa rochas, laterais, teto, chão. Não criar paredes invisíveis desalinhadas. Garantir que o interior do corredor seja transitável.
- A cena das **duas crianças em jaulas e dois demônios** está perto demais da região X. Deslocar **bem para longe** da nova fronteira/caverna, para um local lógico na floresta densa, com longa jornada real a partir da vila; manter as duas crianças, demônios, ritual, objetivos e gatilhos funcionando. Medir percurso real (não somente distância euclidiana), testar acesso e progressão. Não criar conflitos com NPCs ou geografia existentes.

## B. Caverna: domínio 3D amplo, misterioso e expandível

- Criar ou reconstruir **mapa interno separado** para caverna com entrada/saída estáveis. Se já existe caverna, reutilizar e melhorar; não duplicar uma segunda área descartável. Saída retorna ao mundo exterior no lugar certo, preservando estado do jogador. Transição por cenas/zonas com preload e descarte consciente; evitar ter duas cenas inteiras consumindo GPU simultaneamente.
- Grande sentido de escala e exploração: tetos altos, estalactites, estalagmites, pilares rochosos, abismos, patamares e cavernas conectadas, pontes 3D reais, água localizada, reflexos controlados, entradas de luz fria por fissuras, véus de névoa, setores escuros e pequenas fontes de luz cálida onde fizer sentido. Os corredores, plataformas, pisos e pontes são atravessáveis **apenas onde projetados para caminhar**, com colisões e navegação consistentes. Evitar água rasa bloqueando caminhada; testar rampas, degraus, saltos, dash, câmera e quedas.
- Iluminação cinematográfica verde-azulada e azul pálido, contrastes escuros deliberados, pontos violeta de cristais, sem saturar o ambiente inteiro. Priorizar emissive + iluminação localizada visualmente plausível, não uma point light cara por cristal. Ajustar exposição e fog por ambiente, mantendo volumes legíveis no celular.
- **Reutilizar os cristais GLB/3D e outros assets do repositório**: fazer inventário dos nomes/formatos e aproveitar apenas os adequados; posicionar **com curadoria ambiental** (geodos/veios/fissuras/linhas de crescimento/condensação), escala coerente, variações não randômicas, boa composição e colisão onde necessário. Nada de amontoar cristais sem lógica. Se faltarem rochas ou pilares, criar geometrias 3D adequadas ou importar ativos permitidos com proveniência/licença clara; nenhum placeholder genérico final.
- Arquitetura da caverna deve permitir **abrir novas regiões posteriormente**, com ramificações, pontos de interesse, setores fechados narrativamente por enquanto e espaço de expansão, sem implementar a história agora. Rota principal clara por silhueta e luz, com oportunidades de exploração.
- Procurar e reutilizar modelos já existentes antes de gerar novos. Não deixar caixotes, pedras, luzes ou props flutuando; evitar decalques/meshes coplanares piscando.

## C. Portal rotativo no interior da caverna

- Depois de uma travessia significativa pela caverna, jogador descobre **um portal 3D circular com vórtice girando continuamente**, profundidade perceptível, anéis energéticos/torção e borda violeta azul com fluxo em rotação; movimento fluido, não disco estático com uma única textura.
- Usar técnica apropriada para mobile (shader GLSL de vórtice via UV/polar coordinates + ruído leve, emissive additive seletivo e pequenas partículas instanciadas se apropriado), com controle de overdraw, sem pós-processamento caro na tela inteira. O centro deve sugerir abismo espacial e não um buraco plano.
- Posicionar o portal em câmara monumental justificada pelo ambiente, pedestal/ruínas discretos se fizerem sentido; luz e detritos não atravessam avatar. Ativar transição **somente ao cruzar fisicamente o plano do portal**, com checagem de direção e cooldown de reentrada para evitar loops. Animar giro no tempo real (delta), independente do FPS. Realizar transição suave para a dimensão da escadaria, com loading/preload e feedback audiovisual existente se possível (não introduzir áudio oneroso ou sem licença).

## D. Dimensão escadaria: viagem longa e monumental

- Mundo próprio e distinto, quase monocromático, vazio colossal escuro, paredes/estruturas abstraídas de rocha, shafts de luz branca-cinza e bruma cinematográfica, inspirado na escadaria de referência. **Escadaria realmente caminhável e longa**, escalando enorme distância ao longo da subida; não simular com escada imóvel nem teletransportes invisíveis. Caminhar ou repetidamente usar dash deve levar um tempo significativo; definir percurso coerente com mobilidade atual, sem inflar tempo com obstáculos artificiais. Pode dividir em segmentos contínuos carregados conforme progresso.
- **Colisões corretas em cada degrau/rampa** sem prender o personagem, câmera acompanha personagem e não atravessa paredes. Saltar, correr e dash não quebram o eixo vertical; prevenir cair através do piso e problemas de precisão em coordenadas enormes. Usar segmentos/coordenadas locais, origin rebasing se necessário, e pooling/streaming somente se realmente vantajoso.
- A estrutura/ilha celestial aparece no céu **gradualmente e de modo convincente conforme o jogador sobe**, com forte senso de escala e distância. Os últimos degraus se conectam fisicamente à plataforma superior; nada flutuando desconectado.
- Coerência de iluminação com referência: volumetria aparente por arte direcionada, fog, feixes fake/malhas shader seletivas em vez de raymarching volumétrico caro. Sem texto ou instruções sobre história.

## E. Arena futura: deserto negro e aurora

- Ao concluir ascensão, jogador chega à estrutura/ilha e ao cenário de uma **arena ampla, explorável e vazia**, onde futuramente existirá batalha de miniboss.
- Piso de areia/rocha negra com micro relevo, ondulações discretas, rachaduras, blocos retorcidos e **formações pétreas pontiagudas e arcos naturais de silhueta memorável**, colocados com regras compositivas, sem repetição evidente, colisão real nos elementos perto do avatar.
- Grande espaço central legível, propositalmente aberto para futura luta; bordas e ruínas sugerindo perigo sem bloquear movimentação. Geografia confere identidade, não apenas plano preto com objetos espalhados.
- Céu cósmico com **aurora sutil dinâmica** e nebulosidade/estrelas com profundidade, sem bloom exagerado. Usar skydome/shader barato ou camadas controladas com movimento lento; manter bom contraste entre personagem e chão. Iluminação dramaticamente distinta da caverna e da escada, sem sacrificar visibilidade do combate futuro.
- Arena ligada à escadaria e à ilha sem cortes injustificados; câmera, entrada/saída e área utilizável confiáveis. **Não adicionar miniboss**.

## F. Pesquisa e engenharia (obrigatória antes/durante implementação)

1. Auditar arquitetura **real** do repo: módulos de mundo, terrain, colisões, carregador de GLB, scene/zone transitions, câmera e controls, recursos de cristal/caverna/portal existentes, sistemas de objetivos e eventos, checkpoints, performance móvel. Não assumir nomes ou rotas sem ler.
2. Consultar docs e exemplos **oficiais Three.js** e código já existente, pesquisar adicionalmente cada técnica desconhecida:
   - Fog/FogExp2 por ambiente + background coerente: https://threejs.org/manual/en/fog.html
   - GLTFLoader e decoders Draco/KTX2/Meshopt somente conforme compressão existente: https://threejs.org/docs/pages/GLTFLoader.html
   - InstancedMesh para rochas/cristais repetidos, quando compatível com materiais e necessidade de culling: https://threejs.org/docs/pages/InstancedMesh.html
   - LOD e frustum culling/visibilidade por regiões, evitar LOD fazendo popping em objetos próximos: https://threejs.org/docs/pages/LOD.html
   - WebGLRenderer.compileAsync quando útil à transição de cenas: https://threejs.org/docs/pages/WebGLRenderer.html
   - RenderTarget/ShaderMaterial/InstancedBufferGeometry e profilers apenas quando benefício medido; não adicionar bibliotecas grandes sem necessidade.
   - Investigar dual contours/marching cubes/terrain meshing, UV triplanar / atlas / normal maps, heightfields para montanhas e meshes de cavernas **comparando custo e benefícios**. Cave não deve ser feito como mero heightfield (que não dá teto/túneis); usar volumes de mesh reais para paredes/teto e colisores simplificados alinhados.
   - Gestão de recursos: evitar vazamentos GPU (dispose geometrias, materiais, texturas ao unload), cache sensato de assets reutilizados; não destruir assets compartilhados ainda em uso.
3. **Qualidade antes de quantidade**: não copiar padrões genéricos, não usar sombras para esconder geometria ruim. Sem "resolver" FPS reduzindo qualidade visual, textura global, resolução, vegetação existente ou removendo efeitos. Preferir instancing onde possível, atlas compartilhado, merge de geometrias estáticas, culling por setores, baked detail nas superfícies, shadow casting só nos elementos que precisam, fog atmosférica, streaming gradual.
4. Testes reais com agente/browser/WebGL sempre que disponível: cenários em **celular** e desktop; comparar visual com cada referência original; fazer screenshots/vídeos para auditoria **interna** e iterar até as falhas relevantes serem corrigidas. Não fingir teste visual não executado.
5. Testes automatizáveis: build/import, assets 404, portal transição e retorno, colisões sólidas, nav, objetivo das jaulas realocado, jornada contínua, queda, escada e dash, shaders em hardware móvel, ausência de regressões e preservação das outras regiões. Registrar resultados apenas nos commits/PR, NÃO no chat. Monitorar FPS e draw calls e evitar regressão significativa vs baseline; medir primeiro e otimizar sem degradar visual.

## G. Processo e critérios para concluir

- Trabalhar em branch própria e commits pequenos; evitar conflitos com código alheio. Se já há outra tarefa de Claude/Codex envolvendo essas áreas, coordenar sem substituições cegas.
- Prioridade: (1) montanhas/entrada/jaulas; (2) cena da caverna sólida; (3) portal fluido; (4) longa escadaria; (5) ilha/arena negra com aurora; (6) integração, performance, QA. Fazer **uma parte de cada vez**, testando antes de avançar.
- Não alegar concluído com simples mockup, textura de cenário, prompt ou referência. É necessário caminho real **floresta→caverna→portal→escadaria→arena**, jogável, com colisões, carregamento estável, identidade visual e desempenho aceitável.
- Ao finalizar: apagar **este arquivo temporário** no mesmo trabalho; preservar instruções permanentes existentes do repo; PR limpo, validar, mesclar quando seguro para jogo publicado. **No chat: só `CONCLUIDO`.**

## Observações de UX e referências

- Cenário deve causar impacto por **escala, construção do espaço, ritmo e iluminação**, não excesso de emissivas ou partículas.
- A direção de arte pode superar referências com diferenças intencionais. O desenvolvedor está autorizado a melhorar o design, desde que respeite o fluxo e não invente roteiro/inimigos.
- As áreas precisam transmitir **progressão espacial real**: começar em floresta viva → fronteira geológica gigantesca → escuridão úmida e luminosa da caverna → energia violeta do portal → silêncio colossal da escadaria → desolação e aurora do deserto negro.


## H. DIREÇÃO DE ILUMINAÇÃO E OTIMIZAÇÕES ADICIONAIS — exigência explícita do usuário

- Reproduzir **a qualidade e a atmosfera da iluminação das imagens de referência**, especialmente gruta úmida com feixes frios, contraluz volumétrica controlada, cristais com brilho fundamentado, portal violeta-azulado, escadaria escura sob luz vertical intensa e aurora cósmica. Não basta colocar fontes de luz: trabalhar composição, intensidade, contraste, sombras, temperatura da cor, materiais PBR, oclusão e legibilidade do caminho. A iluminação deve parecer integrada às superfícies, sem manchas arbitrárias, cintilações ou superexposição.
- **Não se limitar às referências.** Buscar outras referências visuais e princípios de iluminação em jogos de alta qualidade, incluindo **Pinterest** quando acessível, art breakdowns de ambientes, GDC, Unreal/Unity environment lighting showcases e documentação Three.js. Usar pesquisa como inspiração técnica/artística sem copiar assets protegidos. Validar cada ambiente do ponto de vista do jogador e comparar com referências em diferentes distâncias.
- **Desempenho mobile sem reduzir qualidade gráfica:** aplicar, **além** dos itens anteriores, técnicas seletivas como portal/occlusion culling nas galerias subterrâneas, divisão em células e streaming por proximidade, bake de AO e detalhes de superfície sem sombras dinâmicas redundantes, light probes/iluminação indireta aproximada e emissive local, instancing/geometry batching de objetos estáticos, frustum culling correto, compressão de geometria/textura compatível com GLTFLoader, pré-compilação/prewarm de shaders nos portais, shader variants mínimos, materiais e texturas compartilhados, mipmaps, sombras com orçamento seletivo e ajuste de draw calls/overdraw. Escolher apenas o que funciona com a arquitetura existente, sem adicionar pipeline caro ou instabilidade.
- Evitar spawns/despawns abruptos, shader compilation stutter e picos de RAM/GPU durante trocas de áreas; preparar saída/entrada em etapas com cache e descarte seguros. Inspecionar com métricas de FPS, draw calls, triângulos, memória/texturas e tempos de transição em celular e desktop **antes/depois**. Otimizar por gargalo medido, não por modismos.
- Autorizar melhorias criativas fundamentadas e pesquisadas que tornem o ambiente mais impressionante **sem complicar a jogabilidade nem alterar o escopo**. A iluminação e qualidade do cenário final não devem ficar abaixo das referências por pressa, atalhos ou soluções genéricas.
