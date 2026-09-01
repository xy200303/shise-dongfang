/**
 * zaowu/solver —— 配色规则引擎
 *
 * 输入基色与规则，输出「角色 → 色组」映射，模板插槽按角色顺位取色。
 * 四种规则：
 *  - 顺承 cascade：类似色相邻为伴，上浅下深，缘边走主色暗级；
 *  - 对比 contrast：主辅互补，系带取辅色暗级，里最浅；
 *  - 五色 wuse：以基色为正色，按 72° 相生转位取辅、系；
 *  - 节气 solar：取用今日节气的三色造物。
 * 全部经 shise-engine 的色阶与和谐推演，不收手工调色。
 */
import { converter, generatePalette, harmonyColors } from 'shise-engine';
import type { Oklch } from 'shise-engine';
import { SOLAR_TERMS, currentTermIndex } from '../data/terms';
import type { ColorEntry } from '../types';
import type { RuleId, SlotRole } from './types';

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

/** 保持明度彩度，转动色相（裁剪回 sRGB） */
function rotateHue(hex: string, deg: number): string {
  const ok = toOklch(hex) as Oklch;
  const rgb = toRgb({
    mode: 'oklch',
    l: ok.l,
    c: ok.c,
    h: (((ok.h ?? 0) + deg) % 360 + 360) % 360,
  });
  return rgbHex(clamp01(rgb.r), clamp01(rgb.g), clamp01(rgb.b));
}

type RoleColors = Record<SlotRole, string[]>;

/**
 * 解算整案配色。返回每个角色的候选色组（模板内同角色多插槽顺位取用，
 * 第二位起自动微转色相，避免同色部件呆板）。
 */
export function solveScheme(
  rule: RuleId,
  baseHex: string,
  colors: ColorEntry[],
): RoleColors {
  const palette = generatePalette(baseHex);
  const scale = palette.colors; // 0 最浅 → 9 最深
  const primary = scale[palette.primaryIndex];
  const harmony = harmonyColors(baseHex);

  let roleBase: RoleColors;
  switch (rule) {
    case 'contrast': {
      const compPalette = generatePalette(harmony.complementary);
      roleBase = {
        main: [primary],
        secondary: [harmony.complementary],
        trim: [scale[8]],
        tie: [compPalette.colors[7]],
        lining: [scale[1]],
        accent: [harmony.complementary],
      };
      break;
    }
    case 'wuse': {
      // 五色相生：色相 72° 一传，青→赤→黄→白→黑的传统转位
      roleBase = {
        main: [primary],
        secondary: [rotateHue(baseHex, 72)],
        trim: [scale[8]],
        tie: [rotateHue(baseHex, 144)],
        lining: [scale[1]],
        accent: [rotateHue(baseHex, 72)],
      };
      break;
    }
    case 'solar': {
      const byId = new Map(colors.map((c) => [c.id, c]));
      const term = SOLAR_TERMS[currentTermIndex()];
      const termHexes = term.colorIds
        .map((id) => byId.get(id)?.hex)
        .filter((h): h is string => !!h);
      const [c0 = primary, c1 = harmony.analogous[0], c2 = scale[8]] = termHexes;
      roleBase = {
        main: [c0],
        secondary: [c1],
        trim: [c2],
        tie: [c2],
        lining: [generatePalette(c0).colors[1]],
        accent: [c1],
      };
      break;
    }
    case 'cascade':
    default: {
      roleBase = {
        main: [primary],
        secondary: [harmony.analogous[0]],
        trim: [scale[8]],
        tie: [harmony.analogous[1] ?? scale[3]],
        lining: [scale[1]],
        accent: [scale[2]],
      };
      break;
    }
  }

  // 同角色第二插槽起：色相微转 ±14°，色阶顺延一级，制造层次而非复制
  const variant = (hex: string, i: number): string =>
    i === 0 ? hex : rotateHue(hex, 14 * i);
  const out = {} as RoleColors;
  (Object.keys(roleBase) as SlotRole[]).forEach((role) => {
    out[role] = [0, 1, 2].map((i) => variant(roleBase[role][0], i));
  });
  return out;
}

/** 供部件手选调色的候选：主色十级 + 和谐搭档 + 规则整案色 */
export function slotSuggestions(baseHex: string): string[] {
  const palette = generatePalette(baseHex);
  const harmony = harmonyColors(baseHex);
  return [
    ...palette.colors,
    harmony.complementary,
    ...harmony.analogous,
    ...harmony.triadic,
  ];
}
