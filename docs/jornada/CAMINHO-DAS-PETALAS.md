# Caminho das Pétalas e Cidadela de Invernália

Na campanha, leia o bilhete após a vitória sobre VORGAZHEK. Saia de Cinzária pelas vielas e contorne o vulcão. Os caminhos se reencontram. Os seis abrigos permitem registrar a viagem de volta pelo mapa. No dojo, aproxime-se da mestra pela porta da ponte e use o botão de conversar. Depois de atravessar o inverno e subir ao trono, desça ao bairro dos pescadores. A chegada retoma a história da estalagem.

## Distâncias percorríveis

Medidas horizontais ao longo dos segmentos de caminhada. As cotas estão em metros do mundo. A coluna de tempo calcula caminhada contínua a 2,8 m/s na superfície livre. A estimativa exclui curvas, diálogos e pausas. A duração observada deve ser lida no registro da caminhada por teclado.

| Região | Percurso | Cotas | Caminhada | O que orienta a travessia |
|---|---:|---:|---:|---|
| A · Saída e costas do vulcão | 443 + 478 m | 24–46 | 5,5 min | Bilhete, vielas, basalto e nascente |
| B · Portão da Primavera | 314 m | 31–46 | 1,9 min | Primeiro torii, lanternas, cascata e abrigo |
| C · Cerejeiras antigas | 1.216 m | 33–69 | 7,2 min | Galeria de raízes, mirante, árvores antigas e trilhas de retorno |
| D · Lagos das Pétalas | 456 m | 40–64 | 2,7 min | Margens, nascente, passarela, lanternas e pagode ao longe |
| E · Escadaria da Lua | 454 m | 64–127 | 2,7 min | Escadaria de pedra, pilares do rochedo e ponte suspensa |
| F · Dojo | 26 m de entrada e saída | 127 | 0,2 min + conversa | Tatame, divisórias, altar, mestra e abrigo lateral |
| G · Despedida da Primavera | 1.291 m | 94–127 | 7,7 min | Última cerejeira, primeira geada e vendedor de casacos |
| H · Vale nevado | 1.308 m | 74–124 | 7,8 min | Pinhal, campos abertos, refúgio e montanhas |
| I · Espelho Glacial | 950 m | 60–112 | 5,7 min | Fissuras no gelo, água aberta, gruta e abrigo glacial |
| J · Montanhas da vigia | 1.549 m | 67–136 | 9,2 min | Ponte sobre a ravina, guarita, arquivo, estátuas e mirante |
| K · Invernália | 221 + 748 m | 4–84 | 5,8 min | Muralhas, escadaria, galerias, trono e descida até o pescador |

O eixo do portão de Cinzária ao trono tem 8,26 km. As nove ramificações oferecem mais 6,10 km de trilhas exploráveis. Parte de cada laço substitui um trecho do caminho principal. A velocidade de corrida do protagonista é 6,8 m/s antes dos modificadores da campanha.

## Arte e implementação

As referências de sakura orientaram o ritmo de copa fechada, clareira, água azul com reflexos de flores e escadaria sob os torii. O pagode usa beirais curvos em quatro níveis e fundações sobre a falésia. As referências de inverno orientaram a mistura progressiva de vegetação, a travessia do lago e a escala das agulhas góticas. Na cidadela, a escadaria do eixo e as galerias laterais levam a alturas diferentes. Os vitrais, telhados, árvores, montanhas e interiores são modelos do jogo. As ilustrações fornecidas serviram de referência de composição.

A estrutura de madeira sobre a encosta segue estudos da implantação de Kiyomizu-dera. A vegetação próxima usa geometrias partilhadas e instâncias. Setores distantes usam silhuetas leves. O terreno, a bússola, os abrigos e a campanha compartilham o traçado definido em `sakura-route3d.js`. [Kiyomizu-dera](https://www.kiyomizudera.or.jp/en/learn/) · [Arquitetura da encosta](https://www.japan-guide.com/e/e3901.html) · [Instâncias em Three.js](https://threejs.org/docs/#api/en/objects/InstancedMesh)

## Continuidade e reprodução

O Ato II continua responsável por Cinzária, pelo vulcão, por VORGAZHEK e pelo bilhete. No Ato III, a etapa 15 persiste o descanso no caminho, a conversa do dojo e a visita ao trono. A etapa 16 e as posteriores conservam o pescador, a moradora, a estalagem, a prisão, a caverna e os combates. Os moradores do bairro mantêm suas posições de interação ao redor da praça canônica. O mapa migra as grades v3 e v4, os locais descobertos e os abrigos registrados.

A ação **Jornada de Invernália · gameplay** grava a caminhada contínua e as galerias de PC e celular. A caminhada começa com um save pós-vulcão e usa o movimento e a colisão do protagonista. Os ensaios de captura e de retomada também posicionam a câmera em marcos individuais. Cada artefato leva o SHA testado, o vídeo e seus dados. O navegador de teste usa renderização por software. O FPS de um Android físico exige medição no aparelho.

A gravação abaixo parte de um save no início da ponte. Mostra a corrida pelo tabuleiro, a entrada no dojo, a conversa e o retorno pela margem leste. O personagem foi conduzido pelo teclado, com a velocidade normal da campanha. O vídeo usa o runtime `0e83690` em Chromium com renderização por software. [Assistir à travessia do dojo](evidencias-ato3/ponte-mestra-saida.mp4)

## Capturas e percurso verificados

Na revisão `75c6e73`, a caminhada por teclado começou no save pós-vulcão, passou pelo dojo e pelo trono e chegou ao bairro dos pescadores. O percurso contínuo levou 2 h 01 min 20 s de relógio no executor com renderização por software. A ação registrou os marcos da campanha e o vídeo integral. [Marcos da caminhada](evidencias-ato3/caminhada.jpg) · [Gravação e dados](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45433982830/artifacts/14958158873)

As pranchas comparam os enquadramentos da transferência com os da PR #673. O bosque ganhou troncos ramificados, o pagode tem varandas sob os beirais e a nave conserva um eixo livre até o trono. O desenho do castelo segue a escadaria frontal e a silhueta de agulhas da referência. A correspondência artística final depende da revisão do criador. [Bosque](evidencias-ato3/bosque-antes-depois.jpg) · [Pagode](evidencias-ato3/pagode-antes-depois.jpg) · [Nave](evidencias-ato3/nave-antes-depois.jpg)

[Castelo no PC](evidencias-ato3/castelo-pc.jpg) · [Dojo em retrato](evidencias-ato3/retrato-dojo.jpg) · [Inverno em paisagem](evidencias-ato3/inverno-paisagem.jpg)

Na revisão de física, o mesmo ensaio passou por teclado e por toque simultâneo no direcional e no botão de pulo. No Mirante da Lua, os pés ficaram em 93,456 m no tablado e 94,016 m no banco. Após a descida voltaram a 93,456 m. No dojo, a caminhada parou em z = −1599,73 m e a esquiva manteve essa posição contra a parede. [Vídeo em terceira pessoa](evidencias-ato3/fisica-mirante.mp4) · [Ensaio final por toque, com gravação e coordenadas](https://github.com/PHBritoDev/Jogo-2-2.5D/actions/runs/45433982830/artifacts/14943604471)
