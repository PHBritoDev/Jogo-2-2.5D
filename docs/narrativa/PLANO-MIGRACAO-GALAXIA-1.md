# Plano de migração narrativa — Galáxia 1

**Estado:** plano proposto; nenhuma migração foi executada.  
**Dependência:** revisão e aprovação do criador sobre CANONE-MESTRE-GALAXIA-1-PROPOSTA.md.

## 1. Princípio de segurança

Não reescrever o fluxo atual de uma vez. A campanha tem saves reais, etapas numeradas, subetapas reutilizadas e recompensas persistentes. Uma mudança de texto pode mudar o sentido da história; uma mudança de step pode quebrar um save.

- Não renumerar questStep.
- Não reaproveitar act1Sub com novo significado.
- Não zerar mapa, abrigos, moedas, inventário ou bestiário.
- Não pagar recompensa novamente após migrar.
- Não assumir que uma flag de nome intuitivo representa exatamente o que aconteceu na história.
- Não atualizar build-info.js ou loader como parte de uma PR narrativa A5.
- Não tocar em arquivos reservados de outros agentes sem coordenação explícita.

## 2. Fases de trabalho

### Fase 0 — revisão do criador

Aprovar ou rejeitar:
- a espinha temática dos sete Pecados;
- a explicação do protagonista e o momento da revelação;
- os nomes Aethraziel/Vaelthar ou a permanência de “Anjo-Guia”;
- o tratamento do ritual das crianças e a possibilidade de purificação;
- os motivos próprios dos quatro Bispos;
- a culpa e a reparação de Sandra;
- a ordem e a promessa dos mundos 2–7;
- a restauração de asas/aura no quarto mundo;
- a solução para quatro elites do Coliseu;
- quais NPCs e missões opcionais da vila entram no cânone.

Sem essa revisão, nenhuma dessas propostas deve virar fala ou flag de runtime.

### Fase 1 — congelar a bíblia aprovada

Depois da aprovação:
1. Criar uma versão datada da bíblia aprovada.
2. Marcar M1–M7 e v1 como fontes históricas, sem apagá-las.
3. Criar uma matriz cena → arquivo → estado do save → QA.
4. Atribuir IDs estáveis às cenas, independentes de questStep.
5. Congelar nomes e grafias dos personagens, Pecados, lugares e itens.

### Fase 2 — camada narrativa compatível

Proposta de estrutura aditiva, ainda não implementada:

~~~json
{
  "campaignV2": {
    "schema": 1,
    "world": 1,
    "act": 1,
    "sceneId": "G1-A1-02",
    "choices": {
      "eldoriaVendor": "paid"
    },
    "relationships": {
      "guideTrust": 0,
      "sandraTrust": 0
    }
  }
}
~~~

Regras:
- Guardar somente escolhas que alterem uma fala, ajuda, rota ou consequência futura. Não salvar cada linha de diálogo.
- sceneId é estável e não depende de questStep.
- Valores ausentes têm defaults seguros.
- Flags de relacionamento ficam limitadas e auditáveis; não criar uma árvore de 100 variáveis.
- O save legado continua sendo lido. campaignV2 só é adicionado quando a nova campanha começa ou quando o jogador chega a um ponto de migração aprovado.
- A chave exata do envelope de progresso deve ser confirmada no runtime antes da implementação; este plano não inventa uma chave de armazenamento.

### Fase 3 — migração de saves

**Opção preferida:** migração em ponto seguro, fora de combate e cutscene.

1. Ler o save legado sem mutá-lo.
2. Validar questStep, act1Sub, flags, inventário e recompensas.
3. Criar uma cópia de trabalho; não descartar os campos antigos.
4. Mapear apenas estados que tenham equivalência comprovada.
5. Se um estado não puder ser inferido, preservar o legado e oferecer continuação pelo último checkpoint seguro; nunca inventar que uma missão foi concluída.
6. Escrever campaignV2.schema = 1 somente depois de validar o novo objeto.
7. Recarregar o jogo e confirmar que moedas, XP, itens e recompensas não mudaram.
8. Manter o save anterior recuperável até a primeira validação completa.

**Saves no meio de um ato:** não migrar automaticamente para uma cena que o jogador ainda não viu. A migração deve ocorrer no próximo limite seguro ou manter a rota antiga até concluir o ato.

**Saves de missões opcionais:** missão done permanece done e não paga de novo. Missões cuja história não for aprovada ficam congeladas como legado até a política de migração ser decidida; não trocar silenciosamente giver, nome ou recompensa.

### Fase 4 — implementação por marcos

| Ordem | Entrega | Limite de escopo | QA mínimo |
|---|---|---|---|
| 1 | Prólogo aprovado | Cena, nome do jogador, retirada de asas e seleção do mundo | Pular/reassistir, nome persistente, save/reload |
| 2 | Ato I aprovado | Vila, vendedor, floresta, ritual, retorno, caverna e VHAZRAEL | Cada escolha, missão, diálogo, checkpoint, save/reload e morte |
| 3 | Ato II Cinzária | Jornada e interior do vulcão | Migração do passo 10, caminho físico, laboratório, ouro, VORGAZHEK |
| 4 | Ato III | Sakura/Neve/dojo/cidadela conforme a #673 e roteiro aprovado | Caminhada, clima, objetivos, armadilha, caverna, ZAR'KHAEL |
| 5 | Ato IV | Torre e VÉRAXION | Sete pisos, descanso, história, colapso e save/reload |
| 6 | Ato V | Coliseu e Sandra | Oito rounds, quatro elites conforme decisão aprovada, aliado e Espada Celestial |
| 7 | Ato VI | Deserto, fragmentos, revanche e Ganância | Quatro fragmentos, morte/retry, três formas, Sandra, Inveja e unlock |
| 8 | Mundos 2–7 | Um mundo por marco | Identidade própria, boss, progressão, save, retorno e final |

Uma PR de implementação A5 ativa por vez. PR documental de proposta não conta como implementação; não misturar esta bíblia com correções técnicas de missões em uma única PR.

### Fase 5 — QA narrativo e técnico

Cada sequência precisa:
- ter cena de entrada, condição de saída e fallback;
- apresentar objetivo claro no HUD/diário;
- permitir continuar depois de morte ou recarga;
- registrar consequência de escolha;
- não duplicar moedas, XP ou item;
- funcionar com toque e teclado;
- não bloquear câmera, movimento ou controle sem aviso;
- ter captura de gameplay que mostre a interação real, não apenas uma tela de teste;
- separar evidência sintética, Chromium/SwiftShader e Android físico.

Android físico continua PENDENTE até haver aparelho e medição real. Não converter FPS de SwiftShader em FPS mobile.

## 3. Integração com os agentes

- A #673 reserva Ato III, Sakura/Neve/Castelo, mapa e integração do mundo; A5 deve fornecer apenas roteiro aprovado e não editar esses arquivos nesta fase.
- A #675 reserva câmera/HUD de VORGAZHEK.
- A #674 reserva iluminação de ZAR'KHAEL.
- A #672 reserva retry de fauna.
- A #656 reserva combate multi-alvo.
- A #515 protege a área de caverna.
- A #670 permanece draft técnico; não mesclar conteúdo de Bento/Téo/Lia como cânone sem aprovação.

Quando uma cena exigir arquivo compartilhado, primeiro mapear o hunk e combinar a fronteira com o agente dono. Preferir novos módulos de dados/cenas isolados quando isso não criar uma segunda fonte de verdade.

## 4. Critérios para encerrar cada marco

- O criador aprovou o roteiro daquele marco.
- O jogador entende objetivo e risco sem explicação externa.
- Toda pista importante tem payoff ou é removida.
- Cada NPC central tem desejo, medo, contradição e consequência.
- A sequência foi jogada do início ao fim por controles normais.
- Save/reload foi testado antes e depois do marco.
- Recompensas são idempotentes.
- Capturas e relatório pertencem ao SHA atual.
- Não há erro de console/rede sem explicação.
- Nenhuma conclusão de Android é declarada sem Android real.

## 5. Riscos principais

| Risco | Prevenção |
|---|---|
| Renumerar etapas e quebrar saves | sceneId separado; manter questStep legado |
| Trocar NPC e invalidar missão | congelar nomes e givers antes do código |
| Duas fontes de história no runtime | uma única bíblia aprovada e uma camada de cena por ato |
| Reintroduzir atos antigos | marcar acts34-flow e finale-flow como legado |
| PR #673 conflitar com roteiro A5 | A5 não toca seus arquivos; revisão conjunta antes de integrar |
| Escolhas falsas | cada escolha tem custo/efeito ou é apresentada como expressão |
| Recompensa duplicada | testes de idempotência e reload em cada marco |
| Excesso de cinematics no mobile | cenas curtas, controles devolvidos e Android QA separado |
