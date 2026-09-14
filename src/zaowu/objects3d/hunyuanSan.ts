/**
 * objects3d/hunyuanSan —— 「油纸伞·混元」：腾讯混元图生 3D 伞接入
 *
 * 模型 public/models/youzhisan.glb（scripts/slim-glb.mjs 离线瘦身：
 * weld+simplify 75k tris、贴图 1024 webp、meshopt、specular 扩展已撤）。
 * 槽位染色复用 svgdye 思路的像素版：baseColor 画入 canvas，按
 * public/models/youzhisan-mask.png（cluster-glb-tex.py，伞面=白/竹骨=黑的软 mask）
 * 分两族；预计算每像素 OKLab 明度与伞面权重一次，换色时
 * L_new = clamp(L_target + (L_px − L_族均值)) 保留明暗细节，C/H 取目标色，
 * 软 mask 边缘两族混色。单次染色 typed-array 快路径，<50ms。
 * 自动 UV 太碎，不支持纹样印花。
 */
import type { BuiltObject } from './types';

type THREE = typeof import('three');

const MODEL_URL = `${import.meta.env.BASE_URL}models/youzhisan.glb`;
const MASK_URL = `${import.meta.env.BASE_URL}models/youzhisan-mask.png`;
const TEX = 1024;

/** 线性与 sRGB 互转查找表（gamma 快路径） */
const gammaLUT = new Uint8ClampedArray(4096);
for (let i = 0; i < 4096; i++) {
  const c = i / 4095;
  gammaLUT[i] = Math.round(
    255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055),
  );
}
const gam = (v: number) =>
  gammaLUT[v <= 0 ? 0 : v >= 1 ? 4095 : (v * 4095) | 0];

/** sRGB 字节 → 线性 */
function toLin(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

interface Target {
  l: number;
  a: number;
  b: number;
}

function hexToOklab(hex: string): Target {
  const v = parseInt(hex.slice(1), 16);
  const r = toLin((v >> 16) & 255);
  const g = toLin((v >> 8) & 255);
  const b = toLin(v & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** OKLab → sRGB 字节（写三个通道） */
function oklabToSrgb(L: number, a: number, b: number, out: Uint8ClampedArray, o: number): void {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  out[o] = gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  out[o + 1] = gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  out[o + 2] = gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
}

export async function buildHunYuanSan(
  T: THREE,
  colors: Record<string, string>,
): Promise<BuiltObject> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');

  const [gltf, maskImg] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL),
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('mask 加载失败'));
      img.src = MASK_URL;
    }),
  ]);

  const group = gltf.scene;
  const meshes: import('three').Mesh[] = [];
  group.traverse((n) => {
    const m = n as import('three').Mesh;
    if (m.isMesh) meshes.push(m);
  });
  const mesh = meshes[0];
  if (!mesh) throw new Error('模型无网格');
  const mat = mesh.material as import('three').MeshStandardMaterial;
  if (!mat.map?.image) throw new Error('模型缺少 baseColor 贴图');
  const srcTex = mat.map;

  /* ---------- 源图与 mask 读入 ---------- */
  const N = TEX * TEX;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcCanvas.height = TEX;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) throw new Error('canvas 不可用');
  sctx.drawImage(srcTex.image as CanvasImageSource, 0, 0, TEX, TEX);
  const srcData = sctx.getImageData(0, 0, TEX, TEX).data;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = TEX;
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) throw new Error('canvas 不可用');
  mctx.drawImage(maskImg, 0, 0, TEX, TEX);
  const maskData = mctx.getImageData(0, 0, TEX, TEX).data;

  /* ---------- 预计算：每像素伞面权重 + OKLab 明度；两族均值明度 ---------- */
  const wCanopy = new Float32Array(N);
  const lum = new Float32Array(N);
  let sumC = 0, wC = 0, sumB = 0, wB = 0;
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const r = toLin(srcData[o]);
    const g = toLin(srcData[o + 1]);
    const b = toLin(srcData[o + 2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const w = maskData[o] / 255;
    wCanopy[i] = w;
    lum[i] = L;
    sumC += w * L;
    wC += w;
    sumB += (1 - w) * L;
    wB += 1 - w;
  }
  const meanC = wC > 0 ? sumC / wC : 0.85;
  const meanB = wB > 0 ? sumB / wB : 0.35;

  /* ---------- 染色画布替换材质贴图（flipY 与原 GLB 贴图一致） ---------- */
  const dyeCanvas = document.createElement('canvas');
  dyeCanvas.width = dyeCanvas.height = TEX;
  const dctx = dyeCanvas.getContext('2d');
  if (!dctx) throw new Error('canvas 不可用');
  const dyeImg = dctx.createImageData(TEX, TEX);
  const tex = new T.CanvasTexture(dyeCanvas);
  tex.flipY = srcTex.flipY;
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = srcTex.wrapS;
  tex.wrapT = srcTex.wrapT;
  mat.map = tex;
  mat.needsUpdate = true;

  // 姿态：绕 Z 微倾更有味道
  group.rotation.z = -0.18;

  const update = (c: Record<string, string>) => {
    const t0 = performance.now();
    // 伞面取主色、伞骨取色系色（族内明度偏移保留绢面/竹纹明暗）
    const tc = hexToOklab(c.canopy ?? '#A85858');
    const tb = hexToOklab(c.rib ?? '#6B4A32');
    const d = dyeImg.data;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      const w = wCanopy[i];
      const L = lum[i];
      let l = Math.min(1, Math.max(0, tc.l + (L - meanC)));
      let a = tc.a;
      let b = tc.b;
      if (w < 1) {
        // 竹骨（或与伞面交界）：按竹骨色换算，再按权重混
        const l2 = Math.min(1, Math.max(0, tb.l + (L - meanB)));
        l = l * w + l2 * (1 - w);
        a = a * w + tb.a * (1 - w);
        b = b * w + tb.b * (1 - w);
      }
      oklabToSrgb(l, a, b, d, o);
      d[o + 3] = 255;
    }
    dctx.putImageData(dyeImg, 0, 0);
    tex.needsUpdate = true;
    if (import.meta.env.DEV) console.debug(`[混元伞] 单次染色 ${(performance.now() - t0).toFixed(1)}ms`);
  };
  update(colors);

  return {
    group,
    update,
    setLit() {},
    dispose() {
      mesh.geometry.dispose();
      tex.dispose();
      srcTex.dispose();
      mat.dispose();
    },
  };
}
