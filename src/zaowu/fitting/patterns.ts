/**
 * fitting/patterns —— 云纹 / 回纹 / 缠枝的 Canvas 栅格化
 *
 * 纹样单元与 zaowu/patterns.tsx（SVG pattern）同稿，路径数据原样复用，
 * 转成 Path2D 平铺印花：染好色阶渐变的图集格上，用同族深色低透明度印纹，
 * 保持绸缎渐变可读。缠枝的圆点/叶瓣在 SVG 里是 <circle>/<path fill>，
 * 这里改写成等价 arc 路径。
 */

export type PatternKind = 'none' | 'yun' | 'hui' | 'chan';

export const PATTERN_CHOICES: { key: PatternKind; label: string }[] = [
  { key: 'none', label: '无纹' },
  { key: 'yun', label: '云纹' },
  { key: 'hui', label: '回纹' },
  { key: 'chan', label: '缠枝' },
];

interface PatternUnit {
  /** 单元尺寸（与 SVG pattern 的 width/height 一致） */
  w: number;
  h: number;
  /** 描边宽度（单元坐标系） */
  sw: number;
  strokes: string[];
  fills: string[];
}

const UNITS: Record<Exclude<PatternKind, 'none'>, PatternUnit> = {
  /* 云纹：卷云流转 */
  yun: {
    w: 56,
    h: 56,
    sw: 1.6,
    strokes: [
      'M14 40c-5-2-7-9-4-14 3-6 11-8 17-5 5 3 7 10 4 15-3 4-10 5-13 1',
      'M16 44h22',
      'M40 18c-3-1-4-5-2-8 2-3 6-4 9-2 3 2 4 6 2 8-2 2-5 3-7 1',
    ],
    fills: [],
  },
  /* 回纹：方折连绵，富贵不断头 */
  hui: {
    w: 26,
    h: 26,
    sw: 1.8,
    strokes: ['M3 23V7h16v12H9v-6h6'],
    fills: [],
  },
  /* 缠枝：枝蔓相缠，生生不息 */
  chan: {
    w: 72,
    h: 48,
    sw: 1.5,
    strokes: ['M-4 30C10 14 26 44 40 28S66 12 76 28'],
    fills: [
      'M18 30c2-6 8-8 12-6-2 5-8 8-12 6Z',
      'M50 22c2-6 8-8 12-6-2 5-8 8-12 6Z',
      'M34 38m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0',
      'M66 34m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0',
    ],
  },
};

/**
 * 把纹样平铺进图集格 (x,y,w,h)。深色面料用 screen 浅纹、浅色面料用
 * multiply 深纹（印/织进布面而非浮在面上），alpha 克制在 0.5 以内。
 */
export function stampPattern(
  ctx: CanvasRenderingContext2D,
  kind: PatternKind,
  x: number,
  y: number,
  w: number,
  h: number,
  lineColor: string,
  alpha = 0.45,
  composite: GlobalCompositeOperation = 'multiply',
): void {
  if (kind === 'none') return;
  const unit = UNITS[kind];
  // 单元缩放到格内密铺：高度方向约 2.2 个单元（单元大些，默认视距下亦可辨）
  const s = (h / unit.h) / 2.2;
  const tw = unit.w * s;
  const th = unit.h * s;
  const strokes = unit.strokes.map((d) => new Path2D(d));
  const fills = unit.fills.map((d) => new Path2D(d));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = composite;
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = lineColor;
  ctx.lineWidth = unit.sw * s * 1.5;
  ctx.lineCap = 'round';
  for (let ty = y - th; ty < y + h + th; ty += th) {
    for (let tx = x - tw; tx < x + w + tw; tx += tw) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(s, s);
      for (const p of strokes) ctx.stroke(p);
      for (const p of fills) ctx.fill(p);
      ctx.restore();
    }
  }
  ctx.restore();
}
