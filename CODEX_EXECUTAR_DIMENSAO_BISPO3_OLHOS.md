# CODEX — EXECUTAR DIMENSÃO DO BISPO 3 (ZAR’KHAEL) — BRIEF ISOLADO

## Missão
Aprimorar a dimensão existente do Bispo 3, não reconstruí-la cegamente. Referência visual enviada pelo criador no chat em 07/11/2026: corredor surreal escuro com piso xadrez preto/cinza úmido, perspectiva longa rumo a uma luz branca distante, cogumelos gigantes orgânicos rubro-escuros dos dois lados, múltiplos olhos embutidos nas copas, hastes fibrosas pálidas e fundo quase negro. A anotação verde sobre a imagem é apenas rabisco, **não faz parte do cenário**. O criador quer correspondência forte de composição, luz, material, escala e sensação de horror; não uma coleção genérica de cogumelos vermelhos.

**IMPORTANTE: esta imagem está no chat do criador, não foi incorporada ao Git. Solicitar acesso à referência original antes de afirmar fidelidade visual; não inventar nota de similaridade.**

## Coordenação sem conflitos
- Claude está trabalhando em Eldória no PR #412; outros agentes podem editar combate, animações e outros bispos. **NÃO tocar na branch do Claude, em Eldória, na main, no Pages, em arquivos de outros sistemas ou em PRs de outros agentes.**
- Trabalhar em branch própria `feat/bispo3-dimensao-olhos-<sufixo>` criada da main atual, PR próprio em draft. Evitar arquivos compartilhados; se inevitável, justificar, reduzir diff e comunicar antes. Não fazer merge sem aprovação do criador.
- Ler o código real e localizar a dimensão/entrada/saída do Bispo 3, recursos GLB e configurações de qualidade antes de mudar. Registrar baseline e arquivos afetados. Preservar combate, habilidades, IA, câmera, checkpoints, HUD, carregamento e progresso.
- Este arquivo é apenas instrução. Quando o trabalho estiver concluído, apagar este brief **na sua própria branch** se estiver presente nela; não apagar da branch de outro agente.

## Alvo visual — critérios observáveis
1. **Composição:** corredor central xadrez contínuo e transitável, fuga para ponto luminoso distante; fileiras assimétricas de cogumelos gigantes com tamanhos variados, os maiores enquadrando o primeiro plano; silhuetas recuadas diminuem progressivamente e não bloqueiam a câmera. Evitar repetição evidente/espelhamento mecânico. Manter largura de circulação e arena funcional.
2. **Materiais:** chapéus rubro-vinho com superfície úmida, rugosa, estriada e veios orgânicos (roughness variável, highlights localizados), hastes pálidas de textura fibrosa e base irregular. Olhos integrados à geometria/pele, sem esferas flutuantes, círculos pintados genéricos ou decalques que se destacam da curvatura.
3. **Olhos vivos:** muitos olhos de tamanhos/rotações diferentes, distribuídos de modo irregular. Cada olho deve **piscar** (pálpebra fechando/abrindo de modo perceptível, duração curta, tempos independentes), e **seguir o jogador** suavemente dentro de limites anatômicos plausíveis. Alternar alguns olhos em vigília, outros olhando lentamente, sem sincronizar todos; suavizar movimento e impedir que atravessem a pálpebra ou se desprendam. Quando o jogador se afasta, limitar atualização por distância/visibilidade. Preferir rig/morph targets quando GLBs permitirem; caso contrário, geometria/deformação ou shader localizado, documentando fallback. Evitar instanciar centenas de skeletons e draw calls.
4. **Iluminação:** ambiente negro profundo com luz direcional/volumétrica controlada no horizonte, reflexos úmidos discretos no xadrez e brilho especular nos olhos. Guiar o olhar ao centro sem estourar branco nem iluminar uniformemente tudo. Se usar neblina/fog, manter contraste e leitura do personagem; pós-processamento adaptativo, não bloom pesado.
5. **Atmosfera:** horror cósmico inquietante; micro movimento orgânico quase imperceptível nos cogumelos, áudio espacial sutil somente se houver infraestrutura; não cobrir o cenário com partículas genéricas. Manter originalidade e não copiar ativos protegidos da referência.

## Engenharia e pesquisa antes de implementar
Pesquisar documentação e exemplos confiáveis para Three.js: `InstancedMesh`, `LOD`, `onBeforeCompile`/ShaderMaterial quando adequado, `MeshStandardMaterial` ou `MeshPhysicalMaterial`, UV, normal/roughness maps, morph targets, animação de pálpebra, tracking de olhos por vetor direção transformado para espaço local, frustum culling, atualização em frequência reduzida, gerenciamento de geometria/material e memória GPU. Investigar técnicas de light shafts/fog leves e reflexo falso para WebGL mobile; escolher solução compatível com o renderer já existente. Registrar fontes técnicas consultadas e decisões; evitar trocar engine ou introduzir dependências pesadas.
- Priorizar reutilizar GLBs/texturas autorais existentes; inventariar caminhos e licenças. Novos assets somente quando necessários e devidamente otimizados.
- Limitar triângulos, draw calls, materiais transparentes e overdraw; usar instancing para formas estáticas quando possível, com animação ocular por atributos/shader ou agrupamento eficiente. Fazer presets baixo/médio/alto com redução de olhos animados, luzes e efeitos sem apagar identidade visual.
- Não prometer FPS real em Android sem teste em aparelho. Métricas de Chromium/SwiftShader não equivalem a Samsung A55.

## QA obrigatório e entregáveis
- Capturar **screenshots reais da implementação** (não concept art) do mesmo ponto de vista da referência: (a) plano geral com fuga luminosa, (b) close de cogumelo com olhos abertos, (c) sequência de 3 quadros do piscar, (d) olhos seguindo jogador em duas posições, (e) câmera em combate/arena. Se possível vídeo curto da animação, links acessíveis no PR.
- Testar visualmente ao caminhar, girar câmera, atacar e usar poderes do Bispo 3; validar colisões, navegação, ausência de olhos flutuantes, ausência de flicker/z-fighting, recuperação após troca de qualidade e limpeza de recursos ao sair da dimensão.
- Testes automáticos/CI aplicáveis; registrar o que foi de fato executado, resultados e limitações. Comparar captura lado a lado com referência original quando ela estiver acessível; apontar diferenças específicas e corrigir iterativamente, sem autodeclarar 85% por intuição.
- PR draft com resumo dos arquivos, before/after, screenshots, técnicas adotadas, custo de renderização e checklist de regressões. Não mesclar nem mexer no trabalho do Claude.

**Prioridade:** olhos orgânicos piscando e acompanhando jogador + iluminação/composição fiel > quantidade de efeitos. Qualidade visual e atmosfera primeiro, sem sacrificar jogabilidade e mobile.

## MODO SILENCIOSO EXTREMO — OBRIGATÓRIO
- **Não enviar atualizações de progresso, mensagens de confirmação, relatórios parciais, explicações repetitivas, perguntas opcionais ou narração das ações.** Trabalhar silenciosamente e com autonomia até concluir.
- Não parar para pedir aprovação a cada etapa; pesquisar, implementar, corrigir e testar por conta própria dentro do escopo e da branch isolada.
- **Só se manifestar ao final**, com mensagem curtíssima contendo link do PR, capturas, testes e pendências reais.
- **Exceções estritamente necessárias:** pedir intervenção somente se houver bloqueio incontornável (credenciais, referência inacessível essencial ou decisão que possa afetar trabalho de outro agente), risco de perda de dados ou autorização explícita para merge. Nesse caso, enviar uma única pergunta objetiva e aguardar.
- Não confundir silêncio com ausência de registros: manter commits, evidências, testes e descrição do PR completos. **Nunca mesclar sem aprovação.**
