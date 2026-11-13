# Vórtice Abissal — Enemy2 (13/11/2026)

## Continuidade e isolamento
- PR #487: dash sombrio do protagonista, QA concluído, ainda sem merge.
- PR #493: Garras do Abismo do Enemy1, capturas e métricas antes/depois aprovadas, ainda em rascunho. Não repetir.
- Esta rodada: somente **Vórtice Abissal** do Enemy2 em `enemy2-chaos-vfx3d.js`, branch `vfx/enemy2-vortex-portal-qa-20261113`, PR #494 (rascunho). Outros PRs abertos #486 (combate), #488 (iluminação), #489 (ambiente), #490/#492 (áudio), #491 (bugs) não são modificados.

## Diagnóstico estático
- `drawVortex(s)` usa 3 discos de portal, um funil, dois anéis orbitais, 14 partículas na qualidade normal e corrente tubular que acompanha `s.path`.
- Materiais e buffers são reutilizados. Não alterar `s.T`, `s.path`, raio de colisão, fases ou efeitos de gameplay.
- Hipótese a verificar visualmente: a abertura começa com discos de raio `0.4 * R` e intensidade `open`; as três camadas podem dificultar leitura da formação em certos ângulos. A câmera de QA fica elevada e oblíqua para ver espessura do portal. Não modificar sem evidência.
- A chamada `disc` é compartilhada com outras habilidades: qualquer ajuste deve ficar estritamente em `drawVortex`.

## Agente visual e evidências
- [PR #494](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/494)
- [Execuções de QA do PR](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/494/checks)
- `vfx-enemy2-vortex-qa.html` + `tools/visual-lab/vfx-enemy2-vortex-qa.cjs`: capturas 960×540 de abertura 20%, 60%, 100%, retração 70% e modo baixo 60%, com `renderer.info` e relatório JSON.
- QA é cena isolada com trajetória simulada e SwiftShader, não prova FPS no Android real.

## Pendências
1. Confirmar que o workflow e os cinco PNGs realmente foram produzidos.
2. Inspecionar legibilidade e medir baseline antes de escolher refinamento.
3. Só aplicar mudança pequena e reexecutar QA; não mesclar automaticamente.
