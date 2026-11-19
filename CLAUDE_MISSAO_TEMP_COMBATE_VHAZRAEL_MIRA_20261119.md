# ORDEM TEMPORÁRIA DO CRIADOR — COMBATE DE VERDADE, VHAZRAEL + MIRA DO HERÓI
**Execute na versão ATUAL da main de PHBritoDev/Jogo-2-2.5D.** Esta ordem tem prioridade para seu escopo; não remova nem substitua sistemas que já existem. Assim que ENTREGAR as alterações com provas e PRs revisáveis, **exclua este arquivo temporário NA SUA BRANCH**, preservando documentação/evidências permanentes. NÃO faça merge automático.

## MATERIAIS VISUAIS PRIMÁRIOS (obrigatórios)
O criador enviou 2 novos vídeos de combate **1000365547.mp4** (17,5 s) e **1000365548.mp4** (8,8 s), além dos vídeos ANTERIORES de referência de combate rápido/câmera e agora **Genshin Impact** como referência de fluidez. Os dois novos vídeos mostram VHAZRAEL no campo dourado/amarelado, ataque próximo, distâncias oscilantes, personagem e Bispo frequentemente de frente, boss ainda pouco responsivo, golpes e efeitos rubro-negros. No segundo, o protagonista está com pouca vida enquanto o chefe desfere efeitos grandes. Não afirme ter assistido aos vídeos que você não recebeu: o criador deve anexá-los a você, ou recupere-os de maneira legítima. Compare frames e jogue a MESMA luta real.
Referências externas: Genshin Impact para **auto-target inteligente, movimentação ágil, animações, transições, legibilidade de VFX e reatividade**, NÃO copiar conteúdo; referências anteriores fornecidas pelo criador para **dash ofensivo, combos rápidos, foco da câmera e impacto**. Diferencie auto-target assistido de hard lock-on. Não reproduza os defeitos de auto-aim que escolhe outro inimigo contra a intenção do jogador.
Exemplos de leitura:
- https://genshin-impact.fandom.com/wiki/Targeting
- https://www.gamedeveloper.com/design/enemy-design-and-enemy-ai-for-melee-combat-systems
- https://nbertoa.com/2023/05/08/unreal-5-melee-combat-system/
Pesquise fontes atualizadas e estude vídeos de gameplay reais quando útil.

## ALERTA CRÍTICO JÁ VERIFICADO NO CÓDIGO
Em **combat-melee-test-mode.js**, a main atual contém:
`export const TEMP_MELEE_ONLY_TEST = typeof window !== 'undefined' && !new URLSearchParams(window.location.search).has('fullCombatQA');`
**Isto mantém o modo SOMENTE FÍSICO ligado por padrão NO JOGO PÚBLICO**. Em `vhazrael3d.js`:
- `VHAZRAEL_SWORD_ONLY_TEST = TEMP_MELEE_ONLY_TEST`;
- `leap: VHAZRAEL_SWORD_ONLY_TEST ? null : VZ_LEAP`;
- `shield: VHAZRAEL_SWORD_ONLY_TEST ? null : SHIELD_SPECS.vhazrael`;
- `kit: VHAZRAEL_SWORD_ONLY_TEST ? [] : ['throne','thorns','bombard','orbital']`.
Isso explica **por que o Bispo 1 não salta, não ativa escudo nem magia** na versão normal; não é apenas falta de decisão da IA. CORRIJA A CAUSA primeiro. **Modo de treino só físico deve ser OPCIONAL e explícito**, nunca o padrão público; preserve os modos QA/legado sem fazer testes Node e runtime passarem por caminhos falsos. Revise TODOS os outros inimigos afetados por `meleeOnlyProfile`, restaure suas habilidades canônicas, respeitando equilíbrio e story gates.

## 1. ACERTOS E COMBATE DO PROTAGONISTA — MÁXIMA PRIORIDADE
Problema reproduzido pelo criador: com inimigo bem à frente, mover **ligeiramente** o stick para trás ou lados ao apertar GOLPE faz o herói golpear para trás/lado e perder o alvo. A movimentação e a intenção do ataque NÃO devem ser a mesma coisa.
- Em combate, se houver oponente válido à frente/selecionado e ao alcance, orientar automaticamente **peito, mão, lâmina, trajetória e hitbox** para o oponente no início e nas janelas corretas do golpe, enquanto o stick comanda a **translação independente** (orbitar, recuar, strafe). Nada de herói girar 180° automaticamente por leve ruído do analógico. Deadzone adequada e histerese/estabilidade de alvo.
- Adotar duas camadas: auto-target próximo assistido para golpes, e lock-on selecionável/alternável que centraliza e mantém um alvo na câmera; não transformar câmera em prisão, nem perder controle livre, nem forçar auto-aim em inimigo errado. Em boss 1v1, priorizar o Bispo. Ao perder alvo/LOS/morrer, sair suavemente do lock-on; nunca girar violentamente.
- Animação de strafe/recuo sem quebrar facing, transições de ataque→dash→ataque→recuo, buffering, cancelamento consciente, root motion com colisão. Consertar o golpe quando a câmera está atrás/alta/rodada, quando jogador e chefe se cruzam, e em 1ª/3ª pessoa. Não resolver com raio de hit gigante ou dano fantasma. Sincronizar contato de espada, VFX e áudio.
- Preservar botões e sistema EXISTENTE de dash, escudo, pulo, magia e ultimate, seus cooldowns, HUD e física; sem sistemas concorrentes. Dar peso e velocidade através de timing/contato real, não só multiplicar animações.

## 2. VHAZRAEL / BISPO 1 — ENCONTRO INTELIGENTE E AGRESSIVO
A main tem `vhazrael3d.js`, `vhazrael-rig3d.js`, `enemy1-squad3d.js`, `boss-choreography3d.js`, `combat-defense3d.js`, `vhazrael-choreo3d.js`.
- Modelo REAL é **VHAZRAEL.glb**, com **16 clipes, 23 ossos**; `vhazrael-rig3d.js` já associa dash a `Jump_Over_Obstacle_2`, jump a `Basic_Jump`, defesa, magia, riposta, dupla/tripla, giro, dança, corrida etc. O arquivo `docs/combate/INVENTARIO-CLIPES.md` informa **100% dos nomes referenciados** no código, o que **NÃO demonstra uso frequente ou correto em runtime**. Audite para cada clipe: se toca de verdade, probabilidade, frequência por luta, transições, duração, orientação e contatos. Use todos os clipes **compatíveis**, não cada clipe em cada luta nem animações incompatíveis.
- Ele já tem `VZ_DASH` (speed 13, time .24, cooldown .5, budget 3 em 2,5s, lockout 1,3s), `VZ_LEAP` e `shieldAI`. Não crie poderes/sistemas duplicados. Inspecione por que dash de aproximação só dispara no código quando jogador recua **d > 6,5m** e após acúmulo `S.far`: amplie decisões com **iniciativa** e variedade sem spammar dash.
- Desenvolver comportamento situacional, com estados/utility AI e telegraphs coerentes: **dash para entrar em alcance + corte; dash lateral para flanquear + combo; dash para trás ao evitar golpe/magia; dash para reposicionar + conjurar magia; dash para sair da área da magia do herói; salto para atacar, escapar ou alterar distância; bloquear/escudo para resistir a ataques ou casts; parry/riposta quando justificado**. Recuar não significa fugir continuamente. Respeitar stamina, limites, cooldown, colisões e limitações de arena. Nunca ler inputs futuros; só ações já iniciadas/visíveis e estimativas limitadas.
- A reação à magia do herói deve variar: às vezes **escudo**, às vezes **dash para evitar**, às vezes **salto** se apropriado, às vezes receber dano. Não ser invencível nem se esquivar de absolutamente tudo. Após evasiva, contra-atacar ou conjurar quando houver oportunidade. Padrões e escolhas diferentes por fase da vida (ensino → técnica → pressão → fúria). Que as 16 animações, poderes originais e ataques físicos formem **uma luta épica imprevisível mas justa**, não uma sequência automática.
- Rever IA de alcance, state machine, thresholds, cooldowns, interrupt/uninterruptible, esquiva, janelas de escudo, hit reactions, ataque de magias, turn rate, root motion, transições. Conferir bugs de animação, braços/arma e escala em centímetros do rig.
- As habilidades canônicas `throne/thorns/bombard/orbital` devem voltar ao combate público (observando desbloqueio/fases e a história), com clareza, sem tornar toda a luta apenas spam de magia. Não alterar identidade visual/ataques existentes sem justificar e evidenciar.

## 3. QUALIDADE CINEMATOGRÁFICA E EXPERIÊNCIA RPG
O usuário quer um combate **mais ágil e melhor que o atual**, com câmera como em jogos de ação modernos: o inimigo próximo visualmente, leitura do corpo e da lâmina, câmera que acompanha deslocamentos e dash sem atravessar geometria nem ocultar personagem no HUD. Suavização, spring arm/occlusion, enquadramento em função de distância, lock-on e altura do chefe, cancelamento com limites. Não exagerar shake, slow motion, motion blur, emissive ou partículas; o custo visual deve caber em celulares. Priorizar leitura de telegraph, som do contato, pequeno hitstop variado, VFX realmente no impacto, clareza de hit reaction e defesa; presença/ameaça do chefe sem teleporte trapaça.
Questione tecnicamente a qualidade **real** do jogo, não apenas comparação de screenshot; melhore as falhas adicionais que você encontrar nos vídeos: travadas/jitter, giros erráticos, distâncias excessivas, clipping, falta de hit reaction, alcance, telegraph, lógica de posição, alvos, lock-on, latência e inimigo passivo. Não use apenas testes estáticos para declarar tudo concluído.

## 4. PROCESSO E CRITÉRIOS DE ACEITE (NÃO NEGOCIÁVEIS)
1. Ler `main` atual, confirmar que as PRs recentes (#608 e outras) foram integradas, verificar PRs abertas, evitar sobrescrever agentes e respeitar central #519. Escopo limitado ao combate/câmera/IA e testes correspondentes. Fazer entregas **revisáveis** sem merge automático.
2. Reproduzir lado/trás+ataque e demonstrar vídeo ANTES/DEPOIS em celular/PC: stick para trás/lateral com inimigo na frente deve resultar em **passo lateral/recuo enquanto golpe orientado ao alvo**, salvo escolha deliberada de mirar livremente. Testar 1 alvo, múltiplos alvos, alvo atrás, LOS perdido, fora do alcance, inimigo atravessando centro e alvo móvel.
3. Rodar duelo **real de VHAZRAEL em modo público SEM `fullCombatQA=1`**. Instrumentar eventos e publicar evidências de **dash ofensivo, dash defensivo, dash de retirada contra magia, salto, escudo, magias e clipes variados** efetivamente vistos. Testar cooldowns, vida, danos, FPS, colisões, morte, reset de batalha, controle PC/mobile e lock-on.
4. Não aceite a frase “todos os clipes referenciados no código” como prova; registrar tabela de clipes usados em runtime num duelo, ocasiões reais, percentuais/cadência, e o que não foi usado com motivo. Não distorcer IA só para atingir 100% de clipes numa luta curta.
5. Testar regressões e documentar riscos, imagens e vídeos no GitHub. Falha de runner/CI deve ser separada de falha real. Zero aprovação com vídeo de pose estática ou teste que ignora poderes.
6. Ao concluir tudo, apagar **este briefing temporário** NA PR/BRANCH de entrega, mas preservar documentação/evidências permanentes. **NÃO fazer merge automático.**

## REGRA MÁXIMA — SILÊNCIO NO CHAT
Trabalhe com o máximo de eficiência de contexto/tokens. **NÃO enviar mensagens de planejamento, comentários, progresso, pedidos de confirmação, recapitulação ou resumo final. AO TERMINAR, NÃO ENVIAR NENHUMA MENSAGEM DE RESUMO.** Coloque resultados no GitHub (commits, PRs, evidências); só interrompa o silêncio diante de bloqueio real impossível de resolver autonomamente, com frase mínima. Não pare cedo só porque testes unitários passaram. Não confunda silêncio com deixar de trabalhar.


## ADENDO DE DIREÇÃO — 19/11: CINCO MELHORIAS DE COMBATE PROFISSIONAL
Este adendo complementa os itens anteriores, sem mudar o escopo nem justificar novos sistemas redundantes.

1. **Magnetismo de golpe e motion warping CONTROLADOS**. Dentro de uma janela curta de início/contato, ajustar suavemente facing, avanço e alcance plausível ao alvo válido. Incluir limites por distância, ângulo e visibilidade (LOS). Nunca puxar personagem através de parede, de outro inimigo ou vários metros para “garantir acerto”; em alvos distantes, errar é correto. Instrumentar erro de posição da lâmina, raiz e orientação do alvo por frame.

2. **Strafe + alvo estável + intenção explícita de mira**. Separar comando de deslocamento da direção do ataque; com lock-on, stick lateral/trás = orbitar/recuar com tronco/arma voltados ao inimigo. Fora de lock-on, assist aim escolhe alvo ponderando cone da câmera, proximidade, distância ao centro da tela, LOS e alvo atacado recentemente, com histerese. Oferecer troca manual de alvo e escape do auto-target. Não imitar indiscriminadamente Genshin: sua mira automática também é criticada por errar o inimigo escolhido.

3. **Defesa responsiva e contrajogo justo**. Testar guarda normal, aparada de precisão (*parry*, somente se compatível com o sistema de defesa existente), dash com i-frames, resposta de stagger, recuperação e contra-ataque. Conservar o escudo canônico, sem introduzir botão extra de block já removido pelo criador. Não tornar Bispo invulnerável em cadeias permanentes de dash/escudo/salto; cada comportamento tem recuperação e contra-jogada visível.

4. **IA de intenção e distância mensurável**. Criar *decision matrix* compacta para VHAZRAEL por faixas (muito perto, alcance de espada, alcance de dash, alcance de magia), estado do jogador (preparando magia, ataque ativo, exaustão, recuo) e fase do chefe. Ações com objetivo: entrar, flanquear, bait, punir, defender, sair, conjurar; evitar alternância aleatória ou infinitos dashes. Priorizar o jogador entender *por que* o Bispo agiu assim: telegrafia do corpo, som, espaço de perigo e oportunidade de resposta. Medir frequência de repetição e tempo passivo entre ações.

5. **Postura, interrupções e legibilidade audiovisual**. Respeitar peso e identidade de cada golpe, janelas startup/ativo/recovery/cancel, buffering de entrada e reações ao contato. Hitstop curto deve manter entradas no buffer; golpes leves não devem interromper ataques ininterruptíveis e ataques pesados só devem ser inevitáveis se houver aviso e contrajogo justo. Estabelecer orçamento de câmera/shake/efeitos por FPS mobile. Incluir cenários QA de 30 FPS, 45 FPS e 60 FPS para assegurar timings independentes do frame rate.

**Prioridade concreta de execução:** restauração do kit público (P0) → direção do ataque independente do stick (P0) → facing/câmera com lock-on (P1) → IA ofensiva/defensiva VHAZRAEL (P1) → polish/efeitos (P2). Não pular fases para maquiar vídeo com partículas.

**Leituras técnicas indicadas (referências de princípios, não instruções para copiar):**
- https://www.jasondeheras.com/gamedesign/2021/2/11/meleecombatdesign — design de targeting, cancelamentos e motion warping.
- https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing — avisos legíveis e oportunidades de reação.
- https://www.gamedeveloper.com/design/enemy-design-and-enemy-ai-for-melee-combat-systems — limites, recuperação e regras de ataque de inimigos.
- https://genshin-impact.fandom.com/wiki/Targeting — observação de targeting automatizado, que deve ser adaptado criticamente.


## ADENDO ARTÍSTICO E TÉCNICO — PRESENÇA DO VHAZRAEL AO ANDAR COM ESPADA (19/11)
**Pedido explícito do criador:** nos vídeos recentes, o Bispo 1 caminha segurando a espada caída, sem intenção, como se o braço estivesse cansado. Isso destrói sua presença ameaçadora. O criador sugere carregá-la às costas e sacá-la antes de atacar, mas rejeita qualquer lâmina atravessando seu torso. A direção artística **PREFERENCIAL** é corrigir primeiro a postura COM A ESPADA NA MÃO, mais segura e coerente para um duelista que inicia combos/dashes rapidamente; empunhadura nas costas é uma alternativa **condicionada a implementação e testes impecáveis**, não requisito obrigatório.

### Direção visual proposta
1. **Marcha do Executor** (distância média/longa, fora de golpe): caminhada lenta e deliberada, ombros abertos, peito elevado, cabeça e olhar voltados para o jogador; espada firme na mão dominante, lâmina diagonal para cima ou inclinada próxima ao ombro direito, com silhueta nítida e separada do corpo. Evitar lâmina arrastando, braço pendurado/solto, punho torcido, ponta atravessando capa/asa, expressão de preguiça. Dar sensação de poder contido e tranquilidade arrogante. A espada **não pode atravessar rosto, ombro, peito, asa, pernas nem cenário**; preferir inclinação à lateral do ombro e verificar envelope de movimento.
2. **Guarda de Predador** (entrando em alcance): passagem suave a uma guarda ofensiva à frente do tronco, cotovelos ativos e lâmina pronta para golpe; mirar o jogador, strafe deliberado, micromovimentos respiratórios sutis. Sem vibrar arma, rig ou câmera; movimentos naturais, com antecipação curta e legível. Ao recuar/strafe, preservar pose e facing, sem transformar recuo em marcha de costas desarmada.
3. **Arrancada e dash ofensivo**: na aceleração ele abaixa um pouco centro de massa e conduz espada junto ao corpo SEM cruzar sua malha, abrindo a guarda na aproximação e concluindo com corte real. O escudo/cast/jump/riposta deve possuir transição própria; a postura nunca deve bloquear emergência do dash, magia ou defesa.
4. **Alternativa cinematográfica — espada guardada nas costas**: SÓ aplicar se houver espaço físico, bainha/encaixe visual coerente com modelo e animação de saque de qualidade (podendo exigir criação de clipe dedicado). Usar 2 sockets/âncoras `backSheath` e `rightHand`, transição por evento no frame exato em que mão encontra o cabo, **sem interpolar a espada através do corpo**. A sequência precisa mostrar a mão segurando o punho ANTES da troca; momento da troca sem teleport visual, clipping ou arma duplicada. Não usar parent-switch abrupto com salto visível, nem mover lâmina em linha reta cruzando torso; animação de braço/arco de extração respeita volumes do corpo. Se não conseguir sacar bem, abandonar esta opção e usar a Marcha do Executor na mão. Não criar bainha 3D genérica feia.
5. **Viabilidade do rig real**: `VHAZRAEL.glb` atualmente tem 16 clipes e 23 ossos; `vhazrael-rig3d.js` já faz `calibrateGrip`, usa `RightHand`, `VZ_ROLES` para `idle/look/walk/stride/run`, e combina clipes com a espada em objeto separado. **Verificar** visualmente os clipes reais, eixo da mão, eixo da espada, transform local e blends; não assumir que 'Casual_Walk' ou 'Walking' são adequados para arma erguida. Combinar animação de pernas e tronco/braços (máscara/layer por ossos, IK/FABRIK ou correção procedural LIMITADA e suave) quando justificado; não quebrar clips de combate existentes, motion trace, hitboxes ou perf mobile. Caso o rig não permita naturalidade, criar clipe ou ajustar especificamente o necessário de forma exportável e demonstrável.
6. **Inspeção obrigatória**: gravar antes/depois em câmera frontal/lateral/traseira e durante volta 360°, marcha, caminhada lateral, transição guarda, dash, salto, conjuração, escudo e combo. Testar distância da lâmina ao corpo ao longo dos frames com margem de segurança em poses extremas; registrar qualquer clipping e corrigir. Não falsificar qualidade com captura frontal isolada. Medir FPS mobile.

### Objetivo de presença
Quando o herói vê VHAZRAEL se aproximar, deve sentir que o Bispo sabe lutar, está tranquilo e perigoso, e consegue sacar/agir imediatamente. **Silhueta forte e controle da arma, não pose estática bonita que quebra durante o movimento.**

### Referências consultáveis
- Referências de locomoção armada de Elden Ring: https://www.youtube.com/watch?v=GF-daRUnvxE ; https://www.youtube.com/watch?v=aRRBR4JKEBA
- Prática de sockets de arma mão/bainha: https://polyphase-labs.github.io/Polyphase-Engine/Development/BoneSockets/
- Prática de transições em animação de sacar/guardar: https://forums.unrealengine.com/t/weapons-rotation-issue-while-playing-planted-in-the-ground-animation/1972858
- Exemplos de blending por ossos para braços em arma: https://www.theseus.fi/bitstream/handle/10024/796958/Marika_Salli.pdf?sequence=2

**Hierarquia:** esta melhoria visual entra depois de corrigir o modo público sem poderes e o bug da mira; mas deve estar concluída e gravada antes de encerrar a missão.
