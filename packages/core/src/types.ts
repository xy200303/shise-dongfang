export interface PaletteOptions {
  /** 是否将输入色原样保留在色阶中（替换与其最接近的一级） */
  remainInput?: boolean;
  /**
   * 彩度基准助推系数（默认 1）。
   * pastel 等低彩度输入时调大（如 1.3）可让中级更饱满；收敛灰调主题可调小。
   */
  chromaBoost?: number;
}

export interface PaletteResult {
  /** 亮色模式 10 级色阶，由浅到深（hex） */
  colors: string[];
  /** 主色所在级，0-based */
  primaryIndex: number;
  /** 暗色模式 10 级色阶（重新生成，非简单反转），语义同级 */
  darkColors: string[];
  /** 暗色模式主色所在级，0-based */
  darkPrimaryIndex: number;
}

/** 色彩和谐方案 */
export interface HarmonyResult {
  /** 互补色（h+180°） */
  complementary: string;
  /** 类似色（h±30°） */
  analogous: [string, string];
  /** 三角色（h±120°） */
  triadic: [string, string];
  /** 分裂互补（h+150° / h+210°） */
  splitComplementary: [string, string];
}

export interface NeutralResult {
  /** 亮色模式 14 级中性色阶，由浅到深 */
  colors: string[];
  /** 暗色模式 14 级中性色阶 */
  darkColors: string[];
}

export interface TDesignThemeTokens {
  /** 注入 :root 的亮色 token 表 */
  light: Record<string, string>;
  /** 注入 :root[theme-mode="dark"] 的暗色 token 表 */
  dark: Record<string, string>;
}

export interface ThemeResult extends PaletteResult {
  neutral: NeutralResult;
  tokens: TDesignThemeTokens;
}
