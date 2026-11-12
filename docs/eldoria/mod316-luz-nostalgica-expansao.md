# Mod 316 — Eldória: luz nostálgica, águas, expansão e correções (Ato I)

Este documento registra a missão `CLAUDE_MISSAO_TEMP_ELDORIA_LUZ_NOSTALGICA_EXPANSAO_2026-11-11.md` e as tarefas
P1–P5 de `CODEX_MISSAO_CORRECOES_ELDORIA_2026-11-11.md`, executadas juntas no PR #470.

> **Limitação de medição:** todos os números vêm do Chromium com WebGL em SwiftShader (CPU), em 852×480. Esse ambiente
> é limitado pela GPU emulada (2–5 FPS) e **não representa o Samsung A55**. Os números servem para comparar antes e
> depois nas mesmas condições: compilações de shader, câmera dentro da rocha, velocidade real e quadros longos. Não
> são uma promessa de FPS no aparelho.

## Inventário e linha de base (fase 0)
- Âncoras fixas: prado (54,160), ponte (0,12), praça (−10,−36), lago (−14,−80), mata (20,−118), gaiolas (62,−58) e
  serra (−40,−232), cada uma às 9, 13, 18 e 22 h. São as mesmas no CI (`tools/visual-lab/eldoria-mod316-evidence.cjs`,
  com 17,5 h no lugar de 18 h).
- Antes: a luz tinha só dois presets lineares (dia ↔ noite), com 9 h, 13 h e 17 h idênticos; o sol era fixo a 30°.
  Havia tochas procedurais (hastes, cones de fogo, braseiros, postes/lanternas por código) e a câmera da caverna
  entrava na rocha.

## Correções (Codex P1–P5)
| Item | Causa encontrada | Correção |
|---|---|---|
| P1 tochas | Haste e chama de primitiva, braseiros cilíndricos, 10 lanternas emissivas por código | `eldoria-torches3d.js`: só `TochaMedievalTripo.glb`, fogo pintado recortado no shader, chama GPU pequena, 1 luz sem sombra pelo orçamento; nada aparece se o GLB falhar |
| P2 câmera caverna | `keepCameraAboveTerrain` usava o terreno externo em `voidMode` (piso 0 contra salão em −6/−7,6) | Piso real da zona; braço de mola com varredura + bissecção (encolhe rápido e volta devagar); posição direta, sem lerp pela corda |
| P3 1ª pessoa | Velocidade real idêntica (medida); a percepção vinha do FOV 72 grande-angular e do lerp horizontal | FOV 60, olhos no osso da cabeça, sem lerp horizontal, balanço de passo sincronizado; removido o ×1,85 da caverna |
| P4 travadas | PointLight nova ficava até 45 quadros visível ao shader, mudando a contagem de luzes e recompilando tudo (2×) | Guarda no `Object3D.add` da cena: a luz vai na hora para a camada oculta; tochas compiladas com `compileAsync` |
| P5 Anjo-Guia | Arquivo real: `AnjoGuiador-otimizado.glb` (83 ossos, PBR, 12 clipes, sem Idle) | Repouso derivado do trecho em pé do `Stand_Up1` (79–94 %) em vaivém; `Anjo-rig.glb` mantido (aliados, Ato III, bandidos) |

## Luz nostálgica (fase 1)
`eldoria-nostalgic-light.js` define 11 chaves de horário: madrugada, aurora, nascer, manhã, meio-dia, tarde, hora
dourada, pôr do sol, crepúsculo e noite.
- Sol quente e baixo no começo e no fim do dia, com sombras longas.
- Preenchimento frio do céu e chão devolvendo luz morna.
- Névoa por hora (bruma da manhã, ar limpo ao meio-dia, poeira dourada à tarde).
- Luar azul legível à noite.

As regiões ajustam a luz com pesos contínuos: a mata tem névoa úmida e próxima e sol filtrado pelas copas, a vila é
mais morna, o lago tem ar claro e frio e a serra tem bruma azul. Só uniforms mudam, então não há recompilação. O sol
anda em passos de 0,25° contra o shimmer da sombra.

## Águas e cachoeira (fase 3 / adendo)
- A água reflete o horizonte e o zênite da hora (sem SSR nem espelho planar) e o brilho especular usa a cor do sol.
- Passos e aterrissagens na água rasa geram anéis de ondulação (pool fixo de 6 por corpo d'água). O rio fica
  translúcido nas margens.
- A cachoeira em degraus está na nascente do rio. A água desce de uma nascente na crista leste (y ≈ 8,6 m), cai num
  degrau de rocha de 1,6 m e escorre até entrar no leito, na direção da correnteza. Usa o shader do rio com água
  branca, névoa ao pé do degrau e no encontro com o rio e som posicional.

## Terreno, floresta e caverna (fases 2–4)
- Serras distantes: três anéis de cristas (ruído *ridged*) com perspectiva atmosférica e cores da hora, em 1 draw call.
  O relevo jogável (colisão, rotas, missões) não mudou.
- Floresta:
  - Trilha das Samambaias (laço pela margem sul do lago).
  - Caminho do Círculo de Pedras (mistério; runas acendem à noite).
  - Subida do Mirante e Borda do Planalto (segundo laço).
  - Clareira do Musgo, Recanto do Remanso (calma) e duas áreas reservadas.
  - Pássaros: bandos de 3 a 7, a cada 35–80 s de dia.
  - Áudio: transição mata ↔ campo aberto.
- Caverna:
  - As ramificações seladas foram abertas.
  - Salão de cristal e água: poça-espelho, feixe do teto e cristais GLB.
  - Passagem estreita do eco.
  - Câmara de ocupação/prisão: jaulas `JaulaRitualAto1.glb`, vigília fria e a única tocha GLB.
  - A escuridão intencional foi preservada.
  - Dimensão, portal e lutas de VHAZRAEL ficaram intocados.

## Medições antes → depois (SwiftShader)
- Quadros com a câmera dentro da rocha (8 pontos × 120 amostras): 3ª pessoa 288 → 4; 1ª pessoa 102 → 0.
- Velocidade real em 3ª, 1ª e 3ª pessoa de novo: 2,2 m/s andando e 6,8 m/s correndo nos três casos.
- Programas de shader compilados depois do carregamento, ao andar e girar por 10 pontos da Eldória: 0. A única
  exceção é a pré-carga assíncrona da caverna, perto da boca.

## Preservado
Arquitetura da cidade, árvores, ponte, rio, GLBs e qualidade da água. A resolução, as texturas, a densidade e a
distância visual não foram reduzidas, e não há quests novas.

## Evidências gravadas
As imagens ficam em `docs/eldoria/mod316-evidencias/`, todas com a câmera assentada da mesma forma antes e depois:
- `antes-depois-09h/13h/18h/22h.jpg`: 7 âncoras fixas, com a `main` na linha de cima e o Mod 316 na de baixo.
- `novidades.jpg`: cachoeira (10 h / 17 h / 21 h), mirante, clareira, recanto, trilha ao amanhecer, 1ª pessoa e as
  câmaras novas da caverna.
- `lago_ondulacao_10h.jpg`: anéis de ondulação ao redor do herói na água rasa.
- `passaros_11h.jpg` e `circulo_pedras_22h.jpg`.
- `caverna-camera-antes-depois.jpg`: linhas alternadas, antes e depois, nos mesmos 8 pontos.

O CI (`eldoria-mod316-evidence.yml`) refaz as capturas, grava vídeos `.webm` da água (lago, ponte/rio, raso e
cachoeira, de dia, no crepúsculo e à noite) e da caverna, e publica `report.json` como artefato.

Giro de câmera e caminhada na mata por 24 s, com perfil de CPU (`stutter.mjs`, SwiftShader limitado pela GPU emulada):

| | p50 | p95 | p99 |
|---|---|---|---|
| `main` | 467 ms | 650 ms | 783 ms |
| Mod 316 | 400 ms | 650 ms | 1383 ms |

Com ~2 FPS esses números não servem para julgar travadas de 0,3 s. Por isso a correção do P4 se apoia na causa medida
(compilações tardias = 0 no mundo e contagem de luzes do shader constante) e não em FPS de SwiftShader. O p99 do Mod
316 inclui a chegada do Anjo-Guia (GLB de 12,6 MB). Depois dessa medição, o shader dele passou a ser compilado e as
texturas enviadas à GPU antes de entrar na cena.
