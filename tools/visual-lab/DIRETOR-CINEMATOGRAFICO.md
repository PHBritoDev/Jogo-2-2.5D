# Diretor Cinematográfico V1 — ferramenta reutilizável para jogos e sites

## Propósito
Mede a **qualidade técnica visível** de capturas reais (Playwright, Chromium/WebGL ou outros navegadores) para ajudar o criador e os agentes a corrigir enquadramento, explosão, iluminação e transições **antes do merge**.

- `cinematic-director.cjs`: biblioteca para analisar capturas `.png` em sequência (exposição, saturação, detalhe, diferença de pixels, transições).
- `veraxion-lunar-qa.cjs`: agente existente que integra o diretor após gravar onze momentos da ultimate, em landscape e portrait.
- `cinematic-director.test.cjs`: regressões para exposição, mudanças visíveis e referência ausente.
- Relatórios: `visual-lab-results/devorador-mod289/{landscape,portrait}/diretor-cinematografico.json` (artefatos do GitHub Actions).

## Reutilização em outro jogo/site
Exemplo em Node.js com Sharp instalado:
```js
const {evaluate}=require("./cinematic-director.cjs");
const report=await evaluate({
  folder:"./capturas",
  frameNames:["inicio","impacto","fumaca"],
  baselineFolder:"./baseline",   // opcional: imagens da versão anterior, mesmos nomes
  referenceFolder:"./referencias" // opcional: mesma cena, composição comparável
});
console.log(report.findings);
```

Pode ser integrado a agentes que produzem capturas de sites, apps e outros motores de jogo. Baselines precisam de **mesma resolução, mesmo quadro e câmera equivalentes**. Composições diferentes não são nota válida.

## Significado das métricas
- `highlightClipping`: fração da imagem com canais quase brancos.
- `darkFraction`: fração de pixels quase pretos.
- `edgeEnergy`: contraste local médio, indicador de detalhe (não uma nota artística).
- `changedFraction`: fração dos pixels com alteração perceptível em baixa resolução.
- `meanDelta`: diferença média entre canais de imagem.
- `artisticSimilarity.status=UNVERIFIED`: **não equivale a 80%**, nem é calculado automaticamente. Referência humana/visual com inspeção dos materiais e da experiência é necessária.
- `approvedTechnical` não significa que a cinematografia está aprovada.

## Limites e segurança
O agente não gera conteúdo pago nem modifica modelos 3D: apenas lê imagens da cena testada. Respeitar a ordem do criador de **não alterar o Devorador Lunar** até futura substituição por modelo Meshy. Não fazer merge só por testes verdes.
