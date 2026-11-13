# Auditoria VFX — Barragem Abissal (Enemy3) — 13/11/2026

## Continuidade e conflitos
Revisados os PRs abertos até #503, incluindo VFX #487 (dash), #493 (garras Enemy1), #494 (vórtice Enemy2), #497 (chuva de estrelas), #499 (Ruptura X) e #501 (Santuário Enemy4). Este ciclo seleciona exclusivamente a **Barragem Abissal do Enemy3**, ainda não auditada. Alterações em branch exclusiva e PR #504 em rascunho. Nenhum merge. Não editar lógica de `enemy3-squad3d.js`, controles, IA, dano ou cooldown. Evitar módulos modificados por Claude e outros agentes.

## Implementação inspecionada
`enemy3-abyss-vfx3d.js`, função `drawBarrage(s,boss,focus)`: fendas verticais/oblíquas por `InstancedMesh`, shader próprio de recorte das espadas no plano de cada fenda, brilho magenta e lâminas escuras. Os estados visuais dos portais são `open`, `emerge`, `aim`, `ready` e `retract`; `s.portals` e `s.swords` vêm da lógica de combate. Há limite de 40 fendas instanciadas por quadro e orçamento `NS` para espadas. Sem evidência de defeito comprovado até conferência visual.

## Protocolo
Laboratório `vfx-enemy3-barrage-qa.html` + `tools/visual-lab/vfx-enemy3-barrage-qa.cjs`, workflow `.github/workflows/vfx-enemy3-barrage-qa.yml`. Fotografar 4 situações: abertura frontal, formação frontal, prontidão frontal e prontidão lateral; registrar `render.calls`, `render.triangles`, texturas e geometrias. Inspecionar silhueta, plano de recorte e progressão das espadas antes de modificar o efeito. Se não houver defeito perceptível, preservar implementação original.

## Fontes técnicas
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): lote de objetos com mesma geometria/material.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): métricas do renderer.info.
- [PR #504 e capturas](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/504/checks).

## Limitações e próximos passos
Laboratório é cena simplificada, não representa a luta real nem desempenho no Galaxy A55. Conferir artefatos PNG e `report.json` da Actions; comparar com a referência e decidir se é preciso refinar uma única propriedade visual. Não atribuir melhorias de FPS a SwiftShader. PR rascunho sem merge.
