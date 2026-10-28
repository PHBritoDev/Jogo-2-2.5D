# Mod 228 — Julgamento Divino: Colapso da Luz Eterna

A Ultimate do protagonista agora tem uma sequência 3D de 17 segundos: ascensão visual de 24 metros, espada erguida, fissura ramificada, disco negro com coroa branca, tempestade e sucção de fragmentos, silêncio, lançamento contra o alvo, impacto branco e retorno. O disco usa geometria volumétrica; a imagem de referência não foi usada como sprite.

## Combate e progressão

- 80 de mana, 160 de dano base com o multiplicador de nível existente, alcance inicial de 24 metros. Um único impacto aos 13 segundos, no ID do encontro capturado ao iniciar.
- Recarga de 30 segundos, substituindo os 14 segundos da Ultimate anteriormente desabilitada: evita a recarga terminar antes dos 17 segundos de apresentação. Não há execução automática de chefes.
- Nesta implementação o impacto atinge somente o inimigo principal selecionado pelo sistema de combate existente; não há dano em área em NPCs/aliados ou alvos secundários.
- Compra e requisitos da loja preservados. `?todasHabilidades=1` libera os quatro poderes somente na sessão de teste, sem gravar a compra. O parâmetro agora também é encaminhado pelo lançador principal.
- A derrota causada pela Ultimate volta ao fluxo existente de recompensa/progressão depois da restauração da câmera, sem mostrar um segundo número de dano zero.

## Segurança da sequência

A apresentação altera a posição local do modelo, nunca a posição física do jogador. Um snapshot guarda câmera, perspectiva, pose, visibilidade, iluminação e controles. A atualização normal do mundo fica suspensa durante a sequência: Skills já ativas, IA e eventos retomam depois. Movimento, ataques e câmera recebem bloqueio de entrada; pausa, tela cheia e controles de áudio continuam disponíveis. Gestos de câmera e movimento mantidos antes do cast são descartados para não reaparecerem no retorno.

Mudança de contexto, morte/invalidação do alvo antes do impacto, morte do jogador, cancelamento e perda de contexto WebGL liberam o bloqueio. A restauração é idempotente e também é chamada quando há exceção. O ganho cinematográfico do áudio não altera os volumes salvos. A tela branca faz um único crescendo, breve sustentação e fade; a pausa permite acessar o menu durante esse clarão.

## Custo visual

Buffers, geometrias e instâncias são reaproveitados, com pré-compilação. Baixa/média/alta usam 80/180/320 estrelas e 20/50/100 fragmentos; chuva e descargas também têm limites por preset. Os tempos e o dano não dependem desses limites. Sem novos GLBs, texturas remotas, luzes dinâmicas adicionais ou pós-processamento pesado. A sucção usa cópias visuais e não remove árvores/construções.

## Validação executada

- `node --test`: **148 testes aprovados**, incluindo regressões dos módulos das três Skills e oito testes novos da Ultimate. Tempos/dano conferidos a 120/60/10 FPS simulados e passos de 3 segundos; alvo inválido/trocado, dano letal, pausa, mana, recarga, desbloqueio e rollback por exceção.
- Chromium headless com WebGL/SwiftShader, viewport 800×500: sequência no mundo real, posição física constante, mana 100→20, HP do alvo 300→140, bloqueio de movimento/câmera/ataque, restauração exata da câmera e da posição local do modelo. Pausa/retomada, primeira pessoa, mudança de contexto e evento sintético de perda de contexto WebGL.
- Preview isolado: 12 reutilizações alternando os três presets, com número de geometrias estável após aquecimento. A medição de draw calls/triângulos está no log e inclui o piso e o personagem simplificado do preview; não é medição do custo do jogo inteiro.
- Inspeção das capturas reais de ascensão, espada, fissura, crescimento, lançamento, branco total e retorno. Ajustados enquadramento, sobreposição das nuvens e brilho lateral para preservar o núcleo preto.
- Rodada final no navegador: tecla de pausa, acesso ao silenciamento, limpeza de gesto de câmera mantido antes do cast e segundo cast letal no mesmo encontro; derrota entregue à progressão somente depois da restauração. Nenhum erro de página.
- `node --check` e `git diff --check` sem erros.

Não foi testado em aparelho Android físico; não há afirmação de FPS móvel. O navegador usou renderização por software e avanço controlado do relógio para as verificações cinematográficas. Não foram rejogados todos os atos nem todas as lutas de chefes. A perda de contexto foi simulada por evento, não por falha real de GPU. As Skills 1–3 e `ultimates3d.js` dos inimigos não tiveram seus módulos de lógica/VFX alterados.

## Evidências e reprodução

- [Log Node](evidencias/mod228/node-tests.txt)
- [Log do navegador](evidencias/mod228/browser.txt)
- [Verificação final](evidencias/mod228/final-browser.txt)
- [Espada erguida](evidencias/mod228/sword.png), [coroa no jogo](evidencias/mod228/colossal.png), [referência 3D isolada](evidencias/mod228/crown.png), [branco total](evidencias/mod228/white.png), [retorno](evidencias/mod228/restored.png)

Para repetir: servir a raiz na porta 8769 e executar `python tools/qa/whitehole_browser.py` e `python tools/qa/whitehole_final_browser.py` com Playwright e Chromium instalados. A configuração de proxy desses scripts é somente do ambiente de teste. `whitehole-preview.html` é uma visualização isolada do mesmo VFX; o jogo usa o GLB real do protagonista.

No celular, abrir o jogo com `?todasHabilidades=1&refresh=228`, aproximar-se de um inimigo vivo, ficar no chão com 80 de mana e tocar **JUÍZO**. O briefing temporário deve ser removido em commit separado antes do merge.
