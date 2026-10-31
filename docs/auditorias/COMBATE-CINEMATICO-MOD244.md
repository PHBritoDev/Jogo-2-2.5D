# Mod 244 — combate por espada e mini-chefe

Base publicada: `ffd28b75631be48abb9521ef6cb5acaeeb2f822a` (Mod 243, PR #327). A auditoria começou na Mod 241; as alterações concorrentes das Mods 242/243 foram incorporadas por comparação de três versões, usando exclusivamente o conector do GitHub para obter arquivos. Foram preservados os novos VFX sakuga, os tempos de formação, a flag `vfxSakuga`, os materiais sólidos/raios do Enemy2 e os documentos do outro trabalho. Este trabalho abre PR; não autoriza merge.

## Implementação

Os GLBs existentes permanecem intactos. `combat-rig3d.js` gera 45 AnimationClips originais no esqueleto do protagonista durante o carregamento, usando IK de dois ossos, pistas de quaternions normalizados, apoio dos pés e nenhuma pista de escala. A cápsula física executa o avanço; a animação não teleporta o modelo. As mãos acompanham a arma, incluindo a segunda mão da Celestial. Durante movimento, o tronco usa o ataque e as pernas conservam a locomoção nativa. A corrida 235 e os dois ritos 232 continuam no jogo.

| Espada | Identidade do combo de cinco golpes |
|---|---|
| Chamado | Diagonal, estocada, ascendente, giro e finalização |
| Aurora | Reverso, giro, diagonal, ascendente e finalização, com abertura ampla |
| Vigília | Estocadas curtas, corte baixo, reverso e ascendente |
| Quantum | Órbitas, reverso, giro e estocada |
| Celestial | Guarda de duas mãos, corte alto, diagonais e recuperação pesada |

Cada família também tem ataque correndo, dash-attack, ataque aéreo e mergulho. A escolha usa o estado real do controle: GOLPE durante a corrida/dash; PULO + GOLPE na subida; GOLPE na descida para mergulhar. O mergulho acelera a queda e só abre a janela de dano depois da aterrissagem. No ar, o fim de um ataque conserva a pose aérea. O buffer aceita o próximo golpe na parte final do movimento; dash/pulo não interrompem a janela ativa. Os especiais conservam suas regras próprias de cancelamento.

O motor mantém passos de 120 Hz, janelas de preparação/contato/recuperação, um acerto por movimento, hitstop, efeitos da lâmina real e verificação de cenário. As três espadas que já soltavam o arco no terceiro golpe continuam soltando-o. Os pontos de contato de Quantum/Vigília/Celestial agora são medidos na geometria da própria espada. A câmera em primeira pessoa não aumenta o alcance físico.

Somente `warden` e `e2boss` recebem as novas coreografias de mini-chefe:

- Enemy1: garras cruzadas, bote, salto ofensivo, giro curto e rasgo com recuo; duas mãos com garras próprias, sem usar a foice do Enemy2.
- Enemy2: ceifa ampla, moinho pesado, avanço com foice, queda esmagadora e sentença de três cortes. A foice acompanha o osso da mão. A segunda mão acompanha a haste.
- Os clipes e os contatos usam as mesmas trajetórias de mãos/armas amostradas no esqueleto nativo. Telegraph no chão, orientação travada antes do contato, avanço bloqueado pelo cenário e recuperação vulnerável (+15% de dano recebido). A IA aproxima-se até o alcance medido da arma.
- Os poderes, fases, esquadras e ataques dos inimigos comuns são preservados. O ascendente pode lançar um inimigo comum com gravidade e retorno ao solo; mini-chefes não são lançados.

Correções adicionais verificadas durante a integração: cache do Enemy1 quando ele termina de carregar depois do Enemy2; troca de treinamento protegida contra carregamentos assíncronos antigos; seleção de uma faixa sem árvores para treino; versão consistente entre index, marcador e loader. O descarte dos corpos preserva também o descarte dos impactos sakuga da Mod 243.

## Validação executada

- `node --test --test-reporter=tap`: **274 testes aprovados**, incluindo os cinco testes novos de sakuga trazidos pela main. O teste de versão obsoleto da base 241 foi substituído pelo teste de coerência já corrigido na main 243.
- `python tools/qa-combat244.py`: Chromium headless/SwiftShader, viewport 960×540 com toque emulado, **sem erros de página/shader**. Resultado completo em [browser-tests.json](../evidencias/mod244/browser-tests.json).
- Os 25 movimentos de combo acertaram um alvo dentro do alcance; foram executados os dez clipes dos mini-chefes e verificadas as trajetórias nativas. A simulação automatizada cobre deduplicação de acertos, paredes, altura, cancelamento, recuperação e aproximação da IA a 20/30/60/120 Hz.
- Controle real de tela: toques nos botões GOLPE, PULO + GOLPE e DASH + GOLPE selecionaram os estados corretos. Corrida, aéreo e mergulho também foram exercitados pela simulação do controle, com retorno ao chão e saída do estado de ataque.
- Primeira e terceira pessoa verificadas. O armazenamento persistente permaneceu idêntico antes/depois da sessão isolada.
- Passagem do Julgamento: **28 de mana / 76 de dano**. Eclipse: **38 de mana / 117 de dano**, no cenário controlado. Os efeitos e recursos dos dois ritos foram preservados.
- Trinta ataques básicos consecutivos, depois do aquecimento: **452 → 452 geometrias**, sem crescimento nesse ensaio. Pools existentes: 3 trilhas, 16 cortes, 192 partículas e 3 ecos. Isso não é uma medição de memória total do navegador.
- Os 45 clipes usam aproximadamente **1,20 MB de arrays de animação**, gerados uma vez e reutilizados. O tempo de geração registrado é específico do contêiner, não previsão para celular.
- Smoke test após integrar a main 243: ciclo das três magias adicionais com/sem `vfxSakuga`, além de Vórtice, Trindade e Colapso do Enemy2; sem erro de página/shader. [Registro](../evidencias/mod244/upstream-smoke.json). O X não atingiu o alvo nesse cenário; seu dano/obstrução continuam cobertos pelos testes de lógica. Esse smoke não mede custos de mana: o helper começa com mana artificial e a regeneração a limita.

## Evidências e reprodução

[Vídeo das coreografias](../evidencias/mod244/combate.mp4), [cinco espadas](../evidencias/mod244/espadas.jpg), [mini-chefes](../evidencias/mod244/minibosses.jpg), [primeira pessoa](../evidencias/mod244/first-person.png).

O vídeo é uma inspeção do render real em passos simulados de 50 ms, sem áudio; 20 quadros/s do arquivo não representam FPS medido. Foi gravado antes da integração dos VFX 243; as coreografias mostradas foram preservadas nessa integração. Não é captura de um aparelho Android.

Para reproduzir: servir a raiz com `python -m http.server 8124`, abrir `mundo-3d-prototype.html?treinoCombate244=1` e usar o painel recolhível para escolher espada, alvo imóvel ou mini-chefe. O botão de próximo golpe percorre as cinco coreografias do chefe. O progresso fica isolado. Para automação, instalar Playwright/Chromium e executar `python tools/qa-combat244.py`; `COMBAT_CHROMIUM` e `COMBAT_QA_URL` permitem configurar navegador e URL.

## Limites e briefing temporário

Não houve teste em Android físico, medição confiável de FPS/GPU/temperatura em celular ou uma passagem manual completa da campanha e de todas as dimensões. A regressão da história/Valério é automatizada. O teste de toque emulado e os limites de pools não substituem uma sessão real em aparelho intermediário.

Por isso, **`CODEX-COMBATE-CINEMATICO-TAREFA-TEMPORARIA.md` foi mantido**, conforme sua regra de só excluir após todos os critérios validados. Também permanecem os documentos temporários e permanentes do outro agente. Pendências para aceite final: Android físico, revisão visual do criador e passagem manual extensa da campanha.

Pesquisa aplicada: [AnimationAction](https://threejs.org/docs/pages/AnimationAction.html), [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html), [locomoção e motion warping](https://dev.epicgames.com/documentation/en-us/unreal-engine/locomotion-in-unreal-engine), [startup/hitlag/recovery](https://library.keqingmains.com/combat-mechanics/frames). Os quatro vídeos do usuário orientaram trajetória, avanço, guarda e recuperação; não foram copiados assets ou timings proprietários.
