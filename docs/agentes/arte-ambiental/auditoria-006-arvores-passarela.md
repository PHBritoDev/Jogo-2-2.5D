# Auditoria 006 — árvores ancestrais, casa suspensa e passarela
Data: 2026-11-13 (BRT). Inspeção estática da main; **sem execução WebGL, screenshot, vídeo ou benchmark Android**.

## Coordenação
- Revisados PRs abertos; Claude #481, arte #489, iluminação #488, áudio #498, VFX #493/#497/#499 e bugs #491 coexistem. Nenhum arquivo de cena de outra IA foi editado. A branch deste agente recebe apenas este relatório.
- Código consultado: `eldoria-city-layout.js` blob `3cc42a4c6c11dfa6f6f822dac0db0bd66cfe0705`; `eldoria-live-village3d.js` blob `900f3fbd921633043a14696fc76daa8c83f5aa2e`; `eldoria-mod292.test.mjs` blob `6ee48daa62601ea52887e3b408b716536b98a85e`. Revalidar hashes antes de modificar.

## Evidência confirmada no código
1. `ELDORIA_MAIN_TREE` (offset -1,-26, size 34) e `ELDORIA_SIDE_TREE` (offset 27,-14, size 28) **usam o mesmo arquivo** `ArvoreAncestralEldoria.glb`. Em `mountEldoriaLiveVillage`, o afundamento é selecionado por `spec.file === ELDORIA_MAIN_TREE.file ? .20 : ANCESTRAL_ROOT_SINK` (constante .08). Como os dois nomes de arquivo são iguais, **ambas as árvores entram no ramo .20**, e a alternativa .08 nunca é usada para a lateral. Isto é um erro de seleção comprovado, não apenas hipótese de arte.
2. O comentário imediatamente anterior diz que a lateral mantém a cota original para preservar acesso à casa e passarela, mas a condição implementada não distingue as duas. Consequência geométrica possível: a lateral (size 28) é posicionada 5,6 unidades abaixo de `lo`, em vez de 2,24 unidades com .08 — diferença **3,36 unidades**, *antes de considerar escala e geometria real*. A colisão/estrutura suspensa pode ser afetada; não alegar bug jogável sem teste.
3. `treeStructurePlan()` constrói dois anéis, plataforma lateral 7×7, escada em U com dois lances e passarela de largura 1,7; há teste estático para geometria e acesso (`eldoria-mod292.test.mjs`), mas esse teste **não verifica o afundamento aplicado ao GLB**. O plano e o GLB devem ser comparados em jogo.

## Correção candidata, condicionada a QA e coordenação
- Separar a identidade por `spec.kind === 'tree' && spec.x === ELDORIA_MAIN_TREE.x && spec.z === ELDORIA_MAIN_TREE.z`, ou preferivelmente adicionar `role`/identificador explícito à spec e escolher o afundamento por papel, não por arquivo compartilhado.
- **Não aplicar cegamente**: a cota .20 pode ter sido ajustada visualmente para as duas árvores, e restaurar .08 pode expor raízes ou desalinhá-las com a casa suspensa. Inspecionar base, acesso, escada, anéis e passarela antes de qualquer mudança. Não alterar `eldoria-live-village3d.js` enquanto Claude #481 ou outro agente o estiver usando.

## Protocolo de validação
1. Capturar a lateral no pé da escada, na plataforma, no anel e de baixo da passarela; capturar a colossal do eixo da ponte. Fixar mesma câmera, qualidade e build para comparação.
2. Verificar alturas de GLB/terreno, contato das raízes, continuidade da escada e anéis, visibilidade e navegação, sem colisões invisíveis.
3. Alterar apenas a seleção de `rootSink` numa branch isolada, após confirmar disponibilidade; comparar A/B e rodar `eldoria-mod292.test.mjs` e os testes relevantes. Medir draw calls, triângulos, FPS/stutter Android; nenhuma regressão aceitável.
4. Reverter se piorar composição, raiz ou acesso. Manter PR em rascunho; **NUNCA fazer merge/auto-merge sem autorização**.

## Resultado
**Um defeito lógico comprovado** (comparação pelo mesmo nome de arquivo) e um risco espacial quantificado (diferença 3,36 unidades). Nenhum defeito visual confirmado, nenhuma alteração no cenário, nenhum teste executado e nenhum merge.
