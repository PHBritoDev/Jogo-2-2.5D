# TAREFA TEMPORÁRIA PARA CLAUDE — BISPO 3 (ZAR’KHAEL) — SKILL 2: LUA TENEBROSA & CHAMAS NEGRAS

> **LEIA TUDO ANTES DE ALTERAR QUALQUER ARQUIVO.** Pedido do criador de **A Batalha Contra os 7 Pecados Capitais**. Repositório: https://github.com/PHBritoDev/Jogo-2-2.5D, branch principal \`main\`. Execute você mesmo; não responda com sugestões, pseudocódigo, só um plano ou arquivos soltos. PESQUISE, PROGRAME, TESTE, FAÇA COMMIT, FAÇA MERGE SE SEGURO e remova ESTE arquivo temporário ao terminar. **Silêncio total** definido no final.

## 0. O QUE ESTÁ APROVADO E AS CONSEQUÊNCIAS PARA O JOGO

**Motor atual: JavaScript + Three.js / WebGL, público no GitHub Pages, foco Android. NÃO migrar para Unity ou Godot, NÃO substituir o jogo, NÃO reconstruir a arena.** Esta é uma Skill 2 definitiva, exclusiva dos perfis \`zarkhael\` e \`fallen3\`, a ser integrada à dimensão real do Bispo 3 e ao teste. A Skill 1 autoral \`HIDRA DO JUÍZO\` (Mods 266/268) já existe; a Mod 267 **removeu de verdade** as magias genéricas do Bispo 3. Não restaurá-las, nem usar como placeholder.

**Consequências que você deve evitar:** queda de FPS no Galaxy A55/Android, travamentos do carregamento, câmera ocultando o personagem, poderes atravessando terreno, dano a cada frame, DOT infinito, queimadura sobreposta, lua sumindo antes do sétimo lançamento e regressões nos Bispos 1/2, inimigos ou HUD. Use o motor, os recursos e convenções REAIS encontrados no código. Se algo já existir (shader de fogo, câmera shake, áudio, impacto, colisão, gerenciamento de efeitos), investigue e reaproveite apenas se combinar artisticamente; jamais cole um efeito genérico aleatório.

## 1. VISÃO ARTÍSTICA — REFERÊNCIAS DO CRIADOR SÃO O ALVO

O criador forneceu **duas imagens de referência** na conversa de origem. **Não alegue ter visto essas imagens se não estiverem visíveis para você**; se o criador as anexar à sessão Claude, analise ambas VISUALMENTE antes de programar. Até lá, as descrições minuciosas abaixo servem como requisito. Fidelidade em silhueta, movimento, expressão e materiais é prioritária. Nenhum dos desenhos precisa ser reproduzido como textura estática copiada literalmente; recrie artisticamente o estilo com recursos próprios e respeite direitos de terceiros.

### IMAGEM A — CHAMA NEGRA (primeira imagem)

Fogo negro **orgânico, estilizado, quase líquido e esfumaçado**, com base larga, várias fitas de fumaça e chamas alongadas que se retorcem para cima com pontas finas agudas. Sem aparência de pedra, espinho sólido, esfera preta, esfera de plasma normal, fumaça cúbica ou cone rígido. Referência de tinta preta/óleo em movimento: **línguas de chama curvilíneas, ondulação viva, camadas com recortes e transparência, filamentos ascendentes e pequenas cinzas**, brilho muito discreto cinza-prateado e/ou violeta sombrio nas bordas para ser visível sobre o cenário preto. Silhueta dramaticamente variável, redemoinhos que nascem e se desfazem; energia não parece um desenho plano estático. A imagem mostra chamas e fumaça negras sobre fundo claro, com vários fios delicados e base como um turbilhão de tinta. No jogo, precisam ser 3D/volumétricas visualmente, sem criar centenas de objetos isolados.

### IMAGEM B — LUA TENEBROSA / OBSERVADORA (segunda imagem)

Lua/disco celestial **muito grande e perturbador**, com aparência de máscara/crânio lunar deteriorado, **superfície osso-cinza pálida, manchada/suja, contorno imperfeito e irregular**. O rosto é **assimétrico**, não uma carinha de emoji, não uma lua perfeitamente esférica lisa: **olhos estranhos, arregalados e desiguais**, uma região direita formando **um vazio negro colossal/olho oco**; no lado esquerdo há olho grande branco-acinzentado com pupila escura; outro olho menor parece encarar o observador. **Sorriso pequeno, antinatural e aterrorizante, com fileiras de dentes irregulares e estreitos**, expressão de pesadelo, sombras profundas. A lua não pode virar um rosto humano normal, uma máscara infantil, uma careta cômica, ou uma esfera sem detalhes. Sujeira, rachaduras finas, áreas desbotadas e iluminação de lua morta. **Ela permanece parada no alto do céu, enorme e claramente visível**, enquanto **os olhos/pupilas acompanham o jogador suavemente**; isso deve ocorrer sem fazer o disco inteiro balançar ou virar de forma ridícula. A câmera pode mudar, mas a lua continua parecendo um astro gigantesco distante.

**Obrigatório pesquisar referências de:** desenho/escultura de lua de horror surreal assimétrica, animação de *gaze tracking*, *layered parallax* atmosférico, *stylized black flame VFX* com *ribbons*, *noise distortion*, *flipbook* ou shader 3D. Não inventar que pesquisou. Não copiar imagem com marca d’água como textura final do jogo.

## 2. MECÂNICA EXATA — SETE CHAMAS + UMA CHAMA FINAL COLOSSAL

1. O Bispo 3 começa o ritual e **a lua tenebrosa nasce/se revela lentamente no céu** da dimensão, em um lugar **alto, grande e impossível de ignorar**, mas sem cobrir o HUD, sem apagar o mundo e sem bloquear a visão do chão. Use transição atmosférica curta e leitura clara.
2. Enquanto ela está presente, **o olhar da lua segue a posição do protagonista** em tempo real, com movimento orgânico das pupilas; o resto da face se mantém estável ou com respiração extremamente sutil. Nunca permitir que a lua teleporte de posição ou apareça muito perto dos modelos.
3. O Bispo realiza **EXATAMENTE SETE lançamentos de chamas negras menores**, um após o outro, com animações de conjuração e intervalo moderado, **não rápido demais, não lento demais**. Diretriz inicial de ritmo: um lançamento a cada **0,8–1,1 s**, e uma breve antecipação visual da mão/energia antes de cada disparo; ajuste jogando se necessário. **Contador de disparos é determinístico 1–7; jamais 6, 8 ou spam infinito.**
4. Cada chama é uma **massa de fogo negro vivo COM LÍNGUAS VISÍVEIS**, cauda retorcida e filamentos; não projetil básico tipo bola/preto chapado. O Bispo efetivamente **atira** a chama com braço/mão/pose de cast, com origem no personagem e trajetória coerente. Construa sensação de fluxo de energia na palma até o lançamento.
5. **Acerto direto de chama menor no jogador:** impacto pequeno/médio, mas expressivo (estouro escuro, micro pausa, breve tranco de câmera, som), um dano inicial equilibrado e efeito de **queimadura por exatos 3,4 segundos**, visual de fogo preto envolvendo partes do corpo durante esse período. Não desorganizar o rig nem encobrir tudo que o jogador precisa ver.
6. **Chama menor atingindo o CHÃO (sem acertar o jogador):** respinga/vira uma **mancha de chamas negras vivas no piso por 4,0 segundos**, com altura e área de efeito coerentes, sem flutuar sobre o piso, sem atravessar geometrias. Extinção com dissipação orgânica, jamais sumiço brusco.
7. **Se o jogador encostar/triscar numa mancha pequena:** começa queimadura de **4,0 segundos** a partir do contato, com dano periódico moderado e efeito visível no corpo. **Dano não acumulativo**: apenas uma queimadura ativa por vez; novo contato pode **renovar a duração** até o maior tempo remanescente, mas não criar mais camadas/ticks de dano simultâneos.
8. Após as sete chamas menores, o Bispo entra em uma **conjuração final mais intensa** e forma **A MAIOR CHAMA NEGRA DE TODAS**, visivelmente colossal, com núcleo em movimento e várias lâminas/fita de fogo em espiral, fumaça/chamas gigantes se construindo por etapas. Deve ser várias vezes maior que as anteriores, mas caber e ser legível na arena/câmera. **Não é a Ultimate do Bispo**; é a conclusão da Skill 2.
9. Bispo **LANÇA** essa chama enorme contra o protagonista. Ela deve viajar de verdade; não teletransportar na cabeça dele, nem provocar dano antes do contato, nem persegui-lo indefensavelmente. Transmissão de perigo/telegraph e janela real de esquiva com dash.
10. **Acerto direto da chama final:** impacto **MUITO GRANDE**, onda de choque, flash moderado, tremor de câmera controlado, recuo/feedback no herói e explosão negra estilizada; dano inicial maior e **queimadura intensa por 6,0 segundos**, com fogo preto sobrenatural cobrindo o corpo como uma **AURA COMPLETA**, de forma legível e bem integrada à animação (seguir corpo que anda, corre, pula, dá dash e toma dano sem deslocar o esqueleto).
11. **Se a chama final cair no chão:** deixa **um incêndio NEGRO GIGANTESCO e orgânico por 7,0 segundos**, cobrindo área maior que as manchas comuns, emitindo colunas de fogo negro curvilíneo, sombra/fumaça e pequenos resíduos; ainda **não** pode ser simples cilindro, cogumelo de fumaça ou bolha dura.
12. **Ao encostar nesse incêndio gigante:** aplica **queimadura por 6,0 segundos**, mesmo se roçar apenas a borda real da área perigosa. Não acumula DOT com queimadura pequena, nem com outras manchas. Recontato renova duração, sem criar fontes paralelas.
13. A **lua permanece visível por TODOS os 7 lançamentos pequenos E por toda a criação/disparo da chama gigante**. **Ela começa a sumir somente depois que a chama final foi de fato lançada**, com fade/dissolução atmosférica curta e sinistra. NÃO desaparecer antes ou no começo da carga final. O incêndio que ficou no chão pode durar os 7 s completos **mesmo depois de a lua desaparecer**.
14. Depois de concluída a sequência, o Bispo recupera o controle do combate normalmente (não fica paralisado até a última mancha apagar). **As queimaduras e áreas no chão continuam seus tempos próprios**. Não iniciar outra Skill 2 enquanto a sequência atual estiver em curso.

### Valores / coerência de duração — FIXOS, NÃO INTERCAMBIÁVEIS

| Fonte | Efeito | Duração |
|---|---|---:|
| Chama menor acertou jogador diretamente | queimadura DOT no jogador | **3,4 s** |
| Chama menor caiu no chão | mancha no piso | **4,0 s** |
| Jogador tocou mancha menor | queimadura DOT no jogador | **4,0 s** |
| Chama GIGANTE acertou diretamente | aura corporal negra + queimadura DOT | **6,0 s** |
| Chama gigante caiu no chão | incêndio colossal no piso | **7,0 s** |
| Jogador tocou o incêndio gigante | aura corporal + queimadura DOT | **6,0 s** |

**Importantíssimo:** "não acumulativo" significa uma ÚNICA instância de queimadura por personagem, sem sobrepor DPS, somar durações ou replicar camadas VFX. Na aplicação de queimadura mais intensa sobre mais fraca, **substituir a intensidade e preservar a maior duração aplicável**, sem dobrar dano. Manchas distintas são visuais distintos, mas a checagem de contato deve consolidar o dano: não gerar múltiplos ticks por estar em 2 manchas.

**Sugestão de balanceamento:** os números de dano inicial/por tick são decisão TÉCNICA fundamentada na vida atual do protagonista e na Skill 1. Use \`powerStats\`, defesa/invulnerabilidade existentes, intervalos discretos (ex.: 0,6 ou 0,75 s) e teste a batalha; não configure uma chama que mate o jogador instantaneamente nem 7 acertos inevitáveis. A queimadura deve causar dano de verdade sem ignorar permanentemente o sistema de HP. Fogo no corpo precisa respeitar morte, pausa, saída da dimensão e respawn.

## 3. COMO VENDER A QUALIDADE VISUAL — SEM EFEITO GENÉRICO

### Lua: arte e movimento

- **Dimensão:** uma presença no céu bem maior do que o Bispo; proporção e posição testadas com a câmera 3ª pessoa do jogador e a opção de 1ª pessoa. Usar forma lunar assimétrica e **composição em camadas** (corpo cinza-osso, sujeira/riscos, áreas de sombra, olhos independentes, dentes e boca). NÃO usar \`SphereGeometry\` cinza com dois círculos pretos como “rosto”; NÃO usar monstruosidade dura com espinhos aleatórios.
- Lua acompanha visualmente o jogador **com os OLHOS**, não deslocando o corpo celestial pelo mapa. Pupilas/elementos faciais localmente orientados com limitação angular, suavização e estado válido quando jogador pula/corre ou passa por trás da lua. Evitar deformação/olhar invertido, clipping e desaparecimento por neblina/culling.
- A expressão precisa transmitir **horror desconfortável e sobrenatural**, semelhante à imagem B: **face pálida, sorriso impossível, dentes, olhos dissonantes, um enorme vazio escuro**. Poderia haver aura fria/sombra atrás, vinheta local e pouca névoa, mas preservar personagem e combate.
- Quando terminar o lançamento gigante: olhos podem brilhar ou olhar fixo antes de desaparecer, fade dissolve de baixo contraste. Lua realmente some e descarrega recursos.

### Chama negra: qualidade de fogo, não fumaça feia

- Gerar **variações orgânicas** de chamas com movimento contínuo: *flow noise*, *distortion*, tiras/fitas/ribbons sinuosas, línguas alongadas, camada interna escura em movimento e contorno cinza-violeta discreto.
- **Sem cubos, espinhos, esfera sólida, cones, cilindros, textura plana imóvel, pedra preta, tentáculos mecânicos, orbs com brilho branco no centro que pareçam bolas comuns, fumaça rosa genérica.**
- Pequena chama individual deve parecer “uma tocha amaldiçoada atirada”. Chama final deve parecer “uma muralha/vórtice de fogo negro demoníaco” **em escala superior**, com construção gradual: faísca inicial → fluxo converge → grande núcleo de fogo → muralha de línguas → disparo → expansão no impacto.
- O fogo deixa rastros e resíduos com cinzas, mas não interfere no núcleo do ataque seguinte. Use shaders e geometria leve/batching conforme necessidades do Android; textura sprite/flipbook legítima se disponível. Reaproveitar \`sakuga-skills-vfx3d.js\`, \`skill-impact3d.js\`, outros VFX se o visual combinar após inspecionar; **não** reintroduzir projéteis genéricos legados (Mod 264).
- Explosão grande precisa **crescer após contato**, e não mostrar uma bolha inteira de uma vez. Etapas: contacto/compressão brevíssima → ruptura/explosão expansiva em 0,25–0,6 s → onda de choque e chamas residuais → transição para incêndio no piso ou aura no corpo.

### Feedback de combate cinematográfico

- 7 pequenas: micro telegraph, recuo do braço, pequeno impacto, micro shake direcional, feedback de dano e áudio. Preservar controle.
- Final: aviso mais forte, som grave crescente, leve redução dinâmica do ambiente se suportado, compressão na colisão, **hit stop muito curto**, FOV punch modesto, **camera shake via sistema EXISTENTE**, pulso de luz escura/clarão controlado, onda de choque e som de baixa frequência.
- **Reduzir efeitos em 1ª pessoa, respeitar \`reduceShake\`, nunca travar câmera ou anular entradas de movimento/dash.** Hit-stop NÃO deve estender timers ou causar DOT/colisão repetida em clocks distintos. Respeitar as configurações de qualidade existentes.

## 4. TRAJETÓRIA, DETECÇÃO DE COLISÃO E AVISOS

- 7 pequenas + 1 gigante = 8 projéteis reais, originados na pose/conjuração do Bispo. Trajetórias no mundo com altura convincente e cores/efeitos visíveis.
- A mira pode se ajustar durante preparação, **mas deve travar ao disparar** (alvo na posição atual ou previsão curta limitada do movimento), para o jogador conseguir desviar. Não ajustar a direção em voo como míssil infalível.
- **Colisão varrida por segmento** para não atravessar herói em FPS baixo; colisão do chão usa \`groundHeightAt\`/chão da dimensão, não Y absoluto fixo. Nunca causar dano se não tocar herói/área. Não avançar dano quando pausado.
- Aviso justo e legível para a chama gigantesca antes do lançamento; se o chão tiver zona perigosa, bordas fáceis de ler sem transformá-las em marcador genérico feio. Dano por contato ao raspar borda (distância + raio efetivo do personagem, não exigir estar no centro).
- Manchas residuais podem sobrepor visualmente, mas limite de instâncias, *pooling* ou reaproveitamento, e nunca 7x DoT sobreposto.

## 5. IA DO BISPO 3 E INTEGRAÇÃO VERDADEIRA

### Estado real conferido na \`main\` (até Mod 268; inspecione novamente ANTES de editar)

- \`powers3d.js\`: \`KITS.zarkhael.skills\` contém **apenas** \`s1: 'HIDRA DO JUÍZO', type 'hydra_judgment'\`; \`sword: null\`, \`ult: null\` intencionalmente depois de excluir genéricos.
- \`fallen3\` resolve o mesmo kit de ZAR’KHAEL.
- \`zarkhael-hydra3d.js\`: Skill 1 autoral, selo, Hidra, orbes, impacto, e raiz apoiada no solo (Mod 268); **não mexa**.
- \`zarkhael-brain3d.js\`: IA por utilidade; hoje considera ranges antigos de \`line/orbs/cone\` embora poderes tenham sido eliminados. Estender escolha para a NOVA Skill 2 real sem ressuscitar esses poderes.
- \`mundo-3d-prototype.js\`: \`runFoeMove\`, \`updateFoeKit\`, \`updateHydra\`, \`stopHydra\` e ciclo do chefe. Também tem \`damagePlayerFromEnemyAttack\`, \`playerInvulnerableUntil\`, \`dashRemaining\`, gerenciamento de dimensão/reset, pause e HUD.
- \`laboratorio-inimigos.html\`: tem botões para Bispo 3 e Hidra.
- A Mod 267 apagou o ataque de pilares legado do Bispo 3. **Não readicionar** ou usar uma função padrão de ataques antigos como atalho.

### Implementação exigida

1. Criar módulo específico, por ex. **\`zarkhael-blackflame3d.js\`** (lógica de gameplay pura testável + VFX separados quando fizer sentido). Pode dividir em \`zarkhael-moon3d.js\`, etc., conforme arquitetura, mas não criar módulos vazios ou esqueletos. NÃO substituir Three.js.
2. Registrar \`s2\` exclusivo e autoral em \`KITS.zarkhael\`, com nome sugerido **\`LUA TENEBROSA — O FOGO QUE NÃO MORRE\`**, tipo próprio (\`zarkhael_black_moon_flames\`, por exemplo), cooldown real compatível com duração longa da sequência; preservar S1 e deixar S3/sw/ult NÃO criadas, sem genéricos.
3. Integrar \`runFoeMove\` e update no ciclo **REAL** do jogo: conjuração, moon spawn, disparos 1–7, golpe final, impactos, DOT, campos no chão, VFX no corpo, animações, áudio, cleanup.
4. Integrar nova Skill 2 ao **sistema de IA por utilidade**: apropriada a média/longa distância, sem usar simultaneamente com Hidra, cooldown correto, comportamento ao encurtar distância, uso não previsível, sem spammar e sem cancelar a skill por bug de rotinas de ataque. A IA é melhor que nos bispos anteriores, não apenas “atira a cada 5 s”.
5. Se quiser que Bispo execute 7 conjurações como ritual contínuo, **deixar ele visualmente conjurando**, com braço movendo em cada um dos 7 lançamentos e carga final; pode tomar dano/ser derrotado normalmente. Defina política consistente para interrupção por morte, troca de dimensão, cinematografia, reset e saída do jogo.
6. Lua visível só durante a janela de invocação/carga/disparo; **não deve permanecer após a habilidade acabar**, salvo VFX residual de DOT e incêndio. Face nunca ficar presa na cena após reset.
7. Criar acesso ao teste sem avançar na história: já existe \`?testeDimensao=bishop3\`; acrescente **\`&testLuaNegra=1\`** com disparo repetível apropriado/sem depender de HP. Botão **“🌑 Testar LUA TENEBROSA (Bispo 3)”** no painel interno das dimensões e em \`laboratorio-inimigos.html\`. NÃO remover o teste da Hidra.
8. Qualidade do mobile: limitar *draw calls*, instâncias e partículas, considerar shader complexity e overdraw (principalmente chama preta translúcida), reutilizar geometria/material, limpar resources, evitar allocations e leaks a cada quadro. Testar configurações low/auto; manter mesma mecânica/dano em low, simplificar só a aparência.
9. Cache: atualizar BUILD em \`mod181-loader.js\`, \`mundo-3d-prototype.html\`, \`index.html\`, \`laboratorio-inimigos.html\` e links de teste de forma consistente ao criar a nova Mod. Não dar como “pronto” só por aumentar o número da versão.

## 6. PESQUISA OBRIGATÓRIA / CAMINHO PARA PESQUISAR

**Antes de escrever o efeito, faça pesquisa REAL e estude técnicas e jogos de ação com VFX cinematográficos** (sem copiar assets protegidos): black flame/oil-ink VFX, *procedural flame shader*, *ribbon meshes*, *flow maps*, transparência sem overdraw exorbitante, *Moon boss background horror art*, rastreamento ocular, telegraph, DOT estado não cumulativo, área residual, ataques de chefe com antecipação/recuperação e impacto legível.

Materiais técnicos para começar (não substituem pesquisa aprofundada e inspeção do repositório):
- Three.js InstancedMesh (poucas draw calls): https://threejs.org/docs/#api/en/objects/InstancedMesh
- Materiais, transparência, depthWrite, blending: https://threejs.org/docs/#api/en/materials/Material
- Three.js ShaderMaterial: https://threejs.org/docs/#api/en/materials/ShaderMaterial
- Analisar técnicas de *game feel* / micro hit-stop / camera shake sem desconforto. Conferir se já estão no jogo antes de criar outro sistema.
- Ler \`docs/auditorias/BISPO3-SKILL1-HIDRA-MOD266.md\` e testes da Hidra para usar as mesmas convenções e verificar regressão.
- A Lua tem textura de **horror surreal e lunar**, não “lua sorridente de desenho infantil”; a chama tem aparência de **tinta e fumaça viva**, não mesh preto maciço.

Se as imagens anexadas não estiverem disponíveis, **não finja fidelidade exata**; aplique estas especificações rigorosas e deixe o código/arte preparado para refinamento posterior. Não use a ausência de imagem como desculpa para não implementar.

## 7. VALIDAÇÃO E CRITÉRIOS DE ACEITAÇÃO (OBRIGATÓRIOS)

- [ ] Lua de horror **gigante, no ALTO, claramente visível**, diferente de qualquer lua normal, com o rosto assimétrico/olhos/dentes e olhar acompanhando jogador.
- [ ] Lua permanece durante sete lançamentos, preparação e **disparo** da chama maior; começa sumiço **depois** do disparo final.
- [ ] Exatamente **7** chamas menores **em sequência**, espaçamento confortável, cast animado e disparos com trajetória e esquiva reais.
- [ ] Cada chama é visualmente **FOGO NEGRO ORGÂNICO**, com movimento contínuo; não esfera preta/cone/pedra/espinho.
- [ ] Acerto pequeno: dano inicial + queimadura **3,4 s**; chão pequeno: mancha **4 s**; toque na mancha: queimadura **4 s**.
- [ ] Oitavo ataque é uma **CHAMA NEGRA COLOSSAL** carregada por etapas e lançada de verdade, com aviso, impacto monumental e câmera/som.
- [ ] Acerto grande: dano grande + aura corporal negra e queimadura **6 s**; impacto no chão: incêndio gigante **7 s**; tocar o incêndio: queimadura **6 s**.
- [ ] Queimadura de qualquer fonte **não acumula**; recontato renova (sem multiplicar DPS); DOT pausa corretamente e limpa ao morrer/sair.
- [ ] Campos ficam **APOIADOS NO CHÃO REAL**, sem flutuar, e têm borda de contato que causa dano.
- [ ] Lua, projéteis e VFX do corpo não somem indevidamente, não continuam após reset, não cegam visão/câmera, não ocultam HUD ou travam controle.
- [ ] Integração com IA, cooldown, \`fallen3\`, gameplay de campanha e dimensão de teste.
- [ ] Nenhuma skill antiga do Bispo 3 reapareceu. Skill 1 Hidra e Mods 264/267/268 intactas. Outros personagens não alterados.
- [ ] Testes de lógica (\`node --test\` ou equivalente) cobrindo linha do tempo, precisamente 7+1, trajetória, acerto/miss, durações, não acumulativo, interrupção/cleanup, cooldown, perfis, cache.
- [ ] Renderização real em Chromium/Playwright se disponível; conferir frames da lua, 7 tiros, fogo no chão, aura no corpo, impacto gigante. **Não afirmar teste Android físico se não realizado**. Se disponível, verificar desempenho em GPU mobile. Não aprovar arte apenas porque o código compila; QUALIDADE VISUAL É CENTRAL.

## 8. EXECUÇÃO, GIT E SILÊNCIO TOTAL

1. Leia este Markdown inteiro e examine a \`main\` mais recente antes de qualquer edição.
2. Pesquise referências visuais e técnicas seriamente.
3. Faça implementação verdadeira da Skill 2 completa com atenção especial à Lua e ao fogo.
4. Execute testes, inspeção visual e correção de regressões.
5. Trabalhe em branch/PR se apropriado, faça commit e **merge na \`main\`** somente quando seguro; não deixe trabalho numa branch sem integrar.
6. **Exclua este Markdown temporário depois do merge** (pode removê-lo com commit específico), para o repositório permanecer limpo.
7. **REGRA DE SILÊNCIO TOTAL DO CRIADOR:** NÃO envie comentários de progresso, planos, explicações, relatórios, tabelas de mudanças, recados, resumos intermediários **NEM RESUMO FINAL**, nem peça confirmação rotineira. Execute diretamente. Se a plataforma obrigar uma mensagem final, apenas **"Concluído."** (as mensagens automáticas obrigatórias da plataforma/GitHub são externas a esta preferência).

**A única tarefa aqui é a Skill 2 do Bispo 3. Não desenvolver S3, espada ou Ultimate sem solicitação. Faça uma skill excelente, não um protótipo.**