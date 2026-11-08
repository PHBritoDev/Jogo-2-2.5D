# Mod 292 — Eldória reconstruída: entrada pela ponte, cidade orgânica, mata tropical autoral

Missão: `CLAUDE_MISSAO_ELDORIA_TEMP_2026-11-08.md` (apagado no fim). Branch `ccr-8ab771c0-yqmwv4`.
As capturas estão em [`docs/evidencias/mod292/`](../evidencias/mod292/). Todas foram tiradas no **jogo principal**
(`mundo-3d-prototype.html?debug3d=1`) com Chromium + SwiftShader (renderização por CPU). Cada captura registra a
posição da câmera lida do próprio jogo, o tamanho do canvas e um hash do quadro, em `capturas-desk.json` e
`capturas-land.json`. Assim dá para conferir que cada foto tem câmera diferente. É o contrário do que aconteceu
no QA #424, em que todas as fotos saíram iguais.

> **Limite honesto.** O SwiftShader não é uma GPU de celular. Os números de quadro abaixo servem só para comparar
> uma versão com a outra, e o FPS no Samsung A55 **não foi medido**. Triângulos e chamadas de desenho valem como
> medida relativa.

## 1. Geografia: o rio passa ao sul e a ponte vira a entrada obrigatória
- O rio (`RIVER_POINTS`) desce do contraforte leste e corre **ao sul da cidade** até a garganta oeste. Quem vem
  da floresta, ao sul, tem de atravessá-lo. A ponte de pedra do criador (`Ponte.glb`) fica no eixo da rua principal,
  perpendicular ao rio (a tolerância testada é de ±15°).
- A carroça de Teren agora para no largo **antes** da ponte (`ELDORIA_DROP` = 0,2; −1,2), e o jogador entra a pé.
  A dica de status virou "Atravesse a ponte até Eldória…". O fluxo completo da estrada foi testado: encontro →
  lona → viagem → emboscada → escolha → amanhecer → chegada, terminando na etapa 3 sem erro de página.
- A rua principal cruza o rio **uma única vez**, pela ponte. Nenhuma outra rua da cidade cruza o rio. A trilha não
  é desenhada no leito do rio.
- A trilha do Distrito (Ato II) contorna a Loja pelo norte. Antes, ela atravessava a caixa de colisão da Loja.
- O Abrigo da Mata Funda (ponto de viagem rápida) foi para a orla da mata, porque a passarela passa por cima do
  ponto antigo. A rua da entrada contorna o Abrigo da Vila.

## 2. Plano urbano em dados estruturados (`eldoria-city-layout.js`)
A direção da porta de cada GLB foi medida nas vistas dos modelos do criador. A `CasaEldoria01` tem a porta no
oitão −X, com degrau. A `CasaEldoria02` tem a porta com escada em +Z. O `FerreiroEldoria` tem a forja aberta em −X.
A rotação de cada casa é **calculada** a partir do ponto da rua para onde a porta deve olhar. Cada casa também
ganha um caminho curto da soleira até a rua (relevo + malha de trilha).

| id | bairro | função | modelo | posição (mundo) | porta → ponto da rua |
|---|---|---|---|---|---|
| A1 | Entrada | Casa do guarda da ponte | CasaEldoria02.glb | (−7,7; −24,5) | L → (−0,6; −24,0) |
| A2 | Entrada | Casa da tecelã | CasaEldoria01.glb | (7,8; −28,0) | O → (0,2; −28,0) |
| A4 | Entrada | Casa do padeiro (forno apagado) | CasaEldoria01.glb | (−13,2; −31,5) | NE → (−7,2; −34,5) |
| B1 | Praça | Casa da família de Lia | CasaEldoria02.glb | (−24,2; −56,5) | SE → praça |
| B2 | Praça | Casa do conselho (sem dinheiro, mas inteira) | CasaEldoria01.glb | (−6,2; −53,5) | SO → praça |
| B3 | Praça | Casa da curandeira | CasaEldoria02.glb | (−27,7; −33,5) | NE → praça |
| C1 | Norte | Casa do lenhador | CasaEldoria02.glb | (−25,0; −63,0) | SE → rua norte |
| D2 | Leste | Casa do apicultor | CasaEldoria01.glb | (15,8; −30,5) | N → rua do altar |
| W1 | Oeste | Casa do sapateiro | CasaEldoria01.glb | (−35,0; −30,0) | NE → rua oeste |
| W2 | Oeste | Casa do pastor de cabras | CasaEldoria02.glb | (−33,6; −57,5) | S → trilha do Distrito |
| F1 | Entrada | Ferraria (forja aberta para a rua) | FerreiroEldoria.glb | (8,8; −34,5) | O → rua principal |
| — | Leste | Casa da árvore (vigia da mata) | CasaEldoria02.glb (4,6 m) | plataforma a 6 m | O → chegada da escada |

O teste `eldoria-mod292.test.mjs` garante que nenhuma casa fica sobre rua, rio, raiz de árvore ancestral ou outra
casa. Garante também que cada porta aponta para uma rua ou para a praça e que o caminho da soleira até a rua não
atravessa outra casa. NPCs, bancas, poço, fonte seca, Loja e pontos de missão continuam nas mesmas coordenadas.

**Árvores do núcleo.** Saíram as duas ancestrais extras e a `ArvoreFloresta01` que ficavam dentro da cidade.
Ficaram duas:
- a **colossal** (`ArvoreAncestralEldoria`, 34 m), ao fundo da praça e no eixo de quem sai da ponte;
- a **lateral** (28 m), a leste, com a casa da árvore.

O afundamento da base foi **medido no GLB**. O fundo das raízes fica a 1–2 % da altura acima do ponto mais baixo,
e o colo do tronco a 3–4 %. Afundar 2,5 % da altura enterra os arcos das raízes sem cobrir tronco nem acessos.

## 3. Estruturas caminháveis com suporte físico (`eldoria-walkable.js`, `eldoria-city-dressing.js`)
- **Anel de deque** em volta dos dois troncos, a 6 m. O raio interno é 0,165 × a altura da árvore (o tronco medido
  no GLB tem r90 = 0,11–0,14 × altura entre 5 e 9 m). Escoras vão do tronco à borda, e o guarda-corpo tem aberturas
  calculadas onde a passarela e a plataforma cruzam o anel.
- **Plataforma da casa da árvore**, de 7 × 7 m, com pilares até o chão, vigas e guarda-corpo. A casa do criador
  fica em cima, com paredes de colisão, e a porta está voltada para a chegada da escada.
- **Escada em U**: dois lances com patamar. O primeiro degrau nasce no chão do pé da escada, e a rua leste leva até
  esse pé.
- **Passarela suspensa** do criador (`PassarelaSuspensaEldoria.glb`) entre os dois anéis, passando por cima da rua
  principal. O pilar central fica a mais de 4,2 m da rua.
- **Física.** O terreno não muda, e a camada nova vale só para o jogador:
  - Apoio: a superfície mais alta até um degrau (0,55 m) acima dos pés. Quem anda por baixo do deque continua no
    chão.
  - Guarda-corpos e paredes: bloqueiam só na faixa de altura em que existem.
  - Lateral da escada: é sólida enquanto a altura livre for menor que a de uma pessoa.
  - Pilares: bloqueiam só abaixo do piso que sustentam.
  - Borda: quem sai pela borda cai, em vez de ser teletransportado.
  - Dash: o ponto do meio do movimento também é testado.
- **Testado no jogo** (`walkqa`, caminhada guiada no tempo de jogo): subir os dois lances (0 → 3,2 → 6,41 m) →
  plataforma → anel → contorno do tronco → passarela → anel da colossal → pulo, que volta ao deque → empurrar o
  guarda-corpo (fica) → com o guarda-corpo desligado só para o teste, sair pela borda (cai até o chão) → andar por
  baixo da plataforma (fica no chão) → lateral baixa da escada (bloqueia) → descer os dois lances. As fotos estão
  em `caminhada-*.jpg`. Em teste de unidade também: subir, parar, descer, pular, cair e passar por baixo.

## 4. Mata tropical densa em volta da cidade (`eldoria-tropical-trees.js`)
Cinturão a oeste, a leste, ao norte e ao sul do rio. O corredor de chegada (trilha inicial → ponte) fica livre.
- O posicionamento é um Poisson por espécie, com espaçamento por estrato: as emergentes são raras e afastadas, e
  palmeiras e embaúbas crescem sob as copas.
- Manchas de ruído definem a composição, então não há muro uniforme.
- As árvores ficam longe de ruas, casas, raízes, rio, ponte, abrigos e pontos de missão.
- Sub-bosque e cipós vêm dos módulos do Mod 291. O chão fica mais escuro sob as copas (serapilheira).
- Há colisão só nos troncos (a copa nunca vira parede) e pontilhado quando a câmera encosta numa copa.
- O corte por **frustum**, com esfera por instância, substituiu o meio-plano horizontal. O meio-plano apagava a mata
  nas vistas aéreas e quando o jogador olhava para baixo.
- No total são 186 árvores no perfil baixo. Por espécie: sumaúma 12, copa-larga 54, figueira 45, palmeira 35 e
  embaúba 40.

## 5. Árvores 3D autorais (`EldoriaArvoresTropicais.glb`, 1,08 MB)
Foram geradas por script, com geometria e texturas próprias (`tools/eldoria/trees/`):
- texturas pintadas por código: tufos de folhas em camadas, folha de palmeira, folhas palmadas e 4 cascas;
- troncos em tubo com transporte paralelo de referencial;
- **sapopemas** por modulação radial;
- raízes aéreas e cipós em catenária;
- copas em tufos de cartões com **normais de volume** (elipsoide da copa + volume do tufo) e núcleo opaco por tufo.

| espécie | LOD0 | LOD1 | LOD2 (impostor) |
|---|---|---|---|
| Sumaúma (emergente, ~30 m) | 6.144 tri | 1.022 | 10 |
| Copa-larga (referência dos adesivos) | 3.199 | 557 | 10 |
| Figueira mata-pau | 5.494 | 896 | 10 |
| Palmeira | 758 | 280 | 10 |
| Embaúba | 776 | 295 | 10 |

Materiais e LODs:
- São só **3 materiais**, compartilhados por todas as espécies: Casca (cascas.jpg, 512×1024), Folhas (folhas.png
  PNG-8 1024², com alfa por corte) e Impostor (atlas 1024² PNG-8 + mapa de normais JPEG).
- Para cada espécie, um InstancedMesh por nível e material: no máximo 25 chamadas de desenho para toda a mata.
- O **LOD1** usa o mesmo esqueleto e os mesmos tufos, só com menos cartões, então preserva a silhueta.
- O **LOD2** é assado do próprio LOD0, em 3 vistas, com albedo **e mapa de normais**. Assim ilumina certo no ciclo
  dia/noite. Os planos somem com pontilhado quando ficam de perfil.
- Comparações: `arvores-lod0-lod1-lod2-*.jpg` e `perto-longe-*.jpg`.
- As faixas de LOD são exclusivas por perfil gráfico (baixo, automático e alto) e seguem o perfil do jogo, com
  escala pela altura da espécie.

**Proveniência.** Nada foi baixado de terceiros.
- Os ZIPs `Arvore1/2/3` enviados contêm só **EPS e JPG** (ilustrações vetoriais 2D). Foram usados **apenas como
  referência visual** e não foram importados nem versionados.
- O `Arvore.glb` que já estava no repositório foi avaliado (`arvore-glb-recebido-avaliado.jpg`): são 309 malhas sem
  material, só cor de vértice, e o tronco flutua acima das raízes. Ele **não** é usado.

## 6. Cores erradas ao longe: causa concreta e correção
**Medição.** Os `<Nome>-lod1.glb` do Mod 291 eram gerados com solda de vértices só por posição antes de
simplificar. O atlas assado dos modelos do criador tem costura de UV em quase todo vértice. Por isso **68–97 % dos
triângulos do LOD1** ligavam ilhas diferentes do atlas (|ΔUV|/|Δposição| > 6× a mediana do LOD0). Ao longe, a casa
virava uma mancha cáqui/cinza: veja `lod1-antigo-uv-borrada-casa01.jpg` e `casas-ao-longe-antes.jpg`.

O que **não** era a causa principal:
- a troca de material por índice ou nome (o PR #423 já tinha protegido isso);
- o espaço de cor (o GLTFLoader marca o baseColor como sRGB e as texturas pintadas também são sRGB).

**Correção.**
1. `tools/eldoria/bake-house-lod.mjs`: o LOD1 agora é uma malha simplificada (~16 %) com **UV nova por projeção
   ortográfica** em 5 vistas e **textura própria assada do modelo completo**. O material é próprio, sem nenhuma
   reassociação com o LOD0. Os resultados: casa de 30 mil → 4,8 mil triângulos com as mesmas cores
   (`lod1-reassado-*.jpg`, `casas-ao-longe-depois.jpg`). Isso vale para casas, ferraria, poço, barracas e rochedos.
2. Árvore ancestral e `ArvoreFloresta01`: simplificar preservando as costuras só tira 6–12 %. Por isso ficam no LOD0,
   e o LOD1 borrado foi apagado.
3. `build-lod-glbs.mjs`: não solda mais vértices e só grava um LOD com < 2 % de UV esticada e ≥ 35 % de economia.
   O `uvCompatible` em tempo de execução prova a compatibilidade por vértice **e** por triângulo.
4. `eldoria-baked-texture.js`: limita o nível de mip das texturas assadas, para não fazer média de ilhas na
   distância extrema.

## 7. Desempenho
Medido no SwiftShader, celular em paisagem, perfil baixo. Não é FPS de Android.

| ponto | main 7feb88a (chamadas / tri) | Mod 292 (chamadas / tri) |
|---|---|---|
| chegada pela floresta | 283 / 720 mil | 311 / 580 mil |
| praça | 211 / 480 mil | 210 / 410 mil |
| vista aérea | 316 / 687 mil | 344 / 516 mil |
| leste (casa da árvore) | 104 / 328 mil | 136 / 369 mil |

- A mata nova soma de 28 a 32 chamadas e mesmo assim **reduz** os triângulos, graças aos LOD1 re-assados.
- Download de GLB no carregamento completo: 59,8 MB → 55,7 MB. A `ArvoreFloresta01` deixou de ser baixada duas
  vezes e os LOD1 borrados saíram. As árvores autorais somam 1,1 MB.
- Sombras e luzes continuam iguais. Nada visual foi desligado para "ganhar FPS".

## 8. Testes
- `node --test *.test.mjs tests/*.test.mjs`: 446 passam e 2 falham. As 2 falhas (Mod 262 e Mod 278) já falhavam
  na `main`.
- O `eldoria-forest-lod-overlap.test.mjs` também já falhava na `main` depois do PR #421. Ele agora entende os
  limiares em variáveis, e a continuidade das faixas segue garantida.
- Testes novos em `eldoria-mod292.test.mjs`: geografia e ponte, casas e portas, núcleo sem árvores pequenas, física
  caminhável, estruturas, GLB das árvores e planejador da mata.
- QA no jogo: caminhada nas estruturas, fluxo completo da estrada até a chegada, capturas perto e longe, capturas
  finais em desktop e celular em paisagem, e prova de material por objeto (`materialAudit()`).

## 9. Pendências reais
- **FPS no Samsung A55**: precisa ser medido no aparelho, nos perfis baixo, automático e alto.
- `Carroça.glb`: o LOD1 re-assado não foi gerado. O bake falhou com o "ç" no nome, e a carroça aparece só uma vez.
- A árvore ancestral fica no LOD0, porque o atlas impede simplificar sem re-assar. São só 2 instâncias.

## Referências técnicas
- Three.js — Color management: https://threejs.org/manual/#en/color-management · GLTFLoader:
  https://threejs.org/docs/#examples/en/loaders/GLTFLoader · Texture: https://threejs.org/docs/#api/en/textures/Texture
  · InstancedMesh: https://threejs.org/docs/#api/en/objects/InstancedMesh
- meshoptimizer (o simplificador preserva costuras de atributo quando os vértices não são soldados):
  https://github.com/zeux/meshoptimizer
- Impostores com normal map (mesma ideia, em versão simples de 3 vistas): https://shaderbits.com/blog/octahedral-impostors
- BVH/raycast (referência do brief; aqui bastou a camada analítica de superfícies): https://github.com/gkjohnson/three-mesh-bvh
