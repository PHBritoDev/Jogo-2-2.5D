# TAREFA DE IMPLEMENTAÇÃO — ENEMY3 E MINI-BOSS ENEMY3 — SKILLS, KATANA, IA E ANIMAÇÕES
**Autor da direção criativa:** criador do jogo. **Executor:** Claude com acesso ao GitHub. **Alvo:** branch main do repositório PHBritoDev/Jogo-2-2.5D, estado atual Mod 244 no momento desta especificação. **Esta tarefa é para IMPLEMENTAR, não só descrever.**

## 0. INSTRUÇÃO DE COMUNICAÇÃO — OBRIGATÓRIA
**Não envie mensagens intermediárias, atualizações de progresso, planos, narrações, relatórios parciais ou spam enquanto trabalha.** Faça a investigação, codificação, testes, commits e integração de forma autônoma. Ao concluir, envie **UM ÚNICO RESUMO FINAL EM PORTUGUÊS, COM NO MÁXIMO 10 LINHAS**, incluindo versão, alterações, testes honestamente realizados, SHA/PR/merge e link direto para jogar. Se houver bloqueio técnico real que exija decisão do usuário, faça somente uma pergunta objetiva. Não alegue que testou o navegador ou dispositivo sem ter testado.

## 1. VERIFICAÇÕES CONFIRMADAS NO GITHUB — NÃO CONTRADIZER
- No arquivo `mundo-3d-prototype.js`, `RIG_DEFS.enemy3` usa `./Enemy3.glb?v=mod196`, altura configurada 1.08 e roles: idle `_01a15ab5_eeba_71ae_a438_b85a938940fc`, walk `Walking`, run `Running`, attack `Attack`, cast `Skill_03`, dash `_01a15ab0_deed_76a9_818c_47f5fc81ba40`, death `Dead`. **Esses são nomes mapeados em código; conferir se os clipes existem e se reproduzem antes de depender deles.**
- **Atenção crítica:** no Ato 3, a sequência `ato3-surgir-guardiao` invoca os inimigos comuns com `startPack({rig:'enemy3',profile:'demon3',...})`, mas o **mini-boss do Ato 3 usa `startPack({rig:'enemy4',profile:'miniboss3',scale:1.6,...})`**. `RIG_DEFS.enemy4` aponta para `./Enemy4.glb?v=mod196`, roles walk/run/attack `Triple_Combo_Attack`/cast `Skill_03`/dash/death. **NÃO substituir Enemy4.glb por Enemy3.glb nem mudar o Ato 3 sem investigar a intenção do criador; mini-boss3 é um PROFILE com rig enemy4.** O `Enemy4.glb` também é usado em outros pontos do Ato 4: isolar mudanças pelo profile `miniboss3`, nunca globalmente por rig.
- `enemy3-squad3d.js` e `enemy3-squad-runtime3d.js` **não existem na main consultada**. Se criar módulos novos, conectá-los explicitamente ao runtime real e verificar execução.
- `enemy2-squad3d.js` já implementa Vórtice, Trindade e Colapso com cooldowns e comportamentos próprios. NÃO rebaixar nem reescrever a IA Enemy2 como o prompt do Gemini sugeria; apenas usá-la como referência de progressão de desafio.
- `boss-choreography3d.js` da Mod 244 define coreografias `warden` e `e2boss`, **não mini-boss3**. Reutilizar padrões arquiteturais sem sobrescrever os dois chefes existentes.
- Há módulos `combat-choreography3d.js`, `combat-rig3d.js`, `sword-rites3d.js`, `enemy1-squad3d.js`, `enemy2-squad3d.js`. Conferir integração, ciclos de vida, colisões e versionamento atual antes de tocar neles.
- **NÃO preservar marcador 238 ou 241**: inspecionar versão vigente e incrementá-la corretamente após implementar. Não usar textos antigos como verdade.
- Referências visuais (vídeos/fotos, incluindo imagem da katana) **serão enviadas diretamente pelo usuário**. Não fingir tê-las visto se não estiverem anexadas. O Gemini descreveu katana preta/carmim com dragão, mas validar contra a imagem real antes de reconstruir/alterar o modelo.

## 2. OBJETIVO E DIREÇÃO VISUAL
Implementar **três habilidades mágicas no Enemy3 e no mini-boss3**, com escala/complexidade maior no mini-boss, além de IA progressiva e coreografia de katana do mini-boss. Estética anime sakuga de alta leitura visual, massa, silhuetas sólidas, movimento orgânico, núcleo energético, contraste, rachaduras e detritos 3D. **PROIBIDOS:** fumaça genérica translúcida, esferas paradas, espadas que surgem do nada, portais com textura estática, spawn pop-in, dano fora da geometria de impacto, câmera sequestrada, efeitos gigantes que ocultam telegraphs, congelamento de FPS.
Referências: buraco negro inspirado em Frieren, bombardeio por portais galácticos, tempestade colossal e katana com chama carmim. **Criar identidade original; não copiar assets, frames, personagens ou texturas protegidos.** Claude tem liberdade para refinar visual e animação sem alterar a identidade dos poderes ou destruir o jogo.

## 3. SKILL 3 — SINGULARIDADE ABISSAL (FORMAÇÃO → ELEVAÇÃO → DISPARO → DOMO)
**Fases visuais iniciais sugeridas, ajustar ao ritmo real do jogo e à animação do rig:**
A. 0–0.9 s: mão ergue/estende, dedos e braço orientam-se ao núcleo; centelha negra minúscula cresce continuamente na palma. Centro de absorção escuro com aro fotônico branco-dourado e disco de acreção horizontal achatado laranja/carmim. Não criar esfera simples com emissive. Detritos próximos sobem em arcos e espirais, sem retirar árvores permanentemente.
B. 0.9–1.6 s: braço sobe, singularidade acompanha socket da mão e depois sobe acima da cabeça. Rotação/fluxo **contínuos em todos os estágios**, shader de UV advection/spiral noise, distorção sutil com fallback para celulares; nunca sprite estático. Mini-boss escala visual maior.
C. lançamento: postura de arremesso e liberação da mão no frame correto; trajetória com velocidade e previsão de alvo limitadas, rastro segmentado, colisão varrida para evitar atravessar player/chão, colisão com terreno e objetos sólidos. **Se acertar jogador OU solo/obstáculo, detonar no ponto exato**; ao expirar no ar, definir fallback seguro no solo. Impedir dano duplo.
D. impacto: 1–2 frames de implosão (dependente do delta), núcleo branco-alaranjado, hemisfério magenta/lilás com manchas de energia e faixas pretas rasgadas de alpha-cutout/erosão, coroa negra na base, anel de choque e pedras sólidas. Domo cresce por keyframes com física visual, e dissipa por erosão, não simples fade. Dano/empurrão pela colisão efetiva do domo e onda, com janelas e imunidade por golpe; não usar volume visual maior que a hitbox sem explicação. Mini-boss pode ter atração gravitacional leve, sinalizada e escapável. Não usar simulação real de relatividade.
**Animações exigidas:** conjuração, acompanhamento do objeto na mão, elevar braço, lançamento, follow-through, recuperação, cancelamento por stagger/morte.

## 4. SKILL 2 — BARRAGEM ABISSAL (PORTAIS → ESPADAS EMERGEM → TIROS → FECHAMENTO)
A. Portais se abrem em arco ATRÁS/ACIMA do inimigo (alvos iniciais: Enemy3 8–12; mini-boss 16–20 apenas se benchmark permitir). Interior galáctico em vórtice profundo negro/roxo/carmim com paralaxe/fluxo e bordas fragmentadas; raios negros contornados de magenta entre aberturas, sem cobrir a câmera.
B. Cada espada nasce **dentro** do portal, desliza de modo visível ponta-primeiro e emerge gradualmente (aprox. 0.45 s por primeira carga); mira e então dispara. **Nenhuma espada brota à frente da boca.** Para recorte, preferir solução compatível com arquitetura real: `material.clippingPlanes` + `renderer.localClippingEnabled` (verificar materiais, clipping em world-space, custo e conflitos) OU máscara/stencil/occlusion/shader custom; escolher com testes. `ClippingGroup` WebGPU não é solução automática para WebGL.
C. Barragem por ~2–4 s: fila independente por portal, nova espada emerge visivelmente após cada disparo, mira preditiva moderada com limite, trajetória real e sweep collision; espadas cravam no solo com rachaduras e detritos, e são removidas/recicladas depois. **Não usar dano por hitbox invisível**; limitar simultaneidade para mobile.
D. Encerrar geração, terminar projéteis ativos e fechar cada portal com contração espiral + dissolução por erosão; cleanup rigoroso ao morrer, trocar fase, pausar, reiniciar ou sair da arena.
**Animações exigidas:** abrir braços, manter canalização, direcionar/ordenar barragem, finalização, recovery e reação a interrupção. Mini-boss usa formação mais elaborada, não só escala maior.

## 5. SKILL 1 — TEMPESTADE DE NADIR (CÉU COLOSSAL, RAIOS IMPREVISÍVEIS MAS JUSTOS)
A. Nuvem negra **visualmente cobre toda a arena** e horizonte superior relevante, com espiral viva, veios elétricos carmim e escurecimento AMBIENTAL LOCAL/REVERSÍVEL. Não escurecer permanentemente o mundo, não apagar HUD, não afetar outros ambientes fora da batalha.
B. Raios em múltiplos pontos com distribuição espacial aleatória (Poisson disk ou outro método com separação mínima) perto do jogador, à frente da direção de movimento e ao redor. Nunca garantir dano inevitável: **área visual da tempestade é inescapável, mas cada impacto deve ser antecipável e esquivável**. A marca no solo (~0.25–0.6 s, adaptar ao input mobile) mostra área real da hitbox, mais um sinal sonoro/eletricidade antes do golpe. Não lançar tantos raios simultâneos que cubram 100% das rotas seguras. Velocidade de 4–7/s é hipótese para teste, não obrigação.
C. Raios com tronco irregular em segmentos conectados e ramificações, núcleo preto/contorno brilhante, colisão apenas no contato do chão e volume indicado. Crateras temporárias, rachaduras, detritos e arco elétrico residual controlado. Mini-boss aumenta densidade e tem variante de raio pesado a cada ciclo, mas mantém espaços seguros.
D. Dissipação da nuvem e restauração da iluminação, descarte de todos os efeitos, cancelamento em morte/troca de cena.
**Animações exigidas:** postura de invocação apontando céu, canalização com mãos, tensão corporal e roupa/arma reagindo, gesto de comando, recuperação e interrupção.

## 6. MINI-BOSS3 — KATANA DRAGÃO CARMIM: COMBATE AUTORAL
**Primeiro conferir foto e asset existente.** Não inventar dragão geométrico genérico nem substituir arma/modelo existente sem autorização. Confirmar attachment em osso da mão, escala real, orientação e hitbox da lâmina, sem bug de escala GLB. Se arma ainda não estiver no repositório, informar no relatório e usar solução provisória não destrutiva.
- Combo A, **Presa Carmim**: dois cortes diagonais em X, preparação de ombro e quadril, footwork, follow-through e recovery, rastros de chamas vermelho/preto com bordas recortadas. Cada corte tem janela de contato própria.
- Combo B, **Iaijutsu Abissal**: posição de guarda/embainhar *somente se a bainha e rig permitirem*, carga de ~0.35 s, dash com telegraph, corte horizontal rápido e freio físico. Não atravessar parede ou jogador, não teleportar sem colisão, não executar giro 360º que esconda contato real. Se não houver bainha, usar guarda baixa de saque estilizado.
- Combo C, **Fúria do Dragão**: preparação longa, salto com gravidade, corte vertical pesado, fissura e silhueta energética original de dragão que emerge da espada. Evitar substituir animação existente sem inspeção.
**Animações adicionais obrigatórias, além dos 3 combos:** idle/respiração, walk, run, strafe esquerda/direita, recuo, perseguição, virar no lugar, mirar/encarar alvo, guarda, bloqueio/parry se compatível com mecânica existente, hit reactions leves e pesadas, stagger, knockdown e levantar *se suportados*, dash/evade, aterrissagem, troca entre espada e magia, conjuração de cada skill, recuperação após ataque, cancelamento por dano/morte, enrage transition e enrage idle, morte e cleanup. Reutilizar clipes existentes com blend e camadas procedurais quando necessário; **não inventar clipes que não existam nem alegar animações GLB novas se só houver offsets por código**. Manter animações legíveis em 3ª e 1ª pessoa e no mobile.
**Enemy3 comum:** locomotion/strafe, ataque básico, telegraph, cast de cada skill, hit, recovery, death, interrupção; sem copiar combos exclusivos do mini-boss.

## 7. IA — DESAFIO PROGRESSIVO SEM TRAPAÇA
Não alterar IA Enemy2 existente sem necessidade. Enemy3 deve usar escolha contextual por alcance, linha de visão, cooldown, risco e estado do jogador, orbitar/strafe, aproximar/recuar, punir recovery real de dash/skills e mirar com previsão limitada; preservar espaço de reação. Mini-boss3 usa combos de katana, alterna pressão de tempestade/portais/singularidade, flanqueia e usa fúria abaixo de ~40% HP, mas **não ler botões futuros, não reagir no mesmo frame de input, não ignorar cooldown, não travar esquiva e não sobrepor ataques impossíveis**. Dificuldade deve vir de variedade e timing, não de dano arbitrário.
Máquina de estados ou behavior tree simples: idle, alert, approach, strafe, windup, cast, projectile, melee, evade, stagger, recover, enraged, dead; prioridades e transições auditáveis. Cooldowns individuais e globais, anti-spam, distância mínima/máxima, line-of-sight, leash da arena, navegação e colisão, respeito a pause/cutscenes. Variar padrões sem comportamento errático. Escalonamento por dados configuráveis e testados, não fixar +75% de hitbox, +45% dano e 1.8x câmera sem playtest.

## 8. ENGENHARIA E PERFORMANCE
- Usar object pools, geometria/material compartilhados, shaders coerentes e instancing **onde realmente apropriado** (espadas e detritos iguais, bolts repetidos). `InstancedMesh` não serve automaticamente para todos os shaders, animações esqueléticas e raios ramificados; evitar imposição cega.
- 120 draw calls **é alvo aspiracional para a contribuição de VFX**, não um teto global garantido. Medir draw calls, triângulos, memória, frame time, shader compilation, picos de CPU/GPU no cenário real. Meta de 60 FPS onde hardware permitir, perfil degradado estável no Android e sem travadas perceptíveis; priorizar frame pacing. Níveis alto/médio/baixo com **mesma lógica de colisão, timing e silhueta legível**, reduzindo só detalhes/quantidade visual.
- VFX no chão respeitam altura do terreno; raios e projéteis não atravessam obstáculos; hitboxes sincronizadas ao frame de contato; evitar dano duplo, memory leaks, `setTimeout` órfãos e estados presos.
- Hitstop curto **somente em impacto confirmado**, câmera shake opcional/regulável, flashes controlados e opção reduzir movimento/fotossensibilidade. Não sacudir câmera de modo que jogador perca controle.
- Não destruir árvores permanentemente, não alterar dimensão de Valério, narrativa, outros bispos, HUD, economia, saves, 5 espadas, habilidades existentes, Codex Mod244, Enemy1/Enemy2 ou compatibilidade do Android.
- Preferir módulos independentes e flags de ativação/rollback. Não modificar indiscriminadamente `mundo-3d-prototype.js`; fazer integração mínima.

## 9. TESTES E CRITÉRIOS DE ACEITE
1. Auditar arquivos/GLBs e registrar clipes realmente presentes. Confirmar que o mini-boss3 é profile `miniboss3` com rig `enemy4`, sem alterar usos de Enemy4 no Ato 4.
2. Enemy3 comum e mini-boss3 podem executar as 3 magias de ponta a ponta em batalha, sem spawn instantâneo; singularidade gira sempre, explode em contato com player OU chão; espadas emergem visivelmente dos portais; nuvem ocupa a arena mas raios têm aviso e esquiva.
3. Katana tem combos com preparação/contato/recuperação distintos e dano somente em janela física válida.
4. AI usa cooldown, visão e recovery, respeita parede, terreno, cutscenes, morte e arena; enrage reversível e sem spam.
5. Testes automatizados para ciclo de vida, cancelamento, colisão, cooldown, dano único, efeitos com qualidade baixa, reinício, mudanças de ato e compatibilidade; executar suites preexistentes, documentar falhas prévias separadamente.
6. Se houver ambiente de browser, rodar smoke test em resolução de celular e produzir evidência; não afirmar que testou celular real se não testou.
7. Documentar benchmark honesto e trade-offs em `docs/auditorias/ENEMY3-MINIBOSS3-IMPLEMENTACAO.md`; fornecer link direto de teste com marcador atualizado e cache busting.
8. Não incluir vídeos/fotos externos no repo sem permissão. Receber as referências diretamente do usuário.

## 10. EXECUÇÃO NO GITHUB, AUTONOMIA E ENTREGA
1. Sincronizar a `main` atual e auditar commits recentes. Criar branch isolada `claude/enemy3-miniboss3-sakuga` (ou nome disponível). Implementar, testar e fazer commits reais.
2. Você **tem permissão para melhorar a proposta além deste texto** quando isso elevar a qualidade e não contradizer os três poderes, as referências, o jogo existente ou as garantias acima. Se encontrar conflito técnico, preservar o jogo e adaptar a solução, explicando só no resumo final.
3. Abrir PR; checar CI, conflitos e integração com trabalho do Codex. **O criador autoriza fazer merge quando testes e verificações essenciais passarem e não houver conflitos/regressões conhecidos**. Se houver risco relevante ou falha, NÃO forçar merge; deixar PR aberto e informar no resumo.
4. Após merge, verificar versão e link publicado; não afirmar publicação confirmada sem evidência. **Não gerar ZIP.**
5. **Ao final, UMA mensagem com NO MÁXIMO 10 LINHAS em PT-BR**, contendo: versão, skills, katana, IA, animações, testes, merge/PR, link para jogar e qualquer pendência. **SEM MENSAGENS DURANTE A EXECUÇÃO.**

## 11. REFERÊNCIAS TÉCNICAS
- Three.js `Material.clippingPlanes` requer `WebGLRenderer.localClippingEnabled` em WebGL; checar docs oficiais antes de usar.
- Boas práticas de telegraph de ataques: antecipação visual, janela de reação e dano evitável.
- Redução de shake e flashes é requisito de conforto/acessibilidade, não perda de impacto.


## 12. ADENDO VISUAL CONFIRMADO PELO CRIADOR — FOTOS E VÍDEO RECEBIDOS EM 31/10/2026
**Este adendo prevalece sobre descrições visuais conflitantes das seções anteriores.** O criador enviou 4 imagens e um vídeo curto de referência nesta conversa. **Os arquivos não foram enviados automaticamente ao GitHub**: Claude deverá examinar os mesmos anexos quando o criador os enviar diretamente. Não afirmar que viu os anexos antes disso.

### Referência A — Katana carmim do mini-boss
Imagem: katana longa inclinada, ponta muito fina, corpo escuro com fio luminoso vermelho, cabo vermelho trançado, guarda circular negra, dragão negro detalhado enrolado na parte superior da lâmina e **grandes chamas carmim com silhuetas orgânicas, pontas pretas e brasas** envolvendo principalmente o meio/terço inferior. **O dragão é elemento escultórico da arma**, não uma simples textura pintada. Preservar proporção e perfil da lâmina; chamas devem fluir independentemente, sem transformar a espada numa barra neon. Confirmar modelo real disponível antes de qualquer reconstrução.

### Referência B — Barragem Abissal
Imagem: **portais são rasgos verticais/oblíquos irregulares no tecido espacial, não círculos ou galáxias redondas**. Centros absolutamente escuros, contornos quebrados rosa-magenta luminosos, ramificações como rachaduras. Dispostos atrás/acima do conjurador em alturas e ângulos diferentes; espadas longas e negras com fios carmim saem visivelmente das fendas, inclinadas em direção ao jogador. A galáxia giratória, se desejada, deve ser detalhe **dentro da fenda**, não substituir sua silhueta rasgada. Alternar emergências lentas com disparos acelerados, criando sensação de estoque infinito, sem spawn fora dos portais.

### Referência C — Tempestade de Nadir
Imagem: **redemoinho colossal visto por baixo**, espirais de nuvens negras e magenta contornando um vazio central negro profundo, com luz rosa cortando a borda interna. Raios negros com bordas magenta/rosa ramificados caem em diversos pontos; solo recebe crateras e fragmentos. A tempestade deve ocupar visualmente o céu e dar sensação de escala opressiva, mas cada raio precisa de indicação no chão e rotas de esquiva.

### Referência D — Domo da Singularidade
Imagem: hemisfério maciço em expansão apoiado no chão, corpo rosa/lilás/lavanda com **rasgos irregulares de tinta preta**, interior branco/laranja muito brilhante e coroa de energia roxa/preta recortada na base. Não confundir com bolha transparente, esfera completa ou fumaça; preservar **contorno nítido de domo 3D** e irregularidade das manchas.

### Referência E — Vídeo de ~6 segundos: formação do buraco negro
O vídeo mostra um personagem de anime com um **núcleo negro circular, halo amarelo-alaranjado e feixe/acréscimo de energia horizontal brilhante**, com forte contraste e sensação de energia concentrada. A interpretação para a skill é: núcleo minúsculo surge no gesto da mão, aro quente é formado em camadas e **linhas de energia horizontais passam/espiralam pelo disco**; a singularidade cresce, se eleva, gira sem parar e depois é arremessada. Não usar screenshot do vídeo como textura no jogo, nem copiar frames de anime. **Esse vídeo é referência do momento de conjuração, não da explosão final**, que segue a referência D.

### Correções finais obrigatórias
1. **Prioridade visual:** silhueta + coreografia + massa antes de partículas extras; efeitos distintos em cada estágio, legíveis no Android.
2. **Som e feedback:** carga gravitacional grave, rasgo espacial, disparo de espada, trovão e impacto com variações; áudio espacial e limites de simultaneidade, com fallback sem arquivos externos.
3. **Câmera e gameplay:** mostrar conjuração e escala sem forçar cinematic camera; preserve controle e visão dos avisos, mesmo com portais atrás do inimigo.
4. **Fidelidade auditável:** comparar screenshots/vídeo do resultado às referências fornecidas pelo criador e descrever diferenças honestamente no relatório técnico.
5. **NÃO pedir mais detalhes se as referências enviadas forem suficientes.** Implementar com liberdade criativa e proteger todo o jogo existente.
