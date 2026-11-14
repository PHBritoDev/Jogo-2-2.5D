# Renascimento de Eldória — Fase 2: som do rio

Pequena mudança isolada de áudio, como pede o documento mestre (item **Áudio**). Usa o motor procedural existente
(`audio3d.js`), sem amostras externas nem licenças novas. Branch `claude/eldoria-renascimento-fase2-som`, empilhada
sobre #513 → #512 → #511 → #510. **Sem merge sem aceite.**

## O que muda

- **Correnteza:** ruído filtrado grave, de 560 a 720 Hz, cada vez mais forte perto da linha d'água. Some depois de
  ~24 m e oscila devagar.
- **Marulho no Vau das Pedras:** banda clara em torno de 1,9 kHz, só perto do vau. Some a 12 m dele e não toca na
  ponte.
- **Distância medida pela mesma consulta das margens** (`riverQuery.nearest`). Fora da caixa do rio (±12 m), a
  consulta sai na hora.
- **Integração:** uma linha no `worldAudio.update` (`...riverAudioAt(x,z)`) e duas camadas novas no motor.

## Verificação

| Teste | Resultado |
|---|---|
| `tests/renascimento-f2-som.test.mjs` | 2/2. Cobre: forte na margem; mudo na praça; marulho só no vau, nunca na ponte; integração procedural |
| Suíte completa | Só falham os 2 testes que já falham na `main` (`Mod 262`, `Mod 278`) |
| Runtime | O jogo carrega sem erros com o cálculo por quadro |

O áudio do navegador headless fica bloqueado (sem gesto do usuário). Por isso, **a escuta real** do volume e do timbre
**precisa de um aparelho**, e não declaro nada além dos testes.

## Paisagem sonora por região (registro para as próximas etapas)

| Região | Camada | Estado |
|---|---|---|
| Prado | Vento no capim e pássaros diurnos | Já existe (vento/folhas/pássaros) |
| Vale | Eco suave e folhas nas copas | A fazer (reverb leve por região) |
| Posto do Vigia | Vento de crista | A fazer (ganho do vento pela altitude já existe) |
| Rio | Correnteza e marulho do vau | **Este PR** |
| Cidade | Murmúrio baixo de gente, ferraria (martelo esparso de dia) | A fazer |
| Chuva | Mais forte sob as copas e abafada em interiores | Chuva existe; falta abafar em interiores |
