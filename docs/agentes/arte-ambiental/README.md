# Chat 5 — Direção de arte ambiental e level design
Atualização: 2026-11-12. Escopo: auditoria inicial estática, **sem edição visual do jogo** e **sem merge**.

## Estado e conflitos
- PR #481 (Claude): prólogo, Eldória e abrigos; não tocar nos arquivos usados por Claude até revalidar o diff e estado do PR. https://github.com/PHBritoDev/Jogo-2-2.5D/pull/481
- PR #473 (Eldória roteiro), #487 (VFX), #488 (iluminação), #486 (combate), #485 (bugs) e #484 (GLB) existem no fluxo de outras IAs. Verificar mudanças antes de cada edição.
- Branch isolada: `agente/arte-ambiental-auditoria-20261112`. **Não mesclar ou habilitar auto-merge sem autorização do proprietário.**
- Estado do PR #481 foi obtido por busca GitHub; não existe teste de jogo ou baseline fotográfica produzida nesta auditoria.

## Inventário de evidências estáticas (não equivale a bug visual confirmado)
1. **Floresta — composição e repetição (PRIORIDADE 1):** `eldoria-undergrowth.js` distribui arbustos/samambaias via RNG e `InstancedMesh`, com caps separados para baixa especificação e normal. Há relatórios históricos do criador sobre arbustos repetitivos/árvores claras, e o watchdog `tools/visual-lab/eldoria-watchdog.cjs` inclui a tomada `arbustos-e-arvores-claras` em x=34, z=-56, yaw=2.8. **Hipótese:** patches podem parecer uniformes ou artificiais; verificar com screenshot atual do jogo, não alterar aleatoriamente o gerador.
2. **Vila — acessos/posicionamento (PRIORIDADE 2):** `eldoria-city-layout.js` define `ELDORIA_HOUSES`, `faceTo`, `doorstep()`, `doorPaths()`, árvores `ELDORIA_MAIN_TREE`/ `ELDORIA_SIDE_TREE` e estrutura suspensa. Ponto focal e colisões devem ser comparados em jogo; não mover casas ou árvores sem conferir NPCs/checkpoints/rota. A anotação `ANCESTRAL_ROOT_SINK=.08` não demonstra, por si, erro.
3. **Lago/mata:** `docs/eldoria-direcao-artistica-v2.md` registra que o estilo ainda não atende plenamente às referências, inclusive vegetação/facetas, margens e portas; diagnóstico histórico, não verificação da build presente.
4. **Tochas/caverna:** PRs históricos #465/#466 abordam tochas e câmera. Nenhuma correção daqui será reaplicada sem verificar branch atual e fotos.

## A primeira melhoria escolhida
**Melhoria de alto impacto e baixo risco:** corrigir *apenas* a distribuição repetitiva comprovada no trecho florestal ao redor de x=34, z=-56, preservando contagem máxima de instâncias, geometrias e materiais existentes. Esta é uma **proposta pendente, não implementada**, até obter baseline visual verificável. Ajuste possível: modular o padrão de clusters e zonas vazias sem adicionar objetos, criar novos shaders ou alterar a iluminação. Verificar primeiro se Claude mexe no mesmo gerador.
- Antes: fotos com mesma câmera e qualidade, no nível do jogador, 3ª e 1ª pessoa; vídeo com giro; captura GPU real Android.
- Depois: mesmos pontos e trajetórias; métricas de draw calls, triângulos, memória, FPS p50/p95 e stutter; colisões/trilha/visadas.
- Rejeitar se o cenário ficar menos natural, o desempenho real piorar ou gerar interseções.
- SwiftShader pode detectar regressões, **não valida FPS móvel**.

## Plano de QA
- Abrir o jogo real na versão da branch de trabalho; localizar coordenadas citadas e referência de flora.
- Conferir screenshots do watchdog e artefatos dos workflows, produzir capturas novas com mesmo framing.
- Cruzar as referências de 07/11 com `docs/eldoria-direcao-artistica-v2.md`.
- Inspecionar dependências do gerador em `mundo-3d-prototype.js`, colisões e custo atual da região.
- Implementar alteração pequena somente em módulo sem conflito; criar teste e comparar antes/depois.
- Documentar por região: evidência, reproduções, custo, commits, capturas, falhas, decisão e aprovação.

## Limitação da rodada
Auditoria foi feita pela leitura de arquivos e metadados no GitHub. **Não foi executado navegador/jogo nem produzida captura de tela ou teste mobile** nesta rodada; portanto nenhuma região é considerada visualmente aprovada e nenhuma melhoria visual está sendo alegada como implementada. Esta branch registra o diagnóstico com segurança para continuidade e não interfere com Claude.
