# Mod 261 — VORGAZHEK (Bispo 2): especial de espada "ECLIPSE DA DÍVIDA"

## O que entrou
O slot `sword` de `KITS.vorgazhek` (o perfil `fallen2` usa o mesmo kit) foi ativado:
- **Tipo:** `vorgazhek_eclipse_sword`.
- **Dano:** 22 base (18 com o multiplicador de chefe).
- **Recarga:** 20 s.
- **Alcance:** 4 a 26 m.

`pickMove` passou a respeitar `range`. Os golpes de perto dos outros perfis continuam a sair até 4,5 m.

Continuam como estavam:
- a Skill 1 (tornados), sem mudança no módulo;
- a Skill 3 (portais), sem mudança no módulo;
- s2 e ultimate reservadas e desligadas;
- nenhum poder genérico antigo voltou.

**Módulo:** `vorgazhek-eclipse-sword3d.js`, com lógica pura, pose e VFX no mesmo relógio.

## Etapas
**A — Eclipse e carga (0 a 3,2 s)**
- **Eclipse:**
  - aparece no 1º quadro (`moon = 1` no `start`, com revelação de 0,35 s);
  - visual: crescente escuro anular com aro de luz, interior claro com nuvens, halo branco-azulado com raios, nuvens escuras de borda acesa e uma estrela na borda fina;
  - é um objeto da cena virado para a câmera, não um sprite de HUD.
- **Composição (`moonPlacement`):**
  - parte da direção câmera→bispo e mira cerca de 4,6 m acima dele (ponta da espada erguida);
  - sobe +0,12 rad e desloca 0,14 rad para o lado da mão da espada vista pela câmera;
  - o tamanho angular é fixo (≈7,7°);
  - a distância fica logo além do bispo (horizontal + 6 m, entre 14 e 45 m), porque em 115 m o portão do fundo da arena escondia a lua no jogo;
  - acompanha suavemente a câmera, com paralaxe e sempre acima do chão;
  - a lua sorridente antiga (`VorgazhekMoonAmbient`) é escondida e devolvida no fim, sem ser apagada.
- **Câmera:** introdução suave por `ultCam` (baixa, olhando para cima), liberada em 1 s. Não acontece em 1ª pessoa e o controle nunca é tirado.
- **Espada real:**
  - a `EspadaBispo2.glb` (antes não usada) vai para a mão direita, ao longo do antebraço;
  - pega em y = −0,3, escala 1,05, cerca de 2 m de comprimento;
  - só aparece durante a habilidade, com fade, para não duplicar a arma;
  - inspeção do arquivo: 1 malha de 54 732 triângulos, eixo +Y = cabeça de dupla foice, cabo para −Y, ±0,95.
- **Pose (`eclipseArms`):**
  - a espada é erguida acima da cabeça na carga e recua na antecipação;
  - depois o golpe desce para a frente;
  - os braços são apontados em espaço de mundo por cima do clipe, sem mexer na escala da raiz.
- **Aura em 4 estágios** (0,6 / 1,5 / 2,5 / 3,2 s), sempre com núcleo branco-lilás:
  - fitas-chama em espiral pelo corpo inteiro (até cerca de 9 m de altura e 3,8 m de raio);
  - chicotes negros a partir de 25%;
  - fitas e feixe ao longo da espada, passando da ponta em até +4,6 m;
  - coroa de farpas e núcleo no chão a partir de 45%.
- O bispo fica parado e virado para o herói, mas continua levando dano.

**B — Corte (até 2 s)**
- **Lançamento:** antecipação de 0,42 s, depois o corte sai da ponta real da espada.
- **Mira:** a posição do herói no lançamento, com previsão de até 0,3 s e 2,5 m, apontada para o chão nesse ponto. Depois o rumo é fixo (testado).
- **Velocidade:** 30 m/s.
- **Forma:** crescente em cúpula de 5 lâminas, inclinado na diagonal, com um brilho no centro (legível de frente e de lado), pontas que deixam rastro e núcleo branco → violeta → manto negro rasgado.
- **Colisão:** varredura por quadro (±1,25 m de largura, ±1,15 m de altura) contra o herói, sem túnel. Um único acerto, com i-frames respeitados.
- **Se errar:** bate no chão no ponto real da trajetória, ou no cenário bloqueado.

**C — Colapso giratório (2,4 s)**
- No ponto real do choque, seja herói, chão ou parede.
- **Composição:** 22 faixas largas instanciadas girando em eixos inclinados (violeta com cabeça branca, lâminas negras e trilhas quentes), núcleo esférico em espiral, brilho central, anel de pressão no chão, farpas negras e estilhaços.
- **Ritmo:** 0–0,15 s impacto; 0,15–0,55 s expansão; até 1,9 s massa girando; 1,9–2,4 s dissipação, sempre girando.
- Não causa dano.
- O tremor é leve e respeita `reduceShake`.

**Proteção da câmera:** em 1ª pessoa, faixas e brilhos a menos de 1,4 m da câmera somem, para não cegar a tela (verificado no jogo). O impacto no herói nasce na frente do corpo, do lado de onde veio o corte.

**Desenho da lua:** ela é desenhada depois do portal e dos olhos do fundo e antes da aura, por isso o cenário distante não a cobre. O bispo e o herói continuam na frente dela pela profundidade.

**Fim:** fade de 0,45 s. Lua, aura, espada e rastros somem e a lua antiga volta.

## Integração
- **Ligação no código:** `runFoeMove` → `startEclipseSword`; `updateEclipseSword(dt)` no laço, depois dos portais.
- **Sem empilhamento:** o Eclipse não começa durante tornados ou portais, e eles não começam durante o Eclipse. `updateFoeKit` espera o Eclipse terminar.
- **Interrupção:**
  - morte do bispo ou do herói, saída da dimensão, cinematografia e troca de perfil fazem fade de 0,3 s, sem dano nem corte;
  - `resetEnemyAfterDimension` → `stopEclipseSword`.
- **Teste:**
  - botão "☾ Testar ECLIPSE DA DÍVIDA" no painel do teste das dimensões;
  - `?testeDimensao=bishop2&testSwordEclipse=1`, que repete a habilidade sem recarga;
  - botão no laboratório.
  - Nada é salvo.
- **Áudio:** `abyss3` (thunder/gravity, storm por estágio, tear, launch/blade, boom/storm).

## Testes
- **`node --test`:** suíte completa passando. Os novos estão em `vorgazhek-eclipse-sword.test.mjs` e cobrem:
  - tempos (lua no 1º quadro, 3,2 s, estágios, golpe ≤ 2 s, colapso de 2,4 s);
  - mira travada e antecipação limitada;
  - acerto parado e no ponto de contato;
  - desvio correndo, com impacto no chão no ponto mirado;
  - dash com i-frames;
  - sem túnel e parada na parede;
  - interrupção em 3 momentos;
  - composição da lua em 3 câmeras × 2 lados;
  - pose;
  - kit, integração e asset real.
- **Prévia** com o Bispo2-lod.glb e a EspadaBispo2.glb reais: `vorgazhek-eclipse-preview.html?t=…&cam=hero|low|side|close|fp|impact&dodge=1`.
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop2`:**
  - selo 261 e `kitMove('sw')`;
  - carga, corte com acerto (100 → 82), colapso e fim;
  - "Reiniciar" limpa tudo;
  - 0 erros de console.
  - Capturas em 3ª e 1ª pessoa estão em `docs/evidencias/mod261/`.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido (SwiftShader roda a 5–9 FPS e não serve de referência).
- Sem bloom.
- A cena do Ichigo foi usada só como linguagem de enquadramento; nada foi copiado.
