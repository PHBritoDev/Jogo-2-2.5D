# TAREFA TEMPORÁRIA PARA CLAUDE — REFINO DA SKILL 2 DO BISPO 3

## OBJETIVO DESTA RODADA
Refinar a **Skill 2 do Bispo 3 (ZAR’KHAEL)** já implementada no projeto `PHBritoDev/Jogo-2-2.5D`, corrigindo principalmente:
1. **A LUA** — hoje está errada, genérica e fora da referência.
2. **A QUANTIDADE E O TAMANHO DAS CHAMAS NEGRAS**.

Esta rodada **NÃO é para inventar uma skill nova**. É para **corrigir e refinar a skill já existente** no motor atual do projeto.

---

## REGRA CENTRAL
O criador deixou claro que a lua atual ficou errada. Ela **NÃO** deve parecer cartoon, engraçada, simplificada, redonda bonitinha, nem “interpretada livremente”.

### A LUA DEVE FICAR **EXATAMENTE COMO A IMAGEM DE REFERÊNCIA**
**EXATAMENTE ASSIM.**

Não é “inspirada”. Não é “parecida”. Não é “na vibe”.
É para buscar a aparência o mais fiel possível dentro do estilo/recursos do jogo.

Se ao terminar você comparar com a imagem e perceber que **não está igual o suficiente**, então **refaça** até ficar muito próxima.

---


**ATENÇÃO À REFERÊNCIA VISUAL:** a imagem da Lua está anexada na conversa original do usuário, não dentro deste Markdown. Para comparar visualmente de verdade, utilize a imagem que o usuário anexar ao Claude. Se estiver sem acesso à imagem, não finja que a comparou. O pedido de fidelidade continua obrigatório. Na remoção de olhos/lua duplicados, altere apenas os elementos criados pela Skill 2; não destrua a decoração preexistente da dimensão. 

## REFERÊNCIA PRINCIPAL DESTA RODADA
A referência é a imagem da lua monstruosa enviada pelo criador.

### LEITURA VISUAL OBRIGATÓRIA DA LUA
A lua correta tem:
- formato lunar/oval irregular e deformado;
- superfície **pálida, suja, envelhecida, manchada**, com aspecto de osso/lua morta;
- visual de horror surreal;
- um lado com **vazio negro gigantesco** ocupando grande parte da face;
- olhos esbugalhados, grandes e perturbadores;
- boca com dentes pequenos/agressivos e expressão assustadora;
- assimetria muito forte;
- aparência desconfortável, perturbadora e doentia;
- fundo escuro, sem poluição visual extra.

### PROIBIDO NA LUA
- não usar várias luas/olhos extras repetidos no céu;
- não usar lua cartoon;
- não usar lua lisa e genérica;
- não usar expressão engraçada/fofa;
- não transformar em uma massa dura tosca;
- não deixar “interpretado de qualquer jeito”.

### CORREÇÃO IMPORTANTE
O criador **não quer mais** que a lua siga o jogador com os olhos.
**Remover essa exigência.**
A lua pode ficar estática/ameaçadora.

### POSICIONAMENTO
- deve continuar **bem alta**, visível e dominante no céu;
- grande o suficiente para o jogador notar com clareza;
- sem atrapalhar completamente a leitura do combate.

---

## REGRAS DE VALIDAÇÃO OBRIGATÓRIA DA LUA
Quando terminar a lua, faça a seguinte validação:
1. Compare diretamente o resultado com a imagem de referência.
2. Pergunte tecnicamente: “isso está realmente muito próximo da imagem?”
3. Se a resposta for “não” ou “mais ou menos”, **refaça**.
4. Só considerar concluído quando a lua estiver visualmente muito próxima da referência.

**A lua é a prioridade visual número 1 desta rodada.**

---

## CHAMAS NEGRAS — MUDANÇAS EXIGIDAS
### 1) QUANTIDADE
Hoje o Bispo 3 lança uma quantidade menor de chamas negras.

**Alterar para 10 lançamentos de chamas negras menores** antes do golpe final.

Ou seja:
- antes: quantidade menor;
- agora: **10 chamas negras**.

### 2) TAMANHO DAS CHAMAS MENORES
O criador quer que **todas as chamas negras menores tenham o mesmo tamanho da atual chama final**.

Isso significa:
- pegar como referência o tamanho da “maior chama negra” atual;
- fazer com que **cada uma das 10 chamas** tenha esse tamanho.

### 3) TAMANHO DA CHAMA FINAL
A “maior chama negra” final ainda existe.

Agora ela deve ficar:
- **3 vezes maior que o tamanho atual dela**.

Resumindo:
- 10 chamas menores = cada uma com o tamanho da atual chama final.
- 1 chama final = **3x maior** do que o tamanho final atual.

---

## QUALIDADE VISUAL DO FOGO NEGRO
Mesmo aumentando a escala, o fogo deve continuar:
- orgânico;
- sombrio;
- fluido;
- com movimento vivo;
- sem parecer pedra preta;
- sem virar massa dura/genérica;
- sem perder legibilidade.

Se o aumento de escala destruir a qualidade visual, refine o shader/VFX/modelagem do fogo até manter boa aparência.

---

## JOGABILIDADE E CUIDADOS
Ao aumentar para 10 chamas e escalar o tamanho do fogo, tomar cuidado com:
- FPS no celular;
- colisão injusta;
- dano bugado por tocar várias áreas ao mesmo tempo;
- fogo atravessando chão;
- poluição visual excessiva;
- câmera inutilizável;
- efeitos acumulando de forma incorreta.

Manter a regra anterior de queimadura **não acumulativa**.

Se necessário:
- ajustar intervalos entre os 10 disparos para continuar jogável;
- ajustar pooling/cleanup dos efeitos;
- manter desempenho aceitável no Android.

---

## O QUE PRESERVAR
Preservar o restante da skill 2, incluindo:
- lua aparecendo antes da sequência;
- 10 chamas negras em sequência;
- chama final colossal no fim;
- áreas de fogo no chão;
- queimaduras;
- integração com a IA do Bispo 3;
- dimensão de teste do Bispo 3;
- Skill 1 da Hidra;
- remoção dos poderes genéricos anteriores.

---

## PESQUISA OBRIGATÓRIA
Se você não souber como aproximar a lua da imagem, pesquise profundamente antes de corrigir.

Pesquisar referências/técnicas para:
- horror surreal lunar;
- lua/face assimétrica perturbadora;
- superfície lunar podre/osso/manchada;
- composição facial grotesca e desconfortável;
- VFX de fogo negro ampliado sem perder qualidade.

**Não fazer de qualquer jeito.**

---

## CRITÉRIO FINAL DE ACEITAÇÃO
Só considerar concluído se:
1. a lua estiver muito próxima da referência;
2. a exigência de “olhar o jogador” tiver sido removida;
3. não existirem mais luas/olhos repetidos no céu;
4. houver **10** chamas negras antes do golpe final;
5. cada uma das 10 chamas tenha o tamanho da antiga chama final;
6. a chama final esteja **3x maior** que antes;
7. o fogo continue visualmente bom, e não uma massa dura/genérica;
8. a performance e a jogabilidade não quebrem;
9. o restante do Bispo 3 continue funcionando.

---

## FLUXO DE TRABALHO
1. Ler este arquivo inteiro.
2. Inspecionar a implementação atual da Skill 2.
3. Corrigir a lua primeiro.
4. Comparar a lua com a imagem.
5. Se não estiver fiel, refazer.
6. Ajustar quantidade/tamanho das chamas.
7. Testar tudo.
8. Fazer commit/merge se estiver seguro.
9. Excluir este arquivo temporário ao final.

---

## REGRA DE SILÊNCIO TOTAL
Não enviar:
- mensagem de progresso;
- relatório;
- explicação;
- resumo final.

Se a plataforma obrigar resposta final, responder apenas:
**“Concluído.”**