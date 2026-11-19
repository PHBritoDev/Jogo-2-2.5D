# MISSÃO ISOLADA — CODEX DE OUTRA CONTA — NAVEGAÇÃO ADM E IDENTIDADE DA BUILD
Repositório: PHBritoDev/Jogo-2-2.5D
Responsável: Codex da OUTRA conta. **Esta missão NÃO é para Claude nem para Codex que está trabalhando na Dimensão da Ganância.**

## PRIORIDADE / REGRAS DE CONVIVÊNCIA
- Leia a **main atual** e PRs abertas antes de trabalhar. Use branch própria a partir da main mais recente; uma PR isolada para esta missão, sem merge automático.
- **NÃO TOCAR:** combate, IA dos Bispos, armas, câmera de combate, controle/teclado, VFX, áudios, músicas, auroras, iluminação, fauna, mundo, caverna/vulcão, `mundo-3d-prototype.js`, `dimension-arenas3d.js`, `audio3d.js`, nem arquivos e branches do Claude, Codex principal e agentes A1–A7. Se um ajuste exigiria alterar esses arquivos, documente a necessidade na PR e NÃO faça mudanças concorrentes.
- Trabalhar apenas no **shell de entrada/testes**, redirecionamentos, fullscreen e versão/cache, com escopo provável: `index.html`, `laboratorio-inimigos.html`, `build-info.js` e testes NOVOS específicos. Evite mexer no loader já trabalhado pelo Claude.
- Não apagar saves, progresso ou opções do jogador; não esconder funcionalidades de debug existentes sem preservar acesso equivalente.

## PROBLEMA REAL #1 — DOIS LINKS / PAINEL ADM DESCONECTADO
O criador relata: há um link “normal” e outro com opções ADM; no modo ADM, ao clicar em enfrentar inimigo, viajar para área ou usar tela cheia, é redirecionado para outra página/link, perde a interface ou a lógica de ADM; a experiência é confusa.

Constatação feita na main: `index.html` injeta iframe `mundo-3d-prototype.html`, mas não encaminha todos os parâmetros de teste; `laboratorio-inimigos.html` carrega outra instância da mesma página no iframe e usa `target="_blank"` no link `Tela cheia`, que abre **nova guia**, NÃO solicita `requestFullscreen()`. Além disso, no método `travel`, opções de dimensão definem `testeDimensao` mas **não** `adm`/`debug3d`; já a jornada define `adm=1`/`debug3d=1`, produzindo experiências diferentes. Conferir intenção do usuário e preservar o modo de teste.
**Resultado:** um ponto de entrada principal coerente, o painel/ferramentas de teste acessíveis somente quando solicitados, trocas de destino dentro da interface atual sem abrir nova guia/destruir shell, e tela cheia **REAL** via Fullscreen API no elemento do jogo/container, preservando o painel ADM e oferecendo saída. Se Fullscreen API não for suportada/negada, alternativa honesta e claramente identificada; nunca chamar de fullscreen um link target=_blank.

Implementação sugerida:
- Definir uma função central para serializar/encaminhar parâmetros de navegação (adm, debug3d, testeDimensao, jornadaInicio, build, entre outros necessários); evitar cair em URL que apaga estado ADM. Não duplicar app nem criar 2 motores em execução.
- Distinguir seleção de missão/teleporte em runtime (se API existente suportar) de recarregar iframe intencionalmente; preservar saves e retorno à UI. Se for inevitável recarregar ao trocar dimensão, manter o shell ADM e indicar recarga de forma curta.
- Compatibilidade com `?adm=1&debug3d=1`, link normal, atalhos existentes de “TESTAR”, TP para vulcão, mobile Android e desktop; não deixar novos botões encobrirem joystick/HUD.
- Incluir smoke browser test para abrir shell normal, entrar laboratório, trocar Bispo 1→Bispo 2→jornada→Bispo 4, usar fullscreen/esc e confirmar que a interface permanece na mesma aba e parâmetros ADM preservados. Não alegar prova sem executar.

## PROBLEMA REAL #2 — VERSÃO MOSTRA MOD 325 APÓS DIVERSAS INTEGRAÇÕES
Em `build-info.js` da main, verificado:
`export const MOD = 325`
`export const BUILD = 'mod325-agua-aurora-vulcao-costuras-16bf2b8'`.
O contador e a descrição ficaram velhos mesmo após PRs posteriores (#608 combate, #607 painel ADM etc.). Isto confunde o usuário e pode contribuir com cache desatualizado por uso indevido do identificador.
- Auditar dependências de MOD/BUILD, caches, parâmetros `refresh`/`build`, `build-info.test.mjs` e fluxos do loader. Atualizar **somente a fonte central** de versão, usando um identificador fundamentado na build realmente presente na main (sem inventar número de Mod como se fosse release oficial). Se necessário, complementar a identidade com SHA curto por processo adequado, mantendo compatibilidade.
- Garantir que o incremento futuro do marcador seja previsível e não dependa de editar várias páginas. Separar identidade de **deploy** (cache busting) de rótulo histórico **MOD** se isso for mais correto, mas nunca transformar o número 325 em 999 sem critério.
- Criar testes de integridade de versão, iframe e parâmetros entre entrada normal e ADM. Verificar que o contador é consistente e que os imports não ressuscitam código antigo. Não alterar sistemas de combate/carregamento internos de Claude.

## CRITÉRIOS DE ENTREGA
1. PR independente, pequena, reversível; nenhum arquivo de gameplay/áudio/arte alterado.
2. Capturas e teste funcional real das navegações, fullscreen com retorno e cache, em desktop e viewport mobile. Sem perda de interface ADM, nenhuma nova aba por engano.
3. Testes automatizados relevantes; CI verde nos jobs pertinentes. Anotar limitação de browser se houver, sem inventar aprovação.
4. Não se sobrepor a PRs abertas. Se conflito, atualizar branch própria sobre main antes de pedir integração; não forçar merge.
5. Apagar **este arquivo temporário** na própria PR ao finalizar a missão; preservar relatório técnico curto e testes permanentes que sejam úteis.

## SILÊNCIO / ECONOMIA DE TOKENS
Trabalhe em silêncio máximo: nada de planos, progresso, comentários ou resumo final no chat. Registre implementação, evidências e testes no GitHub. Apenas pedir algo se bloqueio real exigir intervenção. **NÃO FAZER MERGE AUTOMÁTICO.**
