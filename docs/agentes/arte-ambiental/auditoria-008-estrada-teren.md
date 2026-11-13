# Auditoria 008 — estrada de Teren, curva da garganta e emboscada
Data: 2026-11-13 (BRT). **Leitura estática, sem screenshots ou execução WebGL.**

## Região inédita
Prólogo ao sul de Eldória, estrada da carroça e aproximação da emboscada, em especial o trecho entre `TEREN_STOP=(59.5,136)`, `BROKEN_WHEEL=(62.4,128.5)` e `BANDIT_AMBUSH=(73.6,90)`. Fonte: `act1-world-layout.js` da main, blob `0f1c663d2e3343d71d79d2c33aea569d932a5a96`.

## Evidências verificadas no código
- A garganta utiliza `TEREN_ORIGIN` com 8 pontos, de (86,282) até (56,171), em curva; `TEREN_ROAD` continua pela carroça até (52,10). A estrada foi desenhada para esconder visualmente a carroça até a curva; isto é intenção de composição/narrativa, **não** defeito.
- O trecho da estrada entre (76,98) e (71,76) contém a emboscada em (73.6,90). Os cinco bandidos se distribuem nos dois lados e à frente/atrás, com `ROAD_BANDITS` definido no mesmo módulo. A disposição deve ser verificada em visão de carroça e em terceira pessoa antes de mudar qualquer ponto.
- `ROAD_TERRAIN_PATCH` cobre x=[18,118], z=[40,294]. É um envelope de terreno para a garganta, não prova de que todas as curvas estejam livres de rochas ou árvores.
- `prologue-road-flow.js` usa `nearestAlong(CART_ROUTE, BANDIT_AMBUSH.x, BANDIT_AMBUSH.z).s - 3.5` para a progressão da emboscada; reposicionar a emboscada ou estrada sem sincronizar fluxo/IA pode quebrar o roteiro.
- `eldoria-mod291.test.mjs` confere cinco bandidos a menos de 8 unidades do centro, mas não demonstra visibilidade de cada inimigo, ausência de vegetação no caminho ou posicionamento da câmera.
- PR #481 de Claude cobre o prólogo e já documenta capturas no workflow `prologue-mod317-evidence.yml`. Consultar esse artefato antes de criar nova captura; evitar conflito com Claude. PRs #488 (iluminação) e #489 (arte) também devem ser conferidos.

## Riscos e oportunidade artística — NÃO confirmados visualmente
1. **Legibilidade da curva em S:** manter o momento de revelação da carroça sem fazer a estrada parecer uma faixa de terreno recortada artificialmente. Verificar silhueta de encostas, bordas do caminho, vegetação e horizonte.
2. **Emboscada:** garantir cinco silhuetas distintas e espaço livre para manobrar, sem decorar o corredor de combate com pedras que causem bloqueio. Preservar a narrativa e posições dos bandidos.
3. **Roda quebrada:** confirmar que carroça, roda, chão e acostamento estão integrados e que a pista continua utilizável. Não adicionar objetos sem verificar acesso e custo.

## Melhoria candidata e gates
Se as capturas comprovarem bordas excessivamente retilíneas ou repetição, ajustar apenas o **acabamento visual do acostamento** com geometria/material já existente e distribuição determinística, sem mudar centro da estrada, largura navegável, terreno, gatilhos ou colisões. Comparar as mesmas câmeras no ponto de parada, curva e emboscada, dia/noite do prólogo; validar `prologue-mod317-evidence.yml`, `tests/mod317-prologo.test.mjs`, `eldoria-mod291.test.mjs` e métricas de draw calls/triângulos. Benchmark FPS/stutter exige Android real, não SwiftShader.

## Resultado da rodada
Verificados os dados de layout e os vínculos da emboscada com o roteiro; **não foi confirmado defeito visual**, não houve execução do jogo, fotos/vídeos, benchmark Android nem edição de cenário. Esta documentação é a única alteração desta rodada. Não realizar merge ou auto-merge sem autorização.
