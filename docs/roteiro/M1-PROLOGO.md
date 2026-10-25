# Marco 1 — Prólogo, nome, planetas e despertar

Fonte: roteiro original do autor, anexo do [documento mestre](../GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf), página 7, primeiro parágrafo.
O texto original continua sendo a referência. As falas revisadas estão em [`prologue-flow.js`](../../prologue-flow.js), e o jogo troca `{nome}` pelo nome digitado (nunca usa um nome fixo).

## Trecho original (transcrição fiel, sem correções)

> Vamos la entrou no jogo primeira coisa q vai aparecer video de la com protagonista andando ate trono de Deus enquanto aparece toda a vista majestosa do ceu e os anjos do senhor, la no trono esta simplesmente DEUS, me ajoelho e Deus fala comigo fala q vai me manda uma jornada pra salva os 7 mundo da destruições, onde cada um deles reside um pecado capital, ai Ele tira minha asas e aura e etc, daí la pra fronteeeee no mundo 4 vai ter eventos onde eu consigo recuperar isso pra fica mas forte., depois disso video acaba , aparece tela do jogo onde aparecer todos 7 planetas etc, clico no primeiro, cheguei Ao mundo. A tela se move sozinha tipo daquela forma como se nos estivesse acabado de acorda em um lugar novo e agente olha pras mãos e depois pra ambiente em volta tendeu? Essa e a sensação que quero passar quando jogador entrar no jogo., depois anjo guiar fala algo do tipo Como devo te chamar ? Ai eu digito meu nome, ai aparece a msg Pode me chama de "nome q vc escolheu" vou usa "Paulo" como exemplo, Eu sou o Anjo Guiador Serei eu que irei te guiar nessa jornada, Bem vindo Paulo ao Mundo da ganancia, Prota fala:, Entao por onde debo comecar ?, Procure uma vila pequena , fale com algum vendedor e descubra onde Pecado da ganancia está, (…) ai quando jogador aceita a missão aparece na tela algo do tipo "Ato 1", Atualmente ja tem isso , (…) "som como se um novo capítulo , uma nova jornada estivesse começando, depois fica tudo escuro por alguns segundos , ai pronto comecar a nova aventura,

## Cenas (ORIGINAL → REVISADO)

| ID | Original | Revisado no jogo |
|---|---|---|
| C01 | "vista majestosa do ceu e os anjos do senhor" | Plano aberto do Reino Celestial: mar de nuvens, colunas de mármore e ouro, feixes de luz e anjos pairando dos dois lados do caminho. Título "PRÓLOGO · O Reino Celestial". |
| C02 | "protagonista andando ate trono de Deus" | O herói, ainda com asas e aura, caminha pelo caminho de luz até o trono. A câmera começa à frente dele e termina atrás, mostrando o trono. |
| C03 | "la no trono esta simplesmente DEUS, me ajoelho" | O trono (modelo novo) tem uma figura de luz sentada, sem rosto. O herói se ajoelha (animação nova feita no Blender). |
| C04 | "Deus fala … uma jornada pra salva os 7 mundo da destruições, onde cada um deles reside um pecado capital" | **Deus:** "Levanta os teus olhos, meu filho. Sete mundos caminham para a destruição — e em cada um deles reina um Pecado Capital." / **Deus:** "Eu te envio a eles. Não como conquistador, mas como luz: salva os sete mundos antes que o pecado os consuma por inteiro." |
| C05 | "ai Ele tira minha asas e aura e etc" | **Deus:** "Lá embaixo, as asas chamariam atenção demais, e a glória cegaria quem a carrega. Deixarás aqui as tuas asas e a tua aura." As asas e a aura se desfazem em luz, com som próprio. |
| C06 | "no mundo 4 vai ter eventos onde eu consigo recuperar isso pra fica mas forte" | **Deus:** "No quarto mundo, poderás reavê-las — se ainda te lembrares de por que as recebeste." |
| C06b | *(não existe no original)* | **Herói:** "Eis-me aqui. Envia-me." — **sugestão nova**, para o herói responder antes da luz. Pode ser removida sem afetar nada. |
| C07 | "depois disso video acaba, aparece tela do jogo onde aparecer todos 7 planetas, clico no primeiro" | Clarão branco → tela das sete galáxias (a que já existia). O despertar começa ao entrar na Galáxia 1. |
| C08 | "como se nos estivesse acabado de acorda em um lugar novo" | Primeira pessoa: pálpebras abrindo e piscando, a imagem desembaçando. |
| C09 | "agente olha pras mãos" | Câmera nos olhos do herói, olhando as próprias mãos (animação nova "OlharMaos"). |
| C10 | "e depois pra ambiente em volta" | A câmera olha em volta da clareira. O Anjo-Guia surge em luz à frente do herói. |
| C11 | "anjo guiar fala algo do tipo Como devo te chamar ? Ai eu digito meu nome" | **Anjo-Guia:** "Finalmente acordaste. Antes de qualquer passo neste mundo… como devo te chamar?" → painel para digitar o nome. |
| C11b | "Pode me chama de 'nome'", "Eu sou o Anjo Guiador Serei eu que irei te guiar nessa jornada, Bem vindo Paulo ao Mundo da ganancia" | **{nome}:** "Pode me chamar de {nome}." / **Anjo-Guia:** "Eu sou o Anjo Guiador. Serei eu quem irá te guiar nesta jornada. Bem-vindo, {nome}, ao Mundo da Ganância." *(O texto mantém "Anjo Guiador", como no original. O nome no balão continua "Anjo-Guia", para combinar com o resto do jogo.)* |
| C11c | "Prota fala: Entao por onde debo comecar ?" | **{nome}:** "Então… por onde devo começar?" |
| C11d | "Procure uma vila pequena, fale com algum vendedor e descubra onde Pecado da ganancia está" | **Anjo-Guia:** "Procure uma pequena vila. Fale com algum vendedor e descubra onde o Pecado da Ganância está." |
| C12 | "quando jogador aceita a missão aparece na tela algo do tipo 'Ato 1' … som como se um novo capítulo … depois fica tudo escuro por alguns segundos" | Cartão "MISSÃO PRINCIPAL · O Pecado da Ganância" com o botão ACEITAR MISSÃO → cartão "GALÁXIA 1 · GANÂNCIA · ATO I · O preço de uma vida", com som de capítulo novo → tela escura por ~2 s → o jogo começa. |

## Decisões e observações

- **Nome:** nenhuma fala usa "Paulo". O nome vem do painel (as mesmas regras de `sanitizePlayerName`). No céu o herói ainda não tem nome, então a fala C06b aparece como "Viajante".
- **Ato I:** o cartão não cita Valério. O nome dele só aparece quando a história chega até ele.
- **Bolsa de moedas:** o fluxo antigo dava 8 moedas ao falar com o Anjo. Elas continuam sendo dadas, agora ao aceitar a missão, porque o Ato I atual depende delas para subornar o informante. O Marco 2 vai rever isso junto com a vila nova.
- **Pular:** o botão PULAR pede um segundo toque para confirmar. Se o jogador pula o céu, vai direto para as galáxias. Se pula o despertar, ainda precisa digitar o nome (quando não tem), e a missão é aceita.
- **Quem já jogou:** quem já passou do começo (missão maior que 0 ou despertar visto) não vê o céu de novo. Reiniciar o progresso da Galáxia 1 também reinicia o prólogo.
- **Fora deste marco:** a vila ampliada e o resto do Ato I ficam para o Marco 2.
- **Clipes Ajoelhar e OlharMaos:** foram feitos no Blender, no rig do Protagonista (scripts em `tools/blender/`). O GLB só traz o esqueleto e os dois clipes, que o jogo aplica ao modelo original pelos nomes dos ossos.
