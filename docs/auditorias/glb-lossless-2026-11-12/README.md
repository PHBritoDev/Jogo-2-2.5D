# GLB: otimização conservadora

Base: `49113a707ae51d838a9965ad2c367d6ae0464f5a`. 95 GLBs auditados; nenhum GLTF externo encontrado.

**13 modelos otimizados; economia de 9.099.620 bytes (9,10 MB decimais).** Nomes e caminhos preservados. Sem redução de triângulos, resolução, normais, UVs, ossos, morph targets, clipes ou canais. Não introduz codecs/extensões.

Método: bufferViews idênticos compartilham bytes no BIN, intervalos sem referência são descartados, JSON reempacotado e IDAT de PNG recomprimido por DEFLATE. Amostras filtradas de PNG e todos os outros chunks (ICC/gamma etc.) são comparados exatamente. WebP/JPEG preexistentes são preservados byte a byte. Nenhum nó ou mesh oculto foi removido: poderia ser acessado pelo jogo.

## Validação

- 6 testes unitários; equivalência estrutural e de payload dos 95 GLBs.
- 248 comparações renderizadas, diferença **zero em todos os canais**, em Chromium desktop e viewport touch: 13 modelos × ambos os perfis, três vistas/close por modelo e 85 clipes em pose a 37% da duração. Ver `browser.json`.
- Khronos glTF Validator nos 95 pares: **zero novos erros/avisos**. Existem 10.243 erros preexistentes nos originais; isto NÃO significa que os originais passem integralmente na especificação. Códigos e contagens preservados em `structure.json`; não alteramos rig/topologia para esconder erros antigos.
- Jogo real com os GLBs otimizados: 35 modelos requisitados, nenhuma falha JS/GLB; sequência 3ª → 1ª → 3ª, screenshots e estados em `world.json`.
- [Closes antes/depois](closeups.png). Resultados completos por arquivo em [audit.json](audit.json).

## Limites das medições

Chromium/SwiftShader em nuvem, incluindo viewport touch: **não é Android físico**. Nenhum ganho de FPS ou de VRAM é alegado. O custo de geometria/textura decodificada permanece igual. `audit.json` estima memória de imagens RGBA8+mips, sem custos do driver; `browser.json` registra tempos locais de load/parse, com possível viés de ordem/cache, sem alegar benchmark de rede. Clipes são amostrados, não uma validação de todos os frames da campanha. Os bytes integrais de todas as trilhas e pesos são preservados.

Sem novas dependências de execução do jogo. Testes usam Three 0.160.0, igual ao jogo. Quantização, meshopt, Draco adicional, KTX2 e compressão com perdas foram descartados: desnecessários para o ganho seguro e exigiriam outro contrato de carregamento.

## Escopo, licenças e reversão

Todos os 95 arquivos foram avaliados. Ganhos inferiores a 1 KiB foram descartados para evitar churn de binários. `Bispo1.0.glb`, `Moradores-216.glb` e `NpcEspecial-otimizado.glb` não têm referência literal ativa no runtime auditado: mantidos como arquivo histórico, sem presumir que a ausência de referência autoriza exclusão. LODs com nomes construídos dinamicamente permanecem presentes. `DevoradorLunar.glb` preservado conforme congelamento em AGENTS.md. Na retomada, PR #481 (Claude) não altera GLBs. Esta PR não modifica build-info.js, gameplay, menu, cenários ou scripts de Claude; mantém a numeração reservada pelo trabalho em andamento. Nenhum PR aberto alterava GLBs na auditoria inicial; a geração utiliza os hashes da base e a integração revalida concorrência.

Copyright, generator, extras e metadados originais estão em `audit.json` e permanecem intactos. Ausência de licença individual nos metadados não comprova direitos; nenhum asset novo/externo foi introduzido. Originais recuperáveis no commit-base e por revert do commit de assets, sem duplicatas gigantes no build.

## Tamanhos por arquivo

| Arquivo | Antes (bytes) | Depois (bytes) | Economia | Resultado |
|---|---:|---:|---:|---|
| Anjo-rig.glb | 3574176 | 3563944 | 10232 | aprovado |
| AnjoGuia-lod.glb | 2411748 | 2411748 | 0 | preservado (sem ganho relevante) |
| AnjoGuia.glb | 11688812 | 11688812 | 0 | preservado (sem ganho relevante) |
| AnjoGuiador-otimizado.glb | 12958700 | 10152612 | 2806088 | aprovado |
| ArreiosCavalo.glb | 3164904 | 3164904 | 0 | preservado (sem ganho relevante) |
| Arvore.glb | 247036 | 247036 | 0 | preservado (sem ganho relevante) |
| ArvoreAncestralEldoria.glb | 5440360 | 5440360 | 0 | preservado (sem ganho relevante) |
| ArvoreFloresta01.glb | 5331328 | 4945808 | 385520 | aprovado |
| Asas.glb | 123824 | 105356 | 18468 | aprovado |
| AsasAnjo_leve.glb | 5788104 | 5788104 | 0 | preservado (sem ganho relevante) |
| BarracaFrutasEldoria-lod1.glb | 196508 | 196508 | 0 | preservado (sem ganho relevante) |
| BarracaFrutasEldoria.glb | 2963084 | 2963084 | 0 | preservado (sem ganho relevante) |
| Bispo1-lod.glb | 1504552 | 1504552 | 0 | preservado (sem ganho relevante) |
| Bispo1.0.glb | 8078112 | 8078112 | 0 | preservado (arquivo histórico) |
| Bispo2-lod.glb | 2236212 | 2236212 | 0 | preservado (sem ganho relevante) |
| Bispo2.glb | 5861608 | 5861608 | 0 | preservado (sem ganho relevante) |
| Bispo3-lod.glb | 3950292 | 3950292 | 0 | preservado (sem ganho relevante) |
| Bispo3.glb | 10838464 | 10838464 | 0 | preservado (sem ganho relevante) |
| Bispo4-lod.glb | 5117136 | 5117136 | 0 | preservado (sem ganho relevante) |
| Bispo4.glb | 13425456 | 13425456 | 0 | preservado (sem ganho relevante) |
| Cabelo-otimizado.glb | 492324 | 492324 | 0 | preservado (sem ganho relevante) |
| CabeloMulher-otimizado.glb | 2103564 | 2103564 | 0 | preservado (sem ganho relevante) |
| Carroça.glb | 1774720 | 1774720 | 0 | preservado (sem ganho relevante) |
| CasaEldoria01-lod1.glb | 367960 | 367960 | 0 | preservado (sem ganho relevante) |
| CasaEldoria01.glb | 4233872 | 4233872 | 0 | preservado (sem ganho relevante) |
| CasaEldoria02-lod1.glb | 399600 | 399600 | 0 | preservado (sem ganho relevante) |
| CasaEldoria02.glb | 5279488 | 5279488 | 0 | preservado (sem ganho relevante) |
| Casaco.glb | 209788 | 209788 | 0 | preservado (sem ganho relevante) |
| Cavalo.glb | 5214268 | 4574296 | 639972 | aprovado |
| Coliseu.glb | 1518692 | 1518692 | 0 | preservado (sem ganho relevante) |
| CriancaNpc-otimizado.glb | 5841060 | 5774848 | 66212 | aprovado |
| CristalCaverna01.glb | 2527720 | 2527720 | 0 | preservado (sem ganho relevante) |
| Demonio1.glb | 17707512 | 16074652 | 1632860 | aprovado |
| DesertoKit.glb | 1139172 | 1139172 | 0 | preservado (sem ganho relevante) |
| DevoradorLunar.glb | 663468 | 663468 | 0 | preservado (congelado) |
| EldoriaArvoresTropicais.glb | 1105992 | 1105992 | 0 | preservado (sem ganho relevante) |
| Enemy2-rig.glb | 2740364 | 2740364 | 0 | preservado (sem ganho relevante) |
| Enemy2.glb | 8839184 | 8839184 | 0 | preservado (sem ganho relevante) |
| Enemy3.glb | 1926444 | 1926444 | 0 | preservado (sem ganho relevante) |
| Enemy4.glb | 1814648 | 1814648 | 0 | preservado (sem ganho relevante) |
| EntradaCavernaAto1.glb | 3472532 | 3472532 | 0 | preservado (sem ganho relevante) |
| Espada1.glb | 1552760 | 1552760 | 0 | preservado (sem ganho relevante) |
| EspadaBispo2.glb | 1653676 | 1653676 | 0 | preservado (sem ganho relevante) |
| EspadaBispo3.glb | 1209036 | 1209036 | 0 | preservado (sem ganho relevante) |
| EspadaBispo4.glb | 714440 | 714440 | 0 | preservado (sem ganho relevante) |
| EspadaProta.glb | 581348 | 581348 | 0 | preservado (sem ganho relevante) |
| EspadaVeraxion.glb | 118512 | 118512 | 0 | preservado (sem ganho relevante) |
| FerreiroEldoria-lod1.glb | 250724 | 250724 | 0 | preservado (sem ganho relevante) |
| FerreiroEldoria.glb | 3340196 | 3340196 | 0 | preservado (sem ganho relevante) |
| FiguraDeLuz.glb | 704364 | 704364 | 0 | preservado (sem ganho relevante) |
| Ganancia1-lod.glb | 4320232 | 4320232 | 0 | preservado (sem ganho relevante) |
| Ganancia1.glb | 14687156 | 14687156 | 0 | preservado (sem ganho relevante) |
| Ganancia2-lod.glb | 4155440 | 4155440 | 0 | preservado (sem ganho relevante) |
| Ganancia2.glb | 16198700 | 16198700 | 0 | preservado (sem ganho relevante) |
| Ganancia3-lod.glb | 5660384 | 5660384 | 0 | preservado (sem ganho relevante) |
| Ganancia3.glb | 19833368 | 19833368 | 0 | preservado (sem ganho relevante) |
| Grama.glb | 30912 | 30912 | 0 | preservado (sem ganho relevante) |
| JaulaRitualAto1.glb | 3322784 | 3322784 | 0 | preservado (sem ganho relevante) |
| Lua.glb | 2194748 | 2194748 | 0 | preservado (sem ganho relevante) |
| MeninaNpc-otimizado.glb | 7300060 | 7231376 | 68684 | aprovado |
| Misteriosa-rig.glb | 1882012 | 1882012 | 0 | preservado (sem ganho relevante) |
| Montanha.glb | 264976 | 264976 | 0 | preservado (sem ganho relevante) |
| MontanhaEldoria01-lod1.glb | 26500 | 26500 | 0 | preservado (sem ganho relevante) |
| MontanhaEldoria01.glb | 3547024 | 3547024 | 0 | preservado (sem ganho relevante) |
| Moradores-216.glb | 588188 | 588188 | 0 | preservado (arquivo histórico) |
| MoradoresPose.glb | 840456 | 840456 | 0 | preservado (sem ganho relevante) |
| MulherNpc-otimizado.glb | 9750348 | 9684832 | 65516 | aprovado |
| NPC_Masculino_Animado_Otimizado_1K.glb | 8042568 | 8042568 | 0 | preservado (sem ganho relevante) |
| NeveKit.glb | 910328 | 902168 | 8160 | aprovado |
| Npc-lod.glb | 2794716 | 2794716 | 0 | preservado (sem ganho relevante) |
| Npc-lod2.glb | 1312980 | 1312980 | 0 | preservado (sem ganho relevante) |
| Npc.glb | 17065128 | 17065128 | 0 | preservado (sem ganho relevante) |
| NpcEspecial-otimizado.glb | 13266124 | 13266124 | 0 | preservado (arquivo histórico) |
| PassarelaSuspensaEldoria.glb | 3420652 | 3420652 | 0 | preservado (sem ganho relevante) |
| PocoEldoria-lod1.glb | 243192 | 243192 | 0 | preservado (sem ganho relevante) |
| PocoEldoria.glb | 3236544 | 3236544 | 0 | preservado (sem ganho relevante) |
| Ponte.glb | 2825004 | 2825004 | 0 | preservado (sem ganho relevante) |
| Prota_otimizado_2K.glb | 21977932 | 19274576 | 2703356 | aprovado |
| Protagonista-cine.glb | 120548 | 120548 | 0 | preservado (sem ganho relevante) |
| Protagonista-corrida-216.glb | 116036 | 116036 | 0 | preservado (sem ganho relevante) |
| Protagonista-corrida-235.glb | 96360 | 96360 | 0 | preservado (sem ganho relevante) |
| Protagonista-corrida.glb | 60360 | 60360 | 0 | preservado (sem ganho relevante) |
| Protagonista-ritos-231.glb | 687700 | 687700 | 0 | preservado (sem ganho relevante) |
| Protagonista-ritos-232.glb | 820056 | 820056 | 0 | preservado (sem ganho relevante) |
| Protagonista.glb | 1215824 | 1215824 | 0 | preservado (sem ganho relevante) |
| RochedoMusgoEldoria-lod1.glb | 269300 | 269300 | 0 | preservado (sem ganho relevante) |
| RochedoMusgoEldoria.glb | 3648748 | 3648748 | 0 | preservado (sem ganho relevante) |
| Sandra-rig.glb | 7054052 | 6369704 | 684348 | aprovado |
| TochaMedievalTripo.glb | 1106588 | 1106588 | 0 | preservado (sem ganho relevante) |
| TorreKit.glb | 558704 | 558704 | 0 | preservado (sem ganho relevante) |
| TronoCeleste.glb | 516008 | 516008 | 0 | preservado (sem ganho relevante) |
| VilaKit.glb | 405868 | 405868 | 0 | preservado (sem ganho relevante) |
| Vitima-rig.glb | 2495000 | 2484796 | 10204 | aprovado |
| biblia_celestial_aberta.glb | 30916 | 30916 | 0 | preservado (sem ganho relevante) |
| biblia_celestial_fechada.glb | 19288 | 19288 | 0 | preservado (sem ganho relevante) |

## Reprodução

```sh
python3 -m unittest discover -s tools/glb -p "test_*.py"
GLB_BASE_SHA=49113a707ae51d838a9965ad2c367d6ae0464f5a python3 tools/glb/ci-verify.py
npm ci --prefix tools/glb
tools/glb/node_modules/.bin/playwright install chromium --only-shell
node tools/glb/validate-structure.cjs
python3 -m http.server 4180 --bind 127.0.0.1
node tools/glb/validate-browser.cjs
```

Servidor em terminal separado. Diretórios `original`, `optimized` e `evidence` são saídas locais de QA, não devem ser publicados.

## Conciliação na retomada

Main avançou para `37528b8c12a44450f23460ad5197a830dd832907`. Os 95 GLBs da auditoria permanecem com os mesmos hashes originais. Dois modelos novos, `Anjos.glb` e `BracoDireitoEsquerdo.glb`, foram adicionados enquanto Claude trabalha no prólogo: preservados, fora desta otimização para não interferir. Não são contabilizados como validados nesta auditoria. Nenhum arquivo desta alteração coincide com os arquivos modificados pelo PR #481. A integração preserva o menu e todos os arquivos atuais de main.
