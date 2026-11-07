# MISSÃO PARA CLAUDE — Migração Enemy1 → Demonio1 e otimização mobile

Repositório: `PHBritoDev/Jogo-2-2.5D`, branch `main`.
**Esta é uma especificação para executar, não uma instrução para apagar ativos imediatamente.** Trabalhar em branch própria + PR; não fazer merge de uma substituição quebrada.

## Objetivo e ordem obrigatória

1. **Inventário e preservação funcional (antes de deletar qualquer coisa).**
   - Identificar todas as ocorrências de `Enemy1.glb`, `Enemy1-lod.glb`, variantes, clones, spawns, cutscenes, IA, colisões e carregadores, incluindo quaisquer assets alternativos reais do Enemy1. **Não confundir arquivos de efeitos/IA denominados Enemy1 com modelos a apagar.**
   - Mapear todos os golpes, magias, VFX, cooldowns, dano, movimentação, estados, triggers, esquadra e ações de Enemy1. O código do repositório inclui `enemy1-squad3d.js`, `enemy1-squad-runtime3d.js`, `enemy1-dark-vfx3d.js`: **preservar e reconectar** essas funções. Conferir os demais arquivos de gameplay e cenas.
   - Produzir `docs/migracao-demonio1-auditoria.md` com mapa de dependências, poderes preservados, mudanças e testes.

2. **Preparar e validar o novo modelo.**
   - `Demonio1.glb` já está na raiz de `main` (no inventário de 07/11/2026, ~17,7 MB). Trabalhar **somente com esse modelo como visual de Enemy1**; manter seu nome físico `Demonio1.glb`.
   - Conferir no GLB de fato os nomes, duração e clips de animação, rig, bind pose, morph targets, escala em metros, orientação frontal, altura do personagem, bounding box animada, ground contact, sockets das mãos/cabeça e materiais.
   - O inventário de 16 animações vistas no Meshy está em `docs/animacoes/enemy1-rework.md`. **Não presumir que os nomes da interface são os nomes reais dos clips**, nem que todos foram exportados. Criar mapeamento real a partir da introspecção do GLB.
   - Especificar e testar fallback quando falta algum clip. Para efeitos de olhos/espiral, não presumir que haja uma malha de íris animável.
   - Clonagem de personagens animados: garantir skeletons independentes (ex.: SkeletonUtils.clone, quando apropriado), mixers corretos e liberação segura dos recursos compartilhados. Não dispose geometria/textura compartilhada enquanto outros clones as usam.

3. **Integrar o Demonio1 sem perder gameplay.**
   - Atualizar todos os carregamentos e caminhos de assets de Enemy1 para `Demonio1.glb`, inclusive NPCs/esquadra/laboratório e cenas.
   - Preservar integralmente os poderes existentes do Enemy1 — não reescrever o gameplay sem necessidade: **habilidades `claws`, `spiral`, `judgment`, `counter` e quaisquer outras encontradas no código**, mantendo VFX, cooldowns, danos, efeitos de status e IA. Se houver diferença entre poderes do Enemy1 comum e do Guardião do Portal, documentar e não fundir indevidamente.
   - Adaptar offsets dos efeitos, sockets de mãos, alcance de ataque, cápsulas e hitboxes às proporções reais do Demonio1. Verificar que golpes atingem somente quando a animação/collider justifica; evitar ataques invisíveis.
   - Não mudar a identidade dos demais enemies/bispos ou reescrever cenas. A nova coreografia/estilo de combate do Demonio1 será definida **numa etapa posterior** com o usuário; preservar o funcionamento atual primeiro.

4. **Remover modelos antigos SOMENTE depois de validar.**
   - Apagar efetivamente `Enemy1.glb` e `Enemy1-lod.glb` e outros **modelos GLB antigos reais do Enemy1**, quando todas as referências e testes apontarem para `Demonio1.glb`.
   - Apagar apenas renders/imagens antigas do Enemy1 se estiverem comprovadamente obsoletas; manter documentação de migração, testes e código de poderes. Não apagar código `enemy1-*.js` simplesmente pelo nome.
   - Verificar ausência de requisições 404 e de dependências pendentes no jogo publicado; cumprir a intenção de **um único modelo visual oficial do Enemy1**.

5. **Otimização em lotes de TODOS os outros GLBs**, como fase separada após a migração:
   - Inventariar tamanho real, nº de triângulos, texturas incorporadas, materiais, rigs, animações e frequência de uso; classificar personagens essenciais, estáticos, cenários e props repetidos.
   - Ponto de partida conferido em 07/11/2026: 78 GLBs, ~484 MB somados; 21 >12 MiB. Priorizar estes sem deixar de avaliar os demais. Exemplos grandes: `ArvoreAncestralEldoria.glb`, `Ganancia3.glb`, `CasaEldoria02.glb`, `Carroça.glb`, `Npc.glb`, `CasaEldoria01.glb`, `RochedoMusgoEldoria.glb`, `MontanhaEldoria01.glb`.
   - Para textura: reduzir resolução conforme visibilidade; props distantes 512–1024 px, personagens importantes 1K–2K, cenários hero 2K apenas quando justificado. Avaliar compressão KTX2/BasisU **somente com suporte de loader testado no navegador**, e Meshopt/Draco somente após atualizar os decoders e checar compatibilidade.
   - Remesh/decimation **somente se necessário** e preservar UVs, normals, materiais, armaturas, morph targets e animações. Não reduzir polígonos indiscriminadamente.
   - Idealmente automatizar com scripts reproduzíveis e manifesto `docs/glb-otimizacao-mobile.md` contendo tabela ANTES/DEPOIS, alterações, evidência visual, triângulos, texturas e status de testes. Definir LOD de cenário por distância conforme necessidade; reutilizar geometria e material de props repetidos.
   - **Não integrar o cenário inteiro agora**: use as imagens de referência salvas pelo usuário em `/Jogo-7-Pecados/Referencias-Ato-1` (se acessíveis, pedir os arquivos sem inventar aparência) e o roteiro `docs/narrativa/ato-1-eldoria-roteiro-v1.md` quando chegar a etapa de construção do mundo. Preserve o jogo atual.

## Critérios de aceitação e execução

- Comandos de verificação para detectar URLs obsoletas e arquivos faltantes; testes estáticos e smoke browser real mobile (Playwright/Chromium/WebGL) + screenshots/vídeos do laboratório existente.
- Testar Enemy1 comum e esquadra, movimento, idle, dano, morte, animações, sombras, efeitos de todos os poderes e integração com a câmera, em tela mobile.
- Capturar antes/depois, medir download, tempo de carregamento, FPS e memória quando disponível. Não alegar visual/performance testada sem evidência.
- Checkpoints: **A)** mapa e relatório, **B)** Demonio1 carregando e lutando, **C)** remoção segura do legado, **D)** otimização por lote, cada qual com testes e PRs revisáveis.
- Primeira rodada de trabalho: implementar **A e B**, apresentar evidências e estado dos bloqueios. Não gastar a rodada inteira em otimizações genéricas nem apagar imediatamente.
- Os próximos ataques e estilo de combate serão elaborados com o usuário depois de concluir a migração do modelo.
