# Missão combate, câmera, movimento e áudio (17–18/11/2026, PR #600)

Registro permanente do briefing temporário `CLAUDE-MISSAO-COMBATE-CAMERA-MOVIMENTO-AUDIO-CINEMATICO-2026-11-17.md`
(apagado no último commit da PR). Testes: `tests/combate-camera-audio.test.mjs`.

## Decisões travadas
- **Resize/HUD:** `renderer.setSize(w,h,false)` em todo resize/rotação/`visualViewport` (o CSS controla o canvas). Causa
  medida: o buffer só mudava quando o DPR mudava → faixa de fundo em janelas maiores/rotação.
- **Mouse (PC):** Pointer Lock ao clicar no mundo; yaw 360° sem limite; pitch ±1,32 rad; mesma sensibilidade 1ª/3ª pessoa;
  cena/diálogo/pausa/menu soltam o ponteiro.
- **Alvo:** sem botão MIRAR. Trava suave com histerese (alvo mantido vivo, ≤10 m, não atrás da intenção, sem parede);
  golpe orientado ao alvo válido; Q/Tab troca.
- **Câmera em poderes inimigos (regra de ouro):** o enquadramento de combate puxa no máx. 30 % para o alvo; a Ruptura
  do VHAZRAEL só desloca o quadro desenhado (restaurado a cada frame). A Extinção Orbital só usa tomadas nas fases de
  cena (`awaken/orbit/entry`, com PULAR) e devolve a câmera com blend antes da queda; na queda/impacto jogáveis a
  câmera é 100 % do jogador (corrigido resto de tomada que podia ficar com blend pequeno após a entrada).
- **VHAZRAEL:** taxa por golpe (`VZ_RATE`), relógio único (janelas, traço, avanço e clipe seguem `act.t`), cadeias de
  3–4 golpes e pausa tática (`bossGap`), Moinho com um contato.
- **Protagonista:** golpe básico sem projétil; dano pela lâmina + rastro colado (`BASIC_TRAIL` 0,3 m). Poderes separados.
- **Movimento:** herói anda 2,8 m/s (corrida só com comando); inimigos andam 30 % mais rápido; 2º salto ≈35 % mais alto.
- **Áudio:** ver `docs/audio/AUDIO-REAL-COMBATE-AMBIENTE.md` (39 sons + 4 trilhas originais por Bispo, custos e saldo).

## Desempenho (SwiftShader 800×360 touch, 30 quadros por ponto, duas rodadas alternando a ordem)
| ponto | main p50/p95 ms | PR p50/p95 ms | draw calls main/PR |
|---|---|---|---|
| vale dia | 15,9–17,6 / 20–22 | 16,6–17,0 / 19–28 | 55 / 54–55 |
| vale noite (aurora) | 16,8–16,9 / 21–22 | 16,3–18,2 / 24–30 | 60 / 60–61 |
| poço noite | 16,6–18,4 / 23–27 | 18,2–20,0 / 26–30 | 52–53 / 52–53 |
| praça Cinzária | 18,9–22,1 / 30–59 | 20,0–22,3 / 27 | 93–94 / 93–94 |
| boca da caverna | 15,7–17,6 / 17–27 | 15,8–18,4 / 24–26 | 48 / 48 |
| Eldória campo | 13,7–15,5 / 23–30 | 15,2–16,5 / 24–112* | 190 / 190–191 |

Diferenças dentro do ruído entre rodadas; draw calls e triângulos iguais. *Pico isolado de uma rodada (não repetido).
**Não medido em Android físico** (SwiftShader ≠ GPU do Galaxy A55).

## Auditoria de temporários
- `CODEX_MISSAO_CORRECOES_ELDORIA_2026-11-11.md`: P1–P5 executadas e mescladas no PR #470 (registro em
  `docs/eldoria/mod316-luz-nostalgica-expansao.md`) → removido.
- `CLAUDE_EXECUTAR_ELDORIA_E_APAGAR_AO_FINAL.md`: mantido — exige aceite visual ≥80 % por local e revisão do criador,
  sem registro de aceite final.
- `docs/briefings-temporarios/CODEX-REFAZER-MENU-7-PECADOS-REF-CINEMATICA.md`: já não existe na main.
