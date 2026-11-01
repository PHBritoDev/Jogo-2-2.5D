# BRIEFING TEMPORÁRIO — VHAZRAEL: REFAZER EXCLUSIVAMENTE O ATAQUE DE ESPADA “RUPTURA DO TRONO ABISSAL”
**Criador:** referência visual Saber/Fate enviada diretamente ao Claude. **Data:** 01/11/2026. **Escopo:** ataque especial de espada, NÃO a Ultimate do meteoro nem Skills 1–3.

## REGRA ABSOLUTA DE COMUNICAÇÃO
**NÃO ENVIE NENHUMA MENSAGEM DURANTE O TRABALHO.** Sem “vou analisar”, planos, progresso, justificativas, mensagens intermediárias, resultados de ferramenta, atualizações ou spam. Trabalhe silenciosamente do começo ao fim; só interrompa se absolutamente bloqueado por algo que não pode resolver sozinho. **UMA mensagem final de no máximo 10 linhas** com o que mudou, testes/evidências reais, PR/merge e link jogável. Não envie ZIP. Depois de merge seguro e testes, **EXCLUA ESTE ARQUIVO TEMPORÁRIO** em commit separado. Não declarar conclusão se ainda houver falha.

## CONTEXTO VERIFICADO NO GITHUB
A branch main contém a **Mod 248**: commit de implementação `ed76f77b243e410b073ca1cb022a61da99f9dfbb`, merge PR #336 (`dbbf72dd...`), seguida de remoção do briefing anterior PR #337. A Mod 248 declara ter refeito o ataque “Ruptura do Trono”, mas o criador relata que o resultado continua muito inferior à referência. **Auditar implementação real e seus pontos de entrada, VFX, animações, estados e colisões; não confiar apenas no texto do commit.** Não voltar à Mod 241 nem apagar correções posteriores. Nome canônico do Bispo 1: **VHAZRAEL**.

## REFERÊNCIAS VISUAIS COMPARADAS PELO SOLICITANTE
**Vídeo de referência enviado aqui:** `1000362952.mp4`, ~21,93 s, 576×1024, clipe de ataque cinematográfico da Saber em Fate. O criador enviará este vídeo diretamente ao Claude. **Vídeo da implementação atual:** `1000362957.mp4`, ~6,91 s, 2340×1080, captura do jogo; Claude pode inspecionar o jogo diretamente, sem necessidade de receber esse segundo vídeo. Não presumir que vídeos locais deste chat estejam no GitHub ou acessíveis ao Claude sem upload.
**Observação visual:** a referência tem filamentos violetas e negros na preparação, energia vermelho/branco intensa, enorme feixe frontal, cortes de contraste vermelho/preto, cruz vermelha, impacto com terreno e explosão amarelo-branco/laranja de alta energia, com anéis/colunas e grande massa visual. No jogo, o efeito aparenta ser um pequeno objeto rosa junto ao personagem e não transmite a escala e a sequência de descarga/impacto. **Reproduzir a linguagem de composição, timing, energia e impacto com VFX ORIGINAIS**, sem copiar modelos, texturas, frames ou áudio protegidos de Fate. Se houver dúvidas, pesquisar **Saber Alter / Excalibur Morgan / Fate Noble Phantasm** como estudo de direção de arte e cinematografia, além de documentação de Three.js e técnicas de VFX em tempo real.

## ORDEM DE EXECUÇÃO
1. Inspecionar os módulos da main que implementam VHAZRAEL, “Ruptura do Trono Abissal”, animation mixer, arma, VFX e hitbox. Localizar exatamente por que o ataque atual é pequeno/genérico e se há transformações de escala/rotação erradas. Confirmar clipes GLB existentes, pivô de espada e câmera. Preservar todo o resto.
2. Construir **protótipo da coreografia inteira**, da espada erguida à detonação, com geometria e iluminação que funcionem em gameplay mobile. Validar em navegador com capturas/frames de cada etapa, comparar com referência e iterar; não terminar depois da primeira tentativa.
3. Integrar dano, colisão, IA, estados e **superarmadura absoluta da habilidade**; testar agressão do jogador durante a execução. Corrigir regressões e qualidade visual antes de PR.
4. Fazer branch/PR, CI e smoke tests, merge apenas se seguro. Excluir este briefing temporário após merge. Resumo final até 10 linhas.

## COREOGRAFIA OBRIGATÓRIA — DA ESPADA AO CATACLISMO
**Etapa A — ANTECIPAÇÃO E ERGUER A ESPADA (~0–1.0s):**
- VHAZRAEL **ergue a espada real acima da cabeça** com postura corporal convincente: pés no solo, braços/ombros acompanhando, tronco estável, espada orientada corretamente. Não fazer o corpo inteiro girar, deitar, flutuar, atravessar o chão ou esticar a arma em triângulo.
- O início é legível: vento convergente, veios negros/violetas/carmim nascendo na guarda e enrolando pela lâmina, linhas de velocidade, partículas de detrito levantando e cenário respondendo à pressão.
- A aura cresce progressivamente em **massa, contraste, altura e turbulência**; nada brota pronto ou parece simples cilindro fosco. Som de carga e luz ambiental mudam em sincronia.

**Etapa B — CARGA CRESCENTE E PILAR MONUMENTAL (~1.0–2.3s):**
- A espada erguida concentra uma coluna vertical gigantesca de energia com **núcleo branco intenso**, faixas vermelho-carmim/magenta e casca preta/violeta rasgada em fluxo contínuo. Silhueta irregular, várias camadas de profundidade e filamentos helicoidais; evitar tubo, plano retangular ou cone único.
- O pilar deve parecer dezenas de metros de altura **em escala relativa à arena**, dominando o enquadramento sem esconder totalmente o boss. A câmera pode abrir o plano e inclinar para revelar escala, mas não bloquear o controle permanentemente.
- Brilho seletivo HDR/bloom onde possível; AdditiveBlending só em luz/halos (preto precisa de material opaco), exposição controlada, ruído advectado e erosão animada. Ajustar para low/mid/high sem mudar dano/hitbox.

**Etapa C — CORTE E DISPARO DEVASTADOR (~2.3–3.2s):**
- VHAZRAEL desfere **um golpe de espada real**, com wind-up, swing e follow-through. No instante do corte: flare vermelho em cruz e impact frame de contraste vermelho/preto/branco curtíssimo (opção de acessibilidade para reduzir flashes).
- Da trajetória da lâmina nasce um **feixe/frente de energia GIGANTESCO** que atravessa o campo de batalha em direção ao jogador. Deve ter largura, profundidade, superfície rasgada, núcleo claro e bordas escuras, distorção e trilhas de matéria; **NÃO um disco rosa no chão, um raio cilíndrico liso ou uma espada escalada artificialmente**.
- O solo se abre progressivamente ao longo do caminho com placas angulares de rocha e rachaduras incandescentes; detritos lançados pela frente de choque, não randomicamente. Camera shake e áudio coerentes.

**Etapa D — COLISÃO E EXPLOSÃO MULTI-FASES (~3.2–5.5s):**
- Impacto verdadeiro onde o feixe colide com jogador/solo/obstáculo: implosão brevíssima, clarão branco-quente curto, choque vermelho/negro, **domo enorme de massa roxa/magenta com recortes pretos**, coluna de energia vertical, anéis supersônicos, raios ramificados e uma **explosão secundária amarelo-branco/laranja** com fogo e blocos de rocha. Não terminar em disco pequeno ou fumaça algodão-doce.
- Escala do efeito deve ser clara em plano aberto; visual de energia pesada e apocalíptica. Usar animação por fases, não uma única expansão linear de esfera. Dissipação por fragmentação/erosão, não fade genérico.
- Sincronizar VFX, dano, colisão, knockback, som e hitstop; não aplicar dano repetido indevido.

**Etapa E — CONCLUSÃO E RECUPERAÇÃO DE POSTURA (~5.5–6.2s):**
- Efeitos residuais, chão fissurado temporariamente, VHAZRAEL baixa a espada e volta à postura de combate **sem exaustão, debuff nem vulnerabilidade especial**. Câmera e controles restaurados, meshes/VFX limpos e sem memory leak.
- Tempos são sugestões: ajustar à animação para que carga, corte e explosão sejam plenamente perceptíveis; **não acelerar tudo até ficar ilegível**. O ataque é especial, não golpe normal repetido.

## REGRA INEGOCIÁVEL — ATAQUE INCANCELÁVEL
**Uma vez iniciada a habilidade e comprometido o estado de cast, ela NÃO PODE SER CANCELADA por nenhum ataque do jogador, magia, knockback, stagger, hit reaction, empurrão, dash ofensivo, parry, bloqueio, dano ou tentativa de interrupção.** Implementar estado explícito `uninterruptibleSwordSpecial` / superarmor com prioridade sobre transições comuns de hit reaction e IA; **não apenas ignorar a animação de dano**. Boss pode continuar perdendo HP normalmente conforme balanceamento; hitboxes e VFX devem continuar funcionando. **Se HP chegar a zero durante a execução, definir transição segura para concluir o golpe antes da morte/vitória**, sem duplicar recompensa nem deixar boss invencível indefinidamente. A habilidade só pode ser abortada por condições sistêmicas indispensáveis: sair da dimensão, descarregar cena, reiniciar combate, destruir instância ou pausa/cleanup seguro; nunca por ofensiva do jogador. Evitar softlock, hitboxes fantasmas e estado invulnerável permanente. Bloqueio e esquiva do jogador contra o golpe devem seguir regras normais, sem anular o cast.

## CRITÉRIOS DE ACEITE (NÃO ENTREGAR SEM PASSAR)
- Boss levanta espada real, corpo permanece ereto e pés ancorados em todas as etapas; rig e bone attachment corretos.
- Energia cresce visivelmente em espirais; pilar monumental com massa e fluxo; flare e corte sincronizados.
- Feixe frontal colossal **realmente atravessa arena** e deixa fissura; impacto é explosão multicamadas gigantesca com coluna, anéis, detritos e núcleo incandescente; nada de disco rosa.
- Ataque **não é interrompido** em cenários de spam de ataque básico, 3 skills, Ultimate do protagonista, knockback, stagger, colisão e dano letal. Confirmar comportamento seguro ao zerar HP e em pausa/morte/transição.
- Capturas/vídeo **do jogo executando** mostram início, carga, corte, feixe, impacto e recuperação; comparação visual com referência. Testes automatizados são complementares, não substituem verificação visual.
- Sem regressão em Skills 1–3, Ultimate do meteoro, IA adaptativa, HUD, 1ª/3ª pessoa, escala GLB, saves e demais bosses. Testar low quality e viewport Android; medir frame time e draw calls se ferramentas disponíveis, não prometer 60 FPS sem medir.
- Pesquisar com profundidade técnicas adequadas quando necessário, prototipar e melhorar **até ficar cinematográfico**, não usar pesquisa infinita como substituto da implementação. Preferir composição de geometrias deformadas, shaders GLSL, instancing/pooling, VFX e postprocess controlado; pode reaproveitar bons sistemas existentes ou escrever módulos novos conforme análise.
- Relatório técnico permanente breve em `docs/auditorias/VHAZRAEL-RUPTURA-ESPADA.md` com arquitetura, testes, evidências, limitações e link.
- Não afirmar que Fate foi reproduzido exatamente ou que o vídeo foi analisado se não tiver acesso. Objetivo é fidelidade à intenção visual e sequência com assets originais.

**SILÊNCIO ABSOLUTO DURANTE A EXECUÇÃO. UMA ÚNICA RESPOSTA FINAL, MÁXIMO 10 LINHAS.**
