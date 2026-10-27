# Marco 11 — Animações de poder, corrida do herói e impacto em estilo anime

**Fontes:**
- **Prompt do autor:** "coloca animações que combinam com os ataques", "personagem correr e não só caminhar", "raios de destruição", "nada genérico".
- **Documento mestre:** "corrida com animação própria", "câmera dramática nas ultimates".

**Referências pesquisadas:**
- **Quadros de impacto (impact frames):** da animação japonesa. Um ou dois quadros de cores invertidas e alto contraste no golpe principal: [Know Your Meme — Impact Frames](https://knowyourmeme.com/memes/cultures/impact-frames), [80.lv — impact frames](https://80.lv/articles/learn-how-to-add-accents-to-your-animations-with-impact-frames), [Animation Obsessive](https://animationobsessive.substack.com/p/a-subtle-art-with-visceral-power).
- **Camadas de efeito:** aviso, impacto (raio e onda) e rastro (marca queimada, fumaça), como nos estudos de VFX estilizado: [RealtimeVFX](https://realtimevfx.com/t/sword-slash-combo-advice-are-really-welcome/9379), [Gabriel Aguiar — impact](https://www.skillshare.com/en/classes/unity-vfx-graph-impact-effect/1753498420).
- **Retarget de animação em espaço de mundo:** [Wicked Engine](https://wickedengine.net/2022/09/animation-retargeting), [blender-animation-retargeting](https://github.com/Arthur151/blender-animation-retargeting).

## O que entrou

| Pedido | No jogo |
|---|---|
| Correr | **Botão CORRER** (liga e desliga; no teclado, segure Shift): velocidade 7,2 em vez de 4,3, com um leve aumento do campo de visão.<br>**Animação de corrida:** o Protagonista.glb não tinha. Ela vem do "Running" da Misteriosa, transferido no Blender (`tools/blender/m11_corrida.py` → `Protagonista-corrida.glb`) e convertido no navegador para o esqueleto do herói (`bakeRunClip`). Passada e braços um pouco contidos, por causa do casaco longo. |
| Animações que combinam com os ataques | Animações de poder por cima dos clipes, para todos os personagens (herói, Enemy1–4, Bispos e Ganância):<br>• **invocar:** mão erguida e o livro na outra;<br>• **canalizar as ultimates:** braços abertos e o corpo levita;<br>• **estocada:** investidas e lanças;<br>• **varrida:** cortes de espada;<br>• **golpe de cima:** tremor, Execução e mãos gigantes.<br>Os ossos são apontados no espaço do mundo, então funciona nos dois tipos de esqueleto do jogo. |
| Raios de destruição | **Raios:** núcleo branco e halo colorido, que piscam. Caem na preparação do Julgamento Divino, na Sentença Invertida de ZAR'KHAEL, nos Portões da Avareza e no colapso do Buraco Negro. |
| Impacto forte | **Quadro de impacto** (cores invertidas por ~0,1 s) nos golpes finais: Supernova, Buraco Negro, Julgamento Divino, Execução, mãos da Avareza e sol da Fornalha.<br>**Marcas queimadas no chão:** depois de erupções, raios e golpes, sumindo aos poucos (no máximo 12). |

## Limites (honesto)

- **Retarget:** a corrida é aproveitada de outro personagem, sem captura nova.
- **Animações de poder:** são poses procedurais por cima do clipe, não animações feitas quadro a quadro.
- **Evidência:**
  - **CONFIRMADO POR CÓDIGO:** `node --test`.
  - **TESTADO EM NAVEGADOR:** corrida (velocidade 7, clipe carregado), poses de invocação e canalização no herói e VHAZRAEL com poderes e ultimate, sem erros de página. Regressões dos Atos V e VI também.
  - **Android: NÃO TESTADO.**
