# Mod 266 — ZAR'KHAEL (Bispo 3): Skill 1 "HIDRA DO JUÍZO" e IA por utilidade

## Integração
- **Kit (`powers3d.js`):** `KITS.zarkhael.s1` (o perfil `fallen3` usa o mesmo kit) passou a ser `hydra_judgment`, com 18 de dano base, recarga de 24 s e alcance de 6–24 m. Saem os "Selos do Juízo" genéricos.
- **Ligação no código:** `runFoeMove` → `startHydra`; `updateHydra(dt)` no laço; `stopHydra()` no reset da dimensão.
- **Bispo durante o ritual:** fica parado conjurando enquanto o selo se forma e a Hidra emerge (`holdBoss`). Depois volta a agir, mas nenhuma outra magia do kit sai até a Hidra terminar.
- **Interrupção:** morte, saída da dimensão, cinematografia ou troca de perfil abortam o ritual; a Hidra se desfaz em 0,5 s, sem novos disparos.
- **Teste:**
  - `?testeDimensao=bishop3` (adicionado à lista);
  - `&testHidra=1`, que repete a habilidade sem recarga;
  - botões no painel do teste das dimensões ("Lutar contra Bispo 3" e "Testar HIDRA DO JUÍZO") e no laboratório.
  - Nada é salvo.
- **Mod 264 preservada:** nenhum projétil genérico voltou (testado).
- **Outros poderes:** os poderes autorais dos inimigos, mini-chefes e Bispos 1 e 2 não foram tocados.

## Módulo `zarkhael-hydra3d.js` (lógica pura + pose pura + VFX, num relógio só)

| Fase | Tempo | O que acontece |
|---|---|---|
| Selo | 0–2,4 s | O selo de 8,5 m de raio (referência A) se desenha por camadas, nesta ordem: aro rubro/negro em pinceladas (duas varreduras), disco cor de osso com grão do centro para fora, olho-losango com três contornos rubros e centro vermelho, coroa de 7 espinhos negros crescendo, crescentes laterais e o crescente inferior com orbe. Depois pulsa. A coroa fica do lado oposto ao herói. |
| Emergência | 1,6–4,6 s | A Hidra sobe de dentro do selo: o que está abaixo do chão não é desenhado. Primeiro o corpo, depois os três pescoços em S, e as cabeças se erguem uma a uma (rugido por cabeça). Há rumor de tremor na câmera. |
| Carga | 4,6–7,0 s | Cada cabeça abre a mandíbula e constrói a sua esfera, em cerca de 2 s e com escalonamento: núcleo → raios convergindo → fitas orbitando e estilhaços → duas camadas em espiral fechando → brilho e densidade. A esfera fica estável um instante. |
| Disparo | 7,2 s / 7,75 s / 8,3 s | Cabeça 1, depois 2, depois 3, cada uma só depois de a anterior ter saído. Cada disparo tem recuo da cabeça e da mandíbula. A mira é a posição do herói no disparo (antecipação de até 0,15 s / 2 m) e fica travada. Velocidade de 22 m/s, com colisão por segmento contra o herói. |
| Impacto | — | Na posição do herói ou no chão real: clarão, cúpula de energia escura rasgada (veias rosa e núcleo claro rente ao chão), onda de choque, espinhos negros radiais, rachadura e estilhaços. Raio de 2,8 m; dano uma vez por esfera (com intervalo mínimo); i-frames respeitados. No corpo do herói a cúpula cai para 60%, para não cobrir a câmera. |
| Dissolução | +0,45 s depois da 3ª | A Hidra se desfaz em pó violeta: dissolve por ruído com borda clara, mais 900 partículas soltas subindo. Dura 1,6 s. |

**Arte da Hidra (referência C)**
- **Pescoços:** tubos deformados na GPU por 6 pontos de controle (Catmull-Rom), com raio afinando e curva em S viva (ondulação por cabeça).
  - Material orgânico: dorso negro-violeta, ventre com placas em chevron cinza-violeta e veias violeta incandescentes.
  - Aura no contorno (fresnel), mais uma casca aditiva de aura.
- **Cabeças:** três diferentes (escala, largura e número de chifres).
  - Crânio em cunha com sobrancelhas.
  - Mandíbula articulada que abre na carga e fecha no recuo.
  - Fileiras de dentes nítidos, com presas maiores na frente.
  - Olhos magenta e interior da boca violeta brilhante.
  - Chamas violeta na crista, que sobem no eixo do mundo.

**Impact feel**
- **Câmera:** tremor por trauma com ruído suave e tranco direcional (`shakeAt` da Mod 262), aditivo e desfeito antes da câmera do próximo quadro. Respeita `reduceShake`, e em 1ª pessoa a amplitude é menor.
- **Até 16 m do impacto:** micro hit-stop (45 ms; 75 ms se acertar), FOV punch de −4° e vibração curta.
- **Som:** gravity e warn no selo, storm na emergência, heavy no rugido, launch no disparo, boom e thunder no impacto, tear na dissolução.

## IA do Bispo 3 (`zarkhael-brain3d.js`)
- **Escolha por utilidade** (Infinite Axis Utility System): cada golpe tem considerações normalizadas em [0,1] que se multiplicam:
  - alcance, por uma tabela de distância em trapézio para cada golpe;
  - recarga;
  - repetição (×0,35 se foi o último golpe);
  - herói usando dash (a Hidra espera: ×0,45);
  - herói atacando de perto (×1,4 no golpe de perto; ×0,3 na Hidra);
  - vida baixa do bispo (Hidra ×1,25);
  - vida baixa do herói (golpes rápidos ×1,2);
  - herói correndo (projéteis ×1,15).
- **Seleção "dual utility":** entram só as opções com nota de pelo menos 80% da melhor, e o sorteio é ponderado pela nota.
- **Posicionamento:** se a Hidra está a ≤ 1,5 s de ficar pronta e o herói cola (< 5,5 m), o bispo recua para abrir espaço para o ritual.

## Pesquisa usada
- **IA de chefe:**
  - [Infinite Axis Utility System](https://www.gameai.com/manuals/index.php/IAUS);
  - [sistemas de utilidade (Horswill)](https://ianhorswill.github.io/DPGD/Utility_systems.html): considerações normalizadas multiplicadas, faixa de cima e sorteio ponderado;
  - [IA de chefe com tabela de distâncias](https://gamerboom.com/archives/90771).
- **Orbe de energia:**
  - [Pulse Cannon breakdown](https://realtimevfx.com/t/step-by-step-vfx-breakdown-pulse-cannon-effect/3161): raios convergindo ao núcleo e camadas de carga;
  - [Magic Explosion Spell breakdown](https://realtimevfx.com/t/magic-explosion-spell-breakdown/19039): espirais repetidas em volta do centro.
- **Silhueta da hidra:** guias de pescoço em S, cabeça em cunha e linhas de fluxo antes do detalhe ([guia](https://dev.publishnews.com.br/draw-hydra)).
- **Impact feel:** hit-stop, tranco e trauma, como nas Mods 262 e 265 (God of War, Epic, GameDeveloper).

## Testes
- **`node --test`:** suíte completa passando. Os novos estão em `zarkhael-hydra.test.mjs` e cobrem:
  - selo em camadas, sem saltos;
  - Hidra enterrada antes de emergir, cabeças subindo em ordem e em três alturas, pescoço em S;
  - construção lenta e monotônica das esferas;
  - exatamente 3 disparos em sequência, cada um só com a esfera pronta, e recuo da cabeça;
  - impacto no chão real, dano por esfera, esquiva correndo de lado, i-frames e mira travada;
  - dissolução depois da 3ª, interrupção e liberação do bispo;
  - IA (alcance, espera do dash, recarga, sem repetição, intenção de recuo);
  - integração e Mod 264.
- **Prévia:** `zarkhael-hydra-preview.html?t=…&cam=hero|wide|hydra|head|seal|impact&dodge=1`.
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop3`:** selo, emergência, carga, 3 disparos, 3 acertos parado (100 → 58), dissolução e fim, com FOV restaurado e 0 erros.
- **Evidências:** `docs/evidencias/mod266/`.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido.
- O resto do kit do Bispo 3 (s2, s3, espada e ultimate) continua como estava; só a Skill 1 foi pedida.
