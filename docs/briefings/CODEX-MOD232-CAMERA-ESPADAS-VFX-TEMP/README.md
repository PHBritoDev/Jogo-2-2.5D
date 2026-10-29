# MISSÃO CODEX — MOD 232+ | CÂMERA EM 1ª PESSOA, TRAJETÓRIA DOS RITOS E IDENTIDADE VISUAL DAS ESPADAS
**Briefing TEMPORÁRIO criado a pedido do criador em 29/10/2026.**
**Repositório:** https://github.com/PHBritoDev/Jogo-2-2.5D | **branch final:** main
**Teste principal:** https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html
**Teste isolado:** https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?treinoEspadas=1&todasHabilidades=1

## 0. REGRA CENTRAL — RESULTADO, NÃO REMENDO
Você é o agente de implementação e QA. Não entregue só análise ou mockup. Inspecione o código atual, identifique as causas-raiz, implemente, TESTE, corrija os defeitos encontrados, faça PR e merge na main após verificações. Não faça alterações destrutivas na campanha, mundo 3D, dimensão de Valério, progressão, loja, HUD de magia, modelos originais ou saves. Evite efeitos genéricos, hacks temporários e códigos duplicados. Preserve desempenho Android. Aumente a Mod visível e o cache-busting. Não declare que testou algo que não testou.

**IMPORTANTE — exclusão:** este arquivo e sua pasta `docs/briefings/CODEX-MOD232-CAMERA-ESPADAS-VFX-TEMP/` são instruções descartáveis. **APÓS concluir e verificar a implementação, exclua a pasta temporária do repositório antes do merge final.** Não apague arquivos permanentes do jogo nem outras pastas de briefing. A entrega final deve conter só código, testes e documentação permanente estritamente necessária.

## 1. EVIDÊNCIA: VÍDEO REAL DO CRIADOR
O criador gravou `Screen_Recording_20261029_151522_Chrome.mp4` (9,84 s, paisagem 2340×1080). **O vídeo não está neste repositório**; ele será fornecido diretamente a você pelo usuário, se disponível. NÃO alegue que o assistiu se não o recebeu. Observações extraídas de quadros reais pelo assistente:
- 0–1 s: 3ª pessoa, personagem encapuzado e espada visíveis; modo treino com alvo **Demônio da Ganância ~122 m** e habilidade **ECLIPSE** (Aurora) equipada.
- 2–3 s: alternância para 1ª pessoa: **corpo desaparece e espada fica solta/flutuante**, gigantesca e orientada de forma incoerente com a câmera; perspectiva de espada sem braços, sem empunhadura natural. Em 3 s vê-se um traço vermelho estreito ao longo da cena.
- 4 s: retorno a 3ª pessoa; surge uma forma vermelha curvada no ar sem vínculo convincente com a espada, personagem e direção.
- 5–6 s: 1ª pessoa novamente, espada flutuante, fio vermelho cruzando a paisagem; impressão de efeito desconectado.
- 8–9 s: 3ª pessoa, arcos vermelhos próximos ao alvo distante, mas trajetória/direcionalidade pouco claras. HUD mostra Eclipse em recarga.
- A qualidade visual do ambiente é simples; porém **não transformar esta missão em refatoração do mapa inteiro**. Priorizar câmera, espadas, animações, VFX e confiabilidade.

**Não confundir os dois ritos:**
- **Espada do Chamado (prota), skill PASSAGEM DO JULGAMENTO:** jogador avança MUITO RÁPIDO em linha coerente na direção do alvo, atravessa/contorna com segurança e termina atrás dele; sequência de cortes cruzados e finalização. Não deve se limitar a correr em círculo ao redor do alvo ou saltar aleatoriamente. Se obstáculos impedirem a linha direta, escolher variante segura/feedback claro; jamais atravessar parede, boss, árvore ou sair do mundo. Alcance equilibrado para ação melee; **não teletransportar 122 m**.
- **Lâmina da Aurora (aurora), skill ECLIPSE DAS LÂMINAS:** personagem realiza movimentos de espada convincentes e lança **ondas de corte vermelhas/pretas** que se deslocam **visivelmente PARA FRENTE, na direção do inimigo visado**, em sequência, com profundidade 3D, velocidade legível, X/crescente final e impactos ao alcançar o alvo. **Não é uma habilidade de dash**. Mesmo com inimigo a 122 m, não deve parecer que o efeito surge instantaneamente no inimigo; respeitar alcance real, tempo de viagem e dissipação; se fora de alcance, avisar claramente ou lançar em linha até o limite, sem dano remoto mágico.

## 1-A. ESCLARECIMENTOS ADICIONAIS E PRIORITÁRIOS DO CRIADOR (29/10) — NÃO INTERPRETAR ERRADO
Estas instruções foram acrescentadas depois da primeira versão do briefing e **prevalecem sobre qualquer ambiguidade anterior**.

### A) ECLIPSE DA AURORA — OS CORTES ESTÃO SUBINDO, MAS DEVEM IR RETO PARA A FRENTE
O problema visual central da skill da **Lâmina da Aurora** não é só falta de mira: os efeitos atualmente parecem ser projetados **PARA CIMA**, como se subissem ao céu. O criador quer precisamente o contrário: **cada onda/corte deve viajar horizontalmente para a FRENTE, na direção do inimigo, pelo espaço 3D**. Exemplos de orientação: um corte vertical pode ter a forma de uma meia-lua em pé, mas o **vetor de deslocamento da onda deve continuar paralelo ao chão**. Um X pode girar no próprio plano visual, mas o centro do X avança em direção ao alvo, NÃO sobe. Ajustar spawn, transformação local/world, pitch, yaw, normal do mesh, velocity, offset vertical e eventual orientação de câmera para eliminar deriva vertical. O golpe sai da espada, viaja adiante em altura coerente com o alvo, e causa dano apenas quando chega e colide. Em terreno irregular, manter trajetória legível e sem enterrar no chão ou subir como foguete; evitar autoaim que crie arcos ascendentes. Teste visual obrigatório de lado e de cima, com trajetória traçada em frames sequenciais. **Reprovar se qualquer slash subir em vez de avançar.**

### B) O PROBLEMA É A ESPADA BRANCA — REDESENHAR O OBJETO, NÃO APENAS O EFEITO
O criador enfatizou: a **espada comprada atualmente é TODA BRANCA**, enquanto os golpes dela são **vermelhos, roxos e escuros**. Isso não combina. A prioridade é **modificar o VISUAL DA PRÓPRIA ESPADA** (geometria, materiais, texturas, brilho, guarda, cabo, núcleo, bordas), mantendo encaixe na mão, tamanho, colisão e inventário. O visual da Aurora deve pertencer à mesma linguagem cromática e de materiais de seus ataques: por exemplo, aço grafite/preto com reflexos carmesim, aresta rubra, sulcos de energia violeta, guarda escura elaborada e detalhes originais de aurora; nada de recolor uniforme ou de um objeto branco com glow vermelho grudado. Mostrar a espada **em repouso, atacando e lançando a skill**, em 1ª e 3ª pessoa, para demonstrar consistência. Para a **espada inicial**, manter identidade própria celestial dourado/branco, mas refinar sua modelagem e detalhes; não transformar ambas na mesma espada. Evitar mudar visual de armas 3 e 4 fora de escopo.

### C) PASSAGEM DO JULGAMENTO — 2 A 3 VEZES MAIS CORTES, CADA UM COM O MESMO PADRÃO VFX
A habilidade da **espada inicial** tem atualmente cerca de **6 eventos de cortes** na lógica `sword-rites3d.js` (`n===5` final). O criador pede **2 a 3 vezes mais**, ou seja, alvo de **12 a 18 cortes VISÍVEIS distintos** (ideal: **15–16**, se a duração e leitura permitirem). **Não basta criar partículas extras em torno dos mesmos 6 golpes:** cada corte adicional deve ter sua própria passagem de lâmina, arco/traço de luz celestial da mesma família estética do rito, timing, posição, direção e efeito de impacto visual, formando um turbilhão de cruzamentos ao redor do inimigo depois do dash retilíneo. Variar ângulos, alturas e ritmos (sem repetição óbvia) e culminar em um corte final marcante. Não transformar em nuvem de flashes genéricos: cortes devem ser distinguíveis e visualmente ligados ao movimento. Se o rig humano não conseguir executar fisicamente 16 swings completos em tempo plausível, coreografar 3–5 swings reais com **cortes energéticos secundários justificados** (afterimages/cópias celestiais), sem fingir que o protagonista executou 16 swings manuais. Evitar spam de objetos, áudio e pós-imagens; usar pooling, culling e limite de instâncias.

**Equilíbrio obrigatório:** multiplicar quantidade de cortes NÃO significa multiplicar dano total por 2–3 automaticamente. Redistribuir dano em hits menores, com um finisher, mantendo DPS/cooldown/mana razoáveis e respeitando hit stun, invulnerabilidade e bosses. Garantir no máximo um acerto por evento de corte e não aplicar dano se não houver alvo válido/alcance. Ajustar duração da skill se necessário para legibilidade, mas não torná-la interminável ou congelar câmera/controle por segundos. No celular, cada slash deve ser identificável a 30 FPS.

### D) QA VISUAL NÃO NEGOCIÁVEL
Antes de concluir, testar as 3 exigências **separadamente e em conjunto**:
1. Eclipse: ondas seguem **reta horizontal para o inimigo** em 1ª e 3ª pessoa, sem subir; capturar 3+ instantes consecutivos do deslocamento de um slash.
2. Aurora: espada não é mais branca genérica, tem identidade vermelha/preta/violeta que combina com TODOS os VFX; mostrar idle + swing + skill.
3. Passagem: contar **12–18 cortes distintos com VFX próprios**, sem hits fantasmas, sem queda grande de FPS, sem dano multiplicado de forma desbalanceada; avanço inicial realmente em direção ao inimigo.

Se qualquer um falhar, continuar corrigindo. Não substituir estes pedidos por melhorias vagas de shaders.

## 1-B. ÚLTIMA ADIÇÃO DO CRIADOR — COMBATE EM MOVIMENTO, CORRIDA SEM LENTIDÃO E BRAÇOS DEFORMADOS (29/10)
**REQUISITOS OBRIGATÓRIOS, não sugestões opcionais.** O criador relata problemas reproduzíveis na build atual:

### 1. NÃO TRAVAR O PERSONAGEM AO ATACAR
Atualmente o protagonista parece congelar/parar de andar quando aperta GOLPE; não consegue atacar enquanto anda ou corre. **Permitir locomoção contínua durante ataques básicos e combos**, inclusive correr, andar lateralmente, recuar e mudar direção, preservando input analógico e WASD. A ação de espada deve coexistir com a locomoção. Implementar animações em camadas por regiões de ossos (upper-body attack + lower-body locomotion), com máscara óssea/clip filtrado ou solução equivalente correta para Three.js AnimationMixer e o rig GLB real; root motion e movimentos de passo do ataque devem ser coordenados com deslocamento do jogador. Não usar animação full-body que zere velocidade ou capture todas as juntas e interrompa walk/run. Evitar foot sliding, pernas paradas durante avanço e cancelamentos abruptos. Ajustar janelas de combo/cancelamento para preservar hitbox e ritmo sem tornar jogador invulnerável.

### 2. CORRIDA NO MEIO DA BATALHA SEM PENALIDADE ARTIFICIAL
O criador nota uma **diminuição de velocidade ao tentar correr perto/durante o combate**. Investigar todas as fontes reais: `isSprinting`, `combatStepNow`, `lockOnActive`, `engaged`, `moveSpeed`, aceleração/desaceleração, normalização de joystick, `actionUntil`, `attack`, blend, estados do Enemy1, câmera/zoom que pode causar falsa sensação de lentidão. Remover **penalidade artificial de velocidade** para corrida em combate; preservar apenas regras deliberadas de dash/colisão e limites físicos consistentes. Não acelerar NPCs ou quebrar hit detection. **Sprint em combate deve ser tão rápido quanto sprint fora de combate** com mesmo input/terreno/stamina. Se ataques em movimento exigirem um ajuste de equilíbrio, priorizar fluidez sem transformar personagem em teleporte ou supervelocidade.

### 3. BRAÇO LIVRE PARECE QUEBRADO NA CORRIDA
O braço oposto ao que segura a espada assume uma pose estranha/torcida na animação de corrida, como se estivesse quebrado. **Corrigir deformação visual no esqueleto e na animação**, não esconder o braço nem simplesmente bloquear a corrida. Auditar: bone names/hierarchy, quaternion rest pose, bind pose, eixos, twist bones, retargeting, rotações invertidas, handedness, clip tracks duplicados, escala e ordem de aplicação de AnimationMixer, transições walk/run/attack, pesos de blending e procedurais que interferem em ombro/cotovelo/punho. Confirmar em vários ângulos e velocidades; mão livre deve balançar naturalmente, ombro e cotovelo manter anatomia crível, sem cruzar o torso de modo anormal nem esticar como borracha. Validar escala original de GLB conforme `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`. Não remendar apenas posição visual de um frame.

### 4. MESMO DEFEITO EM OUTROS NPCs
O criador observou **NPCs com a mesma animação defeituosa**. Identificar quais rigs/animadores compartilham o problema, priorizando NPCs carregados no mundo atual e em combate. Auditar funções comuns de retarget, AnimationMixer, clips e procedimentos de braço, sem aplicar correção global perigosa a esqueletos diferentes. Corrigir por rig/clip com testes de regressão. Não presumir que todos usam o mesmo GLB. Registrar quais NPCs foram efetivamente inspecionados e quais corrigidos; se algum não puder ser reproduzido, declarar limitação e não inventar teste.

### 5. TESTES DE ACEITAÇÃO ADICIONAIS
- **GOLPE + joystick/WASD:** atacar parado, andando para frente/trás/lados, correndo e em diagonal, completar 3-hit combo sem parar involuntariamente; testar em 1ª e 3ª pessoa e com as duas espadas.
- **Velocidade:** medir distância percorrida em 5 s com sprint fora de combate vs sprint com inimigo engajado (mesma direção, terreno e input). Diferença indevida deve ser eliminada; documentar valores reais se puder medir.
- **Anatomia:** gravar ou capturar animação correndo vista frontal, lateral e traseira, e corrida→ataque→corrida. Verificar ombro/cotovelo/punho do braço livre e estabilidade da mão da espada, sem torção ou pop.
- **NPCs:** testar caminhada/corrida/ataque dos NPCs com rig suspeito, em particular os que reutilizam clipes/retarget. Verificar que correção não quebra braços, asas, escala, poses, idle, hit/death.
- **Conflitos de estado:** sprint + ataque + dash/pulo + skill; transições não podem prender personagem, perder input, resetar câmera, gerar hits fantasmas nem manter braço congelado após cancelar.
- **Performance:** bone masks e blending sem recriar tracks/actions por frame; manter 30 FPS mobile como meta e reduzir complexidade visual quando necessário, sem mudar gameplay.

**Critério bloqueante:** NÃO dar missão como concluída se ainda for impossível atacar andando/correndo, se o sprint em combate continuar artificialmente lento, ou se braço do protagonista/NPCs inspecionados continuar visivelmente torcido.

## 2. AUDITORIA OBRIGATÓRIA — ENTENDA A MOD 231
Leia antes de editar:
- `mundo-3d-prototype.js` (entrada de `SwordRites`, `castSwordRite`, `riteFacing`, `riteTarget`, `updateRiteHud`, `updateFirstPerson`, `updateCamera`, `model.visible`, `cameraDistance`, `cameraYaw`, `cameraPitch`, `swordPivot`, `swordMount`, `equipSword`, animações, HUD e interações).
- `sword-rites3d.js`: state machine de combos, `passagePath`, `cast`, `update`, `waves`, checagem de colisão/hit e alvo.
- `sword-rites-vfx3d.js`: ribbons, crescents, palettes, ghosts, shaders, emissão/posicionamento de efeitos, update com parâmetro `firstPerson`.
- `sword-rites-animation3d.js`, `Protagonista-ritos-231.glb` e `Protagonista.glb`: clipes, bone mapping, rig, orientação e escala.
- `mundo-3d-prototype.html`, `hud3d.css`, `progression3d.js`, `mod181-loader.js`.
- `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md` e histórico do PR #49 para evitar modelo gigante ao tocar animações.
- Testes existentes e automações de QA; investigue regressões com Git history.
- Verifique se a Mod 231 ainda é a versão mais recente ao começar; **não sobrescreva mudanças posteriores**.

Pistas concretas do código visto em 29/10: `updateCamera` contém `if(model)model.visible=!firstPerson`, enquanto a espada usa lógica separada; `cameraDistance<1.05` determina 1ª pessoa; `passagePath` usa raio em torno do inimigo e `distance>7` falha; `Eclipse` cria waves com `range:18`, `speed:16+n*2`, mas `yaw` e `p` precisam ser conferidos contra câmera, jogador, alvo e VFX. **São pistas, não diagnósticos definitivos.**

## 3. CORREÇÃO DEFINITIVA — PRIMEIRA PESSOA AAA MOBILE
**Objetivo visual:** o jogador enxerga uma câmera humana convincente, braços/mãos com armadura e espada EMPUNHADA, não uma espada gigante flutuando. Preferir:
1. **Viewmodel próprio** de 1ª pessoa: braços/mãos do protagonista com material consistente e espada real na mão, ligados a um rig/âncora da câmera, com perspectiva/FOV e escala corretos. O mundo e o modelo 3ª pessoa continuam com sua lógica normal. Alternativa: renderizar braços do rig existente em camada dedicada, se tecnicamente estável e com qualidade. NÃO fazer uma arma voadora sem mãos.
2. **Paridade de animações:** idle/breath, caminhada/balanço discreto, corrida, 3 golpes, skill de cada espada, dash, bloqueio/impacto e transições. Animar punhos, braços e arma em conjunto; sincronizar corte e hit frame. Sem arma atravessando a câmera, invertida, colada à tela ou saindo da mão.
3. **Perspectiva e controles:** look horizontal/vertical intuitivo, sem inversão involuntária, sem auto-recentrar forçado durante habilidade, sensibilidade compatível com toque; transição suave entre 1ª/3ª pessoa, câmera restaurada após animação/skill; evitar clipping de paredes/objetos, desorientação e enjoo (camera shake opcional e moderado).
4. **Coerência de gameplay:** espada, efeitos e projéteis partem da mão/lâmina; mira e direção seguem câmera/lock-on de forma previsível; ataque não fica atrás da câmera. Se 1ª pessoa comprometer temporariamente alguma cinematografia, implementar transição de câmera curta e reversível apenas quando necessário, sem prender controles.
5. **Desempenho:** não duplicar renderização pesada do personagem completo. Preferir viewmodel otimizado, sem duplicar centenas de draw calls. Recursos carregados sob demanda, fallback seguro se GLB/clipe indisponível.

Critério: alternar 1ª→3ª→1ª repetidamente, atacar, correr, pular, usar ambas skills, girar 360° horizontalmente e olhar para cima/baixo; não deve aparecer espada flutuante, braços deformados, câmera travada ou escala incorreta.

## 4. DIREÇÃO CORRETA DAS HABILIDADES E COMBATE
**Eclipse (Aurora):**
- Definir explicitamente `origin` = lâmina/ponto de emissão no momento do swing, `direction` = vetor horizontal normalizado para alvo válido ou mira da câmera, `target` opcional, `maxRange` = alcance balanceado, `velocity` e `collision`. Evitar confundir direção da câmera, orientação do modelo, `playerYaw` e `yaw` de shaders/mesh.
- Waves devem nascer DA ESPADA (ou do arco do golpe), ganhar distância com movimento frame-a-frame no espaço do mundo, seguir a direção prevista e acertar apenas por colisão verdadeira. Não criar arco estacionário no meio do mapa ou teleportado sobre o inimigo.
- Se usar assistência de mira, limitar cone de correção, checar oclusão, distância e altura. Não curvar 180° nem atravessar paredes. Alvos em grande distância devem mostrar ondas viajando e expirando no alcance. Incluir opção de mira livre e comportamento claro sem alvo.
- Cada golpe deve ter telegraph, antecipação, liberação, rastro e impacto, em tempos compatíveis com clipe real. Sequência 3–5 cortes com coreografia e silhuetas variadas, X final visualmente legível, sem saturação de tela.
- Colisões por swept volumes/ray/segmentos no deslocamento, evitando tunneling em 30 FPS. Cada onda acerta alvo no máximo 1 vez; multi-hit só quando explicitamente planejado. Respeitar dano, MP, cooldown, obstáculos e regras de boss.

**Passagem (prota):**
- Começar com preparação clara, **trajetória de avanço retilínea e rápida em direção ao alvo**, pequeno cruzamento/desvio de colisão seguro para terminar atrás dele, com 2–3 afterimages e pausa curta seguida de cortes em X. Se precisar contornar para evitar colisão, não exibir uma longa órbita artificial; alternativa de cancelar com feedback se não houver corredor seguro.
- Não permitir atravessar boss/árvores/paredes, voar, cair no vazio, teleportar para outra altura, empurrar alvo ou prender a câmera. Controlar invulnerabilidade com janela curta, não imortalidade. Validar alvo dentro de alcance, LOS, terreno e hit.
- Rito ativado SOMENTE pelo botão contextual `sword-skill` ou atalho R; `GOLPE` continua ataques básicos/combos. Preservar as demais magias.

## 5. REDESIGN VISUAL DE VERDADE — ESPADA E EFEITO COMO UM SÓ
O usuário explicitamente rejeita VFX genérico e pede uma espada que **combine com o efeito**. Não basta mudar cor do shader. Tratar como mini art-direction pass de arma + animação + luz + VFX + áudio, com identidade distinta:

**A. Espada inicial — Espada do Chamado:** design de espada celestial com lâmina elegante, geometria/material PBR convincente, metal claro com borda prateada e núcleo de luz dourada/quente, guarda refinada e detalhes discretos (sem poluir silhueta). Golpes deixam **arcos de luz dourada/branco-marfim** que seguem a borda e velocidade da lâmina. Contraste entre núcleo brilhante, borda afiada, filamentos e partículas que saem do ponto de contato. Skill Passagem: avanço luminoso sutil, cortes cruzados precisos, pós-imagens limitadas e finalização impactante.

**B. Espada comprada — Lâmina da Aurora:** visual de arma premium e distinguível da inicial, coerente com **cortes escarlate/preto e nuances violeta** já introduzidos na Mod 231. Não usar lâmina branca/dourada simples com efeito vermelho aleatório: harmonizar **cor do metal, guarda, núcleo energético, gravuras, emissive, partículas e slash waves**. Propor detalhes originais: aço escurecido polido, veios de rubi carmesim, guarda com geometria sofisticada, energia confinada na aresta que se abre em cortes largos. Preservar legibilidade e identidade narrativa. Não confundir com arma demoníaca se contrariar lore; interpretar vermelho como energia de aurora rubra, sem mudar o nome.

**Ambas:**
- Modelagem de arma realmente melhorada (mesh/material), não só bloom no modelo antigo. Verificar escala e pega da espada, pivot, mão dominante, `swordMount`, `equipSword` e sincronização com todos os clipes. Preservar GLBs originais como backup; se gerar novos GLBs, otimizar e documentar. Pode usar geometria custom se entrega mais qualidade, mas sem aspecto low-poly improvisado.
- Ribbons **nascem e seguem ponta/base da lâmina ao longo de múltiplos frames**; superfícies com espessura visual, núcleo quente, borda suave, ruído direcional de movimento e fade progressivo. Orientar crescents segundo o plano do golpe, não círculos 2D sempre olhando para a câmera. Motion blur estilizado e afterimage limitados. Impacto só ao acertar objeto/inimigo, com direção e distância coerentes. Nada de partículas surgindo em locais aleatórios.
- Não deixar espada e efeito com paletas incoerentes; diferenciar material do metal, glow, trail, onda, impacto. Evitar arco gigantesco cobrindo HUD, explosões de sprites e loops repetidos. Design memorável, estilizado-realista, apropriado a um RPG 3D mobile.
- Pesquisar referências técnicas públicas quando necessário: Three.js AnimationMixer / SkinnedMesh / layers / depth handling; glTF 2.0 PBR / KHR_materials_emissive_strength; sword trails por sampled blade-tip paths; geometry shaders em WebGL; VFX otimizado de jogos de ação. **Pesquisa deve gerar implementação original**, não copiar assets protegidos.
- Som: swoosh distinto por golpe, crackle/impacto contido, áudio posicional quando apropriado, controle de volume e respeitar mute. Evitar gerar/baixar assets de terceiros sem licença clara.

## 6. REGRAS DE ENGENHARIA E REGRESSÃO
- Primeiro estabelecer baseline, fazer alterações incrementais em branch isolada, commits pequenos, sem misturar alterações não relacionadas.
- Analisar e preservar economia, compra/desbloqueio da Aurora, as quatro espadas cadastradas, magia1/2/3/ultimate, controles mobile/PC, bosses, IA, dimensões e campanha.
- Corrigir bugs encontrados no caminho **que sejam causados pela mudança ou bloqueiem os testes**. Para defeitos fora do escopo, registrar e corrigir apenas se baixo risco; não iniciar refatoração massiva sem necessidade.
- Nunca fazer mudanças que deixam 3ª pessoa pior para consertar 1ª. Verificar rig, escala GLB, transform hierárquico e blending para evitar regressões antigas.
- Controle de recursos: pooling, instancing, caps de partículas/ondas/ghosts, dispose e limpeza ao cancelar habilidade, morrer, trocar espada, mudar cena, trocar modo de câmera; não vazamento de memória, não crash WebGL.
- Qualidade baixa/média/alta deve manter direção e hit iguais; efeitos visuais escalam com GPU. Alvo mobile Android 30–60 FPS de acordo com aparelho/cena; medir FPS e draw calls se possível, sem alegar garantia universal.
- Se usar Blender headless para criar/refinar arma/viewmodel/rig, exportar GLB verificável e confirmar clipes, nomes e tamanho; nunca depender de arquivo local que não foi commitado.
- HUD legível em 2340×1080 paisagem e telas menores; evitar sobreposição do botão de habilidade com magias; estados de cooldown, falta de mana e fora de alcance claros.

## 7. TESTES DE ACEITAÇÃO OBRIGATÓRIOS
A. **Visual / 1ª pessoa:** reproduzir sequência 3ª→1ª→3ª→1ª e GOLPE/skills como no vídeo. Evidenciar viewmodel com mãos segurando espada, sem flutuação. Testar ambas espadas, idle, caminhada, sprint, dash, pulo, mirar para cima/baixo, rotação completa e cenário próximo a árvore/parede.
B. **Direção:** no treino, alvo a ~122 m, lançar Eclipse e verificar deslocamento progressivo até alcance máximo, sem spawn instantâneo no alvo; a 5, 10 e 15 m validar direção, contato e danos. Repetir com inimigo atrás, à esquerda/direita e sem lock-on; 1ª e 3ª pessoa.
C. **Passagem:** alvo a 3–7 m com linha limpa: avançar rapidamente para trás dele, gerar cortes no tempo correto, manter controle e câmera após concluir. Fora do alcance: feedback sem teleporte; obstáculos laterais e frontais: não atravessar; boss grande: posição segura.
D. **Arma + VFX:** capturas ou vídeo de 3 ângulos em cada modo e espada, observando se rastro começa na lâmina e acompanha swing; verificar que cor/forma da arma combina com ondas, sem clipping ou impacto antecipado.
E. **Gameplay:** ataques normais 3-hit, cancelamento, troca de espada, mana/cooldown, skill R mobile, save/load, morte, pausa, troca de área, boss, treino sem contaminar progresso principal.
F. **Automação:** testes unitários para vetores de mira, propagação de ondas, colisão, path seguro, range, estados; testes de integração/browser/Playwright quando possível; console sem erros, assets 200, shader compila no WebGL, renderização após cache refresh. Teste no navegador Android real se disponível; se não, declarar limitação e oferecer link para validação do criador.
G. **QA de performance:** modo low/medium/high, cena com várias ondas, repetir skills por minutos, medir FPS/memória/GC quando possível. Não publicar regressões evidentes.

**Gate:** se o resultado ainda mostrar espada flutuante em 1ª pessoa, ondas surgindo longe da arma, habilidade errando direção, ou VFX desconectado da paleta da espada, o trabalho NÃO está pronto.

## 8. PROCESSO DE ENTREGA
1. Leia integralmente este briefing e, se recebido, assista ao vídeo fornecido pelo criador. Inspecione os arquivos citados, confirme o baseline e identifique causas-raiz.
2. Faça implementação completa, usando pesquisa técnica pontual quando melhorar o resultado. Não entregar apenas CSS ou recolor superficial.
3. Rode os testes e corrija bugs/regressões descobertos; não pule QA. Gere evidências curtas de antes/depois se possível.
4. Atualize número de **Mod** (231 → próximo livre; se outros commits ocorreram, use número posterior), indicadores na tela, cache-busting e changelog essencial.
5. Abra PR, revise diffs, execute checks e resolva conflitos. **Exclua esta pasta temporária antes do merge.** Faça merge em `main` apenas após verificações, sem forçar se não tiver permissão.
6. Mensagem final curta ao criador, em PT-BR: **Mod**, o que mudou em 1ª pessoa, trajetória e visual das espadas, testes efetivamente executados, qualquer limitação real, e link direto do jogo atualizado.
7. Durante execução, não enviar atualizações repetitivas; só pedir ajuda diante de bloqueio real.

**Resumo do padrão de qualidade exigido:** ação 3D cinematográfica com movimentos claros, espada integrada aos braços e efeitos, habilidades com direção e impacto fisicamente legíveis, identidade própria para cada arma e experiência sólida no celular. Não fazer nada genérico ou só para cumprir tabela.
