# Mod 317 — Prólogo jogável, Eldória viva e abrigos

Este documento registra a missão `CLAUDE_MISSAO_TEMP_PROLOGO_ELDORIA_IMERSAO_QA_2026-11-12.md`. As evidências ficam no
PR e no CI (`prologue-mod317-evidence.yml`).

> **Limitação:** as medições são do Chromium com WebGL em SwiftShader (CPU), em paisagem mobile 852×393 e desktop
> 1280×720. Não representam o Samsung A55; nenhuma afirmação de FPS em aparelho foi feita.

## Assets verificados (Gate 1)
| Papel | Arquivo | Verificação |
|---|---|---|
| Anjos laterais da aproximação | `Anjos.glb` | malha estática, 1×0,78×0,19 (asas com olho central, frente +Z) |
| Guardiões nas laterais do trono | `BracoDireitoEsquerdo.glb` | encontrado na raiz (grafia exata); 49 ossos, sem clipe |
| Asas do Anjo-Guia | `Asas.glb` | malhas `AsaEsquerda`/`AsaDireita` |
| Anjo-Guia | `AnjoGuiador-otimizado.glb` | 83 ossos, osso `UpperChest` para as escápulas |
| Teren | `NPC_Masculino_Animado_Otimizado_1K.glb` + `Cabelo-otimizado.glb` | 66 ossos; clipes `Alert` e `Arise`, nenhum sentado |
| Cavalo/arreios/carroça | `Cavalo.glb`, `ArreiosCavalo.glb`, `Carroça.glb` | sockets da carroça medidos por raycast (abaixo) |
| Bandidos | rig `bandit` (`Npc-lod2.glb` + clipes de espada) | 5 instâncias com cores diferentes |

## Céu (Gates 2 e 3)
- Saíram os seis clones do Anjo-Guia que flanqueavam o caminho.
- Entraram dois `Anjos.glb` de 5,6 m flanqueando a aproximação. Pairam, respiram (pulso de escala) e acompanham o herói
  com o olhar.
- Entraram dois `BracoDireitoEsquerdo.glb` de 7,4 m nas laterais do trono, com micromovimento nos 49 ossos.
- Cada anjo tem uma aura branca tênue (um sprite aditivo fraco), sem bloom.
- Deus, a missão dos sete mundos e a retirada das asas e da aura do herói ficaram intactos.
- **Despertar:**
  1. Tela escura.
  2. POV deitado no chão (primeiro quadro do clipe `Arise`, compatível osso a osso com o herói), olhando o céu com
     capim nas bordas e piscadas.
  3. O herói levanta com o clipe real; a câmera sai dos olhos para um 3/4 de frente.
  4. Plano de situação mostrando a garganta da estrada.

  Aethraziel já está de pé ao lado desde o primeiro quadro (o anjo que "surgia" com escala de 0,01 a 1 foi removido).

## Anjo-Guia e asas (Gate 4)
- `Asas.glb` fica presa por `attach()` ao osso `UpperChest`, em escala pela altura real do anjo.
- Bate as asas de leve e solta penas raras (pool de 4, uma a cada 6–11 s).
- Antes de qualquer humano aparecer, o herói pergunta das asas e Aethraziel as recolhe com um gesto curto (dobra e
  brilho que se fecha), dizendo as falas do roteiro ("Diante das pessoas, me chame de Vaelthar").
- O estado fica em `seven-sins-3d-guide-wings`: pular cenas ou recarregar nunca faz as asas reaparecerem fora de hora.
- Na carroça e diante de Teren, o guia fala como Vaelthar.

## Teren, carroça e estrada (Gate 5)
- **Origem real:** `TEREN_ORIGIN` abre uma garganta entre as duas serras ao sul do prado (curva em S, grade fina
  estendida até z = 294).
- A carroça espera além do limite a pé da garganta. Na cena das asas ela é **ouvida** (rodas e madeira, volume pela
  distância) e só então desce até o prado.
- Adiante da curva há um limite narrativo da estrada: Vaelthar chama de volta. Não é uma caixa invisível em objeto
  pequeno.
- **Sockets da carroça**, medidos por raycast no `Carroça.glb` (frente = +z):
  - banco do cocheiro: 1,32 m;
  - assoalho da cabine: 1,16 m;
  - banco traseiro: 1,64 m.
- Teren é o morador masculino Meshy e fica **sentado** conduzindo. A pose sentada procedural (`seated-pose3d.js`)
  aplica coxas, canelas e braços com as rédeas sobre o clipe `Alert` (respiração e olhar). O cabelo segue o osso da
  cabeça e o corpo inclina nas curvas.
- **Embarque sem teleporte:** o herói vai até a porta, sobe o degrau e senta no banco traseiro. Aethraziel (2,8 m)
  senta no assoalho de frente para ele, joelhos dobrados, sob a lona.
- **Câmera interna:** por cima do ombro de um passageiro para o rosto do outro, com tremor discreto da estrada. Nada de
  câmera olhando o vazio durante a conversa.
- Depois da conversa: "3 HORAS DEPOIS" com a tela escura, e o herói acorda **dentro** da carroça com piscadas.
- A viagem só pode ser pulada depois da primeira exibição.

## Cinco bandidos (Gate 6)
- Espécie `bandit` da esquadra simultânea da Mod 237 (`bandit-squad3d.js`):
  - só espada: kit vazio, sem salto predatório, sem escudo de energia, sem contra-selo;
  - golpe duplo, defesa e esquiva física.
- No máximo **dois** golpes perigosos ao mesmo tempo no mesmo alvo (`meleeTokens: 2`); os outros rodeiam a ~2–3 m e
  esperam a vez.
- Rendição não letal, fome e escolha preservadas.
- **Salto:** impulso 7,2 (ápice ~1,18 m), o mesmo valor do PR #468, aplicado uma vez só. O clipe é esticado para o
  tempo real de voo.

## Vila (Gate 7)
- **Vendedores:** a frente da `BarracaFrutasEldoria.glb` é +Z. Os vendedores ficavam do lado do cliente, de costas;
  agora ficam atrás do balcão, de frente para quem chega.
- **Moradores parados:** respiram e acompanham o herói com a cabeça quando ele chega perto.
- **Água rasa:** tem peso (até −28 % de velocidade na altura do joelho), sem virar lesma.
- **Tochas:** continuam só GLB (Mod 316), com a chama no topo da bacia do modelo.

## Abrigos (Gate 8)
- Ficam 3, com função de rota: Vila, Mata Funda e Fronteira (caverna).
- O antigo Abrigo do Sopé ficava a 14 m do da Mata. Saves que o tinham registrado ganham o da Mata
  (`WAYSTONE_ALIASES`), sem perder progresso.
- **Plataforma ritual autoral** (`eldoria-shelter3d.js`):
  - dois anéis de lajes caminháveis (degraus de 0,22 m);
  - quatro pilares sólidos (um partido), com musgo por cor de vértice;
  - marchetaria de bronze patinado e disco gravado por canvas.

  A foto de referência tem marca d'água comercial e serviu só como categoria. Nenhum modelo, textura ou composição dela
  foi usado.
- O registro só acontece no **centro** da plataforma ("REGISTRAR ESTE ABRIGO"). A viagem chega no centro, nunca em
  pilar ou água.
- Checkpoints de história e de chefe continuam separados dos abrigos.

## Narrativa (Gate 9)
Céu → despertar → asas → Teren → carroça → cinco bandidos → chegada a Eldória: tudo jogável e com estado salvo em cada
etapa. Os roteiros posteriores, a mulher misteriosa (Ato do vulcão) e as dimensões dos bispos não foram tocados.
