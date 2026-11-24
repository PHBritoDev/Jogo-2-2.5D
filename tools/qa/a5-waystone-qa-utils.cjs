'use strict';

function isRuntimeAssetUrl(value) {
  if (typeof value !== 'string') return false;
  return /(?:^|\/)[^/?#]+\.(?:glb|js)(?:[?#]|$)/i.test(value);
}

module.exports = { isRuntimeAssetUrl };
