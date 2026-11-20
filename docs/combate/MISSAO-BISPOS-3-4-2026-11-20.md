# Bispo 3 (acabamento) + Bispo 4 (duas espadas) — 20/11/2026

Briefing: `CLAUDE_TEMP_MISSAO_BISPO3_BISPO4_20261120.md`, removido no último commit.

**Referências recebidas:** GIF do projétil roxo, as 2 imagens das espadas, a cúpula violeta-rosa e a explosão escura.
Os dois vídeos citados no briefing **não chegaram** nesta sessão; clipes e poses foram extraídos do próprio GLB.

## Bispo 3 — ZAR'KHAEL
- **Sem setor/cone roxo no chão.**
  - O anel `b.tell` não é mais criado para `zarkhael` nem para `veraxion`; os outros inimigos mantêm o deles.
  - O aviso agora é a pose, a foice erguida e o brilho crescente nas fendas.
- **Sempre o corpo novo.** Campanha e TESTAR usam NewBispo3 + foice + esgrima + Espiral.
  - Nenhum parâmetro devolve Hidras, Chamas, Espada Circular ou Seis Selos: o `?bisposComPoderes=1` não troca mais a rota.
- **Projétil novo** (ref. GIF):
  - núcleo pontiagudo branco-violeta;
  - garras/esquirlas negras-roxas curvas em leque para trás;
  - filamentos elétricos e rastro com gradiente temporal.
  - Nasce na **cabeça real da foice** (matriz world) e viaja reto, sem homing.
- **Explosão em cúpula** (ref. meia-esfera):
  - expande em 0,16 s, segura, contrai e dissolve com rasgos escuros, sem flash de tela;
  - acontece no contato válido (herói ou obstáculo) **e também** ao expirar no alcance;
  - é só visual: o dano é aplicado uma única vez pela lógica.

## Bispo 4 — VÉRAXION (`NewBispo4.glb`)
**Clipes reais (15):** Running .63 · Walking 1.03 · Charged_Upward_Slash 3.17 · Dead 2.97 · Double_Blade_Spin 5.67 · Double_Combo_Attack 2.83 · **Idle_14 7.50** · Jump_Over_Obstacle_2 .87 · Left_Slash 3.17 · **Spartan_Kick 1.40** · Triple_Combo_Attack 4.33 · **Walk_Backward_with_Sword 1.33** · Weapon_Combo 3.67 · Weapon_Combo_1 3.50 · Weapon_Combo_2 4.50.

**Ossos:** 36, com dedos médios. Medições nos clipes:

| clipe | o que foi medido | uso |
|---|---|---|
| Double_Combo | quadril começa 1,08 m atrás | raiz ancorada no Idle_14 (sem salto de posição) |
| Spartan_Kick | pé direito no peito aos 0,53 s | Chute de Ruptura |
| Spartan_Kick | mãos cruzadas aos 0,27–0,37 s | Guarda das Lâminas |
| Idle_14 | mão esquerda arremessa aos 4,80 s | pose do arremesso |
| Charged_Upward_Slash | pico da lâmina direita aos 1,03 s | Corte Ascendente Carregado |

**Duas espadas 3D originais** (`veraxion-swords3d.js`). As duas usam a mesma empunhadura medida no GLB: a lâmina sai do punho por +Z da mão.
- **A · Rosário Carmesim** (mão direita), lâmina de 1,14 m:
  - lâmina perolada assimétrica com farpas;
  - sulco carmesim com 4 olhos de pupila em fenda;
  - guarda dourada com olho central, ganchos em crescente, **asas de querubim** e correntes com cruzes;
  - cabo vinho com vinha de espinhos;
  - pomo em mitra com **coroa de espinhos**, fitas de tecido e flores rosadas.
- **B · Abismo Voraz** (mão esquerda), lâmina de 1,02 m:
  - lâmina negra com gumes prateados e sulco violeta ladeado de dentes de osso;
  - guarda em **mandíbula aberta** com fileiras de dentes, garganta violeta, 7 olhos roxos e chifres;
  - panos vinho com cruzes e correntes;
  - pomo em anel de espinhos com gema roxa;
  - fumaça violeta por shader.
- **Custo:** 13–14 chamadas de desenho por espada (olhos, pétalas e pistilos fundidos por cor de vértice).

**Seis famílias + defesa e mobilidade:**

| família | clipe | detalhe |
|---|---|---|
| Pêndulo Sangrento | Weapon_Combo_1 | A em 0,72 s → B em 1,67 s |
| Mandíbula em Cruz | Double_Blade_Spin 1,0–2,2 s | B 0,37 s + A 0,70 s em X, dano 0,75 por lâmina; é o contragolpe do aparo |
| Rosa de Espinhos | Weapon_Combo | A → B → A |
| Passo do Carrasco | Walk_Backward + Jump_Over | recuo → passo lateral com i-frames → estocadas alternadas A/B |
| Chute de Ruptura | Spartan_Kick | só colado; recarga de 5 s |
| Eclipse Geminado | Double_Blade_Spin | pesado, A/B/A, quebra guarda, fase ≥ 1 |

- **Guarda das Lâminas:** espadas cruzadas e aparo frontal; se for atingido aparando, faíscas A+B e Mandíbula em Cruz como contragolpe. Recarga de 3,6 s, sem invencibilidade, punível pelas costas.
- **Dash:** início a início ≥ **0,6 s**, com pós-imagem dupla (rubi/violeta).
- **Rastros por espada:** `veraxionA` (rubi/dourado) e `veraxionB` (violeta/negro com rasgos), gerados no arco real de cada ponta; no golpe cruzado aparecem os dois.

**Técnica 1 — Arremesso Voraz:**
- Pausa de 0,5 s na pose do Idle_14; a espada B **desacopla** e voa a 16 m/s, girando, com fumaça. A colisão é independente.
- **Acerta:** dano único → impacto fraturado preto/violeta → batida de 0,22 s → teleporte **para trás** do herói, em ponto navegável → 0,9 s sem golpe automático.
- **Erra:** voa até 11,5 m ou bate em obstáculo → teleporte para perto do fim real do voo.
- A espada volta à mão; interrupção ou morte devolvem a espada. Recarga de 10 s.

**Técnica 2 — Corte Ascendente Carregado:**
- Usa o clipe original; as duas armas acendem durante a carga.
- A direção trava aos 0,85 s e a liberação acontece aos 1,03 s, na lâmina A.
- A meia-lua retorcida 3D tem 3 camadas: borda rubi, sombra violeta e núcleo claro, com pétalas no rastro.
- Viaja reta 12,5 m, acerta uma vez; no impacto, duas lâminas de luz se cruzam.

**Rota:** a Dimensão IV (campanha, TESTAR e a sombra no céu) usa sempre `bishop4n`. Demônio 4 e mini-chefes não mudam.

## Medições
_(preenchido abaixo)_
