import { impactFragments } from './skill-impact3d.js';
import { softParticles, groundDecals, groundNormal, groundShatter, hash } from './celestial-fxkit3d.js?v=mod240-vfx-integrated';
import { energyBody, ENERGY_PALETTES } from './vfx-flow3d.js?v=mod240-vfx-integrated';

/** Consumes collision records without deciding damage. Fixed reusable slots and 3D tectonic impact shatter. */
export function impactDirector(T, parent, ground, { capacity = 6, onImpact = () => {} } = {}) {
  const root = new T.Group();
  parent.add(root);
  const debris = impactFragments(T, root, ground, 240);
  const shatter = groundShatter(T, root, 96);
  const dust = softParticles(T, 96, { additive: false });
  const embers = softParticles(T, 160);
  const light = groundDecals(T, capacity * 3);
  root.add(dust.mesh, embers.mesh, light.mesh);
  const slots = Array.from({ length: capacity }, (_, i) => ({
    id: null, time: -99, point: { x: 0, y: 0, z: 0 }, size: 1,
    preset: 'cinder', kind: 'ball', dir: { x: 0, y: 1, z: 0 },
    body: energyBody(T, root, 'cinder', { rings: 30, sides: 20, tail: 1.3, seed: i })
  }));
  for (const s of slots) s.body.mesh.visible = false;
  let head = 0;
  const seen = new Set(), normal = [0, 1, 0];
  return {
    root,
    emit({ id, time, point, size = 2, preset = 'cinder', kind = 'ball', dir = { x: 0, y: 1, z: 0 } }) {
      if (seen.has(id)) return false;
      seen.add(id);
      if (seen.size > 64) seen.delete(seen.values().next().value);
      const s = slots[head++ % capacity];
      Object.assign(s, { id, time, size, preset, kind, seed: head });
      Object.assign(s.point, point);
      Object.assign(s.dir, dir);
      s.body.material.uniforms.celestial.value = preset === 'celestial' ? 1 : 0;
      const pal = ENERGY_PALETTES[preset] || ENERGY_PALETTES.crimson;
      for (const k of ['deep', 'body', 'hot']) s.body.material.uniforms[k].value.setRGB(...pal[k]);
      onImpact({ point, size, kind });
      return true;
    },
    update(time, quality = 1) {
      debris.begin(); shatter.begin(); dust.begin(); embers.begin(); light.begin();
      const low = quality === 0;
      for (const s of slots) {
        const age = time - s.time;
        s.body.mesh.visible = age >= 0 && age < .8;
        if (age < 0 || age > 1.8) continue;
        const p = s.point, pal = ENERGY_PALETTES[s.preset] || ENERGY_PALETTES.crimson, C = pal.body;
        const fade = Math.max(0, 1 - age / 1.8);
        const grow = 1 - Math.pow(1 - Math.min(1, age / .35), 3);
        const r = s.size * (.14 + .86 * grow);
        if (age < .8) {
          s.body.update(time, {
            position: p, dir: s.dir, radius: r,
            length: r * (s.kind === 'x' ? .19 : .48),
            alpha: .82 * Math.max(0, 1 - age / .8), quality,
            dissolve: Math.max(0, (age - .24) / .56)
          });
        }
        const mode = s.kind === 'x' ? 'x' : 'radial';
        debris.add(p, age, s.size, C, s.seed + s.time, mode, low);
        const gy = ground(p.x, p.z);
        if (p.y - gy < 5) {
          const nrm = groundNormal(ground, p.x, p.z, normal);
          shatter.addCrater(p.x, gy, p.z, age, 1.45, s.size * .72, C[0], C[1], C[2], s.seed, mode, low);
          light.add(p.x, gy, p.z, s.size * .95, C[0], C[1], C[2], Math.max(0, 1 - age / 1.65) * .95, 1, age * .6, s.seed, nrm, s.seed);
          if (age < .55) {
            const u = age / .55;
            light.add(p.x, gy, p.z, s.size * (.35 + 1.15 * u), C[0], C[1], C[2], (1 - u) * .9, 0, u, s.seed + 3, nrm);
          }
        }
        for (let i = 0; i < (low ? 12 : 24); i++) {
          const a = i * 2.39996 + s.time, sp = s.size * (1 + hash(i + 7)), d = sp * age;
          embers.add(p.x + Math.cos(a) * d, p.y + Math.sin(i * 3.1) * d * .45 + age * .7 - age * age * 2, p.z + Math.sin(a) * d, .06, .28, ...C, fade * .85, 3, a, i);
        }
        for (let i = 0; i < (low ? 4 : 7); i++) {
          const a = i * 2.4, d = s.size * (.3 + age * .6);
          dust.add(p.x + Math.cos(a) * d, gy + .25 + age * 1.3, p.z + Math.sin(a) * d,
            s.size * .48 + age * .7, s.size * .35 + age * .5,
            C[0] * .4, C[1] * .2, C[2] * .2, Math.min(.55, age * 1.4) * fade, 1, a, i);
        }
      }
      debris.end(); shatter.end(); dust.end(); embers.end(); light.end(time);
    },
    clear() {
      seen.clear();
      for (const s of slots) { s.time = -99; s.body.mesh.visible = false; }
      debris.begin(); debris.end();
      shatter.begin(); shatter.end();
      dust.begin(); dust.end();
      embers.begin(); embers.end();
      light.begin(); light.end();
    },
    stats: () => ({ capacity, slots: slots.filter(s => s.body.mesh.visible).length }),
    dispose() {
      parent.remove(root);
      debris.dispose(); shatter.dispose(); dust.dispose(); embers.dispose(); light.dispose();
      for (const s of slots) s.body.dispose();
    }
  };
}
