/**
 * colorReps —— 色相族 / 季节的代表色（色相绸带与季节签的取色）
 *
 * 灰润策略：不做「族内彩度最高」（那会取出一排乐高糖果色），而是在
 * OKLCH 明度 0.5–0.7 区间里找彩度最接近 TARGET_C 的一色——胭脂、黛蓝、
 * 松烟、秋香一路的灰润名色。明度带逐级放宽兜底，hex 全部来自数据，不手写。
 */
import { converter } from 'shise-engine';
import type { Oklch } from 'shise-engine';
import type { Category, ColorEntry, Season } from './types';

const toOklch = converter('oklch');

/** 灰润目标彩度：落在 0.08–0.11 中段 */
const TARGET_C = 0.095;
/** 明度带逐级放宽：0.5–0.7 → 0.42–0.78 → 全域 */
const L_BANDS: [number, number][] = [
  [0.5, 0.7],
  [0.42, 0.78],
  [0, 1],
];

/** 组内取「灰润名色」：限定明度带，彩度向 TARGET_C 收敛 */
export function pickMuted(group: ColorEntry[], targetC = TARGET_C): string | null {
  if (!group.length) return null;
  const scored = group.map((entry) => ({ entry, ok: toOklch(entry.hex) as Oklch }));
  for (const [lo, hi] of L_BANDS) {
    const pool = scored.filter((s) => s.ok.l >= lo && s.ok.l <= hi);
    if (pool.length) {
      return pool.reduce((a, b) =>
        Math.abs((b.ok.c ?? 0) - targetC) < Math.abs((a.ok.c ?? 0) - targetC) ? b : a,
      ).entry.hex;
    }
  }
  return null;
}

export function categoryRep(colors: ColorEntry[], cat: Category): string | null {
  return pickMuted(colors.filter((c) => c.category === cat));
}

/**
 * 季节意象色：四季色在数据里色相混杂（直接族内取会四季皆朱红），
 * 故每季先锁定意象族——春取青绿、夏取朱、秋取金、冬取蓝——
 * 具体 hex 仍从当季数据中由灰润策略选出。
 */
const SEASON_FAMILY: Record<Season, Category[]> = {
  春: ['green', 'cyan'],
  夏: ['red', 'orange'],
  秋: ['yellow', 'orange'],
  冬: ['blue', 'cyan'],
  四季: [],
};

export function seasonRep(colors: ColorEntry[], season: Season): string | null {
  const group = colors.filter((c) => c.season === season);
  for (const cat of SEASON_FAMILY[season]) {
    const rep = pickMuted(group.filter((c) => c.category === cat));
    if (rep) return rep;
  }
  return pickMuted(group);
}

/** 「黑白灰」段的墨色→灰渐变两端：中性族里取深（L 0.25–0.5）与浅（L 0.65–0.9） */
export function neutralPair(colors: ColorEntry[]): { dark: string; light: string } | null {
  const group = colors.filter((c) => c.category === 'neutral');
  if (!group.length) return null;
  const scored = group.map((entry) => ({ entry, ok: toOklch(entry.hex) as Oklch }));
  const near = (lo: number, hi: number) => {
    const pool = scored.filter((s) => s.ok.l >= lo && s.ok.l <= hi);
    const src = pool.length ? pool : scored;
    return src.reduce((a, b) =>
      Math.abs(b.ok.l - (lo + hi) / 2) < Math.abs(a.ok.l - (lo + hi) / 2) ? b : a,
    ).entry.hex;
  };
  return { dark: near(0.25, 0.5), light: near(0.65, 0.9) };
}

/** hex → OKLCH 色相角（绸带分段定位用；无色相返回 null） */
export function hueOf(hex: string): number | null {
  const ok = toOklch(hex) as Oklch;
  return ok.h ?? null;
}
