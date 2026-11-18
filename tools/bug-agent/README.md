## AUDITORIA OPERACIONAL DE 16/11/2026 — RESULTADO REAL, NÃO PROMESSA DE 5 MIN

**Situação verificada no GitHub:** o workflow `.github/workflows/a1-agente-autonomo-5min.yml` tem cron `*/5 * * * *`, mas **cron não garante execução efetiva a cada cinco minutos**. Amostra das 1.000 execuções gerais mais recentes do repositório exibiu **três** execuções do monitor A1:
- Run `43822527570` (2026-11-16 07:15 UTC), monitor `success`, `codex/copilot/pr` `skipped`;
- Run `43915505704` (2026-11-16 17:10 UTC), monitor `success`, `codex/copilot/pr` `skipped`;
- Run `43990840459` (2026-11-17 00:50 UTC), monitor `success`, `codex/copilot/pr` `skipped`.

A amostra NÃO é histórico completo e não comprova motivo específico dos intervalos. Segundo a documentação oficial, agendamentos GitHub Actions podem atrasar e até perder eventos sob carga; não afirmar cinco minutos de trabalho contínuo. Ver histórico real: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/a1-agente-autonomo-5min.yml.

**RESULTADO ATUAL:** nos três runs inspecionados o monitor passou, mas não houve programação por modelo nem PR automática. Isso pode significar ausência de falha detectada e/ou a opção de reparo desabilitada; `skipped` sozinho não distingue essas causas. Busca por PRs de `agentes/a1/automatico*` não retornou nenhuma. Não chamar o robô de corretor autônomo comprovado. Ele testa um conjunto limitado de regressões; não explora o mapa 3D, não detecta automaticamente água/lava/aurora visualmente ruins e não avalia fluidez.

**PONTOS A MELHORAR:** conferir na UI se o workflow está `Active`, inspecionar a série completa de eventos `schedule`, consumo/limites do Actions, permissões/atores e interrupções; não assumir bloqueio específico sem logs. Considerar redistribuir agendamentos longe do minuto 00 e reduzir custo, mas só alterar cron após verificar a causa. Para reparos com Codex/Copilot é necessária autorização explícita do dono e avaliação de custos; não habilitar variáveis nem colocar API key em código sem essa aprovação.

**TESTES ATUAIS:** mapa/save, corações/HUD, fluxo Ato I, dimensões, terreno base, NPCs e fotógrafo. Ampliar para Ato II, joystick multitouch e travadas/streaming por testes novos reproduzíveis seria valioso; só adicionar checks verificáveis, não testes artificiais.

---

# A1 robô independente — monitor 5min + correção de bugs (15/11/2026)

## Já instalado na main
- Workflow: [A1 autonomo — vigia 5min e reparo opt-in](../../.github/workflows/a1-agente-autonomo-5min.yml).
- Agenda: `*/5 * * * *` (mínimo permitido pelo GitHub Actions; execução não garante precisão de minuto). **Não depende de automações ou mensagens do ChatGPT.**
- A cada execução rápida: executa testes reais e gratuitos de regressão do mapa, saves, vida/HUD, atos/checkpoints, dimensões/chefes, terreno, NPCs e fotógrafo, gera `bug-agent-results/report.json`, logs e artefato (`a1-robot-N`). Não roda browser pesado a cada cinco minutos.
- Se detectar nova falha, abre **uma issue por conjunto de falhas** e solicita uma captura WebGL real pelo `agente-cenas.yml` (uma vez, não a cada polling). A captura pode atrasar ou falhar; relatório não equivale a correção.
- Não faz merge, não edita `main` automaticamente e não interfere no trabalho da vila/caverna do Claude.

## Acionar IA que escreve correção e PR (ativação única)
**Sem autorização para consumir serviço de IA, só o monitor gratuito fica ativo.** Para ligar o programador com GitHub Copilot:
1. GitHub do repo > **Settings > Secrets and variables > Actions > Variables** > New repository variable:
   - Nome: `ENABLE_A1_COPILOT_AUTOFIX`
   - Valor: `true`
2. Confirmar que o dono do repo tem acesso ao **Copilot CLI** e que o recurso pode rodar via `GITHUB_TOKEN`; o uso de créditos Copilot **pode ser cobrado**, segundo o plano, orçamento e limites. Não habilitar sem consentimento. Ver https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions
3. Em **Settings > Actions > General**, permitir GitHub Actions criar pull requests e dar permissões necessárias ao `GITHUB_TOKEN` (o workflow já solicita `contents: write` apenas no job publicador). Sem isso, a PR não abre; não usar token pessoal em arquivos.
4. A partir desse momento, o agente só pede créditos quando um **teste falha** em commit novo e o incidente é novo (sem issue idêntica aberta). Para forçar nova investigação de uma falha registrada, use `Actions > A1 autonomo ... > Run workflow` marcando `tentar_reparo` (a variável precisa estar `true`). Podem existir várias PRs A1 independentes; duplicações da mesma falha continuam bloqueadas por issue.

**Alternativa:** configurar secret `OPENAI_API_KEY` e variável `ENABLE_A1_CODEX_AUTOFIX=true` para usar a ação Codex oficial em vez do Copilot. Uma variável basta; se ambas estiverem `true`, Copilot tem prioridade. A API tem cobrança separada do ChatGPT.

## Pipeline de segurança
1. Primeiro o CI de regressão fica vermelho com logs.
2. Codex ou Copilot trabalha em job **sem permissão GitHub de escrita**; gera patch local.
3. Um job separado (sem chave de API e sem capacidade de inferência) aplica o patch na última `main` e reexecuta os testes.
4. Se passar, abre somente **PR em rascunho** `agentes/a1/automatico-<run>` e deixa o merge para revisão.
5. Os arquivos `.github/`, `docs/`, `build-info.js`, `mundo-3d-prototype.js`, `eldoria-meshy-npcs.js`, `eldoria-npc-life.js`, artefatos e dados do agente ficam protegidos no publicador.

### Limitações
- Cinco minutos significa frequência de checagem, **não** que um programador consiga reproduzir, corrigir, validar e criar PR em cinco minutos.
- Sem Copilot habilitado ou segredo/API autorizado, não existe programação por modelo autônoma. Não chamar os testes automáticos de IA programadora.
- O monitor pega regressões cobertas pelos testes, não todo bug visual novo. O agente de cenas captura evidências, mas não reconhece sozinho todos os objetos da imagem. Criar novos testes aumenta cobertura.
- Workflows GitHub podem atrasar, ser suspensos pelo provedor ou consumir minutos/créditos dependendo da conta. 
