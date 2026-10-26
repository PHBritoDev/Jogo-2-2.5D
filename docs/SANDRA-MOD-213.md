# Sandra — Mod 213

`Sandra-rig.glb` foi regenerado e integrado à campanha. A versão refina olhos amendoados, maquiagem, cabelo longo com textura de fibras, franja lateral, coroa, corset com recortes e amarrações, brincos e botas. É uma interpretação estilizada da referência do autor; não uma reprodução fotorealista da imagem.

## Correções de animação

- Pesos normalizados antes dos cortes da roupa e reamostrados sobre a superfície original. Nos ombros, um campo espacial contínuo substitui saltos de pesos que esticavam pequenas arestas até 58 vezes no ataque.
- Ornamentos usam interpolação sobre triângulos do corpo; garras partem da mão transformada, em vez de coordenadas antigas da pose-base.
- Oito clipes canônicos preservados. Remover todas as ações `.001` no Blender 4.3 eliminava animações válidas; as cópias duplicadas são descartadas só após exportar.
- A esquiva deixa de deslocar o quadril aproximadamente oito metros para baixo. Contato do corpo, botas e acessórios com o chão é corrigido offline nos outros clipes.
- `sandra-materials.js` aplica uma restrição de chão à saia e ao cabelo após skinning, inclusive nos materiais de sombra. É uma restrição de renderização, não uma simulação de tecido. A mesma preparação é usada no jogo e no visualizador.
- Olhos, fibras e roupa usam UVs explícitas diferentes; isso evita perder as íris ao juntar as malhas.

## Reprodução

Verificado com Blender 4.3.2 e MPFB2 commit `6ff1eb358f6c1959ced77e79e6dd2406d9a71f49` (malha-base CC0). Mantenha o MPFB2 fora do checkout do jogo. O esqueleto e os clipes vêm de `Misteriosa-rig.glb`.

```sh
MPFB_DATA=/caminho/mpfb2/src/mpfb/data blender -b -t 4 --python-exit-code 1 --python tools/blender/m8_sandra.py -- Sandra-rig.glb
blender -b -t 4 --python-exit-code 1 --python tools/blender/ground_sandra.py -- Sandra-rig.glb
node --test
```

Execute as duas etapas de geração, nessa ordem. A segunda altera as translações verticais exportadas; não muda rotações dos membros. As texturas de olhos, cabelo e corset estão embutidas no GLB.

## Validação

- `node --test`: 100 testes aprovados, incluindo seis regressões do arquivo binário (integridade, pesos, clipes, esquiva, UVs dos olhos e continuidade nos ombros).
- Khronos glTF Validator: nenhum erro. Aviso `NODE_SKINNED_MESH_NON_ROOT` referente à hierarquia exportada pelo Blender; a hierarquia e a escala foram verificadas no carregador Three.js da campanha.
- Chromium/SwiftShader, Three.js 0.160: oito clipes, 17 instantes por clipe; inspeção de capturas de rosto, repouso, caminhada, ataque e esquiva. Sem erros JavaScript ou de compilação de shaders.
- O carregador real da campanha deve resolver os sete papéis existentes: `SevenSinsDebug3D.inspectSandra()` com `?debug3d=1`.
- O proxy desta máquina exigiu usar curl com o bundle de certificados da plataforma para servir os módulos CDN ao navegador de teste. A verificação TLS permaneceu ativa.

A validação cobre as amostras e poses descritas. Android físico, desempenho mobile e toda a sequência narrativa da revelação ainda precisam de playtest. Não foram criadas expressões faciais novas ou uma nova arma. O orçamento do teste de asset limita o arquivo a 8 MiB.

Sirva a raiz por HTTP e abra `sandra-test.html` para girar o modelo por toque, aproximar o rosto e selecionar os clipes. O visualizador não altera o progresso da campanha.
