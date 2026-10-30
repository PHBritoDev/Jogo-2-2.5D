# Mod 234 — câmera, espadas e combate em movimento

Implementação do briefing Mod 232, integrada sobre a Mod 233 (`45466ef`). Quantum, inventário de palavras e as três novas magias foram preservados. Nenhuma alteração de economia, roteiro, mapa ou formato de save.

## Mudanças e causas corrigidas

- A câmera antiga escondia o corpo e desenhava uma espada sem mãos. `sword-viewmodel3d.js` usa 749 triângulos dos antebraços/mãos do **mesmo protagonista**, com IK de dois segmentos e arma presa à orientação da mão. Não desenha um segundo corpo completo. Inclui repouso, respiração, locomoção, três golpes, Eclipse, defesa, impacto, pulo e dash. Na Passagem em primeira pessoa, um enquadramento externo curto acompanha o avanço e devolve os valores de câmera anteriores. A ultimate também oculta/restaura os braços.
- Ataques básicos deixaram de bloquear o integrador de movimento. Clipes filtrados e ações reutilizadas combinam tronco/braços de ataque com quadril/pernas de locomoção. Sprint mantém 7,2 m/s dentro e fora do combate; a redução artificial para 3,2 m/s foi removida. Shift corre; F executa dash. Os botões de toque continuam disponíveis.
- A corrida do protagonista deixou de depender de retargeting em duas etapas. `Hero_Run` foi autorado no rig original, junto aos cinco clipes de espada. O GLB novo contém somente esqueleto/animações, preserva transformações originais e não contém tracks de escala. Os GLBs originais permanecem intactos. Fonte reproduzível: `tools/blender/mod232_sword_motion.py` (Blender 5.0.1).
- A correção dos NPCs é restrita à família inspecionada: `Npc-lod2`, `Enemy2-rig`, `Misteriosa-rig`, `Anjo-rig` e `Sandra-rig`. Apenas seis tracks de rotação dos braços em `Walking`/`Running` são reconstruídas usando os eixos do próprio rig. Idle, ataque, hit/death, pernas, raiz e asas permanecem nos clipes originais. O anjo passa a usar sua locomoção ao acompanhar o jogador, preservando o movimento das asas.
- Espada do Chamado: lâmina marfim, bordas metálicas, sulcos e guarda dourada. Aurora: aço escuro, arestas carmesim, canais violetas e guarda rubra. Geometria própria com espessura e detalhes, agrupada em seis materiais por arma. Vigília, Celeste e Quantum mantêm seus desenhos. A animação da Quantum também funciona nos materiais e órbitas clonados para primeira pessoa.
- Eclipse: quatro liberações da lâmina, origem em espaço mundial, direção horizontal explícita (`y=0`), velocidades 10–12,1 m/s e alcance de 18 m. A forma pode ser vertical; o deslocamento não sobe. A expansão inicial reduz a obstrução em primeira pessoa; colisão e visual usam o mesmo raio. Mira assistida só com lock-on, cone limitado, alcance, altura e oclusão válidos. Cada onda aplica dano uma vez, ao colidir.
- Passagem: corredor de três segmentos retos, desvio curto pela lateral da cápsula e término atrás do alvo, com validação de chão/obstáculos e limite de 7 m. Quatro movimentos corporais sustentam **16 cortes energéticos distintos**, de 0,65 a 1,60 s, dentro de uma ação de 1,95 s. Cada evento tem arco e timing próprios; o dano anterior é redistribuído, com 40% reservado à finalização. Pool limitado a 16 cortes, três trilhas, três pós-imagens e 192 partículas.

## Verificações executadas

Ambiente: Chromium com WebGL/SwiftShader em Linux, com controle de tempo da simulação. **Não havia Android físico nem vídeo do criador disponível.** Os 30/60/120 FPS abaixo são passos de simulação, não desempenho medido em um telefone. A renderização por software apresentou aproximadamente 1–2 FPS; não permite prometer 30–60 FPS em hardware Android.

- `node --test *.test.mjs`: **211 testes aprovados**, incluindo mira, colisão varrida, paredes finas, cápsula de boss, interrupção por obstáculo dinâmico, cancelamentos, mana/cooldown, isolamento do save e preservação do esqueleto.
- Validação do GLB: seis clipes, 52 juntas animadas, quaternions finitos/normalizados, sem mudança de escala, quadril sem root motion XZ, pés estáveis nas ações estacionárias e cotovelos dentro de limites anatômicos.
- Sprint em 5 s, mesmo corredor/input/terreno: **35,338334 m sem inimigo e 35,338334 m com inimigo engajado**. A distância inclui aceleração inicial.
- Vinte combinações de câmera × espada × direção com combo de três golpes correndo: deslocamento contínuo. Caminhada atacando e entrada real de teclado WASD também verificadas. Toque em GOLPE/rito/defesa, R, Shift, F, pulo, pausa e morte foram exercitados.
- Eclipse a 5/10/15 m em ambas as câmeras: 117 de dano total, sem dano antecipado aos 0,43 s; a 122 m: zero dano. Ondas expiram. Mira livre para trás e lados não curva para atingir o alvo. Seis capturas laterais/superiores registram três posições consecutivas da mesma onda com altura constante.
- Passagem em ambas as câmeras e passos de 30/60/120 FPS: 16 eventos, 76 de dano, 28 de mana, término atrás e câmera restaurada. Boss grande mantém afastamento seguro; corredor bloqueado recusa a ação sem consumir mana nem mover o herói.
- Troca repetida entre primeira/terceira pessoa, rotação completa e pitch extremo; cinco armas equipáveis; quatro magias anteriores e três novas; câmera da ultimate restaurada; treino não grava no armazenamento da campanha.
- HUD e botão contextual verificados em 844×390, 390×844 e 2340×1080. Após aquecimento, 55 usos completos (220 s simulados) mantiveram **439 geometrias, 32 texturas e 118 programas**, sem crescimento. Pools retornaram a zero.
- NPCs: corrida observada em duas fases por rig; reprodução numérica de todos os clipes em quatro fases, sem valores não finitos. Todas as transformações de entrada foram restauradas após o bake; os clipes fora de caminhada/corrida permaneceram os mesmos objetos. Isso não substitui teste físico de toda a campanha em Android.

Resultados estruturados e capturas estão em [`evidencias/mod234/`](evidencias/mod234/). `browser-results.json` registra direção/altura, dano, deslocamento, recursos e perfis de qualidade. Os três quadros `wave-side-*` e `wave-top-*` mostram progressão real da simulação. `fp-*`/`tp-*` mostram repouso, ataque e habilidade das duas espadas; `run-*`, a anatomia da corrida. As capturas de corrida/NPC são da implementação anterior à integração da Mod 233, sem alterações posteriores nesses rigs. `before-first-person.png` e `rival-before.png` são o baseline anterior à correção.

## Reprodução

Na raiz, sirva os arquivos com `python -m http.server 8767`. Com Chromium/Playwright instalados:

```sh
node --test *.test.mjs
python tools/qa/check_sword_rites_asset.py
python tools/qa/check_mod232_browser.py --url http://127.0.0.1:8767
python tools/qa/check_sword_compatibility.py --url http://127.0.0.1:8767
python tools/qa/check_quantum_sword_browser.py --url http://127.0.0.1:8767
python tools/qa/check_sword_collision_browser.py --url http://127.0.0.1:8767
```

O nome `mod232` das fontes e do asset identifica a missão de autoria; a publicação é **Mod 234**. Indicadores e carregador usam a versão 234. Referências técnicas consultadas: [AnimationMixer r160](https://github.com/mrdoob/three.js/blob/r160/src/animation/AnimationMixer.js) e [SkinnedMesh r160](https://github.com/mrdoob/three.js/blob/r160/src/objects/SkinnedMesh.js).

[Teste isolado no celular](https://phbritodev.github.io/Jogo-2-2.5D/mundo-3d-prototype.html?treinoEspadas=1&todasHabilidades=1&v=234)
