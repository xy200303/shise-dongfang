import { formatHex, parse } from './culori';
import { accessibleTextLevel, apcaContrast, bestTextOn, contrastRatio } from './contrast';
import { generateNeutral } from './neutral';
import { generatePalette } from './palette';
import type { PaletteResult, TDesignThemeTokens } from './types';

/**
 * TDesign Design Token 映射。
 *
 * 对齐 tdesign-common `style/web/theme/_light.less` / `_dark.less` 的官方 token 全集：
 * 色阶、语义扩展、遮罩、背景、文字、边框、阴影、滚动条。
 * 暗色模式遵循官方语义约定：hover 更深（级-1）、active 更浅（级+1）、
 * `--td-bg-color-specialcomponent` 为 transparent、文字使用带透明度的 font token。
 */

/** TDesign 功能色基准值（与官方默认主题一致） */
const FUNCTIONAL_COLORS = {
  success: '#00a870',
  warning: '#ed7b2f',
  error: '#d54941',
} as const;

const clampIdx = (i: number) => Math.min(Math.max(i, 0), 9);

function brandSemantic(tokens: Record<string, string>, palette: PaletteResult, dark: boolean): void {
  const colors = dark ? palette.darkColors : palette.colors;
  const p = dark ? palette.darkPrimaryIndex : palette.primaryIndex;
  const at = (i: number) => colors[clampIdx(i)];

  colors.forEach((hex, i) => {
    tokens[`--td-brand-color-${i + 1}`] = hex;
  });
  tokens['--td-brand-color'] = at(p);
  tokens['--td-brand-color-hover'] = at(p - 1);
  tokens['--td-brand-color-active'] = at(p + 1);
  tokens['--td-brand-color-focus'] = at(1);
  tokens['--td-brand-color-disabled'] = at(2);
  tokens['--td-brand-color-light'] = at(0);
  tokens['--td-brand-color-light-hover'] = at(1);
  tokens['--td-brand-color-light-active'] = at(1);
}

function functionalSemantic(
  tokens: Record<string, string>,
  name: keyof typeof FUNCTIONAL_COLORS,
  dark: boolean,
): void {
  const palette = generatePalette(FUNCTIONAL_COLORS[name]);
  const colors = dark ? palette.darkColors : palette.colors;
  const p = dark ? palette.darkPrimaryIndex : palette.primaryIndex;
  const at = (i: number) => colors[clampIdx(i)];

  colors.forEach((hex, i) => {
    tokens[`--td-${name}-color-${i + 1}`] = hex;
  });
  tokens[`--td-${name}-color`] = at(p);
  tokens[`--td-${name}-color-hover`] = at(p - 1);
  tokens[`--td-${name}-color-active`] = at(p + 1);
  tokens[`--td-${name}-color-focus`] = at(1);
  tokens[`--td-${name}-color-disabled`] = at(2);
  tokens[`--td-${name}-color-light`] = at(0);
  tokens[`--td-${name}-color-light-hover`] = at(1);
}

function grayAndSurface(tokens: Record<string, string>, grays: string[], dark: boolean): void {
  grays.forEach((hex, i) => {
    tokens[`--td-gray-color-${i + 1}`] = hex;
  });
  // 亮/暗两张灰阶表语义对齐：g(1) 为最贴近页面底的灰，g(14) 为对比最强的灰
  const g = (i1based: number) => grays[Math.min(Math.max(i1based - 1, 0), 13)];

  // 背景色
  if (dark) {
    /**
     * 暗色 4 级表面体系（参考 Material You dark surfaces）：
     * page(最底) < container(卡片) < elevated(组件) < overlay(弹层)，
     * 每级明度差固定、由跟随主题色的暗灰阶驱动，层级感来自明度而非阴影。
     */
    const SURFACE = { page: 1, container: 2, elevated: 4, overlay: 6 };
    tokens['--td-bg-color-page'] = g(SURFACE.page);
    tokens['--td-bg-color-container'] = g(SURFACE.container);
    tokens['--td-bg-color-container-hover'] = g(SURFACE.container + 1);
    tokens['--td-bg-color-container-active'] = g(SURFACE.container + 2);
    tokens['--td-bg-color-container-select'] = g(SURFACE.overlay);
    tokens['--td-bg-color-secondarycontainer'] = g(SURFACE.container + 1);
    tokens['--td-bg-color-secondarycontainer-hover'] = g(SURFACE.container + 2);
    tokens['--td-bg-color-secondarycontainer-active'] = g(SURFACE.elevated + 1);
    tokens['--td-bg-color-component'] = g(SURFACE.elevated);
    tokens['--td-bg-color-component-hover'] = g(SURFACE.elevated + 1);
    tokens['--td-bg-color-component-active'] = g(SURFACE.overlay);
    tokens['--td-bg-color-secondarycomponent'] = g(SURFACE.elevated + 1);
    tokens['--td-bg-color-secondarycomponent-hover'] = g(SURFACE.elevated + 2);
    tokens['--td-bg-color-secondarycomponent-active'] = g(SURFACE.overlay);
    tokens['--td-bg-color-component-disabled'] = g(SURFACE.container + 1);
    tokens['--td-bg-color-specialcomponent'] = 'transparent';
  } else {
    tokens['--td-bg-color-page'] = g(2);
    tokens['--td-bg-color-container'] = '#ffffff';
    tokens['--td-bg-color-container-hover'] = g(1);
    tokens['--td-bg-color-container-active'] = g(3);
    tokens['--td-bg-color-container-select'] = '#ffffff';
    tokens['--td-bg-color-secondarycontainer'] = g(1);
    tokens['--td-bg-color-secondarycontainer-hover'] = g(2);
    tokens['--td-bg-color-secondarycontainer-active'] = g(4);
    tokens['--td-bg-color-component'] = g(3);
    tokens['--td-bg-color-component-hover'] = g(4);
    tokens['--td-bg-color-component-active'] = g(6);
    tokens['--td-bg-color-secondarycomponent'] = g(4);
    tokens['--td-bg-color-secondarycomponent-hover'] = g(5);
    tokens['--td-bg-color-secondarycomponent-active'] = g(6);
    tokens['--td-bg-color-component-disabled'] = g(2);
    tokens['--td-bg-color-specialcomponent'] = '#ffffff';
  }

  // 文字颜色（对齐官方 font token，透明度方案与主题色无关）
  if (dark) {
    tokens['--td-font-white-1'] = 'rgba(255, 255, 255, 90%)';
    tokens['--td-text-color-primary'] = 'var(--td-font-white-1)';
    tokens['--td-text-color-secondary'] = 'var(--td-font-white-2)';
    tokens['--td-text-color-placeholder'] = 'var(--td-font-white-3)';
    tokens['--td-text-color-disabled'] = 'var(--td-font-white-4)';
    tokens['--td-text-color-watermark'] = 'rgba(255, 255, 255, 10%)';
  } else {
    tokens['--td-font-white-1'] = 'rgba(255, 255, 255, 100%)';
    tokens['--td-text-color-primary'] = 'var(--td-font-gray-1)';
    tokens['--td-text-color-secondary'] = 'var(--td-font-gray-2)';
    tokens['--td-text-color-placeholder'] = 'var(--td-font-gray-3)';
    tokens['--td-text-color-disabled'] = 'var(--td-font-gray-4)';
    tokens['--td-text-color-watermark'] = 'rgba(0, 0, 0, 10%)';
  }
  tokens['--td-font-white-2'] = 'rgba(255, 255, 255, 55%)';
  tokens['--td-font-white-3'] = 'rgba(255, 255, 255, 35%)';
  tokens['--td-font-white-4'] = 'rgba(255, 255, 255, 22%)';
  tokens['--td-font-gray-1'] = 'rgba(0, 0, 0, 90%)';
  tokens['--td-font-gray-2'] = 'rgba(0, 0, 0, 60%)';
  tokens['--td-font-gray-3'] = 'rgba(0, 0, 0, 40%)';
  tokens['--td-font-gray-4'] = 'rgba(0, 0, 0, 26%)';

  // 边框与分割线
  tokens['--td-border-level-1-color'] = g(3);
  tokens['--td-component-stroke'] = g(3);
  tokens['--td-border-level-2-color'] = g(4);
  tokens['--td-component-border'] = g(4);

  // 遮罩
  if (dark) {
    tokens['--td-mask-active'] = 'rgba(0, 0, 0, 40%)';
    tokens['--td-mask-disabled'] = 'rgba(0, 0, 0, 60%)';
    tokens['--td-mask-background'] = 'rgba(36, 36, 36, 96%)';
    tokens['--td-mask-gradient'] = 'rgba(36, 36, 36, 0%)';
  } else {
    tokens['--td-mask-active'] = 'rgba(0, 0, 0, 60%)';
    tokens['--td-mask-disabled'] = 'rgba(255, 255, 255, 60%)';
    tokens['--td-mask-background'] = 'rgba(255, 255, 255, 96%)';
    tokens['--td-mask-gradient'] = 'rgba(255, 255, 255, 0%)';
  }
}

function staticTokens(tokens: Record<string, string>, dark: boolean): void {
  if (dark) {
    tokens['--td-shadow-1'] =
      '0 4px 6px rgba(0, 0, 0, 6%), 0 1px 10px rgba(0, 0, 0, 8%), 0 2px 4px rgba(0, 0, 0, 12%)';
    tokens['--td-shadow-2'] =
      '0 8px 10px rgba(0, 0, 0, 12%), 0 3px 14px rgba(0, 0, 0, 10%), 0 5px 5px rgba(0, 0, 0, 16%)';
    tokens['--td-shadow-3'] =
      '0 16px 24px rgba(0, 0, 0, 14%), 0 6px 30px rgba(0, 0, 0, 12%), 0 8px 10px rgba(0, 0, 0, 20%)';
    tokens['--td-shadow-inset-top'] = 'inset 0 .5px 0 #5e5e5e';
    tokens['--td-shadow-inset-right'] = 'inset .5px 0 0 #5e5e5e';
    tokens['--td-shadow-inset-bottom'] = 'inset 0 -.5px 0 #5e5e5e';
    tokens['--td-shadow-inset-left'] = 'inset -.5px 0 0 #5e5e5e';
    tokens['--td-table-shadow-color'] = 'rgba(0, 0, 0, 55%)';
    tokens['--td-scrollbar-color'] = 'rgba(255, 255, 255, 10%)';
    tokens['--td-scrollbar-hover-color'] = 'rgba(255, 255, 255, 30%)';
    tokens['--td-scroll-track-color'] = '#333333';
  } else {
    tokens['--td-shadow-1'] =
      '0 1px 10px rgba(0, 0, 0, 5%), 0 4px 5px rgba(0, 0, 0, 8%), 0 2px 4px -1px rgba(0, 0, 0, 12%)';
    tokens['--td-shadow-2'] =
      '0 3px 14px 2px rgba(0, 0, 0, 5%), 0 8px 10px 1px rgba(0, 0, 0, 6%), 0 5px 5px -3px rgba(0, 0, 0, 10%)';
    tokens['--td-shadow-3'] =
      '0 6px 30px 5px rgba(0, 0, 0, 5%), 0 16px 24px 2px rgba(0, 0, 0, 4%), 0 8px 10px -5px rgba(0, 0, 0, 8%)';
    tokens['--td-shadow-inset-top'] = 'inset 0 .5px 0 #dcdcdc';
    tokens['--td-shadow-inset-right'] = 'inset .5px 0 0 #dcdcdc';
    tokens['--td-shadow-inset-bottom'] = 'inset 0 -.5px 0 #dcdcdc';
    tokens['--td-shadow-inset-left'] = 'inset -.5px 0 0 #dcdcdc';
    tokens['--td-table-shadow-color'] = 'rgba(0, 0, 0, 8%)';
    tokens['--td-scrollbar-color'] = 'rgba(0, 0, 0, 10%)';
    tokens['--td-scrollbar-hover-color'] = 'rgba(0, 0, 0, 30%)';
    tokens['--td-scroll-track-color'] = '#ffffff';
  }
}

/**
 * 品牌文字色级别：主色在页面底色上双轨达标（WCAG AA + APCA Lc60）则保留主色级，
 * 否则自动下沉到首个双轨达标的级别（官方链接色用 brand-8 深于主色，同理）。
 */
function brandTextLevel(colors: string[], pageBg: string, primaryIdx: number): number {
  const main = colors[primaryIdx];
  if (contrastRatio(main, pageBg) >= 4.5 && Math.abs(apcaContrast(main, pageBg)) >= 60) {
    return primaryIdx;
  }
  const idx = accessibleTextLevel(colors, pageBg, 60, 4.5);
  return idx === -1 ? 9 : idx;
}

/**
 * 由任意主色生成整套 TDesign Design Token（亮色 + 暗色两张表）。
 * 直接注入 :root / :root[theme-mode="dark"] 即可完成全组件换装。
 * 结果按归一化输入色 memoize。
 */
const tokensCache = new Map<string, TDesignThemeTokens>();

export function toTDesignTokens(input: string): TDesignThemeTokens {
  const cacheKey = formatHex(parse(input) ?? '#000000') ?? '#000000';
  const hit = tokensCache.get(cacheKey);
  if (hit) return hit;
  const palette = generatePalette(input);
  const neutral = generateNeutral(input);
  const functionalNames = Object.keys(FUNCTIONAL_COLORS) as (keyof typeof FUNCTIONAL_COLORS)[];

  const light: Record<string, string> = {};
  brandSemantic(light, palette, false);
  grayAndSurface(light, neutral.colors, false);
  functionalNames.forEach((name) => functionalSemantic(light, name, false));
  const lightTextLv = brandTextLevel(palette.colors, light['--td-bg-color-page'], palette.primaryIndex);
  light['--td-text-color-brand'] = palette.colors[lightTextLv];
  light['--td-text-color-link'] = palette.colors[Math.min(lightTextLv + 1, 9)];
  staticTokens(light, false);

  const dark: Record<string, string> = {};
  brandSemantic(dark, palette, true);
  grayAndSurface(dark, neutral.darkColors, true);
  functionalNames.forEach((name) => functionalSemantic(dark, name, true));
  const darkTextLv = brandTextLevel(palette.darkColors, dark['--td-bg-color-page'], palette.darkPrimaryIndex);
  dark['--td-text-color-brand'] = palette.darkColors[darkTextLv];
  dark['--td-text-color-link'] = palette.darkColors[Math.min(darkTextLv + 1, 9)];
  staticTokens(dark, true);

  /**
   * 文字反色自适应（超越官方的一步）：官方写死 anti=#fff，
   * 浅色主色 / 暗色提亮主色 上白字对比度不足。按 WCAG 对比度择优黑/白。
   */
  light['--td-text-color-anti'] =
    bestTextOn(light['--td-brand-color']) === '#ffffff' ? '#ffffff' : 'var(--td-font-gray-1)';
  dark['--td-text-color-anti'] =
    bestTextOn(dark['--td-brand-color']) === '#ffffff' ? '#ffffff' : 'var(--td-font-gray-1)';

  const result: TDesignThemeTokens = { light, dark };
  if (tokensCache.size > 256) tokensCache.clear();
  tokensCache.set(cacheKey, result);
  return result;
}

/** 把 token 表序列化为 CSS 文本，便于注入 <style> 或导出文件 */
export function tokensToCss(tokens: Record<string, string>, selector = ':root'): string {
  const body = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}
