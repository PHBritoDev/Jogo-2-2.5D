# Combate aéreo — Mod 301 integrada à campanha

Entrega integrada: [PR #433](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/433) — mesclado na main da Mod 301 após passar a suíte de navegador. Origem experimental: PR #419, que não deve ser mesclado novamente.

## Como jogar

- Mundo principal: `mundo-3d-prototype.html` usa o novo protagonista na Mod 301. `?prota=antigo` restaura o anterior. O seletor também aparece em **Pausa → Ajustes → Protagonista**; a troca recarrega a página, sem converter o save.
- Arena complementar: `experiments/aerial-combat/`. Novo/antigo e combate aéreo/legado são seleções independentes. WASD/joystick, Shift dash, Espaço salto, J golpe, K magia, R corrida; arraste para câmera, pinça para distância. L alterna foco suave. Reiniciar restaura o treino.
- Não usar a arena como substituto da campanha. O mundo mantém missões, magias, ultimates e IA; os novos recortes entram apenas na espada Chamado. A arena exercita regras experimentais de mana por hit e adversário aéreo, sem migrar globalmente os chefes.

## Integração e limites

`Prota_otimizado_2K.glb`: 21.98 MB, 30.953 triângulos, 73 ossos, 19 clipes reais. Arquivo original e `Protagonista.glb` preservados. Geometria medida com skin aplicada; altura de referência 1,9 m no mundo e 1,8 m na arena. Espada acompanha RightHand; ritos especiais existentes recebem retarget de rotações relativo ao repouso. Canais de posição/escala do rig antigo não entram no novo. Corrida usa Running nativo, sem receber a animação de outro esqueleto.

O briefing foi atualizado pelo criador em `44043baa` e `d5ddda2f` para exigir a integração no mundo. As mudanças pontuais de carregamento/locomoção no mundo preservam a versão da branch (`9a92ef89` antes da edição). Nenhum merge/rebase/cherry-pick de Eldória. Os arquivos de cidade, terreno, floresta e assets de Claude não são alterados.

A arena reutiliza espada, hitbox varrida, animações de referência, rastro e colisões por callbacks. Dash: 400 ms entre inícios, deslocamento 160 ms, invulnerabilidade 120 ms; salto 6,2 m/s, gravidade 15, um salto por pouso. Após acerto aéreo: pausa 160 ms, orçamento total 420 ms, limite de 2,5 s. Magia: 18 MP, pausa de 100 ms somente na liberação. Mana: +7 por hit físico aceito/alvo/swing; alvo invulnerável, magia e erro não recarregam. Cinco silhuetas máximas (3 jogador + 2 rival), vida 240 ms; qualidade baixa usa uma por entidade.

Fontes passivas existentes auditadas: `regenMana` no loop do mundo, +8 da defesa perfeita, descanso, respawn/viagem e ferramentas QA. Permanecem na campanha para preservar progressão; apenas a arena desativa regeneração passiva. A primeira pessoa conserva seu controlador e agora reconhece UpperArm/LowerArm além de Arm/ForeArm. Nenhuma câmera de ultimate foi substituída.

## Evidências e reprodução

Scripts e relatórios usam o GLB real. `qa/clips.py` amostrou os 19 clipes em cinco tempos e frente/lado/costas (98 capturas), com métricas do agente visual local `tools/visual-lab/agent-perception.cjs`. Métricas de pixels não substituem inspeção visual: os contatos e enquadramentos também foram inspecionados nas capturas.

```sh
node --test experiments/aerial-combat/controller.test.mjs sword-rites3d.test.mjs combat244.test.mjs skills3d.test.mjs movement-bounds.test.mjs world3d-terrain.test.mjs progression3d.test.mjs hearts3d.test.mjs
python -m http.server 4181
# Em outro terminal, com Playwright, Chromium, Pillow e FFmpeg instalados:
VISUAL_BASE_URL=http://127.0.0.1:4181 python experiments/aerial-combat/qa/runtime.py
VISUAL_BASE_URL=http://127.0.0.1:4181 python experiments/aerial-combat/qa/interaction.py
VISUAL_BASE_URL=http://127.0.0.1:4181 python experiments/aerial-combat/qa/world.py
```

68 testes de regras/regressão passaram: cooldown, salto, colisão, buffer, cancelamento, finitude do voo, hit único, magia, mana, ritos, habilidades, terreno, progressão e corações. Navegador: 50 dashes mistos, 15 saltos, cinco cadeias completas de cinco golpes, três magia+combo, launcher, retaliação, morte/pouso/reinício, parede, toque real, joystick, câmera e saves isolados. Comparação de sensibilidade touch em 960×540 e 393×852: 0,377 rad (0,3×) / 2,513 rad (2×) para arrastar 20% da tela, independente da orientação.

No ensaio de combate, a cena de referência chegou a 23 chamadas/64.190 triângulos; protótipo baixo 26/65.544, alto 27/65.992. Contagens por frame em `interaction/report.json`, simulações 30/60 Hz, mesma cena. Após aquecer **todos** os slots, 50 dashes adicionais mantiveram 30 geometrias/12 texturas; o primeiro uso do terceiro skeleton cria sua bone texture, não representa vazamento. Latência de despacho medida: primeiro comando frio ~121 ms neste ambiente; aquecido 0,1–0,5 ms. Não é medição input-to-photon nem Android.

Vídeos `solo.mp4`, `dash-jump.mp4`, `air-duel.mp4` e relatórios são artefatos do workflow **Aerial combat prototype**. São frames WebGL reais em replay determinístico, codificados a 20 fps; não são benchmark em tempo real. Os testes do mundo executam o HTML/loader reais e os controles QA existentes, mantendo o mapa visível, com os dois modelos, movimento, salto, ataques, habilidades, sockets e primeira pessoa.

**Limitações:** sem aparelho Android/A55; sem promessa de 60 FPS. Os seis vídeos `1000363895`–`1000363900.mp4` citados não estavam disponíveis no workspace e não foram analisados. Não foi percorrida toda a campanha nem todas as ultimates cinematográficas. Testes de regressão de regras e isolamento não equivalem a validação visual de todos os atos. Clipes acrobáticos brutos conservam defeitos do arquivo fonte e ficam no inspetor; não foram anunciados como corrigidos. Consulte a tabela de animações.
