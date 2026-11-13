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
