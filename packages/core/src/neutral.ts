import { clampChroma, converter, formatHex, parse } from './culori';
import type { Oklch } from './culori';
import { resolveBase } from './palette';
import type { NeutralResult } from './types';

const toOklch = converter('oklch');

/**
 * 中性色阶：14 级（对齐 TDesign gray-color-1~14）。
 *
 * 明度取固定曲线（参考官方 gray token 的 tone 分布），
 * 彩度取主题色彩度的小比例并跟随主题色色相 —— 得到「带色彩倾向的高级灰」，
 * 使界面灰与主题色在视觉上同源。
 */

const LIGHT_L = [0.975, 0.955, 0.935, 0.9, 0.83, 0.72, 0.62, 0.53, 0.44, 0.36, 0.28, 0.21, 0.16, 0.1];

const DARK_L = [0.16, 0.19, 0.23, 0.28, 0.34, 0.41, 0.49, 0.57, 0.66, 0.75, 0.83, 0.89, 0.93, 0.96];

/** 中级灰的色彩倾向最强，两端收敛 */
const NEUTRAL_CHROMA_SCALE = [0.5, 0.55, 0.6, 0.7, 0.85, 1, 1.05, 1.05, 1, 0.9, 0.8, 0.7, 0.6, 0.5];

function buildNeutralScale(h: number, baseChroma: number, lCurve: number[]): string[] {
  return lCurve.map((l, i) => {
    const c = Math.min(baseChroma * NEUTRAL_CHROMA_SCALE[i], 0.03);
    const clamped = clampChroma({ mode: 'oklch', l, c, h }, 'oklch') as Oklch;
    return formatHex(clamped);
  });
}

/**
 * 生成与主题色关联的中性色阶（14 级）。
 * 输入为中性色（黑/白/灰）时退化为无色彩倾向的纯灰阶。
 * 结果按归一化输入色 memoize。
 */
const neutralCache = new Map<string, NeutralResult>();

export function generateNeutral(input: string): NeutralResult {
  const base = resolveBase(input);
  const cacheKey = formatHex(base.raw);
  const hit = neutralCache.get(cacheKey);
  if (hit) return hit;

  const source = toOklch(parse(input) as NonNullable<ReturnType<typeof parse>>) as Oklch;
  const sourceChroma = base.neutral ? 0 : Math.max(source.c ?? 0, 0.015);
  const baseChroma = sourceChroma * 0.12;

  const result: NeutralResult = {
    colors: buildNeutralScale(base.h, baseChroma, LIGHT_L),
    darkColors: buildNeutralScale(base.h, baseChroma * 0.9, DARK_L),
  };
  if (neutralCache.size > 256) neutralCache.clear();
  neutralCache.set(cacheKey, result);
  return result;
}
