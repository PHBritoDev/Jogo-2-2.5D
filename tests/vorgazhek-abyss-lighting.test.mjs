import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getVorgazhekLighting } from '../vorgazhek-abyss-dimension3d.js';

const source = readFileSync(new URL('../vorgazhek-abyss-dimension3d.js', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../tools/visual-lab/vorgazhek-abyss-preview.html', import.meta.url), 'utf8');
const runtimeQA = readFileSync(new URL('../tools/visual-lab/vorgazhek-runtime-qa.cjs', import.meta.url), 'utf8');
const world = readFileSync(new URL('../mundo-3d-prototype.js', import.meta.url), 'utf8');
const updateVoidStart = world.indexOf('function updateVoid(dt,now){');
const updateVoidEnd = world.indexOf('// ---------- Etapas ----------', updateVoidStart);
const updateVoidSource = updateVoidStart >= 0 && updateVoidEnd > updateVoidStart
  ? world.slice(updateVoidStart, updateVoidEnd)
  : '';

test('VORGAZHEK gets a stronger local fill while the abyss and exposure stay dark', () => {
  const env = getVorgazhekLighting(85);
  assert.equal(env.bg, 0x000000);
  assert.equal(env.fog, 0x010102);
  assert.ok(Math.abs(env.fogNear - 59.5) < 1e-9);
  assert.ok(Math.abs(env.fogFar - 229.5) < 1e-9);
  assert.deepEqual(env.hemi, [0xa3abb1, 0x030304, 1.1]);
  assert.deepEqual(env.sun, [0xc1cad1, .48]);
  assert.deepEqual(env.light, [0xe7e7ec, 8, 170, [0, 8, 7]]);
  assert.equal(env.exposure, 1.12);
});

test('VORGAZHEK lighting remains a fixed three-source setup without new lights or shadows', () => {
  assert.doesNotMatch(source, /new T\.(?:PointLight|DirectionalLight|HemisphereLight)/);
  const env = getVorgazhekLighting(85);
  assert.equal(env.hemi.length, 3);
  assert.equal(env.sun.length, 2);
  assert.equal(env.light.length, 4);
});


test('water adds a camera-local grazing reflection without allocating another scene light', () => {
  assert.ok(source.includes('uCamera:{value:new T.Vector3(0,8,12)}'));
  assert.ok(source.includes('uniform vec3 uCamera;'));
  assert.ok(source.includes('vec3 viewDelta=vec3(uCamera.xy-p,uCamera.z);'));
  assert.ok(source.includes('float invViewDistance=inversesqrt(max(dot(viewDelta,viewDelta),.000001));'));
  assert.ok(source.includes('float viewCos=clamp(abs(uCamera.z)*invViewDistance,0.0,1.0);'));
  assert.ok(source.includes('float fresnel=grazing*grazing*grazing;'));
  assert.doesNotMatch(source, /float viewDistance=max\(length\(vec3\(uCamera\.xy-p,uCamera\.z\)\),\.001\)/);
  assert.doesNotMatch(source, /pow\(1\.0-viewCos,3\.0\)/);
  assert.ok(source.includes('float glancingReflection=fresnel*(.02+ribbons*.1375+silverPatch*.0625+gleam*.20);'));
  assert.ok(source.includes('water.uniforms.uCamera.value.set(cameraPos.x,-cameraPos.z,cameraPos.y)'));
  assert.doesNotMatch(source, /new T\.(?:PointLight|DirectionalLight|HemisphereLight)/);
});

test('abyss preview consumes the exact production lighting preset', () => {
  assert.match(preview, /const e=arena\.env/);
  assert.match(preview, /new THREE\.HemisphereLight\(\.\.\.e\.hemi\)/);
  assert.match(preview, /new THREE\.DirectionalLight\(\.\.\.e\.sun\)/);
  assert.match(preview, /new THREE\.PointLight\(e\.light\[0\],e\.light\[1\],e\.light\[2\],1\.1\)/);
  assert.doesNotMatch(preview, /new THREE\.PointLight\(0xdadce6,35,180\)/);
});


test('production updateVoid applies the VORGAZHEK preset to the existing shared lights', () => {
  assert.ok(updateVoidSource, 'production updateVoid function must be present');
  assert.match(updateVoidSource, /const e=arena\.env/);
  assert.match(updateVoidSource, /scene\.background\.setHex\(e\.bg\)/);
  assert.match(updateVoidSource, /scene\.fog\.color\.setHex\(e\.fog\)/);
  assert.match(updateVoidSource, /hemiLight\.intensity=e\.hemi\[2\]/);
  assert.match(updateVoidSource, /sunLight\.intensity=e\.sun\[1\]/);
  assert.match(updateVoidSource, /dimLight\.intensity=e\.light\[1\][\s\S]*?dimLight\.distance=e\.light\[2\]/);
  assert.match(updateVoidSource, /else dimLight\.position\.set\(voidSpec\.x\+e\.light\[3\]\[0\],voidSpec\.y\+e\.light\[3\]\[1\],voidSpec\.z\+e\.light\[3\]\[2\]\)/);
});

test('runtime QA records landscape video at fixed size and captures portrait separately', () => {
  assert.match(runtimeQA, /browser\.newContext\(\{viewport:\{width:393,height:852\},deviceScaleFactor:1\}\)/);
  assert.doesNotMatch(runtimeQA, /page\.setViewportSize/);
  assert.match(runtimeQA, /report\.portraitState=/);
});

test('mobile Fresnel arithmetic preserves the previous angle response', () => {
  const reference = (x,y,z) => {
    const distance = Math.max(Math.hypot(x,y,z), .001);
    const cosine = Math.max(0, Math.min(1, Math.abs(z) / distance));
    return Math.pow(1 - cosine, 3);
  };
  const optimized = (x,y,z) => {
    const inverseDistance = 1 / Math.sqrt(Math.max(x*x + y*y + z*z, .000001));
    const cosine = Math.max(0, Math.min(1, Math.abs(z) * inverseDistance));
    const grazing = 1 - cosine;
    return grazing * grazing * grazing;
  };
  for (const x of [-110,-50,-5,0,5,50,110]) {
    for (const y of [-110,-25,0,25,110]) {
      for (const z of [.001,3.5,8,30]) {
        assert.ok(Math.abs(reference(x,y,z)-optimized(x,y,z)) < 1e-12);
      }
    }
  }
});
