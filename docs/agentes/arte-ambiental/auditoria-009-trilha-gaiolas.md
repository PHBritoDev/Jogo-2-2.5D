# Auditoria 009 — trilha e clareira das gaiolas (Ato I)
Data: 2026-11-13 (BRT). Auditoria **estática**: nenhuma captura WebGL, vídeo ou benchmark Android foi produzido nesta rodada.

## Escopo novo
Trecho `CAGE_TRAIL` saindo de (44,-33), passando por (51,-38), (57,-46), (64,-50), (69,-56), (67,-62), até a clareira `CAGE_CLEARING=(66,-70)`, em `act1-world-layout.js` da main. Três Seguidores em (66,-63.5), (66,-73.5), (71,-66.5). Não confundir com a entrada da caverna, já auditada na rodada 002.

## Evidências confirmadas em código e documentação
- `act1-world-layout.js` (Mod 311) define a clareira atual em (66,-70), deslocada da boca da caverna, e a trilha em seis vértices. `tests/ascension311.test.mjs` verifica distância à boca, seguidores dentro de 9 unidades, POI das gaiolas e presença da trilha com largura 3 no módulo principal; **não** garante por si a legibilidade visual da rota, câmera, oclusão por folhagem ou ausência de sobreposição com objetos.
- `docs/MOD-307-FLORESTA-SERRA-FPS.md` ainda descreve a posição **histórica** (-46,-216), do Mod 307, e a encosta oeste. A divergência documental é comprovada e deve ser tratada como registro de versão antiga, **não** como bug de posicionamento atual. Não editar esse documento de outro fluxo sem coordenação.
- O documento antigo descreve preservação de árvores fora da clareira e das trilhas, incluindo NPCs, colisores e gatilhos. Qualquer movimentação da clareira ou árvores exige inspeção da missão e dos testes.
- PR #481 (Claude) mexe no prólogo/Eldória; #473 trata roteiro/objetivos, #488 iluminação, #489 arte. Não tocar em arquivos de cenário compartilhados sem confirmar diffs e disponibilidade.

## Riscos artísticos ainda não comprovados
1. A trilha de 3 unidades pode ficar visualmente escondida pelo sub-bosque ou parecer um corte artificial no dossel; verificar do ponto de vista do jogador, ida e volta, antes de alterar a distribuição.
2. A clareira precisa mostrar duas gaiolas e ameaças sem confundir sua leitura visual com a entrada da caverna ou colocar plantas atravessando grades.
3. A composição deve sugerir perigo de forma coerente, preservando a visibilidade e a área livre de combate. Não acrescentar cenários enormes, NPCs, missões ou recompensas.

## Proposta de intervenção (PENDENTE de evidência)
Se screenshots atuais confirmarem excesso de vegetação atravessando o corredor, ajustar somente a máscara de distribuição da vegetação existente nas bordas da trilha, com transição orgânica de densidade. Não alterar `CAGE_TRAIL`, `CAGE_CLEARING`, inimigos, gatilhos, colisões ou geometria do terreno. Reutilizar instâncias/materiais e manter custo de draw calls e texturas. Comparar imagens com câmera/qualidade idênticas em (44,-33), (64,-50), (67,-62) e (66,-70), verificar testes de progressão e travessia, medir stutter e FPS no Android real. Reverter qualquer regressão.

## Resultado
Esta rodada confirma **divergência entre documentação histórica e layout atual**, não um bug visual. Sem edição do jogo, screenshots, execução de testes ou benchmark móvel. Nenhum merge ou auto-merge. Próxima auditoria deve priorizar imagens reais e dependências da máscara de vegetação antes de alterar o cenário.
