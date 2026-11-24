'use strict';

function isRuntimeAssetUrl(value) {
  if (typeof value !== 'string') return false;
  return /(?:^|\/)[^/?#]+\.(?:glb|js)(?:[?#]|$)/i.test(value);
}

function hasCompletedTouchLifecycle(events) {
  if (!Array.isArray(events)) return false;
  const downs = events.filter(event => event && event.type === 'pointerdown' && event.pointerType === 'touch');
  if (downs.length !== 1 || downs[0].pointerId == null || downs[0].ending !== false) return false;
  const pointerId = downs[0].pointerId;
  const releases = events.filter(event => event && ['pointerup', 'pointercancel'].includes(event.type));
  if (!releases.length || !releases.every(event =>
    event.pointerType === 'touch' && event.pointerId === pointerId && event.ending === true
  )) return false;
  return events.filter(event => event && event.type === 'lostpointercapture').every(event =>
    event.pointerType === 'touch' && event.pointerId === pointerId && event.ending === true
  );
}

module.exports = { isRuntimeAssetUrl, hasCompletedTouchLifecycle };
