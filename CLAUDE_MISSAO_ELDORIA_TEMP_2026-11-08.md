# MISSÃO PARA CLAUDE — ELDÓRIA, RECONSTRUÇÃO CUIDADOSA (ARQUIVO TEMPORÁRIO)
**Ao terminar, EXCLUA este arquivo do repositório. Não envie mensagens de progresso, comentários ou resumo final no chat. Trabalhe em silêncio. Não confunda silêncio com deixar de registrar commits e evidências técnicas no GitHub.**
**Não interrompa nem sobrescreva o trabalho de outras IAs.** Verifique branch/PRs ativos antes de editar; preserve alterações concorrentes. Não faça merge de trabalho incompleto. Se algum requisito não puder ser implementado, pesquise documentação técnica e encontre alternativa fundamentada; não invente conclusão.

## Referências visuais e intenção
Usuário forneceu imagem de vila fantástica com casas organizadas ao redor de árvores gigantes, passarelas, ponte arqueada e lago/fonte; segunda referência mostra floresta densa vista de cima. São **referências de composição**, não licença para copiar personagens, arte ou arquitetura pixel a pixel. O estilo deve ser original e coerente com Eldória. A cidade é arquitetonicamente bonita, mesmo que sua população esteja pobre. Não degradar construções para representar pobreza.

## Organização urbana — prioridade máxima
1. Refazer o layout urbano como um assentamento orgânico, com praça central, caminhos conectados, casas em agrupamentos coerentes, espaços livres e pontos de interesse; **não** espalhar casas aleatoriamente nem lotar o mapa. Preservar os assets autorais de casas. Definir posições em dados estruturados e documentar orientação, função e entrada de cada casa. Portas voltadas a caminho/rua/ponte acessível, não para paredes, árvores ou precipícios.
2. Preservar a árvore colossal principal no centro/fundo da vila e outra grande árvore lateral com uma casa/passarela integrada; remover árvores menores **de dentro do núcleo urbano**, sem destruir o ecossistema fora dele. Abaixar cuidadosamente a base da árvore principal até que raízes indesejadas não flutuem/exponham; não enterrar acessos, plataformas nem tronco de forma artificial. Validar escala, altura de solo e contato com terreno.
3. A **ponte é a entrada da cidade para o jogador vindo da floresta**: redesenhar/realocar caminho e ponte para que seja obrigatório cruzá-la na chegada. A ponte atual não pode continuar funcionando apenas como saída da vila em direção à floresta. O rio/canal precisa justificar geometricamente a travessia; respeitar continuidade de caminho e missão. Garantir orientação da câmera e sentido de caminhada.
4. Construir cinturão florestal **denso ao redor da cidade, exceto pelo corredor de aproximação do jogador**. Silhueta de floresta tropical exuberante, múltiplas alturas, variedade natural, sem muro de árvores uniforme nem árvores surgindo dentro de ruas/casas. Densidade visual alta por composição e instanciamento, sem exigir centenas de GLBs pesados simultâneos.
5. Casas e escadas/passarelas nas árvores devem ter suporte físico, entrada acessível, alturas consistentes, e geometria de colisão caminhável. Não adicionar escada apenas decorativa quando for apresentada como acessível.

## Arquivos novos do usuário — NÃO INVENTAR
- `Arvore.glb` foi enviado ao ChatGPT (aprox. 242 KB, contém malhas 3D). Precisa ser transferido/adicionado ao GitHub antes de usá-lo; **não está automaticamente no repositório**.
- `Arvore2.zip` e `Arvore3.zip` enviados contêm apenas arquivos `.eps` e `.jpg`, **não GLB/FBX/OBJ**. Trate-os como referências visuais, não árvores 3D. Solicite modelos corretos ao usuário somente se indispensáveis; não afirme que importou modelos 3D desses ZIPs.
- Antes de importar qualquer asset externo, verificar licença e direito de uso, escala, número de malhas, materiais, texturas, UVs, transparências, draw calls e peso no celular. Otimizar sem degradar a aparência: reduzir nós e materiais, compressão de texturas quando suportada, meshopt/Draco se apropriado e testado; criar LODs reais e preservar silhueta. Nunca simplesmente reduzir resolução cegamente.

## Colisão física e locomoção
- NÃO use somente uma caixa invisível ao redor de árvore/casa/escada/ponte. Separar **obstáculos sólidos** (troncos, paredes, guarda-corpos) de **superfícies caminháveis** (solo, ponte, degraus, plataformas). Para superfícies caminháveis usar colisores estáticos simplificados alinhados ao piso, altura amostrada por raycast/BVH ou malhas proxy; integrar ao controlador de personagem e gravidade existentes sem quebrar combate, pulo e dash.
- Escadas podem usar degraus simplificados ou rampas de colisão invisíveis que acompanhem a geometria real, com altura e inclinação corretas; passarelas devem ter piso e bordas. Evitar pés afundando, flutuação, atravessar piso ou ficar preso em degraus. Testar subir/descer, parar, pular, cair e sair pela borda.
- Cuidado com a diferença entre `groundHeightAt`/altura do terreno e pisos elevados; uma função de altura global que só conhece terreno não torna escadas ou casas caminháveis. Introduzir solução de suporte por superfície sem sobrescrever as alturas de terreno em outros biomas.

## Corrigir defeito de cores/texturas à distância
- Diagnosticar a origem concreta do bug em Eldória. No passado `eldoria-live-village3d.js` associava materiais do GLB original a malhas LOD pelo **índice de travessia**, quebrando cores/UVs; PR #423 desativou LOD de casas e restringiu transferência de materiais de árvores. Auditar também outras fontes de troca de material, LODs, UVs, colorSpace, mipmaps, tone mapping e iluminação. Não fazer reassociação por índice, nem por nome apenas se UV layout for incompatível.
- Validar materiais e texturas do GLB distante e próximo; `GLTFLoader` preserva configurações sRGB do glTF; texturas de cor adicionadas manualmente exigem `THREE.SRGBColorSpace`. Garantir que não haja casas mudando de cor quando jogador se aproxima.
- LODs devem manter silhueta e identidade cromática; se LOD distante não é equivalente, corrigir ou desabilitar **apenas o LOD defeituoso** e medir o custo. Evitar desligar todo LOD da floresta e destruir FPS.

## Desempenho Android
- Priorizar FPS real no celular: instancing por espécie/material, limite de draw calls, foliage overdraw, transparência de folhas, sombras próximas, culling por setor, LOD/impostors distantes, texturas com mipmaps, atlas quando apropriado, carregamento progressivo. Distâncias de LOD calibradas por tela e dispositivo. Não remover o visual para fingir desempenho.
- Perfis gráficos low/auto/high; nunca alegar FPS do Samsung A55 com base em Chromium SwiftShader CI. Registrar chamadas de renderização, triângulos, memória e comparação antes/depois.

## Verificação e entrega
- Antes de mexer, mapear o código atual de Eldória, caminhos, ponte, `eldoria-live-village3d.js`, `mundo-3d-prototype.js`, colisões, `groundHeightAt`, arquivos de modelo e PRs abertos.
- Implementar em etapas reversíveis com commits claros. Capturar no **jogo principal**: chegada pela floresta, ponte de entrada, praça/casas, duas árvores grandes, vista aérea da floresta, caminhada nas escadas, e mesmo modelo de perto e longe. Garantir que o agente fotografe o canvas correto e que a câmera mude de fato; não repetir a falha do QA #424.
- Não mesclar se faltarem testes essenciais ou houver regressão. Não quebrar outros atos, missões, inimigos, biomas, controles, ou funcionalidades.
- Ao terminar e verificar o trabalho, **deletar este arquivo temporário em commit**. Não mandar resumo final nem mensagens durante o trabalho. Se for preciso avisar de bloqueio real (por exemplo, licença ou falta de arquivo), faça apenas a pergunta estritamente necessária.


## DIRETRIZ ARTÍSTICA ADICIONAL — ÁRVORES 3D (pedido posterior do usuário)
O usuário enviará ao Claude referências visuais de árvores. **A missão inclui criar e adicionar ao repositório modelos 3D reais de árvores de alta qualidade artística**, não apenas copiar cores em primitivas geométricas. Use as referências enviadas como ponto de partida; você tem liberdade criativa para desenvolver espécies alternativas ou modelos próprios superiores, desde que preservem o estilo de floresta tropical fantástica e **não tenham aparência genérica, improvisada ou mal acabada**. Não é obrigatório reproduzir exatamente as árvores das imagens nem usar todos os arquivos enviados: a prioridade é qualidade visual, coerência com a cidade e bom desempenho em Android.

- Preferir pipeline de modelagem adequado (Blender, geração/modelagem 3D ou ferramentas disponíveis) para criar **GLB/glTF com malhas, UVs, materiais e texturas válidos**, e versionar no GitHub os assets finais e suas licenças/proveniência. Se usar geração procedural, ela deve produzir malhas 3D artisticamente convincentes, não cilindros e esferas disfarçados.
- Criar uma pequena biblioteca de **3–5 espécies visualmente distintas**, com troncos, ramificações e copas naturais; variar escala, rotação e composição sem criar duplicatas óbvias. Árvores monumentais podem ter versões únicas; árvores repetidas da floresta devem compartilhar malhas e materiais.
- Para cada espécie repetida, fornecer LOD0/LOD1/LOD2 ou impostor distante quando apropriado, **preservando a silhueta, as cores e as texturas em todas as distâncias**. Evitar remapear materiais entre geometrias com UV incompatível. Fazer comparações de perto e de longe no jogo principal.
- Otimizar peso em MB **sem destruir o visual**: reduzir geometria desnecessária, compartilhar materiais, comprimir texturas quando suportado, controlar alpha overdraw e sombras, usar instancing e culling. Registrar peso final, triângulos e materiais por espécie, e verificar que os modelos realmente carregam no celular.
- Pode criar outras espécies além das referências, ou escolher modelos alternativos de qualidade superior **com licença de uso comprovada**; não baixar e reutilizar modelos sem autorização. Não afirmar que um JPG/EPS é um modelo 3D pronto. Se referências ainda não tiverem sido enviadas diretamente ao Claude, usar apenas as que estiverem de fato disponíveis.
- Integrar as árvores à nova composição da cidade e ao cinturão florestal; não colocar árvores dentro de caminhos, portas ou pontes, e não deixar raízes atravessarem pisos. Colisores simplificados nos troncos; copa não deve virar parede invisível.
- Critério de aceite: as árvores precisam parecer intencionais e bem modeladas **tanto em primeiro plano quanto no horizonte**. Não entregar protótipos genéricos como resultado final. Se as ferramentas disponíveis não permitirem atingir a qualidade desejada, explicar objetivamente a limitação em vez de fingir sucesso.

## Referências técnicas consultadas
- Three.js Color Management: https://threejs.org/manual/pages/color-management.html
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js Texture: https://threejs.org/docs/pages/Texture.html
- BVH raycast acelerado: https://github.com/gkjohnson/three-mesh-bvh/blob/master/API.md
- Bibliotecas físicas e BVH: https://threejs.org/manual/pages/libraries-and-plugins
