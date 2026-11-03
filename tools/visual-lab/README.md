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

