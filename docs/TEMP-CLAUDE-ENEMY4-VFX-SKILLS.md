# TAREFA TEMPORÁRIA — Enemy4, mini-boss Enemy4 e raio do Enemy3
**Status:** especificação para implementação; NÃO declarar concluído sem código, testes e merge. **Após concluir e mesclar, apagar este arquivo em commit final (ou antes do merge se mantiver rastreabilidade no PR).** Não apagar código, assets ou documentação permanente.

## Instruções ao Claude / agente executor
- **Economia extrema de mensagens:** não enviar mensagens de progresso, pensamentos, logs ou atualizações repetitivas. Trabalhar silenciosamente; ao finalizar, enviar **resumo em PT-BR de no máximo 10 linhas** com PR, merge, testes efetivamente executados e link de teste. Se bloqueado, uma mensagem objetiva.
- Ler primeiro o código ATUAL de `main` e documentos do repositório; pesquisar referências técnicas de Three.js/WebGL/GLSL, VFX de anime, performance mobile e boas práticas. Não copiar implementações sem validação. Pode propor melhorias justificadas sem descaracterizar as sete referências.
- Criar branch e PR, implementar, rodar testes, conferir regressões e **fazer merge somente se checks e revisão estiverem adequados e houver permissão**. Não afirmar FPS ou testes Android sem medição. Não apagar o arquivo antes de registrar o plano na PR; remover ao terminar, conforme pedido do usuário.
- Referências visuais fornecidas pelo usuário nesta conversa: `1000362847.jpg` espada-mandíbula; `1000362848.gif` chamas/correntes; `1000362849.jpg` cortes; `1000362850.jpg` pilares; `1000362852.jpg` esferas; `1000362853.jpg` brocas; `1000362851.jpg` raio carmim. **Esses arquivos não estão automaticamente no repositório**; pedir acesso aos anexos ao usuário se necessário, sem inventar que os viu. As descrições abaixo são o briefing suficiente para começar.

## Auditoria obrigatória — inconsistências com o código existente
1. `mundo-3d-prototype.js`: `RIG_DEFS.enemy3` aponta para `Enemy3.glb`; `RIG_DEFS.enemy4` para `Enemy4.glb`. **A Mod 245 usa `Enemy4.glb` como aparência do mini-boss 3**, com `profile:'miniboss3'`, `rig:'enemy4'` e `kind:'e3boss'`. Isso **NÃO** representa o Enemy4 do Ato IV. **Não sobrescrever o mini-boss 3 ao implementar Enemy4.**
2. `enemy1-squad-runtime3d.js` implementa `BOSSES={warden,e2boss,e3boss}`, `E3K={e3,e3boss}` e VFX atuais do Enemy3. Enemy4/miniboss4 **ainda não integram essa arquitetura**. Criar tipos e mapeamento distintos (ex.: `e4`, `e4boss`) sem roubar `e3boss`; verificar `source`, `squadRig`, `startSquadPack`, `e3SquadPack`, kits, spawn, IA, HUD, laboratório e campanha. Evitar reescrever o sistema legado do Ato IV sem necessidade.
3. `Enemy4.glb` já é usado pelo mini-boss 3 e possui papéis específicos (`Triple_Combo_Attack`, `Skill_03`, `Dead`). Verificar **nomes de clipes, ossos, escala, retarget, IK, orientação da mão e ancoragem da arma** antes de adaptar para o Enemy4 do Ato IV. Usuário prefere que mini-boss de cada tipo use **mesmo GLB de sua versão comum**, apenas maior, mais resistente, mais forte e com arma. Corrigir o mini-boss 3 para usar `Enemy3.glb` em alteração **separada e segura**, somente após confirmar que não quebra Katana Dragão Carmim e os combos existentes. Não fazer substituição textual cega.
4. Preservar mundo 3D, dimensão Valério, poderes anteriores, inventário, câmera e saves. `main` é branch de destino, não pode ficar literalmente 'intacta' se a tarefa exige mudanças; trabalhar em branch com PR. Não prometer 60 FPS fixos em qualquer Android; buscar qualidade adaptativa e medir FPS, draw calls, memória, partículas, shader compile e stutter. **Sem exigência de ZIP/storyboard se PR e demonstração técnica forem melhores.**
5. O raio atual `nadirStrike`/Tempestade de Nadir é parte do Enemy3 e mini-boss 3; alterar **somente a aparência** do raio e impacto, preservando telegraph, hitbox, cooldown, dano, esquiva e lógica de tempestade. Inspecionar `enemy3-abyss-vfx3d.js`, `enemy3-runtime3d.js`, `enemy1-squad-runtime3d.js` e demais módulos reais antes de editar.

## Direção de arte geral
Estética anime sakuga: volumes sólidos recortados, silhuetas nítidas, camadas de luz e sombra, cores fortes; **nada de sprites de fumaça redondos/translúcidos genéricos**. Preferir malhas 3D de fita, meshes instanciados, ruído celular Voronoi, step/smoothstep curto, distorção de borda e geometria controlada. Evitar proibir todo alpha: transparência técnica para brilho, antialiasing e acessibilidade é aceitável. Camadas: núcleo branco/amarelo; corpo magenta/roxo/carmim; casca preta (#040008) recortada. VFX deve comunicar perigo com marcação clara, inclusive qualidade baixa.

## Patch Enemy3 — Tempestade de Nadir (ref 1000362851.jpg)
Substituir visual dos raios existentes por **fita larga 3D quebrada em zigue-zague**, massa interna #1A0004 com contorno #FF0015, atravessada por **filamento elétrico fino** ouro/amarelo-laranja (#FFF275 → #FF5500). Impacto: coroa de espinhos angulares vermelho-preto com núcleo laranja, placas de solo e flash curto; sem nuvem genérica. Preservar sincronização de telegraph, hitbox, alcance, dano e versão pesada do mini-boss 3. A fita deve ser legível de qualquer ângulo, inclusive câmera móvel.

## Enemy4 / Mini-boss Enemy4: identidade e espada
- Enemy4 comum: mesmo GLB base que seu mini-boss; mini-boss ~1.3–1.6× maior conforme colisão e enquadramento; mais HP, dano, poise e melhor tomada de decisão, não simplesmente velocidade arbitrária.
- Mini-boss: **espada-mandíbula colossal** com lâminas serrilhadas abertas, dentes ósseos apontados para dentro, tecido carmim pulsante, olho vermelho na guarda. Geometria 3D real com silhueta forte, escala física, pegada na mão, colisão coerente e trajetória de golpes sincronizada.
- Chamas negras de tinta líquida com contorno magenta e veias carmim envolvendo espada; pingos geométricos e pequenas poças/ripples limitadas por orçamento. Correntes espinhosas vermelho-preto flutuam nos ombros/costas do mini-boss (sem interferir na hitbox). Evitar partículas permanentes custosas.
- Cortes: ribbon/crescente 3D roxo/preto, bordo violeta-branco, recortes celulares nítidos e faíscas tangenciais; rochas angulares e hitstop curto quando houver impacto, nunca por quadro.

## Skill 1 — Erupção do Santuário Carmim (ref 1000362850.jpg)
- Comum: **10–14 marcas** magenta/vermelhas no chão perto/ao redor do jogador; mini-boss: **18–22**, ajustáveis por dificuldade/qualidade visual sem mudar áreas de perigo reais.
- Sequência com aviso legível e erupções **escalonadas por ~4 s**; evitar conflito no briefing Gemini: não é possível garantir aviso de 0.45 s se marcações escolhidas a cada 0.28 s só acendem no instante da explosão. Implementar máquina de estados telegraph → carga → pilar → dissipação, com antecedência suficiente e marcas persistentes. Não tornar inevitável: deixar corredores seguros e não reapontar depois de telegraph confirmado.
- Pilar: centro branco-magenta, casca preta rasgada em lâminas verticais, anéis concêntricos na base e flares cruciformes; dano **por volume do pilar** e janela definida, uma vez por ativação/alvo, não por frame.

## Skill 2 — Constelação da Ruína (ref 1000362852.jpg)
- Enemy4 comum invoca **6–9 esferas** em arco/coroa; mini-boss **10–14**. Centro em estrela branca de 4 pontas com flare horizontal, globo magenta e garras negras recortadas.
- Preparação ~0.7 s, disparos **um a um** com cadência inicial ~0.22 s, ajustável ao telegraph e à dificuldade. Recalcular mira **no instante do disparo**, sem perseguição infinita depois; dar possibilidade real de esquiva. Esferas com trajetória e colisão contínua (swept) com herói, chão e obstáculos, detonando no **primeiro impacto**.
- Cada colisão gera **cúpula esférica** magenta rasgada por tinta preta, detritos e decal temporário; explosão e dano coerentes com raio e distância. Limitar simultâneos, pooling e cleanup; não explodir duas vezes.

## Skill 3 — Perfurador do Abismo (ref 1000362853.jpg)
- Broca não pode ser cone liso: malha cônica helicoidal de fitas negras e veios magenta/violeta, giro rápido, anéis de vento angulares e placas de pedra.
- **Modo A frontal:** rajada em linha reta na direção do jogador, cerca de 3–5 brocas/s (mini-boss até 5–7/s, sujeito a orçamento e esquiva). Projéteis com direção travada no disparo, colisão com chão/obstáculos/herói, sem atravessar paredes.
- **Modo B subterrâneo:** brocas emergem do chão sob **posições previstas** do jogador, 3–5/s; marcas de alerta antecipadas e imutáveis após fixadas. Não nascer instantaneamente sob o jogador sem janela de reação. Fazer dano só durante a janela ativa, com invulnerabilidade por instância e limite de hits.
- Escolha tática com previsão de movimento e cooldown, sem leitura perfeita da intenção do jogador.

## Skill 4 EXCLUSIVA do mini-boss — Jaula das Correntes e Mandíbula Abissal
Quando jogador foge, correntes espinhosas mergulham no solo, formam **jaula parcial com rotas de fuga visíveis**; desaceleração temporária de até ~1.2 s se atingido (não prisão garantida). Mini-boss prepara salto e golpe de espada-mandíbula; projeção de mordida gigante com dentes negros/carmim e hitbox sincronizada, aviso claro e cooldown alto. Se câmera/posição inviáveis, usar variante terrestre sem teleporte nem câmera travada.

## IA, animação e balanceamento
- Enemy4 deve superar Enemy3 **em decisões táticas**, não necessariamente em DPS bruto. Mini-boss Enemy4: mais HP, dano e escala; priorizar combos espada + magia, leitura de distância, controle de zona e punição justa.
- Preferir Skill3 frontal contra alvo previsível e subterrânea contra movimento lateral, mas com probabilidade/atraso de reação; Skill1 fecha zonas e Skill2 pune posicionamento, sem combo inevitável.
- Animações: mapear idle/walk/run, cast, windup, recuperação, ataques de espada, stagger/hit, queda/morte, dash e possíveis novas poses procedurais sem corromper ossos; cancelar cast ao atordoar/morrer; evitar root motion e escala gigante. Hitstop local e câmera shake moderados com opção de reduzir.
- **Não assumir +55% de dano como regra universal**, nem hitstop de 75ms em toda colisão: parametrizar e testar. Física e colisões seguem volumes reais; ataque com telegraph visível, recuperação e i-frames adequados.

## Integração, critérios de aceite e evidência
1. Manter Enemy3 e mini-boss 3 funcionando e verificar visual novo do raio.
2. Enemy4 e mini-boss Enemy4 distintos de `e3boss`; ambos com 3 skills, mini-boss com ultimate, espada e VFX. Mesmo modelo-base entre Enemy4 e seu mini-boss.
3. Laboratório com botões de spawn, IA Parado/Lutar, seleção de poderes, quantidades; testes em mobile, sem afetar saves. Se necessário ampliar o laboratório sem remover os 6 inimigos existentes.
4. Testar cada skill em acerto/erro, chão, obstáculos, morte durante cast, repetição, distância, múltiplos inimigos, low/high quality e retorno à campanha; executar testes automáticos e declarar quais realmente passaram.
5. Revisar limites de GPU/CPU, pooling, limpeza de meshes, animação e áudio. Verificar FPS em Android real somente se disponível; caso contrário declarar 'não testado em dispositivo'.
6. Entregar PR com changelog, screenshots ou vídeos de execução quando disponíveis, links de teste e **resumo final de até 10 linhas**. Remover este arquivo temporário **após concluir implementação e merge**, não agora.

## Nota de escopo
Não criar novos bispos, não substituir a dimensão Valério e não misturar mini-boss Enemy3 com Enemy4 do Ato IV. Melhorias criativas extras são permitidas **se não criarem regressões nem desviarem do visual pedido**.
