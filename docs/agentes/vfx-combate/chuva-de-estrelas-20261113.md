# Chuva de Estrelas Celestiais — auditoria de VFX (2026-11-13)

## Coordenação
PR #497, branch exclusiva `vfx/starfall-trail-endpoint-20261113`, sem merge. PRs #487 (dash), #493 (Enemy1), #494 (Enemy2), #486 (combate) e trabalhos simultâneos de áudio/ambiente foram consultados. Arquivo exclusivo desta rodada: `celestial-starfall-vfx3d.js`; não alterar `celestial-starfall3d.js` nem outras mecânicas.

## Inspeção técnica
`CelestialStarfall` calcula 90 eventos de colisão independentemente da qualidade visual. O shader/malha de estrela e a cauda de fita são produzidos por `createStarfallVFX`. O parâmetro `u0`/ `u1` da cauda era calculado com apenas limite inferior (Math.max(0,...)), deixando a geometria sem proteção explícita contra valores acima de 1 em estados de voo atrasados. A melhoria aplica clamp [0,1] somente às coordenadas visuais da cauda, preservando a trajetória e os impactos. Não adiciona geometria, material, luz ou draw calls.

## Evidências e QA
O laboratório isolado `vfx-starfall-qa.html` fotografa o voo da estrela pesada em quatro progressos e coleta `renderer.info.render.calls`, triângulos e memória. Workflow `.github/workflows/vfx-starfall-qa.yml`. Conferir [Actions do PR #497](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/497/checks) e baixar as imagens para comparação antes/depois; não considerar concluída a validação visual antes da inspeção. O laboratório não equivale a teste no Galaxy A55.

## Referências
- Three.js WebGLRenderer.info: https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html

## Pendências
Confirmar testes e screenshots, comparar os quatro estágios; checar visual no jogo real; medir FPS em dispositivo físico. PR permanece rascunho.
