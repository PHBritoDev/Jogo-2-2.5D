# Laboratório visual automatizado — A Batalha Contra os 7 Pecados Capitais

## O que realmente acontece

Este laboratório abre **o HTML real do jogo e seus arquivos locais**, não uma simulação das magias. Um navegador Chromium com Playwright renderiza a dimensão do Bispo 3 usando WebGL em software (SwiftShader), e o script executa comandos **já existentes** de QA, ativados exclusivamente por `?debug3d=1`.

O teste tenta:
1. Carregar o mundo 3D, seus modelos e o renderizador WebGL;
2. Entrar na luta **real** do Bispo 3 (carta VS incluída);
3. Proteger temporariamente o protagonista, liberar poderes e acelerar o relógio de teste;
4. Controlar **o Bispo 3** para conjurar Hidra ou Chamas Negras (`kitMove('s1')`/`kitMove('s2')`), mover brevemente o protagonista e conjurar sua magia;
5. Filmar a sessão, fotografar fases distintas, mudar a câmera para visão lateral e coletar estado de combate e erros.

Ao final são produzidos `visual-lab-results/` com:
- `screenshots/*.png` — imagens reais do Chromium;
- `videos/*.webm` e `*.mp4` (conversão quando FFmpeg está disponível);
- `relatorio.json` — sucesso ou falha, ações executadas, fases, renderer, erros JavaScript, avisos e falhas de rede.

**Se não carregar WebGL, se o personagem não entrar na arena ou se a habilidade não ativar, o workflow falha; isso NÃO conta como teste aprovado.**

## Onde rodar e onde encontrar as gravações

Na aba **Actions** do repositório, workflow **Laboratorio visual do jogo 3D**:
- É executado automaticamente após mudanças relevantes na branch `main`;
- Pode ser executado por `Run workflow` com `ambos`, `hidra` ou `chamas`;
- Entre na execução e baixe o artefato `laboratorio-visual-<número>` para ver os vídeos, capturas e o relatório.

Link: https://github.com/PHBritoDev/Jogo-2-2.5D/actions/workflows/laboratorio-visual.yml

## Executar localmente num ambiente com navegador

```bash
npm install --prefix tools/visual-lab
npx --prefix tools/visual-lab playwright install chromium
python3 -m http.server 4173 --bind 127.0.0.1 &
VISUAL_SCENARIO=hidra node tools/visual-lab/run.cjs
```

Requer Node.js 22+, WebGL habilitado e conexão para baixar as dependências de `three` usadas pelo jogo. O teste na nuvem não requer PC do criador.

## Uso por outros agentes

Ao corrigir VFX, IA de combate, colisões ou animações, cheque o resultado deste workflow e examine `relatorio.json` **junto das imagens/vídeo**. Um teste de JavaScript aprovado não prova a qualidade visual. Depois de corrigir, compare screenshots atuais vs anteriores. Se houver erro, descreva-o e não alegue que confirmou o poder visualmente.

## Limitações reais

- O navegador é **Chromium na nuvem**, não o Android físico do criador; não mede FPS real do celular.
- SwiftShader pode renderizar **muito lentamente**, ou o ambiente pode negar WebGL. Nestes casos o teste deve relatar falha.
- Controlar a arena pelo QA existente e gravar provas **não é controle contínuo e inteligente em tempo real por duas IAs**.
- As capturas ficam nos artefatos do GitHub Actions, não são inseridas automaticamente no chat; o assistente precisa acessar os artefatos para analisá-los.
- O workflow **não altera o jogo principal nem cria permissões administrativas novas**.

## Próximo nível — agente visual adaptativo

Foi adicionado `agent-run.cjs`, sem alterar a jogabilidade normal. Ele **não é um Claude/Codex rodando dentro do jogo**: é um agente local, com regras de decisão e percepção de pixels, que consegue agir durante a luta.

O ciclo é real e repetido:
1. Playwright abre o jogo 3D verdadeiro, entra na dimensão do Bispo 3 e aguarda WebGL.
2. Lê uma captura **do canvas WebGL** e reduz para uma amostra RGB usando Sharp.
3. Calcula brilho médio, contraste, tela encoberta por luz, escuridão, saturação e diferença de quadros.
4. Lê telemetria já existente de `SevenSinsDebug3D` (HP, posição, fase da Hidra/Chamas).
5. `agent-policy.cjs` escolhe em tempo de execução entre **aproximar, esquivar, atacar, conjurar ou mudar o ângulo de câmera**; quando apropriado, aciona a habilidade do Bispo.
6. O navegador executa o comando, volta a observar e documenta por que decidiu aquilo.

Os resultados saem em `visual-lab-results/agente/`:
- `agente-relatorio.json` com leitura visual de cada passo, motivo e comandos realmente enviados;
- `screenshots/*.png` com capturas reais por fase;
- `videos/*.webm` e MP4 após conversão.

### Como executar

Em GitHub → **Actions → Laboratorio visual do jogo 3D → Run workflow**, selecione `agente` (somente este modo). Alterações de arquivos relevantes na branch `main` executam tanto as duas gravações tradicionais quanto o agente automaticamente.

Localmente, com o servidor em `http://127.0.0.1:4173` e dependências instaladas, rode:

```bash
node --test tools/visual-lab/agent-policy.test.cjs
node tools/visual-lab/agent-run.cjs
```

### Limitações e avaliação correta

- Isto **não utiliza um modelo multimodal conectado**: os pixels são inspecionados por métricas de imagem, e as ações são escolhidas por uma política de regras. Para interpretar semanticamente criaturas, modelos 3D ou animações como uma pessoa, é preciso inspecionar os PNG/MP4 ou integrar futuramente um analisador de imagens.
- `quadro_escuro`, `brilho_encobrindo_tela`, `poucos_detalhes_visiveis` e `imagem_quase_estatica` são **suspeitas a investigar**, não diagnósticos definitivos.
- Uma execução com sucesso comprova que navegador, WebGL e controles responderam; **não aprova automaticamente a qualidade visual**.
- SwiftShader na nuvem não representa o FPS e o toque real de Android.
- Se a batalha não carregar, não houver WebGL, a Hidra não for realmente observada ou não existirem capturas suficientes, o agente registra **falha**, não sucesso.
- No modo de teste, existem comandos de depuração com vida protegida, poderes e câmera; eles não são concedidos aos jogadores normais.



## V3 — percepção e diagnóstico avançados (Mod 272)

A V3 adiciona três ferramentas reais sem reescrever o combate:

- **Visão por 9 setores:** agent-perception.cjs processa pixels RGB capturados do WebGL, calculando brilho, contraste, saturação, bordas, movimento e possíveis oclusões. A nota de visibilidade vai de 0 a 100 e significa apenas **facilidade de inspecionar a imagem**, não beleza artística.
- **Diretor de câmera:** em vez de assumir que uma posição é ideal, agent-run.cjs testa três ângulos em momentos de inspeção ou suspeita de bloqueio, captura cada um e escolhe o que tiver maior nota de visibilidade. Registra a escolha e os três resultados. A câmera normal do jogador não é alterada.
- **Sonda do motor (somente em debug3d):** a API sceneProbe devolve chão do protagonista e do Bispo, coordenadas das raízes da Hidra, bounding box aproximado do corpo, distância de câmera, draw calls, triângulos e recursos WebGL.

A bounding box usa a geometria CPU e não inclui deformação GLSL. Uma medida de raiz próxima do solo não prova que o corpo esteja visualmente correto; é obrigatório conferir os frames.

### Painel para celular

Baixe o artefato da execução em GitHub Actions e extraia o ZIP. Abra **agente/ver-analise.html** no navegador: contém gravação MP4 e WebM, capturas reais, alertas, decisões executadas, motivos e medições do terreno. Em **agente/DIAGNOSTICO.md** existe um resumo rápido para revisão.

### Fluxo ao corrigir um poder

1. Conserve a gravação anterior como referência.
2. Modifique o poder no GitHub.
3. Execute novamente o laboratório visual e confira os testes.
4. Compare as capturas e a telemetria, procurando regressões.
5. Corrija os problemas observados e repita até obter evidências melhores.
6. Faça teste físico Android se a questão envolver FPS real, toque, GPU ou áudio.

**Limite honesto:** o agente continua sendo um controlador autônomo com visão heurística, não um modelo multimodal que reconhece semanticamente personagens. O assistente pode analisar as capturas/vídeos depois da execução. Um workflow aprovado não significa aprovação artística.



## V4 — memória visual, parecer multimodal e auditorias sequenciais

A V4 amplia a V3 mantendo o jogo, os modelos GLB e os comandos de jogadores normais **inalterados**.

**Executa sem precisar de outra mensagem no chat:**
- Ao publicar modificações relevantes em main, o GitHub Actions tenta gravar o laboratório e o agente;
- Às segundas-feiras, 12:00 UTC, roda uma auditoria programada mesmo que ninguém tenha alterado o código;
- Se o agente falhar, há **uma segunda tentativa** na mesma execução; a evidência da primeira fica em visual-lab-results/tentativas/agente-falha-1/. Após duas falhas, o job continua vermelho;
- O resultado possui vídeos, prints, painel HTML e relatórios, em ZIP nos artefatos do GitHub Actions (14 dias);
- O primeiro run aprovado salva uma referência em cache do GitHub, e o próximo gera agente/comparacao.json com pares de imagens **antes (esquerda)** e **depois (direita)**. O histórico do cache **não é permanente** e pode expirar/ser removido pelo GitHub.

**Parecer de IA multimodal (opcional; pode gerar custos):** se estiver presente no GitHub Actions o segredo OPENAI_API_KEY, o script visual-ai.cjs envia **no máximo 3 imagens reduzidas por execução** ao endpoint Responses da OpenAI, com armazenamento de resposta desativado (store: false). O modelo padrão é gpt-4.1-mini, e o script limita a 1 requisição por run, 45 s de timeout e 1000 tokens de saída. Grava agente/avaliacao-ia.json e incorpora conclusões no painel. Sem o segredo, registra sem_chave e segue com análise local sem gastar com API. **Nunca cole sua chave no chat nem salve em arquivo do repositório.** Para ativar: Settings → Secrets and variables → Actions → New repository secret → nome OPENAI_API_KEY. O uso da API tem cobrança separada do plano ChatGPT e envia os prints do jogo ao serviço escolhido.

**Arquivos da V4:**
- visual-memory.cjs: comparação RGB normalizada, imagens lado a lado e cache controlado da referência;
- visual-ai.cjs: inspeção semântica opcional, de caráter sugestivo (não configura aprovação automática);
- visual-v4.test.cjs: testes de delta RGB, formato de parecer e retenção do baseline apenas após execução bem-sucedida.

**Limites que permanecem:**
- Capturas diferentes podem representar câmera, movimento, tempo e poder diferentes; diferença visual é um indício, não um bug confirmado.
- Os agentes e testes rodam no Chromium/SwiftShader, não no aparelho físico Android.
- O parecer multimodal não controla o jogo em tempo real; o controlador da luta continua baseado em pixels e regras QA.
- O sistema não faz alterações cegas no código, não dá merge automático em possíveis correções e não mantém ciclos infinitos de tentativa. **Ele produz diagnóstico e reexecuta testes automaticamente; correções de código continuam exigindo uma ferramenta de programação conectada e revisão da alteração.**
- GitHub Actions, cache e chamadas de API podem ter cotas, cobrança e limites de execução. A frequência foi deliberadamente limitada: push, comando manual e uma inspeção semanal.

Para inspecionar pelo celular, abra o workflow, clique na execução e extraia o artefato de laboratório. Em agente/ver-analise.html ficam a galeria, a comparação visual, o vídeo e o parecer de IA (quando ativado).


## V5 — rodadas consecutivas sem aguardar o chat

A V5 substitui a tentativa de repetir uma única execução por **um ciclo de testes sequenciais**, dentro de um único job do GitHub Actions. O agendamento semanal é um acionador adicional e **não** é a espera entre rodadas.

- Rodada 1: partida real do Bispo 3 em câmera padrão, com pixels WebGL, telemetria, relatório e vídeo.
- Rodada 2: começa **imediatamente depois** da primeira, com ângulos de câmera de proximidade para inspecionar obstruções e detalhes.
- Rodada 3: ocorre se as duas primeiras apresentarem falha ou alertas visuais recorrentes importantes, usando câmera alternativa/posterior para investigar.
- Limites: duas rodadas garantidas + uma investigativa opcional (máximo três), com tempo máximo por execução. Sem chamadas de IA pagas e sem gerar commits automaticamente.
- Evidências completas: visual-lab-results/rodadas/rodada-N/agente/ e visual-lab-results/rodadas/abrir-rodadas.html; visual-lab-results/agente/ conserva a rodada padrão aprovada para manter a comparação histórica V4 consistente.
- Uma falha em qualquer rodada deixa o conjunto como requer_investigacao; evidências não são descartadas, e a qualidade visual não é aprovada só por testes de código.

O painel do ZIP possui links de cada rodada. Execute na aba Actions após um push ou por Run workflow escolhendo o cenário agente. As verificações funcionam sem resposta do usuário; o workflow termina após o limite. 

**O que isso NÃO faz:** não transforma a automação em um programador que corrige arquivos sozinho nem em um processo infinito. Para produzir novos commits após cada diagnóstico seria necessário integrar, configurar e pagar separadamente um serviço de agente de programação com credenciais e permissões controladas. A V5 melhora e repete a investigação automaticamente, mas preserva as regras do jogo sem autoedição arriscada.


## V5.1 — sobrevivência do personagem durante o teste QA

Em uma execução real de Actions (run 41589780231), a Hidra causou dano até o protagonista chegar a 7 HP e a batalha acabou antes da Skill 2. A V5.1 reduz a aceleração de tempo do agente de 6x para 3x e ativa uma cura preventiva de QA a cada 200 ms enquanto estiver numa batalha válida do Bispo 3. A cura usa apenas a API já existente em debug3d; não altera gameplay, scripts de dano nem dá vida infinita ao jogador real. O relatório grava quantas curas aconteceram. Testes cobrem o limiar preventivo e que a política não aciona cura fora dessa batalha.

O teste continua reprovado caso um poder não seja observado, a batalha termine cedo ou o WebGL não renderize; jamais trate uma cura de QA como prova de que o balanceamento do poder está correto.


## V6 — Auditoria de cinematografia 3D para novas ultimates

A V6 prepara uma forma dedicada de avaliar a cinematografia antes da ultimate seguinte. Enquanto o V5 joga e grava a Hidra e as Chamas Negras do Bispo 3, o V6 exercita uma cena que já existe no jogo: a Espada Cósmica do Bispo 2.

**Execução independente no GitHub Actions:** um novo job cinematico começa em cada push da main, sem esperar pelo V5. Na aba Actions, a opção de execução manual cinematica roda somente esse job. Duas sessões reais no Chromium: celular paisagem 852x480 e retrato 393x852. O job tem limite de 26 minutos; arquivos ficam por 14 dias.

**Evidências geradas em visual-lab-results/cinematica:** pasta de cada orientação com gravação, screenshots das fases, relatorio.json e métricas de desempenho *do navegador*; o painel offline cinematica/ver-cena.html e resumo.json permitem revisão. Os vídeos recebem uma cópia MP4 após a execução do teste.

**Métricas:** estado das fases capturado do motor, câmera e FOV ao longo do tempo, posição do protagonista, draw calls, eventuais erros de JavaScript e tentativa de movimentar o jogador ao fim da cena. Marca falha quando não inicia ou termina, os controles permanecem bloqueados, as imagens são insuficientes ou existem erros JS. Fases não amostradas, câmera com grandes saltos, FOV divergente ou movimento não observado geram alertas para inspeção; cortes intencionais não são automaticamente bugs.

O resultado capturado_para_revisao indica evidência técnica obtida, NÃO significa que os VFX estão bonitos ou que está aprovado em um Android físico. Os números p50/p95 correspondem ao software render do Chromium, não ao FPS de um celular.

**A futura ultimate:** o alvo padrão é bishop2; o agente já aceita CINEMA_TARGET=bishop3, mas para isso a nova ultimate deve existir de verdade e o jogo deve expor via modo QA SevenSinsDebug3D.kitMove('ult') e SevenSinsDebug3D.dimState().cinematic com pelo menos phase e lock. Também há CINEMA_PHASES com lista separada por vírgula para adaptar fases e CINEMA_SIZES=landscape,portrait para as orientações. Ele nunca finge executar uma ultimate ainda inexistente.

**Segurança:** não altera as regras, danos, modelos GLB, progressão ou gameplay. Usa a dimensão isolada debug3d. Não contrata APIs pagas nem adiciona uma IA que escreve código automaticamente. Os arquivos de telemetria devem ser revisados antes de usar seus resultados para uma correção.


## V6.1 — precisão dos laudos cinematográficos (run #41646714676)

A primeira execução real do auditor V6 (GitHub Actions run 41646714676, artefato cinematica-mobile-21) capturou as quatro fases em paisagem e retrato (6 prints por orientação). A telemetria confirmou liberação de lock, FOV de volta a 56 e deslocamento de cerca de 1,9 a 2,0 unidades depois de pressionar W. **Isso não comprova qualidade artística.** O início da cena teve um grande reenquadramento de câmera (190 m no landscape e 59 m no portrait), e o p95 de frames no Chromium/SwiftShader chegou a aproximadamente 367 ms, que NÃO representa FPS Android.

A V6.1 torna essa avaliação mais fiel:
- Registra **entrada, meio e final** de cada fase sempre que a cena permitir (máx. 18 capturas por orientação), em vez de capturar somente o primeiro quadro;
- Classifica saltos de câmera como initial_reframe, phase_cut ou within_phase. Reenquadramento inicial e corte de fase são sinais para revisão e não falhas confirmadas;
- Calcula ocupação estimada da **região central da tela** por retângulos HUD visíveis. As áreas sobrepostas contam apenas uma vez; cálculo geométrico não mede transparência. Cobertura relevante gera aviso;
- Adiciona aviso de renderização lenta com base no p95 real do Chromium/SwiftShader, sem confundir isso com FPS Android;
- Expõe métricas de HUD e p95 no relatório HTML offline e no JSON.

O V6.1 não altera o gameplay, os poderes nem a interface real. Os avisos precisam de revisão junto aos vídeos. Nenhuma IA paga foi adicionada.


## V6.2 — desbloqueio WebAudio ao iniciar a batalha de teste

O jogo usa Web Audio procedural (audio3d.js), que deve receber um toque/clique real antes de reproduzir sons. Na V6 antiga, a tela VS era dispensada por uma chamada JavaScript sem gesto confiável para liberar WebAudio. Isto podia tornar a auditoria silenciosa, mesmo quando os efeitos visuais eram corretos.

Agora o teste cinematográfico primeiro clica no botão VS com a interação confiável do navegador (Playwright click). Se isso falhar, registra aviso e usa o fluxo QA anterior como fallback. O jogo expõe **somente na API debug3d** o estado de WebAudio (locked, suspended, running), mute e volumes. O auditor registra os estados por fase no JSON e mostra o estado final no painel.

Uma cena com WebAudio permanentemente bloqueado gera alerta para inspeção. Mesmo quando running, **o agente NÃO atesta que um efeito foi ouvido**: a gravação padrão do Playwright não verifica o sinal sonoro nem a qualidade da mixagem. Sons, equilíbrio e sincronização com a ultimate ainda exigem revisão e, depois, teste real em celular. Esta mudança não adiciona bibliotecas, gravações invasivas ou APIs pagas.

Pesquisa: documentação MDN Web Audio API Best practices sobre ativação por gesto e AudioContext suspended/running.
