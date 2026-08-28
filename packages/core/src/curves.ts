/**
 * 色相分区与采样曲线。
 *
 * 参考 tvision-color 的思路：不同色相在「最浅」与「最深」处能承载的彩度不同
 * （黄色深处发脏、蓝色可以压得很深），因此按 11 个色相分区分别配置：
 *  - 明度采样区间 [lLight, lDeep]
 *  - 一条三次贝塞尔缓动曲线（控制过渡节奏，让中间级更细腻）
 *  - 每级彩度缩放系数（浅级收敛防发灰、中级饱满、深级回落防过曝）
 */

export interface HueZone {
  name: string;
  /** 色相区间（OKLCH hue，角度制，支持跨 0°） */
  range: [number, number];
  /** 亮色模式：第 1 级（最浅）明度 */
  lLight: number;
  /** 亮色模式：第 10 级（最深）明度 */
  lDeep: number;
  /** 明度缓动贝塞尔控制点 y1, y2（x 固定 1/3、2/3，t 为级位置 0..1） */
  ease: [number, number];
  /** 每级彩度缩放（亮色模式） */
  chromaScale: number[];
  /** 彩度上限（防止黄色系等在高明度处溢出后过渡断层） */
  chromaCap: number;
  /** 暗色模式彩度收敛系数（按色相分桶：黄色系在深色底上易发闷，收敛更多） */
  darkChroma: number;
  /**
   * 色相漂移（hue arc）：由浅到深累计偏转角度。
   * 顶级手工色阶（Radix/Tailwind）的共同特征——黄色变深偏向橙红防发闷、
   * 蓝色深处偏紫更醇厚。浅级几乎不动，深级偏转最多。
   */
  hueShift: number;
}

/** 亮→暗通用的彩度节奏：两端收敛，第 7 级（index 6）最饱满 */
const CHROMA_BASE = [0.2, 0.34, 0.5, 0.66, 0.82, 0.96, 1.05, 0.98, 0.85, 0.66];

function scale(k: number): number[] {
  return CHROMA_BASE.map((v) => +(v * k).toFixed(3));
}

export const HUE_ZONES: HueZone[] = [
  { name: 'red', range: [345, 15], lLight: 0.965, lDeep: 0.32, ease: [0.35, 0.75], chromaScale: scale(1), chromaCap: 0.24, darkChroma: 0.9, hueShift: -4 },
  { name: 'orange', range: [15, 45], lLight: 0.965, lDeep: 0.35, ease: [0.35, 0.75], chromaScale: scale(0.95), chromaCap: 0.2, darkChroma: 0.88, hueShift: -7 },
  { name: 'yellow', range: [45, 75], lLight: 0.97, lDeep: 0.42, ease: [0.38, 0.78], chromaScale: scale(0.9), chromaCap: 0.17, darkChroma: 0.78, hueShift: -14 },
  { name: 'lemon', range: [75, 95], lLight: 0.97, lDeep: 0.45, ease: [0.4, 0.8], chromaScale: scale(0.85), chromaCap: 0.16, darkChroma: 0.75, hueShift: -12 },
  { name: 'lime', range: [95, 125], lLight: 0.97, lDeep: 0.42, ease: [0.4, 0.78], chromaScale: scale(0.9), chromaCap: 0.2, darkChroma: 0.82, hueShift: -8 },
  { name: 'green', range: [125, 160], lLight: 0.965, lDeep: 0.36, ease: [0.36, 0.76], chromaScale: scale(1), chromaCap: 0.21, darkChroma: 0.9, hueShift: 4 },
  { name: 'mint', range: [160, 185], lLight: 0.965, lDeep: 0.34, ease: [0.36, 0.76], chromaScale: scale(0.95), chromaCap: 0.18, darkChroma: 0.86, hueShift: 5 },
  { name: 'cyan', range: [185, 215], lLight: 0.965, lDeep: 0.32, ease: [0.35, 0.75], chromaScale: scale(0.95), chromaCap: 0.16, darkChroma: 0.88, hueShift: 6 },
  { name: 'blue', range: [215, 260], lLight: 0.965, lDeep: 0.27, ease: [0.33, 0.74], chromaScale: scale(1), chromaCap: 0.2, darkChroma: 0.95, hueShift: 8 },
  { name: 'purple', range: [260, 300], lLight: 0.965, lDeep: 0.28, ease: [0.33, 0.74], chromaScale: scale(0.95), chromaCap: 0.22, darkChroma: 0.92, hueShift: 6 },
  { name: 'pink', range: [300, 345], lLight: 0.965, lDeep: 0.32, ease: [0.35, 0.75], chromaScale: scale(0.95), chromaCap: 0.22, darkChroma: 0.9, hueShift: 8 },
];

/** 暗色模式：明度区间整体镜像（第 1 级为深色底上的弱着色，第 10 级为亮色强调） */
export const DARK_L_LIGHT = 0.2;
export const DARK_L_DEEP = 0.9;

/** 暗色模式彩度节奏：中级之后保持饱满，保证深色底上的辨识度 */
export const DARK_CHROMA_SCALE = [0.3, 0.42, 0.56, 0.7, 0.85, 0.97, 1.04, 0.98, 0.86, 0.7];

/** 暗色模式明度缓动 */
export const DARK_EASE: [number, number] = [0.3, 0.72];

export function findZone(hue: number): HueZone {
  const h = ((hue % 360) + 360) % 360;
  for (const zone of HUE_ZONES) {
    const [from, to] = zone.range;
    if (from <= to ? h >= from && h < to : h >= from || h < to) return zone;
  }
  return HUE_ZONES[8]; // blue fallback
}

/** 三次贝塞尔缓动（P0=0, P3=1，控制点 x 固定在 1/3 与 2/3），返回 0..1 的进度 */
export function easeProgress(t: number, y1: number, y2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
}
