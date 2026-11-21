# Bispos 3 e 4 — revisão de combate e VFX (21/11/2026)

Briefing: `CLAUDE_TEMP_REFAZER_BISPOS3_4_VFX_COMBATE_20261120.md`, removido no commit final desta PR.

**Referências usadas:**
- GIF da fera de olhos vermelhos;
- imagem do ataque radial rosa/negro;
- vídeo do Bispo 4 (9,6 s) e vídeo do Bispo 3 (5,45 s), com nomes de gravação de tela diferentes dos citados no briefing;
- foto da cúpula rasgada (anexada na missão anterior, mesma conversa).

Nenhuma porcentagem de semelhança é afirmada. Os comparativos lado a lado ficam em `evidencias/bispos-3-4-v2/`.

## Bispo 4 — VÉRAXION

### Causa do “só o 1º golpe tira HP”
A graça de 850 ms **não** era a causa (a exceção da PR #628 funciona). Telemetria real, com HP lido antes e depois de cada
contato:
- a mira girava só até o **azimute instantâneo** de cada golpe, a 5,5 rad/s entre contatos;
- o 2º golpe da Mandíbula em Cruz chegava a 42° fora do arco;
- o 2º golpe do Corte Gêmeo chegava a 120° fora, porque o golpe estava marcado no recuo da lâmina, que passa às costas.

**Correção** (`vxAim`, `veraxion-squad3d.js`):
- cada golpe guarda a **faixa angular real varrida pela lâmina** na janela de contato, medida no GLB;
- o corpo gira 9–10 rad/s até a lâmina cobrir o herói e trava 0,12 s antes do contato;
- o 2º golpe do Corte Gêmeo foi para 1,32 s, quando a lâmina A passa à frente (medido no clipe).

**Resultados:**
- Teste com o traço real: herói parado de frente, de lado e de costas, a 30 e 60 FPS → ≥ 90 % dos contatos; 0 danos com i-frames na janela.
- Jogo em tempo real, herói parado, 45 s: 24 de 26 janelas conectaram (92 %).
  - Mandíbula 2/2, Rosa 3/3, Corte Gêmeo 2/2 e Sentença 3/3 em todas as repetições.
  - Todo contato real tirou HP: 27 de 27, incluindo Arremesso e Florescer.
- Dash, esquiva perfeita, escudo e graça entre ataques diferentes continuam como antes.

### Pausas mortas
O motor somava um respiro genérico de 0,85 s a cada 3–4 combos. No VÉRAXION o respiro agora é uma **ação legível**:
recuo com a espada (seguido de Arremesso), Guarda das Lâminas ou Florescer Abissal.

Simulação de 90 s com herói parado (3 sementes):

| medida | valor |
|---|---|
| intervalo entre ações (mediana / p90 / máx.) | 0,13–0,18 / 0,23 / 0,57–0,78 s |
| Arremesso Voraz | 3–5 ocorrências |
| Florescer Abissal | 4–5 ocorrências |
| combos repetidos em seguida | 0 |

### Arremesso Voraz orgânico
- Antes só aparecia com o herói a 4–11 m.
- Agora também sai do recuo sinalizado (≥ 2,1 m) e ganha peso após 13 s sem técnica.
- Captura real: 2 arremessos acertaram, com 2 teleportes para trás do herói.

### Florescer Abissal (no lugar do Corte Ascendente reprovado)
O ataque reprovado era o Corte Ascendente: a meia-lua rosa vista no fim do vídeo do Bispo 4.

- **Preparação:** mesmo clipe `Charged_Upward_Slash`; o núcleo carmim se forma entre as duas espadas.
- **Pulso:** aos 1,03 s; 14 arcos-lâmina 3D irradiam em ondas escalonadas (na fase ≥ 2, uma segunda onda defasada).
- **Arco:** fita com seção em losango; gume rosa-magenta e miolo negro com veios vermelhos.
- **Movimento:** cada arco tem torção e curvatura próprias, 2 ecos de trilha temporal e desintegração por ruído.
- **Chão e raios:** riscos radiais no chão; raios de 2–5 ramos com tremor suave no tempo.
- **Dano:**
  - o 1º passo varre desde o centro, então o herói colado também é atingido;
  - a frente de onda é varrida contra a largura tangencial de cada arco;
  - 1 acerto por alvo por onda;
  - a parede encerra o arco;
  - o dash com i-frames atravessa e o vão entre arcos é seguro (testes).
- **Custo:** 4 chamadas de desenho (arcos instanciados, núcleo, chão, raios).
- **ADM:** botão “ADM · Florescer Abissal”; a chave interna `up` foi mantida para compatibilidade.

## Bispo 3 — ZAR'KHAEL: Fera dos Mil Olhos

### Sequência
A massa helicoidal e a cúpula violeta antigas foram removidas. A sequência agora é:
1. 2 voltas da foice (≈ 1 s);
2. a fera é conjurada à frente do chefe;
3. corrida com interceptação moderada (≤ 2,4 s);
4. desacelera e para;
5. abre a boca ao máximo, com a direção travada nos últimos 0,17 s;
6. bote proporcional e fechamento;
7. **um** teste de dano quando os dentes se encontram;
8. **só depois** desintegra e explode em cúpula.

### Modelo
3D procedural, sem sprite:
- ~51 placas-lâmina negras com gume prateado, viradas para fora;
- 61 olhos convexos com espiral vermelha lenta em UV polar (`sin(5θ + 15r − vt)`), pupila em fenda e contorno claro;
- maxila e mandíbula com dobradiça (abertura ≈ 86°), palato e língua escuros com sulcos;
- membranas laterais e garganta que fecham a cavidade;
- 132 dentes instanciados, em 2 fileiras por arcada, com caninos;
- 4 patas com IK de 2 ossos e garras;
- fitas de sombra presas ao corpo.

A altura ≈ metade da do VÉRAXION. Custo: 12 chamadas de desenho para a fera e 4 para a cúpula.

### Contrajogo (no jogo real, `beastqa`)

| cenário | resultado |
|---|---|
| herói parado | mordida acerta, 1 dano, HUD “⚔↓ Dano −20 % · 30 s” |
| dash na mordida | erra, sem debuff |
| golpe de espada | 1 salto agressivo, sem matar a fera |
| magia (Cerco das Cinco Lâminas) | fera desfeita, sem mordida |

- O alvo das magias é travado na fera no lançamento, sem trocar no meio do voo.
- A Fênix leva 1,5 s de preparo: lançada tarde, pode não chegar antes da mordida.

### Debuff da mordida
- Dano **causado** pelo herói ×0,8 em `damageActor` (`by: 'hero'`), uma vez por acerto.
- Usa o relógio da esquadra, que pausa junto com o jogo.
- Renova sem acumular, expira e zera na derrota.
- Teste: 100 → 80 → 100.

### Cúpula
Ref. foto:
- hemisfério deslocado por ruído em 2 escalas;
- rampa violeta/rosa com núcleo laranja e borda lilás-azulada (Fresnel);
- pinceladas negras diagonais anisotrópicas que crescem;
- anel de estilhaços negros e chamas lilases no chão.

Não causa dano.

## QA
- **Testes:**
  - `tests/zarkhael-foice.test.mjs` (11) e `tests/veraxion-duas-espadas.test.mjs` (12) passam.
  - Suíte completa: só as falhas que já existiam na `main`, conferidas arquivo a arquivo em um worktree da `main`.
  - A expressão regular de `tests/combate-cinematico.test.mjs`, quebrada pela PR #628, foi corrigida; o `combat315` volta a passar.
- **Smoke** desktop 1280×720 e Pixel 7 emulado nas Dimensões III e IV: 0 erros.
- **Chamadas de desenho:** 66 na III, 80 no desktop e 74 no celular na IV.
- **30/45/60 FPS:** as mesmas fases e o mesmo resultado da fera (teste).
- **Recursos de GPU:** pools fixos, criados uma vez por runtime e limpos na saída e na reentrada.

## Limites
- Sem Android físico: o FPS de aparelho não foi medido.
- As capturas usam o SwiftShader e passo fixo.
