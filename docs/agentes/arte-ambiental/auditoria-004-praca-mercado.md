# Auditoria 004 — praça, mercado e poço de Eldória
Data: 2026-11-13 (BRT). Região nova, não coberta em detalhe pelas auditorias 001–003. Método: inspeção estática do código da main e do script de QA; **sem execução de WebGL ou imagens nesta rodada**.

## Estado da coordenação
- Verificados PRs abertos no GitHub, incluindo Claude #481, direção ambiental #489, iluminação #488, combate #486, bugs #491, VFX #493/#494/#497 e áudio #490/#492/#495/#496. Não tocar em código de outros agentes.
- O módulo `eldoria-live-village3d.js` tem 212 linhas, blob `900f3fbd921633043a14696fc76daa8c83f5aa2e`; o gerador `eldoria-scene-details.js` tem 111 linhas, blob `0a187d60eab3bba0ebca31b105baeb682a9518a0`. Essas são referências da main lida nesta rodada, não garantia de que não mudaram depois.

## Inventário espacial e achados
- Centro da vila: x=-12.2,z=-44.5. Três barracas definidas em `ELDORIA_MARKET`, offsets relativos ao centro: (-10,-4), (10,4), (-4,4); raio aproximado de colisão 1.22. A frase de comentário **“Duas barracas conservadas” está incorreta**: o array contém três. Não é erro de renderização, mas pode confundir manutenção e QA. Não alterar o código durante trabalho de Claude.
- Poço: `PocoEldoria.glb` em offset (-1.4,-.6), escala 3.15, colisão 1.2; fonte quase seca: offset (-7.5,7.5), raio 1.55. Há helper `addScarceWaterDrops()` que usa uma única `InstancedMesh` para gotículas. **Não adicionar água abundante**: a escassez faz parte da narrativa ambiental.
- `eldoria-live-village3d.js` contém `footprintSamples()`, `planOverlaps()`, `footprintRadius()`, ancoragem pela menor altura do terreno, além de LOD com proteção de UV. A presença desses mecanismos não comprova ausência de interseções no jogo.
- `eldoria-scene-details.js` exclui vegetação num raio de 18 m ao redor de (5,-43), e a menos de 2.5 m de estradas. O centro da vila usado em outros módulos é (-12.2,-44.5), **17.27 m afastado** desse centro de exclusão. Isso é um **desalinhamento de centros verificável no código**, mas não confirma que há plantas atravessando barracas/casas: a área pode ter intenção distinta e depender de outros filtros. Deve-se inspecionar visualmente o perímetro oeste, onde a zona de exclusão pode ser insuficiente.
- `tools/visual-lab/eldoria-city-sweep.cjs` já fornece tomadas `praca-mercado`, `barracas-oeste`, `barracas-leste`, `poco` e `fonte-quase-seca`, com viewport 852x480 emulado e 1280x720 desktop, screenshots e vídeos. Ele usa SwiftShader, **não GPU Android real**.

## Prioridade e intervenção candidata
**Prioridade:** inspecionar a borda oeste da vila e as três barracas, confrontando a exclusão de vegetação em (5,-43) com o centro real da vila (-12.2,-44.5). Se houver vegetação atravessando casas, soleiras ou bancas, corrigir apenas o filtro espacial, sem aumentar draw calls, sem remover vegetação fora da área e sem alterar NPCs/roteiro. Verificar se o filtro deve usar um polígono de ocupação, não apenas raio circular; antes de implementar, reconciliar Claude #481 e dependências do gerador.

## Validação necessária
1. Rodar `tools/visual-lab/eldoria-city-sweep.cjs` com build local servida na porta 4173; conferir falhas de load e capturas das três barracas, poço, fonte e borda oeste.
2. Medir interseções de vegetação com as pegadas reais dos GLBs, passagem e orientação das portas. Confirmar que não existem crianças na vila, e que o poço permanece praticamente seco.
3. Se confirmado defeito, modificar em branch isolada, testar A/B com mesmas câmeras, comparar `renderer.info`, checar rotas e FPS em Android físico. Reverter se visual ou desempenho piorarem.
4. Atualizar PR #489 em rascunho; **nunca mesclar/auto-merge sem autorização**.

## Resultado desta rodada
Uma inconsistência documental e uma divergência de coordenadas foram **confirmadas pela leitura**; **nenhum defeito visual foi confirmado**, nenhum arquivo de cena alterado, nenhuma captura, benchmark ou merge realizado. A melhoria permanece condicionada à validação visual e à ausência de conflitos.
