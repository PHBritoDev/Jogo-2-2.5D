# Marco 10 — Poderes de todos (refeitos do zero)

**Fonte:** o prompt do autor (seção "Combate") e o documento mestre (seção "Poderes").
- **Pedido:** tirar os poderes antigos e criar do zero. Cada personagem tem **Habilidade 1, 2 e 3, golpe de espada e ultimate**.
- **Grimório:** aparece quando um Bispo invoca; no herói, é a Bíblia.
- **Ultimates:** a da Ganância é "I Am Atomic"; a do Bispo 4 é o Black Hole.
- **Referências de anime:** Nanatsu no Taizai, Fate, Fire Force, Demon Slayer, Re:Zero, Bleach, Tensei Slime, Black Clover e SAO.

Regras e números em [`powers3d.js`](../../powers3d.js) e testes em `powers3d.test.mjs`. Os efeitos estão no MOD 212 de `mundo-3d-prototype.js`.

## Inimigos

Toda família tem **Habilidade 1, 2 e 3, golpe de espada e ultimate**.

| Família (perfis) | Hab. 1 | Hab. 2 | Hab. 3 | Espada | Ultimate |
|---|---|---|---|---|---|
| Seguidor — Enemy1 (captor, warden, evo1, elite1) | Orbes do Culto | Mãos do Abismo (prendem) | Selos Profanos | Lâmina Ritual (investida) | Ritual do Último Sacrifício |
| Demônio — Enemy2 (demon2, miniboss2, evo2, elite2) | Hálito Infernal (leque) | Erupções | Bolas de Fogo | Corte Flamejante | Furacão Infernal (dois furacões de fogo) |
| Carrasco — Enemy3 (demon3, miniboss4, zealot, evo3, elite3) | Investida | Tremor (onda de choque) | Corrente da Forca (linha) | Corte Negro ×2 | Execução (salto + onda + cortes) |
| Guardião — Enemy4 (demon4, leader4, miniboss3, hollow, elite4) | Lança Sombria | Chuva de Lanças | Pulso do Bastião | Varrida | Bastião das Sombras (rajadas de orbes) |
| Bispo 1 — VALÉRIO | Mãos do Contrato | Orbes das Almas | Moedas das Almas (chuva) | Espadas Sombrias ×3 | Contrato Final: o Ceifador (foice gigante + mãos) |
| Bispo 2 — VORGAZHEK | Correntes da Dívida | Lâminas de Metal Líquido ×5 | Explosões da Forja | Golpe da Forja | Fornalha da Dívida (ouro derretido + sol de ouro) |
| Bispo 3 — ZAR'KHAEL | Selos do Juízo | Gelo Distorcido (3 linhas) | Sentença Espectral | Lua de Gelo | Sentença Invertida (selos, raios e controles invertidos) |
| Bispo 4 — VÉRAXION | Fogo Abissal | Furacão Negro | Orbes do Abismo | Corte do Abismo | **Buraco Negro** |
| Ganância 1 | Portões do Tesouro (chuva de ouro) | Orbes de Ouro | Correntes da Cobiça | Corte Dourado | Portões da Avareza (4 chuvas seguidas) |
| Ganância 2 | Furacão de Moedas | Gêiseres de Ouro | Raio da Ganância | Leque Voraz | Mãos da Avareza (mãos gigantes esmagam) |
| Ganância 3 | Orbes do Vazio | Chuva de Espadas Negras | A Fome da Ganância (núcleo de vazio) | Corte Triplo | **Supernova da Ganância** ("I Am Atomic") |

**Regras gerais:**
- **Aviso:** todo poder tem aviso no chão (círculo, faixa, leque ou anel) e uma saída: correr, pular a onda ou usar o dash.
- **Por nível:**
  - Comuns: dano × 0,55, recarga mais lenta, ultimate uma vez (30% de vida).
  - Elites e mini chefes: dano × 0,7, ultimate uma vez (50%).
  - Chefes: dano × 0,8, ultimate duas vezes (60% e 25%).
- **Ritmo:** a espada sai de perto (até 4,5 m) e as habilidades de 3 a 16 m, em rodízio.
- **Grimório:** Bispos e Ganância abrem o grimório ao invocar (livro escuro com runas da cor do personagem).
- **Animação:** quem invoca toca a animação de magia; o golpe de espada usa a animação de ataque.
- **Aura de batalha:** chefes e elites ganham aura em fúria, abaixo de 50% de vida (anel de runas, chamas em camadas e faíscas, estilo Sol's RNG).
- **Câmera:** as ultimates afastam a câmera e escurecem a tela, com câmera lenta curta no início. O controle nunca é tirado.

## Herói (Bíblia aberta em toda invocação)

| Documento mestre | No jogo |
|---|---|
| (1) Corte de luz / corte negro | Golpe de espada: 3º golpe do combo (Marco 9). |
| (2) Três espadas orbitais teleguiadas | **Hab. 1 — Espadas da Palavra:** três espadas (cinco na versão II) orbitam o herói e caçam o alvo. |
| (3) Chuva de espadas celestiais com área | **Hab. 2 — Julgamento Celestial:** área marcada e portal no céu, de onde dezenas de espadas desabam (versão II maior). |
| (4) Sol condensado com queimadura | **Hab. 3 — Sol da Justiça:** sol maior com coroa de luz (inspirado no Escanor), mais três pulsos de queimadura. |
| (5) Grande espada por círculo mágico | Espada do Círculo (aprimoramento da Hab. 3, Marco 9). |
| Ultimate | **Julgamento Divino:** a Bíblia abre e um círculo mágico gira no céu. Nuvens e raios se juntam e a espada celestial desce. |

## Limites (honesto)

- **Animações:** as dos modelos ficam as mesmas; cada poder escolhe entre "magia" e "ataque". Novas animações por personagem ficam para outro marco.
- **Celular:** a chuva usa uma única malha instanciada e cai para 60% das peças em telas de baixa resolução.
- **Evidência:**
  - **CONFIRMADO POR CÓDIGO:** `node --test` (inclui `powers3d.test.mjs` e `ultimates3d.test.mjs`).
  - **TESTADO EM NAVEGADOR:** os cinco poderes de Valério, VORGAZHEK, ZAR'KHAEL, VÉRAXION e Ganância 1 forçados um a um, sem erros de página. Os quatro poderes do herói causaram dano (42, 26, 38 e 65). Os Atos III a VI correram com os kits automáticos.
  - **Android: NÃO TESTADO.**
  - **SUSPEITA:** o equilíbrio de dano precisa de teste real de jogo (no navegador sem GPU o jogo roda a ~8 FPS).
