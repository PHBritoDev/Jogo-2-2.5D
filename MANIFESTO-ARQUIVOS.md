# Manifesto de arquivos — VFX sakuga

**Base:** `1cc28ac`. **Branch:** `ccr-8ab771c0-yqmwv4`.

| Caminho | Estado | Depende de | Usado por |
|---|---|---|---|
| `sakuga-impact3d.js` | novo | Three.js (injetado) | `enemy1-squad-runtime3d.js`, `sakuga-skills-vfx3d.js`, `enemy2-preview.html` |
| `sakuga-skills3d.js` | novo | — | `mundo-3d-prototype.js` (flag), `sakuga-skills-vfx3d.js`, testes |
| `sakuga-skills-vfx3d.js` | novo | `celestial-fxkit3d.js`, `sakuga-impact3d.js`, `sakuga-skills3d.js` | `mundo-3d-prototype.js` (flag) |
| `enemy2-chaos-vfx3d.js` | alterado | `vfx-flow3d.js`, `celestial-fxkit3d.js` | `enemy1-squad-runtime3d.js`, `enemy2-preview.html` |
| `enemy1-squad-runtime3d.js` | alterado | + `sakuga-impact3d.js` | `mundo-3d-prototype.js` |
| `mundo-3d-prototype.js` | alterado | + `sakuga-skills3d.js`, `sakuga-skills-vfx3d.js` | jogo |
| `enemy2-preview.html` | alterado | + `sakuga-impact3d.js` | prévia isolada |
| `enemy1-integration.test.mjs` | alterado | — | `node --test` |
| `sakuga-skills.test.mjs` | novo | `sakuga-skills3d.js` | `node --test` |
| `storyboards/01…05-*.md` | novo | — | documentação |
| `INSTRUCOES-CODEX.md`, `TESTES-E-PERFORMANCE.md` | novo | — | documentação |

**Arquivos não alterados:**
- skills e VFX dos Portais e do Dragão (`skill-twin-portals*`, `skill-judgment-dragon*`, `vfx-dragon-model3d.js`);
- `vfx-flow3d.js`, `vfx-trail3d.js`, `vfx-impact3d.js`, `celestial-fxkit3d.js`;
- os GLBs;
- o marcador da Mod e o loader.

## Mod 245 — Enemy3 e mini-chefe do Ato III

**Base:** `e2a9505`. Detalhes em `docs/auditorias/ENEMY3-MINIBOSS3-IMPLEMENTACAO.md`.

| Caminho | Estado | Depende de | Usado por |
|---|---|---|---|
| `enemy3-squad3d.js` | novo | `enemy1-squad3d.js`, `boss-choreography3d.js` | `enemy1-squad-runtime3d.js`, testes |
| `enemy3-abyss-vfx3d.js` | novo | `celestial-fxkit3d.js` | `enemy1-squad-runtime3d.js` |
| `enemy3-runtime3d.js` | novo | `crimson-katana3d.js`, `combat-choreography3d.js`, `boss-choreography3d.js` | `enemy1-squad-runtime3d.js` |
| `crimson-katana3d.js` | novo | Three.js (injetado) | `enemy3-runtime3d.js` |
| `enemy3-preview.html` | novo | runtime da esquadra + GLBs | prévia isolada |
| `enemy3-squad.test.mjs` | novo | lógica | `node --test` |
| `enemy1-squad3d.js`, `enemy2-squad3d.js` | alterado | — | ganchos genéricos (canalização, golpes por distância, pós-golpe, atração) |
| `enemy1-squad-runtime3d.js` | alterado | + módulos Enemy3 | `mundo-3d-prototype.js` (e descarte da textura de ossos dos clones) |
| `mundo-3d-prototype.js`, `audio3d.js` | alterado | — | integração mínima, laboratório `?testeEnemy3=1`, `abyss3` |
| `docs/auditorias/ENEMY3-MINIBOSS3-IMPLEMENTACAO.md`, `docs/evidencias/mod245/*` | novo | — | documentação |

**Não alterados:** GLBs, `boss-choreography3d.js` (só recebe `BOSS_MOVES.e3boss` em tempo de execução), coreografias `warden`/`e2boss`, IA/poderes do Enemy1/Enemy2, encontros do Ato IV.
