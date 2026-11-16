# CLAUDE — MOD 326 | FLUIDOS REAIS DE JOGO, TERRENO SEM FENDAS, AURORA NO ZÊNITE, FPS E SUBTERRÂNEO VULCÂNICO

> ORDEM DIRETA DO CRIADOR. **LEIA INTEGRALMENTE antes de editar.** Base = `main` atual (Mod 325 e quaisquer integrações recentes). Faça uma única missão coordenada, em etapas verificadas, com PR e testes; não altere o cânone. **SILÊNCIO EXTREMO: NÃO ESCREVER NADA NO CHAT, NEM PLANO, NEM PROGRESSO, NEM RESUMO AO TERMINAR.** Deixe TODAS as evidências e pendências exclusivamente na PR/arquivos do GitHub. Responda no chat somente se a plataforma exigir uma ação humana indispensável; caso contrário, nenhuma mensagem, inclusive "Concluído". Não finja conclusão nem faça merge sem cumprir os gates de aceite.

## 0. RESULTADO ESPERADO E EVIDÊNCIA ENVIADA PELO JOGADOR

O jogador testou a **Mod 325** no smartphone; a captura ainda mostra o marcador **324** em alguns frames, indicando possível cache/deploy/versão desencontrada. **PRIMEIRO** discriminar versão real do JS carregado vs indicador e cache. Não diagnosticar código antigo como nova regressão. As fotos estão no chat com o diretor; se Claude não tiver acesso direto aos anexos, não mentir: ler estas descrições e reproduzir no jogo, solicitar mídia apenas se indispensável.

- **Foto 1 (lava de perto):** faixa preta triangular com borda laranja dura, solta sobre terra escura; parece uma placa/gráfico rígido, NÃO lava que se move. Em outra foto, um oval laranja e vermelho, plano e recortado, também artificial. Ambos junto de Cinzária/sopé.
- **Foto 2 (lava de longe):** poça geométrica brilhante sem borda de solo queimado, calor ou massa fluida; precisa se encaixar na geologia.
- **Foto 3 (cachoeira de frente):** véus brancos muito regulares, geometria em leque que termina abruptamente em triângulos visíveis; água horizontal turquesa continua lembrando tinta/placa no solo. Há pedras aparentemente desancoradas na encosta e capim excessivamente luminoso.
- **Foto 4 (montanha verde):** traços pretos e brancos, muitos segmentos isolados e diagonais, ao redor da cachoeira e nos morros; ainda há costuras/artefatos/grandes fendas de renderização mesmo depois da Mod 325.
- **Foto 5 (paredão cinzento):** fachada de rocha com geometria vertical serrilhada e aberta, junto a fendas brancas no monte vizinho. O criador explicitamente rejeita esse defeito recorrente.
- **Foto 6 (referências de caverna vulcânica):** composição de busca visual com enormes salões escavados em basalto, pontes/escarpas, lago ou rio de magma, pilares naturais, névoa quente, brilho vindo da lava e túneis sinuosos, com mudanças de escala. As imagens são inspiração estética, NÃO assets autorizados; não copiar arte, personagens ou arquitetura específica.
- **Observação textual:** aurora ficou em torno das bordas do mapa, não visível sobre a cabeça do protagonista; não colore perceptivelmente superfícies. FPS por vezes cai abruptamente a **1–5 FPS**, apesar de frames normais entre ~28–54 FPS nas fotos. Prioridade de medir travadas de pior caso, não só médias.

**SEM FALSA ENTREGA:** "agora a água é translúcida", "adicionei scroll de textura", "fiz 2 planos com ondas", "adicionei espuma circular" ou "coloquei 2 triângulos vermelhos" **NÃO** satisfazem o pedido. A Mod 325 declarou água/cachoeira/lava resolvidas e os screenshots do jogador ainda mostram superfícies rígidas, planas e formas geométricas falsas. Reexaminar o problema como uma nova implementação, não ajustes cosméticos mínimos em algo inadequado.

## 1. REGRAS OPERACIONAIS, AUTONOMIA E DOMÍNIOS

- Ler o código ATUAL e documentos: `AGENTS.md` (se existir), contratos dos agentes, `docs/jornada/README.md`, `docs/equipe-5-agentes/06-CHAT-GERAL.md`, issue #519; `jornada-world3d.js`, `jornada3d.js`, `ceu-atmosfera3d.js`, `eldoria-weather3d.js`, `mundo-3d-prototype.js`, `volcano3d.js` e arquivos do render/combate/vida que forem envolvidos. Não supor que o arquivo temporário da missão anterior ainda existe (deve ter sido apagado).
- O registro da Mod 325 em `docs/jornada/README.md` descreve a água como `opacity .58` e espuma nas pernas: isso comprova por que apenas transparência não basta. O mesmo registro cita costura leste, skirts, winding e shader de aurora. Testar causas remanescentes em vez de repetir a solução.
- **Caverna do vulcão é a caverna do Ato II em `volcano3d.js`**, NÃO a caverna de Eldória do Ato I (C1–C5, já reconstruída e protegida). A missão autoriza melhorar/expandir APENAS o interior vulcânico sem destruir roteiro, sala do laboratório, galeria, sala do ouro, trono, miniboss, portal de VORGAZHEK, checkpoints e encontros existentes. Os dados de `volcano3d.js` já incluem túnel, celas, laboratório, caminho ao ouro, galeria, trono e portal — **não reconstruir outro mapa incompatível**.
- Consultar PRs A1–A5 e avisar #519 se mudar interfaces compartilhadas. Não editar branches/PRs alheias, não alterar `build-info.js` até integração autorizada. Cuidar do desempenho Android prioritariamente.
- **Ordem obrigatória:** (P0) fendas e travadas; (P0) água/cachoeiras/lava como sistemas reais de jogo; (P1) aurora; **SÓ após estabilidade e QA completos** iniciar subterrâneo vulcânico. Se o núcleo aquático/terreno ainda estiver falhando, NÃO avançar a caverna para fingir quantidade de entregas. Se a expansão for extensa, separar etapas/PRs dependentes com dependências explícitas, sem merge da etapa seguinte antes da anterior.
- Pesquise documentação atual e referências de técnicas e jogos, sem confundir shaders/efeitos estilizados com simulação científica. Se usar assets externos, conferir licença de redistribuição e registrar a fonte. Sem Pinterest/screenshots de terceiros dentro do jogo.

## 2. DEFINIÇÃO INEGOCIÁVEL DE "ÁGUA REAL, FLUIDA" E "LAVA REAL, FLUIDA"

**O jogador exige ÁGUA, LAVA E CACHOEIRAS REALMENTE FLUIDAS**, com movimento dinâmico e resposta crível ao mundo e ao personagem. Não basta uma foto convincente nem uma superfície lisa translúcida. Uma simulação completa de Navier–Stokes/CFD com milhões de partículas ou voxels em todo o mapa não é exigência racional para WebGL mobile; em vez disso, usar **simulação leve e localizada acoplada a renderização convincente**. O importante é o RESULTADO EM MOVIMENTO e interativo, e não uma etiqueta técnica "realista".

**Especificação de fluido jogável mínima:**
- **Fluxo contínuo observável em vídeo:** matéria se desloca em direção física coerente com gravidade e declive. Ondas, massa, bordas, variações de velocidade, rugosidade e turbilhonamento não podem ser apenas uma textura imóvel recolorida.
- **Interação significativa:** respingos, ondas e deslocamento ao tocar/caminhar pela água, compatibilidade com colisões e profundidade; lava tem emissividade, canais lentos de material viscoso e gameplay de contato/queimadura.
- **Geometria geomorficamente integrada:** rio alimenta topo de cachoeira; água cai de rocha para bacia, escoa por canal; lava ocupa depressões/fissuras com margem solidificada de basalto, sem disco/círculo/triângulo perfeito sobre a relva.
- **Transições e efeitos naturais:** bordas úmidas, espuma e spray na água, filetes e ruptura de fluxo, respingos localizados; crosta dinâmica e hotspots na lava, gradiente de temperatura/luz e vapor/heat distortion sutil quando medido. Nem tudo precisa fazer sombra volumétrica cara.
- **Um corpo de fluido com continuidade:** a queda precisa ligar-se visualmente à água da cabeceira e à poça inferior, sem faces truncadas, ponta triangular visível, alpha sorting errado, recorte seco, bleed sobre protagonista ou placa horizontal que atravessa as pernas.
- **Custo controlado:** simulação em grade 2D/heightfield de baixa resolução e domínio local quando necessário, fluxo por campos de velocidade e atualização amortizada, amplitude e taxa de propagação limitadas. Use GPU shaders/normal/displacement/foam em camadas somente como apoio visual da dinâmica, não como substituto de fluxo ou interação. Sem dependência pesada desnecessária nem recomputar malha inteira a cada frame.

**Abordagem candidata (não prescrição cega):** águas superficiais localizadas de águas rasas com advecção/heightfield e perturbações esparsas por contato + superfície renderizada com normais e espuma dependentes de profundidade; quedas livres com meshes curvos deformáveis e spray de gotículas instanciadas/pool sob gravidade, impacto na bacia; lava com fluxo viscoso procedural no UV/world-space guiado pelo relevo, geometria da bacia com pequena dinâmica em borda, variação de crosta e brilho + estado térmico de contato. Escolher técnica após benchmark e teste visual em 4 ângulos, não por ser "moderna".

### Água rasa/lago/rio
- Corrigir poça turquesa plana perto da cascata; examinar problema de render order, depth, opacity, clip e composição com terreno/câmera. Água precisa ter **profundidade visual**, ondas espaciais e resposta aos pés, sem "disco colorido" e sem invadir/ocultar injustificadamente a silhueta.
- A cor depende de luz, profundidade e substrato, não de uma cor chapada única. Adicionar espumas apenas no contato e nas margens reais, com dissolução, não círculo estático.
- Se água for caminhável pelo cânone, preservar caminhada, sem transformar em parede/abismo; água profunda precisa respeitar o sistema de dano/afogamento existente caso haja, não inventar novos sistemas conflitantes.

### Cachoeira principal e quedas do abismo
- Refaça de forma convincente, com origem, massa e vazão plausíveis, salto livre sobre o rochedo ou cascata por degraus, filetes laterais, véus irregulares e turbulência; menos "cortina de teatro". Vary waterfall cross-section/width with time and distance, break coherent streams at obstacles, gravity-based droplets and correct collision/impact zone.
- Foto atual: queda branca em leque com **final triangular seco** — isso é FAIL. Faça 3D com silhueta orgânica, queda realmente separada da rocha quando ocorre em precipício, ao menos uma cachoeira monumental vista da ponte; espuma/spray/névoa na base, transição para canal/lago sem desencontro.
- Teste presença de rochas flutuantes (pivot de modelo, amostragem do terreno na base/footprint e colisor), clipping do personagem e distâncias de 5, 30, 150 e 400 m em dia/noite.

### Lava em Cinzária e sopé
- **Eliminar todos os polígonos planos geometricamente obviamente falsos** (faixas retas, círculos/ovais, triângulos e retângulos) que representem lava. Substituir por canais ou poças com contorno irregular coerente com declive/fissura, margem negra de basalto e material com velocidade lenta/viscosidade convincente. NÃO espalhar lava por toda a cidade nem criar mar de lava no caminho obrigatório.
- Evitar lava magenta/neon ou apenas cor plana emissiva; padrão orgânico de crosta escurecida formando/rachando, canais de brilho se deslocando, superfície de magma e borda solidificada em movimento lento e temperatura com variação realista. Em ambiente escuro, algum fill light local econômico, sem dúzias de PointLights por poça.
- **GAMEPLAY OBRIGATÓRIO:** pisar/encostar na lava causa dano (por segundo ou tick regulado, não 60x por quadro) e aplica queimadura temporária com dano ao longo do tempo, feedback visual/sonoro claro e indicador compreensível. O dano deve usar o sistema real de HP/dano do jogador, não UI fake; invulnerabilidade/dash/escudo/checkpoint/respawn devem respeitar as regras já existentes. Testes: toque, permanência, saída da lava, múltiplos contatos, morte, respawn, invulnerabilidade, persistência ou limpeza do status; sem dano fora da superfície e sem travar player acidentalmente. Escolher números balanceados conforme economia e HP do jogo (não inventar perda letal instantânea).
- Colisores e **zona térmica** seguem o contorno visível real da lava; não raio circular oculto ou dano a metros de distância. Demonstre ao menos um vídeo de personagem encostando e perdendo HP, com queimadura após sair.

## 3. TERRENO — FENDAS PRETAS, BRANCAS E PAREDÕES NÃO RESOLVIDOS

As novas capturas ainda mostram segmentos pretos/brancos em regiões dispersas, linhas longas brancas diagonais, paredes verticais recortadas. Não basta adicionar skirt numa tile e declarar resolvido.

1. **Replicar nas posições reais** da Mod 325: montanhas do vale (foto com cachoeira), transição Eldória→vale, base do vulcão, penhasco/paredão na trilha. Capturar 360° em baixa e alta qualidade, caminhar aproximando/afastando até alternar LOD. Verificar também bordas externas e sombra.
2. Instrumentar `seamMode` existente com material de diagnóstico magenta se útil; distinguir **falhas de malha/triângulos ausentes, z-fighting/coplanar overlapping, precision/LOD, winding/backface, normais, shader, UV, depth, clipping e sombras**. As linhas pretas podem ter causa diferente das brancas. Não assumir todas como costuras.
3. Verificar `renderH`, `journeyHeight`, `JOURNEY_HOLES`, mistura -112/-150, amostras das bordas em near/far, skirt lateral, update de cores lineares, terreno antigo e altura física. Considerar deslocamento de origem/precisão float32 e negative scale/winding de faces. Paredão de limite antigo Mod 311 foi explicitamente deixado como limitação pela Mod 325: **AGORA incluí-lo no escopo se reproduzível** e corrigir sem deixar o jogador atravessar o mundo.
4. Corrigir a causa com topologia bem definida e transições suaves; não tapar com vegetação ou névoa, não desligar câmera, não deixar paredes invisíveis. Teste sem skybox/fog e depois com céu real, junto de collider/step-up/respawn e LOD.
5. Critério: ZERO fendas visíveis nas posições relatadas, contra prova própria em panorama 360° e screenshot lado a lado, sem explosão de draw calls.

## 4. AURORA ACIMA DO PROTAGONISTA + ILUMINAÇÃO DO AMBIENTE

O usuário considera preferível que a aurora esteja **no céu diretamente acima do personagem**, não apenas em anéis periféricos ao longo do horizonte. A escolha tem fundamento artístico: criar arco/coroa zenital com cortinas de luz que cruzam o alto da abóbada. Não transformar o horizonte inteiro em parede roxa nem aurora física em um foco luminoso muito intenso.

- Revisar shader `ceu-atmosfera3d.js` Mod 325 (dois arcos em oval): reforçar cobertura **no zênite e no campo superior da câmera**, com cortinas volumétricas aparentes, dobras/ondas suaves em múltiplas escalas, movimento lento contínuo, brilho variável e gradiente roxo/magenta/azul. Usar camera-space vs world-space coerente para céu infinito sem artefato de parallax nem bordas.
- A aurora precisa ser visível acima do protagonista quando ele olha para cima (noite com céu limpo), e também perceptível do terreno com a câmera horizontal através da extensão dos arcos; não sempre oculta atrás de montanhas. Testar vista vertical + quatro direções, dia/crepúsculo/noite, cidade/vale/ponte e controle de qualidade mobile.
- **Coloração AMBIENTAL PRECISA SER PERCEPTÍVEL E NÃO FALSA:** integrar contribuição violeta/azulada no sky/hemisphere/ambient e em materiais responsivos, suavemente no chão, nas pedras, árvores e água, de acordo com intensidade real do shader e oclusão das nuvens. Não basta alterar uniform e escrever no PR que colori: fotos ANTES/DEPOIS com pixels e observação de cor em superfícies, salvando equilíbrio e legibilidade. Não usar dezenas de luzes dinâmicas nem pintar materiais permanentemente de roxo.
- Se cores não chegarem à superfície por material não reagente, corrigir via caminho real de iluminação, alinhando A4/lighting. Não mascarar com pós-processamento fullscreen caro.

## 5. FPS 1–5: CAÇA A TRAVADAS ESPORÁDICAS SEM BAIXAR A QUALIDADE

O criador viu quedas súbitas a 1–5 FPS no aparelho físico. Os números anteriores de SwiftShader p99 16ms NÃO invalidam essa observação: são sistemas diferentes, e travada transitória raramente aparece no p95. Tratar como bug real a investigar, sem alegar que já foi reproduzido.

- Instrumentar frame-time p50/p95/**p99/p99.9**, frames >50, >100, >250 ms, long tasks JS/CPU, spikes de GPU se timing suportado, memória, `renderer.info`, quantidade de geometrias/texturas, draw calls, triângulos, upload, compilação e GC em travessia real. Registrar tempo em região, presets, objeto, câmera, build, dispositivo.
- Inspecionar `jornada-world3d.js` geração/streaming near/far e vegetação, `runGen`, filas e janela de orçamento (3–5ms), recalcular colliders/heightfield, sombras/culling `InstancedMesh`, shader recompilado, VFX/water simulation/aurora e carga de assets. Não somar por frame vários jobs "baratos" que explodem em conjunto.
- Solução deve ser de arquitetura/cadência: jobs escalonados com orçamento real medido, buffers reutilizados, materiais compartilhados, geometria simplificada por *distância* (LOD visualmente coerente), culling válido, compressão KTX2/Basis se o ganho for comprovado, render target reuse, liberacão correta de recursos. Não reduzir qualidade global, não esconder a cidade, não desligar água, não cortar vegetação massivamente.
- Testar caminhada e câmera com 15+ minutos de replay se ambiente permitir, ou sessões menores comprovadamente repetidas se houver limites; registrar queda real e comparação no mesmo cenário. O FPS no Galaxy A55 requer validação do criador; não inventar Android real em automação headless.
- Fazer regressão de benchmark das situações críticas: primeira carga, vale/cachoeira, ponte, aproximação de Cinzária, lava, vulcão, portal e entrada da nova caverna.

## 6. SÓ APÓS CORRIGIR/VALIDAR P0/P1 — CONSTRUIR SUBTERRÂNEO VULCÂNICO

**Muito importante:** há duas cavernas diferentes. **NÃO tocar na caverna de Eldória/Ato I reconstruída (C1–C5)**. A nova missão é o SUBTERRÂNEO DO VULCÃO/Ato II já conectado à entrada na frente do cone, dados em `volcano3d.js`. Inspecionar implementação visual do tema `volcano`, sistema de portais, física e cenas existentes antes de expandir. Se ainda existirem falhas P0 na água/terreno/FPS, **não anunciar que começou caverna**.

### Direção artística da referência
- Grande entrada rochosa natural ligada à base vulcânica, sem porta genérica e sem teleporte visual abrupto. Túnel de transição longo e progressivamente mais quente/escuro, com curva, desnível e eco; depois **salões subterrâneos enormes de basalto** com colunas, pontes de rocha, abismos e rios/lagoas de magma em cotas baixas, vapor/névoa quente local e pontos de luz provenientes da lava. Contraste entre passagens opressivas e câmaras monumentais; escala crível e landmarks de navegação. Composição original dark fantasy celestial/demoníaca coerente com o RPG.
- Preservar trama e progressão de entrada → túnel/celas → laboratório/vítimas → caminho secreto do ouro → galeria e encontros → trono/miniboss → portal do Bispo VORGAZHEK. **Não trocar o roteiro por cenário genérico de inferno**, não transformar o local em open world sem objetivo, não remover encontros/colisores/checkpoints.
- Lava interior deve usar o mesmo sistema convincente de fluxo e dano + queimadura (com pools/reuso), com correlação visual e material do exterior. Margens e passarelas devem permitir atravessar sem pisar em dano inevitável. Pontes sólidas e estreitas o suficiente para tensão, mas adequadas a controles mobile e câmeras 1ª/3ª pessoa.
- Fogo/poeira/estilhaços com parcimônia, fontes de luz físicas orçadas; sombras de contraste sem tornar caminho ilegível. Paredes com relevo orgânico e texturas, evitar cilindros/caixas como geologia final. Trabalhar com chunk/occlusion/draw call/LOD e limite de memória sem perder imponência.
- Gameplay: entrada/saída, viagem completa, volta, combate de NPCs já previstos, colisor em paredes/ponte/chão, altura de teto/câmera, queda ao abismo com respawn, lava/dano/queimadura, checkpoint, save/load, portal final. Não prender jogador com portas invisíveis ou loading stall.
- Planejar e executar **fase de estrutura jogável e QA** primeiro (entrada, túnel, grande salão inicial, ligação ao percurso existente); depois decorações e salas subsequentes somente com base no roteiro e testes, registrando o que realmente entrou. Se não couber concluir tudo em uma missão, deixar PR clara e etapa restante, sem mentir.

## 7. PESQUISA E TECNOLOGIA — ATUAL E PRÁTICA

Pesquisar documentação de Three.js conforme versão do repositório, WebGL mobile e exemplos de fluidos, cascatas e aurora. Técnicas a **avaliar com benchmarks**, não buzzwords:
- solver 2D raso/heightfield localizado e estável, advecção leve, instancing de gotículas, foam/spray condicional, normals animadas em múltiplas frequências, screen-space depth quando viável;
- shader de magma com campos de velocidade, evolução local da crosta, emissividade modulada, bordas por máscara de solo/height sampling, colisão térmica em contornos reais;
- precisão de terrain tiles, skirts/stitching/edge welding, culling e bounds, GPU Float32 e normais coerentes;
- atmosfera de aurora com ruído multi-escala controlado e integração na iluminação existente;
- profiling de long tasks e frame time, `renderer.info`, descarte de buffers/texturas, texturas KTX2/Basis quando já disponíveis e benéficas;
- streaming amortizado e instâncias agrupadas por material, não milhões de objetos/partículas.

Fontes oficiais de referência: `https://threejs.org/docs/`, `https://threejs.org/docs/pages/KTX2Loader.html`, `https://threejs.org/manual/pages/how-to-dispose-of-objects.html`, `https://threejs.org/manual/pages/how-to-update-things.html`; exemplos atuais de água `three/addons/objects/Water*.js` somente se import/versão e desempenho forem confirmados. Não afirmar que **um shader simples é fluido simulado**; documentar qual parte usa dinâmica/simulação e qual parte é aproximação visual.

## 8. QA BLOQUEADOR, EVIDÊNCIA, MERGE E SILÊNCIO ABSOLUTO

**Qualquer resultado reprovado abaixo bloqueia merge e conclusão:**
1. Linhas brancas/pretas e buracos reproduzíveis nas cinco vistas reportadas; paredão recortado; costuras LOD.
2. Água/lava com bordas retas/triangulares/circulares falsas, imóvel, placa recortada, interface que corta avatar; cachoeira sem vazão/impacto/continuidade da origem à bacia.
3. Lava causa dano fora do contorno, não causa dano ao tocar, dano dispara por frame, queimadura sem duração/feedback, morte/respawn bugados.
4. Aurora periférica sem presença sobre o protagonista ou sem influência observável no ambiente noturno.
5. Regressões graves FPS/stutters, memória, input, HP, controles, quests, cidade, ponte e NPCs.
6. Caverna do vulcão não mantém percurso/roteiro/portais/colisões, ou introduz área destrutiva sem saída.

**Evidências obrigatórias:**
- antes/depois reais da mesma câmera, viewport, data/hora do jogo e preset; capturas amplas de montanhas/fendas, vídeo de 20–40s para cada água/cachoeira/lava mostrando fluxo e interação, vídeo de lava em contato com personagem mostrando HP e queimadura, aurora zenital 15–30s e efeito no ambiente, vulcão de perto e de longe, perf/stutter em percurso;
- checks específicos + Node/CI e smoke com joystick touch/multitouch, câmera, corrida/dash, pulo, personagem encostando água e lava, atravessando ponte, entrada/saída de Cinzária e caverna;
- run e registro de `renderer.info`, frame p99/p99.9, frames >100ms, memoria e comparativo de custo por fluido. Citar em cada evidência **simulado (SwiftShader)** ou **Android real**, sem confundir.
- PR deve ter arquivos, sintomas, causa, mudança, testes concluídos vs pendentes e links para evidências. Se não acessível, reportar honestamente como bloqueio.
- **Não mudar build-info.js nem forçar deploy/merge sem comprovação**. Merge autorizado somente se CI requerido e QA relevante concluírem, sem conflitos ou regressão; caso contrário manter draft e continuar iterando. Se houver falhas preexistentes, verificar equivalência contra base e resolver as que impedem validação da mudança; não simplesmente ignorar.

**FORMA DE COMUNICAÇÃO (ORDEM EXPLÍCITA DO CRIADOR):** mantenha o chat do Claude em **SILÊNCIO TOTAL**, no começo, no meio e **NO FINAL**. Sem "Vou começar", sem "Concluído", sem explicações, sem resumo, sem código colado, sem gastar tokens em conversa. Todos os resultados, evidências e bloqueios devem ser registrados apenas em commits/PR/issue #519, com textos mínimos e honestos. Se uma aprovação humana for exigida para uma ação destrutiva/custo/credencial, somente a pergunta essencial; não fingir que conseguiu algo sem isso.

**Ao concluir:** registre dados permanentes de QA e implementação em `docs/jornada/README.md` / docs apropriados do vulcão; exclua ESTE briefing temporário na PR para não acumular instruções obsoletas. NÃO mandar mensagem final. O criador verificará GitHub e o jogo.

**CRITÉRIO DE SUCESSO:** o jogador vê e sente água, lava e cachoeiras realmente fluidas e responsivas, não placas falsas; terreno contínuo; aurora viva acima dele tingindo a cena; sem quedas abruptas 1–5 FPS; subterrâneo do vulcão belo e navegável, sem destruir o cânone nem a qualidade mobile.
