# Ganância completa — Mod 348 (9ª divisão, 22/11/2026)

Execução do briefing `CLAUDE-MISSAO-GANANCIA-COMPLETA-20261122.md`. Evidências: `docs/combate/evidencias/ganancia-completa/`.
Testes: `tests/combo-multi-hit.test.mjs`, `tests/ganancia-completa.test.mjs` (+ `tests/ganancia-tres-fases.test.mjs`), todos no CI `combat315.yml`.

## Inventário de clipes (GLB real) e uso
Fase I (`NewGanancia1.glb`, 12 clipes) e fase II/III (`NewGanancia2.glb`, 18 clipes). Frequência = 3 seeds × 60 s na simulação (`stats.moves`), herói em movimento a ~4 m.

| Clipe | Papel / ação | Fase | Janelas de dano (s) | Dano / efeito | Freq. I | Freq. II | Freq. III |
|---|---|---|---|---|---:|---:|---:|
| Double_Combo_Attack | Ceifa Gêmea (`gk_double`) · GK_hit (52–62) | I–III | .70, 1.20 | corte duplo | 16 | 2 | — |
| Triple_Combo_Attack | Tributo Triplo | I–III | .77, 1.53, 2.23 | 3 cortes | 15 | 5 | 8 |
| Weapon_Combo | Usura Cruzada · GK_guard (0–6) | I–III | .77, 1.30, 2.37 | 3 cortes / bloqueio | 16 | 4 | 5 |
| Weapon_Combo_1 | Pêndulo do Ouro | I–III | .67, 1.67, 2.47 | 3 cortes (mãos alternadas) | 10 | 3 | 5 |
| Left_Slash | Corte Avaro | I–III | .87, 1.37 | 2 cortes | 12 | 1 | 2 |
| Weapon_Combo_2 | Juízo Quádruplo | III | 1.17, 2.0, 2.17, 3.0 | 4 cortes | — | — | 5 |
| Double_Blade_Spin | Rodopio das Asas | II–III | .83, 1.37, 1.70 | giro 3 cortes | — | 4 | 4 |
| Axe_Spin_Attack | Machado do Dízimo | II–III | .97, 1.17 | 2 cortes | — | 3 | 1 |
| Right_Hand_Sword_Slash | Talho Relâmpago · GK_pitch (0–45) | II–III | .70 | corte rápido / arremesso | — | 2 | 3 |
| baseball_pitching | arremesso fase I (`gk_pitch`, 1,6 s, ×1,45) | I | soltura 1,15 | foice / lança | 21 | — | — |
| Idle_14 | GK_idle (0–96), GK_cast (129–156) | I | — | — | contínuo | — | — |
| Arise | GK_idle/GK_cast (II), levante II→III | II–III | — | cena | — | contínuo | 1 |
| Dead | queda I→II, morte II | I–III | — | cena | 1 | 1 | — |
| Unarmed_Vault | dash/esquiva | I–III | — | i-frames | ~ | ~ | ~ |
| Walking / Running | locomoção | I–III | — | — | contínuo | contínuo | contínuo |
| Dive_Down_and_Land_2 | GK_fly (0–3), GK_dive (2–30) — quadril achatado | II–III | mergulho 1 janela | 18 + empurrão | — | 9 mergulhos | 9 |
| Dive_Down_and_Land | GK_land (24–48) — fim alinhado à altura de pé | II–III | — | pouso | — | ~ | ~ |
| Basic_Jump | GK_jump (30–60) — decolagem | II–III | — | — | — | ~ | ~ |
| Upside_Down_Rope_Hang_1 | pendurar invertido (`gk_hang`) | II–III | — | conjura 4 sóis | — | 6 | 5 |

Todos os 18 clipes da fase II/III e 11 dos 12 da fase I são alcançados (o `Arise` da fase I não tem uso: a fase I nunca se levanta).

## Etapas
1. **Hits.** Ver PR — causa A (instância duplicada do módulo: traço do clipe não chegava ao golpe usado), causa B (Bispos 1–3 sem `attackToken`: 2º/3º corte engolido pela graça de 850 ms) e empurrão total no 1º corte. Setor amarelo da Ganância removido. Antes 6/20 janelas acertavam, depois 16/19.
2. **Armas telecinéticas.** Arcos completos em planos reais (h, d, v, giro, estocada) com preparo → avanço → varredura com o gume liderando → freio → retirada; dano pelos trechos REAIS do gume (`GK_WEAPON_EDGES` = `userData.edges`), 1 acerto por janela (o giro tem 2), rastro por golpe, impacto sakuga no estilo da arma.
   **2A.** Lâminas em cunha que afinam até a ponta (gume ≈ 0 mm), bisel metálico separado com reflexo especular móvel, fio luminoso, lombada serrilhada, guarda em leque de espinhos; lança com ponta-chama em losango.
3. **II→III.** Diretor por estágios (morte → pausa → carga → levante → estouro → revelação) com câmera autoral (trilho próprio, solta sozinha), gaiola de vidro fraturado, ações do herói travadas só durante a cena. Sóis cancelados somem (a "bola de fogo parada" era o VFX desenhando sóis já cancelados).
4. **Voo/teto.** O corpo sumia porque `Dive_Down_and_Land_2` começa com o quadril a 8,8 u (~14 m): os clipes de voo agora só dão a postura. Pendurar usa superfície REAL achada por raycast (arcada/beirais da garganta a 7–22 m, anel 31–46 m); voa até lá, pendura invertida com os pés na superfície, solta os 4 sóis, volta ao voo. Sem superfície, o plano vira mergulho.
5. **Sóis.** Raio 1,7 m (~4×), área 4,6 m, um por vez, só pendurada; tremor por distância (respeita "reduzir tremor"); núcleo da explosão aditivo (não escurece).
6. **Abismo.** Emissor no centro anatômico da goela (crânio `ganancia-colosso`, lido sem editar o módulo do Codex); semente → acúmulo → rachaduras → ~3× → compressão e disparo; velocidade 24 m/s (antes 9,5) com varredura de 0,3 m; parede só depois de entrar na arena.
7. **Combos.** Correntes nativas por fase (pares na I/II, trios na III) que cancelam só a recuperação; anti-repetição.
8. **Silhueta III.** Os chifres do GLB não têm osso próprio (escalar `Bone_043/045` não mudava nada): a fase III ganha chifres novos (~2×) presos à cabeça. Asas superiores ×1,25 abertas para os lados (giro no eixo frontal). O par inferior `GananciaAsas2.glb` fica atrás das costas baixas, em leque. QA: `tools/visual-lab/ganancia-fase3-qa.html`.
9. **Fidelidade/luz.** Luz própria do chefe no material (chave + preenchimento + brilho especular), sem luz nova, sombra ou draw call.

## Desempenho medido (SwiftShader, 852×393, fluxo II→III com abismo)
137 draw calls, ~344 mil triângulos, 0 erros de console. Armas: 3,4–5,9 mil triângulos cada, 8 draws no total.

## Limitações reais
- QA visual em SwiftShader (CPU); sem FPS em Android.
- As capturas de jogo de 9,23 s e 32,88 s não chegaram: a baseline foi reproduzida no jogo atual.
- Semelhança com as referências julgada a olho (sem métrica numérica); a aprovação artística final é do criador.
- Detalhe de rosto/joias depende da malha/textura dos GLBs: a luz realça, não cria detalhe.
