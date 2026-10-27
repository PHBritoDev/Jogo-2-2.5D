# TAREFA PARA CODEX — SKILL 2: CHUVA DE ESTRELAS CELESTIAIS

> Este documento é TEMPORÁRIO. O criador enviará a imagem de referência separadamente no chat do Codex. Esta solicitação AUTORIZA a implementação da Skill 2. Antes de começar, confira o estado atual da branch main e quaisquer PRs/branches ainda não mesclados, sobretudo a Skill 1 recente. Não substitua trabalho novo com uma versão antiga.

## Objetivo
Implementar a Skill 2 do protagonista em Three.js com VFX refinados, fluidez de action RPG anime e desempenho adequado ao Android. A referência visual enviada pelo criador é uma guia de composição e estética, não deve ser colada como imagem plana. Não copiar assets de outros jogos.

## Comportamento obrigatório
1. O protagonista concentra uma esfera/feixe de energia celestial na mão ou arma, faz gesto legível e LANÇA a energia verticalmente para o céu. A câmera deve permitir ver o lançamento, sem retirar o controle desnecessariamente.
2. A energia SOBE visivelmente; somente ao atingir a altura desejada abre um GRANDE CÍRCULO MÁGICO, com anéis concêntricos, runas originais, rotação suave e luz azul-celeste, branca e dourada.
3. Estrelas/projéteis luminosos NASCEM do círculo e DESCEM em trajetórias reais, não aparecem instantaneamente no chão. Uma maioria mira o inimigo ou sua região próxima; outra parte cai ao redor, com espaçamento e distribuição variados.
4. A chuva acontece em ondas, com ritmo moderado. Referência inicial de timing: 0–0,7 s gesto e lançamento; 0,7–1,5 s ascensão e formação do círculo; 1,5–4,3 s chuva escalonada; 4,3–5 s dissipação. Ajustar com testes para não ficar rápido demais nem lento demais.
5. Projéteis deixam rastros elegantes, com núcleo claro, bordas azuladas, detalhes dourados e partículas discretas. Impactos têm mini clarão, faíscas direcionais e dissipação curta, sem poluição visual.
6. Jogador volta a movimentar-se após o gesto inicial; câmera não trava. Círculo pode acompanhar suavemente a região do alvo, sem teleporte brusco. Se alvo morrer ou desaparecer, cancelar ou finalizar de forma coerente, sem vazamentos.
7. Dano por colisão/área real, sem duplicação por frame; evitar acertar aliados e evitar atravessar barreiras se o sistema atual tratar isso. Manter recarga, custo e equilíbrio compatíveis com o jogo.

## Direção técnica e pesquisa
- ANTES de programar, inspecionar a arquitetura atual, GLBs, estados de magia, VFX, input e testes. Ler a documentação oficial do Three.js pertinente à versão instalada: ShaderMaterial/GLSL, BufferGeometry, InstancedMesh (quando aplicável), EffectComposer/UnrealBloomPass, AnimationMixer, gerenciamento de transparência e descarte de recursos.
- Considerar uma state machine/timeline cast → ascent → open → rain → fade → cleanup; usar pooling para projéteis e partículas, buffers reutilizáveis, trilhas/ribbons com fade e shaders para fluxo de energia quando agregarem valor. Não usar somente esferas emissivas e partículas aleatórias.
- Efeitos em camadas, com boa silhueta e contraste: núcleo luminoso, bordas suaves, filamentos/rastros, partículas e impactos; bloom moderado, sem alterar toda a iluminação do jogo.
- Sincronizar VFX, som, colisão e dano. Som de lançamento, abertura do círculo e impactos com mixagem sem volume excessivo.
- Perfis gráficos adaptativos para Android; limitar draw calls, luzes, overdraw e alocações por frame. Reduzir complexidade visual sem alterar o dano ou a quantidade de eventos de combate.
- Pesquisar boas práticas de timing, antecipação, easing, follow-through e VFX de action RPG. Buscar acabamento de alto nível sem copiar Genshin Impact, Fate ou outras obras.

## REVISÃO DAS OUTRAS HABILIDADES DO PROTAGONISTA — MUITO IMPORTANTE
- **PRESERVAR INTEGRALMENTE A SKILL 1 RECÉM-CRIADA**, Cerco das Cinco Lâminas Celestiais, inclusive controles, botão ATACAR contextual, rastros, efeitos, dano e recursos. Verificar em qual branch/PR ela está; não presumir que já foi mesclada. Se a Skill 1 ainda estiver em PR, não a sobrescrever: integrar sobre o estado correto ou informar o bloqueio.
- Auditar as OUTRAS habilidades antigas/genéricas do protagonista (Skill 2 antiga, Skill 3, ultimate e variantes). O criador AUTORIZA remover suas implementações genéricas do jogo ativo, exceto a Skill 1 recente, para que sejam redesenhadas depois.
- Antes de remover, identificar e **reaproveitar infraestrutura útil**: gerenciador de cooldown, input, mana, HUD, efeitos compartilhados, hitboxes, shaders, áudio, pooling, animações, salvamento, testes e compatibilidade. Preferir desativar/desregistrar habilidades antigas ao invés de apagar módulos compartilhados usados por inimigos, Bispos ou outras partes do jogo.
- Não criar novas Skill 3 ou ultimate genéricas como substitutas. Se for preciso manter botões/slots, indicar “Em desenvolvimento” sem executar poderes antigos.
- Não apagar assets GLB nem funções de outros personagens por engano. Testar que o restante do jogo continua funcionando.

## Critérios de aceite e entrega
- Validar sequência: lançar energia → subida → círculo alto → chuva de estrelas visíveis → impactos → desaparecimento limpo.
- Testar controles, cooldown, custo, dano, alvo móvel, ausência/morte de alvo, transições, repetição da habilidade e regressões da Skill 1.
- Rodar testes automatizados e inspecionar visualmente no navegador; registrar capturas das etapas. Testar no Android real se disponível; se não, declarar “Android não testado” e não inventar FPS.
- Trabalhar em branch própria com commits pequenos. **Ao terminar, criar/atualizar PR, fazer merge na main SOMENTE se testes e verificações estiverem passando e não houver conflitos ou regressões; o criador autorizou merge após conclusão desta tarefa.** Se houver impedimento, NÃO forçar merge: relatar e pedir decisão.
- **Excluir ESTE ARQUIVO TEMPORÁRIO `docs/briefings/CODEX-SKILL2-CHUVA-ESTRELAS-TEMP.md` na própria branch ANTES do merge**, após absorver os requisitos no código/testes. Garantir que não permaneça na main após a entrega.
- Não remover documentação permanente do jogo nem apagar o histórico Git. Evitar mensagens de progresso extensas; informar resultado final, PR/commit, testes e pendências.

## Referência visual
O criador enviará a imagem diretamente ao Codex. Se não conseguir visualizar a imagem, solicitar a imagem antes de finalizar o polimento visual. Não presumir detalhes que não estejam claros.
