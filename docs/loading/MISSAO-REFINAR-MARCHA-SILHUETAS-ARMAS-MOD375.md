# MISSÃO — REVISÃO DA ABERTURA CINEMATOGRÁFICA DOS PECADOS
## Mod alvo: próximo Mod de gameplay após o Mod 374
## Responsável: Claude
## Estado: briefing em preparação; aguardar o criador completar este arquivo antes de executar

> **IMPORTANTE:** O criador vai complementar este briefing em outra conversa, incluindo requisitos visuais adicionais (especialmente olhos e explosões de fundo) e poderá anexar imagens de referência. Não iniciar implementação, não abrir PR de código e não consumir trabalho de agentes até o criador confirmar que terminou de complementar o briefing e enviar a instrução de execução.

---

## 1. Objetivo

Refinar a abertura cinematográfica já existente, conhecida como **“A Marcha dos Pecados”**, sem reconstruí-la do zero e sem quebrar o carregamento real, a barra de progresso, o READY, o retry, o portão de entrada ou a desmontagem da cena.

A versão atual foi introduzida no Mod 374. Antes de alterar qualquer coisa, leia integralmente:
- `docs/loading/LOADING-CINEMATICO-MOD374.md`
- `loading-cinematic3d.js`
- a integração atual em `mundo-3d-prototype.html`
- os testes relacionados e o harness `tools/visual-lab/loading-cinematic-qa.html`

Confirme os caminhos reais no repositório; não presuma que os arquivos continuam exatamente nos mesmos locais.

## 2. Corrigir o momento em que a cinemática aparece

**Problema atual:** a marcha dos Bispos e de Ganância aparece imediatamente quando o jogador entra no jogo.

**Comportamento desejado:** a cinemática deve aparecer **depois da página/tela de seleção dos planetas**, e não antes dela.

Regras:
- Primeiro o jogador vê a página dos planetas já existente.
- Somente depois de escolher/avançar a partir dessa página, no ponto correto do fluxo atual, a marcha cinematográfica deve ser exibida.
- Investigue o fluxo real de navegação e identifique o evento/estado correto. Não use atrasos artificiais (setTimeout) para tentar adivinhar quando a página dos planetas terminou.
- Não deixe a cinemática aparecer simultaneamente por dois caminhos, nem piscar por um frame antes da página dos planetas.
- Não prejudique o carregamento dos assets, o progresso real, o READY, o retry ou o tratamento de erros.
- O jogador ainda deve conseguir entrar somente quando o mundo estiver pronto e pelo mecanismo de entrada já existente.
- **Futuro previsto:** o criador pretende adicionar uma tela inicial anterior, com opções como login. Portanto, mantenha a arquitetura modular: a cinemática deve ser uma etapa explícita do fluxo, fácil de reposicionar quando a futura tela inicial for criada. Não implemente login nem uma nova tela inicial nesta missão.

## 3. Direção visual: somente silhuetas

A versão atual usa olhos, sorrisos/dentes e sangue. O criador não quer mais esses elementos nesta etapa.

Remover completamente da cinemática:
- olhos visíveis, brilhos ou desenhos faciais;
- sorrisos, bocas, dentes ou qualquer recorte facial que pareça expressão;
- sangue, fios de sangue, gotas, manchas e partículas de sangue;
- qualquer vinheta/efeito que revele rostos ou expressões.

**Manter apenas as silhuetas** dos personagens. A identidade deve vir da forma geral do corpo, cabelo/capuz/chifres, postura, armas, proporções e iluminação de recorte — nunca de olhos, dentes ou sangue.

Atenção:
- Não basta escurecer os olhos ou reduzir a opacidade: remova os sistemas e geometrias desnecessários da cena.
- Não remova nem altere olhos/rostos dos modelos usados no gameplay; a mudança é exclusiva da abertura cinematográfica.
- Não transforme os personagens em cinco bonecos genéricos iguais. Preserve a leitura visual individual de cada silhueta.
- Não adicione detalhes faciais novos para compensar a remoção.

## 4. Poses das armas e linguagem corporal

As poses atuais das armas parecem genéricas e pouco naturais. Refaça a coreografia com pesquisa visual e inspeção do rig real. O objetivo é obter poses deliberadas, ameaçadoras, elegantes e anatomicamente plausíveis.

### 4.1 Ganância — duas foices

**Foice da mão esquerda:**
- A lâmina deve ficar baixa, com a ponta/lâmina encostando ou quase encostando no chão durante a caminhada.
- A ponta deve ser arrastada pelo chão de maneira controlada.
- Criar um efeito discreto de contato/raspagem no solo, sincronizado com o movimento e sem parecer faísca genérica exagerada.
- O contato deve respeitar a altura do chão e acompanhar a passada sem atravessar o piso nem flutuar.

**Foice da outra mão:**
- Deve repousar sobre a região do pescoço/ombro, como uma pose de força e domínio: o cabo atravessa a região superior do corpo e a arma termina apoiada no ombro oposto.
- A lâmina fica voltada para cima.
- A pose deve lembrar alguém que sustenta a arma sobre os ombros com naturalidade, sem atravessar pescoço, cabeça ou corpo.
- A mão precisa segurar o cabo de forma convincente; não basta posicionar a arma sem ajustar a mão/antebraço.

Não espelhe as duas foices nem deixe ambas penduradas ao lado do corpo. As duas devem ter silhuetas e funções visuais claramente diferentes.

### 4.2 Bispo que usa foice (ZAR'KHAEL / Bispo 3)

- Identifique no código e no elenco qual é a foice correta e confirme o personagem/arma antes de editar.
- Use uma pose semelhante à foice apoiada entre pescoço e ombro, mas **com a lâmina apontada para baixo**.
- A pose deve ser distinta da de Ganância, mesmo usando a mesma família de postura.
- Corrija a iluminação/material da foice: atualmente ela parece estranha por causa da iluminação. A lâmina precisa ser legível como arma, com volume e recorte coerentes, sem brilho estourado, sem aparência plástica e sem desaparecer na silhueta.
- Não invente uma nova arma nem substitua o asset/construtor real.

### 4.3 Bispo que usa machado (VORGAZHEK / Bispo 2)

- Pesquise referências de poses de marcha com machado pesado e escolha uma postura que transmita peso, ameaça e controle.
- A pose deve parecer confortável para o personagem caminhar carregando o peso do machado, sem braço quebrado, pulso torcido ou arma flutuando.
- Não copie simplesmente a pose da foice.
- O machado deve continuar reconhecível e proporcional. Ajuste mão, punho, cotovelo e ombro em conjunto.

### 4.4 Pesquisa e escolha das poses

Antes de implementar:
- Pesquise referências visuais de poses de foice e machado em fontes públicas, incluindo Pinterest quando acessível, concept art, jogos e fotografia/escultura de referência.
- Busque referências de linguagem corporal de personagens carregando armas grandes durante uma caminhada lenta.
- Use a pesquisa como orientação de postura, equilíbrio e silhueta; não copie arte protegida nem reproduza um personagem específico.
- Registre no relatório quais referências/conceitos influenciaram cada pose e por quê.
- Se uma referência não estiver acessível, não invente que a consultou.

## 5. Ritmo da caminhada e espaçamento

**Problema atual:** os personagens caminham rápido demais, com sensação de pressa e movimento apressado.

Desejado:
- Marcha calma, pesada, controlada e natural.
- Sensação de que os personagens avançam com confiança e ameaça, sem correr nem parecer atrasados.
- Ajustar a velocidade do avanço do chão, o timeScale dos clipes e a sincronização dos pés em conjunto.
- Não reduzir apenas o timeScale de forma isolada: isso pode gerar deslize dos pés, moonwalk ou personagens flutuando.
- Preservar o ciclo de passada e o contato dos pés com o chão.
- Fazer cada personagem caminhar com pequenas diferenças naturais de fase e cadência, sem parecer uma fila sincronizada de robôs.

**Espaçamento:**
- Os personagens estão próximos demais, praticamente colados.
- Separar melhor os cinco personagens tanto horizontalmente quanto em profundidade.
- Manter Ganância como figura central e preservar uma composição equilibrada, com os Bispos legíveis dos dois lados.
- Evitar que armas, braços, pernas ou silhuetas se sobreponham visualmente.
- Conferir a composição em retrato de celular e paisagem/desktop; não resolver o espaçamento em uma proporção e estragar a outra.
- Não afastar tanto a ponto de perder o grupo ou cortar personagens do quadro.

## 6. Iluminação: macabra, aterrorizante e contida

Melhorar a iluminação para transmitir uma atmosfera mais assustadora, sombria, ameaçadora e cinematográfica, **sem exagero**.

Direção:
- Silhuetas predominantemente escuras.
- Recortes de luz discretos e controlados para separar cada personagem do fundo.
- Contraste suficiente para reconhecer as armas e a anatomia externa.
- Evitar luz frontal que revele rostos ou detalhes faciais.
- Evitar brilho estourado, neon gratuito, saturação excessiva, contornos artificiais grossos e aparência de material plástico.
- Luz e sombra devem ajudar a contar a história, não competir com os personagens.
- A foice do Bispo 3 precisa de atenção especial para deixar de parecer estranha sob a iluminação.
- Manter atmosfera ameaçadora, mas legibilidade em telas pequenas.

## 7. Critério de qualidade: não aceitar o genérico

O criador explicitamente pediu que o responsável não trate algo feio ou genérico como aceitável só porque funciona tecnicamente.

Antes de considerar qualquer elemento concluído, avalie:
- A pose parece natural e possível no corpo/rig real?
- A arma parece ter peso e estar realmente sendo segurada?
- A silhueta é distinta e memorável?
- A composição parece intencional ou apenas personagens enfileirados?
- A iluminação valoriza o volume ou apenas deixa tudo escuro/brilhante?
- O efeito de raspagem parece contato físico com o solo ou uma partícula aleatória?
- A caminhada transmite calma e domínio ou pressa?
- O resultado parece um RPG dark fantasy de alto nível ou um protótipo genérico?

Se algo estiver obviamente feio, artificial, desproporcional, mal posicionado ou genérico, corrija imediatamente e volte a avaliar. Não esconda defeitos com escuridão, fumaça, bloom ou efeitos extras.

Se houver dúvida sobre uma pose, faça variações no harness, compare lado a lado e escolha a mais convincente. Não escolha a primeira solução que apenas passa no teste automatizado.

## 8. Restrições técnicas e preservação

- Não modificar gameplay, combate, rigs ou animações dos personagens fora da cena de loading.
- Não substituir os modelos/armas originais por assets genéricos.
- Não importar GLBs completos pesados se a cena atual usa silhuetas otimizadas.
- Preservar o sistema de progresso real, READY, entrada manual, retry, diagnóstico, cache-busting e desmontagem.
- Preservar compatibilidade mobile e desktop.
- Evitar novas dependências em runtime e downloads extras desnecessários.
- Manter pools fixos para partículas/efeitos de raspagem, sem alocação descontrolada por frame.
- Não aumentar sombras dinâmicas ou custo de render sem medir o impacto.
- Não quebrar automação/headless.
- Não fazer merge direto na main. Trabalhar em branch própria e abrir PR para revisão.
- Não mexer em PRs, branches ou arquivos de outros agentes.
- Não atualizar `build-info.js` para alterações apenas documentais. Se houver mudança real de código do jogo, atualizar a versão conforme o padrão vigente e somente após confirmar o estado atual da main.

## 9. Plano de execução — após autorização do criador

1. Ler o registro Mod 374, código, testes e harness.
2. Mapear o fluxo de telas atual e identificar o ponto exato após a página dos planetas.
3. Pesquisar referências de poses e documentar escolhas.
4. Montar testes visuais/variações no harness para as armas e a formação.
5. Implementar a mudança de fluxo e as silhuetas sem detalhes faciais/sangue.
6. Ajustar poses, marcha, espaçamento e iluminação.
7. Corrigir todos os defeitos visuais óbvios encontrados na revisão.
8. Rodar testes unitários, contratos e E2E existentes.
9. Inspecionar capturas em retrato mobile e paisagem desktop, em diferentes tempos da marcha.
10. Verificar que a cinemática só aparece depois da tela dos planetas e que o fluxo futuro pode inserir uma tela inicial antes dela.
11. Registrar evidências e limitações reais. Não alegar teste em Android físico sem fazê-lo.
12. Abrir uma única PR própria, com resumo conciso, arquivos alterados, testes, capturas e limitações.

## 10. Relatório final obrigatório

A PR deve informar:
- Como o fluxo foi alterado e qual evento/estado inicia a cinemática após a página dos planetas.
- Quais sistemas de olhos, sorrisos e sangue foram removidos da cena.
- Posição final de cada arma e como foi validada.
- Como a velocidade da marcha foi ajustada sem deslize dos pés.
- Como o espaçamento se comporta em retrato e paisagem.
- O que foi alterado na iluminação.
- Referências realmente consultadas.
- Testes executados e resultados.
- Evidências visuais antes/depois.
- Limitações que ainda existirem.

**Não declare a missão concluída só porque os testes passaram. A qualidade visual é requisito central.**

---

## 11. Complementos do criador — NÃO EDITAR NEM ANTECIPAR

Esta seção será preenchida pelo criador em outra conversa com requisitos adicionais e referências visuais, incluindo detalhes sobre olhos e explosões de fundo. Preserve os complementos que forem adicionados. Se houver conflito entre um complemento posterior explícito do criador e este briefing, siga a instrução mais recente do criador e registre a decisão.

## 12. COMPLEMENTOS FINAIS DO CRIADOR — 26/11/2026
## AUTORIZAÇÃO DE EXECUÇÃO: BRIEFING COMPLETO

As imagens e o vídeo foram anexados somente à conversa do ChatGPT em 26/11/2026 e não estão armazenados neste repositório. Claude só deve afirmar que os viu se o criador também os anexar diretamente à conversa dele. As descrições textuais desta seção são a referência disponível no GitHub; não presumir acesso aos anexos privados.

O criador concluiu os complementos desta missão e autorizou sua execução. Claude deve começar a auditoria e implementação agora, sem pedir uma nova confirmação sobre estes requisitos. Este complemento é a instrução mais recente do criador e prevalece sobre qualquer orientação anterior deste arquivo que entre em conflito com ele. Os demais requisitos originais continuam válidos quando compatíveis.

### 12.1 Correção obrigatória da direção facial — olhos são permitidos; sorrisos não

A seção 3 original ficou desatualizada quanto aos olhos. A direção correta agora é:

- Remover completamente sorrisos, bocas, dentes, lábios, sangue, fios, gotas, manchas e qualquer expressão facial desenhada para a abertura.
- Preservar e refinar somente os olhos como acentos faciais de identidade. Não deixar o rosto inteiro iluminado nem adicionar sobrancelhas, bocas ou outros elementos para compensar.
- Criar poucas assinaturas visuais distintas, escolhidas após inspecionar os cinco rostos/silhuetas reais. Não aplicar o mesmo preset em todos:
  - Em um Bispo, testar a leitura de um único olho carmesim aceso, pequeno e concentrado, enquanto o outro permanece totalmente apagado ou oculto.
  - Em outro personagem, testar um núcleo vermelho muito pequeno, quase como uma esfera/pupila, com halo mínimo e pulsação discreta.
  - Para os demais, considerar um traço curto e fino, uma fenda estreita ou olhos apagados; só usar uma variação se realmente melhorar a identidade daquele personagem.
- As referências enviadas pelo criador são inspirações de contraste, escala e atmosfera. Não copiar os desenhos, rostos, personagens ou composições das imagens.
- A luz deve ser fina, localizada, de baixa intensidade e legível em tela de celular. Evitar feixes grossos, raios atravessando o rosto, barras horizontais exageradas, bloom que apague a silhueta, neon gratuito ou olhos que pareçam LEDs colados.
- Uma assimetria bem escolhida é preferível a dois olhos igualmente acesos. O olhar deve ser inquietante pela contenção, pelo contraste e pelo tempo de aparição — não pelo tamanho ou brilho excessivo.
- Implementar os olhos somente na cena de loading. Não editar os rostos, olhos ou materiais dos modelos usados no gameplay.
- Remover de fato os construtores, geometrias e atualizações de sorrisos/sangue que deixarem de ser usados, sem deixar loops ou objetos invisíveis ativos.

Critério visual: em close e no enquadramento normal, cada rosto deve continuar majoritariamente ilegível como silhueta; o olho escolhido precisa ser percebido sem dominar a tela. Se parecer grosso, cartunesco, brilhante demais ou igual aos outros, refazer.

### 12.2 Poses e gestos — referência exclusivamente visual

O criador enviou uma fotografia de uma mão fechada e braço elevado. Ela passa a impressão visual de um gesto segurando um objeto imaginário. Usar somente essa leitura geral de silhueta/gesto, sem reproduzir a pessoa da foto e sem transformar a imagem em instrução de uso de objeto real.

Para esta abertura, trate os objetos do elenco como elementos cenográficos fictícios: a prioridade é a leitura da silhueta, a coerência visual com os modelos já existentes e a ausência de interseções ou deformações. Não criar nem fornecer instruções práticas de manuseio, uso ou combate com armas reais. Não inventar coreografias de ataque realistas. Inspecionar os assets e os pontos de ligação já existentes no projeto somente para manter a continuidade visual da cena.

As decisões de enquadramento, posição relativa, peso visual e leitura das silhuetas devem ser testadas no harness. Uma mão flutuando, um objeto atravessando o corpo ou uma pose que pareça desconectada do personagem é defeito a corrigir.

### 12.3 Substituir as duas vinhetas antigas por uma cena de ameaça implícita, sem violência gráfica

Remover as duas vinhetas atuais descritas no Mod 374: a cena de VÉRAXION atacando um passante e a cena antiga de Ganância cortando outro passante. Não reaproveitar a coreografia antiga como atalho.

Nova intenção narrativa:
- Enquanto o grupo caminha, um NPC adulto, ajoelhado e visivelmente abalado, aparece mais adiante no caminho.
- Ganância se aproxima e interrompe brevemente a marcha junto dele. O enquadramento deve transmitir domínio e indiferença, sem close de ferimento ou contato físico explícito.
- O momento decisivo ocorre fora do campo de visão direto ou encoberto pela própria composição: usar silhueta, oclusão, fumaça, contraluz e um breve acento carmesim/sonoro para sugerir que algo terrível aconteceu, sem mostrar o ato.
- O NPC então sai da composição ou cai como uma silhueta intacta, sem lesões visíveis. A formação retoma a marcha, sem olhar para trás.
- A câmera mantém continuidade e ritmo; a cena deve ser compreensível sem mostrar o ato.

Não mostrar decapitação, cabeça separada, partes do corpo, ferimentos, sangue, mutilação ou detalhes anatômicos. Não animar cabeça/partes do corpo separadas nem sugerir que fiquem suspensas no ar. O horror deve vir da antecipação, da omissão, da reação do ambiente e da frieza do grupo — não de gore.

A nova vinheta precisa funcionar como uma cena curta, legível e coerente no ritmo da marcha. Se o resultado ficar teatral, confuso ou exagerado, ajustar câmera, duração, silhuetas e som até a intenção ficar clara.

### 12.4 Lua sinistra ao fundo

- Verificar a lua já existente no jogo e o asset Lua.glb, confirmando no código qual implementação está realmente ativa antes de reutilizar.
- Se compatível, reaproveitar a lua existente como elemento distante de composição no fundo da marcha. Não carregar uma segunda lua pesada nem duplicar sistemas de céu.
- Torná-la mais inquietante por enquadramento, contraste, atmosfera, escala relativa, nuvens/névoa e iluminação contida. A lua deve parecer uma presença distante e perturbadora, não um adesivo enorme ou um objeto colado na câmera.
- A menção a Fire Force / Soul Eater é apenas referência de clima macabro e estranheza. Não copiar a face, o sorriso, o desenho ou a composição exata de nenhuma obra.
- A lua não deve competir com os olhos dos personagens nem prejudicar a leitura das silhuetas. Verificar em retrato e paisagem.

### 12.5 Explosões e fogo — referência do vídeo enviado

O criador enviou um vídeo curto de referência. Ele deve ser tratado como referência visual disponível nesta tarefa; não alegar que é um efeito produzido pelo jogo ou que foi implementado nele.

A leitura visual pretendida é uma explosão em camadas, com:
- um ponto de emissão/impacto muito intenso, branco-quente e dourado no núcleo;
- transição para amarelo-âmbar e laranja incandescente;
- massas de fogo vermelho-alaranjadas, turbulentas e alongadas, com sensação de movimento e profundidade;
- filamentos/raios finos, compridos e direcionais que saem do ponto mais brilhante, sem se tornarem grades ou raios grossos;
- volumes secundários, brasas e fumaça escura que ajudem a separar planos;
- expansão, pico e dissipação perceptíveis, em vez de uma única esfera lisa que aparece e desaparece.

Não copiar quadro a quadro o vídeo. Criar uma assinatura original que combine com a fantasia sombria do jogo. Evitar a explosão procedural genérica, a bola laranja uniforme, chamas triangulares repetidas, sprites retangulares óbvios, excesso de partículas aleatórias e bloom que transforme toda a tela em branco.

Usar os recursos técnicos adequados ao projeto — por exemplo, shader com ruído/erosão de borda, malhas volumétricas leves, filamentos direcionais, sprites bem integrados e pools fixos — somente após verificar o que já existe no motor. A hierarquia do efeito deve continuar legível em celular; o pico luminoso deve ser curto e controlado, com opção de redução de flashes quando compatível com o sistema de acessibilidade existente.

### 12.6 Cenário de guerra — melhoria opcional e subordinada à composição

Claude pode propor detalhes de ambiente que sugiram uma batalha anterior, desde que isso realmente valorize a marcha: estruturas danificadas ao longe, estandartes gastos, ruínas, terreno marcado, fumaça distante, brasas e silhuetas ambientais. Priorizar assets e sistemas que já existem no jogo.

Não transformar a tela em um amontoado de destroços, partículas ou novos modelos pesados. Não esconder os personagens atrás de fogo/fumaça. A formação e os rostos devem continuar sendo o foco. Se a ideia não melhorar claramente a composição ou o desempenho ficar pior, não adicionar.

### 12.7 Animação — naturalidade é critério de aceite

- Conferir o inventário real de clipes no Mod 374 e os arquivos atuais antes de escolher qualquer animação.
- Reutilizar primeiro as animações existentes que sejam compatíveis com cada rig e com o papel da cena. Não presumir que nomes iguais significam esqueletos compatíveis.
- Se faltar um movimento de transição necessário, criar uma solução nova no sistema de animação do projeto, respeitando o rig e sem improvisar uma pose que deforme o personagem.
- Revisar ciclos, transições, tempo de passada, contato dos pés com o chão, balanço corporal, orientação do olhar, mãos, cotovelos, ombros e continuidade temporal.
- Verificar lado a lado vários trechos da marcha, entrada/saída das vinhetas e mudanças de câmera. Procurar explicitamente: pés deslizando, moonwalk, flutuação, membros rígidos, mãos desconectadas, articulações dobrando de forma estranha, mudanças bruscas de escala, objetos atravessando corpos e transições que parecem robóticas.
- Se uma animação parecer estranha, não a aceite só porque toca sem erro. Ajuste blend, fase, velocidade, pose ou retarget e repita a revisão até ficar convincente. Caso não seja possível alcançar naturalidade, escolha a alternativa existente mais limpa e registre a limitação.

### 12.8 Travamentos e quedas de FPS — prioridade técnica urgente

O criador relatou congelamento quando a barra de carregamento chega a aproximadamente 90–100%, além de travamentos durante o jogo e nas dimensões. Isso é relato do jogador e precisa ser reproduzido/investigado; não presumir a causa.

O Mod 374 descreve uma barra que chega a 90% a partir do grafo de módulos e reserva os 10% finais para a prontidão real. Não alterar essa regra para esconder o problema. O trabalho deve descobrir o que bloqueia a thread principal ou atrasa a prontidão.

Auditar e medir separadamente:
1. download/rede e cache dos módulos;
2. fetch, parse e importação dos módulos;
3. download, decode, parse e upload de GLB/texturas;
4. criação de geometria/materiais e preparação da cena;
5. compilação de shaders e primeiro render;
6. inicialização dos sistemas do mundo/dimensões e confirmação real de READY;
7. desmontagem/liberação de recursos ao sair de cenas e dimensões.

Instrumentar tempos por etapa, tarefas longas da thread principal, erros/retries, uso de memória quando houver métrica confiável, draw calls, triângulos, geometrias, texturas e programas. Reproduzir o congelamento no caminho real de loading, não somente no harness isolado. Verificar também se a cena cinematográfica compete com o carregamento do mundo, bloqueia o READY ou faz trabalho pesado no mesmo frame.

No jogo e nas dimensões:
- identificar cenas, módulos, modelos, transparências, loops, listeners e atualizações que mais custam;
- procurar alocações por frame, carregamentos repetidos, recompilações, objetos fora da câmera ainda atualizados, recursos duplicados e vazamentos ao entrar/sair repetidamente de dimensões;
- avaliar LOD, culling, instancing/merge de geometrias quando adequado, pools, redução de overdraw e resolução adaptativa baseada em medições;
- liberar geometria, material, textura, render target e skeleton somente quando não forem mais compartilhados/necessários;
- preparar/compilar shaders em momentos seguros do fluxo, se a versão instalada suportar a API e se isso reduzir o travamento medido;
- preservar gameplay, missões, efeitos essenciais, qualidade artística, controles, colisões, balanceamento e progresso. Não corrigir performance simplesmente desligando recursos, apagando conteúdo ou empurrando o problema para o jogador;
- não substituir a prontidão real por temporizador, porcentagem falsa ou entrada antecipada.

Comparar a mesma cena, câmera, resolução e perfil antes/depois. Apresentar números e evidências que existirem. Se não houver Android físico disponível, dizer claramente que o teste foi feito em navegador/ambiente emulado e não declarar FPS de aparelho real. O objetivo é reduzir os travamentos sem sacrificar a identidade visual.

### 12.9 Pesquisa técnica — fontes oficiais para orientar, não para copiar código cegamente

A base identificada em ARQUITETURA.md é Three.js 0.160. Antes de aplicar qualquer exemplo da documentação atual, confirmar se a API existe e se o comportamento é igual na versão fixada pelo projeto. Não atualizar Three.js nem migrar de engine como parte desta missão.

Consultar, conforme a causa encontrada:
- WebGLRenderer, renderer.info e compileAsync: https://threejs.org/docs/pages/WebGLRenderer
- AnimationMixer e controle dos clipes: https://threejs.org/docs/pages/AnimationMixer
- Liberação de geometrias, materiais, texturas e render targets: https://threejs.org/manual/pages/how-to-dispose-of-objects.html
- Otimização de muitas malhas e redução de draw calls: https://threejs.org/manual/pages/optimize-lots-of-objects.html
- InstancedMesh para objetos repetidos compatíveis: https://threejs.org/docs/pages/InstancedMesh.html
- Boas práticas WebGL, memória, chamadas que bloqueiam e compatibilidade: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

Aplicar somente técnicas que tenham relação com gargalos medidos. renderer.info ajuda a observar chamadas, triângulos, geometrias e texturas, mas não substitui medição de tempo de quadro. Evitar chamadas síncronas bloqueantes de diagnóstico no caminho de produção. Não executar limpeza de recursos compartilhados enquanto ainda estiverem em uso.

### 12.10 Revisão dos agentes e integração seletiva de PRs

O criador autorizou uma revisão dos trabalhos dos agentes que contribuam para a versão atual do jogo. A autorização não significa mesclar tudo indiscriminadamente.

Como fotografia inicial de 26/11/2026, havia PRs recentes que precisam ser reconsultadas no momento da execução: #714 (A1), #712 (A2), #709 (A3), #711 (A4), #691 (A5) e esta PR #718. Os números e estados podem ter mudado; buscar novamente a lista atual, branches, commits, checks e arquivos alterados.

Para cada PR/branch candidata:
1. identificar objetivo, autor/agente, base e head SHA atuais, arquivos alterados e relação concreta com o jogo;
2. conferir se o trabalho ainda é necessário, se já entrou na main por outro caminho ou se está obsoleto;
3. verificar testes, workflows, evidências visuais, integridade de dependências e efeito sobre sistemas estáveis;
4. procurar sobreposição de arquivos e mudanças incompatíveis, especialmente nos arquivos de build/cache e no mundo principal;
5. resolver conflitos somente quando for possível preservar as mudanças válidas de ambos os lados, sem apagar correções recentes nem restaurar código antigo;
6. mesclar somente quando a contribuição for útil, completa, revisada e validada. Se não for seguro, manter a PR aberta ou portar apenas a parte útil para uma branch atualizada, explicando a decisão.

Cuidados específicos: a PR #709 foi vista com um marcador MOD 373 enquanto o registro do Mod 374 já existe; nunca aceitar esse marcador/build antigo cegamente. A PR #691 foi vista como não mergeável na consulta inicial; não forçar merge nem descartar conflitos sem análise. PRs de sistemas sem relação com esta missão não devem ser mescladas só para esvaziar a fila. O princípio permanente de AGENTS.md continua valendo: código não validado não deve ser integrado.

Registrar em relatório a decisão para cada PR analisada: mesclada, parcialmente portada, mantida aberta ou descartada como redundante/sem utilidade — sempre com motivo e evidência.

### 12.11 Testes, revisão visual, entrega e limpeza

Após implementar:
- rodar os testes específicos de loading, animação, integração e regressões relevantes; depois executar a suíte ampla disponível;
- validar o fluxo real: seleção de planetas → abertura da marcha → progresso real → READY → entrada manual → desmontagem;
- testar erro e retry, toque/clique/teclado, carregamento repetido, troca de dimensões e retorno ao mundo;
- comparar capturas/vídeos em retrato mobile e paisagem/desktop, inspecionando olhos, silhuetas, lua, fogo, transições, props de cena, animações e legibilidade;
- testar a cena sem WebGL e prefers-reduced-motion para preservar os fallbacks;
- observar console, erros de shader, memory counters e estabilidade após ciclos repetidos;
- refazer qualquer trecho obviamente feio, genérico, estranho ou desproporcional antes de declarar pronto.

Ao concluir a integração:
- atualizar marcadores/cache-busters somente se o código servido ao jogador mudar, seguindo o procedimento atual de ARQUITETURA.md; documentação isolada não exige nova Mod;
- abrir/atualizar a PR de implementação com resumo, arquivos, testes, evidências, limitações e lista de PRs de agentes analisadas;
- só mesclar a PR de implementação depois de todos os checks relevantes passarem e de revisão visual suficiente; não publicar/deployar sem a etapa de publicação autorizada e verificável;
- remover o briefing MOD375 e scripts/capturas realmente temporários após a integração concluída, mantendo testes, assets do jogo, evidências úteis, documentação técnica permanente, PROMPT_MESTRE_DO_JOGO.md, AGENTS.md, ARQUITETURA.md, docs/GUIA-PARA-IAS.md e docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md;
- não apagar arquivos de outros agentes ou ativos compartilhados apenas por parecerem temporários. Conferir dependências e referências antes de qualquer remoção.

Relatório final obrigatório: resultado visual, causa comprovada dos travamentos (ou o que ainda não foi possível provar), números antes/depois, testes reais executados, limitações de Android físico, estado de cada PR de agente, merges/ports realizados e arquivos temporários removidos.

---


## 13. SEGUNDO COMPLEMENTO DO CRIADOR — CAMPO DA ÚLTIMA GUERRA E SEQUÊNCIA DE COMBATE CINEMATOGRÁFICA
## Atualização de 26/11/2026 — prevalece em caso de conflito

O criador enviou uma nova referência de cenário e dois vídeos curtos. Esta seção complementa a seção 12 e passa a fazer parte do escopo autorizado. Não começar do zero: primeiro auditar os sistemas, modelos, animações, VFX, habilidades e assets existentes; preservar e reutilizar o que estiver bom.

Observação de anexos: a imagem e os dois vídeos foram enviados nesta conversa, mas não estão armazenados automaticamente nesta branch do GitHub. Claude só terá acesso aos arquivos originais se o criador também os anexar à conversa dele. Até lá, usar as descrições deste documento como briefing textual e não afirmar que inspecionou os anexos.

### 13.1 Campo da Última Guerra — cenário e composição

A imagem vertical enviada em 26/11/2026 define a direção de atmosfera do palco da batalha:
- céu vermelho profundo com nuvens espessas e camadas de profundidade;
- lua grande, pálida/amarelada, parcialmente encoberta pelas nuvens;
- névoa vermelha baixa e distante, sem cobrir os personagens;
- campo escuro, chão irregular, destroços e sinais de batalha antiga;
- bandeiras rasgadas e árvores secas/silhuetas no horizonte;
- espadas cenográficas, escudos quebrados, fragmentos de armadura e ossos/caveiras ambientais discretos, sem cadáveres ou detalhes gráficos;
- uma espada monumental cravada verticalmente no centro ou no eixo de composição, como marco visual distante, desde que não concorra com o elenco.

Construir uma composição cinematográfica com primeiro plano escuro, plano médio legível para a luta e fundo atmosférico. A lua deve ser uma fonte visual de escala e presságio, não uma textura chapada. Nuvens podem atravessar parcialmente sua silhueta; o brilho deve recortar a névoa e as bandeiras. Usar parallax/planos em profundidade apenas se barato e estável.

Não reproduzir a imagem pixel a pixel. Não tornar tudo vermelho uniforme: manter pretos profundos, sombras frias/neutras, recortes carmesim e a lua amarelo-pálida. Evitar excesso de partículas, ruínas em toda a tela, objetos espalhados aleatoriamente, névoa opaca e uma espada gigante colada na câmera.

O local deve continuar reconhecível durante todas as vinhetas. Reaproveitar a lua já existente no jogo conforme seção 12.4; não criar um segundo sistema de céu/lua se o atual puder ser estendido.

### 13.2 Estrutura geral da batalha — duração mínima e ritmo

Depois da marcha e das vinhetas iniciais, fazer uma transição cinematográfica clara — corte motivado por movimento, passagem por fumaça, bandeira atravessando a lente ou breve escurecimento com continuidade sonora — e revelar o Campo da Última Guerra.

A sequência completa dos quatro confrontos individuais e do encerramento deve durar **no mínimo 35 segundos**. Alvo recomendado: aproximadamente 45–55 segundos, ajustável após playtest. Não alongar com câmera parada ou repetição; cada trecho precisa mostrar identidade, progressão, habilidade e consequência visual. Se o ritmo ficar apressado, aumentar a duração de beats relevantes em vez de acelerar as animações.

Ordem narrativa obrigatória:
1. Bispo 1 — cercado por um grupo de inimigos; demonstra superioridade e termina o confronto com uma ação/efeito próprio.
2. Bispo 2 — novo enquadramento e confronto; a pressão aumenta até o uso de sua ultimate original.
3. Bispo 3 — luta com sua identidade de combate e movimentação própria; os inimigos o cercam e a ultimate original encerra o confronto.
4. Ganância — confronto final, mais agressivo e dominante; culmina em sua ultimate revisada.
5. Plano final — os quatro Bispos juntos e Ganância acima deles, em sua forma/estado de voo já existente se houver; título surge integrado ao mundo.

Não fazer montagem de golpes aleatórios. Cada personagem precisa ter leitura distinta de silhueta, ritmo, cor, VFX e assinatura de habilidade. Os Bispos e Ganância devem usar os VFX originais de cada um; não substituir por efeitos genéricos compartilhados. Novos efeitos devem complementar, não apagar, a identidade original.

### 13.3 Coreografia visual dos confrontos — ação fictícia não gráfica

Os vídeos anexados servem como referências de ritmo, contraste, silhueta, aceleração/desaceleração, enquadramento e leitura dos VFX. Não copiar personagens, desenhos, movimentos quadro a quadro ou efeitos sangrentos. A batalha deve ser intensa, mas não gráfica.

Para os quatro confrontos:
- criar leitura de movimento por antecipação, pausa curta, deslocamento, impacto visual e recuperação;
- combinar deslocamentos rápidos, saltos, esquivas, bloqueios visuais e mudanças de plano de câmera, sempre como animação fictícia de fantasia;
- usar animações já existentes quando compatíveis com o rig; criar transições/poses novas somente no sistema de animação do projeto se realmente faltar um clipe;
- evitar personagens deslizando, teletransportes visíveis, rotações sem peso, membros rígidos, poses que se cruzam ou efeitos que escondem completamente a ação;
- mostrar o contraste entre muitos inimigos e a calma/controle dos protagonistas sem precisar de ferimentos explícitos;
- derrotas devem ser representadas por dissolução em partículas/brasas/sombra, desmaterialização, queda fora do enquadramento ou silhuetas intactas; não mostrar sangue, cortes corporais, desmembramento, decapitação ou detalhes de ferimentos;
- impactos e explosões podem ser fortes visualmente, mas sem corpos/partes corporais sendo arremessados ou desintegrados de forma anatômica.

A coreografia deve ser construída como espetáculo de fantasia e não como instrução realista de combate. Não incluir orientações de uso real de armas. Espadas, foices, machados e outros objetos são apenas props fictícios dos personagens e dos NPCs.

### 13.4 Bispo 1 — primeiro confronto

Revelar Bispo 1 já cercado por um grupo claramente maior que cinco inimigos. Ele deve parecer em desvantagem numérica apenas por um instante; logo a composição deixa claro que controla o ritmo da cena.

Mostrar um confronto com começo, progressão e conclusão: aproximação dos inimigos, resposta do Bispo, deslocamentos e impactos visuais legíveis, seguida por uma pausa curta que deixe o resultado ser percebido. Usar a arma fictícia e a habilidade que já pertencem ao Bispo 1, além de seus VFX originais. Não inventar uma nova ultimate se ele já possui uma funcional.

Variar planos: plano geral para mostrar o cerco, plano médio para a silhueta e um plano de impacto breve. Não usar câmera tremendo continuamente.

### 13.5 Bispo 2 — cerco e ultimate da espada colossal

Cortar para Bispo 2 com linguagem de câmera diferente do primeiro. Começar com um grupo de inimigos e ampliar a pressão até que vários o cerquem.

A ultimate deve ser a habilidade original de Bispo 2, se existir no jogo. A espada colossal deve surgir com preparação visual legível, presença de escala e uma queda/impacto de fantasia. Ao atingir o ponto central, liberar uma onda de energia e uma explosão em camadas que envolva os inimigos. Eles desaparecem como silhuetas/partículas luminosas, sem ferimentos gráficos.

A explosão deve ter:
- preparação curta e claramente perceptível;
- contraste entre o núcleo brilhante e o ambiente escuro;
- onda de choque expansiva com borda definida;
- poeira/névoa empurrada para fora e detritos ambientais leves;
- dissipação progressiva, sem deixar o palco coberto por fumaça por tempo excessivo.

Não transformar a ultimate em uma esfera branca sem detalhe. Preservar a paleta e assinatura do VFX original de Bispo 2.

### 13.6 Bispo 3 — confronto cercado e círculos mágicos

Bispo 3 deve ter o confronto mais fluido em termos de leitura de movimento, usando a arma fictícia e a animação que já lhe pertencem. O ritmo pode ser mais circular e contínuo, com alternância entre planos gerais e médios para deixar a silhueta sempre legível.

Em seguida, a quantidade de inimigos aumenta visualmente e eles fecham o cerco. O momento de virada deve ser uma pausa intencional: o ambiente perde parte do som, os círculos mágicos originais começam a aparecer no chão em camadas e a energia se acumula.

Ativar a ultimate original de Bispo 3. Os círculos devem ter hierarquia, símbolos legíveis e variação de escala; não espalhar dezenas de decals idênticos. A sequência de energia percorre os círculos, culmina em explosões controladas e limpa o espaço de forma cinematográfica. No plano final, Bispo 3 permanece intacto e sereno no centro, com seus VFX originais. Não mostrar dano gráfico aos NPCs.

### 13.7 Ganância — confronto final, forma aérea e ultimate revisada

Ganância deve ter a maior presença dramática do conjunto, mas sem virar uma sequência longa sem propósito. Usar seus VFX originais e as animações/estado de fase 2 já existentes. A luta deve comunicar agressividade e domínio através de ritmo, deslocamento, poses e efeitos; não através de gore.

Na fase final, Ganância sobe para uma posição aérea moderada e claramente legível. Os inimigos restantes saltam em direção à personagem e a câmera entra em câmera lenta por um breve instante, criando a sensação de ameaça iminente. Manter distância visual segura: não mostrar lâminas quase atingindo o corpo nem contato físico gráfico. A ultimate interrompe esse instante e toma o controle da cena.

A ultimate atual foi considerada genérica em alguns trechos e longa sem necessidade. Revisar o fluxo inteiro:
- identificar cada etapa que existe hoje e medir sua duração;
- cortar repetições, esperas sem informação e efeitos que não acrescentam progressão;
- preservar a ideia central e a identidade de Ganância, mas reconstruir os beats para que cada um tenha propósito;
- criar uma preparação curta e intencional, um ponto de concentração de energia, uma liberação com assinatura visual própria e um aftermath legível;
- fazer a transição de câmera lenta para o impacto com timing preciso, sem congelamento prolongado;
- não deixar a personagem suspensa sem motivo, nem repetir a mesma explosão em camadas redundantes;
- a explosão final deve ser a mais memorável da sequência, mas não a maior massa de partículas possível. Priorizar forma, contraste, timing, som e composição.

O criador citou a ultimate conhecida como “I AM ATOMIC” como referência de impacto dramático. Usar somente princípios abstratos de direção — preparação deliberada, concentração de poder, contraste entre silêncio e liberação, escala e consequência — para criar uma solução original de Ganância. Não copiar enquadramento, falas, música, sequência exata, coreografia, efeitos ou identidade visual dessa obra.

Ao final da ultimate, mostrar Ganância intacta, em pose dominante e coerente com o estado/forma existente. O cenário deve continuar visível.

### 13.8 NPCs — variedade visual com população controlada

O criador sugeriu o modelo NPC.jbl. Verificar primeiro se o arquivo existe, qual loader/rig usa, se já está carregado em cache e se suas animações são compatíveis. Não presumir extensão ou formato além do que o repositório confirmar.

Meta visual: cerca de 10 inimigos simultaneamente visíveis no combate como ponto de partida, podendo ajustar após medições. A sensação de multidão deve vir de entradas escalonadas, profundidade, silhuetas parcialmente encobertas, som ambiente, bandeiras, poeira e composição — não de centenas de rigs ativos.

- Usar um conjunto pequeno de variações visuais reutilizáveis do NPC base: paletas, peças de armadura, capas, capacetes, proporções discretamente distintas e acessórios cenográficos.
- Criar no máximo três famílias de aura para NPCs comuns, com intensidade baixa e diferenças fáceis de reconhecer. Não dar a todos um VFX chamativo.
- Reservar aura mais marcante e silhueta maior para poucos líderes/mini-chefes. Eles devem ser maiores e mais robustos por escala/armadura/pose, não por excesso de partículas.
- Variar props fictícios de cenário dos NPCs sem mudar o modelo-base de forma cara; garantir que não atravessem corpo/mãos e que a silhueta continue legível.
- Os quatro Bispos e Ganância mantêm exclusivamente suas assinaturas de VFX originais. Não aplicar aura genérica de NPC a eles.

### 13.9 Reforços sem pop-in e sem centenas de NPCs ativos

O criador quer ver grupos chegando em ondas, sem perceber que novos inimigos aparecem do nada. Implementar a sensação de reforços sem criar uma multidão simultânea:
- limitar o número de rigs ativos e animados simultaneamente com um orçamento medido; começar com aproximadamente 10 inimigos ativos e ajustar conforme o perfil mobile;
- preparar o próximo grupo fora do enquadramento, atrás de névoa, destroços, bandeiras ou limites naturais do cenário;
- fazer entradas em momentos de corte, movimento de câmera ou oclusão natural, com passos/som e leitura espacial coerentes;
- ao sair de cena, os inimigos derrotados podem se dissolver em partículas econômicas e seus recursos serem reciclados por pool;
- reutilizar rigs, materiais, geometrias e animações compatíveis, sem duplicar downloads ou shaders;
- nunca teletransportar NPC visivelmente para o meio da tela, nunca fazer spawn sobreposto ao protagonista e nunca deixar o jogador perceber um pop-in;
- se o enquadramento revelar a área de entrada, usar uma transição ambiental ou uma mudança de câmera que faça sentido na narrativa, não um truque abrupto;
- ter limite máximo explícito e telemetria de NPCs ativos, draw calls, triângulos, partículas e tempo de frame.

A meta é sugerir uma força inimiga numerosa enquanto somente um grupo pequeno é simulado de verdade. Não sacrificar estabilidade para aumentar a contagem.

### 13.10 VFX e áudio — variação com identidade e orçamento

Os VFX dos protagonistas devem ser os originais já implementados. Para NPCs, usar poucas variações discretas (por exemplo, branco frio, âmbar e vermelho escuro), reservando a variação mais forte aos líderes. Evitar colocar aura em todos os NPCs ao mesmo tempo.

Para cada ultimate:
- distinguir claramente preparação, emissão, impacto e dissipação;
- controlar overdraw, transparências em camadas, bloom, partículas e render targets;
- reutilizar materiais/shaders quando compatível;
- evitar centenas de partículas individuais com atualização por frame;
- preferir sistemas agrupados/instanciados ou spritesheets quando isso reduzir custo sem piorar a aparência;
- limitar luzes dinâmicas e sombras em tempo real; usar iluminação falsa/efeitos de material quando visualmente adequado;
- garantir que VFX não cubram a leitura dos personagens nem causem flashes excessivos;
- sincronizar som, impacto e câmera; não usar tremor contínuo ou volume máximo constante.

### 13.11 Encerramento e título

Depois da ultimate de Ganância, criar uma transição de câmera que revele o palco e reúna os quatro Bispos em uma composição final. Ganância aparece acima deles, voando, somente se a animação/forma aérea já existente estiver estável.

A câmera deve fazer um movimento deliberado e suave, com profundidade e escala. O título “A Batalha Contra os 7 Pecados Capitais” não pode simplesmente aparecer do nada:
- primeiro, criar uma breve pausa e uma área de contraste no céu/névoa;
- revelar o título através de partículas, traços de luz, poeira ou energia que se alinhem e formem as letras;
- usar tipografia já existente no projeto se adequada; não introduzir uma fonte pesada sem necessidade;
- manter o título legível em telas pequenas e em retrato;
- deixar a composição respirar por alguns segundos antes de encerrar.

Não adicionar legendas, frases ou logotipos extras sem autorização.

### 13.12 Pesquisa técnica e implementação Three.js — respeitar a versão do projeto

O projeto foi identificado anteriormente como usando Three.js 0.160. Antes de usar qualquer API, confirmar a versão exata no package/lockfile e consultar a documentação correspondente. Não copiar exemplos da documentação atual se dependerem de APIs posteriores.

Fontes oficiais úteis:
- WebGLRenderer, compileAsync e renderer.info: https://threejs.org/docs/pages/WebGLRenderer
- AnimationMixer: https://threejs.org/docs/pages/AnimationMixer
- Sistema de animação e blending: https://threejs.org/manual/pages/animation-system.html
- Liberação de geometrias, materiais e texturas: https://threejs.org/manual/pages/how-to-dispose-of-objects.html
- Cleanup e gerenciamento de recursos: https://threejs.org/manual/pages/cleanup.html

Usar essas referências para orientar:
- medir draw calls, triângulos, geometrias, texturas e programas com renderer.info;
- pré-compilar shaders com compileAsync somente se a API estiver presente na versão instalada e a medição indicar stutter de compilação;
- fazer cross-fade entre clipes compatíveis usando AnimationMixer/AnimationAction, com duração e sincronização verificadas;
- parar actions e liberar mixers/recursos no momento correto;
- usar pools e instancing quando houver muitos elementos repetidos e isso for compatível com o material/rig;
- liberar geometria/material/textura somente quando não houver outros objetos compartilhando esses recursos;
- não confundir renderer.info com medição de FPS/tempo de frame; usar também métricas de frame time e perfis reais.

Não adicionar dependência, atualizar engine ou reescrever o sistema de renderização nesta missão. Cada otimização precisa estar ligada a um gargalo observado e ter comparação antes/depois.

### 13.13 Plano de validação obrigatório desta sequência

- medir a duração total e garantir no mínimo 35 segundos, com alvo inicial de 45–55 segundos;
- revisar os quatro confrontos separadamente e a montagem completa, verificando se a identidade de cada personagem está clara;
- testar no formato retrato e paisagem, incluindo o tamanho de tela mobile;
- confirmar que a câmera nunca perde os protagonistas atrás de NPCs, partículas ou fumaça;
- verificar se o campo, lua e espada monumental permanecem legíveis;
- testar o orçamento de aproximadamente 10 inimigos ativos e ajustar com métricas, não por palpite;
- repetir a sequência várias vezes para detectar vazamentos de memória, crescimento de geometrias/texturas, listeners duplicados e degradação de FPS;
- verificar que reforços entram sem pop-in visível e sem duplicar rigs/recursos;
- testar as ultimates originais dos Bispos e a ultimate revisada de Ganância em conjunto com o loading e o retorno ao gameplay;
- fazer revisão visual humana de cada beat; qualquer pose, transição, efeito ou movimento que pareça genérico, estranho, artificial ou excessivo deve ser retrabalhado;
- não declarar teste em Android físico se ele não tiver sido executado em aparelho Android real.

O relatório final deve incluir duração real, número máximo de NPCs ativos, métricas antes/depois, recursos reutilizados, mudanças nas ultimates, testes executados, limitações e evidências visuais.

Na conversa com o criador, não enviar atualizações, resumos parciais nem explicações longas. Ao concluir de verdade e deixar a evidência técnica registrada na PR/artefato de entrega, responder somente: `Concluído.` Não usar essa resposta antes de todos os critérios e validações terem sido cumpridos.

---

Estado do briefing: COMPLETO — SEGUNDO COMPLEMENTO AUTORIZADO PELO CRIADOR EM 26/11/2026.

Estado do briefing: COMPLETO — AUTORIZADO PARA EXECUÇÃO PELO CRIADOR EM 26/11/2026.
