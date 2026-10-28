# CLAUDE — BRIEFING TEMPORÁRIO: RECONSTRUÇÃO CINEMATOGRÁFICA DAS SKILLS 2, 3 E ULTIMATE
**Projeto:** A Batalha Contra os 7 Pecados Capitais · `PHBritoDev/Jogo-2-2.5D` · branch `main`.
**Base a inspecionar:** Mod 228, sem presumir que permaneça a última. **Idioma:** PT-BR.
**IMPORTANTE:** este diretório é TEMPORÁRIO. Ao terminar implementação, testes e documentação permanente, **EXCLUIR TODO ESTE DIRETÓRIO TEMPORÁRIO NA PR, ANTES DO MERGE**, sem excluir arquivos de produção ou documentação permanente. Nunca excluir o briefing antes de concluir a tarefa.

## 0. OBJETIVO INEGOCIÁVEL
Transformar as três habilidades em efeitos **3D cinematográficos originais, impactantes e tecnicamente sólidos**, com silhueta legível, energia com volume, impacto, timing, reação do ambiente e performance móvel. O usuário rejeita explicitamente efeitos genéricos/feios: nada de círculos achatados sem profundidade, nuvens de esferas cinzentas, partículas quadradas aparentes, chuva localizada embaixo do White Hole, estrelas com impacto de papelão, ou explosões instantâneas sem peso. **Não basta aumentar a escala ou brilho dos efeitos existentes.** É preciso redesenhar a linguagem visual e a coreografia com materiais, geometria, animação, som futuro e pós-processamento quando viável.

**Referências fornecidas pelo autor:** pacote ZIP externo entregue ao Claude junto desta instrução, com:
- `referencias/01-ceu-vermelho-sangue.jpg`: atmosfera vermelha/carmesim, iluminação de fim do mundo.
- `referencias/02-nuvens-volumetricas-escuras.jpg`: nuvens de tempestade densas, estratificadas, realistas e dramáticas; abertura luminosa.
- `videos/skill2-chuva-estrelas.mp4`: gravação real da skill 2; mostra círculo fino e impactos leves.
- `videos/skill3-tornado-fenix.mp4`: gravação real da skill 3; observar trajetória, contato e explosão.
- `videos/ultimate-white-hole.mp4`: gravação real da Mod 228; observar disco/coroa, nuvens genéricas e chuva restrita.
- `frames/*.jpg`: folhas de contato para leitura rápida.
Se os anexos não estiverem acessíveis ao agente, **não inventar que foram vistos**: usar o briefing e solicitar anexos ao usuário. Referências são de **direção artística**, não sprites para colar no céu.

## 1. LEITURA DO CÓDIGO ANTES DE EDITAR
1. Inspecionar `mundo-3d-prototype.js`, `mod181-loader.js`, `mundo-3d-prototype.html`, `skills3d.js`, `progression3d.js`.
2. Skill 2: `celestial-starfall3d.js`, `celestial-starfall-vfx3d.js`, `skill2-preview.html`, testes existentes.
3. Skill 3: `celestial-phoenix3d.js`, `celestial-phoenix-vfx3d.js`, `skill3-preview.html`, testes existentes. Atualmente `PHOENIX` tem fases cast/form/flight/orbit/dive/burn; **revisar FSM e ampliar para captura pelo ciclone antes da explosão**. Mod 227 ampliou tornado 1.5x e fênix 1.35x; preservar/melhorar a escala.
4. Ultimate: `celestial-whitehole3d.js`, `celestial-whitehole-vfx3d.js`, `whitehole-preview.html`, `docs/MOD-228-ULTIMATE.md`, testes existentes. Duração atual 17 s, impacto aos 13 s, cooldown 30 s, mana 80; preservar contrato de gameplay ou justificar ajustes.
5. Localizar **modelo GLB e implementação histórica das asas do protagonista no prólogo**: pesquisar arquivos, animações, referências e commits antes de criar asas novas. Se não houver asset reutilizável, criar asas originais de qualidade equivalente com penas 3D instanciadas/rig, sem "dois triângulos" ou painéis planos.

## 2. SKILL 2 — CHUVA DE ESTRELAS CELESTIAIS
### Problema atual
No vídeo, o círculo celeste parece uma projeção fina e pequena; os projéteis lembram risquinhos, sem corpo; a colisão com o chão é fraca e pouco convincente.

### Novo design — manter código 3D, não exigir GLB para o círculo
- **Invocação:** breve gesto e condensação de energia acima da área de combate. Círculo 3D de múltiplas camadas em profundidades diferentes, diâmetro inicial de teste 1.3–1.5x o atual, com anéis concêntricos em contrarrotação, runas próprias, arcos de energia, partículas orbitais e pulsos sincronizados. Leve inclinação/perspectiva para o jogador perceber volume. Sem cobrir HUD nem bloquear visão do alvo.
- **Carga:** núcleo se condensa, glifos acendem em sequência, arcos ligam camadas; um momento de antecipação antes da primeira estrela. Sem demora excessiva no controle.
- **Projéteis:** estrelas celestiais **com núcleo 3D visível**, silhueta de 4–6 pontas ou meteoros de luz estilizados, aura volumétrica, cauda dinâmica em múltiplas camadas, filamentos azuis/brancos/dourados, variação controlada de tamanho/velocidade. Não usar apenas linhas retas, quadrados, billboards crus ou uma massa amorfa de bloom. A trajetória e origem devem coincidir com o círculo.
- **Impacto (PRIORIDADE MÁXIMA):** contato com terreno real, pequeno flash concentrado, onda de choque no plano do chão, estilhaços/fragmentos luminosos, partículas de poeira que sobem e se dissipam, breve decal/marca de energia que some, câmera com impulso **sutil e opcional**, microvariação de luz sem criar dezenas de PointLights. Uma estrela deve parecer PESADA. O impacto precisa acontecer exatamente onde o dano/colisão ocorre, sem flutuar ou atravessar o solo.
- **Ritmo:** sequência de estrelas escalonada, algumas mais fortes para pontuar a chuva; não transformar em ruído visual constante. Encerramento com dissipação elegante.
- **Regras:** preservar dano total, alvo, mana, cooldown, desbloqueio, compra, skill 1 e funcionamento móvel, a menos que mudança seja estritamente necessária e testada. VFX nunca deve causar dano por conta própria.

## 3. SKILL 3 — TORNADO DA FÊNIX CELESTIAL
### Coreografia EXATA solicitada
1. Invocação → tornado de fogo com núcleo escuro/roxo e camadas helicoidais volumétricas, presença, torção e brasas; fênix distinguível, animada e luminosa.
2. Tornado avança até o alvo e **NÃO explode imediatamente**.
3. **Captura o inimigo por alguns segundos (sugestão inicial 2.5–3.5 s)**: alvo fica preso num estado de ciclone, levitado/arrastado em **órbita espiral visível** em torno do eixo, com deslocamento vertical limitado, sofrendo **ticks de dano de fogo + pressão do vento**. Evitar dano duplicado por FPS; definir orçamento total de dano e não multiplicar acidentalmente DPS. O jogador vê claramente que o tornado está carregando o alvo. O tornado permanece ancorado à posição do encontro, não sai perseguindo outros NPCs.
4. **Explosão do tornado**: onda de choque volumétrica e coluna de fogo com expansão, faíscas e resíduos, não um pop pequeno. Reação física/visual do inimigo e transição para próxima fase.
5. **Fênix dá EXATAMENTE 2 voltas completas** ao redor do inimigo, deixando **rastros persistentes de fogo no ar** que se dissipam de modo bonito; raio seguro para não atravessar chão/obstáculos.
6. **Fênix sobe bem alto** com trilha e pausa curta no ápice, depois mergulha de cima sobre o inimigo, acelerando e orientando corpo/asas conforme a trajetória.
7. **Impacto final marcante**: explosão concentrada no alvo, flash de núcleo branco-amarelado, expansão de fogo alaranjado, shockwave, detritos/brasas, luz breve e dissipação com queimadura residual. Sem explosão genérica de cubos nem partículas quadradas visíveis.

### Engenharia de combate / segurança
- Reestruturar FSM explícita: `cast → form → flight → capture → tornado_burst → phoenix_orbit_2x → ascend → dive → final_impact → burn → cleanup`, ou nomes equivalentes. Estados devem ser determinísticos e testáveis em 30/60/120 FPS.
- Durante captura, controlar **transformação visual do inimigo** com integração real à IA/animação/física do jogo: pausar locomoção/ataque com "lease" temporária, animar trajetória relativa a âncora, proteger colisões/terreno, e restaurar posição, IA, física, velocidade e animação com `finally`/cancel/timeout/morte/mudança de cena. **Nunca deixar inimigo voando, atravessando o chão ou perseguindo torto depois.**
- Definir política explícita para chefes imunes a controle: efeito de resistência visual e dano preservado, sem quebrar boss fight. Evitar atingir aliados/NPCs ou inimigo substituto com ID reciclado.
- Separar lógica de dano da VFX, respeitar cooldown/mana/loja e proteção contra múltiplos acertos indevidos. Priorizar feedback de hit real.

## 4. ULTIMATE — JULGAMENTO DIVINO: COLAPSO DA LUZ ETERNA
### Identidade visual obrigatória
O White Hole permanece um **disco negro absoluto cercado por coroa branca ofuscante**, colossal, lançado pelo protagonista contra o inimigo. **Não transformar a Ultimate em buraco negro comum, bola vermelha ou estrela de fogo.** Vermelho pertence ao CÉU/TEMPESTADE, branco à luz divina, negro ao núcleo e às nuvens.

### NOVA ABERTURA — ASAS EM PRIMEIRO LUGAR
No instante em que o jogador aperta a Ultimate:
1. **Duas grandes asas celestiais surgem nas costas do protagonista ANTES da ascensão.** Procurar as asas que ele possuía na introdução quando Deus as retirou; se possível reutilizar e melhorar. Asas simétricas, volumétricas, articuladas, com penas individuais ou agrupadas, luz branca/dourada, bordas iridescentes, penas de energia se soltando e animação de abertura forte; não usar 2 placas planas ou 2 triângulos.
2. Pulso de energia/vento ao abrir as asas; personagem começa a subir com batidas suaves das asas, espada erguida; câmera cinematográfica sem perder personagem nem atravessar cenário.
3. Asas permanecem visíveis durante invocação/lançamento e se desfazem elegantemente em luz ao final. Não conceder voo permanente.

### MUDANÇA GLOBAL DO CLIMA NA ÁREA VISÍVEL
- Desde o início, **toda a área VISÍVEL ao redor da câmera/jogador** muda para uma tempestade apocalíptica: céu carmesim/vermelho-sangue, gradiente dramático, fog atmosférico coordenado, contraste com nuvens negras. Não é necessário mudar coordenadas remotas ou gerar simulação meteorológica no mundo inteiro.
- **Nuvens densas, estratificadas, volumétricas, de aspecto cumulonimbus**, tomando o céu com profundidade, sombras e bordas recortadas, como `02-nuvens-volumetricas-escuras.jpg`; iluminação interna vermelha/escura e aberturas para relâmpagos e luz branca. **Proibido** usar nuvens de bolinhas/esferas cinzentas, placas opacas repetidas ou ruído barato sem volume. Considerar shaders de ruído 3D/fBm, raymarching leve com poucos passos, impostores volumétricos bem feitos ou geometria procedural com camadas; escolher solução realmente viável em WebGL/mobile e justificar.
- **Vento forte e visível em todo o entorno:** movimento das árvores/grama via shaders existentes, partículas de poeira/folhas/brasas orientadas, nuvens deslocando-se e rajadas coerentes. Não remover árvores/grama permanentemente.
- **Relâmpagos ramificados** nas nuvens com lampejos breves e luz difusa, sem dezenas de luzes reais; trovão e som serão tratados em etapa posterior, mas deixar eventos/gancho de áudio.
- **CHUVA NA ÁREA VISÍVEL DO MAPA, INCLUINDO EM VOLTA DO JOGADOR E DA CÂMERA**, e **VINDO DAS NUVENS ACIMA**, jamais gerada apenas sob o White Hole. Usar volume de precipitação centrado/atualizado pela câmera e `groundHeightAt`, com LOD, profundidade, vento, respingos de contato e oclusão básica por telhados quando possível. Sem chuva atravessando UI nem surgir apenas num cilindro debaixo da Ultimate. Chuva tem de parecer parte do clima, não uma cascata artificial.
- **A tempestade dura durante a conjuração e lançamento, e termina após impacto**; restauração progressiva (pode haver 0.5–1.5 s de dissipação), SEM sobras de cor, chuva, neblina, relâmpagos, câmera travada ou objetos temporários.

### White Hole e final
- Manter sequência essencial: asas → ascensão → espada canaliza energia → fissura celestial → White Hole cresce até dominar o céu → pausa de escala → protagonista **LANÇA O WHITE HOLE NO INIMIGO** → impacto → flash branco → restauração.
- Tornar o portal e o disco mais ricos: coroa de luz 3D com turbulência fina, distorção/refração simulada, filamentos e material de energia sem usar imagem estática como atalho. A silhueta disco negro + anel branco deve continuar perfeita em celular.
- Final pode ser melhorado: o disco acelera com sensação de massa, a câmera acompanha por instante SEM mergulhar o protagonista no disco, colisão no inimigo com implosão curta → explosão branca em camadas, onda de choque 3D, partículas de luz e flash controlado; restauração da câmera com transição suave e jogador no chão.
- Não reproduzir efeitos de luz que cubram tela por segundos sem controle; limitar fotossensibilidade e oferecer redução de flash/tremor.

### Controle, estado e rollback
- Salvar/restaurar exatamente estados de céu, fog, exposição, luz ambiente, vento, chuva, nuvens, câmera, input, personagem, asas e animação. Implementar transação/lease de cena e `cleanup` idempotente para sucesso, cancelamento, morte, troca de dimensão, erro de carregamento, pausa e queda de FPS. Não duplicar overlays e não prender controles.
- O clima é global **visualmente**, mas os recursos de VFX devem ser locais/limitados à área renderizada para performance.

## 5. PESQUISA TÉCNICA EXIGIDA ANTES DE IMPLEMENTAR
Pesquisar e registrar no relatório as escolhas, com links às fontes oficiais e a pelo menos 2 exemplos técnicos relevantes, sem copiar assets protegidos:
- Documentação oficial Three.js: `ShaderMaterial`, `InstancedMesh`, `BufferGeometry`, `GLTFLoader`, `AnimationMixer`, `EffectComposer`/bloom e limites de WebGL no mobile.
- Técnicas reais de **volumetric clouds** otimizadas (3D noise/fBm, light scattering aproximado, temporal reprojection ou alternativas impostor), chuva volumétrica camera-relative, impacto de projétil (anticipation/hitstop/shockwave/decal) e controle de câmera cinematográfica.
- VFX de RPG/action games para estudar **timing, escala, cor, composição, silhueta, movimento e impacto**, como referência de PRINCÍPIOS e não para copiar visual/arquivos de jogos comerciais.
- Verificar se GLB das asas do prólogo existe e como reutilizar/retarget corretamente; aplicar protocolo anti-escala de GLB do projeto quando necessário.
- Documentar tradeoffs: técnica escolhida, custo GPU/CPU, fallback por qualidade, por que não é efeito genérico.

## 6. QUALIDADE MOBILE / TESTES / NÃO REGREDIR
- Alvo principal Android (Samsung A55 ou aparelho equivalente), touch, paisagem, WebGL. Presets **baixo/médio/alto** e qualidade automática. Reduzir densidade, amostras e draw calls nos presets baixos, **não remover identidade visual**, e evitar shaders compilando durante a luta.
- Instancing/pooling, buffers reutilizáveis, poucos materiais, sem alocações por frame desnecessárias, limitar luzes dinâmicas e bloom, limpar GPU/CPU no fim. Não bloquear carregamento por segundos.
- Testar 30/60/120 FPS simulados; lógica de combate determinística e independente da renderização. Testar skill 2 em terreno inclinado; skill 3 contra inimigo comum, boss resistente, alvo morrendo no meio, parede/árvore e cancelamento; Ultimate em dia/noite, chuva/sem chuva, em vila e floresta, perto de prédios, com troca de câmera, queda de FPS e cancelamento.
- Testes automatizados: FSM e damage events, exatamente 2 voltas da fênix, tornado não explode no primeiro toque, restauro de estados/IA/câmera/clima; teste de sintaxe e console/browser. Capturar imagens/vídeos de antes/depois. Revisar especialmente mobile HUD e clipping.
- Preservar Skills 1 e todas as funcionalidades já existentes, mundo 3D, dimensão do Bispo Valério, progressão, loja, HP/MP, cooldowns, missões, animações, áudio atual e botão `?todasHabilidades=1`.
- Atualizar `mod181-loader.js` BUILD, cache-busters HTML e versão visual **Mod 229** (ou próxima livre verificada no repositório); verificar publicação no GitHub Pages.
- Documentar mudanças permanentes em `docs/MOD-XXX-...md` e incluir passos de QA, resultados e limitações reais. Não declarar testes Android se só rodou desktop.

## 7. FLUXO DE ENTREGA (OBRIGATÓRIO)
1. Ler este briefing + anexos; inspecionar código e reproduzir vídeos; pesquisar e planejar mudanças.
2. Implementar as 3 habilidades em uma branch/PR bem organizada; preferir commits lógicos por skill, com testes entre etapas. Não pedir ao usuário para executar comandos longos.
3. Rodar testes e QA visual; corrigir problemas até ter evidência. Se algo não puder ser feito com qualidade, **explicar limitação específica e entregar alternativa sólida**, sem prometer magia impossível.
4. **EXCLUIR `docs/briefings/CLAUDE-MELHORIAS-3-HABILIDADES-TEMP/` COMPLETAMENTE NA BRANCH DA PR, ANTES DO MERGE.** Não excluir arquivos de produção nem outras briefings.
5. Abrir PR, revisar e **mesclar na `main` quando seguro e autorizado pelo acesso GitHub**. Não declarar merge sem confirmação real.
6. Entregar resumo, links da PR/commit, versão Mod, e **link direto de teste** `https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?todasHabilidades=1&debug3d=1&mod=XXX`.

### Critério final de aceitação
**Skill 2:** o jogador percebe o peso de cada estrela e um círculo tridimensional. **Skill 3:** inimigo fica visivelmente preso no tornado por segundos, explosão, fênix faz 2 órbitas, sobe e mergulha num impacto espetacular; tudo sem bugs de IA. **Ultimate:** asas nascem PRIMEIRO; céu inteiro visível torna-se vermelho com nuvens negras volumétricas; vento, raios e chuva abrangem o entorno; White Hole é lançado ao alvo e mundo retorna ao normal. **Nada genérico, nada que pareça protótipo barato.**
