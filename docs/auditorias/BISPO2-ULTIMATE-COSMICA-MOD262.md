# Mod 262 — VORGAZHEK (Bispo 2): Espada Cósmica permanente + ultimate "O JUÍZO DA ESPADA CÓSMICA"

## A) Espada cósmica (`vorgazhek-cosmic-sword3d.js`)
- **Modelo:** 3D procedural feito a partir da referência 1.
  - **Lâmina:** longa, estreita e gótica, com o corpo vazado. O contorno tem farpas e é extrudado em metal escuro prateado.
  - **Cavidade:** plano com shader de vazio estelar — estrelas, fita prateada serpenteando e núcleo de galáxia espiral branco-quente na metade de baixo.
  - **Guarda:** asas em crescente com farpas, curvadas para o lado da ponta, e um olho negro-violeta no centro.
  - **Cabo e pomo:** cabo com duas espirais e pomo em orbe com seis pontas mais uma ponta final.
  - **Tamanho:** cerca de 1,95 m no tamanho normal.
- **Na mão (permanente):**
  - presa ao osso `mixamorigRightHand` do `Bispo2-lod.glb` assim que o rig carrega (`loadRig('bishop2')` → `attachCosmicSword`);
  - transform local: −90° em X, pega na palma;
  - a escala compensa a escala do osso medida no carregamento, então o tamanho no mundo fica estável e o personagem não cresce;
  - vale para todos os estados: idle, andar, golpes, cast, dano, especial e ultimate;
  - o perfil `fallen2` (finale) usa o mesmo rig.
- **ECLIPSE DA DÍVIDA (Mod 261):** passou a usar uma cópia da espada cósmica.
  - A espada da mão some enquanto a cópia do Eclipse aparece e volta depois, então nunca há duas espadas.
  - A `EspadaBispo2.glb` antiga continua no repositório, mas não é mais carregada para o Bispo 2.
- **Nota de inspeção:** o `Bispo2-lod.glb` tem um adorno branco serrilhado no lado esquerdo do próprio corpo.
  - É malha da pele, sem osso próprio: está espalhado entre os pesos de LeftHand e LeftForeArm.
  - Por isso não foi removido nesta mod, para não arriscar a malha do personagem.

## B) Ultimate (`vorgazhek-ultimate3d.js`), slot real `KITS.vorgazhek.ult`
- **Tipo:** `vorgazhek_cosmic_judgment`, 40 de dano base (32 com o multiplicador de chefe).
- **Disparo:** limiares de chefe (60% e 25% de vida), uma vez cada.
- **Lógica:** máquina de estados de tempo real em 4 fases — `boss_aura 3,3 → circle_build 4,4 → sword_emerge_and_fall 4,0 → impact_and_return 3,2` (≈14,9 s, mais o congelamento).

**Fase 1 — aura das criaturas (0–3,3 s)**
- **Câmera:** plano 3/4 frontal baixo com dolly-in.
- **Bispo:** pose de canalização, espada na mão.
- **Criaturas:** duas criaturas de energia rubro-negra crescem atrás dele:
  - juba de traços negros com veia vermelha (instanciada);
  - olhos triangulares branco-incandescentes;
  - sorriso em crescente com dentes negros em serra e luz branco-rubra por dentro.
- **Fitas:** sobem do corpo, com núcleo claro.
- **Microtremor:** só nos últimos 0,7 s.

**Fase 2 — selos (3,3–7,7 s)**
- **Câmera:** corte para trás do herói, baixo, inclinando para o céu. A cabeça e o peito do herói olham para cima, por cima do clipe e sem tocar na escala.
- **Círculos:** três círculos horizontais empilhados acima do ponto de impacto.
  - Raios de 15, 7,5 e 3,75 m (1 : 0,5 : 0,25); o C1 tem diâmetro de 30 m, metade do diâmetro da arena.
  - Ficam a 15, 23 e 30 m do chão.
  - Construção sobreposta no tempo: C1 de 0,2 a 3,2 s, C2 de 0,9 a 3,8 s, C3 de 1,5 a 4,2 s.
  - Giram em sentidos alternados.
- **Shader do círculo:** contorno arco-íris, anéis com microglifos, ticks e cruzes, heptágono, estrela {7/3}, hexagrama, pentagrama e letras falsas, tudo revelado progressivamente, e um núcleo branco-dourado.
- **Ligações:** raios entre camadas e colunas de suporte.
- **No fim:** a ponta da espada desponta no C1.

**Fase 3 — espada (7,7–11,7 s)**
- **A espada:** o MESMO modelo da mão, ampliado 7×, ponta para baixo.
- **Recorte real:** o shader descarta tudo acima do plano do C1, sem escala 0→1. A espada desce devagar e acelera.
  - Ela inteira (lâmina, guarda e cabo) passa pelo C1 antes de cravar.
  - Na travessia há um anel de luz e brilho na ponta; o metal brilha para ler no céu escuro.
- **Ponto de impacto:**
  - é a posição do herói no início da ultimate, limitada à arena;
  - fica fixo e não persegue;
  - telegrafado por um anel no chão de 6,5 m.
- **Câmera:** plano lateral mostrando a pilha nos primeiros 1,3 s, depois volta à câmera de jogo, inclinada para o anel e a espada.
- **Controle do jogador:** volta aos 1,3 s, deixando cerca de 2,7 s para sair do anel correndo ou com dash.

**Fase 4 — impacto (11,7–14,9 s)**
- **Contato, tudo no mesmo quadro:**
  - congelamento de 0,11 s medido em tempo REAL;
  - câmera lenta de recuperação 0,46 s ×0,5;
  - tranco direcional (para trás e para baixo, mais roll leve);
  - trauma de 1,0 com ruído suave de 8 Hz e decaimento em cerca de 1 s, mais microimpulsos nos 3 anéis;
  - FOV punch de −7° voltando em 0,7 s;
  - clarão curto, `novaBlast`, boom e heavy;
  - vento chegando 0,26 s depois;
  - vibração de 220 ms (respeita a opção do usuário);
  - luz da arena acesa em amarelo.
- **Câmera:** plano aberto de fora da explosão, nunca de dentro.
- **Explosão:**
  - núcleo branco-amarelo;
  - domo de fogo rasgado;
  - 3 anéis de fogo horizontais em alturas diferentes;
  - feixe vertical;
  - cratera com rachaduras incandescentes e placas erguidas;
  - 70 blocos de rocha em voo balístico (34 na qualidade baixa);
  - 36 raios direcionais;
  - onda de choque no chão.
- **Branco:** aos 2,25 s nasce do núcleo projetado na tela, com pico curto (0,22 s de subida e 0,1 s cheio) e fade de 0,6 s. Por baixo do branco a explosão some e a câmera volta para a do jogo.
- **Dano:** só se o herói estiver dentro de 6,5 m do ponto e sem i-frames. A explosão acontece no chão de qualquer jeito.

**Acessibilidade:** `reduceShake` desliga o tremor; `reduceFlash` limita o branco a 35% e o clarão a 15%. Em 1ª pessoa a amplitude do tremor é menor.

**Restauração** no fim, ao morrer, ao sair da dimensão, em cinematografia ou na troca de perfil (`stopCosmicUlt`):
- FOV, tremor desfeito, branco, luz e `ultCam`;
- `bossUlt.kind`;
- trava de controle;
- VFX limpos.

O tremor é aditivo e é desfeito antes de `updatePlayerCamera` no quadro seguinte, então não se acumula.

## Poderes genéricos do Bispo 2 — diagnóstico e checagem
- **`powers3d.js`:** `KITS.vorgazhek` (o mesmo kit de `fallen2`) tem só:
  - s1 `tornadoes`;
  - s2 `reserved` (desligada);
  - s3 `portal_swords`;
  - sword `vorgazhek_eclipse_sword`;
  - ult `vorgazhek_cosmic_judgment`.
  - `pickMove` ignora poderes desligados e o teste confirma que só esses três tipos são sorteados.
- **`ultimates3d.js`:** não há `ULTIMATES.vorgazhek` nem `ULTIMATES.fallen2` sobrescrevendo, então `ultimateFor` devolve a cósmica.
- **`mundo-3d-prototype.js`:**
  - **Ultimate:** `updateBossUltimates` e `startKitUlt` desviam `vorgazhek_cosmic_judgment` para `startCosmicUlt`. O ramo `forge` foi removido na Mod 260.
  - **Poder secundário:** `BOSS_POWERS.vorgazhek` e `BOSS_POWERS.fallen2` não existem mais (Mod 260; `updateBossPowers` nem é chamado).
  - **s2:** `case 'reserved'` não executa nada.
  - **Teste:** `kitMove` recusa poderes desligados.
  - **Ordem:** a ultimate espera tornados, portais e Eclipse terminarem; nenhuma habilidade começa durante a ultimate.
- **Se um módulo falhar ao importar:** o jogo não cai em magia genérica, porque nenhuma rota de reserva para o Bispo 2 existe.

## Testes
- **`node --test`:** suíte completa passando. Os novos estão em `vorgazhek-ultimate.test.mjs` e cobrem:
  - fases e tempos;
  - proporções e ordem dos círculos;
  - recorte, descida e cravada no ponto fixo;
  - janela de esquiva (parado leva dano; correndo ou com dash escapa; um acerto);
  - congelamento sem travar e tremor contínuo com decaimento;
  - branco curto, FOV e planos de câmera;
  - interrupção sem resíduos;
  - kit autoral e integração real.
- Os testes das Mods 260 e 261 foram atualizados para a ultimate nova e para a espada cósmica.
- **Prévias:**
  - `vorgazhek-ultimate-preview.html?t=…&cam=plan|game&dodge=1&view=sword`;
  - espada inspecionada de frente, de lado e em 3/4, e presa ao rig em 6 orientações, até escolher a de −90° em X.
- **Jogo em Chromium headless (SwiftShader), `?testeDimensao=bishop2`:**
  - `kitMove('ult')` percorre as 4 fases;
  - trava de controle e liberação aos 1,3 s da fase 3;
  - acerto parado (100 → 68);
  - branco e volta;
  - FOV restaurado (56);
  - espada na mão presente antes e depois;
  - 0 erros.
- **Evidências:** `docs/evidencias/mod262/`.

## Limitações
- Não testado em Android físico nem em GPU real. FPS real não medido (SwiftShader roda a 3–14 FPS e não serve de referência).
- A vibração depende do aparelho.
- O áudio usa os sintetizadores existentes (`abyss3`, `novaBlast`), sem arquivos novos.
- O adorno serrilhado da malha do Bispo 2 continua lá (ver acima).
