# Renascimento de Eldória — Fase 1: auditoria factual, contrato e entrega

Missão: `docs/renascimento/CLAUDE-MISSAO-01-ELDORIA-2.md`. Branch: `claude/eldoria-renascimento-fase1`, com o PR isolado e
**sem merge** até a aprovação dos diretores.

- Base: `main` @ `204bc47`.
- PRs abertos na hora da auditoria: #508 (escudo VFX), #507 (áudio), #473 (roteiro Ato 1), #468 (HUD/saltos) e #463–466
  (tochas/caverna antigos). Esta fase não toca os arquivos que eles alteram de forma conflitante, exceto pontos mínimos
  de `mundo-3d-prototype.js`, todos listados abaixo.
- `build-info.js` **não** foi alterado: pelo `CONTRATO-AGENTES.md`, quem faz o release final é que atualiza.

> **Limitação declarada:** não houve navegador com GPU real nem Android. As medidas são do Chromium WebGL em
> SwiftShader (CPU), úteis para regressão funcional e custo **relativo**. **Não** representam o Galaxy A55, e
> nenhuma meta de FPS em aparelho foi declarada atingida.

## 1. Auditoria do estado atual (o que foi medido no jogo real)

| Área | Estado em `main` | Evidência |
|---|---|---|
| Ciclo de luz | Paleta com 11 chaves por hora + nota por região (Mod 316). Sol em passos de ~0,25°, 24 h = 960 s. **Bom; mantido** | `eldoria-nostalgic-light.js`; quadros `evidencias/base-*` |
| Clima | **Inexistente** em Eldória. A chuva do Ato II está desligada desde a Mod 205 (`raining=false`). Não há neblina por clima, relâmpago nem molhado | `updateAct2Weather` |
| Nuvens | 5 grupos de esferas (opacidade 0,32) que parecem "algodão colado": exatamente as "nuvens chapadas" proibidas | `cloudLayouts` |
| Vento | Só `uForestWindTime = now`: velocidade constante, sem rajada | `animate()` |
| Rochas (herói) | Cilindro **infinito** de raio 0,74·r. Rochas ≤ 0,68 m eram ignoradas (o corpo atravessava a malha) | matriz abaixo, coluna "antes" |
| Água | O herói entrava no rio até 1,25 m de profundidade (água no peito) e parava numa parede invisível no meio da correnteza, sem explicação | matriz: `rio-fora-da-ponte` |
| Ponte, escada, degraus do abrigo, casas | Corretos (0 penetração, progresso esperado) | matriz |
| Erros/404 | 0 erros de página e 0 GLB/JS com HTTP ≥ 400 no percurso | `qa/report.json` |
| Quadros fixos | A estrada em (53, 60) é uma encosta sem mata (composição fraca). Na ponte, o enquadramento em (−0,4, −3,5) cola a câmera no guarda-corpo. **Registrado para a Fase 2** (não é remendo desta PR) | `evidencias/base-12/` |

### Matriz de navegação — antes × depois

Mesma sequência, mesmos pontos reais do mapa. O controle é simulado quadro a quadro (`navWalk`, 60 Hz).
"pen" = quadros com o corpo **dentro** do volume visual de uma rocha.

| Caso | Antes (`main`) | Depois (Fase 1) |
|---|---|---|
| Rocha baixa (0,32 m) | passa, mas **pen 36** (atravessa a pedra) | passa por cima, **pen 0** |
| Rocha baixa 2 (0,58 m) | **pen 72** | sobe e desce o domo, **pen 0** |
| Rocha média (0,95 m) andando | para **dentro** da rocha (x 77,66), **pen 90** | para no contato visual (x 77,33), **pen 0** |
| Rocha média correndo + pulo | **impossível** (cilindro infinito), pen 37 | **pula por cima** (x 80,1), pen 0 |
| Rocha grande (3,7 m) | pen 119 | bloqueia, **pen 0** |
| Rocha grande + dash | pen 155 | bloqueia, **pen 0** |
| Ponte | atravessa | atravessa (igual) |
| Rio fora da ponte | entra até a água no peito (y −1,75), parede invisível | entra até a coxa (0,85 m), para com a mensagem "atravesse pela ponte" |
| Escada / degraus do abrigo / casas | ok | ok (igual) |
| Lago raso → fundo | entra até 1,25 m | entra até 0,85 m e para (mesma regra do rio) |

Arquivos: `evidencias/nav-antes.json` e `evidencias/nav-depois.json`.

## 2. Contrato arquitetural (não destrutivo)

Camadas novas, testadas em Node e ligadas por integração mínima:

| Módulo | Papel | Teste |
|---|---|---|
| `eldoria-weather.js` | Diretor de clima puro e determinístico por semente. Estados: limpo, nuvens, encoberto, neblina, chuvisco, chuva, chuva forte, tempestade. Transições ponderadas por hora e região; a tempestade só nasce de chuva forte; neblina de vale só de madrugada. Também cuida de umidade, rajadas, relâmpago (Poisson) com trovão a 343 m/s, e de `applyWeatherToLight` (modula a amostra da hora) | `tests/renascimento-f1.test.mjs` |
| `eldoria-weather3d.js` | Apresentação: cúpula de nuvens (1 draw call, textura de ruído periódica 256², cobertura e base escura pelo clima, cor pelo sol da hora), chuva na GPU (`drawRange` pela intensidade), fita de relâmpago, superfícies molhadas (cor/rugosidade com valores base restaurados) | parse + QA no navegador |
| `eldoria-rock-collider.js` | Rochas do **herói** como domos. A pedrinha se pisa; a rocha alta só se vence por cima (pulo), e o flanco íngreme não deixa subir nem 1 cm. Quem pousou no flanco escorrega para fora; quem ficou dentro sempre pode sair | `tests/renascimento-f1.test.mjs` |

Pontos tocados em `mundo-3d-prototype.js`, com patch mínimo por função:
- **Imports:** os 3 módulos.
- **Antes de `applyDayNightVisual`:** criação do diretor e da vista, `weatherAllowedHere()` e `updateWeather(dt)`.
- **`applyDayNightVisual`:** `applyWeatherToLight` depois da nota por região. Sol, lua e estrelas somem sob céu
  fechado.
- **`updateDayNight`:** `updateWeather(dt)` e `eldoriaWeatherView.update(...)`. A chuva vai para o áudio existente
  (`worldAudio.setRain`).
- **`animate()`:** o vento das árvores usa `weatherWindPhase` (a velocidade varia com o clima e as rajadas, e a fase é
  integrada, sem saltos).
- **Nuvens antigas:** escondidas. O preset gráfico agora só escolhe o detalhe da cúpula.
- **`blockedAt(x,z,skipRocks=false)`:** NPCs, câmera e IA continuam com a regra antiga; só o herói passa
  `skipRocks`.
- **Herói:** `playerBlockedAt` e `dashBlockedAt` usam `rocksBlock`, e o apoio vertical usa `rockSupportAt`. A regra de
  água funda vem de `PLAYER_WADE_MAX = 0,85`.
- **Depuração** (`SevenSinsDebug3D`): `weather(nome)`, `weatherState()`, `strikeNow(dist)`, `navWalk(...)` e
  `navCatalog(...)`.

**Onde o clima vale:** só em Eldória (raio de 380 m em volta da vila). Fica de fora em dimensões, cavernas e vazios
(`voidMode`), na cidade de neve e no Ato II (as cinzas do vulcão seguem a decisão da Mod 205). O estado é salvo em
`seven-sins-3d-clima` e restaurado ao recarregar.

**Orçamento de desempenho da camada nova:**
- Draw calls: +1 (nuvens) sempre; +1 (chuva) só com chuva; +1 (raio) só durante ~0,3 s.
- Memória: textura de ruído de 256 KB (+ mipmaps; 64 KB no perfil baixo).
- Partículas: no máximo 3200 gotas (1400 no perfil baixo), 0 no tempo seco.
- Nenhuma luz nova e nenhum material recompilado por quadro: só uniforms e `drawRange`.
- O custo relativo medido está no `report.json` do CI (mesmo enquadramento, limpo × tempestade).

**Contrato de áudio:** usa só o motor procedural existente (`audio3d.js`): `setRain(nível)` e `thunder()`, sem
arquivos novos. O trovão é agendado pela distância do raio. Para a Fase 2 ficam documentados: chuva espacial (silencia
sob telhado/caverna), gotejamento nas folhas, riacho por proximidade e passos molhados. Nenhum som genérico novo foi
adicionado.

## 3. Mapa conceitual de expansão (proposta para aprovação)

| Região (Ato I) | Função | Estado | Próxima fase |
|---|---|---|---|
| Prado do Despertar | Início, primeira vista e tutorial de movimento | jogável | composição dos pontos altos e trilha secundária |
| Garganta de Teren | Estrada de chegada e emboscada | jogável (Mod 317) | eco, vento canalizado, ruína lateral |
| Mata Funda | Floresta densa navegável e descobertas | jogável | sotobosque variado, clareiras com recompensa |
| Rio e Ponte | Entrada obrigatória da cidade | jogável | margens naturais, vau raso **desenhado** (opcional) e cascatas |
| Eldória | Cidade viva e pobre (pessoas, não ruína) | jogável | ruas por função, portas acessíveis, mercado vivo |
| Lago Escuro, Serra e Fronteira | Exploração lateral, perigo gradual e caverna | jogável | verticalidade, passagens secretas, POIs com história |

**Plano de streaming** (Fase 2, depois de medir em Android): setores de 64 m com prioridade visual, mais o
horizonte barato (impostores) já existente nas serras. Pré-carregamento na rota da história e orçamento de GLB por
setor.

## 4. O que esta PR não faz (para não ser remendo)

- Não reconstrói a estrada/encosta de (53, 60) nem o enquadramento da ponte. Isso entra na Fase 2, com composição
  manual e aprovação.
- Não muda modelos, NPCs, combate, dimensões, missões, saves nem `build-info.js`.
- Não declara FPS de Android. A medição real em aparelho continua pendente.
