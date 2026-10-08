'use strict';

/*
 * Dados visuais dos inimigos por território.
 * Cada território reserva um inimigo comum e um Mini-Líder, sem acoplar
 * identidade visual às regras de combate. O único recurso ativo por enquanto
 * é o inimigo comum do território 1.
 */
const TERRITORY_ENEMY_PROFILES = Object.freeze({
  1: Object.freeze({
    common: Object.freeze({
      id: 'enemy-1',
      asset: './Enemy1-sprite.png',
      displayHeight: 84
    }),
    miniLeader: Object.freeze({
      id: 'mini-leader-1',
      asset: null,
      scale: 2
    })
  }),
  2: Object.freeze({
    common: Object.freeze({ id: 'enemy-2', asset: null, displayHeight: 84 }),
    miniLeader: Object.freeze({ id: 'mini-leader-2', asset: null, scale: 2 })
  }),
  3: Object.freeze({
    common: Object.freeze({ id: 'enemy-3', asset: null, displayHeight: 84 }),
    miniLeader: Object.freeze({ id: 'mini-leader-3', asset: null, scale: 2 })
  }),
  4: Object.freeze({
    common: Object.freeze({ id: 'enemy-4', asset: null, displayHeight: 84 }),
    miniLeader: Object.freeze({ id: 'mini-leader-4', asset: null, scale: 2 })
  })
});

const TerritoryEnemyVisuals = {
  images: Object.create(null),

  profile(territoryId) {
    return TERRITORY_ENEMY_PROFILES[territoryId] || null;
  },

  activeTerritoryId() {
    if (typeof Campaign !== 'undefined' && Number.isInteger(Campaign.enemyTerritory)) {
      return Campaign.enemyTerritory;
    }
    return 1;
  },

  commonHeight() {
    const profile = this.profile(this.activeTerritoryId());
    return profile && profile.common && profile.common.asset
      ? profile.common.displayHeight
      : 0;
  },

  commonImage(common) {
    if (!common || !common.asset) return null;

    if (!this.images[common.id]) {
      const image = new Image();
      image.onerror = function () {
        console.error('Não foi possível carregar o visual do inimigo:', common.asset);
      };
      image.src = common.asset;
      this.images[common.id] = image;
    }

    const image = this.images[common.id];
    return image.complete && image.naturalWidth > 0 ? image : null;
  },

  drawCommon(ctx, enemy, bob) {
    const territory = this.profile(this.activeTerritoryId());
    const common = territory && territory.common;
    const image = this.commonImage(common);
    if (!image) return false;

    const height = common.displayHeight;
    const width = height * (image.naturalWidth / image.naturalHeight);

    ctx.save();
    ctx.translate(0, -(bob || 0));
    if (enemy.fx < -0.05) ctx.scale(-1, 1);
    ctx.drawImage(image, -width / 2, -height, width, height);

    if (enemy.flashT > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(-width / 2, -height, width, height);
    }
    ctx.restore();
    return true;
  }
};
