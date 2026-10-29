# MISSÃO CODEX — MOD 231+ | RITOS DE ESPADA, COMBOS AUTORAIS E 2 HABILIDADES EXCLUSIVAS
> **BRIEFING TEMPORÁRIO. LEIA ESTE ARQUIVO INTEGRALMENTE ANTES DE QUALQUER ALTERAÇÃO.**
> Repositório: https://github.com/PHBritoDev/Jogo-2-2.5D · branch de produção `main`.
> Criador: deseja uma entrega completa, polida, original, cinematográfica, jogável em Android; **não quer protótipos genéricos**.
> **Silêncio durante a execução:** não envie atualizações parciais, perguntas de rotina ou relatórios intermediários. Trabalhe até a entrega; ao final, responda com resumo objetivo de poucas linhas e link de teste. Se houver bloqueio real que exija intervenção do criador, explique-o apenas nesse caso.

## 0. REFERÊNCIAS QUE O CRIADOR ENVIARÁ DIRETAMENTE A VOCÊ
O criador anexará **a imagem principal** (colagem de cortes estilizados em dourado, vermelho, preto, violeta e eletricidade) e o ZIP **`referencias_vfx_espada.zip`** com:
- `catalogo_11_tipos.png`
- `prancha_6_efeitos.png`
- `01_corte_crescente.png`
- `02_corte_ascendente.png`
- `03_corte_x.png`
- `04_impacto_vertical.png`
- `05_corte_vortice.png`
- `06_onda_cortante.png`

**Primeiro, inspecione todas as imagens e o ZIP.** Extraia características de forma, espessura, perspectiva, contraste, direção, ritmo, brilho, impacto, rastro e linguagem de pincelada. **Não cole as imagens como sprites planos em frente à câmera.** Reinterprete-as em VFX 3D originais com geometria, shader e movimento real. Não copie personagens, marcas, textos japoneses, símbolos protegidos ou quadros exatos; a referência é a **linguagem visual**. Imagens e ZIP serão enviados no chat pelo criador: não presuma que já estão no repositório. Se estiverem indisponíveis, solicite-os somente se for bloqueio real.

## 1. REGRA ABSOLUTA DE ESCOPO — SOMENTE AS DUAS ESPADAS INICIAIS
O criador diz "duas espadas" porque quer trabalhar **agora somente com**:
1. **Espada do Chamado** — ID `prota` (inicial, `EspadaProta.glb`).
2. **Lâmina da Aurora** — ID `aurora` (adquirida na loja; modelo procedural `buildAuroraSword`).

**Atenção: o código contém QUATRO IDs de espada**, `prota`, `aurora`, `vigilia`, `celeste`, em `progression3d.js`. Não confunda a intenção do criador com a quantidade técnica. **NÃO aplique o novo sistema visual/skills às espadas `vigilia` e `celeste` neste trabalho; não as exclua nem quebre.** A terceira espada com este novo kit será decidida futuramente. Não adicionar terceira espada agora.

As duas primeiras espadas **compartilham a mesma família visual de ritos/cortes**, com variações de cor e intensidade coerentes com a identidade de cada arma; **não precisam repetir literalmente as mesmas animações de golpe**. Cada uma recebe **uma habilidade ativa própria e diferente**, independente das quatro magias existentes.

### ESCLARECIMENTO DO CRIADOR — ESPADAS, BOTÃO E ANIMAÇÕES EXISTENTES (28/10/2026)
- Confirmado: as duas espadas em foco são **a espada inicial do protagonista (Espada do Chamado, `prota`)** e **a espada que o jogador pode comprar na loja (Lâmina da Aurora, `aurora`)**. O fato de existirem outras armas cadastradas não amplia este escopo. A espada comprada deve continuar exigindo sua compra/desbloqueio normal.
- **SIM, cada habilidade especial de espada deve ser ATIVADA PELO JOGADOR APERTANDO UM BOTÃO** (HUD mobile e atalho no PC). O botão contextual usa a habilidade da espada atualmente equipada. **O botão GOLPE continua sendo para ataques básicos e combos**, sem ativar automaticamente a skill especial. Mostrar custo, cooldown, bloqueio e nome da habilidade. As duas skills são diferentes.
- O jogo **já tem animações/gestos básicos de ataque genéricos** (sejam clipes, fallback ou movimentação procedural). **Codex está AUTORIZADO a substituir/remover os movimentos genéricos** se necessário para entregar animações de espada profissionais, **ou aproveitar a infraestrutura útil** (mixer, transições, input, combo, colisão, cooldown, dano, áudio, VFX). Não preservar animações ruins só por existirem. Não excluir mecanismos de combate úteis nem remover clipes originais sem backup. A substituição precisa ser visualmente verificável e manter ataque funcional.
- O criador quer **animações novas específicas para combate com espada**, com o corpo todo participando; reutilizar parte das animações antigas somente se melhoradas e coerentes. As mesmas animações de espada podem servir como base para **as skills especiais**, com movimentos exclusivos nos momentos cinematográficos.
- Não confundir **efeitos de cortes dos golpes básicos** (automáticos a cada toque em GOLPE) com **habilidades especiais** (só ao apertar o botão próprio).

## 2. AUDITORIA OBRIGATÓRIA ANTES DE IMPLEMENTAR
- Ler a `main` atual, histórico recente e dependências; não assumir que este briefing descreve todo o estado do repositório.
- Ler: `mundo-3d-prototype.js`, `mundo-3d-prototype.html`, `progression3d.js`, `skills3d.js`, `mod181-loader.js`, código de câmera, input, combate, HUD, save, loja e efeitos existentes.
- Ler **`docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`** e o PR #49 antes de alterar rigs/animações. Nunca reintroduzir o bug de personagem gigante.
- Inspecionar **de fato** `Protagonista.glb` e todos os arquivos de animação relacionados. Inventariar nome, duração, canais, ossos, escalas, root motion e adequação de cada clipe. A auditoria anterior listou seis clipes (Idle, Walk, Lift Air Hit Right, Hit Knockback, Overhand Throw, Kip Up) e **nenhum ataque de espada confiável**; o jogo tenta `attack1`/`attack2` e pode não ter clipes. Verificar novamente o GLB real; não afirmar que já há duas animações sem evidência.
- O golpe atual é `tryPlayerAttack()`; seleção `selectDimensionAttack()`; VFX antigo `spawnSlashTrail()`; combo `nextComboStep()`; dano usa `SWORDS[equippedSword]`. A espada equipada usa `equipSword()`. Não confiar só em `actions.attack` sem conferir a ação real.
- O sistema de habilidades `magic`, `magic2`, `magic3`, `ultimate` é **separado** das duas novas habilidades de espada. Preservá-lo por completo.
- Criar branch isolada e backup/checkpoint antes das mudanças. Implementar com arquitetura modular e PR, sem sobrescrever trabalho recente de outras IAs. Se `main` avançar, reconciliar.

## 3. VISÃO ARTÍSTICA — RITOS DE CORTE NÃO GENÉRICOS
O objetivo não é um simples arco branco nem um `RingGeometry` girando: cada golpe precisa **nascer do fio real da espada, acompanhar a cinemática da lâmina e deixar uma assinatura espacial**.

Vocabulário visual desejado:
- Crescentes agressivos com espessura variável e extremidades afiadas, linhas secundárias e bordas luminosas;
- Golpes ascendentes, diagonais, horizontais, em X, cruzados, vorticais e ondas cortantes;
- Trilhas duplas/triplas, contornos rasgados, filamentos elétricos discretos, pequenas fissuras luminosas, partículas arrancadas, fragmentos e pós-imagens;
- Rastro principal com **núcleo de alta luminância + halo colorido + contorno escuro contrastante** onde fizer sentido, sem virar uma mancha que esconda o personagem;
- Golpes fisicamente conectados à direção do movimento; diferenças visíveis entre antecipação, aceleração, contato e dissipação;
- Variação de forma, amplitude, duração e trajetória conforme golpe; impacto com microparada de tempo (hit-stop), flash localizado, faíscas, onda curta, som e reação do alvo, sem câmera tremendo constantemente.

**Direção de cor:** `prota`: dourado/branco celestial com contorno quente; `aurora`: assinatura escarlate/preto com detalhes violeta e relâmpagos muito sutis, inspirada nas referências vermelhas. Se a identidade narrativa/cor atual da Aurora contradisser isso, adaptar sem descaracterizar a espada e documentar a decisão; manter os efeitos de ataque da mesma família estética. Não aplicar estética sombria às quatro magias nem às armas de outros personagens.

**Técnica preferencial:** amostragem da transformação do fio/ponta da lâmina durante animação, trilhas de malha orientadas em mundo 3D (ribbon mesh com largura variável), curvas paramétricas e `BufferGeometry` atualizado com buffers reutilizáveis, shader GLSL de gradiente/erosão/ruído temporal, múltiplas camadas controladas, `InstancedMesh` e pools de partículas. Shader original em vez de imagens 2D genéricas; evitar `setTimeout` para hitboxes e efeitos. Sem bloom global obrigatório. Otimizar draw calls e transparência em Android.

## 4. ANIMAÇÕES DE ESPADA AUTORAIS — NÃO REPETIR UM GOLPE PARA SEMPRE
Criar/importar/retargetar clipes reais compatíveis com o esqueleto do protagonista e sua espada. O criador autoriza **melhorar animações existentes e criar novas**. Não aceitar simples giro do `swordPivot` como substituto da animação corporal; tronco, ombro, braços, quadril, pernas, apoio dos pés e empunhadura devem participar. Priorizar qualidade sobre quantidade, mas entregar um conjunto real, visivelmente variado:
- Combo básico de **pelo menos 3 golpes diferentes**: horizontal/crescente, diagonal reverso, finalizador ascendente ou cruzado;
- Golpes opcionais de avanço/estocada, ataque em corrida, transição suave para idle/andar e recuperação após combo;
- Ao tocar GOLPE repetidamente dentro da janela de combo, **o protagonista pode avançar em passos curtos controlados**, desde que não atravesse inimigos/obstáculos nem altere bruscamente a câmera;
- Janela de input/buffering pequena, cancelamentos coerentes para dash, defesa, hit, morte, pausa, cutscene, troca de arma; evitar spam que interrompa todas as animações no primeiro frame;
- Animações diferentes ou combinações de clipes distintas para `prota` e `aurora` são bem-vindas, mas o esqueleto, o combate e a física precisam continuar estáveis;
- Não causar deslizamento dos pés, teleporte involuntário, espada fora da mão, braços torcidos, salto falso, ataques sem hit ou hits fora da trajetória.

**Ferramentas e pesquisa:** inspecionar `glTF`/GLB com `@gltf-transform/core` ou equivalente; usar Blender 5.x em modo headless/`bpy` para criar/ajustar/exportar clipes, constraints, IK/FK, keyframes, curvas e bake; retargeting somente com correspondência correta de ossos, rest pose e escala. Pesquisar documentação oficial do Blender, glTF/Three.js `AnimationMixer`, `AnimationAction`, `PropertyBinding`, skinning, root motion, animation blending e recursos de VFX de jogos. **Pesquisa quando houver dúvida é obrigatória; não improvisar APIs.** Se Blender ou retarget não estiverem disponíveis, investigar alternativas reais e registrar limite, sem fingir animação pronta. Não substituir `Protagonista.glb` por modelo genérico nem alterar identidade/escala do herói.

## 5. HABILIDADE DA ESPADA 1 — "PASSAGEM DO JULGAMENTO" (ESPADA DO CHAMADO)
**Referência principal:** segunda cena da colagem: personagem cruzando o alvo em altíssima velocidade, seguido por muitos cortes simultâneos; usar também `03_corte_x.png`, `01_corte_crescente.png` e `04_impacto_vertical.png`.

Coreografia sugerida (aprimorável sem perder a essência):
1. Herói abaixa o centro de gravidade, espada concentra luz em um fio finíssimo; alvo válido é marcado por um instante.
2. Deslocamento **extremamente rápido e legível** através/ao lado do inimigo, finalizando **atrás dele**; não atravessar paredes nem sair do mapa. Trajeto com rastros de deslocamento, pós-imagens e linha luminosa cortante.
3. Pequena pausa dramática (fração de segundo); o inimigo parece imóvel por um instante.
4. **Múltiplos cortes surgem ao redor e através da silhueta do inimigo**, em direções diferentes, incluindo X, diagonais e um último corte maior; as linhas têm profundidade e ordem de revelação, não são uma imagem plana colada à tela.
5. Conclusão com impacto sincronizado, partículas, som seco e recuperação elegante do herói já atrás do inimigo.

**Dano:** autoritativo, uma sequência de hits definidos por eventos da animação; sem multiplicar dano por FPS, sem acertar outros inimigos por engano, sem dano em alvo morto. Balancear com progressão, cooldown, custo, invulnerabilidade/cancelamento e risco. Em chefes grandes ou protegidos, **não teletransportar através do corpo**; posicionar em ponto seguro atrás/lateral e preservar colisão. Se não houver alvo, comportamento seguro (não atravessar o cenário).

## 6. HABILIDADE DA ESPADA 2 — "ECLIPSE DAS LÂMINAS" (LÂMINA DA AURORA)
**Referência principal:** os grandes cortes vermelho/preto/violeta da colagem, especialmente `05_corte_vortice.png`, `06_onda_cortante.png`, `02_corte_ascendente.png` e os painéis inferiores.

Coreografia sugerida:
1. Herói arma a espada, energia escarlate escurece ao redor do fio e deixa arcos de luz elétrica violeta.
2. Executa uma **sequência corporal convincente de golpes amplos** (horizontal, ascendente, diagonal, cruzado) que lança **grandes ondas cortantes em vermelho e preto** à frente.
3. Os cortes percorrem **alcance grande** em trajetórias legíveis, com espessura e profundidade 3D, variação de velocidade e pequenas distorções. Devem acertar inimigos dentro de volumes definidos; não são só cosméticos.
4. Finalizador maior: X/crescente/vórtice com choque no ponto de contato, partículas e uma breve dissipação. Sem transformar tudo num borrão vermelho ou ocultar o inimigo o tempo inteiro.

**Dano:** colisão contínua ou sweep de volumes para projéteis rápidos, limites de hits por onda, atenuação por distância se adequado, limites de alcance, obstáculos, bosses, custo e cooldown próprios. Não criar efeito de "cortes infinitos" por hit duplicado.

**Distinção essencial:** espada 1 = **velocidade extrema + aparecer atrás + chuva de cortes no alvo**. Espada 2 = **golpes físicos encadeados + ondas enormes de cortes vermelho/preto de longo alcance**. As duas compartilham a qualidade dos ritos básicos, não a mesma habilidade.

## 7. INTEGRAÇÃO COM JOGO, UI, LOJA E SAVE
- Uma skill exclusiva por espada, liberada ao possuir/equipar a respectiva arma. **Espada inicial já vem equipada**; Aurora segue desbloqueio/compra existentes. Não liberar armas da campanha de graça fora de modo de teste.
- Definir um **único botão contextual "HABILIDADE DA ESPADA"** na HUD mobile, com ícone, cooldown, feedback e indicação de qual skill está ativa; no PC atalho claro (sem conflito com teclas existentes). O botão troca automaticamente quando o jogador equipa `prota`/`aurora`. Para `vigilia`/`celeste`, ocultar/desativar apenas a skill exclusiva sem alterar seus golpes existentes. Não roubar os botões `magic`/`magic2`/`magic3`/`ultimate`.
- Custos e cooldowns: propor números equilibrados após verificar HP de inimigos, mana, progressão, animações e DPS; justificar sucintamente no documento técnico, não criar poderes infinitos. Mostrar mana/cooldown/estado.
- Preservar save existente, compras, inventário, troca de armas, teleporte, mapa, quests, chefes, stamina/corações, câmera em 1ª/3ª pessoa, Android touch e teclado. Nenhuma migração destrutiva.
- VFX do golpe básico só para as duas espadas pedidas; outras armas e inimigos não herdam efeitos por acidente.
- Não alterar a Fênix/tornado, Chuva de Estrelas, Ultimate White Hole, bosses, clima, missões nem animações de NPCs. Mudanças periféricas só se estritamente necessárias à integração.

## 8. ARQUITETURA DE QUALIDADE
- Separar simulação de combate, sistema de animação, estado das skills e VFX. Usar módulos próprios e API pequena, evitando crescer ainda mais o arquivo monolítico.
- Eventos determinísticos de animação para janelas de hit; `dt` com limite para não perder contato em FPS baixo; sweep tests em vez de amostrar apenas a posição final; hit registries por ataque; estado de combo explícito; pausas/cancelamentos e cleanup.
- VFX em coordenadas do mundo ancorados no punho/espada e câmera; não fixar efeito à tela. Compatibilidade 1ª pessoa sem obstruir visão.
- Partículas instanciadas, geometrias compartilhadas, `dispose()` correto, zero vazamentos em 50+ casts, LOD/presets baixo/médio/alto. Reduzir partículas e pós-processamento antes de reduzir legibilidade. Evitar alocação por frame.
- Sonoplastia responsiva com sistema de áudio já existente, sem downloads externos não autorizados; impactos sincronizados aos frames de acerto.
- Se a referência exigir solução tecnicamente inviável em Android, criar uma interpretação visual equivalente e eficiente, **não trocar por círculos/planos genéricos**.

## 9. TESTES E CRITÉRIOS DE ACEITE — NÃO ENCERRAR SÓ PORQUE COMPILA
1. **Inspeção de GLB comprovada:** listar os clipes reais e origem dos novos; conferir que ao menos 3 golpes distintos aparecem no personagem e a espada acompanha a mão.
2. **Combos:** toque simples, duplo, triplo, spam, passo à frente, ataque em movimento, ataque perto de parede, colisão com boss, troca de arma, bloqueio, dash, hit, morte, pausa.
3. **VFX:** cada golpe tem arco ligado à lâmina; cortes visivelmente diferentes; efeitos próprios apenas nas duas espadas; qualidade alta sem cobrir o jogo; visibilidade no cenário noturno.
4. **Skill 1:** ultrapassa/contorna o inimigo com segurança, termina atrás, múltiplos cortes e impacto; funciona em alvo pequeno/grande; não atravessa cenário.
5. **Skill 2:** ondas grandes e profundas vermelho/preto, alcance real, hits corretos, sem dano repetido indevido; obstáculos e alvo móvel.
6. **Compatibilidade:** quatro magias, Fênix, loja, save, inventário, progresso, inimigos, boss, portal e controles permanecem funcionais.
7. **Performance:** testes em 30/60/120 FPS simulados, screenshot/vídeo da execução real no navegador, sem exceções JS/WebGL; se não houver Android físico, **não alegar que testou Android**. Verificar FPS e draw calls no perfil baixo.
8. **Segurança de escala:** validar protocolo de GLB e regressões de rig; nenhum personagem gigante.
9. **Build:** atualizar marcador de Mod visível e `BUILD` do loader/cache para que o Android baixe os arquivos novos; link GitHub Pages com `?todasHabilidades=1&v=<mod>` e opção de testar as skills exclusivas sem alterar saves de produção. O parâmetro de teste deve ser isolado e seguro.
10. Testes automatizados para combate, cooldown, dano, cancelamento, colisão, save e alternância das duas armas. Executar suite disponível, não afirmar resultados que não executou.

**Prioridade máxima:** qualidade de animação, conexão do VFX com a espada e jogabilidade fluida. Se uma parte não ficar convincente, iterar antes de concluir. Pesquisa direcionada, inspeção de screenshots e refinamento fazem parte da entrega, não são opcionais.

## 10. FINALIZAÇÃO — LIMPEZA E RESPOSTA CURTA
- Implementar tudo em branch/PR e validar; revisar diff, testes e evitar regressões.
- **Quando e somente quando toda a implementação estiver pronta e testada, excluir este arquivo e a pasta `docs/briefings/CODEX-ESPADAS-RITOS-ANIMACOES-TEMP/` inteira no PR ANTES DO MERGE.** Não apagar documentos permanentes, modelos originais nem as imagens que o usuário anexou diretamente no chat. A limpeza não deve excluir o código implementado.
- Fazer merge seguro na `main` quando não houver conflitos/bloqueios; não deixar apenas branch sem integrar. Se houver bloqueio, informar objetivamente.
- Resposta final **curta, em português brasileiro, poucas linhas**, com: animações adicionadas; VFX e duas skills implementadas; testes realmente executados; número da Mod; link direto de teste no celular. **Nenhuma mensagem intermediária enquanto trabalha.**

**Este briefing é a fonte de instruções criativas do criador; em caso de dúvida, preservar o efeito descrito e pesquisar uma técnica melhor, não substituir por genérico.**
