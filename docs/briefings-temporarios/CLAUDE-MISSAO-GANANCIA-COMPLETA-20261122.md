# Missão Claude — reconstrução de combate e apresentação da Ganância (9ª Divisão, 22/11/2026)

> **Ordem de execução.** Este documento é a fonte de trabalho desta missão. As referências originais serão enviadas pelo criador à conversa do Claude; o GitHub não contém automaticamente os vídeos anexados ao ChatGPT. **Não presumir que viu vídeo/foto não recebidos; se faltar mídia, usar descrição textual e QA real, mantendo a comparação visual pendente.** Entrega em silêncio operacional: não enviar resumos, justificativas ou andamento ao chat; registrar PR, commits, testes e evidências no GitHub. Mensagem final somente link da PR e estado objetivo, se necessário. Não declarar concluído sem critérios satisfeitos.

## AUTONOMIA TOTAL DE EXECUÇÃO — NÃO INTERROMPER O CRIADOR

Esta missão **já foi autorizada**. **Não pedir confirmação, permissão intermediária, escolha de prioridade, autorização para prosseguir à etapa seguinte, nem enviar perguntas ou resumos entre etapas.** O Claude deve executar as etapas 1–9 na ordem, tomando decisões técnicas fundamentadas por conta própria, testando, corrigindo e avançando sem aguardar respostas. O criador enviará os arquivos de referência quando disponíveis; não interromper só para perguntar sobre os dois vídeos de gameplay, pois pode reproduzir e capturar a versão atual.

- Se uma solução falhar ou não atingir a rubrica de qualidade, refazer e testar sem pedir aprovação entre tentativas. Registrar detalhes e evidências apenas na PR. Não interpretar "revisão artística do criador" como checkpoint que bloqueia a **implementação**: concluir todas as etapas e então deixar a revisão humana **final** explicitamente pendente.
- Se uma dependência envolver arquivo/área reservada ao Codex ou outro agente, **não tocar nela** nem pedir ao criador para resolver: usar interfaces/hook já existentes e continuar as partes independentes. Deixar bloqueio específico e proposta de integração na issue #519 ou PR; sem alterações conflitantes e sem perguntas no chat.
- Se mídia não chegar ou ferramenta de vídeo falhar, não pedir ao criador para reenviar durante a execução: prosseguir com código, descrição e QA local possível; marcar apenas comparação específica como pendente, sem afirmar que a viu.
- Evitar pedir permissão para bibliotecas locais, testes, alterações e branches normais dentro do escopo autorizado. **Não gastar dinheiro/créditos, não alterar cânone, não forçar merge ou sobrescrever trabalho protegido sem autorização explícita já existente.** Quando algo indispensável exigir autorização que não existe, deixar isso pendente no GitHub e avançar outra parte segura, em silêncio.
- Ao terminar cada etapa, passar **automaticamente** à seguinte. **Não esperar confirmação ou enviar mensagem entre as nove etapas.** Status da implementação e rastreabilidade ficam exclusivamente no GitHub; ao finalizar, no máximo um link curto da PR e indicação de pendências objetivas, sem resumão.

## Proteção de escopo e preparação obrigatória

1. Ler este arquivo e `AGENTS.md`, `docs/combate/MISSAO-GANANCIA-TRES-FASES-2026-11-22.md`, `docs/GUIA-PARA-IAS.md` e contratos relevantes da `main`. Conferir PRs abertas/HEAD atual, responsáveis em #519 e trabalho ativo do Codex.
2. **Codex está encarregado da caverna subterrânea do vulcão**: não modificar, renomear, fazer rebase ou mesclar seus arquivos, ramificações, cenas ou assets em andamento. A **Dimensão da Ganância** e a criatura abissal nela presente são objeto deste trabalho, mas se `greed-abyss3d.js` ou arquivos compartilhados estiverem reservados ao Codex, coordenar na #519, usar os hooks de integração sem sobrescrever ou aguardar liberação. **A criatura da boca na Dimensão da Ganância não é a caverna vulcânica**.
3. Revisar sem pressupor correção já realizada: `greed-boss3d.js` (lógica de fases, movimentos e dano), `greed-runtime3d.js` (rig, clips, visibilidade e asas), `greed-weapons3d.js` (armas), `greed-vfx3d.js` (magias e impactos), `enemy1-squad-runtime3d.js`, `sword-rites3d.js`, integração da arena e `tools/qa/greed-campaign.cjs`, `tests/ganancia-tres-fases.test.mjs`. Verificar arquivos efetivamente usados na versão atual; não confiar em rótulos antigos de Mod.
4. Auditar o inventário real dos **12 clips da fase I e 18 clips da fase II** informados no briefing anterior, verificando nomes, duração, rigs, eventos, RootMotion, pesos e quais são usados ou nunca alcançados. Registrar matriz clip → ação → fase → tempo → hitbox → efeito → frequência observada. Não inventar animações nativas; se necessário, usar blends, subclips ou pose procedural apenas como complemento.
5. Executar baseline real de todas as fases no viewport mobile, com vídeo e logs (mesma câmera/condição da comparação). A tela gravada pelo criador tem botões/menus de depuração: separar erros de apresentação dos controles de teste. Preservar entrada e saída de campanha, save, teleporte QA e dispositivos Android.

## Mapa inequívoco das referências

| Arquivo fornecido pelo criador | Duração | Destino EXCLUSIVO | O que extrair |
|---|---:|---|---|
| `1000366149.mp4` | 9,23 s | **Ganância fase I — combate** | Indicação amarela no chão; ritmo lento; dano que para após primeiro contato; arma telecinética sem corte completo |
| `1000366152.mp4` | 32,88 s | **Ganância fases II→III — captura do jogo** | Analisar especialmente 0–4 s (troca de fase); desaparecimento do corpo em voo, armas isoladas, projéteis/bolas suspensos, pouca mobilidade aérea |
| `1000366128.mp4` | 23,86 s | **Referência EXTERNA da transformação fase III** | Composição, enquadramento alto, sequência de energia vermelha, geometria luminosa, clímax, explosão e timing cinematográfico; não copiar assets alheios |
| `1000366125.mp4` | 8,30 s | **Referência EXTERNA do impacto dos 4 mini-sóis/bola de fogo da Ganância na parede/teto** | Tremor, camadas de luz, estilhaços luminosos, choque forte e leitura de energia; adaptar para amarelo/dourado solar da Ganância |
| `1000366122.mp4` | 5,85 s | **Referência EXTERNA do impacto da esfera vermelha de energia na BOCA DO ABISMO** | Escala, anéis e choque de impacto, estilhaços violetas, contraste de núcleo energético; NÃO aplicar à bola de fogo amarela |
| `1000365638.mp4` | 13,26 s | **Referência EXTERNA de esgrima fase III** | Combos encadeados, arcos de espada, impacto e recuperação; adaptar à identidade das armas e à jogabilidade 3D |
| `1000366140.jpg` | imagem | **Criatura abissal da boca + energia vermelha/violeta** | Esfera deve crescer **dentro da garganta**, no centro anatômico; não flutuar metros à frente |
| `1000366135.jpg` | imagem | **Ganância I: arte 2D vs rig 3D** | Silhueta, chifres, rosto/sorriso, cabelo, joias, metais, volume do manto, detalhes vermelho/dourado |
| `1000366133.jpg` | imagem | **Ganância II/III: arte alada vs rig 3D** | Abertura, proporção, penas, espessura, chifres, volume da roupa e visibilidade do rosto |

**Importante:** as imagens anexadas lado a lado mostram aproximação estilística, não fornecem porcentagem matemática de semelhança. O limiar **80%** é a meta mínima solicitada pelo criador para **cada referência visual aplicável**, não uma porcentagem automática verificável; elaborar checklist ponderado de silhueta, anatomia, materiais, movimento, iluminação e fidelidade do efeito, com nota justificada **para cada comparação separadamente**. Qualquer etapa abaixo da meta exige nova iteração; a aprovação final da semelhança cabe ao criador. Não declarar “80% atingido” sem enquadramento pareado + inspeção humana/criador; objetivo final é superar a referência com originalidade e bom gameplay.

## Etapa 1 — Regras globais de hit e Ganância I: ameaça real sem dano fantasma

- Reproduzir e localizar o aviso amarelo no solo (telegraph/decal): remover especificamente o marcador artificial associado à Ganância. Para **todos os bispos e demais oponentes do jogo**, auditar sistematicamente a mesma limitação de dano sucessivo, identificar quais sofrem o problema e **implementar as correções nesses atores na etapa de integração compatível**, com testes de combo por espécie. Se afetar lógica compartilhada, corrigir a causa comum sem comprometer defesa/esquiva. Remover indicadores amarelos artificiais indesejados da Ganância e de outros adversários afetados após confirmação em jogo, substituindo-os por antecipação legível de animação/áudio/VFX; não apagar indiscriminadamente sinais essenciais de acessibilidade. Ataques devem poder ser lidos pela animação, áudio e antecipação real do modelo; conservar clareza e esquiva justa.
- Investigar `attackToken`, `gkSrc`, i-frames, `hurtCooldown`, hitstop, invulnerabilidade de dash e window ownership. O documento anterior já afirma tokens independentes: **não assumir que o bug é um cooldown universal**. Produzir traço de linha do tempo: ataque A/B, frame, colisão, aceitação/rejeição de dano, razão. Reparar apenas a limitação comprovada.
- **Não remover cegamente todos os i-frames do RPG**: conservar esquiva perfeita e invulnerabilidade legítima; remover imunidade artificial longa que suprime golpes *distintos* válidos. Cada evento/ janela de ataque pode atingir uma vez conforme hitbox real; a mesma janela não deve causar dano por frame. Testar combos multi-hit, escudo, dash, stagger, death e acertos consecutivos tanto de Ganância como de bispos afetados.
- Fase I: reduzir tempos mortos, aumentar perseguição e reações, permitir ataques e arremessos encadeados; evitar CPU “cheat” e stun-lock interminável. Usar clips nativos com crossfades apropriados, blend e ataques com antecipação proporcional. Verificar no vídeo 9s antes/depois: golpes sucessivos realmente acertam, têm leitura e variedade.

**Aceite:** ao menos três sequências diferentes reproduzidas com dano validado por janela distinta; defesa/esquiva continuam confiáveis; nenhum aviso amarelo artificial da Ganância permanece; sem regressão nos demais atores.

## Etapa 2 — Armas telecinéticas: arma realmente luta, não só orbita

- Conservar identidade de cada arma da Ganância. Foice e espada telecinéticas precisam de **coreografias completas**: preparação → deslocamento → rotação/ceifa ampla → impacto/defesa/choque → recuperação → próxima investida; movimentos horizontais, diagonais, giros e retorno/retirada com distância de alcance legível.
- **Dano vem da lâmina no espaço** (cabo/gume e transformações mundiais antes→depois, sweep de segmentos/cápsulas), **não da distância do corpo da Ganância**. Corrigir base/escala/eixos/attachment, ampliar arcos úteis, alcance e VFX por golpe; prevenir atravessar paredes ou multiplicar dano no mesmo movimento. Atacar mesmo quando o boss estiver afastado, se a arma estiver ao alcance.
- Criar estela com geometria temporal e curva de ponta, volume e decaimento; camada de corte intensa com núcleo, bordas coloridas, faíscas e impacto responsivo, **sem fumaça genérica usada como substituto**. Cinemática bela mas barata no Android (pool, instancing quando apropriado, sem novas alocações por frame).
- Checar compatibilidade da foice duelista autônoma de ~10 s citada no contrato antigo e seu estado atual, sem substituí-la por órbita sem golpes.

**Aceite:** vídeo focado em 3+ golpes a distância real, rotacionando totalmente, com dano/contato no gume e variação.

## Etapa 2A — Refinamento obrigatório das quatro armas: NÃO parecer papelão

**Pedido novo do criador (22/11):** as foices, a espada/picareta e a lança da Ganância estão com aparência grossa, chapada, sem ponta/gume, como armas de papelão. Torná-las nitidamente **afiadas, metálicas/cristalinas quando coerente, brilhantes, detalhadas e perigosas**, reproduzindo o refinamento das artes de referência; não trocar a identidade de cada arma.

- Auditar `greed-weapons3d.js`, geometria real, seção transversal, bevel, normais, UV, materiais e como a arma aparece **em gameplay**, não só parada em preview. Verificar se o próprio algoritmo de mesclar meshes, a espessura dos extrudes, geometria pouco subdividida ou iluminação apagam os gumes. NÃO disfarçar uma silhueta ruim apenas elevando emissive/bloom.
- **Geometria/afiamento:** lâminas afilam progressivamente até o gume, ponta e curvatura com espinha de suporte; variação de espessura plausível, bevel estreito e cristas/superfícies que capturam reflexos. Foices devem ter arcos cortantes elegantes e ameaçadores, sem bico arredondado/chapado; espada/picareta com fio e ponta definidos; lança solar com ponta fina, alongada, espinha central e silhueta distinta.
- **Materiais/iluminação:** reflexo especular direcional controlado no bordo, roughness e metalness apropriados; highlights móveis que seguem a orientação da lâmina, rim suave e emissive somente nos canais mágicos. Não transformar metal escuro em plástico fluorescente. Dar brilhos próprios às armas cósmica, sanguínea e solar com cores e detalhes coerentes com as referências, sem estourar toda a arma em branco.
- **Microdetalhes e proporções:** preservar buraco negro/estrelas da foice cósmica, sangue/caveira/correntes da foice rubra, chama branca-dourada da lança e identidade híbrida da quarta arma; reforçar volume 3D e bordas, sem exagerar na grossura nem sacrificar leitura a distância.
- **VFX associados:** streak de fio luminoso que nasce na borda real e segue a velocidade angular da lâmina, faíscas breves no contato e reflexos no corte; não esconder a geometria sob fumaça ou trilhas gigantes genéricas.
- **QA obrigatório:** capturas lado a lado referência PNG × arma no jogo, em close e a distância de combate, três ângulos (frontal, 3/4 e lateral), idle, giro/ataque e luz da arena; conferir que realmente parecem afiadas, brilhantes e de alta qualidade. Monitorar FPS, draw calls, triângulos e memória Android. Usar a meta artística mínima de 80% por referência, mas revisar com o criador; se falhar, remodelar/retocar e repetir. **Não declarar concluído por apenas adicionar emissive.**
- Esta Etapa 2A integra a **Etapa 2**, antes de passar à cena cinematográfica da Etapa 3, sem pedir confirmações e sem atrapalhar Codex.

## Etapa 3 — Transição morte II → forma III: cena autoral de grande impacto

- Captura do jogo de 32,88s: estudar **0–4s**, estado de morte, limpeza de efeitos e momento da transformação. **Referência de 23,86s** serve EXCLUSIVAMENTE para cena da terceira forma.
- Criar state machine/cinematic director com eventos por tempo, **não apenas explosão na posição**: matar II sem terminar campanha → bloquear ações coerentemente → câmera abandona combate e se posiciona para revelar corpo → tilt up/ângulo elevado → corpo sobe, animação `Arise` visível → ondas de energia carmesim/violeta com núcleo luminoso, anéis geométricos fraturados, rachaduras/arcos, pulsos e som → pico com choque de câmera moderado → revela silhueta III (chifres e asas) → volta suavemente ao gameplay, com câmera e HUD restaurados mesmo se pular a cena.
- **Nada de nuvem de fumaça genérica como explosão principal**. Construir gramática VFX: source/core → charge → compression → radial burst → lingering shards/falloff, profundidade 3D, parallax e temporização com áudio.
- Ao transicionar limpar corretamente projéteis/efeitos persistentes; corrigir especificamente **duas bolas de fogo paradas no ar**, incluindo update e descarte depois de morte, troca de fase, reset, timeout e descarte de cena.

**Aceite:** vídeo completo II→III na mesma câmera do jogo; sem bola parada, duplicação da Ganância, tela preta, travamento, perda de controles ou saltos de câmera.

## Etapa 4 — Voo real / visibilidade / teto e parede

- Corrigir **modelo invisível durante voo**: investigar root, `visible`, layers, `frustumCulled`, bounding volumes de SkinnedMesh, estados da ação, `matrixWorld`, render order, depth e escalas. NUNCA “resolver” tornando só as armas visíveis. Corrigir corpo, cabelo, roupa e asas em todo estado (subir, pairar, mergulhar, pousar, voltar).
- Voo em 3D: subir até alto da arena em percurso válido, mudar altitude e distância, perseguir/retirar, descer em mergulho para golpes e voltar ao voo sem teleporte ou drift. Preservar lock-on e câmera; evitar atravessar teto/rocha ou sair da zona jogável de forma não intencional.
- Animação real **`Upside_Down_Rope_Hang_1`** (fase II/III) deverá entrar na IA: procurar por **superfície física** no teto ou parede alta, aproximar de forma visível, ancorar respeitando normal e rotação, ficar de cabeça para baixo, conjurar, soltar e retomar voo. O contrato antigo informa que teto da arena da garganta está a ~80m e a lógica anterior abortava >18m: esse é o MOTIVO CONCRETO a corrigir, não apenas aumentar chance aleatória. Escolher uma zona acessível da parede/teto já existente, com colisão e câmera realmente funcionais; **não construir caverna vulcânica nem falso piso invisível**. Se for preciso adaptar arena da Ganância, coordenar ownership com Codex e integrar no módulo correto.
- A magia de 4 mini-sóis/bola de fogo pertence **exclusivamente ao estado pendurado na parede/teto**, não ao ataque comum do chão. Retomar fluxo aéreo depois de conjurar.

**Aceite:** vídeo sem invisibilidade, altitude variada, voo→ancoragem invertida→4 mini-sóis→retomada do voo, em arena real.

## Etapa 5 — Mini-sóis amarelo/dourados: escala e impacto do vídeo de 8,30s

- Aumentar **diâmetro aparente inicial 3 a 5 vezes**, calibrando com câmera/escala real e ajuste de hitbox/AoE proporcional, telegraph via animação (não aviso amarelo no piso), alcance e performance.
- Quatro mini-sóis lançados **um por vez**, conforme intenção já documentada, cada um com trajetória/duração e impacto autônomos. Não permitir orbes congelados. VFX **solar amarelo/branco/dourado**: núcleo intenso, superfície dinâmica, corona, arco energético, compressão no impacto, expansão de onda luminosa, fragmentos e distorção localizada. A referência de **8,30s** é EXCLUSIVA desse impacto; não pintar o ataque de roxo se não pertence à sua identidade.
- Screen shake relativo à distância e configurável, flash curto sem cegar, legibilidade e configurações de redução de movimento. Pool de partículas/impactos; evitar preencher tela inteira e derrubar FPS mobile.

**Aceite:** gravação de 4 impactos, sem orbes suspensos, cor e potência coerentes, comparação do efeito com referência.

## Etapa 6 — Criatura abissal: esfera vermelha formada DENTRO da boca, impacto do vídeo 5,85s

- **Não confundir com os mini-sóis**. Esta é a criatura colossal circular da DIMENSÃO DA GANÂNCIA. Fixar o emissor na **posição do interior da garganta/boca em espaço mundial**, atualizada conforme movimento/hierarquia e normal de lançamento. Validar com câmera lateral e frontal; não soltar esfera metros à frente da abertura.
- Construir progressão visível **semente pequena → acumulação/densificação vermelha → rachaduras e raios roxo-negros → crescimento contínuo até ~4× diâmetro atual → compressão e disparo**. O contrato antigo prevê carga 3,3s; ajustar duração para parecer **gradual**, e não aparecer pronta de repente. Fixar centro durante carga. Definir raio para evitar clipping com dentes sem deslocar a bola para frente.
- Velocidade de lançamento **~2 a 3 vezes a atual**, confirmada com medição de deslocamento/segundos no runtime. Implementar CCD/sweep para não atravessar o jogador no mobile. Aiming e antecipação justos, colisão e dano uma vez por evento. Aumentar o alcance/escala de impacto proporcional ao VFX.
- **Referência 5,85s** exclusivamente para colisão da esfera vermelha: núcleo rubro-violeta violentamente luminoso, anéis, estilhaços, raios, distorção, onda de choque e tremor controlado; **sem puff de fumaça**. Não editar `greed-abyss3d.js` se reservado ao Codex; use `greedAbyssAnchor`/VFX quando possível e peça coordenação na #519.

**Aceite:** três vistas do crescimento dentro da boca, disparo veloz, colisão de alto impacto e caso de erro/esquiva. Sem atravessar parede/jogador.

## Etapa 7 — Combos II/III e referência esgrima 13,26s

- Priorizar clips reais ainda ociosos (18 informados na II) e variar sequência conforme alcance, estado aéreo, oportunidade e defesa do jogador; conectar parry, cancel/recovery e dash via regras explícitas, sem cancelar todo clip por completo. Combos encadeados com janela de dano independente por slash; teste de parry, i-frames de esquiva e janela de recuperação.
- Para fase III, usar referência 13,26s na **qualidade** de cortes, velocidade, estela e ligação movimento→dano, não copiar assets ou usar explosão de outro poder. Variações observáveis em sessões diferentes, evitando sempre mesma abertura.
- Ganância agressiva, mas sem ataques impossíveis de ler ou ciclos infinitos sem chance de resposta. Expor métricas de seleção/uso dos clipes no QA.

**Aceite:** logs e vídeo com múltiplas animações nativas, 4+ variações de combo visíveis e nenhum golpe que falhe silenciosamente.

## Etapa 8 — Silhueta III: asas inferiores e chifres

- Auditar ossos e a hierarquia da fase II/III antes de escalar. Par original superior deve permanecer reconhecível; **`GananciaAsas2.glb` é um par INFERIOR**: prender em âncoras inferiores do dorso, sem sobrepor nem fundir às asas nativas. Calibrar proporção/espessura por silhueta e deformação durante batida, voo, parada, giro e mergulho.
- **Abrir as asas** com ângulos e folga visíveis; sem ficarem fechadas, muito grossas, atravessando capa ou duplicando. Chifres fase III claramente ampliados com escala anatômica e transição estável; documento antigo dizia ×2, verificar se o resultado ficou visível no modelo 3D e na câmera.
- Comparar 3/4, frontal, traseira, perfil em gameplay e transformação; não ocultar falhas com luz ou efeitos.

**Aceite:** imagens da silhueta III antes/depois, 2 pares bem separados em fases corretas e chifres maiores visíveis, sem regressões de rig.

## Etapa 9 — Fidelidade das artes PNG e iluminação só do boss

- Comparar **imagem Ganância I** contra `NewGanancia1.glb`; **imagem Ganância II alada** contra `NewGanancia2.glb` e forma III. Qualidade do modelo depende de geometria/texturas: **Three.js/iluminação não recriam detalhe que não existe na malha**. Primeiro auditar material, geometria, UV, resolução/cores, normais, transparência, escala e pose; não prometer semelhança literal impossível sem novos assets.
- Melhorar apresentação de olhos vermelhos, dentes/sorriso, chifres, cabelo, roupa preta e bordas rubras/douradas, joias, cape layering e penas com PBR coerente, microdetalhe quando disponível e contraste localizado. Nunca substituir o modelo por plano 2D.
- Arena permanece escura e sinistra; destacar **o próprio chefe** com luz focal/rim/fill ou emissive local e exposição controlada, sem lavar a sala toda, estourar vermelho ou detonar draw calls. Se houver opção acessível, configurar qualidade para mobile e limitar luz/sombra adicional.
- Gerar comparação com a arte, captura 3D em rotação e cena real de combate onde detalhes do boss sejam legíveis na tela touch.

**Aceite:** referência PNG e gameplay pareados, melhorias comprovadas em silhueta, rosto, textura, metal, joias e asas, com orçamento de renderização preservado.

## Nota de pesquisa técnica validada — não substitui inspeção do runtime

- **Three.js Animation System / AnimationMixer / AnimationAction:** a documentação oficial confirma clips, tracks, crossfades, pesos e sincronização. Aplicar state machine por fase, transições com fade e eventos de hit sincronizados aos movimentos, em vez de reprodução isolada ou cancelamentos descontrolados. Fonte: https://threejs.org/manual/pages/animation-system.html e https://threejs.org/docs/pages/AnimationMixer.html.
- **Raycaster:** a API oficial permite localizar superfícies/obstáculos por interseção em objetos 3D; raycast detecta superfícies, mas **não substitui teste físico de colisão contínua** de projéteis velozes. Usar para âncora real teto/parede, verificação de visada e posição da boca. Fonte: https://threejs.org/docs/pages/Raycaster.html.
- **MeshStandardMaterial (PBR):** a documentação oficial descreve metalness, roughness e resposta realista a luz, com maior custo que materiais simples. Ajustar materiais/ambiente do boss antes de somar luzes e bloom; nenhuma dessas técnicas recupera detalhes geométricos ausentes do GLB. Fonte: https://threejs.org/docs/pages/MeshStandardMaterial.html.
- **Pesquisa complementar obrigatória do Claude:** estudar soluções atuais de combo-buffer, cancel windows, hit registration multi-hit, swept collision de armas/projéteis, máquina de estados de bosses aéreos e VFX em camadas; buscar demonstrações de jogos/estudos e documentação relevante, comparar com hardware mobile e registrar referências técnicas verificáveis na PR. Não afirmar que existe um vídeo/referência acessível sem realmente o ter examinado.

## Critério de avanço fase a fase e QA verificável

1. Trabalhar **em ordem das etapas 1–9**, salvo dependência técnica que exigir corrigir etapa base antes; registrar o porquê na PR, sem pular silenciosamente. Para cada etapa: problema reproduzido → causa → patch real → teste de regressão → vídeo/fotos da cena real → avaliação contra referência → refino.
2. Criar PR(s) de escopo coerente, preferindo integração incremental e evitando branch eterna. **Não mesclar sem autorização do líder/criador e sem QA relevante**. Se a fase falhar, continuar corrigindo na mesma PR; não dizer que está pronta por CI verde. A meta de “>=80%” é comparação estética rubrica/feedback do criador e **não percentagem matemática automática**.
3. QA obrigatório mobile (852×393 e aparelho físico quando disponível), luta completa I→II→III, entradas/saídas, salvamento, dash, escudo, knockback, esquiva, projéteis de alta velocidade, câmera, leak de objetos/efeitos, console, draw calls e custo de shader. Evitar ajustes que desabilitem checks, asserts ou simplifiquem recursos só para passar.
4. Não consumir créditos de serviços pagos/novos assets externos sem autorização; não copiar arquivos, música ou animação de terceiros. Referências são direção artística e dinâmica, não autorização para reproduzir arquivos protegidos.
5. Referências técnicas oficiais a consultar para implementação fundamentada:
   - `https://threejs.org/manual/pages/animation-system.html` — clip, mixer, peso, tempo, eventos.
   - `https://threejs.org/docs/pages/AnimationMixer` — atualização por delta e gestão de ações.
   - `https://threejs.org/docs/pages/Raycaster` — interseção de cenário, teto/parede, visada.
   - `https://threejs.org/docs/pages/MeshStandardMaterial.html` — materiais PBR, metalness, roughness, emissive.
6. Se faltarem arquivos ou clips, verificar repositório, manifest e os anexos efetivamente recebidos no Claude; apontar ausência objetiva **na PR**. Não interpretar falta de referência como autorização para inventar, nem deixar simplesmente sem implementar as partes independentes.

**Condição de conclusão:** etapas testadas e validadas visualmente, comparativos vinculados à PR, nenhum defeito novo conhecido, e revisão artística do criador pendente apenas quando explicitamente identificada. **Silêncio no chat; as provas ficam no GitHub.**
