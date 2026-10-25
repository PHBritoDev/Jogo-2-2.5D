# Marco 2 — Ato I: a vila, a floresta à noite, os esgotos e Valério

**Fonte:** roteiro original do autor, anexo do [documento mestre](../GALAXIA-1-ROTEIRO-INTEGRAL-E-DIRECAO.pdf), páginas 7 a 9.
As falas revisadas estão em [`act1-flow.js`](../../act1-flow.js), e o nome digitado entra no lugar de `{nome}`.

O texto original continua sendo a referência; as transcrições abaixo são resumidas por cena. Nenhuma fala, personagem, acontecimento ou número de inimigos foi cortado.

## Cenas (ORIGINAL → REVISADO)

| ID | Original (resumo fiel) | Revisado no jogo |
|---|---|---|
| A1-01 | "quero aumentar o tamanho dessa vila deixa bem maior… e quero essa vila um pouco longe" | **Despertar:** o despertar foi para o sudeste da mata (≈85 m da vila, com trilha nova).<br>**Vila maior:** casas de enxaimel, sobrados, casas arruinadas, poço, bancas de toldo rasgado, cercas, barris e caixotes (modelos novos feitos no Blender). |
| A1-02 | "NPC… aparência de comerciante meio pobre lascado, com roupa suja… pessoas mortas de desnutrição, mendigos… as frutas… toda podre" | **Miséria:** mendigos sentados encostados nas casas, corpos cobertos por lençóis (sem detalhe gráfico), comida apodrecida e moscas.<br>**Comerciantes:** os vendedores existentes ganharam falas novas, de gente pobre e com medo. |
| A1-03 | "quando chega na cidade aparece… animação da cidade mostrando ela de longe e aparece nome da cidade… som de conquista" | Plano aberto da vila vista de longe, o nome "Vila da Clareira" e um som novo de descoberta, que pode ser reaproveitado em outras cidades. |
| A1-04 | O vendedor só fala se você comprar; o protagonista entrega um saco de ouro; o vendedor muda de atitude e conta tudo (o mundo em caos, o Pecado "se considera um Deus", o choro de crianças, os pais vendendo filhos, os demônios, Valério, "tome cuidado rapaz") | **Falas:** todas mantidas, revisadas em `vendorScene()`.<br>**Cena:** o herói pergunta, ouve "se não vai comprar nada, vaza" e entrega o saco de ouro (5 moedas), com câmera de conversa e o saco passando de mão. |
| A1-05 | "começa a outra missão ir até a floresta de noite investigar isso" | Escurece com fade e o título "A floresta à noite". A gaiola fica na mata, longe da vila. |
| A1-06 | Gaiola com crianças pedindo socorro; aparece 1 enemy1 ("Hoje é meu dia de sorte…"), troca de falas e luta; depois aparecem mais 2 ("quem é você?" / "Isso é impossível… nem contra Valério") e luta; o herói pega a chave | Mantido: 1 + 2 Seguidores e as mesmas falas. A chave cai do último ("Achei a chave para abrir essa gaiola"). |
| A1-07 | Abre a gaiola ("Vocês estão bem?"); as crianças se transformam em enemy1 ("estão usando as almas… como receptáculo"); luta contra os 2 | Mantido: clarão vermelho e as 2 crianças viram 2 Seguidores. |
| A1-08 | O herói desmaia ("meio tonto"); de manhã o Anjo chama o nome ("Paulo, Paulo, Pauloooo"), conversa, pista dos esgotos, "Se você não for eu mesmo te mato", "Já estou indo…" | **Desmaio:** ajoelha, a tela escurece e amanhece; ele está deitado e se levanta (clipe Kip Up).<br>**Chamado:** "{nome}… {nome}! {NOME}!", com o nome digitado e sem "Paulo".<br>**Falas:** todas mantidas. |
| A1-09 | A caminho: enemy1 matando pessoas; ele corre pedindo para parar, chega tarde; "Eles recusaram dar todo dinheiro… então eu os matei" / "A existência de vocês acaba aqui"; luta contra **3 enemy2** | **Falas e luta:** mantidas, com os **3 Demônios (Enemy2)**.<br>**Vítimas:** dois moradores encolhidos; após um clarão, ficam caídos, sem sangue ou ferimentos à mostra.<br>**Rótulo:** o original chama quem fala de "enemy1", mas a luta é contra enemy2; o orador aparece como "Demônio da Ganância". |
| A1-10 | Os enemy2 soltam uma pista que leva a uma caverna | **Sugestão nova:** a fala "Um deles deixou cair isto… um mapa sujo de sangue…".<br>**Entrada:** na encosta da montanha, um arco de pedra com grade arrombada. |
| A1-11 | Caverna/esgoto com água pingando, rastros de sangue; 5 enemy1 "comendo seres vivos" ("Larga eles…" / "chegou a nossa sobremesa"); luta | **Esgoto:** túnel abobadado com canal de água, gotas e rastros de sangue.<br>**A presa:** um monte escuro, sem detalhe gráfico.<br>**Luta:** **5 Seguidores**, com as falas mantidas. |
| A1-12 | Buraco mais fundo; o Anjo chega; "vou matar todos eles"; "não seja imprudente…"; ele pula; a tela pisca; acorda cercado por ~10 enemy1; desmaia; acorda preso numa gaiola; o Anjo o liberta ("Nunca mais seja imprudente…"); mais de 10 inimigos; dois caminhos; "vai pra aquele caminho…" / "tem certeza…?" / "estou entre os Arcanjos mais fortes de Deus? apenas vá" | Tudo mantido, na ordem:<br>• o pulo e a tela piscando;<br>• **10** Seguidores em volta;<br>• a jaula, com as grades subindo quando o Anjo chega;<br>• **12** inimigos chegando pelo outro caminho;<br>• o Anjo fica lutando. |
| A1-13 | Lugar estranho com portal ao longe; mini boss ("Você não dará mais nenhum passo"), batalha épica e difícil; ele implora, revela que Valério está dentro de uma dimensão isolada; "Agora pode sumir…" / "Nãooo"; "Demônios não merecem misericórdia…" / "Matar Valério vai ser o primeiro passo…" | **Lugar estranho:** caverna vermelha com pedras flutuando e olhos, e o portal de moedas de Valério ao fundo.<br>**Guardião do Portal:** mais forte (300 de vida, 1,35× maior, golpe largo).<br>**Falas:** todas mantidas. |
| A1-14 | Sugado pelo portal, apresentação, Valério: "Quem é você e como entrou aqui?" / "Você acha que pode matar uma divindade?" / "só vi uma no Céu"; ao perder: "Eu uma divindade… derrotado por um humano… Espera, você realmente é um humano?" | **Antes da luta:** o cartão VS já existia; depois dele vêm as falas, dentro da dimensão.<br>**Depois da luta:** as falas de derrota tocam antes de a dimensão fechar. |
| A1-15 | A dimensão fecha e ele volta ao início do mapa; o Anjo: "então você realmente voltou vivo né?" … "o portal se fechou e todo esgoto sumiu" … "agora é só o começo"; tela preta e "Ato 2" | **Volta:** ele volta ao ponto do despertar e a entrada do esgoto some.<br>**Fim do ato:** conversa com o Anjo, tela escura e o cartão do Ato II. |

## Decisões e limites (honesto)

- **Lutas em grupo:**
  - **Como funciona:** o combate do jogo é contra um inimigo por vez. Os grupos (2, 3, 5) aparecem todos na tela; um luta e os outros esperam a vez, avançando um por um.
  - **Números:** os do roteiro.
  - **Hordas (10 e 12):** são cena, porque o roteiro não pede que o herói lute contra elas.
- **Enemy2 sem esqueleto:**
  - **O que fiz:** o arquivo veio sem rig. Dei a ele o esqueleto e as animações do Enemy3 (mesmo gerador, pose A), com os pesos copiados por proximidade no Blender (`tools/blender/m2_rig_enemy2.py`).
  - **Qualidade:** boa em pé, andando e correndo. **SUSPEITA:** nos golpes amplos, partes da roupa esticam. Por isso o ataque usa o clipe Skill_03 em vez de Attack.
  - **Saída:** se quiser o resultado definitivo, um rig do Mixamo resolve.
- **Esgoto:**
  - **Onde fica:** área abaixo do mundo, como as dimensões (tema `sewer` e layout em `sewer3d.js`), com colisão própria pelas paredes.
  - **Morrer lá dentro:** volta ao ponto de controle do esgoto.
  - **Sem corações na dimensão de Valério:** volta para fora, na entrada.
- **Portal antigo da montanha:** fica escondido no Ato I, porque agora o portal está no esgoto. Ele continua sendo usado no arco final.
- **Ato II (atual):**
  - **Como começa:** logo depois da tela escura, como no roteiro.
  - **Cortado:** a conversa com o Anjo na vila que antes abria o Ato II. O Marco 3 vai refazer esse ato.
- **Bug antigo corrigido:**
  - **Sintoma:** nas dimensões dos Bispos 2 a 4 (x = 800 a 1600), o movimento era limitado a ±400 em x. O jogador e o inimigo só andavam no eixo z.
  - **Correção:** limite ampliado para ±1900.
- **Nomes provisórios** (aguardam sua aprovação): "Vila da Clareira" (o nome que já estava no mapa), "Téo · Provisões" (o vendedor), "Guardião do Portal" (o mini-chefe) e "Demônio da Ganância" (o Enemy2).
