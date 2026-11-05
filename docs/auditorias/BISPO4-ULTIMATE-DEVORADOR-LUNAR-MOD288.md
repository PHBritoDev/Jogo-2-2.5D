# Mod 288 — VÉRAXION (Bispo 4): Ultimate "A QUEDA DO DEVORADOR LUNAR"

**Situação: o PR fica ABERTO para o autor testar antes do merge.** Duas das sete referências do briefing **não foram enviadas nesta conversa**:
- `1000362894.jpg` (o Bispo com o X rubro no olho);
- `1000362808.mp4` (impacto de anime com orbe escuro).

O que depende delas (o close do X no olho e o ritmo do choque) foi feito a partir da descrição do briefing e **não foi comparado lado a lado**.

**Referências analisadas:**
- explosão na Terra (imagem);
- sistema solar (imagem);
- Lua com a Terra (imagem);
- Devorador violeta (imagem, girada 90°);
- vídeo do Sol com planetas (5 s; 8 quadros inspecionados);
- explosão azul (referência da Skill 2, enviada junto).

## Integração (sem regressão nas Skills 1 e 2)
- **Kit:**
  - `KITS.veraxion.ult` (também usado pelo `fallen4`) agora é `veraxion_lunar_devourer`;
  - `ULTIMATES.veraxion` e `ULTIMATES.fallen4` usam `at:[0.4]`, ou seja, **uma vez por luta**;
  - continuam excluídos: o Buraco Negro genérico, a s3, a espada especial e o Fogo Abissal.
- **Rota própria** em `updateBossUltimates`, que nunca passa pelo `startKitUlt`. Ela espera a S1 e a S2 terminarem (não as sobrepõe), e a S1 e a S2 não começam durante a ultimate.
- **Filme:**
  - `tickLunarUlt` roda no início do `animate()` e, enquanto o filme passa, **o resto do laço não roda**: nenhum segundo de combate passa (vida, recargas, IA, projéteis e dano ficam congelados);
  - a câmera do filme é própria (`lunarCam` / câmera da cena cósmica). A câmera do jogador **não é alterada**; a volta faz uma transição até a pose real do jogador.
- **Golpe final:**
  - na volta (26,0 s), um **aviso de 0,9 s** aparece sob o herói, e então vem **UM golpe de 32 de dano (capado)** por `pHit`, que respeita dash, i-frames e defesa;
  - quem sai do aviso ou usa o dash não leva dano;
  - nada de dano durante o filme e nenhum empurrão.
- **Controles do filme:**
  - botão **PULAR** pula para a volta, sem cancelar o golpe;
  - HUD escondida (`body.lunar-ult-cine`), barras de cinema e título;
  - `reduceShake` respeitado.
- **Teste:** `?testeDimensao=bishop4&testUltBispo4=1`. Também testado com a ultimate disparando naturalmente ao baixar a vida do bispo para 35% (`bossHp(.35)`).

## Plano a plano (filme de 26 s + 1,4 s de golpe)
| s | Plano |
|---|---|
| 0–3,8 | VÉRAXION real (rig GLB e mixer) com track-in frontal até o rosto. Aura escarlate presa a 13 ossos (cópia independente da família de aura da S1), casca vermelha/ciano e **X rubro em dois traços** preso ao osso da cabeça. Título e barras de cinema. |
| 3,8–8,2 | Cena cósmica separada, em escala artística. Travelling de Saturno (anéis) a Júpiter (faixas e grande mancha) com o Sol (granulação, manchas e coroa com raios), planetas variados, órbitas discretas, nebulosa, galáxia, estrelas em 3 camadas com parallax e poeira passando. Um rio de energia rubro-violeta aponta para a Lua. |
| 8,2–12,2 | Lua com crateras em relevo (mesma função na GPU e na CPU, para apoiar o monstro) e a Terra no céu (continentes, nuvens, gelo, luzes noturnas, atmosfera). O **Devorador** se revela de baixo para cima atrás da crista; depois a câmera circula até o 3/4. |
| 12,2–17,2 | `jaw_charge`: a cabeça ergue, a mandíbula abre e o peito infla. O **buraco negro** nasce na boca: núcleo negro que recorta, disco de acreção em 3 camadas girando a velocidades diferentes (quente por dentro, violeta por fora, efeito Doppler), anel de lente e matéria sugada em espiral. Cresce até cerca de uma cabeça do monstro. |
| 17,2–20,8 | `launch` e `recoil`. A travessia Lua → Terra com aceleração, rastro rubro-violeta e linhas de velocidade puxadas; a câmera alterna entre o lado e a perseguição, com a Terra crescendo. |
| 20,8–24,8 | Sucção curta (0,25 s) e **UMA explosão** sobre a superfície curva da Terra: domo de lóbulos instanciados apoiado na esfera, capa lisa com núcleo branco-amarelo, corpo laranja, crosta vermelha e fibras escuras, anel de choque que **corre pela esfera** (shader na casca), colar branco de fumaça na base, flash e detritos. Câmera rasante e inclinada. |
| 24,8–26,0 | A onda chega à arena (anel e flash quente) e a câmera desce até a pose do jogador. |
| 26,0–27,4 | Aviso sob o herói → golpe único → fim. |

## O Devorador (`veraxion-lunar-monster-model3d.js` → `DevoradorLunar.glb`, ~660 KB)
- **Geometria autoral por código** (`node tools/build-veraxion-lunar-monster-glb.mjs`):
  - quadrúpede de dorso alto e arqueado;
  - cabeça caprina baixa com focinho longo voltado para baixo e órbitas fundas;
  - **mandíbula separada** com 40 dentes finos;
  - **dois chifres colossais em meia-lua** que abrem para os lados e se curvam para cima até quase se tocar;
  - patas longas com cotovelos abertos e garras;
  - cauda que se enrola;
  - crostas na corcova.
- **Tamanho:** cerca de 8 mil vértices e 13,8 mil triângulos.
- **Esqueleto e skin:** 25 ossos e pesos suaves.
- **Clipes:** `lunar_idle`, `jaw_charge`, `launch` e `recoil`.
- **Material:** shader de **gravura** com hachuras de densidade constante no mundo, que só acendem onde a luz e a borda pegam, crostas, contorno rosa-lilás e chifres escuros com aresta clara e anéis; olhos acesos.
- **Teste:** um teste falha se o GLB no disco não for igual ao gerado.

## Testes
- **`node --test`:** 427 passando e 5 falhando. **As 5 falhas já existiam na `main`**: `tools/visual-lab` sem `sharp`, Mod 262 e Mod 278.
- **Novos** (`veraxion-lunar.test.mjs`):
  - os 8 planos em ordem, cada evento uma vez, iguais a 15/30/60 FPS;
  - filme de 24–30 s;
  - golpe único e capado com aviso de 0,9 s; dash ou sair do aviso evita; pular não cancela o golpe;
  - GLB com esqueleto, mandíbula, chifres e 4 clipes;
  - ultimate uma vez por luta;
  - rota própria;
  - Buraco Negro genérico continua excluído.
- **Ajustados:** testes que exigiam `ult:null` no Bispo 4.
- **Jogo real no Chromium headless (SwiftShader):**
  - `?testeDimensao=bishop4&testUltBispo4=1` em paisagem high e em retrato low, e o disparo natural a 35% de vida;
  - **0 erros de JS ou shader e 0 respostas ≥ 400**;
  - a câmera do jogador volta para a mesma pose de antes;
  - o herói leva 26 de dano parado (32 antes da defesa) e 0 saindo do aviso;
  - pico de 30 draw calls e cerca de 278 mil triângulos (o filme não renderiza o mundo nos planos cósmicos).
- **FPS:** SwiftShader não equivale a uma GPU Android. FPS real não medido.

## Comparação com as referências (julgamento visual, sem número inventado)
- **Devorador:** silhueta reconhecível (chifres em meia-lua quase se tocando acima da corcova, cabeça baixa com focinho e dentes, patas abertas, cauda) e o estilo de gravura lilás e rosa.
  - Ainda falta a pelagem "eriçada" do contorno do desenho.
- **Lua e Terra:** horizonte cinza de crateras com a Terra azul e branca no céu negro estrelado, como na referência.
- **Sistema solar e vídeo:** Sol granulado com coroa e raios, planetas distintos (Saturno com anéis, Júpiter em faixas, Terra) e nebulosa alaranjada. A composição é cinematográfica, não um diagrama.
- **Explosão:** domo laranja/amarelo com núcleo claro, crosta vermelha e colar branco sobre a curvatura azul da Terra.
  - A referência tem mais brilho difuso (bloom) e o anel branco mais largo.
- **X no olho:** **não comparado**, porque a referência não foi enviada.

## Evidências
`docs/evidencias/mod288/`:
- `jogo_*`: capturas reais do jogo (paisagem high e retrato low);
- `previa_*`: prévia da cena cósmica;
- `devorador_*`: o monstro sozinho, de frente, de lado e em 3/4;
- `fases_jogo.jpg`;
- `video-cosmos.mp4`.

As imagens do autor não foram enviadas para o repositório.

## Prévia
`veraxion-lunar-preview.html?t=3.8…24.8` (cena cósmica, com `&low=1` para o modo low).
