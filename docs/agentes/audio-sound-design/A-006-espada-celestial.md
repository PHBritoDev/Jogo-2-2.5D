# A-006 — Identidade sonora da Espada Celestial vs. Ultimate (auditoria estática)

Data: 2026-11-13. Escopo: **somente documentação**. Nenhum som alterado, nenhum arquivo de áudio criado.

## Descoberta verificável
- `progression3d.js` distingue a arma equipável `SWORDS.celeste` (id `celeste`, rastro branco) da habilidade equipável `SHOP_ITEMS.ultimate` (Julgamento Divino — Colapso da Luz Eterna).
- `docs/roteiro/M10-PODERES.md` descreve a ultimate como invocação de Bíblia/círculo, nuvens/raios e espada descendente; é uma **descrição de roteiro/documentação**, não prova da implementação atual.
- `audio3d.js` usa `swing(step,sword)`, que só diferencia `sword === 'aurora'` e reutiliza três perfis de ruído para os demais valores. A API `magic('ultimate')` compartilha estrutura harmônica com `magic`, `magic2` e `magic3`, acrescentando um grave. Isto é evidência de **baixa distinção estrutural**, não avaliação auditiva.
- `docs/MOD-302-COMBATE-PROTAGONISTA.md` confirma que o repertório de combos reutiliza `worldAudio.swing/hit/whoosh`; não atesta áudio exclusivo da Espada Celestial.
- Não foi verificado nesta rodada se o fluxo atual passa o id `celeste` a `swing`, nem a ordem exata dos disparos da ultimate em `mundo-3d-prototype.js`. Não alterar sem rastrear esses eventos.

## Proposta artística (não implementada)
**Espada Celestial equipada:** assinatura curta de lâmina metálica clara, fricção aérea suave e harmônico agudo sutil; 3–5 microvariações por gesto, sem transformar cada golpe em ultimate. Ataque comum preserva transiente definido e duração curta; impacto usa textura diferente por contato real.

**Ultimate Julgamento Divino:** identidade independente em quatro pontos de sincronização a confirmar no código: (1) concentração com grave ascendente e coro original; (2) silêncio seletivo breve antes da descida, **sem suprimir alertas de perigo**; (3) descida com cisalhamento amplo; (4) impacto de corpo grave, transiente médio e cauda espectral. Não usar amostras de anime, gravações protegidas ou bibliotecas sem licença documentada.

## Gate de implementação
1. Mapear eventos reais do combo e da ultimate, com timestamps de animação/VFX e chamadas a `worldAudio`, inclusive comportamento com a arma equipada.
2. Capturar baseline audível por saída de áudio (não somente status `AudioContext.running`) em desktop e Android; escutar fones/alto-falantes e comparar versões no mesmo ganho.
3. Definir orçamento de vozes por efeito e limitar duplicações; evitar reverb global/convolução pesada em mobile. Medir pico, clipping, atraso evento→som, uso de memória e CPU antes/depois.
4. Implementar em branch exclusiva **após** resolver sobreposição dos PRs de `audio3d.js` (#490, #492, #495, #502), preferindo API pequena e testes de eventos; sem mudar dano, câmera, IA, animações ou VFX.
5. Se forem usados samples: salvar origem, autor, URL, licença, atribuição e transformações; sem arquivos externos nesta auditoria.

## Coordenação
PRs abertos inspecionados: #473 (Eldória), #486 (combate), #487/#497/#499/#501 (VFX), #488 (iluminação), #489 (arte), e áudio #490/#492/#495/#496/#498/#500/#502. Não tocar `audio3d.js` nesta rodada. Sem merge/auto-merge.

**Evidência:** leitura estática dos arquivos citados, sem renderização de áudio, escuta, execução de testes ou benchmark físico. Não declarar melhoria sonora percebida.
