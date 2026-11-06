# Agente V9 — preparação para novos modelos e diagnósticos de QA

**Dois objetivos:** receber futuramente personagens GLB mais elaborados sem perder as animações existentes e facilitar a investigação das rodadas de QA que falham.

## Antes de trocar um personagem
O validador recebe um GLB antigo e um novo, compara os **nomes dos clipes** e identifica animações que sumiram, novas animações, indícios de rosto (morph targets/ossos), tamanho em bytes e contagem aproximada de triângulos.

Exemplo (Node disponível apenas no GitHub Actions ou ambiente de desenvolvimento):

```sh
OLD_GLB='Protagonista.glb' NEW_GLB='NovoProtagonista.glb' node tools/visual-lab/asset-readiness-v9-run.cjs
```

O arquivo de saída `agente-v9/comparacao-glb.json` é apenas um relatório. **O agente não substitui nem altera nenhum modelo.** Ele exige verificação das animações, da movimentação de boca, do chão, das colisões, dos poderes e do desempenho no aparelho.

## Diagnóstico do laboratório
O orquestrador `rounds.cjs` agora inclui `diagnostics.codes` e `abilityEvidence` em cada resultado de rodada. Isso diferencia queda de infraestrutura, comando de magia sem fase observada e falha WebGL/JS quando há evidências. Alertas são pistas para investigação, não bugs confirmados.

O teste `asset-readiness-v9.test.cjs` cobre perda de animações, evidências reais, confusão de magias e relatório ausente.

A substituição de personagens, ataques restantes do Bispo 4 e Ganância, e o monstro lunar **permanecem congelados** até orientação do criador.
