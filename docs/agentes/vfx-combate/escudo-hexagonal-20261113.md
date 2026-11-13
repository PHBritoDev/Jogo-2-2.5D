# Auditoria VFX — Escudo Hexagonal (13/11/2026)

## Continuidade e isolamento
PRs VFX #487, #493, #494, #497, #499, #501 e #504 já foram mesclados na main segundo consulta ao GitHub em 13/11/2026. O PR #504 da Barragem Abissal teve QA WebGL aprovado; não repetir a habilidade. PRs atualmente abertos #507 (áudio), #473 (história), #468 (HUD) e PRs antigos de cenário não são tocados. Este ciclo se restringe a `shield-vfx3d.js` e ao laboratório visual.

## Habilidade: escudo de hexágonos
`createShieldVFX(T,scene)`: cúpula Goldberg de duas passadas (frente/fundo) e anel no chão; peles celeste e abismo. O shader recebe `uAppear`, `uDamage`, `uHits`, `uShatter` e `uFade`. O estado de jogo vem de `EnergyShield` e não será alterado. Verificar legibilidade de impactos e fissuras, consistência da cúpula vista de lado, custo das duas passadas e estilhaçamento. Não aumentar draw calls sem benefício visual comprovado.

## Evidências e método
Laboratório isolado `vfx-shield-qa.html`, script `tools/visual-lab/vfx-shield-qa.cjs`, workflow `.github/workflows/vfx-shield-qa.yml`. Seis capturas: celeste intacto, atingido, danificado, lateral; abismo intacto e quebrando. Medições: `WebGLRenderer.info.render.calls`, `triangles`, `memory.geometries`, `memory.textures`. [PR e artefatos](https://github.com/PHBritoDev/Jogo-2-2.5D/pulls). A cena simplificada não prova FPS de Android nem aparência na campanha.

## Referências
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/docs/pages/ShaderMaterial.html
- https://threejs.org/docs/pages/BufferGeometry.html

## Decisão pendente
Aguardar e conferir as seis capturas reais antes de modificar qualquer VFX. Se a cúpula estiver legível, preservar o código original. Nunca mesclar automaticamente.
