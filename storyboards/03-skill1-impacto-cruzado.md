# 03 — Skill 1: Impacto Cruzado (Ruptura em X com `?vfxSakuga=1`)

**O que não muda:** lógica, dano, recarga e hitbox continuam em `skill-x-rupture3d.js` (Mod 233/236). Só o visual troca, em `createSakugaXVFX`, dentro de `sakuga-skills-vfx3d.js`.

| Fase | Tempo / quadros | Visual |
|---|---|---|
| Cast | 0–0,45 s (27 q) | As duas lâminas crescem do cruzamento (`easeOut`), com a segunda 0,08 s atrás. Linhas de velocidade radiais convergem. |
| Voo | ≤ 28 m a 24 m/s | X de duas lâminas EXTRUDADAS (espessura de 0,1 m + bisel), ponta longa, gume serrilhado assimétrico, arqueadas em Z. Duas fitas helicoidais em sentidos opostos cruzam o centro ao longo do voo; arcos elétricos vermelhos entre as pontas. |
| Contato | Hit da lógica | X que se abre no ponto (3,2 m em 0,1 s) e some por erosão em 0,6 s. Linhas de velocidade estouram. Impacto sakuga `crimson` (12 pedras, sulco de 3 m no vetor do golpe). |
| Impact frame | 0,15 s (9 q) | Camada vermelho-escura de tela, só nas bordas, com `z-index` abaixo do HUD e sem bloquear toque. Fica mais fraca com `reduceFlash` ou movimento reduzido. |

**Material e paleta:**
- núcleo #FFFFFF, carmim #D90027, borda #5A0018;
- manchas negras por fBm;
- a dissolução é erosão alfa com borda acesa.

**Efeitos de tela:** hitstop de 50 ms e tremor de 0,12 só no evento `impact` (acerto confirmado), com trava de 120 ms.

**Custo:** +39 chamadas de desenho sobre a cena (medido; ver `TESTES-E-PERFORMANCE.md`).

**Rollback:** basta remover a flag.
