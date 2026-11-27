# A Batalha Contra os 7 Pecados Capitais — Cânone Mestre (proposta A5)

> **STATUS: CANDIDATO 0.2 — NÃO É CÂNONE APROVADO.** Documento novo para revisão do criador. Nenhuma fala, nome, missão, planeta, chefe ou flag aqui descrito deve entrar no jogo antes da revisão. Não substitui nem apaga o PDF original, M1–M14 ou propostas anteriores.

**Data:** 25/11/2026\
**Escopo:** prólogo, Galáxia 1 completa, seis mundos seguintes, personagens, mistérios, consequências e encerramento.\
**Princípio:** preservar os acontecimentos expressamente presentes no roteiro original; onde ele não define conteúdo, apresentar uma proposta marcada como tal.

## 0. Legenda de evidência

- **[PDF]** — acontecimento explicitamente presente em GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf.
- **[IMPLEMENTADO]** — comportamento encontrado nos módulos atuais do jogo; isso não significa aprovação narrativa.
- **[PROPOSTA A5]** — desenvolvimento criativo sugerido para fechar lacunas ou corrigir contradições.
- **[PENDENTE]** — decisão que exige aprovação do criador ou conferência adicional do runtime.

A fonte primária consultada é o PDF da main (blob Git 337790454da165156863028468a272267905d98b, 21 páginas). O arquivo foi comparado com a cópia materializada: o Git blob corresponde exatamente.

## 1. Premissa central

Deus envia o protagonista, cujo nome é escolhido pelo jogador, para salvar sete mundos dominados por Pecados Capitais. Antes da descida, retira suas asas e sua aura: a glória celestial chamaria atenção e poderia cegar quem a carrega. O Anjo-Guia acompanha a missão, mas não pode agir como salvador no lugar do jogador. No quarto mundo, o protagonista poderá recuperar asas e aura.

**[PDF]** A primeira galáxia é a da Ganância. A segunda é a da Inveja. O roteiro original também estabelece quatro Bispos ligados à Ganância, uma quinta Bispa exilada, o passado humano do protagonista, a limitação de 5% dos anjos no mundo material, quatro fragmentos espaciais, as revanches contra os quatro Bispos, a Ganância em três formas e a aparição da Inveja roubando a alma da Ganância.

**[PROPOSTA A5]** A campanha não deve ser sete lutas isoladas. Cada pecado distorce uma necessidade humana legítima e constrói um sistema que prende o mundo. O jogador vence o chefe e também rompe o mecanismo social, mágico ou emocional que alimenta aquele pecado. Assim, os sete mundos têm identidade própria e o tema não vira apenas uma coleção de demônios.

### Perguntas que sustentam a campanha

1. Quem era o protagonista antes de ser enviado ao Reino Material — e por que essa origem permite usar poder que os outros anjos não podem?
2. O Anjo-Guia está protegendo o protagonista ou escondendo algo que acredita ser necessário?
3. Por que a Ganância mantém Bispos com métodos diferentes, e o que cada um ganha ao servir a ela?
4. Por que a quinta Bispa foi exilada? Ela quer libertar os mundos ou substituir quem os domina?
5. Por que a queda de um Pecado fortalece ou desperta outro?
6. Salvar um mundo significa apenas derrotar seu chefe ou devolver às pessoas a capacidade de escolher?

## 2. Hierarquia das fontes e limites

1. O PDF original do criador é a fonte primária do enredo de Galáxia 1.
2. MARCO-0 é uma auditoria histórica e um plano de execução; não substitui o PDF.
3. M1–M8, M13–M14 e os fluxos act1–act6 são transcrições, revisões e implementação. Devem ser comparados com o PDF, não tratados automaticamente como canon.
4. ato-1-eldoria-roteiro-v1.md é uma proposta alternativa não aprovada. Seus personagens e eventos não são fatos confirmados.
5. implementacao-pesquisa.md é uma nota de trabalho; sua frase que chama o roteiro v1 de “fonte de verdade” contradiz a hierarquia acima.
6. O menu galaxies3d.js é implementação visual, não autoridade teológica ou narrativa. Sua lista atual tem Ganância e Avareza como mundos separados e não inclui Preguiça.
7. PRs e briefings de outros agentes são trabalhos em andamento. A jornada Sakura/Neve/Castelo foi integrada como ambiente/fluxo pela #673 e pela integração #682 na main Mod 361. A existência técnica não define, por si só, se ela é rota obrigatória, opcional ou qual função dramática terá; isso continua pendente de aprovação narrativa.

## 3. Os sete mundos — ordem candidata

O PDF confirma explicitamente Ganância como mundo 1, Inveja como mundo 2 e a recuperação de asas/aura no mundo 4. Não define os arcos dos mundos 3, 5, 6 e 7. A ordem abaixo preserva os dois primeiros e mantém Soberba no quarto, como pede o marco das asas.

| Mundo | Pecado | Tese dramática | Fantasia visual e mecânica | Chefe — nome de trabalho |
|---|---|---|---|---|
| 1 | Ganância | Tudo vira dívida, preço ou garantia; até uma vida pode ser contabilizada. | Eldória, floresta, esgotos, Cinzária e vulcão, Invernália, torre, coliseu e deserto. Livros de dívida, contratos, fragmentos e dimensões. | Ganância; quatro Bispos e Sandra como quinta Bispa exilada. |
| 2 | Inveja | O indivíduo deixa de desejar algo e passa a desejar ser o outro. | Espelhos, raízes, olhos, cópias de NPCs e ecos de ações do jogador. Resolver identidade e reconhecimento. | NÉRITH — “O Reflexo Sem Dono” (proposta). |
| 3 | Preguiça | O descanso, que deveria recuperar, torna-se fuga permanente da vida. | Cidade em amanhecer imóvel, relógios parados, jardins sem vento e habitantes suspensos. Reativar ciclos de tempo e acordar pessoas. | SOMNIEL — “O Guardião das Horas Imóveis” (proposta). |
| 4 | Soberba | Dignidade vira superioridade; poder passa a ser prova de que ninguém pode questionar o portador. | Cidade vertical e tribunal celestial. Asas e aura retornam, mas o jogador precisa escolher como usar poder. | AUREXION — “O Trono Acima do Céu” (proposta). |
| 5 | Gula | Nutrição e celebração viram consumo sem limite; o centro prospera enquanto a periferia passa fome. | Banquete monumental, canais de alimento, cozinhas industriais e bairros esvaziados. Distribuição e preservação de recursos. | VORACIS — “A Boca que Nunca Fecha” (proposta). |
| 6 | Ira | A justiça não termina: transforma-se em vingança herdada. | Fronteira em guerra, cidades partidas, cinzas e campos de batalha. Desarmar ciclos de retaliação e enfrentar inimigos que crescem com a fúria. | KHARVOSS — “O Juiz da Última Chama” (proposta). |
| 7 | Luxúria | Desejo vira posse e idealização; uma lembrança perfeita pode aprisionar mais que uma corrente. | Palácio de ilusões, jardins noturnos e memórias reconstruídas. Distinguir lembrança verdadeira de promessa impossível. | VELYRA — “A Voz do Desejo” (proposta). |

**Decisão de nomenclatura:** Avareza é tradicionalmente uma forma/nome de Ganância, não um oitavo pecado distinto. A proposta é manter “avareza” como faceta do sistema da Ganância e substituir o mundo 3 por Preguiça. Isso corrige a lista sem mudar o número do mundo nem deslocar Soberba do mundo 4. Não alterar GALAXIES até aprovação.

Os nomes dos chefes dos mundos 2–7 são rótulos de trabalho. Não devem aparecer em UI, arquivo de save ou diálogo antes de aprovação.

## 4. Personagens centrais

### Protagonista — nome escolhido pelo jogador

- **[PDF]** É enviado por Deus, perde asas e aura no prólogo e descobre no Ato III que já foi humano. Sua origem física explica por que consegue usar poder integral no mundo material, ao contrário dos anjos limitados a 5%.
- **[PROPOSTA A5]** Sua força não deve resolver tudo. Ele pode vencer lutas, mas precisa aprender a escutar, interpretar pistas, confiar e assumir consequências.
- **Voz:** direta, observadora, por vezes irônica; evita discursos longos. Quando está com medo, não precisa anunciar medo — a ação e as pausas mostram.
- **Mistério:** o jogador não recebe uma biografia fechada no prólogo. Memórias surgem por objetos, sons e frases recorrentes. A causa exata de sua transformação em anjo permanece pendente.

### Anjo-Guia

- **[PDF]** É enviado para acompanhar o protagonista. No mundo material, os anjos usam corpo físico e apenas 5% do poder real.
- **[IMPLEMENTADO]** prologue-flow.js usa Aethraziel como nome verdadeiro e Vaelthar como nome público. O PDF original diz apenas “Anjo-Guia”.
- **[PROPOSTA A5]** Manter Aethraziel/Vaelthar como candidatos, mas decidir explicitamente se são dois nomes, título e nome, ou se um deve ser removido. Sua falha central é confundir proteção com omissão: ele esconde a origem do protagonista porque teme que a verdade o desvie da missão.
- **Arco:** guia → guardião que omite → aliado vulnerável → alguém que precisa confiar no protagonista. O duelo no Ato III deve ser uma prova/efeito de selo ou conflito de objetivos, não uma traição sem motivo.

### Sandra — quinta Bispa exilada

- **[PDF]** É a quinta Bispa, foi exilada e deseja destruir a Ganância. Ajuda o protagonista em partes da jornada e participa do desfecho.
- **[PROPOSTA A5]** O verdadeiro choque de sua revelação deve ser sua posição, história e motivo — não o fato de ser mulher. O jogador deve reconhecer pistas anteriores: conhecimento excessivo dos portais, leitura tática dos Bispos, familiaridade com a economia de almas e uma reação particular ao nome da Ganância.
- **Motivo candidato:** ela se recusou a pagar uma ordem que exigia sacrificar um distrito inteiro e foi descartada. Quer destruir a Ganância, mas também quer decidir o destino do poder que restar. Não é aliada automática: ajuda quando os objetivos coincidem e precisa conquistar confiança por ações.
- **Possível continuidade:** a comerciante misteriosa vista em Eldória e a pessoa misteriosa da jornada de Cinzária podem ser a mesma mulher. Isso aproveitaria a ideia do vendedor recorrente e daria função à aparição precoce. **Pendente de aprovação**; não atribuir a NPC existente ainda.

### Os quatro Bispos da Ganância

| Bispo | Nome/epíteto em material atual (confirmar) | Função dramática proposta |
|---|---|---|
| VHAZRAEL — O Ceifador dos Condenados | Primeiro Bispo; cobra dívidas com almas. | A cobrança coercitiva: transforma sofrimento em “contrato cumprido”. Acredita que medo mantém a ordem. |
| VORGAZHEK — Arauto das Almas Endividadas | Segundo Bispo; livros de dívida e juros. | A burocracia da exploração: chama crueldade de cálculo e diz que ninguém é inocente por dever. |
| ZAR'KHAEL — Carrasco do Juízo Eterno | Terceiro Bispo; dimensão distorcida e julgamento. | A moralização da exploração: convence vítimas de que merecem o que sofrem. |
| VÉRAXION — Custódio do Último Selo | Quarto Bispo; passado humano ligado à Terra, meteorito, perda da mãe e justiça comprada. | A lei corrompida: foi vítima de uma injustiça real e escolheu impedir que qualquer um tenha poder de contestá-lo. |

Os nomes aparecem no PDF/runtime/M1–M14; os epítetos devem ser conferidos no roteiro aprovado antes de virarem UI. Os quatro não devem repetir a mesma fala de “sou forte”. Cada um apresenta uma justificativa diferente para servir à Ganância e deixa uma pista concreta sobre o próximo.

### Ganância

- **[PDF]** É o primeiro Pecado, tem três formas no confronto final e sua alma é roubada pela Inveja após a derrota.
- **[PROPOSTA A5]** Sua máscara humana deve ser convincente: não oferece ouro apenas; oferece segurança, devolução de perdas e a promessa de que ninguém mais será impotente. A forma final não é “mais um monstro grande”, mas o resultado de alguém que consumiu tudo e já não sabe o que deseja.

## 5. Galáxia 1 — roteiro candidato por ato

### Prólogo — O chamado

1. Panorama do Reino Celestial e caminhada até o trono. O protagonista se ajoelha; Deus apresenta os sete mundos em risco.
2. A missão é formulada como salvamento, não conquista. Deus retira asas e aura para que a glória não atraia os habitantes nem corrompa quem a carrega.
3. O jogador escolhe o nome do protagonista.
4. O Anjo-Guia já está presente quando ele desperta no mundo material. O guia pede que se levante e explica que ainda precisam descobrir por onde começar.
5. O guia apresenta o nome público candidato Vaelthar e ouve a carroça na estrada. O primeiro mundo é a Ganância.

**Cliffhanger:** a primeira evidência de que o mundo cobra vidas como dívida aparece antes de o jogador saber quem está cobrando.

### Ato I — Eldória: a dívida dos vivos

**Objetivo emocional:** começar com curiosidade e nostalgia de um lugar habitado, depois transformar a segurança da vila em inquietação. A vila é pobre, mas viva; pobreza deve ser percebida por comida, escassez, trabalho e comportamento, não por prédios aleatoriamente destruídos.

1. **Chegada à vila.** O jogador conhece o vendedor e percebe que os moradores evitam falar da floresta. O NPC não precisa ser nomeado antes de aprovação. O guia observa que as pessoas não estão apenas com medo: elas calculam o que podem perder.
2. **A primeira trilha.** A floresta à noite apresenta seguidores da Ganância. O jogador encontra sinais de que alguém está marcando pessoas como propriedade.
3. **A chave e as crianças.** A chave abre as gaiolas. Duas crianças foram transformadas; a cena deve ser triste e respeitosa, sem transformar sofrimento infantil em espetáculo. O jogador entende que a dívida atinge famílias inteiras.
4. **O massacre e os esgotos.** Três demônios atacaram moradores. O caminho subterrâneo leva a cinco seguidores alimentando-se de vítimas e a um buraco que desce para as celas.
5. **As celas.** Dez prisioneiros mostram que a floresta é parte de um sistema, não um esconderijo aleatório. A pista aponta para o guardião do portal.
6. **O Guardião do Portal.** O mini-chefe protege a dimensão. Se implora ao perder, a cena deve mostrar que servos também são presos pelo sistema — não apagar a ameaça, mas plantar dúvida.
7. **Dimensão de VHAZRAEL.** O Bispo fala em dívidas e almas. O protagonista o derrota e encerra o Ato I. A recompensa é única; a vitória não apaga o dano causado à vila.

**Motivo de memória:** um pequeno objeto marcado com o nome de alguém — moeda, etiqueta ou placa — reaparece em cenas posteriores. Sua função é lembrar que uma vida não é uma linha de um livro.

**Missões opcionais:** o módulo atual tem Flores de Vigília, Pingente de Lia e Pedras que Lembram, mas os vendedores e histórias não estão aprovados. O novo roteiro deve decidir quem são os NPCs e por que cada tarefa importa. Não vincular as missões a Bento/Téo/Lia ou Mara/Nara sem aprovação.

### Ato II — Cinzária e o vulcão: juros sobre a vida

**[PDF]** O protagonista viaja à cidade do vulcão, encontra bandidos e uma pessoa misteriosa, enfrenta guardas, entra no vulcão, passa por laboratório, chave, sala de ouro, cinco demônios e mini-chefe, enfrenta VORGAZHEK, vê a erupção e depois VÉRAXION destrói a cidade com um buraco negro. O Anjo desaparece e resta uma pista para a cidade de neve.

1. **Estrada para Cinzária.** A jornada dá espaço para o jogador observar como a Ganância transformou o caminho em rota de cobrança.
2. **Bandidos.** Eles não atacam por “ser maus”; cobram pedágio em nome de um Bispo. O jogador pode descobrir que alguns foram recrutados por dívida.
3. **Pessoa misteriosa.** A figura testa o protagonista em duelo e desaparece antes de explicar o motivo. Candidata a mesma comerciante/Sandra; não confirmar ainda.
4. **Entrada escondida.** Dois guardas protegem a caverna. O contraste da cidade com o interior do vulcão revela a escala industrial da exploração.
5. **Laboratório.** Pessoas e criaturas são tratadas como matéria-prima. O jogador encontra a chave que abre a passagem para o núcleo.
6. **Sala de ouro e galeria.** O ouro é abundante, mas não pertence aos moradores. Cinco demônios protegem a sala do trono.
7. **VORGAZHEK.** Os livros representam dívida, juros e garantia. Ele afirma que todos assinaram, mesmo quando a assinatura foi obtida sob ameaça.
8. **Erupção e VÉRAXION.** A vitória sobre VORGAZHEK não resolve o sistema. A cidade entra em colapso; VÉRAXION usa o buraco negro e o Anjo desaparece. A nota aponta para a cidade de neve.

**Conflito documental e de runtime:** M3-ATO2 diz que a narrativa nova será escrita depois. act2-flow.js ainda conserva funções de cena para bandidos e duelo com a pessoa misteriosa, mas a revisão Mod321 substituiu a cidade antiga por Cinzária e a rota atual usa migrateAct2Step para levar saves do passo 10 diretamente ao passo 11 (entrada do vulcão). Portanto, essas funções antigas existem no módulo, mas não devem ser presumidas como cenas alcançáveis no percurso atual. A nova narrativa precisa decidir se as recupera em Cinzária ou as substitui, sem quebrar saves.

### Ato III — Invernália: a verdade que não cabe em um corpo

**[PDF]** Cidade de neve, casaco, lago congelado, pousada armadilha, porão, três Enemy3, cidade em chamas, resgate do Anjo, caverna de gelo, dimensão com controles invertidos, mini-chefe, ZAR'KHAEL, revelação de identidade, luta contra o Anjo, explicação dos 5% e captura do Anjo pela Ganância.

1. **Estrada fria.** O vendedor oferece casaco; a escolha é mecânica e narrativa: proteção custa recursos, mas não deve bloquear a história.
2. **Pescador e moradora.** Os habitantes não sabem onde está o Anjo. O jogador recebe pistas incompletas e um lugar para descansar.
3. **A estalagem.** A noite muda a cidade; a estalagem é uma armadilha. O jogador desperta no porão e precisa escapar.
4. **Ataque à cidade.** Três inimigos no porão e quatro na cidade em chamas mostram que o ataque foi planejado para atrair o herói.
5. **Resgate do Anjo.** O guia retorna, mas a relação muda: ele sabe mais do que contou.
6. **Caverna de gelo.** A dimensão distorcida inverte controles; o mini-chefe e dois inimigos protegem o portal de ZAR'KHAEL.
7. **ZAR'KHAEL.** O Bispo revela que o protagonista não é inteiramente um anjo. O jogador declara sua identidade, mas ainda não conhece a vida humana anterior.
8. **Duelo com o Anjo.** A luta precisa de causa explícita: selo, teste ou conflito de deveres. O Anjo usa apenas 5% do poder no mundo material. O protagonista vence sem que a cena trate o guia como traidor gratuito.
9. **Captura.** A Ganância leva o Anjo. O Ato IV começa sem o principal aliado.

**Rota Sakura/Neve/Castelo:** o fluxo/ambiente foi integrado à main pela #673/#682 (Mod 361). Isso confirma a existência técnica, não a função dramática. Não substituir a armadilha, a caverna de gelo ou ZAR'KHAEL nem decidir se a jornada é obrigatória/opcional sem revisão A5.

### Ato IV — Torre: o preço da justiça

**[PDF]** Torre de sete andares, pergaminho de +20%, sala de descanso, mini-chefes, humanos transformados, passado de VÉRAXION, queda da torre e revelação da quinta Bispa.

1. **Estrada da serra.** A pessoa misteriosa reaparece. O jogador reconhece gestos e conhecimento, não apenas roupa.
2. **Sete pisos.** Cada piso é uma camada de justificativa de VÉRAXION: medo, ordem, sacrifício, lei, descanso, julgamento e autoridade. O quinto piso é descanso seguro.
3. **Pergaminho.** O bônus de 20% é recompensa por exploração, não substituto de habilidade.
4. **VÉRAXION.** Seu passado na Terra — meteorito, perda da mãe e justiça comprada — explica sua revolta, mas não justifica o que fez.
5. **Torre desaba.** O jogador precisa escapar; a vitória não termina em uma fala parada.
6. **Revelação parcial.** A pessoa misteriosa confirma que foi Bispa e foi exilada. Seu nome completo e a extensão de sua agenda podem ficar para o Ato VI.

### Ato V — Coliseu: a vitória que foi preparada

**[PDF]** O protagonista acompanha a pessoa misteriosa ao coliseu. O torneio tem oito rounds; o oitavo reúne quatro elites. Sandra luta ao lado do jogador, a Espada Celestial é obtida e o coliseu desaba.

1. **Viagem e chegada.** O rival explica que a relíquia é sorteada a cada cinco anos e que a Ganância usa o torneio para atrair o protagonista.
2. **Rounds 1–7.** Cada luta revela uma especialidade de servo e ensina o jogador a ler padrões.
3. **Round 8.** Quatro elites ao mesmo tempo. Sandra usa estratégia e não rouba o combate.
4. **Espada Celestial.** A arma é perigosa para demônios e útil contra a Ganância; sua origem deve ser explicada por pista, não por exposição longa.
5. **Colapso.** O coliseu cai. A pessoa misteriosa conduz o jogador ao deserto.

### Ato VI — Deserto: quebrar a corrente

**[PDF]** Estátua, quatro fragmentos espaciais, portal, revanche dos quatro Bispos em suas dimensões, Ganância em três fases, chegada do Anjo e de Sandra, derrota da Ganância, Inveja rouba sua alma e a Galáxia 2 é liberada.

1. **Estátua.** Quatro encaixes correspondem aos fragmentos deixados pelos Bispos. A estátua reage, mas o portal fecha.
2. **Portal misterioso.** O jogador descobre que precisa derrotar novamente os quatro Bispos em suas dimensões. As marcas X indicam os locais.
3. **Revanche.** Cada Bispo usa a arena e o estilo que o definiram; as lutas não devem ser cópias sem variação.
4. **Ganância.** Três formas: máscara humana, forma de domínio e forma final de fome vazia. O Anjo e Sandra chegam, mas o jogador precisa concluir a luta.
5. **Queda do Pecado.** O mundo respira; a vitória tem custo e não apaga as pessoas perdidas.
6. **Inveja.** Uma figura aparece e rouba a alma da Ganância. O segundo mundo se revela como ameaça real, não apenas planeta desbloqueado.
7. **Sandra.** O nome e a identidade completa são revelados. A surpresa deve ser “ela era a quinta Bispa e por que nos ajudou?”, não “ela é mulher”.
8. **Portal dos anjos.** O guia, Sandra e o protagonista seguem para a Inveja. A Galáxia 2 desperta.

## 6. Galáxia 2 — Inveja: o rosto emprestado [PROPOSTA A5]

**Premissa:** ninguém deseja o que possui; todos querem ocupar o lugar de outra pessoa. A Inveja não rouba apenas objetos, rouba reconhecimento, nomes e memórias públicas. O jogador chega a um mundo onde pessoas o chamam por nomes que ele nunca usou.

1. **Chegada ao Jardim dos Olhos.** Raízes atravessam casas e espelhos observam a rua. Um morador agradece ao protagonista por ter salvado alguém que ele nunca conheceu.
2. **A primeira cópia.** Um inimigo repete a última sequência de golpes do jogador. A mecânica ensina que imitar não é compreender.
3. **Bairro sem nomes.** NPCs perderam seus nomes em registros e passaram a usar títulos de vizinhos. Uma missão opcional devolve nomes por testemunhos, não por coleta.
4. **Sandra confrontada.** Uma cópia de Sandra apresenta a versão que ela gostaria de ser. A verdadeira precisa admitir o que ainda deseja do poder da Ganância.
5. **O arquivo de reflexos.** O jogador encontra ecos da primeira galáxia, mas cada memória contém uma alteração. O Anjo ajuda a separar fato de cópia.
6. **A Inveja.** O chefe tenta convencer o protagonista de que foi escolhido por acaso e que outro anjo faria melhor. A luta muda padrões com base nas habilidades usadas.
7. **Escolha e consequência.** O jogador decide se revela a verdade sobre uma pessoa copiada ou preserva uma memória que a mantém viva. O resultado altera diálogo e confiança, não bloqueia a campanha.
8. **Desfecho.** A Inveja perde o domínio sobre os nomes. A corrente do mundo 3 aparece.

**Motivo de memória:** um espelho rachado que mostra o rosto correto apenas quando alguém diz o próprio nome.

## 7. Galáxia 3 — Preguiça: a cidade que não desperta [PROPOSTA A5]

**Premissa:** a Preguiça oferece descanso absoluto para pessoas cansadas de sofrer. O problema não é dormir; é nunca mais poder escolher acordar.

1. **Amanhecer imóvel.** O sol não se move. Pessoas repetem a mesma ação e relógios não avançam.
2. **A praça silenciosa.** O jogador encontra alguém que prefere a estase porque perdeu uma pessoa. A missão não o ridiculariza; mostra o custo de congelar todos.
3. **O sino parado.** Três mecanismos de tempo precisam ser reativados. Cada um devolve movimento a uma parte da cidade.
4. **A casa sem portas.** Um NPC está preso em uma lembrança confortável. O jogador precisa descobrir a saída sem destruir a lembrança.
5. **O Guardião das Horas.** O chefe interrompe movimentos e tenta convencer o protagonista a descansar enquanto o Anjo e Sandra discutem.
6. **Despertar.** O mundo volta a ter ciclos. Nem todos os moradores ficam felizes; liberdade inclui dor e responsabilidade.

**Motivo de memória:** um sino que toca uma vez em cada retorno, com significado diferente.

## 8. Galáxia 4 — Soberba: o trono acima do céu [PROPOSTA A5 + marco do PDF]

**Premissa:** o quarto mundo promete que o protagonista pode voltar a ser o ser mais poderoso, mas pergunta se ele merece esse poder.

1. **Cidade vertical.** As pessoas vivem em níveis; os de cima não veem os de baixo.
2. **O tribunal.** Cada morador recebe uma nota de valor. O protagonista é chamado de “anjo incompleto”.
3. **Asas e aura.** **[PDF]** Neste mundo o protagonista recupera asas e aura. A cena deve ser uma conquista emocional, não apenas desbloqueio de habilidade.
4. **A tentação.** O chefe oferece um trono e diz que a missão termina se o herói aceitar governar.
5. **O confronto.** O jogador precisa usar o poder restaurado para proteger quem não pode voar, não para provar superioridade.
6. **Desfecho.** O mundo aprende que dignidade não depende de altura ou força.

**Motivo de memória:** uma pena caída que passa de mão em mão em vez de ser guardada como troféu.

## 9. Galáxia 5 — Gula: o banquete que devora [PROPOSTA A5]

**Premissa:** a capital celebra sem parar enquanto os distritos externos ficam sem alimento. O Pecado transforma necessidade em consumo compulsivo.

1. **Portões do Banquete.** O jogador entra numa cidade iluminada, mas encontra filas vazias atrás dos muros.
2. **Cozinhas e canais.** A comida é desviada para a mesa do chefe. O jogador segue a cadeia de distribuição.
3. **A despensa viva.** A dimensão do Pecado consome matéria e memórias. O jogador precisa interromper o fluxo sem destruir o alimento.
4. **Escolha de distribuição.** Duas regiões precisam de ajuda; uma escolha altera quem aparece no final, mas ambas permitem avançar.
5. **A Boca.** O chefe cresce ao consumir cenário e ataques. O jogador vence interrompendo o ciclo, não oferecendo mais alimento.
6. **Desfecho.** A cidade aprende a produzir e partilhar sem transformar o alimento em status.

**Motivo de memória:** uma tigela vazia que volta cheia, mas só depois de ser compartilhada.

## 10. Galáxia 6 — Ira: a guerra que se alimenta [PROPOSTA A5]

**Premissa:** duas facções herdaram uma injustiça antiga. A Ira mantém o conflito porque cada morte é usada como prova de que a próxima vingança é necessária.

1. **Fronteira partida.** O jogador chega durante uma trégua frágil. Ambos os lados contam histórias verdadeiras, mas incompletas.
2. **O arquivo queimado.** O motivo original da guerra foi apagado por quem lucra com a luta.
3. **A escolha do prisioneiro.** O jogador decide se entrega um comandante ou o protege para revelar a origem do conflito. A reação dos NPCs muda.
4. **Campo de cinzas.** Inimigos ficam mais agressivos quando o jogador responde com ataques repetidos; o combate recompensa leitura e controle.
5. **O Juiz da Chama.** O chefe usa os mortos como argumento. O protagonista não precisa negar a dor das vítimas para interromper a vingança.
6. **Desfecho.** A paz não é instantânea. O mundo inicia um processo difícil, com pessoas ainda discordando.

**Motivo de memória:** uma espada enferrujada enterrada em vez de erguida.

## 11. Galáxia 7 — Luxúria: o desejo que aprisiona [PROPOSTA A5]

**Premissa:** Luxúria é tratada como obsessão e idealização, não como conteúdo sexual explícito. O Pecado oferece a versão perfeita de algo que o jogador perdeu e transforma desejo em posse.

1. **Jardim das Vozes.** Cada personagem escuta alguém que deseja rever. O jogador ouve uma voz ligada à sua vida humana, mas não recebe uma resposta completa.
2. **A cidade ideal.** NPCs vivem em cenas perfeitas que se repetem. Pequenos detalhes revelam que a memória foi editada.
3. **O encontro falso.** O protagonista vê uma pessoa de seu passado. O Anjo reconhece a armadilha, mas não pode escolher por ele.
4. **A fita do desejo.** O jogador pode preservar uma lembrança verdadeira e aceitar a perda, ou tentar manter a ilusão. A escolha altera o epílogo pessoal, não o desbloqueio.
5. **A Voz do Desejo.** O chefe oferece exatamente o que o protagonista quer ouvir. O jogador vence ao recusar a promessa impossível.
6. **Desfecho.** O mundo não deixa de desejar; aprende a desejar sem possuir.

**Motivo de memória:** uma voz que muda de frase, mas mantém a mesma melodia.

## 12. Final da campanha [PROPOSTA A5 — decisão de alto impacto]

O PDF original termina a Galáxia 1 e abre a Inveja; não define o encerramento das sete galáxias. Esta seção é inteiramente proposta.

Após libertar a sétima galáxia, o jogador retorna ao Reino Celestial. As sete correntes não são destruídas por uma explosão: cada uma se desfaz quando as pessoas recuperam a capacidade de decidir. O Anjo-Guia conta o que omitiu sobre a origem do protagonista. Sandra precisa decidir se permanece como companheira ou volta para responder por suas escolhas.

Deus não oferece um prêmio automático. O jogador escolhe o que fazer com a identidade que recuperou: permanecer no serviço celestial, viver entre os mundos ou buscar a vida humana que não lembra por completo. O resultado pode ter três epílogos curtos, com o mesmo fechamento principal, para evitar três campanhas divergentes.

**Pendente:** definir se existe um antagonista acima dos sete Pecados. Não inventar um “oitavo pecado” ou uma entidade final sem decisão do criador. A própria rede de correntes pode ser o sistema final, mas isso ainda é hipótese.

## 13. Diálogo de referência (rascunho, não final)

As falas abaixo definem intenção e voz. Não são texto aprovado nem devem ser copiadas para o runtime antes da revisão.

### Prólogo
- **Deus:** “As asas que você perde não são sua dignidade. São a certeza de que todos devem te obedecer.”
- **Protagonista:** “E se eu não for suficiente?”
- **Deus:** “Então aprende com quem ainda tem medo.”
- **Anjo-Guia:** “No mundo material, eu só posso usar uma parte do que sou. Você vai ter que escolher por si.”

### Ganância — VHAZRAEL e VORGAZHEK
- **VHAZRAEL:** “Uma vida não desaparece. Ela muda de dono.”
- **Protagonista:** “Então eu vou devolver cada nome ao seu dono.”
- **VORGAZHEK:** “Todo mundo assinou.”
- **Protagonista:** “Alguns não sabiam ler.”
- **VORGAZHEK:** “A dívida não exige compreensão. Só garantia.”

### Invernália — ZAR'KHAEL e o Anjo
- **ZAR'KHAEL:** “Você chama de anjo o que ainda lembra o corpo de um homem.”
- **Anjo-Guia:** “Eu te escondi a verdade porque achei que a missão te protegeria. Não protegi.”

### Torre — VÉRAXION
- **VÉRAXION:** “Eu pedi justiça. O mundo me vendeu silêncio.”
- **Protagonista:** “A dor explica sua escolha. Não a torna justa.”

### Sandra
- **Sandra:** “Não me chame de aliada. Eu ainda quero a queda dele. Não sei se quero que você sobreviva a ela.”

### Ganância
- **Ganância:** “Eu não roubei nada. Todos entregaram o que precisavam para continuar respirando.”
- **Protagonista:** “Uma escolha feita com uma faca no pescoço não é acordo.”

### Inveja
- **Inveja:** “Você não quer o que tem. Quer que todos vejam que poderia ter sido outro.”

### Preguiça
- **Preguiça:** “Se ninguém se move, ninguém sofre.”
- **Protagonista:** “E ninguém vive.”

### Soberba
- **Soberba:** “Você voltou a ter asas. Vai usá-las para subir ou para erguer alguém?”
- **Protagonista:** “Se eu precisar ficar acima deles para me sentir inteiro, ainda estou quebrado.”

### Gula
- **Gula:** “A fome nunca acaba. Só muda de boca.”
- **Protagonista:** “Então pare de alimentar o que devora os outros.”

### Ira
- **Ira:** “Perdão é o nome que os vencedores dão ao silêncio.”
- **Protagonista:** “Não. É a escolha de não entregar o futuro à mesma dor.”

### Luxúria
- **Luxúria:** “Eu posso devolver tudo exatamente como era.”
- **Protagonista:** “Se for perfeito, não é verdade.”

### Encerramento
- **Deus:** “O que você trouxe de volta?”
- **Protagonista:** “Não trouxe as pessoas que perdi. Trouxe a chance de que as próximas escolham.”

## 14. Regras de escrita e ritmo

1. Cada cena deve mudar pelo menos uma coisa: informação, relação, objetivo, perigo ou estado do mundo.
2. Cada mistério deve ter pelo menos duas pistas observáveis antes da resposta. Segredo sem pista vira confusão, não curiosidade.
3. Suspense exige ameaça compreensível, resultado incerto e algo emocionalmente em risco.
4. Exposição deve vir depois de ação ou descoberta. Evitar personagens explicando o mundo inteiro numa única conversa.
5. Cada NPC importante tem desejo, medo, contradição e limite. Não basta uma aparência ou uma frase de efeito.
6. Uma escolha deve mudar uma reação, relação, recurso ou estado do mundo. Se nada muda, não apresentar como escolha.
7. Preferir ramificações curtas que reconvergem, preservando consequência local e custo de produção.
8. Usar um motivo sensorial por ato e reinterpretá-lo. Não empilhar tragédias para fabricar emoção.
9. Alternar tensão, exploração, conversa curta e recuperação. Não manter o jogador em cutscene longa nem em combate sem pausa.
10. Em mobile, manter falas curtas, objetivo legível e retomada clara após interrupção.

## 15. Pesquisa — o que ela sustenta e o que não sustenta

- Loewenstein (1994), curiosidade: modelo teórico de lacuna de informação. Aplicação: perguntas específicas e pistas, não mistério arbitrário.
- Lehne & Koelsch (2015), suspense: modelo psicológico teórico. Aplicação: conflito, instabilidade, incerteza e consequência emocional.
- Green & Brock (2000), transporte narrativo: experimentos sobre imersão em narrativas, não estudo específico de RPG 3D. Aplicação: atenção, imagem mental e afeto precisam trabalhar juntos.
- Green & Jenkins (2014), narrativa interativa: enquadramento de histórias dirigidas pelo usuário. Aplicação: escolhas locais com consequência e reconvergência.
- Ryan, Rigby & Przybylski (2006): quatro estudos sobre motivação em jogos; autonomia, competência e vínculo se relacionam com diversão e continuidade.
- Kensinger (2009), memória emocional: revisão; emoção pode priorizar detalhes centrais, não garantir lembrança de todos os detalhes. Aplicação: poucos motivos recorrentes.
- Cohen (2001), identificação com personagens: discussão conceitual; não confundir identificação, simpatia e vínculo.
- Zaini et al. (2025): scoping review de 69 estudos sobre design de personagens em jogos; 48% dos estudos mapeados eram empíricos e 52% não empíricos. É um mapa do campo, não uma estimativa causal; útil para organizar motivação, relações e função lúdica.
- Arrambide et al. (2022), CHI '22: estudo misto com N=19 participantes que já tinham experiência com Detroit: Become Human; entrevistas semiestruturadas + Moral Foundations Questionnaire (MFQ30). Os autores relatam que intuições morais da vida real e o quanto os participantes se importavam com personagens influenciaram decisões. Amostra pequena, um jogo e seleção de participantes; evidência exploratória, não regra universal.
- Holl & Melzer (2022): análise quantitativa de conteúdo/estatísticas de Detroit: Become Human; 73,21% das decisões catalogadas foram moralmente relevantes. Isso descreve a arquitetura de escolhas do jogo, não mede diretamente empatia ou comportamento de todos os jogadores.
- Zaini et al. (2026): piloto com N=15; achado exploratório, não evidência definitiva.

**Referências:**\
https://doi.org/10.1037/0033-2909.116.1.75\
https://doi.org/10.3389/fpsyg.2015.00079\
https://doi.org/10.1037/0022-3514.79.5.701\
https://doi.org/10.1111/jcom.12093\
https://doi.org/10.1007/s11031-006-9051-8\
https://doi.org/10.1177/1754073908100432\
https://doi.org/10.1207/S15327825MCS0403_01\
https://doi.org/10.1177/15554120251380423\
https://doi.org/10.1027/1864-1105/a000323\
https://doi.org/10.1145/3772363.3799339
https://doi.org/10.1145/3491102.3502019

**Referências adicionais verificadas:**
- Arrambide, K., Yoon, J., MacArthur, C., Rogers, K., Luz, A., & Nacke, L. E. (2022). *“I Don’t Want To Shoot The Android”: Players Translate Real-Life Moral Intuitions to In-Game Decisions in Detroit: Become Human*. CHI '22. https://doi.org/10.1145/3491102.3502019.
- Holl, E. & Melzer, A. (2022). *Moral Minds in Gaming: A Quantitative Case Study of Moral Decisions in Detroit: Become Human*. Journal of Media Psychology, 34(5), 287–298. https://doi.org/10.1027/1864-1105/a000323.

## 16. Decisões que precisam de aprovação

1. Confirmar a substituição de Avareza por Preguiça no mundo 3.
2. Confirmar Aethraziel/Vaelthar ou escolher um nome definitivo para o Anjo-Guia.
3. Confirmar se a comerciante misteriosa de Eldória é a mesma figura do duelo de Cinzária e Sandra.
4. Confirmar se a revelação de Sandra ocorre em duas etapas (ex-Bispa no Ato IV; nome e motivo completos no Ato VI).
5. Definir a causa do duelo entre protagonista e Anjo no Ato III.
6. Confirmar o quanto do passado humano do protagonista será revelado na Galáxia 1 e o que fica para o final.
7. Aprovar os temas e nomes de trabalho dos mundos 2–7.
8. Definir se o caminho Sakura/Neve/Castelo é rota opcional, transição ou parte obrigatória do Ato III.
9. Definir se há antagonista final acima dos sete Pecados.
10. Aprovar os NPCs e missões opcionais de Eldória; nenhum nome provisório vira canon por estar no código.

## 17. Regra de implementação

Sequência completa de amostra para revisão do tom e da agência: [A marca no recibo — proposta jogável](SEQUENCIA-AMOSTRA-ELDORIA-PROPOSTA.md). A amostra não é canônica nem está implementada.


Este documento é apenas candidato. Depois da revisão, cada ato deve virar uma entrega pequena: roteiro aprovado, matriz de estado, implementação, testes de transição/save, gameplay WebGL, inspeção de fotos/vídeo e validação mobile quando disponível. Não mudar o save V6, IDs de cena, nomes de NPC ou menu de galáxias antes da decisão do criador.


## 18. Auditoria pós-integração Mod 361 — 25/11/2026

**Base técnica revalidada:** main `1b280bc0d9a912380fd6c2f9bda165b19b3f5009`. A PR #670 foi incorporada ao conjunto da PR #682; o estado atual do repositório já inclui a proteção de progresso, os três abrigos e o recibo de recompensa. O QA exato da implementação A5 foi `#45522931667`: 104/104 testes Node nativos, caminhada touch no Chromium com 1/3 → 2/3 → 3/3, persistência após reload e regressão de falha de quota. O vídeo/PNG dessa execução não mede FPS Android.

**O que continua sem aprovação narrativa:**
- A jornada Sakura/Neve/Castelo existe no runtime integrado, mas não determina sozinha a cronologia dramática do Ato III.
- As missões opcionais de Eldória ainda têm dois givers sem NPC ativo correspondente. O estado técnico e a proposta de elenco estão detalhados em `ELDORIA-GIVERS-MISSOES-PROPOSTA.md`.
- O Ato I usa Téo · Provisões na cena principal. O objetivo do HUD foi corrigido na revisão 0.2 para nomear esse vendedor, sem alterar a história da cena.
- A PR histórica #473 está fechada sem merge; sua escolta de Ilyan não é comportamento da main e não deve ser tratada como cânone ou gameplay ativo.
- O plano da caverna em #515 continua documentação protegida; esta proposta não altera nem reinterpreta sua implementação.

**Regra:** esta atualização descreve o estado integrado e melhora a precisão da auditoria. Não transforma nenhuma proposta dos mundos 2–7, nome de personagem, arco de Sandra ou destino das missões opcionais em cânone aprovado.


## 19. Revalidação técnica Mod 372 — 26/11/2026

**Baseline atual:** main `ba2cb22e4135703dc2fb8a19927da8ccd3b06f32` (Mod 372). A PR #691 continua aberta e pronta para revisão; o SHA de código validado é `5e3a9db28ca216ac12cc85eada2fdfe08af0349d`, com 69 commits à frente, zero atrás e 14 paths. O blob de `build-info.js` é idêntico ao da main (`f8e6c8b9b9fba777cb8ed2e8c65c63a3e51613d7`); A5 não alterou o marcador Mod 372.

**QA de gameplay do SHA de código:** [run #45752769283](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45752769283) SUCCESS, 117/117 testes, zero falhas. [Artifact #15086989492](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45752769283/artifacts/15086989492): 16 PNGs, relatório JSON e WebM de 27m45s. O relatório confirma a cena completa de Téo, pagamento de 5 moedas (8→3), transição para a floresta e restauração de `questStep=2`, `act1Sub=0`, objetivo e noite após reload V6. Depois dessa verificação sem reseed, o harness rearma explicitamente o fixture para validar os abrigos: 3/3 registrados após reload, quatro caminhadas touch grounded e sem teleporte, zero erros JS/console/HTTP.

**Limites:** Chromium/SwiftShader e touch simulado; não é certificação Android físico nem benchmark de FPS. O QA não executa oferta/entrega das sidequests nem aprova Mara/Nara. A issue #671 continua aberta sem aprovação do cânone candidato. O pedido A5-001 sobre a câmera do abrigo da Mata foi encaminhado à [issue #713](https://github.com/PHBritoDev/Jogo-2-2.5D/issues/713), ainda PROPOSTO para A1; A5 não alterou o controlador de câmera dessa área.

Esta revalidação atualiza o estado técnico, sem promover qualquer proposta narrativa a cânone.