# CODEX · MISSÃO MOD 236 — VFX Engine 2.0 + Dragão Celestial + Portais em Dupla + Ruptura X

> **Briefing TEMPORÁRIO, com autorização para implementar e fazer merge quando seguro.** O usuário testou a Mod 235 em 30/10/2026 e NÃO aprovou o dragão nem os portais. Não basta aumentar escala ou adicionar brilho: mudar **forma, comportamento, ritmo e linguagem visual**. Ao concluir implementação, testes, commit, merge e publicação, **apagar apenas esta pasta**. Não apagar documentos permanentes nem arquivos de outras tarefas.

## 0. Estado real do repositório e leitura obrigatória

- Repositório `PHBritoDev/Jogo-2-2.5D`, `main`. **Mod 235 já mesclada via PR #320**, commit de merge `7e5f1766edca2ff05a1c3f025ce53a13ad5d85f9`. O briefing anterior da Mod 234 já foi removido; não procure por ele como pré-requisito.
- Ler **integralmente** `AGENTS.md`, `PROMPT_MESTRE_DO_JOGO.md`, `docs/VISAO-MESTRA-QUALIDADE-VISUAL-E-GAMEPLAY.md`, `docs/PROTOCOLO-BUG-ESCALA-GLB-PROTAGONISTA.md`, e arquitetura atual do jogo.
- Arquivos existentes que exigem revisão: `skill-judgment-dragon3d.js`, `skill-judgment-dragon-vfx3d.js`, `skill-twin-portals3d.js`, `skill-twin-portals-vfx3d.js`, `skill-x-rupture3d.js`, `skill-x-rupture-vfx3d.js`, `skill-impact3d.js`, `celestial-fxkit3d.js`, `mundo-3d-prototype.js`, `progression3d.js`, HUD, efeitos sonoros, testes e cache-busting do loader.
- **Referências do usuário**: imagem `1000362581.jpg` (dragão dourado colossal de fogo, espiralado), vídeo `1000362663.mp4` (resultado insatisfatório da Mod 235 no dragão) e vídeo `1000362664.mp4` (resultado insatisfatório da Mod 235 nos portais). Há um pacote reduzido `referencias_mod236_codex.zip` para o usuário anexar ao Codex. **Não presumir que o ZIP está no GitHub**. Se não estiver acessível, este briefing descreve o que fazer; não inventar que viu os arquivos.
- O usuário citou como **referência de sensação/movimento**, não para copiar ativos, a habilidade da **Fruta Spirit (Soul) de Blox Fruits**: dois portais/fontes liberando ataques coordenados e poderosos. Pesquisar gameplay e princípios de VFX, se necessário; criar design original para nosso RPG, sem copiar personagens, texturas, sprites, modelos, áudio ou assets protegidos.

## 1. Avaliação do usuário — o que NÃO deve permanecer

**Dragão atual Mod 235:** chifres enormes e rígidos, cabeça de jacaré, boca desproporcional/estranha, corpo ainda com aparência de criatura segmentada ou boneco 3D; o usuário quer dragão de fogo fluido **igual à direção de arte da imagem**, não apenas um réptil dourado ampliado. A bola negra é uma **esfera genérica com brilho**, não uma bola de fogo com matéria e turbulência. Vídeo mostra dragão serpentino em arco, mas cabeça rígida, material sólido e pouco volume de chamas.

**Portais atuais Mod 235:** excesso de abertura/partículas/clarões decorativos que poluem a visão; vários projéteis individuais em formato de bolinhas/feixes que não têm o peso desejado. No vídeo, tela fica tomada por luz rosa/branca por instantes. **O usuário mudou o design: NÃO quer mais 24 projéteis individuais.** Quer UM ataque grande vindo de cada portal, **os dois disparados juntos e viajando RETO em direção ao inimigo**, coordenados, com presença física e impacto. Não usar efeito genérico de laser cilíndrico ou bolinha.

**Skill X:** usuário autoriza e quer melhorias com a nova VFX Engine 2.0, preservando o conceito de X 2x maior, um pouco mais lento, raios negros orgânicos, atravessar inimigo e fissuras/impactos de qualidade; manter o que ficou bom na Mod 235.

## 2. DRAGÃO DO JULGAMENTO — refazer aparência e projétil, preservar a sequência

### 2.1 Silhueta e direção de arte — obrigatória

- A referência é um **dragão oriental/celestial composto de fogo dourado/branco**, com corpo **gigantesco e serpentino**, espiralado no céu; contorno feito de línguas de chamas em movimento, cauda longa e cabeça nobre com expressão, não jacaré/crocodilo.
- **Remover chifres gigantes e focinho de jacaré.** Cabeça de dragão oriental: testa elevada, focinho mais curto e elegante, sobrancelhas de chama, crina de fogo, bigodes finos, mandíbulas que abrem amplamente com contorno flamejante, dentes sutis se necessários. Chifres, se existirem, pequenos e integrados às chamas, sem dominar silhueta.
- O dragão **deve parecer energia viva, não estátua dourada**. Reestruturar malha/materiais/shaders: núcleo incandescente, camadas semitransparentes de chamas com flow/noise animado, turbulência que percorre o corpo, bordas dilaceradas pelo vento, rastro flamejante que segue a curvatura, dissolução orgânica. Evitar peças rígidas, cilindros e segmentos reconhecíveis. Usar `dragonLoft` e `dragonFlames` existentes como base se apropriado, mas **reescrever** o que limitar a estética.
- **Escala verdadeiramente colossal**: ocupa parte relevante do céu/câmera, cabeça e mandíbula grandes em comparação ao inimigo, corpo muito longo com espirais; não esconder tudo fora do enquadramento nem atravessar a câmera. Distância, FOV, composição e qualidade mobile devem ser testados em 1ª e 3ª pessoa. Não aumentar `scale` cegamente; corrigir proporções e perspectiva.
- Manter **corpo predominantemente dourado**, como imagem. Preto/carmesim/magenta/violeta podem existir na **invocação** e na bola de fogo, mas não transformar o dragão em rosa nem saturar tudo até branco.

### 2.2 Bola de fogo — eliminar esfera genérica

- Substituir a atual `IcosahedronGeometry(.7,2)` e material de esfera simples como representação principal por **bola de fogo volumétrica convincente**, de tamanho grande: núcleo quente negro-carmesim com corona vermelho-laranja/dourado, línguas de fogo turbulentas animadas e direcionadas para trás pelo movimento, filamentos, brasas, fumaça e camada de choque; silhouette irregular, pulsante e com profundidade. **Não** apenas escalar uma esfera e adicionar partículas aleatórias.
- Construção possível: casca de shader volumétrico *fake* com raymarch curto/flow-noise e camadas mesh, geometria orgânica deformada no shader, fogo em ribbons orientados pela velocidade e sprites suaves apenas como suporte. Avaliar custo real no Android. Se usar instancing, limitar overdraw e emissivo.
- Bola nasce/é comprimida na boca ou nas proximidades da cabeça, cresce com antecipação legível, é lançada **fisicamente pelo dragão do alto**, atravessa o espaço 3D com trilha, ilumina brevemente o entorno e colide com alvo/terreno (colisão contínua); impacto tem fogo espalhando radialmente, fragmentos e crateras temporárias **não genéricas**, hit reaction e som grave.
- Preservar sequência **invocação → ascensão → bola de fogo → mergulho → abrir boca → mordida → explosão final**, sincronizando lógica e VFX. Evitar teleporte da cabeça, pop visual, clipping, espada descolada da mão e deslocamento forçado do boss.
- Revisar `skill-judgment-dragon3d.js` e VFX com testes para dano por fase, sem duplicar dano, cooldown, cancelamento, alvo morto/móvel e performance.

## 3. PORTAIS DA PERSEGUIÇÃO — mudança de design: DOIS ATAQUES JUNTOS, NÃO BOLINHAS

**Este pedido substitui o design de 24 disparos da Mod 235.** Não manter enxame de bolinhas, nem duplicar 24 projéteis com tamanhos maiores.

- Manter **dois portais de cores distintas**, vermelho/carmesim e violeta, mas abrir de forma **rápida, limpa e elegante**. Remover telas brancas, círculos desnecessários, prelúdios longos e ruído visual. A entrada dos portais precisa ser reconhecível sem encobrir herói, inimigo e HUD.
- Cada portal dispara **UM ataque principal grande**, os **dois disparos acontecem sincronizados**, avançando **RETOS para o inimigo** (um vetor por portal, sem órbitas, serpenteio, loops, 24 fios, perseguição infinita ou bolinhas separadas). Podem ter leve convergência para o centro da hitbox e assimetria de desenho, mas os corpos viajam em linha reta no espaço.
- A aparência dos dois ataques deve ser de **massa mágica poderosa e contínua**: dois fluxos/lanças de energia com frente larga, núcleo denso, cauda volumétrica orgânica, filamentos que se desprendem, arcos elétricos e turbulência; não lasers finos retos, não discos chapados e não esfera brilhante simples. O vermelho e o violeta têm linguagem visual própria e interagem quando se aproximam.
- Para preservar a duração satisfatória, estruturar a habilidade como **fase de preparação curta (~0,3–0,6s), avanço dos dois ataques (~1,5–3s dependendo da distância), choque sustentado/pressão no alvo (~1–2s) e finalização**; ajustar pacing em testes. Dois ataques simultâneos podem pulsar **dentro do mesmo corpo contínuo** para criar força, mas não spawnar projéteis individuais. O alvo reage e o impacto cresce progressivamente, sem congelar o personagem.
- **Colisão real** com inimigos e cenário; o contato cria frentes de choque, deformação/pressão visuais, detritos e rachaduras temporárias no solo; colisão com parede bloqueia os feixes. No fim, **explosão combinada vermelho-violeta**, bem maior, em 2–3 etapas com compressão, expansão e dissipação. Dano total e mana balanceados com as outras skills; aplicar eventos discretos, não dano a cada frame de shader. Tratar inimigo que morre ou se move, múltiplos alvos e cancelamento.
- Revisar `skill-twin-portals3d.js` e `skill-twin-portals-vfx3d.js` **em conjunto**; remover/substituir `THREADS` e lógica das 24 trajetórias sem deixar código morto, testes quebrados ou vazamentos. O nome da skill e a integração com HUD/loja/saves permanecem iguais.

## 4. VFX ENGINE 2.0 — infraestrutura reutilizável, SEM REFAZER O JOGO

Criar/aperfeiçoar uma **biblioteca modular** em cima de `celestial-fxkit3d.js` e `skill-impact3d.js`, com APIs claras e exemplos em X, portais e dragão. Não criar um segundo renderer, não instalar Unity, não reescrever toda a engine e não introduzir dependências grandes sem justificativa.

Módulos ou componentes (nomes livres, preferir arquivos pequenos e claros):
1. **EnergyFlow/FlameVolume:** shader GLSL com fluxo/turbulência, corpo irregular animado, núcleo e bordas de energia, presets para fogo celestial, negro-carmesim e magenta-violeta; não só ruído visual.
2. **ImpactDirector:** eventos de colisão autoritativos que disparam choque, fragmentos 3D, rachaduras/cratera temporária, poeira, luz curta, som e hitstop mínimo; intensidade proporcional ao ataque; marca de solo integrada ao terreno e apagada após segundos, sem editar malha de mundo permanentemente.
3. **Trails/Ribbons:** rastros 3D de volume, espessura variável, twist, turbulência e dissipação, orientados pelo vetor de velocidade.
4. **Performance:** object pooling, `InstancedMesh` quando adequado, materiais compartilhados, geometria reutilizada, LOD/qualidade por dispositivo, teto de partículas/draw calls/overdraw, limpeza de recursos, nenhum shader caríssimo obrigatório para Android.
5. **Debug Lab:** reaproveitar `?testeQuantum233=1` ou criar modo dedicado de laboratório com inimigo de treino, acesso direto às três skills, opções de qualidade e contadores FPS/draw calls, sem alterar progresso normal. Incluir teste de impacto em solo e alvo móvel.

**Usar efetivamente os novos componentes** no dragão e nos portais. Também refinar **Ruptura em X**: corpo do X vivo e espesso, raios negros orgânicos, rastro com direção correta, impacto com fissuras/fragmentos não genéricos, sem ficar pequeno/rápido demais; preservar travessia com hit único por alvo, colisão com paredes e balanceamento.

O objetivo não é vender o nome “VFX Engine 2.0” no HUD; é construir componentes realmente reutilizáveis para os próximos poderes, bispos e ultimates. Documentar API, exemplos e limites de desempenho em documento **permanente** apropriado (não apagar essa documentação com o briefing).

## 5. Aceitação visual — obrigatório ver antes de entregar

- Dragão comparado lado a lado com a imagem: silhueta **gigante, flamejante, oriental**, chifres discretos, sem cabeça de jacaré; bola negra **realmente de fogo** e não esfera com material emissivo. Câmera acompanha ascensão, projétil e mordida.
- Portais: abertura curta sem explosão gratuita; **EXATAMENTE DOIS ataques principais**, um por portal, lançados juntos em trajetória reta, volumosos e impactantes; sem chuva de bolinhas ou clarão rosa/branco cobrindo tudo.
- X: evolução visual real e mensurável em relação à Mod 235, sem regressão de hitboxes e sem “papelão”.
- Mobile: executar teste real em viewport de celular, primeira/terceira pessoa, FPS e tempos de carregamento; comparar screenshots ou vídeos com as referências, identificar glitches e corrigir. Rodar testes automatizados e testes novos de portais (2 disparos sincronizados), dragão (fogo+ordem de fases), X (hit único e atravessar), cleanup, física e saves.
- Preservar câmera, corrida e espada na mão corrigidas na Mod 235, não introduzir bugs de escala GLB, não mexer em sistemas não relacionados. Revisar console e medir GPU/CPU quando possível; **não alegar testes que não fez**.

## 6. Fluxo de trabalho, commits, merge e limpeza

1. Conferir a `main` mais recente, identificar se outro agente está editando o repositório; trabalhar em branch própria para preservar concorrência.
2. Implementar **tudo** (VFX Engine 2.0 + dragão + bola de fogo + dois portais sincronizados + X), com commits regulares e teste de integração. Não responder só com plano ou prompt.
3. **Assim que terminar e passar testes, criar commit imediatamente**, abrir PR se necessário, sincronizar `main`, revisar diffs e **fazer merge na main** se seguro, sem sobrescrever trabalho alheio.
4. Atualizar marcador de Mod (sugestão Mod 236, ou próximo número livre), loader e cache busting. Verificar publicação GitHub Pages e link direto do treino.
5. **Depois da implementação e merge, excluir SOMENTE `docs/briefings/CODEX-MOD236-VFX-ENGINE-DRAGAO-PORTAIS-X-TEMP/`**, em commit separado ou no PR final, preservando docs permanentes e demais briefings de agentes.
6. Resposta final **curta**, em PT-BR: Mod, o que mudou em dragão/portais/X, sistema VFX, testes realizados, merge e link direto. Evitar mensagens intermediárias, exceto bloqueio real.

**Diretriz essencial:** visual fiel à referência do dragão e à intenção dos ataques coordenados dos portais, com implementação original, legibilidade e desempenho Android. O usuário NÃO quer mais o dragão rígido nem as bolinhas dos portais.
