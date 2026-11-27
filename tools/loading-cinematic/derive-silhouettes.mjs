/**
 * Deriva as versões de SILHUETA dos antagonistas/NPC para a abertura do carregamento (Mod 374).
 * Fonte: os GLBs reais do jogo. A tela só mostra sombras, então as texturas são descartadas; a malha é simplificada,
 * quantizada e fica só com os clipes usados na cena. Nada é inventado: geometria, esqueleto e animação vêm do original.
 *
 * Uso (a partir da raiz do repositório, com @gltf-transform/* e meshoptimizer instalados num diretório de ferramentas):
 *   NODE_PATH=<tools>/node_modules node tools/loading-cinematic/derive-silhouettes.mjs
 */
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
const require = createRequire(import.meta.url);
const R = p => require(require.resolve(p, { paths: [process.env.NODE_PATH || process.cwd()] }));
const { NodeIO } = R('@gltf-transform/core');
const { ALL_EXTENSIONS } = R('@gltf-transform/extensions');
const { prune, dedup, weld, simplify, quantize, resample, meshopt, normals } = R('@gltf-transform/functions');
const { MeshoptSimplifier, MeshoptEncoder } = R('meshoptimizer');

export const SOURCES = [
  // Mod 375: além da caminhada, os clipes REAIS de combate usados no Campo da Última Guerra (loading-battle3d.js)
  { src: 'NewGanancia1.glb', out: 'assets/loading/ganancia-silhueta.glb', clips: ['Walking', 'Idle_14', 'Triple_Combo_Attack', 'Weapon_Combo', 'Double_Combo_Attack'], ratio: .18 },
  // fase II (asas por ossos, como em greed-boss3d.js gkPrepareB/gkSynthB): só a postura de voo e o gesto de conjuração
  { src: 'NewGanancia2.glb', out: 'assets/loading/ganancia2-silhueta.glb', clips: ['Dive_Down_and_Land_2', 'Arise'], ratio: .16 },
  { src: 'VHAZRAEL.glb', out: 'assets/loading/bispo1-silhueta.glb', clips: ['Walking', 'Axe_Spin_Attack', 'Triple_Combo_Attack', 'mage_soell_cast_7'], ratio: .18 },
  { src: 'NewBispo2_Otimizado.glb', out: 'assets/loading/bispo2-silhueta.glb', clips: ['Walking', 'Double_Blade_Spin', 'Triple_Combo_Attack', 'Attack'], ratio: .18 },
  { src: 'NewBispo3.glb', out: 'assets/loading/bispo3-silhueta.glb', clips: ['Walking', 'Weapon_Combo', 'Axe_Spin_Attack', 'Skill_03'], ratio: .18 },
  { src: 'NewBispo4.glb', out: 'assets/loading/bispo4-silhueta.glb', clips: ['Walking', 'Idle_14'], ratio: .18 },
  { src: 'NPC_Masculino_Animado_Otimizado_1K.glb', out: 'assets/loading/npc-adulto-silhueta.glb', clips: ['Walking', 'falling_down', 'Running', 'Alert', 'Regular_Jump', 'Triple_Combo_Attack', 'Arise'], ratio: .2 },
  // protagonista em miniatura que corre junto da barra de progresso (mesma malha/esqueleto/corrida do jogo)
  { src: 'Prota_otimizado_2K.glb', out: 'assets/loading/protagonista-mini.glb', clips: ['Running'], ratio: .12 }
];

await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
for (const s of SOURCES) {
  const doc = await io.read(s.src);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!s.clips.includes(a.getName())) a.dispose();
  for (const m of root.listMaterials()) { m.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null).setOcclusionTexture(null); }
  for (const t of root.listTextures()) t.dispose();
  // sem textura, UV/cor/tangente e normais duplicadas só criam costuras (normais são recalculadas suaves depois) que impedem a solda/simplificação
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) for (const sem of prim.listSemantics()) if (/^(TEXCOORD|COLOR|TANGENT|NORMAL)/.test(sem)) prim.setAttribute(sem, null);
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'EXT_texture_webp') ext.dispose();
  await doc.transform(
    dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: s.ratio, error: .004, lockBorder: false }),
    normals({ overwrite: true }), resample(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' })
  );
  await io.write(s.out, doc);
  console.log(s.out, (statSync(s.out).size / 1048576).toFixed(2) + ' MB', 'clips:', root.listAnimations().map(a => a.getName()).join(','));
}
