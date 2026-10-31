# Instruções de integração para o Codex — VFX sakuga (Enemy2, Mini-chefe Enemy2 e flag do herói)

**SHA-base:** `1cc28ac` (main, Mod 241).
**Branch:** `ccr-8ab771c0-yqmwv4`.
**PR:** aberta, **não mesclada**; aguarda aprovação do criador.

## O que esta branch faz

1. **Enemy2 comum e mini-chefe Enemy2** (padrão, sem flag), tratados separadamente (ver `storyboards/01`):
   - o Vórtice Abissal perde as manchas redondas de fumaça e ganha corpo opaco escuro, núcleo branco e estilhaços angulares;
   - impactos sakuga (casca com expansão agressiva, anéis irregulares, rachaduras no terreno, sulco no vetor do golpe, placas e pedras com física) no Vórtice, no Colapso e no fim da Trindade;
   - hitstop e tremor só com acerto confirmado e trava contra disparo duplo.
2. **Herói, só com `?vfxSakuga=1`** (o jogo padrão não muda):
   - Ruptura em X com visual Impacto Cruzado;
   - slot 2 = Esfera da Destruição;
   - slot 3 = Explosão Celestial;
   - mesmos ids/saves (`skill_twin_portals`, `skill_judgment_dragon`); Portais e Dragão continuam no projeto.
3. **Teste de versão:** verifica a coerência entre marcador, loader, BUILD e index na versão publicada (241), em vez de exigir 238. O marcador **não** foi alterado.

## Arquivos

| Arquivo | Tipo | Observação |
|---|---|---|
| `sakuga-impact3d.js` | novo | Impacto sakuga compartilhado (só apresentação) |
| `sakuga-skills3d.js` | novo | Lógica pura da Esfera e da Explosão (120 Hz) |
| `sakuga-skills-vfx3d.js` | novo | VFX do Impacto Cruzado, da Esfera e da Explosão |
| `enemy2-chaos-vfx3d.js` | alterado | Paleta e núcleo do Vórtice, estilhaços no lugar da fumaça, comum ≠ mini-chefe |
| `enemy1-squad-runtime3d.js` | alterado | Emite os impactos sakuga dos eventos `vortexImpact`, `collapse_wave` e `trinityEnd` |
| `mundo-3d-prototype.js` | alterado | Hitstop por acerto no Enemy2; bloco `SAKUGA` (flag) junto de `EXTRA_RUN`; rótulos com a flag |
| `enemy2-preview.html` | alterado | Mostra os impactos sakuga |
| `enemy1-integration.test.mjs` | alterado | Teste de versão pela versão publicada |
| `sakuga-skills.test.mjs` | novo | Lógica e integração da flag |
| `storyboards/*.md`, `MANIFESTO-ARQUIVOS.md`, `TESTES-E-PERFORMANCE.md` | docs | — |

**Caminhos:** o jogo carrega os módulos da raiz, então os arquivos ficam nos caminhos reais (não espelhados em `src/`) para não haver cópia divergente.

## Contratos

- **Impacto:** `createSakugaImpacts(T, scene, { ground }).emit({ id, time, point, dir, size, palette, rocks, furrow })`. Só aceita colisões já confirmadas. Os ids são únicos e as duplicatas, ignoradas.
- **Skills do herói:** `DestructionSphere` e `CelestialExplosion` têm a interface de `XRupture`/`TwinPortals` (`start(source, target, yaw, mul)`, `update(dt, target, { valid })`, `cancel()`, `active`, `phase`, `time`, `age`). O `hit(d, id, kind)` usa os mesmos kinds de eventos.
- **Pontos para o sistema de combate do Codex** (sem substituir nada):
  - eventos de cast: `raise`, `charge`, `circles`;
  - eventos de impacto: `impact`, `strike`;
  - `sakugaHit(ms, shake)`.
  O Codex pode ligar animação, clipes e cápsula física a esses eventos.

## Riscos de conflito

- **`mundo-3d-prototype.js`:** os trechos alterados são o bloco `const SAKUGA=…` depois de `EXTRA_RUN`, `ensureExtraVFX`, `castExtraSkill` (slots 2/3 via `EXTRA_RUN[kind]`), `updateExtraSkills`, `SKILL_LABELS` e `squadDamageTarget`/`squadEvent`. Não mexe em animação, máquina de estados, GLB, espadas, hitboxes nem movimento.
- **`enemy2-chaos-vfx3d.js` e `enemy1-squad-runtime3d.js`:** se o Codex estiver alterando o mini-chefe Enemy2 (foice/combos), as mudanças daqui ficam só no VFX e nos eventos de impacto. Não tocam `poseScythe`, combos nem a lógica do mini-chefe.

## Merge seguro

1. `git fetch origin && git checkout ccr-8ab771c0-yqmwv4 && git merge origin/main`. Resolva os conflitos manualmente, preservando os dois lados. Sem rebase forçado.
2. `node --test`: todos os testes precisam passar.
3. Teste no navegador:
   - `mundo-3d-prototype.html?testeEnemy2=1&todasHabilidades=1` (botões 1/3/5/MINI-CHEFE/PODER);
   - `?vfxLab236=1&todasHabilidades=1&vfxSakuga=1` (slots 1, 2 e 3);
   - sem a flag, para conferir que Portais e Dragão continuam iguais.
4. Só depois da aprovação do criador: mesclar a PR e subir o marcador visível para a versão seguinte à da `main`.
5. Para ativar o visual do herói por padrão no futuro, troque `SAKUGA` por uma configuração do jogador. O rollback é desligar a flag.
