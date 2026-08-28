import { useMemo } from 'react';
import { Button, Drawer, MessagePlugin } from 'tdesign-react';
import { bestTextOn, generateTheme, harmonyColors, resolveBase, usageHint } from '@palette-studio/core';
import { toggleFavorite, useFavorites } from '../favorites';
import { exportShareCard } from '../share';
import type { ThemeMode } from '../theme';
import type { ColorEntry } from '../types';

interface Props {
  color: ColorEntry | null;
  mode: ThemeMode;
  byHex: Map<string, ColorEntry>;
  onClose: () => void;
  onSetTheme: (hex: string) => void;
  onPickColor: (c: ColorEntry) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  MessagePlugin.success(`已复制 ${label}：${text}`);
}

export default function ColorDrawer({ color, mode, byHex, onClose, onSetTheme, onPickColor }: Props) {
  const favIds = useFavorites();
  const faved = color ? favIds.includes(color.id) : false;

  const detail = useMemo(() => {
    if (!color) return null;
    const theme = generateTheme(color.hex);
    const harmony = harmonyColors(color.hex);
    const base = resolveBase(color.hex);
    const [r, g, b] = hexToRgb(color.hex);
    // 可访问性小注：亮模式以宣纸底、暗模式以玄底评估此色作文字的用途
    const paperBg = mode === 'dark' ? '#141310' : '#FAF8F4';
    const paperName = mode === 'dark' ? '玄底' : '宣纸底';
    return {
      theme,
      harmony,
      onColor: bestTextOn(color.hex),
      a11yNote: `此色作文字于${paperName}：${usageHint(color.hex, paperBg)}`,
      rows: [
        { label: 'HEX', value: color.hex.toUpperCase() },
        { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
        {
          label: 'OKLCH',
          value: `oklch(${base.l.toFixed(3)} ${base.c.toFixed(3)} ${base.h.toFixed(1)})`,
        },
      ],
    };
  }, [color, mode]);

  const textOn = (bg: string) => ({ color: bestTextOn(bg) });

  /** 搭配色块：hex 精确匹配到数据集中的色则跳转详情，否则点击复制 HEX */
  const harmonySwatch = (hex: string, i: number) => {
    const hit = byHex.get(hex.toLowerCase());
    return (
      <div
        key={`${hex}-${i}`}
        className={`harmony-swatch${hit ? ' linked' : ''}`}
        style={{ backgroundColor: hex }}
        title={hit ? `查看 ${hit.name}` : '点击复制'}
        onClick={() => (hit ? onPickColor(hit) : copyText(hex.toUpperCase(), 'HEX'))}
      >
        <span style={textOn(hex)}>{hit ? hit.name : hex.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <Drawer
      visible={!!color}
      placement="right"
      size="560px"
      onClose={onClose}
      header={null}
      footer={
        color ? (
          <div className="drawer-footer">
            <Button theme="primary" block onClick={() => onSetTheme(color.hex)}>
              设为全站主题
            </Button>
            <Button
              variant="outline"
              block
              onClick={() => {
                void exportShareCard(color).then(() =>
                  MessagePlugin.success(`已导出分享卡片：拾色-${color.name}.png`),
                );
              }}
            >
              分享
            </Button>
            <Button
              theme={faved ? 'primary' : 'default'}
              variant={faved ? 'base' : 'outline'}
              block
              onClick={() => {
                const now = toggleFavorite(color.id);
                MessagePlugin.success(now ? `已收藏「${color.name}」` : `已取消收藏「${color.name}」`);
              }}
            >
              {faved ? '已收藏' : '收藏'}
            </Button>
          </div>
        ) : null
      }
    >
      {color && detail && (
        <>
          <div className="drawer-hero" style={{ backgroundColor: color.hex, ...textOn(color.hex) }}>
            <h2 className="drawer-hero-name">{color.name}</h2>
            <p className="drawer-hero-pinyin">{color.pinyin}</p>
            {color.poem && (
              <p className="drawer-hero-poem">
                {color.poem}
                {color.poemSource && (
                  <span className="drawer-hero-poem-src">—— {color.poemSource}</span>
                )}
              </p>
            )}
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">色值</h3>
            <div className="value-rows">
              {detail.rows.map((row) => (
                <div
                  key={row.label}
                  className="value-row"
                  onClick={() => copyText(row.value, row.label)}
                >
                  <span className="value-row-label">{row.label}</span>
                  <span className="value-row-value">{row.value}</span>
                  <span className="value-row-hint">点击复制</span>
                </div>
              ))}
            </div>
            <p className="a11y-note">{detail.a11yNote}</p>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">色阶 · 十级</h3>
            <div className="scale-strip">
              {detail.theme.colors.map((hex, i) => (
                <div key={i} className="scale-cell" style={{ backgroundColor: hex }} title={hex}>
                  {i === detail.theme.primaryIndex && <span className="scale-marker" />}
                </div>
              ))}
            </div>
            <div className="scale-labels">
              <span>1</span>
              <span>主色 · {detail.theme.primaryIndex + 1}</span>
              <span>10</span>
            </div>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">墨阶 · 十四级</h3>
            <div className="scale-strip" style={{ height: 32 }}>
              {detail.theme.neutral.colors.map((hex, i) => (
                <div key={i} className="scale-cell" style={{ backgroundColor: hex }} title={hex} />
              ))}
            </div>
            <div className="scale-labels">
              <span>1</span>
              <span>14</span>
            </div>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">搭配</h3>
            <div className="harmony-group">
              <p className="harmony-group-name">互补</p>
              <div className="harmony-swatches">
                {[detail.harmony.complementary].map(harmonySwatch)}
              </div>
            </div>
            <div className="harmony-group">
              <p className="harmony-group-name">类似</p>
              <div className="harmony-swatches">
                {detail.harmony.analogous.map(harmonySwatch)}
              </div>
            </div>
            <div className="harmony-group">
              <p className="harmony-group-name">三角</p>
              <div className="harmony-swatches">
                {detail.harmony.triadic.map(harmonySwatch)}
              </div>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
