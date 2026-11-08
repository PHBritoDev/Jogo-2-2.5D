# Catálogo validado — Prota novo

Fonte: `Prota_otimizado_2K.glb`, SHA Git `adf08c87fa7f2947034f13130469de08a97321be`. Todos os 19 clipes foram reproduzidos e amostrados no inspetor. Tempos em segundos. “In-place” significa remover somente deslocamento horizontal de Hips; os demais canais de posição do esqueleto são necessários e permanecem.

| Clipe real | Duração | Função/recorte usado | Observação e tratamento |
|---|---:|---|---|
| Running | 0,633 | Corrida, loop | Nativo; Hips XZ no repouso, velocidade acompanha movimento. Não aplicar Hero_Run antigo ao novo esqueleto. |
| Walking | 1,033 | Caminhada, loop | In-place; mantém oscilação vertical. |
| `_01a1b3e4_6f0c_705b_82f5_e9447d85cbef` | 4,967 | Respiração no inspetor | Identificado visualmente; UUID não presumido como ataque. |
| `_01a1b3e6_e46e_7367_9007_2e104dc2e6b7` | 2,467 | Reação a dano, 0,12–0,55 | Reação curta; Hips XYZ fixo, deslocamento pertence à física. |
| `_360_Power_Spin_Jump` | 3,033 | Inspetor | Acrobacia; não usada como salto simples, sem alegar correção integral. |
| Combat_Stance | 1,667 | Guarda/idle armado | In-place; crossfade curto para ataques. |
| Dead | 2,967 | Morte, uma execução | Sem reset a cada frame; gravidade continua até o piso. |
| Jump_Over_Obstacle_2 | 0,867 | Salto, 0–0,40 | Recorte inicial evita salto duplo do movimento de origem; altura controlada pela cápsula. |
| Quick_Step_and_Spin_Dodge | 1,167 | Dash, 0–0,20 | Remove a parte do giro: não dá 360° em todo dash. |
| Roll_Dodge_1 | 1,267 | Inspetor | Root motion/acrobacia bruta pode sair do quadro/piso; não habilitada em gameplay. |
| Run_Jump_and_Roll | 3,433 | Inspetor | Sequência longa com deslocamento; não substitui salto controlável. |
| Skill_03 | 1,633 | Conjuração da arena, 0–0,55 | Espada da mão oculta durante gesto; projeto mágico com custo e colisão próprios do treino. Skills da campanha mantêm seus sistemas. |
| Triple_Combo_Attack | 4,333 | Launcher, 1,92–2,60 | Subida real da lâmina perto de 2,20; não acelerar o combo inteiro. |
| Walk_Backward | 0,867 | Inspetor | Avaliado como passo para trás; não mapeado para caminhar para frente. |
| Walk_Forward_with_Bow_Aimed | 1,200 | Inspetor | Postura de arco; não usada como marcha com espada. |
| Weapon_Combo | 3,667 | Reverso, 0,98–1,66 | Cruzamento da lâmina perto de 1,30. |
| Weapon_Combo_1 | 3,500 | Diagonal 0,40–1,05; giro 1,10–1,90 | Dois recortes distintos, verificados por trajeto 3D da lâmina. |
| Weapon_Combo_2 | 4,500 | Finalizador, 2,70–3,38 | Corte descendente perto de 3,05; maior impacto sem aumentar tela inteira. |
| slide_right | 1,733 | Inspetor | Deslocamento lateral bruto; não usar como dash para qualquer direção. |

## Contato e transições

| Golpe | Duração | Active | Primeiro contato real observado na arena |
|---|---:|---:|---:|
| Fenda oblíqua | 0,65 | 0,21–0,39 | 0,250 |
| Retorno cruzado | 0,68 | 0,23–0,41 | 0,283 |
| Volta da sentinela | 0,80 | 0,16–0,39 | 0,208 |
| Ascensão | 0,68 | 0,19–0,40 | 0,275 |
| Sentença descendente | 0,68 | 0,25–0,44 | 0,342 |

Startup antes de active; recovery após active. Buffer nos últimos 170 ms. Cancela na primeira parte do startup (<60% do início de active) ou 35 ms após active; magia bloqueante não aceita cancelamento de mobilidade. Janela não é auto-hit: contato usa extremos reais da espada, cápsula e oclusão; máximo um dano/crédito por swing/alvo.

Correções verificadas durante integração: fade de duração zero congelava a pose inicial; Hips tomando o início de cada recorte como origem criava saltos entre golpes; posição de bones removida indiscriminadamente deformava o rig; viewmodel antigo procurava apenas Arm/ForeArm e falhava com UpperArm/LowerArm. Agora os adaptadores preservam o repouso, os canais necessários e os nomes dos dois rigs.

Referências consultadas: Three Animation System e SkeletonUtils r160 (a mesma versão importada pelo jogo); MDN WebGL best practices. AnimationMixer controla ações e crossfade; SkeletonUtils clona apenas pools pré-alocados; materiais/geometrias e instâncias são reutilizados. Clipes originais e modelos permanecem intactos.
