# MISSÃO TEMPORÁRIA PARA O CODEX — VHAZRAEL: DUELO CINEMATOGRÁFICO DE ESPADA, IA E IMPACTO
**Criador:** PHBritoDev · **Repo:** PHBritoDev/Jogo-2-2.5D · **Data:** 19/11/2026.
**Executor:** Codex DESTA tarefa. **Claude será responsável pelo novo modelo/combate do Bispo 2 em breve — NÃO tocar, antecipar, bloquear nem interferir nesse trabalho.**
**Regra fundamental:** investir tempo de execução em corrigir DE VERDADE, não em gerar respostas, tabelas ou código superficial.

## 0. INTENÇÃO — O QUE O CRIADOR VIU E QUER
**Avaliação positiva:** o combate melhorou muito desde a versão anterior, porém VHAZRAEL, Bispo 1, ainda falha em pontos fundamentais:
1. Em algumas animações ele/espada ficam em posição errada; golpes erram apesar de o herói estar na frente.
2. O **escudo nunca foi visto** durante jogo real.
3. O Bispo usa dash/teleporte **raramente**. Quer movimentação espetacular de predador: dash de aproximação, lateral, recuo, fuga, recuperação e flanqueamento, inclusive **sequências de múltiplos dashes combinadas**, com decisão estratégica e limites de justiça/colisão.
4. No futuro, quando as magias forem religadas, deve conseguir **dash para recuar → magia**, **dash para perseguir jogador que fugiu → corte**, **dash para escapar de magia → reentrada**. Preparar arquitetura agora, mas **NÃO religar magia/ultimate**.
5. O salto ofensivo atual parece um **pulinho fraco** na altura do herói; quer um SALTO VERTICAL ALTO, assustador, com aura sombria que aumente a tensão, queda agressiva sobre área sinalizada, **núcleo de explosão no contato com chão/alvo, SEM nuvens/fumaça**. Reaproveitar efeitos bonitos existentes se atenderem; caso contrário, efeito original de energia/onda/partículas radiais, com impacto palpável e orçamento mobile. **Nenhuma explosão pode causar dano fora da área visível anunciada**, dano único por evento, sem múltiplas detonações involuntárias.
6. Quase nunca pula; quer uso estratégico de salto + dash, tanto defensivo quanto ofensivo.
7. Pausas entre animações de golpe deixam o combate lento, sem combos fluidos; quer emendar corretamente o próximo golpe **no momento de recuperação permitido**, sem esperar uma nova animação idle inteira e sem cortar o hit anterior.
8. Inspecionar outros bugs verificáveis do Bispo 1 e corrigir só os que realmente existirem.

**Vídeo fornecido pelo criador:** `1000365571.mp4` (~17,3 s, horizontal 2340×1080). Ele mostra luta de teste na arena dourada do VHAZRAEL, com espada/avanço e herói frequentemente afastado. **O vídeo está anexado na conversa do criador, não necessariamente disponível no seu ambiente**: peça/receba o anexo ou use capturas reais próprias; não alegar que o assistiu se só recebeu este markdown. Ele é evidência visual, não substitui instrumentação/medição do código.

**Identidade desejada:** duelista sombrio e majestoso, rápido, cruel e calculista. Combate como grandes action RPGs, sem copiar ataques/movimentos exatos de terceiros, sem teleporte infinito ou golpes ilegíveis. Referências orientativas: Genshin Impact (leitura de câmera/lock-on), Arknights: Endfield (dinamismo/posicionamento), Wuthering Waves, Sekiro e chefes de Elden Ring (duelos, antecipação, punição e presença). Não imitar assets autorais.

## 1. PRIMEIRA AÇÃO: RECONHECIMENTO/COORDENAÇÃO
1. **Ler o estado ATUAL da main, branches/PRs abertas e diff dos arquivos antes de editar.** Não confiar no número de MOD do vídeo como prova da versão.
2. Ler `docs/combate/MISSAO-VHAZRAEL-MIRA-2026-11-19.md` e auditar `vhazrael3d.js`, `vhazrael-rig3d.js`, `enemy1-squad3d.js`, `enemy1-squad-runtime3d.js`, `boss-choreography3d.js`, `enemy3-runtime3d.js`, `combat-melee-test-mode.js`, `combat-defense3d.js`, VFX existentes, `tests/vhazrael-taticas.test.mjs`, `tests/mira-ataque.test.mjs`, `mod181-loader.js` e testes relevantes. Outros arquivos só sob necessidade comprovada.
3. Conferir coordenação #519 e PRs do Claude/A2: **não sobrescrever** alterações recentes/branch do novo Bispo 2, rig novo, dimensão do Bispo 2, sprites, áudio, câmera global ou iluminação. Tocar no motor compartilhado SOMENTE se indispensável; patch mínimo verificável; deixar arquivo isolado e coordenação se houver conflito. **ÁUDIO está reservado para uma futura missão de alta qualidade do criador com Claude: não editar sons nem trilhas.**
4. Branch própria a partir da main fresca, uma PR isolada e sem merge automático. Não editar diretamente main.
5. **Modo de teste vigente:** `BISHOP_DUEL_ONLY` em `combat-melee-test-mode.js` deixa Bispos sem magia/ultimate. Preservar isso: teste de esgrima, escudo, dash e salto é o objetivo AGORA. `?bisposComPoderes=1`/`?fullCombatQA=1` devem continuar permitindo kit completo futuramente. **Não remover powers, não reativar magias, não desativar escudo/salto por acidente e não alterar comportamento dos outros Bispos.**
6. CUIDADO: uma versão antiga causou erro de import de `BISHOP_DUEL_ONLY` e quebrou o boot inteiro. Validar grafo de imports, exports, query/versionamento de módulos e aquecimento de cache; realizar smoke de entrada no mundo. Não usar tags manuais de ?v espalhadas sem testar interdependência/cache.

## 2. DIAGNÓSTICOS REAIS DA MAIN — HIPÓTESES IMPORTANTES A VALIDAR
- `vhazrael3d.js` define `VZ_LEAP` (duplo impulso/dash aéreo/strike) e escudo `SHIELD_SPECS.vhazrael` corretamente no perfil atual. **Ter código não significa que se consegue observar em gameplay.** Verificar decisão, reachability, `a.act`, `a.react`, animação, trajetória e VFX.
- `enemy1-squad3d.js` `perceive()` só tenta escudo sob condições de alvo atacando/conjurando, distância válida, `!a.act`, cooldown `shieldGap`, chance aleatória e ativação posterior de `a.react`. Possível STARVATION: combos/dashes/ações consecutivas impedem janela ociosa; falta telemetria e teste forçado sem falsificar QA. Diagnosticar o verdadeiro gargalo antes de alterar percentuais. Escudo deve ser visível, coerente, ativado por sinais do jogador, com cooldown justo e sem paralisar chefe.
- O dash atual `VZ_DASH` está em speed=13, time=.24, cd=.5, budget=3, window=2.5, lockout=1.3; `VZ_TACTICS` escolhe `entrar/flanquear/sair` em intervalos .38–.62 s e cooldowns 2.6/3.4/3 s; existem diversos estados e `sq.canAttack`/alert/cooldowns que podem bloquear ações. **Não apenas reduzir cooldown arbitrariamente**; implementar encadeamento real com estados, medindo frequência e oportunidade, anti-spam, colisão e recuperação.
- `VZ_MOVES` tem 7 golpes catalogados a partir de clipes GLB reais. `BOSS_MOVES.vhazrael` quando `VHAZRAEL_SWORD_ONLY_TEST` **filtra `m.range`**, removendo `Trono_Estocada` — precisamente um golpe de avanço! Examinar se é intencional e, se adequado, restaurar estocada como **golpe físico** (não magia). O catálogo/seleção não deve reduzir o combate a dois golpes repetidos.
- `vhazrael-rig3d.js`: 16 clipes/23 ossos catalogados, RightHand, `calibrateGrip`, `nativeMoveClips` que amostra rastro local da lâmina ~30 Hz, `inPlaceClip`. `VZ_MOVES` define picos de `hits`/duração/avance, enquanto `vhazrael3d.js` define taxas diferentes por golpe. **Investigar desalinhamento ENTRE tempo do mixer, duração escalada, hand trace, frame amostrado, yaw/world transform e janelas de dano**: pode explicar cortes no vazio, espada se afastando, postura quebrada. Não aumentar hitbox até começar a acertar magicamente.
- `enemy1-squad3d.js` tem `startLeap/stepLeap`, dupla impulsão e dash aéreo, mas `VZ_LEAP` é relativamente baixo no visual (v1 7.4, v2 5.8, gravity18, maxAir1.5) e `decide()` concorre com melee mais pontuado; `vzHop` é SALTO CURTO DEFENSIVO diferente de `startLeap`. **Não confundir** um hop evasivo baixo (permitido) com o NOVO salto colossal ofensivo (obrigatório). Verificar se o herói está vendo só `hop`, jump clipping ou o `leap` inteiro.
- IA de `vhazraelBrain/vzTactics` já tem memória de dash do jogador, leitura de cast, flank/enter/out. **Melhorar e ligar caminhos existentes**, sem construir segunda IA concorrente. Verificar `bossGap`, `a.cds.melee`, `startMelee` e recuperação/animation mixer para encadear golpe sem idle e sem cortar strike.
- `SHIELD_SPECS.vhazrael` já possui escudo de obsidiana; preferir ativar/validar o VFX REAL existente a desenhar escudo novo genérico.

## 3. PRIORIDADES EXECUTÁVEIS
### P0 — A) Corrigir clipping, mão/espada e acerto real
- Reproduzir cada golpe do `VHAZRAEL.glb` em câmera frontal, lateral e costas, 30/45/60 FPS, andando/virando/da dash/jump. Logar ação, clip, `action.time`, `effectiveTimeScale`, `actor yaw`, bone `RightHand`, quaternion da espada, world endpoints, janela ativa, contato e distâncias ao jogador.
- Corrigir o(s) CLIP(s) específico(s) que entortam corpo/espada. Respeitar hierarchy bone/parent transforms, root motion (já removido de certos clipes), hand socket/offset estável, troca de animações sem interpolar por dentro do corpo, clip fora de faixa, reset de quaternion entre poses; nunca deformar o modelo inteiro só para enquadrar.
- Garantir que o traço da arma (geometria REAL ponta/cabo e intervalo espacial entre quadros) e a janela de dano sejam extraídos da MESMA pose/mesmo tempo efetivo. Aplicar sweep contínuo de segmentos em espaço do mundo e distância vertical, verificação de linha de visão e tolerância mínima humana quando necessário. Não acertar através de parede, não dar dano fora do arco, nem permitir que espada aparente acertar e não registre sem explicação.
- Rotação (yaw) controlada até o startup/active: olhar alvo durante aproximação, correção limitada e não instantânea durante contato, preservar follow-through. Se alvo saiu do arco real, permitir erro justo, não autohit.
- Critério mensurável: situações “herói à frente dentro do alcance”, laterais/atrás, em degrau, alvo movendo, em dash e após salto. Contato coerente em todos; HIT/MISS anotados com imagens/vídeos e razões, sem falsificar 100% de acerto.

### P0 — B) Escudo de obsidiana utilizável
- Traçar `perceive → react shield → startReaction shield → EnergyShield.activate → onEvent/VFX → hit/expiration/cooldown`, incluindo quando o chefe está ocupado em combo. Identificar por que não acontece na sessão normal.
- Criar oportunidades legítimas de defesa (janela entre golpes, cancelar SOMENTE recuperação elegível, sem cortar golpe pesado em full-active) + reatividade probabilística com tempo observável. Escudo contra espada e magia do HERÓI (mesmo no treino sem magia dos Bispos). Não obrigar o jogador a ativar debug para vê-lo.
- Validar shield renderizado, golpe bloqueado/mitigado/rompido, cooldown, resposta física/riposta e duração; evento de QA que força um caso em ambiente isolado e teste orgânico sem forçar.

### P1 — C) Coreografia de dashes MULTIPLOS e inteligência real
- Estados/intenção observáveis: `chase` (persegue dash do herói), `approach`, `flank`, `retreat`, `bait`, `counter`, `airReposition`, `guard`, `strike`, `reset`. Não colocar um random simples com mais chance de dash.
- Criar **sequências intencionais de 2–3 dashes** em janelas situacionais, por exemplo:
  * herói fugiu em dash: 1 aproxima → 1 contorna lateralmente → corte, se viável;
  * herói pressionou: bloqueia ou deflete → dash para trás → dash lateral → riposta;
  * herói longe: dash curto de aproximação → reposicionamento → golpe que alcança;
  * herói tenta flanquear: pivot limitado → dash lateral → guarda;
  * futuramente, em kit completo: dash back → cast, cast→dash de saída, dash→corte no fim da conjuração. **Preparar hooks de transição, mas não habilitar cast/ult agora**.
- Uso variado de distância por gap REAL, previsão LIMITADA baseada em velocidade já visível, sem ler input futuro. Velocidade, deslocamento e animação do dash precisam casar; teleporte curto visual pode ser estilizado mas colisões e destino devem ser validados, sem pop atravessando jogador, paredes, degraus, bordas/abismos; não sumir da arena; nunca travar em obstáculo. Seguir o herói mas sem ser imbatível: janela após sequência, fatigabilidade tática/recursos, limite contra spam e recuperação legível.
- Ajustar budget/cooldown para permitir sequências especiais e impedir loop infinito; metas orientativas, NÃO números rígidos sem teste: em combate engajado de 30–45 s observar várias decisões de dash, pelo menos um avanço, um recuo, um flanco e uma sequência dupla quando situações forem provocadas. Não “teleportar sempre”.
- Combos dash→espada devem sair de estados válidos, com callbacks/eventos claros e sem instant 180° ou entrar num golpe enquanto arma/rastro estão atravessando corpo.

### P1 — D) SALTO DO JULGAMENTO: novo ataque vertical épico
- Salto ofensivo ALTO, separado do `vzHop` curto: preparação com aura sombria/pressão luminosa contida, impulso vertical marcante, silhueta e espada apontadas para alvo, pico alto com leitura cinematográfica, escolha de área de queda com limitação de tracking, pose de mergulho e landing com `CORE IMPACT` (núcleo compacto de energia/rachadura/anéis radiais) e nenhuma fumaça/nuvem. Contato com o chão precisa ser visível, física/cápsula real e sincronização com espadada.
- **Aviso claro e oportunidade de resposta**: durante preparação e descida, indicar zona de impacto no solo (sinal visual que combina com estética da arena, não decal genérico neon). Travar o ponto de destino antes da janela final; fugir com dash/jump deve funcionar. Atacar altura extrema sem warning vira injusto.
- Escolher altura em proporção ao avatar/ambiente e com teto vertical da arena, sem clip no céu/teto/câmera; usar curva de parábola/gravidade, escala coerente com solo, aterrissagem sem afundar/flutuar, camera shake curto com decaimento e opção reduzida. Se animação `Basic_Jump` não comportar altura, remodelar root/pesos/retarget ou montar nova composição com clipe apropriado sem desarticular braços/pernas.
- Precisar quando ele usa o leap (ao perseguir, encerrar dash-chain, punir player imóvel ou após recuar), respeitando cooldown e solo válido; combinar dash aéreo só quando trajetórias plausíveis. Nunca duplicar hit no contato com o chão e a espada; condicionar efeitos ao evento real de aterrissagem.
- Reaproveitar VFX existente SE for bom; sem `smoke` procedural genérico, sem enorme esfera emissiva que estoura exposição do mapa, sem luzes dinâmicas pesadas, sem partículas sobre FPS mobile. Nenhuma alteração global de auroras/iluminação.

### P1 — E) COMBOS com continuidade de verdade
- Conectar `startup → active → follow-through → recovery cancelável → próximo startup` com buffers/eventos e transições pré-definidas. O segundo golpe começa assim que o primeiro legalmente termina (ou em janela curta de cancel), não após uma rodada inteira de `idle`/cooldown. 2–4 golpes conforme fase/distância; variar direções e tempo; não executar 4× a mesma sequência.
- Cada hit deve casar com animação e rastro; não cortar golpe antes do dano nem acelerar todos os clipes cegamente. Não deixar o Bispo imune a contra-ataque durante toda cadeia; existir janela de punição após combo pesado/dash-chain.
- Testar animações específicas e blending sem poses quebradas, sem sword clipping, sem pés deslizando; validar estados de hit/stagger/dash/parry no meio de combo.
- Integrar fluxo com `bossGap`, cooldowns, `startMelee`, `stepAction`, `VZ_MOVES` e end-events existentes, sem duplicar lógicas que competem.

### P2 — Refino adicional se comprovadamente necessário
- Peso dos golpes: pausa de impacto **curta** (hitstop), feedback de câmera orientado ao alvo, e brilho de impacto seletivo; testar no FPS do celular e manter controle do jogador. Em vez de partículas pesadas, destacar rastro correto e faíscas de contato quando COLIDE.
- Direção do olhar/guarda/respiração/pose enquanto a espada repousa no ombro, transição correta para cada dash e salto; sem clipping em capa/asa/torso.
- Melhorar legibilidade de ataques contra câmera terceira pessoa atual; não refazer câmera global do herói nem UI, que estão em fluxos de outros agentes.

## 4. TESTE REAL OBRIGATÓRIO ANTES DE DECLARAR FEITO
1. **Diagnóstico antes/depois** em navegador WebGL real, modo **publicado sem poderes** como o usuário verá. Sem `fullCombatQA=1` durante prova de esgrima. Abrir jogo inteiro, entrar em dimensão Bispo 1, testar **movendo e atacando** por 60–90 segundos ou múltiplos cenários que cubram ~90 s; sem depender somente de testes puros em Node.
2. Testes automatizados determinísticos de motor para: escudo no ataque de herói, shield cooldown, escape/dash em sequência com limite, escolha de ataque, proteção contra clipping/NaN, salto alto com marcador e hit único, cancel combo, regressão do treino sem magia e reativação via flag, proteção dos Bispos 2–4. Não inventar testes que só verificam presença de strings.
3. Capturar vídeos curtos e contato frontal/lateral: (A) espada realmente alinhada com contato; (B) escudo visível bloqueando; (C) dupla sequência dash chase, dash recuo e flank; (D) salto ALTO completo e núcleo no pouso, zero fumaça; (E) combo 3 golpes sem idle artificial. Gravar câmera normal do jogador, não só câmera isolada.
4. Logar contagem de `melee, hits, misses, dash por objetivo, shield activations, leap vs hop, jump+dash, combo lengths, cooldowns`; diferenciar eventos solicitados com debug daqueles produzidos organicamente. Se IA não fizer naturalmente, **NÃO passar** só com um script de animação.
5. Teste mobile low/medium e desktop 30/45/60 FPS, sem aumento indevido de drawcalls/memória/cpu; testar retorno ao jogo após morte, reinício e mudança de dimensão; garantir que unload/dispose/reentrada não vazem eventos/partículas.
6. CI: testes relevantes verdes; conferir falhas conhecidas do runner Playwright Ubuntu 26.04 (incompatibilidade de instalação do Chromium), **não atribuir a patch do jogo sem prova**, mas consertar scripts se for possível dentro do escopo isolado. Mostrar evidências e bloqueios reais.
7. **Zero regressão no carregamento:** importar `BISHOP_DUEL_ONLY` em todas as dependências, validar navegador/cache via build central, evitar que volte a mensagem `does not provide an export named BISHOP_DUEL_ONLY`. Não alterar número MOD arbitrariamente; só atualizar build-info central com motivo claro depois de aprovada a feature.

## 5. ENTREGA, ISOLAMENTO E SILÊNCIO
- Faça implementação completa e QA de verdade. Se encontrar bug concreto do Bispo 1 diretamente relacionado, corrigir; se descobrir problema fora do escopo, registrar e não invadir o trabalho dos outros.
- **PR dedicada, no máximo uma PR ativa desta missão, sem merge**, com resumo e evidências no GitHub, não no chat. Preferir commits pequenos no mesmo branch; NÃO criar N PRs por subtarefa.
- **NÃO TOUCH:** novo VHAZRAEL não pode bagunçar Bispo 2 que será feito por Claude, modelos Meshy de outro chefe, dimensões 2/3/4, Ganância, fauna, caverna, história, áudio, auroras ou versão visual da UI. Se motor compartilhado necessário, alterações muito localizadas e testes.
- **Após todos os itens concluídos e testados**, remover `CODEX_TEMP_MISSAO_VHAZRAEL_DUELO_CINEMATICO_20261119.md` na própria PR, de modo que o arquivo desapareça somente quando a PR for integrada. Se algo crítico permanecer não concluído, **não apagar briefing nem dizer que finalizou**; documentar o pendente.
- **Economia extrema de tokens:** só ler arquivos focais/diffs, cachear descobertas num relatório curto do GitHub, executar testes direcionados primeiro, logs filtrados, reaproveitar código/rig/VFX existentes, evitar comentários prolixos, não fazer consultas repetidas sem mudança de SHA. Gastar esforço com o jogo, não com explicações.
- **Silêncio absoluto no chat durante e depois da execução**, sem texto de progresso, plano, nem resumo final. Só perguntar em caso de bloqueio verdadeiro que impeça continuar.

## 6. PESQUISA TÉCNICA — PRINCÍPIOS, NÃO COPIAR ENGINE
- Motion warping/target alignment: https://dev.epicgames.com/documentation/unreal-engine/motion-warping-in-unreal-engine
- Sync marker e notificações de janelas de ataque: https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine
- Sync groups em transição de clipes: https://dev.epicgames.com/documentation/unreal-engine/animation-sync-groups-in-unreal-engine
- Design de inimigos, combos e janelas justas: https://www.gamedeveloper.com/design/enemy-design-and-enemy-ai-for-melee-combat-systems

**Esses links são conceitos de produção profissional; o jogo usa Three.js e `AnimationMixer`, não Unreal. Adaptar o PRINCÍPIO no motor existente, sem importar dependências pesadas nem tratar funcionalidades do Unreal como disponíveis aqui.**
