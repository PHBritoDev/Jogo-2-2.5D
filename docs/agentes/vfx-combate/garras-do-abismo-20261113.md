# Garras do Abismo — ciclo de VFX (13/11/2026)

## Escopo e coordenação
Continuação do Diretor de VFX. Não mesclar automaticamente. Branch isolada, PR #493. PRs ativos consultados antes de iniciar; o Chat 2 trabalha no PR #486 em `sword-rites3d.js`, e demais agentes atuam em ambiente, áudio e bugs; não tocar nesses módulos nem em `main`.

## Habilidade investigada
**Enemy1 / Garras do Abismo**, implementação visual: `enemy1-dark-vfx3d.js`, método `drawClaws(s)`. A lógica recebe `phase`, `t`, `T`, `r`, `hands` de `enemy1-squad3d.js`; não modificar estado nem hitboxes. O efeito usa instâncias para membros e garras, marcas no piso e partículas compartilhadas. O círculo de advertência é desenhado por `arcDark` e `arcGlow`, com o brilho modulando `sin(time*14)` durante o aviso.

## Hipótese artística
A marca de aviso pode ganhar leitura de progressão (tensão, fechamento do selo e sinal de erupção) sem simplesmente aumentar brilho ou adicionar esferas. Preservar raio e posição original, evitar efeito genérico. Preferir segunda inscrição do selo discreta, com InstancedMesh já existente, em vez de um novo material e draw call; não alterar o limite de colisão.

## Fontes verificadas
- Three.js InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html — reduzir chamadas de render para repetições de geometria/material.
- Three.js WebGLRenderer.info: https://threejs.org/docs/pages/WebGLRenderer — comparar `render.calls`, `render.triangles` e memória.
- Evidências iniciais: [GitHub Actions do PR #493](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/493/checks). O QA fotografa preparação 25%, 65%, 94% e subida 60%; sala de teste com piso neutro, não substitui validação no Android.

## Pendências
1. Confirmar baseline WebGL e fotos reais, identificando o que falta em legibilidade.
2. Refinar o círculo **visual**, preservando contorno de perigo.
3. Registrar métricas e screenshots antes/depois e checar regressões da habilidade.
4. Se aprovado visualmente, manter PR rascunho até autorização explícita de merge.

## Implementação e evidências da rodada imediata
- Commit `a16d290485b9338073b38c31242431b3a81daa69`: um segundo selo interno violeta cresce e converge **apenas em `phase === 'telegraph'`**. A marca de perigo externa mantém centro/raio original, os tempos ficam intocados; ambas as marcas compartilham `arcGlow` InstancedMesh. Nenhuma nova geometria, textura ou luz.
- [Baseline WebGL](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43423928909): 4 PNGs + report.json; `telegraph-middle`=10 draw calls, 64 triângulos, 1 arco luminoso; `telegraph-end`=12 draw calls, 5494 triângulos.
- [Após VFX](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43424253808): 4 PNGs + report.json; `telegraph-middle`=10 draw calls, 66 triângulos, 2 arcos luminosos; `telegraph-end`=12 draw calls, 5496 triângulos; texturas=0; sem erros JS reportados.
- Inspeção visual das fotos: centro e círculo externo não mudaram; selo interno progressivo é sutil; início e subida permanecem visualmente idênticos. Diferença fotométrica dos frames (capturas 960×540 RGB) entre baseline/depois: início 0 pixels visivelmente diferentes, meio ~2970 pixels com mudança >5/255 por canal, final ~4416, subida 0. Resultado **discreto**, não classificar como salto visual AAA.
- Teste posterior de orçamento: script `tools/visual-lab/vfx-enemy1-claws-qa.cjs` exige até 12 chamadas, zero texturas e 2 arcos nas fases intermediária e final. Confirmar workflow após commit `a51d55d`.
- Limitação: cena isolada com três mãos simuladas e sem modelo real Enemy1. O controle de `Renderer.info` no SwiftShader não equivale a FPS Android. Validar no jogo completo antes de solicitar merge.
