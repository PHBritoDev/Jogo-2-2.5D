# Mod 265 — refino da ultimate do Bispo 2: presença rubra, explosão em estágios, chamas negras

Este é o refino pedido para a Mod 262. Os círculos, a espada cósmica, o ritmo, as câmeras, as Skills 1 e 3, o Eclipse da Dívida e as exclusões das Mods 263 e 264 continuam como estavam. A exclusividade dos poderes não foi tocada.

## A. Presença da fase 1 (sai "duas criaturas espinhosas", entra uma manifestação de luz)
- **O que saiu de `vorgazhek-ultimate3d.js`:** juba de traços, cones de dentes, olhos triangulares e bocas modeladas.
- **O que entrou:** um shader `PRES_F` em dois planos de profundidade:
  - fundo a cerca de 19 m atrás do bispo, com 36 × 33 m;
  - plano do meio a cerca de 8 m atrás, só com as raias, para dar paralaxe.
- **Orientação:** os planos giram só em yaw para a câmera cinematográfica baixa 3/4 da fase 1 e somem no corte para a fase 2, sem deixar resíduo no céu.
- **Composição:**
  - **campo rubro:** oval alto, com gradiente e fluxo, e borda estriada pelas próprias raias, sem borda de placa;
  - **raias negras:** finas e longas, convergindo ao foco atrás do bispo e esticando com a carga;
  - **espaço negativo branco-rosado:** dois rasgos inclinados no alto e uma fenda curva enorme (o sorriso) embaixo, com halo quente;
  - **revelação:** os rasgos e a fenda aparecem aos poucos pela própria energia (`eyeRev` de 32 a 72% da carga, `grinRev` de 48 a 95%), com distorção suave do domínio.
- **Línguas vermelhas** sobem do corpo, mais finas e em menor número, para o bispo e a espada continuarem legíveis.

## B. Explosão que nasce do contato (`impact_and_return`, 3,2 s, um só relógio)

| Estágio | Tempo | O que acontece |
|---|---|---|
| Contato | 0–0,12 s | A ponta crava no chão. Congelamento de 0,11 s em tempo real, tranco direcional (trauma 0,7), som seco (`heavy` + `stick`), vibração curta, fissura pequena e faísca. Clarão de no máximo 0,3. Ainda sem anéis, domo ou feixe. |
| Compressão | 0,12–0,55 s | Fissuras luminosas crescem; núcleo pequeno e nítido no chão; linhas de energia convergem para o epicentro; placas vibram. |
| Formação | 0,55–1,05 s | O núcleo sobe e abre; a casca rasgada do domo ganha espessura; primeiro halo; rochas começam a subir. |
| Detonação | 1,05–1,8 s | Evento `detonate`: `novaBlast` + `boom`, vibração e tremor secundário. Anéis 1 → 2 → 3 (1,05 / 1,2 / 1,38 s), domo cheio, feixe, raios para fora, rochas radiais, onda de choque, clarão grande e luz da arena. |
| Cauda | 1,8–3,2 s | Evento `wind` aos 1,4 s (vento pelo relógio da ultimate; o `setTimeout` solto foi removido), resíduo e decaimento. O branco nasce do núcleo aos 2,3 s e termina em cerca de 3,18 s. |

- **Dano e jogo, sem mudança:** um acerto no contato, só dentro do anel de 6,5 m, com i-frames respeitados e a mesma janela de esquiva.
- **Câmera:** plano externo da explosão, como antes.

## C. Chamas negras na espada cósmica (`vorgazhek-cosmic-sword3d.js`)
- **Onde ficam:** 25 línguas em uma única malha (2 chamadas a menos que partículas), presas à mesma espada nas bordas da lâmina, nas asas da guarda e no olho central.
- **Movimento:**
  - a base nasce na superfície e a língua sobe no eixo vertical do mundo;
  - ondula em S com fase própria e se afina até uma ponta finíssima;
  - o movimento é contínuo no tempo, sem partículas que pulam.
- **Silhueta:** vem de uma máscara de chama (base larga → topo fino); o ruído só deforma o eixo e a borda.
- **Cores:** núcleo preto profundo, contorno prata frio, fio prateado interno e raras fissuras claras. Sem emissive branco geral.
- **Onde aparecem:** na mão (idle, andar, golpes, cast), no Eclipse (a mesma construção) e na espada gigante. Na gigante as chamas ficam em escala 0,6 e são recortadas pelo plano do C1, como o resto da espada.
- **Descarte:** `dispose` inclui o material e a geometria das chamas.

## Pesquisa usada
- **[fire-shader (cpl121)](https://github.com/cpl121/fire-shader):** máscara de silhueta, distorção por ruído que cresce com a altura e gradiente sobre UV distorcido. Usei a técnica; nenhum código ou asset foi copiado.
- **[Real-Time VFX — explosões estilizadas](https://realtimevfx.com/t/stylized-ue4-explosion/4557) e [crítica de explosão](https://realtimevfx.com/t/explosion-effect-critique/10157):** antecipação curta, estouro e cauda mais lenta; faíscas menores antes do estouro principal, como costuma aparecer em anime.
- **Guias de VFX citados no briefing (Riot / League of Legends):** forma e contraste antes do brilho, e legibilidade do aviso de perigo.
- O site easymaking.io (citado no briefing) não abre nesta sessão, porque o domínio não está liberado na rede.

## Testes
- **`node --test`:** suíte completa passando, incluindo `vorgazhek-exclusive.test.mjs` das Mods 263 e 264. O teste novo da Mod 265 cobre:
  - ausência de criatura, dentes e olhos modelados;
  - rasgos e fenda revelados pela energia;
  - chamas na mesma espada, com recorte;
  - ordem dos estágios e clarão pequeno no toque;
  - detonação, vento e anéis só depois da formação;
  - tudo dentro dos 3,2 s.
- **Prévias em Chromium headless (SwiftShader):**
  - presença em 1,2 / 2,2 / 3,25 s;
  - explosão em 11,85 / 12,2 / 12,65 / 13,15 / 13,7 s;
  - espada com chamas em pé, em 3/4 e deitada.
- Também passou no jogo real em `?testeDimensao=bishop2`.
- **Evidências:** `docs/evidencias/mod265/`.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido.
- A comparação com as imagens de referência foi visual, por captura.
