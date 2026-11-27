# Eldória — givers das missões opcionais (proposta A5)

> **STATUS: PROPOSTA NÃO CANÔNICA.** Auditoria do runtime Mod 361 e recomendação de elenco. Não altera NPCs, diálogos, flags ou saves. A decisão final de cânone continua com o criador.

**Base:** main `1b280bc0d9a912380fd6c2f9bda165b19b3f5009` · issue #671 · PR #682 integrada.

## 1. Fatos verificados

### Missões e givers definidos

| Missão | `giver` no módulo | Falante gravado | Estado |
|---|---|---|---|
| Flores de Vigília | `ERVAS` | Mara · Ervas | Não há NPC Mara na conversa ativa |
| O Pingente de Lia | `FRUTAS` | Lia · Frutas | Corresponde à vendedora Lia |
| Pedras que Lembram | `ARTESANATO` | Nara · Artesanato | Não há NPC Nara na conversa ativa |

`questForGiver(state, giver)` procura igualdade exata entre `q.giver` e o argumento. O controlador `trySideQuestTalk(vendor)` passa `vendor.shortName`.

### Vendedores e conversa ativa

| NPC | Nome exibido | `shortName` |
|---|---|---|
| Bento | Bento · Alimentos | `ALIMENTOS` |
| Téo | Téo · Provisões | `PROVISÕES` |
| Lia | Lia · Frutas | `FRUTAS` |

`VILLAGE_TALK` contém as chaves `bento`, `teo`, `lia`, `morador`, `moradora` e `carregador`. Não há chaves Mara/Nara. Logo, apenas a missão de Lia pode ser encontrada pelo fluxo atual; Flores e Pedras permanecem inacessíveis pela interação de banca. Isso não é uma hipótese de lore: decorre da comparação literal no código.

### Cena principal do Ato I

O runtime marca `villageVendors[1]` para a interação `PERGUNTAR · TÉO` e `act1Interact()` executa `vendorScene()`. O falante dessa cena é `Téo · Provisões`. O objetivo anterior do HUD dizia “Pergunte ao vendedor de frutas”. A correção nesta PR troca somente o texto do objetivo para “Pergunte a Téo sobre o Pecado da Ganância”; o rótulo do falante continua “Téo · Provisões”. A regressão verifica a frase exata e o rótulo. Nenhum evento, fala ou interação da cena muda.

### Pingente de Lia

A oferta diz “Meu filho” e “pingente da mãe dele”; a entrega diz “ela gravou”. O texto não esclarece se Lia é a mãe que gravou o nome ou se está guardando o pingente de outra mulher. O nome da missão sugere posse de Lia, mas isso não prova a relação. A questão deve ser resolvida antes de reescrever a fala final.

## 2. Recomendação de elenco

**Preservar os três vendedores atuais** como comerciantes com identidades de estoque independentes da missão:

- Bento continua responsável por Alimentos; sua voz atual é cansada e preocupada com a colheita.
- Téo continua responsável por Provisões; é desconfiado e conhece rumores da mata. É o vendedor da cena principal.
- Lia continua responsável por Frutas e mantém a missão do pingente, se a relação familiar for esclarecida.

**Reintroduzir Mara e Nara como givers não comerciais**, usando a vila já construída e, se possível, rigs/ativos de NPC já disponíveis:

- **Mara — Flores de Vigília:** cuidadora/herbalista que prepara infusões para moradores que perderam o sono após o desaparecimento das crianças. A tarefa conecta a floresta ao cuidado cotidiano sem transformar a coleta em pedido genérico.
- **Nara — Pedras que Lembram:** descendente do artesão que talhou as pedras de abrigo. Ela acompanha os marcos porque eles eram uma promessa de orientação e acolhimento. O jogador não coleta objetos: registra os três abrigos e devolve a Nara uma evidência de que a mata ainda pode ser atravessada.
- **Lia — O Pingente:** mantém a banca de frutas e a ligação com a criança desaparecida. A cena precisa declarar claramente quem gravou o nome e por que o pingente estava no lago.

**Por que não mapear automaticamente Mara → Bento e Nara → Téo?** Os papéis de estoque não provam que as pessoas sejam as mesmas. Bento não está definido como herbalista; Téo não está ligado ao avô artesão. Fazer essa troca sem reescrever a história criaria uma falsa continuidade. Se o criador preferir não acrescentar dois NPCs, uma alternativa é reescrever as duas missões para os papéis de Bento/Téo, mas isso é uma decisão narrativa maior.

## 3. Interface técnica recomendada

O bug atual nasce de misturar categoria comercial e identidade narrativa. A solução durável é:

- manter `shortName` como categoria de estoque;
- acrescentar `questGiverId` ao NPC/interação;
- definir `giverId` na missão;
- fazer `trySideQuestTalk` receber o ID explícito;
- permitir que vendedores e moradores não comerciais chamem o mesmo fluxo.

Exemplo conceitual (não é patch de runtime):

```js
// vendedor
{ name: 'Lia · Frutas', shortName: 'FRUTAS', questGiverId: 'lia' }

// missão
{ id: 'pingente', giverId: 'lia', /* objetivo e falas */ }

// interação
trySideQuestTalk(vendor.questGiverId);
```

O estado salvo é indexado pelos IDs de missão (`ervas`, `pingente`, `abrigos`), não pela categoria de vendedor. Portanto, alterar apenas a interface de associação não deve exigir migração V6; isso precisa ser comprovado por teste de load/reload e compatibilidade com saves antigos.

## 4. Duas redações candidatas para Lia

**Se Lia for a mãe:**

> “Meu filho estava entre os que levaram para a mata. O pingente que eu lhe dei caiu perto do Lago Escuro.”
>
> “Não é ouro. Fui eu que gravei o nome dele atrás. É a única coisa que ainda posso devolver a ele.”

**Se Lia estiver guardando o objeto de outra mãe:**

> “Uma mãe me confiou o pingente do filho antes de desaparecer. Ele caiu perto do Lago Escuro.”
>
> “O nome dele está gravado atrás. Não posso devolver a criança, mas posso devolver isto.”

A segunda alternativa exige esclarecer por que Lia recebeu o objeto e talvez renomear a missão. Nenhuma das versões é canônica.

## 5. Implementação depois da decisão

1. Aprovar ou substituir a recomendação de elenco.
2. A5 ajusta falas, nomes e estados narrativos; mantém os IDs de missão.
3. Se Mara/Nara forem NPCs separados, A3 posiciona-os em pontos existentes da vila, sem mexer na caverna protegida; usar assets/rigs já disponíveis antes de criar modelos novos.
4. A5 implementa `questGiverId/giverId` no fluxo de interação.
5. Testes Node cobrem associação exata, giver errado, estados e saves antigos.
6. QA de Chromium/touch percorre os três givers, coleta, retorno, entrega e reload.
7. Recompensa de Pedras continua condicionada aos três IDs locais e ao save confirmado do mapa.

**Sem aprovação:** não criar NPCs, não remapear givers, não trocar falas, não mudar flags e não alterar save.


## 6. QA do objetivo principal — evidência e limite

- O run A5 [#45550234051](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45550234051) concluiu SUCCESS no SHA `e191c352ba489a7f48cda14a7663311a10e1f679`: Node **105/105**, sintaxe, Chromium/Three e percurso de waystones aprovados.
- O artifact [#14994976156](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45550234051/artifacts/14994976156) contém 11 PNGs e WebM de 32min30s. A `00-initial-active.png` mostra o objetivo “Pergunte a Téo sobre o Pecado da Ganância” e o botão `PERGUNTAR · TÉO` no jogo.
- O relatório declara `narrativeScope: giver offer/turn-in intentionally excluded`; o harness não executa a conversa principal de Téo nem oferta/entrega de missão lateral. Portanto, a evidência confirma o HUD e o contexto inicial, **não** a conversa completa do vendedor.
- Plataforma: Chromium/SwiftShader, 852×393, touch simulado. Não é certificação Android físico nem medição de FPS móvel. O WebM apresenta letterbox em trechos.
- A captura dirigida `vila-vendedores` continua necessária para validar aproximação, toque e fala principal; não foi disparada por esta sessão.


## 7. Revalidação do QA principal — Mod 372 (26/11/2026)

A seção 6 registra o limite do run histórico #45550234051; ela não descreve a evidência mais recente. No código de produção validado pela PR #691, SHA `5e3a9db28ca216ac12cc85eada2fdfe08af0349d`, o [run A5 #45752769283](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45752769283) terminou SUCCESS com 117/117 testes e zero falhas. O [artifact #15086989492](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45752769283/artifacts/15086989492) contém 16 PNGs, relatório e WebM de 27m45s; foram inspecionadas a conversa de Téo, a ação de pagamento, o handoff para a floresta, o reload, os abrigos e quadros do vídeo.

O novo QA valida a cena principal completa de Téo, a cobrança exata de 5 moedas (8→3), a transição para `questStep=2/act1Sub=0` e a restauração do objetivo e da noite após reload V6. Depois de verificar o save real sem reseed, o harness rearma o fixture para percorrer os três abrigos; por isso as capturas finais de waystones não representam perda do save pós-Téo.

**O que essa evidência não valida:** oferta/entrega das missões Flores de Vigília, Pingente de Lia ou Pedras que Lembram; associação de givers; nem o destino de Mara/Nara. Esses pontos continuam pendentes da revisão do criador na #671. O ambiente é Chromium/SwiftShader com touch simulado, não Android físico nem medição de FPS.