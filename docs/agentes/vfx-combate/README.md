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

## Primeira implementação — dash sombrio (PR #487, branch vfx/dash-sombras-cinematico-20261112)
**Base** `prota-vfx3d.js`: 28 `Mesh` e 28 materiais/uniformes individuais para fumaça vertical; imagem do agente mostrava fiapos finos, contraste fraco; medição comparável na mesma cena: **32 draw calls, 490 triângulos, 0 texturas** (`vanish-middle`).
**Depois**: um `InstancedMesh` de 28 fiapos, geometria e material reutilizados; `aAge` e `aSeed` por instância em GLSL; distorção por campo de ruído de cisalhamento, contornos irregulares e silhueta mais larga (sem partículas aleatórias nem luz adicional). Sem alteração dos métodos públicos `vanish`, `reappear`, `energy`, `impact`, `update`, `clear`, `stats`. Nenhum valor de dano/cooldown/hitbox é lido ou modificado.
**Primeira medição após instancing**, mesmo frame/câmera/qualidade: **5 draw calls, 490 triângulos, 0 texturas**, 28 fiapos preservados, queda de 27 chamadas / 84,375%; ganho de FPS físico não medido.
**Fotos comparáveis**:
- Baseline WebGL [GitHub Actions #43350901486](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43350901486), artefato `vfx-dash-qa-1` (vanish early/middle/fade e reappear).
- Após primeiro instancing [GitHub Actions #43351261955](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43351261955), artefato `vfx-dash-qa-2`.
- Pós-refino dos fiapos: buscar a execução mais recente do workflow VFX Dash na branch; manter PR em rascunho.
**Limitação visual**: preview usa representação simplificada do protagonista (não modelo de produção) e piso neutro para isolar o VFX. Verificar integração no jogo e percepção no Android posteriormente; SwiftShader não reproduz GPU de smartphone.

## Próximos poderes candidatos
1. `enemy1-dark-vfx3d.js`: revisar contraste e preparação de garras, sem repetir o dash do protagonista.
2. `enemy2-chaos-vfx3d.js`: medir legibilidade dos vórtices/efeitos de caos sem sobreposição do HUD.
3. `celestial-starfall-vfx3d.js`: avaliar impactos sequenciais e legibilidade do fim do cast.
4. `skill-x-rupture-vfx3d.js`: verificar silhueta do X vista de lado e clareza da preparação.
Cada um exige pesquisa específica e QA visual de antes/depois independente; nunca alterar todos de uma vez.

## Validação consolidada (2026-11-12)
- [Agente isolado, versão final #43351522559](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43351522559): sucesso, quatro PNG + `report.json`; capturas conferidas contra as imagens do baseline: os fiapos permanecem ligados ao local de desaparecimento, ganharam largura e não houve regressão óbvia no rastro de reaparecimento.
- [Agente final com orçamento automático #43351637690](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/43351637690): sucesso; as capturas de desaparecimento registram 28 fiapos, 5 draw calls, 490 triângulos e nenhuma textura; reaparecimento mantém 6 draw calls. Limite de até 8 draw calls para a cena de desaparecimento validado pelo script.
- A medição é uma cena de QA isolada com personagem simplificado; não demonstra paridade artística com Genshin/Star Rail, nem FPS no Galaxy A55. Não há alegação de medição de GPU time/RAM do dispositivo.
- Integração dos sistemas externos: `tests/combat315` workflow teve execuções de sucesso para commits de VFX na branch; laboratório WebGL completo ainda pode estar em andamento. Sem merge.
- PR #481 do Claude: na consulta mais recente do GitHub estava **fechado e mesclado**; o trabalho atual de VFX não alterou seus arquivos.
- Risco remanescente: atualizações múltiplas de `instanceMatrix` por frame e performance de shader devem ser verificadas em Android físico, inclusive na luta com vários poderes simultâneos. O preview isolado usa o mesmo shader mas não a cena completa.
