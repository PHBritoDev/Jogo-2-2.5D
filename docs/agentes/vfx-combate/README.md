# Direção de VFX — registro permanente
Data inicial: 2026-11-12. Escopo exclusivo de VFX, sem dano, hitbox, movimentação, IA, cooldown ou câmera de gameplay.

## Inventário inicial / prioridades
- Protagonista: `prota-vfx3d.js` (dash sombrio, reaparecimento, ondas, clarões), `slash-vfx3d.js` (cortes), `celestial-*-vfx3d.js`, `skill-x-rupture-vfx3d.js`, `sword-rites-vfx3d.js`.
- Inimigos: `enemy1-dark-vfx3d.js`, `enemy2-chaos-vfx3d.js`, `enemy3-abyss-vfx3d.js`, `enemy4-vfx3d.js`; bispos em módulo principal e arquivos de cenário. NÃO editar sem examinar contratos e PRs em aberto.
- **Primeira habilidade**: dash do protagonista. Preservar identidade de teleporte curto com fiapos de sombra verticais e rastro horizontal. Principal limitação: 28 planos de fumaça geram múltiplas chamadas ao renderizador, com ruído uniforme e leitura fraca em cenário claro.
- Concorrência inicial consultada: PR #486 do combate modifica `sword-rites3d.js`, não `prota-vfx3d.js`. PR #473 de Eldória e PRs de mundo não serão tocados. O Claude foi mencionado pelo usuário com PR #481, que não consta na lista atual de PRs abertos — confirmar novamente antes de qualquer merge.
- Diretriz: só uma habilidade por PR, registrar capturas com agente WebGL; não mesclar sem autorização expressa.
- Referências: documentação oficial Three.js `InstancedMesh` (reduz draw calls), `WebGLRenderer.info` (calls/triangles/memory), manual de otimização de objetos. Fontes: https://threejs.org/docs/pages/InstancedMesh.html ; https://threejs.org/docs/pages/WebGLRenderer ; https://threejs.org/manual/pages/optimize-lots-of-objects.html
- Restrições: renderização SwiftShader não representa desempenho de Android físico; verificar smartphone posteriormente; medir antes/depois com cena e câmera constantes.

## Histórico de testes
- Auditoria basal: workflow `.github/workflows/vfx-dash-qa.yml`, URL de evidências e números a registrar após primeira execução.
- Alterações artísticas propostas: controlar desenho da fumaça com orientação ao fluxo e camadas de cisalhamento, sem cor brilhante ou partículas aleatórias. Preservar rastro de reaparecimento, movimento e alcance inalterados.
