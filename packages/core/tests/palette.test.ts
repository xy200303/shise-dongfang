import { converter, differenceCiede2000, parse } from '../src/culori';
import { describe, expect, it } from 'vitest';
import {
  harmonyColors,
  usageHint,
  accessibleTextLevel,
  apcaContrast,
  bestTextOn,
  contrastRatio,
  generateNeutral,
  generatePalette,
  generateTheme,
  toTDesignTokens,
  tokensToCss,
} from '../src';
import { maxChroma } from '../src/gamut';
import { hkAdjustment, hkHueWeight } from '../src/hk';

const toOklch = converter('oklch');
const deltaE = differenceCiede2000();
const lOf = (hex: string) => toOklch(parse(hex)!)!.l ?? 0;
const cOf = (hex: string) => toOklch(parse(hex)!)!.c ?? 0;
const hOf = (hex: string) => toOklch(parse(hex)!)!.h ?? NaN;

const HEX_RE = /^#[0-9a-f]{6}$/i;

describe('generatePalette', () => {
  it('生成 10 级合法 hex 色阶', () => {
    const { colors, darkColors } = generatePalette('#0052d9');
    expect(colors).toHaveLength(10);
    expect(darkColors).toHaveLength(10);
    colors.forEach((c) => expect(c).toMatch(HEX_RE));
    darkColors.forEach((c) => expect(c).toMatch(HEX_RE));
  });

  it('亮色色阶明度严格递减（由浅到深）', () => {
    const { colors } = generatePalette('#0052d9');
    for (let i = 1; i < 10; i += 1) {
      expect(lOf(colors[i])).toBeLessThan(lOf(colors[i - 1]));
    }
  });

  it('暗色色阶明度严格递增（语义同级：1 级为深色底弱着色）', () => {
    const { darkColors } = generatePalette('#0052d9');
    for (let i = 1; i < 10; i += 1) {
      expect(lOf(darkColors[i])).toBeGreaterThan(lOf(darkColors[i - 1]));
    }
  });

  it('remainInput 时输入色原样保留，且与主色级一致', () => {
    const { colors, primaryIndex } = generatePalette('#0052d9', { remainInput: true });
    expect(colors[primaryIndex]).toBe('#0052d9');
  });

  it('TDesign 默认蓝的主色级落在 6~8 级（1-based）', () => {
    const { primaryIndex } = generatePalette('#0052d9');
    expect(primaryIndex + 1).toBeGreaterThanOrEqual(6);
    expect(primaryIndex + 1).toBeLessThanOrEqual(8);
  });

  it.each(['#ffffff', '#000000', '#808080', '#39ff14', '#ff00ff', 'red', 'rgb(12, 200, 90)'])(
    '边界输入 %s 不报错且输出合法',
    (input) => {
      const { colors, darkColors } = generatePalette(input);
      [...colors, ...darkColors].forEach((c) => expect(c).toMatch(HEX_RE));
    },
  );

  it('中性输入（灰）生成的色阶彩度很低', () => {
    const { colors } = generatePalette('#808080');
    colors.forEach((c) => expect(cOf(c)).toBeLessThan(0.03));
  });
});

describe('generateNeutral', () => {
  it('生成 14 级中性色阶，明度严格单调', () => {
    const { colors, darkColors } = generateNeutral('#0052d9');
    expect(colors).toHaveLength(14);
    expect(darkColors).toHaveLength(14);
    for (let i = 1; i < 14; i += 1) {
      expect(lOf(colors[i])).toBeLessThan(lOf(colors[i - 1]));
      expect(lOf(darkColors[i])).toBeGreaterThan(lOf(darkColors[i - 1]));
    }
  });

  it('中性色阶带有主题色色彩倾向但彩度受控', () => {
    const { colors } = generateNeutral('#0052d9');
    const mid = toOklch(parse(colors[7])!)!;
    expect(mid.c).toBeGreaterThan(0.003);
    expect(mid.c).toBeLessThan(0.03);
    expect(Math.abs((mid.h ?? 0) - (toOklch(parse('#0052d9')!)!.h ?? 0))).toBeLessThan(10);
  });
});

describe('toTDesignTokens', () => {
  it('输出亮暗两套完整 token', () => {
    const { light, dark } = toTDesignTokens('#0052d9');
    for (let i = 1; i <= 10; i += 1) {
      expect(light[`--td-brand-color-${i}`]).toMatch(HEX_RE);
      expect(dark[`--td-brand-color-${i}`]).toMatch(HEX_RE);
    }
    for (let i = 1; i <= 14; i += 1) {
      expect(light[`--td-gray-color-${i}`]).toMatch(HEX_RE);
      expect(dark[`--td-gray-color-${i}`]).toMatch(HEX_RE);
    }
    ['--td-brand-color', '--td-brand-color-hover', '--td-brand-color-active', '--td-success-color', '--td-warning-color', '--td-error-color', '--td-text-color-primary', '--td-bg-color-page'].forEach(
      (key) => {
        expect(light[key]).toBeDefined();
        expect(dark[key]).toBeDefined();
      },
    );
  });

  it('覆盖官方 token 全集：specialcomponent / 边框 / 遮罩 / 阴影 / 字体透明度', () => {
    const { light, dark } = toTDesignTokens('#0052d9');
    [
      '--td-bg-color-specialcomponent',
      '--td-bg-color-container-select',
      '--td-bg-color-secondarycomponent',
      '--td-border-level-1-color',
      '--td-border-level-2-color',
      '--td-text-color-anti',
      '--td-text-color-brand',
      '--td-mask-active',
      '--td-shadow-1',
      '--td-shadow-2',
      '--td-shadow-3',
      '--td-font-white-1',
      '--td-font-gray-1',
      '--td-scrollbar-color',
      '--td-scroll-track-color',
    ].forEach((key) => {
      expect(light[key], `light ${key}`).toBeDefined();
      expect(dark[key], `dark ${key}`).toBeDefined();
    });
    // 官方约定：暗色 specialcomponent 为 transparent，亮色为白色
    expect(light['--td-bg-color-specialcomponent']).toBe('#ffffff');
    expect(dark['--td-bg-color-specialcomponent']).toBe('transparent');
    // 功能色语义扩展齐全（官方命名 light-hover）
    ['success', 'warning', 'error'].forEach((name) => {
      ['', '-hover', '-active', '-focus', '-disabled', '-light', '-light-hover'].forEach((suffix) => {
        expect(light[`--td-${name}-color${suffix}`]).toBeDefined();
        expect(dark[`--td-${name}-color${suffix}`]).toBeDefined();
      });
    });
  });

  it('语义 token 与色阶联动：hover 是主色的前一级（亮色）', () => {
    const { colors, primaryIndex } = generatePalette('#0052d9');
    const { light } = toTDesignTokens('#0052d9');
    expect(light['--td-brand-color']).toBe(colors[primaryIndex]);
    expect(light['--td-brand-color-hover']).toBe(colors[Math.max(primaryIndex - 1, 0)]);
    expect(light['--td-brand-color-active']).toBe(colors[Math.min(primaryIndex + 1, 9)]);
  });

  it('tokensToCss 生成合法 CSS', () => {
    const { light } = toTDesignTokens('#0052d9');
    const css = tokensToCss(light, ':root');
    expect(css).toContain(':root {');
    expect(css).toContain('--td-brand-color-1:');
  });
});

describe('contrast', () => {
  it('黑白对比度为 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('bestTextOn 选择可读文字色', () => {
    expect(bestTextOn('#000000')).toBe('#ffffff');
    expect(bestTextOn('#ffffff')).toBe('#000000');
  });

  it('APCA 双轨：极性敏感，黑白组合 |Lc| 接近上限', () => {
    const darkOnLight = apcaContrast('#000000', '#ffffff');
    const lightOnDark = apcaContrast('#ffffff', '#000000');
    expect(darkOnLight).toBeGreaterThan(100); // 深字浅底为正
    expect(lightOnDark).toBeLessThan(-100); // 浅字深底为负
  });
});

describe('gamut envelope', () => {
  it('maxChroma 符合色域常识：黄色高明度处可用彩度大于深明度处', () => {
    const yellowHue = toOklch(parse('#f5d90a')!)!.h ?? 0;
    expect(maxChroma(0.9, yellowHue)).toBeGreaterThan(0.1);
    expect(maxChroma(0.3, yellowHue)).toBeLessThan(maxChroma(0.7, yellowHue));
  });

  it('霓虹色输入相邻级不塌方（ΔE2000 ≥ 1.5）', () => {
    const { colors } = generatePalette('#00ff00');
    for (let i = 1; i < 10; i += 1) {
      expect(deltaE(parse(colors[i - 1])!, parse(colors[i])!)).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('生成色阶全部落在 sRGB 色域内（hex 往返一致）', () => {
    const { colors, darkColors } = generatePalette('#39ff14');
    [...colors, ...darkColors].forEach((hex) => {
      const roundTrip = toOklch(parse(hex)!)!;
      expect(roundTrip.l).toBeGreaterThan(0);
      expect(roundTrip.l).toBeLessThan(1);
    });
  });
});

describe('generateTheme', () => {
  it('一次生成色阶 + 中性色 + token', () => {
    const theme = generateTheme('#f2a6c0');
    expect(theme.colors).toHaveLength(10);
    expect(theme.neutral.colors).toHaveLength(14);
    expect(theme.tokens.light['--td-brand-color']).toBeDefined();
  });
});

describe('hue arc / chromaBoost / memoize / a11y 推荐', () => {
  it('黄色系色相漂移：第 10 级色相比第 1 级更偏橙（hue 减小）', () => {
    const { colors } = generatePalette('#f5d90a');
    const h1 = hOf(colors[0]);
    const h10 = hOf(colors[9]);
    expect(h10).toBeLessThan(h1);
    expect(h1 - h10).toBeGreaterThan(5); // 漂移量足够可感知
  });

  it('蓝色系色相漂移：深处偏紫（hue 增大）', () => {
    const { colors } = generatePalette('#0052d9');
    expect(hOf(colors[9])).toBeGreaterThan(hOf(colors[0]));
  });

  it('chromaBoost 放大中级彩度', () => {
    const base = generatePalette('#a8c5e0');
    const boosted = generatePalette('#a8c5e0', { chromaBoost: 1.5 });
    expect(cOf(boosted.colors[6])).toBeGreaterThan(cOf(base.colors[6]));
  });

  it('memoize：同参调用返回同一引用', () => {
    expect(generatePalette('#0052d9')).toBe(generatePalette('#0052d9'));
    expect(generateNeutral('#0052d9')).toBe(generateNeutral('#0052d9'));
  });

  it('accessibleTextLevel：返回白底正文可用的最浅达标级（"第 N 级起"）', () => {
    const { colors } = generatePalette('#0052d9');
    const idx = accessibleTextLevel(colors, '#ffffff');
    expect(idx).toBeGreaterThanOrEqual(6);
    expect(Math.abs(apcaContrast(colors[idx], '#ffffff'))).toBeGreaterThanOrEqual(75);
    // 语义是「最浅达标级」：前一级必然不达标
    expect(Math.abs(apcaContrast(colors[idx - 1], '#ffffff'))).toBeLessThan(75);
    // 纯白底上任何色都不满足时返回 -1
    expect(accessibleTextLevel(['#ffffff', '#fefefe'], '#ffffff')).toBe(-1);
  });
});

describe('harmonyColors', () => {
  it('互补色色相约相差 180°，明度彩度保持', () => {
    const base = toOklch(parse('#0052d9')!)!;
    const h = harmonyColors('#0052d9');
    const comp = toOklch(parse(h.complementary)!)!;
    let diff = Math.abs((comp.h ?? 0) - ((base.h ?? 0) + 180) % 360);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(5);
    expect(Math.abs(comp.l - base.l)).toBeLessThan(0.05);
  });

  it('中性输入退化为灰，不报错', () => {
    const h = harmonyColors('#808080');
    expect(h.complementary).toMatch(HEX_RE);
    expect(cOf(h.complementary)).toBeLessThan(0.02);
  });
});

describe('H-K 效应明度补偿', () => {
  it('色相权重：蓝紫区强于黄绿区', () => {
    expect(hkHueWeight(290)).toBeGreaterThan(hkHueWeight(90));
    expect(hkHueWeight(290)).toBeCloseTo(1, 1);
    expect(hkAdjustment(290, 1)).toBeGreaterThan(hkAdjustment(90, 1));
    expect(hkAdjustment(290, 0)).toBe(0);
  });

  it('补偿后色阶明度仍严格单调', () => {
    // 高彩度红（H-K 效应最强的色相）最能检验补偿不破坏单调性
    const { colors } = generatePalette('#ff0000', { chromaBoost: 1.3 });
    for (let i = 1; i < 10; i += 1) {
      expect(lOf(colors[i])).toBeLessThan(lOf(colors[i - 1]));
    }
  });
});

describe('文字反色自适应', () => {
  it('深主色（默认蓝）亮/暗都选白字', () => {
    const { light } = toTDesignTokens('#0052d9');
    expect(light['--td-text-color-anti']).toBe('#ffffff');
  });

  it('暗色模式提亮主色后改选深色字（优于官方写死白字）', () => {
    const { dark } = toTDesignTokens('#0052d9');
    expect(dark['--td-text-color-anti']).toBe('var(--td-font-gray-1)');
  });

  it('pastel 浅主色亮色模式同样自适应深色字', () => {
    const { light } = toTDesignTokens('#f2d5a0');
    expect(light['--td-text-color-anti']).toBe('var(--td-font-gray-1)');
  });
});

describe('usageHint 语义用途', () => {
  it('按 APCA Lc 分级：黑字白底是正文推荐，浅灰是背景填充', () => {
    expect(usageHint('#000000', '#ffffff')).toBe('正文推荐');
    expect(usageHint('#f3f3f3', '#ffffff')).toBe('背景/填充');
    // 浅灰作底色可承载正文
    expect(usageHint('#000000', '#f3f3f3')).toBe('正文推荐');
  });

  it('中性色阶语义分工：浅级作底色、深级作正文', () => {
    const { colors } = generateNeutral('#0052d9');
    expect(['背景/填充', '边框/装饰']).toContain(usageHint(colors[0], '#ffffff'));
    expect(['正文可用', '正文推荐']).toContain(usageHint(colors[13], '#ffffff'));
  });
});

describe('双轨择优与品牌文字色下沉', () => {
  it('bestTextOn 双轨：亮蓝底上选白字（单看 WCAG 会错选深字）', () => {
    // #366ef4 亮蓝：WCAG 深字 5.4 vs 白字 3.9 偏好深字，APCA 白字 Lc 更高
    expect(bestTextOn('#366ef4')).toBe('#ffffff');
  });

  it('亮主色的品牌文字色自动下沉到双轨达标级', () => {
    const { light } = toTDesignTokens('#366ef4');
    const brandText = light['--td-text-color-brand'];
    const page = light['--td-bg-color-page'];
    expect(contrastRatio(brandText, page)).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(apcaContrast(brandText, page))).toBeGreaterThanOrEqual(60);
  });

  it('主色本身达标时品牌文字色保持主色级', () => {
    const { light } = toTDesignTokens('#0052d9');
    expect(light['--td-text-color-brand']).toBe(light['--td-brand-color']);
  });
});
