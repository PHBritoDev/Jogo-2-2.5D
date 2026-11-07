# Migração Enemy1 → `Demonio1.glb` (Mod 290)

**Resultado:** o Enemy1 (Seguidor da Ganância e Guardião do Portal) agora usa **um único modelo visual, `Demonio1.glb`**. Os modelos antigos `Enemy1.glb` e `Enemy1-lod.glb` foram **removidos depois** da validação no navegador. Toda a lógica de IA, poderes e VFX foi preservada (nenhum arquivo `enemy1-*.js` de poder foi apagado nem reescrito).

## A) Mapa de dependências (antes)
| Onde | O que fazia | Situação |
|---|---|---|
| `mundo-3d-prototype.js` · `loadEnemyModel()` | Carregava `Enemy1-lod.glb` (e, se falhasse, `Enemy1.glb`), mapeava os clipes por tabela de UUIDs, normalizava a altura pelo osso `HeadTop_End` e criava `enemy1Rig`. | Agora carrega `Demonio1.glb`, com tabela nova de clipes. O fallback para o modelo antigo foi removido; se o arquivo falhar, sobra o sprite de reserva. |
| `rigSource('enemy1')` → esquadra (`startSquadPack`), laboratório (`startEnemy1Lab`, `?testeEnemy1=1`), encontros do Ato 1 | Todos clonam o `enemy1Rig` (`cloneSkinned`, esqueleto independente por ator). | Sem mudança de código: recebem o Demonio1 automaticamente. |
| `enemy1-squad-runtime3d.js` | Corpo visual da esquadra: clone, mixer e materiais por ator; garras do Guardião presas a `RightHand`/`LeftHand`; altura até o topo da cabeça; foice, katana etc. de outras espécies. | Altura agora aceita `HeadEnd` (o osso do Demonio1). Usa o clipe **Dead** real do Demonio1 (antes era uma queda procedural, por falta de clipe) e as velocidades do rig. Os outros rigs não mudam. |
| `enemy1-squad3d.js` (IA, golpes, `claws`, `spiral`, `judgment`, `counter`, recargas, dano, stagger, guarda) | Lógica pura. | **Intacto.** |
| `enemy1-dark-vfx3d.js` (VFX dos poderes) | Usa as mãos e a cabeça do corpo visual. | **Intacto.** O Demonio1 tem `RightHand`, `LeftHand` e `Head`. |
| `Enemy1-sprite.png` | Sprite de reserva enquanto o GLB carrega. | Mantido (é carregado pelo jogo). |
| `Enemy1-ui.webp` | Retrato no bestiário (`progression3d.js`). | Mantido. |
| `Enemy1.png` | Não é carregado por nenhum código (só citado em `docs/AUDITORIA-ARMAZENAMENTO-BASELINE.md`). | Mantido por precaução: é imagem, não modelo. Pode ser removido num PR de limpeza. |
| `docs/auditorias/COMBATE-CINEMATICO-GLBS.json` | Auditoria histórica que cita os GLBs antigos. | Documento histórico, sem efeito no jogo. |

## B) Clipes reais do `Demonio1.glb` → papéis do jogo
Os nomes vêm da introspecção do GLB (`tools/visual-lab/enemy1-migration-audit.cjs`), não da interface do Meshy.

| Clipe no GLB | Duração | Papel | Usado hoje por |
|---|---:|---|---|
| `_01a1b3e4_6f0c_705b_82f5_e9447d85cbef` | 4,97 s | `idle` (respiração demoníaca) | repouso, base das camadas procedurais |
| `_01a1b3e6_e46e_7367_9007_2e104dc2e6b7` | 2,47 s | `hit` (reação ao dano) | stagger leve (antes caía em `block`) |
| `Walking` | 1,03 s | `walk` | locomoção |
| `Running` | 0,63 s | `run` | perseguição |
| `Left_Hook_from_Guard` | 1,00 s | `attack` | corpo a corpo e garras |
| `Roundhouse_Kick` | 2,67 s | `attack2` | segundo golpe |
| `mage_soell_cast_8` | 1,33 s | `cast` | espiral, juízo e conjurações |
| `Alert` | 4,00 s | `block` | guarda e guarda quebrada |
| `Roll_Dodge` | 1,83 s | `dash` | esquiva/investida (sem deslocamento: quem move é o código) |
| `Run_Jump_and_Roll` | 3,43 s | `jump` | salto (sem deslocamento) |
| `Dead` | 2,97 s | `death` | morte (clipe real) |
| `Arise` | 1,83 s | `arise` | reservado (levantar) |
| `Knock_Down` | 2,50 s | `knockdown` | reservado |
| `Sweep_Kick` / `Sweeping_Kick` | 4,03 / 2,33 s | `sweep` / `sweep2` | reservados (são dois clipes distintos de fato) |
| `Weapon_Combo_2` | 4,50 s | `combo` | reservado (usa arma que o Demonio1 não tem) |

- **Clipes sem uso:** os "reservados" ficam no mixer, mas nenhum golpe novo foi criado; a coreografia nova será definida com o autor.
- **Papel que faltar:** o `play()` da esquadra já cai para `block` (no caso de `hit`), para `attack` (no caso de `attack2`) e para `idle`. Uma tabela explícita (`DEMONIO1_CLIP_TABLE`) e um teste garantem que todos os 16 clipes estão mapeados.
- **Velocidades** (`ENEMY1_TIME_SCALES`, também passadas à esquadra pelo rig):
  - idle a .85, porque a respiração dura cerca de 5 s (o idle antigo tinha 2,5 s e rodava a .38);
  - hit a 1,6, dash a 1,25 e salto a 1,15.
- **Escala:** o modelo vem com 4,84 m até `HeadEnd` e é normalizado para 1,90 m, perto da altura do herói; o Guardião fica 1,22× maior, como antes. Os pés ficam no chão (fixados pelo osso do pé, como antes).

## C) Remoção do legado
`Enemy1.glb` (9,3 MB) e `Enemy1-lod.glb` (2,2 MB) foram apagados. Eles continuam recuperáveis no histórico do Git. Duas verificações garantem que nada voltou a carregá-los:
- `tools/visual-lab/enemy1-migration-audit.cjs` (o workflow da PR) agora **falha** se algum `.js`/`.html` ainda carregar `./Enemy1.glb` ou `./Enemy1-lod.glb`, ou se os arquivos existirem;
- `demonio1-migration.test.mjs` faz a mesma checagem e também confere a tabela de clipes, os ossos das mãos e da cabeça, e o osso usado para medir a altura.

## Testes executados
- **`node --test`:** 458 passando e 6 falhando.
  - **As 6 falhas são as mesmas da branch antes desta mudança**, conferido com as mudanças guardadas: `tools/visual-lab/*` sem `sharp`, Mod 262 e Mod 278.
  - Os 2 testes novos passam.
- **Chromium headless (SwiftShader), `?testeEnemy1=1`, paisagem 900×405 e retrato 405×860 (mobile/touch):**
  - `Demonio1.glb` é carregado, e nenhum GLB antigo é pedido;
  - **0 erros de JS e 0 respostas ≥ 400**;
  - carregamento em cerca de 11–14 s (SwiftShader).
  - Cenas exercitadas: esquadra de 2 e de 4, Guardião; os poderes `claws` (GARRAS DO ABISMO), `spiral` (ESPIRAL DEVORADORA) e `judgment` (JUÍZO VIOLETA) forçados; dano; morte com o clipe Dead.
- **Regressão:** `?testeEnemy2=1` e `?testeDimensao=bishop1` com 0 erros e 0 respostas 404.
- **FPS:** SwiftShader não mede FPS de celular real. FPS e memória em Android não foram medidos.

## Riscos conhecidos
- **Tamanho:** `Demonio1.glb` tem 16,9 MiB, contra 2,2 MiB do LOD antigo, então o download inicial do Ato 1 fica maior. A redução das texturas é o primeiro lote proposto em `docs/glb-otimizacao-mobile.md`.
- **Animações:** o Demonio1 é mais esguio, e as animações do Meshy (chute, gancho) não são de garras. Os golpes atuais (alcance e hitbox, definidos na lógica) continuam iguais; a coreografia nova fica para a próxima etapa com o autor.

## Evidências
`docs/evidencias/mod290/`:
- `paisagem_*` e `retrato_*`: idle/caminhada, combate, garras, espiral, juízo, dano, esquadra de 4 e Guardião;
- `close_*`: idle, dano e morte de perto;
- `regressao_*`.
