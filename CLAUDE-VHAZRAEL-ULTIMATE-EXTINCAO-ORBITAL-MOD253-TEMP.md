# TEMPORÁRIO — Claude Code | MOD 253: EXTINÇÃO ORBITAL DO VHAZRAEL
> REPO: PHBritoDev/Jogo-2-2.5D | BASE: main | Arquivo de transferência de especificação. **Apagar este arquivo depois de concluir o trabalho e confirmar o merge.**

## MISSÃO EM UMA FRASE
Refazer a **ultimate do Bispo 1, VHAZRAEL — Extinção Orbital**, para parecer uma cutscene apocalíptica de anime AAA: close demoníaco com um **X luminoso no rosto**, Terra vista do espaço com composição majestosa, meteoro fisicamente denso e flamejante vindo da distância, montagem de câmeras, aproximação final na arena, **POV do protagonista**, janela jogável de **DEFENDER** e choque colossal com núcleo definido. Nada de efeitos genéricos/fumaça multicolorida. Não tocar na Ruptura do Trono (Mods 251/252) nem nas outras habilidades.

## CONTEXTO VISUAL DO CRIADOR — O QUE É REFERÊNCIA, NÃO ARQUIVO A COPIAR
- Imagem 1 (meteoro): núcleo incandescente branco-amarelo, crosta flamejante aderida, cauda enorme e direcional atravessando a atmosfera; composição cósmica de fim de mundo.
- Imagem 2 (Terra): parte inferior ocupada por curvatura da Terra, horizonte azul brilhante, starfield profundo, um ponto luminoso no horizonte; câmera cinematográfica em altitude.
- Imagem 3 (personagem): silhueta demoníaca negra, aura vermelho-carmim com recortes e linhas verticais, pequeno **X vermelho de luz** onde estariam os olhos, sugestão de sorriso/ameaça. VHAZRAEL **não tem face detalhada**, então NÃO criar olhos, dentes ou sorriso anatômico tosco; usar máscara/sombra cinematográfica e X emissivo no espaço correto do rosto, sem deformar o GLB.
- **Vídeo do jogo (13,83 s)** observado: boss pequeno em tela, cortes para planeta de aspecto liso/espiral rosada, meteoro como pedra marrom poligonal com rachaduras simples, traço vermelho fino, HUD cobrindo tomadas; câmera pouco expressiva. NÃO reproduzir esses defeitos. O criador considera o mundo e meteoro muito feios.
- Pesquisar referências reais de *cinematografia espacial*, meteoros em reentrada, *stylized anime impact*, aura e *shockwave*; **Pinterest apenas para direção de arte**, não copiar assets protegidos. Se Pinterest exigir login, procurar equivalentes públicos. Não presumir que uma referência 2D pode ser transplantada sem trabalho para WebGL 3D.

## INVESTIGAÇÃO OBRIGATÓRIA ANTES DE CODAR
1. Ler **inteiramente**: `vhazrael3d.js` (ORBITAL, ORBITAL_PHASES), `vhazrael-vfx3d.js` (cena orbital, planeta, meteoros, shaders, instancing), `enemy1-squad-runtime3d.js` (orbit e VFX), `mundo-3d-prototype.js` (vzCinematic, vzUpdateLock, bloqueio/defesa/câmera e controles), testes `vhazrael.test.mjs`, `vhazrael-preview.html` e arquivos de iluminação/áudio usados.
2. Mapear a câmera e as fases **reais**. Estado atual (confirmado antes deste documento): `ORBITAL_PHASES=['awaken','orbit','entry','choice','impact','after']`, tempos em `ORBITAL` = awaken 3, orbit 3.5, entry 5, choice 2.5, impact .6, after 3.2 segundos; `mundo-3d-prototype.js` renderiza `orbitalScene` apenas em `orbit/entry`, usa câmera normal em `choice`; bloquear mantém `guardT` e shieldDmg vs dmg; `vzSkip` salta para choice. **Esses nomes e tempos são pontos de partida, não obrigação de mantê-los.**
3. Construir storyboard de tempo e *shot list* no próprio código/docs se necessário, preservando sincronização gameplay↔VFX e salvamento/saída da dimensão.
4. Conferir orientação/skeleton e pontos de ancoragem do modelo 3D no runtime; o X do rosto não pode ficar flutuando ou fora da cabeça. Não duplicar luzes infinitas nem causar escala absurda do boss (respeitar protocolo de escala GLB já existente).

## STORYBOARD OBRIGATÓRIO — TRANSIÇÕES CONTÍNUAS, NÃO UM SLIDESHOW
**SHOT 1 | O despertar do tirano (aprox. 2–3s)**
Close frontal baixo → aproximação suave e intencional do rosto e espada. Bispo em **silhueta escura** contra aura carmim/negra estruturada. X de luz rubra (duas diagonais finas com centro concentrado + glow/halation controlado), com reflexos mínimos na máscara e espada; sugestão de sorriso por rachadura curva sutil *somente se ficar convincente*. Como rosto GLB é pobre, enquadrar e iluminar para **ocultar limitações**: não colocar decal facial em local errado. Aura = lâminas e fitas de energia recortada com núcleo e extremidades escuras, não spheres, billboards de fumaça ou cilindros genéricos. Silêncio inicial/tensão, som crescente. Garantir que qualquer pausa possa ser pulada sem travar.

**SHOT 2 | Revelação da Terra (aprox. 1–2s)**
Corte bonito para órbita: Terra ocupa **metade inferior** ou um terço grande da tela, espaço negro/azul estrelado superior. Melhorar forma/atmosfera do `orbitalScene`: planeta com textura/procedural de nuvens e continentes visualmente plausíveis (evitar redemoinho rosa gigantesco estampado), raio atmosférico azul/limb, terminador dia-noite, perspectiva, camada leve de nuvens com parallax, pontos urbanos noturnos opcionais de baixo custo. Câmera com dolly lento, horizon glow localizado. Não usar plano chapa/PNG esticado como substituto do globo.

**SHOT 3 | A ameaça distante (aprox. 1–2s)**
Um ponto extremamente brilhante surge **longe** contra o globo e cresce progressivamente. É um corpo rochoso único, NÃO um círculo, não um orbe abstrato. Primeiro mostrar escala/distância; telemetria visual por parallax. Meteoro composto por **rocha escura de forma irregular e fissuras profundas**, **núcleo quente concentrado** visível nas fendas, manchas de fusão, glow branco/amarelo interno, laranja-carmim exterior. Nunca “bola marrom rachada com linha vermelha longa”.

**SHOT 4 | Viagem e reentrada (aprox. 3–5s)**
Montagem com planos de propósito diferente: ① tracking 3/4 lateral evidenciando parallax e velocidade; ② travelling próximo à crosta, rachaduras e detritos superaquecidos; ③ wide mostrando meteoro apontado para a Terra; ④ horizonte/atmosfera comprimida pelo corpo; ⑤ câmera distal observando chegada à zona do jogador. Cauda com **direção física consistente para trás em relação à velocidade** (não um canudo vermelho ou fumaça cinza flutuante). Plasma branco-laranja aderente à frente, shock layer e bordas filamentosas, tramas de fogo, lascas/riscos longos seguindo movimento; usar poucos layers geométricos/shaders com composição real, não milhares de partículas. Neblina apenas *trailing afterglow*, nunca substitui núcleo.

**SHOT 5 | Arena: ameaça visível (aprox. 1–2s)**
Cortar do espaço para *wide* da arena. Meteoro entra pelo céu exatamente na posição/direção definida no estado; grande escala relativa ao mundo e silhouette facilmente legível. Ambiente reage de modo progressivo: sombra crescente, vento, detritos, brilho quente nas superfícies/ambient color; não tingir a cena permanentemente ou gerar flashes frequentes. Plano amplo conecta literalmente meteorito→arena; **não teletransportar pedra do espaço para a cabeça do jogador sem transição**. Área de impacto ancorada no alvo/arena.

**SHOT 6 | POV do protagonista + defesa JOGÁVEL (mínimo 2s ou justificar)**
Trocar para visão ancorada na altura dos olhos do protagonista (ou over-the-shoulder curto que imita POV), olhando para cima o meteoro crescente. Câmera NÃO deve ficar dentro do modelo, cortar fora o meteorito, girar 360° ou travar após a fase. Jogador vê o botão DEFENDER nítido e acessível no celular (HUD simplificada durante cutscenes: esconder clutter, preservar DEF + indicador da janela). Dar feedback de defesa em momento compreensível **antes do impacto**. PRESERVAR a lógica existente de bloqueio (guardar `guardT>=.35`, `t.blocking`) e da opção de duelo com ultimate; caso altere parâmetros, atualizar testes. Durante essa janela, bloquear deve de fato funcionar no celular; nunca desabilitar `DEF` por `vzLocked`, overlay ou hitbox da cutscene. Sem defesa → dano alto; defesa → dano mitigado; duelo → resultado próprio. A câmera pode fazer transição suave entre aproximação, POV e recuperação sem perder controle.

**SHOT 7 | Impacto: energia com MASSA (aprox. 1–2.5s)**
Atingir o solo, não o interior da câmera. Ordem causal: contato da crosta → compressão/1 frame de brilho (respeitar reduzir flashes) → **núcleo branco-amarelo com casca laranja/negra recortada e sólida** → choque circular **com aresta e espessura**, varre o chão → fissuras/cratera/placas de pedra e detritos iluminados → retorno de luz/cor do mundo e câmera. Bola de fumaça arredondada ≠ explosão. Nada de “bombas” separadas viajando até o protagonista; todos os secundários irradiam do epicentro. Som grave com pequena pausa/impact hold opcional, hitstop discreto e tremor **apenas se opção de movimento permitir**.

**SHOT 8 | Recuperação (after)**
Restaurar câmera, FOV, controles, HUD, exposição, luzes, névoa e estado de entrada com *cleanup* robusto em: fim normal, morte do boss, morte do jogador, skip, reload, saída da dimensão, pausa. Nenhum corpo/meteoro fantasma no céu.

## REGRAS DE ARTE E ENGENHARIA (NÃO NEGOCIÁVEIS)
- **Regra NÚCLEO**: cada massa de energia possui **centro emissivo claro, corpo denso com contraste e crosta externa de borda dura**. A aura usa deformação orgânica, mas não “fumaça de nuvens de cores”. Um objeto brilhante deve manter a silhueta mesmo sem bloom.
- Meteorito precisa ser geométrico de volume sólido, rotação e rachaduras reais/shader convincente, não `IcosahedronGeometry` com aparência de pedra básica sem tratamento. Cauda física seguindo vetor oposto da velocidade.
- Fazer *art direction* com paleta controlada: aura carmim/preto; Terra azul/noite; meteoro branco→amarelo→laranja→carvão; impactos branco quente→vermelho/laranja/negro. Evitar rosa-roxo genérico que apareceu no vídeo.
- Mobile prioritário: evitar 200 meshes independentes, luzes dinâmicas com sombras caríssimas, geometrias alocadas todo frame, texturas gigantes. Use batching/instancing/pooling, shaders temporais, LOD por qualidade sem alterar colisão. Otimizar perfis low/auto/high; jamais remover núcleo no low.
- Câmera: usar cortes/crossfades/eventos de câmera determinísticos guiados pela **mesma timeline da magia**, não callbacks independentes e setTimeout descontrolados. Testar paisagem/portrait se pertinente, principalmente **mobile horizontal** do vídeo.
- Respeitar configurações `reduceFlash`, `reduceShake`, contraste e controle. Evitar clarão que apaga a tela por tempo longo.
- **Não modificar outras magias, bosses, jornada, cadastro, economia, HUD fora do escopo, nem a Mod 252 da espada.** Se precisar tocar em interface do DEF, mudança mínima, bem documentada.
- Não depender de IA/asset externo ou download não versionado em produção. Se criar shader/mesh, incluir no repo. Não copiar frame do Pinterest ou outro anime como textura/asset.
- Se não alcançar qualidade desejada com a implementação atual, explique limitações técnicas e proponha alternative concreta; não chame visual simples de “ultracinematográfico”.

## CRITÉRIOS DE ACEITAÇÃO / COMO PROVAR
1. **Antes/depois visual obrigatório**: capturas da câmera nos SHOTS 1, 2, 3, 4, 5, 6 e 7; confirmar em navegador com WebGL, se ambiente permitir. Sem screenshots reais, registrar explicitamente “não testado visualmente”; NÃO inventar evidência.
2. Meteoro tem núcleo visível e crosta/plasma aderentes; Terra não parece textura plana nem redemoinho roxo; aura e X legíveis no rosto real do bispo; câmera nunca perde o meteoro durante tracking.
3. Testar linha do tempo da ultimate, resultados de escudo/dano/duelo, controle DEF na janela `choice`, transição da câmera para/de POV, `vzSkip` e cleanup, performance mobile (se não houver aparelho, simular limitação e declarar).
4. Rodar testes existentes, acrescentar regressões relevantes de fases/câmera/dano. Verificar se build cache/etiqueta e imports estão atualizados (marcador não é prova de execução).
5. Entregar link direto do GitHub Pages para teste da ultimate, URL da PR, commits, síntese do que realmente mudou e limitações. **Merge apenas após revisão dos testes; nunca afirmar teste gráfico sem prova.**

## FLUXO DO CLAUDE E LIMITE DE CHAT
- **Economizar tokens de conversa**: ler ESTE ARQUIVO e arquivos necessários diretamente no GitHub, fazer modificações com commits incrementais, sem repetir a especificação no chat; usar mensagens curtas, no máximo 1–2 atualizações de status se houver bloqueio.
- Criar branch Mod 253, preparar código, checar imports e testes, abrir PR e dar merge quando verificações permitirem (o usuário já prefere testar alterações mescladas).
- **Excluir `CLAUDE-VHAZRAEL-ULTIMATE-EXTINCAO-ORBITAL-MOD253-TEMP.md` ao fim do trabalho**, antes/por meio da PR ou num commit de limpeza imediatamente depois do merge. Não apagar antes de ler por completo.
- Se decidir melhorar algo além desta especificação, fazê-lo somente se realmente elevar a qualidade e não quebrar os critérios; registrar decisão e motivo em comentário/PR, não numa enxurrada de mensagens.

## RESPOSTA FINAL DELE
Máximo ~10 linhas: arquivos alterados + cinematografia + testes reais vs pendentes + PR/merge + link do jogo + confirmação de remoção deste arquivo.
