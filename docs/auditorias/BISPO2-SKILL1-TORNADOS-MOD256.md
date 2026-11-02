# Mod 256 — VORGAZHEK (Bispo 2): Vórtices do Pacto Escarlate + teste das dimensões 1 e 2

## Skill 1 — Vórtices do Pacto Escarlate (`tornadoes`, substitui "Correntes da Dívida")
- **Onde roda:** no motor real do Bispo 2 (`runFoeMove`/`updateFoeKit` do kit clássico, perfil `vorgazhek`), dentro da dimensão II.
- **Módulo:** `vorgazhek-tornado3d.js`, com lógica pura e VFX no mesmo relógio.
- **Linha do tempo:**
  1. `windup` 0,6 s.
  2. Onda 1:
     - selos revelados do centro para fora em 0,55 s;
     - formação de 2,3 s, girando desde o primeiro quadro;
     - plenitude de 1,3 s;
     - dissipação de 0,8 s, de cima para baixo.
  3. Pausa de 0,5 s, que só começa quando **todos** os tornados da onda 1 sumiram.
  4. Onda 2, com posições recalculadas em volta do jogador.
  5. `end`.

  O ritual inteiro dura cerca de 11,3 s, sempre com duas ondas.
- **Posições:** 3 a 5 por onda. Um tornado pressiona perto (1–1,8 m) e os outros cercam em arco a 3–5,6 m, deixando uma saída. A posição respeita `blocked` e o terreno, e o selo acompanha a inclinação.
- **Dano:**
  - hitbox igual ao raio atual do tornado;
  - perigo só a partir de 40% da formação (~0,9 s), e o selo pulsa vermelho antes;
  - 8 por tique (boss), um tique a cada 0,6 s por alvo, sem somar sobreposições;
  - i-frames do dash respeitados;
  - correndo dá para escapar.
- **Interrupção:** morte, saída da dimensão, cinematografia ou troca de inimigo desfazem tudo rápido, sem dano e sem nova onda. `resetEnemyAfterDimension` limpa.
- Enquanto o ritual canaliza, o Bispo 2 não lança outra magia.

**Arte**
- **Selo:** é a própria arte enviada pelo criador. O fundo preto virou alfa e o interior escuro foi preservado (`vorgazhek-selo-ritual.png`, 384 px). Revela do centro para fora, gira devagar e o vermelho pulsa quando o perigo começa.
- **Tornado 3D:**
  - 6 faixas helicoidais largas, preto → carmim, com fios vermelhos ao longo da faixa, cortes branco-rosados e base quente;
  - bordas recortadas e rasgos de pincel;
  - um núcleo helicoidal escuro (2 faixas em contra-rotação) com fendas rubras e brilhos brancos;
  - base estreita e topo largo e irregular, compondo-se de baixo para cima;
  - pequenos detritos girando.
- **Custo:** no máximo 5 tornados, geometria e programas compartilhados, cerca de 10 chamadas de desenho e nenhuma alocação por quadro. Na qualidade baixa, menos segmentos e detritos, mantendo o núcleo.

## Teste das dimensões (laboratório)
- `laboratorio-inimigos.html` (botão ⚔ TESTAR da página inicial) tem dois botões:
  - **Lutar contra Bispo 1 — Dimensão de VHAZRAEL**;
  - **Lutar contra Bispo 2 — Dimensão de VORGAZHEK**.

  Eles abrem `mundo-3d-prototype.html?testeDimensao=bishop1|bishop2`.
- O jogo chama a mesma `startDimensionBattle` da campanha, com `test:true`: cartão VS, arena, rig, boss, HUD e luta normais. O Bispo 1 luta na esquadra, e o Bispo 2 no kit clássico.
- **O que o modo teste não toca:**
  - sem corações gastos;
  - sem bestiário nem recompensa;
  - sem cenas de história;
  - armazenamento isolado (`isolatedSwordStorage`), então nada é salvo.
- **Painel recolhível "⚙ TESTE DAS DIMENSÕES":** lutar com 1 ou 2, reiniciar, sair da dimensão e voltar ao laboratório.

## Testes
- **`node --test`:** suíte completa. Os testes novos (`vorgazhek-tornado.test.mjs`) cobrem:
  - duas ondas exatas;
  - 3–5 por onda;
  - posições novas só entre ondas;
  - tempos de 2,3 s e 1,3 s;
  - perigo só depois de 40%;
  - tique espaçado e i-frames;
  - fuga correndo;
  - interrupção limpa;
  - ligação ao motor real;
  - modo teste sem progresso.
- **Prévia isolada:** `vorgazhek-tornado-preview.html?t=…&cam=near|wide|top&ground=dark|light`.
- **Jogo em Chromium headless (SwiftShader), paisagem:**
  - Dimensão II real: cartão VS VORGAZHEK, ritual com 5 tornados e ondas 1/2 no status, dano aplicado;
  - vitória de teste volta ao mundo sem salvar;
  - "Reiniciar" reabre o cartão VS.
- **Evidências:** `docs/evidencias/mod256/`.

## Limitações
- Não testado em Android físico. FPS real não medido.
- A semelhança com a referência do tornado é de linguagem (faixas preto-carmim, fios vermelhos, cortes claros), não idêntica a um desenho 2D.
