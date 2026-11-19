# MISSÃO CLAUDE — COMBATE CINEMATOGRÁFICO + CORREÇÃO DO CARREGAMENTO
Repositório: PHBritoDev/Jogo-2-2.5D
**Missão autorizada para execução. Leia integralmente antes de editar. NÃO FAÇA MERGE AUTOMÁTICO.**

## Materiais de referência fornecidos pelo autor
No pacote `pacote_claude_combate_atualizado.zip` (anexar ao Claude, se disponível):
- `REFERENCIA_1_COMBATE_RAPIDO.mp4`: velocidade, sequências, movimento ofensivo e dash/ataque.
- `REFERENCIA_2_DUELO_CAMERA.mp4`: câmera centrada no inimigo, aproximações, esquivas e respostas.
- `COMBATE_ATUAL_VHAZRAEL.mp4`: estado real do jogo, para comparação antes/depois.
- `ERRO_CARREGAMENTO_ATUAL.jpg`: tela "Falha ao montar o mundo 3D (Mod 186)" e "Failed to fetch dynamically imported module: blob:...".
Os vídeos e a imagem são **anexos externos**, não estão embutidos neste Markdown nem devem ser fingidos como vistos caso indisponíveis. Se tiver acesso a eles, compare quadros e comportamento; caso contrário, use a descrição com honestidade. Respeitar identidade original, não copiar assets, cenas ou áudio de terceiros.

## OBJETIVO
Reconstruir profundamente a QUALIDADE REAL da jogabilidade de combate do RPG 3D para ficar rápida, precisa, responsiva e cinematográfica, preservando todo o resto do jogo. Não basta adicionar efeitos ou acelerar clipes indiscriminadamente. Desejamos câmera com foco no oponente, ataques conectando ao alvo, sequência de animações coerente, dash ofensivo, boa IA inimiga, impactos e controles excelentes em celular e PC.

## 0 — P0: Corrigir falha intermitente ao entrar no jogo
Investigar `mod181-loader.js`, `mundo-3d-prototype.html` e `mundo-3d-prototype.js`. O loader baixa JavaScript, o altera via regex, cria um `Blob` e importa sua URL; o erro observado menciona `blob:`. Isso é uma pista, NÃO prova da causa raiz. Verificar resolução de imports estáticos/dinâmicos, módulos não reescritos, MIME, erro de rede, cache, concorrência e versão de arquivos após deploy. Reproduzir em entradas a frio e reloads repetidos em Chrome Android e desktop. Obter diagnóstico com URL do módulo real. Preferir importação estável e previsível quando viável, sem quebrar GLBs/assets ou o desempenho. Não ocultar falhas com retry infinito. Corrigir e testar o erro em PR separada, se possível.

## 1 — Inventário REAL das animações, modelos e sistemas existentes
Ler a **main atual e PRs relevantes**: `mundo-3d-prototype.js`, `mod181-loader.js`, `prota-combat3d.js`, `sword-rites3d.js`, `combat-choreography3d.js`, câmeras, animações, colisões, Bispos, `docs/MOD-302-COMBATE-PROTAGONISTA.md`, modelos GLB efetivamente usados no runtime. O protagonista `Prota_otimizado_2K.glb` tem 19 clipes documentados na Mod 302, alguns reservados; verificar todos os clipes dos modelos realmente carregados do protagonista e dos Bispos. Inventariar nome, duração, esqueleto, direção, root motion, uso atual, compatibilidade e aplicação desejada. Aproveitar as **18+ animações do autor** com variedade realmente jogável, sem forçar animação incompatível (por exemplo, arco em golpe de espada). Não substituir modelos autorais nem duplicar máquinas de estados.

## 2 — Combate com alvo preciso
- Lock-on opcional e estável (mobile e PC) com seleção/alternância de inimigo, câmera focando os dois personagens, ajuste dinâmico de distância/ângulo/FOV, boa visibilidade e colisão sem atravessar parede. Sem lock-on, usar direção do movimento/câmera adequadamente.
- Resolver espada que desvia para cima/lado e erra inimigo à frente. Alinhar orientação do corpo, empunhadura, trajectory real da lâmina, animação, avanço, range e tempo do contato. Swept hitbox calibrada, não "hitbox mágica" gigante ou dano sem contato. Testar oponente parado, móvel, próximo, longe, ao lado e em diferentes ângulos.
- Combos ágeis e variados, buffer de input, cancel windows, root motion com colisão, blending profissional, ataque em corrida, salto, aéreo, pouso e contra-ataque. Distinguir golpes leves, pesados e finalizações; evitar lentidão artificial e movimento sem peso.
- **DASH JÁ EXISTE:** preservar botão, input, cooldown, efeitos e sistema atual. Corrigir animação estranha e integrar dash + ataque / dash de aproximação / esquiva + contra-ataque. **NÃO criar outro dash, outro callback, outro cooldown ou outra máquina de estados concorrente.**
- Inimigos e Bispos: IA de distância, guarda, ataques legíveis, reação a golpe, timing, esquiva, interrupções e recuperação coerentes. Sem golpes descontrolados ou acertos injustos.
- Câmera e efeitos: impactos visuais/som sincronizados SOMENTE ao contato confirmado, hitstop curto, shake moderado, nenhuma explosão que esconda combate. Os efeitos não substituem fundamentação de gameplay.

## 3 — Prova obrigatória em execução REAL
Não dar como concluído só por testes unitários ou por documentação antiga. Reproduzir o combate real no navegador, gravar vídeo contínuo (ideal 30–60 s) de antes/depois contra Vhazrael e Bispo 2; medir input-to-action, tempo ao primeiro acerto, proporção de golpes dentro do alcance que acertam, desvios de lâmina, continuidade dos combos, colisão de câmera, FPS, erros de console e controle no PC/mobile. Comparar com referências fornecidas. Verificar teclado, mouse, joystick, lock-on e dash simultaneamente. Não mascarar com cortes de câmera ou testes automatizados que não representem a jogabilidade.

## 4 — Entrega e organização
Implementar em etapas pequenas e PRs revisáveis: (1) carregamento; (2) câmera/mira/contato; (3) animações/combos/dash; (4) IA/feedback; (5) QA completo. Verificar branches/PRs ativas dos agentes para evitar conflito. Preservar progressão, save, NPCs, HUD, missões, sistema de batalha existente, estética dark fantasy e FPS em celular. Não tocar auroras, subterrâneo vulcânico, fauna ou reforma geral de áudio nesta missão. Registrar mudanças, critérios e evidências nas PRs e arquivos do GitHub.

## 5 — REGRA ABSOLUTA: SILÊNCIO TOTAL E ECONOMIA DE TOKENS
**TRABALHAR TOTALMENTE CALADO.** NÃO enviar no chat: planos, atualizações, comentários, diagnósticos, relatórios, conclusões, changelogs, números de PR, celebrações ou resumo final.
**AO TERMINAR, NÃO MANDE RESUMO NENHUM. NEM UMA FRASE DE CONCLUSÃO.**
Isso NÃO autoriza deixar de investigar, testar, documentar ou registrar resultados: tudo isso deve ser feito NO GITHUB, não no chat. Falar apenas em caso de bloqueio real que exija ação do autor, com uma única frase objetiva. Se o ambiente exigir uma resposta final obrigatória, usar somente o menor encerramento permitido, sem resumo.
**NÃO FAZER MERGE AUTOMÁTICO.**