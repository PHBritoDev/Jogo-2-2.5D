# Mod 249 — VHAZRAEL: Ruptura do Trono Abissal (ataque especial de espada) refeita

## Auditoria da versão anterior (Mod 248)
A Ruptura parecia um "objeto rosa pequeno" por quatro motivos:

1. **Elementos pretos invisíveis.** Os filamentos e as bordas pretas usavam o `ribbons` aditivo do kit, e preto somado não aparece.
2. **Cores sem conversão de espaço.** Os shaders escreviam cores pensadas em sRGB e depois passavam pela conversão linear→sRGB. O vermelho (1, .1, .2) virava rosa claro.
3. **Pilar fino.** O pilar era um cilindro liso de ~0,9 m de raio, preso só na ponta da lâmina, sem massa nem camadas.
4. **Golpe sem escala.** O "feixe" era uma fita baixa de ~2 m, e o impacto era um domo de 4 m. O golpe durava 1,5 s, com uma pose de três estados.

Também faltava superarmadura:
- stagger, quebra de postura e transição de fúria anulavam o `act` do bispo;
- isso cancelava o golpe (`throneEnd: interrupt`);
- a vida zerada matava o bispo no meio do golpe.

## Arquitetura nova

| Arquivo | Papel |
|---|---|
| `vhazrael3d.js` | Lógica pura, 120 Hz. Linha do tempo única (`s.age`): `raise` (0–1 s) → `charge` (1–2,3 s) → `slash` (preparo, mira travada com antecipação do alvo) → `wave` (feixe, 46 m/s, até o alvo, até 32 m ou até um obstáculo) → `impact` (2,3 s; explosão secundária em +0,45 s) → `fade` (2,4 s). Um dano por alvo (feixe 26 ou colisão 14, raio 6). |
| `enemy1-squad3d.js` | Superarmadura genérica `act.unstoppable` (ver abaixo). |
| `vhazrael-choreo3d.js` | Quadros-chave da pose (`thronePose`), compartilhados pelo corpo/espada e pelo rastro do corte. O pilar, o leque e a lâmina nunca se descolam. |
| `enemy3-runtime3d.js` | Camada procedural com as duas mãos no cabo: erguer, sustentar com tremor, preparo, corte e follow-through. Só braços, peito (≤ 9°) e espada se movem; quadril e pés ficam no Idle. A lâmina é orientada pela coreografia, com o gume no plano do golpe. |
| `vhazrael-rupture3d.js` | VFX novo, todo procedural e original. Cores em faixas duras (cel), preto opaco e recorte perto da câmera. |
| `mundo-3d-prototype.js` | Som e tremor por etapa, impact frame curtíssimo no corte (com "reduzir flashes" vira um escurecimento leve), clarão curto no impacto e aviso "SUPERARMADURA". Na carga e na colisão, a câmera de 3ª pessoa recua, sobe, abre o FOV e inclina para revelar a escala. Esse deslocamento vale só para o quadro desenhado: não se acumula, não trava controle e fica acima do terreno. |

**Superarmadura (`act.unstoppable`).** A Ruptura declara `unstoppable` e o ato recebe `uninterruptibleSwordSpecial`. Durante o ato:
- `stagger()` é ignorado;
- knockback e empurrões são zerados, e o procurador do herói não arrasta o bispo;
- a transição de fúria fica adiada (`phase2Due`);
- vida zerada mantém o bispo com 1 HP (`deathDue`) até o fim do ato, e então ele morre uma única vez.

Só o cleanup sistêmico aborta o golpe (parar a luta, sair da dimensão, remover o ato). Nesse caso a magia é limpa na hora, sem hitbox fantasma. O dano normal continua entrando. Bloqueio e esquiva do herói seguem as regras de sempre.

## Coreografia visual

**A · Erguer (0–1 s)**
- Filamentos negros/violeta convergem em espiral para a guarda.
- Brasas douradas sobem.
- Linhas de vento correm rente ao chão.
- Veios negro/carmim se enrolam na lâmina.
- Pedras levantam do chão e a luz da arena cai (`dim`).

**B · Carga (1–2,3 s)**
- Pilar de ~58 m saindo da lâmina, em três camadas deformadas por ruído advectado:
  - núcleo branco aditivo;
  - chama carmim/magenta em faixas;
  - casca negra/violeta rasgada nas bordas.
- Espirais helicoidais, anel de ignição e línguas de chama na base.
- Trilha de aviso no chão, na direção do olhar do bispo.

**C · Corte (2,43–2,62 s)**
- O pilar acompanha a lâmina e desaba para a frente.
- Leque de rastro.
- Flare em cruz vermelho.

**D · Feixe**
- Tubo elíptico que alarga até 4,6 m × 7,2 m: núcleo branco e bainha vermelha/negra que escoa.
- Parede carmim na frente.
- Línguas de chama abrindo em V e crista superior.
- Gavinhas negras nos flancos.
- O chão se abre atrás da frente: fissura de magma tripla, placas que se erguem e detritos balísticos lançados pela frente de choque.

**E · Colisão em fases**
1. Implosão.
2. Clarão branco-quente.
3. Choque com quatro anéis supersônicos.
4. Domo roxo/magenta com rasgos negros, coluna vertical e raios.
5. Explosão secundária amarelo-branco/laranja em camadas, com cogumelo, rochas, arcos crescentes brancos e brasas.
6. Dissipação por erosão e fragmentação.

A cratera e a fissura esfriam devagar.

**Leitura em combate**
- As superfícies opacas recortam um cone "raio-X" entre a câmera e o herói, com borda irregular. O herói continua visível dentro do pilar, do feixe, do domo e do fogo.
- Superfícies muito perto da lente também são recortadas.
- O efeito usa cerca de 10 chamadas de desenho extras (tudo instanciado ou em buffers fixos, sem alocação por quadro). A qualidade baixa reduz as contagens.

## Adendo visual do criador (aplicado)
- **Base e explosão:** as massas arredondadas e a fumaça cinza dominante deram lugar a lâminas de energia oblíquas e serrilhadas, com perfil triangular, abrindo em V:
  - carmim/branco com casca negra/violeta no choque;
  - amarelo-branco/laranja na explosão secundária.

  Algumas massas pequenas ficam só como núcleo de apoio.
- **Pilar:** mais rígido e direcional, com faixas verticais brancas/vermelhas convergentes, menos ondulação, raios brancos verticais irregulares nas laterais e duas faixas escuras horizontais cruzando-o.
- **Pedras negras:** angulares, de tamanhos e formas variados, sugadas em espiral e girando.
- **Luz carmim:** cobre céu, névoa, hemisfério, sol e preenchimento durante a carga e o disparo, com queda gradual. A cor de base é guardada a cada quadro e devolvida integralmente no fim.
- **Bloom seletivo:** não aplicado. O jogo não tem pós-processamento, e um bloom só para este golpe custaria caro no celular. O brilho vem de cores em faixas e de núcleos aditivos.

## Testes
- **`node --test`:** 309 aprovados, 0 falhas, incluindo os testes novos do Mod 249:
  - fases e eventos na ordem;
  - um dano por alvo e esquiva por i-frames;
  - spam de golpe e dano com stagger, knockback e quebra forçados a cada 1/3 s;
  - dano letal que adia a morte para depois do golpe, com uma única morte;
  - fúria adiada;
  - cleanup sistêmico sem hitbox fantasma.
- **Chromium headless (SwiftShader):**
  - prévia isolada (`vhazrael-preview.html?k=throne&t=…&cam=wide|hero|back|side&d=…`) com o Bispo1-lod.glb real;
  - jogo no laboratório (`?testeVhazrael=1`) em tela de celular 430×860, com capturas por etapa;
  - jogo também em paisagem 900×405, com capturas por etapa;
  - teste de spam (toques no GOLPE, magia, ULTIMATE e dano de 25 por amostra, com dano letal no meio) durante o golpe, também em tela de celular: o bispo seguiu no golpe até o fim com 1 HP e só então morreu;
  - regressão: Skills 1–3 e Extinção Orbital completas no laboratório, e os labs do Enemy1/Enemy2, todos com 0 erros de console.
- **Evidências:** `docs/evidencias/mod249/` (prévia completa, adendo, jogo em paisagem do início à recuperação, luz carmim, pilar e herói visível).

## Limitações
- Não testado em Android físico. FPS real não medido (SwiftShader não serve para isso). Áudio não ouvido.
- O vídeo de referência foi estudado quadro a quadro como direção de arte (composição, timing, paleta). Nenhum modelo, textura, quadro ou áudio de Fate foi usado.
- A suavidade da animação depende da camada procedural sobre o Idle. O GLB não tem clipe nativo de "erguer a espada".

Link: https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?testeVhazrael=1&mod=249
