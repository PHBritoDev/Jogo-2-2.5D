# Renascimento de Eldória — Fase 2: Vale do Despertar (primeira impressão)

Diretriz: `CLAUDE-MISSAO-01-ELDORIA-2.md`, seção **DIRETRIZ EXECUTIVA — FASE 2**. Branch:
`claude/eldoria-renascimento-fase2`. O PR **não tem merge** sem aceite dos diretores.

> As capturas são do runtime real (Chromium WebGL / SwiftShader), em ângulos, posições, FOV, horários e climas
> fixos. O "antes" é a `main` atual. **Não é medição de Android:** nenhuma meta de FPS em aparelho foi declarada.

## 1. Inventário do percurso inicial (o que estava fraco)

| Trecho | Antes (`main`) | Decisão |
|---|---|---|
| Prado do despertar (54, 160) | Capim e flores bons. Rochedos eram esferas facetadas procedurais ("pedra de polígono") | **Substituídos** pelo `RochedoMusgoEldoria` (LOD1, musgo e textura assados), nas mesmas posições e com os mesmos colisores. Os antigos ficam desligados, sem malha duplicada |
| Vale entre o prado e a planície (z 30–130) | Encostas lisas, verdes e vazias. As encostas já eram caminháveis (o limite do mundo fica 45 m além da borda antiga), mas não havia nada nelas: o "grande plano vazio" | **Recomposto:** bosques em grupos naturais, orla e alameda junto à estrada, marcos de crista, afloramentos de rocha, clareiras intencionais |
| Garganta de Teren (z 170–215) | Paredes lisas | Bosques nas encostas, mantendo livre a janela por onde a carroça é vista |
| Desvio opcional | Nenhum no vale | **Trilha do Vigia → Posto do Vigia** (ruína autoral, vista sobre o vale, relicário com recompensa única) |
| Planície → ponte → cidade | Cinturão de mata (Mod 292), ponte e cidade existentes | Mantido nesta rodada. A Fase 1 já corrigiu a câmera na ponte. A cidade é a próxima etapa (§5) |

## 2. O que foi construído

- **`eldoria-valley-landscape.js`**: planejamento puro e determinístico.
  - **Bosques:** centros por Poisson grosso sobre uma máscara de ruído baixo (alterna mata e campo), com 4 a 10
    árvores cada.
  - **Espécies pelo relevo:**
    - baixio úmido: palmeira e embaúba;
    - meia-encosta: copa-larga e figueira;
    - crista: figueira e copa-larga;
    - marcos de horizonte: 4 sumaúmas e 1 figueira.
  - **Junto à estrada:**
    - alameda esparsa a cada ~15–24 m, alternando lados;
    - orla de árvores jovens e palmeiras baixas na meia-encosta a 4,6–10 m, com janelas de vista.
  - **Respeita:** estrada (≥ 4,6 m), prado, emboscada dos bandidos, parada de Teren, despertar, abrigos, rochedos
    existentes, cinturão vizinho, Trilha do Vigia e as 4 clareiras intencionais.
  - Usa as **mesmas 5 espécies, materiais e LODs instanciados** do cinturão (`EldoriaArvoresTropicais.glb`). Os
    colisores de tronco vêm do mesmo pipeline, e o sub-bosque e a sombra sob a copa são gerados automaticamente para
    as árvores novas.
- **Afloramentos:** 14 grupos (29 blocos) num único `InstancedMesh` do `RochedoMusgoEldoria-lod1.glb`, meio enterrados
  e orientados pela encosta. Colisão por domo (regra da Fase 1): pisa-se na beirada baixa e o corpo nunca entra na
  pedra.
- **`eldoria-valley-ruin3d.js` — Posto do Vigia** (29, 96,5), no topo da encosta oeste:
  - piso de lajes caminhável;
  - muro em arco feito de **fiadas** de pedra desencontradas e quebradas no topo, aberto para a trilha e para a vista;
  - coluna em tambores e coluna caída;
  - nicho com o relicário.
  - Tudo autoral, procedural, numa só malha, com textura de pedra gerada por código e musgo por cor de vértice.
  - O relicário dá +6 moedas e XP de ruína uma única vez, salvo em `seven-sins-3d-posto-vigia`.
  - A **Trilha do Vigia** entrou em `FOREST_TRAILS` (chão pintado, mata desviando) e a clareira em
    `FOREST_CLEARINGS`.
- **Rollback:** `?vale=0` desliga o vale novo, os rochedos novos e o posto, e volta ao estado da Fase 1.

## 3. Proteções verificadas

- **Preservado:** narrativa, cenas do despertar/asas/Teren/carroça/emboscada, coordenadas canônicas (`FALL_SPOT`,
  `TEREN_ROAD`, `TEREN_STOP`, `ROAD_BANDITS`, abrigos), save, combate, dimensões e HUD.
- **Cuidados de integração:** nenhuma árvore entra em clareira de cena; a estrada da carroça continua livre; o
  despertar mantém 14 m livres.
- **Arquivos tocados:**
  - patch mínimo em `mundo-3d-prototype.js`: plano do vale, afloramentos, troca dos rochedos do prado, posto e o
    gancho `checkVigiaRuin`;
  - 2 entradas de dados em `act1-world-layout.js`;
  - 1 regex de teste atualizada (`forest-fps305`, para aceitar o plano do vale no mesmo pipeline).
- **`build-info.js` não foi alterado**, conforme o contrato.

## 4. Testes e QA

| Teste | Resultado |
|---|---|
| `tests/renascimento-f2.test.mjs` | 5/5. Cobre: determinismo; quantidade de mata; mistura de espécies; estrada, prado, clareiras, trilha, emboscada e despertar livres; espaçamento sem fotocópia; afloramentos; registro da trilha e da clareira; contrato de integração e rollback |
| Suíte completa | Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| QA jogável (`tools/visual-lab/renascimento-f1-qa.cjs`, CI `renascimento-f1-qa`) | Matriz da Fase 1 + 3 trechos da Trilha do Vigia + abertura do relicário, em mobile e desktop |
| Capturas antes/depois | `docs/renascimento/evidencias/f2/`: 10 ângulos fixos × 5 condições (15 h limpo, 6:24 com neblina, 18:12 com nuvens, 22:30 noite, 16 h tempestade) |

## 4b. Custo medido (mesmo enquadramento, 15 h, céu limpo, paisagem mobile 852×393)

Medido com SwiftShader (CPU). As contagens de draw calls e triângulos são exatas e comparáveis. O tempo de quadro
**não** é o de um Android.

| Local | draw calls `main` → F2 | triângulos `main` → F2 | geometrias |
|---|---|---|---|
| Prado do despertar | 33 → 39 | 174 k → 229 k | 206 → 231 |
| Vale (60, 62) | 143 → 155 | 346 k → 365 k | 242 → 267 |
| Vale sul (68, 112) | 113 → 125 | 349 k → 378 k | 242 → 267 |

A cena nova cabe nesse custo porque:
- as árvores do vale são instâncias do mesmo pipeline com LOD/impostor (nenhum material novo);
- os rochedos e afloramentos usam o LOD1 (2,3 k triângulos) e são **cortados por distância**;
- capim e flores são cortados por distância.

A memória de heap JS ficou estável (≈ 143–158 MB nos dois casos).

## 5. Próximas etapas (plano, não feito nesta rodada)

- **Margem do rio e vau:** margem erodida com pedras assentadas e vegetação ribeirinha. O vau raso desenhado exige
  rebaixar o canal localmente (terreno + contrato `water-wade`), no trecho leste da ponte.
- **Chegada da cidade:** redesenho da frente e da praça. Ruas em níveis, escadas, fachadas proporcionais, portas
  só onde têm função, e NPCs com ações (carregar, varrer, vender, vigiar). A pobreza vem das pessoas e dos recursos.
- **Caverna e serra:** plano espacial (galeria vertical com dois níveis e saída alternativa), luz por cristais e
  tochas GLB, colisão por superfícies caminháveis e câmera com `camSolid`. Não foi reconstruída nesta rodada.
- **Áudio por região e clima:**

  | Região | Camada |
  |---|---|
  | Prado | Vento no capim e pássaros diurnos |
  | Vale | Eco suave e folhas nas copas novas |
  | Posto | Vento de crista |
  | Rio | Correnteza perto da margem |
  | Chuva | Mais forte sob as copas e silenciada em interiores |

  Tudo pelo motor procedural existente (`audio3d.js`), sem sons externos.
- **Streaming por setores:** setores de 64 m com orçamento de instâncias por setor, depois da medição em Android
  real.
