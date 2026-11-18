# Áudio real — combate, passos e ambientes (missão combate/câmera/áudio, 18/11/2026)

## Origem dos arquivos
1. **RPG Audio Forge (prioridade do criador):** publicado e respondendo (`/mobile/` 200; `GET /api/studio/sounds` 401
   sem sessão). Sem endpoint MCP (`/mcp`, `/.well-known/mcp.json` → 404). A API só aceita um **token de sessão** obtido em
   `POST /api/studio/session` com o código do estúdio **no corpo** — a credencial guardada no ambiente do Claude é injetada
   só como cabeçalho, então continua 401. Nada foi alterado no estúdio nem no Replit Agent.
   **Ação mínima para usar o estúdio:** o estúdio aceitar o código também no cabeçalho `Authorization: Bearer <código>`
   (mudança pequena no backend), ou guardar no ambiente um token de sessão de longa duração.
2. **Fallback oficial autorizado:** ElevenLabs Sound Effects API (`POST /v1/sound-generation`), **1 resultado por chamada**.
   Custo real medido no cabeçalho `Character-Cost`: **10 créditos por segundo** gerado.
   Gasto total: ver `audio/audio-manifest.json` (`gasto_total_creditos`, por arquivo em `custo_creditos_confirmado`).
   A chave não tem `user_read` (saldo não consultável) nem `music_generation` (Music API bloqueada).

## Pós-produção (objetiva, sem "escuta" simulada)
- Efeitos: corte de silêncio no início/fim (fade de 6 ms só na cauda), pico −1 dBFS, mono 96 kbps.
- Ambientes: loops gerados com `loop:true`, média ≈ −20 dB, pico ≤ −1,5 dBFS, estéreo 112 kbps.
- `audio/audio-manifest.json`: assetId, evento, prompt, duração, pico, média, bytes, sha256, custo, data, licença, aprovação.
- 1 arquivo refeito (floresta noturna saiu quase muda, média −60 dB); o original não foi publicado.

## Integração (`audio-banco3d.js` + `audio3d.js`)
- Banco de amostras no mesmo AudioContext/buses (volumes, mute, pausa e preferências preservados).
- Carregamento preguiçoso com cache; efeitos de combate/movimento/UI pré-carregados após o 1º gesto; ambientes só quando
  o bioma pede. Enquanto um arquivo não decodificou, o procedural antigo toca naquela vez (nunca silêncio por falha).
- Limite de 12 vozes; variações sem repetir a última; ±4 % de altura.
- Eventos com arquivo próprio: golpes do herói (3), impacto de lâmina (2), bloqueio, parry perfeito, dano no herói,
  VHAZRAEL (corte leve/pesado sincronizado ao corte, impacto), dash, pulo, aterrissagem, passos (grama, pedra, água, cinza),
  trava de alvo, UI, queda de corpo, cinzas, moedas, trovão (2).
- Ambientes por bioma/dimensão (loop real cala o procedural equivalente): floresta dia/noite (pássaros/grilos), vento da
  serra, chuva, rio, cachoeira, vulcão, cinzas, vila, abismo, caverna, salão do trono do VHAZRAEL.
- **Não gerados (regra do criador):** Ganância e poderes futuros do protagonista (buraco negro/ultimate/espada).

## Pendente (bloqueio de permissão)
- **Música de batalha por dimensão:** a Sound Effects API não é serviço de trilha; a Music API exige a permissão
  `music_generation` na chave. A música procedural atual fica até liberar a permissão (não foi trocada por silêncio).
