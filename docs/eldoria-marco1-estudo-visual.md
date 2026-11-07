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
