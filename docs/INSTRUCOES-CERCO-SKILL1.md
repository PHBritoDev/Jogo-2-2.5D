# IMPLEMENTAÇÃO — SKILL 1: CERCO DAS CINCO LÂMINAS CELESTIAIS

Projeto: `PHBritoDev/Jogo-2-2.5D` (Three.js, jogo 3D para navegador e Android).

## Objetivo e referência
Implemente e refine a Skill 1 do protagonista usando `referencia_skill1.png` como **referência de linguagem visual das lâminas, rastros e impactos**. A imagem contém estudos de espada, movimento circular, traços de energia e explosões; **não** a interprete como sprites prontos nem como exigência de copiar cada cor, quadro ou efeito literalmente. Paleta principal **azul-celeste, branco e dourado**; vermelho só se o autor aprovar. A inspiração de qualidade de acabamento é o polimento de VFX de action RPGs como Genshin Impact e de rastros estilizados de espadas em animes; **não copiar assets, técnicas proprietárias nem efeitos idênticos**. A referência visual é uma meta artística, não garantia de equivalência AAA.

## Comportamento exato
1. Ao ativar a Skill 1, selecionar um inimigo válido pelo sistema de alvo existente (se não houver alvo, definir fallback coerente e documentar). Invocar **exatamente 5 cópias** do modelo de espada do protagonista (`EspadaProta.glb`, se este for o asset efetivamente usado no código). **Não substituir a espada real equipada**.
2. As cinco espadas aparecem **ao redor do inimigo, não ao redor do protagonista**, em formação circular, com espaçamento regular e distância segura. Todas devem estar **corretamente orientadas**: cabo/pomo para fora, **ponta voltada ao alvo**; verificar orientação real do GLB e corrigir seu eixo de referência, sem suposições que gerem espadas invertidas. Ajustar altura e inclinação para que sejam visíveis, não atravessem chão/corpo e não bloqueiem a câmera.
3. As lâminas flutuam com oscilação suave e energia discreta, **seguindo o deslocamento do inimigo e preservando a formação e o raio**, inclusive quando corre ou muda de direção. Evitar jitter, teleporte e movimento de espadas para trás por interpolação mal configurada. Não girar como ventilador nem gerar um anel enorme no chão.
4. Durante a habilidade, o botão **ATACAR** muda visualmente e funcionalmente: mostrar cinco pequenos indicadores de espada + contador **5/5**; cada toque válido dispara **uma** espada e atualiza para 4/5, 3/5, 2/5, 1/5, 0/5. Os indicadores apagam um por um. Não disparar duas vezes por um toque; suportar touch Android e teclado/mouse existentes. O botão volta à aparência e função originais ao acabar/cancelar a habilidade.
5. Ao tocar ATACAR, a próxima lâmina acelera da posição atual **em direção ao alvo**, seguindo trajetória visual convincente, com rastro curvo/energético. O dano só ocorre no impacto confirmado pela colisão/hitbox, **uma única vez por lâmina**; respeitar imunidades e regras existentes. Em caso de falha, esquiva, alvo morto, obstáculo ou mudança de alvo, usar regra previsível, documentada e testada. Não acertar através de paredes.
6. No impacto: **mini explosão azul**, clarão curto, faíscas e fragmentos luminosos direcionais; espada desaparece sem encolhimento cartunesco. Não fazer explosão grande que oculte o combate.
7. Protagonista pode **andar, correr e esquivar** enquanto as espadas estão ativas. Não bloquear câmera nem prender controles. Definir duração máxima/cooldown equilibrados com os sistemas atuais; evitar inventar dano, tempo ou recarga sem inspecionar os valores já existentes.
8. Se o inimigo morrer antes do quinto disparo, preferir redirecionamento a outro alvo próximo **somente se** compatível com o targeting atual; senão encerrar e restaurar o ataque. Tratar troca de cena, pausa, morte do jogador e limpeza de objetos sem vazamentos.

## Direção de VFX — evitar resultado genérico
- A imagem deve orientar **silhueta, proporção, espessura, cores e movimento do rastro**. Manter o modelo da espada legível, não encoberto por um tubo de neon.
- Fazer **ribbon trails dinâmicos** (faixas de geometria seguindo trajetória real), com núcleo claro, borda azul, largura e opacidade variáveis, cauda dissipando; não usar apenas `LineBasicMaterial` ou uma linha reta estática.
- Usar shaders GLSL/custom materials **quando trouxerem melhoria mensurável**, para energia correndo pela lâmina, pulso, gradientes e dissolução. Não criar shader complexo sem benefício.
- VFX em camadas controladas: brilho do fio, halo sutil, poucas faíscas, pequenas partículas de dissipação; invocação e disparo com *timing* distinto (antecipação curta, aceleração, contato, dissipação).
- Explosão de contato: núcleo branco-azulado muito breve, faíscas em leque, onda pequena e desaparecimento rápido. *Hit stop* e tremor de câmera **discretos**, somente se não afetarem controles e desempenho.
- Bloom/exposição seletivos **se compatíveis com o pipeline existente**, sem estourar a imagem nem clarear o cenário inteiro. Não adicionar pós-processamento pesado global sem avaliar custo.
- Sons sincronizados com invocação, disparo e impacto, **apenas com assets licenciados/originais já disponíveis**, ou registrar pendência se não houver som adequado.
- Não adicionar círculos mágicos gigantes, efeitos vermelhos, partículas em excesso ou elementos não presentes no conceito sem justificativa.

## Qualidade, arquitetura e performance
- **Primeiro auditar** arquivos atuais, poderes existentes, controle de ataque, sistema de alvo, hitboxes, modelos GLB e HUD. A Skill 1 já pode existir; **refatorar/preservar**, não duplicar habilidade ou sobrescrever funcionalidade por engano.
- Separar lógica de habilidade, estado de combate e VFX para reutilização. Usar `deltaTime`, pooling/reutilização de partículas e buffers, limitar draw calls, materiais transparentes e luzes dinâmicas. Prioridade a **Android**, com qualidade automática/baixa/alta e redução de VFX em aparelhos modestos.
- Preservar as outras skills, combos, animações, câmera, controles e desempenho do mundo 3D. Não modificar a dimensão do Bispo 1 nem reintroduzir mundo 2D.
- Criar testes para contagem de 5 lâminas, 1 disparo por comando, transições do botão, orientação, perseguição, dano único, colisão, morte do alvo, limpeza e regressões. Rodar suíte existente.
- **Validar visualmente** no navegador: screenshots/vídeo curtos da invocação, formação, rastros, impacto e HUD 5/5 → 0/5. Inspecionar as capturas contra a imagem e fazer uma segunda passada de polimento. Se não houver navegador/teste Android, declarar explicitamente **NÃO TESTADO**, nunca afirmar resultado visual sem evidência.

## Fluxo de trabalho e limite de uso
- Trabalhar em **branch/PR separado**, com commits pequenos e marcador Mod visível incrementado de acordo com o estado real do repositório. **Não fazer merge sem autorização.** Não interferir em PRs paralelos sem verificar o estado.
- Priorizar primeiro a mecânica correta e, na mesma tarefa, realizar uma **segunda passada de polimento VFX**. Se faltar tempo/limite, salvar o progresso em commits, registrar o que falta e não fingir conclusão.
- **Economizar limite:** não enviar mensagens de progresso longas; entregar **um relatório final conciso** com arquivos alterados, testes, link do PR e evidências visuais. Não pedir ao usuário para repetir a descrição ou reenviar a imagem.

## Critérios de aceite
- 5 espadas corretas e visíveis cercando **o inimigo**; pontas na direção do alvo.
- Perseguição estável; cada ataque consome exatamente uma espada, com dano único e mini explosão.
- Rastro de qualidade estilizada, fluido, sem aparência genérica ou poluição visual.
- Botão de ataque mostra a quantidade restante e volta ao normal após a quinta espada.
- Sem regressões perceptíveis em movimento, câmera, outras habilidades e controles mobile.
- Evidência de teste real + declaração honesta do que não foi testado.
