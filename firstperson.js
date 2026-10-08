'use strict';

/* ============================================================
   FIRSTPERSON — câmera em primeira pessoa

   O jogo continua sendo 2D por dentro (x/y = chão, z = altura).
   Esta câmera só muda COMO o mundo é desenhado; nenhuma regra de
   jogo é alterada:

   - Olhos ficam na altura da cabeça do protagonista (Player.z + eye)
     e o olhar (yaw) acompanha a direção do jogador (Player.fx/fy).
   - O chão é o próprio desenho "visto de cima" (tiles, trilhas,
     arenas, locais da campanha) projetado em perspectiva.
   - Árvores, pedras, arbustos, inimigos e NPCs viram "outdoors"
     que reutilizam as funções de desenho que já existem.
   - O corpo do protagonista NÃO é desenhado (só mãos/escudo).

   Os modos de câmera são escolhidos pelo jogador. O foco de combate é
   opcional e suave: não trava a câmera nem substitui as regras de combate.

   Controle de troca: tecla V ou botão #btn-camera (ver input.js).
   ============================================================ */
const FirstPerson = {
  cfg: {
    hfov: 90 * Math.PI / 180,  // campo mais aberto para reduzir a sensação de proximidade
    maxHfov: 95 * Math.PI / 180,
    eye: 23,                   // câmera um pouco mais baixa que a versão anterior
    horizon: 0.47,             // posição do horizonte na tela (0 = topo, 1 = base)
    far: 420,                  // reequilibrado com o FOV para manter o custo do buffer
    indoorFar: 340,            // alcance dentro de locais fechados
    bufScale: 1,               // pixels do buffer do chão por unidade de mundo
    strip: 2,                  // altura (em unidades de tela) de cada faixa de chão
    pad: 14,                   // folga lateral (esconde as bordas durante o tremor)
    turn: 7,                   // giro suave, sem puxões bruscos
    combatRange: 640,          // distância máxima para um oponente contar como combate
    idleSpeed: 30,             // abaixo disso o jogador é considerado "parado"
    engaged: {                 // estados que contam como combate real
      emerge: 1, approach: 1, chase: 1, guard: 1, windup: 1,
      attack: 1, recover: 1, stagger: 1, flee: 1
    }
  },

  modes: [
    { label: '3ª pessoa próxima', zoom: 0.92, firstPerson: false },
    { label: '3ª pessoa afastada', zoom: 1.25, firstPerson: false },
    { label: '1ª pessoa', zoom: 1.25, firstPerson: true }
  ],
  modeIndex: 1,
  modeZoom: 1.25,
  active: false,     // true = primeira pessoa
  aiming: false,
  viewZoom: 1,
  viewZoomTarget: 1,
  yaw: Math.PI / 2,  // direção do olhar (rad): 0 = +x, PI/2 = +y (sul)
  pitch: 0,
  manualLook: false,
  target: null,      // oponente que a câmera enquadra em combate
  _foes: [],
  _btn: null,
  _buf: null, _bg: null, _bw: 0, _bh: 0, _bx: 0, _by: 0,
  _flat: [], _tall: [], _items: [],
  _px: 0, _py: 0, _fx: 0, _fy: 1, _rx: -1, _ry: 0,
  _W: 0, _H: 0, _f: 1, _hz: 0, _ez: 0, _far: 480, _th: 1,

  // ---------- Controle ----------
  _wrap(a) {
    a = (a + Math.PI) % 6.283185307179586;
    if (a < 0) a += 6.283185307179586;
    return a - Math.PI;
  },

  facingAngle() { return Math.atan2(Player.fy, Player.fx); },

  // Percorre 3ª próxima, 3ª afastada e 1ª pessoa.
  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % this.modes.length;
    const mode = this.modes[this.modeIndex];
    this.active = mode.firstPerson;
    this.modeZoom = mode.zoom;
    Camera.setZoom(this.modeZoom);
    Camera.resetLook();
    this.manualLook = false;
    this.pitch = 0;
    if (this.active) this.yaw = this.facingAngle();
    this._syncButton();
    return true;
  },

  toggle() { return this.cycleMode(); },

  lookBy(dx, dy) {
    this.yaw = this._wrap(this.yaw + dx * 0.005);
    this.pitch = U.clamp(this.pitch - dy * 0.004, -0.42, 0.42);
    this.manualLook = true;
  },

  adjustZoom(amount) {
    if (this.active) {
      this.viewZoomTarget = U.clamp(this.viewZoomTarget + amount, 0.95, 1.25);
    } else {
      this.modeZoom = U.clamp(this.modeZoom - amount, 0.82, 1.55);
      Camera.setZoom(this.modeZoom);
    }
  },

  _syncButton() {
    if (!this._btn) this._btn = document.getElementById('btn-camera');
    const b = this._btn;
    if (!b) return;
    const mode = this.modes[this.modeIndex];
    b.classList.toggle('on', this.active);
    b.textContent = this.active ? '1P' : (this.modeIndex === 0 ? '3P−' : '3P+');
    b.setAttribute('aria-pressed', this.active ? 'true' : 'false');
    b.setAttribute('aria-label', 'Câmera: ' + mode.label + '. Toque para alternar o modo.');
    b.title = mode.label + ' — toque para alternar';
  },

  // Oponentes em combate (usa os mesmos objetos/estados do combate existente)
  _engagedFoes() {
    const E = this.cfg.engaged, out = this._foes;
    out.length = 0;
    const list = Enemy.instances;
    for (let i = 0; i < list.length; i++) {
      if (list[i].alpha > 0 && E[list[i].state]) out.push(list[i]);
    }
    if (Greedling.alpha > 0 && E[Greedling.state]) out.push(Greedling);
    if (BishopBoss.alpha > 0 && E[BishopBoss.state]) out.push(BishopBoss);
    return out;
  },

  // Atualiza o foco opcional sem alterar o estado ou as regras dos inimigos.
  update(dt, aimHeld) {
    const C = this.cfg;
    const wasAiming = this.aiming;
    this.aiming = !!aimHeld;
    const foes = this._engagedFoes();
    let target = null, best = 1e9;
    for (let i = 0; i < foes.length; i++) {
      const d = Math.hypot(foes[i].x - Player.x, foes[i].y - Player.y);
      if (d <= C.combatRange && d < best) { best = d; target = foes[i]; }
    }
    this.target = target;

    // Ao começar a mirar, enquadra o alvo uma vez; o arrasto manual tem prioridade.
    if (this.aiming && !wasAiming && target) this.manualLook = false;

    if (this.active && !Player.dead) {
      let goal = this.yaw;
      if (this.aiming && target && !this.manualLook) {
        goal = Math.atan2(target.y - Player.y, target.x - Player.x);
      } else if (!this.manualLook) {
        goal = this.facingAngle();
      }
      const k = 1 - Math.exp(-C.turn * dt);
      this.yaw = this._wrap(this.yaw + this._wrap(goal - this.yaw) * k);
    }

    // Mirando parado, um ataque sem direção explícita usa o rumo da câmera.
    // Em 3ª pessoa, orienta o personagem ao alvo, sem trocar a câmera de modo.
    if (this.aiming && target && Player.speed < 8 &&
        Player.attackT < 0 && Player.stun <= 0) {
      const goal = this.active
        ? this.yaw
        : Math.atan2(target.y - Player.y, target.x - Player.x);
      const facing = Math.atan2(Player.fy, Player.fx);
      const k = 1 - Math.exp(-C.turn * dt);
      const angle = this._wrap(facing + this._wrap(goal - facing) * k);
      Player.fx = Math.cos(angle);
      Player.fy = Math.sin(angle);
    }
  },

  // ---------- Desenho ----------
  _ensureBuffer() {
    const C = this.cfg;
    const th = Math.tan(C.maxHfov / 2);
    const bw = Math.ceil(2 * (C.far * th * 1.1 + 40) * C.bufScale);
    const bh = Math.ceil((C.far + 24) * C.bufScale);
    if (this._buf && this._bw === bw && this._bh === bh) return;
    this._buf = document.createElement('canvas');
    this._buf.width = this._bw = bw;
    this._buf.height = this._bh = bh;
    this._bg = this._buf.getContext('2d');
    this._bx = bw / 2;
    this._by = (C.far + 12) * C.bufScale;
  },

  render(ctx, dt) {
    const cam = Camera, C = this.cfg, t = Game.time;
    const W = cam.viewW, H = cam.viewH;
    const indoor = !!World.activeInstanceBounds();
    this.viewZoom += (this.viewZoomTarget - this.viewZoom) * (1 - Math.exp(-6 * dt));
    const hfov = C.hfov / this.viewZoom;
    const th = Math.tan(hfov / 2);

    this._W = W; this._H = H;
    this._th = th;
    this._f = (W / 2) / th;
    this._hz = H * U.clamp(C.horizon + this.pitch * 0.34, 0.32, 0.62);
    this._ez = Player.z + C.eye;
    this._far = indoor ? C.indoorFar : C.far;
    this._px = Player.x; this._py = Player.y;
    this._fx = Math.cos(this.yaw); this._fy = Math.sin(this.yaw);
    this._rx = -this._fy; this._ry = this._fx;
    Render.dt = dt;   // usado pelo fade das copas das árvores
    this._ensureBuffer();

    ctx.setTransform(cam.scale, 0, 0, cam.scale, 0, 0);
    ctx.save();
    ctx.translate(cam.shakeX, cam.shakeY);

    this._drawSky(ctx, indoor);
    this._paintGround(t);
    this._blitGround(ctx);
    this._drawFog(ctx, indoor);
    this._drawBillboards(ctx, t);
    this._drawAimHighlight(ctx);
    this._drawTexts(ctx);

    ctx.restore();
    this._drawMarker(ctx, t);
    this._drawHands(ctx, t);
  },

  _drawSky(ctx, indoor) {
    const W = this._W, H = this._H, hz = this._hz, f = this._f;
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, indoor ? '#0b0910' : '#4fa9ec');
    g.addColorStop(1, indoor ? '#1c1624' : '#cdeeff');
    ctx.fillStyle = g;
    ctx.fillRect(-24, -24, W + 48, hz + 24);

    // Abaixo do horizonte só aparece onde não há chão (borda da ilha flutuante)
    g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, indoor ? '#1c1624' : '#cdeeff');
    g.addColorStop(1, indoor ? '#0b0910' : '#6fb4ea');
    ctx.fillStyle = g;
    ctx.fillRect(-24, hz, W + 48, H - hz + 24);

    // Sol numa direção fixa do mundo (dá referência ao girar)
    if (!indoor) {
      const rel = this._wrap(-Math.PI * 0.3 - this.yaw);
      if (Math.abs(rel) < 1.2) {
        const sx = W / 2 + Math.tan(rel) * f, sy = hz * 0.42;
        const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, 140);
        s.addColorStop(0, 'rgba(255,248,200,0.85)');
        s.addColorStop(1, 'rgba(255,248,200,0)');
        ctx.fillStyle = s;
        ctx.fillRect(sx - 140, sy - 140, 280, 280);
      }
    }
  },

  // Desenha o chão "visto de cima" num buffer já girado (frente = topo)
  _paintGround(t) {
    const g = this._bg, C = this.cfg, cam = Camera;
    const px = this._px, py = this._py;
    const Fx = this._fx, Fy = this._fy, Rx = this._rx, Ry = this._ry;
    const far = this._far, th = this._th * 1.08;
    const S = World.ts, cols = World.cols, rows = World.rows, tiles = World.tiles;
    const R = Math.hypot(far, far * th) + 90;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this._bw, this._bh);
    g.save();
    g.translate(this._bx, this._by);
    g.scale(C.bufScale, C.bufScale);
    g.rotate(-Math.PI / 2 - this.yaw);
    g.translate(-px, -py);

    // Tiles dentro do cone de visão
    const tx0 = Math.max(0, Math.floor((px - R) / S)), tx1 = Math.min(cols - 1, Math.floor((px + R) / S));
    const ty0 = Math.max(0, Math.floor((py - R) / S)), ty1 = Math.min(rows - 1, Math.floor((py + R) / S));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const cx = (tx + 0.5) * S - px, cy = (ty + 0.5) * S - py;
        const depth = cx * Fx + cy * Fy, lat = cx * Rx + cy * Ry;
        if (depth < -S || depth > far + S) continue;
        if (Math.abs(lat) > Math.max(depth, 0) * th + S * 1.4) continue;
        const type = tiles[ty * cols + tx];
        const v = (tx * 7 + ty * 13 + ((tx * ty) % 5)) & 3;
        g.drawImage(Render.tiles[type][v], tx * S, ty * S, S + 1, S + 1);
      }
    }

    MistValley.drawGround(g, t);

    // Decoração plana (tufos e flores)
    World.query(px - R, py - R, px + R, py + R, this._flat, this._tall);
    const flat = this._flat;
    for (let i = 0; i < flat.length; i++) {
      const o = flat[i];
      const dx = o.x - px, dy = o.y - py;
      const depth = dx * Fx + dy * Fy, lat = dx * Rx + dy * Ry;
      if (depth < -10 || depth > far + 10 || Math.abs(lat) > Math.max(depth, 0) * th + 20) continue;
      Render._drawFlat(g, o, t);
    }

    // Moedas, locais e anel do objetivo da campanha usam a câmera 2D só para
    // descartar o que está fora da tela; damos a ela a área do buffer.
    const ox = cam.x, oy = cam.y, ow = cam.viewW, oh = cam.viewH;
    try {
      cam.x = px - R; cam.y = py - R; cam.viewW = cam.viewH = R * 2;
      Quest.drawGround(g, t);
    } finally {
      cam.x = ox; cam.y = oy; cam.viewW = ow; cam.viewH = oh;
    }
    StormEvents.draw(g, t);
    g.restore();
  },

  // Projeta o buffer no chão da tela (uma faixa horizontal por vez)
  _blitGround(ctx) {
    const C = this.cfg, W = this._W, H = this._H, hz = this._hz, f = this._f;
    const bs = C.bufScale, st = C.strip, pad = C.pad;
    const k = this._ez * f, far = this._far;
    const y0 = Math.ceil(hz + k / far);
    for (let y = y0; y < H + 6; y += st) {
      const dFar = k / (y - hz);
      const dNear = k / (y + st - hz);
      const half = ((W / 2 + pad) * (dFar + dNear) / 2 / f) * bs;
      const sy = this._by - dFar * bs;
      if (sy < 0) continue;
      ctx.drawImage(this._buf,
        this._bx - half, sy, half * 2, Math.max(0.5, (dFar - dNear) * bs),
        -pad, y, W + pad * 2, st + 0.6);
    }
  },

  // Névoa de distância (esconde o limite do alcance do chão)
  _drawFog(ctx, indoor) {
    const W = this._W, hz = this._hz;
    const fh = Math.max(26, (this._ez * this._f / this._far) * 2.6);
    const col = indoor ? '28,22,36' : '205,238,255';
    const g = ctx.createLinearGradient(0, hz - 1, 0, hz + fh);
    g.addColorStop(0, 'rgba(' + col + ',1)');
    g.addColorStop(0.45, 'rgba(' + col + ',0.85)');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(-24, hz - 1, W + 48, fh + 1);
  },

  // Árvores, pedras, arbustos, inimigos e NPCs: mesmos desenhos de sempre,
  // escalados pela distância e ordenados do mais longe para o mais perto.
  _drawBillboards(ctx, t) {
    const W = this._W, f = this._f, hz = this._hz, ez = this._ez, far = this._far;
    const px = this._px, py = this._py;
    const Fx = this._fx, Fy = this._fy, Rx = this._rx, Ry = this._ry;
    const items = this._items;
    items.length = 0;

    const R = far * 1.4;
    World.query(px - R, py - R, px + R, py + R, this._flat, this._tall);
    const tall = this._tall;
    for (let i = 0; i < tall.length; i++) {
      const o = tall[i];
      const dx = o.x - px, dy = o.y - py;
      const depth = dx * Fx + dy * Fy;
      if (depth < 12 || depth > far + 40) continue;
      const lat = dx * Rx + dy * Ry;
      const k = f / depth;
      const ext = (48 * (o.s || 1) + (o.r || 0)) * k;
      const sx = W / 2 + lat * k;
      if (sx + ext < 0 || sx - ext > W) continue;
      items.push({ o: o, e: false, depth: depth, lat: lat });
    }

    const add = function (e) {
      const dx = e.x - px, dy = e.y - py;
      const depth = dx * Fx + dy * Fy;
      if (depth < 4 || depth > 1000) return;
      const lat = dx * Rx + dy * Ry;
      const k = f / depth;
      const sx = W / 2 + lat * k;
      const ext = 60 * k;
      if (sx + ext < 0 || sx - ext > W) return;
      items.push({ o: e, e: true, depth: depth, lat: lat });
    };
    const list = Enemy.instances;
    for (let i = 0; i < list.length; i++) if (list[i].alpha > 0) add(list[i]);
    if (Greedling.alpha > 0 && Greedling.state !== 'gone') add(Greedling);
    if (BishopBoss.alpha > 0 && BishopBoss.state !== 'inactive') add(BishopBoss);
    if (Traveler.alpha > 0 && Traveler.state !== 'gone') add(Traveler);

    items.sort(function (a, b) { return b.depth - a.depth; });

    for (let i = 0; i < items.length; i++) {
      const it = items[i], o = it.o;
      const k = f / it.depth;
      const p = Object.create(o);   // cópia "leve": mesmos dados, posição na origem
      p.x = 0; p.y = 0; p.sy = 0;

      ctx.save();
      ctx.translate(W / 2 + it.lat * k, hz + ez * k);
      ctx.scale(k, k);

      if (it.e) {
        // Direção em que o personagem olha, vista da câmera
        // (fx: direita/esquerda da tela; fy > 0: virado para o jogador)
        p.fx = o.fx * Rx + o.fy * Ry;
        p.fy = -(o.fx * Fx + o.fy * Fy);
        p.draw(ctx, t);
      } else {
        ctx.globalAlpha = U.clamp((far + 30 - it.depth) / (far * 0.28), 0, 1);
        switch (o.type) {
          case 'tree': Render._drawTree(ctx, p, t); break;
          case 'pine': Render._drawPine(ctx, p, t); break;
          case 'rock': Render._drawRock(ctx, p); break;
          case 'bush': Render._drawBush(ctx, p); break;
        }
      }
      ctx.restore();
    }
  },

  _drawAimHighlight(ctx) {
    const target = this.aiming && this.target;
    if (!target) return;
    const dx = target.x - this._px, dy = target.y - this._py;
    const depth = dx * this._fx + dy * this._fy;
    if (depth < 4 || depth > this._far + 40) return;
    const lat = dx * this._rx + dy * this._ry;
    const k = this._f / depth;
    const sx = this._W / 2 + lat * k;
    if (sx < -30 || sx > this._W + 30) return;

    const sy = this._hz + (this._ez - (target.z || 0) - 18) * k;
    const rx = U.clamp((target.r || 12) * k * 1.5, 9, 28);
    const pulse = 0.56 + Math.sin(Game.time * 5) * 0.12;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ffe29a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, Math.max(5, rx * 0.42), 0, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
  },

  // Números de dano (o combate guarda a posição já com a altura somada)
  _drawTexts(ctx) {
    const texts = Combat.texts;
    if (!texts.length) return;
    const W = this._W, f = this._f, hz = this._hz, ez = this._ez;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    for (let i = 0; i < texts.length; i++) {
      const tx = texts[i];
      const h = 40 + 28 * tx.age;
      const dx = tx.x - this._px, dy = tx.y + h - this._py;
      const depth = dx * this._fx + dy * this._fy;
      if (depth < 8) continue;
      const lat = dx * this._rx + dy * this._ry;
      const k = f / depth;
      const kk = tx.age / tx.life;
      ctx.globalAlpha = kk < 0.6 ? 1 : 1 - (kk - 0.6) / 0.4;
      ctx.font = 'bold ' + Math.round(U.clamp(k * 5, 13, 30)) + 'px sans-serif';
      ctx.fillStyle = tx.col;
      const sx = W / 2 + lat * k, sy = hz + (ez - h) * k;
      ctx.strokeText(tx.str, sx, sy);
      ctx.fillText(tx.str, sx, sy);
    }
    ctx.globalAlpha = 1;
  },

  // Marcador do objetivo da missão (equivalente ao Quest.drawMarker, em perspectiva)
  _drawMarker(ctx, t) {
    if (Game.talking) return;
    const tg = Campaign.markerTarget();
    if (!tg || tg.alpha === 0) return;

    const W = this._W, H = this._H, f = this._f, hz = this._hz, ez = this._ez;
    const dx = tg.x - this._px, dy = tg.y - this._py;
    const depth = dx * this._fx + dy * this._fy;
    const lat = dx * this._rx + dy * this._ry;
    const dist = Math.round(Math.hypot(dx, dy) / CFG.TILE);
    const sx = depth > 8 ? W / 2 + lat / depth * f : -1e4;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffd34d';
    ctx.strokeStyle = '#5a3a00';
    ctx.lineWidth = 2;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';

    if (sx > 26 && sx < W - 26) {
      const top = hz + (ez - 70) / depth * f;
      const by = U.clamp(top - 16, 64, H - 90) + Math.sin(t * 4) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, by + 9); ctx.lineTo(sx - 8, by - 4); ctx.lineTo(sx + 8, by - 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(dist + 'm', sx, by - 10);
      ctx.fillText(dist + 'm', sx, by - 10);
    } else {
      const side = lat >= 0 ? 1 : -1;     // fora da tela: seta na lateral certa
      ctx.translate(side > 0 ? W - 28 : 28, H * 0.4);
      ctx.rotate(side > 0 ? 0 : Math.PI);
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(side > 0 ? 0 : -Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(dist + 'm', 0, -16);
      ctx.fillText(dist + 'm', 0, -16);
    }
    ctx.restore();
  },

  _fist(ctx, x, y, r) {
    const H = this._H;
    ctx.fillStyle = '#171b20';
    ctx.fillRect(x - r * 0.95, y, r * 1.9, H - y + 24);
    ctx.fillStyle = '#a85f3e';
    ctx.strokeStyle = '#633521';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.stroke();
  },

  // Mãos do protagonista: soco, guarda e escudo (o corpo nunca é desenhado)
  _drawHands(ctx, t) {
    if (Player.dead) return;
    const W = this._W, H = this._H, C = CFG.COMBAT;
    const moving = Player.onGround && Player.speed > 8;
    const bob = moving ? Math.sin(Player.anim) * 4 : Math.sin(t * 2) * 1.2;
    const blocking = Player.blocking;

    ctx.save();
    // mão esquerda
    this._fist(ctx, W * 0.38, (blocking ? H * 0.86 : H + 8) + bob * 0.6, 22);

    // mão direita (soco estica para a frente)
    if (Player.attackT >= 0) {
      const p = Player.attackT / C.attackDur;
      const e = Math.sin(Math.min(1, p / 0.7) * Math.PI);
      this._fist(ctx, W * (0.64 - 0.08 * e), (H + 8) + (H * 0.62 - H - 8) * e, 22 + e * 14);
    } else {
      this._fist(ctx, W * 0.62, (blocking ? H * 0.86 : H + 8) - bob * 0.6, 22);
    }

    if (blocking) {
      const bright = Player.blockFlash > 0;
      ctx.fillStyle = bright ? 'rgba(220,240,255,0.55)' : 'rgba(120,190,255,0.25)';
      ctx.strokeStyle = bright ? 'rgba(255,255,255,0.95)' : 'rgba(150,210,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.78, W * 0.17, H * 0.3, 0, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
};
