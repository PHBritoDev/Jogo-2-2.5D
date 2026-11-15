// Caverna C2 — gera a malha 3D da rocha fora da thread principal (sem travar a entrada da caverna no celular).
import { buildCaveSurface, shadeCaveSurface } from './ascension-cave-sdf.js';
self.onmessage = e => {
  try {
    const r = buildCaveSurface({ cell: e.data && e.data.cell || 1 }), C = r.columns;
    Object.assign(r, shadeCaveSurface(r)); // C3: normais pelo campo + oclusão das reentrâncias
    self.postMessage({ ok: true, r }, [r.positions.buffer, r.indices.buffer, r.normals.buffer, r.ao.buffer, C.f.buffer, C.fl.buffer, C.rf.buffer]);
  } catch (err) { self.postMessage({ ok: false, error: String(err && err.message || err) }); }
};
