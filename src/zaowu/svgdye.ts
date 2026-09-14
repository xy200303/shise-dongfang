/**
 * zaowu/svgdye —— 矢量插画聚类染色引擎
 *
 * 输入位图描摹 SVG（大量相近色 path 拼出平涂与褶皱），运行时：
 *  1. classifyPaths：每个 path 的 fill 换算 OKLab，归入距离最近的锚点族
 *     （槽位族 + ink 描线族）；同时记录 path 相对族均值的明度偏移；
 *  2. recolorPaths：槽位目标色取 OKLCH（L_t, C_t, h_t），每个 path 写回
 *     L = L_t + lOffset（族内褶皱明暗存活）、C/h 整体取目标色，裁剪回 sRGB；
 *     ink 描线族与 keep* 配景族（竹叶/水波等，key 以 keep 开头）永不动；
 *     pattern 族在「无纹」时隐去，其余纹样选择下染纹样槽色
 *     （插画自带云纹形状画死，纹样选择的语义=纹样色）。
 * 纸底已在预处理（scripts/preprocess-svg.py）剔除，插画透明底。
 */
import { converter } from 'shise-engine';
import type { Oklch } from 'shise-engine';
import type { PatternKind } from './fitting/patterns';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function rgbHex(r: number, g: number, b: number): string {
  const p = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

function hexToOklab(hex: string): [number, number, number] {
  const c = toOklch(hex) as Oklch;
  const h = (((c.h ?? 0) * Math.PI) / 180) as number;
  return [c.l, c.c * Math.cos(h), c.c * Math.sin(h)];
}

export interface ClassifiedPath {
  el: SVGElement;
  /** 槽位 id；'ink' 为描线族 */
  slot: string;
  /** 相对族均值的明度偏移 */
  lOff: number;
}

/**
 * 把 root 下所有带 fill 的 path 归入锚点族。
 * anchors: { body/trim/tie/pattern/...: hex 或 hex[], ink: hex }——key 即槽位 id。
 */
export function classifyPaths(
  root: SVGSVGElement,
  anchors: Record<string, string | string[]>,
): ClassifiedPath[] {
  const families = Object.entries(anchors).flatMap(([slot, hex]) =>
    (Array.isArray(hex) ? hex : [hex]).map((h) => ({ slot, lab: hexToOklab(h) })),
  );
  const out: ClassifiedPath[] = [];
  const paths = root.querySelectorAll('path');
  paths.forEach((el) => {
    const pe = el as SVGPathElement;
    const m = /#([0-9A-Fa-f]{6})/.exec(
      /fill:\s*(#[0-9A-Fa-f]{6})/.exec(pe.getAttribute('style') ?? '')?.[1] ??
        pe.getAttribute('fill') ??
        '',
    );
    if (!m) return;
    const lab = hexToOklab(`#${m[1]}`);
    let best = families[0];
    let bestD = Infinity;
    for (const f of families) {
      const d =
        (lab[0] - f.lab[0]) ** 2 + (lab[1] - f.lab[1]) ** 2 + (lab[2] - f.lab[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    out.push({ el: el as SVGElement, slot: best.slot, lOff: lab[0] });
  });

  // 族均值 → 明度偏移
  const mean = new Map<string, { sum: number; n: number }>();
  for (const p of out) {
    const e = mean.get(p.slot) ?? { sum: 0, n: 0 };
    e.sum += p.lOff;
    e.n += 1;
    mean.set(p.slot, e);
  }
  for (const p of out) {
    const e = mean.get(p.slot);
    p.lOff -= e && e.n ? e.sum / e.n : 0;
  }
  return out;
}

/** 换染整幅插画。纹族在「无纹」时：patternVisibleWhenNone=false 隐去，true 染纹槽色 */
export function recolorPaths(
  paths: ClassifiedPath[],
  assignments: Record<string, string>,
  patternKind: PatternKind,
  patternVisibleWhenNone = false,
): void {
  for (const p of paths) {
    if (p.slot === 'ink' || p.slot.startsWith('keep')) continue; // 描线与配景（竹叶/水波等）不染
    if (p.slot === 'pattern' && patternKind === 'none' && !patternVisibleWhenNone) {
      p.el.style.fillOpacity = '0';
      continue;
    }
    p.el.style.fillOpacity = '';
    const hex = assignments[p.slot];
    if (!hex) continue;
    const t = toOklch(hex) as Oklch;
    const rgb = toRgb({
      mode: 'oklch',
      l: clamp01(t.l + p.lOff),
      c: t.c,
      h: t.h ?? 0,
    });
    p.el.style.fill = rgbHex(clamp01(rgb.r), clamp01(rgb.g), clamp01(rgb.b));
  }
}
