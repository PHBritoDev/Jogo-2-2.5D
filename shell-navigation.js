export function worldURL(search, build) {
  const params = new URLSearchParams(search);
  params.delete('resetGalaxy1');
  params.set('build', build);
  params.set('refresh', build);
  return './mundo-3d-prototype.html?' + params;
}
