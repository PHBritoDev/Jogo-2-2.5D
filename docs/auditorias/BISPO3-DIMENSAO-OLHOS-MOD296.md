# Mod 296 — dimensão de Zar’khael

Execução iniciada em 07/11/2026 e retomada em 08/11/2026 (São Paulo), baseada em `main` **f0e5da55abb03ed0540ee10cc0253f55fd64d68f**. Durante a pausa, a main avançou; a branch foi atualizada sobre `89a6dee` preservando as alterações já integradas de Eldória. Branch própria: `feat/bispo3-dimensao-olhos-codex`. Brief lido integralmente em `brief/bispo3-dimensao-cogumelos-olhos` / `838941e`. A imagem original foi recebida e examinada no chat; o rabisco verde não integra o cenário. O arquivo da referência não foi distribuído no Git.

## Escopo e coordenação

- O tema `mushrooms` existente delega a construção ao novo `zarkhael-dimension3d.js`. Nenhum GLB, poder, balanceamento, checkpoint ou save foi alterado.
- `mundo-3d-prototype.js`: somente marcador 296, passagem de jogador/qualidade ao cenário, descarte de `bishop3` ao sair e leitura de diagnóstico em `?debug3d=1`.
- `dimension-arenas3d.js`: somente tema do Bispo 3, argumentos opcionais de atualização e descarte específico. Demais temas preservados.
- `index.html`, `mod181-loader.js`, `mundo-3d-prototype.html`: marcador/cache e descrição de carregamento. Não houve publicação no Pages.
- `eldoria-mod291.test.mjs`: somente as duas expectativas do marcador/build global foram atualizadas para 296; testes e implementação de Eldória permanecem preservados.
- Havia sobreposição **de caminhos**, não implementação de Eldória, com #412 nesses cinco arquivos compartilhados. Na retomada, esse trabalho já estava na main e foi preservado na atualização da base. A necessidade foi comunicada no chat antes das edições. A integração futura deve conciliar o marcador/cache com a branch que for aprovada primeiro. Não houve escrita na branch do Claude, no PR dele ou na `main`.
- O brief temporário não existe nesta branch criada da `main`; não foi copiado nem removido da branch de instruções.

## Baseline e inventário

A arena anterior usava 32 cogumelos com hemisférios regulares, cilindros, 192 olhos em `Points`, materiais emissivos uniformes, pilares retangulares, disco xadrez e passarela separada. No enquadramento controlado: 7 calls, 13.604 triângulos, 192 points. Captura anterior e posterior usam câmera `(0,4,0)`, alvo `(0,6,-210)`, FOV 58°, 768×1152; cada versão mantém seus parâmetros de ambiente. A prévia isola o **construtor real** do cenário; capturas de combate são separadas e incluem HUD/personagens reais.

| Asset existente | Bytes | Conteúdo inspecionado |
| --- | ---: | --- |
| `Bispo3.glb` | 10.838.464 | 1 mesh, 1 skin, 6 animações, 0 morph targets |
| `Bispo3-lod.glb` | 3.950.292 | 1 mesh, 1 skin, 6 animações, 0 morph targets |
| `EspadaBispo3.glb` | 1.209.036 | 1 mesh, sem skin/animação/morph |

Não há GLB de cogumelo na dimensão existente. Os GLBs acima permanecem intocados; não se inferiu licença nova para eles. Toda nova geometria, material e padrão ocular é procedural, desenvolvido nesta alteração, sem texturas/imagens/modelos de terceiros. Nenhuma dependência nova no runtime. Os testes usam Three **0.160.0**, igual ao jogo.

## Pesquisa e decisões

| Fonte oficial consultada | Decisão aplicada |
| --- | --- |
| [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Copas/hastes instanciadas; bounds recalculados ao trocar LOD; descarte também dos buffers de instância. |
| [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) | Iluminação PBR existente, rugosidade variável e relevo por derivadas. Sem mapa novo em memória GPU; sem brilho emissivo nas copas. |
| [Material / onBeforeCompile](https://threejs.org/docs/pages/Material.html) | Injeções pequenas nos chunks r160, uniforms estáveis e `customProgramCacheKey` por material. Não há recompilação por piscar. |
| [Object3D](https://threejs.org/docs/pages/Object3D.html) | Jogador e câmera convertidos para espaço local da arena; direção projetada nos eixos tangentes de cada olho. Não acompanha simplesmente a câmera. |
| [LOD](https://threejs.org/docs/pages/LOD.html) | Três níveis para olhos/hastes, copas com tesselação preservada para não recortar pálpebras; troca compartilhada de geometria, sem 336 objetos LOD ou skeletons. |
| [Objetos animados / morph targets](https://threejs.org/manual/pages/optimize-lots-of-objects-animated.html) | Considerados; inexistem morphs de pálpebra nos assets. Fallback explícito: patches curvos unidos, deformação localizada e máscara opaca de pálpebra no shader. |
| [Fog](https://threejs.org/manual/pages/fog.html) e [transparência](https://threejs.org/manual/pages/transparency.html) | Fog negra distante, um halo analítico no horizonte e reflexo estreito quebrado no piso. Sem raymarch, SSR, bloom ou passes extras. Olhos opacos com depth test. |
| [Cleanup](https://threejs.org/manual/pages/cleanup.html) | Descarte idempotente de todos os LODs, materiais e instâncias; remoção da arena do cache ao sair. |

A API das páginas atuais foi conferida contra o Three r160 instalado e a compilação WebGL real; não foram usadas APIs recentes de WebGPU/TSL ou morph instanciado ausentes dessa versão.

## Implementação

24 cogumelos, 336 olhos. Fileiras com posições, alturas, larguras e rotações determinísticas distintas; os maiores enquadram a arena. Perfil de copa deformado, hastes caneladas com saia e base irregular. Olhos amostrados sobre a mesma superfície parametrizada da copa, com pequena convexidade e borda de pele; não são sprites voltados para a câmera.

Piscar: fechamento em 100 ms e abertura em 180 ms, períodos independentes de 3,3–8 segundos. A pálpebra cobre de fato a íris e a esclera. O olhar usa alvo suavizado, limites de deslocamento e períodos de vigília alternados com movimento lento. Patches seguem o mesmo micromovimento das copas. Olhos fora da distância, voltados para longe da câmera ou além do orçamento do preset ficam estáticos, preservando sua aparência.

| Perfil da dimensão | Perfil no jogo | Alvo atualizado | Alcance da animação | Fração máxima animada |
| --- | --- | ---: | ---: | ---: |
| Baixo | Baixo | 12 Hz | 55 m | 34% |
| Médio | Auto / Alto | 20 Hz | 95 m | 67% |
| Alto | Máximo | 30 Hz | 155 m | 100% |

As três qualidades mantêm os 336 olhos, a silhueta e a luz do horizonte. O halo é a única superfície transparente nova; não se adicionaram luzes, sombras, partículas ou áudio ao motor. A infraestrutura sonora existente foi preservada sem introduzir um som repetitivo para centenas de olhos.

Medição do cenário isolado no plano geral, após o refinamento final:

| Perfil | Draw calls | Triângulos desenhados |
| --- | ---: | ---: |
| Baixo | 5 | 80.517 |
| Médio | 5 | 121.605 |
| Alto | 5 | 169.797 |

Há menos calls que na base, mas **mais geometria e custo de shader**: os olhos agora têm superfície curva e pálpebras. Isso não é prova de ganho de FPS. A qualidade baixa reduz a geometria em cerca de 53% frente à alta; o preset máximo exige avaliação em GPU real.

O disco visual preserva sua silhueta circular, agora unido à passarela sem sobreposição coplanar. **O raio caminhável continua em 30 m**, incluindo a faixa central livre entre os combatentes. A extensão além desse raio, já decorativa na base, continua decorativa: não foi aberta uma rota de fuga que mudaria IA, limites de poderes e zona segura da ultimate.

## Evidência e validação

[Galeria completa, antes/depois, piscar, tracking, combate e vídeo](../evidencias/mod296-bispo3/README.md).

- `node --test *.test.mjs tests/*.test.mjs`: após atualizar a base, **442 aprovados / 3 falhas preexistentes**, contra **438 / 3** na main `89a6dee`, executada em worktree separada. Falhas: `eldoria-forest-lod-overlap.test.mjs` (sobreposição das faixas LOD), `vorgazhek-ultimate.test.mjs` (Mod 262, interrupção/integração) e `zarkhael-circular-sword.test.mjs` (Mod 278, kit/IA/GLB). Não foram apagadas ou enfraquecidas. O teste de marcador global trazido pela nova base ainda exigia 291: suas duas expectativas foram atualizadas para 296, resolvendo a única falha de integração introduzida pelo avanço obrigatório de versão. Na base inicial `f0e5da5`, eram 423 aprovados / 2 falhas, e nesta implementação antes da atualização eram 427 / 2.
- `node --test dimensions3d.test.mjs zarkhael-dimension.test.mjs`: **9/9**.
- Sintaxe dos módulos alterados e `git diff --check`: passaram.
- `node tools/qa/check-ai-onboarding.mjs`: passou (26 caminhos).
- `bispo3-dimension-qa.cjs`: render real, mudança de pixels aberto/fechado e entre dois alvos com mesma câmera/tempo, três LODs, limites de calls, três ciclos de descarte/recriação. Zero erros JS/WebGL. Memória voltou a **5 geometrias, 0 texturas** por ciclo após recriar/renderizar um único LOD.
- `bispo3-runtime-qa.cjs`: carregador real, VS, batalha, caminhada e ataque pelo motor, colisão dentro/fora do disco, rotação de câmera, três qualidades, Hidra em `charge`, chamas em `shots` com disparos observados, espada em `spin`, ultimate com VFX ativo, três oclusores escondidos/restaurados, saída com arena removida e reentrada visível. Capturas em paisagem e retrato; nenhum erro JS/WebGL ou asset HTTP falho.
- Workflow próprio de QA, somente leitura e artifacts; não faz deploy ou merge. O resultado remoto deve ser consultado no PR, independentemente dos resultados locais acima.

Reprodução local: servir a raiz em `http://127.0.0.1:4173`, instalar `playwright@1.56.1` e `three@0.160.0` no ambiente de QA, executar os dois scripts em `tools/visual-lab/`. `VISUAL_BASE_URL`, `VISUAL_OUTPUT`, `CHROMIUM_PATH` e `NODE_PATH` são configuráveis. A prévia touch está em `tools/visual-lab/bispo3-dimension-preview.html`; o teste jogável em `mundo-3d-prototype.html?testeDimensao=bishop3&debug3d=1&build=296` isola saves.

## Comparação artística e limites

A referência foi examinada no chat ao lado das capturas: corredor/luz central, rubro-vinho, fundo negro, hastes pálidas, olhos numerosos e ausência do rabisco foram preservados. Corrigidos durante a iteração: sprites flutuantes, vermelho emissivo, copas finas, olhos muito claros, bordas retangulares dos patches e reflexo excessivamente granulado do piso e recorte de pálpebra pela copa no preset baixo.

Persistem diferenças: a referência tem carne mais estriada e complexa, olhos com córnea mais volumosa e veios mais naturais, hastes mais retorcidas e um enquadramento mais apertado pelos cogumelos do primeiro plano. Nossa versão ainda é procedural/estilizada; não é reprodução fotorrealista, nem há percentual de semelhança certificado. Os reflexos são uma aproximação, não espelhos do ambiente. A prévia não substitui a revisão das capturas do jogo.

As medições são de Chromium/SwiftShader em nuvem. **Não são FPS de Samsung A55 ou outro Android físico**. Ainda é necessária validação no aparelho (toque, fluidez, aquecimento e legibilidade). A aprovação artística e qualquer merge permanecem com o criador.
