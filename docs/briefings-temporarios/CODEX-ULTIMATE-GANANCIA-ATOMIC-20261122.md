# CODEX — REFAZER A ULTIMATE DA GANÂNCIA: JUÍZO DA USURA — META VISUAL >=90%
**Revisão definitiva do briefing 22/11/2026. SUBSTITUI o anterior de 80%. MISSÃO AUTORIZADA.**
**O criador REPROVOU a implementação após assistir à gravação de 13s da campanha. Não aceitar CI verde, QA isolado ou efeito “funcional” como evidência de qualidade.**

## MISSÃO E REGRA INEGOCIÁVEL
Refazer a ultimate DA GANÂNCIA, FASE III, com cinematografia marcante, movimentos expressivos de espada durante a carga, câmera constantemente dirigida por tomadas móveis (não imóvel), VFX energéticos densos com núcleo real, e explosão com dimensão e violência comparáveis ou superiores ao vídeo de 14,66 s. A origem de lançamento, carregamento e impacto tem de nascer da POSIÇÃO REAL DA GANÂNCIA, onde quer que esteja na arena, e não da origem fixa da dimensão. A explosão precisa invadir VISUAL e FISICAMENTE aproximadamente 80% da região jogável, com 20% de refúgio seguro realmente alcançável. Exigir no mínimo 90% de fidelidade PERCEBIDA à referência relevante, ou superá-la. A avaliação final artística é DO CRIADOR: não inventar porcentagem nem declarar aprovada sem comparação audiovisual.

### Referências e falhas da versão atual
- Explosão: arquivo de referência 1000366175.mp4 (~14,66 s, horizontal). Referência PRIORITÁRIA para massa de energia gigantesca, escala espacial, estrutura e densidade de plasma, explosão multicamada, ondas secundárias, impacto e aftermath. NÃO é só “grande círculo violeta” ou malha no chão.
- Preparação e direção: animeXtalks_pindown.io_1795383587.mp4 (~36,07 s, vertical), cena do I Am Atomic. Referência de expressão, tensão, gestos, câmera dinâmica, energia crescente, silêncio/pressão e clímax. Inspirar técnica audiovisual; NÃO copiar ativos, personagens, dublagem, efeitos protegidos nem composição quadro a quadro.
- Gravação REPROVADA no jogo: 1000366179.mp4 (~13 s). Câmera praticamente parada no ângulo do jogo; Ganância e espada pouco valorizadas; grade/chão violeta dominando visual; esfera/impacto aparecendo LONGE da Ganância, frequentemente no outro lado da arena/centro; explosão fraca e localizada; desaparecimento abrupto. O vídeo é “ANTES”, não referência de qualidade.
- Os vídeos podem NÃO existir no workspace Git do Codex; não alegar que os assistiu caso não estejam acessíveis na sessão. Usar as descrições e referências independentes pesquisadas para avançar, e obter/solicitar mídias só se realmente imprescindível para a comparação final.
- Pesquisar ativamente outras referências de cinematografia de bosses, ataques de energia, sakuga e charge/anticipation/release, anéis de compressão, choques volumétricos, câmera dramática, telegraphs legíveis. Referenciar fontes e implementar soluções reais, não apenas pesquisar de fachada.

## 1. DIAGNÓSTICO TÉCNICO REAL NA MAIN: BUGS A CORRIGIR PRIMEIRO
Inspecione estado ATUAL da main antes de editar; as PRs #654 (Claude), #658 (Codex), #659 (integração) e #660 (ADM) foram mescladas; na última auditoria main estava Mod 351, NÃO “aguardando #654”. Preservar seus arquivos de combate e modelos, e as outras alterações dos agentes.

### greed-ultimate-campaign3d.js
1. A função createGreedCampaignUltimate recebe center (centro da arena) e define high = new T.Vector3(center.x, center.y+8, center.z). ESTE É UM DOS BUGS: a espada é enviada à posição fixa acima do CENTRO, em vez de subir sobre a mão/posição do BOSS. Substituir por trajetória world-space derivada do osso real, da release matrix e de launchOriginWorld + up*height; sem interpolar até center.
2. corona = createCorona(...,center) também centraliza todo o VFX no centro da arena. Separar origens: arenaCenterWorld serve SOMENTE para geometria/recorte do campo, castOriginWorld e impactOriginWorld para efeitos. Converter WORLD <-> ARENA LOCAL explicitamente, sem somar/subtrair transforms duas vezes.
3. pointAtHand usa b.gk.roots.D, mas na fase III as quatro armas do Claude orbitam via gk.ents e greed-runtime3d.js. Criar CONTRATO de posse de UMA espada: escolher visual apropriado, resgatar/retirar temporariamente da órbita, prender à mão, sincronizar clip e soltar no frame correto; impedir o runtime de mover simultaneamente o mesmo root; não duplicar visual nem hitbox. Se usar cópia visual durante o ritual, esconder corretamente o original e restaurar no fim.
4. A lógica camera(casting, st.phase, a, st) depende de casting que vira false quando termina a preparação, cancelando direção no clímax. Construir director de câmera com separação entre CINEMATOGRAFIA, CONTROLE DO HERÓI NA FUGA e PLANO DO IMPACTO, sem nunca prender controle na janela de reação.
5. O botão ADM “ATIVAR ULTIMATE” deve iniciar a versão NOVA em qualquer posição permitida da Ganância na fase III, sem mexer em sua vida ou teletransportá-la.

### greed-ultimate-corona3d.js
1. root.position.set(origin.x, origin.y, origin.z) = centro fixo, e várias partes do shader/cortina/linhas usam p.y>=edge, length(p)<=radius, arenaCenter etc. Atualmente origem de efeitos/arma e recorte da arena são misturados, dando aparência de energia brotando fora do boss.
2. Separar em arenaMaskRoot (WORLD/ARENA LOCAL, borda/limite, SAFE/UNSAFE) + castFxRoot (WORLD/BOSS LOCAL, núcleo, lâmina, coluna, ribbons, rings, shockwave) + environmentalReactionRoot. Uniformizar os espaços e documentar contrato de cada shader; uma só impactOriginWorld e um só timeline.
3. A grade/malha do chão atual deve ser detalhe secundário do aviso, não protagonista. A explosão principal deve preencher o espaço 3D com VOLUME VISÍVEL e múltiplas cascas, não só um círculo, disco, cilindro oco ou linha plana.

### greed-ultimate-atomic3d.js
1. measureRefuge cria uma faixa SAFE com z>=edge em disco fixo; a onda e os roots da detecção usam distância radial ao centro do disco, NÃO à Ganância deslocada. Alterar matemática, visual e dano JUNTOS. Não basta deslocar mesh!
2. Calcular área caminhável REAL e mapa SAFE/UNSAFE em posições variadas do chefe. Uma máscara dinâmica no início do cast, congelada no instante apropriado, deve manter aproximadamente 80% da área jogável em perigo e 20% alcançável em refúgio sem depender da posição central. Na borda, geometria recortada à arena; nunca confundir 80% DA ÁREA com 80% DO RAIO.
3. A frente de onda deve medir distance(worldPoint, impactOriginWorld) ou campo geométrico equivalente, recortado na dangerMask. Dano e frente visível compartilham origem, tempo e geometria. Testar ataques com boss perto da borda, jogador correndo/dash/defendendo e refúgio válido. Um hit por janela real; respeitar i-frames e escudo.
4. escape atual presume alcance horizontal em espaço sem obstáculos e velocidade fixa. Verificar tempo de fuga pela locomoção/caminho navegável e controle real: se cutscene bloqueia o herói, contador de fuga só inicia depois da câmera/controle devolvidos.

### mundo-3d-prototype.js e câmera
- greedAtomicTick atualmente passa center:voidSpec ao adaptador; centro continua válido para as bordas, NÃO para origens do cast. Tirar esta ambiguidade.
- Hook camera:(focus,phase,actor) usa offsets quase estáticos no ultCam.at e ultCam.look. Trocar por diretor com shots animados e blending/posições em movimento; limpar câmera/FOV/lease ao encerrar, morrer, cancelar ou sair da dimensão. Verificar greedCineLock/cineActive e bloquear conflitos de câmera com transição II→III.
- Manter painel ADM organizado (Mod 350), mas ocultá-lo/recolhê-lo durante tomadas cinematográficas e restaurar depois; gravação deve mostrar a Ganância sem UI cobrindo o corpo.

## 2. STORYBOARD OBRIGATÓRIO E MOVIMENTOS DE CÂMERA
São beats de direção, não frames arbitrários; definir durações pela qualidade do resultado:
A. ESTABELECIMENTO: boss olha o herói e assume pose dominante; dolly-in diagonal e órbita curta na frente/ombro, low angle; valorizar rosto/chifres/asas.
B. COREOGRAFIA: a Ganância FAZ MOVIMENTOS EXPRESSIVOS COM A ESPADA DURANTE A CARGA: giros de punho, cortes ritualísticos, arco da lâmina que captura energia, contra-pose do tronco, pés/asa equilibrando o peso. Movimentos reais do rig/clips, com crossfades; não flutuar espada separada do corpo nem ficar parada em pose de idle.
C. LANÇAMENTO: espada ascende em trajetória fisicamente legível DE ONDE O BOSS ESTÁ, sem sumir; câmera faz travelling/tilt acompanhando gume do punho ao alto. A arma é eixo real do ritual. Se a versão final decidir não arremessar, justificar artisticamente e preservar exigência do criador, que pediu o lançamento — preferir manter.
D. CRESCIMENTO: câmera se move em arco ao redor da Ganância e da arma, passando de close de núcleo a médio e amplo; parallax, rota de câmera Catmull-Rom/quaternion/target, composição continuamente ajustada, ritmo de foco e exposição; NÃO CAM FIXA com simples lerp até ponto.
E. CONTROLE E REFÚGIO: devolução de controles ANTES da única janela de fuga. Enquadramento do refúgio em gameplay com indicação sutil, não decal amarelo; sem câmera sequestrada na fase de corrida.
F. EXPLOSÃO: plano amplo preparado, impacto nasce do cast da Ganância e avança pelo espaço; câmera secundária dramatiza crescimento/ondas, sem impedir jogador fugir; uma tomada panorâmica e sacudida física curta depois do hit (não blackout prolongado). Garantir eixo de explosão no quadro, não esfera pequena no canto.
G. AFTERMATH: plano de consequência, restos de energia dissipando organicamente, espada retorna à Ganância e câmera volta a seguir o jogador sem salto. UI normal reaparece.

**Prova mínima da câmera:** log de posição/quaternion/FOV por tempo, pelo menos quatro mudanças de movimento/composição legíveis, sem o personagem fora do quadro, sem clipping nas paredes, sem snap do sistema antigo ou queda brusca de orientação; vídeo com a câmera realmente se movendo.

## 3. REFAZER A EXPLOSÃO DO NÍVEL VISUAL DO VÍDEO DE 14,66 S
Não adicionar somente 300 sprites ou blur. Pesquisar técnicas capazes de criar:
- Núcleo central muito intenso e estruturado: geometria concreta emissiva, contração e acúmulo, fractalização em placas energéticas, refração/distortion discreta com fallback.
- Camada de PLASMA 3D: várias cascas de malha deformadas por noise temporal e direção, variando cor e densidade; geometria volumétrica aproximada por cones, anéis irregulares e ribbons helicoidais, não fumaça.
- Pré-explosão com compressão, um pulso de silêncio/contraste, implosão de luz e só então release múltiplo.
- Frente de onda com borda espessa, irregular e cintilante, expansão espacial veloz, segunda frente desfasada, torrente de energia atrás; colunas verticais e radiais ocupando a escala do cenário; faíscas/arcos conectados ao núcleo e superfície. NÃO só um domo/cilindro de uma cor.
- Iluminação reativa que mostra volume e responde ao boss, espada e arena; boom claro sem deixar tudo branco por muito tempo. Originalidade cromática coerente com Ganância (roxo-violeta, rubi, ouro contaminado, núcleo quente), não copiar marca de outra obra.
- Resíduos energéticos e paisagem atingida por 1–3 s; sem desaparecimento em um frame.
- Plasma e VFX grandes sem matar performance do Android: qualidade low reduz camada secundária, mas mantém núcleo, volume e explosão reconhecíveis.

**Não aceito:** smoke barato, poeira cobrindo o núcleo, grade roxa plana como impacto principal, anel que surge no canto, bola que brota longe, shader plano sem profundidade, explosão sem massa, luz sem contraste, cena que não se parece com a referência de 14 s.

## 4. PESQUISA TÉCNICA ESPECÍFICA — DOCUMENTAÇÃO OFICIAL VERIFICÁVEL
Não basta colar links: ler, investigar compatibilidade e IMPLEMENTAR.
- Mixer e clipes reais: https://threejs.org/manual/pages/animation-system.html e https://threejs.org/docs/pages/AnimationMixer.html — sample temporal de ações, weight/crossfades, eventos em frames concretos; usar clips reais da Ganância e preservar bone transforms.
- Câmera com paths reais: https://threejs.org/docs/pages/CatmullRomCurve3.html — spline com trajetórias distintas por shot; Vector3.lerp, Quaternion.slerp, MathUtils.smoothstep; câmera lookAt acompanhando rosto e arma, sem atravessar cenário. Implementar diretor com camera lease para não perder prioridade entre ultCam/playerCam.
- Núcleo, emissive e bloom: https://threejs.org/docs/pages/EffectComposer.html , https://threejs.org/docs/pages/UnrealBloomPass.html , https://threejs.org/docs/pages/OutputPass.html . Bloom é ACABAMENTO, não geometria; compatibilidade Three r160, custo fullscreen e pós-processamento devem ser testados antes de adotar.
- Múltiplos estilhaços/arcos e boas práticas: https://threejs.org/docs/pages/InstancedMesh.html e https://threejs.org/manual/pages/optimize-lots-of-objects.html — instancing/batching, buffers preallocated, evitar criar geometria/material por frame, pooling e cleanup.
- Energia: pesquisar e registrar VFX breakdown de grandes ataques em games, câmeras de boss fights, materiais procedurais GLSL de plasma com deslocamento de vértice e detalhes de borda e layering. Usar a metodologia como referência técnica, SEM copiar assets/IP. Testar transparência, depthTest, depthWrite, renderOrder, clipping, tonalidade e sobreposição.
- Documentar quais soluções foram adotadas, descartadas e por quê (imagem/performance); preferir pesquisa verificável e atual a palpites.

## 5. ARQUITETURA E PERFORMANCE
- Controller de ultimate com etapas próprias: idle→announce→bladeCombo→throw→charge→releaseCamForEscape→collapse→detonate→aftermath→recover→idle. Estado legível e parâmetros configuráveis de velocidade, duração, câmera, paleta e densidade, sem timers JS descoordenados.
- CastOriginWorld acompanha boss e espada em preparação; ImpactOriginWorld é capturado no release. ArenaCenterWorld governa apenas limite geográfico, nunca serve como substituto de cast. Espaços de coordenadas documentados, única função de transformação world/local.
- DangerMask e safeMask derivados da área caminhável real e da posição do boss. Dano/visuais sincrônicos por frente temporal; refúgio conectado atingível. Ao menos sete posições de boss testadas incluindo centro, extremidades e intermediárias.
- IA da Ganância pausa apenas no intervalo de ritual e retoma ao fim, sem destruir gk.ents, estado telecinético, asas, fase III, sistema de hits e i-frames do Claude. Condições de interrupção, morte e mudança de dimensão limpam tudo. ADM continua disparando sob demanda.
- Custo alvo mobile Galaxy A55 (852x393, orientação paisagem), medir renderer.info, picos frametime e draw calls/overdraw. SwiftShader não equivale a telefone real. Manter alternativas low/medium/high em que mesmo low pareça cinematográfica.

## 6. OBRIGAÇÃO: TESTAR NO JOGO REAL, GRAVAR E REFZER ATÉ FICAR BOM
A. Criar branch própria do Codex (não alterar main), PR de implementação em revisão, nenhuma mesclagem automática sem aprovação; não tocar PR da caverna vulcânica nem trabalho de outros agentes.
B. Implementar com módulos coesos e testes; simulação isolada apenas para depurar shaders. DEPOIS entrar no jogo real por mundo-3d-prototype.html?adm=1&debug3d=1&testeDimensao=greed, entrar no combate, ativar fase III no ADM, disparar o botão JUÍZO DA USURA.
C. Gravar VÍDEO INTEGRAL do jogo com camera, boss, espada, charge, fuga, impacto e aftermath. Usar 852x393 e desktop, sem painéis tampando a cena; gerar segundo vídeo com boss FORA DO CENTRO (ex.: a 10–20m de distância) para provar origem e área 80/20 centrada no disparo real e limitada pelas bordas.
D. Testar sete poses diferentes do boss no campo (centro, borda norte/sul/leste/oeste e duas intermediárias), validar distâncias do núcleo/lâmina ao chefe ao longo da animação; provar que não aparece efeito no ponto fixo de centro. Salvar screenshots de frames-chave e log de world-space origin.
E. Medir área perigosamente acessível 80% e refúgio 20% ±3 pontos percentuais EM TODAS essas posições: samples determinísticos do piso/colisão + jogabilidade de fuga com caminhada/dash. SafeMask visível e sem dano, damage token único. Testar morte, reset, teleporte, repetição 5 vezes, outras dimensões; nenhum VFX/áudio/câmera preso.
F. Comparar quadros equivalentes de 6 marcos: 1 apresentação, 2 coreografia de espada, 3 carga, 4 liberação, 5 máxima EXPLOSÃO, 6 aftermath. Montar painel lado a lado VÍDEO 14s / VÍDEO 36s / NOVO jogo (e vídeo de 13s anterior, se acessível). Relatar objetivamente lacunas visuais, refazer o que estiver fraco; guardar evidências em PR/GitHub Actions.
G. A meta **>=90%** é o critério de aceite artístico pedido pelo criador; avaliação humana subjetiva, NÃO número calculável de CI. **O Codex não deve autoatribuir nota “90%” sem material visual.** Se o resultado continuar parecendo um efeito qualquer, a missão não acabou. Melhor que a própria referência é o alvo máximo.
H. Não encerrar o trabalho só porque build compilou; continuar iterando até QA completo + vídeo final convincente + aprovação do criador. Se limitação real impedir comparação direta com vídeo do usuário, registrar honestamente e continuar desenvolvimento sem falsa aprovação.

## 7. ENTREGÁVEIS E SILÊNCIO
- PR específica desta revisão, sem merge automático, com referência ao Mod atual e arquivos alterados;
- vídeos reais da luta e dos casts deslocados, screenshots antes/depois com shots correspondentes, relatório curto sobre câmera/escala/hitbox/performance;
- documentação das pesquisas técnicas e do que foi implementado com links;
- testes de regressão automatizados e teste de navegador local (não apenas laboratório);
- NÃO enviar resumos longos nem pedir confirmação intermediária. Trabalhar sozinho até entregar. Quando tiver evidência final convincente, mensagem opcional no chat: somente link da PR e “vídeo do jogo pronto para revisão”.
- **Não apagar este briefing antes da aprovação final do criador**; a antiga orientação para apagar logo depois não se aplica enquanto a versão estiver reprovada.

**O que invalida o aceite:** câmera imóvel; espada sem gestos/duplicada; cast saindo do centro da arena; explosão no outro lado longe da Ganância; energia rasa com grade no chão ou fumaça sem núcleo; não ocupar visualmente ~80% do cenário; refúgio 20% injusto/inexistente; passar QA isolado sem mostrar gameplay real; gravação que não melhora dramaticamente o resultado anterior.
