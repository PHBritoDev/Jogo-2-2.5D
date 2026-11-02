# AJUSTES TEMPORÁRIOS DA MOD 262 — VORGAZHEK (BISPO 2)
## MISSÃO: elevar a fidelidade visual da aura, escalonar a explosão e acrescentar chamas negras à espada

**Este é um briefing TEMPORÁRIO e de implementação, não um relatório.** O criador testou a Ultimate Mod 262: gostou do conjunto, mas identificou três problemas específicos. **Altere somente o necessário, preservando a espada cósmica, três círculos, ritmo e câmeras bem-sucedidos, skill 1, skill 3 e Eclipse da Dívida.** Não recrie a dimensão, não altere outros chefes. Depois de implementar/testar/merge seguro, **APAGUE ESTE ARQUIVO TEMPORÁRIO** no mesmo PR/commit de limpeza ou num commit seguinte. Evite mensagens de progresso ao usuário; não despeje implementação no chat.

**Repositório:** PHBritoDev/Jogo-2-2.5D, branch principal main. A PR #353 já incorporou a Mod 262, e o arquivo temporário original da Mod 262 foi removido. Faça uma inspeção FRESCA na main antes de editar; este briefing não substitui o código vivo.

### Arquivos concretos para inspecionar antes de editar
- \`vorgazhek-ultimate3d.js\` — fases \`boss_aura\`, \`circle_build\`, \`sword_emerge_and_fall\`, \`impact_and_return\`. Cabeçalho atual ainda descreve **"duas criaturas colossais"** e o contato como detonação imediata: corrigir ambos.
- \`vorgazhek-cosmic-sword3d.js\` — construtor \`buildCosmicSword\`, materiais da lâmina, movimento dos GLB/rigs e versão gigante com clipping.
- \`mundo-3d-prototype.js\` — render/update real da ultimate, ligação ao boss/arma, controles, câmera, VFX, carga e cleanup.
- \`powers3d.js\` / \`ultimates3d.js\` — integração e impedimento de poderes genéricos do Bispo 2; só tocar se realmente necessário.
- \`vorgazhek-eclipse-sword3d.js\` — compatibilidade do especial com a MESMA espada e as chamas.
Inspecione as classes/funções reais e os módulos auxiliares antes de assumir onde efeitos estão desenhados.

## A. REFERÊNCIA PRINCIPAL: PRESENÇA VERMELHA GIGANTE — NÃO CRIAR "BICHO COM ESPINHO"

**Referência do criador:** imagem enviada no chat (arquivo \`1000363031.jpg\`), um painel vertical vermelho com uma figura humana pequena e uma manifestação colossal atrás/diante dela. Pode não estar acessível nesta sessão do Claude; **não afirme tê-la visto sem acesso**. Descrição fiel da composição:
- Vermelho sangue ocupando quase TODO o quadro; densas **linhas negras longas de velocidade/pressão** convergindo vertical e diagonalmente.
- O rosto gigantesco é **SUGERIDO POR LUZ E ESPAÇO NEGATIVO**: **duas formas brancas afiladas e inclinadas no alto** lembrando olhos/rasgos; abaixo, uma **fenda branca enorme, curva e agressiva**, lembrando um sorriso/mandíbula, dominando a largura da cena. Não há cabeça humana anatômica rígida nem dentes sólidos individuais obrigatórios.
- A luz branco-rosada parece **rasgar** a energia vermelha, com bordas quentes e fluxo direcional. Sensação de horror, escala colossal, velocidade e superioridade opressiva. Silhueta do Bispo em primeiro plano: minúscula perante o fenômeno.
- **O desenho depende da COMPOSIÇÃO** (áreas brancas gigantes + vermelho escuro + raias negras), NÃO de um modelo 3D de demônio.

### Instrução ANTIGENÉRICO obrigatória
**Não fazer:** duas criaturas atrás do boss; cabeças com espinhos; chifres e dentes aleatórios; esqueletos de mesh; massa dura, rock, metal ou "matéria preta" rígida; dois olhos flutuando num bloco; fumaça/neblina sem desenho; esculturas de demônio convencionais; boneco low-poly; spikes para simular ameaça. Se aparecer esse resultado, **reprovar e iterar**.

**Fazer:** uma ÚNICA **presença/manifestação sobrenatural gigante** que se estende atrás e acima do Bispo. Construir um sistema de **camadas de energia e luz**, não um NPC/entidade física:
1. Fundo volumétrico rubro/escuro com gradiente orientado, pulsação e leve distorção; não deve virar uma placa vermelha plana que tapa cenário sem profundidade.
2. **Máscaras de espaço negativo** branco-quente, com bordas de luz recortadas para compor dois grandes rasgos superiores e uma fenda curva inferior. Evite olhos anatômicos, pupilas, bocas modeladas ou contornos duros. Curvas/ribbons parametrizadas em **world-space**, em 2–4 planos de profundidade, com orientação controlada pela câmera CINEMATOGRÁFICA, evitando billboard chapado visível de lado.
3. **Feixes/riscos negros finos e longos**, radiais ou direcionais, que esticam com a carga, mais pequenas línguas de energia vermelha ascendentes. Distribuição ARTÍSTICA organizada e com silhueta, não partículas randômicas amontoadas.
4. Fazer o recorte dos "olhos" e "sorriso" nascer por revelação temporal da própria energia em vez de fazê-los brotar como objetos completos. Crescer/ocupar campo de visão com easing e terminar no clímax da fase 1.
5. Ajustar posição, largura angular, altura e escala à câmera baixa 3/4 da fase 1, sem esconder a espada nem a pose do Bispo. Evitar brilho branco que estoure o frame inteiro ou contamine permanentemente exposição da arena.
6. Se desejar, usar GLSL \`ShaderMaterial\` com **shape mask/signed-distance das fendas + UV/domain warping suave + emission controlado**, ribbon geometry e vetores de fluxo. O ponto importante NÃO é o nome da técnica: **o resultado precisa ter a forma da referência**.

**Teste obrigatório:** screenshots nos tempos ~0,8 s, ~2,0 s e ~3,2 s da fase 1; comparar silhueta/escala com a referência descrita. Se parecer "cabeça espinhosa" em qualquer qualidade (Low/Auto/High), corrigir. Durante transição de câmera, limpar ou ocultar o fenômeno sem deixar céu/overlay contaminado.

## B. EXPLOSÃO NASCENDO DO PONTO DE CONTATO — NÃO DETONAR TODAS AS CAMADAS NO MESMO FRAME

**Evidência no vídeo enviado pelo criador (\`1000363034.mp4\`, ~15,2 s):** a espada chega ao chão perto de ~12 s; a explosão grande aparece rapidamente a partir daí, sem a formação escalonada desejada. O vídeo não está garantidamente na sessão do Claude: não alegar visualização se inacessível.

Em \`impact_and_return\` (atualmente 3,2 s), implementar um **subestado visual com linha de tempo única**, mantendo câmera tremida/controls/impacto/dano/fade corretos:
- **t=0,00–0,12 s — CONTATO:** ponta encosta/penetra o chão no alvo fixo; tranco direcional de câmera, som seco grave, microfreeze/hit-stop existentes e uma PEQUENA fissura/marca e faísca luminosa concentrada. **Ainda NÃO criar anéis gigantes, domo nem clarão máximo.**
- **t≈0,12–0,55 s — COMPRESSÃO:** energia concentrada cresce de dentro do chão/lâmina em camadas: fenda no solo, fissuras luminosas e rochas vibrando. Núcleo inicialmente pequeno, brilhante e claramente definido; linhas de energia convergem para o epicentro.
- **t≈0,55–1,05 s — FORMAÇÃO:** núcleo eleva-se/abre e revela sua forma; paredes de energia ganham espessura progressivamente; primeiro halo e microondas passam a se expandir, pedras começam a erguer. **Mostrar o nascimento da explosão, não dar visible=true num objeto pronto em escala máxima.**
- **t≈1,05–1,80 s — DETONAÇÃO:** *agora* anéis/ondas de choque 1→2→3 com atrasos distintos, domo volumétrico, blocos de chão em direção radial, energia branca-amarela no centro e luz que ilumina a arena. Som e shake secundário seguem a propagação.
- **t≈1,80–3,20 s — CAUDA E RETORNO:** vento, resíduo de energia, decaimento do shake, clarão/whiteout e fade que restaura a arena. Ajustar \`whiteAt\`/fade para que o jogador VEJA a explosão se formar e abrir antes do branco; jamais branca tela engolindo o espetáculo cedo demais.
Durações acima são **valores iniciais**, calibrar pelo vídeo e pelo FPS no Android sem passar significativamente da janela total de 3,2 s. A identidade é CONTATO → COMPRESSÃO → FORMAÇÃO → DETONAÇÃO → DISSIPAÇÃO. Não apenas fazer fade-in de uma bola enorme: **geometria, opacidade, massa luminosa e propagação** devem ter estágios diferentes, além de núcleos ancorados ao chão.

**Gameplay:** manter ponto de impacto no chão, raio visual coerente, janela de esquiva, i-frames, dano válido uma vez no evento de choque definido, não múltiplas aplicações; evitar matar automaticamente quem saiu da área. Hit-stop real de ~0,11 s não deve travar relógio de cleanup. Câmera só recebe tranco no contato e tremor que decai, não treme brutalmente durante todo efeito. Uma única máquina de estados/timeline; sem setTimeout órfão e sem resíduos.

## C. CHAMAS NEGRAS NA ESPADA — FOGO FLUIDO, NÃO FUMAÇA OU LODO RÍGIDO

**Referência do criador:** \`1000363037.jpg\`: silhueta de chamas negras brilhantes sobre branco, **línguas fluidas, longas, onduladas**, pontas finíssimas que sobem e se retorcem; **contornos cinza/prata** distinguem cada língua. Não é fumaça esfumaçada, massa pétrea, espinhos nem "blob" opaco estático.

- Fixar chamas na lâmina e guarda da **MESMA ESPADA CÓSMICA PERMANENTE** (na mão do Bispo), sem flutuar fora da arma ao andar, cast ou atacar. Reusar parametrização/material no clone da ESPADA GIGANTE da ultimate, com escala e custo de performance adequados.
- **Base ligada à superfície da espada**, língua se alonga e afina para cima/para trás seguindo o vento e movimento da lâmina. Contornos irregulares suaves e afilados, espirais e divisões secundárias. Movimento contínuo de circulação/ascensão, turbulência com coerência temporal (domain warp, flow map ou curvas de spline atualizadas), sem teleporte de partículas entre frames.
- **Silhueta de fogo é a prioridade.** Máscara de chama com base larga e topo fino; noise/FBM somente distorce o interior/contorno; sozinho o noise parece fumaça/cloud. Um núcleo preto profundo com borda prateada/cinza fria e raras fissuras luminosas sutis, de forma que seja visível no fundo escuro. Evitar paleta vermelha genérica e evitar emissive branco em toda a superfície.
- Construção sugerida para Three.js/WebGL celular: ribbons finos em torno do eixo da lâmina, 2–3 camadas com \`ShaderMaterial\` e alpha mask OU geometria procedural com gradiente, não dezenas de partículas e luzes. Priorizar silhouette em Low. Sem 50 planos espelhados, overdraw massivo, raymarching caro ou alterações de escala dos GLBs.
- **Cuidado de legibilidade:** cavidade galáctica, núcleo espiral, contorno da lâmina e guarda continuam visíveis; a chama NÃO vira uma segunda espada enorme ou cobre o céu.
- Testar idle, andar, ataque, Eclipse da Dívida, pose de cast, fim da ultimate e reset/dimensão, inclusive LOD e escala do rig; fogo deve desligar e ser disposed corretamente ao destruir a instância.

## D. PESQUISAR REFERÊNCIAS VISUAIS E TÉCNICAS ANTES DE IMPLEMENTAR (REQUISITO)
**Não invente que pesquisou:** abra/estude exemplos reais, guarde links em PR e escolha técnica aplicável a Three.js (as referências não autorizam copiar artes/assets protegidos).

Referências úteis para começar:
- Guia de VFX de League of Legends (formas/contraste/tempo, antecipação e dissipação): https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf
- Riot Games: clareza de efeitos e comunicação do gameplay: https://www.riotgames.com/it/artedu/visual-effects
- Referência de Three.js/GLSL: máscara de chama + deformação por noise + fluxo vertical (estude técnicas, não reutilize assets sem licença): https://github.com/cpl121/fire-shader
- Demonstração de forma versus noise para fogo procedural: https://easymaking.io/shader-lab/31-fire
- Princípios de antecipação/impacto/dissipação: https://www.gamedeveloper.com/design/principles-of-virtual-sensation
Pesquise também imagens/vídeos como **"manga red white negative-space demon aura eye slashes speed lines", "stylized curse flame shader black fire silver edge", "anime ultimate impact anticipation compression explosion formation"**. *Não* reduzir pesquisa a imagem estática de crânio/demônio ou sprite de chamas; buscar linguagem visual e decomposição da animação.

**Processo de qualidade:** identificar 3–5 referências, extrair silhueta/camadas/timing, criar implementação mínima, capturar screenshots/vídeo do estado real e **comparar** à referência (não declarar "ficou igual" só porque o código compila). Corrigir até eliminar espinhos, massa dura, blobs e detonação única. Caso não possa pesquisar/ver o resultado visual, declarar limitação técnica no PR, NÃO afirmar aprovação visual.

## E. COMPATIBILIDADE / REGRESSÃO
- Preservar todos os poderes autorais já prontos: Skill1 Tornados, Skill3 Portais/Espadas, Especial Eclipse da Dívida e Ultimate em quatro fases. Skill2 continua reservada. Remover qualquer fallback genérico ainda ligado ao Bispo 2; **não** remover poderes compartilhados de outros chefes.
- Não alterar dano/hitboxes/AI/camera/HUD fora da correção necessária.
- Sem segurar câmera, joystick, FOV, exposição, áudio, slowMo ou overlays após terminar/abortar. FPS e memória razoáveis no Android.
- Verificar cache/loader/marcador de versão se código alterou; número exibido deve corresponder ao efeito realmente carregado. Incremento da Mod a critério da implementação — não mentir sobre mudança visível se não testada.
- Testar \`?testeDimensao=bishop2\`, interações de hit/miss, morte/interrupção, queda de FPS, versão Low e alta. Fazer PR, passar lint/testes, merge somente se seguro, depois remover **este arquivo temporário**; não remover as imagens de referência originais do usuário de lugar nenhum (não estão neste repositório).
- Evitar spam de chat; o criador prefere que você trabalhe diretamente nos arquivos e que o briefing temporário desapareça quando concluir.

## CRITÉRIO FINAL IRRENUNCIÁVEL
**A aura deve parecer uma presença esmagadora feita de vermelho, rasgos brancos e pressão visual; NUNCA dois bichos sólidos/espinhentos. A explosão deve visivelmente NASCER depois do toque no solo. A espada deve pegar fogo NEGRO com línguas fluidas e contorno legível, NUNCA fumaça ou matéria rígida.**