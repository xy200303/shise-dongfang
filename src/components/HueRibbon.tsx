/**
 * HueRibbon —— 「色相绸带」：色相族筛选控件（星图 / 色谱首页共用）
 *
 * 一条低饱和渐变绸带：stop 取各族灰润代表色（colorReps）、按 OKLCH 色相角
 * 定位，表面覆一层极淡丝绸光泽；族名小字缀于绸带下方各自色相中心。
 * 选中族在绸带上缀朱砂小印（纸色描边浮出带面），hover 有跟随柔光。
 * 「黑白灰」无色相：绸带右端留白一道缺口，接墨色→灰渐变小段。
 * 绸带分段与族名都可点（透明热区覆盖带面+标签，命中高 ≥44px）。
 * 标签中心按色相排序后做最小间距扩散，避免橙/褐这类近色相挤叠。
 */
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CATEGORY_TABS, type Category, type ColorEntry } from '../types';
import { categoryRep, hueOf, neutralPair } from '../colorReps';

interface Props {
  colors: ColorEntry[];
  /** 当前选中族；'all' 表示「全部」 */
  value: Category | 'all';
  onChange: (c: Category | 'all') => void;
}

interface HueSeg {
  key: Category;
  label: string;
  hex: string;
  /** 真实色相位置 0–1（渐变 stop 用） */
  frac: number;
  /** 扩散后的标签/热区中心 0–1 */
  center: number;
  left: number;
  right: number;
}

/** 标签中心最小间距（相对带宽），橙/褐这类近色相不挤叠 */
const MIN_GAP = 0.085;

export default function HueRibbon({ colors, value, onChange }: Props) {
  const [glowX, setGlowX] = useState('50%');
  const [glowOn, setGlowOn] = useState(false);

  const { segs, gradient } = useMemo(() => {
    const items = CATEGORY_TABS.filter((t) => t.key !== 'neutral')
      .map((t) => {
        const hex = categoryRep(colors, t.key);
        const h = hex ? hueOf(hex) : null;
        return hex && h != null
          ? { key: t.key, label: t.label, hex, frac: h / 360, center: 0, left: 0, right: 0 }
          : null;
      })
      .filter((s): s is HueSeg => s !== null)
      .sort((a, b) => a.frac - b.frac);

    // 最小间距扩散：保持顺序，整体居中回拉
    const centers = items.map((s) => s.frac);
    for (let i = 1; i < centers.length; i++) {
      centers[i] = Math.max(centers[i], centers[i - 1] + MIN_GAP);
    }
    const overflow = centers[centers.length - 1] - 0.965;
    if (overflow > 0) {
      for (let i = 0; i < centers.length; i++) centers[i] = Math.max(0.035, centers[i] - overflow);
    }

    const segs: HueSeg[] = items.map((s, i) => ({
      ...s,
      center: centers[i],
      left: i === 0 ? 0 : (centers[i - 1] + centers[i]) / 2,
      right: i === items.length - 1 ? 1 : (centers[i] + centers[i + 1]) / 2,
    }));
    const gradient = `linear-gradient(90deg, ${items
      .map((s) => `${s.hex} ${(s.frac * 100).toFixed(1)}%`)
      .join(', ')})`;
    return { segs, gradient };
  }, [colors]);

  const neutral = useMemo(() => neutralPair(colors), [colors]);

  const pick = (key: Category) => onChange(value === key ? 'all' : key);
  const selSeg = segs.find((s) => s.key === value) ?? null;

  return (
    <div className="hue-ribbon-scroll">
      <div className="hue-ribbon">
        {/* 「全部」：绸带左端外的墨色空圈 */}
        <button
          className={`hue-ribbon-all${value === 'all' ? ' active' : ''}`}
          onClick={() => onChange('all')}
        >
          <span className="hue-ribbon-all-ring" />
          <span className="hue-ribbon-all-name">全部</span>
        </button>

        {/* 绸带主体：八族按色相展开 */}
        <div
          className="hue-ribbon-main"
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            setGlowX(`${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
            setGlowOn(true);
          }}
          onMouseLeave={() => setGlowOn(false)}
        >
          <div className="hue-ribbon-band" style={{ background: gradient }}>
            <span className="hue-ribbon-sheen" />
            <span
              className="hue-ribbon-glow"
              style={{ '--gx': glowX, opacity: glowOn ? 1 : 0 } as CSSProperties}
            />
            {selSeg && (
              <span className="hue-ribbon-seal" style={{ left: `${selSeg.center * 100}%` }} />
            )}
          </div>
          <div className="hue-ribbon-labels">
            {segs.map((s) => (
              <span
                key={s.key}
                className={`hue-ribbon-label${value === s.key ? ' active' : ''}`}
                style={{ left: `${s.center * 100}%` }}
              >
                {s.label}
              </span>
            ))}
          </div>
          {/* 透明热区：覆盖带面 + 标签，命中高 ≥44px */}
          {segs.map((s) => (
            <button
              key={s.key}
              className="hue-ribbon-hot"
              style={{ left: `${s.left * 100}%`, width: `${(s.right - s.left) * 100}%` }}
              aria-label={`筛 ${s.label} 族`}
              onClick={() => pick(s.key)}
            />
          ))}
        </div>

        {/* 「黑白灰」：留白缺口后接墨色→灰渐变段 */}
        {neutral && (
          <div className="hue-ribbon-neutral">
            <div
              className="hue-ribbon-band"
              style={{ background: `linear-gradient(90deg, ${neutral.dark}, ${neutral.light})` }}
            >
              <span className="hue-ribbon-sheen" />
              {value === 'neutral' && <span className="hue-ribbon-seal" style={{ left: '50%' }} />}
            </div>
            <div className="hue-ribbon-labels">
              <span
                className={`hue-ribbon-label${value === 'neutral' ? ' active' : ''}`}
                style={{ left: '50%' }}
              >
                黑白灰
              </span>
            </div>
            <button
              className="hue-ribbon-hot"
              style={{ left: 0, width: '100%' }}
              aria-label="筛 黑白灰 族"
              onClick={() => pick('neutral')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
