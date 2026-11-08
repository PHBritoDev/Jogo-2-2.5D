/**
 * MOD 292 — causa concreta das "casas que mudam de cor ao longe" em Eldória.
 *
 * Os GLBs da cidade (casas, loja, ferreiro, poço, barracas, árvore ancestral, ponte, passarela…) usam UMA textura
 * assada 2048² com centenas de ilhas UV pequenas e coladas (madeira marrom, reboco branco, musgo verde lado a lado).
 * O mipmap comum faz média de blocos cada vez maiores: a partir do nível 4–5 cada texel mistura várias ilhas e a casa
 * vira uma mancha cáqui-acinzentada (média do atlas ≈ RGB 98/90/67). Perto (níveis 0–2) as ilhas aparecem certas — por
 * isso a casa "muda de cor" quando o jogador se aproxima. Não era troca de material do LOD (isso já foi provado
 * igual por amostragem de UV), nem espaço de cor (GLTFLoader marca o baseColor como sRGB).
 *
 * Correção: limitar o nível de mip lido NESSAS texturas (textureLod com o LOD calculado pelas derivadas e
 * travado em `maxLod`). Mantém a filtragem trilinear/anisotrópica perto e preserva as cores longe; o custo é um
 * leve cintilar em distância grande, preferível à cor errada. Só altera materiais marcados (não mexe no resto).
 */
const CHUNKS = [
  ['map_fragment', 'texture2D( map, vMapUv )', 'map', 'vMapUv'],
  ['normal_fragment_maps', 'texture2D( normalMap, vNormalMapUv )', 'normalMap', 'vNormalMapUv'],
  ['roughnessmap_fragment', 'texture2D( roughnessMap, vRoughnessMapUv )', 'roughnessMap', 'vRoughnessMapUv'],
  ['metalnessmap_fragment', 'texture2D( metalnessMap, vMetalnessMapUv )', 'metalnessMap', 'vMetalnessMapUv'],
  ['emissivemap_fragment', 'texture2D( emissiveMap, vEmissiveMapUv )', 'emissiveMap', 'vEmissiveMapUv'],
  ['aomap_fragment', 'texture2D( aoMap, vAoMapUv )', 'aoMap', 'vAoMapUv'],
];
const HELPER = `
uniform float uBakedMaxLod;
vec4 bakedLod( sampler2D s, vec2 uv ) {
  vec2 sz = vec2( textureSize( s, 0 ) ), dx = dFdx( uv * sz ), dy = dFdy( uv * sz );
  float lod = 0.5 * log2( max( max( dot( dx, dx ), dot( dy, dy ) ), 1e-8 ) );
  return textureLod( s, uv, clamp( lod, 0.0, uBakedMaxLod ) );
}`;

/** Aplica o limite de mip a um material (idempotente, encadeia onBeforeCompile existente). */
export function clampBakedMaterial(THREE, material, maxLod = 3) {
  if (!material || material.userData.bakedMaxLod !== undefined || !material.map) return false;
  material.userData.bakedMaxLod = maxLod;
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    if (renderer && renderer.capabilities && renderer.capabilities.isWebGL2 === false) return; // textureLod/textureSize exigem GLSL 3
    shader.uniforms.uBakedMaxLod = { value: maxLod };
    let fs = shader.fragmentShader.replace('#include <common>', '#include <common>' + HELPER);
    for (const [chunk, call, sampler, uv] of CHUNKS) {
      const src = THREE.ShaderChunk[chunk]; if (!src || !src.includes(call)) continue;
      fs = fs.replace('#include <' + chunk + '>', src.split(call).join(`bakedLod( ${sampler}, ${uv} )`));
    }
    shader.fragmentShader = fs;
  };
  const key = prevKey ? prevKey.call(material) : '';
  material.customProgramCacheKey = () => key + '|baked-lod' + maxLod;
  material.needsUpdate = true;
  return true;
}

/** Percorre um objeto (cena de GLB) e limita o mip das texturas assadas. Retorna quantos materiais mudaram. */
export function clampBakedMips(THREE, root, maxLod = 3) {
  let n = 0; const seen = new Set();
  root.traverse(o => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { if (seen.has(m)) continue; seen.add(m); if (clampBakedMaterial(THREE, m, maxLod)) n++; } });
  return n;
}
