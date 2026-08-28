# @palette-studio/core

感知均匀的 10 级色阶生成引擎。输入任意主色，输出由浅到深、过渡自然的主色阶（亮/暗双模式）、跟随主题色的中性色阶、搭配色和谐方案，以及整套 TDesign Design Token。

## 安装

```bash
pnpm add @palette-studio/core
```

## 使用

```ts
import {
  generatePalette,      // 10 级主色阶（亮/暗）
  generateNeutral,      // 14 级中性色阶（亮/暗）
  harmonyColors,        // 互补/类似/三角/分裂互补
  generateTheme,        // 以上全部 + TDesign Token，一步到位
  toTDesignTokens,      // TDesign Design Token（亮/暗两张表）
  tokensToCss,          // token 表 → CSS 文本
  contrastRatio,        // WCAG 2.x 对比度
  apcaContrast,         // APCA（WCAG 3 草案）Lc 值
  accessibleTextLevel,  // APCA 可访问文字级推荐
} from '@palette-studio/core';

const { colors, primaryIndex, darkColors } = generatePalette('#0052d9', {
  remainInput: true,   // 输入色原样保留在最接近的一级
  chromaBoost: 1.2,    // 彩度基准助推（默认 1）
});
```

## 算法

OKLCH 感知均匀色彩空间 · 11 色相分区贝塞尔明度采样 · 色相漂移（hue arc）· Cmax(L,H) 色域包络彩度规划 · DeltaE2000 主色定位与同色质检 · 暗色模式重新生成（非反转）· WCAG 2.x / APCA 双轨对比度。详见仓库根 README。

## 性能

全链路 memoize。基准（Node 24）：无缓存 ~5,000 套完整主题/秒，缓存命中 ~300,000 ops/s。`pnpm bench` 可复现。
