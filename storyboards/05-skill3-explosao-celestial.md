# 05 — Skill 3: Explosão Celestial (slot 3 com `?vfxSakuga=1`)

## Migração

O slot 3 continua usando o id/save `skill_judgment_dragon`. Com a flag:
- a lógica passa a ser `CelestialExplosion` e o VFX passa a ser `createCelestialVFX`;
- o rótulo vira "EXPLOSÃO".

O Dragão e os assets dele continuam no projeto. A câmera especial do Dragão não é acionada, porque lê `judgmentDragon`, que fica inativo.

**Dano:** 40 (pilar) + 26 (onda), contra ~66 do Dragão.

## Linha do tempo (60 FPS)

| Fase | Tempo / quadros | Detalhe |
|---|---|---|
| Carga | 0–0,6 s (0–36) | Ponta da arma em magenta; estrelas de 4 pontas verde #78FFB8, ouro #FFD86A, azul #7BC8FF e rosa #FF8ADD em espiral até a ponta; 3 anéis magenta subindo em volta do herói. |
| Círculos | 0,6–1,2 s (36–72) | 4 círculos horizontais escalonados (2,6 a 8,9 m de altura, raio de 3,6 a 1,95), laranja #FF7B24 e magenta #E32DCE alternados, girando em sentidos opostos. O desenho é **original**: anéis, dois triângulos em contra-rotação, hélices e marcas rúnicas procedurais. Duas correntes orbitais inclinadas. A marca segue o alvo só por 0,3 s e depois **trava**. |
| Pilar | 1,2–2,5 s (72–150) | Sobe 34 m em 0,12 s. Corpo dourado #FFC62E com bordas vermelhas #C93228 e núcleo branco #FFFFFF, mais um cilindro interno. Às 1,28 s: dano no núcleo (raio 3,2 m) e flash de 2 quadros. Cúpula de pressão branco-azulada, 3 anéis de choque no ar e impacto sakuga `celestial` (cratera, rachaduras, 15 pedras). Às 1,5 s: onda horizontal baixa (0,5 m) até 7,5 m em 0,55 s, que dá para **saltar** ou evitar saindo do raio. |
| Dissipação | 0,9 s | O pilar some por erosão. |

## Efeitos de tela

- **Flash:** branco-dourado de ~2 quadros (34 ms), com intensidade a 35% se `reduceFlash` ou movimento reduzido.
- **Hitstop e tremor:** hitstop de 60 ms e tremor de 0,24 (pilar) / 0,14 (onda) só em acerto.

**Custo:** +46 chamadas de desenho, contra a meta de < 120 (medido; o "468 chamadas" relatado era a contagem total da cena com o Dragão, não o custo incremental). Os shaders compilam no `precompileWorld` quando a flag está ligada, porque `ensureExtraVFX(true)` cria os VFX sakuga.
