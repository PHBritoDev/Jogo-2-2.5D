# Sequência de amostra — A marca no recibo

> **STATUS: AMOSTRA DE TOM E GAMEPLAY — NÃO CANÔNICA / NÃO IMPLEMENTADA.** Demonstra uma cena completa para revisão do criador. Não altera o PDF, o roteiro aprovado, flags, saves ou falas de runtime.

**Âncora técnica auditada:** main `1e17b61253db7bcc443820382f41597d53248f9a`; `act1-flow.js` define a chegada à vila em `questStep=1`, o diálogo do vendedor e a transição para a floresta em `questStep=2`. O roteiro M2 mantém a compra de 5 moedas como condição para o vendedor revelar o que sabe. A sequência abaixo preserva esse acontecimento e acrescenta uma investigação opcional, ainda sujeita à aprovação.

## Intenção

O jogador deve sair da conversa com três coisas claras:
1. a floresta esconde algo que envolve crianças;
2. VHAZRAEL é um subordinado da Ganância, não o próprio Pecado;
3. a mesma marca aparece em registros e objetos de captura — sinal de um sistema organizado, não de um incidente isolado.

**Pergunta curta:** por que um nome foi substituído por um número?  
**Pergunta longa:** quem transforma pessoas em registros de propriedade, e para que finalidade?

## Percurso jogável

### 1. Chegada — observar antes de explicar

A câmera apresenta a Vila da Clareira. O jogador retoma o controle perto do balcão. Há uma tigela de moedas, um livro fechado e um pequeno recibo preso sob uma pedra para não voar. O vendedor confere a rua antes de virar o recibo para baixo.

Não inserir corpos ou ruínas novas para comunicar pobreza. A escassez já é expressa por comida curta, mercadoria simples, roupa usada, filas e gestos de quem calcula cada moeda.

### 2. Conversa e transação obrigatória do roteiro original

**Protagonista:** “Ouvi crianças na mata durante a noite.”

**Vendedor:** “Não repita isso alto.”

**Protagonista:** “O que aconteceu com elas?”

**Vendedor:** “Algumas famílias dizem que entregaram os filhos. Outras, que foram levados. A diferença já não ajuda quem ficou.”

**Protagonista:** “Quem está por trás?”

**Vendedor:** “Um dos subordinados da Ganância. Chamam-no VHAZRAEL. Não sei onde se esconde. Só sei que a mata muda quando escurece.”

O vendedor não entrega informação de graça: a compra de 5 moedas, já prevista no roteiro original, acontece. A cena não transforma o comerciante em vilão nem o absolve; ele está com medo e ainda assim participa de um sistema que prefere não examinar.

### 3. Investigação opcional — o jogador decide olhar

Após a conversa, o jogador pode:

- **Examinar o recibo** — aproxima-se do balcão e lê uma linha em que o nome foi coberto por um número. A marca ao lado é um selo de quatro traços, não um símbolo mágico explicado.
- **Seguir imediatamente** — mantém o objetivo principal e não perde recompensa, acesso ou tempo de campanha.

Se examinar:

**Protagonista:** “Por que há um número no lugar de um nome?”

**Vendedor:** “Porque nomes fazem falta. Números podem ser cobrados.”

O vendedor fecha o livro. Não explica quem escreveu o registro.

Se seguir imediatamente, não há fala extra. O recibo continua no balcão; a escolha não bloqueia a pista futura.

### 4. Floresta — a pista ganha forma

O objetivo principal permanece: seguir a trilha e investigar o choro. Ao chegar à gaiola, o fecho exibe a mesma marca do recibo.

Se o jogador examinou o recibo:

**Protagonista:** “A mesma marca. Então não era um registro de mercadoria.”

**Anjo-Guia:** “Não. Era um registro de pessoas.”

Se não examinou:

**Protagonista:** “Há uma marca no fecho.”

**Anjo-Guia:** “Guarde-a. Pode aparecer de novo.”

O choro das crianças e a transformação prevista no roteiro atual continuam. A sequência não promete que uma escolha poderia impedir um acontecimento que o jogador não tinha informação ou ferramenta para evitar. O peso emocional vem da tentativa de ajudar e da consequência, não de culpar o jogador por uma escolha falsa.

### 5. Consequência posterior

Na dimensão de VHAZRAEL, a marca reaparece em um livro de cobrança. Se o recibo foi examinado, o protagonista reconhece o padrão sem nova explicação. Caso contrário, o jogador recebe uma observação curta que conecta os dois objetos. A revelação principal não depende da escolha; a escolha altera a rapidez com que o jogador a interpreta.

## Estado e persistência candidatos

Nenhuma flag abaixo existe no runtime atual. São nomes propostos apenas para discussão:

| Flag candidata | Quando muda | Efeito |
|---|---|---|
| `g1.a1.receiptSeen` | ao examinar o recibo | habilita a fala de reconhecimento na gaiola |
| `g1.a1.stampKnown` | após a primeira observação da marca, no recibo ou na gaiola | habilita a fala curta de reconhecimento no livro de VHAZRAEL |

A transição principal continua reconvergente: ambas as rotas chegam ao mesmo objetivo de investigar a floresta e ao mesmo `questStep`. Não criar moeda/recompensa extra. Ao aprovar, mapear as flags para o esquema de save escolhido; não gravar nomes pontuados no V6 sem migração e testes.

### Recuperação

- Salvar antes da inspeção: o recibo permanece examinável.
- Salvar depois: a flag persiste e a interação não se repete.
- Recarregar depois da compra: as 5 moedas não são cobradas de novo.
- Morrer na floresta: o checkpoint de combate pode reiniciar, mas a pista já descoberta permanece.
- Se o recibo não foi visto, a marca na gaiola ainda apresenta a pista; não há softlock.

## Aceitação em playtest

Sem explicar a intenção antes da sessão, perguntar:
1. Qual é o objetivo depois de falar com o vendedor?
2. O que você acha que o número no recibo significa?
3. Que evidência liga o recibo à gaiola?
4. O que o vendedor queria evitar e o que ele temia?
5. A opção de examinar pareceu útil sem parecer obrigatória?
6. Depois do livro de VHAZRAEL, o que mudou na sua interpretação?

Amostra formativa de 5–8 jogadores pode revelar confusão e ritmo; não prova efeito universal. Repetir com outra amostra após revisão. Registrar respostas espontâneas, não apenas uma nota.

## Produção mínima

- Reaproveitar o balcão, a loja, a trilha, a gaiola e o fluxo de cutscene existentes.
- No máximo um recibo/livro pequeno como prop, se o balcão atual não oferecer superfície legível.
- Não criar NPC nomeado, nova área, chefe ou nova mecânica de combate.
- A5 dirige texto, flags e gatilhos; A3 só é necessário se o prop/posicionamento exigir alteração espacial; A4 se a marca precisar de legibilidade luminosa específica.
- Implementar somente depois da revisão do cânone e da confirmação do call-site de diálogo/save.
