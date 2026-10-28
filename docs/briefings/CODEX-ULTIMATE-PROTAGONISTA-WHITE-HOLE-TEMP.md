# CODEX — ULTIMATE DO PROTAGONISTA: JULGAMENTO DIVINO — COLAPSO DA LUZ ETERNA

> **BRIEFING TEMPORÁRIO DE IMPLEMENTAÇÃO.** Este arquivo foi criado na branch `main` para o Codex ler e executar. **O usuário enviará pessoalmente a imagem de referência no chat do Codex**; ela não está anexada a este arquivo, e não deve ser inventada. Ao concluir a implementação, **excluir este arquivo na própria branch/PR antes de fazer o merge na `main`**, mantendo os arquivos definitivos da Ultimate. Não excluir documentos/arquivos de outras habilidades.

## ⚠️ SE O CODEX MOSTRAR "decoded message length too large" (LIMITE 4 MiB)

O erro `Operation was attempted past the valid range: ... decoded message length too large ... limit 4194304 bytes` diz que **uma mensagem/requisição transmitida ao serviço excedeu 4 MiB**. **Não prova que o briefing ou o código estejam errados**. Pode acontecer ao enviar anexos/imagens, referências de chat longo ou muitas informações numa mesma mensagem. A correção é reduzir a **mensagem enviada**, não apenas o tamanho do código lido.

**Estratégia para retomar:**
1. Se a conversa anterior não aceita mensagem, abrir uma **NOVA tarefa/conversa no Codex**, selecionando este repositório e a `main`. Não anexar a conversa anterior por `@`, nem colar o histórico todo.
2. Primeira mensagem: apenas o **link para este briefing** e pedido para ler o arquivo no repositório, sem reenviar o texto inteiro.
3. Mandar a **imagem de referência separadamente**. Se o upload apresentar o mesmo erro, reduzir a resolução/comprimir a imagem e enviar **apenas uma imagem** em mensagem separada; não mandar storyboard gigante e múltiplas capturas na mesma mensagem.
4. Trabalhar com arquivos **na workspace local** quando disponível, sem despejar arquivo inteiro no chat. Para localizar pontos de integração use `rg -n "castHolyMagic|ultimate|cineActive|SKILL_LABELS" mundo-3d-prototype.js skills3d.js`, e `sed -n 'LINHA_INICIAL,LINHA_FINALp' arquivo.js` para pequenos trechos. Se usar GitHub connector, pedir `fetch_file` com `start_line` e `end_line` em janelas de aproximadamente 80–200 linhas. Evitar saídas imensas: `cat` de todo o mundo 3D, dump integral de JSON, log completo, diff gigante, dados de GLB/base64.
5. Se um lote de anexos foi tentado e a conversa ficar bloqueada, recomeçar em tarefa nova com **mensagem curta** em vez de insistir em Retry com o mesmo payload.
6. Não apagar nenhuma implementação já realizada; antes de continuar, verificar `git status` e commits/PRs recentes para não duplicar ou sobrescrever trabalho. O problema de limite de mensagem não significa que as alterações locais foram perdidas.

**Mensagem de reinício sugerida (enviar sem anexar histórico):**
"Implemente a Ultimate do protagonista do repositório PHBritoDev/Jogo-2-2.5D lendo apenas `docs/briefings/CODEX-ULTIMATE-PROTAGONISTA-WHITE-HOLE-TEMP.md` na main. Não imprima arquivos inteiros: inspecione só trechos necessários. Vou enviar a referência visual em mensagem separada. Quando estiver pronto, teste, faça PR, remova o briefing na PR, dê merge se autorizado e informe o link do jogo."

---

- Projeto: **A Batalha Contra os 7 Pecados Capitais**
- Repositório: https://github.com/PHBritoDev/Jogo-2-2.5D
- Branch base: `main` (obter a versão mais recente antes de começar).
- Tecnologia: **Three.js, JavaScript ES modules, GLB**, jogo web 3D; prioridade de desempenho e funcionamento em celulares Android, com suporte a PC.
- Nome definitivo sugerido: **Julgamento Divino — Colapso da Luz Eterna**.
- A referência principal do usuário é uma estrutura cósmica em formato de **disco perfeitamente negro cercado por um anel/coroa branco extremamente brilhante**, com protuberâncias luminosas laterais e céu estrelado. O usuário entregará imagem e referência visual separadamente.
- **Objetivo**: uma Ultimate colossal, única e cinematográfica, com escala comparável a grandes RPGs de anime, preservando jogabilidade, estabilidade e o que já foi construído.

## 0. LEIA ANTES DE IMPLEMENTAR — REGRAS ABSOLUTAS

1. **Não é um pedido de prompt adicional: implemente a habilidade no código.** Leia a imagem enviada pelo usuário, analise os arquivos atuais, programe, teste, crie PR e faça merge após validar.
2. **Preservar as Skills 1, 2 e 3 completas**, principalmente combate, animações, cooldown, danos, efeitos, loja, HUD, mapas, dimensões, NPCs, modelos GLB, sistema de câmera e salvamento. NÃO restaurar versões antigas ou sobrescrever trabalho paralelo de outras IAs.
3. O jogador **não pode controlar personagem nem câmera desde o início até o fim da cinematografia**. A sequência pode ser longa, mas nunca pode ficar presa. Restaurar tudo em sucesso, erro ou cancelamento.
4. **Não usar a imagem como um sprite plano**. Ela é uma referência artística. Criar White Hole com **geometria 3D, shaders, anel radial de energia, movimento, volume aparente e profundidade**, incluindo sua perspectiva na câmera.
5. Não confundir a Ultimate do **protagonista** com `ultimates3d.js`, que hoje organiza Ultimates **dos inimigos**. Não alterar esses poderes por engano.
6. Dano/colisão devem ser independentes de VFX, taxa de FPS e qualidade gráfica; o ambiente não deve ser permanentemente destruído.
7. Não adicionar ferramentas pesadas por padrão. Usar Three.js atual, shaders, `BufferGeometry`, `InstancedMesh`, pools, câmera existente e áudio existente. Bloom seletivo só se o custo móvel permitir; fornecer fallback funcional.
8. Respeitar o protocolo de modelos/escala e animações existente. **Não deixar o protagonista gigante, flutuando após a execução, câmera travada ou inimigos recebendo dano fantasma**.
9. Entregar **Mod numérica atualizada, link direto para teste mobile e descrição do que realmente foi testado**; jamais declarar validação visual/FPS se não houve.
10. **Quando terminar, excluir ESTE briefing temporário em uma commit da branch da implementação, antes do merge**, para que ele deixe de existir na `main`. Verificar a exclusão após o merge.

## 1. COREOGRAFIA CINEMATOGRÁFICA — 8 FASES EM ORDEM

Duração inicial sugerida **14 a 18 segundos**, ajustável para ritmo artístico e performance, sem desacelerar excessivamente a experiência de jogo. **A câmera deve ser cinematicamente dirigida**. Bloquear input de movimento, dash, pulo, ataque, Skills, câmera livre, troca de perspectiva e interações desde o início até a restauração final. Manter controles visivelmente indisponíveis durante esse período e não descartar controle de áudio/pausa essenciais.

### FASE 1 — ASCENSÃO DO PROTAGONISTA

O jogador ativa a Ultimate em contexto válido. Registrar estado preexistente da câmera, posição, movimento, orientação, animação e modos ativos. Consumo de mana/cooldown ocorrerá **uma vez**, segundo as regras já presentes.

O protagonista começa a **voar para muito alto**, separando-se progressivamente do chão. Ele deve parecer um ser celestial em ascensão, não um boneco teleportado. A câmera começa próxima e abre progressivamente, mostrando a floresta/cidade diminuindo embaixo. Aura branca-dourada, partículas ascendentes, vento e pano/capa/sombra coerentes quando disponíveis.

A altura deve ser visualmente impressionante **sem alterar de modo permanente as coordenadas físicas do jogador**, quebrar colisões ou disparar eventos de sair de região durante a cinematografia. Preferir rig/representação controlada por câmera, com snapshot/rollback de estado; adaptar ao projeto após inspeção.

### FASE 2 — ESPADA ERGUIDA AO CÉU

No auge da subida, o protagonista **ergue a espada acima da cabeça**, apontando para o céu. A lâmina recebe uma aura branca intensa, com faíscas douradas subindo. Uma coluna/feixe fino de energia parte da ponta até o firmamento.

Usar animações reais do GLB caso exista clip apropriado; se não houver, implementar pose procedural/retargeting seguro e transição suave sem distorcer o esqueleto. Nunca elevar o personagem pelo root errado causando bug de escala. Breve pausa dramática no instante em que a energia atinge o céu.

### FASE 3 — FENDA CELESTIAL ABRINDO

**Decisão artística já tomada: começar com uma rachadura espacial que se converte num portal.** Uma linha fina branca racha o céu acima da espada; surge uma fratura com ramificações brilhantes; a rachadura abre num círculo.

Por dentro surge um **disco preto absoluto**. A borda nasce com anel branco puro, pulsante e muito brilhante, inspirado fielmente na imagem que o usuário enviará. Preservar o contraste: preto central continua preto, **não** preencher o núcleo com um brilho branco genérico.

A fissura e o portal devem ter perspectiva, escala e presença no céu do mundo 3D, sem se tornarem decalques fixos na tela.

### FASE 4 — CRESCIMENTO COLOSSAL DO WHITE HOLE

O White Hole cresce progressivamente de pequeno até **absolutamente ENORME**, ocupando aproximadamente **70–85% da região superior do enquadramento cinematográfico**, sem cortar a informação visual crítica. Mostrar o protagonista muito menor perto do disco para transmitir escala.

Enquanto aumenta:
- Coroa luminosa branca gira e ganha camadas de filamentos em espiral, oscilações, anéis, halos e distorção.
- Núcleo permanece negro; borda espessa, branca com energia dourada muito discreta.
- **Raios** e descargas atravessam nuvens e borda.
- **Tempestade**: nuvens escuras, trovões, rajadas de vento, chuva visual e poeira.
- **Detritos/sujeiras do mundo** sobem e rodopiam em direção ao White Hole: folhas, terra, pedras, galhos, rochas e fragmentos visuais seguros das construções. Escala de movimento deve crescer junto com o fenômeno.
- Uma onda de vento se propaga no cenário, folhas e partículas reagem. Iluminação ambiente oscila em momentos controlados.
- Pode haver tremor sutil da câmera em crescendos; não abusar de tremor, brilho piscando ou estroboscopia.

**IMPORTANTE:** simular a sucção por instâncias/cópias visuais temporárias. Não remover fisicamente árvores do mapa, não teleportar NPCs/inimigos nem destruir imóveis/salvamentos. Limitar número de instâncias, transparências e draw calls.

### FASE 5 — TAMANHO MÁXIMO / SILÊNCIO

Quando o White Hole atinge sua maior dimensão:
- Tempestade chega ao ápice; filamentos, relâmpagos e vento intensos.
- Mostrar plano aberto e dramático com figura do protagonista e gigantesca circunferência negra/branca.
- Espada e anel têm luminosidade máxima.
- Pausa curta e **silêncio audiovisual momentâneo**, preparando o impacto; não manter tela parada durante segundos sem justificativa.

### FASE 6 — LANÇAMENTO DO WHITE HOLE

O protagonista dá um **gesto decisivo com a espada e LANÇA O WHITE HOLE EM DIREÇÃO AO INIMIGO**, conforme o roteiro aprovado. O corpo do personagem NÃO deve entrar involuntariamente no portal. Use câmera épica e sensação de aceleração.

O White Hole deixa o ponto de invocação e viaja/avança para o alvo de forma cinematográfica: rastro de energia, anel se deformando sutilmente, deslocamento de vento, partículas e um eixo de movimento legível.

Selecionar alvo válido e **travar ID/identidade do encontro** no início; se o alvo ficar indisponível, tratar interrupção com limpeza segura e nenhuma aplicação de dano a um inimigo diferente. Se houver combate com múltiplos inimigos, definir área e alvos sem atingir NPCs ou aliados.

### FASE 7 — IMPACTO E EXPLOSÃO UNIVERSALMENTE BRANCA

Na colisão prevista:
1. O White Hole atinge o inimigo e surge um anel gigantesco de choque.
2. Raios e detritos luminosos se espalham.
3. O centro produz uma onda maciça de energia branca.
4. A explosão preenche **TODA a tela com branco** (transição cinematográfica controlada).
5. O branco total permanece brevemente e depois diminui suavemente.
6. **Dano é contabilizado uma vez por alvo/evento**, de acordo com balanceamento de Ultimate, sem depender da duração do brilho ou do FPS. Não causar morte automática inevitável em qualquer Bispo independentemente do HP.

Evitar flashes repetidos ou estroboscópicos para conforto visual. Um único crescendo intenso, com fade suave, é mais impactante e acessível.

### FASE 8 — RETORNO AO MUNDO

Depois do clarão:
- Nuvens, chuva, raios, partículas, detritos e iluminação extra desaparecem de forma gradual.
- Cenário e personagens permanecem no estado correto, exceto consequências legítimas de combate.
- Protagonista retorna ao chão, com animação de aterrissagem/idle apropriada; não flutua, não atravessa paredes, não recebe deslocamento residual.
- Câmera se reposiciona no modo exato anterior (terceira pessoa, primeira pessoa se selecionada, yaw, pitch, zoom, sensibilidade), com transição confortável.
- Controles são restaurados, estados temporários cancelados, HUD volta ao normal.
- Áudio retorna gradualmente. Nenhum timer, material, shader, instância ou listener temporário sobra.
- Cancelamento inesperado executa restauração robusta no equivalente a um `finally`.

## 2. REVISÃO DA ARQUITETURA ATUAL

Antes de editar, examinar o conteúdo mais recente da `main`:

- `mundo-3d-prototype.js`
- `mundo-3d-prototype.html`
- `mod181-loader.js`
- `skills3d.js`
- `celestial-siege3d.js`
- `celestial-siege-vfx3d.js`
- `celestial-starfall3d.js`
- `celestial-starfall-vfx3d.js`
- `celestial-phoenix3d.js`
- `celestial-phoenix-vfx3d.js`
- `audio3d.js`
- `progression3d.js`, `shop-icons3d.js`, testes existentes e documentos de escala GLB.

**Situação confirmada durante preparação:** `skills3d.js` registra `ultimate` com `disabled: true`, nome `Julgamento Divino`, `mana:80`, `cooldown:14000`, `unlockBishops:2`; `SKILL_LABELS` no mundo mostra `ultimate:'EM BREVE'`. **Verificar novamente** porque o código pode mudar enquanto outras IAs trabalham.

Atenção à distinção entre `ultimates3d.js` (Ultimates de inimigos) e esta nova Ultimate do protagonista.

Criar arquivos de responsabilidade clara, preferencialmente:
- `celestial-whitehole3d.js`: máquina de estados, tempos, alvo, custo, eventos, dano, cancelamento, regras independentes da renderização.
- `celestial-whitehole-vfx3d.js`: discos, anéis, shaders, fenda, nuvens, partículas, detritos, chuva, raio, explosão.
- Controlador de câmera cinematográfica / lock de input, reusando módulos existentes e preservando snapshots/restauração.

Implementar integração pontual no mundo e em `skills3d.js`. Habilitar Ultimate **somente quando** os componentes funcionarem e os testes estiverem concluídos.

O progresso normal continua exigindo desbloqueio/compra segundo as regras da loja. O modo de depuração **`?todasHabilidades=1`** deve liberar a Ultimate gratuitamente apenas para testes, sem alterar compras ou salvar desbloqueio permanente.

## 3. DIREÇÃO TÉCNICA / ARTE 3D

- **White Hole:** manter disco negro central, anel externo branco puro, filamentos girando, irregularidades laterais e halo intenso, alto contraste. Não transformar em sol amarelo ou buraco negro roxo.
- **Shaders:** `THREE.ShaderMaterial` (ou solução equivalente da versão atual do Three.js) para anéis, fenda, energia e distorção do disco; parâmetros uniformes para tempo, expansão, brilho, opacidade.
- **Instancing:** `THREE.InstancedMesh` para rochas, detritos e fragmentos replicados, sem sombras individuais; `THREE.Points` ou buffers para chuva e cinzas quando apropriado.
- **Pós-processamento:** considerar `EffectComposer` + bloom seletivo apenas se teste justifica. Alternativa leve deve preservar sensação de brilho no Android.
- **Câmera:** caminho cinematográfico com interpolação suave, enquadramentos com leitura em celular e escala monumental; sem travamentos.
- **Luz:** relâmpagos e exposição com intensidade controlada; evitar muitas `PointLight` dinâmicas e grandes shadow maps.
- **Áudio:** reutilizar infraestrutura existente; som grave na subida, energia ao erguer espada, vento/chuva/trovões, silêncio curto e impacto único. Sem dependência de assets remotos frágeis.
- **Cena real:** não reconfigurar permanentemente tempo, clima, clima do Ato, iluminação, posições dos objetos ou salvamentos.
- **Física de combate:** colisão de White Hole visualmente convincente, mas cálculos separados do VFX; evitar contato prematuro ou dupla aplicação de dano.
- **Animação:** usar clips existentes do protagonista quando possível; fallback procedural sem deformações, artefatos de escala ou rig gigante.

## 4. TRÊS PRESETS DE QUALIDADE (MESMA ULTIMATE E MESMO DANO)

- **Baixa:** menos detritos, menos raios, chuva simplificada, shaders e anéis leves, sem passagens pesadas de pós-processamento. White Hole continua colossal e bonito.
- **Média:** efeitos e detalhes equilibrados.
- **Alta:** mais partículas, relâmpagos, nuvens e filamentos; efeitos adicionais só se GPU sustenta.

Regras: duração, hitboxes, cooldown, mana, sequência e dano idênticos em todos os presets. Pré-alocar buffers, pools e recursos; evitar recompilar shaders ou criar centenas de geometrias a cada frame. Cuidar de `overdraw`, draw calls e stutter no primeiro cast.

## 5. TESTES E CRITÉRIOS DE ACEITE

1. Cinematografia executa **na ordem exata**: subida -> espada -> rachadura -> White Hole crescendo -> tempestade colossal -> silêncio -> lançamento -> explosão branca -> restauração.
2. Protagonista sobe alto de modo natural, espada ergue sem quebrar o GLB.
3. Portal tem centro preto e anel branco compatível com imagem entregue pelo usuário; **não é um sprite estático**.
4. White Hole é gigantesco com escala relativa clara, sem bloquear a câmera incorretamente.
5. Raios, vento, chuva, detritos e nuvens são temporários e são limpos ao final.
6. Controles e câmera permanecem bloqueados **durante toda a sequência**, e voltam sem travar.
7. Dano em alvo correto, sem hits duplicados nem dano em NPCs; neutralizar travamento de ID ao trocar alvo.
8. Cena muda, jogador morre, pausa, alvo morre, cancela, perde contexto WebGL, FPS baixo: cancelamento/restauração segura sem efeitos órfãos.
9. Testar desempenho em baixa/média/alta e mobile/PC quando ambiente disponível; explicar limitações se não for possível executar navegador/dispositivo real.
10. Preservação completa das Skills 1, 2 e 3 e dos sistemas existentes.
11. Mana/cooldown, compra, desbloqueio e `todasHabilidades=1` funcionam; Ultimate não fica permanentemente grátis no jogo normal.
12. Atualizar HUD para nome correto, etiqueta e indicador de `Mod` numérico; cache do loader/script deve apontar para build nova.
13. Testes automatizados de estados, bloqueio de input, cancelamento, dano único, pausa e cleanup, além dos testes/regressões disponíveis.
14. Link final do GitHub Pages funciona após a publicação e permite teste mobile, sem inventar que deploy terminou.

## 6. COMO ENTREGAR (INCLUINDO MERGE E REMOÇÃO DESTE DOCUMENTO)

1. Receber **a imagem do usuário no chat do Codex** e conferir detalhes. Não exigir que o usuário suba a imagem ao GitHub.
2. Sincronizar com a `main` mais recente; criar branch própria da Ultimate.
3. Implementar com módulos separados, testes, atualizações mínimas de integração e qualidade gráfica.
4. Validar o máximo possível no ambiente, incluindo testes de regressão, build e comportamento da câmera.
5. Abrir PR e descrever detalhes técnicos, testes executados, limitações e eventual ajuste de balanceamento.
6. **Antes de mesclar**, excluir `docs/briefings/CODEX-ULTIMATE-PROTAGONISTA-WHITE-HOLE-TEMP.md` **da branch da PR** em commit específico, para que a PR também remova esse documento da `main`. Não apagar o roteiro prematuramente enquanto ainda depende dele.
7. Após verificar ausência de regressões/conflitos, **fazer o MERGE da PR na `main`**, se tiver as permissões necessárias. Não parar apenas na PR se conseguir mesclar de modo seguro; caso não tenha permissão, informar claramente.
8. Confirmar no GitHub que: PR foi mesclada, código da Ultimate está na `main` e este briefing temporário foi deletado.
9. Entregar ao usuário: número da Mod, PR/commit, resultados dos testes e **link direto de teste mobile com `?todasHabilidades=1` e cache-buster** depois do deploy. Não inventar métricas de FPS.

**META FINAL:** uma Ultimate monumental, tecnicamente consistente e bonita no Android, com protagonista subindo, espada levantada, ruptura celestial, White Hole negro/branco crescendo ao extremo, tempestade e detritos, lançamento contra o inimigo, explosão branca de tela inteira e retorno perfeito à jogabilidade, sem regredir nenhuma outra Skill.
