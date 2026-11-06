# Agente V7 — auditor de GLBs e animações (sem Blender)

Ferramenta reutilizável que analisa **metadados** dos modelos 3D GLB no GitHub, sem PC, Blender, APIs pagas ou geração de modelos.

- `agent-v7-glb-audit.cjs`: valida estrutura binária glTF 2.0 e inventaria malhas, nós, skins/ossos, clipes, morph targets de rosto/boca, texturas, triângulos e tamanho.
- `agent-v7-run.cjs`: executa auditoria de arquivos GLB rastreados pelo Git, gera `catalogo-glb.json` como artefato do Actions.
- `agent-v7-glb-audit.test.cjs`: testes contra binários falsos, nomes de animação, morfologia facial e orçamentos mobile.

## Preparação para a futura substituição dos personagens
A inspeção mostra **presença** de animações como respirar, andar, correr, atacar, receber dano, cair, levantar, pular, dash e morrer conforme nomes dos clipes. Também identifica nomes de nós e blendshapes de boca, olhos e expressão quando existem. É um inventário de pré-integração; não confirma a qualidade de cada animação nem que retargeting, expressões, sincronização labial e colisões funcionam.

Os alertas de 50.000 triângulos e 16 MiB são limites iniciais **configuráveis**, não proibição rígida. FPS real depende do dispositivo; o agente não o inventa.

## Preservar prioridades atuais
Até instrução diferente, **não modificar modelos de personagem**, Devorador Lunar, ataque restante do Bispo 4 nem poderes da Ganância. O V7 apenas lê GLBs existentes. O criador poderá produzir novos modelos no Meshy quando desejar.

**Saída:** `visual-lab-results/agente-v7/catalogo-glb.json` no artefato de CI. Futuramente poderá servir de gate técnico quando novas versões dos personagens forem recebidas.
