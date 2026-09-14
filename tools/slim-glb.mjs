// 混元伞 GLB 离线瘦身：weld → simplify(~0.25) → 修 specular → 贴图 1024/webp → meshopt
// 用法：node scripts/slim-glb.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  weld,
  simplify,
  textureCompress,
  prune,
  dedup,
  meshopt,
  draco,
} from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'docs/task02/miora/3d/伞.glb';
const DST = 'public/models/youzhisan.glb';

await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready, MeshoptDecoder.ready]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
const doc = await io.read(SRC);
const root = doc.getRoot();

// 撤掉 KHR_materials_specular：specularColorFactor [2,2,2] 会塑料感反光
for (const mat of root.listMaterials()) {
  const spec = mat.getExtension('KHR_materials_specular');
  if (spec) {
    mat.setExtension('KHR_materials_specular', null);
    spec.dispose();
  }
}

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.001 }),
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  meshopt({ encoder: MeshoptEncoder, decoder: MeshoptDecoder, level: 'medium' }),
);

await io.write(DST, doc);

const { readFileSync, statSync } = await import('node:fs');
const buf = readFileSync(DST);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
let tris = 0;
for (const mesh of json.meshes ?? []) {
  for (const prim of mesh.primitives) {
    const acc = json.accessors[prim.indices];
    if (acc) tris += acc.count / 3;
  }
}
console.log('written', DST, (statSync(DST).size / 1024 / 1024).toFixed(2), 'MB,', Math.round(tris), 'tris');
console.log('extensionsUsed:', json.extensionsUsed);
