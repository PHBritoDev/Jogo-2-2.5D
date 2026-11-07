# Eldória — Marco 1: estudo espacial isolado (07/11/2026)

**Roteiro vigente:** [Ato 1 — Eldória, as Raízes Esquecidas](narrativa/ato-1-eldoria-roteiro-v1.md). Não executar o roteiro antigo de `docs/roteiro/M2-ATO1.md` como verdade narrativa.

**Referências visuais examinadas:** sete imagens na Biblioteca do projeto, em `/Jogo-7-Pecados/Referencias-Ato-1/` (não incorporadas ao Git nem usadas como textura).
- 1000363692.jpg: arquitetura com telhados verdes, árvores monumentais, passarelas claras e ponte sobre o rio.
- 1000363693.jpg: mata com corpos d'água azul-turquesa, sombra das copas, musgo.
- 1000363694.jpg: campo claro e montanhas distantes para o prólogo.
- 1000363695.jpg: círculo ritual, referência de narrativa futura.
- 1000363696.jpg: caverna coberta de plantas, referência posterior.
- 1000363697.jpg: caverna cristalina, referência posterior.
- 1793986649346.jpeg: imagem sombria, referência posterior, NÃO usada na cidade.

## Entrega do Marco 1
- Página isolada `eldoria-cenario-preview.html`: terreno ondulado com vale escavado, rio turquesa, floresta com árvores de tamanhos diferentes e modelos GLB próprios de Eldória para casas, árvores monumentais, barraca, poço, ferreiro, passarela e rochas.
- Quatro pontos de câmera para revisão no celular; gesto de arrasto e zoom.
- Sem alterações em arquivos de personagens antigos, combate, missões ou página principal.
- Escala e posicionamento dos GLBs são **experimentais** e precisam de avaliação visual, colisão e custo de renderização antes de ligação à campanha.
- Vegetação rasteira, flores, pedras e juncos usam `InstancedMesh`; árvores auxiliares são agrupadas em quatro malhas instanciadas em vez de centenas de objetos separados.
- Botão `FPS` mostra taxa de quadros, draw calls, triângulos e quantidade de GLBs carregados/falhas.
- QA estático de assets e sintaxe em `tests/eldoria-preview.test.mjs` e workflow separado; CI não equivale a teste visual ou de performance Android.

## Marco 1.2 — inventário total e narrativa espacial (07/11/2026)
- Manifesto `eldoria-asset-plan.js` registra **14 GLBs de cenário**. Os 12 modelos autorais principais de Eldória e Ato 1 foram incluídos, mais carroça e ponte. Nenhum modelo de personagem antigo é alterado ou carregado.
- Carregamento progressivo: 11 modelos essenciais na chegada, um modelo ritual somente ao abrir a cena Ritual e dois modelos da caverna/montanha somente ao abrir Caverna. Isto reduz a carga inicial de rede e memória em relação a carregar tudo de uma vez. Os modelos ainda devem ser auditados no Android.
- Nucleação espacial: chegada pela estrada → aproximação da cidade → praça/mercado → ponte/rio → lago oculto → floresta densa → ritual noturno → entrada da caverna. Esses pontos são **mirantes de produção**, não missões executáveis.
- Cena de água: curso d'água e lago azul-turquesa separados; exclusão de árvores/grama dentro da lâmina d'água. Necessário testar o encaixe visual das margens.
- Botão Dia/Noite para comparar a atmosfera, usando apenas as luzes existentes (sem sombras extras ou pós-processamento pesado).
- Os pivôs/escala dos GLBs agora são calculados a partir da bounding box, para centralizar edifícios/props no ponto de instalação e apoiar rotação por ponto.
- A prévia não cria aldeões, inimigos, eventos de ritual ou diálogos novos; segue sendo um espaço seguro de composição visual até o criador aprovar a geometria.

## Direção narrativa da região
A chegada deve mostrar a beleza natural antes da pobreza. No mercado, revelar feiras vazias, escassez e histórias pequenas. Osren só entrega a pista após as interações previstas no roteiro novo. A floresta de investigação é mais afastada; à noite, clareiras de observação e as jaulas introduzem Varkhen e Drazek. O incêndio vem depois do ritual e o resgate dos sobreviventes é jogável.

## Próximo marco de integração (não executado)
1. Conferir visualmente escalas/orientações dos 14 GLBs e fidelidade aos dois visuais centrais, principalmente cobertura vegetal sobre os telhados e silhuetas de árvores monumentais.
2. Refinar orientação da passarela e da ponte, checar continuidade/altura da água e permitir ao jogador atravessar sem colisão invisível.
3. Refazer a região caminhável com estradas e zonas de interesse maiores sem deslocar arbitrariamente coordenadas usadas pelo Ato 1 antigo; migração narrativa controlada.
4. Testar visualmente no Android e aferir FPS, uso de memória, distância de visão e número de draw calls.
5. Somente então incorporar em `mundo-3d-prototype.js`, atualizar versão visível e cache e adequar missões ao roteiro de 06/11/2026.

**Observação sobre o teste:** a página está somente na branch do PR #407; o GitHub Pages atual publica a `main` e não publica essa prévia automaticamente. Um deploy de preview isolado ou validação controlada é necessário antes do teste mobile.

**Critério de aprovação:** nenhum modelo flutuando ou soterrado, ruas legíveis e transitáveis, ponte encaixada nas margens, rio/lago sem cortes evidentes, 0 falhas de GLB, medição de FPS/draw calls no celular e inspeção das sete referências. A composição atual ainda é **estudo de escala/posicionamento**, não cenário final.

**Limitação:** uma página de prévia que carrega não prova fidelidade estética, FPS em celular, sucesso de GLB ou colisão. Não mesclar em `main` antes de inspecionar.

## Marco 1.3 — Iluminação e água (implementado na branch do PR #407)
- `eldoria-light-water.js` implementa sol único com shadow mapping PCFSoft: mapa 1024² em perfil de toque e 2048² em desktop; frustum focado no ponto de interesse e atualização de sombras apenas quando há mudança de região, iluminação ou GLB carregado.
- Terreno recebe sombras; no mobile casas do tipo 01 e árvores ancestrais projetam sombras, enquanto vegetação pequena não projeta. Desktop permite mais objetos de cenário projetando sombra. O limite continua sujeito a medição no dispositivo.
- Água do rio e lago usam materiais PBR separados (Standard para mobile e Physical com clearcoat para desktop), normais procedurais leves e ondas vertex GPU distintas para rio e lago. Nenhuma reflexão via render target a cada quadro.
- Normal map gerado localmente em memória sem download extra. UVs foram adicionadas ao rio. O lago ondula no eixo normal de sua malha rotacionada, não horizontalmente.
- Ambiente PMREM de baixa resolução somente na versão desktop para reflexo especular aproximado; não há reflexo em tempo real de casas/árvores. Isso é intencional para custo GPU razoável.
- Dia/noite regula temperatura, intensidade da luz e exposição; só o sol gera sombras.
- Pesquisa técnica: [Three.js shadows](https://threejs.org/manual/pages/shadows.html), [Color Management](https://threejs.org/manual/pages/color-management.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer), [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator).
- **Não equivale a validação visual ou benchmark Android.** É obrigatório revisar foco de sombras, clipping da água, reflexos, materiais e FPS antes da integração à main.

## Marco 1.4 — Ciclo completo de agente visual e correções (07/11/2026)
- Novo agente `tools/visual-lab/eldoria-visual-qa.cjs` é executado pelo workflow `eldoria-preview-qa.yml` em todo PR que altera a prévia. Abre Chromium com WebGL SwiftShader, espera os GLBs, captura 12 frames reais (mobile retrato + desktop paisagem, cidade/água/lago/noite/ritual/caverna) e registra relatório JSON e falhas de console/rede, WebGL e visibilidade noturna.
- Rodada #22 identificou timeout de captura desktop; foram reduzidos os custos do perfil QA SwiftShader e corrigidos enquadramentos. Rodadas #24 e #28 passaram, mas a inspeção visual revelou terreno manchado, estrada chapada, lago circular e noite muito escura.
- Corrigidos: tonalização contínua do terreno (não mais blocos de cor aleatória), estradas sobre o heightfield, céu em gradiente, cristas ao longe mais discretas, lago irregular com diferença de tom raso/profundo, iluminação noturna mais legível, brilho animado na água e floresta reforçada com mais instâncias e cópias dos GLBs autorais.
- Rodada final desta entrega: [Agente Eldória — #35](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/42342140987). **Resultado: static-preview + visual-webgl aprovados**, 12 capturas, zero falhas reportadas pelo agente. Nas vistas da cidade, ~24 draw calls no perfil QA mobile e ~34 no desktop QA, sem comprovação de FPS em Android físico.
- O perfil `?qa=...` é propositalmente de baixo custo gráfico para estabilidade do software renderer e **não serve de benchmark da qualidade máxima desktop**.
- Ainda não é cena final: copas instanciadas simplificadas, rio/lago sem reflexão dinâmica de árvores e teto (apenas PBR/PMREM e glints), caverna e clareira sem composição cinematográfica completa, ausência de gameplay/collision QA e escassez da vila ainda não encenada por NPCs. Não afirmar identidade visual perfeita com as referências.
- **Próximo gate**: revisar no Android real a consistência de escala, LOD, FPS e colisões; criar passagem jogável e elementos narrativos sem modificar os personagens antigos. Só então integrar com segurança na main.
