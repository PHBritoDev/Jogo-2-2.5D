# Marco 7 — Ato VI: o deserto, a revanche dos Bispos, a Ganância e a Inveja

**Fonte:** roteiro original do autor, anexo do [documento mestre](../GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf), páginas 18 a 20.
As falas revisadas estão em [`act6-flow.js`](../../act6-flow.js); lugares e colisão em [`desert3d.js`](../../desert3d.js).

O texto original continua sendo a referência; as transcrições abaixo são resumidas por cena. Nenhuma fala, personagem, acontecimento ou luta foi cortado.
O herói é sempre chamado pelo nome que o jogador digitou.

## Cenas (ORIGINAL → REVISADO)

| ID | Original (resumo fiel) | Revisado no jogo |
|---|---|---|
| A6-01 | "Ato 6 — Em busca da Ganância"; jornada caótica até o deserto; andam até uma estátua | **Deserto (Blender, `DesertoKit.glb`):** região nova entre o coliseu e a neve, ligada por uma passagem ao sul. Areia, dunas baixas, rochas, cactos e ossadas.<br>**Estátua:** colosso encapuzado de pé, com coroa dourada, segurando a esfera de quatro encaixes, sobre um pedestal octogonal com runas.<br>**Chegada:** a pessoa misteriosa corre na frente; plano de grua com o título "O Deserto dos Fragmentos". |
| A6-02 | Cada Bispo derrotado deixa um fragmento espacial; com os 4 abre-se o portal da Ganância; colocam os fragmentos na estátua (animação como o vídeo de referência) | **Fragmentos:** os quatro sobem girando do herói até os encaixes da esfera, que acende.<br>**Falas:** mantidas (o herói explica os encaixes). |
| A6-03 | Caos: céu trovejando, chuva forte, redemoinhos, chão rachando; o NPC é levado para dentro do portal; a Ganância aparece e some | **Caos:** noite, trovões, chuva, quatro redemoinhos de areia, rachaduras vermelhas e o vórtice na frente da estátua.<br>**NPC:** é puxado girando para o vórtice.<br>**Ganância:** surge por alguns segundos e some num clarão. |
| A6-04 | Mensagem "os fragmentos já foram usados…"; "O que eu faço agora?…"; a voz da Ganância: "prove-me que é digno… derrote novamente os quatro Bispos"; "eu os revivi"; "Encontre um portal misterioso" | Mantido. A voz vem do céu sobre a estátua. |
| A6-05 | "Um portal no meio do deserto? Deixa isso para depois"; ao entrar, uma tela como no Shadow Fight: os 4 Bispos, X em quem já caiu; luta na ordem, cada um na própria dimensão | **Portal misterioso:** a leste da estátua.<br>**Tela da revanche:** cartões dos quatro Bispos (foto, nome); quem já caiu ganha um X vermelho; o botão LUTAR leva ao próximo, na dimensão antiga dele. |
| A6-06 | Bispo 1 a 4: falas de entrada e de derrota ("Salve as nossas almas", "nunca vou te vencer", "pegue o meu fragmento", "que destino cruel… humanos imundos") | Mantido. Cada vitória devolve um fragmento (contador no inventário).<br>**Força:** vida de 340 a 460, mais que na primeira vez. |
| A6-07 | Volta ao mundo; coloca os fragmentos de novo; a mesma animação, mas só o herói é sugado; sem a Ganância | Mantido. |
| A6-08 | "Cadê os meus companheiros?" / "vença-me primeiro"; Fase 1 → "agora é que a batalha de verdade começa" → Fase 2 → Fase final ("segunda pessoa que me obriga…" / "é impossível eu vencer isso") | **Três formas:** `greed1` (540), `greed2` (640) e `greed3` (900), cada uma com a própria barra.<br>**Transformação:** clarão e troca de modelo no meio da arena. |
| A6-09 | O Anjo e o NPC chegam ("não desista", "vamos lutar até o fim"); "como vocês escaparam da cela?"; o usuário luta, com os dois ajudando | **Aliados:** o Anjo dispara feixes de luz e a pessoa misteriosa dá cortes; os dois não sofrem dano. Quem luta é o jogador. |
| A6-10 | Quando a Ganância cai: animação do herói, do NPC e do Anjo usando ultimates; tudo fica branco; a Ganância caída; falas ("meros anjos… um simples Bispo que eu descartei", "e os outros seis?") | **Ultimates:** cada um com seu efeito (o Julgamento Divino do herói, anéis de luz do Anjo, cortes vermelhos em leque do NPC), depois tela branca e a Ganância no chão.<br>**Falas:** mantidas. |
| A6-11 | Rachadura do espaço-tempo; ser de silhueta preta (a Inveja, sem skin ainda); diálogo; a Inveja rouba a alma da Ganância, que se desintegra; "Espero vocês no meu mundo" | **Inveja:** silhueta preta com olhos verdes, saindo de uma rachadura.<br>**Alma:** uma esfera de luz sai da Ganância até a Inveja, e a Ganância some. |
| A6-12 | Fora da dimensão: explicação dos 7 mundos e dos anjos; "eu me chamo Sandra" — a skin vira mulher de cabelo vermelho longo e olhos vermelhos; "posso ir com vocês?" | **Sandra (Blender, `Sandra-rig.glb`):** o mesmo modelo do NPC, sem o capuz, mais esguio, com rosto, olhos vermelhos acesos e cabelo vermelho até a cintura (mantém todas as animações).<br>**Falas:** mantidas. |
| A6-13 | Um portal ENORME com 2 estátuas de anjo, bem medonho; os três entram; tela dos planetas; Planeta da Inveja desbloqueado | **Portal dos anjos:** arco de pedra escura com duas estátuas de anjo de asas abertas, aceso por dentro.<br>**Fim:** os três entram, a tela escurece, "GALÁXIA 1 LIBERTADA" e a próxima galáxia (Inveja) é liberada na tela das galáxias. |

## Decisões e limites (honesto)

- **Arco final antigo:** os guardiões e o portal antigo da Ganância ficam desligados nos passos 25 a 29; o Ato VI os substitui.
- **Sandra:** a aparência é feita por script a partir do modelo do NPC. Funciona, mas o rosto é simples — **SUSPEITA** de não estar à altura; dá para trocar por uma skin própria depois.
- **Inveja:** ainda sem skin, como o roteiro pede: um modelo de inimigo pintado de preto, com olhos verdes.
- **Ultimates "I Am Atomic" / Buraco Negro:** os poderes ficam para o marco dos poderes; aqui a cena usa efeitos próprios.
- **Aliados:** não sofrem dano (como a aliada do Ato V).
- **Sem corações:** na revanche, volta ao portal misterioso; na Ganância, volta à estátua e é preciso colocar os fragmentos de novo.
- **Evidência:**
  - **CONFIRMADO POR CÓDIGO:** `node --test`, 91 testes, entre eles os 4 de `act6-flow.test.mjs`.
  - **TESTADO EM NAVEGADOR** (Chromium com SwiftShader, roteiro automático): todo o Ato VI, do passo 27 ao 30, sem erros de página — chegada, estátua, caos, portal fechado, tela da revanche com os X, os quatro Bispos, a volta à estátua, as três formas com os aliados, a queda, a Inveja e o epílogo. Regressões (Atos III a V, morte na dimensão, mundo de dia e de noite) também sem erros.
  - **Android: NÃO TESTADO.**
