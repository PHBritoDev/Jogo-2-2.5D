# Mod 231 — ritos de espada

Base auditada: `c9072e4` (main). PR #49 e o protocolo permanente de escala foram lidos antes da autoria. Branch isolada: `codex/mod231-sword-rites`. Os GLBs originais permanecem intactos.

## Entrega e escopo

Somente `prota` e `aurora` recebem o novo combo e a habilidade contextual. `vigilia` e `celeste` conservam o caminho de combate anterior. As quatro Palavras, seus módulos, chefes, lojas, preços e requisitos de desbloqueio não foram reescritos.

- Combo: crescente horizontal, diagonal reversa e ascendente. Cada clipe movimenta quadril, coluna, cabeça, ombros, braços, mãos e pernas. Apoios dos pés resolvidos por IK analítica de dois ossos; não há rotação artificial do pivot da espada.
- Passagem do Julgamento: preparação baixa, marcação do alvo, contorno rápido pelo lado livre, chegada atrás, pausa curta, doze cortes em diferentes planos e finalização. O caminho é amostrado, revalidado e respeita a cápsula de alvos grandes. Não existe teleporte através do chefe.
- Eclipse das Lâminas: quatro movimentos corporais lançam ondas escarlates com contorno escuro, filamentos violeta, espessura e curvatura em profundidade; final em X. Alcance de 18 m, sweep de largura/avanço e registro de acertos por onda.
- Botão próprio, toque e tecla **R**. GOLPE encadeia apenas os ataques básicos. Nome, custo, recarga, indisponibilidade e arma equipada são contextualizados.

Os ataques básicos têm base plantada e interrompem a locomoção durante a execução. A investida opcional foi deliberadamente dispensada para não deslocar artificialmente os pés; o avanço extraordinário pertence à Passagem. Dash/defesa/dano/morte/pausa/troca de arma/cena cancelam o estado e seus efeitos. Um toque após a fase inicial pode reservar o próximo golpe; spam não reinicia o primeiro quadro.

## Referências e autoria

Foram inspecionadas as duas imagens efetivamente recebidas no chat: a prancha de seis efeitos e a colagem de cenas. O ZIP citado no briefing não estava disponível no chat nem nos diretórios de anexos; não há alegação de inspeção desse ZIP. As imagens recebidas foram suficientes para extrair os crescentes afiados, espessura variável, núcleo branco, massa escura, pinceladas quebradas, diagonais e cortes cruzados. Nenhuma imagem foi usada como sprite, textura, decalque ou cópia de personagem/símbolo.

A Aurora mantém a lâmina física clara e o acabamento dourado existentes. Sua energia de combate passa a escarlate/preto/violeta, conforme a direção solicitada, sem alterar a descrição narrativa, o modelo comprado ou as magias celestiais.

## Inspeção do GLB e clipes

`Protagonista.glb`: 52 juntas, seis animações; cada uma possui 156 canais (52 posições, 52 rotações, 52 escalas):

| Clipe original | Duração (s) | Adequação |
| --- | ---: | --- |
| Idle | 2,5 | Referência de pose e repouso |
| Walk | 1,3333 | Locomoção |
| Lift Air Hit Right | 0,5 | Reação a golpe |
| Hit Knockback | 0,8333 | Reação a golpe |
| Overhand Throw | 1,3333 | Não empregado pelo novo combate de espada |
| Kip Up | 1,1667 | Levantar-se |

Também foram inspecionados `Protagonista-corrida.glb`, `Protagonista-corrida-216.glb` e `Protagonista-cine.glb`. Inventário completo, com todos os nomes de juntas e canais: [glb-inventory.json](evidencias/mod231/glb-inventory.json).

O script `tools/blender/mod231_sword_rites.py` foi executado com **Blender 5.0.1**. Ele importa o herói original, usa sua pose Idle, constrói poses e transições com IK/FK, amostra a 120 Hz e converte as orientações de mundo de volta aos referenciais locais **originais** do glTF. Não usa um retarget genérico nem depende dos eixos de ossos reconstruídos pelo importador do Blender.

Saída separada: `Protagonista-ritos-231.glb`, com cinco AnimationClips reais, 53 canais cada (52 rotações e posição do quadril), sem malhas nem trilhas de escala:

| Clipe | Duração (s) | Amostras |
| --- | ---: | ---: |
| Rite_Crescent | 0,72 | 87 |
| Rite_Reverse | 0,70 | 85 |
| Rite_Ascendant | 0,86 | 104 |
| Rite_Judgment | 1,42 | 171 |
| Rite_Eclipse | 2,30 | 277 |

Os nós e referenciais de repouso são iguais aos originais, verificados automaticamente. A deriva máxima dos pés no bake ficou abaixo de **0,000003 m**; deslocamento horizontal do quadril abaixo de **0,0000002 m**. O quadril baixa até 13,5 cm intencionalmente. As escalas do rig são preservadas depois da atualização normal do mixer. A medição esquelética existente continua em uso; nenhum ajuste global de tamanho foi introduzido. [Medições](evidencias/mod231/rig-validation.json).

## Simulação, dano e custos

`sword-rites3d.js` contém as regras puras; `sword-rites-animation3d.js`, validação/binding dos clipes e armazenamento isolado; `sword-rites-vfx3d.js`, os efeitos. O adaptador no mundo usa as rotinas existentes de dano, morte, progresso, som e colisão.

O relógio da simulação determina o tempo do AnimationAction e as janelas de contato. Subpassos de até 1/120 s e sweeps de até 6 cm impedem perda de contato por FPS baixo. Os acertos básicos usam base/ponta reais da espada transformadas em mundo, não apenas distância nominal. O alvo da Passagem é identificado pela época do encontro e deixa de ser válido ao morrer ou ser substituído.

| Habilidade | Mana | Recarga | Dano sem bônus |
| --- | ---: | ---: | ---: |
| Passagem, Chamado | 28 | 12 s | 5 × 9 + 31 = 76 |
| Eclipse, Aurora | 38 | 16 s | 3 × 24 + 45 = 117 |

O dano acompanha a arma, nível e pergaminho. Os golpes básicos usam multiplicadores 1 / 1,12 / 1,32 e mantêm a recuperação de mana por contato. Os números foram comparados com as espadas de 25/30 de dano e mana-base de 100. As habilidades acrescentam aproximadamente 6,3/7,3 de DPS quando usadas na recarga, com preparação e recuperação vulneráveis; invulnerabilidade da Passagem somente de 0,30 a 0,49 s. Cancelar não devolve custo nem recarga.

Os crescentes são BufferGeometry curvas com seção afunilada, deformação em profundidade e GLSL próprio de gradiente/erosão/filamentos. Trilhas amostram o fio real. Partículas são instanciadas; pós-imagens reutilizam clones do herói. Pools fixos: 3 trilhas, 16 cortes, 192 partículas e 3 ecos. O perfil baixo reduz partículas e remove halos adicionais; a primeira pessoa atenua trilhas e oculta ecos. Há limpeza e descarte explícitos, sem temporizadores para novos hits/VFX.

## Treino e save

`?todasHabilidades=1` ativa escrita em memória para as chaves usadas pelo mundo e suprime a publicação de progresso para o iframe pai. Adicionar Aurora nesse modo não grava sua compra no save real. Recarregar descarta o treino. `treinoEspadas=1` abre diretamente o treino, sem prólogo; o botão permite reiniciar o alvo ou alternar as duas armas. “Voltar à campanha” abre a URL normal. Compras/requisitos de produção continuam os mesmos.

Marcador, HTML, loader e entrada atualizados para 231. Link de teste:

https://phbritodev.github.io/Jogo-2-2.5D/?todasHabilidades=1&treinoEspadas=1&v=231

## Validação executada

- `node --test *.test.mjs`: **181 testes passaram**, incluindo 25 novos testes de combate, isolamento e asset. [Saída](evidencias/mod231/node-tests.txt).
- `python tools/qa/check_sword_rites_asset.py`: todos os cinco clipes, apoio dos pés, translação, referências e amostras.
- Chromium real com WebGL/SwiftShader: clipes no personagem, base/ponta da lâmina, dano básico 25, Passagem 76 e Eclipse 117 idênticos em 30/60/120 FPS simulados; chegada atrás de alvo comum e chefe; capturas dos três golpes, skills e interfaces mobile.
- 55 usos completos: geometrias, texturas e programas WebGL sem crescimento, todos os efeitos inativos ao término. [Resultados](evidencias/mod231/browser-results.json).
- Touch via PointerEvent, R, defesa, pausa, alternância de arma; habilidade oculta nas outras espadas. As quatro magias iniciaram normalmente; a Ultimate liberou seu estado ao cancelar. Save de campanha original permaneceu ausente/intacto no teste. [Compatibilidade](evidencias/mod231/compatibility.json).
- Perfil baixo, mesma câmera: 275 draw calls sem rito, 282 durante Passagem e 287 durante Eclipse nas amostras medidas. Os três contatos sucessivos causaram 25/28/33 de dano, com altura do rig entre 1,933 e 1,940 m. [Medição](evidencias/mod231/quality.json).
- Entrada real pelo `index.html`, sem depuração: treino abriu, botão respondeu ao toque, troca para Aurora funcionou e o save de campanha permaneceu intacto. [Resultado](evidencias/mod231/direct-training.json).
- Viewports 844×390 e 390×844: botão de espada dentro da tela e sem sobreposição com os outros botões de ação. Capturas em `docs/evidencias/mod231/`.

O ambiente usa renderização por software: o FPS de renderização do mundo não representa um aparelho móvel. **Não houve teste em Android físico nem promessa de 30/60 FPS nele.** As simulações em FPS distintos verificam temporização e dano; a medição de recursos verifica estabilidade. O roteiro inteiro da campanha não foi rejogado; seus testes disponíveis foram executados, e os sistemas fora do escopo foram preservados.

Reproduzir navegador: iniciar `python -m http.server 8765`, instalar Playwright/Chromium e executar `python tools/qa/check_sword_rites_browser.py --url http://127.0.0.1:8765`. O script grava resultados em `work/sword-browser` por padrão.

## Fontes técnicas consultadas

- [Blender: inverse kinematics](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html).
- [Three.js r160 AnimationAction](https://github.com/mrdoob/three.js/blob/r160/src/animation/AnimationAction.js): tempo, pausa e mistura das ações.
- [Three.js r160 PropertyBinding](https://github.com/mrdoob/three.js/blob/r160/src/animation/PropertyBinding.js): correspondência exata das trilhas com os nós.
- [Three.js AnimationMixer](https://threejs.org/docs/#api/en/animation/AnimationMixer).
- [Protocolo permanente de escala](PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md) e [PR #49](https://github.com/PHBritoDev/Jogo-2-2.5D/pull/49).
