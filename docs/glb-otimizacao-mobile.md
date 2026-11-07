# Otimização de GLBs para celular — inventário inicial (Mod 290)

**Situação: só o inventário foi feito. Nenhum GLB foi otimizado nesta rodada**, porque a prioridade era a migração do Enemy1 (checkpoints A–C) com testes. A otimização (checkpoint D) deve ir em lotes, cada um com comparação visual e teste no navegador.

O inventário foi medido com `tools/visual-lab/agent-v7-glb-audit.cjs`: **76 GLBs, cerca de 451 MiB no total**. Os 25 maiores:

| Arquivo | MiB | Triângulos | Imagens | MiB em texturas | Clipes | Skins |
|---|---:|---:|---:|---:|---:|---:|
| `ArvoreAncestralEldoria.glb` | 19.9 | 26.296 | 3 | 18.1 | 0 | 0 |
| `Ganancia3.glb` | 18.9 | 433.810 | 3 | 0.3 | 9 | 1 |
| `CasaEldoria02.glb` | 18.5 | 28.597 | 3 | 16.6 | 0 | 0 |
| `Carroça.glb` | 18.3 | 14.476 | 3 | 17.5 | 0 | 0 |
| `Demonio1.glb` | 16.9 | 31.018 | 3 | 7.9 | 16 | 1 |
| `CasaEldoria01.glb` | 16.5 | 30.343 | 3 | 14.8 | 0 | 0 |
| `Npc.glb` | 16.3 | 382.406 | 3 | 0.2 | 5 | 1 |
| `RochedoMusgoEldoria.glb` | 16.1 | 15.033 | 3 | 15.3 | 0 | 0 |
| `MontanhaEldoria01.glb` | 15.8 | 15.508 | 3 | 14.9 | 0 | 0 |
| `Ganancia2.glb` | 15.4 | 361.048 | 3 | 0.2 | 10 | 1 |
| `EntradaCavernaAto1.glb` | 15.3 | 14.962 | 3 | 14.3 | 0 | 0 |
| `PocoEldoria.glb` | 15.1 | 8.684 | 3 | 14.6 | 0 | 0 |
| `ArreiosCavalo.glb` | 14.8 | 10.220 | 3 | 14.1 | 0 | 0 |
| `FerreiroEldoria.glb` | 14.2 | 9.393 | 3 | 13.6 | 0 | 0 |
| `PassarelaSuspensaEldoria.glb` | 14.1 | 9.608 | 3 | 13.4 | 0 | 0 |
| `Ganancia1.glb` | 14.0 | 308.258 | 3 | 0.2 | 11 | 1 |
| `CristalCaverna01.glb` | 13.7 | 10.329 | 3 | 13.2 | 0 | 0 |
| `BarracaFrutasEldoria.glb` | 13.4 | 9.097 | 3 | 12.8 | 0 | 0 |
| `Ponte.glb` | 13.2 | 9.179 | 3 | 12.6 | 0 | 0 |
| `JaulaRitualAto1.glb` | 13.1 | 13.210 | 3 | 12.1 | 0 | 0 |
| `Bispo4.glb` | 12.8 | 300.190 | 3 | 0.3 | 6 | 1 |
| `AnjoGuia.glb` | 11.1 | 265.788 | 3 | 0.1 | 5 | 1 |
| `Bispo3.glb` | 10.3 | 231.102 | 3 | 0.4 | 6 | 1 |
| `Enemy2.glb` | 8.4 | 272.484 | 3 | 0.3 | 0 | 0 |
| `Bispo1.0.glb` | 7.7 | 10.035 | 3 | 5.9 | 5 | 1 |

## Leitura
- **Cenário e props do Ato 1** (`ArvoreAncestralEldoria`, `CasaEldoria01`/`02`, `Carroça`, `Rochedo…`, `Montanha…`, `Poço…`, `EntradaCaverna…`):
  - poucos triângulos (de 8 mil a 30 mil), e **mais de 90% do peso são texturas**;
  - o maior ganho com o menor risco é reduzir as texturas para 1K ou 2K (conforme a distância de visão) e usar WebP/JPEG para cor e normal.
  - Não há necessidade de decimar a malha.
- **Personagens animados pesados em malha** (`Ganancia3`, `Ganancia2`, `Npc`, com 360 mil a 430 mil triângulos):
  - aqui o peso é geometria;
  - se for preciso, LOD ou decimação **preservando a skin e os clipes**, sempre com teste do rig.
- **`Demonio1.glb` (16,9 MiB):**
  - 5,7 MB são só a normal map em PNG;
  - convertê-la (por exemplo, para 2K JPEG/WebP) reduziria o arquivo pela metade sem mexer em malha, rig ou clipes;
  - fica como primeiro lote proposto, porque é carregado logo no Ato 1.

## Regras para os próximos lotes
- Os originais ficam recuperáveis no histórico do Git.
- Preservar UV, normais, skin, morph targets e clipes.
- Comparação visual antes e depois no mesmo ângulo.
- KTX2/Meshopt/Draco só com o loader testado no navegador.
- Um lote por PR.
