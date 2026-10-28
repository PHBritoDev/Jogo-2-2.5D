# BRIEFING TEMPORÁRIO PARA CODEX — SKILL 3: TORNADO DA FÊNIX CELESTIAL

> Tarefa: IMPLEMENTAR, testar e integrar a nova Skill 3 do protagonista em **A Batalha Contra os 7 Pecados Capitais**. Este documento é temporário: removê-lo na própria PR antes do merge. A imagem de referência visual será enviada pelo usuário DIRETAMENTE ao Codex. **Não presumir que a imagem esteja neste repositório.**

## 0. Regras inegociáveis

- Repo: `PHBritoDev/Jogo-2-2.5D`, base `main`; usar branch/PR própria. Verificar o código atual, pois outras IAs podem alterar arquivos em paralelo.
- Preservar integralmente as Skills 1 e 2, seus efeitos, lógica de dano, cooldowns, controles, loja e progressão; não reescrever nem regredir sistemas já funcionando. Preservar dimensão 3D do Bispo Valério, modelos GLB, inimigos, missões, áudio, mapas e HUD.
- **Skill 3 substitui a antiga proposta de Mini Sol/Sol da Justiça.** Não implementar sol caindo do céu. Nome sugerido: **Tornado da Fênix Celestial** (ajustável apenas se houver forte razão narrativa).
- O usuário fornecerá imagem de referência: três tornados de fogo laranja/vermelho com núcleo escuro roxo, um deles maior com fênix flamejante espiralando ao redor. Usar a imagem para DIREÇÃO ARTÍSTICA, não colar a imagem plana na cena como se fosse o tornado. Criar VFX 3D real com volume visual, profundidade, animação e movimento de câmera livre.
- **Não adicionar dependências pesadas por padrão.** Reutilizar Three.js, shaders, instancing e pools. GSAP, Rapier, Blender e bloom de tela inteira só se houver justificativa concreta, benchmark mobile e compatibilidade. Se possível, usar bloom seletivo leve e fallback sem bloom.
- Não afirmar que está testado sem executar testes; não declarar merge sem merge confirmado. Exibir número Mod atualizado se projeto exigir, sem quebrar o sistema de versão.

## 1. Sequência exata da magia (com espaço para polimento artístico)

**Fase A — Invocação (aprox. 0,5–0,9 s):** protagonista interrompe ações incompatíveis sem ficar preso ou levitar indevidamente; usa animação existente apropriada de conjuração, com transição suave e fallback se clipe não existir. Grimório/Bíblia Celestial, se o sistema já o suporta, aparece com aura dourada discreta. Energia laranja-dourada circula em torno da mão, faíscas ascendentes e vento curvando partículas.

**Fase B — Formação (aprox. 0,6–1,0 s):** à frente do protagonista nasce um tornado tridimensional, com base definida, coluna helicoidal ascendente, centro escuro roxo/avermelhado e camadas de fogo laranja, vermelho, âmbar e amarelo quase branco nas regiões quentes. A fênix de fogo aparece e começa a **voar em espiral ao redor da parte externa do tornado**, com silhueta reconhecível: cabeça, bico, asas abertas, cauda longa de brasas. Não basta um círculo genérico, esfera brilhante ou sprite fixo. Criar fênix por malha estilizada/procedural com shaders e trilhas, ou carregar um GLB apropriado se JÁ existir e estiver licenciado no repo; sem inventar asset inexistente.

**Fase C — Projétil guiado (aprox. 1,2–2,4 s, ajustável ao alcance):** o protagonista lança o tornado na direção do inimigo selecionado. Tornado se desloca pelo chão/terreno, gira e conserva forma; a fênix permanece orbitando o tornado enquanto ele viaja, com animação das asas e rastro flamejante. Usar trajetória e homing moderados, não teletransporte ou curva impossível. Alvo ausente: seguir direção da mira até distância máxima, dissipar sem travar. Obstáculos sólidos: colisão coerente e dissipação/impacto apropriado, sem atravessar paredes. Evitar nascer dentro do jogador ou do inimigo.

**Fase D — Contato:** quando a área física do tornado atinge o inimigo, ele sofre um impacto inicial e uma reação apropriada. **Só então a fênix se desprende**, faz **uma volta completa, legível, ao redor do corpo do inimigo** (órbita horizontal/levemente inclinada com profundidade 3D, 0,7–1,1 s), mantendo rastros de fogo. Não pular essa volta. Em alvos grandes, adaptar raio e altura à bounding box; nunca penetrar totalmente no corpo ou desaparecer atrás da câmera.

**Fase E — Investida da fênix:** após completar a volta, a fênix muda de direção, acelera e **colide diretamente com o inimigo**, com animação de asas, flare de impacto, anel de fogo/brasas, leve tremor de câmera apenas se confortável e sem sequestrar o controle. Registrar dano de impacto uma única vez por evento. O tornado pode dissipar progressivamente enquanto a fênix executa a finalização.

**Fase F — Queimadura:** inimigo atingido recebe status **Burn/Queimadura** por alguns segundos (sugestão inicial: 4–6 s, ticks de 1 s; números calibrar com balanceamento existente), com pequenos pontos de brasa e chamas aderidas ao corpo, dano periódico separado do VFX. Não resetar a duração indevidamente por FPS ou reentradas. Definir regra clara de reaplicação (refresh limitado, sem stacking infinito) e imunidades/limites se já existem no combate. Efeito termina corretamente ao morrer, despawnar, reiniciar combate ou trocar dimensão. Não queimar aliados/NPCs por engano.

**Final:** rastros e partículas desaparecem suavemente; grimório/animação retornam ao estado correto; jogador recupera controle e câmera normal; nenhuma geometria, mixer, listener, material ou timer órfão.

## 2. Arquitetura obrigatória

- Inspecionar `skills3d.js`, `mundo-3d-prototype.js`, `celestial-siege3d.js`, `celestial-siege-vfx3d.js`, `celestial-starfall3d.js`, `celestial-starfall-vfx3d.js`, testes existentes e a integração com bosses/inimigos.
- Criar **módulo de simulação de combate** separado do **módulo VFX** (sugestões: `celestial-phoenix3d.js`, `celestial-phoenix-vfx3d.js`). Simulação controla fases, hitbox, target ID, cooldown, dano inicial/final, queimadura e cancelamento. VFX apenas lê estado e desenha.
- Não atrelar hit/dano ao número de partículas, qualidade gráfica, visibilidade, frames ou posição da câmera. Preferir simulação com passo fixo ou delta limitado e detecção de colisão contínua/swept para projétil veloz. Aplicar dano no alvo correto, nunca duplicar em frames consecutivos.
- Reutilizar sistema existente de mana, cooldown, compra/desbloqueio da Loja Central, botões mobile/teclado, save e mensagens PT-BR. `skills3d.js` hoje possui `magic3: { disabled:true, name:'Sol da Justiça', mana:45, cooldown:6200, unlockBishops:1 }`. Atualizar nome e habilitar **somente após** implementação funcional, verificando progressão/loja e textos que mencionem nome antigo. Rebalancear mana/cooldown com justificativa; 6,2 s provavelmente é curto para magia poderosa com queimadura, avaliar cooldown proporcional ao dano e duração. Não liberar antes da compra se as outras skills exigem compra.
- As animações do protagonista já existentes têm prioridade; se não houver clipe adequado, usar transições de pose discretas sem deformar escala do GLB. Respeitar protocolo de bug de escala GLB: `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`.
- Garantir que funcione em todos os inimigos compatíveis (Enemy1, miniboss, Bispos) com tamanho e comportamento variáveis, sem introduzir dependência de um único boss.

## 3. Direção artística e performance

- O tornado deve parecer **coluna de fogo helicoidal volumétrica** com 2–3 camadas de fluxo contrarrotativo, turbulência, chamas em fitas, núcleo escuro roxo e bordas emissivas laranja-douradas; base com redemoinho e cinzas, topo com faíscas. Evitar cilindro opaco simples, cones empilhados ou plano 2D sempre virado à câmera.
- A fênix deve ser reconhecível e visível ao orbitar, com asas e cauda animadas, rastro de fogo curvo persistente por breve período, brilho quente e dissipação natural. Proporções claras em câmera de terceira pessoa e telas pequenas.
- Usar `ShaderMaterial`, `BufferGeometry`, `InstancedMesh` ou `THREE.Points` quando apropriado; pré-alocar buffers, reaproveitar objetos, reduzir draw calls e overdraw, desabilitar sombras individuais de brasas, limitar luzes reais e evitar alocações/compilação de shaders por frame.
- Três níveis de qualidade, integrados à configuração atual: baixo (menos fitas/partículas, sem pós-processamento pesado), médio, alto (detalhes extras). A mesma sequência, hitboxes, duração e dano em TODOS os níveis. Medir FPS no celular e evitar stutter no primeiro cast; pré-aquecer shaders se necessário.
- Som: reutilizar infraestrutura `audio3d.js` se viável, com vento/combustão/fênix/impacto discretos e volume balanceado; se não houver assets de som, fallback silencioso, não bloquear cast.
- A referência enviada pelo usuário pode mostrar três tamanhos como progressão visual; **não interpretar automaticamente como três tornados simultâneos**. A Skill 3 padrão lança UM tornado com UMA fênix; qualquer upgrade de quantidade depende de decisão posterior.

## 4. Testes e critérios de aceite

1. Skill 1 e Skill 2 continuam intactas, visualmente e em dano, cooldown e controles.
2. Skill 3 realmente invoca tornado 3D, com fênix **orbitando o tornado durante o voo**.
3. Tornado atinge inimigo; fênix **faz uma volta inteira ao redor do inimigo** e depois investe/colide, nesta ordem, sem pular etapas.
4. Dano inicial, dano da investida e queimadura temporária registrados uma vez por evento; status não persiste após morte/restart.
5. Com alvo perdido, morte, pausa, troca de cena, obstáculos e FPS baixo: não travar câmera/jogador, nem causar dano fantasma ou vazamento de memória.
6. Funciona em terceira pessoa, câmera livre, mobile Android, e qualidade baixa/média/alta. Testar sem e com alvo e contra inimigos de tamanhos diferentes.
7. Testes unitários da máquina de estados, hit-once, órbita completa, burn ticks, cancelamento, cooldown, consumo de mana, invariância do dano entre qualidades e cleanup; executar testes disponíveis e relatar limitações.
8. Sem erro no console, sem textura 2D usada como substituto do tornado, sem assets remotos frágeis.
9. Incluir vídeo/capturas ou descrição de teste real quando possível; não inventar resultados.

## 5. Fluxo de entrega para Codex

1. Receber do usuário a imagem de referência separadamente e inspecioná-la.
2. Revisar o estado mais recente da `main` e a integração atual; planejar mudanças mínimas e robustas.
3. Implementar em branch, rodar testes, verificar build e, se houver ambiente de navegador, validar VFX/câmera/performance.
4. Abrir PR com resumo, arquivos, parâmetros ajustáveis, evidências de teste e riscos.
5. **Excluir este briefing temporário da branch antes do merge** (não apagar outros arquivos sem autorização).
6. Fazer merge apenas após verificar ausência de regressões e permissões; se não tiver acesso, deixar PR pronta e explicar.
7. Informar link direto para teste no GitHub Pages com cache-buster de versão após deploy.

**Prioridade:** fidelidade à imagem e à sequência de tornado + fênix, boa direção de arte e desempenho no celular, SEM sacrificar combate já funcional.
