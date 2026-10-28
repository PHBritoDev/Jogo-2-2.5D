# Mod 226 — Tornado da Fênix Celestial

Base main `9c3b6727` (marcador real 225 / chuva intensa). Substitui a Skill 3 desativada, preservando os arquivos de simulação e VFX das Skills 1/2. O briefing temporário foi removido na própria alteração, conforme autorização do criador. Merge autorizado na mensagem da tarefa.

## Implementação

`celestial-phoenix3d.js` separa combate da apresentação em `celestial-phoenix-vfx3d.js`. Passo fixo de 1/120 s, deslocamento máximo de 6,7 cm por passo, colisão com os mesmos obstáculos do mundo. Identidade do encontro impede dano no próximo inimigo que reutilizar o holder.

Sequência: conjuração 0,7 s com pose/grimório existentes → formação 0,8 s → voo guiado até 2,4 s a 8 unidades/s, curva limitada a 2 rad/s → contato → órbita completa de 360° em 0,9 s → investida acelerada até 0,45 s → cinco segundos de queimadura, um tick por segundo → dissipação. Fênix articulada com corpo, cabeça, bico, duas asas com penas e cauda, sem GLB novo nem imagem plana. Núcleo roxo deformado e três faixas de fogo helicoidais contrarrotativas, partículas e rastro geométrico. Um tornado, uma fênix.

O alvo é o inimigo ativo do targeting existente. Sem alvo, segue a direção do herói até o alcance máximo; alvo morto/trocado, morte do herói, diálogo, cutscene ou mudança de dimensão cancelam. Obstáculo dissipa sem dano; alvo que esquiva da investida não recebe dano final nem burn. A órbita usa tamanho medido do modelo, com limites de 0,6–4 para raio corporal e 1,5–8 para altura. Spawn lateral evita nascer dentro de alvo muito próximo. Burn acompanha o corpo, não o ponto antigo do impacto. Reaplicação não acumula: um cast por vez; sem timers de dano.

45 mana preservados, compra/desbloqueio da loja preservados. Recarga passa de 6,2 para 12 s: cobre voo, órbita e burn, evitando refresh infinito. Dano base: 24 contato + 28 investida + 5×5 burn = **77**, multiplicado pelo bônus de nível existente. `magic3_plus` e ultimate continuam desativados; não adiciona tornado extra. Sons sintetizados já existentes (`magic`, `whoosh`, `hit`) reutilizados; sem áudio externo.

Hero não muda de escala; só a pose existente de conjuração. Movimento, esquiva e câmera livre permanecem disponíveis. Pausa congela atualização e bloqueia input pelo fluxo existente.

## Desempenho e polimento

Penas instanciadas por asa/cauda; buffers fixos, materiais compartilhados, pool de 160 brasas. Baixo/médio/alto usam 40/80/160 partículas, com duas faixas no baixo e três nos demais. Dano e sequência idênticos. Nenhuma luz adicional, textura externa, dependência nova ou bloom global. Shaders preparados no carregamento do mundo. Após a primeira inspeção, penas receberam o shader de fogo e instancing: estudo isolado caiu de 35 para **13 chamadas no voo**; cerca de 4.504 triângulos incluindo piso e bonecos de referência. Não é benchmark de celular.

## Validação realizada

- `node --test`: **140 testes passaram**, incluindo fases, ordem, 360°, dano único, cinco ticks, 10/30/60/120 FPS, parede, ausência/perda de alvo, cancelamento, pausa, reuso, alvo grande, burn móvel, spawn próximo, compra/mana/recarga.
- Expectativas antigas que mantinham magic3 desabilitada foram atualizadas; testes da ultimate e upgrade desativados continuam.
- Chromium desktop/SwiftShader: teste no mundo real, evento touch seguido de click, mana 100→55 uma única vez; HP 300→276→248→223. Estado registra órbita 2π e cinco ticks; encerra sem erros de página ou shader no fluxo verificado.
- Estudo visual 3D em `skill3-preview.html`, capturas de conjuração/formação/voo/órbita/investida/burn/limpeza, inspecionadas antes/depois do polimento. Dez reinvocações baixo/alto mantêm a quantidade de geometrias após aquecimento.
- `node --check` e `git diff --check`. Módulos de combate/VFX das Skills 1 e 2 sem mudanças em relação à base.

[Logs e capturas](evidencias/mod226/). Reprodução: servidor HTTP na raiz, porta 8768; `python tools/qa/skill3_browser.py` com Playwright e Chromium instalados. O teste usa passos controlados e IA congelada; não equivale a jogar toda a campanha.

**Android físico NÃO TESTADO.** FPS, temperatura, primeiro cast no aparelho e multitouch real não foram medidos. Não houve campanha integral, teste visual de todos os chefes nem calibração auditiva. A adaptação a alvos grandes foi validada por teste de simulação, não uma campanha de todos os Bispos. Estética procedural estilizada, inspirada na referência; não reproduz a densidade de pintura da imagem. A dimensão do Bispo 1 e ativos GLB não foram alterados.
