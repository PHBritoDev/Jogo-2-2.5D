# Mod 275 — Bispo 1 (VHAZRAEL): fidelidade da Ruptura do Trono

## Referências realmente inspecionadas
O criador enviou uma imagem 1536×1536 e um vídeo de 26,779 segundos (1024×576, 30 fps aproximados). Na referência, a cena distingue nitidamente:

- a preparação com figura central, linhas vermelhas pelo corpo e duas massas/“asas” orgânicas preto-violeta que se expandem;
- uma fenda vertical muito branca, revestida de carmesim, com recortes negros horizontais;
- raio branco fino lateral, fragmentos angulares suspensos e choque ligado ao mesmo ponto de contato;
- fase final de incandescência e explosão laranja/branca que progride antes de dissipar.

**Limite inevitável:** são quadros de animação 2D; malhas/shaders Three.js em um jogo 3D mobile não podem ser considerados pixel a pixel idênticos à obra original. Os componentes visuais devem reproduzir composição, cores, ritmo e silhueta sem reaproveitar frames protegidos como textura.

## Diagnóstico do código existente
A Skill `throne` do Bispo 1 já tinha animação de espada, dois braços na empunhadura, pilar tridimensional, colisão por varredura, núcleo de impacto, 2ª explosão e tremor. O trabalho mantém exatamente estes mecanismos. A lacuna em relação à referência era principalmente **a ausência de asas de massa opaca preto-violeta**, a **forma mais plana e contínua do branco central e as faixas negras que cortam o clarão**, além do contraste entre a coluna e os raios laterais.

## Implementação
- Arquivo isolado `vhazrael-reference-sakuga3d.js`: malhas duplas que se abrem atrás do Bispo, rasgo branco-carmesim com formato de espada e dois cortes escuros, clarão central de colisão, relâmpagos brancos e pedras pretas que sobem do contato;
- `vhazrael-rupture3d.js`: integração ao **mesmo estado e tempo** de `throne` e cleanup para abortar, morrer, sair da dimensão ou completar. O núcleo começa na ponta verdadeira do rig, não flutua separado;
- `vhazrael-vfx3d.js`: sonda do VFX para testes; `enemy1-squad-runtime3d.js`: invalida cache da importação;
- Low Detail: asas simplificadas, duas descargas e dez pedras; High Detail: até quatro descargas e 24 pedras. Nenhum novo tipo de ataque, projétil, hitbox ou dano;
- UI / loader: cache v275, preservando as mudanças anteriores dos outros bispos.

## Plano de verificação
1. `node --test vhazrael-reference-sakuga.test.mjs vhazrael.test.mjs` deve validar estados, dano e regressões do Bispo 1;
2. `tools/visual-lab/vhazrael-reference-qa.cjs` abre a **prévia com o mesmo runtime GLB e WebGL** em SwiftShader, captura carga, corte e impacto com efeito ON/OFF em instante congelado; prova que houve mudança de pixel e que as malhas realmente apareceram;
3. O mesmo teste gera `relatorio.json` e `comparacao.html`, disponíveis em artifact de GitHub Actions. Avaliação artística final exige examinar manualmente esses quadros, não basta testes verdes;
4. Teste físico Android / FPS / áudio ouvido ainda não está atestado.

**Atenção:** “mais fiel” não é sinônimo de reproduzir integralmente um quadro de anime em 3D. A referência é para linguagem de cena, não textura copiada.
