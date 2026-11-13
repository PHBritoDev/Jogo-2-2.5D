# Auditoria 005 — nascente e cachoeira de Eldória
Data: 2026-11-13 (BRT). Método: leitura estática da main, sem execução WebGL, screenshots ou benchmark Android. Região nova, distinta de floresta/vila, caverna, ponte/rio e mercado.

## Coordenação
- PR #481 (Claude, prólogo e Eldória) permanece como referência de conflito: https://github.com/PHBritoDev/Jogo-2-2.5D/pull/481 . Seu corpo informa capturas CI 852×393/1280×720 em SwiftShader, não FPS de Samsung A55.
- PRs recentes #498 (áudio da cachoeira), #488 (iluminação) e #489 (arte) mantêm escopos separados. Não editar `audio3d.js`, shaders de água/iluminação, nem arquivos compartilhados sem validação e coordenação.

## Evidência de código
Arquivo `eldoria-waterfall3d.js`, blob main `a0819222ecbd5d2b52aa9c93e9229d98e933d519`:
- Rota da água: 9 pontos de x=101,z=-9.2 até x=77.2,z=-8.6; largura nominal 1.9 m (`halfWidth=.95`); degrau em (90.8,-9), base em (77.8,-8.6).
- `buildRiverMesh` recebe amostra do terreno `height(x,z)+.14`, passo .55 normal / .9 lowSpec. Há duas malhas de névoa `PlaneGeometry` com shader transparente, `depthWrite:false`, renderOrder 4; água renderOrder 3. Não há luzes extras no módulo.
- Espuma é configurada via `fall.material.setRocks` em dois pontos, sem malha de disco independente. **Inconsistência documental comprovada:** cabeçalho diz “1 disco de espuma” mas a implementação visível usa o shader da água. Não inferir bug gráfico daí.
- O shader de névoa mistura duas camadas de ruído e reduz opacidade à noite. O efeito é composto por planos voltados à câmera (billboard por shader), o que pode parecer chapado em ângulos laterais. **Hipótese artística, não defeito visual confirmado.**
- O material de névoa é transparente e `depthWrite:false`; checar ordenação/oclusão com rochas e água em diferentes ângulos, sem alterar o shader pertencente ao escopo de iluminação.

## Próxima intervenção candidata (não aplicada)
**Prioridade:** validar silhueta da queda e integração água–rocha em câmera lateral/baixa, especialmente o degrau x≈90.8 e o encontro x≈77.8. Se houver névoa quadrada, transição artificial ou fita flutuante, propor ajuste local de posição/tamanho de planos ou espuma, sem adicionar draw calls nem texturas; pedir coordenação caso o arquivo esteja em alteração. A primeira correção segura imediata seria alinhar a descrição técnica ao efeito realmente renderizado, mas não altera qualidade e fica secundária.

## QA obrigatório
1. Inspecionar build atual e fotos de frente/lado/cima e câmera do jogador em x≈90.8,z≈-9 e x≈77.8,z≈-8.6, tanto dia quanto noite; confirmar conexão ao leito.
2. Verificar se a água e a névoa não atravessam pedras/vegetação e se há passagem adequada para o jogador.
3. Registrar draw calls, triângulos, transparência/overdraw e frame time; comparar mesma câmera/qualidade em build antes/depois; medir Android físico separadamente.
4. Preservar áudio e iluminação sob responsabilidade de outros agentes. Nunca mesclar ou ativar auto-merge sem autorização.

## Resultado
Auditada uma quinta região com localização e custos estruturais. **Nenhum bug visual confirmado, nenhuma melhoria visual implementada, nenhuma captura, benchmark, teste em jogo ou merge.** Não afirmar desempenho mobile com base no CI SwiftShader.
