# Auditoria 007 — lago escondido da floresta
Data: 2026-11-13 (BRT). Escopo: lago em x=-42,z=24. **Auditoria de código, não validação visual.**

## Coordenação e arquivos
- PR #489 permanece o espaço de trabalho desta IA; PR #481 (Claude) e demais PRs abertos continuam sujeitos a alterações concorrentes. Não tocar nos arquivos de cena sem verificar diffs atualizados.
- Fonte principal `eldoria-environment-art.js`, blob `a8d7b7d2524ab848e7ff33a13958a8d7db9b9dc2`; `eldoria-asset-plan.js`, blob `eea84452e5a3884d0bccab436aea652b34b96879`; `docs/eldoria-direcao-artistica-v2.md`, blob `03f725187b12df8e0277f4e4f2a2741145f38c7f`. Revalidar antes de editar.
- A prévia isolada usa `ELDORIA_ZONES.lago.target=[-42,-.4,24]`; `eldoria-cenario-preview.html` define `pondSdf(x,z)=hypot((x+42)/15,(z-24)/11)`.

## Achados confirmados por leitura
1. **Regularidade angular das margens:** 58 pedras/colchões musgosos são gerados por `angle=i*2π/58`, ou seja, intervalos angulares exatamente iguais; há ondulação determinística no contorno e raio variável via `rand(i,117)`. Isso pode deixar uma cadência artificial observável na margem, mas não é defeito visual confirmado.
2. **Detalhes na água:** 15 folhas aquáticas têm posições pseudoaleatórias no interior, com altura constante `y=-.917`; a espuma usa `y=-.915` e malha de 96 segmentos. A proximidade de cotas (diferença de 0,002 unidades) merece checagem de sobreposição e z-fighting; a altura real da lâmina de água precisa ser consultada no runtime antes de mudar valores.
3. **Forma da margem:** pedras usam raios de base 14.8/10.8, enquanto a função SDF de estudo usa 15/11. Espuma e pedras aplicam perturbações senoidais; não presumir alinhamento perfeito com o contorno efetivo da água. Medir sobreposição da espuma em todas as direções.
4. **Qualidade de objetos:** rochas de margem são `IcosahedronGeometry(1,0)` em lote instanciado; baixa complexidade geométrica economiza draw calls, mas pode parecer angular em close-up. `RochedoMusgoEldoria.glb` já está disponível no plano de assets (em -64,26), preferível a introduzir um modelo externo sem necessidade.
5. O documento de direção artística registra que o lago **não deve parecer disco isolado num gramado aberto**. O cenário deve ser avaliado em vista de aproximação, não só vista aérea.

## Melhoria candidata de baixo risco (não aplicada)
Se screenshots confirmarem cadência artificial, introduzir *jitter angular limitado e determinístico* nas pedras já existentes, mantendo 58 instâncias, geometria, material e batch. Evitar mudar espuma, água, altura e colisões sem diagnóstico. Comparar silhueta das margens e caminho até o lago. Alternativa: preservar a distribuição atual se já estiver natural.

## Teste obrigatório antes/depois
- Capturar câmera no ponto de aproximação da trilha e nos quatro quadrantes do lago, mesma seed, qualidade e FOV; conferir água, espuma, folhas e pedras na altura dos olhos e por cima.
- Validar no preview e no jogo real; medir draw calls, triângulos, stutter e FPS em Android real, não usar SwiftShader como prova de FPS mobile.
- Executar `tests/eldoria-preview.test.mjs` e testes ambientais relevantes, conferir interseções, caminho e colisão.
- Reverter qualquer regressão; não fazer merge ou auto-merge sem autorização.

## Resultado
Auditoria inédita do lago escondido. **Confirmada somente a cadência angular fixa do algoritmo e as cotas/contagens de geometria.** Não houve screenshot, vídeo, execução WebGL, medição mobile ou alteração de cenário nesta rodada. Nenhuma melhoria visual foi alegada como concluída.
