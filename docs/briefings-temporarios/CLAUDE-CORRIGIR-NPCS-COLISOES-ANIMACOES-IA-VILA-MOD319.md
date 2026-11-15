# CLAUDE — MISSÃO PRIORITÁRIA: VILA VIVA, NPCs, COLISÕES E ANIMAÇÕES (Mod 319+)
**Pedido do criador, 15/11/2026. Prioridade: corrigir defeitos reais mostrados em captura do jogo publicada no chat.** Não substituir o roteiro canônico nem refazer o mapa/caverna. Implementar no jogo real, não só criar relatório.

## Evidência recebida do criador
Captura horizontal do RPG em Mod 319, durante **Ato I — A Vila da Clareira**, objetivo “Pergunte ao vendedor de frutas sobre o Pecado da Ganância”, FPS exibido **37**. O protagonista está muito próximo de uma NPC de roupa escura no centro inferior-direito, com **volume escuro grande e esférico/irregular sobre a cabeça**, destoando do encaixe natural de cabelo/cabeça. Atrás estão bancas, mesas, balcões e estruturas de madeira. **Não afirmar qual objeto está errado sem abrir o jogo e inspecionar seu GLB, a câmera, geometria e hierarquia.** A captura foi enviada ao ChatGPT pelo criador; se a imagem não estiver acessível neste ambiente, reproduzir a mesma situação e registrar uma nova captura verdadeira. Comparar close-up frontal/lateral/traseiro e durante movimento.

## Prioridades P0 — corrigir de verdade
### 1. Aparência absurda na cabeça de NPC
- Investigar **todos os NPCs adultos e infantis**, especialmente a personagem no centro-direita da captura e as variantes cabelo longo/curto; localizar se é cabelo deslocado, escala/transform, cabeça duplicada, barba/procedural, oclusão ou prop. Mostrar diagnóstico com evidência.
- Conferir transformações locais vs mundo, ligação ao osso `Head`, `SkinnedMesh`, materiais, escala, acessórios e pré-cálculos `ELDORIA_HAIR_FITS`. Preservar a otimização da **#553/Mod 319**: **NUNCA** reativar a busca de milhares de encaixes no main thread durante load.
- Corrigir proporções, fixação, cor e movimento de cabelos/barbas; verificar homens, mulheres, menino e menina em idle, walking, virada de cabeça e gesto. Sem novos acessórios flutuantes e sem transformar NPC em boneco genérico.

### 2. Falta de matéria/colisão nas barracas e partes da vila
- Reproduzir andando em todas as direções contra **barracas, bancadas, mesas, caixas, paredes, pilares, casas, balcões, escadas e demais objetos sólidos** da Vila da Clareira. No relato, o jogador **atravessa a barraca** e alguns outros elementos.
- Identificar as fontes das malhas e suas colisões atuais, incluindo estruturas visualmente presentes que não participam do sistema físico. Adicionar volumes sólidos de colisão ajustados ao formato, com espaço suficiente para circulação; não adicionar colliders que bloqueiem portas, NPCs, ponte/trilha ou missões.
- Verificar personagem correndo, andando, pulando, dash e câmera em 1ª/3ª pessoa; corrigir penetração, paredes invisíveis e enrosco, mantendo bancas interativas e passagem dos NPCs. Se um objeto deve ser atravessável por design (plantas/panos), documentar e tratar de forma coerente.
- Incluir teste automatizado de geometria/contrato e **teste jogável real**, registrando antes/depois e coordenadas do defeito.

### 3. Respiração e demais animações bizarras
- Auditar **idle/respiração**, `Walking`, `Running`, `Wave_One_Hand`, `Alert`, inspeção, trabalho, gestos, fala e transições. Capturar vídeo lateral/frente e inspecionar oscilações excessivas, cabeça/cintura flutuando, distorção, clipping, dedos, pés deslizantes e loops abruptos.
- Priorizar **clipes já presentes nos GLBs reais**; corrigir intensidade, `AnimationMixer`, pesos, crossfade, timeScale, offset e retarget antes de inventar algo. Se clipe importado é inadequado, fazer animação de respiração sutil, procedural de poucos ossos e delta-time, ou novo clipe leve, sem interferir em root motion nem produzir movimento estranho. **Respiração deve ser discreta, orgânica e não deformar corpo/roupa**.
- Conferir execução sem animação empilhada, `idle` pausado incorretamente, ações conflitantes ou efeitos cumulativos; preservar performance em celulares.

## Prioridade P1 — IA ambiental significativamente melhor, COM CONVERSA REAL
Os NPCs hoje parecem repetitivos, com ações previsíveis. Transformar a vila num lugar crível por **rotinas diversas, reações situacionais e interação iniciada pelo jogador**, sem depender de serviços pagos, servidor remoto ou LLM online. Isto é IA de gameplay por estados, contexto, prioridades e memória local simples — não prometer inteligência conversacional ilimitada.

- **Olhar e atenção:** NPC detecta aproximação/ângulo, olha para o herói de modo natural (rotação limitada de cabeça/torso, sem pescoço quebrado), acompanha com olhar por um momento, depois retorna ao trabalho; evita rastreamento incessante quando jogador está atrás, muito longe ou ocupado.
- **Conversar de verdade:** ao chegar perto e olhar para NPC, exibir **interação clara “Conversar”** (botão touch acessível + teclado/PC), iniciar diálogo contextual com opções de resposta/ramificações breves. Integrar o sistema de diálogos, compras e quests **existente**; não substituir nem quebrar a sequência obrigatória do vendedor de frutas, compra, pistas do Pecado da Ganância, progresso do Ato I e canonicidade. Ter diálogos diferentes para Bento, Téo, Lia, moradora e outros, com personalidade, passado/ambiente e respostas adaptadas à missão/horário/última conversa. Reações visuais e animações coerentes durante a conversa.
- **Ações ambientais autênticas:** vendedores inspecionam/rearrumam mercadoria, conferem estoque, atendem, pausam e retomam; passantes mudam caminho, param ao ver o jogador, desviam, interagem com bancas/água e reagem a combate ou ameaça. Diferenciar comportamentos com durações e probabilidades controladas, evitar spam de `wave` e idle repetido.
- **Contexto/memória leve:** comportamento muda após primeira conversa, compra, suspeita, progressão da missão, aproximação repetida e perigo; salvar estado mínimo se necessário sem corromper `localStorage` nem recompensas.
- **Regras mobile:** IA atualizada por distância/visibilidade, escalonada em intervalos e com limite por frame, sem pathfinding caro a cada frame. Culling de atualização à distância; máximo de poucos NPCs ativos simultâneos; sem custo de rede; sem milhares de novos objetos/draw calls.
- **Qualidade:** evitar falas genéricas, infinitas ou aleatórias que contradigam o roteiro. Se sistemas de expressões faciais não existirem no GLB, NÃO fingir que existem; usar gestos, postura e direção do olhar, ou implementar recurso leve realmente testado.

## Arquitetura e pontos para investigar
- `eldoria-meshy-npcs.js`: fábrica, `Head`, cabelos/barbas, `ELDORIA_HAIR_FITS`, custo CPU.
- `eldoria-npc-life.js`: `VILLAGER_PROFILES`, `createVillagerBrain`, `driveVillager`, animações e reações.
- `mundo-3d-prototype.js`: `loadVillagers`, `updateVillagers`, `npcIdleLife`, proximidade/interação, câmera, física/colisões, atualização por frame.
- `act1-flow.js`: `vendorScene`, missão do vendedor, regras de progressão/recompensas.
- `npc-visual-qa.html`, `tools/visual-lab/`, `tests/npcs-vivos.test.mjs`, testes de colisão/quest, fotos/vídeos do agente visual.
- Verificar instâncias reais, colisões e arquivos de cenário em vez de presumir que renderização e física usam as mesmas malhas.

## Contrato de execução e aceitação — não encerrar cedo
1. **Reproduzir os três defeitos e a fraqueza da IA** no jogo real (mobile emulado + desktop) e registrar evidência verificável, sem inventar FPS de Android físico.
2. Corrigir **cada causa** no código com mudanças pequenas e isoladas, sem remover modelos 3D, ambientes, loja, missões ou reverter otimizações do Mod 319.
3. **Teste obrigatório:** visitar vila, atravessar o espaço livre, tentar atravessar estruturas sólidas, conversar com cada tipo de NPC, realizar a missão principal, voltar e conversar de novo, andar/pular/dash próximo das bancas, observar cabelo/respiração de frente e lateral, medir tempo de carregamento e long tasks, verificar FPS aproximado no Chromium.
4. Incluir regressões Node/CI e fotos comparáveis + vídeos de comportamentos (não só screenshots paradas); inspeção de frames e logs. Não tratar execução de workflow como prova visual sem olhar artefatos.
5. Manter no máximo **uma PR ativa desta missão**, sem merge automático; publicar evidências e resumo técnico na PR e registro curto na central **#519**. Respeitar alterações simultâneas dos agentes e do Claude em andamento; se houver branch concorrente, não sobrescrever.
6. **Comunicação mínima:** não despejar planos, atualizações ou relatórios no chat. Registrar detalhes técnicos no GitHub. Só responder **“Concluído.”** quando tiver implementado e testado tudo; não alegar conclusão falsa nem ocultar falhas.
7. Depois que a PR for aprovada e estiver segura para integrar, remover **este briefing temporário** na própria PR para não deixar instrução descartável no jogo. **Não elevar Mod/build-info.js por conta própria**.

**Objetivo final:** Vila da Clareira sólida, NPCs com aparência correta, respiração convincente, ações variadas, contato visual e **conversas jogáveis reais**, sem congelar o celular e sem quebrar a história.
