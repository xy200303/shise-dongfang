import { useMemo, useRef, useState } from 'react';
import { converter, HUE_ZONES } from '@palette-studio/core';
import type { Oklch } from '@palette-studio/core';
import type { Category, ColorEntry, Season } from '../types';
import { CATEGORY_TABS, SEASONS } from '../types';
import './starmap.css';

const C_MAX = 0.37; // 数据集彩度上限（半径归一化基准）
const SIZE = 780;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 76; // 星图半径，外圈留给分区标注

// 散点视图几何
const SW = 780;
const SH = 520;
const PAD = { l: 56, r: 24, t: 24, b: 48 };

const toOklch = converter('oklch');

/** 引擎 11 个色相分区的中文标注 */
const ZONE_LABELS: Record<string, string> = {
  red: '红',
  orange: '橙',
  yellow: '黄',
  lemon: '鹅黄',
  lime: '柳绿',
  green: '绿',
  mint: '碧',
  cyan: '青',
  blue: '蓝',
  purple: '紫',
  pink: '粉',
};

interface StarPoint {
  entry: ColorEntry;
  l: number;
  c: number;
  h: number;
}

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
}

/** 极坐标：色相 0° 置于正上方，顺时针展开 */
function polarXY(hDeg: number, r: number): [number, number] {
  const rad = ((hDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function scatterXY(c: number, l: number): [number, number] {
  const x = PAD.l + (Math.min(c, C_MAX) / C_MAX) * (SW - PAD.l - PAD.r);
  const y = PAD.t + (1 - l) * (SH - PAD.t - PAD.b);
  return [x, y];
}

export default function StarMapPage({ colors, onPickColor }: Props) {
  const [view, setView] = useState<'polar' | 'scatter'>('polar');
  const [cat, setCat] = useState<Category | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [hover, setHover] = useState<{ entry: ColorEntry; x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const points = useMemo<StarPoint[]>(
    () =>
      colors.map((entry) => {
        const ok = toOklch(entry.hex) as Oklch;
        return { entry, l: ok.l, c: ok.c, h: ok.h ?? 0 };
      }),
    [colors],
  );

  const isLit = (p: StarPoint) =>
    (!cat || p.entry.category === cat) &&
    (!season || p.entry.season === season || p.entry.season === '四季');

  const onDotHover = (e: React.MouseEvent, entry: ColorEntry) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (!box) return;
    setHover({ entry, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const renderDot = (p: StarPoint) => {
    const lit = isLit(p);
    const [x, y] = view === 'polar' ? polarXY(p.h, (p.c / C_MAX) * R) : scatterXY(p.c, p.l);
    const r = view === 'polar' ? 2.2 + p.l * 3.2 : 2.4 + p.l * 2.4;
    const opacity = lit ? 0.35 + p.l * 0.6 : 0.08;
    const hovered = hover?.entry.id === p.entry.id;
    return (
      <circle
        key={p.entry.id}
        cx={x}
        cy={y}
        r={hovered ? r + 1.6 : r}
        fill={p.entry.hex}
        opacity={opacity}
        stroke={hovered ? 'var(--td-text-color-primary)' : 'none'}
        strokeWidth={hovered ? 1 : 0}
        style={{ cursor: 'pointer', transition: 'opacity 200ms ease-out' }}
        onMouseMove={(e) => onDotHover(e, p.entry)}
        onMouseLeave={() => setHover(null)}
        onClick={() => onPickColor(p.entry)}
      />
    );
  };

  // 分区边界与标注：边界取区间起点，标注置于区间中角（red 跨 0° 需特判）
  const zoneOverlay = HUE_ZONES.map((z) => {
    const [from, to] = z.range;
    const mid = from <= to ? (from + to) / 2 : ((from + to + 360) / 2) % 360;
    const [x1, y1] = polarXY(from, 12);
    const [x2, y2] = polarXY(from, R + 8);
    const [lx, ly] = polarXY(mid, R + 42);
    return (
      <g key={z.name}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="var(--td-component-border)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <text x={lx} y={ly} className="starmap-zone-label" textAnchor="middle" dominantBaseline="middle">
          {ZONE_LABELS[z.name] ?? z.name}
          <tspan className="starmap-zone-label-en" dx={6}>
            {z.name}
          </tspan>
        </text>
      </g>
    );
  });

  return (
    <main className="wrap starmap-page">
      <header className="starmap-head">
        <h1 className="starmap-title">色彩星图</h1>
        <p className="starmap-sub">五百三十七色，各安其位</p>
      </header>

      <hr className="hairline" />

      {/* 控制行：视图切换 + 筛选 */}
      <div className="starmap-controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab${view === 'polar' ? ' active' : ''}`}
            onClick={() => setView('polar')}
          >
            极坐标 · 色相×彩度
          </button>
          <button
            className={`filter-tab${view === 'scatter' ? ' active' : ''}`}
            onClick={() => setView('scatter')}
          >
            散点 · 明度×彩度
          </button>
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab${!cat && !season ? ' active' : ''}`}
            onClick={() => {
              setCat(null);
              setSeason(null);
            }}
          >
            全部
          </button>
          <span className="starmap-ctrl-divider" />
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.key}
              className={`filter-tab${cat === t.key ? ' active' : ''}`}
              onClick={() => {
                setCat(cat === t.key ? null : t.key);
                setSeason(null);
              }}
            >
              {t.label}
            </button>
          ))}
          <span className="starmap-ctrl-divider" />
          {SEASONS.map((s) => (
            <button
              key={s}
              className={`filter-tab${season === s ? ' active' : ''}`}
              onClick={() => {
                setSeason(season === s ? null : s);
                setCat(null);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 星图 */}
      <div className="starmap-chart" ref={chartRef}>
        {view === 'polar' ? (
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="starmap-svg" role="img" aria-label="色彩星图（极坐标）">
            {/* 彩度参考环 */}
            {[0.1, 0.2, 0.3, C_MAX].map((c) => (
              <circle
                key={c}
                cx={CX}
                cy={CY}
                r={(c / C_MAX) * R}
                fill="none"
                stroke="var(--td-component-border)"
                strokeWidth={c === C_MAX ? 1 : 0.5}
                strokeDasharray={c === C_MAX ? 'none' : '2 5'}
              />
            ))}
            {[0.1, 0.2, 0.3].map((c) => (
              <text
                key={c}
                x={CX + (c / C_MAX) * R}
                y={CY - 6}
                className="starmap-ring-label"
                textAnchor="middle"
              >
                C {c.toFixed(1)}
              </text>
            ))}
            {zoneOverlay}
            {/* 先画暗点（被筛掉的），再画亮点，保证选中组浮于上层 */}
            {points.filter((p) => !isLit(p)).map(renderDot)}
            {points.filter((p) => isLit(p)).map(renderDot)}
            <circle cx={CX} cy={CY} r={2} fill="var(--td-text-color-placeholder)" />
          </svg>
        ) : (
          <svg viewBox={`0 0 ${SW} ${SH}`} className="starmap-svg" role="img" aria-label="色彩星图（散点）">
            {/* 坐标轴 */}
            <line
              x1={PAD.l}
              y1={SH - PAD.b}
              x2={SW - PAD.r}
              y2={SH - PAD.b}
              stroke="var(--td-component-border)"
            />
            <line
              x1={PAD.l}
              y1={PAD.t}
              x2={PAD.l}
              y2={SH - PAD.b}
              stroke="var(--td-component-border)"
            />
            {/* C 轴刻度 */}
            {[0, 0.1, 0.2, 0.3].map((c) => {
              const [x] = scatterXY(c, 0);
              return (
                <g key={c}>
                  <line x1={x} y1={SH - PAD.b} x2={x} y2={SH - PAD.b + 5} stroke="var(--td-component-border)" />
                  <text x={x} y={SH - PAD.b + 20} className="starmap-axis-label" textAnchor="middle">
                    {c.toFixed(1)}
                  </text>
                </g>
              );
            })}
            <text x={SW - PAD.r} y={SH - PAD.b + 20} className="starmap-axis-label" textAnchor="end">
              彩度 C →
            </text>
            {/* L 轴刻度 */}
            {[0, 0.25, 0.5, 0.75, 1].map((l) => {
              const [, y] = scatterXY(0, l);
              return (
                <g key={l}>
                  <line x1={PAD.l - 5} y1={y} x2={PAD.l} y2={y} stroke="var(--td-component-border)" />
                  <text x={PAD.l - 10} y={y + 4} className="starmap-axis-label" textAnchor="end">
                    {l.toFixed(2)}
                  </text>
                </g>
              );
            })}
            <text x={PAD.l - 10} y={PAD.t - 8} className="starmap-axis-label" textAnchor="start">
              ↑ 明度 L
            </text>
            {points.filter((p) => !isLit(p)).map(renderDot)}
            {points.filter((p) => isLit(p)).map(renderDot)}
          </svg>
        )}

        {hover && (
          <div
            className="starmap-tooltip"
            style={{ left: hover.x + 16, top: hover.y + 16 }}
          >
            <span className="starmap-tooltip-chip" style={{ backgroundColor: hover.entry.hex }} />
            <div className="starmap-tooltip-body">
              <p className="starmap-tooltip-name">
                {hover.entry.name}
                <em className="font-mono">{hover.entry.hex.toUpperCase()}</em>
              </p>
              {hover.entry.poem && (
                <p className="starmap-tooltip-poem">
                  {hover.entry.poem}
                  {hover.entry.poemSource && <i>—— {hover.entry.poemSource}</i>}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <hr className="hairline" />

      {/* 图例与说明 */}
      <section className="starmap-legend">
        <h2 className="starmap-legend-title">读图</h2>
        <div className="starmap-legend-grid">
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot" style={{ opacity: 0.95 }} />
            <p>
              <strong>角度即色相。</strong>极坐标中，0° 红置于正上方，顺时针走完一圈色相环；
              外圈的十一段虚线是色阶引擎的 11 个色相分区边界——每一区有自己独立的明度节奏
              与彩度上限，全站色阶即由此生成。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-small" />
            <p>
              <strong>半径即彩度。</strong>离圆心越远色越浓（C 至 0.37），越近越灰；
              黑白灰诸色没有色相，自然落在圆心附近。散点视图则把彩度与明度铺开成平面。
            </p>
          </div>
          <div className="starmap-legend-item">
            <span className="starmap-legend-dot starmap-legend-dot-dim" />
            <p>
              <strong>大小与明度同行。</strong>点越大、越亮，明度 L 越高。
              为什么这样看 537 色：色相、彩度、明度是感知均匀的三根轴，
              按它们布星，相近的色互为近邻，色系的聚散、四季的冷暖，一眼可辨。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
