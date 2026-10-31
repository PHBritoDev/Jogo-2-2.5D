# 02 — Impacto, colisão e destruição (módulo compartilhado `sakuga-impact3d.js`)

**Contrato:** `emit({ id, time, point, dir, size, palette, rocks, furrow })` recebe um registro de colisão **já confirmado** pela lógica. Os campos:
- `id`: único; duplicatas são rejeitadas;
- `dir`: vetor real do golpe;
- `furrow`: comprimento do sulco.

`update(time, camera, quality)`, `clear()` e `dispose()` completam a interface. O módulo não decide dano nem grava no save.

| Camada | Tempo (60 FPS) | Curva | Detalhe |
|---|---|---|---|
| Casca | 0–0,55 s (33 q) | `1 − 2^(−12k)`: 90% do raio em ≤ 3 q | Núcleo branco, cor intermediária e contorno escuro (`aMid`/`aRim`). Erosão fBm com limiar = idade; borda acesa. |
| Núcleo | 0–0,2 s (12 q) | Linear para dentro | Esfera aditiva branca. |
| Anéis | 0–0,8 s, 2 anéis com 0,09 s de defasagem | expo | Raio serrilhado (5/11/23 harmônicos) na normal do terreno. |
| Rachaduras | Crescem até 0,18 s; somem entre 1,6 e 2,6 s | Linear | Faixa emissiva com bordas escuras, projetada no terreno amostrado. |
| Placas | Sobem até 0,25 s; afundam depois de 1,4 s | expo | Caixas finas inclinadas para fora. |
| Pedras | Até 2,6 s | Física | 8–15 por impacto, quique no relevo. Teto de 64 pedras (capacidade fixa). |

**Paletas:**

| Paleta | Uso | Cores |
|---|---|---|
| `abyss` | Enemy2 | #FFFFFF / #FF28D8 / #25002E / #08020D |
| `ember` | Mini-chefe | — |
| `crimson` | X e Esfera | #FFFFFF / #D90027 / #5A0018 |
| `celestial` | Explosão | #FFFFFF / #FFC62E / #C93228 |

**Custo:**
- **Chamadas de desenho:** 5 (cascas, anéis, rachaduras, placas e pedras são InstancedMesh).
- **Shaders:** sem textura externa, sem derivadas (WebGL1).
- **Memória:** 60 lançamentos seguidos não aumentaram geometrias nem programas (ver `TESTES-E-PERFORMANCE.md`).

**Qualidade baixa:** rachaduras 30% mais largas, para continuar legíveis em telas pequenas; sem outras perdas.

**Limitação:** as pedras quicam no terreno (altura), mas não colidem com troncos ou paredes. Isso exigiria o colisor do jogo, que pertence ao sistema do Codex.
