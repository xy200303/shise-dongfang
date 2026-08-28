import { generateTheme } from '@palette-studio/core';
import type { ColorEntry } from './types';

const W = 1200;
const H = 630;
const PAD = 48;
const PAPER = '#FAF8F4';
const INK = '#1A1A18';
const INK_LIGHT = '#6B6862';
const SERIF = '"Noto Serif SC","Songti SC",serif';
const MONO = '"JetBrains Mono","SF Mono",monospace';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 单行文本超出宽度时截断加省略号 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/** 绘制 1200×630 分享卡片并下载 PNG */
export async function exportShareCard(color: ColorEntry): Promise<void> {
  await document.fonts?.ready;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 底：宣纸
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // 左 40%：纯色大色块
  const blockW = Math.round(W * 0.4);
  ctx.fillStyle = color.hex;
  ctx.fillRect(0, 0, blockW, H);

  // 右 60% 内容区
  const rx = blockW + PAD;
  const rw = W - blockW - PAD * 2;
  let y = PAD + 84;

  // 色名（衬线大字）
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 72px ${SERIF}`;
  ctx.fillText(color.name, rx, y);

  // 拼音（等宽小字）
  y += 44;
  ctx.fillStyle = INK_LIGHT;
  ctx.font = `24px ${MONO}`;
  ctx.fillText(color.pinyin, rx, y);

  // 诗词 + 出处（灰色小字，无则省略）
  if (color.poem) {
    y += 72;
    ctx.fillStyle = INK;
    ctx.font = `26px ${SERIF}`;
    ctx.fillText(fitText(ctx, color.poem, rw), rx, y);
    if (color.poemSource) {
      y += 42;
      ctx.fillStyle = INK_LIGHT;
      ctx.font = `20px ${SERIF}`;
      ctx.fillText(fitText(ctx, `—— ${color.poemSource}`, rw), rx, y);
    }
  }

  // HEX（等宽）
  y += 72;
  ctx.fillStyle = INK;
  ctx.font = `30px ${MONO}`;
  ctx.fillText(color.hex.toUpperCase(), rx, y);

  // 底部 10 级色阶细带（通栏圆角 4px，高 24px）
  const stripH = 24;
  const stripY = H - PAD - stripH;
  const scale = generateTheme(color.hex).colors;
  const cellW = rw / scale.length;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rx, stripY, rw, stripH, 4);
  ctx.clip();
  scale.forEach((hex, i) => {
    ctx.fillStyle = hex;
    ctx.fillRect(rx + i * cellW, stripY, cellW + 1, stripH);
  });
  ctx.restore();

  // 右下角小 logo（压到色阶带上方留白处）
  const logo = await loadImage(`${import.meta.env.BASE_URL}logo-icon.png`);
  if (logo) {
    const size = 48;
    ctx.drawImage(logo, W - PAD - size, stripY - size - 20, size, size);
  }

  // 导出下载
  const a = document.createElement('a');
  a.download = `拾色-${color.name}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
