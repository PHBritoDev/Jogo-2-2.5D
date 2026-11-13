# Auditoria 002 — fachada da caverna e Galeria dos Ecos
Data: 2026-11-13 (BRT). Método: inspeção estática de código na main; **sem jogo executado ou capturas**.

## Fontes e coordenadas
- `eldoria-cave-entrance-art.js`, SHA de blob `582ec69d18562f3a50740d4ebeb12a7262bad7ed`: entrada em (x=-79,z=70); arco de 19 rochas; mais 10 rochas laterais; 13 lajes de acesso em z=35..62; 9 trepadeiras independentes; até 180 samambaias (100 em lowSpec). O módulo afirma complementar GLB autoral.
- `eldoria-cave-tunnel.js`, SHA `5ed59f225e1b37ce2b5c9f9e050293396c725d10`: corredor z=35..111; 205 cristais (120 lowSpec) instanciados em dois grupos, 118 fragmentos (68 lowSpec), 35 elementos pendentes e 3 luzes pontuais sem sombras.
- `docs/eldoria-geologia-e-narrativa-ambiental.md`: referências de composição geológica e contraste entre legibilidade/mistério.
- PRs ativos de outros agentes #473, #486, #487, #488, #490, #491, #492, #493 e Claude #481: não editar módulos de cena enquanto dependências/diffs não estiverem reconciliados.

## Achados verificáveis por leitura, não falhas visuais confirmadas
1. **Risco de aparência genérica na entrada**: as samambaias são construídas com `ConeGeometry(.35,1,4)`, e as 13 lajes com `BoxGeometry(1,1,1)`; são primitivas instanciadas, não GLB detalhado. Avaliar no enquadramento real se estas silhuetas conflitam com o modelo autoral. Não substituir antes da inspeção.
2. **Custo fixo e repetição**: 9 trepadeiras são 9 `Mesh` de `TubeGeometry` separadas, enquanto pedras e vegetação usam instâncias. Possível redução de draw calls por união de geometrias compatíveis, **somente se o profiling demonstrar custo e as curvas mantiverem a aparência**. Não aumentar quantidade de elementos.
3. **Possível artefato no teto da galeria**: os 35 elementos suspensos usam `ConeGeometry`, com posição y fixa 22.4 menos fração da altura, enquanto o túnel afunila em z e tem raio vertical variável. Sem verificar interseções em screenshots, não declarar defeito. Conferir se parecem pendurados no teto ou flutuando.
4. **Legibilidade da entrada**: a exclusão de vegetação mantém uma faixa central x=-79 ±6 e z entre 33 e 75, mas não garante que todas as lajes e objetos vizinhos preservem a rota jogável. Conferir com câmera ao nível do jogador e debug de colisão.

## Próxima intervenção candidata (condicional)
**Fachada da caverna:** se a comparação visual confirmar samambaias em forma de cone perceptíveis, substituí-las por um modelo GLB de vegetação já disponível, ou por geometria mais orgânica já presente no repositório, sem novas texturas nem mais instâncias; manter espaçamento, passagem, sombras e orçamento de draw calls. Só implementar após confirmar que o módulo está livre de conflitos e obter screenshots antes/depois na mesma câmera. Caso o visual atual seja adequado, manter.

## QA obrigatório
- Comparar na entrada x=-79,z≈55 olhando para a abertura x=-79,z=70, em aproximação e enquadramento lateral; medir objetos atravessando solo e legibilidade da boca.
- Galeria: capturar z=41,75,98 e conferir teto, cristais laterais, caminho central e fechamento do fundo.
- Medir `renderer.info.render.calls`, `triangles`, memória e FPS/stutter Android físico. CI SwiftShader serve apenas para regressões visuais.
- Testar passagem, colisão e transição interior/exterior; preservar as referências do criador.

## Estado
**Somente documentação.** Não foram feitas alterações de cena, testes in-game, fotos, medições nem merge. Pendência: execução real com ferramentas de browser/agent e inspeção de branch de Claude.
