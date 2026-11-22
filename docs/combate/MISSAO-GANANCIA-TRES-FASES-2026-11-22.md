# Ganância em três fases — Mod 342 (22/11/2026)

## O que mudou
- **Fase I** — `NewGanancia1.glb` (rig `greed1n`, kind `greedA`): olhos em vórtice presos ao osso da cabeça, aura discreta (rim no shader), gotas de sangue da boca que caem com gravidade até o chão (respingo), sorriso natural (sem forçar a mandíbula). Armas A+B (foices) ou C+D (lança + picareta), troca de pares com efeito.
- **Morte da I → II** — cena curta (queda + foco) e `greedB` nasce no mesmo lugar com nova barra de vida.
- **Fase II** — `NewGanancia2.glb` (rig `greed2n`): asas animadas por osso SEMPRE (bater/pairar/frear/mergulho/dobrar), penas soltas em pool; IA mais agressiva; voo real (decolagem → cruzeiro → mergulho → pouso), pendurar de cabeça para baixo **só** com teto real (raycast na arena; sem teto ou teto < 7,5 m → aborta para mergulho), pés ancorados no teto; 4 mini-sóis nascem um por vez, cada um com trajetória e impacto próprios (direto ou área), explosões solares.
- **Morte da II → ressurreição** — câmera foca, corpo sobe devagar (clip Arise), explosão vermelho/violeta de vidro fraturado centrada no chefe, então **Fase III** (mesmo GLB): chifres ×2 pelos ossos dos chifres, asas ×1,35, par inferior `GananciaAsas2.glb` preso à coluna e animado por cadeia de ossos, garras nos dedos, 4 armas em órbita telecinética (enviadas 1–4 por vez, orçamento de ameaça), boca do abismo dispara a esfera vermelha com rachaduras roxo-negras: 1ª entre 32–38 s (carga 3,3 s), depois 25 → 20 s de disparo a disparo conforme a vida cai. Âncora via hook `greedAbyssAnchor` (o `greed-abyss3d.js` do Codex não foi editado).
- **Vitória** só depois da fase III (`holdDeath` segura I e II).

## Armas (greed-weapons3d.js) — uma instância de cada
| | arma | rastro/VFX |
|---|---|---|
| A | Foice cósmica (campo estelar + anel de buraco negro) | `greedCosmic` |
| B | Foice de sangue com crânio | `greedBlood` |
| C | Lança solar | `greedSolar` |
| D | Espada-picareta híbrida | `greedHybrid` |

- Foice arremessada (lateral/oblíqua) vira duelista autônoma por **10 s** com combos próprios, mantém distância, não atravessa parede, escudo bloqueia, choque lâmina×lâmina repele; depois cai com física e some.
- Lança: reta com homing limitado (1,7 rad/s), **5 s**, não sofre choque, atravessa o escudo (quebra) e causa dano válido; rente ao chão nivela em vez de cravar.

## Multi-hit
Cada janela de golpe tem `attackToken` próprio (golpes do chefe, da arma autônoma e da lança são fontes independentes — `gkSrc`). Contato varrido quadro anterior→atual no cabo **e no gume** (eixo X do modelo). I-frames legítimos (dash, esquiva perfeita) continuam protegendo.

## Removido
Poderes genéricos da Ganância: kits `greed1/2/3` (chuva, orbes, correntes, furacão de moedas, gêiseres, raio, buraco negro), ultimates (portões, mãos, supernova) e `BOSS_POWERS.greed1-3`. As formas legadas `greed1/2/3` do final (`finale-flow.js`) mantêm só o corpo a corpo.

## Testes
`tests/ganancia-tres-fases.test.mjs` (no CI `combat315.yml`): assets, versão, integração, remoção dos genéricos, fluxo I→II→III, foices 10 s + multi-hit + escudo + choque, lança 5 s + escudo, 4 sóis independentes, voo/teto, abismo 30–40 s e 20–25 s. Suíte completa: mesmas falhas pré-existentes da `main` (luzes/shader/energyBody/Bispo 4/Mod 256/262/278), nenhuma nova.

## Evidências
`docs/combate/evidencias/ganancia-tres-fases/` — quadros do jogo, folhas comparativas com as referências e vídeo comparativo.

## Limitações reais
- QA visual em SwiftShader (CPU), sem GPU/Android real: não há medição de FPS em aparelho.
- O par inferior de asas é um GLB separado preso à coluna; em poses extremas pode haver leve interpenetração com a capa.
- Similaridade com as referências avaliada a olho, sem métrica numérica.
