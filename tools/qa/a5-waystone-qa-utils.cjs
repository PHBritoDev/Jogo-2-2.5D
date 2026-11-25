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

function waypointStepBudget(distance, {
  metersPerSample = 0.16,
  minimum = 180,
  margin = 32,
  maximum = 1400
} = {}) {
  if (!Number.isFinite(distance) || distance < 0 ||
      !Number.isFinite(metersPerSample) || metersPerSample <= 0 ||
      !Number.isSafeInteger(minimum) || minimum < 1 ||
      !Number.isSafeInteger(margin) || margin < 0 ||
      !Number.isSafeInteger(maximum) || maximum < minimum) return 0;
  return Math.min(maximum, Math.max(minimum, Math.ceil(distance / metersPerSample) + margin));
}

module.exports = { isRuntimeAssetUrl, hasCompletedTouchLifecycle, waypointStepBudget };
