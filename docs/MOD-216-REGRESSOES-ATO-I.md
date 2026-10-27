# Mod 216 — correções do Ato I

Base: `a4d1f5e4f357a950728ee92fc61c9fb25f731418` (PR #300 / Mod 215).
Branch: `codex/ato1-regressoes-216`. PR: #301. Sem merge na main.

## Bloqueio de progressão: causa e correção

`storyDo` consultava `storyDo3` antes de executar as ações do Ato I. Os dois usavam os IDs `surgir-guardiao`, `piscar`, `anoitecer` e `escuro`. Na sala do portal do Ato I, isso substituía o grupo do guardião por dois Enemy3 nas coordenadas da dimensão distorcida. Também causava `Cannot set properties of null (setting 'miniboss')`. Na queda, executava os flashes da guilhotina do Ato III sem transportar o herói para a sala inferior.

Os quatro eventos do Ato III receberam prefixo `ato3-`, tanto no roteiro quanto no executor. Ações compartilhadas e sistemas de combate continuam presentes. O teste de regressão executa os handlers reais em um contexto isolado; não apenas procura texto no arquivo.

## Alterações

- Despertar obrigatório: opção `skippable:false` no diretor, além de ocultar o botão. Continua possível ler e avançar cada fala pelo botão CONTINUAR. Toques no cenário e teclas de interação não avançam falas. Outras cenas conservam PULAR com confirmação no próprio botão.
- Diálogos comuns zeram velocidade, dash e joystick e iniciam Idle. Vendedores se voltam ao jogador. Câmera de diálogo evita aproximação extrema quando uma banca intercepta o enquadramento.
- Moradores: quatro aparências próprias; roupas, cabelo, chapéu, avental, proporções e cores diferentes. Personalidades e falas dos vendedores preservadas. Três moradores móveis verificam paredes, terreno, lago e pessoas; animação acompanha o deslocamento, com pausas em repouso.
- Crianças: dois modelos próprios, sem usar o morador encapuzado. Gaiolas com quatro faces, teto, barras próximas e porta articulada. Pedidos de ajuda, reação do herói, tremores e transformação prolongada antes da batalha.
- Massacre: vítimas vivas, súplica, animação de ataque dos inimigos e queda progressiva. A pista fica além da floresta; trilha estendida e entrada com contraforte na encosta.
- Colisões de todas as árvores instanciadas e moradores. Bloqueio da margem do lago também para inimigos, com pontos iniciais dos seguidores fora da água.
- Combate próximo limita deslocamento a 3,2 unidades/s; defesa mantém 1,9. Corrida de exploração permanece disponível.
- Corrida: novo GLB com Running e Idle do mesmo esqueleto. O retarget usa poses Idle equivalentes em vez de comparar com o bind pose deitado do herói; restaura transformações temporárias. Retirada a reancoragem dos pés a cada quadro durante corrida/cenas, que eliminava a fase aérea.
- Vento filtrado e atenuado. Ganho base de 0,16 para 0,035, com rajadas menores.
- Esgoto mais iluminado, abertura real no piso e paredes internas do poço. Salto com deslocamento vertical, despertar deitado, cela aberta pelo Anjo e barreira opaca no corredor da horda. Inimigos posicionados atrás da barreira, sem se acumular sobre o Anjo.
- Facho do portal antigo oculto no mundo durante essa progressão. Sistemas do portal e outros atos não foram excluídos.

## Assets efetivamente gerados

- `Moradores-216.glb`: exportado pelo Blender 4.3.2, cerca de 575 KiB. Quatro adultos e duas crianças; pivôs locais para caminhada, respiração e tremor procedural. Estilo simples e de poucos polígonos, sem novas texturas pesadas.
- `Protagonista-corrida-216.glb`: cerca de 114 KiB, clipes Idle e Running (156 canais cada). Exportado e carregado pelo jogo.
- Fontes: `tools/blender/m216_moradores.py` e `tools/blender/m216_corrida.py`.
- Modelos anteriores preservados, inclusive pessoa misteriosa e Sandra.

## O que foi validado

- `node --test`: **110 testes passaram**, incluindo sete novos testes de regressão (handlers do guardião, eventos do Ato III, skip obrigatório, ordem das falas da transformação, trilha/lago e os dois GLBs).
- `node --check` nos arquivos de execução alterados e `git diff --check`.
- Chromium desktop com SwiftShader, viewport **640×360**: percurso do buraco à sala do portal; guardião correto com **300 HP**; vitória e avanço ao **passo 6**, com recompensa.
- A vitória foi acelerada por debug (HP reduzido a 1) e concluída por uma habilidade real. Isso testa a transição, não o balanceamento da luta.
- Nesse navegador: clique fora do diálogo não mudou o índice da fala; jogador em Idle e velocidade 0 durante conversa; Téo voltado para a posição do herói; quatro vendedores e três moradores carregados; duas crianças específicas no elenco; tentativa de skip do despertar recusada.
- Reentrada no encontro da dimensão distorcida do Ato III: grupo original de dois Enemy3 (`demon3`, 170 HP) criado nas coordenadas corretas, sem acionar o guardião do Ato I.
- Running carregado e selecionado durante deslocamento; captura visual do herói em postura ereta. Isso não equivale a avaliação de fluidez em alta taxa de quadros.
- Inspeção de render dos modelos exportados em Blender e captura do guardião no jogo.

Evidências: [testes Node](evidencias/mod216/node-tests.txt), [estados do navegador](evidencias/mod216/browser.txt), [guardião](evidencias/mod216/guardiao.png), [corrida](evidencias/mod216/corrida.png), [barreira do Anjo](evidencias/mod216/barreira.png).

Reprodução: servir a raiz em `python -m http.server 8766` e executar `python tools/qa/ato1_browser.py` com Playwright e Chromium instalados. `QA_OUTPUT` escolhe a pasta de capturas; `GAME_URL` troca a URL. Hooks de debug só existem com `?debug3d=1`.

## Limites da validação

**Android físico não foi testado.** O navegador usou renderização por software, com taxa baixa; não permite prometer desempenho no telefone. O volume do vento foi reduzido no código, mas não calibrado por audição em alto-falante Android. Colisões, animação procedural, novas distâncias e ritmo das cenas ainda precisam de uma sessão completa de jogo em dispositivo real. Não foi executada uma campanha integral dos Atos II–VI.

A finalização da Sandra/PR #295 e a auditoria completa de ataques/IA de todos os personagens continuam fora desta entrega, priorizada para os bloqueios do Ato I. O trabalho local anterior da Sandra foi preservado em outro worktree, não descartado nem apresentado como concluído.
