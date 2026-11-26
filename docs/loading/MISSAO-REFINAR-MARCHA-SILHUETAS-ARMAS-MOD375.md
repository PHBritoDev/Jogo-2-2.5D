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

Estado do briefing: COMPLETO — AUTORIZADO PARA EXECUÇÃO PELO CRIADOR EM 26/11/2026.
