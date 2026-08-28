# 拾色 · 东方

中国传统色主题馆 —— 537 只东方传统色 × OKLCH 感知均匀色阶引擎 × TDesign 组件。

**演示地址**：https://shise.xyun.dev

腾讯犀牛鸟开源计划 2026 · TDesign 课题实战阶段 Task 02 交付仓库。
色阶引擎课题（Task 01）主仓库：[xy200303/shise-engine](https://github.com/xy200303/shise-engine)。

## 功能

- **色谱**：537 色四季/九色系浏览，拼音去声调搜索，色卡详情（诗词、色阶、墨阶、搭配色、双轨可访问性小注）
- **拾色**：上传图片，OKLCH 空间 k-means++ 提取主色，DeltaE2000 匹配最近传统色；点击像素直接拾色
- **实验室**：和谐配色（互补/类似/三角/分裂互补）、WCAG 2.x + APCA 双轨对比矩阵、色阶预览、配色卡 PNG 导出、`?lab=` 分享链接
- **沙盒**：任一传统色 → 全套 TDesign Design Token，组件实时换装，CSS / JSON Token 一键下载
- **节气**：二十四节气 editorial 时间轴，今日节气自动定位
- **星图**：537 色 OKLCH 极坐标星图，引擎 11 色相分区可视化
- **主题**：任一传统色一键设为全站主题（引擎生成色阶替换 TDesign Token），亮/暗双模式

## 技术栈

- `packages/core`：`shise-engine` OKLCH 色阶引擎（与 shise-engine 仓库同源）
- `apps/gallery`：React 18 + TypeScript + tdesign-react + Vite

```bash
pnpm install
pnpm -r build          # 构建引擎 + 站点（产物 apps/gallery/dist）
pnpm --filter gallery dev   # 本地开发
```

## 文档

产品动机、设计理念、Miora / CodeBuddy 全流程产出记录见 `docs/task02/`。
Miora 视觉资产源文件见 `docs/task02/miora/`。

main 分支推送后由 GitHub Actions 自动构建并部署到 Pages。
