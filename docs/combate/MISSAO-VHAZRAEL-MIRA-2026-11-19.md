# VHAZRAEL completo + mira do herói (19/11/2026)

Briefing temporário: `CLAUDE_MISSAO_TEMP_COMBATE_VHAZRAEL_MIRA_20261119.md`, removido no último commit desta branch.
Material analisado: o vídeo anexado pelo criador (`Screen_Recording_20261119_114411_Chrome.mp4`, 8,8 s, celular ~20 FPS).
Nele aparecem:
- o herói com 44/650 de vida enquanto o VHAZRAEL encadeia Corte Duplo, Sentença Tripla e Dança do Ceifador;
- herói e Bispo colados e frequentemente de frente, com os corpos se atravessando;
- rastros carmesins grandes;
- nenhum salto, escudo ou magia do Bispo.

Os vídeos `1000365547.mp4` e `1000365548.mp4` citados no briefing **não vieram** no anexo, então não comento o que não vi.

## P0 — kit canônico de volta ao jogo público
- **Causa:** `combat-melee-test-mode.js` deixava `TEMP_MELEE_ONLY_TEST` ligado em todo navegador sem `?fullCombatQA`. Com isso,
  `vhazrael3d.js` zerava `leap`, `shield` e `kit` (`throne`, `thorns`, `bombard`, `orbital`), e `meleeOnlyProfile` tirava kit e
  ultimates de todos os inimigos e Bispos (Enemy1–4, Bispos 1–4, Ganância).
- **Correção:** o treino só físico agora é **opcional e explícito**: `?treinoFisico=1` (alias `?somenteFisico=1`). O padrão
  público volta a ter salto, escudo, magias e ultimates. `?fullCombatQA=1` continua aceito e não muda nada.

## P0 — direção do golpe independente do analógico
**Bug reproduzido no jogo.** VHAZRAEL parado a 2,4 m à frente; o analógico fica segurado durante 3 golpes por posição.

| analógico | `main` acertos | `main` desvio do tronco ao alvo | PR acertos | PR desvio |
|---|---|---|---|---|
| nenhum | 3/3 | 36–71°¹ | 3/3 | 37–71°¹ |
| leve para trás | **0/3** | 173–179° | 2/3 | 37–73°¹ |
| lado + trás | **0/3** | 137–146° | **3/3** | 37° |
| lado firme | **0/3** | 103–121° | 2/3 | 40–46° |
| trás firme | 0/3 | 171–179° | 0/3 (recuo de verdade) | 30° |

¹ O ângulo do próprio golpe (`aim.ang` do clipe: 30° na Fenda diagonal e 70° na Ascensão) é intencional. O que importa é
que o tronco continua no alvo.

**Como funciona agora** (`chooseAttackTarget` e `attackStrafe` em `prota-combat3d.js`):
- Mira travada > inimigo válido a até 4,6 m (vivo, com linha de visão, no mesmo piso) > troca de alvo **só com analógico
  firme** (≥ 0,7) apontando para outro inimigo > pontuação por distância, centro da câmera, frente do herói, alvo atual e
  alvo golpeado há pouco, com histerese. A zona morta é 0,35: ruído não conta.
- Durante o golpe, com alvo válido, o analógico vira **passo lateral ou recuo**. O tronco, a lâmina e a hitbox continuam no
  alvo. Um toque leve ainda chega; recuo firme cancela o avanço automático (errar ao recuar é o correto). Fora do raio
  de assistência, analógico firme = golpe livre deliberado.
- A mira travada solta sozinha depois de 0,8 s sem linha de visão. A câmera travada gira no máximo 4 rad/s, então herói e
  chefe se cruzando não chicoteiam a câmera.
- Cenários em `tests/mira-ataque.test.mjs`: 1 alvo, vários alvos, alvo atrás, sem linha de visão, fora do alcance,
  inimigo cruzando o centro e alvo em movimento.

## IA do VHAZRAEL — matriz de decisão (`vzTactics` em `vhazrael3d.js`)
| faixa (borda a borda) | estado visível do herói | ações e objetivo |
|---|---|---|
| colado (< 1,4 m) | atacando | **sair**: dash para trás; com magia pronta, reposiciona e conjura |
| espada (0,3–3 m) | parado, defendendo ou atacando | **flanquear**: dash lateral + combo |
| espada (≤ 2,4 m) | se recuperando de um golpe | **punir**: golpe rápido (Riposta) |
| dash (2,2–7,5 m) | qualquer (mais se conjura ou se recupera) | **entrar**: dash de aproximação + corte |
| magia (> 7,5 m) | fugindo | kit canônico, dash de aproximação, Salto Predatório |
| qualquer | acabou de conjurar ou projétil vindo | **escudo**, **dash** para fora, **salto** ou **aguentar** |

Pesos por fase: ensino → técnica → pressão → fúria.

Regras de controle:
- Escolha por roleta ponderada, com uma chance de não agir que diminui quanto maior a melhor utilidade.
- Recarga própria por tática: entrar 2,6 s, flanquear 3,4 s, sair 3 s.
- Orçamento de dash: no máximo 3 em 2,5 s, depois trava por 1,3 s.
- **Armadura de cambaleio de 2,2 s**: depois de cambalear, o chefe não cambaleia de novo; só a quebra de guarda passa.
- Raio do corpo .55 → .68: o corpo de 2,3 m com asas atravessava o herói.

A IA só lê o que já está visível: um golpe começando, um projétil no ar, mana gasta. Nunca lê botão futuro.

**Duelo público real (sem `fullCombatQA`), 40 s, com o mesmo bot de entradas reais, mesma semente, IA ativa:**

| | depois do P0, sem a matriz | com a matriz e a armadura |
|---|---|---|
| cambaleios do chefe | 20 | 5 |
| ações distintas | 9 | 13–17 |
| saltos / dash de entrada / flanco / sair | 0 / 0 / 0 / 0 | 2–3 / 1–3 / 1–2 / 1 |
| bombardeio, espinhos, trono, Extinção Orbital | só espinhos e orbital | todos |

**Duelo público gravado** (`vhazrael-duelo-publico-26s.mp4`, quadros e `vhazrael-duelo-publico-auditoria.json`), 26 s:
espinhos, bombardeio, Ruptura do Trono e Extinção Orbital; Salto Predatório; dash de aproximação, dash de **entrar**,
**flanquear** e **sair**; Estocada, Riposta, Corte Duplo e Queda do Trono. O maior tempo parado entre ações foi 2,5 s.

Leitura da magia do herói no jogo: o cerco de lâminas provocou **dash para fora da magia** e a Chuva de Estrelas provocou
**escudo**. Nos testes (160 sementes), as quatro respostas aparecem e "aguentar" fica entre 10 % e 40 %.

## Clipes do VHAZRAEL.glb usados em runtime (3 duelos públicos, 140 s somados)
| papel → clipe | início de reprodução | quando |
|---|---|---|
| idle → `_01a1b3e4…` | 44 | entre ações |
| walk → `Walking` | 44 | aproximação e strafe |
| run → `Running` | 19 | distância > 6 m |
| dash → `Jump_Over_Obstacle_2` | 14 | entrar, flanquear, sair, esquivar, dash de aproximação |
| jump → `Basic_Jump` | 7 | Salto Predatório (leap) e salto de escape |
| hit → `Skill_01` | 7 | cambaleio |
| Trono_Riposta → `Skill_01` | 6 | punir e riposta depois de aparar |
| Trono_Duplo → `Double_Combo_Attack` | 5 | abertura |
| block → `_01a1b3e6…` | 4 | defesa, fase 2 |
| Trono_Estocada → `Jump_Over_Obstacle_2` | 4 | estocada a 2,4–5,5 m |
| Trono_Moinho → `Axe_Spin_Attack` | 2 | herói de lado ou atrás |
| Trono_Triplo → `Triple_Combo_Attack` | 2 | fase ≥ 1 |
| Trono_Queda → `Attack` | 1 | contra guarda |
| Trono_Danca → `Weapon_Combo` | 1 (duelo de 40 s, fase 2) | fase ≥ 2 |
| death → `Dead` | ao morrer | — |

**Não usados, e por quê:**
- `mage_soell_cast_7`: as magias do kit têm coreografia procedural própria sobre o idle (decisão das Mods 252/254,
  protegida por `vhazrael.test.mjs`).
- `Casual_Walk` (stride): a passada é de ~1,3 m/s e o Bispo anda a 2,86 m/s, então deslizaria os pés.
- `Axe_Breathe_and_Look_Around` (look): 11 s de observação; no duelo há sempre um alvo e ele deixaria o chefe passivo.

## Postura armada — Marcha do Executor / Guarda de Predador (`poseCarry` em `enemy3-runtime3d.js`)
- **Antes:** fora dos golpes a lâmina ficava apontada para o chão com o braço pendurado, a 0,09 m da perna.
- **Agora:** é uma camada procedural só do braço direito e do peito, com transição suave:
  - **Marcha:** longe do herói (≥ 4,2 m), a lâmina fica em diagonal para cima, por fora do ombro direito.
  - **Guarda:** perto, a lâmina aponta ao herói em diagonal, pronta para cortar.
  - **Dash:** a lâmina vem junto ao corpo.

  Golpes, magia, bloqueio, salto e cambaleio continuam no próprio clipe.
- **Folga mínima lâmina ↔ corpo medida no jogo** (esferas em cabeça, pescoço, peito, coluna, quadril, braço esquerdo e
  pernas, 36 quadros por cenário): marcha 0,47 m, guarda 0,45 m, corrida 0,49 m.
- **Comparação:** `?vzSemPostura=1` desliga a camada. As imagens antes/depois de frente, lado, costas e ¾ estão em
  `docs/combate/evidencias/vhazrael-mira/`.
- **Espada nas costas:** não implementada. Exigiria um clipe de saque dedicado e sockets que o rig de 23 ossos não traz,
  e o briefing a deixa condicionada a qualidade impecável.

## Testes
- `tests/mira-ataque.test.mjs`: 6 testes.
- `tests/vhazrael-taticas.test.mjs`: kit público, leitura da magia, táticas por faixa, orçamento de dash, armadura de
  cambaleio, sequência igual a 30, 45 e 60 FPS.
- `vhazrael.test.mjs`, `enemy1-squad.test.mjs`, `tests/combate-*.test.mjs` e o `combat315-qa.cjs` real.

## Riscos e limites
- **Não testado em Android físico.** O SwiftShader roda a 2–5 FPS; as lutas usam passo fixo de 1/30 s.
- A Extinção Orbital (ultimate canônica de ~18 s) aparece cedo num duelo de bot, porque o bot não usa o kit para conter o
  chefe. Num jogador real ela continua dependendo de três poderes mostrados ou de vida baixa.
- As ferramentas de QA `qaSkills()`, `heroHeal()`, `vzPoseQA()`, `vzBladeClearance()` e `vzAudit()` só existem com `?debug3d=1`.
