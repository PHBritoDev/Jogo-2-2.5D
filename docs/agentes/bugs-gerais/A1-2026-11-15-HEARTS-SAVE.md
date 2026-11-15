# A1 — Persistência e regeneração de corações (15/11/2026)

## Escopo
Módulo `hearts3d.js` e testes `hearts3d.test.mjs`. É um módulo real consumido pelo controlador `mundo-3d-prototype.js` (armazenamento `seven-sins-hearts`, atualização periódica do HUD e bloqueio de acesso a Bispos). Sem alterações na caverna do Claude.

## Bugs reproduzidos em Node (não são medições Android)

**A1-HEART-01 — relógio recua / timestamp futuro (P2):** `normalizeHearts({hearts:3,since:now+18_000_000}, now)` conservava o timestamp futuro; timer passava de três minutos e regeneração ficava bloqueada. Falha vermelha documentada: [run 43670907635](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43670907635), esperado `since=1000000`, real `19000000`. Corrigido normalizando o início da contagem ao instante atual quando vier do futuro.

**A1-HEART-02 — save negativo/NaN (P2):** data negativa pode gerar regeneração antecipada, enquanto data `NaN` retorna cronômetro `NaN`. Falha vermelha: [run 43671129108](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43671129108). Corrigido rejeitando timestamps negativos/não finitos em `tickHearts` e `msToNextHeart`. Regresso verde: [run 43671193425](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43671193425).

**A1-HEART-03 — valores inválidos de corações (P2):** JavaScript convertia `null`, strings vazias, booleanos e listas vazias para 0/1; um save corrompido podia zerar o contador. Falhas vermelhas: [run 43671242142](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43671242142) (campo vazio) e [run 43671514487](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43671514487) (tipo não numérico). Corrigido aceitando apenas número finito ou string numérica não vazia. `0` e `"0"` continuam estados válidos; ausência/corrupção usa comportamento padrão de 10.

## Verificações / critérios de aceite
- Testes de referência: jogador começa com 10, perde 1, recupera 1 a cada 180000 ms, até máximo de 10.
- Regressão de timestamp futuro, negativo e NaN.
- Regressão de saves vazios, corrompidos e numericamente válidos.
- Varredura determinística de **400 combinações** de saves checando contador inteiro [0,10], timestamp válido, timer [0,180000] e monotonicidade da regeneração.
- Fluxo de save → reload → meia espera → reload → recuperação → perda.
- [Última execução A1 verde: 43671592810](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43671592810), antes da criação deste relatório; execução de código de QA em Node, não teste de interface/touch nem FPS do aparelho.

## Riscos, próximos testes
- Persistência real no armazenamento do navegador e UI devem ser verificados em sessão WebGL/Android. O controlador salva no `localStorage`; não foi modificado aqui.
- Não atribuir ganhos de FPS nem declarar correção publicada: a alteração está na [PR draft #536](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/536), não mesclada.
- Reverter `hearts3d.js` e os novos testes caso o fluxo de QA jogável detecte regressão.
