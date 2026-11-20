# VORGAZHEK — corpo novo, esgrima autoral, mobilidade e VFX (19/11/2026)

Briefing temporário: `CLAUDE_TEMP_MISSAO_VORGAZHEK_NOVO_RIG_COMBATE_20261119.md`, removido no último commit desta branch.

## Antes de mudar: como o Bispo 2 entrava na luta
- A Dimensão II usava o **motor antigo de inimigo único** com `Bispo2-lod.glb`: 52 ossos Mixamo, 37 004 triângulos e 6 clipes (Swim Idle, Walk, Sword Heavy Combo…).
- O kind `e2boss` **não é o Bispo 2**: é o mini-chefe da foice do Enemy2.
- O `NewBispo2_Otimizado.glb` estava no repositório, mas **não era carregado** por nenhum código.

## Inspeção do `NewBispo2_Otimizado.glb` (dados reais do arquivo)
| item | valor |
|---|---|
| tamanho | 12 613 336 bytes |
| malhas / materiais / texturas | 1 malha skinned `char1`, 1 material, 3 JPEG (3,1 MB + 1,4 MB + 1,2 MB) |
| triângulos | 30 738 |
| skin | 23 ossos: Hips, Chest, UpperChest, Neck, Head, braços, pernas e dedões dos pés. Os nomes são iguais aos do VHAZRAEL.glb, mas as proporções e as poses de repouso são **próprias** |
| arma | nenhuma na malha |
| clipes (s) | Running 0,63 · Walking 1,03 · Attack 2,80 · Basic_Jump 5,87 · Dead 2,97 · Double_Blade_Spin 5,67 · Double_Combo_Attack 2,83 · Jump_Over_Obstacle_2 0,87 · Triple_Combo_Attack 4,33 · Weapon_Combo_2 4,50 |

**Picos de velocidade da mão direita** (30 Hz), que viram as janelas de dano:

| clipe | picos (s) |
|---|---|
| Double_Combo | 0,63 / 1,20 |
| Triple | 0,77 / 1,50 / 2,33 |
| Attack | 1,07 |
| Weapon_Combo_2 | 1,00 / 1,97 / 3,00 |
| Double_Blade_Spin | 0,90 / 1,50 |
| Jump_Over_Obstacle_2 | 0,80 |

**Faltavam idle, guarda e reação.** Em vez de retargetar clipes de outro corpo, que teria eixos de osso diferentes, eles
são **poses recortadas do próprio GLB**: guarda e idle vêm dos quadros 0–12 do Attack, e a reação, dos quadros 44–56 do Double_Combo.

Prova visual em 4 vistas e 8 poses: `docs/combate/evidencias/vorgazhek/rig-novo-poses-4-vistas.jpg`, gerada pela página
`tools/visual-lab/vorgazhek-rig-qa.html`.

**Espada:** a **Espada Cósmica autoral da Mod 262** vai presa à mão direita com a empunhadura calibrada pela pose de
guarda. É uma lâmina só; o `Bispo2-lod.glb` e a `EspadaBispo2.glb` seguem no repositório para o modo com poderes.

## Onde entra
- **Treino dos Bispos** (`BISHOP_DUEL_ONLY`, padrão): a Dimensão II abre na esquadra com o kind novo `vorgazhek`, o rig
  `bishop2n` e **kit vazio**. Nenhuma magia nem resto de VFX de poder.
- **Com poderes** (`?bisposComPoderes=1` ou `?fullCombatQA=1`): continua o Bispo 2 clássico com todos os poderes originais.
  Nenhuma skill foi apagada.
- **Sem interferência:** VHAZRAEL/Bispo 1, `e2`/`e2boss`, áudio e trilhas não mudaram. As alterações no motor e no runtime
  ficam em ramos `kind==='vorgazhek'`.

## Esgrima autoral (`vorgazhek3d.js`)
| assinatura | o que faz | clipes |
|---|---|---|
| Passo do Eclipse | 1–3 dashes curtos (alternando lado) até o flanco; o último em arco e com i-frames, emendando o corte | Jump_Over_Obstacle_2 → golpe |
| Retirada do Crepúsculo | contra dashes ou pressão em sequência: 2–3 tempos de recuo/lateral; o 3º volta cortando | Jump_Over_Obstacle_2 |
| Órbita do Vazio | corta **recuando** (avanço −1,6 m) ou perseguindo (fase ≥ 1) | Weapon_Combo_2 |
| Investida Corrompida | corrida intencional (0,55 s) → estocada | Running → Jump_Over_Obstacle_2 |
| Atravessamento Aéreo | dash lateral → salto baixo → dash aéreo no alvo → pouso cortando | Basic_Jump |
| Guarda da Fenda | escudo próprio (1,6 s, recarga 7,5 s, rompe com golpe pesado) ou guarda curta seguida da Órbita recuando | pose de guarda |
| Sentença de Dois Tempos / Tripla | 2 ou 3 golpes encadeados, sem idle entre eles | Double/Triple_Combo_Attack |
| Giro do Eclipse | contra herói de lado ou atrás | Double_Blade_Spin |
| Queda da Fenda | golpe pesado que quebra guarda | Attack |

**Regras:**
- A IA só lê sinais visíveis: distância, dash recente, golpe ativo, guarda e recuperação.
- Orçamento de dash: no máximo 5 em 3 s, depois trava por 1,2 s.
- Cada passo testa terreno livre e para antes da cápsula do herói.
- Armadura de cambaleio de 2 s. As fases seguem a vida (ensino → técnica → pressão → fúria).
- Os ganchos reposicionar→conjurar existem, mas não disparam com o kit vazio.

## VFX (`vorgazhek-vfx3d.js` + estilo `vorgazhek` em `slash-vfx3d.js`)
- Paleta escolhida a partir do modelo (armadura escura com capa rubro-negra) e da Dimensão II (água escura, olhos vermelhos):
  - **crescente fina** com núcleo branco-gelo, corpo índigo-violeta e borda ciano glacial;
  - escudo de vidro de vazio índigo com fissuras ciano;
  - rastro do dash índigo, nada carmesim;
  - brilho próprio contido no corpo (emissivo índigo 0,7), para a silhueta ler no escuro.
- **Fenda do dash:** risco fino na direção do deslocamento.
- **Anel de pouso:** ao fim do Atravessamento Aéreo.
- **Arco elétrico abissal:** 2–3 filamentos só nos cortes `arc` (Queda e Tripla), no quadro do contato, com vida de 0,14 s.
- Pools fixos, sem luz dinâmica nem alocação por quadro; qualidade baixa reduz a contagem.
- Referências: do vídeo 1 vieram os rastros concentrados e a marca da lâmina no contato. Do vídeo 2 vieram:
  - rastros frios finos;
  - deslocamento aéreo;
  - anéis no pouso;
  - riscos longos depois do dash.

  A cor vermelha e as coreografias dos vídeos não foram copiadas.

## Duelos reais (Dimensão II, treino dos Bispos, sem `fullCombatQA`, bot com entradas reais, IA ativa)
| sessão | 60 s #1 | 60 s #2 |
|---|---|---|
| sequências de dash | crepúsculo 5 (1–3 passos), eclipse 1 (2), aéreo 1 | crepúsculo 7 (1–3), eclipse 3 (1–2) |
| saltos com dash aéreo | 6 | 6 |
| escudo / guarda + resposta | 1 / 1 | 1 / 1 |
| golpes (início) | Eclipse 8, Órbita 9, Investida 7, Giro 4, Queda 3 | Eclipse 8, Órbita 9, Investida 9, Giro 3, Queda 2 |
| acertos no herói | 11 | 12 |
| maior tempo parado | 1,0 s | 1,5 s |
| magias do chefe | 0 | 0 |

Vídeo: `docs/combate/evidencias/vorgazhek/vorgazhek-duelo-22s.mp4`.

## Riscos e limites
- **Não testado em Android físico.** O SwiftShader roda a 2–5 FPS; a luta é simulada em passo fixo de 1/30 s.
- **Texturas pesadas:** o GLB tem 12,6 MB, sendo 5,7 MB de texturas JPEG. Ele só carrega ao entrar na Dimensão II no
  treino; vale gerar texturas menores numa missão de assets.
- **Golpes de fase alta:** a Sentença Tripla e a Órbita em avanço (fase ≥ 1) só aparecem com o chefe abaixo de 70 % de
  vida; os duelos de 60 s do bot não chegaram lá.
