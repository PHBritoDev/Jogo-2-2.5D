# ZAR'KHAEL — NewBispo3.glb, Foice do Carrasco, Espiral do Carrasco, mira e dash (20/11/2026)

Briefing: `docs/briefings-temporarios/CLAUDE-BISPO3-FOICE-COMBATE-20261120.md` (branch `briefings/claude-bispo3-foice-20261120`).
Anexos recebidos nesta sessão:
- a imagem da foice;
- **dois** vídeos curtos da galeria (gravações de tela).

As duas referências de combate citadas no briefing não chegaram. Nada aqui foi tirado delas.

## Asset (`NewBispo3.glb`, existe na main)
- glTF binário (magic `glTF`), 17 020 696 bytes.
- 1 malha skinned (31 084 tri), 83 ossos (inclui dedos médios), 3 texturas WebP.
- **15 clipes** (s): Running .63 · Walking 1.03 · Attack 2.80 · Axe_Spin_Attack 2.50 · Charged_Upward_Slash 3.17 · Dead 2.97 · Double_Combo_Attack 2.83 · Left_Slash 3.17 · Skill_02 1.30 · Skill_03 1.63 · Triple_Combo_Attack 4.33 · Unarmed_Vault .83 · Weapon_Combo 3.67 · Weapon_Combo_1 3.50 · Weapon_Combo_2 4.50.
- Sem idle, guarda ou reação: são recortes do próprio GLB (Attack quadros 0–8 e 8–14; Double_Combo quadros 52–62).

**“Habilidade 2” × “habilidade 3”, resolvido pela inspeção** (rotação acumulada do quadril e distância entre as mãos):

| clipe | voltas | quadros com as duas mãos juntas (< 0,45 m) |
|---|---|---|
| **Skill_02** | **1,79** | **95 %** |
| Skill_03 | −1,17 | 8 % |
| Axe_Spin_Attack | −1,00 | 14 % |

Nenhum clipe tem 3–5 voltas. A Espiral usa o trecho do Skill_02 em que o quadril dá **exatamente uma volta** (quadros 4→23) em laço ×3, com ritmo crescente (0,85 → 1,05 → 1,3), mais a entrada e a saída do mesmo clipe. São ~3,9 voltas reais, com as duas mãos na haste.

**Raiz:** o Double_Combo começa com o quadril 1,08 m atrás da origem (o mesmo defeito do Bispo 2). A raiz é ancorada no neutro (`vgAnchorRoot`), senão o corpo apareceria deslocado e “teleportaria” entre golpes.

## Foice do Carrasco (`zarkhael-scythe3d.js`)
Malha 3D original e procedural:
- **haste**: retorcida, com cordão escuro e veio de lava helicoidais;
- **cabeça**: lâmina em meia-lua extrudada, com dentes na lombada, gume interno claro-magenta, 4 aberturas violeta por face e fissuras laranja;
- **detalhes**: cristas e espinhos no alvado, gancho na ponta inferior;
- **chamas espectrais**: violetas, por shader.

Números:
- **6 chamadas de desenho**, sem luz dinâmica;
- 2,3 m de haste (~1,5× a altura), cabeça ~1,15 m.

**Empunhadura medida**: os dedos seguem +Y do osso RightHand. Nos quadros a duas mãos, a mão esquerda fica em +Z da direita (alinhamento 0,97 no Skill_02), então a haste corre em +Z. Com −Z, a cabeça entrava no chão em 6 de 7 clipes.

Comportamento no jogo:
- **duas mãos**: quando o clipe junta as mãos (< 0,36 m), a haste gira para passar pela mão esquerda;
- **parado**: foice em pé, cabeça acima do ombro;
- **sempre**: cabeça e ponta inferior acima do piso.

Prova: `docs/combate/evidencias/zarkhael/foice-poses-4-vistas.jpg` (página `tools/visual-lab/zarkhael-rig-qa.html`, que usa o mesmo `attachKatana`/`poseKatana` do jogo).

## Espiral do Carrasco (nova, exclusiva)
| fase | o quê | leitura / contra-jogo |
|---|---|---|
| preparo 0,45 s | arma a foice com as duas mãos (entrada do Skill_02); fendas começam a acender | antecipação visível |
| 3 voltas | laço de uma volta, ritmo crescente; fragmentos de lâmina **atraídos à ponta real da foice**, riscos orbitais no arco da lâmina; corpo deriva devagar para o herói | quem estiver a ≤ 2,35 m leva 8 de dano por volta (uma vez por volta) |
| saída + trava | direção travada no herói 0,25 s antes da liberação | dash depois da trava escapa |
| liberação | massa helicoidal nasce na **matriz world da ponta da lâmina** e viaja reta a 12,5 m/s por até 18 m | sem perseguição |
| colisão | cápsula independente da animação; para em terreno bloqueado; i-frames anulam | 24 de dano, um acerto |
| recuperação 0,9 s | sem armadura | janela de punição |

- Recarga de 9,5 s; só entre 3,5 e 13 m.
- Não é a Espada Circular recolorida: módulo próprio (`zarkhael-spiral-vfx3d.js`).
- VFX: 3 fitas espirais recortadas (roxo-negro, costura rubra, borda magenta), duas meias-luas de energia à frente (silhueta de execução), 72 estilhaços instanciados em pool e anel de impacto.
- Qualidade baixa corta metade dos estilhaços e uma fita, sem perder a leitura.

## Golpes, mira e IA (`zarkhael-squad3d.js`)
- **9 golpes nativos:**
  - Ceifa Dupla
  - Corte Sinistro
  - Juízo Descendente (pesado, duas mãos, quebra guarda)
  - Ceifa Tripla
  - Roda do Carrasco
  - Sentença Ceifadora
  - Juízo em Dois Tempos
  - Giro de Revés (só com o herói às costas)
  - Salto Ceifador (investida)
- **Janelas de dano**: quadro em que a ponta da foice passa rápida na altura do corpo, medido no traço do clipe.
- **Mira por corte**: a mesma do Bispo 2 (`vgAim`).
  - O corpo gira para que a cabeça da foice chegue no herói e trava 0,17 s antes do contato.
  - Entre cortes, magnetismo curto e com colisão.
  - O dano usa o traço REAL do gume (sweep entre quadros), uma vez por janela.
- **Acerto contra herói parado** (traço real do GLB + motor; 0°/90°/180° × 30/45/60 FPS):

  | distância | sem a mira por corte | com a mira |
  |---|---|---|
  | 1,5 m | 67 % | **100 %** |
  | 2,5 m | 69 % | **100 %** |
  | 3,5 m | 33 % | **100 %** |

  Com i-frames na janela: **0 danos falsos**.
- **IA** lê distância, velocidade/fuga, dash repetido e pressão do herói:
  - **perseguir**: 1–2 passos diagonais e corte (ou Espiral, se ainda longe);
  - **flanco**: passo lateral e corte;
  - **recuo**: contra pressão ou dash repetido, às vezes emendando a Espiral (anti-recuo);
  - **espiral**.
- **Dash:** início a início **≥ 0,5 s** (regra do criador); orçamento de 4 em 3 s; passo bloqueado espelha; nunca atravessa parede; para antes da cápsula do herói.

**A mesma regra de 0,5 s foi aplicada ao VORGAZHEK** (isolado em `vorgazhek3d.js`, testado). O Bispo 1 (Codex) não foi tocado.

## Jogo real (Dimensão III, treino dos Bispos, bot com entradas reais, IA ativa; sem erros de console)
| sessão | golpes acertados / janelas sem contato (motivo) | Espiral (acerto / fuga / i-frames) | dash (menor início a início) | maior tempo parado |
|---|---|---|---|---|
| orgânica 60 s, 30 FPS | 17 / 21 (esquiva 18) | 5: 3 / 2 / 2 evadidas | 13 (0,508 s) | 0,87 s |
| orgânica 60 s, 45 FPS | 18 / 24 (esquiva 12, ângulo 7) | 4: 2 / 2 / 2 | 11 (0,517 s) | 1,09 s |
| herói parado 30 s | **11 / 1** | 2: 2 / 0 | 9 (0,508 s) | — |
| herói parado 15 s, 45 FPS | 461 de dano no chefe, golpes sem erro de mira | 1: 1 | 4 | — |
| herói circulando 30 s | 12 / 0 | 2: 0 / 2 | 10 (0,508 s) | 1,2 s |
| herói mantendo distância + dash para trás 40 s | 1 / 8 (longe 4, fora do arco 4) | 4: 0 / 2 | 13 (0,508 s) | 2,5 s |

- Antes do ajuste (empurrão 0,8 e passo de encurtamento curto), o herói parado tomava o 1º corte e escapava dos seguintes por empurrão (6 acertos / 9 erros). Agora o empurrão é 0,5 e o encurtamento vai até 2,4 m a 8 m/s (com colisão, para antes da cápsula): 11 / 1.
- A Espiral à queima-roupa era impossível de reagir (massa a 3,8 m acertava logo ao sair). Agora a Espiral exige ≥ 4,5 m, a massa sai a 0,9 m da lâmina e voa a 11 m/s: são 0,25 s de trava + ≥ 0,25 s de voo.
- Smoke: desktop 1280×720 e celular (Pixel 7) carregam a luta com o kind `zarkhael`, 0 erros, sem “Failed to mount” (55 e 53 chamadas de desenho). `?bisposComPoderes=1` volta ao Bispo 3 clássico.
- Suíte completa (`*.test.mjs` e `tests/*.test.mjs`): as mesmas 9 falhas da main antes desta branch (luzes, energia, ciclone do Bispo 4, tornado/ultimate do Bispo 2, Mod 278). Nenhuma falha nova.

Evidências: `docs/combate/evidencias/zarkhael/`:
- `espiral-do-carrasco-arena.mp4` (arena real);
- `espiral-quadros-arena.jpg`;
- `duelo-foice-31s.mp4` (piso neutro de QA);
- `foice-poses-4-vistas.jpg`;
- `espiral-vfx-isolado.jpg`.

## Onde entra
- **Treino dos Bispos** (padrão): a Dimensão III abre com o kind `zarkhael` na esquadra (`bishop3n`).
  - Kit de magias vazio; a Espiral é técnica da foice.
  - Vitória com a cena de queda original.
- **`?bisposComPoderes=1`**: o Bispo 3 clássico continua com Hidra, Chamas da Lua Negra, Espada Circular e Seis Selos (`revealEncounter`).

## Riscos e limites
- **Sem Galaxy A55/Android físico:** SwiftShader não mede desempenho de aparelho. Lógica validada em passo fixo de 30/45/60 FPS.
- Texturas WebP de 4,8 MB no GLB. Só carrega ao entrar na Dimensão III no treino.
