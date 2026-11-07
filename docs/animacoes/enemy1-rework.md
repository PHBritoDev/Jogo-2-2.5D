# Enemy1 Rework — inventário das animações do Meshy

**Fontes:** vídeo `1000363809.mp4` (8,08 s), enviado pelo usuário, e captura de tela `1794020150089.jpeg` da aba **Animar → Adicionado** do Meshy. Conferência visual em 07/11/2026.

**Estado:** os 16 cartões aparecem na interface do Meshy; isso **não comprova** exportação, existência de clipes no GLB ou integração com o jogo. As descrições a seguir são a **função esperada pelo nome**; o movimento exato deve ser conferido na prévia ou no arquivo exportado.

## 16 animações adicionadas — nomes e funções

| Nº | Nome exibido no Meshy | Mapeamento proposto | Função no Enemy1 |
|---|---|---|---|
| 1 | **Idle** | `idle` | Manter postura de espera sem locomoção. |
| 2 | **Rit damege** (grafia conforme leitura do vídeo, confirmar nome exato) | `hit_reaction` | Reação ao receber dano, recuar e recuperar a postura. |
| 3 | **Alerta** | `alert` | Reagir à percepção de uma ameaça, preparando o combate. |
| 4 | **Andando** | `walk` | Caminhar em deslocamento normal. |
| 5 | **Chute circular** | `roundhouse_kick` | Atacar com um chute circular. |
| 6 | **Chute varrido** (primeira ocorrência visível no vídeo) | `sweep_kick_a` | Chute rasteiro de varredura, para atingir ou desequilibrar. |
| 7 | **Chute varrido** (segunda ocorrência visível na captura, aparentemente duplicada) | `sweep_kick_b` | Outro cartão com esse título; verificar se é realmente um segundo clipe ou duplicação visual antes de integrar. |
| 8 | **Combo de Armas 2** | `weapon_combo_2` | Sequência combinada de ataques com arma; confirmar se o movimento usa arma inexistente no novo Enemy1. |
| 9 | **Corra, pule e role** | `run_jump_roll` | Encadear corrida, salto e rolamento evasivo. |
| 10 | **Correndo** | `run` | Corrida para perseguir ou se reposicionar. |
| 11 | **Derrubar** | `knockdown` | Movimento de queda/ser derrubado; confirmar prévia para diferenciar de um golpe que derruba outro personagem. |
| 12 | **Erguer** | `get_up` | Levantar-se após uma queda. |
| 13 | **Esquiva Rolante** | `dodge_roll` | Rolamento defensivo para esquivar de um ataque. |
| 14 | **Gancho de esquerda da guarda** | `left_hook` | Golpe de punho esquerdo em arco partindo da guarda. |
| 15 | **Mage Spell Cast 8** | `spell_cast_8` | Gesto de conjuração de magia, sem presumir que o Meshy tenha gerado efeitos mágicos. |
| 16 | **Morto** | `death` | Animação de morrer/queda final do Enemy1. |

**Sobre “Chute varrido”:** a captura parece exibir o mesmo nome em dois cartões, um na faixa superior cortada e outro imediatamente abaixo. O inventário registra ambos para preservar os **16 cartões** vistos; é necessário confirmar se são dois clipes distintos.

**Nomes de mapeamento propostos** são convencionais para o controlador de animações; não são os nomes extraídos do GLB.

## Prompts personalizados definidos na conversa

| Nome aprovado | Mapeamento proposto | O que faz | Duração sugerida |
|---|---|---|---|
| **Demonic Breathing Idle** | `enemy1_breathing_idle` | Respiração lenta e antinatural; tórax se expande e contrai, cabeça inclina e garras se contraem discretamente. | 5 s, loop |
| **Enemy1 — Hit Reaction** | `enemy1_hit_reaction` | Reage ao impacto frontal com recuo do torso e da cabeça, tensão das garras e recuperação da postura. | 2 s, sem loop |

Esses são prompts personalizados da conversa, **não uma comprovação de que foram exportados ou de que correspondam exatamente** a `Idle` e `Rit damege`.

## Orientações de integração

- Inspecionar `animations[].name`, durações, rig/esqueleto e movimento de raiz no(s) GLB(s) exportado(s) antes de implementar.
- Preservar o Enemy1 antigo até o novo passar por testes; confirmar que todos os clipes compartilham um esqueleto compatível.
- Checar se `Combo de Armas 2` cabe ao combate com garras e se `Derrubar` representa queda recebida ou golpe.
- Controlar as quatro lâminas nas costas e o vórtice vermelho dos olhos com mecanismos próprios; não presumir que as animações esqueléticas os movimentem.
- **Estado:** registro documental atualizado. Nenhum arquivo de animação foi integrado por esta alteração.
