import type { Oklch } from './culori';
import { clampChroma, formatHex } from './culori';
import { resolveBase } from './palette';
import type { HarmonyResult } from './types';

/**
 * 色彩和谐：保持输入色的明度与彩度，仅转动色相得到经典和谐方案的搭档色。
 * 互补 / 类似 / 三角 / 分裂互补，全部收入 sRGB 色域。
 * 中性输入（灰）色相无意义，搭档色退化为同明度灰。
 */
export function harmonyColors(input: string): HarmonyResult {
  const base = resolveBase(input);
  const at = (h: number): string => {
    if (base.neutral) return formatHex({ mode: 'oklch', l: base.l, c: 0, h: 0 } as Oklch) ?? '#808080';
    const clamped = clampChroma({ mode: 'oklch', l: base.l, c: base.c, h: h % 360 }, 'oklch') as Oklch;
    return formatHex(clamped) ?? '#808080';
  };
  return {
    complementary: at(base.h + 180),
    analogous: [at(base.h + 30), at(base.h - 30)],
    triadic: [at(base.h + 120), at(base.h - 120)],
    splitComplementary: [at(base.h + 150), at(base.h + 210)],
  };
}
