# VISÃO MESTRA PERMANENTE — QUALIDADE VISUAL, VFX, PERSONAGENS E GAMEPLAY
**Projeto:** A Batalha Contra os 7 Pecados Capitais  
**Criador e direção final:** autor do repositório PHBritoDev/Jogo-2-2.5D  
**Co-desenvolvimento:** criador + ChatGPT + Codex + Claude + outros agentes convidados  
**Criado em:** 29/10/2026  
**Status:** documento VIVO, PERMANENTE e de consulta obrigatória. **NÃO EXCLUIR ao finalizar tarefas.**

> **MANIFESTO DO CRIADOR:** “Quero que os ataques, magias, espadas, animações e personagens do nosso jogo alcancem o nível visual dos efeitos profissionais do vídeo que mostrei — ou até superem essa qualidade. Não quero nada genérico, feito de qualquer jeito, desconectado do personagem ou que funcione só no código. Quero que o resultado pareça um jogo de verdade, bonito, original, cinematográfico e que rode bem no celular. Somos co-devs: as IAs podem propor e implementar melhorias, mas não devem esquecer essa visão quando forem criando novas habilidades.”

## 0. INSTRUÇÃO INICIAL PARA QUALQUER IA OU DESENVOLVEDOR
Antes de implementar QUALQUER nova habilidade, poder, arma, personagem, chefe, animação, sistema de câmera, VFX ou melhoria gráfica:
1. Leia este documento **por inteiro**, junto com `PROMPT_MESTRE_DO_JOGO.md`, `AGENTS.md`, `ARQUITETURA.md` e os arquivos de código atuais relacionados.
2. Trate este documento como **referência permanente da qualidade-alvo**, não como pedido para alterar todo o jogo de uma vez. O pedido atual do criador define o escopo de cada tarefa.
3. Confronte a solução proposta com o checklist de qualidade e de desempenho abaixo. Se a solução for genérica ou inferior à direção aqui definida, melhore-a antes de apresentar.
4. O repositório e testes atuais são a fonte da verdade técnica. Este documento é a fonte da verdade para **ambição visual e critérios de experiência**; não presuma que todas as características descritas já foram implementadas.
5. **Não apague este documento, não rebaixe silenciosamente suas metas e não o substitua por uma versão simplificada.** Mudanças substanciais de direção devem ser discutidas com o criador.
6. Se a tarefa trouxer novas preferências duradouras do criador, **proponha/registre a atualização aqui** (com data, motivo e escopo), preservando o histórico essencial. Não encha o documento com logs transitórios ou bugs pontuais.
7. Não confunda efeitos que funcionam com efeitos que parecem profissionais. **Critério de conclusão = qualidade perceptível em vídeo + gameplay correto + estabilidade + desempenho**, não apenas compilação.

## 1. REFERÊNCIA VISUAL FUNDADORA — 29/10/2026
O criador enviou um vídeo de demonstração de efeitos visuais em tempo real, identificado na conversa como **“Doublecats — 2024 Realtime VFX Portfolio Showreel”** (efeitos apresentados na Unity). O vídeo original foi **enviado como arquivo na conversa do ChatGPT em 29/10/2026** e **não está armazenado neste repositório**. A identificação do showreel é contexto da conversa, não prova de que cada efeito tenha sido feito com uma ferramenta específica. Se o agente não receber o vídeo, **não alegar que assistiu**; pedir o arquivo ou usar este documento como briefing.

**O que o criador admira nessa referência:** efeitos com acabamento de portfólio profissional, energia volumosa e dinâmica, feixes, explosões, partículas de movimento complexo, cores bem dirigidas, formas reconhecíveis, timing preciso, impacto forte, sensação de profundidade e magia que parece nascer da ação do personagem. O cenário da demo não é a exigência principal: a prioridade é a qualidade de **personagem + animação + habilidade + impacto**.

**Alvo:** buscar qualidade comparável ou superior em direção artística e legibilidade, **dentro das restrições reais de um jogo WebGL/Android**. “Superar” é uma meta criativa, não promessa de equivalência técnica automática. A referência orienta o padrão de excelência; não copiar assets, personagens, vídeos ou efeitos proprietários.

## 2. IDENTIDADE DO JOGO: NÃO SER UMA CÓPIA GENÉRICA
- RPG 3D de ação e fantasia sombria com tema celestial, espiritual e dos sete pecados capitais. Protagonista celestial misterioso, anjos, demônios, Bispos, dimensões, grimório/Bíblia, armas e poderes evolutivos. Narrativa e personagens originais, com respeito ao universo criado.
- Visual **cinematográfico e estilizado com materiais convincentes**: uma mistura coerente de fantasia épica, anime de ação de alta qualidade e materiais/iluminação 3D trabalhados. Não perseguir realismo fotográfico às custas da identidade.
- **Cada personagem/arma/habilidade tem assinatura própria**: silhueta, cores, geometria, materiais, ritmo, som, comportamento, tema e papel narrativo. O jogador deve conseguir reconhecê-los sem ler o nome.
- Evitar: simples esferas brilhantes, cilindros e círculos mágicos genéricos usados em tudo; cortes 2D gigantes desconectados da arma; chuva aleatória de partículas; mesma explosão recolorida para todos os poderes; modelos improvisados sem acabamento; brilho que encobre o combate.
- Inspiração em obras/jogos pode informar **princípios técnicos e de direção**, mas jamais copiar designs, efeitos proprietários, personagens, modelos, sons ou marcas sem direitos.

## 3. PADRÃO PROFISSIONAL DE CADA HABILIDADE — OBRIGATÓRIO
Toda habilidade nova ou refeita deve ser desenhada como **sequência coreografada de gameplay**, não como um único objeto spawnado.

### 3.1 As sete camadas
1. **Identidade e intenção:** que emoção/tema comunica? Como é diferente das demais? Definir silhueta, paleta, materiais e ritmo antes de codificar.
2. **Preparação / telegraph:** pose corporal, movimento da arma/mãos/olhar, antecipação, partículas atraídas, som de carregamento e indicação de perigo quando necessário.
3. **Conjuração e emissão:** energia realmente se forma na fonte certa (ponta/aresta da espada, mão, grimório, céu, chão). Respeitar transformações de ossos e objetos no espaço do mundo.
4. **Deslocamento e dinâmica:** projéteis/ondas têm trajetória legível, velocidade, escala, orientação, profundidade, colisão, oclusão e relação com câmera/alvo; não nascem teletransportados sobre o inimigo sem justificativa narrativa.
5. **Impacto e reação:** hit frame sincronizado com animação e colisão; clarão contido, faíscas, deformação de energia, som, hit-stop curto se apropriado, reação do inimigo e dano coerente.
6. **Dissipação e consequência:** resíduos que diminuem, brasas, poeira, marcas temporárias, partículas que desaparecem, objetos afetados pelo poder se houver lógica; limpeza de tudo após terminar/cancelar.
7. **Polimento audiovisual e técnico:** materiais/shaders, luzes econômicas, pós-processamento, câmera, áudio, sensação de peso, performance e acessibilidade, sem confundir efeito bonito com tela poluída.

### 3.2 O que deve ser visível em uma demo de 10–20 segundos
- **Antes:** arma e personagem já parecem especiais e coerentes, mesmo sem skill.
- **Durante:** a câmera mostra de onde nasce o poder; há animação convincente, deslocamento legível e contraste entre núcleo/contorno/partículas.
- **No acerto:** jogador percebe exatamente onde, quando e por que acertou.
- **Depois:** energia se dissipa, controles voltam ao normal, nada fica preso, sem clipping ou modelos deformados.
- Em comparação lado a lado, a skill precisa demonstrar uma identidade visual própria, não ser um template com cores diferentes.

### 3.3 Ferramentas e técnicas — alternativas, não dogmas
A base atual é **Three.js/WebGL + modelos GLB/glTF**. Para alcançar qualidade superior, investigar e aplicar quando justificável:
- **GLSL custom shaders / ShaderMaterial** (ruído procedural, máscaras de dissolução, bordas energéticas, gradientes, distorção com cuidado, animação temporal); PBR/emissive compatíveis com materiais do modelo.
- **Ribbon/trail meshes** amostrando posição real da ponta e base da lâmina, orientação 3D e suavização temporal; geometria de ondas que realmente viaja.
- **InstancedMesh, GPU-friendly particles, pooling, LOD e culling**, com limites por qualidade; sprites/texturas de partículas bem desenhadas e geometria de partículas quando necessário.
- **Bloom seletivo, tone mapping, composição de cores, depth/occlusion, iluminação com orçamento**, evitando excesso de draw calls ou recompilação de shaders no combate.
- **Blender e pipeline GLB** para armas/personagens/rig/animações, materiais PBR, textura de alta qualidade com variantes mobile, controle de escala, topology, bone weights, UVs, LODs e clipes.
- **AnimationMixer com blend e camadas** (movimento de pernas + ataque dos braços), eventos sincronizados, IK quando fizer sentido, rig humanoide estável.
- **Áudio e feedback** próprios/licenciados: ataques, whoosh, impacto, energia, vento, hit-stop, câmera com shake moderado e configurável.
- Pesquisar técnicas oficiais de Three.js, glTF e VFX quando houver dúvida; registrar a escolha e evidenciar resultados. Unity VFX Graph/Shader Graph podem inspirar a metodologia, mas **não são tecnologias que já existem automaticamente no Three.js**. Não migrar de engine sem decisão expressa do criador.

## 4. PERSONAGENS NO MESMO NÍVEL DE QUALIDADE
Cada personagem importante precisa ter:
- **Design original e reconhecível:** anatomia, proporções, silhueta, rosto/olhos, roupa, armadura, cabelo, asas quando aplicável, arma, símbolos e cores que expressem personalidade e função.
- **Malha e materiais reais**, não aparência obtida só com brilho: PBR coerente, detalhes que se mantêm visíveis sem VFX, texturas otimizadas, acabamento de metal/tecido/pele, deformação correta do esqueleto.
- **Animações naturais e dirigidas:** idle respirando, andar, correr, virar, pular, dash, ataque, combo, tomar dano, queda/levantar, conjuração, morte e ações específicas do papel. Passos sincronizados com velocidade e terreno.
- **Rig e retargeting testados:** sem personagem gigante, braço quebrado, articulações invertidas, mãos soltas, espada atravessando corpo, pé flutuando, animação que arrasta personagem, escalas erradas ou NPCs usando clipes incompatíveis.
- **Reação ao mundo:** sombra/contato no solo, direção do olhar, distância da câmera, colisões, interações com outros personagens e com o cenário.
- **Anjo-Guia/companheiros:** aparência celestial memorável, presença de aliado, animações de conversa/locomoção e poderes próprios sem roubar o protagonismo. Não substituir modelo/identidade do Anjo-Guia sem conferir lore e decisão do criador.
- **Inimigos/Bispos/Pecados:** não reutilizar a mesma IA, a mesma coreografia e o mesmo VFX para todos; diferenciar telegraph, personalidade, fraquezas e ritmo.

## 5. ARMAS, COMBATE, CÂMERA — REGRAS QUE NÃO PODEM SER ESQUECIDAS
- **A espada e seu VFX devem parecer um único design.** Não aceitar espada toda branca com slash vermelho/roxo desconectado. Cor e materiais do objeto, glow, rastro, onda, impacto, som e animação pertencem à mesma identidade.
- **Primeira pessoa de verdade:** câmera coerente, mãos/braços segurando a espada com animação e escala corretas; jamais espada enorme flutuante sem empunhadura. Terceira pessoa preservada. Alternar sem travar câmera, controles ou escala.
- **Atacar andando e correndo:** combos básicos devem coexistir com movimento do jogador; não congelar locomoção sem uma razão deliberada e comunicada. **Sprint durante combate não deve sofrer penalidade artificial** comparado ao sprint fora dele. Balancear habilidades especiais individualmente.
- **Braço livre e NPCs:** nenhuma corrida com ombro/cotovelo/punho deformados; auditar retarget e camadas de animação. Testar várias direções e transições.
- **Cortes/projéteis:** saem da arma, viajam na direção correta e acertam por colisão real. Um corte com formato vertical pode deslocar-se **horizontalmente à frente**, sem subir para o céu por erro de orientação.
- **Ritos das duas espadas iniciais — intenção do criador em 29/10:** 
  - **Lâmina da Aurora / Eclipse das Lâminas:** espada comprada deve ser redesenhada com materiais/cores compatíveis com seus efeitos carmesim, violeta e escuros; ondas viajam para frente, na direção do inimigo, não para cima.
  - **Espada do Chamado / Passagem do Julgamento:** avanço rápido e seguro em direção ao inimigo, finalização atrás dele quando possível, e **12–18 cortes visíveis** (2–3× os ~6 eventos iniciais), cada um com VFX celestial próprio. Pode combinar golpes reais com cortes secundários de pós-imagens; não multiplicar dano total indiscriminadamente.
  - Estes são objetivos de design e testes, **não afirmação de que já foram implementados**. Para o briefing de execução temporário, consultar `docs/briefings/CODEX-MOD232-CAMERA-ESPADAS-VFX-TEMP/README.md` **se ainda existir**. Essa pasta é temporária e deve ser excluída ao concluir a tarefa; **esta Visão Mestra permanece**.
- **Magias do protagonista** devem ser distintas: espadas celestiais, múltiplos cortes, mini-sol, ultimate de julgamento com céu/raios/espada colossal; grimório/Bíblia 3D com energia coerente. **Poderes dos Bispos/Pecados** precisam de identidades próprias, telegraph e impactos legíveis. Antes de refazer, conferir nomes e estado atual das habilidades no código.
- **Combate por arma — pedido do criador em 31/10/2026:** cada espada do protagonista deve ter coreografia própria (guarda, trajetória, sequência e recuperação), além de VFX coerentes. Os mini-chefes Enemy1 e Enemy2 têm identidades distintas: predador de garras e executor pesado de foice. Preservar os inimigos comuns e as habilidades existentes.
- **Colisão e alcance verdadeiros:** não atravessar árvores, paredes, bosses e NPCs, nem registrar dano quando o golpe visual não alcançou. Hitboxes e animação sincronizados, cooldowns/MP coerentes, sem cancelar involuntariamente movimentação e câmera.

## 6. QUALIDADE NO ANDROID / PLAY STORE É PARTE DO DESIGN
O objetivo é publicar um jogo sólido no Android, potencialmente na Play Store. Visual impressionante **não justifica** jogo travando, esquentando excessivamente, perdendo controle ou falhando no navegador. A publicação exige verificações próprias da loja; não presumir aprovação por ser WebGL.
- **Alvo aspiracional:** 30 FPS estáveis em aparelho Android intermediário em cenas de combate; 60 FPS onde viável. Medir em hardware real quando disponível; não prometer FPS sem medição.
- Perfil **Baixo / Médio / Alto / Auto** deve mudar densidade visual, resolução, LOD, pós-processamento, sombras e contagem de partículas — **nunca** alterar dano, hitbox, direção de projéteis, duração de cooldown ou conteúdo da missão.
- VFX otimizados: pools, instancing, limites de partículas, descarte correto de buffers/texturas, menos transparências sobrepostas, menos draw calls e cuidado com overdraw e fill-rate em tela de celular.
- Pré-carregar/compilar quando apropriado; sem travamentos de 10 segundos na primeira magia, sem shader recompilando durante luta, sem vazamento de memória ao repetir skill.
- HUD e botões de toque legíveis em paisagem, área de ação desobstruída, sensibilidade configurável, efeitos luminosos com opção de redução, sem flashes agressivos obrigatórios.
- **O desempenho deve ser verificado**, não inferido do número de partículas. Se algo for pesado, criar versão visualmente equivalente e eficiente, não simplesmente eliminar a personalidade do poder.

## 7. PROCESSO PADRÃO DE CO-DESENVOLVIMENTO
**O criador é diretor da visão; ChatGPT e demais IAs são co-desenvolvedores proativos.**
1. Entender o pedido literal e a intenção estética. Não interpretar “mais cortes” como “mais partículas” ou “efeito vai reto” como “mesh aponta para cima”.
2. Auditar o código atual e identificar as partes estáveis que não podem quebrar. Revisar docs e histórico de bugs.
3. Se for útil, pesquisar boas práticas e referências técnicas; propor 1–3 melhorias criativas alinhadas, com justificativa concreta. **Melhorar a execução sem substituir a ideia central do criador.**
4. Definir identidade e storyboard de habilidade: pose → carga → lançamento → trajetória → impacto → dissipação, incluindo áudio e câmera.
5. Implementar em mudanças rastreáveis, de preferência branch/PR, evitando reescrever o jogo inteiro.
6. Testar com evidência: código, navegador real, screenshots/vídeos, interação, colisão, controle mobile, FPS, escala/rig, primeira e terceira pessoa; corrigir regressões descobertas.
7. Incrementar **Mod visível** e cache-busting de acordo com `ARQUITETURA.md`, dar link direto de teste para Android, explicar resumidamente o que foi feito e o que não foi testado.
8. **Não afirmar que um vídeo foi visto, uma habilidade foi testada, uma PR foi mesclada ou que o jogo foi publicado sem evidência.** Se não houver navegador Android real, declarar essa limitação.
9. Documentos de execução TEMPORÁRIOS podem ser removidos ao final, conforme pedido do criador. **Este documento e o prompt mestre não podem ser removidos.**
10. Ao encontrar um novo requisito DURADOURO, atualizar esta visão; para bugs pontuais e tarefas de uma Mod, usar issues/briefings separados, evitando transformá-la em um changelog infinito.

## 8. CRITÉRIOS DE ACEITAÇÃO: QUANDO UM EFEITO ESTÁ REALMENTE PRONTO?
Para cada habilidade importante, revisar:
- [ ] **Originalidade:** assinatura própria, não template de esfera/círculo/corte genérico.
- [ ] **Fonte coerente:** poder nasce da mão/espada/grimório/céu/chão correto.
- [ ] **Animação:** preparação, emissão e recuperação convincentes, com arma/ossos sincronizados.
- [ ] **Trajetória:** direção, profundidade, velocidade e colisão correspondem ao que o jogador vê.
- [ ] **Paleta e materiais:** arma, personagem, VFX e ambiente combinam visualmente.
- [ ] **Impacto:** inimigo reage, dano é registrado no contato e feedback audiovisual tem peso.
- [ ] **Dissipação:** nenhum objeto/efeito permanece ou atravessa o cenário indevidamente.
- [ ] **Câmera:** não prende nem esconde o jogador; 1ª/3ª pessoa corretas.
- [ ] **Movimentação:** ataque não trava andar/correr sem motivo; rig não deforma.
- [ ] **Equilíbrio:** MP, cooldown, alcance, dano, vulnerabilidade e boss combat coerentes.
- [ ] **Android:** performance medida quando possível; modo baixo mantém identidade.
- [ ] **Teste visual:** comparar gravação real com o vídeo de referência e com o briefing, sem alegar comparação se a referência não foi acessível.

**Se o efeito estiver tecnicamente funcional mas ainda parecer improvisado, a tarefa de qualidade visual não está concluída.** A IA deve identificar o que falta e iterar.

## 9. HIERARQUIA E FONTES DE VERDADE
- **Intenção criativa e nível de qualidade:** ESTE documento.
- **Visão narrativa, filosofia de colaboração e regras gerais:** `PROMPT_MESTRE_DO_JOGO.md`.
- **Instruções de entrada para agentes:** `AGENTS.md`.
- **Arquitetura, arquivos e estado técnico atual:** `ARQUITETURA.md` + código da branch `main` + testes reais.
- **Roteiro e atos:** `docs/GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf` e documentos de roteiro pertinentes.
- **Protocolo de escala/rig:** `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`.
- **Briefings de execução:** específicos e possivelmente temporários; não substituem esta visão.
- Quando documentos históricos descreverem o mundo como ainda 2D, consultar `ARQUITETURA.md` e o código atual: a migração foi concluída no Mod 202. Nunca restaurar o mundo 2D por confiar em nota desatualizada.

## 10. MODELO PARA REGISTRAR NOVAS DIRETRIZES PERMANENTES
Adicionar subseções datadas apenas quando o criador estabelecer algo relevante para **futuras tarefas**, no formato:
- **Data / assunto:**
- **Pedido literal do criador:**
- **Intenção que deve ser preservada:**
- **Como isso muda as futuras implementações:**
- **Como verificar se foi respeitado:**
- **Compatibilidade / partes do jogo que não podem ser quebradas:**

### Registro inicial — 29/10/2026
**Assunto:** qualidade profissional de VFX/personagens e memória compartilhada entre IAs.  
**Pedido:** alcançar ou superar o padrão do showreel enviado; nunca aceitar efeitos genéricos; todas as IAs devem consultar um documento permanente no GitHub; o assistente deve agir como co-dev e registrar outras exigências duradouras quando necessário.  
**Consequência:** este documento é a régua permanente para futuras habilidades, personagens, armas, animações e melhorias de gameplay. **Não é uma ordem para refazer tudo imediatamente.**

### 30/10/2026 — linguagem dos poderes e biblioteca reutilizável
**Pedido literal:** “Quero a VFX Engine 2.0 implementada e utilizada para reconstruir o dragão, sua bola de fogo e os ataques dos portais, além de melhorar a Skill X.”

**Intenção:** energia com matéria, direção e impacto coerentes; dragão oriental colossal de fogo dourado/branco, sem aparência de estátua; portais passam a emitir exatamente duas massas simultâneas e retas. O design anterior de 24 projéteis foi substituído.

**Implementações futuras:** reutilizar volumes, trilhas e impactos documentados em [VFX-ENGINE-2.md](VFX-ENGINE-2.md); manter identidade de cada poder e orçamento mobile.

**Verificação:** comparar referência e frames reais, testar colisão física e fases, 1ª/3ª pessoa e qualidade baixa.

**Compatibilidade:** preservar campanhas/saves, balanceamento, corrida nativa e espada montada na mão após a pose.

---
**Mensagem final a qualquer agente:** se você estiver prestes a criar uma magia, uma espada, um NPC, um chefe ou uma animação, pergunte-se: **“O criador veria isso ao lado do showreel de VFX e reconheceria a mesma ambição de qualidade — com identidade própria e funcionando no celular?”** Se a resposta for não, identifique por quê, melhore o resultado e teste. **Somos co-devs.**
