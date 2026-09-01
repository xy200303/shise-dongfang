import { accessibleTextLevel, generateTheme, tokensToCss } from 'shise-engine';

export type ThemeMode = 'light' | 'dark';

const COLOR_KEY = 'gallery-color';
const MODE_KEY = 'gallery-mode';
const STYLE_ID = 'app-theme';

/** 默认主题色：朱砂 */
export const DEFAULT_COLOR = '#C8473F';

function ensureStyleTag(): HTMLStyleElement {
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * 全站换装：用引擎生成 light/dark 全量 TDesign token，
 * 分别注入 :root 与 :root[theme-mode="dark"]，并持久化主题色。
 */
export function applyTheme(hex: string): void {
  const theme = generateTheme(hex);
  const { tokens } = theme;
  // 自定义界面的文字态品牌色：浅主题色直接用在页底上会看不清，
  // 用引擎的 accessibleTextLevel 下沉到「在此页底上可作正文」的色级
  const brandText = (scale: string[], pageBg: string): string => {
    const lv = accessibleTextLevel(scale, pageBg);
    return scale[lv ?? scale.length - 1];
  };
  const lightExtra = {
    '--brand-text': brandText(theme.colors, tokens.light['--td-bg-color-page']),
  };
  const darkExtra = {
    '--brand-text': brandText(theme.darkColors, tokens.dark['--td-bg-color-page']),
  };
  // tdesign 默认样式含 :root[theme-mode="light"]（优先级高于裸 :root），
  // 亮色表需用同等优先级的选择器注入才能覆盖
  const css =
    tokensToCss({ ...tokens.light, ...lightExtra }, ':root, :root[theme-mode="light"]') +
    '\n' +
    tokensToCss({ ...tokens.dark, ...darkExtra }, ':root[theme-mode="dark"]');
  ensureStyleTag().textContent = css;
  try {
    localStorage.setItem(COLOR_KEY, hex);
  } catch {
    /* 隐私模式等场景静默降级 */
  }
}

/** 切换深浅模式：写入 <html theme-mode> 并持久化 */
export function applyMode(mode: ThemeMode): void {
  document.documentElement.setAttribute('theme-mode', mode);
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function initialColor(): string {
  try {
    return localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR;
  } catch {
    return DEFAULT_COLOR;
  }
}

export function initialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
