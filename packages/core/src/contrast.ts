import { converter, parse, wcagContrast } from './culori';
import { calcAPCA } from 'apca-w3';

const toRgb = converter('rgb');

function toChannels(color: string): [number, number, number, number] {
  const rgb = toRgb(parse(color) ?? '#000000')!;
  return [
    Math.round(Math.min(Math.max(rgb.r ?? 0, 0), 1) * 255),
    Math.round(Math.min(Math.max(rgb.g ?? 0, 0), 1) * 255),
    Math.round(Math.min(Math.max(rgb.b ?? 0, 0), 1) * 255),
    1,
  ];
}

/** WCAG 2.x 对比度（1~21） */
export function contrastRatio(a: string, b: string): number {
  return wcagContrast(a, b);
}

/**
 * APCA（WCAG 3 草案）感知对比度 Lc，约 -108 ~ +106。
 * 对极性敏感：深字浅底为正、浅字深底为负；|Lc| ≥ 60 可读性良好，≥ 75 适合正文。
 * 注意：APCA 尚未成为正式标准，宜与 WCAG 2.x 双轨参考。
 */
export function apcaContrast(text: string, bg: string): number {
  return calcAPCA(toChannels(text), toChannels(bg)) as number;
}

/**
 * 在给定底色上更可读的文字色（黑/白二选一）。
 * 双轨择优：WCAG 与 APCA 各自归一化到达标线（4.5:1 / Lc 60）后取短板，短板更长者胜——
 * 避免单一指标在中间明度区间选错边（如亮蓝底上 WCAG 偏好深字、APCA 偏好白字）。
 */
export function bestTextOn(bg: string): '#000000' | '#ffffff' {
  const score = (fg: '#000000' | '#ffffff') =>
    Math.min(wcagContrast(bg, fg) / 4.5, Math.abs(apcaContrast(fg, bg)) / 60);
  return score('#ffffff') >= score('#000000') ? '#ffffff' : '#000000';
}

export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

/** WCAG 2.x 等级判定 */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

/**
 * APCA 可访问文字级推荐：在色阶中从浅往深找第一级满足 |Lc| ≥ minLc 的颜色——
 * 即「给定底色上，正文从第几级起可用」（比它深的级同样达标）。
 * 传入 minWcag 时要求同时满足 WCAG 对比度（双轨）。
 * 返回 0-based 级别，找不到返回 -1。
 * 例：accessibleTextLevel(palette.colors, '#ffffff') → 白底正文可用第 N 级起。
 */
export function accessibleTextLevel(colors: string[], background: string, minLc = 75, minWcag = 0): number {
  for (let i = 0; i < colors.length; i += 1) {
    const lcOk = Math.abs(apcaContrast(colors[i], background)) >= minLc;
    const wcagOk = minWcag <= 0 || contrastRatio(colors[i], background) >= minWcag;
    if (lcOk && wcagOk) return i;
  }
  return -1;
}

export type UsageRole = '背景/填充' | '边框/装饰' | '大字标题' | '辅助文字' | '正文可用' | '正文推荐';

/**
 * 按 APCA Lc 推断某颜色在给定底色上的合适用途。
 * 中性色阶不是每级都该当文字：浅级做底色、中级做边框、深级做文字，
 * 对比度不达标对非文字用途而言不是缺陷。阈值对应 APCA 使用分级。
 */
export function usageHint(fg: string, bg: string): UsageRole {
  const lc = Math.abs(apcaContrast(fg, bg));
  if (lc >= 75) return '正文推荐';
  if (lc >= 60) return '正文可用';
  if (lc >= 45) return '辅助文字';
  if (lc >= 30) return '大字标题';
  if (lc >= 15) return '边框/装饰';
  return '背景/填充';
}
