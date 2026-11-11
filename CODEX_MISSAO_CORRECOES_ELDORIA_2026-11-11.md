# MISSÃO CODEX — CORREÇÕES DEFINITIVAS DE ELDÓRIA (11/11/2026)

Repositório: PHBritoDev/Jogo-2-2.5D. **Execute as alterações de verdade**; este arquivo é uma ordem de implementação, não um relatório. Leia AGENTS.md e as orientações de arquitetura existentes antes de editar. Trabalhe em etapas, releia esta lista ao final de cada etapa, verifique o resultado em execução e não marque concluído com base apenas em alterações no código. Comunicação extremamente econômica: não despeje logs ou explicações extensas; reporte somente mudanças confirmadas, testes e impedimentos reais. Não apague este documento sem autorização.

## PRIORIDADE 1 — REMOVER DE VEZ TOCHAS PROCEDURAIS
- Localize **todas** as tochas 3D montadas por código (geometrias primitivas, hastes, suportes, clones/fallbacks procedurais) em **todas as áreas** da experiência, sobretudo vila, floresta e caverna. Elimine suas instanciações, seus resíduos visuais e os caminhos que possam recriá-las, inclusive fallback ao falhar carregamento. **A estrutura física das tochas deve vir exclusivamente do GLB criado no Meshy**, já incorporado ao projeto (localize o asset verdadeiro; não presuma caminho).
- Reduza **drasticamente** a quantidade. Distribua somente poucas tochas em pontos estrategicamente justificados: entradas, encruzilhadas, áreas habitadas e pontos escuros essenciais. Evite fileiras, repetição excessiva e densidade artificial. Preserve trechos escuros intencionais da caverna. Não substitua por novas tochas feitas em JS.
- É permitido VFX de **fogo animado** em código sobre o **modelo físico Meshy** quando visualmente adequado: chama fluida e leve movimento pelo vento, com orçamento rigoroso de luzes/draw calls, sem sombras dinâmicas caras em cada tocha. Não remova a iluminação da caverna indiscriminadamente. Elimine efeitos/desenhos de suporte procedurais antigos que gerem falsas tochas.
- Audite também transições, reload e LOD. **Teste de aceitação:** nenhum suporte/estrutura de tocha procedural visível ou sendo instanciado em jogo; apenas poucas tochas Meshy, posicionadas coerentemente. Aproveite o `torchAudit` e `tools/visual-lab/eldoria-watchdog.cjs` se aplicável, mas não confie só em contagem: valide screenshots.

## PRIORIDADE 2 — CÂMERA DA CAVERNA
- Reproduza tremedeira/jitter e ângulo ou posição inadequados em terceira pessoa: não se consegue olhar para frente, e primeira pessoa vira uma gambiarra necessária. Investigue colisão com teto/rocha, raycast/shape cast, oclusão, câmera empurrada por parede, atualizações concorrentes, interpolação/smoothing, clipping, escala e altura do alvo. Corrija **a causa**, não apenas diminua a velocidade do movimento.
- Terceira pessoa deve acompanhar suavemente o personagem, preservar visão frontal e evitar atravessar rocha, vibrar, alternar distâncias a cada frame ou ficar presa no teto. Teste corredores estreitos, portal, escadas, abismos e giro rápido de câmera, tanto andando quanto parado.
- Revisite `ascension-cave3d.js` e o controlador de câmera real, respeitando compatibilidade com o restante do jogo.

## PRIORIDADE 3 — PRIMEIRA PESSOA
- Investigue por que ao alternar 3ª → 1ª pessoa o personagem **parece maior** e **aparenta andar mais devagar**. Compare matematicamente escala do root/modelo, posição da câmera, FOV, altura dos olhos, velocidade real no mundo (unidades/segundo), input, colisões, deltaTime e deslocamento.
- Nenhuma mudança de escala física, collider ou velocidade ao alternar modos. Posição dos olhos/FOV devem gerar perspectiva natural, sem câmera dentro do corpo ou terreno. Diferencie lentidão perceptiva de alteração real de velocidade, corrigindo a causa e não adulterando o gameplay.
- Teste sequência 3ª → 1ª → 3ª em floresta, cidade e caverna, inclusive com corrida, pulo, dash e em corredores. Sem regressões.

## PRIORIDADE 4 — PICOS DE FRAME TIME NA FLORESTA
- Usuário relata 30–47 FPS habituais, com quedas súbitas a 4–9 FPS, congelamentos de aproximadamente 0,3–0,5 s e recuperação em 1–2 s, especialmente ao girar câmera/movimentar. **Capture frame times, long tasks, p95/p99, GC, chamadas de carregamento, recompilação de shader, upload de texturas, streaming/LOD, construção/destruição de geometrias, sombras e atualizações de vegetação.** Diferencie CPU main-thread, GPU, memória e rede.
- Use o teste existente `tools/visual-lab/forest-stutter-mod314.cjs` como ponto de partida e acrescente medições/reprodução consistentes. Não confunda FPS médio bom com ausência de travadinhas. Evite criação/dispose e alocação pesada durante giro de câmera; pré-carregue/pré-aqueça onde razoável; distribua trabalho por frames quando necessário; empregue pooling, instancing, culling/LOD **sem pop-in visual** e orçamento de atualização se realmente comprovados úteis.
- **PROIBIDO** resolver abaixando resolução, qualidade de textura, detalhe/modelos, densidade essencial da floresta, distância visual, efeitos marcantes ou iluminação bonita. Preserve a direção artística e a qualidade alta; otimize arquitetura e trabalho desnecessário. Não faça alterações cegas de performance.
- Se o navegador de testes não representa Android real, documente explicitamente essa limitação e não alegue medição em dispositivo físico. Compare antes/depois nas mesmas condições.

## PRIORIDADE 5 — TROCA DEFINITIVA DO ANJO GUIA
- Localize primeiro o asset **`AnjoGuiador-Otimizado.gbl`** citado pelo usuário; confira também se a extensão real é `.glb` (não adivinhe nem crie um modelo substituto). Caso o arquivo ainda não esteja no repositório, **não finja que a troca foi feita**: informe caminho/nome ausente e implemente somente o que for seguro sem placeholder genérico.
- Se o asset existir, faça a substituição completa da referência visual antiga do Anjo Guia por esse modelo em todos os pontos relevantes (spawn, cenas, dimensões e instâncias), com orientação, escala, materiais, animações, rig e colisões corretos. Elimine referências e carregamentos do modelo anterior; remova o arquivo antigo somente após confirmar que nenhum outro uso legítimo depende dele e que o novo funciona.
- Não alterar a narrativa ou o comportamento planejado do personagem desnecessariamente.

## VALIDAÇÃO E ENTREGA
1. Faça um inventário rápido dos pontos de instanciação das tochas, controladores de câmera e caminhos do Anjo Guia. Verifique o estado recente de main para evitar reintroduzir código antigo ou sobrescrever trabalho alheio.
2. Execute cada etapa e confirme em jogo **antes de passar à seguinte**. Valide as duas câmeras em 3 ambientes; capture screenshots da caverna e das tochas, e dados de frame time durante giro na floresta. Procure regressões de colisão, escadas, abismo, iluminação e carregamento.
3. Rode testes existentes pertinentes e atualize testes automatizados para impedir que retornem tochas procedurais ou troca indevida de escala/velocidade. **Se houver falha, corrija antes de declarar concluído.**
4. Não mexa em outros chefes, magias, cenários ou funcionalidades sem relação com esta missão. Preserve assets e dados do usuário. Evite merges conflitantes; use PR com resumo objetivo e provas. **Nunca declare sucesso sem evidência reproduzível.**
5. Ao final, informe concisamente: arquivos alterados, quantidade de tochas Meshy restantes, verificação de ausência de tochas procedurais, resultado 1ª/3ª pessoa, medições da floresta, status do novo Anjo Guia, testes e link do PR/commit.

**Critério principal:** resolver os bugs efetivamente no jogo, não só trocar comentários ou escrever “corrigido”.
