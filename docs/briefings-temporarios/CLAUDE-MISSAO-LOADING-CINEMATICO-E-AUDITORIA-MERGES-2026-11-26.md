# MISSÃO AUTÔNOMA — LOADING CINEMATOGRÁFICO DOS 7 PECADOS + AUDITORIA DE MERGES
Data: 26/11/2026
Repositório: PHBritoDev/Jogo-2-2.5D
Base inicial: main @ 0f70c11d2fb4b3acc94a46f923b45e0863377214 (Mod 373)
Responsável: Claude — execução autônoma em duas fases sequenciais.

> ORDEM DE COMUNICAÇÃO: silêncio operacional absoluto. Não envie comentários, atualizações, explicações, perguntas, resumos ou mensagens de progresso ao criador. Não peça confirmação entre etapas. Registre decisões, evidências, testes e pendências somente no GitHub. Ao final, no máximo uma mensagem objetiva com links das PRs e estado real. Não declare QA, merge ou deploy sem evidência.

## AUTORIZAÇÃO E REGRA GERAL

A missão está autorizada. Execute a FASE 1 inteira e, depois, a FASE 2 inteira, sem aguardar confirmação. Pesquise técnicas e referências atuais além das fontes listadas; faça sua própria inspeção do projeto. Não gaste dinheiro/créditos, não invente assets, não substitua modelos reais por bonecos genéricos e não use placeholders como entrega final.

Trabalhe em branches próprias e PRs. Preserve main e branches dos agentes. Não faça force-push, não sobrescreva commits alheios, não feche PR útil e não apague histórico Git. Se algo não puder ser validado, declare a limitação no relatório e mantenha a alteração sem merge quando houver risco.

---

# FASE 1 — NOVA ABERTURA CINEMATOGRÁFICA DO CARREGAMENTO

## 1. Intenção artística obrigatória

Substituir a apresentação atual do loading por uma sequência cinematográfica original, sombria, assustadora e nostálgica, que prenda a atenção enquanto o mundo 3D está sendo preparado. Não é uma tela de patch notes, changelog, menu genérico, slideshow de imagens estáticas ou composição de cinco modelos parados.

A cena principal deve parecer um plano de abertura de um RPG dark fantasy de alto orçamento: câmera baixa, profundidade atmosférica, silhuetas fortes, composição legível em celular e PC, animação contínua e direção de luz intencional.

### Composição dos cinco antagonistas

- GANÂNCIA ocupa o centro do enquadramento e avança em direção à câmera, caminhando com suas DUAS FOICES. A marcha transmite domínio, frieza e ameaça; as foices acompanham o corpo com peso, sem flutuar ou atravessar mãos/pernas.
- BISPO 1 fica em um dos lados, com arma real do personagem e postura orgulhosa.
- BISPO 2 fica ao lado do Bispo 1, com sua arma real e postura própria.
- BISPO 3 fica do outro lado de Ganância, com sua arma real (foice do ZAR'KHAEL) e pose distinta.
- BISPO 4 fica na extremidade oposta, SEM ARMA. Mãos/garras vazias e silhueta claramente reconhecível.
- Os quatro Bispos e Ganância caminham para a frente em formação: dois Bispos à esquerda, dois à direita, Ganância central. Não alinhar os cinco como cópias idênticas. Escalonar profundidade, velocidade, fase da passada, ombros, inclinação de cabeça e posição das armas para dar personalidade.
- Todos devem manter caminhada orgulhosa, ameaçadora e deliberada. Usar clipes reais de caminhada dos GLBs, sem inventar um ciclo genérico se houver animação nativa utilizável. Corrigir root motion para que avancem pela coreografia da cena sem saltos, deslizes, moonwalk, pés patinando ou deslocamento duplo.
- A câmera recua suavemente para preservar a formação, com parallax e pequenos ajustes de composição. Não cortar cabeças, foices, pés ou armas. A silhueta dos cinco precisa continuar legível em retrato e paisagem.

## 2. Identidade visual: SOMENTE SILHUETAS + DOIS ACENTOS DE COR

Não revelar as skins coloridas completas. Os cinco personagens devem ser quase inteiramente sombras profundas. Preservar a forma, armadura, chifres, capa, armas e proporções dos modelos originais, mas ocultar cores/texturas reconhecíveis usando material de apresentação isolado (clone/override exclusivo da cena de loading). Nunca alterar materiais, texturas ou aparência dos modelos usados no gameplay.

Cada personagem pode ter somente DOIS acentos cromáticos controlados, além da sombra quase preta:
1. acento vermelho carmesim para olhos/sorriso/sangue;
2. uma segunda cor de recorte/rim-light, discreta e diferente por personagem para ajudar a distinguir as silhuetas.
Não deixar aparecer a paleta original da pele, roupas ou armaduras. Nada de personagens coloridos com um filtro escuro por cima: a leitura precisa ser de silhuetas reais.

### Olhos, sorrisos e dentes — identidade individual

- BISPO 1: brilho ocular vermelho com desenho de X, claramente legível, pulsação sutil e controlada.
- BISPO 2: brilho ocular vermelho em formato de cruz, com geometria nítida e não apenas dois pontos.
- BISPO 3: um olho em X e o outro em cruz, assimétricos e fáceis de distinguir à distância.
- BISPO 4: uma esfera vermelha pontiaguda, como um pequeno orbe/lente vivo, com animação própria de contração/expansão e rotação.
- GANÂNCIA: vórtice vermelho girando continuamente dentro do(s) olho(s), com sensação de redemoinho profundo, não uma esfera estática.
- Os olhos devem ficar presos ao movimento real da cabeça/ossos e acompanhar a animação sem flutuar.
- Criar sorriso macabro vermelho em cada rosto em que a boca não esteja suficientemente visível. Se a geometria original já mostrar dentes, realçar os dentes com iluminação localizada; se não mostrar, construir dentes pequenos e estilizados presos à mandíbula, respeitando a forma do rosto. Não criar uma boca enorme ou um sorriso cartunesco.
- Os dentes devem receber luz clara e concentrada, como se fossem a única superfície iluminada dentro da boca. O contorno do sorriso é carmesim, assustador e expressivo. Usar poses/expressões do rosto que realmente sustentem o sorriso.
- Reaproveitar, quando tecnicamente possível e visualmente fiel, o conceito/asset dos rostos sorridentes assustadores já existente na Dimensão de Água do Bispo 2. Primeiro localizar e inspecionar o recurso real; não copiar uma textura sem verificar escala, UV, resolução e licença. O sorriso da loading precisa combinar com o rig/rosto de cada Bispo.
- Sangue estilizado escorre da boca em gotas pequenas, com gravidade, aceleração, queda e impacto no chão. Pool fixo/reutilização de partículas; nada de criar milhares de objetos por frame. O sangue é um acento visual, não uma cortina que esconda os personagens.

### Ganância

- Usar a fase/modelo que melhor preserva a silhueta canônica e permite as duas foices (verificar integração real antes de decidir). Preferir NewGanancia1.glb para a forma base se os clipes e a montagem de armas confirmarem.
- Vórtice ocular constante e legível.
- Duas foices reais do arsenal da Ganância, uma em cada mão, montadas com empunhadura correta e sem atravessar dedos.
- Manter as gotas de sangue da boca já existentes no sistema se forem adequadas; reutilizar a implementação real antes de criar outra.
- Não mostrar asas/cores de fases posteriores nem revelar spoilers da forma III.

## 3. Cenários ao fundo — destruição em movimento

Enquanto os cinco caminham normalmente em primeiro plano, o mundo atrás deles é destruído. O fundo deve mudar de cidade/ambiente ao longo da sequência para transmitir que a passagem deles deixa ruína.

Criar uma sequência com pelo menos três ambientes claramente diferentes, conectados por transições cinematográficas:
- cidade medieval/fantasia em chamas, torres e telhados cedendo;
- praça/catedral ou muralhas sob explosões e queda de destroços;
- outro ambiente urbano ou região habitada reconhecível do universo do jogo, com incêndios, fumaça, estruturas desabando e clarões distantes.

Requisitos:
- A destruição acontece ao fundo, em profundidade, sem competir com as silhuetas. Explosões devem ter antecipação, flash localizado, expansão, fragmentos e fumaça com timing e escala coerentes; evitar bolas de fumaça genéricas, círculos amarelos, flashes planos ou partículas aleatórias.
- Fazer a troca de ambientes de forma contínua (dissolve, travelling, parallax ou passagem por uma estrutura), mantendo os personagens em marcha no primeiro plano. Não usar cortes aleatórios que pareçam uma apresentação de slides.
- Usar assets existentes do projeto sempre que forem apropriados. Se precisar montar cenário com módulos existentes, respeitar escala, perspectiva, iluminação e composição. Não inventar cidade genérica de cubos.
- A atmosfera deve ser escura e nostálgica: névoa profunda, céu opressivo, luzes distantes, cinzas/brasas discretas e contraste controlado. Evitar saturação excessiva e excesso de efeitos.
- A destruição não pode deixar a tela ilegível nem esconder os cinco antagonistas.

## 4. Duas vinhetas de NPC — coreografia legível e não gratuita

Inserir duas cenas curtas durante a marcha, integradas à mesma câmera e sem interromper o movimento dos antagonistas:

**Vinheta A — Bispo 4**
- Um NPC ADULTO, com modelo/rig e animação real do projeto, cruza a frente do Bispo 4.
- O Bispo 4 interrompe a marcha apenas o necessário, usa as mãos/garras vazias e executa um golpe de perfuração coreografado na região abdominal. O contato precisa coincidir com a pose e com o VFX.
- O NPC reage, perde força, cai ao chão e fica para trás. O Bispo 4 retoma a marcha sem olhar para trás, com indiferença.
- Sangue estilizado em poucas gotas/rastro curto, sem anatomia explícita ou gore realista. O impacto deve ser entendido pela silhueta, pose, som visual e timing, não por detalhe gráfico.

**Vinheta B — Ganância**
- Outro NPC ADULTO cruza a frente de Ganância.
- Ganância retira/ergue levemente uma das foices, executa um corte único, limpo e deliberado, com arco de lâmina e VFX autoral sincronizados ao movimento real da arma.
- Mostrar a consequência por silhueta e montagem cinematográfica: um corte de câmera/oclusão por fumaça ou clarão, a silhueta do NPC cai e a cabeça aparece separada apenas como forma/sombra distante, sem close anatômico, mutilação detalhada ou gore realista.
- Ganância não celebra nem para: termina o movimento, a foice volta à posição de marcha e continua caminhando normalmente.
- O VFX não pode parecer um risco branco genérico. Usar a identidade cósmica/sangue das duas foices e manter a ação visualmente clara.

Os NPCs devem ser adultos, com modelos/rigs reais do projeto. Não reaproveitar a criança da jaula/ritual como vítima. Não deixar corpos atravessarem o chão, desaparecerem de forma abrupta ou ficarem bloqueando a formação.

## 5. Direção, ritmo e loop

- Criar uma sequência cinematográfica com duração-alvo aproximada de 25–40 segundos, mas não atrasar artificialmente o carregamento para completar a animação.
- A cena deve começar rapidamente com as silhuetas já presentes ou surgindo em fade curto; não mostrar tela vazia durante o download.
- Se o carregamento terminar antes da sequência, fazer uma saída elegante para o jogo assim que a condição real de prontidão permitir. Nunca segurar o jogador só para assistir ao restante da animação.
- Se o carregamento demorar, a sequência deve continuar em loop perfeito ou em ciclos com variação, sem salto visível, teleporte dos personagens ou repetição abrupta das vinhetas de execução. As vinhetas podem ocorrer uma vez por ciclo longo, com transição bem escondida.
- A versão deve ficar escondida/discreta num canto (preferência canto inferior direito ou superior direito), em corpo pequeno e baixa opacidade, mas ainda legível se o jogador olhar. Exibir somente “MOD 373”/número atual, sem descrição.
- Remover da tela de loading qualquer frase que descreva o que mudou no jogo, lista de novidades, changelog, descrição da build ou texto promocional. Não exibir a DESCRIPTION de build. A tela é cinematográfica, não um painel de atualização.
- O progresso do carregamento continua real e funcional, mas discreto: uma linha fina/indicador integrado à composição, sem porcentagem falsa. Se mostrar números, devem vir exclusivamente do progresso real do loader. Não usar frases como “esta versão adiciona...”.
- Em erro real, manter diagnóstico legível e retry; não esconder falha sob o filme.

## 5A. BARRA DE CARREGAMENTO INFERIOR + PROTAGONISTA EM MINIATURA + ENTRADA POR CLIQUE

Adicionar uma segunda camada de interface na parte inferior da tela cinematográfica, integrada à direção de arte e legível em celular e PC:

- Na região inferior, exibir uma barra horizontal de progresso elegante, fina e claramente visível, com acabamento dark fantasy (trilho escuro, preenchimento luminoso discreto e animação suave). Ela deve acompanhar EXCLUSIVAMENTE o progresso real do carregamento do jogo, sem timers, porcentagens inventadas ou avanço artificial.
- Logo abaixo ou integrada visualmente à barra, colocar uma representação BEM PEQUENA do protagonista correndo continuamente, como se estivesse percorrendo o caminho junto com o carregamento. Usar o modelo/visual canônico do protagonista já existente no projeto, em escala de miniatura, sem criar um personagem genérico. Preferir animação real de corrida/caminhada rápida do GLB; se não houver clipe apropriado, construir um ciclo leve e convincente com os recursos existentes.
- O personagem deve correr em uma pequena faixa/caminho junto à barra, avançando visualmente conforme o progresso real aumenta. A posição visual deve ser derivada do mesmo estado real de progresso, com interpolação suave; não pode ultrapassar o progresso, completar antes do loader nem sugerir que está pronto quando não está.
- Enquanto o carregamento estiver em andamento, a miniatura continua correndo e a barra avança conforme os dados reais. Em progresso sem atualização, o personagem pode manter uma corrida no lugar ou um movimento cíclico sutil, sem fingir avanço.
- Quando o loader confirmar que o mundo está REALMENTE pronto e o progresso atingir 100%, a barra completa e surge um convite claro e bonito para entrar, por exemplo: “TOQUE NA TELA PARA ENTRAR” (em desktop, também aceitar clique). O convite deve ter pulsação/brilho sutil e affordance evidente, sem parecer botão genérico.
- A partir desse momento, NÃO entrar automaticamente. O jogo só deve iniciar a transição de entrada depois de um toque/clique explícito do jogador. Se a pessoa não tocar, a tela permanece aberta, o protagonista continua correndo em loop e a cena cinematográfica de fundo continua animando suavemente, sem congelar, sem reiniciar o carregamento e sem perder o estado de pronto.
- Ao receber o toque/clique, executar um crossfade/transição curta e elegante para o jogo, desmontando corretamente a cena de loading e liberando seus recursos. Impedir duplo clique/toque de disparar duas entradas.
- Se o jogo ainda não estiver pronto, toque/clique não pode ignorar o carregamento nem entrar antecipadamente. Mostrar o progresso real e manter a interação de entrada desabilitada até a prontidão confirmada.
- Se ocorrer erro real, substituir o convite de entrada por diagnóstico e retry; nunca apresentar 100% ou permitir entrar num mundo que falhou ao inicializar.
- A barra, miniatura e convite não podem cobrir as vinhetas, as silhuetas ou o HUD essencial da cena. Reservar safe areas para notch/gestos mobile, ajustar escala/posição em retrato e paisagem e manter leitura em 360×800, 390×844, 844×390 e desktop 1365×768.
- Implementar com baixo custo: preferir sprite/clone leve ou renderização isolada simples da miniatura, limitar resolução e frequência quando necessário, reutilizar o GLB já carregado/cacheado e evitar um segundo renderer pesado. A animação da miniatura deve ser pausada/desmontada corretamente ao sair da tela.

### Estados obrigatórios e testes específicos

1. LOADING: barra e posição do protagonista seguem os callbacks/progresso real; o personagem corre; entrada indisponível.
2. READY / AGUARDANDO CLIQUE: loader confirmou prontidão; barra em 100%; convite visível; protagonista e filme continuam animando; nenhum auto-entry.
3. ENTERING: primeiro toque/clique válido inicia uma única transição; bloquear novos toques até concluir.
4. ERROR: sem convite de entrada; diagnóstico/retry funcional; não mascarar falha.

Adicionar testes automatizados ou verificações adequadas para provar: progresso nunca falso/regressivo, estado READY só após prontidão real, nenhuma entrada automática, toque antes de READY não entra, toque depois de READY entra uma única vez, animação continua enquanto aguarda, e layout responsivo nas quatro resoluções definidas. Capturar evidência visual do estado READY aguardando clique e do estado após o clique, em mobile e desktop.

## 6. Integração técnica e proteção do carregador

O estado atual conhecido da main:
- mundo-3d-prototype.html contém o overlay #loading e a marca #marker.
- mod181-loader.js executa warmModuleGraph, chama onProgress(done,total), importa o mundo por Blob e mostra diagnóstico/retry.
- module-warm.js contém o mecanismo de download, tentativas, cache e preparação.
- build-info.js é a fonte única da versão (Mod 373 na base inicial).
- A missão anterior de restauração do loading foi integrada pela PR #715; não regredir o progresso real.

PROIBIDO:
- Remover/enfraquecer warmModuleGraph, fetchText, retry, cache-busting, reescrita de imports/paths, tratamento de falhas, diagnóstico, import por Blob ou prontidão real.
- Substituir o progresso real por timer ou animação enganosa.
- Fazer a tela sumir antes da inicialização real do mundo.
- Deixar a cena de loading criar um segundo renderer/loop permanente depois de entrar no jogo. Encerrar loop, listeners, mixers, render targets, texturas e recursos exclusivos da cena ao desmontar.
- Alterar materiais dos modelos compartilhados com gameplay; use clones e materiais de apresentação.
- Fazer sombras dinâmicas caras em cinco personagens e dezenas de luzes. Priorizar rim-light/shader/material emissivo, sombras falsas leves quando suficientes, partículas em pool, instancing, culling e limite de draw calls.
- Carregar cópias redundantes de GLBs já baixados. Verificar cache HTTP e aproveitar assets existentes. Evitar que os assets cinematográficos adicionem downloads gigantes sem necessidade; carregar em paralelo sem bloquear a barra/progresso real do mundo.
- Alterar combate, dano, IA, save, narrativa, mapa ou campanha fora do necessário para a tela de loading.

### Modelos/identidades a confirmar no código atual

Use o inventário real e os caminhos realmente usados na main; estes são os nomes canônicos identificados na documentação:
- Ganância: NewGanancia1.glb (fase I; 12 clipes) / arsenal em greed-weapons3d.js.
- Bispo 1 VHAZRAEL: VHAZRAEL.glb, vhazrael-rig3d.js; clipe Walking (1,03 s) ou Casual_Walk (4,17 s) após inspeção visual.
- Bispo 2 VORGAZHEK: Bispo2.glb no inventário de combate atual (não assumir que Bispo2-lod.glb é o modelo atual da campanha); localizar rig/módulo vorgazhek3d.js; clipe Walk (1,33 s).
- Bispo 3 ZAR'KHAEL: NewBispo3.glb, zarkhael-squad3d.js; clipe Walking (1,03 s). Usar a FOICE real do personagem, não trocar por espada.
- Bispo 4 VÉRAXION: NewBispo4.glb, veraxion-squad3d.js; clipe Walking (1,03 s). Para esta cena, não montar nem mostrar as duas espadas do kit de combate.
- NPC: localizar um modelo adulto já existente (ex.: Npc.glb somente se for o modelo adulto correto) e clipes adequados. Não usar criança.

Os clipes e rig paths podem ter mudado: confirmar no HEAD de trabalho e no inventário GLB. Não assumir que um módulo auxiliar existe só porque aparece neste briefing.

## 7. Pesquisa técnica obrigatória

Pesquisar, comparar e aplicar técnicas atuais de cinematografia em tempo real, animação GLTF/Three.js e otimização mobile. Começar por estas referências, mas não se limitar a elas:

1. Luz cinematográfica de personagem — key/fill/back/rim, low-key, luz motivada e leitura de silhueta:
   - https://www.youtube.com/watch?v=Nn23PAOkldM
   - https://onlinelibrary.wiley.com/doi/abs/10.1111/cgf.13546
2. Performance de cena Three.js — instancing, GPU animation, draw calls e culling:
   - https://threejsdemos.com/demos/performance/instancing
   - https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Unity/102109_0100_02_RealTime3dArtBestPractices_Lighting.pdf
3. Partículas/VFX — pools fixos, evitar alocação por frame, blending e partículas leves:
   - https://github.com/WesleySalzer/GameCodex/blob/main/packages/server/docs/threejs-arch/guides/G12_particle_vfx_systems.md
4. Startup e animações — front-load/cache, CSS transform/opacity e trabalho apenas quando necessário:
   - https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Fundamentals
   - https://www.mdpi.com/2313-433X/12/1/45
5. Transição loading → cena — overlay e crossfade sem bloquear render:
   - https://salivity.github.io/three.js/article/three-js-loading-screen-crossfade-with-loadingmanager

Aplicar com senso crítico. Não adotar técnicas de Unity/Unreal que não correspondam ao pipeline Three.js/WebGL do projeto. Não instalar framework pesado só para esta tela.

## 8. QA e critério de aprovação — não aceitar algo genérico

Criar testes de regressão para:
- presença da tela e versão discreta sem DESCRIPTION/changelog;
- atualização apenas por progresso real do loader;
- estado de sucesso/saída somente após prontidão;
- falha e retry;
- montagem dos cinco modelos corretos e das armas corretas (Ganância 2 foices; Bispos 1–3 armados; Bispo 4 sem arma);
- olhos/sorrisos presos aos ossos e shapes exclusivos;
- nenhuma alteração nos materiais dos modelos usados pelo gameplay;
- ciclo de marcha sem root motion duplo, foot sliding grave ou clipping;
- vinhetas executadas no tempo correto, NPC adulto, sem atravessar chão e sem travar marcha;
- loop contínuo e desmontagem de renderer/recursos;
- responsividade em 360×800, 390×844, 844×390 e desktop 1365×768.

Capturar evidências reais do navegador: retrato, paisagem, desktop, pelo menos 3 momentos da sequência e vídeo contínuo com as trocas de cenário e as duas vinhetas. Se o ambiente não suportar captura de vídeo, não simular evidência; registrar exatamente o que foi testado.

Rubrica visual (100 pontos):
- silhuetas e identidade dos cinco (20);
- iluminação, olhos, dentes e gotas (20);
- marcha, armas e coreografia (15);
- cenários/destruição e transições (15);
- vinhetas de NPC (10);
- enquadramento/responsividade/legibilidade (10);
- desempenho, loader e transição sem regressão (10).
Meta mínima para merge: 90/100, sem falha crítica, sem personagem genérico, sem skin colorida revelada, sem arma errada, sem Bispo 4 armado e sem quebra do loader. Se ficar genérico/feio, refazer e repetir QA; não baixar a meta para encerrar.

## 9. Entrega da FASE 1

- Abrir PR própria para main, com commits de implementação, testes e evidências.
- Não fazer merge enquanto a rubrica não atingir 90/100, os testes estiverem verdes e a inspeção visual não mostrar regressão.
- Se merge for seguro e todos os gates passarem, integrar por método normal, sem force push; preservar alterações concorrentes. Atualizar build-info.js para o próximo Mod livre somente na branch de publicação integrada e sincronizar cache-busters conforme padrão do projeto.
- Confirmar workflows/Pages separadamente. Não alegar publicação só porque houve merge.
- Criar registro permanente em docs/ com arquitetura, arquivos, clipes/poses usados, evidências, testes, limitações e score.

---

# FASE 2 — AUDITORIA DE MERGES, LIMPEZA E INTEGRAÇÃO SELETIVA

Começar somente depois de a FASE 1 estar concluída e integrada com segurança. Não usar a fase 2 como justificativa para interromper ou deixar incompleta a tela cinematográfica.

## 10. Inventário total e classificação

Atualizar o estado da main, branches e PRs abertas no momento da execução. Auditar o histórico de merges da main e os PRs/commits integrados relevantes, não apenas o que está fácil de encontrar.

Criar uma tabela de auditoria com:
- PR/commit/branch de origem;
- data e arquivos alterados;
- objetivo original;
- estado atual no jogo (ainda ativo, substituído, duplicado, parcialmente integrado ou regressivo);
- evidência de teste e inspeção;
- sobreposição/conflito com outros trabalhos;
- decisão: MANTER, MELHORAR, REVERTER, SUBSTITUIR ou INVESTIGAR;
- motivo técnico e risco.

Classificar como:
A. melhoria real e válida: manter;
B. melhoria útil, mas incompleta: terminar e testar;
C. duplicada/superada: manter o melhor caminho e remover somente código morto comprovado;
D. regressão comprovada: corrigir ou reverter seletivamente;
E. sem evidência suficiente: não mexer até provar.

Não julgar uma merge como ruim apenas por idade, tamanho, estilo pessoal ou falta de testes antigos. Verificar se o código ainda está em uso e se commits posteriores dependem dele.

## 11. Regras para reverter e limpar

- Nunca apagar commits ou reescrever histórico. Para uma mudança ruim já integrada, usar correção forward ou commit de revert específico.
- Não reverter uma PR inteira se apenas um arquivo/trecho causou regressão. Fazer correção seletiva e manter melhorias independentes.
- Antes de reverter, procurar dependências e commits posteriores; adicionar testes que reproduzam a regressão e provar que a correção não remove comportamento válido.
- Não remover arquivos/funcionalidades que parecem não usados sem busca global, teste e inspeção do fluxo de runtime.
- Não fazer limpeza estética ampla, refatoração em massa ou troca de arquitetura fora do necessário.
- Preservar assets canônicos, cenas, modelos, clipes, saves, rotas, campanha e ferramentas ADM/QA.
- Toda reversão precisa de evidência comparativa antes/depois e PR própria, ou commit isolado rastreável.

## 12. PRs abertas e trabalho de agentes

- Atualizar a lista de PRs abertas, HEADs, autores, arquivos alterados, estado dos workflows e conteúdo mais recente. Não confiar em status antigo escrito neste briefing.
- Preservar integralmente branches de agentes que ainda estejam trabalhando. Não editar branch alheia, não fazer rebase/force-push e não encerrar PR em andamento.
- Priorizar PRs READY com testes/evidências verdes e benefício real. Draft, testes pendentes, QA visual reprovado, conflitos não resolvidos ou ausência de evidência NÃO são autorização para merge.
- Quando duas PRs úteis conflitarem, criar branch integradora, incorporar ambas seletivamente, resolver conflitos sem apagar o lado correto, executar a suíte de regressão dos dois trabalhos e comparar o resultado. Manter as PRs originais intactas até a integração estar validada.
- PR útil incompleta: terminar o que falta somente se o escopo estiver claro, a branch estiver acessível e não houver proprietário ativo impedindo; caso contrário, documentar o bloqueio e preservar.
- Não fazer merge em lote por quantidade. Fazer merge somente do que melhora o jogo e passa nos gates.
- Atenção especial às PRs abertas e aos seus donos no momento da criação deste briefing: #714, #712, #711, #710, #709, #691, #665, #515, #468, #466, #465, #464, #463, #459, #452, #436, #422, #420, #417, #411, #403, #400, #392, #295, #216, #118, #115, #37 e #10. Esta lista é apenas uma fotografia de 26/11; verificar o estado atual antes de qualquer ação. Algumas são Draft, algumas conflitam e várias podem conter trabalho ativo. NÃO presumir que estão abandonadas.
- Respeitar responsáveis e reservas descritos em AGENTS.md, docs/GUIA-PARA-IAS.md e issue/PR #519. Em particular, não tocar em áreas reservadas ao Codex/Claude sem coordenação e não sobrescrever a caverna em andamento.

## 13. Arquivos de prompt temporários

Inspecionar o repositório inteiro, incluindo raiz, docs/briefings-temporarios/, pastas de agentes e arquivos CLAUDE*, CODEX*, PROMPT*, TEMP*, MISSAO*.

- Encontrar prompts temporários já executados e sem agente ativo, confirmar que o resultado foi incorporado num registro permanente e então apagar somente esses arquivos soltos/obsoletos.
- Não apagar documentação permanente de missão/resultado, contratos de agente, instruções em uso, prompts associados a PR/branch ativa, nem briefing que outro agente ainda esteja executando.
- Para cada arquivo removido, registrar caminho e motivo no relatório permanente. Não apagar apenas porque o nome contém TEMP.
- Este próprio arquivo deve ser excluído no encerramento, depois de as duas fases estarem concluídas e depois de criar os registros permanentes. Fazer a exclusão em commit rastreável, sem deixar cópia duplicada ou resumo de prompt solto.

## 14. Testes, decisão e entrega da FASE 2

- Executar a suíte adequada para cada mudança e workflows relevantes. Testes em SwiftShader não são medição de FPS de Android; declarar essa diferença.
- Inspecionar visualmente os sistemas alterados no runtime real ou no melhor harness disponível; não aceitar apenas testes de texto.
- Para cada PR integrada, registrar arquivos, commits, testes, artifacts, limitações e justificativa de benefício.
- Fazer PR(s) de integração/reversão separadas, pequenas e rastreáveis. Resolver conflitos apenas com evidência e sem descartar mudanças úteis.
- Atualizar build marker uma vez por conjunto de alterações integrado, com Mod livre e cache-busters corretos.
- Só fazer merge quando os checks obrigatórios estiverem verdes, a revisão visual aprovada e a comparação com main mostrar melhoria líquida. Se um conflito ou teste permanecer sem solução segura, manter a PR aberta e explicar tecnicamente no GitHub.
- Finalizar com um relatório permanente em docs/auditorias/ listando todos os merges/PRs auditados, decisões, reversões, integrações, PRs preservadas e arquivos temporários removidos.

## 15. Critério final

A missão só está concluída quando:
1. A nova tela cinematográfica foi implementada, iterada, testada, atingiu pelo menos 90/100 e está integrada na main com versão/cache corretos;
2. A auditoria das merges foi feita e documentada, com correções seletivas das regressões comprovadas e integração somente de melhorias úteis que passaram nos testes;
3. Os prompts temporários órfãos realmente obsoletos foram limpos, sem apagar trabalho ativo;
4. Este briefing foi excluído por commit depois da documentação permanente;
5. Nenhuma regressão crítica foi introduzida e nenhum resultado não validado foi apresentado como concluído.
