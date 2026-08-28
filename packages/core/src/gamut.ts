import { inGamut } from './culori';
import type { Oklch } from './culori';

/**
 * sRGB 色域包络：给定明度 L 与色相 H，二分求解色域内可用的最大彩度 Cmax(L, H)。
 *
 * 用于在「设计阶段」按真实色域规划每级彩度，而非事后 clampChroma 硬收——
 * 后者在霓虹色等极端输入下会让相邻几级塌成近同色，前者可以从源头避免。
 */

const inSrgb = inGamut('rgb');
const HI = 0.4; // sRGB 色域内 OKLCH 彩度上界

const cache = new Map<string, number>();

export function maxChroma(l: number, h: number): number {
  const key = `${Math.round(l * 500)}:${Math.round(((h % 360) + 360) % 360)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const probe = (c: number) => inSrgb({ mode: 'oklch', l, c, h } as Oklch);
  let value = 0;
  if (probe(0.0001)) {
    let lo = 0;
    let hi = HI;
    for (let i = 0; i < 22; i += 1) {
      const mid = (lo + hi) / 2;
      if (probe(mid)) lo = mid;
      else hi = mid;
    }
    value = lo;
  }
  cache.set(key, value);
  return value;
}

/** 每级彩度预算：设计系数 × 输入基准彩度，再受分区上限与色域包络双重约束 */
export function chromaBudget(baseChroma: number, factor: number, zoneCap: number, l: number, h: number): number {
  return Math.min(baseChroma * factor, zoneCap, maxChroma(l, h) * 0.97);
}
