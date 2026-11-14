# Central de comunicação — cinco agentes do RPG
**Canal ativo de mensagens:** https://github.com/PHBritoDev/Jogo-2-2.5D/issues/519
**Pasta:** `docs/equipe-5-agentes/` | **Responsável final:** criador do jogo

## Objetivo
Este é o **sexto arquivo** pedido pelo criador: manual, índice de decisões e protocolo do chat geral entre as cinco especialidades:
- **A1** — Bugs, QA e estabilidade: `01-AGENTE-BUGS.md`
- **A2** — Combate, animações e VFX: `02-AGENTE-COMBATE-VFX.md`
- **A3** — Mundo, ambiente e level design: `03-AGENTE-MUNDO-AMBIENTE.md`
- **A4** — Iluminação, sombras e atmosfera: `04-AGENTE-ILUMINACAO.md`
- **A5** — História, mistérios e direção narrativa: `05-AGENTE-HISTORIA.md`

**Por que GitHub Issue?** Todos podem ler o mesmo histórico e responder com comentários, evitando colisões de escrita num arquivo versionado compartilhado. O arquivo guarda o **protocolo**, e o Issue guarda a **conversa concreta**. Os cinco chats ChatGPT **não conversam em tempo real automaticamente**: cada agente deve ler o Issue no começo e antes de abrir PR, escrever suas solicitações e consultar respostas em sua próxima execução. Sem disparar novos agendamentos.

## Formato de pedido (comentário no Issue #519)
```text
[PEDIDO A5-001] De: A5 História | Para: A3 Mundo
Local e commit-base: ...
Necessidade concreta: ...
Motivo no gameplay/história: ...
Alternativa mais barata usando ambiente existente: ...
Arquivos que podem conflitar: ...
Critério de aceite e provas: ...
Prioridade: P0/P1/P2/P3 | Status: PROPOSTO
```
Respostas devem citar ID: `[RESPOSTA A5-001] A3: ACEITO / ALTERNATIVA / BLOQUEADO; plano/PR/razão...`. Quando entregue, `[CONCLUÍDO A5-001] PR #... evidências ...`. **Nunca assumir aceite pelo silêncio.** Falta de resposta não autoriza sobrescrever outro subsistema.

### Exemplos de integração
- **A5→A3:** criar trilha opcional para revelar passado de um morador. A3 confere terreno, lore, distâncias e impacto; A5 mantém controle de gatilho e recompensa.
- **A2→A4:** clarão de Espada Celestial no frame do impacto; A4 propõe emissão ou luz local barata, A2 preserva dano e VFX da habilidade.
- **A3→A4:** bosque escuro sem leitura de caminho; A4 ajusta luz filtrada e contraste; A3 não adiciona fachos artificiais.
- **A1→A2/A3/A4/A5:** bug comprovado tem dono por causa-raiz; o autor corrige e A1 valida.
- **A5→A1:** cena narrativa precisa teste de save/reload e prevenção de softlock.

## Regras de decisão
1. Prioridade à **ordem mais recente do criador** e aos documentos canônicos do repositório; o Issue não pode alterar unilateralmente a visão mestra.
2. Responsável pelo domínio implementa; agente solicitante fornece requisitos e testa integração; **um PR por proprietário e por mudança lógica**.
3. Elementos existentes são **preservados por padrão**. Uma referência de anime ou jogo conhecido orienta qualidade/coreografia, não autoriza importar propriedade intelectual.
4. O trabalho do **Claude na caverna de Eldória** fica isolado enquanto estiver em andamento. A3/A4/A5 só fazem sugestões/QA em leitura ou pedem consentimento antes de alterar.
5. Não mesclar automaticamente. Integrador humano ou explicitamente autorizado revisa conflito de branches, CI e evidência visual. Nenhum agente pode alterar `build-info.js` por conta própria.
6. **Pesquisar antes de mudanças**, distinguindo observação no runtime, hipótese, referência e evidência. Se falta visual, usar ferramentas do jogo/CI ou pedir captura; não fingir.
7. Sem automações de hora em hora nesta equipe até autorização explícita do criador. Criar cinco chats separados não os torna autônomos continuamente.
8. Comunicação com criador: **“Não envie mensagens de progresso nem resumo final; registre resultados apenas no GitHub.”**

## Critérios de entrada / saída de cada rodada
**Entrada:** ler instruções próprias + este arquivo, mensagens recentes do Issue, main/PRs, contrato de agentes; escolher uma intervenção útil e pequena dentro do domínio. Se pedido cruzado, pedir aceite no Issue antes de alterar subsistema alheio.
**Saída:** PR pequena em branch exclusiva, testes de regressão, capturas/vídeos do runtime antes/depois quando visual, tabela resumida de custo e riscos, link ao Issue do pedido. Se uma dependência estiver bloqueada, contribuir no próprio domínio em vez de esperar sem atividade.

## Referências de pesquisa verificadas
- GitHub — PRs e proteção da main: https://docs.github.com/en/pull-requests/reference/pull-requests ; https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Three.js — sombras e custo por passe: https://threejs.org/manual/pages/shadows.html
- Three.js — otimizar muitos objetos: https://threejs.org/manual/pages/optimize-lots-of-objects.html
- Unity — armadilhas comuns de overdraw/partículas/luzes em dispositivos móveis: https://docs.unity3d.com/kr/2018.3/Manual/MobileOptimizationGraphicsMethods.html
- GDC — narrativa interativa, design de escolhas e storytelling ambiental: https://gdconf.com/call-for-submissions/
- Fontes são pontos de partida. Cada agente deve validar versão, motor e aplicabilidade **no código deste jogo** antes de executar.

## Roteador por eventos (implementado em 14/11/2026)
Workflow: [`.github/workflows/equipe-5-agentes-roteador.yml`](../../.github/workflows/equipe-5-agentes-roteador.yml).

**O que ele FAZ:** quando um colaborador com permissão de escrita comenta no Issue #519 no formato `[PEDIDO A5-001] ... Para: A3` (ou `[PEDIDO] ID: A5-001 ... Para: A3`), a Action cria um **Issue de tarefa** identificado por destinatário, vincula o comentário e responde na central com o link. Quando uma PR de branch `agentes/a1/...` a `agentes/a5/...` é mesclada, a Action registra o acontecimento na central.

**O que ele NÃO FAZ:** não executa ChatGPT/Claude/Codex, não ativa chats, não interpreta ou implementa código, não agenda a cada 5 minutos, não faz merge, não acessa segredos nem usa API de IA. É organização assíncrona e automática, não autonomia ininterrupta. O destinatário deve consultar sua fila ao começar a rodada.

**Segurança e custo:** só autores com permissão write/maintain/admin podem criar tarefas pelo comentário; o texto da tarefa é conteúdo não confiável e deve ser verificado antes de qualquer execução. O workflow consome minutos de GitHub Actions conforme a franquia da conta, mas não faz chamadas pagas a modelos. Se o fluxo falhar, verificar a aba Actions; nenhuma entrega pode ser considerada executada só porque uma solicitação foi roteada.

**Para ativar trabalho autônomo de programação no futuro:** é necessária uma integração de execução explicitamente configurada (por exemplo Codex Action com credencial/API e orçamento aceitos pelo criador), limites por tarefa, autorização por papéis, revisão humana de PR e proteção contra ciclos. **Não conectar chaves, compras ou execução paga sem aprovação explícita.**

**Referências:** https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target ; https://learn.chatgpt.com/pt-BR/docs/github-action ; https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
