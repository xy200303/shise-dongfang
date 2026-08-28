import { useMemo, useState } from 'react';
import { Button, MessagePlugin } from 'tdesign-react';
import {
  apcaContrast,
  bestTextOn,
  contrastRatio,
  differenceCiede2000,
  generatePalette,
  harmonyColors,
  usageHint,
  wcagLevel,
} from '@palette-studio/core';
import type { HarmonyResult } from '@palette-studio/core';
import type { ColorEntry } from '../types';
import './lab.css';

const deltaE = differenceCiede2000();

/** 默认基色：朱砂（与全站默认主题一致） */
const DEFAULT_BASE = '#C8473F';

interface HarmonyGroup {
  key: keyof HarmonyResult;
  label: string;
  partners: string[];
}

interface PartnerMatch {
  entry: ColorEntry;
  de: number;
}

interface LabData {
  harmony: HarmonyResult;
  groups: HarmonyGroup[];
  /** 去重后的全部搭档色（保持组内顺序） */
  partners: string[];
  /** partner hex -> 最接近的传统色 */
  matches: Map<string, PartnerMatch>;
  palette: ReturnType<typeof generatePalette>;
}

function normalizeHex(text: string): string | null {
  const t = text.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t.split('').map((c) => c + c).join('').toLowerCase()}`;
  }
  return null;
}

function findNearest(hex: string, colors: ColorEntry[]): PartnerMatch {
  let best = colors[0];
  let bestDe = Infinity;
  for (const c of colors) {
    const de = deltaE(hex, c.hex);
    if (de < bestDe) {
      bestDe = de;
      best = c;
    }
  }
  return { entry: best, de: bestDe };
}

/* ===== Canvas 导出 ===== */

const W = 1200;
const H = 630;
const PAD = 48;
const PAPER = '#FAF8F4';
const INK = '#1A1A18';
const INK_LIGHT = '#6B6862';
const LINE = '#DDD8CF';
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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

interface CardModel {
  base: string;
  entry: ColorEntry | null;
  groups: HarmonyGroup[];
  matches: Map<string, PartnerMatch>;
  palette: ReturnType<typeof generatePalette>;
}

/** 绘制 1200×630 配色卡并下载 PNG */
async function exportLabCard(model: CardModel): Promise<void> {
  await document.fonts?.ready;
  const { base, entry, groups, matches, palette } = model;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 底：宣纸
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // 左：基色大色块
  const blockW = 300;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, blockW, H);
  const onBase = bestTextOn(base);
  ctx.fillStyle = onBase;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 56px ${SERIF}`;
  ctx.fillText(entry?.name ?? '自定义色', PAD, H - 168);
  ctx.globalAlpha = 0.85;
  ctx.font = `20px ${MONO}`;
  ctx.fillText(entry?.pinyin ?? 'custom', PAD, H - 128);
  ctx.font = `22px ${MONO}`;
  ctx.fillText(base.toUpperCase(), PAD, H - 88);
  ctx.globalAlpha = 1;

  // 右侧内容区
  const rx = blockW + PAD;
  const rw = W - blockW - PAD * 2;
  let y = PAD + 36;

  // 题头：站点名 + 诗句
  ctx.fillStyle = INK;
  ctx.font = `600 28px ${SERIF}`;
  ctx.fillText('拾色 · 配色实验室', rx, y);
  if (entry?.poem) {
    ctx.fillStyle = INK_LIGHT;
    ctx.font = `18px ${SERIF}`;
    ctx.fillText(fitText(ctx, `${entry.poem} —— ${entry.poemSource}`, rw), rx, y + 34);
  }
  y += 72;

  // hairline
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx, y);
  ctx.lineTo(rx + rw, y);
  ctx.stroke();
  y += 28;

  // 四组和谐方案
  const rowH = 88;
  const labelW = 96;
  groups.forEach((group) => {
    ctx.fillStyle = INK_LIGHT;
    ctx.font = `16px ${SERIF}`;
    ctx.fillText(group.label, rx, y + 34);

    const cellW = (rw - labelW) / 2;
    group.partners.forEach((hex, i) => {
      const cx = rx + labelW + i * cellW;
      const match = matches.get(hex);
      // 色块
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, y, 64, 56, 6);
      ctx.clip();
      ctx.fillStyle = hex;
      ctx.fillRect(cx, y, 64, 56);
      ctx.restore();
      // 文字
      const tx = cx + 80;
      ctx.fillStyle = INK;
      ctx.font = `18px ${MONO}`;
      ctx.fillText(hex.toUpperCase(), tx, y + 20);
      ctx.fillStyle = INK_LIGHT;
      ctx.font = `15px ${SERIF}`;
      if (match) {
        ctx.fillText(
          fitText(ctx, `≈ ${match.entry.name} ΔE ${match.de.toFixed(1)}`, cellW - 92),
          tx,
          y + 42,
        );
      }
      const ratio = contrastRatio(base, hex);
      const lc = Math.abs(apcaContrast(base, hex));
      ctx.font = `14px ${MONO}`;
      ctx.fillText(
        fitText(ctx, `WCAG ${ratio.toFixed(2)} ${wcagLevel(ratio)} · Lc ${lc.toFixed(0)}`, cellW - 92),
        tx,
        y + 64,
      );
    });
    y += rowH;
  });

  // 底部 10 级色阶细带
  const stripH = 20;
  const stripY = H - PAD - stripH;
  const cellW = rw / palette.colors.length;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rx, stripY, rw, stripH, 4);
  ctx.clip();
  palette.colors.forEach((hex, i) => {
    ctx.fillStyle = hex;
    ctx.fillRect(rx + i * cellW, stripY, cellW + 1, stripH);
  });
  ctx.restore();

  // logo + 落款
  const logo = await loadImage(`${import.meta.env.BASE_URL}logo-icon.png`);
  if (logo) {
    const size = 40;
    ctx.drawImage(logo, rx, stripY - size - 16, size, size);
  }
  ctx.fillStyle = INK_LIGHT;
  ctx.font = `16px ${SERIF}`;
  ctx.fillText('拾色 · 东方 —— 中国传统色主题馆', rx + 52, stripY - 28);

  const a = document.createElement('a');
  a.download = `拾色-实验室-${entry?.name ?? base.replace('#', '')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

/* ===== 页面 ===== */

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
  /** 从分享链接 ?lab=rrggbb 进入时的初始基色 */
  initialBase?: string;
}

export default function LabPage({ colors, onPickColor, initialBase }: Props) {
  const [base, setBase] = useState(() => (initialBase && normalizeHex(initialBase)) || DEFAULT_BASE);
  const [hexText, setHexText] = useState(() => (initialBase && normalizeHex(initialBase)) || DEFAULT_BASE);

  const byHex = useMemo(
    () => new Map(colors.map((c) => [c.hex.toLowerCase(), c])),
    [colors],
  );
  const entry = byHex.get(base.toLowerCase()) ?? null;

  const setBaseColor = (hex: string) => {
    setBase(hex);
    setHexText(hex);
  };

  const roll = () => {
    const c = colors[Math.floor(Math.random() * colors.length)];
    setBaseColor(c.hex);
    MessagePlugin.success(`掷得「${c.name}」`);
  };

  const onHexText = (text: string) => {
    setHexText(text);
    const valid = normalizeHex(text);
    if (valid) setBase(valid);
  };
  const hexInvalid = normalizeHex(hexText) === null;

  // 重计算集中在此：和谐方案、DE2000 传统色匹配、色阶
  const lab = useMemo<LabData>(() => {
    const harmony = harmonyColors(base);
    const groups: HarmonyGroup[] = [
      { key: 'complementary', label: '互补', partners: [harmony.complementary] },
      { key: 'analogous', label: '类似', partners: [...harmony.analogous] },
      { key: 'triadic', label: '三角', partners: [...harmony.triadic] },
      { key: 'splitComplementary', label: '分裂互补', partners: [...harmony.splitComplementary] },
    ];
    const partners = [...new Set(groups.flatMap((g) => g.partners))];
    const matches = new Map<string, PartnerMatch>();
    partners.forEach((hex) => matches.set(hex, findNearest(hex, colors)));
    return { harmony, groups, partners, matches, palette: generatePalette(base) };
  }, [base, colors]);

  // 矩阵条目：基色 + 全部搭档
  const matrixItems = useMemo(
    () => [
      { hex: base, label: '基色' },
      ...lab.partners.map((hex, i) => ({ hex, label: `搭档 ${i + 1}` })),
    ],
    [base, lab.partners],
  );

  const exportCard = () => {
    void exportLabCard({ base, entry, groups: lab.groups, matches: lab.matches, palette: lab.palette }).then(
      () => MessagePlugin.success('已导出配色卡 PNG'),
    );
  };

  // 分享：基色编码进 URL（?lab=rrggbb），零后端，打开即复现这套配色
  const share = () => {
    const url = new URL(window.location.href);
    url.search = `?lab=${base.replace('#', '')}`;
    void navigator.clipboard.writeText(url.toString()).then(
      () => MessagePlugin.success('分享链接已复制，打开即复现这套配色'),
      () => MessagePlugin.warning('复制失败，请手动复制地址栏链接'),
    );
  };

  return (
    <main className="wrap lab-page">
      <header className="lab-head">
        <h1 className="lab-title">配色实验室</h1>
        <p className="lab-sub">以一色为基，推演和谐、校验对比、预览色阶</p>
      </header>

      <hr className="hairline" />

      {/* 基色 */}
      <section className="lab-section">
        <h2 className="lab-section-title">基色</h2>
        <div className="lab-base-row">
          <div className="lab-base-swatch" style={{ backgroundColor: base }}>
            <span style={{ color: bestTextOn(base) }}>{entry?.name ?? base.toUpperCase()}</span>
          </div>
          <div className="lab-base-info">
            {entry ? (
              <>
                <p className="lab-base-name">
                  {entry.name}
                  <span className="lab-base-pinyin">{entry.pinyin}</span>
                </p>
                {entry.poem && (
                  <p className="lab-base-poem">
                    {entry.poem}
                    {entry.poemSource && <span className="lab-base-poem-src">—— {entry.poemSource}</span>}
                  </p>
                )}
              </>
            ) : (
              <p className="lab-base-name">
                自定义色<span className="lab-base-pinyin">{base.toUpperCase()}</span>
              </p>
            )}
            <div className="lab-base-controls">
              <input
                className={`lab-hex-input${hexInvalid ? ' invalid' : ''}`}
                value={hexText}
                onChange={(e) => onHexText(e.target.value)}
                placeholder="#C8473F"
                spellCheck={false}
              />
              <input
                className="lab-color-input"
                type="color"
                value={normalizeHex(hexText) ?? base}
                onChange={(e) => setBaseColor(e.target.value)}
                title="拾色器"
              />
              <Button variant="outline" onClick={roll}>
                掷色
              </Button>
              <Button theme="primary" onClick={exportCard}>
                导出色卡
              </Button>
              <Button variant="outline" onClick={share}>
                分享链接
              </Button>
            </div>
          </div>
        </div>
      </section>

      <hr className="hairline" />

      {/* 和谐配色 */}
      <section className="lab-section">
        <h2 className="lab-section-title">和谐配色</h2>
        {lab.groups.map((group) => (
          <div className="lab-harmony-group" key={group.key}>
            <p className="lab-harmony-name">{group.label}</p>
            <div className="lab-harmony-strip">
              <div className="lab-harmony-cell" style={{ backgroundColor: base }}>
                <span style={{ color: bestTextOn(base) }}>基色 {base.toUpperCase()}</span>
              </div>
              {group.partners.map((hex) => {
                const match = lab.matches.get(hex);
                return (
                  <div className="lab-harmony-pair" key={hex}>
                    <div className="lab-harmony-cell" style={{ backgroundColor: hex }}>
                      <span style={{ color: bestTextOn(hex) }}>{hex.toUpperCase()}</span>
                    </div>
                    {match && (
                      <button
                        className="lab-match"
                        onClick={() => onPickColor(match.entry)}
                        title={`查看「${match.entry.name}」`}
                      >
                        <i style={{ backgroundColor: match.entry.hex }} />
                        最接近的传统色：{match.entry.name}
                        <em>ΔE={match.de.toFixed(1)}</em>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <hr className="hairline" />

      {/* 对比度双轨 */}
      <section className="lab-section">
        <h2 className="lab-section-title">对比度 · 双轨校验</h2>
        <div className="lab-matrix-wrap">
          <table className="lab-matrix">
            <thead>
              <tr>
                <th className="lab-matrix-corner">文字 \ 底色</th>
                {matrixItems.map((c) => (
                  <th key={c.hex}>
                    <i style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixItems.map((fg) => (
                <tr key={fg.hex}>
                  <th>
                    <i style={{ backgroundColor: fg.hex }} />
                    {fg.label}
                  </th>
                  {matrixItems.map((bg) => {
                    if (fg.hex === bg.hex) {
                      return <td key={bg.hex} className="lab-matrix-self" />;
                    }
                    const ratio = contrastRatio(fg.hex, bg.hex);
                    const level = wcagLevel(ratio);
                    const lc = apcaContrast(fg.hex, bg.hex);
                    return (
                      <td key={bg.hex} className={level === 'fail' ? 'weak' : ''}>
                        <span className="lab-matrix-ratio">{ratio.toFixed(2)}</span>
                        <span className="lab-matrix-meta">
                          {level} · Lc {lc.toFixed(0)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lab-note">
          WCAG 2.x：≥7 AAA / ≥4.5 AA / ≥3 AA-large；APCA Lc：|Lc|≥60 可读性良好，≥75 适合正文。
        </p>

        <div className="lab-samples">
          {lab.partners.map((hex, i) => {
            const ratio = contrastRatio(base, hex);
            const level = wcagLevel(ratio);
            const lc = apcaContrast(base, hex);
            return (
              <div className="lab-sample" key={hex} style={{ backgroundColor: hex }}>
                <div className="lab-sample-glyphs" style={{ color: base }}>
                  <span className="lab-sample-yong">永</span>
                  <span className="lab-sample-word">東方</span>
                </div>
                <p className="lab-sample-meta" style={{ color: base }}>
                  基色 × 搭档{i + 1} · {ratio.toFixed(2)} {level} · Lc {lc.toFixed(0)} ·{' '}
                  {usageHint(base, hex)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <hr className="hairline" />

      {/* 色阶预览 */}
      <section className="lab-section">
        <h2 className="lab-section-title">色阶预览</h2>
        <p className="lab-scale-caption">亮色十级</p>
        <div className="lab-scale-strip">
          {lab.palette.colors.map((hex, i) => (
            <div key={i} className="lab-scale-cell" style={{ backgroundColor: hex }} title={hex}>
              {i === lab.palette.primaryIndex && <span className="lab-scale-marker" />}
            </div>
          ))}
        </div>
        <div className="lab-scale-labels">
          <span>1</span>
          <span>主色 · {lab.palette.primaryIndex + 1}</span>
          <span>10</span>
        </div>
        <p className="lab-scale-caption">暗色十级</p>
        <div className="lab-scale-strip">
          {lab.palette.darkColors.map((hex, i) => (
            <div key={i} className="lab-scale-cell" style={{ backgroundColor: hex }} title={hex}>
              {i === lab.palette.darkPrimaryIndex && <span className="lab-scale-marker" />}
            </div>
          ))}
        </div>
        <div className="lab-scale-labels">
          <span>1</span>
          <span>主色 · {lab.palette.darkPrimaryIndex + 1}</span>
          <span>10</span>
        </div>
      </section>
    </main>
  );
}
