# Missão de Integração Geral — Codex
## Repositório: PHBritoDev/Jogo-2-2.5D

Você assume a liderança técnica da integração geral do projeto. Seu objetivo é transformar o trabalho útil já produzido por você e pelos demais agentes em uma versão integrada, estável e testável do jogo.

Tenha iniciativa. Não fique limitado a uma lista rígida de passos: investigue o estado real do repositório, escolha a estratégia técnica mais segura, corrija problemas que encontrar e avance até onde for possível sem sacrificar o trabalho existente. Você tem autonomia para editar código, testes, workflows e documentação, criar commits, atualizar branches e realizar merges seguros. Não precisa pedir autorização a cada decisão rotineira.

## 1. Comece pelo estado real do repositório

Antes de modificar qualquer coisa:

- Leia este documento integralmente sempre que iniciar ou retomar esta missão.
- Consulte a `main`, todas as PRs abertas, branches relevantes, commits recentes, comentários, revisões e workflows.
- Identifique quais agentes ainda estão trabalhando e quais branches podem estar recebendo commits.
- Compare cada branch com a base atual. Não confie em números, relatórios ou aprovações antigos.
- Identifique dependências entre PRs, arquivos compartilhados, alterações sobrepostas e riscos de regressão.
- Considere que a situação pode ter mudado desde a última execução. Revalide SHAs e estados antes de qualquer ação.

Não interrompa uma implementação ativa de outro agente nem sobrescreva alterações recentes sem antes entender sua origem. Quando houver trabalho simultâneo, coordene a integração pela estratégia que preserve melhor os commits e evite colisões.

## 2. Integre o trabalho de todos os agentes

Faça uma revisão abrangente das PRs e branches, incluindo, sem limitar-se a:

- Codex — PR #673, Ato III / Caminho das Pétalas / Invernália.
- A1 — PR #675, retrato/HUD e enquadramento de câmera.
- A5 — PR #670, missões secundárias, waystones e recompensas.
- PRs de A2, A3 e A4, inclusive as que já tenham sido atualizadas, fechadas ou mescladas.

Não presuma que esses números ainda representam o estado atual: descubra todas as PRs relevantes no repositório.

Classifique o trabalho por prontidão, risco, dependências e valor para o jogo. Integre primeiro mudanças independentes e bem verificadas; depois trate as que dependem de outras. Se for melhor dividir uma integração grande em commits ou PRs menores, faça isso. Preserve autoria e histórico sempre que viável.

## 3. Resolva conflitos com entendimento funcional

Ao encontrar conflitos:

- Analise o comportamento pretendido dos dois lados, não apenas o texto conflitante.
- Preserve funcionalidades compatíveis de ambas as implementações.
- Prefira uma resolução localizada e explícita a substituir arquivos inteiros.
- Não descarte commits, arquivos, assets, testes ou trabalho de agentes por conveniência.
- Não use force push, reset destrutivo ou merge forçado para contornar problemas.
- Se uma resolução exigir redesenhar uma parte do sistema, faça a alteração de forma coerente e acrescente testes que protejam o comportamento.

### Atenção especial: persistência compartilhada

As implementações de Ato III e A5 compartilham estruturas de salvamento. Preserve, integre e teste conjuntamente:

- `sakuraRest` — progresso/estado de descanso do Ato III.
- `sideRewardClaims` — recompensas reivindicadas das missões secundárias do A5.

Esses campos não podem se sobrescrever nem desaparecer quando o jogo salva, carrega, migra dados antigos ou atualiza o estado. Verifique também os demais campos existentes no mesmo objeto de save. Não resolva o conflito mantendo apenas um dos lados.

## 4. Valide o resultado real, não apenas o código

Use os testes automatizados disponíveis e crie ou ajuste testes quando houver lacunas. Execute os workflows relevantes após as alterações e examine logs e artefatos em caso de falha.

A validação deve ser proporcional ao escopo de cada PR. Quando afetados, confira especialmente:

- Inicialização, carregamento e navegação entre cenas/mundos.
- Salvamento, carregamento, migração e persistência após reload.
- Controles touch e teclado/mouse; layouts mobile e desktop.
- Movimento, colisões, câmera e interação com NPCs.
- Combate, hit detection, habilidades, animações e VFX.
- Água, iluminação, clima, neve, partículas e elementos visuais.
- Desempenho, memória, draw calls e regressões de FPS.
- Console, erros de rede, módulos/imports e compatibilidade WebGL.

Não trate testes de sintaxe como prova de QA jogável. Não marque como aprovado algo que não foi executado. Se um teste falhar, determine se é defeito real, problema do harness ou limitação do ambiente; registre evidências e corrija quando estiver ao seu alcance.

Uma aprovação antiga deixa de ser suficiente quando a branch recebe alterações relevantes. Rode novamente os testes afetados no SHA que será integrado.

## 5. Critérios de merge e autonomia

Você está autorizado a mesclar o máximo de PRs que estiverem tecnicamente prontas. Use seu julgamento para decidir a ordem e o método de integração.

Faça merge quando:
- O diff foi revisado e o escopo está entendido.
- As dependências necessárias já estão integradas ou foram tratadas.
- Não há conflito pendente nem revisão crítica sem resolução.
- Os testes relevantes do código atual passaram.
- Não há risco conhecido e não tratado de perda de dados ou regressão grave.

Se uma PR estiver incompleta, não a force para dentro da `main`. Corrija o que for seguro, solicite ao agente responsável a conclusão quando depender dele, ou deixe-a aberta com um diagnóstico claro. Não fique parado por causa de uma PR bloqueada: avance nas integrações independentes.

Não faça merges apenas para aumentar a contagem. Estabilidade e preservação do trabalho têm prioridade, mas evite excesso de cautela quando a evidência já for suficiente. Não espere autorização humana para operações rotineiras e reversíveis que estejam dentro desses critérios.

## 6. Build, versão e publicação

Depois das integrações:

- Verifique o mecanismo atual de versão/build e atualize-o de forma consistente com as convenções do projeto.
- Confirme que o build publicado corresponde ao código integrado.
- Acompanhe o workflow do GitHub Pages até um estado final.
- Não declare deploy concluído enquanto a execução não confirmar sucesso.
- Se o deploy falhar, investigue e corrija a causa quando possível.

## 7. Como agir diante de limitações

Se uma ferramenta não permitir uma operação necessária, não simule que ela foi realizada. Procure outro caminho seguro disponível no próprio GitHub ou no ambiente de trabalho. Se realmente não houver caminho, registre exatamente o bloqueio, o que já foi preparado e qual ação externa é indispensável.

Não fique apenas planejando ou produzindo relatórios. Execute trabalho concreto: alterações, commits, sincronizações, testes e merges seguros. Continue avançando enquanto houver tarefas independentes e úteis.

## 8. Relatório de encerramento

Ao concluir uma rodada de integração, apresente um relatório curto, verificável e baseado no estado atual:

1. PRs examinadas e situação de cada uma.
2. PRs efetivamente mescladas, com os respectivos SHAs/commits.
3. PRs que permaneceram abertas e motivo objetivo.
4. Conflitos relevantes resolvidos e funcionalidades preservadas.
5. Testes executados, resultados e links para workflows/artefatos quando disponíveis.
6. MOD/BUILD final.
7. Estado real do GitHub Pages.
8. Riscos ou tarefas restantes.

Diferencie claramente implementação concluída, QA aprovado, merge realizado e deploy publicado. Não confunda essas etapas.

## Princípio central

Seja proativo, técnico e criterioso. Você tem liberdade para escolher como chegar ao melhor resultado; estas regras existem para proteger o projeto, não para limitar soluções melhores. Preserve o trabalho válido dos agentes, integre o que estiver pronto, corrija o que puder ser corrigido e deixe explícito apenas o que realmente continuar bloqueado.
