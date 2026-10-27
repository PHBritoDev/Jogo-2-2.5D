# Mod 221 — Cerco das Cinco Lâminas Celestiais

Base: main `bd2a4f7` / Mod 220 / PR #305. Implementa a solicitação e o anexo `INSTRUCOES-CERCO-SKILL1.md`. A autorização de merge foi dada explicitamente na mensagem desta tarefa.

## Comportamento e regras

- A Skill 1 (`magic`, tecla 1) substitui o disparo automático anterior. Cinco cópias de **EspadaProta.glb**, em ambos os níveis da habilidade; a espada equipada continua intacta.
- Alvo: o inimigo ativo do combate existente, vivo, visível, até 22 unidades do herói. Sem alvo ou modelo ainda não carregado: aviso, **sem gasto de mana ou recarga**. O sistema atual tem um combatente principal; ao morrer/trocar esse alvo o cerco termina, sem transferência automática para o próximo membro do grupo.
- Círculo de raio 3,1, altura do centro do alvo + 0,45, oscilação de 9 cm. Formação acompanha o inimigo por translação, sem rotação de ventilador nem interpolação atrasada. GLB medido: ponta em Y=-0,951, guarda em Y=0,3–0,5, cabo em Y≈0,7. Rotação X=-π/2 converte a ponta para +Z; quaternion aponta esse eixo ao alvo.
- GOLPE mostra cinco ícones e 5/5; cada comando válido consome uma lâmina. Intervalo mínimo de 0,22 s rejeita duplicações simultâneas. O binding também rejeita o click de compatibilidade de mouse/touch depois de pointerdown, mesmo atrasado; mantém ativação por teclado.
- Disparo: 0,12 s de antecipação + voo acelerado de até 0,58 s em curva. O ponto de mira é fixado no comando: o inimigo pode esquivar. O contato é testado ao longo do segmento, com amostras de no máximo 8 cm, contra o mapa de colisões existente e a hitbox do alvo. Obstáculo tem prioridade, consome a espada sem dano; falha também consome. Uma lâmina nunca causa dois danos.
- Dano por impacto preservado: **14**, ou **16** com `magic_plus`. Mana **18** e recarga **1,8 s** preservadas. A base passa de três para cinco oportunidades de acerto conforme solicitado (máximo 70/80 de dano). Duração máxima de **12 s** permite comandos manuais; não se pode recarregar o cerco ativo. A recarga normal conta desde a invocação.
- Caminhar/correr/esquivar continuam disponíveis, respeitando a velocidade de combate já existente. Sem câmera forçada e sem pose que bloqueie movimento. Pausa congela a simulação; morte, diálogo/cutscene e mudança de contexto de cena cancelam. 0/5 fica visível durante o último voo; depois o botão e o ataque normal são restaurados.
- Dano usa `hurtEnemy`, com as mesmas condições de combate/vitória, reação e progressão. Para esta habilidade, feedback dourado genérico foi substituído pelo impacto celestial, hit stop de 35 ms e tremor discreto.

## Visual e custo

Modelo real com bordas energizadas; três faixas por rastro em um único buffer: núcleo claro, borda azul e filamentos branco/dourado. Cauda afina e dissipa, acompanhando posições reais. Contato pequeno com núcleo branco-azulado, onda fina e fragmentos direcionais; a espada desaparece sem encolher. Sem vermelho, círculo gigante ou pós-processamento global.

Polimento após inspeção: maior legibilidade dos fios, filamentos separados do núcleo, impacto com clarão preservado no primeiro frame, ícones SVG menores para o HUD mobile e material da espada em uma única passagem. Sons originais do `audio3d.js` (`magic`, `whoosh`, `hit`) reutilizados, sem novos assets de áudio.

Cinco clones compartilham geometria/texturas; materiais próprios não alteram a arma do jogador. Cinco buffers de trilha reutilizados e pool de até 80 fragmentos em um InstancedMesh. Baixo/Auto reduz amostras para 12 e fragmentos por contato de 16 para 7; alto usa 24/16. Sem luzes dinâmicas adicionais. O asset original tem 12.672 triângulos por espada; cinco somam 63.360. No estudo isolado, formação após invocação: **12 draw calls / 64.182 triângulos** incluindo piso/alvo. Isso é contagem de renderização, não benchmark Android.

## Arquivos

- `celestial-siege3d.js`: estado/contagem, formação, trajetória, colisão e cancelamento.
- `celestial-siege-vfx3d.js`: modelo real, orientação, shaders, faixas e pools.
- `mundo-3d-prototype.js`: targeting, dano, HUD, input e lifecycle; não altera a dimensão do Bispo 1.
- `hud3d.css`, `skills3d.js`, `progression3d.js`: contador, nome e descrições coerentes.
- HTML/loader/index: marcador e cache Mod 221.
- `celestial-siege3d.test.mjs`, `tools/qa/skill1_*.py`: regressões e reprodução.
- `skill1-preview.html`: estudo visual independente, com o mesmo asset e os mesmos módulos, sem alterar saves.

## Evidências reais

**124 testes Node passaram**, incluindo nove novos: cinco lâminas, espaçamento/perseguição, comando único, dano único, parede fina com frame longo, esquiva/falha, troca/morte de alvo e de cena, pausa/expiração/reuso, orientação medida no GLB e input de compatibilidade atrasado. `node --check` dos módulos e runtime, `git diff --check` passaram.

Chromium desktop headless com SwiftShader, viewport 800×450, usando o mundo real e hooks de debug para congelar a IA e avançar a simulação em passos controlados. Eventos pointerdown + click no botão real produziram **5/5 → 4/5 → 3/5 → 2/5 → 1/5 → 0/5**, cinco impactos e HP **300 → 230**; cerco encerrado e botão normal restaurado. Nenhum `pageerror` nesse fluxo. Não é uma jogada completa nem medição de FPS.

Estudo visual separado em Chromium 1100×720, inspecionado antes/depois do polimento. Vinte reinvocações mantiveram a contagem de geometrias em **12 após aquecimento**. Capturas e logs:

- [Formação no jogo](evidencias/mod221/formation.png)
- [Rastro no jogo](evidencias/mod221/trail.png)
- [Impacto no jogo](evidencias/mod221/impact.png)
- [HUD 0/5](evidencias/mod221/zero.png)
- [Estudo: formação](evidencias/mod221/study-formation.png)
- [Estudo: faixas](evidencias/mod221/study-trail.png)
- [Estudo: contato](evidencias/mod221/study-impact.png)
- [Log navegador](evidencias/mod221/browser.txt), [suíte](evidencias/mod221/node-tests.txt), [pool](evidencias/mod221/preview.txt).

**Android: NÃO TESTADO.** Não houve teste físico de multitouch, desempenho térmico, escuta/calibração de áudio, campanha integral ou todos os chefes. Os testes visuais locais cobrem espada/alvo/Skill 1; os GLBs de Anjo e Vítima atualizados na main não foram rebaixados nem publicados por este trabalho. Renderização por software não estabelece desempenho mobile. A referência orientou as faixas/paleta, mas o modelo é obrigatoriamente a EspadaProta existente, não a espada ornamental distinta da prancha.

Reproduzir: servir a raiz por HTTP; `node --test`; com Chromium e Playwright instalados, executar os scripts em `tools/qa` (GAME_URL/QA_OUTPUT configuráveis). Preview: abrir `skill1-preview.html`. No jogo, comprar a Skill 1, aproximar-se do inimigo, tocar MAGIA e então GOLPE para cada lâmina.
