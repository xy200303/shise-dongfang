/**
 * fitting/dye —— 图集格染色
 *
 * KayKit 角色用单材质 8×4 调色板图集（每格 128×256，上浅下深竖向渐变）。
 * 克隆底图到 canvas 后，把插槽命中的图集格重绘为目标色的竖向渐变：
 * 亮/中/暗三档取引擎 generatePalette 色阶（主级 ±2），保持原图集的明暗过渡；
 * 可纹格再叠云纹/回纹/缠枝印花（patterns.ts）。
 * 皮肤格不进任何插槽的染色清单，头部肤色因此绝不串色。
 */
import { generatePalette } from 'shise-engine';
import { stampPattern, type PatternKind } from './patterns';

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;

export interface CellDye {
  /** 图集格序号（行优先，0–31；r0 为图顶，对应 GLTF flipY=false 的 v=0） */
  cell: number;
  /** 相对主色级的偏移：叠染的暗格取正（如衬里 +2）、亮格取负 */
  shade?: number;
}

/**
 * 重绘整张图集：先铺原图，再按插槽逐格染渐变；
 * patternSlots 里的插槽格再叠一层纹样印花（同族深一档、低透明度）。
 */
export function repaintAtlas(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  dye: Record<string, CellDye[]>,
  assignments: Record<string, string>,
  pattern: PatternKind = 'none',
  patternSlots: string[] = [],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cw = canvas.width / ATLAS_COLS;
  const ch = canvas.height / ATLAS_ROWS;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const [slotId, cells] of Object.entries(dye)) {
    const hex = assignments[slotId];
    if (!hex) continue;
    const palette = generatePalette(hex);
    const scale = palette.colors; // 0 最浅 → 9 最深
    const patternable = patternSlots.includes(slotId);
    for (const { cell, shade = 0 } of cells) {
      const mid = Math.max(0, Math.min(9, palette.primaryIndex + shade));
      const x = (cell % ATLAS_COLS) * cw;
      const y = Math.floor(cell / ATLAS_COLS) * ch;
      const g = ctx.createLinearGradient(0, y, 0, y + ch);
      g.addColorStop(0, scale[Math.max(0, mid - 2)]);
      g.addColorStop(0.5, scale[mid]);
      g.addColorStop(1, scale[Math.min(9, mid + 2)]);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cw, ch);
      if (patternable) {
        // 纹线取同族对比档：面料深则 screen 浅纹（更亮更密才抗住光照洗白）、
        // 面料浅则 multiply 深纹（印进布面）
        const darkFabric = mid >= 5;
        const lineIdx = darkFabric ? Math.max(0, mid - 5) : Math.min(9, mid + 4);
        stampPattern(
          ctx,
          pattern,
          x,
          y,
          cw,
          ch,
          scale[lineIdx],
          darkFabric ? 0.6 : 0.45,
          darkFabric ? 'screen' : 'multiply',
        );
      }
    }
  }
}
