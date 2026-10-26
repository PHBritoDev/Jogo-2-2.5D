# Marco 12 — O Anjo-Guia refeito

**Fontes:**
- **Pedido do autor:** "criar um Anjo 3D melhor". A imagem de referência enviada era um exemplo, com liberdade para melhorar.
- **Documento mestre:** o Anjo-Guia acompanha o herói e, no Ato III, revela que esconde a verdade.

**Referência visual usada:**
- Anjo de manto branco com rachaduras de ouro, no estilo do kintsugi (cerâmica remendada com ouro).
- Faixa escura na frente, com sóis dourados.
- Medalhão do sol no peito.
- Auréola eclipse: disco negro com anel e raios de ouro.
- Asas assimétricas: uma branca e uma negra cristalina.
- Manoplas escuras, ombreiras de ouro, botas com bico, cabelo platinado na altura dos ombros e olhos dourados com pupila de sol.
- **Melhoria nossa:** a asa negra é a pista visual de que ele esconde algo, o que conversa com a revelação do Ato III.

## Como foi feito

| Parte | Detalhe |
|---|---|
| Script | `tools/blender/m12_anjo.py` gera `Anjo-rig.glb` com a mesma técnica da Sandra: malha-base do MakeHuman (MPFB2, CC0), com alvos masculinos, ajustada ao esqueleto da Misteriosa. |
| Animações | Usa as mesmas da Misteriosa: parado (`Idle`), andar, correr, ataque, magia, investida e queda. |
| Anjo-Guia do mundo | `Anjo-rig.glb`; a respiração vem do clipe `Idle`. |
| Rig `anjo` das cenas e lutas | `RIG_DEFS.anjo` agora usa o mesmo arquivo, com clipes próprios. Antes os clipes eram emprestados do Protagonista. |
| Retrato | `AnjoGuia-ui.webp` refeito a partir do modelo novo. |
| Versão antiga | `AnjoGuia-lod.glb` continua no repositório, mas não é mais carregado. |

## Limites (honesto)

- **Modelo:** é procedural. Penas são lâminas, e o manto é pintado por cor de vértice, sem tecido simulado.
- **Rosto:** é o do MakeHuman, ajustado por alvos.
- **Evidência:**
  - **CONFIRMADO POR CÓDIGO:** `node --test`, 103 testes passando.
  - **TESTADO EM NAVEGADOR:** Anjo-Guia no Ato I com o clipe `Idle`; fluxo do Ato III até o Ato IV, com a luta contra o anjo, sem erro de página.
  - **Android: NÃO TESTADO.**
