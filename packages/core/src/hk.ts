/**
 * Helmholtz–Kohlrausch 效应（H-K 效应）明度补偿。
 *
 * 心理物理学事实：同等物理明度下，高彩度色「看起来」更亮（蓝紫系最强、黄绿系最弱）。
 * 色阶中级彩度最高 → 感知明度曲线在中级会有一个「鼓包」，级间步进显得前松后紧。
 * 补偿策略：按彩度占比与色相权重把每级明度微微下压（最大约 2%），
 * 让「感知上」的明度步进恢复均匀。补偿是保守的，实测明度仍严格单调。
 */

/** H-K 效应色相权重：290°（蓝紫）附近最强，90°（黄绿）附近最弱 */
export function hkHueWeight(h: number): number {
  const hh = ((h % 360) + 360) % 360;
  const d = Math.min(Math.abs(hh - 290), 360 - Math.abs(hh - 290));
  return 0.35 + 0.65 * Math.exp(-((d / 110) ** 2));
}

/** 补偿强度：彩度拉满、权重拉满时明度下压 0.022（约 2%） */
export const HK_STRENGTH = 0.022;

/** 计算明度补偿量（非负），chromaRatio ∈ [0,1] 为彩度占色域包络的比例 */
export function hkAdjustment(h: number, chromaRatio: number): number {
  return HK_STRENGTH * Math.min(Math.max(chromaRatio, 0), 1) * hkHueWeight(h);
}
