# MISSÃO CLAUDE — MOD 325 | TERRAIN SEAMS, ÁGUA, CACHOEIRAS, VULCÃO E AURORA

**Repositório:** PHBritoDev/Jogo-2-2.5D  
**Base:** ler a \`main\` mais recente ANTES de editar; esta missão vem após Mod 323 (jornada) e integração Mod 324 (agentes).  
**Dono:** Claude Code na nuvem, com autonomia técnica e responsabilidade por QA real.  
**Status:** briefing TEMPORÁRIO de trabalho; apagar NA PR de entrega, preservando registro permanente conciso em \`docs/jornada/README.md\`.  
**Princípio:** qualidade artística alta + estabilidade mobile; não mascarar problemas reduzindo resolução, apagando objetos ou cortando a qualidade global. Nenhum merge se falhas graves persistirem.

## 0. EVIDÊNCIA REAL RECEBIDA DO CRIADOR

O criador testou no celular o jogo identificado nas imagens como **MOD 323**, enquanto a \`main\` passou depois para MOD 324. **Reproduzir na versão atual antes de corrigir**, diferenciando problemas que permanecem de problemas já resolvidos. Fotos fornecidas nesta conversa (se estiverem inacessíveis na sessão Claude, SOLICITAR/CONSULTAR os anexos do criador, sem fingir tê-los visto):

1. **Imagem de descida da floresta:** faixa/fenda branca oblíqua entre dois conjuntos de terreno/gramado, com fundo vazando nas bordas. O chão parece duas superfícies que não se encaixaram.
2. **Imagem do vale com montanha:** sulco/linha branca diagonal no relevo e parede vertical facetada escura, incompatível com relevo natural. O protagonista está perto dessa montanha.
3. **Imagem da cachoeira:** pedras escurecidas aparentemente suspensas, queda d'água achatada/linear e uma lâmina turquesa horizontal que **atravessa visualmente o personagem**, sem volume ou borda aquática plausível. Essa é prioridade física/geométrica, não só arte.
4. **Imagem da ponte à noite:** duas quedas muito finas, verticais como linhas brancas, junto de penhascos escuros; o criador deseja **quedas enormes, volumosas e orgânicas**, que se separam das encostas e desaparecem em névoa profunda.
5. **Imagem do vulcão à noite:** silhueta muito triangular/coniforme, preta e pobre em detalhe; cratera acesa parecendo buraco iluminado; base sem transição convincentemente geológica. O usuário reportou que **de perto a malha fica quebrada** e mandou vídeo \`1000364947.mp4\`; é obrigatório analisar o vídeo completo se acessível, ou reproduzir captura em jogo nas mesmas condições.
6. **Referência 1 de região vulcânica:** solo negro rachado, placas de basalto, fissuras e canais pequenos de magma e névoa atmosférica, usados **nos arredores do vulcão e em áreas externas de Cinzária**, não como mar de lava dentro das ruas.
7. **Referência 2 de vulcão:** estratovulcão com base ampla perfeitamente integrada ao solo, ravinas, cratera com atividade e pluma dramática de cinzas/gases iluminados pelo fogo. **Não interpretar como obrigação de vulcão constantemente em erupção explosiva**: criar pluma ameaçadora, controlada e coerente com a história, sem ruína do FPS.
8. **Referência de aurora:** cortinas brilhantes violeta/magenta, céu estrelado, ampla cobertura visual e coloração perceptível, porém natural, da paisagem. No jogo atual a aurora aparece como cortinas discretas no horizonte/atrás das montanhas e sem influência ambiental suficiente.

**Observe:** fotos e vídeo podem não existir no repositório. Este texto é descrição fiel da evidência apresentada pelo criador; nunca afirmar que abriu anexos se Claude não puder de fato acessá-los. Gerar evidência PRÓPRIA no Playwright/ambiente executável. Diferenças de horário do jogo (dia/noite) e localização importam.

## 1. COMEÇAR POR CÓDIGO, REPRODUÇÃO E RESPONSABILIDADES

1. Leia \`AGENTS.md\` caso exista e os documentos relevantes da equipe, especialmente A1 bugs, A3 ambiente, A4 iluminação, além de \`docs/jornada/README.md\` e contexto da issue central #519.
2. Leia o estado ATUAL em \`main\`: \`jornada-world3d.js\`, \`jornada3d.js\`, \`ceu-atmosfera3d.js\`, \`eldoria-weather3d.js\`, \`mundo-3d-prototype.js\`, módulos responsáveis por céu/luz/água/chunks/câmera e os testes e workflows da jornada.
3. Não repetir alterações já integradas. Não alterar caverna reconstruída, chefes, HUD nem Ato I sem necessidade demonstrada. Respeite PRs concorrentes dos cinco agentes: comunique interfaces pelo #519 quando houver risco de sobreposição.
4. Criar **um único ramo de correção e uma única PR** para a Mod 325, sem merge prematuro; pequenas etapas testadas internamente antes de passar à próxima.
5. Iniciar o jogo REAL no navegador, entrar pelo início do Vale do Entardecer (atalho \`jornadaInicio=1\`, somente se ainda suportado) e inspecionar por caminhada, câmera baixa e alta, dia/noite, perto/longe. Usar \`?debug3d=1\` para medições, não apenas teleporte/sondagem de função. Capturar baseline primeiro.

## 2. P0 — CHÃO E MONTANHAS: ELIMINAR FENDAS E LINHAS BRANCAS

**Falha visível:** linhas largas brancas/claras cruzam trilhas e relevos, deixando escapar fundo; há parede quase vertical sem acabamento. Não tratar como simples escolha de cor antes de confirmar.

**Auditoria técnica:** conferir \`near/far\` tiles, \`renderH\` e \`journeyHeight\`, cortes do horizonte, fronteiras do perímetro, \`frustumCulled\`, tratamento de bordas de grade, transição entre \`NEAR_CELL\` e \`FAR_CELL\`, triângulos omitidos por máscara de recorte, costuras e precisão \`Float32\`; faces \`BackSide/FrontSide\`, winding, \`depthWrite\`, normais, z-fighting, shader/fog que revela fundo branco, coordenadas amostradas pelo físico vs visual. Verificar o caso **floresta antiga ↔ vale novo** separadamente de **montanhas internas do vale** e **pé do vulcão**. Não supor um único defeito.

**Corrigir causa raiz:** assegurar superfície renderizada contínua do espaço jogável com amostragem de altura consistente nas bordas de tiles e LOD; costurar malhas, acrescentar transições/skirts somente quando apropriados e ocultar apenas lacunas *fora* da zona jogável. Os colliders e \`height\` precisam concordar com o desenho. Não introduzir paredes invisíveis, degraus sem salto, queda atravessando chão, novas rachaduras nem overdraw excessivo.

**Aceite:** nenhuma faixa branca/abertura verificável em varredura panorâmica 360° por todos os trechos, incluindo a subida, picos, vale, fronteiras, ponte, cidade e sopé; fotos em câmera baixa e de longe; caminhar/atravessar bordas e alternar qualidade/LOD sem aparecer buraco.

## 3. P0 — CACHOEIRAS DE ÁGUA DE VERDADE (VISUALMENTE E NA INTERAÇÃO)

O criador quer água **convincente de jogo 3D com aparência, volume, fluxo, sombra e interação**, NÃO CFD/SPH de milhões de partículas ou fluido físico pesado por quadro. Água realista em tempo real costuma ser híbrida: superfície 3D/height-aware, shaders de fluxo, espuma, spray e colisão.

### Queda principal do vale
- Nascente e vazão coerentes com relevo, rio alimentando o topo; remover aparência de faixa/fita impressa na parede.
- A queda precisa ter largura e espessura óptica, silhueta variada, massa de água, movimento descendente contínuo com padrões de turbulência, bordas que se desfazem, espuma irregular; pode se destacar da encosta e dividir-se em véus/jatos ao encontrar rochas. Não usar um plano branco parado ou linhas repetidas.
- Ao cair, impacto no poço com espuma circular/irregular, ondulações, borrifos e névoa de gotículas de baixo custo; água transita para canal/rios. Usar normais em movimento, distorção/refração/reflexo simplificados se seguro no Android e água rasa caminhável coerente com regra atual.
- **Corrigir imagem da lâmina turquesa que atravessa o corpo do jogador:** verificar posição \`pool\`, altura do terreno e fundo do lago, \`renderOrder\`, \`depthWrite\`, \`transparent\`, interseção geométrica, profundidade do jogador e clipping. Se água rasa cobrir pernas, desenhar a interface corretamente; se não, corrigir elevação, não esconder o avatar.
- **Rochas:** remover todas as rochas flutuantes; apoiar no solo/parede com coordenadas/orientação corretas, usar formações ligadas à geologia e collider coerente; evitar posicionamentos randômicos no ar.
- Evitar repetir um único shader \`scroll UV\` e chamá-lo de realista: combinar padrões em escalas distintas, deformação de borda, espuma localizada e correlação com relevo.

### Abismo / ponte
- Substituir filamentos verticais por **duas ou mais cachoeiras largas e marcantes** nascidas de drenagens geologicamente plausíveis; variação de largura/velocidade/espessura e quebra do fluxo em terraços/rochedos e ao se afastar da montanha.
- Não é necessário que todas tenham o mesmo tamanho; pelo menos uma imponente que seja landmark vista da ponte. Dispersão de gotículas e névoa inferior por camadas, base oculta no nevoeiro profundo; não revelar o fundo artificial.
- Manter rota da ponte, colisões, corrimãos, ponto de queda mortal e respawn.
- Usar referência de cachoeiras reais (perfil de precipício, queda livre, véus, cascatas por degraus): cada água obedece à gravidade e à forma do rochedo, não desenhar uma “linha reta na pedra”.
- Testar de frente, perfil, por cima, à noite e à luz do dia, com movimento de câmera e a 3 distâncias.

### Tecnologias
Explore \`Water\`/\`Water2\` do Three.js **somente** se custo, integração, descarte e transparência no aparelho forem melhores; não acoplar render-to-texture pesado ou reflexos por câmera extra cegamente. Preferir desenho híbrido de alta qualidade: geometria moderada, flow maps, duas normais animadas, foam masks, espuma em impacto, rochas com instancing, partículas GPU/CPU orçadas. Testar alpha sorting e bordas do lago.

## 4. P0 — VULCÃO: TERRENO SÓLIDO, BASE ENTERRADA E SILHUETA CONVINCENTE

**Falha visível:** massa cônica muito lisa/escura, cratera parecendo recorte luminoso, de perto há malha errada, faces possivelmente ausentes/transparentes. A Mod 323 teve intervenção explícita em \`renderH\`, geometria do vulcão e \`volcanoHeight\`; reavaliar a solução em \`main\` sem se prender a implementação anterior.

- Reproduzir o vídeo do criador (se acessível), especialmente aproximação ao cone/cratera e rotação da câmera. Testar com movimento real contínuo, baixa altitude, distância média e horizonte, dia/noite, quality low/high.
- Investigar mesh procedural angular, costura em ±π, índices/triângulos, winding, normais invertidas, índices fora dos limites, buracos no raio interno/externo, transparências e frustum culling; **investigar o encontro com o terreno** usando \`renderH\`/colisão/LOD, \`volcanoHeight\` e suavização do sopé.
- O vulcão deve ter **base ampla efetivamente integrada ao terreno**, sem borda de objeto sobreposto, flutuar, perfurar chão ou aparecer o fundo do céu; geometria sólida, encostas assimétricas erodidas, afloramentos rochosos e ravinas naturais, cratera aberta e estruturalmente convincente. Reduzir silhueta de pirâmide/triângulo.
- Material PBR/variação procedural de basalto, cinza, escória, estrias, escoamento de lava raro e localizado; normal map ou textura comprimida quando disponível e licenciada, sem importar dezenas de MB. O visual longe e perto deve permanecer bom.
- Acrescentar **pluma alta de gás e cinzas** emergindo da cratera, evoluindo em nuvens largas e turbulentas com vento e luz interna da lava; evitar sprite repetido, cone de partículas ou coluna reta artificial. Pluma é fenômeno vulcânico dramático mas controlado; ciclo de intensidade sem explosões destrutivas contínuas, a menos que lore determine.
- **Terra externa ao redor do vulcão**: rochas estratificadas de basalto, colunas ou lâminas pontuais, solo escuro rachado, pequenos canais incandescentes/poças de lava e emanações esparsas; distribuir geologicamente, não em grid, e manter **cidade habitável/caminhável** com ruas e arquiteturas intactas.
- Conservar cidade Cinzária, casas, moradores Meshy, portal, 2 Enemy2, gates do Ato II e entrada da caverna. Não reabrir reescrita da caverna.
- **Não permitir subir até o topo**, mas bloquear de forma natural com encostas instáveis, rochas perigosas e delimitação contextualizada, sem parede invisível brutal.
- Testar todas as escalas, zoom, câmeras, passagem cidade ↔ sopé, colisões e cratera; não admitir cracks/teleport/transparent geometry.

## 5. P1 — AURORA: CÉU ENORME, MOVIMENTO ORGÂNICO E LUZ AMBIENTAL

**Observação no código da Mod 323:** \`ceu-atmosfera3d.js\` usa um shader com direção preferida \`uAurDir\` e faixa angular limitada (documentação anterior fala ±65°). Isso ajuda a explicar uma aurora presente porém pouco visível em muitos ângulos. Corrigir com julgamento artístico e testes em 360°, não aumentar simplesmente \`alpha=1\` em tudo.

**Objetivo:** aurora de alta latitude estilizada e fisicamente inspirada: camadas arciformes de cortinas altas no firmamento, ondas alinhadas ao campo magnético, dobras que se propagam lateralmente, filamentos que sobem/descem visualmente, brilho que respira e muda suavemente. Ela deve ser **visível em muitos azimutes, inclusive quando jogador vira a câmera**; distribuição ampla mas **não 100% da abóbada uniformemente saturada**. Não parecer tubo cercando personagem, teto baixo, retângulo ou pano colado ao mapa.

- Analisar direção e elevação das cortinas contra o horizonte, obstrução por montanhas, depth, ordem do dome, cobertura do shader e distribuição de arcos. Fazer zonas de intensidade variável em diferentes direções do céu e transições suaves.
- Movimento contínuo e orgânico com várias escalas/frequências baixas: advecção lateral, ondulação, pregas, brilho pulsante discreto, variação cromática violeta/rosa/azul. Sem piscar rápido, sem jitter/frame-dependent, sem deslocar skybox junto com câmera de maneira perceptível.
- Ajustar resposta dia/noite/nuvens de modo coerente: visível nas noites adequadas, suavemente mais fraca em transição, mascarada por nuvens, sem aparecer intensamente com sol a pino. Considerar condições excepcionais controladas apenas se canon/arte permitir.
- **Iluminação ambiental:** auroras não funcionam como um refletor de alta potência na Terra real; a foto de referência é intensificada por exposição e fotografia noturna. Criar **aproximação artística sutil**: contribuição roxo/azul/rosa para ambient/hemisphere/environment, água e neblina quando visíveis; realces localizados nas superfícies voltadas ao céu. Respeitar tonalidade da noite e contraste da lava/fogueiras, sem lavar todo o mundo de magenta.
- Preferir efeitos de shader/uniforms e **uma única fonte de luz indireta orçada** ou alteração de ambiente já existente, não dezenas de \`PointLight\`, postprocessing full-screen pesado ou recompilação a cada quadro. Coordenar com A4/\`light-budget3d.js\`.
- **Teste foto+vídeo em quatro direções cardeais**, câmera inclinada ao alto e olhando horizontalmente, vale/ponte/cidade/vulcão, céu limpo e com nuvens. Registrar influência no solo/árvores/água sem falso exagero. Uma captura estática não prova animação; vídeos curtos em sequência, comparação temporal e FPS são obrigatórios.

## 6. DIREÇÃO ARTÍSTICA, CIÊNCIA E PESQUISA TÉCNICA

Referências de *direção*, não licença para copiar ativos: Genshin Impact (silhuetas e legibilidade do mundo), Elden Ring (escala/atmosfera), Zelda (landmarks), Ghost of Tsushima (composição/vento), observação de vulcões, quedas de água e auroras reais.

Corrigir requisitos que parecem contraditórios:
- "Água verdadeira" = experiência aquática **visualmente e mecanicamente convincente**, com superfícies dinâmicas e resposta coerente. **Não** simulação hidrodinâmica completa, que em mobile seria contraproducente.
- "Aurora em todo o céu" = **múltiplas direções de observação** e presença ampla, não um céu inteiro pintado de roxo uniformemente.
- "Aurora ilumina tudo" = iluminação indireta artística limitada, NÃO fenômeno físico de aurora tão intensa quanto luz solar.
- "Vulcão normal" = natural/geologicamente contínuo com proporções críveis; a referência dramática é *direção estética*.
- "FPS normal sem reduzir gráfico" = usar otimização de algoritmos, batch, instancing, culling, upload, compressão e LOD sem regressão perceptível. Um fallback visual proporcional em aparelhos fracos é aceitável quando medido, nunca reduzir qualidade global cegamente.

Pesquise técnicas atuais e **avalie** (não implemente automaticamente só por serem novas): GPU-friendly flow maps, animated normals, foam based on water depth/shoreline, vertex bending, chunk-edge stitching, hybrid world-space procedural terrain, shader aurora curtains with multi-layer noise, procedural volcanic weather/cloud volume impostors, \`InstancedMesh\` culling bounds, \`KTX2Loader\`/Basis Universal, profiling WebGL, render target reuse, adaptive draw-call budgets, profiling 1% low e heap. Não alegar que método experimental 2026 funciona sem benchmark real.

Documentação Three.js verificável:
- \`https://threejs.org/docs/pages/KTX2Loader.html\` — compressão GPU de texturas;
- \`https://threejs.org/manual/pages/how-to-update-things.html\` — bounding volumes de InstancedMesh;
- \`https://threejs.org/manual/pages/how-to-dispose-of-objects.html\` — descarte explícito e renderer.info;
- \`https://threejs.org/docs/pages/Water.html\` — examinar compatibilidade/versão real antes de usar.

Somente importar ativos externos com licença CC0/compatível **verificada e creditada**; preferir código e modelos existentes. Rejeitar texturas watermarked/Pinterest como assets de produção. Tratar referências como guia de composição, não material para plagiar.

## 7. QA OBRIGATÓRIO EM JOGO REAL, NÃO SÓ "NODE PASSOU"

### Antes/depois reprodutível
- Capturas da mesma posição de câmera, FOV, horário e preset do \`main\` anterior vs nova branch. Incluir screenshots e vídeos reais de: (A) 2 bordas do terreno, (B) montanhas ao fundo, (C) aproximação da cachoeira/rochas e corpo na água, (D) queda do abismo na ponte, (E) vulcão longe, (F) vulcão perto com rotação completa da câmera, (G) base vulcânica com cidade e portal, (H) aurora de 4 rumos, (I) aquarela de iluminação real no chão.
- Executar automação de exploração/caminhada, pulo e dash, ponte, queda/respawn, colisão em rochas, interação de água, entrada de Cinzária e portal; não declarar passagens sólidas sem caminhada real.
- Verificar console, NaN, FPS p50/p95, **frame-time p99**, draw calls, triângulos, mem GPU/texturas/geom em \`renderer.info\`, tempo de construção de chunk e CPU spikes. Teste no Chrome headless/SwiftShader **não equivale** a Snapdragon/Android; rotular como simulado e solicitar validação no Galaxy A55 posteriormente.
- Rodar regressões do jogo e workflow específico da jornada; preservar mudanças de A1–A5 integradas e identificar falhas preexistentes vs introduzidas. Comparar contra base efetiva, não contra ramo antigo Mod 323.
- Não resolver performance reduzindo DPR a nível borrado/retirando todas as plantas ou destravando HUD.

### Critérios bloqueadores de merge
**NÃO fazer merge** com: qualquer fenda branca reproduzível nos locais citados; água atravessando corpo por camada incorreta; pedras visivelmente flutuando; vulcão com buracos/transparência/encaixe absurdo; aurora reduzida a faixa oculta; animações que paralisam; queda severa de FPS ou novas travadas; câmera/colisão quebradas; regressão jogável, testes específicos vermelhos; falhas de workflows introduzidas pela PR. **Falhas antigas do repositório:** documentar evidência de que antecedem a branch e não usar como desculpa para ignorar regressões.

Se visual ainda estiver ruim, **não declarar "concluído" e não mesclar**. Solicitar captura adicional apenas quando reprodução realmente impossível. A satisfação estética do criador ainda depende do teste final dele no aparelho.

### Entrega limpa e econômica em tokens
- Implementar e validar sem mensagens intermediárias extensas no chat do Claude.
- Uma única PR com lista objetiva de melhorias, arquivos, QA, limitações remanescentes e links para evidências reais.
- Registrar o resumo técnico permanente em \`docs/jornada/README.md\` ou diretório definitivo de QA; **remover este arquivo temporário na PR** após copiar o que for relevante.
- Não fazer merge só porque workflow isolado está verde; autorizar merge apenas após critérios acima. Caso contrário, manter draft/PR aberta e reportar bloqueios sem mentir.
- Responder no chat do Claude com no máximo **"Concluído."** se realmente concluído, caso contrário **"Pendente: [bloqueio verificável]."** — sem relatório verboso no chat; o relatório vive na PR.

**OBJETIVO REAL: a jornada deve parecer um cenário coeso, com terreno fechado, água convincente, geologia sólida e céu vivo — e rodar bem em celulares sem sacrificar identidade artística.**
