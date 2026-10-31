# 04 — Skill 2: Esfera da Destruição (slot 2 com `?vfxSakuga=1`)

## Migração

O slot 2 continua usando o id/save `skill_twin_portals`, então saves antigos funcionam. Com a flag:
- a lógica passa a ser `DestructionSphere` (`sakuga-skills3d.js`) e o VFX passa a ser `createSphereVFX`;
- o rótulo vira "ESFERA".

Os Portais (`skill-twin-portals3d.js` e o VFX deles) **não foram apagados**: sem a flag, nada muda.

**Custo e recarga:** mana e recarga são as dos Portais (40 / 11 s).

**Dano total:** ~44, contra ~46 dos Portais.

## Linha do tempo

| Fase | Tempo / quadros | Detalhe |
|---|---|---|
| Mão erguida | 0–0,4 s (24 q) | Pose procedural `channel` (o GLB do herói não tem clipe de "erguer a mão"). 8–14 pedrinhas sobem do chão girando até a mão. |
| Concentração | 0,32 s (19 q) | A esfera cresce de 0,15 a 1 (`easeOut`) e as pedrinhas são sugadas para ela. |
| Voo | 21 m/s, até 30 m | Leve correção de 1,4 rad/s. Colide com a cápsula do alvo, com obstáculo com altura (`extraBlocked`) e com o chão. |
| Contato | — | 30 de dano, uma vez. |
| Contração | 0,05 s (3 q) | Achata em 45%. |
| Cúpula | 0,9 s | Hemisfério rubro-negro: 14 de dano **só** se o alvo estiver a até 3 m do contato. Impacto sakuga `crimson`, 13 pedras. |
| Dissipação | 0,55 s | — |

## Material (3 volumes)

- **Centro:** #FFE4FC, aditivo.
- **Casca:** #B90019, com manchas negras orgânicas #0B000B advectadas por fBm e fendas de luz.
- **Borda:** Fresnel #FC1FD8.
- **Raios:** zigue-zague com núcleo preto (malha normal-blend) e halo magenta (aditivo). Nada de linha fina.

## Efeitos de tela

Hitstop de 45 ms (55 ms na cúpula) só em acerto, com trava contra disparo duplo.

**Custo:** +50 chamadas de desenho (medido).
