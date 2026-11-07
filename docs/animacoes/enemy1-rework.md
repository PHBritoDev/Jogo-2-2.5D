# Enemy1 Rework — inventário das animações mostradas no vídeo

**Fonte:** vídeo `1000363809.mp4` enviado pelo usuário, 8,08 segundos, aba **Animar → Adicionado** do Meshy. Conferido quadro a quadro em 07/11/2026.

**Importante:** o vídeo mostra 16 cartões de animação na lista. **9 têm o nome legível; 7 estão escurecidos, com a legenda “Clique para visualizar” e botão “Remover” cobrindo o nome.** Por isso, os 7 nomes não podem ser confirmados por esse vídeo. **Não inventar nomes nem assumir que o GLB já foi exportado/integrado.** O fato de estarem em “Adicionado” confirma somente que aparecem adicionados no Meshy.

## Nomes CONFIRMADOS visualmente e suas funções

| # | Nome exibido no Meshy | Nome de mapeamento sugerido | Função no Enemy1 |
|---|---|---|---|
| 1 | **Idle** | `idle` | Ficar parado, postura básica de espera |
| 2 | **Rit damege** *(grafia conforme aparece no vídeo; pode ser uma denominação truncada ou com erro)* | `hit_reaction` | Reação a impacto/dano, recuo e recuperação |
| 3 | **Alerta** | `alert` | Ficar em estado de alerta ao detectar ameaça |
| 4 | **Andando** | `walk` | Deslocamento normal |
| 5 | **Chute circular** | `roundhouse_kick` | Ataque com chute circular |
| 6 | **Chute varrido** | `sweep_kick` | Chute rasteiro/de varredura, para atingir ou desequilibrar |
| 7 | **Correndo** | `run` | Deslocamento rápido |
| 8 | **Erguer** | `get_up` | Levantar após queda |
| 9 | **Gancho de esquerda da guarda** | `left_hook` | Soco em gancho com a mão esquerda, partindo da guarda |

> Os nomes `idle`, `walk` etc. são **apelidos sugeridos** para o futuro controlador do jogo, não nomes comprovados dos clipes no GLB.

## Outros 7 cartões — adicionados, mas com nomes ocultos no vídeo

| Referência visual da grade | O que pode ser confirmado |
|---|---|
| Linha 2, coluna 3 | Cartão escurecido; silhueta em postura de combate, botão “Remover”; nome não legível |
| Linha 3, coluna 2 | Cartão escurecido; figura em movimento de braço, botão “Remover”; nome não legível |
| Linha 3, coluna 3 | Cartão escurecido; personagem agachado/baixo, botão “Remover”; nome não legível |
| Linha 4, coluna 2 | Cartão escurecido; personagem caído na horizontal, botão “Remover”; nome não legível |
| Linha 5, coluna 1 | Cartão escurecido; personagem em pé, botão “Remover”; nome não legível |
| Linha 5, coluna 3 | Cartão escurecido; personagem inclinado/erguendo braços, botão “Remover”; nome não legível |
| Linha 6, coluna 1 | Cartão escurecido; personagem baixo/caído, botão “Remover”; nome não legível |

**Para identificar os sete restantes sem adivinhação:** abrir cada cartão “Clique para visualizar” no Meshy, mostrar nome completo e registrar; ou exportar o GLB com animações e inspecionar a lista real de `animations[].name` (essa opção depende do formato/organização da exportação). A contagem e as posições são da grade exibida no vídeo, **não dos arquivos do jogo**.

## Prompts personalizados definidos na conversa (SEPARADOS dos nomes vistos no vídeo)

| Nome do prompt | Mapeamento futuro sugerido | O que faz | Duração sugerida |
|---|---|---|---|
| **Demonic Breathing Idle** | `enemy1_breathing_idle` | Respiração lenta e antinatural; peito expande e contrai, cabeça inclina e garras tremem discretamente | 5 s, loop |
| **Enemy1 — Hit Reaction** | `enemy1_hit_reaction` | Reage a golpe frontal com recuo do tronco/cabeça, tensão das garras e retorno à postura | 2 s, sem loop |

**Atenção:** a animação “Rit damege” exibida na grade pode corresponder à função do prompt “Hit Reaction”, mas **não há prova de que seja o mesmo clipe**. O “Idle” da grade também pode ser diferente do prompt personalizado “Demonic Breathing Idle”. Não duplicar ou substituir sem conferir.

## Orientações de integração

- Conferir **nomes reais dos clipes, duração e esqueleto** dos arquivos do Meshy antes de mapear.
- Preservar o Enemy1 antigo até validar o novo no jogo; manter compatibilidade de rig e evitar deslocamento involuntário da raiz.
- As quatro lâminas das costas e o vórtice nos olhos precisam de controle/VFX específicos; não assumir que a animação esquelética faça isso automaticamente.
- **Estado:** registro documental feito; nenhuma das 16 animações do vídeo foi comprovadamente integrada ao jogo por esta alteração.
