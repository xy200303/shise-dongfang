# CodeBuddy 研发任务包

> 使用方法：把本文件整篇喂给 CodeBuddy 作为研发需求上下文，让它在 `apps/gallery/` 内开发。
> 核心原则：色彩相关能力一律调用 `@palette-studio/core`，不允许自己写色阶/对比度逻辑。

## 项目上下文

- monorepo：pnpm workspace，引擎包 `@palette-studio/core`（packages/core，已构建）
- 新应用：`apps/gallery`，Vite + React 18 + TypeScript + tdesign-react
- 数据集：`src/data/colors.json`（200+ 传统色：id/name/pinyin/hex/category/poem/poemSource/season）
- 参考实现：`apps/demo` 里有 token 注入、色阶带、复制、暗色模式的现成写法

## 引擎 API（@palette-studio/core）

```ts
generateTheme(hex)       // { colors[10], primaryIndex, darkColors, darkPrimaryIndex, neutral{colors[14],darkColors}, tokens{light,dark} }
harmonyColors(hex)       // { complementary, analogous:[a,b], triadic:[a,b], splitComplementary:[a,b] }
tokensToCss(tokens, selector)  // token 表 → CSS 文本
contrastRatio / apcaContrast / bestTextOn / usageHint / accessibleTextLevel
```

## 页面与功能需求

### G1 框架与主题系统（最高优先级，先跑通）

- 路由：/（色谱）、/favorites、/about；色卡详情用 Drawer 不打断浏览（URL 同步 ?color=id 可分享）
- 主题系统：`applyTheme(hex)` 把 `generateTheme(hex).tokens` 注入 `<style id="app-theme">`：
  light 表注入 `:root`，dark 表注入 `:root[theme-mode="dark"]`；`document.documentElement` 切换 `theme-mode` 属性
- 当前主题色持久化到 localStorage（`theme-color`），启动时恢复；默认朱砂 `#C8473F`
- 深色模式开关持久化（`theme-mode`），并随系统偏好初始化
- 页面外壳色跟随 token（`--td-bg-color-page` / `--td-text-color-primary`），实现「全站换装」

### G2 首页色谱墙

- 色卡网格：色块 + 色名 + 拼音；hover 微上浮 + 细阴影；点击进入详情抽屉
- 筛选：九色系 + 四季 + 搜索（名称/拼音/hex 模糊匹配）；筛选条件同步 URL query
- 虚拟化或分页可选（200+ 卡片，保持滚动流畅）
- Hero：标题主张 + 四季入口（点击即按季筛选）

### G3 色卡详情抽屉

- 大色块、色名、拼音、诗词与出处；HEX/RGB/OKLCH 等宽展示，点击复制（MessagePlugin 反馈）
- 引擎实时生成：10 级色阶带（主色级标记）+ 14 级墨阶带 + 搭配色三组（harmonyColors）
- 操作：设为全站主题 / 收藏切换 / 分享（生成 PNG）
- 可访问性小注：该色作文字于白底/黑底的 usageHint

### G4 收藏

- localStorage 持久化；收藏页网格 + 空状态（Miora 插画）+ 一键把收藏导出为文本清单

### G5 分享卡片

- Canvas 按 Miora M6 模板绘制 1200×630 PNG：色块/色名/诗词/HEX/色阶带/Logo；下载到本地

### G6 关于页

- 产品理念（墨分五色/随类赋彩）、引擎算法简介、可访问性说明、数据源致谢（sources.md）

## 视觉规范（与 Miora 产出对齐）

- 亮色：宣纸底 #FAF8F4、墨文字 #1A1A18、hairline #E8E5DF；深色：玄底 #141310、米白文字
- 标题衬线（Songti SC/Noto Serif SC 兜底栈），正文黑体，数据等宽
- 圆角 8px；动效 150–250ms ease-out 仅用 transform/opacity
- 图标用 Miora 产出 SVG（缺时用 tdesign-icons-react 过渡）

## 验收标准

- `pnpm build` 通过；`pnpm --filter gallery dev` 可运行
- 任意色设为全站主题后：按钮/标签/输入/表格等 TDesign 组件全部换装，深色模式同样成立
- 刷新后主题色与深浅模式保持；详情抽屉 URL 可直接分享打开
- 分享卡片 PNG 导出内容与 M6 模板版式一致
