# Mod 285 — VÉRAXION (Bispo 4): Skill 1 "QUATRO SENTENÇAS DO ABISMO"

**Situação: o PR fica ABERTO, sem merge.** A cena funciona de ponta a ponta no jogo. Os testes passam, e no Chromium não houve erro de JavaScript nem de shader, nem arquivo faltando. Mas, na comparação lado a lado com as quatro referências, a fidelidade visual **ainda não chega aos 80–100%** que o criador exige para o merge. As estimativas abaixo são subjetivas, feitas olhando as capturas, não calculadas por software.

## O que foi implementado
- **Lógica** (`veraxion-four-swords3d.js`, sem WebGL, testável):
  - **Linha do tempo determinística por segundos reais:**
    1. aura;
    2. as duas mãos sobem (0,6 s);
    3. quatro espadas se materializam (1,1–2,25 s, uma a cada 0,08 s);
    4. quatro destinos travados (2,1 s);
    5. **salva única** (`release_all4`, emitido uma vez, com as quatro espadas no mesmo timestamp);
    6. voo em Bezier com aceleração;
    7. a espada crava;
    8. **sucção de 0,34 s**;
    9. explosão;
    10. dissipação.
  - **Duração total:** cerca de 5,6 s.
  - **Colisão varrida:** segmento da lâmina contra a cápsula do herói, testado numa grade fixa de 0,2 m de arco. Por isso o resultado é o mesmo a 10 e a 60 FPS (há teste para isso).
  - **Destinos:**
    - um no herói, com antecipação limitada;
    - três em triângulo assimétrico;
    - centros a pelo menos 6 m uns dos outros;
    - dentro da arena (raio 30, com margem de 2,6 m);
    - fora de obstáculos (`blockedAt`).
  - **Dano:**
    - espada 12 e explosão 16 (raio 3 m), separados;
    - cada espada acerta no máximo uma vez e cada explosão uma vez;
    - passa por `pHit` (o caminho canônico, que respeita dash, i-frames e defesa);
    - **nenhum evento carrega impulso**: não há knockback.
  - **Bispo:** fica preso só até 0,45 s depois do lançamento. Morte do bispo ou do herói, troca de perfil, cinematografia ou reset da dimensão abortam sem dano e limpam tudo.
- **Espada** (`veraxion-sword-model3d.js` → `EspadaVeraxion.glb`, 118 KB, cerca de 3,9 mil triângulos):
  - **Gerada por código autoral:** `node tools/build-veraxion-sword-glb.mjs`. Há teste que confere se o GLB no disco é igual ao gerado.
  - **Forma:** pomo com espinho e coroa de garras, rubis, empunhadura trançada, guarda com chifres que sobem e garras que descem, costelas em crescente, lâmina em losango com farpas e ponta extrema.
  - **Uso no jogo:** é um único asset em cache. As quatro instâncias compartilham a geometria e cada uma tem seus próprios uniforms.
  - **Tamanho:** 2,0× a altura visual real do bispo, medida pelo Box3 do modelo animado.
- **VFX** (`veraxion-four-swords-vfx3d.js`):
  - **Aura:** línguas pretas translúcidas com contorno rubro e franja cromática, presas a 14 ossos (um draw call). Há também uma casca de skinning aditiva no corpo, com deslocamento cromático vermelho/ciano, e um brilho local. A intensidade cresce de forma suave até cerca de 1,35.
  - **Espadas:**
    - shader de obsidiana com fio prateado, canais e veios rubros, rubis acesos e materialização do pomo para a ponta com borda em brasa;
    - fendas rúnicas verticais e halo vermelho local;
    - fitas negro-rubras partidas em espiral;
    - ficam translúcidas perto da câmera.
  - **Voo:** rastro em fita com memória de posições, amostrado por distância (preto, com borda rubra e fragmentos de raio violeta), mais um pool de raios violeta quebrados e faíscas.
  - **Sucção:** espirais convergindo e anel fechando (violeta/vermelho), raios e brasas que vão para o núcleo, e o núcleo que compacta.
  - **Explosão:**
    - cogumelo em billows instanciados (as quatro explosões num draw call): núcleo, coluna, copa em toro, topo e saia;
    - paleta de fumaça → brasa → laranja → ouro → branco;
    - três anéis de choque de fumaça com borda de fogo (instanciados);
    - flash, brasas, raios violeta na base;
    - dissipação para fumaça escura, com transparência pontilhada muito perto da câmera.
  - **Pools:** tudo é criado uma vez e nenhum mesh é criado por quadro. O modo low reduz só a decoração (billows, partículas, casca cromática), nunca o dano ou a física.
- **Integração** (`mundo-3d-prototype.js`, `powers3d.js`):
  - **Slot e disparo genérico:**
    - `KITS.veraxion.s1` (também usado pelo `fallen4`) agora é `veraxion_four_swords`;
    - o antigo **Fogo Abissal foi EXCLUÍDO**: `case 'abyss'`, `abyssFlame` e `BOSS_POWERS.veraxion`/`fallen4`, o disparo periódico genérico. Nenhum outro poder usava essas funções;
    - s2, s3, espada e ultimate do Bispo 4 não mudaram.
  - **Pose `vx4`:** a pose de verdade das duas mãos fica ligada ao relógio da habilidade; ombro, cotovelo e mão sobem acima da cabeça. No jogo, `handsUp` mede cerca de +0,5 m acima da cabeça durante o cast e −0,8 m depois do arremesso.
  - **Bispo durante o cast:** fica parado e virado para o herói, preservando Y, rig e mixer.
  - **Câmera:** plano 3/4 leve (`ultCam` com peso 0,3 e o mesmo yaw), FOV +3 no lançamento e −4 na primeira explosão, tremor por trauma desfeito antes da câmera do quadro seguinte e respeito a `reduceShake`.
  - **Som:** usa `abyss3` (gravity, storm, tear, warn, launch, blade, stick, boom, heavy).
  - **Teste:**
    - `?testeDimensao=bishop4&testQuatroEspadas=1` (o `bishop4` passou a ser aceito no teste de dimensão);
    - botões no painel das dimensões e no laboratório;
    - função de depuração `SevenSinsDebug3D.vxState()`.

## Testes executados
- **`node --test`:** 416 passando, 5 falhando. **As 5 falhas já existiam na `main`**, conferido com as mudanças guardadas:
  - `tools/visual-lab/*` sem o módulo `sharp`;
  - Mod 262 "não sobrepõe";
  - Mod 278.
  - Os 6 testes novos de `veraxion-four-swords.test.mjs` passam. Eles cobrem:
    - a ordem das fases;
    - a salva no mesmo instante;
    - os destinos;
    - o tamanho da espada;
    - dano separado e uma vez só;
    - AoE sem contato;
    - i-frames e dash;
    - nada de dano fora do raio;
    - ausência de knockback;
    - o mesmo resultado a 10 e a 60 FPS;
    - interrupção;
    - o slot genérico excluído;
    - o GLB.
- **Jogo real no Chromium headless (SwiftShader), `?testeDimensao=bishop4&testQuatroEspadas=1`:**
  - quatro execuções: paisagem high, retrato high, paisagem low e retrato low;
  - **0 erros de JS ou shader e 0 respostas ≥ 400 em todas**;
  - todas passam pelas fases aura → manifest → aim ×4 → fly ×4 → stuck ×4 → blast ×4 → gone, com o herói levando 23 de dano;
  - pico de draw calls: 47 (high) e 45 (low);
  - pico de triângulos: cerca de 353 mil (high) e 229 mil (low).
- **FPS:** SwiftShader não serve para medir FPS. Não houve teste em Android nem em GPU real.

## Comparação com as referências (avaliação visual honesta)
| Referência | Resultado | Estimativa | O que falta |
|---|---|---:|---|
| Aura (humanoide negro) | Línguas pretas com borda rubra e franja cromática presas ao corpo, mais casca rubra | ~55% | O modelo do Bispo 4 é claro (capuz e manto), não uma silhueta negra. As chamas ainda parecem fios separados, não o "vapor viscoso" contínuo da ilustração. |
| Espadas | Silhueta reconhecível (guarda com chifres, rubis, lâmina longa e ponta extrema) e metal preto-prateado com veios rubros | ~65% de perto, menos na câmera de jogo | Falta a densidade de ornamentos da arte, o brilho rubro intenso e as fitas de fumaça espessas. Na câmera do jogo as espadas ficam pequenas e os detalhes se perdem. |
| Raios | Raios violeta quebrados, faíscas e espirais de sucção | ~60% | Os raios são finos e espaçados. Na referência eles são mais grossos e brilhantes, com ramificações. |
| Explosão | Cogumelo (coluna, copa, anéis cinza e raios violeta na base), com cores laranja/ouro e núcleo branco no pico | ~60% | A referência é muito mais luminosa (núcleo branco-amarelo com glow), com billows menores e mais densos. Os nossos parecem bolhas sólidas sombreadas e escurecem cedo demais. |

**Conclusão: abaixo de 80%, então NÃO houve merge.** Próximos passos recomendados:
1. glow e bloom local barato, ou impostor flipbook, para a explosão;
2. trocar os billows opacos por sprites volumétricos com mais camadas;
3. dar à aura uma silhueta escura (escurecer o material do bispo durante o cast) e usar faixas de fumaça mais largas;
4. pôr na espada mais ornamentos de geometria e fitas de fumaça;
5. fazer a câmera 3/4 enquadrar o bispo mais de perto durante a materialização.

## Evidências
`docs/evidencias/mod285/`:
- `comparacao-*.jpg`: referência e resultado lado a lado;
- `jogo_<modo>_<t>.jpg`: capturas reais do jogo nas fases (high/low, paisagem/retrato);
- `grid_*.jpg`: as fases em sequência.

## Pesquisa
- **Three.js (documentação):**
  - sistema de animação e AnimationMixer (a pose fica sobre o mixer e é ligada ao estado real);
  - InstancedMesh e otimização de muitos objetos (billows e anéis instanciados);
  - transparência e profundidade (`depthWrite:false` nos VFX e transparência pontilhada nas billows opacas);
  - atualização de uniforms sem recompilar (`material.clone` compartilha o programa).
- **Colisão contínua:** distância segmento–segmento (Ericson, *Real-Time Collision Detection* §5.1.9) com amostragem por arco fixo.
- **Rastros:** ring buffer de amostras por distância, fita voltada para a câmera, largura que diminui com a idade.
- **VFX de anime:** antecipação → impacto → dissipação; sucção antes da explosão; anéis de choque de condensação como na referência.
