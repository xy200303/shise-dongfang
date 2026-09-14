// 探查 GLB：每个网格在各图集格（8x4）内的 UV 顶点分布 + 抽出纹理 PNG
import { readFileSync, writeFileSync } from 'node:fs';

function parseGlb(path) {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  let off = 20 + jsonLen;
  let bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    if (type.startsWith('BIN')) bin = buf.subarray(off + 8, off + 8 + len);
    off += 8 + len;
  }
  return { json, bin };
}

function uvList(json, bin, accessorIdx) {
  const acc = json.accessors[accessorIdx];
  const bv = json.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = bv.byteStride ?? 8;
  const out = [];
  for (let i = 0; i < acc.count; i++) {
    const o = byteOffset + i * stride;
    out.push([bin.readFloatLE(o), bin.readFloatLE(o + 4)]);
  }
  return out;
}

for (const file of process.argv.slice(2)) {
  const { json, bin } = parseGlb(file);
  console.log('====', file);
  // 抽纹理
  const img = json.images?.[0];
  if (img?.bufferView !== undefined) {
    const bv = json.bufferViews[img.bufferView];
    const png = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const out = file.replace(/.*\//, '').replace('.glb', '.png');
    writeFileSync('scripts/' + out, png);
    console.log('texture -> scripts/' + out, png.length, 'bytes');
  }
  for (const node of json.nodes ?? []) {
    if (node.mesh === undefined) continue;
    const mesh = json.meshes[node.mesh];
    const counts = new Array(32).fill(0);
    let total = 0;
    for (const prim of mesh.primitives) {
      if (prim.attributes.TEXCOORD_0 === undefined) continue;
      for (const [u, v] of uvList(json, bin, prim.attributes.TEXCOORD_0)) {
        const c = Math.min(7, Math.floor(u * 8));
        const r = Math.min(3, Math.floor(v * 4));
        counts[r * 8 + c]++;
        total++;
      }
    }
    const used = counts
      .map((n, i) => ({ n, i }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .map((x) => `cell${x.i}(r${Math.floor(x.i / 8)}c${x.i % 8}):${((x.n / total) * 100).toFixed(1)}%`);
    console.log(`${node.name} verts=${total} ${used.join(' ')}`);
  }
}
