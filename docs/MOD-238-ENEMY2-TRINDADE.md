# Mod 238 — Enemy2 "Trindade", mini-chefe com foice de fogo e revisão de X, Portais e Dragão

## O que mudou

### Esquadra multiespécie

A esquadra da Mod 237 (`enemy1-squad3d.js`) agora aceita espécies e poderes registráveis (`registerKind`, `registerSkill`). O Enemy1 continua igual. O Enemy2 entra com tuning, kit e ritmo próprios em `enemy2-squad3d.js`.

- **Ato II:** os grupos de 3 e 5 (`surgir-tres` e `surgir-cinco`), os guardas e o mini-chefe (`miniboss2`) agora lutam ao mesmo tempo.
- **Encontros com Enemy2 também migrados:** o massacre do Ato I e os outros `startPack({rig:'enemy2'})`.
- **O que ficou como antes:** HP, mira, MIRAR alternando o alvo, `onEach`/`onDone`, recompensas e saves seguem o fluxo da Mod 237.
- **Alturas medidas pelo esqueleto:**
  - Enemy2 comum: cerca de 1,03× a altura-alvo do Enemy1.
  - Mini-chefe: 1,3×, em vez da escala antiga ×1,8 sobre um modelo já grande.

### Os três poderes do Enemy2

**1. Julgamento do Vórtice Abissal**
- Um portal horizontal abre acima da cabeça do Enemy2.
- Dele sai **uma** corrente contínua: um tubo 3D grosso refeito a cada quadro sobre o caminho real da ponta.
- A corrente faz **três investidas**. Cada uma mira a posição prevista com um limite, avança com giro limitado e segue reto depois de passar por quem esquivou.
- Colisão por varredura de cápsula, com um dano por investida.
- Para em parede e no chão, e colide com magias do herói (contra-selo).

**2. Trindade do Caos**
- Exatamente três funis turbulentos sobem do chão.
- O primeiro pressiona a posição do alvo; os outros dois fecham os flancos esquerdo e direito, com velocidades próprias e separação mínima entre eles.
- Sucção leve, com teto de 1,6 m/s somando tudo.
- Dano por contato com intervalo de 0,8 s.
- Os funis se ligam por raios quando se aproximam.

**3. Colapso do Abismo**
- **Fissura:** abre-se no solo, com runas e rachaduras, onde a fuga é provável. Com furacões em campo, ela vai para o lado oposto a eles.
- **Convergência:** atrai com sucção leve.
- **Coluna:** sobe turbulenta e implode.
- **Onda de choque:** horizontal e baixa (0,45 m). Pode ser **saltada** ou esquivada com dash.

### IA do Enemy2

Ela vai além da IA do Enemy1:
- decide mais rápido;
- defende e esquiva mais, mas ainda erra;
- **avança com dash para interromper** quem está conjurando;
- tem papéis de controle de área, perseguidor e interceptador;
- espera uma pausa entre magias;
- no máximo dois poderes grandes ficam em campo na esquadra ao mesmo tempo.

### Mini-chefe do Ato II

**Arma:** a Foice do Vulcão Sepultado (`infernal-scythe3d.js`), arma original.
- Haste de obsidiana com vértebras e crânio com chifres.
- Lâmina em crescente com gume em brasa.
- **Fogo laranja volumétrico:** línguas de chama instanciadas (`flameGeometry` com material `cinder`) que crescem no golpe e na fúria.
- **Empunhadura:** presa à mão. O rig do Enemy2 não tem dedo mínimo, então a orientação vem da normal da palma.

**Combate:**
- combo de 3 cortes com alcance de 3,4 m;
- finta;
- fúria aos 50%, com recargas ×0,7;
- **Ceifa do Furacão:** quando o combo acerta, um furacão sai da lâmina (variação da Trindade, não um quarto poder);
- 480 → 650 de vida.

### Ataque genérico do Enemy1 e do Enemy2 (corrigido)

O ultimate genérico do kit antigo ainda disparava durante a esquadra, pelos limiares de vida do procurador do foco. Era o "Ritual do Último Sacrifício" no Enemy1 e o "Furacão Infernal" no Enemy2. Agora ele fica desligado na esquadra (`updateBossUltimates`). Chefes e outros inimigos mantêm os seus.

### Poderes do herói

**Ruptura em X**
- Cada lâmina virou um crescente volumétrico: seção elíptica varrida num arco.
- Corpo de energia carmesim e núcleo incandescente.
- Rastros volumétricos nas pontas.
- Os cortes do impacto também são volumétricos.
- Saíram as linhas soltas que liam como rabisco.

**Portais da Perseguição**
- Aro limpo e grosso, túnel de profundidade atrás do disco e orientação que nunca fica de lado para a câmera.
- Corpos alongados em carmesim e violeta profundos.
- Saíram as linhas soltas.

**Dragão do Julgamento**
- **Boca:** muito maior. A mandíbula ficou mais larga e longa e abre até ~92°.
- **Dentes e garganta:** dentes nas duas arcadas e garganta incandescente.
- **Olhos:** de chama, amendoados, com pupila em fenda.
- **Bola de fogo:** dourada e turbulenta, uma massa de línguas de chama que muda de forma, com compressão pulsante antes do disparo.
- **Mordida:** explosão enorme, com camadas de impacto, corona e brasas.
- **Rastro no chão:** fogo vivo que segue o caminho real da cabeça e o ponto de queda da bola.

## Laboratórios

Os dois são isolados do progresso: o save fica na memória da página.

| Laboratório | Link | Botões |
|---|---|---|
| Enemy2 | `mundo-3d-prototype.html?testeEnemy2=1&todasHabilidades=1&mod=238` | 1, 3, 5, MINI-CHEFE, + ALIADO, CLASH, PODER (força o próximo poder), ↺, LOG |
| Enemy1 | `?testeEnemy1=1&todasHabilidades=1` | Continua igual |

**Prévias isoladas:** `enemy2-preview.html` e `skills-mod233-preview.html`.

## Validação executada

- **Testes automáticos:** `node --test` aprova 259 testes. `enemy2-squad.test.mjs` cobre:
  - kit próprio e um de cada poder grande por vez;
  - Vórtice com uma corrente e três investidas, esquiva com i-frames;
  - Trindade com três funis, flancos, separação e teto de sucção;
  - Colapso com coluna e onda, salto sobre a onda e fuga para fora do raio;
  - pressão territorial;
  - mini-chefe com combo, fúria e Ceifa do Furacão;
  - interrupção de conjuração.
- **Chromium headless com SwiftShader, viewport de celular:**
  - laboratório Enemy2 com 3 e com 5 + aliado, e com o mini-chefe;
  - laboratório Enemy1 (regressão);
  - X, Portais e Dragão no laboratório da Mod 236.
  - Sem erros de página.

## Limitações

- **Android físico não testado:** o FPS do celular não foi medido. O SwiftShader roda a 0–3 FPS e não serve como referência.
- **Animação:** o Enemy2 não tem clipe de defesa nem de dano. A defesa usa o clipe de dash/ataque com recuo procedural, e as magias usam `attack` (Skill_03) com a camada de pose.
- **Aliado:** o NPC aliado contra o Enemy2 só aparece no laboratório.
