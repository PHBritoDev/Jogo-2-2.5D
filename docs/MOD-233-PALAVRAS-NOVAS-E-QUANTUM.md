# Mod 233 — Ruptura em X, Portais da Perseguição, Dragão do Julgamento e espada Quantum

Este Mod adiciona três Palavras compráveis e uma espada nova. As quatro magias antigas (`magic`, `magic2`, `magic3`, `ultimate`), os ritos das espadas, a loja e os saves continuam iguais.

**Número do Mod:** a Mod 232 está reservada ao trabalho do Codex (câmera, espadas e VFX), ainda não publicado. Por isso esta entrega usa o número 233.

## Espaços das Palavras

- **Botões e teclas:** os botões 1, 2 e 3 passam a ser espaços. Cada um lança a Palavra equipada nele; a ultimate continua separada, no 4.
- **Onde equipar:** Inventário (tecla I) → **PALAVRAS EQUIPADAS**, com um seletor por espaço.
  - Só Palavras compradas aparecem.
  - Se a Palavra já estiver em outro espaço, os dois trocam de lugar.
  - A troca só é permitida fora de combate e sem Palavra ativa. A recarga é guardada por Palavra, não por espaço, então trocar não zera nenhuma recarga.
- **Save:** grava o campo `loadout`. Um save antigo, sem esse campo, carrega o padrão `magic, magic2, magic3`.
- **Compra:** a Palavra recém-comprada é equipada sozinha no primeiro espaço ainda vazio, ou seja, num espaço cuja Palavra o jogador ainda não comprou.
- **Regras puras** em `skills3d.js`: `normalizeLoadout`, `equipSlot`, `ownedSlotSkills` e `autoSlotFor`.

## As três Palavras

A lógica de cada uma é determinística, com passo fixo de 120 Hz, e fica em módulos sem Three.js. O VFX só desenha. Troca de cena, morte, diálogo ou cinemática cancelam e limpam tudo.

| Palavra | Loja | Coreografia | Dano (× nível) |
|---|---|---|---|
| **Ruptura em X** (`skill_x_rupture`) | 55 moedas, nível 4, etapa 8 · 26 de mana · 6,5 s | 1. Duas lâminas 3D (malha com espessura e curva) crescem do cruzamento.<br>2. O X viaja **reto, no plano horizontal**, rente ao terreno, a 24 m/s, com correção de rumo limitada.<br>3. Varredura contínua contra a cápsula do alvo. | 38, um único acerto, com empurrão pequeno (exceto em chefes) |
| **Portais da Perseguição** (`skill_twin_portals`) | 95 moedas, nível 6, etapa 12 · 40 de mana · 11 s | 1. Um portal rubro à esquerda e um violeta à direita.<br>2. Oito fios em rotas próprias e tempos diferentes: frente, por trás, por cima, volta completa, em S, espiral, rasante e mergulho.<br>3. As rotas são Catmull-Rom presas ao referencial do alvo e se reajustam se ele andar.<br>4. Explosão final. | 8 × 5 + 18 |
| **Dragão do Julgamento** (`skill_judgment_dragon`) | 140 moedas, nível 7, etapa 16 · 55 de mana · 18 s | 1. Espirais sobem do herói e o dragão nasce subindo em espiral.<br>2. Avança serpenteando e abre a boca de verdade.<br>3. Envolve o alvo e **fecha a mandíbula**: a mordida acontece no fechamento.<br>4. Compressão e explosão em esfera. | 30 + 36 |

**Ruptura em X:** se encontrar parede, o X impacta nela e não atravessa. Sem alvo, percorre 28 m e se dissipa sem dano.

**Portais da Perseguição:** fio que encontra obstáculo baixo explode nele e não atravessa. Sem alvo, os fios terminam num ponto à frente, sem dano.

**Dragão do Julgamento:**
- O alvo nunca é movido, escondido nem destruído.
- **Chefes:** recebem a variante de superfície, em que a cabeça fecha a boca diante do torso, sem entrar no corpo.
- **Escolha técnica:** o dragão é procedural, não um GLB. Crânio esculpido, mandíbula articulada, dentes, olhos, chifres, crista, babados e bigodes de fogo. O corpo tem 34 segmentos instanciados posicionados por comprimento de arco ao longo do histórico real da cabeça. O ângulo da mandíbula vem direto da lógica, sem precisar de rig nem retarget.

**Visual:** feito sobre o kit compartilhado `celestial-fxkit3d.js` (partículas desenhadas no shader, decalques assentados na encosta, fitas e raios).
- **X:** núcleo branco-quente, corpo carmesim, bordas magenta, filamentos pretos, rastro bifurcado e, no acerto, dois cortes cruzados com ruptura e faíscas direcionais.
- **Portais:** profundidade com túnel cônico, redemoinho escuro e fragmentos sugados; rastros 3D das rotas reais; esfera de pressão e anel no chão.
- **Dragão:** ouro com escamas e contorno de fogo; explosão em cascas e corpo se desfazendo em brasas.

## Espada Quantum

- **Loja:** Arsenal, 165 moedas, nível 8, **somente a partir da etapa 17**. É a metade do Ato III: a armadilha de Invernália, depois da cidade e da estalagem (`act3-flow.js`). Antes disso, aparece a mensagem "Disponível após a metade do Ato III (a armadilha de Invernália)", e nem ouro nem nível liberam a compra.
- **Atributos:** dano 40 e alcance 2,5, entre a Lâmina da Vigília (36) e a Espada Celestial (48).
- **Modelo:** `quantum-sword3d.js`, no mesmo referencial das outras espadas procedurais, encaixado na mão pelo mesmo alinhamento.
  - Núcleo escuro com horizonte brilhante.
  - Órbitas dourada e violeta girando.
  - Lâmina com volume e gradiente ouro → magenta → violeta.
  - Empunhadura vermelha com anéis dourados e pomo com gema.
- **Efeitos:** no golpe, a ponta deixa um arco com centro claro e bordas violeta e órbitas elípticas. No acerto, um colapso estelar em miniatura.
- **Ritos:** não ganhou rito próprio, para não mexer em `sword-rites3d.js`, que está sob a Mod 232.
- **Teste:** no modo `?todasHabilidades=1`, ela pode ser equipada sem comprar.
- **Save:** uma espada salva que o jogador não possui volta à Espada do Chamado ao carregar.

## Validação executada

- `node --test`: **200 testes aprovados**. `skills-mod233.test.mjs` (19 testes) cobre:
  - **Ruptura em X:** trajetória horizontal, um único acerto, determinismo de 10 a 120 FPS, parede, ausência de alvo, alvo fino e alvo que morre no meio do voo.
  - **Portais:** lados e oito rotas diferentes; "por trás", "por cima" e volta completa; distribuição no tempo; alvo andando; parede.
  - **Dragão:** fases na ordem, mordida só com a boca fechada, alvo intocado, ondulação do corpo, chefe na variante de superfície, cancelamento.
  - **Espaços e saves:** loadout, compra, mana e recarga.
  - **Quantum:** bloqueada nas etapas 15 e 16 mesmo com ouro e nível; liberada na 17.
  - **Integração:** o espaço decide a Palavra, o loadout entra no save, a Quantum tem malha própria e as habilidades antigas continuam presentes.
- **Chromium headless com SwiftShader:**
  - **Prévia isolada** (`skills-mod233-preview.html`): as três Palavras em qualidade alta e baixa.
  - **No mundo do jogo:** equipadas nos espaços 1 a 3 e lançadas pelos botões. HP do alvo 300 → 262 → 204 → 138 (38, 58 e 66), sem mover o inimigo.
  - **Quantum:** equipada na mão, em terceira e em primeira pessoa, e no golpe.
  - **Cerco antigo:** continua saindo pelo espaço 1 no padrão.
  - Sem erros de página.
- **Capturas:** `docs/evidencias/mod233/`.

## Limitações reais

- **Android físico não testado**, e o FPS no celular não foi medido. No SwiftShader roda entre 1 e 5 FPS, o que não serve de referência.
- As seis imagens de referência não estavam anexadas na conversa em que este Mod foi feito. O design seguiu o briefing escrito; não houve comparação lado a lado com elas.
- **Áudio:** as Palavras usam os sons que já existem no jogo (whoosh, impacto, portal, carga e explosão). Sons próprios ficam para a etapa de áudio.
- **Dragão:** a cabeça é feita de várias malhas pequenas, com cerca de 30 chamadas de desenho no total. É aceitável, mas pode ser fundida numa malha só se o celular pedir.
- **Quantum em primeira pessoa:** as órbitas aparecem, mas não giram (o brilho do shader anima).
- **Mod 232:** o trabalho do Codex não estava publicado. Esta entrega evitou `sword-rites3d.js` e os sistemas de câmera e locomoção; o Codex precisa sincronizar a branch dele com a nova `main` antes de continuar.

## Como testar

- **Celular:** https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?todasHabilidades=1&mod=233. Abra o Inventário (I), escolha as Palavras nos espaços e toque 1, 2 e 3 perto de um inimigo.
- **Prévia isolada:** `skills-mod233-preview.html`, com os botões CHEFE e PAREDE e os parâmetros `?skill=x|portals|dragon&low=1`.
