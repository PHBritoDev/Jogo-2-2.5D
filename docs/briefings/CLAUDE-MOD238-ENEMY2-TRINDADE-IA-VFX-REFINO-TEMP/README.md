# CLAUDE — MISSÃO MOD 238 (ou próxima livre): ENEMY2 + MINI-BOSS + REFINAMENTO VISUAL DOS PODERES DO PROTAGONISTA

> **BRIEFING TEMPORÁRIO, EXECUTÁVEL, DE LEITURA INTEGRAL.** Criador quer execução autônoma e silêncio para economizar limite de chat. Este arquivo é a especificação completa, não um resumo. **Ao concluir e integrar com segurança, apagar SOMENTE a pasta temporária deste briefing**. Preservar todos os documentos permanentes, testes, progresso e conteúdo do jogo.

**Repositório:** https://github.com/PHBritoDev/Jogo-2-2.5D · branch principal: main. **Base confirmada:** Mod 236 (Codex) e Mod 237 (Claude) já mescladas na main; conferir HEAD atual antes de trabalhar. **Plataforma:** Three.js/WebGL/JavaScript no navegador, sobretudo Android intermediário; NÃO migrar para Unity nem introduzir runtime Unity. **Prioridade máxima:** fidelidade visual ao conceito + combate de qualidade + estabilidade real.

## 0. LEITURAS E PREPARAÇÃO OBRIGATÓRIAS

1. Ler por completo: \`AGENTS.md\`, \`PROMPT_MESTRE_DO_JOGO.md\`, \`docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md\`, \`docs/VFX-ENGINE-2.md\`, \`docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md\`. Ler os módulos relevantes do Enemy1 Mod 237 e da Mod 236, inclusive contratos de VFX, testes e código de integração.
2. O criador enviará **diretamente nesta conversa com Claude**: (a) três imagens dos poderes de Enemy2 já concebidos, (b) imagem com opções de armas negras com fogo alaranjado para o mini-boss, (c) vídeos de teste da Mod 236 exibindo os defeitos dos poderes do protagonista. **Analisar as imagens e os vídeos integralmente antes de alterar VFX**. Não presumir que anexos do ChatGPT estão automaticamente disponíveis no workspace do Claude; se algum faltar, não inventar conteúdo. O briefing descreve fielmente o essencial.
3. **Vídeos já vistos pelo coautor ChatGPT:** gravações horizontais de cerca de **13,3 s** (dragão dourado) e **8,5 s** (Ruptura em X e Portais). Na gravação de X/Portais, o X aparece como linhas finas vermelhas no cenário, e os portais como dois volumes rosa/roxo sem peso aparente; no dragão, a criatura tem presença dourada, mas cabeça/olhos/boca e finalização ainda não convencem. Tratar isso como avaliação visual do criador, não como diagnóstico definitivo do código. Solicitar os vídeos ao criador **somente se realmente não os recebeu** e se a inspeção for indispensável.
4. Pesquisar **referências de VFX em tempo real e combate 3D**, inclusive documentações oficiais de Three.js/WebGL/glTF, técnicas de fluidos falsos por shader/noise advection, volume trails, screen-space impact, desenho de ataque legível, GPU instancing, geometria dinâmica, mobile profiling, blend/alpha sorting. Referências de jogos/animes são para **linguagem visual, ritmo e sensação**, sem copiar assets, marcas, animações ou designs protegidos. Fazer comparações lado a lado e transformar as referências em arte original. Pesquisar também estratégias de IA tática sem recorrer a IA generativa paga em tempo real.
5. Criar branch/worktree própria (ex.: \`claude/mod238-enemy2-vfx-refine\`), verificar \`git status\` e HEAD; **não perder trabalho de outros agentes**. Fazer commits incrementais, testes e PR; merge apenas quando seguro. A documentação temporária pode ser criada na main pelo coautor, mas o código novo deve ser desenvolvido em branch isolada.

## 1. VISÃO DO CRIADOR — NÃO NEGOCIÁVEL

- Poderes com **massa, volume e fluidez reais aos olhos**, trajetórias com movimento contínuo e curvas orgânicas, não rabiscos no chão, linhas finas, sprites planos, orbes genéricas, tentáculos imóveis, flashes sem forma ou simples troca de cor.
- Paleta preferida para Enemy2: **preto profundo + roxo + rosa/magenta elétrico + veios vermelho-carmesim**; distinguir núcleo escuro, plasma luminoso e correntes periféricas. Mistura harmônica, sem saturar a tela inteira.
- Ataques velozes e ameaçadores, mas **visualmente acompanháveis** e com telegraph justo para esquiva; "rápido, porém devagar o suficiente para ver a energia viajando".
- Conjuração visível por estágios: intenção/pose → formação gradual → acúmulo/pressão → lançamento/movimento → contato real → impacto volumétrico forte → dissipação/rastro. Ritmo não pode ser instantâneo ou estático.
- Mini-boss Enemy2 deve ser claramente superior aos Enemy2 comuns: **mais vida, dano, alcance, qualidade visual, agressividade, fases e inteligência**, mas com oportunidades reais de reação e recuperação. Não transformar dificuldade em dano injusto, perseguição impossível ou spam de magia.
- Inimigos lutam de verdade: defendem, esquivam, erram, procuram flancos e cobertura, gerenciam distância, tentam interromper conjuração, usam feitiços com propósito e reagem ao estilo do jogador. **Enemy2 > Enemy1 em sofisticação**, mini-boss Enemy2 > Enemy2, sem trapaça de ler input futuro ou esquiva perfeita.
- Reaproveitar e ampliar a **VFX Engine 2.0** se necessário, sem quebrar habilidades existentes. Se um ataque genérico atual de Enemy1 ou Enemy2 puder ser transformado em algo realmente bom, pode reaproveitar sua lógica; caso contrário remover **somente a instância visual genérica correspondente**, não apagar mecanismos de dano/quest nem habilidades aprovadas.
- Identidade própria: Enemy2 NÃO deve ser Enemy1 com paleta diferente. Três poderes próprios, IA e movimentos próprios.

## 2. SKILL 1 ENEMY2 — “JULGAMENTO DO VÓRTICE ABISSAL” (imagem 1)

**Conceito visual:** portal horizontal imenso **ACIMA DA CABEÇA DO ENEMY2**, não acima do protagonista. Anéis e correntes negras/roxo/magenta/vermelho giram para dentro, com centro profundo e fluxo turbulento; animação do caster compatível com GLB real.

**Atenção à interpretação exata do criador:** **NÃO são três projéteis independentes nem três raios paralelos. É UMA ÚNICA CORRENTE GIGANTESCA, RETA/CONTÍNUA EM SUA FORMA PRINCIPAL, COM MASSA E CAUDA, que executa TRÊS INVESTIDAS SUCESSIVAS PERSEGUINDO O PROTAGONISTA.** O fluxo pode serpentear/curvar a rota organicamente e mudar a direção entre investidas, mas não fragmentar em tentáculos finos ou bolinhas. Cada investida é legível e tem seu próprio clímax; preservar a continuidade da fonte/energia do portal. Pode usar três pulsos de força no mesmo feixe contínuo com recuo/reorientação perceptível. Não criar três feixes ao mesmo tempo.

- Entrada: Enemy2 fixa o alvo, ergue mão/braços, portal abre e se expande com correntes orbitais e núcleo de profundidade.
- Emissão: feixe/serpente de plasma negro com filamentos luminosos e rastro volumétrico, grosso e coeso. Energia deve sair **fisicamente do centro do portal**, avançar em 3D na direção do alvo e curvar com limite de giro; velocidade ameaçadora, não teleporte. Sem corte abrupto.
- Três investidas: no máximo três tentativas distintas do mesmo fluxo, cada uma com pequena janela de evasão e reorientação. Evitar tracking perfeito: prever posição limitada, bloquear curva instantânea, não atravessar paredes; depois de uma esquiva bem-sucedida, a onda deve ultrapassar/errar antes de poder corrigir.
- Contato: colisão volumétrica real (sweep/cápsula/segmento), impacto no chão/parede/personagem; deformação/compressão e **explosão contundente em camadas**, onda de choque, fragmentos e resíduo escuro. Não usar só disco chapado. Dano com cooldown de contato por investida para impedir hit contínuo injusto.
- Ajustar dimensão do feixe à câmera/arena, sem obstruir todo o campo de visão, especialmente em 1ª pessoa e Android. Quando Enemy2 estiver em grupo, limitar densidade de efeitos sem diminuir sensação de massa.

## 3. SKILL 2 ENEMY2 — “TRINDADE DO CAOS” (imagem 2)

**EXATAMENTE TRÊS FURACÕES NEGROS** de energia sombria, não colunas cilíndricas estáticas nem três sprites. Silhuetas de funil com camadas turbulentas, base em contato com terreno, núcleo escuro, veios rosa/roxo/vermelho, debris local, redemoinho real e movimentação espacial.

- Conjuração com gesto/telegraph: três vórtices nascem do chão progressivamente (central maior ou os três de tamanhos coerentes).
- Inteligência espacial: furacão 1 pressiona a posição atual do protagonista; furacão 2 fecha o flanco esquerdo; furacão 3 fecha a fuga pela direita. Eles têm caminhos e velocidades independentes, evitando amontoar-se em um único ponto.
- Efeito físico/jogabilidade: pressão/atração moderada e sinalizada, dano por contato com intervalos justos, colisão com cenário, variação de altura e terreno. Não prender o protagonista sem saída. O jogador pode se posicionar e usar dash.
- Quando se aproximam, suas correntes podem conectar-se brevemente em um arco maior/mini-tempestade, **desde que não vire um ataque inevitável**. Após contato, dissipação e impacto com pedras/partículas/onda; não transformar cada um em esfera rosa genérica.
- Limites: três funis visíveis ao mesmo tempo, instancing/pooling e LOD por distância; telegraph legível em 1ª/3ª pessoa.

## 4. SKILL 3 ENEMY2 — “COLAPSO DO ABISMO” (imagem 3)

Habilidade de área, diferente da perseguição da Skill 1 e do cerco da Skill 2.

- Enemy2 abre **fissura circular no solo** em uma área-alvo: runas/energia sombria negras, roxas e magenta, fissuras irradiadas, detritos levantando. O solo parece ser sugado para dentro; leitura clara do raio de perigo e tempo de detonação.
- Acúmulo: correntes de energia fluida convergem e comprimem o centro; leve sucção física com teto seguro; **o jogador pode escapar do raio**.
- Erupção: **coluna massiva de energia negra/rosa/vermelha sobe de baixo para cima**, com corpo turbulento, não um cilindro uniforme nem flash branco. Detritos/cristais fragmentados e rastros em espiral.
- Clímax: coluna colapsa para dentro por um instante e explode **para fora** numa onda de choque circular horizontal, com impacto multicamada, dissipação, rachaduras/decal temporário e som convincente.
- Onda horizontal deve poder ser **saltada** (ou evitada por dash/fora do raio), com hitboxes que consideram altura, janela de colisão e invulnerabilidade. Não dano global por timer.
- Imagem de referência mostra etapas separadas do mesmo poder (fissura → formação → coluna → colapso/explosão), **não cinco magias simultâneas**.

## 5. COMBATE E IA DO ENEMY2 — NÍVEL ACIMA DO ENEMY1

**Situação real encontrada no repositório:** \`mundo-3d-prototype.js\` define \`RIG_DEFS.enemy2\` por volta da linha 3004, usando \`Enemy2-rig.glb?v=mod204\`, \`height:1.12\` e clips \`idle/walk/run/attack/cast/dash/death\`. No Ato II, Enemy2 aparece em grupos de 3 e 5 (\`storyDo2('surgir-tres'/'surgir-cinco')\`), guardas e mini-boss (\`profile:'miniboss2'\`). **Atualmente o \`startPack\` genérico parece alternar um combatente ativo por vez**, enquanto a Mod 237 adicionou esquadra simultânea específica para Enemy1 em \`enemy1-squad3d.js\` / \`enemy1-squad-runtime3d.js\`. Não presumir que o sistema Enemy1 pode ser aplicado sem adaptar rig, efeitos, saves e roteiros.
- **Refatorar/estender com segurança** CombatActor/SquadDirector/facções para Enemy2: grupos do Ato II devem lutar **simultaneamente** (inclusive 3/5 com otimização e controle de ritmo), cada Enemy2 com HP, animações, VFX, cooldown, target, collider e estado independentes. Não destruir a implementação Enemy1; reutilizar abstrações onde houver compatibilidade, evitando duplicação de código.
- IA Enemy2: utilidade/FSM hierárquica e memória curta de ações observadas (dash, bloqueio, magia, corrida, distância), escolha contextual de uma das três skills, controle de linha de visão, esquiva preditiva **imperfeita**, defesa/contra-ataque, reposicionamento e rotas. Papéis complementares: controlador de área, perseguidor e interceptador; alternância para evitar 5 skills gigantescas no mesmo frame.
- Ao contrário do Enemy1, Enemy2 deve **combinar pressão territorial e leitura do jogador**: criar espaço negado por furacões, induzir fuga e posicionar Colapso onde a fuga é provável, mas sem adivinhar inputs. Oponentes podem errar e ser punidos.
- **Magia contra magia:** permitir colisões e confrontos visuais entre feitiços Enemy2 e do protagonista/aliados; regras de força/tempo/colisão claras, não bloqueio arbitrário. Esquivas, interrupções e defesas animadas com os clips existentes; se não houver clipe adequado, retarget/blend com cautela ou animação procedural coerente, sem deformar rig.
- Suportar player e NPC aliado como alvos, mantendo identificação de facção, dano por AoE, mira/MIRAR entre múltiplos, recompensa, saves e avanço de missão só quando TODOS os inimigos da etapa caírem. Não aplicar efeitos de Enemy2 indiscriminadamente em outros perfis/atos.
- **Balanceamento relativo:** Enemy2 comuns claramente superiores a Enemy1 comuns em decisões e variação de golpes, mas não simplesmente +100% HP/dano. Exibir telegraphs e janelas de reação. Desafios progressivos e controles de acessibilidade para celulares.
- Conferir escala: \`height:1.12\` no rig é um parâmetro do código, **não prova de altura final em metros**. Medir bounds do modelo animado e comparar com protagonista; normalizar proporção por medição, sem tocar cegamente em bosses de outros atos. Consultar protocolo permanente de escala.

## 6. MINI-BOSS ENEMY2 — ARMA 3D + IA SUPERIOR

O Ato II tem mini-boss no vulcão: \`storyDo2('surgir-mini-chefe')\`, \`profile:'miniboss2'\`, \`hp:ACT2.minibossHp\`, \`scale:1.8\`, e desfecho \`minibossDown()\`. **Preservar roteiro, cutscenes, posição, chaves, portal e progressão**. Melhorar o combate real, não criar um boss desconectado.

**Arma:** o criador anexará imagem com **várias opções de armas negras demoníacas com chamas laranja**: foices/alfanjes/lanças-machados com lâminas ósseas, crânios e fogo. Claude deve **escolher UMA arma visualmente coerente com a silhueta e animações do mini-boss** (preferir uma foice de guerra longa ou alabarda-foice com lâmina curvada e crânio integrado, conforme melhor encaixe). Criar **modelo 3D original de alta qualidade** (Blender script + GLB ou geometria procedimental 3D convincente), não sprite plano nem copiar exatamente a imagem. Material negro metálico/obsidiana, ossos e **fogo laranja/vermelho volumétrico** com núcleo, fuligem e brasa, em contraste com as skills roxas do corpo. Empunhadura firme na mão/bone, sem flutuar, escala realista, sem atravessar corpo/câmera. Clips de ataque existentes devem acompanhar a arma; adaptar golpes/combos à arma, sem criar balanço invisível.

**Mini-boss > Enemy2 comum:** vida e dano maiores, alcance real aumentado pela arma (sweep da lâmina), combos de 2–3 golpes, finta, defesa inteligente, leitura de distância, reposicionamento, dash justo, uso mais sofisticado das mesmas três skills com maior escala, energia, impacto e alcance. Fase de fúria (ex.: 50% HP) muda ritmo e coreografia, não apenas cor e dano. Permitir contra-ataque após recovery. Evitar hitbox fora da lâmina, hits em 360º sem animação e morte instantânea por spam.

**Proposta de assinatura criativa:** mini-boss pode canalizar um furacão na lâmina da foice para um golpe pesado com rastro negro/laranja, mas isso deve ser variação do kit existente e não uma quarta skill genérica improvisada. Diferenciar claramente a arma física das skills mágicas.

## 7. REMOVER/REFORMULAR ATAQUES GENÉRICOS EXISTENTES

- **Enemy2:** auditar TODAS as rotas atuais de ataque/cast, incluindo legado \`updateEnemyAI()\` e \`spawnEnemyProjectile(...)\`, evitando que os novos poderes sejam disparados **junto** de ataques genéricos de tornados/bolinhas/slashes. Substituir por três skills aprovadas e golpes físicos bem animados. Pode preservar código reaproveitável se o resultado final for superior e consistente.
- **Enemy1:** criador viu um ataque genérico/feio persistindo apesar da Mod 237. Identificar precisamente **qual ação, qual módulo e qual VFX** em gameplay real. Remover/substituir só o efeito visual genérico, ou reformulá-lo com a VFX Engine 2.0, sem retirar Garras do Abismo, Espiral Devoradora, Juízo Violeta, defesa, dano, cooperação ou progressão. Verificar se é legacy attack, fallback do rig ou evento de esquadra. **Não presumir** que seja um ataque específico sem reproduzir.
- Qualquer magia não genérica precisa ser claramente identificável por movimento, silhueta, coreografia e som, não só pela cor.

## 8. REVISÃO OBRIGATÓRIA DOS PODERES DO PROTAGONISTA — MOD 236 NÃO APROVADA

**O criador está bastante insatisfeito com X e Portais. Dragão ficou quase bom, mas não aprovado.** Os vídeos anexados são evidência visual de QA. Não apenas adicionar brilho/escala: **recriar a linguagem visual e a sensação de impacto**.

### 8.1 RUPTURA EM X
- Falha relatada: vira um **“X rabiscado no chão”** com linhas vermelhas finas, sem peso, sem volume e sem impressão de golpe.
- Alvo: dois **cortes tridimensionais colossais** de energia carmesim/preta com núcleo incandescente e bordas de plasma, deslocando-se na direção do inimigo com profundidade, corpo espesso e rastro fluido. O X deve formar-se como **interseção de duas lâminas volumétricas que atravessam o espaço**, não decal permanente no solo nem overlay da câmera. Contraste e leitura em 1ª/3ª pessoa.
- Impacto: duas colisões/hit windows reais, ruptura cruzada no ponto atingido, onda de choque, fragmentação e resíduo temporário. Respeitar dano/cooldown existentes, sem duplicar hits. Ajustar orientação/altura para alvos móveis e superfícies elevadas.
- Revisar \`skill-x-rupture3d.js\` e \`skill-x-rupture-vfx3d.js\` e seus testes.

### 8.2 PORTAIS DA PERSEGUIÇÃO
- Falha relatada: **portais e energias parecem rabiscos/volumes rosa genéricos**, sem forma nem impacto convincente.
- Preservar design mecânico da Mod 236: **DOIS portais distintos e DOIS corpos de energia contínuos**, um de cada portal, simultâneos, com trajetória definida e colisão real. **Não retornar a 24 bolinhas**, não virar 2 nuvens rosas/2 feixes finíssimos, não encher a tela de clarões.
- Portal: boca dimensional com profundidade, borda de energia viva, corrente interior em rotação e sensação de sucção. Emissão com compressão/estiramento, corpos de energia densos com cauda e turbulência, paleta vermelho-carmesim e roxo, contrastando entre si. Energia deve sair dos portais com direção coerente e se deslocar claramente no espaço.
- Impacto: pressão concentrada na área de contato, explosão volumétrica, onda de choque progressiva, deformação/colapso e dissipação. Evitar malhas rígidas/retângulos e efeitos que encobrem o personagem/câmera. Não quebrar a lógica de dano.
- Revisar \`skill-twin-portals3d.js\`, \`skill-twin-portals-vfx3d.js\`, testes e \`docs/VFX-ENGINE-2.md\`.

### 8.3 DRAGÃO DO JULGAMENTO
- **Preservar o que já ficou bom:** criatura serpentina **DOURADA**, grande, em movimento, com corpo de chamas; manter a estrutura do ataque e as colisões físicas que o Codex melhorou.
- Corrigir **olhos feios/artificiais**, rosto rígido e aspecto metálico residual. Fazer olhos integrados à anatomia flamejante, com pupila/luz orgânica e expressão ameaçadora; rosto de dragão oriental feito de fogo vivo, não um crocodilo metálico.
- **Boca MUITO MAIOR** e **abertura real da mandíbula**, dentes/contorno integrados à silhueta, sensação de abocanhar o alvo. Ajustar tamanho proporcional sem tornar cabeça uma esfera; evitar clipping.
- **Mordida/engolir:** quando o dragão alcança/“come” o inimigo, disparar **EXPLOSÃO ENORME** no ponto de contato, com núcleo de fogo, corona, onda de calor, fragmentos e expansão temporal. **Rastro de fogo ENORME no chão** seguindo o trajeto/impacto, com chamas vivas que se dissipam; não deixar apenas decal ou luz.
- **Bola de fogo:** criador ainda NÃO gosta. Reformular como **massa real de fogo turbulento, não esfera lisa**, com forma mutável, núcleo incandescente, línguas de chama, esteira de combustão, compressão antes do disparo e explosão forte no impacto. Origem na boca; trajetória física e colisão com altura real de árvores, pedras, paredes e prédios; não regressar às correções da Mod 236.
- Se o dragão é de fogo dourado, manter **paleta coerente ouro/âmbar/branco quente**, não vermelho/roxo de Enemy2. Camera work breve e reversível, não prender o controle por muito tempo. Preservar câmera 1ª/3ª pessoa e retorno natural.
- Revisar \`vfx-dragon-model3d.js\`, \`skill-judgment-dragon3d.js\`, \`skill-judgment-dragon-vfx3d.js\`, \`vfx-flow3d.js\`, \`vfx-trail3d.js\`, \`vfx-impact3d.js\`, \`skill-scenery3d.js\` e testes.

### 8.4 REUTILIZAÇÃO DA VFX ENGINE 2.0
Ler contratos em \`docs/VFX-ENGINE-2.md\`: \`energyMaterial\`/\`energyBody\`, \`volumeTrail\`, \`impactDirector\`, \`sceneryPoint\`, \`dragonHead\`/\`dragonBody\`. Reusar quando funcionar; **criar novos componentes/shaders/malhas/curvas se necessário** para melhorar volume, silhueta, turbulência e impacto. Evitar copiar código de VFX por skill e evitar arquitetura monolítica. VFX não deve decidir dano nem escrever save: gameplay é autoritativo.

## 9. ANIMAÇÃO, FÍSICA, EFEITOS E ÁUDIO

- Mapear clips reais do \`Enemy2-rig.glb\`, medir duração e fase de contato. Para cada habilidade sincronizar cast/ataque/hit/recovery; evitar clipe incompatível ou cast interrompido.
- Dano apenas quando hitbox coerente com geometria atinge alvo, com amostragem contínua para projéteis rápidos e colisão com **altura de obstáculo**. Não atravessar paredes, árvores, mini-boss ou outros NPCs; não causar dano através de parede ou fora da área.
- Colisões entre magia e magia, escudos, cenário e corpos; onda de choque com altura, queda, esquiva e i-frames coerentes. Sem stun-lock, hit repetido em um único contato ou danos fantasmas depois da morte.
- Sons de formação, disparo, vento/turbulência, impacto e fogo com volume proporcional, espacialização/atenuação e sem clipping de áudio.
- Se usar Blender, scripts offline para modelos originais; exportar GLB otimizado e verificar orientação, escala, materiais e rig. Sem assets não licenciados.

## 10. PERFORMANCE MOBILE, BUGS E CRITÉRIOS DE ACEITAÇÃO

**Autorização do criador:** se encontrar bug ou algo que causa lag, **corrigir imediatamente sem destruir a qualidade visual**. Priorizar resolver gargalo estrutural (draw calls, overdraw, alocação por frame, sombras/luzes, leaks, raycast excessivo, texturas grandes, update de atores distantes), não simplesmente reduzir efeitos indiscriminadamente.

- Medir FPS, frame time, draw calls, memória aproximada, número de geometrias/materiais/texturas, tempos de carregamento; comparar antes/depois. Mobile intermediário: alvo ~30 FPS estáveis em combate pesado, 60 onde viável; se sem Android físico, **declarar que não foi testado**.
- Implementar LOD visual escalonado e dinâmico, instancing/pooling de partículas e objetos, buffers reutilizáveis, disposals corretos, limites de luzes e fragmentos; conservar a silhueta/volume mesmo no modo baixo. Ajustar efeitos conforme tela/zoom sem encobrir HUD e botões.
- **Teste visual obrigatório em vídeo/screenshots** (não só testes unitários): X não é rabisco; portais não são bolhas; dragão tem olhos/boca convincente, explosão de mordida e rastro de fogo; bola de fogo é orgânica; Enemy2 skill 1 tem **um fluxo e três investidas**, skill 2 tem **três furacões**, skill 3 tem **colapso e onda de choque**.
- Testar 1ª e 3ª pessoa, câmera livre, controles de toque GOLPE/MIRAR/DASH/SKILL, combate com Enemy2 individual e em grupos de 3 e 5, mini-boss, inimigos vs aliado, magia vs magia, obstáculos baixos/altos, alvos móveis, quedas e death, FPS em múltiplas skills, saves/quest e progressão do Ato II. Não quebrar Enemy1 Mod 237 nem outros atos/bispos.
- Criar **laboratório isolado do progresso**, ex.: \`?testeEnemy2=1&todasHabilidades=1&mod=238\`, com 1/3/5 Enemy2, mini-boss, aliado, seleção de habilidade, cooldown reset e visualização de hitboxes/FPs quando debug; sem modificar save real. Criar/atualizar teste para protagonista Mod 238 e permitir abrir os dois labs.
- Rodar testes automatizados existentes e novos; verificar lint/sintaxe e imports, teste real no browser WebGL quando disponível, smoke test de recursos, regressões de quest e save. Documentar claramente falhas/limitações e NÃO alegar Android físico sem testá-lo.
- **Não introduzir pagamento, rede, anúncios, conta, login ou dependência de IA online** para IA Enemy2.

## 11. ORDEM DE EXECUÇÃO, ENTREGÁVEIS E CONCLUSÃO

1. Ler tudo e analisar todas as imagens/vídeos recebidos. Mapear arquitetura real e registrar o estado-base.
2. Implementar IA e runtime Enemy2, animações e integração dos três poderes, sem regressão de Enemy1.
3. Implementar mini-boss, arma original 3D e fase avançada.
4. Auditar e remover/substituir VFX genéricos Enemy1/Enemy2, mantendo gameplay e clips.
5. **Refazer os três poderes do protagonista conforme seção 8**, sem regressão do Codex; aproveitar a VFX Engine 2.0.
6. Integrar e polir: áudio, colisões, câmera, qualidade automática, LOD e FPS. Executar testes visuais e funcionais completos.
7. Fazer **commits frequentes** por módulo, PR, revisão de diff, testes e merge seguro na main. Publicar e confirmar GitHub Pages quando possível; se indisponível, relatar sem afirmar publicado.
8. **SOMENTE DEPOIS DE MERGE E PUBLICAÇÃO CONFIRMADOS**, apagar apenas \`docs/briefings/CLAUDE-MOD238-ENEMY2-TRINDADE-IA-VFX-REFINO-TEMP/\` (não apagar docs permanentes ou briefings de outras missões). Se ficar bloqueado, deixar branch/PR e briefing intactos.
9. Resposta final **até 10 linhas**: Mod/commit/PR/merge, três skills Enemy2, mini-boss/arma, correções Enemy1 + X/Portais/Dragão, testes reais, FPS/limitações e **LINK DIRETO para testar no Android**. **Economia extrema de chat:** não narrar cada comando, não enviar atualizações intermediárias, trabalhar em silêncio. Só falar se houver bloqueio real ou entrega concluída.

**Critério de sucesso não é “código compilou” nem “tem partículas”. É o criador ver no celular ataques fluidos, com massa, escala, silhueta original, impactos impressionantes, IA tática e FPS estável.**
