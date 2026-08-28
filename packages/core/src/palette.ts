import { clampChroma, converter, differenceCiede2000, formatHex, parse } from './culori';
import type { Oklch } from './culori';
import { chromaBudget, maxChroma } from './gamut';
import { hkAdjustment } from './hk';
import {
  DARK_CHROMA_SCALE,
  DARK_EASE,
  DARK_L_DEEP,
  DARK_L_LIGHT,
  easeProgress,
  findZone,
  type HueZone,
} from './curves';
import type { PaletteOptions, PaletteResult } from './types';

const toOklch = converter('oklch');
const deltaE = differenceCiede2000();

/** 输入接近无色时借用的中性色相（TDesign 蓝灰方向） */
const FALLBACK_HUE = 255;
/** 输入彩度过低时的兜底彩度，保证色阶仍有色彩倾向 */
const FALLBACK_CHROMA = 0.012;

export interface BaseColor {
  l: number;
  c: number;
  h: number;
  neutral: boolean;
  raw: NonNullable<ReturnType<typeof parse>>;
}

/** 解析任意 CSS 颜色为 OKLCH 基准，低彩度输入按中性色处理 */
export function resolveBase(input: string): BaseColor {
  const parsed = parse(input);
  if (!parsed) {
    throw new Error(`[palette-studio] 无法解析颜色: "${input}"`);
  }
  const ok = toOklch(parsed) as Oklch;
  const c = ok.c ?? 0;
  const neutral = c < 0.005 || ok.h === undefined || Number.isNaN(ok.h);
  return {
    l: ok.l ?? 0,
    c: neutral ? FALLBACK_CHROMA : c,
    h: neutral ? FALLBACK_HUE : (ok.h as number),
    neutral,
    raw: parsed,
  };
}

function buildScale(zone: HueZone, h: number, baseChroma: number, dark: boolean): string[] {
  const levels: Oklch[] = [];
  for (let i = 0; i < 10; i += 1) {
    const t = i / 9;
    let l: number;
    let factor: number;
    let drift: number;
    if (dark) {
      const p = easeProgress(t, DARK_EASE[0], DARK_EASE[1]);
      l = DARK_L_LIGHT + (DARK_L_DEEP - DARK_L_LIGHT) * p;
      factor = zone.darkChroma * DARK_CHROMA_SCALE[i];
      // 暗色色阶明度递增，色相漂移方向镜像（亮级保持原色相）
      drift = zone.hueShift * (1 - p);
    } else {
      const p = easeProgress(t, zone.ease[0], zone.ease[1]);
      l = zone.lLight + (zone.lDeep - zone.lLight) * p;
      factor = zone.chromaScale[i];
      drift = zone.hueShift * p;
    }
    const hi = h + drift;
    // 设计阶段即按 Cmax(L, H) 色域包络规划彩度，避免事后 clamp 导致相邻级塌方
    let c = chromaBudget(baseChroma, factor, zone.chromaCap, l, hi);
    // H-K 效应补偿：高彩度级看起来更亮，把明度微微下压让感知步进均匀
    const envelope = maxChroma(l, hi);
    if (envelope > 0) {
      l = Math.min(Math.max(l - hkAdjustment(hi, c / envelope), 0.02), 0.995);
      c = chromaBudget(baseChroma, factor, zone.chromaCap, l, hi);
    }
    levels.push(clampChroma({ mode: 'oklch', l, c, h: hi }, 'oklch') as Oklch);
  }
  return ensurePerceptibleSteps(levels, dark).map((c) => formatHex(c));
}

/**
 * DE2000 同色质检：相邻级色差低于阈值（人眼不可感知）时，
 * 沿明度轴把后级拉开并重算色域内彩度，直至达标。兜底色域包络仍可能产生的塌方。
 */
function ensurePerceptibleSteps(levels: Oklch[], dark: boolean): Oklch[] {
  const MIN_DE = 2;
  const dir = dark ? 1 : -1; // 亮色模式明度递减，暗色递增
  const out = levels.map((c) => ({ ...c }));
  for (let i = 1; i < out.length; i += 1) {
    let guard = 0;
    while (deltaE(out[i - 1], out[i]) < MIN_DE && guard < 10) {
      const nl = (out[i].l ?? 0) + dir * 0.018;
      if (nl <= 0.02 || nl >= 0.995) break;
      out[i].l = nl;
      out[i].c = maxChroma(nl, out[i].h ?? 0) * 0.97;
      const clamped = clampChroma(out[i], 'oklch') as Oklch;
      out[i].c = clamped.c;
      guard += 1;
    }
  }
  return out;
}

function locatePrimary(input: ReturnType<typeof parse>, colors: string[]): number {
  let best = 0;
  let bestDist = Infinity;
  colors.forEach((hex, i) => {
    const d = deltaE(input as NonNullable<typeof input>, parse(hex) as NonNullable<ReturnType<typeof parse>>);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** 暗色主色：取明度最接近 0.74 的一级——深色底上可辨识，且对 APCA 浅-on-深更友好 */
function locateDarkPrimary(darkColors: string[]): number {
  let best = 5;
  let bestDist = Infinity;
  darkColors.forEach((hex, i) => {
    const ok = toOklch(parse(hex) as NonNullable<ReturnType<typeof parse>>) as Oklch;
    const d = Math.abs((ok.l ?? 0) - 0.78);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * 输入任意主色，生成 10 级、由浅到深、过渡自然的主色阶。
 *
 * 算法：输入色 → OKLCH → 按色相分区用贝塞尔缓动采样明度、色相随明度微漂移（hue arc）、
 * 彩度按 Cmax(L, H) 色域包络规划 → DE2000 同色质检 → DeltaE2000 定位主色级。
 * 暗色模式按镜像明度区间重新生成，而非官方方案的简单反转，深色底上的层次更自然。
 *
 * 结果按（归一化输入色 + 选项）memoize，重复调用零开销。
 */
const paletteCache = new Map<string, PaletteResult>();

export function generatePalette(input: string, options: PaletteOptions = {}): PaletteResult {
  const base = resolveBase(input);
  const boost = options.chromaBoost ?? 1;
  const cacheKey = `${formatHex(base.raw)}|${options.remainInput ? 1 : 0}|${boost}`;
  const hit = paletteCache.get(cacheKey);
  if (hit) return hit;

  const zone = findZone(base.h);
  const baseChroma = base.c * boost;

  const colors = buildScale(zone, base.h, baseChroma, false);
  const darkColors = buildScale(zone, base.h, baseChroma, true);

  const primaryIndex = locatePrimary(base.raw, colors);
  if (options.remainInput) {
    colors[primaryIndex] = formatHex(base.raw);
  }

  const result: PaletteResult = {
    colors,
    primaryIndex,
    darkColors,
    darkPrimaryIndex: locateDarkPrimary(darkColors),
  };
  if (paletteCache.size > 256) paletteCache.clear();
  paletteCache.set(cacheKey, result);
  return result;
}
