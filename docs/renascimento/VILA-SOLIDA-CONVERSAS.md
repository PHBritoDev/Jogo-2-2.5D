# Vila da Clareira — matéria sólida, moradores corrigidos e conversas jogáveis (Mod 319+)

Missão de 15/11/2026, a partir de uma captura do criador no Mod 319: uma bola escura sobre a cabeça de uma NPC, o herói
atravessando barracas e uma respiração estranha nos moradores. Este documento é permanente; o briefing temporário saiu
na mesma PR.

## 1. O "volume escuro sobre a cabeça" — diagnóstico com evidência
- Close-ups de frente, de lado e de trás dos 6 moradores (`SevenSinsDebug3D.villagers()` + `villagerCam()`).
- O único volume anômalo era o saco do **carregador**: uma `SphereGeometry(.2)` escalada para cerca de 50 × 32 × 36 cm.
  - Ficava a 1,5 m de altura, no centro do corpo, preso ao `holder` e não a um osso: exatamente na altura da cabeça (osso `Head` a 1,55 m).
  - À noite ele vira uma esfera escura sobre a cabeça.
- Cabelos e barbas estavam corretos: pior distância cabelo × crânio entre 0,022 e 0,03 m nos close-ups.
- `ELDORIA_HAIR_FITS` e a correção da #553 ficam intactos: a busca completa de encaixe não volta a rodar no jogo.
- **Correção (`porterSack`):**
  - Saco deitado no ombro esquerdo, com fundo achatado e boca franzida.
  - Preso ao osso `LeftShoulder` com `attach`, então acompanha passo e braço.
  - `userData.headGap` registra a distância até a cabeça.
  - Rig sem ombro: o saco vai ao lado, nunca sobre a cabeça.
- Evidência: `evidencias/vila-solida-conversas/carregador-saco-antes-depois.jpg` e `moradores-closeups-depois.jpg`.

## 2. Barracas e o resto da vila sem matéria
**Antes:**
- Cada GLB tinha um único círculo de colisão. A barraca tinha raio de 1,22 m no centro de uma peça de cerca de 3,5 m.
- Cercas vivas, banco, mesas e adereços da praça não tinham colisão nenhuma.

**Auditoria `villageSolidAudit()`** (raios verticais em grade de 0,35 m e matéria entre 0,3 e 1,7 m do chão):
- **64,9 m²** de matéria atravessável em 53 regiões: pontas das barracas, sebes, bordas das casas, banco, mesa da praça…
- Depois da correção: **1,2 m²** em 3 restos pequenos (estrutura da casa na árvore, quina de casa, adereço).

**Correção (`eldoria-village-solids.js`):**
- Máscara **medida no jogo real** em grade de 0,25 m:
  - célula sólida quando há malha na altura do corpo que não é piso caminhável (adro, deques e escadas continuam pisáveis);
  - flores e gotas da fonte ficam de fora por desenho;
  - NPCs não entram (têm colisão própria);
  - ruído menor que 3 células é descartado e a máscara é dilatada 1 célula (raio do corpo).
- São 3,3 KB em RLE, consulta O(1) dentro de `blockedAt`. Vale para andar, dash e pulo; com `?solidos=0` volta ao estado anterior para comparação.
- **Regerar** depois de mudar a vila: `node tools/visual-lab/village-solid-mask.cjs`. O teste `tests/vila-solida.test.mjs` falha se o layout mudar sem regerar (assinatura).

**Alcance (`villageReach()`):**
- Nenhum ponto-chave ficou lacrado (20 de 20 alcançáveis): frente das 3 barracas, ponto de fala de cada vendedor, NPCs, rota do carregador, fonte, poço e centro.
- Área andável: −3,8 %, que é a própria matéria das peças.

**Teste jogável real** (`motionStep` determinístico, andar, dash e pulo contra 3 lados e a ponta de cada barraca, a sebe, o banco e a mesa):

| caso | sem máscara | com máscara |
|---|---|---|
| frente das barracas | parava a 1,22 m do centro (dentro da peça) | para a 1,6–1,75 m (no balcão) |
| ponta das barracas | 1,22 m | 1,26–1,98 m |
| banco | 0,07 m do centro (atravessava) | 0,48 m |
| mesa da praça | 0,31 m | 1,0 m |

Arquivos: `colisao-andar-dash-pulo-antes.txt`, `colisao-andar-dash-pulo-depois.txt` e `auditoria-furos-antes.json`.

## 3. Respiração e animações
**Medido no jogo** (posição dos ossos em relação ao corpo, 60 amostras em 15 s): o idle dos GLBs Meshy balança o corpo inteiro.

| osso | antes | depois |
|---|---|---|
| cabeça | 17,7 cm de lado a lado | 5,4 cm |
| quadril | 7,4 cm | 2,2 cm |

**Correção** (`eldoria-npc-life.js`):
- O idle toca com peso 0,3 sobre uma âncora: o mesmo clipe parado no quadro 0, em pose neutra.
- Os pesos sempre somam 1, então o NPC nunca mistura com a pose de ligação (T-pose).
- Respiração procedural discreta no peito: cerca de 14 por minuto, ±0,6°, só parado.
- A inclinação de descanso caiu de 0,32 para 0,2.
- Caminhar, inspecionar e alertar seguem com o clipe completo.

## 4. IA ambiental e conversa real (sem LLM nem rede)
- **Atenção:** o NPC olha o herói quando ele está perto e à frente (nunca gira o pescoço para trás). Depois de 5,5–9 s desvia o olhar por 3,5 s e volta; conversando, a atenção é total.
- **Ações:**
  - vendedores alternam trabalho (inspecionar), conferir estoque (vira para a caixa ao lado), descanso, vigiar a estrada e olhar em volta;
  - a moradora nota o herói sem parar, dá passagem e para na fonte;
  - o perigo de combate continua fazendo todos se encolherem.
- **Conversar** (`eldoria-village-talk.js`):
  - Botão **CONVERSAR · NOME** (tecla Enter/E, ou toque) para Bento, Téo, Lia, o morador da praça, a moradora com balde e o carregador.
  - Cada um tem abertura e 2–3 tópicos com fala própria por fase do Ato I (chegada, floresta, portal, depois) e por hora (noite).
  - Respostas em botões (1–4 no teclado); depois de um tópico o menu volta, e "Até mais." encerra.
  - **Memória leve** (`localStorage` `seven-sins-3d-village-talk`, sempre em try/catch):
    - não se apresenta duas vezes;
    - tópico repetido avança a fala;
    - reconhece a volta de uma etapa da missão;
    - Téo fica desconfiado se o herói insiste em rumores antes da cena.
  - A pista canônica de cada vendedor virou o tópico "Algum conselho?".
  - **Gestos reais:** Wave na primeira conversa, inspecionar e Alert conforme o tópico. O NPC vira de frente para o herói.
  - **Câmera:** por cima do ombro, suave, só em 3ª pessoa.
  - **Canonicidade:**
    - PERGUNTAR · TÉO, o saco de ouro e a vendorScene continuam com prioridade (act1Interact antes da conversa);
    - as missões laterais (trySideQuestTalk) também;
    - conversar não mexe em moedas, missão nem save (teste);
    - só Téo menciona VHAZRAEL, e só depois da queda dele (teste).
  - **Sem expressões faciais:** os GLBs não têm morph targets nem ossos faciais, então a atuação é corporal.
- **Mobile:** 6 NPCs, `update` barato por quadro, os longe são pulados (`mixer.__far`), sem pathfinding nem rede.
  - O perfil de CPU do carregamento da vila (`prof.mjs`) não mostra custo relevante deste código: abaixo de 50 ms, contra cerca de 1,2–2,7 s de upload de texturas, que já existia.

**Evidências:**
- `conversas-desktop.jpg`: Lia, Téo, moradora, carregador e morador.
- `conversa-celular-opcoes.jpg` e `conversa-celular-resposta.jpg`: Chromium com toque, 915 × 412; as 4 respostas a 58 px de altura, tocáveis.
- `conversas-video.mp4`: percurso completo de conversas.
- `conversas-registro.json`: rótulos, falas, estados dos NPCs e memória gravada.

SwiftShader não mede FPS de celular. Os números de FPS das capturas (2–5) são do renderizador por CPU.
