# Mod 245 — Enemy3 e mini-chefe do Ato III: magias, katana, IA e animações

Base: `main` em `e2a9505` (Mod 244 do Codex + especificação desta tarefa). Branch de trabalho: `ccr-8ab771c0-yqmwv4`.
Referências do criador (4 imagens + vídeo do buraco negro) recebidas diretamente na conversa; nenhuma foi copiada para o repositório.

## 1. Auditoria dos GLBs e do roteiro (antes de implementar)

| Arquivo | Clipes presentes (duração em s) | Esqueleto | Arma |
|---|---|---|---|
| `Enemy3.glb` | Running .63 · Walking 1.03 · dash `_01a15ab0…` 1.97 · idle `_01a15ab5…` 2.47 · Attack 2.8 · Dead 2.97 · Skill_03 1.63 · Triple_Combo_Attack 4.33 | 68 ossos, com polegar e médio | não tem (braços orgânicos) |
| `Enemy4.glb` | Running .63 · Walking 1.03 · idle `_01a15ace…` 2.47 · dash `_01a15ad2…` 1.97 · Attack 2.8 · Dead 2.97 · Skill_03 1.63 · Triple_Combo_Attack 4.33 | 50 ossos, **sem dedos** | **não tem katana**: malha única com braços-lâmina |

- Os nomes mapeados em `RIG_DEFS.enemy3/enemy4` existem e tocam (verificado no laboratório e na prévia).
- **Mini-chefe do Ato III = perfil `miniboss3` sobre o rig `enemy4`** (`ato3-surgir-guardiao`). Foi mantido assim. Nenhum GLB foi trocado ou alterado.
- O Ato IV usa `enemy3` com `miniboss4`, e `enemy4` com `demon4`/`leader4`. Esses encontros **continuam no pacote antigo**: a esquadra só liga para `enemy3 + demon3` e `enemy4 + miniboss3` (`e3SquadPack`). Há um teste que garante isso.
- A katana da referência A **não existe no repositório**. Por isso ela foi feita como peça procedural, não destrutiva, presa ao osso `RightHand` (`crimson-katana3d.js`).

## 2. O que foi implementado

**Arquitetura.** Três módulos novos de jogo e um de arma, todos sobre a esquadra da Mod 237, que roda a 120 Hz com semente fixa:

- `enemy3-squad3d.js`: lógica pura, com as espécies `e3` e `e3boss`, as três magias, a fissura e os combos de katana.
- `enemy3-abyss-vfx3d.js`: VFX. Só desenha.
- `enemy3-runtime3d.js`: katana na mão, pose de katana para o assador e camadas procedurais de conjuração.
- `crimson-katana3d.js`: modelo da arma.

Laboratório isolado do progresso em `?testeEnemy3=1`. Para voltar ao modo antigo: `?esquadraLegada=1`.

### Skill 3 — Singularidade Abissal

| Fase | Comum | Mini-chefe |
|---|---|---|
| Centelha na palma (cresce sem parar; o braço se estende) | 0,9 s | 1,0 s |
| Sobe: o braço acompanha e sustenta acima da cabeça | 0,7 s | 0,8 s |
| Postura de arremesso e soltura no quadro certo | 0,28 s | 0,28 s |
| Voo (giro 0,95 rad/s, previsão com teto) | 11,5 m/s | 12,5 m/s |
| Domo (raio) | 3,2 m | 4,4 m, com atração leve |

- **Visual:** núcleo negro opaco, halo de lente, aro fotônico branco-dourado e disco de acreção com fluxo kepleriano. Linhas horizontais de energia atravessam o disco, como no vídeo.
- **Detonação:** acontece no ponto exato ao tocar o herói, o chão ou um obstáculo, com varredura por segmento. Se o tempo acaba no ar, a singularidade desce e detona no chão.
- **Dano:** o núcleo dá **um** dano. O domo dá dano pela fronteira real do hemisfério, uma vez por alvo, e quem levou o núcleo não leva o domo.
- **Implosão e domo:** a implosão dura 1–2 quadros. O domo cresce por quadros-chave: cerca de 86% do raio em 0,17 s, depois desacelera. Ele dissipa por erosão.
- **Cancelamento:** atordoar ou matar o conjurador antes do arremesso desfaz a magia sem dano.

### Skill 2 — Barragem Abissal

- **Fendas:** comum 8, mini-chefe 16 (fileira alta em arco + asas baixas). São rasgos verticais/oblíquos atrás e acima do conjurador. O centro é negro, com uma galáxia sutil só lá dentro, o contorno magenta é quebrado e as rachaduras se ramificam. Raios negros ligam fendas vizinhas.
- **Espada saindo da fenda:** cada espada nasce dentro da fenda e sai ponta primeiro (0,45 s na primeira carga, 0,34 s depois), mira e dispara. O recorte é feito por shader com o **plano da fenda por instância**. `material.clippingPlanes` não foi usado porque é um plano por material e não atende 8–16 fendas diferentes.
- **Disparos:**
  - fila independente por fenda;
  - teto de espadas no ar (4/6) e intervalo mínimo entre disparos (0,22/0,15 s);
  - varredura contra a cápsula do herói;
  - quem erra crava no chão com rachaduras e detritos, e some depois.
- **Leque final do mini-chefe:** as espadas prontas saem juntas, com vãos regulares entre elas.
- **Interrupção ou fim:** as fendas fecham e as espadas que não saíram são recolhidas.

### Skill 1 — Tempestade de Nadir

- **Duração:** invocação de 1,7 s (mãos ao céu), tempestade de 5,6 s (mini-chefe 6,6 s) e dissipação de 1,5 s.
- **Céu:** o redemoinho visto de baixo tem três camadas com paralaxe, bandas de cor duras (sem gradiente de fumaça), vazio central com luz rosa na borda e veios carmesim. Uma cobertura escura do céu fica só ao redor da arena.
- **Escurecimento:** é local e reversível (`applySquadDim`). Sol e hemisfério são escalados só enquanto a tempestade existe e voltam ao valor anterior; medido: 1,55/2,10 → 0,90/0,95 → 1,55/2,10.
- **Raios:**
  - **Taxa:** 2,1/s (mini-chefe 3/s); a taxa cai quando outra magia grande está em campo.
  - **Posição:** cada raio cai sobre o herói, à frente do movimento dele ou num anel ao redor, com separação mínima (Poisson disk).
  - **Limites:** no máximo 3 (ou 4) marcas vivas, no máximo uma sobre o herói, e uma janela de respiro depois de um acerto.
  - **Marca no chão:** desenha o **raio real** da colisão e se enche em 0,62 s (pesado: 0,95 s), com aviso elétrico e sonoro antes.
  - **Raio pesado do mini-chefe:** um por ciclo.
  - **Golpe:** raio negro ramificado com halo magenta; deixa cratera, rachaduras e arco residual.
- **Teste de esquiva:** um "jogador" que só reage às marcas nunca levou dano.

### Mini-chefe — Katana Dragão Carmim

O desenho original segue a referência A:

- lâmina longa com curvatura e ponta fina, corpo escuro e fio vermelho luminoso;
- cabo vermelho trançado e guarda circular negra;
- dragão negro **esculpido** (corpo tubular escamado, espinhos, cabeça com chifres, mandíbula e olhos em brasa) enrolado no terço superior da lâmina;
- chamas carmim com pontas pretas e brasas que sobem no mundo, independentes da lâmina.

| Combo | Contatos | Duração | Notas |
|---|---|---|---|
| Presa Carmim | 0,56 e 1,02 s (X) | 1,62 s | ombro e quadril preparam, passo curto |
| Iaijutsu Abissal | 0,80 s | 1,60 s | guarda baixa de saque (o modelo não tem bainha), carga, dash de 2,8 m, freio; escolhido pela IA a 2,2–5 m |
| Fúria do Dragão | 1,16 s | 2,25 s | salto com gravidade, corte vertical, fissura em linha (pode ser saltada) e dragão de energia original saindo da lâmina |

- **Clipes:** os três combos são AnimationClips gerados no carregamento pelo assador de IK da Mod 244, com uma pose de katana própria.
- **Dano:** só pela trajetória amostrada da lâmina. Telegraph no chão, recuperação punível (+15%) e nada de atravessar parede ou herói.
- **Fúria abaixo de 40%:** transição com armadura que cancela magias canalizadas, emissivo pulsante, chamas maiores e recargas menores.

### IA

Usa o mesmo cérebro por utilidade da esquadra:

- **Escolha:** alcance, linha de visão, recargas individuais e intervalo global entre magias; teto de magias grandes simultâneas.
- **Alternância:** o mesmo poder duas vezes seguidas pesa menos.
- **Punição:** o Iaijutsu é escolhido pela distância e pune o dash e a recuperação do herói.
- **Leitura justa:** reações com tempo humano. Nada lê comando futuro.

A IA do Enemy2 não foi alterada.

### Animações: o que é clipe e o que é procedural

- **Clipes GLB reais:**
  - Idle, Walking e Running;
  - Attack: o golpe comum do Enemy3, acelerado 2,15× para casar com a janela de 0,58 s;
  - Skill_03 como base das conjurações;
  - dash;
  - **Dead**, que agora toca na morte do Enemy3 e do Enemy4.
- **Clipes gerados por IK no carregamento:** os três combos da katana.
- **Camadas procedurais por cima dos clipes (ossos apontados no mundo):**
  - braço da singularidade (estende, sobe, sustenta, arremessa, follow-through);
  - braços abertos e regência da barragem;
  - mãos ao céu, gesto de comando e cabeça para trás na tempestade;
  - fúria;
  - recuo leve e pesado;
  - inclinação no strafe;
  - katana abaixada ao conjurar (troca espada ↔ magia).
- **Não existem clipes GLB novos.** Strafe usa o Walking, e virar no lugar usa a rotação da cápsula.

### Áudio

`worldAudio.abyss3` sintetiza, sem arquivos externos:

- carga gravitacional e trovão da tempestade;
- rasgo espacial, aviso elétrico e trovão;
- raio pesado, disparo de espada e espada cravando;
- arremesso e impacto.

O volume cai com a distância até o herói e há teto de simultaneidade por tipo. Não houve audição humana.

### Conforto

Tremor de câmera e hitstop só em acerto confirmado, com trava contra duplo disparo, e respeitando `userSettings.reduceShake`. A câmera nunca é sequestrada. O domo e a singularidade se abrem quando a câmera entra neles.

## 3. Mudanças no motor compartilhado (mínimas e compatíveis)

- `enemy1-squad3d.js`:
  - conjuração canalizada (`channel`, `act.spellId`), que pode ser interrompida antes do disparo final;
  - golpes nativos com faixa de distância (`range`);
  - gancho pós-golpe (`after`);
  - velocidade do clipe do golpe comum (`animSpeed`).
  Sem esses campos, Enemy1 e Enemy2 se comportam como antes.
- `enemy2-squad3d.js`: `pullOn` também soma a atração de poderes que definem `pull`. Para o Enemy2 o resultado é o mesmo.
- `enemy1-squad-runtime3d.js` — **vazamento corrigido**:
  - **Causa:** cada clone esfolado recriado deixava uma textura de ossos (desde a Mod 237).
  - **Correção:** `skeleton.dispose()` ao descartar.
  - **Resultado:** 8 ciclos com 48 encontros mantêm 82 geometrias, 8 texturas e 39 programas, nas qualidades alta e baixa. Antes, eram +6 texturas por ciclo.
- `mundo-3d-prototype.js`: integração mínima.
  - Encontros: `e3SquadPack`, `squadRig`, `squadHp`, mapeamento de rig, nomes, eventos, áudio, hitstop e escurecimento.
  - Laboratório `?testeEnemy3=1` em faixa aberta.
  - Ajudas de QA em `?debug3d=1`.
- `audio3d.js`: `abyss3`.

## 4. Testes e medições

- **`node --test`:** **290 aprovados, 0 falhas.**
  - 16 testes novos: 15 em `enemy3-squad.test.mjs` e 1 de integração.
  - Cobrem ciclo de vida, cancelamento por atordoamento/morte, colisão com alvo/chão/parede, queda ao expirar, dano único, i-frames, recargas, separação e teto de raios, esquiva, leque, fúria, combos a 20/60/120 FPS, determinismo a 30/60/144 FPS e limpeza após ciclos.
  - Dois testes de integração antigos receberam a nova flag e o novo mapeamento de rig; a intenção deles foi mantida.
- **Chromium headless (SwiftShader), 430×860 com toque emulado:**
  - **Erros:** sem erro de página/shader no laboratório comum, no mini-chefe e no caminho real `startPack` dos perfis `demon3` (2 Enemy3) e `miniboss3` (Enemy4). Os dois encontros fecharam e chamaram `onDone`.
  - **Avisos:** os 192 avisos `PropertyBinding` apareceram ao carregar o Enemy1 legado no fim do encontro fora do laboratório. Não vêm do código novo.
- **Chamadas de desenho na mesma câmera, com o mini-chefe:**
  - cena 64 → singularidade 70, barragem 65, tempestade 65;
  - na prévia isolada, a cena inteira com magias fica em 17–49 chamadas.
  - O alvo de 120 para o VFX ficou folgado. O FPS do SwiftShader (1–6) **não** representa celular.
- **Evidências:**
  - [poderes](../evidencias/mod245/poderes-enemy3.jpg)
  - [katana](../evidencias/mod245/katana-dragao-carmim.jpg)
  - [jogo em tela de celular](../evidencias/mod245/jogo-celular-mini-chefe.jpg)
  - Prévia: `enemy3-preview.html?k=singularity|barrage|nadir|katana|Katana_Presa|Katana_Iai|Katana_Dragao&boss=1&t=segundos`.

## 5. Comparação com as referências (honesta)

- **A — Katana:**
  - **Fiel:** perfil longo com sori, fio vermelho, cabo trançado, tsuba negra, dragão enrolado com volume e chamas carmim de pontas pretas com brasas.
  - **Diferenças:** o dragão é bem mais simples que a ilustração (malha leve para celular). A arma fica fina vista de longe, então a leitura vem do fio e das chamas.
- **B — Barragem:**
  - **Fiel:** fendas rasgadas verticais/oblíquas, centro negro, contorno quebrado, rachaduras e espadas negras com fio carmim saindo inclinadas.
  - **Diferença:** as espadas em voo aparecem mais como traço vermelho do que como silhueta grande.
- **C — Tempestade:**
  - **Fiel:** redemoinho visto de baixo com vazio negro, borda interna rosa, bandas magenta/negras, veios carmesim e raios negros com contorno magenta caindo em crateras.
  - **Diferença:** é um efeito de céu local (discos em camadas), não volumétrico.
- **D — Domo:**
  - **Fiel:** hemisfério opaco lilás/rosa com rasgos de tinta preta, interior quente e coroa negra recortada na base; dissipa por erosão.
  - **Diferença:** o interior laranja aparece mais na base do que no centro inteiro.
- **E — Vídeo:**
  - **Fiel:** núcleo negro, aro quente em camadas e linhas horizontais atravessando o disco; nasce minúscula na palma, cresce, sobe e gira sem parar.
  - **Ausente:** distorção de tela real. Usei halo de lente escuro como alternativa leve para celular.

## 6. Não feito ou limitações

- **Ambiente de teste:** sem Android físico, sem medição real de FPS/GPU/temperatura e sem audição dos sons.
- **Ato III:** não houve passagem manual completa. O mesmo caminho do roteiro (`startPack` com `demon3`/`miniboss3`) foi exercitado pela ajuda de QA.
- **Animação:**
  - não há bainha no Enemy4, então o Iaijutsu usa guarda baixa de saque;
  - knockdown/levantar e bloqueio com clipe próprio não existem nos GLBs, então não foram inventados;
  - o recuo é procedural.
- **Briefing:** `CLAUDE-ENEMY3-MINIBOSS3-SKILLS-IA-ANIMACOES-TAREFA.md` foi mantido na `main` para o criador decidir.
