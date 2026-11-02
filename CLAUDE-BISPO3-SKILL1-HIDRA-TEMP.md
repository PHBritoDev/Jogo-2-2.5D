# MOD TEMP — BISPO 3 (ZAR’KHAEL) — SKILL 1: HIDRA DO JUÍZO

**Objetivo:** implementar/refinar a **Skill 1 do Bispo 3 (ZAR’KHAEL — O Carrasco do Juízo Eterno)** no projeto `PHBritoDev/Jogo-2-2.5D`, com qualidade **superior ao Bispo 1 e Bispo 2**, pesquisa profunda, VFX cinematográfico, IA mais inteligente e sem soluções genéricas. **Não faça de qualquer jeito.**

## Regra principal
Antes de editar o código, **pesquise profundamente referências visuais e técnicas** sobre:
- invocação de círculo mágico sombrio/grande, com crescimento lento e leitura forte;
- criaturas tipo **hidra sombria** com boa silhueta, anatomia orgânica, bocas/mandíbulas bem resolvidas, pescoços vivos e aura em volta;
- formação lenta de orbes/esferas de energia com núcleo, camadas, rotação e fitas/fragmentos energéticos orbitando;
- impactos/explosões mágicas grandes em sequência;
- recursos de *impact feel* usados por jogos de ação: **camera shake controlado**, micro hit-stop, swell de áudio, antecipação, clarão, onda de choque, resíduos.

**Não invente que pesquisou se não pesquisou.** Registre no PR o que pesquisou e o que aplicou.

---

## VISÃO DA SKILL 1
### Nome sugerido
**Hidra do Juízo**

### Fluxo geral da habilidade
1. O Bispo 3 conjura um **círculo mágico diferenciado**, grande e ameaçador.
2. Esse círculo **não aparece instantaneamente**: ele deve **se formar lentamente**, de maneira pesada, ritualística e cinematográfica.
3. Do círculo, surge **lentamente** uma **Hidra sombria**.
4. A Hidra tem **3 cabeças** (conforme a referência), e cada cabeça cria **sua própria esfera de energia** na boca.
5. As 3 esferas **não surgem prontas**: elas devem **ser construídas lentamente**, com núcleo e energia rotativa em volta.
6. Quando as 3 esferas estiverem completas:
   - a cabeça 1 lança a sua esfera,
   - depois a cabeça 2,
   - depois a cabeça 3,
   sempre **em sequência**, não todas ao mesmo tempo.
7. Após lançar as 3 esferas, a Hidra **se desfaz em pó/partículas** e desaparece.

---

## REFERÊNCIAS VISUAIS FORNECIDAS PELO CRIADOR
### Referência A — círculo mágico diferenciado
- Visual sombrio, vermelho/preto, com identidade própria.
- Grande, agressivo, com leitura ritualística.
- A formação dele deve ser lenta e imponente.
- Não usar círculo genérico simples.

### Referência B — energia/orbe/portal espiralado
- Usar como referência para a **linguagem energética** das esferas.
- A esfera não deve ser uma bola lisa comum.
- Deve haver **núcleo**, camadas, energia girando ao redor, fragmentos/fitas energéticas e sensação de energia sendo construída.

### Referência C — Hidra
- A Hidra precisa ficar **o mais próxima possível da referência**.
- Três cabeças bem definidas.
- Forma orgânica, não rígida.
- Aura roxa/sombria em volta.
- Mandíbulas e dentes bem resolvidos.
- Pescoços longos com bom fluxo e silhueta.
- Nada de aparência “dura”, travada, tosca, low-quality ou genérica.

**As imagens foram fornecidas ao assistente na conversa original, mas não estão incorporadas neste arquivo Markdown. Antes de implementar uma aparência “exatamente igual”, obtenha as três imagens do criador ou um anexo acessível. Não alegue ter visto as imagens se não as recebeu.**

---

## INSTRUÇÃO CRÍTICA — COMO A HIDRA DEVE SER FEITA
O criador deixou claro que você tem tendência a fazer criaturas escuras de forma feia, rígida e genérica. **NÃO REPETIR ISSO.**

### PROIBIDO fazer a Hidra assim:
- cabeça dura/blocada;
- pescoço rígido, como tubo duro ou bloco;
- dentes feios, tortos e sem leitura;
- criatura com silhueta confusa;
- monstro genérico de sombra com espinhos aleatórios;
- material duro/pedregoso parecendo estátua;
- pouca diferença entre as 3 cabeças;
- aparência sem vida, sem aura e sem fluidez.

### A interpretação CORRETA da Hidra:
- criatura sombria, **orgânica e viva**;
- 3 cabeças bem reconhecíveis, ameaçadoras e elegantes;
- bocas abertas com boa leitura interna;
- dentes nítidos, perigosos, porém estilizados;
- pescoços longos com movimento serpentino e natural;
- aura roxa/sombria emanando ao redor;
- aparência energética/sobrenatural, não “bloco 3D duro”.

### Se necessário:
- use camadas/ribbons/aura/fumaça controlada para dar vida à silhueta;
- use shader/material emissivo e aura ao redor;
- preserve boa leitura em celular.

**Resumo:** a Hidra tem que ficar **próxima da imagem**, e não “qualquer bicho de 3 cabeças”.

---

## DETALHE DO CÍRCULO MÁGICO
### Requisitos
- ser **bem grande mesmo**;
- visual diferenciado, vermelho/preto, ameaçador;
- crescimento/formação lenta;
- múltiplas camadas/riscos/runas/linhas se isso ajudar;
- boa leitura no chão/arena;
- sensação de ritual maior do que uma skill comum.

### Formação desejada
- começa com traços, brilho e contornos;
- partes internas vão se completando;
- energia pulsa enquanto a Hidra começa a emergir.

**Não fazer:** aparecer inteiro no mesmo frame.

---

## DETALHE DA HIDRA SAINDO DO CÍRCULO
A Hidra deve sair **lentamente** do círculo. Não deve “pular pronta” ou “spawnar dura”.

### Progressão desejada
1. círculo ativo e pulsando;
2. névoa/energia/aura sobe;
3. a Hidra emerge aos poucos;
4. cabeças se erguem gradualmente;
5. aura roxa em volta fica visível;
6. então inicia a criação das esferas.

Se possível, vender peso e presença com:
- leve tremor de câmera;
- som grave crescente;
- partículas soltas;
- distorção/vento/pressão visual.

---

## DETALHE DAS 3 ESFERAS DE ENERGIA
Cada cabeça cria sua própria esfera.

### Importante
As esferas devem **se construir lentamente**. Não surgirem prontas.

### Cada esfera deve ter:
- **núcleo** interno bem visível;
- camadas externas de energia;
- rotação contínua;
- energia/fragmentos/fitas orbitando;
- efeito de “ser criada/fabricada” na boca da Hidra;
- aparência distinta e poderosa.

### Formação desejada
1. primeiro um pequeno núcleo nasce;
2. energia começa a orbitar;
3. camadas externas vão fechando;
4. brilho e densidade aumentam;
5. a esfera completa fica estável por um instante curto;
6. então ela é disparada.

Pode usar a referência do espiral energético para guiar a linguagem visual.

---

## DISPARO DAS ESFERAS
Quando as 3 estiverem prontas:
- disparo 1: cabeça 1;
- disparo 2: cabeça 2;
- disparo 3: cabeça 3.

### Requisitos
- **em sequência**, não simultâneo;
- intervalo curto e intencional entre um disparo e outro;
- cada disparo com recuo/reação da cabeça;
- boa trajetória visual;
- impacto grande no alvo/solo.

---

## IMPACTO / EXPLOSÃO DAS ESFERAS
Atualmente já existem tipos de impacto/explosão no jogo. **Inspecione o que já existe e reutilize/combina o que melhor casar com essa skill**, adaptando quando necessário.

### Requisitos do impacto
- impacto grande;
- coerente com a esfera;
- sensação de peso e destruição;
- explosão estilosa, não genérica;
- usar o melhor VFX já existente se ele combinar;
- se necessário, combinar mais de um VFX já existente.

### Impact feel exigido
Aplicar técnicas que jogos de ação usam para ficar mais foda:
- **camera shake** bem calibrado;
- micro **hit-stop** ou pausa de impacto se couber;
- flash/clarão curto;
- onda de choque;
- detritos/energia residual;
- áudio grave/swell se houver sistema;
- leve reação de câmera e sensação de peso.

**Não exagerar a ponto de ficar confuso.** Tem que ser forte e legível.

---

## SUMIÇO DA HIDRA
Após lançar a terceira esfera:
- a Hidra deve virar **pó/partículas**;
- desaparecer de forma sobrenatural;
- nada de simplesmente desligar visibilidade abruptamente.

Pode haver:
- dissolução;
- cinzas/poeira sombria;
- aura esvaindo;
- fragmentação em partículas.

---

## IA DO BISPO 3
A IA do Bispo 3 deve ser **melhor que a do Bispo 1 e Bispo 2**.

### O que isso significa
- melhor timing da Skill 1;
- melhor leitura da distância para conjurar;
- não spammar de forma burra;
- usar janela correta de combate;
- comportamento mais ameaçador e inteligente;
- conjuração coerente com cooldown e contexto.

### Exigência
Pesquisar profundamente boas práticas de IA para boss/action RPG e aplicar no contexto atual do jogo.

---

## INTEGRAÇÃO E CUIDADOS
- Não quebrar os poderes já finalizados de:
  - Enemy1, Enemy2, Enemy3, Enemy4
  - Mini-boss 1, 2, 3, 4
  - Bispo 1
  - Bispo 2
- Não reintroduzir o ataque genérico global removido na **Mod 264**.
- Preservar o sistema atual do jogo.
- Manter foco em celular.
- Garantir boa leitura em 3D.
- Não migrar silenciosamente para Unity ou Godot; esta tarefa é para o motor atual do projeto (Three.js).
- Se adicionar IA mais inteligente ou VFX mais pesado, evitar regressões de FPS, picos de memória e travamentos no Android. Preservar controles e legibilidade dos avisos de ataque.

---

## PESQUISA TÉCNICA OBRIGATÓRIA
Pesquisar, antes de implementar:
- como vender impacto forte em jogos de ação;
- timing de summon e build-up;
- VFX de orbes/bolas de energia com núcleo e camadas;
- criaturas serpentino-hidra com boa silhueta;
- como melhorar boss AI em action RPG;
- como reaproveitar da melhor forma os impactos/explosões já existentes no projeto.

Se houver algo no código do jogo já existente que ajude, reaproveitar com inteligência — **não fazer gambiarra genérica**.

---

## CRITÉRIO FINAL DE ACEITAÇÃO
Só considerar concluído se:
1. o círculo mágico for grande, diferenciado e se formar lentamente;
2. a Hidra emergir lentamente e ficar visualmente próxima da referência;
3. a Hidra não parecer dura, feia, tosca ou genérica;
4. cada cabeça criar sua própria esfera lentamente;
5. as 3 esferas forem disparadas em sequência;
6. o impacto for grande e usar bem VFX/impact feel;
7. a câmera e o impacto parecerem mais fortes que nos bispos anteriores;
8. a IA do Bispo 3 ficar superior à do Bispo 1 e 2;
9. a Mod 264 continuar preservada;
10. nada importante do jogo quebrar.

---

## FLUXO DE TRABALHO EXIGIDO
1. Ler este arquivo por completo.
2. Pesquisar profundamente.
3. Inspecionar o código atual e os VFX existentes.
4. Implementar com capricho.
5. Testar.
6. Fazer commit/merge se estiver seguro.
7. **Apagar este arquivo temporário** após terminar.

**Não envie relatórios longos nem mensagens de progresso ao criador. Trabalhe diretamente.**