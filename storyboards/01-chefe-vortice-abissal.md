# 01 — Enemy2 e Mini-chefe Enemy2: Julgamento do Vórtice Abissal (auditoria + sakuga)

## Auditoria real (código, não suposição)

**Onde o poder está registrado:** `registerSkill('vortex')` em `enemy2-squad3d.js` (Mod 238). Ele está no kit (`kit: ['vortex', 'trinity', 'collapse']`) das duas espécies:
- **`e2`**, o Enemy2 comum: Ato II e massacre do Ato I;
- **`e2boss`**, o mini-chefe `miniboss2`.

Não pertence ao Demônio da Ganância. O Enemy2 antigo, de antes da Mod 237, usava o kit `demonio` de `powers3d.js`: Hálito Infernal, Erupções, Bolas de Fogo, Corte Flamejante e o ultimate Furacão Infernal. Esse kit fica desligado na esquadra (`updateFoeKit` e `updateBossUltimates` retornam com `squadOn`).

| | Enemy2 comum (`e2`) | Mini-chefe Enemy2 (`e2boss`) |
|---|---|---|
| Vida | 150 × 1,6 = 240 (Ato II; ×0,85 em grupos de 3+) | 480 × 1,35 = 648 |
| Golpe | `Triple_Combo_Attack`: 3 golpes, 8 de dano, 2,5 m | Foice do Vulcão: 3 cortes, 14 de dano, 3,4 m, finta → Colapso |
| Vórtice | Portal 1,5 m; ponta de 0,7 m; 13 × 3 investidas; 15 m/s | Portal 2,1 m; ponta de 0,95 m; 15 × 3; 16,5 m/s |
| Paleta da corrente | Abismo #08020D / roxo #25002E / magenta #FF28D8 / núcleo #FFFFFF | Mesma base com brasas (corpo #4D0320, quente #FF6B4D) e faíscas laranja |
| Impacto | Sakuga `abyss`, tamanho 2,1, 9 pedras | Sakuga `ember`, tamanho 3,1, 14 pedras |
| Outros poderes | Trindade (3 furacões), Colapso (raio 3,2) | Trindade maior, Colapso de raio 4,3, Ceifa do Furacão (1 furacão saindo da lâmina) |

## Problema relatado

"Fumaça magenta translúcida e manchas pretas redondas sem massa." Causas encontradas:
- partículas `smoke` escuras (redondas) espalhadas ao longo da corrente;
- corpo translúcido demais;
- impacto genérico do `impactDirector`.

## Linha do tempo (60 FPS)

| Fase | Tempo | Quadros | O que acontece |
|---|---|---|---|
| Abertura | 0–0,35 s | 0–21 | Discos espirais em 3 alturas mais um funil que desce do portal; *ease* `smooth`. |
| Mira | 0,42 s por investida | 25 | A ponta recua 1,2 m/s e reorienta com giro máximo de 4 rad/s. Telegraph no chão (zona de perigo). |
| Voo | Até 1,25 s | ≤ 75 | Acelera até 15 m/s (×5/s), giro limitado de 1,5 rad/s. Passou do alvo, não corrige mais. |
| Contato | — | — | Varredura da cápsula do alvo. Dano 1× por investida. Impacto sakuga com sulco no vetor real do golpe. |
| Explosão | 0,38 s | 23 | Explosão da investida. |
| Retração | 0,75 s | 45 | Volta ao portal depois da 3ª investida. |

## Malha e material

- **Corrente:** tubo dinâmico de 46 anéis × 12 lados sobre o caminho real. `energyMaterial` com `VORTEX_PAL`, opaco (α 1) e esmaecido perto da câmera (`camFade`).
- **Núcleo branco:** tubo aditivo interno de 0,2 do raio, com fresnel invertido (branco → magenta #FF28D8).
- **Estilhaços:** octaedros escuros instanciados, arrastados pela corrente. Eles substituem a fumaça redonda.

## Impacto sakuga (`sakuga-impact3d.js`)

- **Casca:** cerca de 90% do raio em 2–3 quadros (`1 − 2^(−12k)`), depois desacelera. Some por erosão fBm com borda acesa.
- **Anéis de pressão:** dois, com raio serrilhado e assimétrico, na normal do terreno.
- **Rachaduras:**
  - 7–11 radiais com quebras angulares;
  - sulco de 3,5 m (5 m no mini-chefe) quando a corrente bate no chão;
  - cada segmento lê a altura do terreno nas duas pontas.
- **Placas de terra:** levantadas e afundando depois.
- **Pedras:** 8–15, com gravidade de 15 m/s², quique (restituição 0,35) e atrito.

## Sincronia e efeitos de tela

- **Hitstop e tremor:** hitstop de 55 ms e tremor de 0,17 **só quando o herói é acertado de fato** (`squadDamageTarget`), com trava de 160 ms contra disparo duplo.
- **Sem acerto:** impacto em parede ou chão não trava a tela.

## Custo, limpeza e critérios

- **Custo:** tubos, discos e estilhaços instanciados, mais 5 malhas do impacto sakuga. Tudo alocado uma vez, com slots reaproveitados.
- **Qualidade baixa:** menos estilhaços e faíscas; corrente e impacto mantidos.
- **Limpeza:** `clear()` ao parar a esquadra.
- **Critérios visuais:**
  - corrente com massa (corpo escuro e núcleo branco);
  - sem manchas redondas;
  - rachaduras e pedras no ponto real de contato;
  - comum e mini-chefe distinguíveis.
