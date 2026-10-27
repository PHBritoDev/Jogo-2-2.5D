# Validação do Mod 224

- `node --test *.test.mjs`: 131 testes aprovados.
- Skill 1 no Chromium: cinco toques com clicks sintéticos, HUD 5→0, dano total 70 e restauração do botão. Os módulos originais estão sem diferenças em relação à main.
- Skill 2: sequência em capturas do estudo (`cast`, `ascent`, `circle`, `rain`, `impact`, `fade`, `clean`) e do mundo (`game-*`).
- Estudo no Chromium/SwiftShader: oito repetições com contagem estável de seis geometrias (incluindo cenário/manequins), quatro programas; máximo observado de oito draw calls incluindo os três objetos do estudo. Não são medições do mundo completo nem FPS de Android.
- Viewport 390×844 em perfil baixo: `mobile.png`.
- `tools/qa/skill2_browser.py` e `skill2_preview.py` reproduzem os testes usando servidor local na porta 8767.
- Os avisos 404 no navegador são de `favicon.ico` ausente no servidor local; os testes verificam ausência de exceções JS e de erros de shader no estudo. Capturas do mundo usam os GLBs originais.
- Android não testado em aparelho real.

Verificação integrada final: toque+click descontam mana uma vez; habilidades retiradas não lançam nem aparecem no HUD; dano real, movimento durante a chuva, câmera normal livre, troca de encontro e morte do alvo com limpeza passaram sem exceções de página.
