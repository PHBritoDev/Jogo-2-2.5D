# VHAZRAEL · Mod 320 — corpo novo, duelo de espadas, Ruptura com céu e segunda explosão, Extinção Orbital refeita

Registro permanente da missão (o briefing temporário foi removido nesta mesma PR). Personagem, IDs (`vhazrael`,
`bishop1`), saves (`vhazraelRewardClaimed`), narrativa, dimensão, bestiário e kit (`throne`, `thorns`, `bombard`,
`orbital`) foram **preservados**; só o corpo, o combate e a encenação mudaram.

## A · Modelo e clipes (`VHAZRAEL.glb`)

- `RIG_DEFS.bishop1` agora carrega `VHAZRAEL.glb` (`vhazrael-rig3d.js` → `VZ_FILE`, `VZ_ROLES`, `VZ_IN_PLACE`, `VZ_TIME`).
  Falha de carga continua aparecendo como erro do carregador de rig (não existe mais fallback para o GLB antigo).
- Catálogo **lido do GLB** (`vhazrael-glb-qa.html`, `catalog()`): **16 clipes**, 23 ossos, sem dedos e sem arma na malha.
  Picos de golpe medidos pela velocidade da mão direita (`curves()`), não estimados.

| clipe | dur (s) | papel no jogo | estado / sincronização | resultado |
|---|---|---|---|---|
| `_01a1b3e4_6f0c_705b_82f5_e9447d85cbef` | 4,97 | `idle` | loop, ×0,85 | respiração contida |
| `Axe_Breathe_and_Look_Around` | 11,27 | `look` | idle longo | observação |
| `Walking` | 1,03 | `walk` | locomoção | andar |
| `Casual_Walk` | 4,17 | `stride` | marcha lenta encarando | strafe |
| `Running` | 0,63 | `run` | locomoção | correr |
| `Jump_Over_Obstacle_2` | 0,87 | `dash` + **Estocada** | in-place (root 3,4 m removido), ×1,35 | dash/estocada (hit 0,42 s) |
| `Basic_Jump` | 5,87 | `jump` | trecho 1,45→2,9 s, sem subida vertical do clipe (a física sobe) | duplo salto + dash aéreo |
| `Double_Combo_Attack` | 2,83 | **Corte Duplo** | hits 0,63 / 1,20 s | abertura |
| `Triple_Combo_Attack` | 4,33 | **Sentença Tripla** | hits 0,77 / 1,50 / 2,23 s | fase ≥ 1 |
| `Weapon_Combo` | 3,67 | **Dança do Ceifador** | hits 0,53 / 1,27 / 2,23 s | fase ≥ 2 |
| `Attack` | 2,80 | **Queda do Trono** | hit 1,07 s, quebra guarda | pesado |
| `Axe_Spin_Attack` | 2,50 | **Moinho Abissal** | hits 0,90 / 1,03 s | contra flanco/costas |
| `Skill_01` | 1,07 | **Riposta** / reação | hit 0,43 s | punição rápida |
| `_01a1b3e6_e46e_7367_9007_2e104dc2e6b7` | 2,47 | `block` / fúria | guarda | escudo de obsidiana |
| `mage_soell_cast_7` | 2,67 | `cast` | conjuração | magias |
| `Dead` | 2,97 | `death` | in-place | morte (só depois do resultado da ultimate) |

- **Hitbox = arco visível:** `nativeMoveClips` amostra a 30 Hz o segmento guarda→ponta da Lâmina do Trono **no mesmo
  clipe e com a mesma empunhadura** desenhada (`calibrateGrip`), e `bossTraceContact` varre esse traço. Sem traço, sem dano.
- `Bispo1-lod.glb` e `Bispo1.0.glb` **apagados** após auditoria: nenhuma referência ativa em runtime, testes, manifesto,
  workflows ou ferramentas (`grep -rn Bispo1` só encontra `Bispo1-ui.webp`, documentos históricos e o teste que proíbe o
  `.0` na prévia). `vhazrael-preview.html` passou a usar `VZ_FILE`/`VZ_ROLES`.

## B · Duelo de espadas, movimento, defesa, vida

| regra | valor | onde |
|---|---|---|
| golpes nativos | 7 (Duplo, Queda, Moinho, Riposta, Tripla ≥ fase 1, Dança ≥ fase 2, Estocada 2,4–5,5 m) | `VZ_MOVES` |
| anti-repetição / situação | `vhazraelPickMove`: nunca o mesmo golpe 2×; Queda contra guarda; Moinho contra flanco; Riposta após ataque do herói | `vhazrael3d.js` |
| espada × magia | janela 12 s, magia ≤ 34 % das decisões, ≥ 6 s entre magias, 1 magia perigosa por vez | `VZ_MIX`, `vzTick` |
| medição (150 s simulados) | 38 golpes · 5 dashes · 1 salto · 13 magias → **espada 77 %** | `SevenSinsDebug3D.vzStats()` |
| dash | recarga 0,5 s, **orçamento 3 em 2,5 s** e bloqueio de 1,3 s ao estourar; rastro de 4 silhuetas da POSE REAL (carmim/violeta, 0,35 s) | `VZ_DASH`, `vhazrael-afterimage3d.js` |
| salto | duplo salto + dash aéreo + golpe de queda (raio 2,1 m) | `VZ_LEAP` |
| escudo próprio | obsidiana rachada com linhas rubras: dura 2,1 s, recarga 11 s, 140 de resistência, mitiga 70 %, quebra a 40 | `SHIELD_SPECS.vhazrael`, pele `obsidiana` |
| HP do chefe | base real 650 (260 × `squadHp` 2,5) → **2600 (4×)** | `dimensions3d.js` (1040 × 2,5), `VZ_HP` |
| fases | 70 % / 40 % / 15 % (recargas encurtam, golpes novos liberados) | `VZ_PHASES` |
| HP do herói | **× 5** na vida máxima (100 → 500 no nível 1), cura e casaco acompanham | `HERO_HP_MULT` em `progression3d.js` |

VFX de espada inspirados nos **princípios** dos vídeos do criador (crescentes largas que seguem a lâmina, núcleo claro
sobre faixa saturada, impacto com estrela), com identidade própria: estilo `vhazrael` em `slash-vfx3d.js` (núcleo
branco-amarelo, corpo carmim, borda violeta escura, mistura normal para continuar legível em cenário claro).

## C · Ruptura do Trono — céu e SEGUNDA explosão

- **Céu durante a carga** (`vhazrael-throne-sky3d.js`): fissura carmim recortada acima do bispo, halos concêntricos,
  abóbada escurecida e raios que **convergem no centro da lâmina**; tudo some/volta em ~1,6 s após o impacto (nada muda
  no clima global; a luz da arena cai por `s.dim` e é devolvida).
- **Segunda explosão** no **mesmo epicentro** (`s.ix/s.iz`) **0,6 s** após a primeira: anel de aviso vermelho no chão
  com o raio REAL desde o impacto → compressão (o núcleo é sugado) → detonação → capuz em cogumelo sobre coluna, que
  esfria de branco/laranja para obsidiana rachada; anel de pressão e veios violeta; clarão curto e contido.
- **Dano separado e telegrafado** (`THRONE.second`): frente que cresce de 0 a 4,8 m em 0,42 s; acerta quem a frente
  **toca** (uma vez por alvo, `s.hit2`), nunca quem ela já passou; salto acima de 3,2 m, dash (i-frames) ou sair do raio
  escapam. Testes: `vhazrael.test.mjs` (“Mod 320: segunda explosão…”, “Mod 252: hit imediato…”).

## D · Extinção Orbital — tomadas longas e regras do §8

| fase | dur (s) | jogável? | câmera |
|---|---|---|---|
| `awaken` | 3,2 | não (PULAR) | **A**: baixa atrás do herói; o bispo ergue a espada, luz cai, câmera sobe ao céu que abre |
| `orbit` | 6,4 | não (PULAR) | **B**: uma tomada orbital contínua; o ponto quente vira meteoro |
| `entry` | 2,6 | não (PULAR) | **C**: reentrada acompanhando o meteoro → plano aberto da arena → **devolvida antes da queda** |
| `fall` | 4,2 | **sim**, tudo menos a ultimate | câmera do jogador; sombra crescendo, anel do alcance, alvo travado |
| `impact` | 1,6 | sim | explosão por contato |

- **Alvo travado** no início de `entry` (posição do herói nesse instante) e nunca mais muda; direção de chegada de trás do
  bispo. A trajetória é **uma só** (`vhazrael-orbital-path.js`) para a lógica e o desenho.
- **Corpo do meteoro** (raio 6,5 m): dano 150 **somente** se o segmento percorrido no tick (teste contínuo
  esfera × cápsula, `segSegDist`) tocar a cápsula — “triscar” conta; 1 vez por alvo.
- **Explosão**: domo de 0 a 15 m (altura 6 m) em 0,95 s a partir do epicentro; dano 120 a quem a borda ou o volume
  ativo tocar, 1 vez por alvo; fora disso, zero. Escudo reduz pela mecânica própria; dash só vale enquanto há i-frames.
- **Ultimate do herói** recusada durante toda a Extinção **antes** de gastar mana/recarga (cadeado no botão); todas as
  outras ações (andar, correr, pular, dash, espada, escudo, magias 1–3) livres depois que a câmera volta.
- **Morte pendente**: HP do chefe em 0 com a ultimate em curso → `pendingDeath` (barra 0, presente, sem decidir/atacar,
  sem dano/cura, sem recompensa). Resultado (depois de TODO dano): herói vivo → `kill` (vitória única); herói morto →
  derrota (`deathPendingDefeat`), estado limpo e o duelo recomeça. Ultimate única por encontro.
- Suíte de casos-limite: `tests/vhazrael-orbital-mod320.test.mjs` (13 testes: passa longe, raspa −2 cm, +30 cm,
  5 FPS sem atravessar, explosão tangente −5/+20 cm, correr/saltar/dash, defesa, 0 HP + herói vive/morre, sem 0 HP,
  morte depois da resolução, mesmo tick + FPS baixo + PULAR, não cancelar por `!owner.alive`, regras do mundo).

## Evidências

`docs/vhazrael-mod320/evidencias/` — capturas do jogo real (SwiftShader; **não** representam FPS de Android):
corte antigo (faixa plana) × crescentes novas, rastro do dash, Ruptura com céu/halos/raios e sequência da segunda
explosão, tomadas da Extinção Orbital e queda jogável.
