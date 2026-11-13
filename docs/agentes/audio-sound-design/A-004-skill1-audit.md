# A-004 — Skill 1: três espadas laterais — auditoria de identidade sonora

Data: 2026-11-13. Auditoria estática, **sem escuta ou benchmark**.

## Fontes verificadas
- `audio3d.js` na main: `magic(kind)` usa quatro tons senoidais com razões [1, 1.5, 2, 2.52], variando apenas a raiz conforme `magic`, `magic2`, `magic3`, `ultimate`; `whoosh()` usa um único burst filtrado; `hit()` compartilha grave descendente e burst.
- `docs/MOD-221-SKILL1.md`: o documento registra **cinco** espadas celestiais no estado da Mod 221, com reutilização de `magic`, `whoosh` e `hit`. Diverge da descrição anterior de **três** espadas laterais. Não alterar sem verificar implementação atual e confirmar cânone.
- `tools/visual-lab/README.md`: auditoria WebAudio exige gesto de usuário; estado running não comprova que o som foi realmente ouvido.

## Problema e decisão
A reutilização dos três efeitos genéricos está documentada, mas **não há evidência auditiva suficiente** para afirmar que o som atual é ruim ou que o evento esteja dessincronizado. Os efeitos de múltiplas espadas podem sobrepor vozes. A quantidade real e os tempos de cada espada devem ser confirmados no runtime, inclusive em PRs de Eldória/combate.

Direção artística proposta, **não implementada**:
- Invocação: harmônicos claros e textura metálica suave com assinatura intervalar distinta de `magic2` e `magic3`, sem elevar ganho.
- Travessia: ruído de ar curto por espada, com variação de pitch/timbre limitada e espaçamento de transientes.
- Contato: um ataque metálico definido e uma cauda celestial curta; impedir cinco impactos idênticos somados no mesmo frame, se for o caso.
- Não copiar gravações de anime; produzir procedural original ou usar gravação licenciada com atribuição e prova de licença.

## Plano de validação antes de modificar áudio
1. Conferir fonte dos eventos de invocação, passagem e colisão no branch efetivamente jogável; comparar número de espadas, animação e VFX.
2. Capturar WebAudio em navegador com gesto real, comparar forma de onda e duração dos eventos; ouvir em fones e alto-falante.
3. Medir pico e número de vozes em ataques simultâneos, tempo de áudio por evento, memória e CPU. Repetir em Android físico quando disponível.
4. Alterar apenas o timbre do evento comprovado, com teste A/B e sem alterar tempo, dano, hitbox ou VFX.

## Coordenação
- PRs de áudio #490, #492 e #495 alteram `audio3d.js`; **não editar esse arquivo** nesta rodada.
- PRs de combate/VFX/Eldória continuam em andamento; nenhuma alteração nesses módulos.
- Este PR só adiciona documentação na pasta exclusiva `docs/agentes/audio-sound-design/`.
- Não foram adicionados arquivos sonoros ou bibliotecas; nenhuma licença externa envolvida.

## Status
Investigação documental concluída; integração sonora, escuta, sincronização e benchmark **pendentes**. Sem merge ou auto-merge.
