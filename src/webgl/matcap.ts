/**
 * matcap —— 程序化釉面 MatCap 烘焙（Canvas 2D → WebGL 贴图）
 *
 * 256×256 matcap 分层：暗部(明度≈35%) / 中间调(本色) / 高光带(近白)
 * + 左上锐利高光点 + 边缘 rim 提亮。换色时逐帧重烘即可得到釉色渐变过渡。
 * GlazeCanvas 与 VesselScene 共用。
 */

export type V3 = [number, number, number];

export function rgbToHsl(r: number, g: number, b: number): V3 {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb(h: number, s: number, l: number): V3 {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

export function mix3(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function css(c: V3, alpha = 1): string {
  const r = Math.round(Math.min(1, Math.max(0, c[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, c[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, c[2])) * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** MatCap 烘焙：暗部 / 中间调 / 高光带 / 锐利高光点 / rim */
export function bakeMatcap(ctx: CanvasRenderingContext2D, size: number, base: V3): void {
  const [h, s, l] = rgbToHsl(base[0], base[1], base[2]);
  const shadow = hslToRgb(h, Math.min(1, s * 1.05), Math.max(0.07, l * 0.35));
  const mid = base;
  const hi = mix3(base, [1, 1, 1], 0.85);
  const rim = mix3(base, [1, 1, 1], 0.6);
  const c = size / 2;
  const TAU = Math.PI * 2;

  // 底：暗部铺底
  ctx.fillStyle = css(shadow);
  ctx.fillRect(0, 0, size, size);

  // 球体主体：中间调 → 暗部的径向衰减
  let g = ctx.createRadialGradient(c, c, size * 0.08, c, c, c);
  g.addColorStop(0, css(mid));
  g.addColorStop(0.62, css(mix3(mid, shadow, 0.35)));
  g.addColorStop(0.9, css(mix3(mid, shadow, 0.8)));
  g.addColorStop(1, css(shadow));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, TAU);
  ctx.fill();

  // 大面积柔光（高光带，左上偏移）
  g = ctx.createRadialGradient(size * 0.44, size * 0.4, 0, size * 0.44, size * 0.4, size * 0.32);
  g.addColorStop(0, css(hi, 0.32));
  g.addColorStop(1, css(hi, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size * 0.44, size * 0.4, size * 0.32, 0, TAU);
  ctx.fill();

  // 锐利高光点（小半径白色 radialGradient，瓷釉的莹润来源）
  const sx = size * 0.36;
  const sy = size * 0.3;
  g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 0.09);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, size * 0.09, 0, TAU);
  ctx.fill();

  // 边缘一圈轻微 rim 提亮，收边处回落到暗部
  g = ctx.createRadialGradient(c, c, size * 0.36, c, c, c);
  g.addColorStop(0, css(rim, 0));
  g.addColorStop(0.82, css(rim, 0));
  g.addColorStop(0.95, css(rim, 0.32));
  g.addColorStop(1, css(shadow, 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, TAU);
  ctx.fill();
}
