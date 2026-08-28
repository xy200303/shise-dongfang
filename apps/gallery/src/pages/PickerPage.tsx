import { useEffect, useMemo, useRef, useState } from 'react';
import { MessagePlugin } from 'tdesign-react';
import { bestTextOn, converter, differenceCiede2000 } from '@palette-studio/core';
import type { Oklch } from '@palette-studio/core';
import type { ColorEntry } from '../types';
import './picker.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PALETTE_SIZE = 6;
const SAMPLE_EDGE = 120; // 聚类降采样边长
const PREVIEW_EDGE = 1200; // 像素拾取画布上限边长

interface Props {
  colors: ColorEntry[];
  onPickColor: (c: ColorEntry) => void;
}

interface Swatch {
  hex: string;
  share: number;
}

interface Match {
  entry: ColorEntry;
  de: number;
}

interface PickedPixel {
  hex: string;
  /** 相对预览图的百分比坐标，用于落点标记 */
  x: number;
  y: number;
}

// culori 类型标注返回 Oklch | undefined；hex 输入必可解析，此处收窄类型
const toOklch = (hex: string): Oklch => converter('oklch')(hex) as Oklch;

function rgbToHex(r: number, g: number, b: number): string {
  const p = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** OKLCH → hex（经 RGB 转换并裁剪回 sRGB 色域） */
function oklchToHex(ok: Oklch): string {
  const rgb = converter('rgb')(ok);
  return rgbToHex(rgb.r * 255, rgb.g * 255, rgb.b * 255);
}

function deLabel(de: number): string {
  if (de < 2) return '几不可辨';
  if (de < 5) return '近似';
  if (de < 10) return '相近';
  return '远亲';
}

function dist2(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/**
 * 主色提取：图片降采样后在 OKLab（OKLCH 的直角坐标形式）空间做 k-means，
 * 直角坐标可避免色相 0°/360° 环绕导致聚类中心漂错。
 */
function extractSwatches(img: HTMLImageElement, k: number): Swatch[] {
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const pts: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // 跳过透明像素
    const ok = toOklch(rgbToHex(data[i], data[i + 1], data[i + 2]));
    const rad = ((ok.h ?? 0) * Math.PI) / 180;
    pts.push([ok.l, ok.c * Math.cos(rad), ok.c * Math.sin(rad)]);
  }
  if (pts.length === 0) return [];

  const kk = Math.min(k, pts.length);
  // k-means++ 初始化
  const centroids: number[][] = [pts[Math.floor(Math.random() * pts.length)]];
  while (centroids.length < kk) {
    const d2 = pts.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
    let sum = 0;
    for (const d of d2) sum += d;
    let r = Math.random() * sum;
    let idx = 0;
    while (idx < d2.length - 1 && r > d2[idx]) {
      r -= d2[idx];
      idx += 1;
    }
    centroids.push(pts[idx]);
  }

  const assign = new Array<number>(pts.length).fill(0);
  for (let iter = 0; iter < 12; iter += 1) {
    let moved = false;
    for (let i = 0; i < pts.length; i += 1) {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < kk; j += 1) {
        const d = dist2(pts[i], centroids[j]);
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        moved = true;
      }
    }
    const sums = centroids.map(() => [0, 0, 0]);
    const counts = new Array<number>(kk).fill(0);
    for (let i = 0; i < pts.length; i += 1) {
      const a = assign[i];
      counts[a] += 1;
      sums[a][0] += pts[i][0];
      sums[a][1] += pts[i][1];
      sums[a][2] += pts[i][2];
    }
    for (let j = 0; j < kk; j += 1) {
      if (counts[j] === 0) {
        centroids[j] = pts[Math.floor(Math.random() * pts.length)];
      } else {
        centroids[j] = sums[j].map((s) => s / counts[j]);
      }
    }
    if (!moved) break;
  }

  const counts = new Array<number>(kk).fill(0);
  for (const a of assign) counts[a] += 1;
  return centroids
    .map((c, j) => ({
      hex: oklchToHex({
        mode: 'oklch',
        l: c[0],
        c: Math.hypot(c[1], c[2]),
        h: (Math.atan2(c[2], c[1]) * 180) / Math.PI,
      } as Oklch),
      share: counts[j] / pts.length,
    }))
    .sort((a, b) => b.share - a.share);
}

/** 一组 ΔE2000 匹配结果的展示块：色块 + 色名 + hex + ΔE + 诗句 */
function MatchList({
  title,
  hex,
  matches,
  onPick,
}: {
  title: string;
  hex: string;
  matches: Match[];
  onPick: (c: ColorEntry) => void;
}) {
  return (
    <div className="match-block">
      <div className="match-head">
        <span className="match-chip" style={{ backgroundColor: hex }} />
        <h3 className="match-title">{title}</h3>
        <span className="match-hex font-mono">{hex.toUpperCase()}</span>
      </div>
      <div className="match-list">
        {matches.map((m, i) => (
          <button
            key={m.entry.id}
            className="match-item"
            onClick={() => onPick(m.entry)}
            title={`查看「${m.entry.name}」`}
          >
            <span className="match-rank font-mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="match-swatch" style={{ backgroundColor: m.entry.hex }} />
            <span className="match-meta">
              <span className="match-name">
                {m.entry.name}
                <em className="match-pinyin font-mono">{m.entry.hex.toUpperCase()}</em>
              </span>
              {m.entry.poem && (
                <span className="match-poem">
                  {m.entry.poem}
                  {m.entry.poemSource && <i>—— {m.entry.poemSource}</i>}
                </span>
              )}
            </span>
            <span className="match-de">
              <span className="match-de-num font-mono">ΔE {m.de.toFixed(1)}</span>
              <span className="match-de-label">{deLabel(m.de)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PickerPage({ colors, onPickColor }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgName, setImgName] = useState('');
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  const [picked, setPicked] = useState<PickedPixel | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 传统色 OKLCH 索引 + DE2000 匹配器，只随数据集重建
  const indexed = useMemo(
    () => colors.map((entry) => ({ entry, ok: toOklch(entry.hex) })),
    [colors],
  );
  const matchTop3 = useMemo(() => {
    const diff = differenceCiede2000();
    return (hex: string): Match[] => {
      const q = toOklch(hex);
      return indexed
        .map((d) => ({ entry: d.entry, de: diff(q, d.ok) }))
        .sort((a, b) => a.de - b.de)
        .slice(0, 3);
    };
  }, [indexed]);

  const selSwatch = swatches[selIdx] ?? null;
  const selMatches = useMemo(
    () => (selSwatch ? matchTop3(selSwatch.hex) : []),
    [matchTop3, selSwatch],
  );
  const pickedMatches = useMemo(
    () => (picked ? matchTop3(picked.hex) : []),
    [matchTop3, picked],
  );

  // 卸载时回收 object URL
  useEffect(
    () => () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    },
    [imgUrl],
  );

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      MessagePlugin.error('仅支持图片文件（JPG / PNG / WebP 等）');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      MessagePlugin.error('图片过大，请选择 10MB 以内的文件');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // 像素拾取画布（限制边长，兼顾精度与内存）
      const scale = Math.min(1, PREVIEW_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * scale));
      cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        MessagePlugin.error('图片解析失败，请换一张试试');
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      canvasRef.current = cv;

      const result = extractSwatches(img, PALETTE_SIZE);
      if (result.length === 0) {
        MessagePlugin.error('未能从图片中提取到有效颜色');
        URL.revokeObjectURL(url);
        return;
      }
      setImgUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setImgName(file.name);
      setSwatches(result);
      setSelIdx(0);
      setPicked(null);
    };
    img.onerror = () => {
      MessagePlugin.error('图片读取失败，请换一张试试');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  /** 像素拾取：把点击坐标映射回画布像素读取颜色 */
  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.floor(((e.clientX - rect.left) / rect.width) * cv.width);
    const py = Math.floor(((e.clientY - rect.top) / rect.height) * cv.height);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const d = ctx.getImageData(px, py, 1, 1).data;
    setPicked({
      hex: rgbToHex(d[0], d[1], d[2]),
      x: (px / cv.width) * 100,
      y: (py / cv.height) * 100,
    });
  };

  const reset = () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setImgName('');
    setSwatches([]);
    setSelIdx(0);
    setPicked(null);
    canvasRef.current = null;
  };

  return (
    <main className="wrap picker-page">
      <header className="picker-head">
        <h1 className="picker-title">拾色</h1>
        <p className="picker-sub">从一帧光影里，拾取东方之色</p>
      </header>

      <hr className="hairline" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="picker-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = '';
        }}
      />

      {!imgUrl ? (
        <section
          className={`picker-drop${dragging ? ' dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <span className="seal-placeholder">
            <span className="seal-char">拾</span>
          </span>
          <p className="picker-drop-title">将图片拖入此处，或点击选择</p>
          <p className="picker-drop-sub">支持 JPG / PNG / WebP 等常见格式，单张不超过 10MB</p>
          <p className="picker-drop-note">图片仅在你的浏览器本地解析，不会上传</p>
        </section>
      ) : (
        <div
          className={`picker-body${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {/* 左：图片预览 + 像素拾取 */}
          <section className="picker-preview">
            <div className="picker-img-box">
              <img
                className="picker-img"
                src={imgUrl}
                alt={imgName || '已上传图片'}
                onClick={onImgClick}
              />
              {picked && (
                <span
                  className="picker-marker"
                  style={{ left: `${picked.x}%`, top: `${picked.y}%`, borderColor: bestTextOn(picked.hex) }}
                />
              )}
            </div>
            <p className="picker-img-hint">点击图片任意处拾取像素 · 拖入新图可直接替换</p>
            <div className="picker-img-actions">
              <span className="picker-img-name">{imgName}</span>
              <button className="load-more-btn" onClick={reset}>
                换一张
              </button>
            </div>
          </section>

          {/* 右：主色与匹配 */}
          <section className="picker-results">
            <h2 className="picker-section-title">主色 · 六色</h2>
            <div className="picker-swatches">
              {swatches.map((s, i) => (
                <button
                  key={`${s.hex}-${i}`}
                  className={`picker-swatch${i === selIdx ? ' active' : ''}`}
                  onClick={() => setSelIdx(i)}
                >
                  <span
                    className="picker-swatch-color font-mono"
                    style={{ backgroundColor: s.hex, color: bestTextOn(s.hex) }}
                  >
                    {s.hex.toUpperCase()}
                  </span>
                  <span className="picker-swatch-bar">
                    <span
                      className="picker-swatch-bar-fill"
                      style={{ width: `${Math.max(2, s.share * 100)}%`, backgroundColor: s.hex }}
                    />
                  </span>
                  <span className="picker-swatch-share font-mono">
                    {(s.share * 100).toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>

            <hr className="hairline" />

            {selSwatch && (
              <MatchList
                title="主色对应的传统色"
                hex={selSwatch.hex}
                matches={selMatches}
                onPick={onPickColor}
              />
            )}

            {picked ? (
              <MatchList
                title="拾取像素对应的传统色"
                hex={picked.hex}
                matches={pickedMatches}
                onPick={onPickColor}
              />
            ) : (
              <p className="picker-pick-hint">
                在左侧图片上点一下，「拾」起那一粒像素的颜色。
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
