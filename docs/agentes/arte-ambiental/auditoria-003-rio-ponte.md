# Auditoria 003 — rio, ponte e margem (13/11/2026, BRT)

**Método:** leitura estática dos módulos na main; sem navegador/WebGL, screenshots ou Android nesta rodada. Nenhuma alteração visual implementada; achados abaixo são riscos verificáveis no código, não falhas confirmadas em jogo.

## Escopo e coordenação
- Inspecionados `eldoria-river-props.js`, `eldoria-asset-plan.js` e `eldoria-city-dressing.js`.
- Conferida busca de PRs abertos: Claude #481 e outros agentes #473, #485–#494, incluindo PR próprio #489. Não editar código compartilhado até inspecionar diff e validação.
- Região nova em relação às auditorias 001 (floresta/vila) e 002 (entrada/galeria da caverna).

## Achados técnicos verificáveis
1. **Ponte procedural:** `planBridge` constrói 18 segmentos por padrão, com três blocos no tabuleiro/parapeitos por segmento, laterais inferiores e dois encontros. `mergeBoxes` combina os blocos em um único `BufferGeometry`, material de cores por vértice e uma malha: desenho leve em draw calls, porém as pedras ainda têm silhuetas de caixas. Risco artístico: arco/guarda-corpo com repetição mecânica perceptível. Não substituir por GLB sem comparar a ponte existente do criador (`Ponte.glb`, inventariada em `eldoria-asset-plan.js`) e sua função real na campanha.
2. **Ponte e caminhada:** a geometria renderizada em `planBridge` tem tabuleiro curvo `rise*(1-t²)+.08` e inclinação calculada por segmento. É obrigatório conferir se a superfície de colisão/navegação reproduz esta curva; **não se pode concluir erro de colisão só deste módulo**, pois registro pode estar em outro arquivo.
3. **Rochas do rio:** `planRiverRocks` sorteia até 3 tentativas por rocha, limita sobreposição entre rochas e áreas em `avoid`; `buildRiverRocks` usa `InstancedMesh` de uma única geometria. Ponto a verificar: distribuição e imersão na margem/água, ausência de bloqueios, espuma junto às rochas. Não aumentar contagem nem introduzir draw calls.
4. **Posicionamento de referências:** `ELDORIA_ZONES.aguas` aponta [0,3,-10], `lago` [-42,-.4,24], e `Ponte.glb` está listada em (-21,-6), tamanho 9. Esses pontos pertencem ao estudo de arte; confirmar no mundo jogável antes de usá-los como coordenadas de reprodução.
5. **Contexto narrativo:** `eldoria-city-dressing.js` explicita que a cidade continua bonita e a pobreza deve aparecer em pessoas/alimentos; não degradar arquitetura nem introduzir ruínas.

## Intervenção candidata — ainda não autorizada por QA
Se capturas em câmera de jogador demonstrarem que o arco parece feito de blocos artificiais, experimentar *apenas* variação sutil de silhueta nas pedras já existentes, sem alterar área caminhável, parapeitos, contagem de meshes ou altura do tabuleiro; comparar com o modelo autoral. Se o modelo autoral for visualmente superior e couber no orçamento, avaliar reutilização com mesmas colisões. Reverter qualquer regressão.

## Validação pendente
1. Inspecionar diff do PR #481 e referências de ponte/água para excluir conflito.
2. Executar o jogo em pontos de câmera próximos a [0,3,-10], [-21,-6] e [-42,-.4,24], localizar a ponte realmente usada, registrar antes/depois com mesma lente e hora do jogo.
3. Testar travessia caminhando/correndo, parapeitos, margem e ausência de paredes invisíveis; capturar `renderer.info.render.calls`, triângulos, FPS e stutter em Android físico. SwiftShader não comprova desempenho mobile.
4. Implementar somente após confirmar visualmente o defeito, obter baseline e assegurar área livre de conflitos.

**Resultado:** auditoria documentada; nenhuma cena, iluminação, combate, história ou branch de outra IA alterada. Sem merge.
