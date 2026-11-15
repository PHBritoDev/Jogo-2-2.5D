# MISSÃO TEMPORÁRIA PARA CODEX — AGENTE VISUAL + A1
**Criador:** PHBritoDev | **Repo:** PHBritoDev/Jogo-2-2.5D | **Data:** 15/11/2026
**IMPORTANTE:** Este é um briefing temporário, NÃO documentação permanente. **Ao concluir as duas fases, EXCLUA ESTE ARQUIVO DA BRANCH/PR DE ENTREGA** e preserve as decisões técnicas, testes e evidências úteis nos seus respectivos arquivos permanentes. O histórico do Git conserva este briefing. Não encerrá-lo apenas com análise.

## Resultado esperado, em ordem obrigatória
1. **PRIORIDADE ABSOLUTA: tornar o agente de fotos e vídeos um instrumento de QA confiável e útil para ChatGPT/Codex/Claude analisarem imagens REAIS do RPG**.
2. **EM SEGUIDA, aprimorar o agente A1 de bugs para corrigir bugs reais, não só emitir relatórios e benchmarks sintéticos**, sem atropelar o A1 horário.

**Instrução de execução:** examine o estado atual, reproduza os defeitos encontrados, altere código real, acrescente testes, execute os testes e itere até eliminar falhas demonstradas ou esgotar o tempo/ferramentas disponíveis. **Não encerre a rodada após a primeira análise ou primeiro commit.** Não simule testes, não declare que mediu FPS Android sem hardware real e não faça alterações genéricas apenas para cumprir meta. Se a fase 1 ainda tiver falhas críticas, resolva-as antes da fase 2; quando ficar estável, avance imediatamente à fase 2. Priorize resultados observáveis sobre longos relatórios.

## Preparação obrigatória
- Ler `AGENTS.md`, `PROMPT_MESTRE_DO_JOGO.md`, `docs/GUIA-PARA-IAS.md`, `docs/arquitetura/CONTRATO-AGENTES.md`, `docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md`, `tools/visual-lab/README.md`, `docs/equipe-5-agentes/01-AGENTE-BUGS.md` e a central [#519](https://github.com/PHBritoDev/Jogo-2-2.5D/issues/519).
- Conferir a `main` mais recente, PRs e branches ativas. Os agentes A1–A5 executam automaticamente; proteger seus arquivos/branches, a caverna C1–C5 do Claude já integrada e todo trabalho concorrente. Usar branch nova do Codex `codex/visual-lab-a1-qa-20261115` (ou nome único disponível) e PR para `main`, **sem merge automático**. Modificar arquivos compartilhados somente quando essencial e com patch mínimo; não mexer em `build-info.js`. Se os dois escopos ficarem grandes, usar PRs sequenciais não conflitantes e registrar o vínculo; **não adicionar uma PR A1 própria ao A1 horário**.
- Checar primeiro os arquivos reais e testes existentes, para não recriar funcionalidades presentes nem piorar o laboratório.

## FASE 1 — FOTOGRAFIA E VÍDEO / LABORATÓRIO VISUAL 3D

**Código inicial REAL para inspecionar e modificar:** `tools/visual-lab/agent-run.cjs`, `run.cjs`, `rounds.cjs`, `agent-policy.cjs`, `agent-perception.cjs`, `agent-report.cjs`, `ability-observer-v8.cjs`, a suite `tools/visual-lab/*.test.cjs` e `.github/workflows/laboratorio-visual.yml`. Consultar o restante das Actions de evidências e bibliotecas somente quando necessárias. Não assumir que o nome de arquivo garante que um recurso funciona.

### Problemas a investigar com reprodução REAL
- Fotos pretas/brancas, canvas/WebGL não inicializado, screenshot capturado antes do frame válido, câmera dentro de paredes/objetos, modelos fora de enquadramento, UI cobrindo ação, blur/encobrimento, vídeos vazios ou truncados e artefatos ausentes. Distinguir falha de captura, falta de render e visibilidade ruim da cena.
- Gravações muito lentas, travadas, timeout do SwiftShader, memória e storage excessivos, concorrência entre jobs, perda de frames, arquivos/paths quebrados, conversão WebM→MP4 mal sucedida, execução que passa sem screenshots ou vídeos válidos. Evitar loops infinitos e dependências pagas.
- Falha em sair de testes limitados ao Bispo 3: tornar capturas reutilizáveis por **área/cena/ação existente**, inclusive floresta, cidade, caverna **somente leitura**, mundo, movimentação, NPCs, chefes e poderes, usando APIs de debug já existentes. Não criar teleporte/controle que mude gameplay real; preservar o QA só com `?debug3d=1`.
- Avaliação automática enganosa: separar métricas de pixels de diagnóstico semântico. Não dizer que visão de IA reconheceu objetos quando só mediu brilho/contraste; marcar `suspeita` e dar evidência visual real.
- Repetição de capturas sem comparar: produzir **antes/depois comparáveis** com viewport, cena, câmera, build/commit e estado registrados; screenshots em pontos de verificação, vídeo de percurso, relatório JSON com status, console errors, requests falhos, controles usados e telemetria verificável. Criar índices navegáveis e links de artefatos do GitHub Actions que ChatGPT possa abrir quando tiver acesso. Não afirmar que fotos de Actions aparecem automaticamente no ChatGPT.
- Se útil, melhorar mecanismo de escolha de câmera, enquadramento e fallback para recuperar captura; validar com casos sintéticos + pelo menos um fluxo REAL do jogo em Chromium/SwiftShader.

### Critérios de aceite da fase 1
1. Teste de regressão que reproduz cada falha corrigida, quando possível, antes de mudar produção; depois executar unitários + smoke no jogo real.
2. Em uma execução verificada: PNGs autênticos, vídeo WebM válido (MP4 se FFmpeg disponível), relatório estruturado, índice claro, commits/viewport/cena/estado e tratamento explícito de falhas.
3. Um **agente consumidor** deve conseguir identificar quais arquivos abrir, reproduzir a sequência e saber o que foi observado versus inferido, sem depender de mensagens do criador.
4. Melhorias de estabilidade/tempo e custo medidas apenas com números reais; não prejudicar FPS do jogo nem introduzir nova dependência paga.
5. Abrir PR de melhoria com evidências e QA; não arquivar somente planejamento ou screenshots decorativos.

## FASE 2 — AGENTE A1 DE BUGS: CORREÇÃO, NÃO SÓ TRIAGEM

**Código inicial REAL:** `docs/equipe-5-agentes/01-AGENTE-BUGS.md`, `tools/agentes-externos/a1-local.py`, `a1-real-repair-gate.py`, `a1-real-repair-verify.py`, `a1-repair-real-pilot.py`, testes `test_a1*.py`, `hearts3d.js`, `hearts3d.test.mjs`, `.github/workflows/a1-local-llm.yml`. Inspecionar commits e versão atuais, pois os reparos do A1 PR #536 já entraram em `main`; **não repetir o patch nem contar piloto sintético como correção do jogo**.

- Validar o fluxo completo: **bug real com reprodução/trace → teste vermelho → patch mínimo do código real → teste verde → smoke WebGL quando pertinente → PR revisável**. O Qwen deve propor candidatos em isolamento; jamais aplicar automaticamente código gerado sem validação AST/allowlist, sandbox de arquivos, regressão, diff e revisão. Preservar licenças/permissões e limite de custo.
- Primeiro verificar bugs reais pendentes e reproduzíveis descritos na #519, como fallback de save V6 JSON inválido que impede recuperar save V5 válido, e persistência de `since` ao regenerar corações. **Confirmar no código atual antes de alterar**; atenção ao controlador `mundo-3d-prototype.js` ser compartilhado, coordenar e fazer diff mínimo.
- Corrigir um defeito de gameplay comprovado e testar de ponta a ponta; aprimorar o validador e a instrumentação se bloquearem o reparo real. Se módulo central conflitar com agentes, escolha outro bug real do domínio A1 com reprodução e reporte a dependência na central, sem parar só em análise.
- Evitar consumo excessivo de Actions/rodadas sem valor, modelos sem licença comercial adequada, fake CI, falsos positivos, auto-merge e alterações de áreas protegidas.

## Entrega final e limpeza OBRIGATÓRIA
- PR(s) com **código funcional + testes executados + screenshots/vídeos reais da fase visual + demonstração de bug corrigido na fase A1**, comparação antes/depois, custo/limitações, riscos e plano de rollback.
- Registre brevemente no Issue #519 o que mudou, evidências, problemas ainda pendentes e PR(s).
- **Antes de concluir a PR final, REMOVER `docs/briefings-temporarios/CODEX-MISSAO-AGENTE-VISUAL-E-A1-2026-11-15.md` da branch de entrega, via commit de exclusão**, e comprovar que a PR final NÃO adiciona esse arquivo à `main`. Se necessário, preservar uma breve nota técnica permanente em `tools/visual-lab/README.md` ou documentação A1, sem manter o briefing ativo.
- Nunca declarar tudo concluído se não conseguiu realizar as duas fases. Em limitação de tempo, deixar commits/PR e pendências concretas para continuação; não encerrar prematuramente, nem alegar execução futura fora de uma nova rodada.
