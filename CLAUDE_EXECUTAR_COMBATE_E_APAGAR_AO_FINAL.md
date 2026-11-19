# MISSÃO CLAUDE — RECONSTRUÇÃO DO COMBATE + CORREÇÃO DO CARREGAMENTO
Repositório: PHBritoDev/Jogo-2-2.5D
Status: ordem de execução do criador. Leia TODO este arquivo antes de alterar qualquer coisa.

## Materiais de referência obrigatórios
O criador forneceu, em pacote anexo à conversa com Claude:
- REFERENCIA_1_COMBATE_RAPIDO.mp4 — combate acelerado, dash ofensivo, combos com deslocamento e efeitos ligados ao contato;
- REFERENCIA_2_DUELO_CAMERA.mp4 — duelo ágil com câmera acompanhando e enquadrando os combatentes;
- COMBATE_ATUAL_VHAZRAEL.mp4 — vídeo do jogo real para comparação;
- ERRO_CARREGAMENTO_ATUAL.jpg — erro intermitente `Failed to fetch dynamically imported module: blob:...`, exibido como `Falha ao montar o mundo 3D (Mod 186)`.

**IMPORTANTE:** os vídeos e o print estão no pacote fornecido pelo usuário; este Markdown NÃO contém nem substitui os vídeos. Se você não recebeu os anexos, use os meios disponíveis para obtê-los antes de alegar que fez comparação visual. Jamais invente observações sobre vídeos não vistos.

## Resultado esperado
Combate de RPG de ação dark fantasy **verdadeiramente rápido, preciso, responsivo e cinematográfico**, não só partículas, alterações de velocidade ou animações genéricas. As referências ensinam câmera, ritmo, controle, timing, alinhamento e peso; não copiar materiais, música ou identidade alheia. Usar os modelos 3D REAIS do jogo, os clipes existentes e preservar desempenho mobile.

## Fase 0 — Corrigir erro intermitente da tela de carregamento (P0)
Investigue primeiramente `mod181-loader.js`, que baixa e transforma o gigantesco `mundo-3d-prototype.js`, altera imports usando regex, cria `Blob` e executa `import(URL.createObjectURL(blob))`. A mensagem aponta para essa camada, mas não prove a causa por suposição. Audite imports estáticos/dinâmicos, URLs relativas, módulos não reescritos, MIME, cache/CDN, 404 e deploys inconsistentes. Reproduza e registre evidências de causa; implemente correção estrutural, não retry infinito. Garanta inicialização limpa repetida no Chrome Android e desktop. Se mudar a arquitetura do loader, preserve todas as dependências, recursos 3D e compatibilidade. Preferencialmente faça PR isolada desse conserto.

## Fase 1 — Auditoria completa do sistema atual
Leia a **main atual** e as PRs recentes antes de escrever. Inspecione `mundo-3d-prototype.js`, `mod181-loader.js`, `prota-combat3d.js`, `sword-rites3d.js`, `combat-choreography3d.js`, `docs/MOD-302-COMBATE-PROTAGONISTA.md`, sistemas de câmera, animações, hitboxes e ataques dos Bispos. Identifique qual GLB realmente é usado por cada personagem. Faça inventário AUTOMÁTICO de todos os clipes do protagonista e dos Bispos: duração, skeleton, root motion, compatibilidade, aplicação e percentual de uso. A documentação anterior cita 19 clipes do protagonista; isso NÃO comprova uso real. Aproveite cada clipe **adequado** (movimento, strafe, esquiva, dash, ataque, reação, stagger, queda, morte e transições). Não force animações incompatíveis com espada.

## Fase 2 — Reconstrução por fundamentos, não por maquiagem
1. **Câmera/lock-on:** alvo selecionável, foco estável no inimigo; manter alvo e personagem legíveis, enquadrar dinamicamente com distância/FOV, prevenir câmera atravessando paredes, preservar controle manual. Mobile e PC devem ter comando acessível e intuitivo.
2. **Precisão real:** quando o inimigo está na frente e no alcance, a espada não pode subir ou desviar e cortar o vento. Alinhar orientação do corpo, trajetória efetiva da lâmina, osso da mão, hitbox varrida, avanço e posição do alvo; calibrar contra inimigos imóveis e móveis; não mascarar erros com hitbox enorme.
3. **Ritmo e combos:** startup/active/recovery, input buffer, cancel windows, blending, root motion sólido e com colisão, encadeamentos legíveis e rápidos, golpes leves/pesados e finalizadores. Movimento ofensivo não deve travar inutilmente o jogador.
4. **DASH JÁ EXISTE:** **NÃO criar outro dash ou outro controlador/input/cooldown.** Corrigir o dash atual (incluindo animação estranha), permitir ataques durante ou após o dash e continuidade em combos. Preservar botão, controles, cooldown e física atuais onde corretos.
5. **Inimigos e Bispos:** orientação coerente, aproximação, ataque e defesa telegráficos, esquiva/contra-ataque, reação a impacto, recuperação, IA não errática. Duelo real com VHAZRAEL e VORGAZHEK, testando os rigs corretos.
6. **Feedback:** impactos visuais e sonoros sincronizados com colisão REAL, hitstop breve e seletivo, shake limitado, efeitos nascidos da espada e ponto de contato. Identidade dark fantasy própria, nada genérico e nada que destrua FPS.

## Fase 3 — Demonstração e critérios obrigatórios
- Testar vários ataques contra inimigo parado, andando, atacando, aproximando e recuando, inclusive corrida + ataque, dash + ataque e combo + dash.
- Medir acerto quando alinhado e dentro do alcance, tempo input→ação, distância da espada ao alvo, combo, FOV, clip-through da câmera, FPS e regressões.
- QA mobile/touch e PC/teclado/mouse; verificar que a câmera segura o oponente e que o combate funciona efetivamente, não apenas nos testes unitários.
- Produzir vídeo ANTES/DEPOIS, duelo real contínuo de 30–60 s, evidências por momento de contato e comparação com os dois vídeos do criador; registrar no GitHub.
- Preservar progressão, saves, controles, mapas, HUD, mundo, áudio existente e outros sistemas; evitar colisões com trabalho dos agentes.
- Dividir em PRs pequenas e revisáveis; **não fazer merge automático**. Não alterar nessa missão auroras, subterrâneo do vulcão, fauna ou realizar refatoração geral de áudio.

## REGRA ABSOLUTA: SILÊNCIO TOTAL E ECONOMIA MÁXIMA DE TOKENS
**NÃO FALE NO CHAT.** Sem “estou analisando”, planos, progresso, comentários, justificativas, perguntas desnecessárias, changelogs, celebrações ou repetição de requisitos. **AO TERMINAR NÃO MANDE RESUMO, RELATÓRIO, STATUS OU FRASE FINAL.** Registre diagnóstico, testes, commits, PRs e evidências **NO GITHUB**, não na conversa. Interrompa o silêncio apenas se houver bloqueio real exigindo intervenção do usuário; responda nesse caso com uma frase mínima e objetiva. Se sua plataforma exigir mensagem final, use apenas o mínimo tecnicamente obrigatório, sem resumo.

**Ao terminar todas as entregas, remova este arquivo temporário da sua branch/PR final, não da main antecipadamente.** Não marque a missão como concluída sem vídeo/teste real e correção comprovada da falha intermitente.