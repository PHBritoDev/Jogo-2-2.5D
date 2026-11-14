# Execução contínua dos agentes — arquitetura recomendada (proposta técnica, não ativada)

**Estado em 14/11/2026:** A1–A6 têm agendamentos ChatGPT horários independentes. O GitHub possui um roteador por eventos em `.github/workflows/equipe-5-agentes-roteador.yml`, que **apenas transforma pedidos da central #519 em Issues e registra merges**. Isso **não invoca um modelo**, não acorda chats, não implementa código e não cria execução contínua.

## Limitações verificadas
- Tarefas ChatGPT de agendamento por tempo: no máximo uma execução por hora.
- Alguns planos podem acionar tarefas ChatGPT por eventos GitHub (atividades de PR). A disponibilidade é variável; essa configuração deve ser feita pelo usuário na interface de Scheduled/Tasks e depende de acesso à integração. Evento **não equivale** a trabalho ininterrupto e não garante que a execução possa aplicar código.
- GitHub Actions: cron mínimo de 5 min; execuções podem atrasar e não garantem precisão temporal. Agendamento **não transforma um workflow em IA**.
- GitHub Action Codex (`openai/codex-action@v1`): permite programação em GitHub Actions com chave da API como GitHub secret; custos e quotas da API são separados do plano ChatGPT. Não conectar sem aprovação e orçamento.
- Codex Cloud pode realizar tarefas remotas, mas **não existe** aqui uma fila Codex Cloud integrada à central que trabalhe sem parar por simples criação deste documento.

## Solução recomendada em fases
### Fase 0 — já disponível sem configuração paga
A1–A5 continuam em suas rodadas horárias. A6 integra PRs elegíveis durante sua rodada horária, conforme `07-AGENTE-INTEGRADOR.md`, obedecendo os controles atuais e evitando alterações do Claude na caverna.
Central #519 distribui e audita solicitações; **não desperta agentes**.

### Fase 1 — ChatGPT acionado por eventos (quando disponível)
Criar **uma tarefa separada de A6 disparada por eventos GitHub de PR criada/atualizada**, filtrada para o repo e PRs A1–A5. A tarefa revisa a PR, não começa execução se outra rodada do A6 estiver integrando, e bloqueia qualquer PR não elegível. O chat horário pode permanecer como fallback se a configuração não causar duplicação.
**Habilitação** deve ocorrer na interface da conta e depende de conector/eventos. Não alegar que está ativa até receber comprovação.

### Fase 2 — executor real de código (precisa consentimento de custo)
Em GitHub Actions, usar cron de 5–10 minutos **apenas como despachante** + eventos PR/Issue. Manter fila por especialidade, status `queued/claimed/running/pr-open/review/merged/blocked`, TTL/lease, trava de concorrência **uma execução por domínio**, limites globais e deduplicação; evitar reprocessar a mesma Issue.
Somente rodar `openai/codex-action@v1` com `OPENAI_API_KEY` configurada como GitHub Secret após aprovação explícita dos custos. Definir modelos, limite de tokens/custo por execução/dia/semana, tempo de runner e alertas de orçamento. Segredos **nunca** repassados a PR não confiável, testes sem isolamento ou texto de comentários não sanitizado; evitar `pull_request_target` executando código arbitrário.
Se não houver tarefa pronta, **não iniciar modelo**; nenhum loop infinito. Se PR do agente está aberta, trabalhar na mesma PR ou aguardar A6, sem abrir segunda. Um job só reclama tarefa após verificar que não há branch concorrente e que a área não pertence ao Claude.
A6 executa integração por eventos/rodadas com CI/evidências e sem merges arriscados. O GitHub Pages recebe apenas código mesclado e validado, com rollback.

## Travas não negociáveis
- Não tocar na caverna de Eldória em reconstrução pelo Claude sem autorização do responsável.
- Nenhuma função pode desabilitar testes, forçar check verde, apagar trabalho de outra branch, fazer force-push ou merge de PR fora da equipe.
- Não basta a CI passar para aprovar VFX, iluminação ou mapa: exigem imagens/vídeos do **jogo real** e análise de custo mobile.
- Decisão criativa fundamental não é merge rotineiro.
- Não usar agentes que executem em intervalo de 5 min para gerar PRs inúteis, loops ou mudanças sem necessidade.
- Todo job deve ter limites de tempo, concorrência, tentativas e mecanismo de pausa.

## Pré-requisitos para ativar a Fase 2
1. Autorização explícita do criador para **uso de API paga** e teto de gasto.
2. Provisionamento de chave/secret com permissões mínimas, sem compartilhar credencial em chat.
3. Confirmação de disponibilidade de runners Actions, proteção de branch e ambiente/repo.
4. Ensaio em modo seco, com Issue de teste e sem alteração do jogo; depois piloto **A1 único**, depois A6; expandir A2–A5 somente depois de estabilidade.

## Fontes oficiais
- https://learn.chatgpt.com/docs/automations
- https://learn.chatgpt.com/pt-BR/docs/github-action
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target

**Importante:** esta é uma arquitetura de implantação, **não** uma ativação; não existe custo novo de modelos nem operação contínua por criar este documento.
