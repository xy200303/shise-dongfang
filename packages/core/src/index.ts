export { generatePalette, resolveBase } from './palette';
export { generateNeutral } from './neutral';
export { harmonyColors } from './harmony';
export { toTDesignTokens, tokensToCss } from './tokens';
export { contrastRatio, apcaContrast, bestTextOn, wcagLevel, accessibleTextLevel, usageHint } from './contrast';
export type { UsageRole } from './contrast';
export { HUE_ZONES, findZone } from './curves';
export { differenceCiede2000, converter } from './culori';
export type { Oklch } from './culori';
export type {
  HarmonyResult,
  PaletteOptions,
  PaletteResult,
  NeutralResult,
  TDesignThemeTokens,
  ThemeResult,
} from './types';
export type { WcagLevel } from './contrast';

import { generateNeutral } from './neutral';
import { generatePalette } from './palette';
import { toTDesignTokens } from './tokens';
import type { PaletteOptions, ThemeResult } from './types';

/** 一步到位：主色阶 + 暗色色阶 + 中性色阶 + TDesign Token */
export function generateTheme(input: string, options: PaletteOptions = {}): ThemeResult {
  const palette = generatePalette(input, options);
  return {
    ...palette,
    neutral: generateNeutral(input),
    tokens: toTDesignTokens(input),
  };
}
