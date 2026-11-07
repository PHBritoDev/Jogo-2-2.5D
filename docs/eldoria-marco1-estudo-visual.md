# Eldória — Marco 1: estudo espacial isolado (07/11/2026)

**Roteiro vigente:** [Ato 1 — Eldória, as Raízes Esquecidas](docs/narrativa/ato-1-eldoria-roteiro-v1.md). Não executar o roteiro antigo de `docs/roteiro/M2-ATO1.md` como verdade narrativa.

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

## Direção narrativa da região
A chegada deve mostrar a beleza natural antes da pobreza. No mercado, revelar feiras vazias, escassez e histórias pequenas. Osren só entrega a pista após as interações previstas no roteiro novo. A floresta de investigação é mais afastada; à noite, clareiras de observação e as jaulas introduzem Varkhen e Drazek. O incêndio vem depois do ritual e o resgate dos sobreviventes é jogável.

## Próximo marco de integração (não executado)
1. Conferir escala/orientação/pivôs dos GLBs e fidelidade aos dois visuais centrais, principalmente cobertura vegetal sobre os telhados.
2. Corrigir a orientação da passarela e continuidade/altura da água, com o jogador atravessando sem colisão invisível.
3. Refazer a região caminhável com estradas e zonas de interesse maiores sem deslocar arbitrariamente coordenadas usadas pelo Ato 1 antigo; migração narrativa controlada.
4. Testar visualmente no Android e aferir FPS, uso de memória, distância de visão e número de draw calls.
5. Somente então incorporar em `mundo-3d-prototype.js`, atualizar versão visível e cache e adequar missões ao roteiro de 06/11/2026.

**Limitação:** uma página de prévia que carrega não prova fidelidade estética, FPS em celular, sucesso de GLB ou colisão. Não mesclar em `main` antes de inspecionar.
